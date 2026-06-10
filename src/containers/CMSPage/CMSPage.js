import React, { useLayoutEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import loadable from '@loadable/component';

import { bool, object } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import { fetchFeaturedListings } from '../../ducks/featuredListings.duck';
import { getListingsById } from '../../ducks/marketplaceData.duck';
import { getFeaturedListingsProps } from '../../util/data';
import { isGrowWithPeakUpCmsPage, rewriteHowItWorksJoinNowLinks } from '../../util/coachOnboarding';
import sportTheme from '../SportPagesTheme.module.css';
import css from './HowItWorksPage.module.css';
import transitionCss from './CMSPage.module.css';

import NotFoundPage from '../../containers/NotFoundPage/NotFoundPage';
const PageBuilder = loadable(() =>
  import(/* webpackChunkName: "PageBuilder" */ '../PageBuilder/PageBuilder')
);

/**
 * CMS page slugs that should get the Grow with PeakUp / How it works premium layout.
 * Sharetribe page id in the URL is `/p/:pageId` — operators may rename the page in Console.
 * We match a normalized slug (lowercase, strip separators) against this set.
 */
const HOW_IT_WORKS_PAGE_SLUGS = new Set([
  'howitworkspeakup',
  'growwithpeakup',
  'peakupgrow',
]);

const normalizeCmsPageSlug = pageId =>
  String(pageId || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const isHowItWorksPage = pageId => HOW_IT_WORKS_PAGE_SLUGS.has(normalizeCmsPageSlug(pageId));

const isPremiumCmsPageId = pageId => isHowItWorksPage(pageId);

const PREMIUM_CMS_CROSSFADE_MS = 240;

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

const applyHowItWorksPageTransforms = (pageData, pageId) => {
  const themed = getHowItWorksPageData(pageData);
  if (isGrowWithPeakUpCmsPage(pageId)) {
    return themed;
  }
  return rewriteHowItWorksJoinNowLinks(themed, pageId);
};

const PREMIUM_TRANSITION_LOCK_CLASS = 'peakupPremiumCmsTransitionLock';

const resetWindowScroll = () => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  } catch (e) {
    window.scrollTo(0, 0);
  }

  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
};

/** Run before paint and again after layout so scroll never inherits from the previous route. */
const schedulePremiumScrollReset = () => {
  resetWindowScroll();
  requestAnimationFrame(() => {
    resetWindowScroll();
    requestAnimationFrame(resetWindowScroll);
  });
};

const lockPremiumTransitionScroll = () => {
  if (typeof window === 'undefined') {
    return;
  }

  document.documentElement.classList.add(PREMIUM_TRANSITION_LOCK_CLASS);
  document.body.classList.add(PREMIUM_TRANSITION_LOCK_CLASS);
  resetWindowScroll();
};

const unlockPremiumTransitionScroll = () => {
  if (typeof window === 'undefined') {
    return;
  }

  document.documentElement.classList.remove(PREMIUM_TRANSITION_LOCK_CLASS);
  document.body.classList.remove(PREMIUM_TRANSITION_LOCK_CLASS);
  document.body.style.removeProperty('top');
  document.body.style.removeProperty('position');
  document.body.style.removeProperty('width');
  document.body.style.removeProperty('left');
  document.body.style.removeProperty('right');
  schedulePremiumScrollReset();
};

export const CMSPageComponent = props => {
  const { params, pageAssetsData, inProgress, error } = props;
  const pageId = params.pageId || props.pageId;
  const isPremiumHowItWorks = isHowItWorksPage(pageId);
  const isPremiumCMSPage = isPremiumHowItWorks;
  const previousPremiumPageIdRef = useRef(null);
  const pageAssetsDataRef = useRef(pageAssetsData);
  pageAssetsDataRef.current = pageAssetsData;
  const [outgoingPremiumPage, setOutgoingPremiumPage] = useState(null);
  const [isPremiumEntryActive, setIsPremiumEntryActive] = useState(false);

  const pageData = pageAssetsData?.[pageId]?.data;
  const themedPageData = isPremiumHowItWorks
    ? applyHowItWorksPageTransforms(pageData, pageId)
    : pageData;

  useLayoutEffect(() => {
    if (!isPremiumCMSPage) {
      return undefined;
    }

    schedulePremiumScrollReset();
    return undefined;
  }, [pageId, isPremiumCMSPage]);

  const buildPremiumPageSnapshot = targetPageId => {
    const targetIsPremiumHowItWorks = isHowItWorksPage(targetPageId);
    const targetPageData = pageAssetsDataRef.current?.[targetPageId]?.data;
    const targetThemedPageData = targetIsPremiumHowItWorks
      ? applyHowItWorksPageTransforms(targetPageData, targetPageId)
      : targetPageData;

    return {
      pageId: targetPageId,
      isPremiumHowItWorks: targetIsPremiumHowItWorks,
      themedPageData: targetThemedPageData,
    };
  };

  useLayoutEffect(() => {
    return () => {
      unlockPremiumTransitionScroll();
    };
  }, []);

  useLayoutEffect(() => {
    if (!isPremiumCMSPage) {
      previousPremiumPageIdRef.current = pageId;
      setOutgoingPremiumPage(null);
      setIsPremiumEntryActive(false);
      unlockPremiumTransitionScroll();
      return undefined;
    }

    const previousPageId = previousPremiumPageIdRef.current;
    const wasPreviousPremium =
      previousPageId != null && isPremiumCmsPageId(previousPageId);
    const isPremiumCrossfade = wasPreviousPremium && previousPageId !== pageId;
    const isPremiumColdEntry = !wasPreviousPremium;

    previousPremiumPageIdRef.current = pageId;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const clearTransitionState = () => {
      setOutgoingPremiumPage(null);
      setIsPremiumEntryActive(false);
      unlockPremiumTransitionScroll();
    };

    if (isPremiumCrossfade) {
      schedulePremiumScrollReset();

      if (reduceMotion) {
        return undefined;
      }

      lockPremiumTransitionScroll();
      setOutgoingPremiumPage(buildPremiumPageSnapshot(previousPageId));
      setIsPremiumEntryActive(false);

      const timer = window.setTimeout(clearTransitionState, PREMIUM_CMS_CROSSFADE_MS);

      return () => {
        window.clearTimeout(timer);
      };
    }

    if (isPremiumColdEntry) {
      schedulePremiumScrollReset();

      if (reduceMotion) {
        return undefined;
      }

      lockPremiumTransitionScroll();
      setOutgoingPremiumPage(null);
      setIsPremiumEntryActive(true);

      const timer = window.setTimeout(clearTransitionState, PREMIUM_CMS_CROSSFADE_MS);

      return () => {
        window.clearTimeout(timer);
      };
    }

    return undefined;
  }, [pageId, isPremiumCMSPage]);

  const renderPremiumPageBuilder = snapshot => (
    <PageBuilder
      key={snapshot.pageId}
      className={classNames(
        sportTheme.sportPremium,
        snapshot.isPremiumHowItWorks ? css.howItWorksPremium : null
      )}
      chromeTheme="sportPremium"
      pageAssetsData={snapshot.themedPageData}
      inProgress={inProgress}
      schemaType="Article"
      featuredListings={getFeaturedListingsProps(snapshot.pageId, props)}
      beforeFooter={null}
    />
  );

  if (process.env.NODE_ENV === 'development') {
    console.info('[CMSPage] pageId:', pageId);
    if (isPremiumHowItWorks) {
      console.info('[CMSPage] activating howItWorksPremium for:', pageId);
    }
  }

  if (!inProgress && error?.status === 404) {
    return <NotFoundPage staticContext={props.staticContext} />;
  }

  const currentPremiumSnapshot = {
    pageId,
    isPremiumHowItWorks,
    themedPageData,
  };

  const pageBuilder = isPremiumCMSPage ? (
    renderPremiumPageBuilder(currentPremiumSnapshot)
  ) : (
    <PageBuilder
      className={null}
      chromeTheme={null}
      pageAssetsData={themedPageData}
      inProgress={inProgress}
      schemaType="Article"
      featuredListings={getFeaturedListingsProps(pageId, props)}
      beforeFooter={null}
    />
  );

  if (!isPremiumCMSPage) {
    return pageBuilder;
  }

  const isPremiumTransitionActive = Boolean(outgoingPremiumPage) || isPremiumEntryActive;

  return (
    <div
      className={classNames(
        transitionCss.premiumCrossfadeRoot,
        isPremiumTransitionActive ? transitionCss.premiumCrossfadeTransitioning : null
      )}
    >
      <div className={transitionCss.premiumCrossfadeIncoming}>{pageBuilder}</div>
      {outgoingPremiumPage ? (
        <div className={transitionCss.premiumCrossfadeOutgoing}>
          {renderPremiumPageBuilder(outgoingPremiumPage)}
        </div>
      ) : null}
    </div>
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
