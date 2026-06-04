import React, { useCallback, useMemo } from 'react';
import classNames from 'classnames';
import { useDispatch } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { getSportHeroImage } from '../../config/configSportMedia';
import {
  groupCoachBookingServiceCards,
  resolveCoachBookingServiceTrustBadges,
  SERVICE_GROUP_CAMPS_EVENTS,
  SERVICE_GROUP_LESSONS,
} from '../../util/coachBookingServiceSelection';
import { manageDisableScrolling } from '../../ducks/ui.duck';

import Modal from '../Modal/Modal';
import { AvatarSmall } from '../Avatar/Avatar';
import ResponsiveImage from '../ResponsiveImage/ResponsiveImage';

import css from './CoachBookingServiceSelectionModal.module.css';

const BADGE_MESSAGE_IDS = {
  bestPrice: 'CoachBookingServiceSelection.badgeBestPrice',
  camp: 'CoachBookingServiceSelection.badgeCamp',
  event: 'CoachBookingServiceSelection.badgeEvent',
  privateLesson: 'CoachBookingServiceSelection.badgePrivateLesson',
  kidsFriendly: 'CoachBookingServiceSelection.badgeKidsFriendly',
};

const BADGE_STYLE = {
  bestPrice: css.badgeBestPrice,
  camp: css.badgeCamp,
  event: css.badgeEvent,
  privateLesson: css.badgePrivateLesson,
  kidsFriendly: css.badgeKidsFriendly,
};

const TRUST_BADGE_STYLE = {
  founder: css.trustBadgeFounder,
  ambassador: css.trustBadgeAmbassador,
  top_coach: css.trustBadgeTopCoach,
  certified_coach: css.trustBadgeCertified,
};

/**
 * @param {Object} props
 * @param {Object} props.card
 * @param {string} props.variantPrefix
 * @param {Function} props.onSelectListing
 */
const SECTION_LABEL_IDS = {
  [SERVICE_GROUP_LESSONS]: 'CoachBookingServiceSelection.sectionPrivateLessons',
  [SERVICE_GROUP_CAMPS_EVENTS]: 'CoachBookingServiceSelection.sectionCampsEvents',
};

const ServiceSelectionCard = ({ card, variantPrefix, onSelectListing }) => {
  const {
    listing,
    title,
    description,
    sportLabel,
    sportKey,
    sportEmoji,
    firstImage,
    priceDisplay,
    badgeIds,
    serviceGroup,
    campDetail,
  } = card;

  const showDescription = serviceGroup === SERVICE_GROUP_LESSONS && description;

  const variants = firstImage
    ? Object.keys(firstImage?.attributes?.variants || {}).filter(k => k.startsWith(variantPrefix))
    : [];

  const sportHeroUrl = !firstImage || variants.length === 0 ? getSportHeroImage(sportKey) : null;

  return (
    <li className={css.cardItem}>
      <button type="button" className={css.cardButton} onClick={() => onSelectListing(listing)}>
        <div className={css.cardInner}>
          <div className={css.thumbWrap}>
            {firstImage && variants.length > 0 ? (
              <ResponsiveImage
                rootClassName={css.thumbImage}
                alt={title}
                image={firstImage}
                variants={variants}
                sizes="96px"
              />
            ) : sportHeroUrl ? (
              <img className={css.thumbImage} src={sportHeroUrl} alt="" />
            ) : (
              <div className={css.thumbFallback} aria-hidden>
                <span className={css.thumbEmoji}>{sportEmoji}</span>
              </div>
            )}
          </div>

          <div className={css.cardBody}>
            {badgeIds?.length > 0 ? (
              <div className={css.badgeRow}>
                {badgeIds.map(badgeId => (
                  <span
                    key={badgeId}
                    className={classNames(css.badge, BADGE_STYLE[badgeId] || css.badgeDefault)}
                  >
                    <FormattedMessage
                      id={BADGE_MESSAGE_IDS[badgeId]}
                      defaultMessage={badgeId}
                    />
                  </span>
                ))}
              </div>
            ) : null}

            <h3 className={css.cardTitle}>{title}</h3>

            {sportLabel ? <p className={css.cardSport}>{sportLabel}</p> : null}

            {campDetail ? <p className={css.cardCampDetail}>{campDetail}</p> : null}

            {showDescription ? <p className={css.cardDescription}>{description}</p> : null}

            <div className={css.cardFooter}>
              {priceDisplay ? (
                <p className={css.cardPrice}>
                  {priceDisplay.prefix ? (
                    <span className={css.pricePrefix}>{priceDisplay.prefix}</span>
                  ) : null}
                  <span className={css.priceAmount}>{priceDisplay.amount}</span>
                  {priceDisplay.suffix ? (
                    <span className={css.priceSuffix}>{priceDisplay.suffix}</span>
                  ) : null}
                </p>
              ) : (
                <span className={css.cardPricePlaceholder} />
              )}
              <span className={css.selectCta}>
                <FormattedMessage
                  id="CoachBookingServiceSelection.selectCta"
                  defaultMessage="Select"
                />
              </span>
            </div>
          </div>
        </div>
      </button>
    </li>
  );
};

/**
 * PeakUp dark/glass modal — pick a coach service before pre-booking intake.
 *
 * @param {Object} props
 * @param {string} props.id Modal id for scroll lock
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {string} props.coachDisplayName
 * @param {Object} [props.coachUser] Coach user entity (profile image)
 * @param {string} [props.coachCountryFlag] Country flag emoji for name line
 * @param {Object} [props.profilePublicData] Coach profile publicData for trust badges
 * @param {Array<Object>} props.cards from `buildCoachBookingServiceCards`
 * @param {Function} props.onSelectListing Receives the full listing entity
 */
const CoachBookingServiceSelectionModal = ({
  id,
  isOpen,
  onClose,
  coachDisplayName,
  coachUser,
  coachCountryFlag = '',
  profilePublicData,
  cards = [],
  onSelectListing,
}) => {
  const intl = useIntl();
  const config = useConfiguration();
  const dispatch = useDispatch();
  const variantPrefix = config?.layout?.listingImage?.variantPrefix || 'listing-card';

  const onManageDisableScrolling = useCallback(
    (componentId, disableScrolling) => {
      dispatch(manageDisableScrolling(componentId, disableScrolling));
    },
    [dispatch]
  );

  const { showGrouping, sections } = useMemo(() => groupCoachBookingServiceCards(cards), [cards]);

  const trustBadges = useMemo(
    () => resolveCoachBookingServiceTrustBadges(intl, profilePublicData),
    [intl, profilePublicData]
  );

  const showCoachIdentity = Boolean(coachUser || coachDisplayName);

  return (
    <Modal
      id={id}
      className={css.modal}
      scrollLayerClassName={css.scrollLayer}
      containerClassName={css.container}
      contentClassName={css.content}
      isOpen={isOpen}
      onClose={onClose}
      onManageDisableScrolling={onManageDisableScrolling}
      usePortal={process.env.NODE_ENV !== 'test'}
      lightCloseButton
      closeOnOutsideClick
    >
      <div className={css.shell}>
        <p className={css.eyebrow}>
          <FormattedMessage
            id="CoachBookingServiceSelection.eyebrow"
            defaultMessage="PeakUp Sports"
          />
        </p>

        {showCoachIdentity ? (
          <div className={css.coachIdentity}>
            {coachUser ? (
              <AvatarSmall
                className={css.coachAvatar}
                user={coachUser}
                disableProfileLink
              />
            ) : null}
            <div className={css.coachIdentityText}>
              {coachDisplayName ? (
                <p className={css.coachNameLine}>
                  <span className={css.coachName}>{coachDisplayName}</span>
                  {coachCountryFlag ? (
                    <span className={css.coachCountryFlag} aria-hidden>
                      {coachCountryFlag}
                    </span>
                  ) : null}
                </p>
              ) : null}
              {trustBadges.length > 0 ? (
                <p className={css.coachTrustLine}>
                  {trustBadges.map((badge, index) => (
                    <React.Fragment key={badge.id}>
                      {index > 0 ? <span className={css.trustSep}> • </span> : null}
                      <span
                        className={classNames(
                          css.trustBadge,
                          TRUST_BADGE_STYLE[badge.id] || css.trustBadgeDefault
                        )}
                      >
                        {badge.label}
                      </span>
                    </React.Fragment>
                  ))}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <h2 className={css.title}>
          <FormattedMessage
            id="CoachBookingServiceSelection.title"
            defaultMessage="Choose your experience with {coachName}"
            values={{ coachName: coachDisplayName }}
          />
        </h2>
        <p className={css.subtitle}>
          <FormattedMessage
            id="CoachBookingServiceSelection.subtitle"
            defaultMessage="Pick the session that fits you. You'll share a few details next, then choose dates and times."
          />
        </p>

        <div className={css.sections}>
          {sections.map(section => (
            <div key={section.id} className={css.section}>
              {showGrouping ? (
                <p className={css.sectionLabel}>
                  <FormattedMessage
                    id={SECTION_LABEL_IDS[section.id]}
                    defaultMessage={
                      section.id === SERVICE_GROUP_LESSONS
                        ? 'Private lessons'
                        : 'Camps & events'
                    }
                  />
                </p>
              ) : null}
              <ul className={css.cardList}>
                {section.cards.map(card => (
                  <ServiceSelectionCard
                    key={card.listingId}
                    card={card}
                    variantPrefix={variantPrefix}
                    onSelectListing={onSelectListing}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className={css.trustFooter}>
          <FormattedMessage
            id="CoachBookingServiceSelection.trustFooter"
            defaultMessage="🔒 Secure booking • 🛡 PeakUp Protection"
          />
        </p>
      </div>
    </Modal>
  );
};

export default CoachBookingServiceSelectionModal;
