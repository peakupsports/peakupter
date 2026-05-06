import React, { useCallback, useEffect, useReducer, useState } from 'react';
import classNames from 'classnames';

// Import configs and components
import { useConfiguration } from '../../../../context/configurationContext';
import { lazyLoadWithDimensions } from '../../../../util/uiHelpers';
import { FormattedMessage, useIntl } from '../../../../util/reactIntl';

import { ListingCard, IconSpinner, ErrorMessage, NamedLink } from '../../../../components';

import Field, { hasDataInFields } from '../../Field';
import SectionContainer from '../SectionContainer';

import css from './SectionListings.module.css';

const KEY_ARROW_LEFT = 'ArrowLeft';
const KEY_ARROW_RIGHT = 'ArrowRight';
const MAX_MOBILE_SCREEN_WIDTH = 768;
const MAX_CAROUSEL_DOTS = 9;

// Configuration for supported column layouts
// Only 3 and 4 columns are supported in this component
const COLUMN_CONFIG = {
  3: {
    css: css.threeColumns,
    responsiveImageSizes: '(max-width: 767px) 100vw, (max-width: 1024px) 33vw, 330px',
  },
  4: {
    css: css.fourColumns,
    responsiveImageSizes: '(max-width: 767px) 100vw, (max-width: 1024px) 33vw, 240px',
  },
};

/**
 * Get the CSS class for the specified number of columns
 * @param {number} numColumns - Number of columns (3 or 4)
 * @returns {string} CSS class for the column layout, defaults to 3 columns
 */
const getColumnCSS = numColumns => {
  const config = COLUMN_CONFIG[numColumns];
  return config ? config.css : COLUMN_CONFIG[3].css;
};

const getResponsiveImageSizes = numColumns => {
  const config = COLUMN_CONFIG[numColumns];
  return config ? config.responsiveImageSizes : COLUMN_CONFIG[3].responsiveImageSizes;
};

const parseAspectRatio = aspectRatio => {
  const [width, height] = aspectRatio.split('/').map(Number);
  return width / height;
};

const isMobileViewport = () => {
  const hasMatchMedia = typeof window !== 'undefined' && window?.matchMedia;
  return hasMatchMedia
    ? window.matchMedia(`(max-width: ${MAX_MOBILE_SCREEN_WIDTH}px)`)?.matches
    : false;
};

/**
 * Calculate the dynamic height for the carousel container based on card dimensions
 *
 * ⚠️ This function contains hardcoded values that refer to the properties defined in ListingCard.module.css
 * If you modify ListingCard's font sizes, padding, margins, or layout you need to also update this function to match.
 * See ListingCard.module.css for the properties this function refers to (search ⚠️ in ListingCard.module.css to find the relevant properties).
 *
 * @param {number} numColumns - Number of columns in the layout
 * @param {Object} config - Configuration object containing layout settings
 * @param {number} carouselWidth - Width of the carousel container
 * @param {boolean} isMobileBreakpoint - Whether the viewport is mobile
 * @returns {number} Calculated height in pixels
 */
const calculateCarouselHeight = (
  numColumns,
  config,
  carouselWidth,
  isMobileBreakpoint = false,
  error,
  noListingsFound
) => {
  const errorMessageHeight = 250;
  const noListingsFoundHeight = 220;

  if (error) {
    return errorMessageHeight;
  }

  if (noListingsFound) {
    return noListingsFoundHeight;
  }

  const thumbnailAspectRatio = config.layout.listingImage.aspectRatio;
  const paddingHorizontal = 2 * 32; // 2x32px
  const titleHeightSingleLine = 16;
  const titleHeightDoubleLine = titleHeightSingleLine * 2;
  const cardInfoPadding = 14 + 2; // padding-top + padding-bottom
  const priceHeight = 16 + 4; // height + margin-bottom
  const authorInfoHeight = 24;
  const contentMaxWidthPages = 1120;
  const containerPaddingTop = 32;
  const containerPaddingBottom = 24;

  const priceHeightMobile = 18 + 4; // 18 + margin bottom
  const authorInfoHeightMobile = 18 + 4 + 4; // 18 + padding top + padding bottom
  const titleHeightSingleLineMobile = 18;
  const cardInfoHeightMobile =
    priceHeightMobile + authorInfoHeightMobile + titleHeightSingleLineMobile + cardInfoPadding;

  const parsedAspectRatio = parseAspectRatio(thumbnailAspectRatio);

  const gutters = isMobileBreakpoint ? 0 : numColumns === 3 ? 64 : 96;

  const mainColumnWidth = Math.min(contentMaxWidthPages, carouselWidth);
  const cardWidth =
    (mainColumnWidth - paddingHorizontal - gutters) / (isMobileBreakpoint ? 1 : numColumns);
  const cardImageHeight = cardWidth / parsedAspectRatio;
  const cardInfoHeight = priceHeight + titleHeightSingleLine + authorInfoHeight + cardInfoPadding;

  const totalCardHeight =
    cardImageHeight + (isMobileBreakpoint ? cardInfoHeightMobile : cardInfoHeight);
  const totalWithPaddings = totalCardHeight + containerPaddingTop + containerPaddingBottom;

  return Math.ceil(totalWithPaddings);
};

/**
 * Component that renders the listing cards in a carousel layout
 * Used with lazy loading wrapper for performance optimization
 * @param {Object} props - Component properties
 * @param {number} props.numColumns - Number of columns to display
 * @param {Array} props.listings - Array of listing data
 * @param {React.RefObject} props.sliderRef - Ref object for the slider element
 * @param {boolean} props.darkMode - Whether to apply dark mode styling
 * @returns {JSX.Element} Carousel container with listing cards
 */
const ListingCarouselComponent = props => {
  const {
    numColumns,
    listings,
    sliderRef,
    darkMode,
    onFetchFeaturedListings,
    fetched,
    inProgress,
    parentPage,
    sectionId,
    config,
    error,
    allSections,
    isInsideContainer,
    onSliderContainerReady,
  } = props;

  const listingImageConfig = config.layout.listingImage;

  useEffect(() => {
    if (!fetched && inProgress !== true && !error) {
      onFetchFeaturedListings(sectionId, parentPage, listingImageConfig, allSections);
    }
  }, []);

  useEffect(() => {
    if (listings.length > 0 && inProgress !== true && !error) {
      onSliderContainerReady?.();
    }
  }, [listings.length, inProgress, error, onSliderContainerReady]);

  if (inProgress == true) {
    return <IconSpinner className={css.centeredContent} />;
  }

  if (error) {
    return (
      <div className={css.centeredMessageContainer} role="alert">
        <h4 className={css.genericErrorTitle}>
          <FormattedMessage id="SectionListings.genericErrorTitle" />
        </h4>
        <ErrorMessage error={error} />
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className={css.centeredMessageContainer} role="status">
        <p className={css.noListingsFound}>
          <FormattedMessage id="SectionListings.noListingsFoundInfo" />
        </p>
        <NamedLink name="SearchPage" className={css.ctaButton}>
          <FormattedMessage id="SectionListings.noListingsFoundCTA" />
        </NamedLink>
      </div>
    );
  }

  return (
    <ul className={getColumnCSS(numColumns, false)} ref={sliderRef} role="list">
      {listings.map(listing => (
        <li key={listing.id.uuid} className={css.listItem}>
          <ListingCard
            className={classNames(css.card, { [css.isInsideContainer]: isInsideContainer })}
            aspectRatioClassName={css.carouselImageHoverEffect}
            listing={listing}
            darkMode={darkMode}
            renderSizes={getResponsiveImageSizes(numColumns)}
            lazyLoadImage={!isInsideContainer}
          />
        </li>
      ))}
    </ul>
  );
};

const LazyListingCarouselComponent = lazyLoadWithDimensions(ListingCarouselComponent);

/**
 * Main component for rendering a listings section with carousel functionality
 * Supports 3 or 4 column layouts with horizontal scrolling and responsive behavior
 * @param {Object} props - Component properties
 * @param {string} props.sectionId - Unique identifier for this section
 * @param {number} props.numColumns - Number of columns (3 or 4, defaults to 3)
 * @param {Object} props.appearance - Styling configuration including text color
 * @param {Object} props.title - Title field data
 * @param {Object} props.description - Description field data
 * @param {Object} props.callToAction - CTA button field data
 * @returns {JSX.Element} Complete listings section with header and carousel
 */
const SectionListings = props => {
  const intl = useIntl();
  const config = useConfiguration();
  const {
    sectionId,
    className,
    rootClassName,
    defaultClasses,
    numColumns = 3,
    appearance,
    title,
    description,
    callToAction,
    options,
    allSections,
    isInsideContainer,
  } = props;

  const { featuredListings } = options;
  const {
    onFetchFeaturedListings,
    getListingEntitiesById,
    parentPage,
    featuredListingData,
  } = featuredListings;

  const listingIds = featuredListingData?.[sectionId]?.listingIds;
  const listingEntities = listingIds ? getListingEntitiesById(listingIds) : [];

  const fetched = featuredListingData?.[sectionId]?.fetched || false;
  const inProgress = featuredListingData?.[sectionId]?.inProgress;

  const error = featuredListingData?.[sectionId]?.error;

  const [carouselWidthConstant, setCarouselWidthConstant] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [carouselNav, setCarouselNav] = useState({
    visible: false,
    dotCount: 0,
    activeDot: 0,
  });
  const [sliderBindNonce, bumpSliderBind] = useReducer(n => n + 1, 0);

  const containerRef = React.useRef(null);
  const sliderRef = React.useRef(null);

  const getScrollStep = useCallback(slider => {
    if (typeof window === 'undefined' || !slider) {
      return 0;
    }
    const cardSelector = `.${css.card}`;
    const cards = slider.querySelectorAll(cardSelector);
    if (cards.length >= 2) {
      const a = cards[0].getBoundingClientRect();
      const b = cards[1].getBoundingClientRect();
      return Math.ceil(b.left - a.left);
    }
    if (cards.length === 1) {
      return Math.ceil(cards[0].getBoundingClientRect().width + 16);
    }
    return Math.max(120, Math.floor(slider.clientWidth * 0.85));
  }, []);

  const refreshCarouselNav = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const slider = sliderRef.current;
    if (!slider) {
      setCarouselNav({ visible: false, dotCount: 0, activeDot: 0 });
      return;
    }
    const maxScroll = Math.max(0, slider.scrollWidth - slider.clientWidth);
    if (maxScroll <= 2) {
      setCarouselNav({ visible: false, dotCount: 0, activeDot: 0 });
      return;
    }
    const step = getScrollStep(slider);
    const safeStep = Math.max(step, 1);
    const rawPages = Math.max(1, Math.ceil(maxScroll / safeStep) + 1);
    const dotCount = Math.min(MAX_CAROUSEL_DOTS, rawPages);
    const ratio = maxScroll > 0 ? slider.scrollLeft / maxScroll : 0;
    const activeDot =
      dotCount <= 1 ? 0 : Math.min(dotCount - 1, Math.round(ratio * (dotCount - 1)));
    setCarouselNav({ visible: true, dotCount, activeDot });
  }, [getScrollStep]);

  const slideCarousel = useCallback(
    (direction, event) => {
      const slider = sliderRef.current;
      if (!slider || typeof window === 'undefined') {
        return;
      }
      const step = getScrollStep(slider);
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      slider.scrollBy({
        left: direction * Math.max(step, 1),
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
      if (event?.currentTarget?.focus) {
        event.currentTarget.focus();
      }
    },
    [getScrollStep]
  );

  const goToCarouselDot = useCallback(
    dotIndex => {
      const slider = sliderRef.current;
      if (!slider || typeof window === 'undefined') {
        return;
      }
      const maxScroll = Math.max(0, slider.scrollWidth - slider.clientWidth);
      const step = getScrollStep(slider);
      const safeStep = Math.max(step, 1);
      const rawPages = Math.max(1, Math.ceil(maxScroll / safeStep) + 1);
      const dotCount = Math.min(MAX_CAROUSEL_DOTS, rawPages);
      if (dotCount <= 1) {
        return;
      }
      const target = (dotIndex / (dotCount - 1)) * maxScroll;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      slider.scrollTo({ left: target, behavior: reduceMotion ? 'auto' : 'smooth' });
    },
    [getScrollStep]
  );

  const onCarouselArrowKeyDown = useCallback(
    e => {
      if (e.key === KEY_ARROW_LEFT) {
        e.preventDefault();
        slideCarousel(-1, e);
      } else if (e.key === KEY_ARROW_RIGHT) {
        e.preventDefault();
        slideCarousel(1, e);
      }
    },
    [slideCarousel]
  );

  const handleSliderContainerReady = useCallback(() => {
    bumpSliderBind();
  }, []);

  // force mobile styles if we render this section within a modal
  const isMobile = mounted && isMobileViewport();
  const isMobileBreakpoint = isMobile || isInsideContainer;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // we use resizeObserver to accomodate for an edge case when this section is rendered within a modal
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver(entries => {
        const carouselWidth = entries[0].contentRect.width;
        containerRef.current.style.setProperty('--carouselWidth', `${carouselWidth}px`);
        setCarouselWidthConstant(carouselWidth);
        window.requestAnimationFrame(() => refreshCarouselNav());
      });
      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [refreshCarouselNav]);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) {
      return undefined;
    }
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(() => {
          ticking = false;
          refreshCarouselNav();
        });
      }
    };
    slider.addEventListener('scroll', onScroll, { passive: true });
    refreshCarouselNav();
    return () => slider.removeEventListener('scroll', onScroll);
  }, [sliderBindNonce, refreshCarouselNav]);

  const fieldComponents = options?.fieldComponents;
  const fieldOptions = { fieldComponents };
  const hasHeaderFields = hasDataInFields([title, description, callToAction], fieldOptions);
  const darkMode = appearance?.textColor === 'white';
  const noListingsFound = fetched && listingEntities.length === 0;

  const carouselHeight = calculateCarouselHeight(
    numColumns,
    config,
    carouselWidthConstant,
    isMobileBreakpoint,
    error,
    noListingsFound
  );

  return (
    <SectionContainer
      id={sectionId}
      className={className}
      rootClassName={rootClassName}
      appearance={appearance}
    >
      {hasHeaderFields ? (
        <header className={defaultClasses.sectionDetails}>
          <Field data={title} className={defaultClasses.title} options={fieldOptions} />
          <Field data={description} className={defaultClasses.description} options={fieldOptions} />
          <Field data={callToAction} className={defaultClasses.ctaButton} options={fieldOptions} />
        </header>
      ) : null}

      <div className={css.carouselContainer}>
        <div className={css.dynamicContainer} style={{ height: carouselHeight }} ref={containerRef}>
          {/* Lazy-loaded carousel component renders when in viewport. We don't use lazy loading if component is rendered within a modal */}
          {isInsideContainer ? (
            <ListingCarouselComponent
              numColumns={numColumns}
              listings={listingEntities}
              sliderRef={sliderRef}
              darkMode={darkMode}
              onFetchFeaturedListings={onFetchFeaturedListings}
              fetched={fetched}
              inProgress={inProgress}
              parentPage={parentPage}
              sectionId={sectionId}
              error={error}
              config={config}
              allSections={allSections}
              isInsideContainer={isInsideContainer}
              onSliderContainerReady={handleSliderContainerReady}
            />
          ) : (
            <LazyListingCarouselComponent
              numColumns={numColumns}
              listings={listingEntities}
              sliderRef={sliderRef}
              darkMode={darkMode}
              onFetchFeaturedListings={onFetchFeaturedListings}
              fetched={fetched}
              inProgress={inProgress}
              parentPage={parentPage}
              sectionId={sectionId}
              error={error}
              config={config}
              allSections={allSections}
              isInsideContainer={isInsideContainer}
              onSliderContainerReady={handleSliderContainerReady}
            />
          )}
        </div>

        {!inProgress &&
        !error &&
        fetched &&
        listingEntities.length > 0 &&
        carouselNav.visible &&
        carouselNav.dotCount > 0 ? (
          <div
            className={css.carouselNavFooter}
            role="group"
            aria-label={intl.formatMessage({ id: 'SectionListings.carouselNavAria' })}
          >
            <button
              type="button"
              className={css.carouselArrowButton}
              aria-label={intl.formatMessage({ id: 'SectionListings.carouselPrev' })}
              onClick={e => slideCarousel(-1, e)}
              onKeyDown={onCarouselArrowKeyDown}
            >
              ‹
            </button>
            <div className={css.carouselDots}>
              {Array.from({ length: carouselNav.dotCount }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={classNames(css.carouselDot, {
                    [css.carouselDotActive]: idx === carouselNav.activeDot,
                  })}
                  aria-label={intl.formatMessage(
                    { id: 'SectionListings.carouselGoToSlide' },
                    { page: idx + 1, pageCount: carouselNav.dotCount }
                  )}
                  aria-current={idx === carouselNav.activeDot ? 'true' : undefined}
                  onClick={() => goToCarouselDot(idx)}
                />
              ))}
            </div>
            <button
              type="button"
              className={css.carouselArrowButton}
              aria-label={intl.formatMessage({ id: 'SectionListings.carouselNext' })}
              onClick={e => slideCarousel(1, e)}
              onKeyDown={onCarouselArrowKeyDown}
            >
              ›
            </button>
          </div>
        ) : null}
      </div>
    </SectionContainer>
  );
};
export default SectionListings;
