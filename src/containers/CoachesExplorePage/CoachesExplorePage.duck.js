import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { addMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import { createImageVariantConfig } from '../../util/sdkLoader';
import { storableError } from '../../util/errors';
import { denormalisedResponseEntities } from '../../util/data';
import { batchedReviewStats } from '../../util/coachReviewStats';
import {
  boundsPlainFromCoordinates,
  fallbackAlpsBoundsPlain,
  mergeListingsByAuthor,
} from '../../util/coachExplore';

const MAX_LISTING_PAGES = 4;
const PER_PAGE = 50;
const MAX_REVIEW_SUBJECTS = 48;
const REVIEW_CONCURRENCY = 6;

export const fetchCoachesExploreThunk = createAsyncThunk(
  'CoachesExplorePage/fetchCoachesExplore',
  async ({ config }, { dispatch, rejectWithValue, extra: sdk }) => {
    try {
      const variantPrefix = 'listing-card';
      const { aspectWidth = 1, aspectHeight = 1 } = config.layout.listingImage;
      const aspectRatio = aspectHeight / aspectWidth;

      // CoachCard reads coach name + badges + languages + location from
      // `author.attributes.profile.publicData`, and shows the actual profile
      // photo via the avatar variants. Without `fields.user` Sharetribe may
      // omit `publicData` for sub-included users; without the avatar
      // variants the profileImage would be returned without usable URLs.
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

      const listingFields = config?.listing?.listingFields;
      const sanitizeConfig = { listingFields };

      const aggregatedListingsRefs = [];

      let page = 1;
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

        dispatch(addMarketplaceEntities(response, sanitizeConfig));
        const denorm = denormalisedResponseEntities(response);
        aggregatedListingsRefs.push(...denorm);

        const meta = response.data.meta || {};
        const totalPages = meta.totalPages || 1;
        if (page >= totalPages || page >= MAX_LISTING_PAGES) break;
        page += 1;
      }

      const coaches = mergeListingsByAuthor(aggregatedListingsRefs);
      const authorUuids = coaches.map(c => c.authorUuid);
      const { stats: reviewStatsByAuthorUuid } = await batchedReviewStats(sdk, authorUuids, {
        concurrency: REVIEW_CONCURRENCY,
        maxSubjects: MAX_REVIEW_SUBJECTS,
        source: 'CoachesExplorePage.fetch',
      });

      const enriched = coaches.map(c => ({
        ...c,
        reviewCount: reviewStatsByAuthorUuid[c.authorUuid]?.count || 0,
        reviewAverage: reviewStatsByAuthorUuid[c.authorUuid]?.average,
      }));

      enriched.sort((a, b) => {
        const rc = b.reviewCount - a.reviewCount;
        if (rc !== 0) return rc;
        const na = (a.author?.attributes?.profile?.displayName || '').toLowerCase();
        const nb = (b.author?.attributes?.profile?.displayName || '').toLowerCase();
        return na.localeCompare(nb);
      });

      const coords = enriched
        .map(c => c.representativeListing?.attributes?.geolocation)
        .filter(Boolean);

      let boundsPlain = boundsPlainFromCoordinates(coords);
      if (!boundsPlain) {
        boundsPlain = fallbackAlpsBoundsPlain();
      }

      const mapListingIds = enriched.map(c => c.representativeListing?.id).filter(Boolean);

      return {
        coaches: enriched,
        boundsPlain,
        mapListingIds,
      };
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

const initialState = {
  fetchStatus: 'idle',
  fetchError: null,
  coaches: [],
  boundsPlain: null,
  mapListingIds: [],
};

const coachesExploreSlice = createSlice({
  name: 'CoachesExplorePage',
  initialState,
  reducers: {
    coachesExploreReset: () => initialState,
  },
  extraReducers: builder => {
    builder
      .addCase(fetchCoachesExploreThunk.pending, state => {
        state.fetchStatus = 'loading';
        state.fetchError = null;
      })
      .addCase(fetchCoachesExploreThunk.fulfilled, (state, action) => {
        state.fetchStatus = 'succeeded';
        state.fetchError = null;
        state.coaches = action.payload.coaches;
        state.boundsPlain = action.payload.boundsPlain;
        state.mapListingIds = action.payload.mapListingIds;
      })
      .addCase(fetchCoachesExploreThunk.rejected, (state, action) => {
        state.fetchStatus = 'failed';
        state.fetchError = action.payload;
        state.coaches = [];
      });
  },
});

export const { coachesExploreReset } = coachesExploreSlice.actions;
export default coachesExploreSlice.reducer;

/** @returns {Promise<unknown>} */
export const loadData = (params, search, config) => (dispatch, getState) => {
  const { fetchStatus, coaches } = getState().CoachesExplorePage;
  if (
    fetchStatus === 'loading' ||
    (fetchStatus === 'succeeded' && Array.isArray(coaches) && coaches.length > 0)
  ) {
    return Promise.resolve();
  }
  return dispatch(fetchCoachesExploreThunk({ config }));
};
