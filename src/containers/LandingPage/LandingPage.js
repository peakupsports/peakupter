import React, { useMemo } from 'react';

import { bool, object } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { camelize } from '../../util/string';
import { propTypes } from '../../util/types';

import FallbackPage from './FallbackPage';
import { ASSET_NAME } from './LandingPage.duck';
import { fetchFeaturedCoaches } from '../../ducks/featuredCoaches.duck';
import { fetchFeaturedListings } from '../../ducks/featuredListings.duck';
import { getListingsById } from '../../ducks/marketplaceData.duck';
import { getFeaturedListingsProps } from '../../util/data';

import SectionColumns from '../PageBuilder/SectionBuilder/SectionColumns';
import SectionFeatures from '../PageBuilder/SectionBuilder/SectionFeatures';
import SectionListings from '../PageBuilder/SectionBuilder/SectionListings';
import SectionPeakupFeaturedCoaches from '../PageBuilder/SectionBuilder/SectionPeakupFeaturedCoaches';
import LandingHeroSection from './LandingHeroSection';
import LandingHowItWorksSection from './LandingHowItWorksSection';
import LandingWhyPeakupSection from './LandingWhyPeakupSection';
import PageBuilder from '../PageBuilder/PageBuilder';

import css from './LandingPage.module.css';

/**
 * On the **landing page** the “Featured listings” block is repurposed to display PeakUp coach
 * figurines (this is the only product use of `sectionType: "listings"` here). To keep the door
 * open for marketplaces that do want a real listings carousel on landing, an operator can
 * explicitly opt-out by setting `peakupRenderAs: "listings"` on the section JSON in Console.
 *
 * Trigger heuristics (any match → coach figurines):
 *   - `peakupRenderAs === 'coachFigurines'`
 *   - `sectionId`, `sectionName`, title/description text contains "coach"
 *   - Default on landing page: any `listings` section becomes coaches (unless opted-out).
 */
const includesCoach = value =>
  typeof value === 'string' && /coach/i.test(value);

const includesWhyPeakup = value =>
  typeof value === 'string' && /why[\s-]*peakup/i.test(value);

const includesHowPeakupWorks = value =>
  typeof value === 'string' &&
  /how[\s-]*(it[\s-]*)?works|how[\s-]*peakup|peakup[\s-]*sports[\s-]*works/i.test(value);

const isPeakupHowItWorksSection = section => {
  if (!section) return false;
  if (section.peakupRenderAs === 'defaultColumns') return false;
  if (section.peakupRenderAs === 'howItWorks') return true;
  if (includesHowPeakupWorks(section.sectionId)) return true;
  if (includesHowPeakupWorks(section.sectionName)) return true;
  if (includesHowPeakupWorks(section.title?.content)) return true;
  return section.numColumns === 3 && includesHowPeakupWorks(section.description?.content);
};

const isPeakupCoachListingsSection = section => {
  if (!section) return false;
  if (section.peakupRenderAs === 'listings') return false;
  if (section.peakupRenderAs === 'coachFigurines') return true;
  if (includesCoach(section.sectionId)) return true;
  if (includesCoach(section.sectionName)) return true;
  if (includesCoach(section.title?.content)) return true;
  if (includesCoach(section.description?.content)) return true;
  // Landing page fallback: by default we feature coaches, not listings.
  return true;
};

const isPeakupWhySection = section => {
  if (!section) return false;
  if (section.peakupRenderAs === 'defaultFeatures') return false;
  if (section.peakupRenderAs === 'whyPeakup') return true;
  if (includesWhyPeakup(section.sectionId)) return true;
  if (includesWhyPeakup(section.sectionName)) return true;
  if (includesWhyPeakup(section.title?.content)) return true;
  return false;
};

export const LandingPageComponent = props => {
  const { pageAssetsData, inProgress, error, featuredCoachesProps } = props;

  // Section override: re-route any "listings" section flagged as coach-feature to our figurina grid.
  const sectionComponents = useMemo(
    () => ({
      hero: {
        component: forwardedProps => <LandingHeroSection {...forwardedProps} />,
      },
      columns: {
        component: forwardedProps =>
          isPeakupHowItWorksSection(forwardedProps) ? (
            <LandingHowItWorksSection {...forwardedProps} />
          ) : isPeakupWhySection(forwardedProps) ? (
            <LandingWhyPeakupSection {...forwardedProps} />
          ) : (
            <SectionColumns {...forwardedProps} />
          ),
      },
      features: {
        component: forwardedProps =>
          isPeakupWhySection(forwardedProps) ? (
            <LandingWhyPeakupSection {...forwardedProps} />
          ) : (
            <SectionFeatures {...forwardedProps} />
          ),
      },
      listings: {
        component: forwardedProps =>
          isPeakupCoachListingsSection(forwardedProps) ? (
            <SectionPeakupFeaturedCoaches {...forwardedProps} />
          ) : (
            <SectionListings {...forwardedProps} />
          ),
      },
    }),
    []
  );

  // `className` is forwarded from PageBuilder → StaticPage → Page where it
  // ends up on the `<div id="page">` wrapper (see Page.js line 122). This
  // is the single hook we use to scope ALL premium cinematic refinements
  // of the Landing Page to its own subtree without touching the shared
  // PageBuilder pipeline (which would also restyle CMS pages, the article
  // page, etc.). The visual changes live entirely in `LandingPage.module.css`
  // under `.landingPremium ...` rules — no JS / DOM mutations, no
  // Sharetribe Console asset changes, no figurine-card edits.
  const pageBuilderOptions = useMemo(
    () => ({
      sectionComponents,
      featuredCoaches: featuredCoachesProps,
    }),
    [featuredCoachesProps]
  );

  return (
    <PageBuilder
      className={css.landingPremium}
      pageAssetsData={pageAssetsData?.[camelize(ASSET_NAME)]?.data}
      inProgress={inProgress}
      error={error}
      fallbackPage={<FallbackPage error={error} />}
      featuredListings={getFeaturedListingsProps(camelize(ASSET_NAME), props)}
      options={pageBuilderOptions}
    />
  );
};

LandingPageComponent.propTypes = {
  pageAssetsData: object,
  inProgress: bool,
  error: propTypes.error,
};

const mapStateToProps = state => {
  const { pageAssetsData, inProgress, error } = state.hostedAssets || {};
  const featuredListingData = state.featuredListings || {};

  const getListingEntitiesById = listingIds => getListingsById(state, listingIds);

  return { pageAssetsData, featuredListingData, getListingEntitiesById, inProgress, error };
};

const mapDispatchToProps = dispatch => ({
  onFetchFeaturedListings: (sectionId, parentPage, listingImageConfig, allSections) =>
    dispatch(fetchFeaturedListings({ sectionId, parentPage, listingImageConfig, allSections })),
  featuredCoachesProps: {
    onFetchFeaturedCoaches: ({ config } = {}) => dispatch(fetchFeaturedCoaches({ config })),
  },
});

// Note: it is important that the withRouter HOC is **outside** the
// connect HOC, otherwise React Router won't rerender any Route
// components since connect implements a shouldComponentUpdate
// lifecycle hook.
//
// See: https://github.com/ReactTraining/react-router/issues/4671
const LandingPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(LandingPageComponent);

export default LandingPage;
