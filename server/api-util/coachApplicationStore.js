const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SUBMISSIONS_DIR = path.join(__dirname, '..', 'data', 'coach-applications');

const APPLICATION_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  NEED_MORE_INFO: 'need_more_info',
};

const ensureDir = dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const sanitizeFileName = name => {
  const base = path.basename(name || 'file');
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'file';
};

const submissionDirForId = id => {
  const safeId = path.basename(id);
  return path.join(SUBMISSIONS_DIR, safeId);
};

const readSubmissionJson = dir => {
  const jsonPath = path.join(dir, 'submission.json');
  if (!fs.existsSync(jsonPath)) {
    return null;
  }
  const raw = fs.readFileSync(jsonPath, 'utf8');
  return JSON.parse(raw);
};

const writeSubmissionJson = (dir, record) => {
  fs.writeFileSync(path.join(dir, 'submission.json'), JSON.stringify(record, null, 2));
};

const normalizeRecord = record => {
  const now = new Date().toISOString();
  return {
    ...record,
    status: record.status || APPLICATION_STATUSES.PENDING,
    submittedAt: record.submittedAt || now,
    updatedAt: record.updatedAt || record.submittedAt || now,
  };
};

const toListItem = record => ({
  id: record.id,
  fullName: record.fullName,
  email: record.email,
  phone: record.phone || '',
  country: record.country,
  cityArea: record.cityArea,
  languagesSpoken: record.languagesSpoken || '',
  mainSport: record.mainSport,
  otherSports: record.otherSports || '',
  yearsExperience: record.yearsExperience || '',
  certificationLevel: record.certificationLevel || '',
  federationSchool: record.federationSchool || '',
  instagramWebsite: record.instagramWebsite || '',
  ambassadorReferralCode: record.ambassadorReferralCode || '',
  applyingIndependently: Boolean(record.applyingIndependently),
  interestedInAmbassador: Boolean(record.interestedInAmbassador),
  hearAboutPeakUp: record.hearAboutPeakUp || '',
  status: record.status || APPLICATION_STATUSES.PENDING,
  submittedAt: record.submittedAt,
  updatedAt: record.updatedAt,
});

const writeEncodedFile = (submissionDir, key, filePayload) => {
  if (!filePayload?.dataBase64) {
    return null;
  }

  const fileName = `${key}-${sanitizeFileName(filePayload.name)}`;
  const filePath = path.join(submissionDir, fileName);
  fs.writeFileSync(filePath, Buffer.from(filePayload.dataBase64, 'base64'));
  return {
    field: key,
    fileName,
    originalName: filePayload.name,
    mimeType: filePayload.type,
    size: filePayload.size,
  };
};

/**
 * Persist a coach application submission and attached documents.
 *
 * @param {object} payload
 * @returns {{ id: string, dir: string, savedFiles: object[] }}
 */
const saveCoachApplicationSubmission = payload => {
  const id = crypto.randomUUID();
  const submissionDir = path.join(SUBMISSIONS_DIR, id);
  ensureDir(submissionDir);

  const submittedAt = payload.submittedAt || new Date().toISOString();
  const files = payload.files || {};
  const savedFiles = [
    writeEncodedFile(submissionDir, 'id-document', files.idDocument),
    writeEncodedFile(submissionDir, 'coaching-certificates', files.coachingCertificates),
    writeEncodedFile(submissionDir, 'insurance', files.insuranceDocument),
    writeEncodedFile(submissionDir, 'other', files.otherDocuments),
  ].filter(Boolean);

  const record = normalizeRecord({
    id,
    status: APPLICATION_STATUSES.PENDING,
    submittedAt,
    updatedAt: submittedAt,
    hearAboutPeakUp: payload.hearAboutPeakUp,
    ambassadorReferralCode: payload.ambassadorReferralCode,
    applyingIndependently: payload.applyingIndependently,
    interestedInAmbassador: payload.interestedInAmbassador,
    fullName: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    dateOfBirth: payload.dateOfBirth,
    country: payload.country,
    cityArea: payload.cityArea,
    languagesSpoken: payload.languagesSpoken,
    mainSport: payload.mainSport,
    otherSports: payload.otherSports,
    yearsExperience: payload.yearsExperience,
    certificationLevel: payload.certificationLevel,
    federationSchool: payload.federationSchool,
    shortBio: payload.shortBio,
    instagramWebsite: payload.instagramWebsite,
    confirmCorrect: payload.confirmCorrect,
    acceptVerification: payload.acceptVerification,
    understandManualReview: payload.understandManualReview,
    savedFiles,
  });

  writeSubmissionJson(submissionDir, record);

  return { id, dir: submissionDir, savedFiles };
};

const listCoachApplications = () => {
  ensureDir(SUBMISSIONS_DIR);
  const entries = fs.readdirSync(SUBMISSIONS_DIR, { withFileTypes: true });
  const items = entries
    .filter(entry => entry.isDirectory())
    .map(entry => {
      const dir = path.join(SUBMISSIONS_DIR, entry.name);
      const record = readSubmissionJson(dir);
      if (!record) {
        return null;
      }
      return toListItem(normalizeRecord({ ...record, id: record.id || entry.name }));
    })
    .filter(Boolean);

  items.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  return items;
};

const getCoachApplication = id => {
  const dir = submissionDirForId(id);
  if (!fs.existsSync(dir)) {
    const err = new Error('Application not found');
    err.status = 404;
    throw err;
  }
  const record = readSubmissionJson(dir);
  if (!record) {
    const err = new Error('Application not found');
    err.status = 404;
    throw err;
  }
  return normalizeRecord({ ...record, id: record.id || id });
};

const updateCoachApplicationStatus = (id, status) => {
  const validStatuses = Object.values(APPLICATION_STATUSES);
  if (!validStatuses.includes(status)) {
    const err = new Error(`Invalid status. Allowed: ${validStatuses.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const dir = submissionDirForId(id);
  if (!fs.existsSync(dir)) {
    const err = new Error('Application not found');
    err.status = 404;
    throw err;
  }

  const record = normalizeRecord(readSubmissionJson(dir));
  const updated = {
    ...record,
    status,
    updatedAt: new Date().toISOString(),
  };
  writeSubmissionJson(dir, updated);
  return updated;
};

/**
 * Permanently delete a coach application and all uploaded documents.
 *
 * @param {string} id
 * @returns {{ id: string }}
 */
const deleteCoachApplication = id => {
  const dir = submissionDirForId(id);
  if (!fs.existsSync(dir)) {
    const err = new Error('Application not found');
    err.status = 404;
    throw err;
  }

  fs.rmSync(dir, { recursive: true, force: true });
  return { id };
};

const resolveDocumentFile = (id, filename) => {
  const safeName = path.basename(filename);
  const dir = submissionDirForId(id);
  const filePath = path.join(dir, safeName);

  if (!filePath.startsWith(dir) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    const err = new Error('Document not found');
    err.status = 404;
    throw err;
  }

  if (safeName === 'submission.json') {
    const err = new Error('Document not found');
    err.status = 404;
    throw err;
  }

  return { filePath, fileName: safeName };
};

module.exports = {
  SUBMISSIONS_DIR,
  APPLICATION_STATUSES,
  saveCoachApplicationSubmission,
  listCoachApplications,
  getCoachApplication,
  updateCoachApplicationStatus,
  deleteCoachApplication,
  resolveDocumentFile,
};
