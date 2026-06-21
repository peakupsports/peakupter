import { useEffect, useMemo, useState } from 'react';

import { fetchReferralCenterDashboard } from '../../util/api';
import { getAmbassadorProfileState, isAmbassadorActive } from '../../util/ambassadorActivation';

import {
  deriveReferralDashboardRewardBreakdown,
  deriveReferralDashboardStatValues,
  deriveReferralDashboardTierState,
  getNextAmbassadorTierConfig,
  getTierCommissionReward,
} from './referralCenterContent';

/**
 * Live Referral Center dashboard fetch + derived ambassador/referral view-model.
 * Shared by Referral Center and Coach Earnings dashboard ambassador blocks.
 *
 * @param {import('../../util/types').currentUser|null|undefined} currentUser
 * @param {boolean} isAuthenticated
 */
const useReferralCenterDashboard = (currentUser, isAuthenticated) => {
  const profileState = useMemo(() => getAmbassadorProfileState(currentUser), [currentUser]);
  const ambassadorActive = isAmbassadorActive(currentUser);
  const referralCode = profileState.ambassadorReferralCode || '';
  const currentUserId = currentUser?.id?.uuid;

  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);
  const [showUnlockBanner, setShowUnlockBanner] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !ambassadorActive || !currentUserId) {
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
        setDashboard(response?.dashboard ?? null);
        if (response?.dashboard?.rewardsJustUnlocked) {
          setShowUnlockBanner(true);
          window.setTimeout(() => setShowUnlockBanner(false), 6000);
        }
      })
      .catch(error => {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.error('[PeakUp ReferralCenter] dashboard unavailable', {
            message: error?.message,
            status: error?.status,
            network: error?.network,
            url: error?.url,
          });
          setDashboardError(error?.message || 'Failed to load referral dashboard');
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
  }, [ambassadorActive, currentUserId, isAuthenticated]);

  const tierState = useMemo(
    () => deriveReferralDashboardTierState({ dashboard, profileState }),
    [dashboard, profileState]
  );

  const { isFounderOverride, effectiveTier, tierConfig, rewardsUnlocked, ambassadorBadgeTierId } =
    tierState;

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

  const statValues = useMemo(() => deriveReferralDashboardStatValues(dashboard), [dashboard]);

  const rewardBreakdownValues = useMemo(
    () => deriveReferralDashboardRewardBreakdown(dashboard),
    [dashboard]
  );

  const referrals = dashboard?.referrals || [];
  const hasReferrals = referrals.length > 0;
  const bronzeCriteria = dashboard?.bronzeCriteria || [];
  const rewardHistory = dashboard?.rewardHistory || [];

  return {
    profileState,
    ambassadorActive,
    referralCode,
    dashboard,
    dashboardLoading,
    dashboardError,
    showUnlockBanner,
    isFounderOverride,
    effectiveTier,
    tierConfig,
    nextTierConfig,
    nextTierReward,
    currentTierReward,
    rewardsUnlocked,
    ambassadorBadgeTierId,
    statValues,
    rewardBreakdownValues,
    referrals,
    hasReferrals,
    bronzeCriteria,
    rewardHistory,
  };
};

export default useReferralCenterDashboard;
