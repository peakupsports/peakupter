import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { storableError } from '../util/errors';
import { denormalisedResponseEntities } from '../util/data';
import { createImageVariantConfig } from '../util/sdkLoader';
import { mergeListingsByAuthor } from '../util/coachExplore';
import {
  peakupCoachBadgePriorityFor,
  resolvePeakupCoachBadgeIds,
} from '../util/profileCoachSticker';
import { addMarketplaceEntities } from './marketplaceData.duck';

/**
 * Featured Coaches duck — feeds the landing page “Featured coach” section with PeakUp figurine
 * cards ranked by badge priority and review score (see {@link comparePeakupFeaturedCoaches}).
 *
 * The fetch is run client-side once per session (idempotent). Reviews are batched per author
 * (similar to CoachesExplorePage.duck) so we can build a credible ranking without a backend job.
 */

// Landing UX: show cards fast. We keep this intentionally low to avoid long blank waits.
const MAX_LISTING_PAGES = 1;
const PER_PAGE = 50;
const MAX_FEATURED_COACHES = 18;

export const fetchFeaturedCoachesThunk = createAsyncThunk(
  'featuredCoaches/fetch',
  async ({ config }, { dispatch, rejectWithValue, extra: sdk }) => {
    try {
      const variantPrefix = 'listing-card';
      const { aspectWidth = 1, aspectHeight = 1 } = config?.layout?.listingImage || {};
      const aspectRatio = aspectHeight / aspectWidth;

      // `fields.image` is global (applies to listing images AND profile images): we MUST
      // include the avatar variants here, otherwise PeakUpCoachFigurineCard receives a
      // profileImage with no variants and shows the placeholder initial.
      const imageFields = {
        include: ['author', 'author.profileImage', 'images'],
        // Important: PeakUpCoachFigurineCard + badge ranking read coach badge ids from
        // `author.attributes.profile.publicData`. Without this, landing cards can render
        // without badges (or update later) depending on what the API returns by default.
        'fields.user': ['profile.displayName', 'profile.abbreviatedName', 'profile.publicData'],
        'fields.image': [
          `variants.${variantPrefix}`,
          `variants.${variantPrefix}-2x`,
          'variants.square-small',
          'variants.square-small2x',
        ],
        ...createImageVariantConfig(`${variantPrefix}`, 400, aspectRatio),
        ...createImageVariantConfig(`${variantPrefix}-2x`, 800, aspectRatio),
      };

      const aggregatedListings = [];
      let page = 1;
      let didPublishPrelim = false;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        // eslint-disable-next-line no-await-in-loop
        const response = await sdk.listings.query({
          ...imageFields,
          page,
          perPage: PER_PAGE,
          states: ['published'],
          sort: '-pub_createdAt',
          minStock: 1,
          stockMode: 'match-undefined',
        });

        dispatch(addMarketplaceEntities(response));
        const denorm = denormalisedResponseEntities(response);
        aggregatedListings.push(...denorm);

        // Publish something ASAP (after first page) so badges/cards appear quickly.
        // We keep landing fast: review enrichment is intentionally skipped here.
        if (!didPublishPrelim) {
          didPublishPrelim = true;
          const coachesFast = mergeListingsByAuthor(aggregatedListings);
          const withBadgesFast = coachesFast.map(c => {
            const badgeIds = resolvePeakupCoachBadgeIds(c.author?.attributes?.profile?.publicData);
            return {
              ...c,
              badgeIds,
              badgePriority: peakupCoachBadgePriorityFor(badgeIds),
            };
          });
          const prelimFast = [...withBadgesFast]
            .sort((a, b) => {
              const pa = a.badgePriority || 0;
              const pb = b.badgePriority || 0;
              if (pa !== pb) return pb - pa;
              const na = (a.author?.attributes?.profile?.displayName || '').toLowerCase();
              const nb = (b.author?.attributes?.profile?.displayName || '').toLowerCase();
              return na.localeCompare(nb);
            })
            .slice(0, MAX_FEATURED_COACHES)
            .map(c => ({
              authorUuid: c.authorUuid,
              listingId: c.representativeListing?.id?.uuid || null,
              sportKeys: c.sportKeys || [],
              reviewCount: 0,
              reviewAverage: null,
              badgeIds: c.badgeIds,
              badgePriority: c.badgePriority,
            }));
          dispatch(featuredCoachesSetCoaches({ coaches: prelimFast }));
        }

        const meta = response.data.meta || {};
        const totalPages = meta.totalPages || 1;
        if (page >= totalPages || page >= MAX_LISTING_PAGES) break;
        page += 1;
      }

      const coaches = mergeListingsByAuthor(aggregatedListings);

      // Pre-compute badge priority on each coach so the comparator is cheap and deterministic.
      const withBadges = coaches.map(c => {
        const badgeIds = resolvePeakupCoachBadgeIds(c.author?.attributes?.profile?.publicData);
        return {
          ...c,
          badgeIds,
          badgePriority: peakupCoachBadgePriorityFor(badgeIds),
        };
      });

      // Final selection: badge priority first, then name.
      const top = [...withBadges]
        .sort((a, b) => {
          const pa = a.badgePriority || 0;
          const pb = b.badgePriority || 0;
          if (pa !== pb) return pb - pa;
          const na = (a.author?.attributes?.profile?.displayName || '').toLowerCase();
          const nb = (b.author?.attributes?.profile?.displayName || '').toLowerCase();
          return na.localeCompare(nb);
        })
        .slice(0, MAX_FEATURED_COACHES)
        .map(c => ({
          ...c,
          reviewCount: 0,
          reviewAverage: null,
        }));

      // Store only stable ids/refs in Redux to keep the slice serialisable; rich entities live in marketplaceData.
      const coachesPayload = top.map(c => ({
        authorUuid: c.authorUuid,
        listingId: c.representativeListing?.id?.uuid || null,
        sportKeys: c.sportKeys || [],
        reviewCount: c.reviewCount,
        reviewAverage: c.reviewAverage,
        badgeIds: c.badgeIds,
        badgePriority: c.badgePriority,
      }));

      return { coaches: coachesPayload };
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

const initialState = {
  fetchStatus: 'idle',
  fetchError: null,
  /** @type {Array<{ authorUuid: string, listingId: string|null, sportKeys: string[], reviewCount: number, reviewAverage: number|null, badgeIds: string[], badgePriority: number }>} */
  coaches: [],
};

const slice = createSlice({
  name: 'featuredCoaches',
  initialState,
  reducers: {
    featuredCoachesReset: () => initialState,
    featuredCoachesSetCoaches: (state, action) => {
      state.coaches = action.payload?.coaches || [];
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchFeaturedCoachesThunk.pending, state => {
        state.fetchStatus = 'loading';
        state.fetchError = null;
      })
      .addCase(fetchFeaturedCoachesThunk.fulfilled, (state, action) => {
        state.fetchStatus = 'succeeded';
        state.fetchError = null;
        state.coaches = action.payload.coaches;
      })
      .addCase(fetchFeaturedCoachesThunk.rejected, (state, action) => {
        state.fetchStatus = 'failed';
        state.fetchError = action.payload;
      });
  },
});

export const { featuredCoachesReset, featuredCoachesSetCoaches } = slice.actions;
export default slice.reducer;

/**
 * Action creator alias the page can dispatch (mirrors `featuredListings.duck`).
 *
 * @param {{ config: any }} args
 */
export const fetchFeaturedCoaches = args => fetchFeaturedCoachesThunk(args);
