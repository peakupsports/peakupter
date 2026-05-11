import React from 'react';
import classNames from 'classnames';

import { NamedLink } from '../../components';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import Field, { hasDataInFields } from '../PageBuilder/Field';
import SectionContainer from '../PageBuilder/SectionBuilder/SectionContainer';

import css from './LandingWhyPeakupSection.module.css';

const trustItems = [
  {
    id: 'LandingWhyPeakupSection.trustVerified',
    defaultMessage: 'Verified Coaches',
  },
  {
    id: 'LandingWhyPeakupSection.trustCommunity',
    defaultMessage: 'Global Community',
  },
  {
    id: 'LandingWhyPeakupSection.trustExperiences',
    defaultMessage: 'Top Experiences',
  },
  {
    id: 'LandingWhyPeakupSection.trustBooking',
    defaultMessage: 'Secure Booking',
  },
  {
    id: 'LandingWhyPeakupSection.trustSupport',
    defaultMessage: '24/7 Support',
  },
];

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

  const cards = cardContent.map((content, index) => ({
    ...content,
    block: blocks[index] || null,
  }));

  return (
    <SectionContainer
      id={sectionId}
      className={classNames(className, css.root)}
      rootClassName={rootClassName}
      appearance={appearance}
      options={fieldOptions}
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
              defaultMessage="Sports?"
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
                  sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 600px"
                  options={fieldOptions}
                />
              ) : null}
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
              <span className={css.trustDot} aria-hidden="true" />
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
