const { APPLICATION_STATUSES } = require('./coachApplicationStore');
const { getIntegrationSdk, integrationTypes } = require('./integrationSdk');

const PERMISSION_ALLOW = 'permission/allow';

const buildCoachApprovalPublicData = application => {
  const now = new Date().toISOString();
  return {
    userType: 'coach',
    coachApproved: true,
    profileVerified: true,
    peakupVerifiedCoach: true,
    pendingCoachApplication: false,
    coachOnboardingIntent: false,
    coachApprovedAt: now,
    coachApplicationId: application.id,
  };
};

const extractSharetribeErrorPayload = error => ({
  status: error?.status ?? null,
  statusText: error?.statusText ?? null,
  message: error?.message ?? null,
  data: error?.data ?? null,
  errors: error?.data?.errors ?? null,
});

const logSharetribeApprovalError = (step, error, extra = {}) => {
  const payload = extractSharetribeErrorPayload(error);
  console.error('[PeakUp SHARETRIBE APPROVAL ERROR]', {
    step,
    status: payload.status,
    statusText: payload.statusText,
    message: payload.message,
    data: payload.data,
    errors: payload.errors,
    ...extra,
  });
  return payload;
};

const toIntegrationError = (error, fallbackMessage, step) => {
  const payload = extractSharetribeErrorPayload(error);
  const apiTitle = payload.errors?.[0]?.title;
  const apiCode = payload.errors?.[0]?.code;
  const err = new Error(apiTitle || payload.message || fallbackMessage);
  err.status = payload.status || 502;
  err.data = payload.data;
  err.sharetribeStep = step;
  err.sharetribeError = payload;
  if (apiCode) {
    err.code = apiCode;
  }
  return err;
};

/**
 * @template T
 * @param {string} step
 * @param {() => Promise<T>} fn
 * @param {object} [context]
 * @returns {Promise<T>}
 */
const runSharetribeApprovalStep = async (step, fn, context = {}) => {
  try {
    const result = await fn();
    // eslint-disable-next-line no-console
    console.log('[PeakUp SHARETRIBE APPROVAL STEP OK]', { step, ...context });
    return result;
  } catch (error) {
    logSharetribeApprovalError(step, error, context);
    throw toIntegrationError(error, `Sharetribe coach approval failed at step: ${step}`, step);
  }
};

const resolveApplicantUserId = async (integrationSdk, application) => {
  const fromApplication = String(application.applicantUserId || '').trim();
  if (fromApplication) {
    return fromApplication;
  }

  const email = String(application.email || '')
    .trim()
    .toLowerCase();
  if (!email) {
    throw Object.assign(
      new Error('Coach application is missing applicant user id and email.'),
      { status: 422 }
    );
  }

  let page = 1;
  const perPage = 100;
  while (page <= 20) {
    const response = await runSharetribeApprovalStep(
      'users.query',
      () => integrationSdk.users.query({ page, perPage }),
      { applicationId: application.id, email, page }
    );
    const users = response?.data?.data || [];
    const match = users.find(
      user => String(user?.attributes?.email || '').trim().toLowerCase() === email
    );
    if (match?.id?.uuid) {
      return match.id.uuid;
    }
    const totalPages = response?.data?.meta?.totalPages || 1;
    if (page >= totalPages || users.length === 0) {
      break;
    }
    page += 1;
  }

  throw Object.assign(new Error(`No Sharetribe user found for ${application.email}.`), {
    status: 404,
  });
};

/**
 * Approve coach in Sharetribe: profile flags + listing permissions (Integration API).
 * Must run before persisting local application status = approved.
 *
 * @param {object} application Coach application record
 * @returns {Promise<{ userId: string, email: string, canPostListingsUpdated: boolean }>}
 */
const applyCoachApprovalToSharetribe = async application => {
  const integrationSdk = getIntegrationSdk();
  const applicationId = application.id;

  const userId = await resolveApplicantUserId(integrationSdk, application);
  const email = String(application.email || application.applicantEmail || '').trim();
  const userUuid = new integrationTypes.UUID(userId);

  const showResponse = await runSharetribeApprovalStep(
    'users.show',
    () => integrationSdk.users.show({ id: userUuid }),
    { applicationId, userId, email }
  );
  const user = showResponse?.data?.data;

  if (!user) {
    const err = Object.assign(new Error(`Sharetribe user ${userId} not found.`), { status: 404 });
    logSharetribeApprovalError('users.show', err, { applicationId, userId, email });
    throw err;
  }

  if (user.attributes?.banned) {
    throw Object.assign(new Error('Cannot approve a banned Sharetribe user.'), { status: 409 });
  }

  if (user.attributes?.deleted) {
    throw Object.assign(new Error('Cannot approve a deleted Sharetribe user.'), { status: 409 });
  }

  if (user.attributes?.state === 'pendingApproval') {
    await runSharetribeApprovalStep(
      'users.approve',
      () => integrationSdk.users.approve({ id: userUuid }),
      { applicationId, userId, email, userState: user.attributes.state }
    );
  }

  const existingPublicData = user?.attributes?.profile?.publicData || {};
  const approvalPublicData = buildCoachApprovalPublicData(application);

  await runSharetribeApprovalStep(
    'users.updateProfile',
    () =>
      integrationSdk.users.updateProfile({
        id: userUuid,
        publicData: {
          ...existingPublicData,
          ...approvalPublicData,
        },
      }),
    { applicationId, userId, email }
  );

  await runSharetribeApprovalStep(
    'users.updatePermissions',
    () =>
      integrationSdk.users.updatePermissions({
        id: userUuid,
        postListings: PERMISSION_ALLOW,
        initiateTransactions: PERMISSION_ALLOW,
        read: PERMISSION_ALLOW,
      }),
    { applicationId, userId, email }
  );

  // eslint-disable-next-line no-console
  console.log('[PeakUp COACH APPROVAL PERMISSIONS]', {
    userId,
    email,
    approvalStatus: APPLICATION_STATUSES.APPROVED,
    canPostListingsUpdated: true,
  });

  return {
    userId,
    email,
    canPostListingsUpdated: true,
  };
};

module.exports = {
  applyCoachApprovalToSharetribe,
  buildCoachApprovalPublicData,
  extractSharetribeErrorPayload,
  logSharetribeApprovalError,
  runSharetribeApprovalStep,
};
