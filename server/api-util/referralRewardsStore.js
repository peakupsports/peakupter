const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REWARDS_DIR = path.join(__dirname, '..', 'data', 'referral-rewards');

const REWARD_STATUSES = {
  PENDING: 'pending',
  EARNED: 'earned',
  PAID: 'paid',
};

const ensureDir = dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const rewardPathForId = id => path.join(REWARDS_DIR, `${path.basename(id)}.json`);

const readReward = id => {
  const filePath = rewardPathForId(id);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const writeReward = record => {
  ensureDir(REWARDS_DIR);
  fs.writeFileSync(rewardPathForId(record.id), JSON.stringify(record, null, 2));
};

const listAllRewards = () => {
  ensureDir(REWARDS_DIR);
  return fs
    .readdirSync(REWARDS_DIR)
    .filter(name => name.endsWith('.json'))
    .map(name => JSON.parse(fs.readFileSync(path.join(REWARDS_DIR, name), 'utf8')))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
};

const listRewardsForAmbassador = ambassadorUserId => {
  const normalizedUserId = String(ambassadorUserId || '').trim();
  if (!normalizedUserId) {
    return [];
  }
  return listAllRewards().filter(record => String(record.ambassadorUserId) === normalizedUserId);
};

const findRewardByTransactionId = transactionId => {
  const normalized = String(transactionId || '').trim();
  if (!normalized) {
    return null;
  }
  return listAllRewards().find(record => String(record.transactionId) === normalized) || null;
};

/**
 * Net PeakUp revenue (minor units) — platform fee minus Stripe, with booking fallback.
 *
 * @param {object} economics
 * @returns {number}
 */
const calculateNetPeakupRevenueMinor = ({
  bookingAmountMinor = 0,
  coachNetPayoutMinor = 0,
  platformFeeMinor = 0,
  stripeFeeMinor = 0,
}) => {
  const platformFee = Number(platformFeeMinor) || 0;
  const stripe = Number(stripeFeeMinor) || 0;
  if (platformFee > 0) {
    return Math.max(0, platformFee - stripe);
  }
  const gross = Number(bookingAmountMinor) || 0;
  const coachNet = Number(coachNetPayoutMinor) || 0;
  return Math.max(0, gross - coachNet - stripe);
};

/**
 * Calculate ambassador commission from net PeakUp revenue (minor units).
 *
 * @param {number} netPeakupRevenueMinor
 * @param {number} commissionPercent e.g. 2 for 2%
 * @returns {number}
 */
const calculateAmbassadorCommissionMinor = (netPeakupRevenueMinor, commissionPercent) => {
  const netRevenue = Number(netPeakupRevenueMinor) || 0;
  const percent = Number(commissionPercent) || 0;
  if (netRevenue <= 0 || percent <= 0) {
    return 0;
  }
  return Math.round((netRevenue * percent) / 100);
};

/**
 * Estimate reward breakdown from booking economics.
 *
 * @param {object} input
 * @returns {{ platformFeeMinor: number, coachNetPayoutMinor: number, ambassadorRewardMinor: number, stripeFeeMinor: number }}
 */
const calculateBookingRewardBreakdown = ({
  bookingTotalMinor,
  stripeFeeMinor = 0,
  peakUpFeePercent = 15,
  coachNetPayoutMinor,
  ambassadorPercent = 2,
}) => {
  const total = Number(bookingTotalMinor) || 0;
  const stripe = Number(stripeFeeMinor) || 0;
  const afterStripe = Math.max(0, total - stripe);
  const peakUpFeeMinor = Math.round((afterStripe * Number(peakUpFeePercent || 0)) / 100);
  const coachNet =
    Number.isFinite(coachNetPayoutMinor) && coachNetPayoutMinor >= 0
      ? coachNetPayoutMinor
      : Math.max(0, afterStripe - peakUpFeeMinor);

  const netPeakupRevenueMinor = calculateNetPeakupRevenueMinor({
    bookingAmountMinor: total,
    coachNetPayoutMinor: coachNet,
    platformFeeMinor: peakUpFeeMinor,
    stripeFeeMinor: stripe,
  });

  return {
    stripeFeeMinor: stripe,
    platformFeeMinor: peakUpFeeMinor,
    coachNetPayoutMinor: coachNet,
    netPeakupRevenueMinor,
    ambassadorRewardMinor: calculateAmbassadorCommissionMinor(
      netPeakupRevenueMinor,
      ambassadorPercent
    ),
  };
};

/**
 * @param {object} payload
 * @returns {object}
 */
const recordRewardAccrual = payload => {
  const now = new Date().toISOString();
  const record = {
    id: crypto.randomUUID(),
    ambassadorUserId: payload.ambassadorUserId,
    referralId: payload.referralId || null,
    transactionId: payload.transactionId || null,
    referredCoachUserId: payload.referredCoachUserId || null,
    referredCoachName: payload.referredCoachName || '',
    referredCoachEmail: payload.referredCoachEmail || '',
    bookingAmountMinor: Number(payload.bookingAmountMinor) || 0,
    stripeFeeMinor: Number(payload.stripeFeeMinor) || 0,
    platformFeeMinor: Number(payload.platformFeeMinor) || 0,
    netPeakupRevenueMinor: Number(payload.netPeakupRevenueMinor) || 0,
    coachNetPayoutMinor: Number(payload.coachNetPayoutMinor) || 0,
    ambassadorPercent: Number(payload.ambassadorPercent) || 0,
    amountMinor: Number(payload.amountMinor) || 0,
    currency: payload.currency || 'CHF',
    status: payload.status || REWARD_STATUSES.PENDING,
    periodMonth: payload.periodMonth || now.slice(0, 7),
    note: payload.note || '',
    createdAt: now,
    updatedAt: now,
  };

  writeReward(record);
  return record;
};

const promotePendingRewardsForAmbassador = ambassadorUserId => {
  const pending = listRewardsForAmbassador(ambassadorUserId).filter(
    record => record.status === REWARD_STATUSES.PENDING
  );

  pending.forEach(record => {
    writeReward({
      ...record,
      status: REWARD_STATUSES.EARNED,
      updatedAt: new Date().toISOString(),
    });
  });

  return pending.length;
};

const summarizeRewardsForAmbassador = (ambassadorUserId, recordsOverride) => {
  const records = Array.isArray(recordsOverride)
    ? recordsOverride
    : listRewardsForAmbassador(ambassadorUserId);
  const nowMonth = new Date().toISOString().slice(0, 7);

  const totals = records.reduce(
    (acc, record) => {
      const amount = Number(record.amountMinor) || 0;
      acc.lifetimeMinor += amount;
      if (record.status === REWARD_STATUSES.PENDING) {
        acc.pendingMinor += amount;
      }
      if (record.periodMonth === nowMonth) {
        acc.monthlyMinor += amount;
      }
      if (record.status === REWARD_STATUSES.EARNED || record.status === REWARD_STATUSES.PAID) {
        acc.earnedMinor += amount;
      }
      return acc;
    },
    { lifetimeMinor: 0, pendingMinor: 0, monthlyMinor: 0, earnedMinor: 0 }
  );

  return {
    ...totals,
    currency: records[0]?.currency || 'CHF',
    recordCount: records.length,
  };
};

const summarizeAllRewards = () => {
  const records = listAllRewards();
  const nowMonth = new Date().toISOString().slice(0, 7);

  return records.reduce(
    (acc, record) => {
      const amount = Number(record.amountMinor) || 0;
      acc.totalPayoutsMinor += amount;
      acc.lifetimeMinor += amount;
      if (record.status === REWARD_STATUSES.PENDING) {
        acc.pendingMinor += amount;
      }
      if (record.periodMonth === nowMonth) {
        acc.monthlyMinor += amount;
      }
      if (record.status === REWARD_STATUSES.EARNED || record.status === REWARD_STATUSES.PAID) {
        acc.earnedMinor += amount;
      }
      acc.recordCount += 1;
      return acc;
    },
    {
      totalPayoutsMinor: 0,
      lifetimeMinor: 0,
      pendingMinor: 0,
      monthlyMinor: 0,
      earnedMinor: 0,
      recordCount: 0,
      currency: records[0]?.currency || 'CHF',
    }
  );
};

const formatMinorAsCurrency = (amountMinor, currency = 'CHF') => {
  const major = (Number(amountMinor) || 0) / 100;
  return `${currency} ${major.toFixed(2)}`;
};

const toPublicRewardRecord = record => ({
  id: record.id,
  transactionId: record.transactionId,
  referredCoachName: record.referredCoachName,
  referredCoachEmail: record.referredCoachEmail,
  bookingAmountMinor: record.bookingAmountMinor,
  coachNetPayoutMinor: record.coachNetPayoutMinor,
  platformFeeMinor: record.platformFeeMinor,
  stripeFeeMinor: record.stripeFeeMinor,
  ambassadorPercent: record.ambassadorPercent,
  amountMinor: record.amountMinor,
  currency: record.currency,
  status: record.status,
  createdAt: record.createdAt,
  bookingAmountFormatted: formatMinorAsCurrency(record.bookingAmountMinor, record.currency),
  coachNetPayoutFormatted: formatMinorAsCurrency(record.coachNetPayoutMinor, record.currency),
  amountFormatted: formatMinorAsCurrency(record.amountMinor, record.currency),
});

const detectSuspiciousRewardSpikes = (records, options = {}) => {
  const windowMs = (options.windowHours || 24) * 60 * 60 * 1000;
  const singleThresholdMinor = options.singleThresholdMinor || 50000;
  const windowThresholdMinor = options.windowThresholdMinor || 100000;
  const now = Date.now();

  const recent = records.filter(record => now - new Date(record.createdAt).getTime() <= windowMs);

  const spikes = [];

  recent.forEach(record => {
    if (Number(record.amountMinor) >= singleThresholdMinor) {
      spikes.push({
        type: 'large_single_reward',
        ambassadorUserId: record.ambassadorUserId,
        rewardId: record.id,
        amountMinor: record.amountMinor,
        createdAt: record.createdAt,
      });
    }
  });

  const byAmbassador = recent.reduce((acc, record) => {
    const key = record.ambassadorUserId;
    acc[key] = (acc[key] || 0) + (Number(record.amountMinor) || 0);
    return acc;
  }, {});

  Object.entries(byAmbassador).forEach(([ambassadorUserId, totalMinor]) => {
    if (totalMinor >= windowThresholdMinor) {
      spikes.push({
        type: 'high_volume_window',
        ambassadorUserId,
        amountMinor: totalMinor,
      });
    }
  });

  return spikes;
};

module.exports = {
  REWARD_STATUSES,
  calculateNetPeakupRevenueMinor,
  calculateAmbassadorCommissionMinor,
  calculateBookingRewardBreakdown,
  detectSuspiciousRewardSpikes,
  findRewardByTransactionId,
  formatMinorAsCurrency,
  listAllRewards,
  listRewardsForAmbassador,
  promotePendingRewardsForAmbassador,
  recordRewardAccrual,
  summarizeAllRewards,
  summarizeRewardsForAmbassador,
  toPublicRewardRecord,
};
