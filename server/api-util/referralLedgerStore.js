const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LEDGER_DIR = path.join(__dirname, '..', 'data', 'referral-ledger');

const REFERRAL_STATUSES = {
  INVITED: 'invited',
  APPLIED: 'applied',
  VERIFIED: 'verified',
  ACTIVE: 'active',
};

const ensureDir = dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const entryPathForId = id => path.join(LEDGER_DIR, `${path.basename(id)}.json`);

const readEntry = id => {
  const filePath = entryPathForId(id);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const writeEntry = entry => {
  ensureDir(LEDGER_DIR);
  fs.writeFileSync(entryPathForId(entry.id), JSON.stringify(entry, null, 2));
};

const normalizeEntry = entry => ({
  ...entry,
  status: entry.status || REFERRAL_STATUSES.APPLIED,
  listingsCount: Number.isFinite(entry.listingsCount) ? entry.listingsCount : 0,
  rewardStatus: entry.rewardStatus || 'pending',
  updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString(),
});

const toPublicReferral = entry => ({
  id: entry.id,
  applicationId: entry.applicationId || null,
  name: entry.applicantName,
  email: entry.applicantEmail,
  status: entry.status,
  joinedAt: entry.joinedAt || entry.createdAt,
  listings: entry.listingsCount || 0,
  rewardStatus: entry.rewardStatus || 'pending',
  ambassadorReferralCode: entry.ambassadorReferralCode,
});

const listAllReferrals = () => {
  ensureDir(LEDGER_DIR);
  return fs
    .readdirSync(LEDGER_DIR)
    .filter(name => name.endsWith('.json'))
    .map(name => normalizeEntry(JSON.parse(fs.readFileSync(path.join(LEDGER_DIR, name), 'utf8'))));
};

const listReferralsForAmbassador = ambassadorUserId => {
  const normalizedUserId = String(ambassadorUserId || '').trim();
  if (!normalizedUserId) {
    return [];
  }

  return listAllReferrals()
    .filter(entry => String(entry.ambassadorUserId) === normalizedUserId)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
};

const findReferralByApplicationId = applicationId => {
  const normalized = String(applicationId || '').trim();
  if (!normalized) {
    return null;
  }
  return listAllReferrals().find(entry => entry.applicationId === normalized) || null;
};

/**
 * @param {object} payload
 * @returns {object}
 */
const createReferralEntry = payload => {
  const now = new Date().toISOString();
  const entry = normalizeEntry({
    id: crypto.randomUUID(),
    ambassadorUserId: payload.ambassadorUserId,
    ambassadorReferralCode: payload.ambassadorReferralCode,
    applicationId: payload.applicationId,
    applicantName: payload.applicantName,
    applicantEmail: payload.applicantEmail,
    referredCoachUserId: payload.referredCoachUserId || null,
    referredCoachEmail: payload.referredCoachEmail || payload.applicantEmail || null,
    status: payload.status || REFERRAL_STATUSES.APPLIED,
    listingsCount: payload.listingsCount || 0,
    rewardStatus: payload.rewardStatus || 'pending',
    joinedAt: payload.joinedAt || now,
    createdAt: now,
    updatedAt: now,
  });

  writeEntry(entry);
  return entry;
};

const updateReferralEntry = (id, patch) => {
  const existing = readEntry(id);
  if (!existing) {
    const err = new Error('Referral entry not found');
    err.status = 404;
    throw err;
  }

  const updated = normalizeEntry({
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  });

  writeEntry(updated);
  return updated;
};

/**
 * Permanently remove a referral ledger entry.
 *
 * @param {string} id
 * @returns {boolean}
 */
const deleteReferralEntry = id => {
  const normalized = String(id || '').trim();
  if (!normalized) {
    return false;
  }
  const filePath = entryPathForId(normalized);
  if (!fs.existsSync(filePath)) {
    return false;
  }
  fs.unlinkSync(filePath);
  return true;
};

/**
 * Remove referral ledger row for a deleted coach application.
 *
 * @param {string} applicationId
 * @returns {object|null} removed entry snapshot
 */
const deleteReferralByApplicationId = applicationId => {
  const entry = findReferralByApplicationId(applicationId);
  if (!entry) {
    return null;
  }
  deleteReferralEntry(entry.id);
  return entry;
};

const syncReferralFromApplication = application => {
  const code = String(application.ambassadorReferralCode || '').trim();
  if (!code) {
    return null;
  }

  const existing = findReferralByApplicationId(application.id);
  if (existing) {
    return existing;
  }

  const { resolveReferralCode } = require('./referralCodeRegistry');
  const ambassador = resolveReferralCode(code);
  if (!ambassador) {
    return null;
  }

  let status = REFERRAL_STATUSES.APPLIED;
  if (application.status === 'approved') {
    status = REFERRAL_STATUSES.VERIFIED;
  } else if (application.status === 'rejected') {
    return null;
  }

  const applicantUserId = String(application.applicantUserId || '').trim();
  return createReferralEntry({
    ambassadorUserId: ambassador.ambassadorUserId,
    ambassadorReferralCode: ambassador.ambassadorReferralCode,
    applicationId: application.id,
    applicantName: application.fullName,
    applicantEmail: application.email,
    referredCoachUserId: applicantUserId || null,
    referredCoachEmail: application.email || null,
    status,
    joinedAt: application.submittedAt,
  });
};

const mapApplicationStatusToReferralStatus = applicationStatus => {
  if (applicationStatus === 'approved') {
    return REFERRAL_STATUSES.VERIFIED;
  }
  if (applicationStatus === 'pending' || applicationStatus === 'need_more_info') {
    return REFERRAL_STATUSES.APPLIED;
  }
  return null;
};

module.exports = {
  LEDGER_DIR,
  REFERRAL_STATUSES,
  createReferralEntry,
  deleteReferralByApplicationId,
  deleteReferralEntry,
  findReferralByApplicationId,
  listAllReferrals,
  listReferralsForAmbassador,
  mapApplicationStatusToReferralStatus,
  syncReferralFromApplication,
  toPublicReferral,
  updateReferralEntry,
};
