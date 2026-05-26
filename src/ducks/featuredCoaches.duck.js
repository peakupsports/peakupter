import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { storableError, toErrorInstance } from '../util/errors';
import { denormalisedResponseEntities } from '../util/data';
import { createImageVariantConfig } from '../util/sdkLoader';
import { mergeListingsByAuthor } from '../util/coachExplore';
import { batchedReviewStats, logPeakupFeaturedCoachReviews } from '../util/coachReviewStats';
import {
  peakupCoachBadgePriorityFor,
  resolveDisplayBadgeIds,
} from '../util/profileCoachSticker';
import { addMarketplaceEntities } from './marketplaceData.duck';

/**
 * Featured Coaches duck — feeds the landing page “Featured coach” section with PeakUp figurine
 * cards ranked by badge priority and review score (see {@link comparePeakupFeaturedCoaches}).
 *
 * One listings query + one batched review pass per successful load (no duplicate review fetch).
 */

// Landing UX: show cards fast. We keep this intentionally low to avoid long blank waits.
const MAX_LISTING_PAGES = 1;
const PER_PAGE = 50;
const MAX_FEATURED_COACHES = 18;
/** Keep concurrency modest — each coach is still one reviews.query call. */
const REVIEW_CONCURRENCY = 3;

let featuredLoadCount = 0;

const logFeaturedLoadCount = (meta = {}) => {
  // eslint-disable-next-line no-console
  console.log('[PeakUp FEATURED LOAD COUNT]', {
    count: featuredLoadCount,
    ...meta,
  });
};

const buildCoachesPayload = (top, reviewStatsByAuthorUuid) =>
  top.map(c => {
    const stats = reviewStatsByAuthorUuid[c.authorUuid];
    return {
      authorUuid: c.authorUuid,
      listingId: c.representativeListing?.id?.uuid || null,
      sportKeys: c.sportKeys || [],
      reviewCount: stats?.count || 0,
      reviewAverage: stats?.average ?? null,
      badgeIds: c.badgeIds,
      badgePriority: c.badgePriority,
    };
  });

const displayNameByUuidFromTop = top =>
  top.reduce((acc, c) => {
    const name = c.author?.attributes?.profile?.displayName;
    if (c.authorUuid && name) acc[c.authorUuid] = name;
    return acc;
  }, {});

const logFeaturedThunkEnter = (getState, arg) => {
  const slice = getState().featuredCoaches || {};
  const mode = arg?.reviewsOnly ? 'reviewsOnly' : 'full';
  // eslint-disable-next-line no-console
  console.log('[PeakUp FEATURED THUNK ENTER]', {
    mode,
    statusBefore: slice.fetchStatus || 'idle',
    coachCountBefore: (slice.coaches || []).length,
    reviewsLoadedBefore: slice.reviewsLoaded === true,
    force: !!arg?.force,
  });
};

const shouldSkipFeaturedCoachesFetch = (getState, arg) => {
  const { force, reviewsOnly } = arg || {};
  const { fetchStatus, coaches, reviewsLoaded, reviewsStatus } = getState().featuredCoaches || {};

  if (reviewsOnly) {
    if (force) return false;
    if (fetchStatus !== 'succeeded' || !(coaches || []).length) return true;
    if (reviewsLoaded === true) return true;
    if (reviewsStatus === 'loading') return true;
    return false;
  }

  if (force) return false;
  if (fetchStatus === 'loading') return true;
  if (fetchStatus === 'succeeded' && (coaches || []).length > 0 && reviewsLoaded === true) {
    return true;
  }
  return false;
};

export const fetchFeaturedCoachesThunk = createAsyncThunk(
  'featuredCoaches/fetch',
  async ({ config, reviewsOnly, force }, { dispatch, getState, rejectWithValue, extra: sdk }) => {
    logFeaturedThunkEnter(getState, { reviewsOnly, force });
    try {
      if (reviewsOnly) {
        const existing = getState().featuredCoaches?.coaches || [];
        const authorUuids = existing.map(c => c.authorUuid).filter(Boolean);
        const { stats: reviewStatsByAuthorUuid, rateLimited } = await batchedReviewStats(
          sdk,
          authorUuids,
          {
            concurrency: REVIEW_CONCURRENCY,
            maxSubjects: MAX_FEATURED_COACHES,
            batchDelayMs: 400,
            source: 'featuredCoaches.reviewsOnly',
          }
        );

        const coachesPayload = existing.map(c => {
          const stats = reviewStatsByAuthorUuid[c.authorUuid];
          return {
            ...c,
            reviewCount: stats?.count || 0,
            reviewAverage: stats?.average ?? null,
          };
        });

        logPeakupFeaturedCoachReviews(coachesPayload, {
          source: 'featuredCoaches.reviewsOnly',
        });

        return { coaches: coachesPayload, reviewsLoaded: !rateLimited };
      }

      const variantPrefix = 'listing-card';
      const { aspectWidth = 1, aspectHeight = 1 } = config?.layout?.listingImage || {};
      const aspectRatio = aspectHeight / aspectWidth;

      const imageFields = {
        include: ['author', 'author.profileImage', 'images'],
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

        if (!didPublishPrelim) {
          didPublishPrelim = true;
          const coachesFast = mergeListingsByAuthor(aggregatedListings);
          const withBadgesFast = coachesFast.map(c => {
            const badgeIds = resolveDisplayBadgeIds(c.author?.attributes?.profile?.publicData);
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

      const withBadges = coaches.map(c => {
        const badgeIds = resolveDisplayBadgeIds(c.author?.attributes?.profile?.publicData);
        return {
          ...c,
          badgeIds,
          badgePriority: peakupCoachBadgePriorityFor(badgeIds),
        };
      });

      const top = [...withBadges]
        .sort((a, b) => {
          const pa = a.badgePriority || 0;
          const pb = b.badgePriority || 0;
          if (pa !== pb) return pb - pa;
          const na = (a.author?.attributes?.profile?.displayName || '').toLowerCase();
          const nb = (b.author?.attributes?.profile?.displayName || '').toLowerCase();
          return na.localeCompare(nb);
        })
        .slice(0, MAX_FEATURED_COACHES);

      const authorUuids = top.map(c => c.authorUuid).filter(Boolean);
      const { stats: reviewStatsByAuthorUuid, rateLimited } = await batchedReviewStats(
        sdk,
        authorUuids,
        {
          concurrency: REVIEW_CONCURRENCY,
          maxSubjects: MAX_FEATURED_COACHES,
          batchDelayMs: 400,
          source: 'featuredCoaches.fetch',
        }
      );

      const coachesPayload = buildCoachesPayload(top, reviewStatsByAuthorUuid);

      logPeakupFeaturedCoachReviews(coachesPayload, {
        source: 'featuredCoaches.fetch',
        displayNameByUuid: displayNameByUuidFromTop(top),
      });

      return { coaches: coachesPayload, reviewsLoaded: !rateLimited };
    } catch (e) {
      return rejectWithValue(storableError(toErrorInstance(e)));
    }
  },
  {
    condition: (arg, { getState }) => {
      const skip = shouldSkipFeaturedCoachesFetch(getState, arg);
      if (skip) {
        const slice = getState().featuredCoaches || {};
        // eslint-disable-next-line no-console
        console.log('[PeakUp FEATURED THUNK SKIP]', {
          mode: arg?.reviewsOnly ? 'reviewsOnly' : 'full',
          status: slice.fetchStatus,
          coachCount: (slice.coaches || []).length,
          reviewsLoaded: slice.reviewsLoaded === true,
          reviewsStatus: slice.reviewsStatus,
        });
      }
      return !skip;
    },
  }
);

/** @deprecated Reviews load inside fetchFeaturedCoachesThunk; kept for API compatibility. */
export const fetchFeaturedCoachReviewsThunk = createAsyncThunk(
  'featuredCoaches/fetchReviews',
  async () => ({ stats: {} }),
  {
    condition: () => false,
  }
);

const initialState = {
  fetchStatus: 'idle',
  fetchError: null,
  reviewsStatus: 'idle',
  reviewsError: null,
  reviewsLoaded: false,
  /** Set when a review batch completes successfully (heals legacy reviewsLoaded without batch). */
  reviewsLoadedAt: null,
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
      // Preliminary listing payload — reviews not merged yet.
      state.reviewsLoaded = false;
      state.reviewsLoadedAt = null;
    },
    featuredCoachesHealStaleReviewsLoaded: state => {
      if (state.reviewsLoaded && !state.reviewsLoadedAt) {
        state.reviewsLoaded = false;
      }
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchFeaturedCoachesThunk.pending, (state, action) => {
        const reviewsOnly = !!action.meta?.arg?.reviewsOnly;
        if (!reviewsOnly) {
          featuredLoadCount += 1;
          logFeaturedLoadCount({ phase: 'start' });
          state.fetchStatus = 'loading';
          state.fetchError = null;
        }
        state.reviewsStatus = 'loading';
        state.reviewsError = null;
        if (!reviewsOnly) {
          state.reviewsLoaded = false;
        }
      })
      .addCase(fetchFeaturedCoachesThunk.fulfilled, (state, action) => {
        const reviewsOnly = !!action.meta?.arg?.reviewsOnly;
        if (!reviewsOnly) {
          logFeaturedLoadCount({ phase: 'fulfilled', coachCount: action.payload.coaches?.length || 0 });
          state.fetchStatus = 'succeeded';
          state.fetchError = null;
        }
        state.coaches = action.payload.coaches;
        state.reviewsStatus = 'succeeded';
        state.reviewsError = null;
        state.reviewsLoaded = action.payload.reviewsLoaded === true;
        state.reviewsLoadedAt = action.payload.reviewsLoaded === true ? Date.now() : null;
      })
      .addCase(fetchFeaturedCoachesThunk.rejected, (state, action) => {
        const reviewsOnly = !!action.meta?.arg?.reviewsOnly;
        if (!reviewsOnly) {
          logFeaturedLoadCount({ phase: 'rejected' });
          state.fetchStatus = 'failed';
          state.fetchError = action.payload;
        }
        state.reviewsStatus = 'failed';
        state.reviewsError = action.payload;
        state.reviewsLoaded = false;
        state.reviewsLoadedAt = null;
      });
  },
});

export const {
  featuredCoachesReset,
  featuredCoachesSetCoaches,
  featuredCoachesHealStaleReviewsLoaded,
} = slice.actions;
export default slice.reducer;

export const fetchFeaturedCoaches = args => fetchFeaturedCoachesThunk(args);
export const fetchFeaturedCoachReviews = args => fetchFeaturedCoachReviewsThunk(args);
