import React from 'react';
import classNames from 'classnames';
import loadable from '@loadable/component';

import { bool, object } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import { fetchFeaturedListings } from '../../ducks/featuredListings.duck';
import { getListingsById } from '../../ducks/marketplaceData.duck';
import { getFeaturedListingsProps } from '../../util/data';
import sportTheme from '../SportPagesTheme.module.css';
import css from './HowItWorksPage.module.css';

import NotFoundPage from '../../containers/NotFoundPage/NotFoundPage';
import InstructorsEarningsBanner from './InstructorsEarningsBanner';
const PageBuilder = loadable(() =>
  import(/* webpackChunkName: "PageBuilder" */ '../PageBuilder/PageBuilder')
);

/**
 * CMS page slugs that should get the Grow with PeakUp / How it works premium layout.
 * Sharetribe page id in the URL is `/p/:pageId` — operators may rename the page in Console.
 * We match a normalized slug (lowercase, strip separators) against this set.
 */
const HOW_IT_WORKS_PAGE_SLUGS = new Set([
  'howitworks',
  'howitworkspeakup',
  'growwithpeakup',
  'peakupgrow',
]);

const normalizeCmsPageSlug = pageId =>
  String(pageId || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const isHowItWorksPage = pageId => HOW_IT_WORKS_PAGE_SLUGS.has(normalizeCmsPageSlug(pageId));
const INSTRUCTORS_PAGE_IDS = new Set(['4_instructors']);
const isInstructorsPage = pageId => INSTRUCTORS_PAGE_IDS.has(String(pageId || '').toLowerCase());

const getHowItWorksPageData = pageData => {
  if (!pageData?.sections?.length) {
    return pageData;
  }

  const sections = pageData.sections.map((section, index) => {
    const isHeroSection = index === 0 && section?.sectionType === 'hero';
    const isCoachSection = index === 2;
    const searchFields = section?.callToAction?.searchFields;

    let nextSection = section;

    if (isHeroSection && searchFields) {
      nextSection = {
        ...section,
        callToAction: {
          ...section.callToAction,
          searchFields: {
            ...searchFields,
            categories: true,
            keywordSearch: false,
            locationSearch: true,
            dateRange: true,
          },
        },
      };
    }

    if (isCoachSection && nextSection?.description?.content) {
      nextSection = {
        ...nextSection,
        description: {
          ...nextSection.description,
          content: 'Grow your business. Connect with new clients.',
        },
      };
    }

    return nextSection;
  });

  return {
    ...pageData,
    sections,
  };
};

export const CMSPageComponent = props => {
  const { params, pageAssetsData, inProgress, error } = props;
  const pageId = params.pageId || props.pageId;
  const isPremiumHowItWorks = isHowItWorksPage(pageId);
  const isPremiumInstructors = isInstructorsPage(pageId);
  const isPremiumCMSPage = isPremiumHowItWorks || isPremiumInstructors;
  const pageData = pageAssetsData?.[pageId]?.data;
  const themedPageData = isPremiumHowItWorks ? getHowItWorksPageData(pageData) : pageData;

  if (process.env.NODE_ENV === 'development') {
    console.info('[CMSPage] pageId:', pageId);
    if (isPremiumHowItWorks) {
      console.info('[CMSPage] activating howItWorksPremium for:', pageId);
    }
    if (isPremiumInstructors) {
      console.info('[CMSPage] activating instructorsPremiumPage for:', pageId);
    }
  }

  if (!inProgress && error?.status === 404) {
    return <NotFoundPage staticContext={props.staticContext} />;
  }

  return (
    <PageBuilder
      className={
        isPremiumCMSPage
          ? classNames(
              sportTheme.sportPremium,
              isPremiumHowItWorks ? css.howItWorksPremium : null,
              isPremiumInstructors ? css.instructorsPremiumPage : null
            )
          : null
      }
      chromeTheme={isPremiumCMSPage ? 'sportPremium' : null}
      pageAssetsData={themedPageData}
      inProgress={inProgress}
      schemaType="Article"
      featuredListings={getFeaturedListingsProps(pageId, props)}
      beforeFooter={isPremiumInstructors ? <InstructorsEarningsBanner /> : null}
    />
  );
};

CMSPageComponent.propTypes = {
  pageAssetsData: object,
  inProgress: bool,
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
});

// Note: it is important that the withRouter HOC is **outside** the
// connect HOC, otherwise React Router won't rerender any Route
// components since connect implements a shouldComponentUpdate
// lifecycle hook.
//
// See: https://github.com/ReactTraining/react-router/issues/4671
const CMSPage = compose(
  withRouter,
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(CMSPageComponent);

export default CMSPage;
