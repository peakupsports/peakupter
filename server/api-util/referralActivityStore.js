const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ACTIVITY_DIR = path.join(__dirname, '..', 'data', 'referral-activity');

const ACTIVITY_TYPES = {
  COACH_APPLIED: 'coach_applied',
  COACH_VERIFIED: 'coach_verified',
  COACH_ACTIVE: 'coach_active',
  FIRST_BOOKING: 'first_booking',
  REWARD_EARNED: 'reward_earned',
  TIER_UPGRADED: 'tier_upgraded',
  REWARDS_UNLOCKED: 'rewards_unlocked',
};

const ensureDir = dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const activityPathForId = id => path.join(ACTIVITY_DIR, `${path.basename(id)}.json`);

const writeActivity = event => {
  ensureDir(ACTIVITY_DIR);
  fs.writeFileSync(activityPathForId(event.id), JSON.stringify(event, null, 2));
};

/**
 * @param {object} payload
 * @returns {object}
 */
const logReferralActivity = payload => {
  const event = {
    id: crypto.randomUUID(),
    ambassadorUserId: payload.ambassadorUserId,
    type: payload.type,
    title: payload.title || '',
    body: payload.body || '',
    meta: payload.meta || {},
    createdAt: payload.createdAt || new Date().toISOString(),
  };

  writeActivity(event);
  return event;
};

const deleteActivityForApplication = applicationId => {
  const normalized = String(applicationId || '').trim();
  if (!normalized) {
    return 0;
  }

  ensureDir(ACTIVITY_DIR);
  let removed = 0;
  fs.readdirSync(ACTIVITY_DIR)
    .filter(name => name.endsWith('.json'))
    .forEach(name => {
      const filePath = path.join(ACTIVITY_DIR, name);
      const event = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (String(event?.meta?.applicationId || '').trim() === normalized) {
        fs.unlinkSync(filePath);
        removed += 1;
      }
    });

  return removed;
};

const deleteActivityForReferralId = referralId => {
  const normalized = String(referralId || '').trim();
  if (!normalized) {
    return 0;
  }

  ensureDir(ACTIVITY_DIR);
  let removed = 0;
  fs.readdirSync(ACTIVITY_DIR)
    .filter(name => name.endsWith('.json'))
    .forEach(name => {
      const filePath = path.join(ACTIVITY_DIR, name);
      const event = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (String(event?.meta?.referralId || '').trim() === normalized) {
        fs.unlinkSync(filePath);
        removed += 1;
      }
    });

  return removed;
};

const listActivityForAmbassador = (ambassadorUserId, limit = 20) => {
  ensureDir(ACTIVITY_DIR);
  const normalizedUserId = String(ambassadorUserId || '').trim();
  if (!normalizedUserId) {
    return [];
  }

  return fs
    .readdirSync(ACTIVITY_DIR)
    .filter(name => name.endsWith('.json'))
    .map(name => JSON.parse(fs.readFileSync(path.join(ACTIVITY_DIR, name), 'utf8')))
    .filter(event => String(event.ambassadorUserId) === normalizedUserId)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit);
};

module.exports = {
  ACTIVITY_DIR,
  ACTIVITY_TYPES,
  deleteActivityForApplication,
  deleteActivityForReferralId,
  listActivityForAmbassador,
  logReferralActivity,
};
