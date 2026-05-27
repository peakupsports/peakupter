import React, { useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import moment from 'moment';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { getAmbassadorProfileState, isAmbassadorActive } from '../../util/ambassadorActivation';
import { FOUNDER_BADGE_IMAGE } from '../../util/ambassadorFounderOverride';
import { fetchReferralCenterDashboard } from '../../util/api';
import {
  buildAmbassadorShareLink,
  formatAmbassadorShareLinkDisplay,
  getCoachInitials,
} from '../../util/referralCenter';

import { NamedLink, Page } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import sportTheme from '../SportPagesTheme.module.css';
import { AMBASSADOR_LEVELS } from '../AmbassadorProgramPage/ambassadorProgramContent';
import {
  AMBASSADOR_PROGRAM_LEVELS_HASH,
  getAmbassadorTierConfig,
  getNextAmbassadorTierConfig,
  getTierCommissionReward,
  NEXT_TIER_REQUIREMENT_IDS,
  HERO_PROGRESS_TIER_IDS,
  PLACEHOLDER_STATS,
  REFERRAL_CENTER_TIER_IMAGES,
  REFERRAL_STATUS_LABEL_IDS,
  REFERRAL_TABLE_COLUMNS,
  REWARD_BREAKDOWN_STATS,
  REWARD_HISTORY_COLUMNS,
} from './referralCenterContent';
import css from './ReferralCenterPage.module.css';

const copyToClipboard = async text => {
  if (!text) {
    return false;
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof document === 'undefined') {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);
  return ok;
};

const ScrollReveal = ({ children, className, delay = 0, as: Tag = 'div', ...rest }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return undefined;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -4% 0px', threshold: 0.06 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={classNames(className, css.reveal, visible && css.revealVisible)}
      style={{ '--reveal-delay': `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
};

const ShareIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
    <path
      d="M12 16V4m0 0 4 4m-4-4-4 4"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const KpiStatIcon = ({ variant, className }) => {
  if (variant === 'pending') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
        <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    );
  }
  if (variant === 'active') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M13 3L5 14h6l-1 7 9-13h-6l1-5z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (variant === 'rewards') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3v18M8 7h8M9 11c0-2 1.5-3 3-3s3 1 3 3-1.5 3-3 3"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M4 19c0-3 2.5-5 5-5s5 2 5 5M16 11h5M16 15h3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
};

const NetworkIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <circle cx="32" cy="14" r="6" stroke="currentColor" strokeWidth="2" />
    <circle cx="14" cy="44" r="6" stroke="currentColor" strokeWidth="2" />
    <circle cx="50" cy="44" r="6" stroke="currentColor" strokeWidth="2" />
    <path d="M32 20v12M20 38l8-6m16 6-8-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
  </svg>
);

const CopyButton = ({ labelId, copiedLabelId, value, className, variant = 'primary' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const ok = await copyToClipboard(value);
      if (ok) {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
      }
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      className={classNames(
        css.copyButton,
        variant === 'secondary' ? css.copyButtonSecondary : null,
        copied ? css.copyButtonCopied : null,
        className
      )}
      onClick={handleCopy}
      disabled={!value}
    >
      {copied ? (
        <FormattedMessage id={copiedLabelId || 'ReferralCenterPage.copied'} />
      ) : (
        <>
          <ShareIcon className={css.copyButtonIcon} />
          <FormattedMessage id={labelId} />
        </>
      )}
    </button>
  );
};

const ACTIVITY_TYPE_LABEL_IDS = {
  coach_applied: 'ReferralCenterPage.activityCoachApplied',
  coach_verified: 'ReferralCenterPage.activityCoachVerified',
  coach_active: 'ReferralCenterPage.activityCoachActive',
  first_booking: 'ReferralCenterPage.activityFirstBooking',
  reward_earned: 'ReferralCenterPage.activityRewardEarned',
  tier_upgraded: 'ReferralCenterPage.activityTierUpgraded',
  rewards_unlocked: 'ReferralCenterPage.activityRewardsUnlocked',
};

const buildInviteMessage = (referralLinkDisplay, referralCode) =>
  `Join PeakUp with my ambassador invite: ${referralLinkDisplay}${referralCode ? ` (code: ${referralCode})` : ''}`;

const ShareTools = ({ referralLink, referralLinkDisplay, referralCode, intl }) => {
  const inviteMessage = useMemo(
    () => buildInviteMessage(referralLinkDisplay, referralCode),
    [referralLinkDisplay, referralCode]
  );
  const whatsAppHref = `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`;
  const qrSrc = referralLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(referralLink)}`
    : null;

  return (
    <div className={css.shareTools}>
      <div className={css.shareToolsActions}>
        <a
          className={classNames(css.shareToolButton, css.shareToolWhatsapp)}
          href={whatsAppHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FormattedMessage id="ReferralCenterPage.shareWhatsapp" />
        </a>
        <CopyButton
          labelId="ReferralCenterPage.copyInviteMessage"
          value={inviteMessage}
          variant="secondary"
          className={css.shareToolCopyButton}
        />
      </div>
      {qrSrc ? (
        <div className={css.qrBlock}>
          <div className={css.qrGlow} aria-hidden="true" />
          <img
            className={css.qrImage}
            src={qrSrc}
            width={140}
            height={140}
            alt={intl.formatMessage({ id: 'ReferralCenterPage.qrAlt' })}
            loading="lazy"
          />
          <p className={css.qrCaption}>
            <FormattedMessage id="ReferralCenterPage.qrCaption" />
          </p>
        </div>
      ) : null}
    </div>
  );
};

const ActivityFeed = ({ activity }) => {
  if (!activity?.length) {
    return (
      <p className={css.activityEmpty}>
        <FormattedMessage id="ReferralCenterPage.activityEmpty" />
      </p>
    );
  }

  return (
    <ol className={css.activityList}>
      {activity.map(item => (
        <li key={item.id} className={css.activityItem}>
          <span className={css.activityDot} aria-hidden="true" />
          <div className={css.activityCopy}>
            <p className={css.activityTitle}>
              {item.title || (
                <FormattedMessage
                  id={ACTIVITY_TYPE_LABEL_IDS[item.type] || 'ReferralCenterPage.activityDefault'}
                />
              )}
            </p>
            {item.body ? <p className={css.activityBody}>{item.body}</p> : null}
            <time className={css.activityTime} dateTime={item.createdAt}>
              {moment(item.createdAt).format('D MMM YYYY, HH:mm')}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
};

const UnlockBanner = ({ visible }) =>
  visible ? (
    <div className={css.unlockBanner} role="status">
      <span className={css.unlockBannerGlow} aria-hidden="true" />
      <p className={css.unlockBannerTitle}>
        <FormattedMessage id="ReferralCenterPage.unlockBannerTitle" />
      </p>
      <p className={css.unlockBannerBody}>
        <FormattedMessage id="ReferralCenterPage.unlockBannerBody" />
      </p>
    </div>
  ) : null;

const RewardHistoryRow = ({ entry }) => {
  const statusClass =
    entry.status === 'earned' || entry.status === 'paid'
      ? css.rowStatusActive
      : entry.status === 'pending'
      ? css.rowStatusApplied
      : css.rowStatusInvited;

  return (
    <tr className={css.tableRow}>
      <td>{moment(entry.createdAt).format('D MMM YYYY')}</td>
      <td>{entry.referredCoachName || '—'}</td>
      <td>{entry.bookingAmountFormatted}</td>
      <td>{entry.coachNetPayoutFormatted}</td>
      <td className={css.rewardAmountCell}>{entry.amountFormatted}</td>
      <td>
        <span className={classNames(css.rowStatusPill, statusClass)}>
          <FormattedMessage
            id={
              entry.status === 'earned' || entry.status === 'paid'
                ? 'ReferralCenterPage.rewardStatusEarned'
                : 'ReferralCenterPage.rewardStatusPending'
            }
          />
        </span>
      </td>
    </tr>
  );
};

/**
 * Hero KPI for ambassador earnings — when locked, shows real earnings (0) and locked pending total.
 */
const KpiRewardsCard = ({ rewardsUnlocked, earnedFormatted, lockedFormatted }) => (
  <article
    className={classNames(
      css.kpiCard,
      css.kpiCard_rewards,
      !rewardsUnlocked ? css.kpiCard_rewardsLocked : null
    )}
  >
    <KpiStatIcon variant="rewards" className={css.kpiIcon} />
    <div className={css.kpiCardBody}>
      {rewardsUnlocked ? (
        <>
          <p className={css.kpiLabel}>
            <FormattedMessage id="ReferralCenterPage.statRealEarnings" />
          </p>
          <p className={css.kpiValue}>{earnedFormatted}</p>
        </>
      ) : (
        <>
          <div className={css.kpiLockedSection}>
            <p className={css.kpiLabel}>
              <FormattedMessage id="ReferralCenterPage.statRealEarnings" />
            </p>
            <p className={classNames(css.kpiValue, css.kpiValueMuted)}>{earnedFormatted}</p>
          </div>
          <div className={css.kpiLockedSection}>
            <p className={css.kpiLabel}>
              <FormattedMessage id="ReferralCenterPage.statLockedRewards" />
            </p>
            <p className={classNames(css.kpiValue, css.kpiValueLocked)}>{lockedFormatted}</p>
            <p className={css.kpiSubtitle}>
              <FormattedMessage id="ReferralCenterPage.lockedRewardsSubtitle" />
            </p>
          </div>
        </>
      )}
    </div>
    <span className={css.kpiAccentBar} aria-hidden="true" />
  </article>
);

const RewardHistoryPanel = ({ rewardHistory }) => {
  if (!rewardHistory?.length) {
    return (
      <p className={css.activityEmpty}>
        <FormattedMessage id="ReferralCenterPage.rewardHistoryEmpty" />
      </p>
    );
  }

  return (
    <div className={css.tableWrap}>
      <table className={css.table}>
        <thead>
          <tr>
            {REWARD_HISTORY_COLUMNS.map(col => (
              <th key={col.id} scope="col">
                <FormattedMessage id={col.labelId} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rewardHistory.map(entry => (
            <RewardHistoryRow key={entry.id} entry={entry} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ProgressCriterion = ({ item }) => (
  <li
    className={classNames(
      css.progressItem,
      item.completed ? css.progressItemComplete : css.progressItemLocked
    )}
  >
    <div className={css.progressHeader}>
      <span
        className={classNames(css.progressCheck, item.completed ? css.progressCheckDone : null)}
        aria-hidden="true"
      >
        {item.completed ? '✓' : '○'}
      </span>
      <div className={css.progressCopy}>
        <span className={css.progressLabel}>
          <FormattedMessage id={item.labelId} />
        </span>
        <span className={css.progressTarget}>
          <FormattedMessage id={item.targetId} />
        </span>
      </div>
      <span className={css.progressPercent}>{item.progress}%</span>
    </div>
    <div className={css.progressTrack} aria-hidden="true">
      <span
        className={classNames(
          css.progressFill,
          item.completed ? css.progressFillComplete : css.progressFillLocked
        )}
        style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
      />
    </div>
  </li>
);

const EmptyReferralsPanel = ({ referralLink }) => (
  <div className={css.emptyPanel}>
    <div className={css.emptyIconWrap}>
      <NetworkIcon className={css.emptyIcon} />
    </div>
    <h3 className={css.emptyTitle}>
      <FormattedMessage id="ReferralCenterPage.emptyTitle" />
    </h3>
    <p className={css.emptyBody}>
      <FormattedMessage id="ReferralCenterPage.emptyBody" />
    </p>
    <CopyButton
      labelId="ReferralCenterPage.emptyCtaCopyLink"
      value={referralLink}
      className={css.emptyCta}
    />
  </div>
);

const ReferralRow = ({ referral }) => {
  const statusClass =
    referral.status === 'active'
      ? css.rowStatusActive
      : referral.status === 'verified'
      ? css.rowStatusVerified
      : referral.status === 'applied'
      ? css.rowStatusApplied
      : css.rowStatusInvited;

  return (
    <tr className={classNames(css.tableRow, referral.status === 'active' ? css.tableRowActive : null)}>
      <td>
        <div className={css.coachCell}>
          <span className={css.coachAvatar} aria-hidden="true">
            {getCoachInitials(referral.name)}
          </span>
          <span>{referral.name}</span>
        </div>
      </td>
      <td>{referral.email}</td>
      <td>
        <span className={classNames(css.rowStatusPill, statusClass)}>
          <FormattedMessage id={REFERRAL_STATUS_LABEL_IDS[referral.status]} />
        </span>
      </td>
      <td>{referral.joinedAt}</td>
      <td>{referral.listings}</td>
      <td>{referral.rewardStatus}</td>
    </tr>
  );
};

const AccessGate = ({ titleId, bodyId, children }) => (
  <section className={css.gateCard}>
    <h1 className={css.gateTitle}>
      <FormattedMessage id={titleId} />
    </h1>
    <p className={css.gateBody}>
      <FormattedMessage id={bodyId} />
    </p>
    <div className={css.gateActions}>{children}</div>
  </section>
);

/**
 * Ambassador Referral Center — premium dashboard for active ambassadors.
 */
const ReferralCenterPage = () => {
  const intl = useIntl();
  const location = useLocation();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const currentUser = useSelector(state => state.user.currentUser);
  const isAuthenticated = useSelector(state => state.auth?.isAuthenticated);

  const marketplaceName = config.marketplaceName;
  const profileState = useMemo(() => getAmbassadorProfileState(currentUser), [currentUser]);
  const ambassadorActive = isAmbassadorActive(currentUser);

  const loginFromState = useMemo(
    () => ({ from: `${location.pathname}${location.search}${location.hash}` }),
    [location.hash, location.pathname, location.search]
  );

  const referralCode = profileState.ambassadorReferralCode || '';
  const referralLink = useMemo(
    () => buildAmbassadorShareLink(referralCode, config),
    [referralCode, config]
  );
  const referralLinkDisplay = useMemo(
    () => formatAmbassadorShareLinkDisplay(referralCode, config),
    [referralCode, config]
  );

  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);
  const [showUnlockBanner, setShowUnlockBanner] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !ambassadorActive) {
      return undefined;
    }

    let cancelled = false;
    setDashboardLoading(true);
    setDashboardError(null);

    fetchReferralCenterDashboard()
      .then(response => {
        if (cancelled) {
          return;
        }
        setDashboard(response.dashboard || null);
        if (response.dashboard?.rewardsJustUnlocked) {
          setShowUnlockBanner(true);
          window.setTimeout(() => setShowUnlockBanner(false), 6000);
        }
      })
      .catch(error => {
        if (!cancelled) {
          setDashboardError(error.message || 'Failed to load referral dashboard');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDashboardLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ambassadorActive, isAuthenticated, profileState.ambassadorReferralCode]);

  const isFounderOverride =
    dashboard?.founderOverrideActive ?? profileState.founderOverrideActive ?? false;

  const effectiveTier = isFounderOverride
    ? dashboard?.ambassadorTier || profileState.ambassadorTier || 'diamond'
    : profileState.ambassadorTier;

  const tierConfig = useMemo(() => {
    if (isFounderOverride) {
      const diamondConfig = getAmbassadorTierConfig('diamond');
      return {
        ...diamondConfig,
        id: 'founder',
        tierClass: 'founder',
        nameId: 'ReferralCenterPage.founderTierName',
        imageSrc: FOUNDER_BADGE_IMAGE || REFERRAL_CENTER_TIER_IMAGES.founder,
      };
    }
    return getAmbassadorTierConfig(effectiveTier);
  }, [effectiveTier, isFounderOverride]);

  const nextTierConfig = useMemo(
    () => (isFounderOverride ? null : getNextAmbassadorTierConfig(effectiveTier)),
    [effectiveTier, isFounderOverride]
  );
  const nextTierReward = useMemo(
    () => (nextTierConfig ? getTierCommissionReward(nextTierConfig.id) : null),
    [nextTierConfig]
  );
  const currentTierReward = useMemo(
    () =>
      isFounderOverride
        ? getTierCommissionReward('diamond')
        : getTierCommissionReward(tierConfig.id),
    [isFounderOverride, tierConfig.id]
  );

  const rewardsUnlocked = isFounderOverride
    ? true
    : dashboard?.ambassadorRewardsUnlocked ?? profileState.ambassadorRewardsUnlocked;

  const referrals = dashboard?.referrals || [];
  const hasReferrals = referrals.length > 0;
  const bronzeCriteria = dashboard?.bronzeCriteria || [];

  const statValues = useMemo(
    () => ({
      invited: dashboard?.stats?.invited ?? 0,
      pending: dashboard?.stats?.pending ?? 0,
      active: dashboard?.stats?.active ?? 0,
      rewards: dashboard?.rewards?.earnedFormatted ?? 'CHF 0.00',
    }),
    [dashboard]
  );

  const rewardBreakdownValues = useMemo(
    () => ({
      earned: dashboard?.rewards?.earnedFormatted ?? 'CHF 0.00',
      pending: dashboard?.rewards?.pendingFormatted ?? 'CHF 0.00',
      lifetime: dashboard?.rewards?.lifetimeFormatted ?? 'CHF 0.00',
      monthly: dashboard?.rewards?.monthlyFormatted ?? 'CHF 0.00',
    }),
    [dashboard]
  );

  const rewardBreakdownStats = useMemo(() => {
    if (rewardsUnlocked) {
      return REWARD_BREAKDOWN_STATS;
    }
    return REWARD_BREAKDOWN_STATS.map(stat =>
      stat.id === 'pending'
        ? { ...stat, labelId: 'ReferralCenterPage.statLockedRewards' }
        : stat
    );
  }, [rewardsUnlocked]);

  const rewardHistory = dashboard?.rewardHistory || [];

  const ambassadorSinceLabel = useMemo(() => {
    if (!profileState.ambassadorJoinedAt) {
      return null;
    }
    return moment(profileState.ambassadorJoinedAt).format('D MMM YYYY');
  }, [profileState.ambassadorJoinedAt]);

  const tierName = intl.formatMessage({ id: tierConfig.nameId });

  const heroProgressTiers = useMemo(
    () =>
      HERO_PROGRESS_TIER_IDS.map(tierId => {
        const level = AMBASSADOR_LEVELS.find(item => item.id === tierId);
        return {
          id: tierId,
          name: level ? intl.formatMessage({ id: level.nameId }) : tierId,
        };
      }),
    [intl]
  );

  const tierProgressPercent = Math.min(100, Math.round(((statValues.invited ?? 0) / 5) * 100));
  const currentTierIndex = heroProgressTiers.findIndex(t => t.id === tierConfig.id);

  const schemaTitle = intl.formatMessage(
    { id: 'ReferralCenterPage.schemaTitle' },
    { marketplaceName }
  );
  const schemaDescription = intl.formatMessage({ id: 'ReferralCenterPage.schemaDescription' });

  const renderDashboard = () => (
    <div className={css.dashboard}>
      <UnlockBanner visible={showUnlockBanner} />
      {dashboardError ? <p className={css.dashboardError}>{dashboardError}</p> : null}
      {dashboardLoading && !dashboard ? (
        <p className={css.dashboardLoading}>
          <FormattedMessage id="ReferralCenterPage.loadingDashboard" />
        </p>
      ) : null}
      <ScrollReveal as="header" className={classNames(css.hero, css[`hero_${tierConfig.tierClass}`])}>
        <div className={css.heroTierGlow} aria-hidden="true" />
        <div className={css.heroGlow} aria-hidden="true" />

        <div className={css.heroGrid}>
          <div className={css.heroLeft}>
            <p className={css.eyebrow}>
              <FormattedMessage id="ReferralCenterPage.eyebrow" />
            </p>
            <h1 id="referral-center-heading" className={css.title}>
              <FormattedMessage id="ReferralCenterPage.title" />
            </h1>
            <p className={css.lead}>
              <FormattedMessage id="ReferralCenterPage.lead" />
            </p>
            <div className={css.heroMeta}>
              <span className={classNames(css.statusPill, css.statusPillAmbassador)}>
                <FormattedMessage id="ReferralCenterPage.statusActiveAmbassador" />
              </span>
              {isFounderOverride ? (
                <span className={classNames(css.statusPill, css.statusPillFounder)}>
                  <FormattedMessage id="ReferralCenterPage.statusFounderAccess" />
                </span>
              ) : (
                <span
                  className={classNames(
                    css.statusPill,
                    rewardsUnlocked ? css.statusPillUnlocked : css.statusPillLocked
                  )}
                >
                  <FormattedMessage
                    id={
                      rewardsUnlocked
                        ? 'ReferralCenterPage.statusRewardsUnlocked'
                        : 'ReferralCenterPage.statusRewardsLocked'
                    }
                  />
                </span>
              )}
              {ambassadorSinceLabel ? (
                <span className={css.sincePill}>
                  <FormattedMessage
                    id="ReferralCenterPage.ambassadorSince"
                    values={{ date: ambassadorSinceLabel }}
                  />
                </span>
              ) : null}
            </div>

            <div className={css.heroCodeSection}>
              <div className={css.heroCodeCard}>
                <span className={css.heroShareLabel}>
                  <FormattedMessage id="ReferralCenterPage.codeLabel" />
                </span>
                <code className={css.heroShareCode}>{referralCode || '—'}</code>
              </div>
              <CopyButton
                labelId="ReferralCenterPage.copyCode"
                value={referralCode}
                className={css.heroCopyCta}
              />
            </div>
          </div>

          <aside className={css.heroRight} aria-label={tierName}>
            <div className={css.tierBadgeShowcase}>
              <div className={css.tierBadgeHalo} aria-hidden="true" />
              <div
                className={classNames(
                  css.tierBadgeFrame,
                  css[`tierBadge_${tierConfig.tierClass}`]
                )}
              >
                <img
                  className={css.tierBadgeImage}
                  src={tierConfig.imageSrc}
                  alt=""
                  loading="eager"
                  decoding="async"
                />
              </div>
            </div>
            <p className={css.tierBadgeLabel}>
              <FormattedMessage
                id={
                  isFounderOverride
                    ? 'ReferralCenterPage.founderTierLabel'
                    : 'ReferralCenterPage.currentTierLabel'
                }
              />
            </p>
            <p className={css.tierBadgeName}>{tierName}</p>
            {isFounderOverride ? (
              <p className={css.founderAccessMessage}>
                <FormattedMessage id="ReferralCenterPage.founderAccessMessage" />
              </p>
            ) : null}
            {!isFounderOverride && nextTierConfig ? (
              <div className={css.tierProgress}>
                <p className={css.tierProgressHint}>
                  <FormattedMessage
                    id="ReferralCenterPage.tierProgressUntilNext"
                    values={{
                      count: Math.max(0, 5 - (statValues.invited ?? 0)),
                      tier: intl.formatMessage({ id: nextTierConfig.nameId }),
                    }}
                  />
                </p>
                <div className={css.tierStepLabels}>
                  {heroProgressTiers.map((tier, index) => (
                    <span
                      key={tier.id}
                      className={classNames(
                        css.tierStepLabel,
                        index <= currentTierIndex ? css.tierStepLabelActive : null,
                        index === currentTierIndex + 1 ? css.tierStepLabelNext : null
                      )}
                    >
                      {tier.name}
                    </span>
                  ))}
                </div>
                <div
                  className={css.tierProgressTrack}
                  role="progressbar"
                  aria-valuenow={tierProgressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={intl.formatMessage(
                    { id: 'ReferralCenterPage.tierProgressAria' },
                    { tier: intl.formatMessage({ id: nextTierConfig.nameId }) }
                  )}
                >
                  <span className={css.tierProgressFill} style={{ width: `${tierProgressPercent}%` }} />
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={60} className={css.kpiStrip}>
        <section className={css.kpiRow} aria-label={intl.formatMessage({ id: 'ReferralCenterPage.statsAria' })}>
          {PLACEHOLDER_STATS.map(stat =>
            stat.id === 'rewards' ? (
              <KpiRewardsCard
                key={stat.id}
                rewardsUnlocked={rewardsUnlocked}
                earnedFormatted={rewardBreakdownValues.earned}
                lockedFormatted={rewardBreakdownValues.pending}
              />
            ) : (
              <article
                key={stat.id}
                className={classNames(css.kpiCard, css[`kpiCard_${stat.icon}`])}
              >
                <KpiStatIcon variant={stat.icon} className={css.kpiIcon} />
                <div className={css.kpiCardBody}>
                  <p className={css.kpiLabel}>
                    <FormattedMessage id={stat.labelId} />
                  </p>
                  <p className={css.kpiValue}>{statValues[stat.id]}</p>
                </div>
                <span className={css.kpiAccentBar} aria-hidden="true" />
              </article>
            )
          )}
        </section>
      </ScrollReveal>

      <ScrollReveal delay={80}>
        <section className={css.shareCard} aria-labelledby="referral-tools-heading">
          <div className={css.shareCardHeader}>
            <ShareIcon className={css.shareCardIcon} />
            <div>
              <h2 id="referral-tools-heading" className={css.cardTitle}>
                <FormattedMessage id="ReferralCenterPage.referralCodeTitle" />
              </h2>
              <p className={css.cardHint}>
                <FormattedMessage id="ReferralCenterPage.referralCodeHint" />
              </p>
            </div>
          </div>

          <div className={css.referralLinkBlock}>
            <span className={css.fieldLabel}>
              <FormattedMessage id="ReferralCenterPage.linkLabel" />
            </span>
            <div className={css.referralLinkRow}>
              <a
                className={css.referralLinkValue}
                href={referralLink}
                target="_blank"
                rel="noopener noreferrer"
                title={referralLink}
              >
                {referralLinkDisplay}
              </a>
              <CopyButton
                labelId="ReferralCenterPage.copyLink"
                value={referralLink}
                className={css.referralLinkCopyButton}
              />
            </div>
          </div>

          <ShareTools
            referralLink={referralLink}
            referralLinkDisplay={referralLinkDisplay}
            referralCode={referralCode}
            intl={intl}
          />
        </section>
      </ScrollReveal>

      <ScrollReveal delay={100} className={css.glassCard} aria-labelledby="reward-breakdown-heading">
        <h2 id="reward-breakdown-heading" className={css.cardTitle}>
          <FormattedMessage id="ReferralCenterPage.rewardsBreakdownTitle" />
        </h2>
        <p className={css.cardHint}>
          <FormattedMessage id="ReferralCenterPage.rewardsFlowHint" />
        </p>
        <section className={css.rewardBreakdownGrid} aria-label={intl.formatMessage({ id: 'ReferralCenterPage.rewardsBreakdownAria' })}>
          {rewardBreakdownStats.map(stat => (
            <article
              key={stat.id}
              className={classNames(
                css.rewardBreakdownCard,
                !rewardsUnlocked && stat.id === 'pending' ? css.rewardBreakdownCardLocked : null,
                !rewardsUnlocked && stat.id === 'earned' ? css.rewardBreakdownCardMuted : null
              )}
            >
              <p className={css.statLabel}>
                <FormattedMessage id={stat.labelId} />
              </p>
              <p
                className={classNames(
                  css.rewardBreakdownValue,
                  !rewardsUnlocked && stat.id === 'pending' ? css.rewardBreakdownValueLocked : null
                )}
              >
                {rewardBreakdownValues[stat.id]}
              </p>
              {!rewardsUnlocked && stat.id === 'pending' ? (
                <p className={css.rewardBreakdownSubtitle}>
                  <FormattedMessage id="ReferralCenterPage.lockedRewardsSubtitle" />
                </p>
              ) : null}
            </article>
          ))}
        </section>
        {!rewardsUnlocked ? (
          <p className={css.lockedRewardsNote}>
            <FormattedMessage id="ReferralCenterPage.lockedRewardsNote" />
          </p>
        ) : null}
      </ScrollReveal>

      <ScrollReveal delay={110} className={css.glassCard} aria-labelledby="reward-history-heading">
        <h2 id="reward-history-heading" className={css.cardTitle}>
          <FormattedMessage id="ReferralCenterPage.rewardHistoryTitle" />
        </h2>
        <RewardHistoryPanel rewardHistory={rewardHistory} />
      </ScrollReveal>

      <ScrollReveal
        delay={120}
        className={classNames(
          css.glassCard,
          css.progressCard,
          rewardsUnlocked ? css.rewardsCardUnlocked : css.rewardsCardLocked
        )}
        aria-labelledby="bronze-rewards-heading"
      >
        <div className={css.progressCardHeader}>
          <h2 id="bronze-rewards-heading" className={css.cardTitle}>
            <FormattedMessage id="ReferralCenterPage.bronzeRewardsTitle" />
          </h2>
          <span
            className={classNames(
              css.rewardsStatusChip,
              rewardsUnlocked
                ? css.rewardsStatusChipUnlocked
                : css.rewardsStatusChipLocked
            )}
          >
            <FormattedMessage
              id={
                rewardsUnlocked
                  ? 'ReferralCenterPage.rewardsUnlockedChip'
                  : 'ReferralCenterPage.rewardsLockedChip'
              }
            />
          </span>
        </div>

        {rewardsUnlocked ? (
          <p className={css.rewardsLeadUnlocked}>
            <FormattedMessage
              id={
                isFounderOverride
                  ? 'ReferralCenterPage.founderRewardsUnlockedLead'
                  : 'ReferralCenterPage.rewardsUnlockedLead'
              }
              values={{
                percent: currentTierReward
                  ? intl.formatMessage({ id: currentTierReward.percentId })
                  : '6%',
              }}
            />
          </p>
        ) : (
          <>
            <p className={css.rewardsLeadLocked}>
              <FormattedMessage id="ReferralCenterPage.rewardsLockedLead" />
            </p>
            <ul className={css.progressList}>
              {bronzeCriteria.map(item => (
                <ProgressCriterion key={item.id} item={item} />
              ))}
            </ul>
          </>
        )}
      </ScrollReveal>

      <ScrollReveal delay={160} className={css.glassCard} aria-labelledby="referrals-table-heading">
        <div className={css.tableHeader}>
          <h2 id="referrals-table-heading" className={css.cardTitle}>
            <FormattedMessage id="ReferralCenterPage.referralsTitle" />
          </h2>
          <span className={css.tableBadge}>
            <FormattedMessage id="ReferralCenterPage.referralsCount" values={{ count: referrals.length }} />
          </span>
        </div>

        {hasReferrals ? (
          <div className={css.tableWrap}>
            <table className={css.table}>
              <thead>
                <tr>
                  {REFERRAL_TABLE_COLUMNS.map(col => (
                    <th key={col.id} scope="col">
                      <FormattedMessage id={col.labelId} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {referrals.map(referral => (
                  <ReferralRow key={referral.id} referral={referral} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyReferralsPanel referralLink={referralLink} />
        )}
      </ScrollReveal>

      <ScrollReveal delay={180} className={css.glassCard} aria-labelledby="referral-activity-heading">
        <h2 id="referral-activity-heading" className={css.cardTitle}>
          <FormattedMessage id="ReferralCenterPage.activityTitle" />
        </h2>
        <ActivityFeed activity={dashboard?.activity || []} />
      </ScrollReveal>

      <ScrollReveal
        delay={200}
        className={classNames(css.glassCard, css.nextLevelCard)}
        aria-labelledby="next-level-heading"
      >
        <h2 id="next-level-heading" className={css.cardTitle}>
          <FormattedMessage
            id={
              isFounderOverride
                ? 'ReferralCenterPage.founderLevelTitle'
                : 'ReferralCenterPage.nextLevelTitle'
            }
          />
        </h2>

        {isFounderOverride ? (
          <p className={css.founderLevelComplete}>
            <FormattedMessage id="ReferralCenterPage.founderLevelComplete" />
          </p>
        ) : null}

        {!isFounderOverride && nextTierConfig ? (
          <>
            <div className={css.nextLevelTrack}>
              <div className={classNames(css.nextLevelNode, css.nextLevelNodeCurrent)}>
                <img src={tierConfig.imageSrc} alt="" className={css.nextLevelThumb} loading="lazy" />
                <span className={css.nextLevelName}>{tierName}</span>
              </div>
              <span className={css.nextLevelArrow} aria-hidden="true">
                →
              </span>
              <div className={classNames(css.nextLevelNode, css.nextLevelNodeNext)}>
                <img
                  src={nextTierConfig.imageSrc}
                  alt=""
                  className={css.nextLevelThumb}
                  loading="lazy"
                />
                <span className={css.nextLevelName}>
                  <FormattedMessage id={nextTierConfig.nameId} />
                </span>
              </div>
            </div>

            {nextTierReward ? (
              <p className={css.nextLevelCommission}>
                <FormattedMessage
                  id="ReferralCenterPage.nextTierCommission"
                  values={{
                    percent: intl.formatMessage({ id: nextTierReward.percentId }),
                    tier: intl.formatMessage({ id: nextTierConfig.nameId }),
                  }}
                />
              </p>
            ) : null}

            <p className={css.nextLevelBody}>
              <FormattedMessage id="ReferralCenterPage.nextLevelBody" />
            </p>

            <ul className={css.nextLevelReqs}>
              {NEXT_TIER_REQUIREMENT_IDS.map(id => (
                <li key={id}>
                  <FormattedMessage id={id} />
                </li>
              ))}
            </ul>

            <NamedLink
              name="AmbassadorProgramPage"
              className={css.levelsLink}
              to={{ hash: AMBASSADOR_PROGRAM_LEVELS_HASH }}
            >
              <FormattedMessage id="ReferralCenterPage.ctaLevels" />
            </NamedLink>
          </>
        ) : (
          <>
            <p className={css.nextLevelBody}>
              <FormattedMessage id="ReferralCenterPage.nextLevelMaxBody" />
            </p>
            <NamedLink
              name="AmbassadorProgramPage"
              className={css.levelsLink}
              to={{ hash: AMBASSADOR_PROGRAM_LEVELS_HASH }}
            >
              <FormattedMessage id="ReferralCenterPage.ctaLevels" />
            </NamedLink>
          </>
        )}
      </ScrollReveal>
    </div>
  );

  const renderContent = () => {
    if (!isAuthenticated) {
      return (
        <AccessGate titleId="ReferralCenterPage.loginTitle" bodyId="ReferralCenterPage.loginBody">
          <NamedLink name="LoginPage" className={css.primaryLink} state={loginFromState}>
            <FormattedMessage id="ReferralCenterPage.loginCta" />
          </NamedLink>
        </AccessGate>
      );
    }

    if (!ambassadorActive) {
      return (
        <AccessGate titleId="ReferralCenterPage.inactiveTitle" bodyId="ReferralCenterPage.inactiveBody">
          <NamedLink name="AmbassadorProgramPage" className={css.primaryLink}>
            <FormattedMessage id="ReferralCenterPage.ctaProgram" />
          </NamedLink>
        </AccessGate>
      );
    }

    return renderDashboard();
  };

  return (
    <Page
      title={schemaTitle}
      description={schemaDescription}
      scrollingDisabled={scrollingDisabled}
      className={classNames(sportTheme.sportPremium, css.page)}
      schema={{
        '@context': 'http://schema.org',
        '@type': 'WebPage',
        name: schemaTitle,
        description: schemaDescription,
      }}
    >
      <TopbarContainer currentPage="ReferralCenterPage" chromeTheme="sportPremium" />
      <main className={css.main}>
        <div className={css.rail}>{renderContent()}</div>
      </main>
      <FooterContainer />
    </Page>
  );
};

export default ReferralCenterPage;
