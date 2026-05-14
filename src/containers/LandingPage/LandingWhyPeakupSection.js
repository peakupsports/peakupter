import React, { useId, useMemo } from 'react';
import classNames from 'classnames';
import { useLocation } from 'react-router-dom';

import { NamedLink } from '../../components';
import { mergeCoachMapLocateIntentSearch, debugCoachMapLocate } from '../../util/coachExplore';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import Field, { hasDataInFields } from '../PageBuilder/Field';
import SectionContainer from '../PageBuilder/SectionBuilder/SectionContainer';

import css from './LandingWhyPeakupSection.module.css';

const AURORA_ATMOSPHERE_IMAGE_URL = '/CoachPagePic/aurora.jpg';

/** `Field` / ResponsiveImage `sizes`: matches `.cardsGrid` rail + `blockContainer` horizontal padding. */
const WHY_PEAKUP_CARD_MEDIA_SIZES = [
  '(max-width: 767px) calc(100vw - 64px)',
  '(max-width: 1023px) calc((100vw - 88px) / 2)',
  '520px',
].join(', ');

const trustItems = [
  {
    id: 'LandingWhyPeakupSection.trustVerified',
    defaultMessage: 'Verified Coaches',
    icon: 'shield',
  },
  {
    id: 'LandingWhyPeakupSection.trustCommunity',
    defaultMessage: 'Global Community',
    icon: 'globe',
  },
  {
    id: 'LandingWhyPeakupSection.trustExperiences',
    defaultMessage: 'Top Experiences',
    icon: 'star',
  },
  {
    id: 'LandingWhyPeakupSection.trustBooking',
    defaultMessage: 'Secure Booking',
    icon: 'lock',
  },
  {
    id: 'LandingWhyPeakupSection.trustSupport',
    defaultMessage: '24/7 Support',
    icon: 'support',
  },
];

const GradientLineIcon = ({ icon, className }) => {
  const gradientId = useId();
  const stroke = `url(#${gradientId})`;

  const iconPaths = {
    pin: (
      <>
        <path d="M12 20.2s5.4-4.8 5.4-9.2A5.4 5.4 0 0 0 12 5.6 5.4 5.4 0 0 0 6.6 11c0 4.4 5.4 9.2 5.4 9.2Z" />
        <circle cx="12" cy="11" r="1.9" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3.5L18 6.2V11c0 4.3-2.6 8.2-6 9.5-3.4-1.3-6-5.2-6-9.5V6.2L12 3.5Z" />
        <path d="M9.4 12.2l1.7 1.7 3.5-3.8" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.8 12h16.4" />
        <path d="M12 3.5c2.3 2.2 3.6 5.3 3.6 8.5S14.3 18.3 12 20.5c-2.3-2.2-3.6-5.3-3.6-8.5S9.7 5.7 12 3.5Z" />
      </>
    ),
    star: (
      <path d="M12 4.6l2.1 4.3 4.8.7-3.4 3.3.8 4.7-4.3-2.3-4.3 2.3.8-4.7-3.4-3.3 4.8-.7L12 4.6Z" />
    ),
    lock: (
      <>
        <rect x="6.2" y="10.6" width="11.6" height="8.4" rx="2.2" />
        <path d="M8.7 10.6V8.9a3.3 3.3 0 0 1 6.6 0v1.7" />
        <path d="M12 13.8v2.4" />
      </>
    ),
    support: (
      <>
        <path d="M5 12a7 7 0 0 1 14 0" />
        <path d="M6.4 12.4v3.4a1.6 1.6 0 0 0 1.6 1.6h1.2v-6.6H8a1.6 1.6 0 0 0-1.6 1.6Z" />
        <path d="M17.6 12.4v3.4a1.6 1.6 0 0 1-1.6 1.6h-1.2v-6.6H16a1.6 1.6 0 0 1 1.6 1.6Z" />
        <path d="M14.8 18.2c-.4 1.3-1.6 2.3-2.8 2.3H10.8" />
      </>
    ),
  };

  return (
    <svg
      className={classNames(css.trustIconSvg, className)}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9dff2e" />
          <stop offset="50%" stopColor="#22e6b8" />
          <stop offset="100%" stopColor="#159bff" />
        </linearGradient>
      </defs>
      <g
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {iconPaths[icon] || null}
      </g>
    </svg>
  );
};

const cardContent = [
  {
    titleId: 'LandingWhyPeakupSection.cardAthleteTitle',
    titleDefault: 'Find your coach',
    textId: 'LandingWhyPeakupSection.cardAthleteText',
    textDefault: 'Choose your sport, location, and preferred time slot in just a few clicks.',
    ctaId: 'LandingWhyPeakupSection.cardAthleteCta',
    ctaDefault: 'Find your coach',
    toneClassName: css.cardAthlete,
    ctaClassName: css.cardCtaPrimary,
    icon: 'pin',
  },
  {
    titleId: 'LandingWhyPeakupSection.cardCoachTitle',
    titleDefault: 'Become a coach',
    textId: 'LandingWhyPeakupSection.cardCoachText',
    textDefault: 'Get more bookings, grow your visibility, and stay fully independent.',
    ctaId: 'LandingWhyPeakupSection.cardCoachCta',
    ctaDefault: 'More info',
    toneClassName: css.cardCoach,
    ctaClassName: css.cardCtaSecondary,
    icon: 'star',
  },
];

const LandingWhyPeakupSection = props => {
  const intl = useIntl();
  const {
    sectionId,
    className,
    rootClassName,
    defaultClasses,
    appearance,
    callToAction,
    blocks = [],
    options,
  } = props;

  const fieldComponents = options?.fieldComponents;
  const fieldOptions = { fieldComponents };
  const hasSectionCta = hasDataInFields([callToAction], fieldOptions);

  const location = useLocation();
  const coachMapLocateSearch = useMemo(() => {
    const merged = mergeCoachMapLocateIntentSearch(location.search);
    debugCoachMapLocate('LandingWhyPeakup athlete CTA (NamedLink) search', {
      locationSearch: location.search,
      merged,
    });
    return merged;
  }, [location.search]);

  const cards = cardContent.map((content, index) => ({
    ...content,
    block: blocks[index] || null,
  }));

  const auroraAtmosphereStyle = {
    '--peakupAuroraAtmosphereImage': `url("${AURORA_ATMOSPHERE_IMAGE_URL}")`,
  };

  return (
    <SectionContainer
      id={sectionId}
      className={classNames(className, css.root)}
      rootClassName={rootClassName}
      appearance={appearance}
      options={fieldOptions}
      style={auroraAtmosphereStyle}
    >
      <header className={classNames(defaultClasses.sectionDetails, css.sectionDetails)}>
        <div className={css.titleWrap}>
          <span className={css.titleGlow} aria-hidden="true" />
          <h2 className={css.title}>
            <FormattedMessage id="LandingWhyPeakupSection.titleWhy" defaultMessage="Why" />{' '}
            <span className={css.titleAccent}>
              <FormattedMessage id="LandingWhyPeakupSection.titlePeakUp" defaultMessage="PeakUp" />
            </span>{' '}
            <FormattedMessage
              id="LandingWhyPeakupSection.titleSports"
              defaultMessage="Sports"
            />
          </h2>
        </div>

        <p className={css.subtitle}>
          <FormattedMessage
            id="LandingWhyPeakupSection.subtitle"
            defaultMessage="One platform. Two journeys. Built for athletes and coaches."
          />
        </p>

        {hasSectionCta ? (
          <Field
            data={callToAction}
            className={classNames(defaultClasses.ctaButton, css.sectionCta)}
            options={fieldOptions}
          />
        ) : null}
      </header>

      <div className={classNames(defaultClasses.blockContainer, css.cardsGrid)}>
        {cards.map(card => {
          const rightCardCtaData =
            card.block?.callToAction &&
            ['internalButtonLink', 'externalButtonLink'].includes(card.block.callToAction.fieldType)
              ? {
                  ...card.block.callToAction,
                  content: intl.formatMessage({
                    id: card.ctaId,
                    defaultMessage: card.ctaDefault,
                  }),
                }
              : null;

          return (
            <article key={card.titleId} className={classNames(css.card, card.toneClassName)}>
              {card.block?.media ? (
                <Field
                  data={card.block.media}
                  className={css.cardMedia}
                  sizes={WHY_PEAKUP_CARD_MEDIA_SIZES}
                  options={fieldOptions}
                />
              ) : null}
              <div className={css.cardIconBadge} aria-hidden="true">
                <GradientLineIcon icon={card.icon} className={css.cardIconSvg} />
              </div>
              <div className={css.cardBackground} aria-hidden="true" />
              <div className={css.cardContent}>
                <h3 className={css.cardTitle}>
                  <FormattedMessage id={card.titleId} defaultMessage={card.titleDefault} />
                </h3>
                <p className={css.cardText}>
                  <FormattedMessage id={card.textId} defaultMessage={card.textDefault} />
                </p>

                {card.titleId === 'LandingWhyPeakupSection.cardAthleteTitle' ? (
                  <NamedLink
                    name="CoachMapPage"
                    className={classNames(defaultClasses.ctaButton, css.cardCta, card.ctaClassName)}
                    to={{ search: coachMapLocateSearch }}
                  >
                    <FormattedMessage id={card.ctaId} defaultMessage={card.ctaDefault} />
                  </NamedLink>
                ) : rightCardCtaData ? (
                  <Field
                    data={rightCardCtaData}
                    className={classNames(defaultClasses.ctaButton, css.cardCta, card.ctaClassName)}
                    options={fieldOptions}
                  />
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <div className={css.trustWrap}>
        <div className={css.trustBar} role="list">
          {trustItems.map(item => (
            <div key={item.id} className={css.trustItem} role="listitem">
              <span className={css.trustIcon} aria-hidden="true">
                <GradientLineIcon icon={item.icon} />
              </span>
              <span className={css.trustLabel}>
                <FormattedMessage id={item.id} defaultMessage={item.defaultMessage} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </SectionContainer>
  );
};

export default LandingWhyPeakupSection;
