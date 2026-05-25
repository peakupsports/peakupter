const { listAmbassadorActivations } = require('../api-util/ambassadorActivationStore');
const { listAllReferrals } = require('../api-util/referralLedgerStore');
const { listCoachApplications } = require('../api-util/coachApplicationStore');
const {
  detectSuspiciousRewardSpikes,
  formatMinorAsCurrency,
  listAllRewards,
  summarizeAllRewards,
  summarizeRewardsForAmbassador,
  toPublicRewardRecord,
} = require('../api-util/referralRewardsStore');
const { requireCoachApplicationAdmin } = require('../api-util/coachApplicationAdminAuth');

const buildAmbassadorOverview = () => {
  const activations = listAmbassadorActivations();
  const referrals = listAllReferrals();
  const applications = listCoachApplications();
  const allRewards = listAllRewards();
  const globalRewards = summarizeAllRewards();

  const pendingVerifications = applications.filter(
    app => app.ambassadorReferralCode && app.status === 'pending'
  ).length;

  const ambassadors = activations.map(item => {
    const ambassadorReferrals = referrals.filter(
      ref => String(ref.ambassadorUserId) === String(item.userId)
    );
    const rewards = summarizeRewardsForAmbassador(item.userId);

    return {
      ...item,
      activeReferrals: ambassadorReferrals.filter(ref =>
        ['verified', 'active'].includes(ref.status)
      ).length,
      totalReferrals: ambassadorReferrals.length,
      pendingReferrals: ambassadorReferrals.filter(ref => ref.status === 'applied').length,
      lifetimeRewardsMinor: rewards.lifetimeMinor,
      earnedRewardsMinor: rewards.earnedMinor,
      pendingRewardsMinor: rewards.pendingMinor,
      monthlyRewardsMinor: rewards.monthlyMinor,
      rewardsCurrency: rewards.currency,
    };
  });

  const earningLeaderboard = [...ambassadors]
    .sort(
      (a, b) =>
        b.earnedRewardsMinor - a.earnedRewardsMinor ||
        b.lifetimeRewardsMinor - a.lifetimeRewardsMinor
    )
    .slice(0, 10);

  const referralLeaderboard = [...ambassadors]
    .sort((a, b) => b.activeReferrals - a.activeReferrals || b.totalReferrals - a.totalReferrals)
    .slice(0, 10);

  const suspiciousApplications = applications.filter(app => {
    const code = String(app.ambassadorReferralCode || '').trim();
    if (!code) {
      return false;
    }
    const matchCount = applications.filter(
      other =>
        other.id !== app.id &&
        String(other.ambassadorReferralCode || '').trim().toUpperCase() === code.toUpperCase() &&
        other.email === app.email
    ).length;
    return matchCount > 0;
  });

  const referralPerformance = referrals.map(referral => {
    const referralRewards = allRewards.filter(reward => reward.referralId === referral.id);
    const totalRewardMinor = referralRewards.reduce(
      (sum, reward) => sum + (Number(reward.amountMinor) || 0),
      0
    );

    return {
      id: referral.id,
      name: referral.applicantName,
      email: referral.applicantEmail,
      status: referral.status,
      ambassadorUserId: referral.ambassadorUserId,
      bookingRewardCount: referralRewards.length,
      totalRewardMinor,
      totalRewardFormatted: formatMinorAsCurrency(
        totalRewardMinor,
        referralRewards[0]?.currency || globalRewards.currency
      ),
    };
  });

  return {
    summary: {
      ambassadorCount: ambassadors.length,
      totalReferrals: referrals.length,
      pendingVerifications,
      suspiciousCount: suspiciousApplications.length,
      totalAmbassadorPayoutsMinor: globalRewards.earnedMinor,
      totalAmbassadorPayoutsFormatted: formatMinorAsCurrency(
        globalRewards.earnedMinor,
        globalRewards.currency
      ),
      pendingPayoutsMinor: globalRewards.pendingMinor,
      monthlyPayoutsMinor: globalRewards.monthlyMinor,
      rewardRecordCount: globalRewards.recordCount,
    },
    ambassadors,
    earningLeaderboard,
    referralLeaderboard,
    rewardHistory: allRewards.slice(0, 50).map(toPublicRewardRecord),
    suspiciousRewardSpikes: detectSuspiciousRewardSpikes(allRewards),
    referralPerformance: referralPerformance
      .filter(item => item.bookingRewardCount > 0)
      .sort((a, b) => b.totalRewardMinor - a.totalRewardMinor)
      .slice(0, 20),
    suspiciousApplications: suspiciousApplications.map(app => ({
      id: app.id,
      fullName: app.fullName,
      email: app.email,
      ambassadorReferralCode: app.ambassadorReferralCode,
      status: app.status,
      submittedAt: app.submittedAt,
    })),
  };
};

module.exports = (req, res) => {
  try {
    const overview = buildAmbassadorOverview();
    res.status(200).json({ ok: true, overview });
  } catch (error) {
    console.error('[ambassador-admin] overview failed:', error);
    res.status(500).json({ message: error.message || 'Failed to load ambassador overview.' });
  }
};

module.exports.buildAmbassadorOverview = buildAmbassadorOverview;
module.exports.requireCoachApplicationAdmin = requireCoachApplicationAdmin;
