const { APPLICATION_STATUSES } = require('./teamApplicationStore');
const { getIntegrationSdk, integrationTypes } = require('./integrationSdk');
const { runSharetribeApprovalStep, logSharetribeApprovalError } = require('./coachApprovalSharetribe');

const PERMISSION_ALLOW = 'permission/allow';

const buildTeamApprovalPublicData = application => {
  const now = new Date().toISOString();
  return {
    userType: 'team',
    teamApproved: true,
    peakupVerifiedTeam: true,
    peakupTeamVisibility: 'public',
    teamApprovedAt: now,
    teamApplicationId: application.id,
    teamTagline: application.teamName ? String(application.teamName).trim() : undefined,
  };
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
    throw Object.assign(new Error('Team application is missing applicant user id and email.'), {
      status: 422,
    });
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
 * Approve team provider in Sharetribe (Integration API).
 *
 * @param {object} application
 */
const applyTeamApprovalToSharetribe = async application => {
  const integrationSdk = getIntegrationSdk();
  const applicationId = application.id;
  const userId = await resolveApplicantUserId(integrationSdk, application);
  const email = String(application.email || '').trim();
  const userUuid = new integrationTypes.UUID(userId);

  const showResponse = await runSharetribeApprovalStep(
    'users.show',
    () => integrationSdk.users.show({ id: userUuid }),
    { applicationId, userId, email }
  );
  const user = showResponse?.data?.data;

  if (!user) {
    throw Object.assign(new Error(`Sharetribe user ${userId} not found.`), { status: 404 });
  }

  if (user.attributes?.state === 'pendingApproval') {
    await runSharetribeApprovalStep(
      'users.approve',
      () => integrationSdk.users.approve({ id: userUuid }),
      { applicationId, userId, email }
    );
  }

  const existingPublicData = user?.attributes?.profile?.publicData || {};
  const approvalPublicData = buildTeamApprovalPublicData(application);
  const cleanedApproval = Object.fromEntries(
    Object.entries(approvalPublicData).filter(([, v]) => v !== undefined)
  );

  await runSharetribeApprovalStep(
    'users.updateProfile',
    () =>
      integrationSdk.users.updateProfile({
        id: userUuid,
        publicData: {
          ...existingPublicData,
          ...cleanedApproval,
          teamSports:
            Array.isArray(application.teamSports) && application.teamSports.length > 0
              ? application.teamSports
              : existingPublicData.teamSports,
          teamBio: application.teamBio || existingPublicData.teamBio,
          teamCityText: application.cityArea || existingPublicData.teamCityText,
          teamWebsite: application.teamWebsite || existingPublicData.teamWebsite,
          teamInstagram: application.teamInstagram || existingPublicData.teamInstagram,
        },
        displayName: application.teamName || user.attributes?.profile?.displayName,
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

  return { userId, email, canPostListingsUpdated: true };
};

module.exports = {
  applyTeamApprovalToSharetribe,
  buildTeamApprovalPublicData,
};
