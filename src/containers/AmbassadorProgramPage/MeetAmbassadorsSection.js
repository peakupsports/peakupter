import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { fetchAmbassadorsShowcase } from '../../util/api';
import {
  getShowcaseTierImage,
  getShowcaseTierStyleVars,
} from '../../util/ambassadorShowcase';
import { countryDisplayName } from '../../util/coachExplore';
import { NamedLink } from '../../components';
import { AMBASSADOR_LEVELS, SECTION_IDS } from './ambassadorProgramContent';
import css from './AmbassadorProgramPage.module.css';

const TIER_NAME_IDS = {
  founder: 'ReferralCenterPage.founderTierName',
  bronze: 'AmbassadorProgramPage.levelBronzeName',
  silver: 'AmbassadorProgramPage.levelSilverName',
  gold: 'AmbassadorProgramPage.levelGoldName',
  platinum: 'AmbassadorProgramPage.levelPlatinumName',
  diamond: 'AmbassadorProgramPage.levelDiamondName',
};

const resolveTierNameId = tierId => {
  if (tierId === 'founder') {
    return TIER_NAME_IDS.founder;
  }
  const level = AMBASSADOR_LEVELS.find(item => item.id === tierId);
  return level?.nameId || TIER_NAME_IDS.bronze;
};

/**
 * @param {object} props
 * @param {typeof import('./AmbassadorProgramPage.module.css')} props.cssModule
 */
const AmbassadorShowcaseCard = ({ ambassador }) => {
  const intl = useIntl();
  const isFounder = ambassador.isFounder;
  const tierStyle = getShowcaseTierStyleVars(ambassador.tierId);
  const tierNameId = resolveTierNameId(ambassador.tierId);
  const badgeSrc = getShowcaseTierImage(ambassador.tierId);
  const metaParts = [ambassador.sports, ambassador.location].filter(Boolean);
  const countryLabel = ambassador.country
    ? countryDisplayName(ambassador.country, intl.locale)
    : '';

  return (
    <li
      className={classNames(
        css.ambassadorCard,
        css[`ambassadorCard_${ambassador.tierId}`],
        isFounder ? css.ambassadorCardFounder : null
      )}
      style={tierStyle}
    >
      <NamedLink
        className={classNames(
          css.ambassadorCardLink,
          isFounder ? css.ambassadorFounderCardLink : null
        )}
        name="ProfilePage"
        params={{ id: ambassador.userId }}
      >
        {isFounder ? (
          <div className={css.ambassadorFounderBadgeHero}>
            <div className={css.ambassadorFounderBadgeAura} aria-hidden />
            <div className={css.ambassadorFounderBadgeShine} aria-hidden />
            <img
              className={css.ambassadorFounderBadge}
              src={badgeSrc}
              alt=""
              loading="lazy"
              decoding="async"
            />
          </div>
        ) : (
          <img
            className={css.ambassadorBadgeMini}
            src={badgeSrc}
            alt=""
            loading="lazy"
            decoding="async"
          />
        )}

        <div className={isFounder ? css.ambassadorFounderContent : null}>
          <div
            className={classNames(
              css.ambassadorAvatar,
              ambassador.profileImageUrl ? css.ambassadorAvatarPhoto : null,
              isFounder ? css.ambassadorFounderAvatar : null
            )}
            aria-hidden={Boolean(ambassador.profileImageUrl)}
          >
            {ambassador.profileImageUrl ? (
              <img
                className={css.ambassadorAvatarImage}
                src={ambassador.profileImageUrl}
                alt=""
                loading="lazy"
                decoding="async"
              />
            ) : (
              ambassador.initials
            )}
          </div>

          <h3
            className={classNames(
              css.ambassadorName,
              isFounder ? css.ambassadorFounderName : null
            )}
          >
            {ambassador.displayNameShort}
          </h3>

          {isFounder ? (
            <>
              {countryLabel ? (
                <p className={css.ambassadorFounderCountry}>{countryLabel}</p>
              ) : null}
              {ambassador.sports ? (
                <p className={css.ambassadorFounderSports}>{ambassador.sports}</p>
              ) : null}
              <p className={css.ambassadorFounderLabel}>
                <FormattedMessage id="AmbassadorProgramPage.ambassadorFounderSubtitle" />
              </p>
            </>
          ) : (
            <>
              {metaParts.length > 0 ? (
                <p className={css.ambassadorMeta}>{metaParts.join(' · ')}</p>
              ) : null}
              <span
                className={classNames(
                  css.ambassadorLevelPill,
                  css[`ambassadorLevelPill_${ambassador.tierId}`]
                )}
              >
                <FormattedMessage id={tierNameId} />
              </span>
            </>
          )}
        </div>
      </NamedLink>
    </li>
  );
};

/**
 * Dynamic “Meet our Ambassadors” section — live Sharetribe profiles.
 */
const MeetAmbassadorsSection = () => {
  const [ambassadors, setAmbassadors] = useState([]);
  const [onlyFounder, setOnlyFounder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAmbassadorsShowcase()
      .then(response => {
        if (cancelled) {
          return;
        }
        setAmbassadors(response.ambassadors || []);
        setOnlyFounder(Boolean(response.onlyFounder));
      })
      .catch(fetchError => {
        if (!cancelled) {
          setError(fetchError.message || 'Failed to load ambassadors');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      id={SECTION_IDS.ambassadors}
      className={css.section}
      aria-labelledby="ambassador-meet-heading"
    >
      <p className={css.sectionLabel}>
        <FormattedMessage id="AmbassadorProgramPage.ambassadorsLabel" />
      </p>
      <h2 id="ambassador-meet-heading" className={css.sectionTitle}>
        <FormattedMessage id="AmbassadorProgramPage.ambassadorsTitle" />
      </h2>

      {onlyFounder ? (
        <p className={css.ambassadorsEmptyLead}>
          <FormattedMessage id="AmbassadorProgramPage.ambassadorsOnlyFounderLead" />
        </p>
      ) : null}

      {error ? <p className={css.ambassadorsError}>{error}</p> : null}

      {loading ? (
        <p className={css.ambassadorsLoading}>
          <FormattedMessage id="AmbassadorProgramPage.ambassadorsLoading" />
        </p>
      ) : null}

      {!loading && ambassadors.length === 0 ? (
        <p className={css.ambassadorsEmptyLead}>
          <FormattedMessage id="AmbassadorProgramPage.ambassadorsEmpty" />
        </p>
      ) : null}

      {ambassadors.length > 0 ? (
        <div className={css.ambassadorsTrack}>
          <ul className={css.ambassadorsScroller}>
            {ambassadors.map(ambassador => (
              <AmbassadorShowcaseCard key={ambassador.userId} ambassador={ambassador} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
};

export default MeetAmbassadorsSection;
