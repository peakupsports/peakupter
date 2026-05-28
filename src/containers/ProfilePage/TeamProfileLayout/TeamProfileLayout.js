import React, { useEffect, useMemo, useState } from 'react';

import { FormattedMessage } from '../../../util/reactIntl';
import { richText } from '../../../util/richText';
import { extractSportKeysFromCoachProfile } from '../../../util/coachExplore';
import { getPeakupTeamSports, getTeamShortLocationLabel, isPeakUpVerifiedTeam } from '../../../util/peakupTeam';
import { formatProfileSportsForSticker, resolveDisplayBadgeIds } from '../../../util/profileCoachSticker';
import { fetchTeamMembers } from '../../../util/api';
import { Button, PeakUpCoachFigurineCard, PeakUpLocationPin } from '../../../components';
import NamedLink from '../../../components/NamedLink/NamedLink';
import ResponsiveImage from '../../../components/ResponsiveImage/ResponsiveImage';
import TopbarContainer from '../../TopbarContainer/TopbarContainer';
import FooterContainer from '../../FooterContainer/FooterContainer';
import ProfilePageSportBarTopbar from '../ProfilePageSportBarTopbar';

import css from './TeamProfileLayout.module.css';

const MIN_LENGTH_FOR_LONG_WORDS = 20;

const HERO_IMAGE_VARIANTS = [
  'scaled-large',
  'scaled-medium',
  'scaled-small',
  'default',
  'square-small2x',
  'square-small',
];

const LOGO_VARIANTS = ['square-small2x', 'square-small'];

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

/**
 * PeakUp team / crew profile — cinematic hero + coach figurina roster (not coach figurina layout).
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

  const verified = isPeakUpVerifiedTeam(publicData);
  const teamBio = publicData?.teamBio || bio || '';
  const crewLine = publicData?.teamTagline || '';
  const websiteUrl = normalizeExternalUrl(publicData?.teamWebsite);
  const instagramUrl = normalizeInstagramUrl(publicData?.teamInstagram);

  const sports =
    intl && typeof intl.formatMessage === 'function'
      ? formatProfileSportsForSticker(intl, getPeakupTeamSports(publicData))
      : [];

  const teamRow = useMemo(
    () => ({
      author: profileUser,
      representativeListing: null,
    }),
    [profileUser]
  );

  const locationLabel = getTeamShortLocationLabel(teamRow, { intl });

  const storedCoachCount = parseInt(String(publicData?.teamCoachCount || '').trim(), 10);
  const coachCountDisplay =
    members.length > 0
      ? members.length
      : Number.isFinite(storedCoachCount) && storedCoachCount > 0
      ? storedCoachCount
      : null;

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
        setMembers(
          raw.map(m => ({
            id: { uuid: m.id },
            type: 'user',
            attributes: m.attributes,
            profileImage: m.profileImage,
          }))
        );
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

  const profileImage = profileUser?.profileImage;
  const heroVariants = profileImage
    ? Object.keys(profileImage?.attributes?.variants || {}).filter(k => HERO_IMAGE_VARIANTS.includes(k))
    : [];
  const logoVariants = profileImage
    ? Object.keys(profileImage?.attributes?.variants || {}).filter(k => LOGO_VARIANTS.includes(k))
    : [];

  const hasHeroPhoto = profileImage && heroVariants.length > 0;

  return (
    <div className={css.teamPage}>
      <TopbarContainer topbarCenterContent={<ProfilePageSportBarTopbar />} />

      <main className={css.main}>
        <header className={css.heroCinematic}>
          <div className={css.heroMedia} aria-hidden={!hasHeroPhoto}>
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
          </div>
          <div className={css.heroOverlay} />
          <div className={css.heroGlow} />

          <div className={css.heroContent}>
            <div className={css.heroBrandRow}>
              {profileImage && logoVariants.length > 0 ? (
                <ResponsiveImage
                  className={css.logoBadge}
                  image={profileImage}
                  variants={logoVariants}
                  alt=""
                />
              ) : null}
              <div>
                {verified ? (
                  <span className={css.verifiedBadge}>
                    <FormattedMessage id="TeamProfilePage.verifiedCrew" />
                  </span>
                ) : null}
                <h1 className={css.teamName}>{displayName || ''}</h1>
              </div>
            </div>

            {crewLine ? <p className={css.crewLine}>{crewLine}</p> : null}

            <div className={css.heroMeta}>
              {locationLabel ? (
                <div className={css.locationRow}>
                  <PeakUpLocationPin size="md" rootClassName={css.locationPin} />
                  <span className={css.locationText}>{locationLabel}</span>
                </div>
              ) : null}
              {sports?.length > 0 ? (
                <ul className={css.sportChips}>
                  {sports.map(s => (
                    <li key={s.key} className={css.sportChip}>
                      {s.emoji} {s.label}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </header>

        <div className={css.rail}>
          <section className={css.introSection} aria-labelledby="team-about-heading">
            <h2 id="team-about-heading" className={css.sectionTitle}>
              <FormattedMessage id="TeamProfilePage.aboutHeading" />
            </h2>
            <p className={css.sectionLead}>
              <FormattedMessage id="TeamProfilePage.aboutLead" />
            </p>

            {teamBio ? (
              <div className={css.bio}>
                {richText(teamBio, {
                  linkify: true,
                  longWordMinLength: MIN_LENGTH_FOR_LONG_WORDS,
                  longWordClass: css.longWord,
                })}
              </div>
            ) : null}

            {coachCountDisplay != null ? (
              <div className={css.statsRow}>
                <span className={css.statPill}>
                  <FormattedMessage
                    id="TeamProfilePage.coachCount"
                    values={{ count: coachCountDisplay }}
                  />
                </span>
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

          <section className={css.rosterSection} aria-labelledby="team-roster-heading">
            <h2 id="team-roster-heading" className={css.sectionTitle}>
              <FormattedMessage id="TeamProfilePage.rosterHeading" />
            </h2>
            <p className={css.sectionLead}>
              <FormattedMessage id="TeamProfilePage.rosterLead" />
            </p>

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
            {!membersLoading && members.length === 0 ? (
              <p className={css.status}>
                <FormattedMessage id="TeamProfilePage.rosterEmpty" />
              </p>
            ) : (
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
            )}
          </section>
        </div>
      </main>

      <FooterContainer />
    </div>
  );
};

export default TeamProfileLayout;
