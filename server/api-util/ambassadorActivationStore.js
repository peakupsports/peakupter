const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { normalizeReferralCode } = require('./referralCodeNormalize');

const ACTIVATIONS_DIR = path.join(__dirname, '..', 'data', 'ambassador-activations');

const ensureDir = dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const activationDirForId = id => path.join(ACTIVATIONS_DIR, path.basename(id));

const readActivationJson = dir => {
  const jsonPath = path.join(dir, 'activation.json');
  if (!fs.existsSync(jsonPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
};

const writeActivationJson = (dir, record) => {
  fs.writeFileSync(path.join(dir, 'activation.json'), JSON.stringify(record, null, 2));
};

const toListItem = record => ({
  id: record.id,
  userId: record.userId,
  coachName: record.coachName,
  email: record.email,
  activatedAt: record.activatedAt,
  referralCode: normalizeReferralCode(record.referralCode),
  ambassadorTier: record.ambassadorTier,
  ambassadorRewardsUnlocked: Boolean(record.ambassadorRewardsUnlocked),
});

const listTakenReferralCodes = () => {
  ensureDir(ACTIVATIONS_DIR);
  const codes = [];

  fs.readdirSync(ACTIVATIONS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .forEach(entry => {
      const record = readActivationJson(activationDirForId(entry.name));
      if (record?.referralCode) {
        codes.push(record.referralCode);
      }
    });

  return codes;
};

/**
 * @param {object} payload
 * @returns {object}
 */
const saveAmbassadorActivation = payload => {
  ensureDir(ACTIVATIONS_DIR);

  const id = crypto.randomUUID();
  const dir = activationDirForId(id);
  ensureDir(dir);

  const record = {
    id,
    userId: payload.userId,
    coachName: payload.coachName,
    email: payload.email,
    referralCode: normalizeReferralCode(payload.referralCode),
    ambassadorTier: payload.ambassadorTier || 'bronze',
    ambassadorRewardsUnlocked: Boolean(payload.ambassadorRewardsUnlocked),
    activatedAt: payload.activatedAt,
    referralLink: payload.referralLink || '',
    welcomeEmailSentAt: payload.welcomeEmailSentAt || null,
    welcomeEmailError: payload.welcomeEmailError || null,
  };

  writeActivationJson(dir, record);
  return record;
};

const listAmbassadorActivations = () => {
  ensureDir(ACTIVATIONS_DIR);

  return fs
    .readdirSync(ACTIVATIONS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => readActivationJson(activationDirForId(entry.name)))
    .filter(Boolean)
    .sort((a, b) => String(b.activatedAt).localeCompare(String(a.activatedAt)))
    .map(toListItem);
};

module.exports = {
  listAmbassadorActivations,
  listTakenReferralCodes,
  saveAmbassadorActivation,
};
