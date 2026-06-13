import React, { useEffect, useId, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { FormattedMessage } from '../../util/reactIntl';
import { debugCoachMapLocate, mergeCoachMapLocateIntentSearch } from '../../util/coachExplore';

import { NamedLink } from '../../components';

import Field, { validProps } from '../PageBuilder/Field/Field';
import { SearchCTA } from '../PageBuilder/Primitives/SearchCTA/SearchCTA';
import SectionContainer from '../PageBuilder/SectionBuilder/SectionContainer';

import { LANDING_HERO_MEDIA } from './landingHeroMedia';
import css from './LandingHeroSection.module.css';

const HERO_FEATURE_ITEMS = [
  {
    icon: 'shield',
    titleId: 'LandingHeroSection.featureVerified',
    titleDefault: 'Certified & verified',
    subtitleId: 'LandingHeroSection.featureVerifiedSubtitle',
    subtitleDefault: 'Qualified and PeakUp-approved',
  },
  {
    icon: 'globe',
    titleId: 'LandingHeroSection.featureCommunity',
    titleDefault: 'Global Community',
    subtitleId: 'LandingHeroSection.featureCommunitySubtitle',
    subtitleDefault: '100+ destinations',
  },
  {
    icon: 'star',
    titleId: 'LandingHeroSection.featureExperiences',
    titleDefault: 'Top Experiences',
    subtitleId: 'LandingHeroSection.featureExperiencesSubtitle',
    subtitleDefault: '4.9/5 average rating',
  },
];

const FeatureIcon = ({ icon }) => {
  const gradientId = useId();

  const commonProps = {
    width: 26,
    height: 26,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    className: css.featureIconSvg,
    'aria-hidden': 'true',
  };

  const gradient = (
    <defs>
      <linearGradient id={gradientId} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#9dff2e" />
        <stop offset="52%" stopColor="#22e6b8" />
        <stop offset="100%" stopColor="#159bff" />
      </linearGradient>
    </defs>
  );

  if (icon === 'shield') {
    return (
      <svg {...commonProps}>
        {gradient}
        <path
          d="M12 3L18 5.4V10.6C18 14.7 15.44 18.34 12 19.8C8.56 18.34 6 14.7 6 10.6V5.4L12 3Z"
          stroke={`url(#${gradientId})`}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9.4 11.8L11.15 13.55L14.8 9.9"
          stroke={`url(#${gradientId})`}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (icon === 'globe') {
    return (
      <svg {...commonProps}>
        {gradient}
        <circle cx="12" cy="12" r="8.2" stroke={`url(#${gradientId})`} strokeWidth="1.8" />
        <path
          d="M3.8 12H20.2M12 3.8C14.4 6.2 15.77 9.04 15.77 12C15.77 14.96 14.4 17.8 12 20.2M12 3.8C9.6 6.2 8.23 9.04 8.23 12C8.23 14.96 9.6 17.8 12 20.2M6.2 8.3H17.8M6.2 15.7H17.8"
          stroke={`url(#${gradientId})`}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (icon === 'star') {
    return (
      <svg {...commonProps}>
        {gradient}
        <path
          d="M12 3.9L14.43 8.82L19.86 9.61L15.93 13.44L16.86 18.85L12 16.3L7.14 18.85L8.07 13.44L4.14 9.61L9.57 8.82L12 3.9Z"
          fill={`url(#${gradientId})`}
          fillOpacity="0.18"
          stroke={`url(#${gradientId})`}
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      {gradient}
      <rect
        x="4"
        y="5.5"
        width="16"
        height="14.5"
        rx="3.2"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.8"
      />
      <path
        d="M8 3.9V7.1M16 3.9V7.1M4 9.2H20M8.1 12.7H8.12M12 12.7H12.02M15.9 12.7H15.92M8.1 16.1H8.12M12 16.1H12.02"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * Landing-only hero override.
 *
 * This component intentionally replaces the generic `SectionHero` only on the
 * Landing Page. It keeps the hosted hero background image (`appearance`) and
 * the existing SearchCTA logic (`callToAction.fieldType === 'search'`) intact,
 * but renders them in a more cinematic premium layout without requiring any
 * Sharetribe Console changes.
 */
const LandingHeroSection = props => {
  const {
    sectionId,
    className,
    rootClassName,
    appearance,
    callToAction,
    options,
  } = props;

  const fieldComponents = options?.fieldComponents;
  const fieldOptions = { fieldComponents };

  const searchProps =
    callToAction?.fieldType === 'search' ? validProps(callToAction, fieldOptions) : null;

  const location = useLocation();
  const coachMapLocateSearch = useMemo(() => {
    const merged = mergeCoachMapLocateIntentSearch(location.search);
    debugCoachMapLocate('LandingHero primary CTA (NamedLink) search', {
      locationSearch: location.search,
      merged,
    });
    return merged;
  }, [location.search]);

  const heroSlides = Array.isArray(LANDING_HERO_MEDIA.slides) ? LANDING_HERO_MEDIA.slides : [];
  const hasHeroRotation = heroSlides.length > 0;
  const usesLocalHeroImage =
    !hasHeroRotation &&
    typeof LANDING_HERO_MEDIA.imageUrl === 'string' &&
    LANDING_HERO_MEDIA.imageUrl.length > 0;
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  useEffect(() => {
    if (!hasHeroRotation || heroSlides.length <= 1) {
      return undefined;
    }

    if (typeof window === 'undefined') {
      return undefined;
    }

    const tick = () => {
      setActiveSlideIndex(prevIndex => (prevIndex + 1) % heroSlides.length);
    };

    if (typeof window.matchMedia !== 'function') {
      const intervalId = window.setInterval(tick, LANDING_HERO_MEDIA.rotationIntervalMs || 6000);
      return () => window.clearInterval(intervalId);
    }

    // Mobile/tablet: keep the first hero slide only. Rotating backgrounds and
    // long cross-fades change perceived layout density after a few seconds;
    // desktop (1024+) keeps the cinematic rotation.
    const mq = window.matchMedia('(max-width: 1023px)');
    let intervalId;

    const clear = () => {
      if (intervalId != null) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const apply = () => {
      clear();
      if (mq.matches) {
        return;
      }
      intervalId = window.setInterval(() => {
        setActiveSlideIndex(prevIndex => (prevIndex + 1) % heroSlides.length);
      }, LANDING_HERO_MEDIA.rotationIntervalMs || 6000);
    };

    apply();

    const onMq = () => apply();
    if (mq.addEventListener) {
      mq.addEventListener('change', onMq);
    } else {
      mq.addListener(onMq);
    }

    return () => {
      clear();
      if (mq.removeEventListener) {
        mq.removeEventListener('change', onMq);
      } else {
        mq.removeListener(onMq);
      }
    };
  }, [hasHeroRotation, heroSlides.length]);

  return (
    <SectionContainer
      id={sectionId}
      className={className}
      rootClassName={rootClassName || css.root}
      appearance={usesLocalHeroImage || hasHeroRotation ? null : appearance}
      options={fieldOptions}
    >
      {hasHeroRotation ? (
        <div className={css.backgroundSlides} aria-hidden="true">
          {heroSlides.map((slide, index) => (
            <div
              key={slide.key || slide.imageUrl || index}
              className={css.backgroundSlide}
              style={{
                backgroundImage: `url("${slide.imageUrl}")`,
                backgroundPosition: slide.focalPoint || LANDING_HERO_MEDIA.focalPoint,
                opacity: index === activeSlideIndex ? 1 : 0,
                transitionDuration: `${LANDING_HERO_MEDIA.transitionDurationMs || 1600}ms`,
              }}
            />
          ))}
        </div>
      ) : null}

      {usesLocalHeroImage ? (
        <div
          className={css.backgroundOverride}
          style={{
            backgroundImage: `url("${LANDING_HERO_MEDIA.imageUrl}")`,
            backgroundPosition: LANDING_HERO_MEDIA.focalPoint,
          }}
          aria-hidden="true"
        />
      ) : null}

      <div className={css.heroLayout}>
        <div className={css.contentColumn}>
          <p className={css.eyebrow}>
            <FormattedMessage
              id="LandingHeroSection.eyebrow"
              defaultMessage="ANY SPORT. ANYWHERE."
            />
          </p>

          <h1 className={css.headline}>
            <span className={css.headlineLine}>
              <FormattedMessage
                id="LandingHeroSection.headlineLineOne"
                defaultMessage="The marketplace for"
              />
            </span>
            <span className={css.headlineLine}>
              <span className={css.anywhereGradient}>
                <FormattedMessage
                  id="LandingHeroSection.headlineLineTwoRest"
                  defaultMessage="certified sports professionals"
                />
              </span>
            </span>
          </h1>

          <p className={css.subtitle}>
            <FormattedMessage
              id="LandingHeroSection.subtitle"
              defaultMessage="Discover certified and verified instructors, guides, and coaches for every sport, wherever you are."
            />
          </p>

          <div className={css.ctaRow}>
            <NamedLink
              className={css.primaryCta}
              name="CoachMapPage"
              to={{ search: coachMapLocateSearch }}
            >
              <FormattedMessage
                id="LandingHeroSection.primaryCta"
                defaultMessage="Find professionals"
              />
            </NamedLink>

            <NamedLink className={css.secondaryCta} name="CMSPage" params={{ pageId: "howitworks" }}>
              <FormattedMessage
                id="LandingHeroSection.secondaryCta"
                defaultMessage="How it works"
              />
            </NamedLink>
          </div>

          {searchProps?.searchFields ? (
            <div className={css.searchRow}>
              <SearchCTA searchFields={searchProps.searchFields} landingMobileHints />
            </div>
          ) : null}

          <ul className={css.featureRow} aria-label="Hero highlights">
            {HERO_FEATURE_ITEMS.map(item => (
              <li key={item.titleId} className={css.featureItem}>
                <span className={css.featureIcon} aria-hidden="true">
                  <FeatureIcon icon={item.icon} />
                </span>
                <div className={css.featureCopy}>
                  <span className={css.featureTitle}>
                    <FormattedMessage id={item.titleId} defaultMessage={item.titleDefault} />
                  </span>
                  <span className={css.featureSubtitle}>
                    <FormattedMessage id={item.subtitleId} defaultMessage={item.subtitleDefault} />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionContainer>
  );
};

export default LandingHeroSection;
