const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SUBMISSIONS_DIR = path.join(__dirname, '..', 'data', 'team-applications');

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

const submissionDirForId = id => path.join(SUBMISSIONS_DIR, path.basename(id));

const readSubmissionJson = dir => {
  const jsonPath = path.join(dir, 'submission.json');
  if (!fs.existsSync(jsonPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
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
  teamName: record.teamName,
  email: record.email,
  phone: record.phone || '',
  cityArea: record.cityArea || '',
  mainSport: record.mainSport || '',
  teamSports: record.teamSports || [],
  applicantUserId: record.applicantUserId || '',
  intendedRosterCoachIds: record.intendedRosterCoachIds || [],
  status: record.status || APPLICATION_STATUSES.PENDING,
  submittedAt: record.submittedAt,
  updatedAt: record.updatedAt,
});

const listTeamApplications = () => {
  ensureDir(SUBMISSIONS_DIR);
  const dirs = fs.readdirSync(SUBMISSIONS_DIR, { withFileTypes: true }).filter(d => d.isDirectory());
  const items = [];
  for (const dirent of dirs) {
    const record = readSubmissionJson(path.join(SUBMISSIONS_DIR, dirent.name));
    if (record) {
      items.push(toListItem(record));
    }
  }
  items.sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
  return items;
};

const getTeamApplication = id => {
  const dir = submissionDirForId(id);
  const record = readSubmissionJson(dir);
  if (!record) {
    const err = new Error('Team application not found.');
    err.status = 404;
    throw err;
  }
  return record;
};

const saveTeamApplicationSubmission = payload => {
  const id = crypto.randomUUID();
  const submissionDir = submissionDirForId(id);
  ensureDir(submissionDir);

  const submittedAt = payload.submittedAt || new Date().toISOString();
  const record = normalizeRecord({
    id,
    status: APPLICATION_STATUSES.PENDING,
    submittedAt,
    updatedAt: submittedAt,
    teamName: payload.teamName,
    email: payload.email,
    phone: payload.phone,
    cityArea: payload.cityArea,
    mainSport: payload.mainSport,
    teamSports: payload.teamSports || [],
    teamBio: payload.teamBio || '',
    teamWebsite: payload.teamWebsite || '',
    teamInstagram: payload.teamInstagram || '',
    applicantUserId: payload.applicantUserId || '',
    intendedRosterCoachIds: payload.intendedRosterCoachIds || [],
    hearAboutPeakUp: payload.hearAboutPeakUp || '',
  });

  writeSubmissionJson(submissionDir, record);
  return { id, dir: submissionDir };
};

const updateTeamApplicationStatus = (id, status) => {
  const dir = submissionDirForId(id);
  const record = readSubmissionJson(dir);
  if (!record) {
    const err = new Error('Team application not found.');
    err.status = 404;
    throw err;
  }
  const next = {
    ...record,
    status,
    updatedAt: new Date().toISOString(),
  };
  writeSubmissionJson(dir, next);
  return next;
};

const updateTeamApplicationApplicantUserId = (id, applicantUserId) => {
  const dir = submissionDirForId(id);
  const record = readSubmissionJson(dir);
  if (!record) {
    return null;
  }
  const next = {
    ...record,
    applicantUserId,
    updatedAt: new Date().toISOString(),
  };
  writeSubmissionJson(dir, next);
  return next;
};

module.exports = {
  APPLICATION_STATUSES,
  listTeamApplications,
  getTeamApplication,
  saveTeamApplicationSubmission,
  updateTeamApplicationStatus,
  updateTeamApplicationApplicantUserId,
};
