import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { fetchAmbassadorsShowcase } from '../../util/api';
import { getShowcaseTierStyleVars } from '../../util/ambassadorShowcase';
import { countryDisplayName } from '../../util/coachExplore';
import { NamedLink, PeakUpAmbassadorTierBadge } from '../../components';
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

const buildAmbassadorMetaLine = (ambassador, locale) => {
  const countryLabel = ambassador.country
    ? countryDisplayName(ambassador.country, locale)
    : '';
  const metaParts = [ambassador.sports, countryLabel || ambassador.location].filter(Boolean);
  return metaParts.join(' · ');
};

/**
 * @param {object} props
 * @param {object} props.ambassador
 */
const AmbassadorShowcaseCard = ({ ambassador }) => {
  const intl = useIntl();
  const tierId = ambassador.tierId;
  const tierStyle = getShowcaseTierStyleVars(tierId);
  const tierNameId = resolveTierNameId(tierId);
  const metaLine = buildAmbassadorMetaLine(ambassador, intl.locale);

  return (
    <li
      className={classNames(css.ambassadorCard, css[`ambassadorCard_${tierId}`])}
      style={tierStyle}
    >
      <NamedLink
        className={css.ambassadorCardLink}
        name="ProfilePage"
        params={{ id: ambassador.userId }}
      >
        <PeakUpAmbassadorTierBadge
          tierId={tierId}
          size="showcase"
          showHalo
          className={classNames(
            css.ambassadorCardBadge,
            tierId === 'founder' ? css.ambassadorCardBadgeFounder : null
          )}
          alt={intl.formatMessage({ id: tierNameId })}
        />

        <div className={css.ambassadorCardBody}>
          <div
            className={classNames(
              css.ambassadorAvatar,
              ambassador.profileImageUrl ? css.ambassadorAvatarPhoto : null
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

          <h3 className={css.ambassadorName}>{ambassador.displayNameShort}</h3>

          {metaLine ? <p className={css.ambassadorMeta}>{metaLine}</p> : null}

          <span
            className={classNames(css.ambassadorLevelPill, css[`ambassadorLevelPill_${tierId}`])}
          >
            <FormattedMessage id={tierNameId} />
          </span>
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
          <ul className={css.ambassadorsGrid}>
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
