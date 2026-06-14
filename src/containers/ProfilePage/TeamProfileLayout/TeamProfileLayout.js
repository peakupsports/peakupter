import React, { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';

import appSettings from '../../../config/settings';
import { FormattedMessage } from '../../../util/reactIntl';
import { richText } from '../../../util/richText';
import { fetchTeamMembers } from '../../../util/api';
import * as apiUtils from '../../../util/api';
import { extractSportKeysFromCoachProfile } from '../../../util/coachExplore';
import { batchedReviewStats } from '../../../util/coachReviewStats';
import {
  getPeakupTeamMemberIds,
  getPeakupTeamSports,
  getTeamPrimarySportFormValue,
  getTeamSecondarySportFormValue,
  getTeamShortLocationLabel,
  isPeakUpVerifiedTeam,
} from '../../../util/peakupTeam';
import { formatProfileSportsForSticker, resolveDisplayBadgeIds } from '../../../util/profileCoachSticker';
import { createInstance } from '../../../util/sdkLoader';
import { Button, PeakUpCoachFigurineCard, PeakUpLocationPin } from '../../../components';
import NamedLink from '../../../components/NamedLink/NamedLink';
import ResponsiveImage from '../../../components/ResponsiveImage/ResponsiveImage';
import TopbarContainer from '../../TopbarContainer/TopbarContainer';
import FooterContainer from '../../FooterContainer/FooterContainer';

import css from './TeamProfileLayout.module.css';

const MIN_LENGTH_FOR_LONG_WORDS = 20;

/** Wide banner variants only — never reuse square logo crops in the hero. */
const HERO_IMAGE_VARIANTS = ['scaled-large', 'scaled-medium', 'scaled-small', 'default'];

const LOGO_VARIANTS = ['square-small2x', 'square-small'];

let clientSdk = null;

const getClientSdk = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!clientSdk) {
    const baseUrl = appSettings.sdk.baseUrl ? { baseUrl: appSettings.sdk.baseUrl } : {};
    const assetCdnBaseUrl = appSettings.sdk.assetCdnBaseUrl
      ? { assetCdnBaseUrl: appSettings.sdk.assetCdnBaseUrl }
      : {};
    clientSdk = createInstance({
      transitVerbose: appSettings.sdk.transitVerbose,
      clientId: appSettings.sdk.clientId,
      secure: appSettings.usingSSL,
      typeHandlers: apiUtils.typeHandlers,
      ...baseUrl,
      ...assetCdnBaseUrl,
    });
  }
  return clientSdk;
};

const normalizeExternalUrl = raw => {
  const value = String(raw || '').trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
};

const normalizeInstagramUrl = raw => {
  const value = String(raw || '').trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const handle = value.replace(/^@/, '');
  if (!handle) return null;
  return `https://instagram.com/${handle}`;
};

const TeamSectionHeader = props => {
  const { kickerId, titleId, infoId, large = false } = props;
  return (
    <header className={classNames(css.sectionHeader, large && css.sectionHeaderLarge)}>
      {kickerId ? (
        <p className={css.sectionKicker}>
          <FormattedMessage id={kickerId} />
        </p>
      ) : null}
      <h2 className={css.sectionTitle}>
        <FormattedMessage id={titleId} />
      </h2>
      {infoId ? (
        <p className={css.sectionLead}>
          <FormattedMessage id={infoId} />
        </p>
      ) : null}
    </header>
  );
};

const TeamStat = props => {
  const { labelId, value, subLabelId, loading = false } = props;
  return (
    <div className={css.statCard}>
      <span className={css.statValue}>{loading ? '—' : value}</span>
      <span className={css.statLabel}>
        <FormattedMessage id={labelId} />
      </span>
      {subLabelId ? (
        <span className={css.statSubLabel}>
          <FormattedMessage id={subLabelId} />
        </span>
      ) : null}
    </div>
  );
};

/**
 * PeakUp public team profile — organizational layout for teams, clubs and academies.
 */
const TeamProfileLayout = props => {
  const {
    profileUser,
    displayName,
    bio,
    publicData = {},
    profileUserUuid,
    showEditProfileLink = false,
    intl,
  } = props;

  const [members, setMembers] = useState([]);
  const [membersError, setMembersError] = useState(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [reviewStatsLoading, setReviewStatsLoading] = useState(false);
  const [aggregatedReviews, setAggregatedReviews] = useState({ count: 0, average: null });

  const verified = isPeakUpVerifiedTeam(publicData);
  const teamBio = publicData?.teamBio || bio || '';
  const tagline = publicData?.teamTagline || '';
  const foundedYear = String(publicData?.teamFoundedYear || '').trim();
  const websiteUrl = normalizeExternalUrl(publicData?.teamWebsite);
  const instagramUrl = normalizeInstagramUrl(publicData?.teamInstagram);

  const primarySportKey = getTeamPrimarySportFormValue(publicData);
  const secondarySportKey = getTeamSecondarySportFormValue(publicData);
  const allSportKeys = getPeakupTeamSports(publicData);

  const sportsOffered = useMemo(() => {
    if (!intl || allSportKeys.length === 0) {
      return [];
    }
    return formatProfileSportsForSticker(intl, allSportKeys).map(sport => ({
      ...sport,
      isPrimary: sport.key === primarySportKey,
      isSecondary: sport.key === secondarySportKey,
    }));
  }, [allSportKeys, intl, primarySportKey, secondarySportKey]);

  const teamRow = useMemo(
    () => ({
      author: profileUser,
      representativeListing: null,
    }),
    [profileUser]
  );

  const locationLabel = getTeamShortLocationLabel(teamRow, { intl });

  const storedCoachCount = parseInt(String(publicData?.teamCoachCount || '').trim(), 10);
  const profileMemberCount = getPeakupTeamMemberIds(publicData).length;
  const coachCount =
    members.length > 0
      ? members.length
      : profileMemberCount > 0
      ? profileMemberCount
      : Number.isFinite(storedCoachCount) && storedCoachCount > 0
      ? storedCoachCount
      : 0;

  const ratingDisplay =
    aggregatedReviews.average != null && aggregatedReviews.count > 0
      ? aggregatedReviews.average.toFixed(1)
      : '—';

  useEffect(() => {
    if (!profileUserUuid) {
      setMembers([]);
      return;
    }
    let cancelled = false;
    setMembersLoading(true);
    setMembersError(null);
    fetchTeamMembers(profileUserUuid)
      .then(res => {
        if (cancelled) return;
        const raw = Array.isArray(res?.members) ? res.members : [];
        const mapped = raw.map(m => ({
          id: { uuid: m.id },
          type: 'user',
          attributes: m.attributes,
          profileImage: m.profileImage,
        }));
        setMembers(mapped);
      })
      .catch(() => {
        if (!cancelled) {
          setMembersError(true);
          setMembers([]);
        }
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profileUserUuid]);

  useEffect(() => {
    const coachIds = members.map(m => m.id?.uuid || m.id).filter(Boolean);
    if (coachIds.length === 0) {
      setAggregatedReviews({ count: 0, average: null });
      return;
    }

    const sdk = getClientSdk();
    if (!sdk) {
      return;
    }

    let cancelled = false;
    setReviewStatsLoading(true);
    batchedReviewStats(sdk, coachIds, {
      concurrency: 3,
      maxSubjects: 12,
      source: 'TeamProfileLayout',
    })
      .then(({ stats }) => {
        if (cancelled) return;
        let totalCount = 0;
        let weightedSum = 0;
        Object.values(stats || {}).forEach(row => {
          const count = row?.count || 0;
          const avg = row?.average;
          if (count > 0 && avg != null) {
            totalCount += count;
            weightedSum += avg * count;
          }
        });
        setAggregatedReviews({
          count: totalCount,
          average: totalCount > 0 ? weightedSum / totalCount : null,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setAggregatedReviews({ count: 0, average: null });
        }
      })
      .finally(() => {
        if (!cancelled) setReviewStatsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [members]);

  const profileImage = profileUser?.profileImage;
  const heroVariants = profileImage
    ? Object.keys(profileImage?.attributes?.variants || {}).filter(k =>
        HERO_IMAGE_VARIANTS.includes(k)
      )
    : [];
  const logoVariants = profileImage
    ? Object.keys(profileImage?.attributes?.variants || {}).filter(k => LOGO_VARIANTS.includes(k))
    : [];

  const hasHeroPhoto = profileImage && heroVariants.length > 0;
  const hasLogo = profileImage && logoVariants.length > 0;
  const showAbout = Boolean(teamBio || websiteUrl || instagramUrl);
  const showSports = sportsOffered.length > 0;

  return (
    <div className={css.teamPage}>
      <div className={css.bgGlow} aria-hidden="true" />
      <TopbarContainer />

      <main className={css.main}>
        <div className={css.shell}>
          <header className={css.teamHero}>
            <div className={css.heroBackdrop} aria-hidden={!hasHeroPhoto}>
              {hasHeroPhoto ? (
                <ResponsiveImage
                  className={css.heroPhoto}
                  image={profileImage}
                  variants={heroVariants}
                  alt=""
                />
              ) : (
                <div className={css.heroPlaceholder} />
              )}
              <div className={css.heroBackdropOverlay} />
            </div>

            <div className={css.heroContent}>
              <div className={css.heroIdentity}>
                {hasLogo ? (
                  <ResponsiveImage
                    className={css.logoMark}
                    image={profileImage}
                    variants={logoVariants}
                    alt=""
                  />
                ) : (
                  <div className={css.logoFallback} aria-hidden="true">
                    {(displayName || 'T').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={css.heroIdentityText}>
                  <p className={css.pageEyebrow}>
                    <FormattedMessage id="TeamProfilePage.pageEyebrow" />
                  </p>
                  {verified ? (
                    <span className={css.verifiedBadge}>
                      <FormattedMessage id="TeamProfilePage.verifiedTeam" />
                    </span>
                  ) : null}
                  <h1 className={css.teamName}>{displayName || ''}</h1>
                  {tagline ? <p className={css.tagline}>{tagline}</p> : null}
                  {locationLabel ? (
                    <p className={css.heroLocation}>
                      <PeakUpLocationPin size="md" rootClassName={css.locationPin} />
                      <span>{locationLabel}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              <div className={css.statsRow} aria-label="Team statistics">
                <TeamStat
                  labelId="TeamProfilePage.statCoaches"
                  value={coachCount > 0 ? coachCount : '—'}
                  loading={membersLoading && coachCount === 0}
                />
                <TeamStat
                  labelId="TeamProfilePage.statReviews"
                  value={aggregatedReviews.count > 0 ? aggregatedReviews.count : '—'}
                  loading={reviewStatsLoading && aggregatedReviews.count === 0}
                />
                <TeamStat
                  labelId="TeamProfilePage.statSports"
                  value={sportsOffered.length > 0 ? sportsOffered.length : '—'}
                />
                <TeamStat labelId="TeamProfilePage.statFounded" value={foundedYear || '—'} />
              </div>
            </div>
          </header>

          <section
            className={classNames(css.workspaceSection, css.coachesSection)}
            aria-labelledby="team-roster-heading"
          >
            <TeamSectionHeader
              kickerId="TeamProfilePage.coachesKicker"
              titleId="TeamProfilePage.rosterHeading"
              infoId="TeamProfilePage.rosterLead"
              large
            />
            <h2 id="team-roster-heading" className={css.srOnly}>
              <FormattedMessage id="TeamProfilePage.rosterHeading" />
            </h2>

            {membersLoading ? (
              <p className={css.status}>
                <FormattedMessage id="TeamProfilePage.rosterLoading" />
              </p>
            ) : null}
            {membersError && !membersLoading ? (
              <p className={css.status}>
                <FormattedMessage id="TeamProfilePage.rosterError" />
              </p>
            ) : null}
            {!membersLoading && !membersError && members.length === 0 ? (
              <div className={css.emptyState}>
                <p className={css.emptyTitle}>
                  <FormattedMessage id="TeamProfilePage.rosterEmptyTitle" />
                </p>
                <p className={css.emptyLead}>
                  <FormattedMessage id="TeamProfilePage.rosterEmpty" />
                </p>
              </div>
            ) : null}
            {!membersLoading && members.length > 0 ? (
              <ul className={css.rosterGrid}>
                {members.map(member => {
                  const memberPd = member?.attributes?.profile?.publicData || {};
                  const sportKeys = extractSportKeysFromCoachProfile(member);
                  const badgeIds = resolveDisplayBadgeIds(memberPd);
                  return (
                    <li key={member.id?.uuid || member.id} className={css.rosterItem}>
                      <PeakUpCoachFigurineCard
                        author={member}
                        sportKeys={sportKeys}
                        badgeIds={badgeIds}
                      />
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>

          {(showSports || showAbout) && (
            <div className={css.detailGrid}>
              {showSports ? (
                <section className={classNames(css.workspaceSection, css.sportsSection)}>
                  <TeamSectionHeader
                    kickerId="TeamProfilePage.sportsKicker"
                    titleId="TeamProfilePage.sportsOfferedHeading"
                    infoId="TeamProfilePage.sportsOfferedLead"
                  />
                  <div className={css.sportsPanel}>
                    {sportsOffered.map(sport => (
                      <div
                        key={sport.key}
                        className={classNames(
                          css.sportCard,
                          sport.isPrimary && css.sportCardPrimary,
                          sport.isSecondary && css.sportCardSecondary
                        )}
                      >
                        {sport.isPrimary || sport.isSecondary ? (
                          <span className={css.sportCardBadge}>
                            <FormattedMessage
                              id={
                                sport.isPrimary
                                  ? 'TeamProfilePage.sportsPrimaryBadge'
                                  : 'TeamProfilePage.sportsSecondaryBadge'
                              }
                            />
                          </span>
                        ) : null}
                        <span className={css.sportCardEmoji} aria-hidden="true">
                          {sport.emoji}
                        </span>
                        <span className={css.sportCardLabel}>{sport.label}</span>
                      </div>
                    ))}
                  </div>
                  {aggregatedReviews.average != null && aggregatedReviews.count > 0 ? (
                    <p className={css.sportsFootnote}>
                      <FormattedMessage
                        id="TeamProfilePage.teamRatingFootnote"
                        values={{ rating: ratingDisplay, count: aggregatedReviews.count }}
                      />
                    </p>
                  ) : null}
                </section>
              ) : null}

              {showAbout ? (
                <section className={classNames(css.workspaceSection, css.aboutSection)}>
                  <TeamSectionHeader
                    kickerId="TeamProfilePage.aboutKicker"
                    titleId="TeamProfilePage.aboutHeading"
                    infoId="TeamProfilePage.aboutLead"
                  />
                  {teamBio ? (
                    <div className={css.bio}>
                      {richText(teamBio, {
                        linkify: true,
                        longWordMinLength: MIN_LENGTH_FOR_LONG_WORDS,
                        longWordClass: css.longWord,
                      })}
                    </div>
                  ) : null}
                  {(websiteUrl || instagramUrl) && (
                    <div className={css.socialRow}>
                      {websiteUrl ? (
                        <a
                          className={css.socialLink}
                          href={websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FormattedMessage id="TeamProfilePage.website" />
                        </a>
                      ) : null}
                      {instagramUrl ? (
                        <a
                          className={css.socialLink}
                          href={instagramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FormattedMessage id="TeamProfilePage.instagram" />
                        </a>
                      ) : null}
                    </div>
                  )}
                </section>
              ) : null}
            </div>
          )}

          <section className={css.ctaCard} aria-labelledby="team-cta-heading">
            <h2 id="team-cta-heading" className={css.srOnly}>
              <FormattedMessage id="TeamProfilePage.ctaHeading" />
            </h2>
            <p className={css.ctaLead}>
              <FormattedMessage id="TeamProfilePage.ctaLead" />
            </p>
            <div className={css.ctaRow}>
              <NamedLink name="TeamApplicationPage">
                <Button className={css.joinBtn}>
                  <FormattedMessage id="TeamProfilePage.joinCta" />
                </Button>
              </NamedLink>
              {showEditProfileLink ? (
                <NamedLink className={css.editLink} name="ProfileSettingsPage">
                  <FormattedMessage id="TeamProfilePage.editProfile" />
                </NamedLink>
              ) : null}
            </div>
          </section>
        </div>
      </main>

      <FooterContainer />
    </div>
  );
};

export default TeamProfileLayout;
