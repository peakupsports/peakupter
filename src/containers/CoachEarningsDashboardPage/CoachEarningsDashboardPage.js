import React, { useMemo } from 'react';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { ensureCurrentUser } from '../../util/data';
import { isCoachProviderProfileUserType } from '../../util/coachOnboarding';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { types as sdkTypes } from '../../util/sdkLoader';

import { NamedLink, Page, PeakUpAmbassadorTierBadge } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';
import useReferralCenterDashboard from '../ReferralCenterPage/useReferralCenterDashboard';

import sportTheme from '../SportPagesTheme.module.css';
import { getAmbassadorTierProgress } from './coachEarningsDashboardData';
import CoachEarningsDashboardIcon from './CoachEarningsDashboardIcons';
import css from './CoachEarningsDashboardPage.module.css';

const { Money } = sdkTypes;

const AMBASSADOR_TIER_LABEL_IDS = {
  bronze: 'AmbassadorProgramPage.levelBronzeName',
  silver: 'AmbassadorProgramPage.levelSilverName',
  gold: 'AmbassadorProgramPage.levelGoldName',
  platinum: 'AmbassadorProgramPage.levelPlatinumName',
  diamond: 'AmbassadorProgramPage.levelDiamondName',
  founder: 'ReferralCenterPage.founderTierName',
};

const OVERVIEW_STATS = [
  { key: 'thisMonth', icon: 'wallet', labelId: 'CoachEarningsDashboardPage.statThisMonth' },
  { key: 'pendingPayout', icon: 'payout', labelId: 'CoachEarningsDashboardPage.statPendingPayout' },
  {
    key: 'completedBookings',
    icon: 'calendar',
    labelId: 'CoachEarningsDashboardPage.statCompletedBookings',
  },
  {
    key: 'lifetimeEarnings',
    icon: 'trophy',
    labelId: 'CoachEarningsDashboardPage.statLifetimeEarnings',
  },
];

const formatMinorAmount = (intl, minor, currency, zeroLabel) => {
  const amountMinor = Number(minor) || 0;
  if (amountMinor <= 0) {
    return zeroLabel;
  }
  try {
    return formatMoney(intl, new Money(amountMinor, currency || 'CHF'));
  } catch (e) {
    return zeroLabel;
  }
};

const RecentTransactionsTable = ({ transactions }) => {
  const intl = useIntl();
  const zeroLabel = intl.formatMessage({ id: 'CoachEarningsDashboardPage.statAmountZero' });

  return (
    <div className={css.transactionsTableWrap}>
      <table className={css.transactionsTable}>
        <thead>
          <tr>
            <th scope="col">
              <FormattedMessage id="CoachEarningsDashboardPage.transactionsColumnDate" />
            </th>
            <th scope="col">
              <FormattedMessage id="CoachEarningsDashboardPage.transactionsColumnCustomer" />
            </th>
            <th scope="col">
              <FormattedMessage id="CoachEarningsDashboardPage.transactionsColumnListing" />
            </th>
            <th scope="col">
              <FormattedMessage id="CoachEarningsDashboardPage.transactionsColumnAmount" />
            </th>
            <th scope="col">
              <FormattedMessage id="CoachEarningsDashboardPage.transactionsColumnStatus" />
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(row => {
            const statusLabel = intl.formatMessage(
              {
                id: `InboxPage.${row.processName}.${row.processState}.status`,
                defaultMessage: row.processState || '—',
              },
              { transactionRole: 'provider' }
            );
            const customerLabel =
              row.customerName ||
              intl.formatMessage({ id: 'CoachEarningsDashboardPage.transactionsCustomerFallback' });
            const dateLabel = row.dateIso
              ? intl.formatDate(new Date(row.dateIso), {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '—';

            return (
              <tr key={row.id || `${row.listingTitle}-${row.dateIso}`}>
                <td data-label={intl.formatMessage({
                  id: 'CoachEarningsDashboardPage.transactionsColumnDate',
                })}
                >
                  {dateLabel}
                </td>
                <td
                  data-label={intl.formatMessage({
                    id: 'CoachEarningsDashboardPage.transactionsColumnCustomer',
                  })}
                >
                  {customerLabel}
                </td>
                <td
                  data-label={intl.formatMessage({
                    id: 'CoachEarningsDashboardPage.transactionsColumnListing',
                  })}
                >
                  {row.listingTitle || '—'}
                </td>
                <td
                  data-label={intl.formatMessage({
                    id: 'CoachEarningsDashboardPage.transactionsColumnAmount',
                  })}
                >
                  {formatMinorAmount(intl, row.amountMinor, row.currency, zeroLabel)}
                </td>
                <td
                  data-label={intl.formatMessage({
                    id: 'CoachEarningsDashboardPage.transactionsColumnStatus',
                  })}
                >
                  <span className={css.transactionStatus}>{statusLabel}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const StatCard = ({ icon, badgeTierId, labelId, value, iconTone = 'cyan' }) => (
  <div className={css.stat}>
    <div className={css.statHeader}>
      <span
        className={classNames(
          css.statIcon,
          css[`statIcon_${iconTone}`],
          badgeTierId !== undefined ? css.statIconBadge : null
        )}
        aria-hidden="true"
      >
        {badgeTierId !== undefined ? (
          <PeakUpAmbassadorTierBadge tierId={badgeTierId} size="stat" showHalo={false} />
        ) : (
          <CoachEarningsDashboardIcon name={icon} />
        )}
      </span>
      <span className={css.statLabel}>
        <FormattedMessage id={labelId} />
      </span>
    </div>
    <span className={css.statValue}>{value}</span>
  </div>
);

const AmbassadorProgress = ({ tierLabel, nextTierLabel, current, required, progressPercent }) => {
  const intl = useIntl();

  return (
    <div className={css.ambassadorProgress}>
      <p className={css.ambassadorProgressHeading}>
        <FormattedMessage
          id="CoachEarningsDashboardPage.ambassadorTierHeading"
          values={{ tier: tierLabel }}
        />
      </p>
      <p className={css.ambassadorProgressLabel}>
        <FormattedMessage
          id="CoachEarningsDashboardPage.ambassadorProgressLabel"
          values={{
            current,
            required,
            nextTier: nextTierLabel,
          }}
        />
      </p>
      <div
        className={css.progressTrack}
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={intl.formatMessage(
          { id: 'CoachEarningsDashboardPage.ambassadorProgressAria' },
          { current, required, nextTier: nextTierLabel }
        )}
      >
        <div className={css.progressFill} style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  );
};

/**
 * Authenticated coach earnings & rewards workspace at /coach-dashboard/earnings.
 */
const CoachEarningsDashboardPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const isAuthenticated = useSelector(state => state.auth?.isAuthenticated);
  const currentUser = useSelector(state => state.user?.currentUser);

  const user = ensureCurrentUser(currentUser);
  const marketplaceName = config.marketplaceName || 'PeakUp';

  const earningsOverview = useSelector(state => state.CoachEarningsDashboardPage?.overview);
  const earningsTransactions = useSelector(state => state.CoachEarningsDashboardPage?.transactions);
  const earningsFetchInProgress = useSelector(
    state => state.CoachEarningsDashboardPage?.fetchInProgress
  );
  const earningsFetchError = useSelector(state => state.CoachEarningsDashboardPage?.fetchError);
  const activeListingsCount = useSelector(
    state => state.CoachEarningsDashboardPage?.activeListingsCount
  );
  const hasPublishedListings = Number(activeListingsCount) > 0;

  const {
    ambassadorActive,
    referralCode,
    dashboardLoading,
    dashboardError,
    tierConfig,
    ambassadorBadgeTierId,
    isFounderOverride,
    effectiveTier,
    statValues,
  } = useReferralCenterDashboard(currentUser, isAuthenticated);

  const zeroAmount = intl.formatMessage({ id: 'CoachEarningsDashboardPage.statAmountZero' });
  const tierLabel = intl.formatMessage({ id: tierConfig.nameId });
  const progressTierKey = isFounderOverride
    ? 'diamond'
    : String(effectiveTier || 'bronze').toLowerCase();

  const ambassadorProgress = useMemo(() => {
    if (!ambassadorActive || isFounderOverride) {
      return null;
    }
    return getAmbassadorTierProgress(progressTierKey, statValues.invited);
  }, [ambassadorActive, isFounderOverride, progressTierKey, statValues.invited]);

  const ambassadorBadgeAlt = intl.formatMessage({ id: 'AmbassadorProgramPage.heroBadgeAlt' });

  const nextTierLabel = ambassadorProgress
    ? intl.formatMessage({
        id: AMBASSADOR_TIER_LABEL_IDS[ambassadorProgress.nextTier],
      })
    : null;

  const overviewValues = useMemo(() => {
    const overview = earningsOverview || {};
    const currency = overview.currency || 'CHF';
    return {
      thisMonth: formatMinorAmount(intl, overview.thisMonthMinor, currency, zeroAmount),
      pendingPayout: formatMinorAmount(intl, overview.pendingPayoutMinor, currency, zeroAmount),
      completedBookings: String(overview.completedBookings ?? 0),
      lifetimeEarnings: formatMinorAmount(intl, overview.lifetimeEarningsMinor, currency, zeroAmount),
    };
  }, [earningsOverview, intl, zeroAmount]);

  const hasRecentTransactions = (earningsTransactions || []).length > 0;

  if (!isAuthenticated || !user.id) {
    return <Redirect to="/login" />;
  }

  if (!isCoachProviderProfileUserType(user)) {
    return <Redirect to="/" />;
  }

  const title = intl.formatMessage(
    { id: 'CoachEarningsDashboardPage.schemaTitle' },
    { marketplaceName }
  );
  const description = intl.formatMessage({ id: 'CoachEarningsDashboardPage.schemaDescription' });

  return (
    <Page
      title={title}
      description={description}
      scrollingDisabled={scrollingDisabled}
      className={classNames(sportTheme.sportPremium, css.page)}
    >
      <div className={css.bgGlow} aria-hidden="true" />
      <TopbarContainer currentPage="CoachEarningsDashboardPage" chromeTheme="sportPremium" />

      <main className={css.main}>
        <div className={css.shell}>
          <header className={css.hero}>
            <h1 className={css.title}>
              <FormattedMessage id="CoachEarningsDashboardPage.pageTitle" />
            </h1>
            <p className={css.lead}>
              <FormattedMessage id="CoachEarningsDashboardPage.pageLead" />
            </p>
          </header>

          <section className={css.section} aria-labelledby="coach-earnings-overview-heading">
            <div className={css.sectionCard}>
              <h2 id="coach-earnings-overview-heading" className={css.sectionTitle}>
                <FormattedMessage id="CoachEarningsDashboardPage.overviewTitle" />
              </h2>
              {earningsFetchError ? (
                <p className={css.earningsError}>
                  <FormattedMessage id="CoachEarningsDashboardPage.earningsLoadError" />
                </p>
              ) : null}
              {earningsFetchInProgress && !earningsFetchError ? (
                <p className={css.earningsLoading}>
                  <FormattedMessage id="CoachEarningsDashboardPage.earningsLoading" />
                </p>
              ) : null}
              <div className={classNames(css.statsGrid, css.statsGridFour)}>
                {OVERVIEW_STATS.map(stat => (
                  <StatCard
                    key={stat.key}
                    icon={stat.icon}
                    labelId={stat.labelId}
                    value={overviewValues[stat.key]}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className={css.section} aria-labelledby="coach-earnings-ambassador-heading">
            <div className={classNames(css.sectionCard, css.sectionCardAmbassador)}>
              <h2 id="coach-earnings-ambassador-heading" className={css.sectionTitleRow}>
                <PeakUpAmbassadorTierBadge
                  tierId={ambassadorBadgeTierId}
                  size="title"
                  alt={ambassadorBadgeAlt}
                />
                <span className={css.sectionTitle}>
                  <FormattedMessage id="CoachEarningsDashboardPage.ambassadorTitle" />
                </span>
              </h2>
              {ambassadorActive ? (
                <>
                  {dashboardError ? <p className={css.ambassadorError}>{dashboardError}</p> : null}
                  {dashboardLoading && !dashboardError ? (
                    <p className={css.ambassadorLoading}>
                      <FormattedMessage id="ReferralCenterPage.loadingDashboard" />
                    </p>
                  ) : null}
                  <div className={classNames(css.statsGrid, css.ambassadorGrid)}>
                    <StatCard
                      badgeTierId={ambassadorBadgeTierId}
                      iconTone="ambassador"
                      labelId="CoachEarningsDashboardPage.ambassadorCurrentTier"
                      value={tierLabel}
                    />
                    <StatCard
                      icon="wallet"
                      iconTone="ambassador"
                      labelId="CoachEarningsDashboardPage.ambassadorReferralEarnings"
                      value={statValues.rewards}
                    />
                    <StatCard
                      icon="referrals"
                      iconTone="ambassador"
                      labelId="ReferralCenterPage.statInvited"
                      value={String(statValues.invited)}
                    />
                    <StatCard
                      icon="referrals"
                      iconTone="ambassador"
                      labelId="ReferralCenterPage.statActive"
                      value={String(statValues.active)}
                    />
                  </div>
                  {referralCode ? (
                    <div className={css.referralCodeRow}>
                      <span className={css.referralCodeLabel}>
                        <FormattedMessage id="ReferralCenterPage.codeLabel" />
                      </span>
                      <code className={css.referralCodeValue}>{referralCode}</code>
                    </div>
                  ) : null}
                  {ambassadorProgress && nextTierLabel ? (
                    <AmbassadorProgress
                      tierLabel={tierLabel}
                      nextTierLabel={nextTierLabel}
                      current={ambassadorProgress.currentReferrals}
                      required={ambassadorProgress.requiredReferrals}
                      progressPercent={ambassadorProgress.progressPercent}
                    />
                  ) : null}
                </>
              ) : (
                <p className={css.emptyState}>
                  <FormattedMessage id="ReferralCenterPage.inactiveBody" />
                </p>
              )}
            </div>
          </section>

          <section className={css.section} aria-labelledby="coach-earnings-transactions-heading">
            <div className={css.sectionCard}>
              <h2 id="coach-earnings-transactions-heading" className={css.sectionTitle}>
                <FormattedMessage id="CoachEarningsDashboardPage.transactionsTitle" />
              </h2>
              {hasRecentTransactions ? (
                <RecentTransactionsTable transactions={earningsTransactions} />
              ) : (
                <div className={css.emptyStatePanel}>
                  <span className={css.emptyStateIcon} aria-hidden="true">
                    <CoachEarningsDashboardIcon name="transactions" />
                  </span>
                  <p className={css.emptyStateTitle}>
                    <FormattedMessage id="CoachEarningsDashboardPage.transactionsEmptyTitle" />
                  </p>
                  <p className={css.emptyStateBody}>
                    <FormattedMessage id="CoachEarningsDashboardPage.transactionsEmptyBody" />
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className={css.section} aria-labelledby="coach-earnings-cta-heading">
            <div className={css.ctaCard}>
              {hasPublishedListings ? (
                <>
                  <h2 id="coach-earnings-cta-heading" className={css.ctaTitle}>
                    <FormattedMessage id="CoachEarningsDashboardPage.liveCtaTitle" />
                  </h2>
                  <p className={css.ctaBody}>
                    <FormattedMessage id="CoachEarningsDashboardPage.liveCtaBody" />
                  </p>
                  <div className={css.ctaActions}>
                    <NamedLink name="ManageListingsPage" className={css.createListingCta}>
                      <FormattedMessage id="CoachEarningsDashboardPage.viewListingsCta" />
                    </NamedLink>
                    <NamedLink name="ReferralCenterPage" className={css.ctaSecondary}>
                      <FormattedMessage id="CoachEarningsDashboardPage.referralCenterCta" />
                    </NamedLink>
                  </div>
                </>
              ) : (
                <>
                  <h2 id="coach-earnings-cta-heading" className={css.ctaTitle}>
                    <FormattedMessage id="CoachEarningsDashboardPage.emptyCtaTitle" />
                  </h2>
                  <p className={css.ctaBody}>
                    <FormattedMessage id="CoachEarningsDashboardPage.emptyCtaBody" />
                  </p>
                  <NamedLink name="NewListingPage" className={css.createListingCta}>
                    <FormattedMessage id="CoachEarningsDashboardPage.createListingCta" />
                  </NamedLink>
                </>
              )}
            </div>
          </section>
        </div>
      </main>

      <FooterContainer />
    </Page>
  );
};

export default CoachEarningsDashboardPage;
