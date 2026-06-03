/**
 * This file contains server side endpoints that can be used to perform backend
 * tasks that can not be handled in the browser.
 *
 * The endpoints should not clash with the application routes. Therefore, the
 * endpoints are prefixed in the main server where this file is used.
 */

const express = require('express');
const bodyParser = require('body-parser');
const { deserialize } = require('./api-util/sdk');

const initiateLoginAs = require('./api/initiate-login-as');
const loginAs = require('./api/login-as');
const transactionLineItems = require('./api/transaction-line-items');
const initiatePrivileged = require('./api/initiate-privileged');
const transitionPrivileged = require('./api/transition-privileged');
const transactionTransitionWebhook = require('./api/transaction-transition-webhook');
const deleteAccount = require('./api/delete-account');
const peakupBookingHold = require('./api/peakup-booking-hold');
const peakupBookingHoldRelease = require('./api/peakup-booking-hold-release');
const coachApplication = require('./api/coach-application');
const teamApplication = require('./api/team-application');
const coachApplicationsAdmin = require('./api/coach-applications-admin');
const teamApplicationsAdmin = require('./api/team-applications-admin');
const teamRoster = require('./api/team-roster');
const teamRosterManage = require('./api/team-roster-manage');
const teamMembers = require('./api/team-members');
const ambassadorActivation = require('./api/ambassador-activation');
const ambassadorActivationsAdmin = require('./api/ambassador-activations-admin');
const referralCenter = require('./api/referral-center');
const ambassadorAdminOverview = require('./api/ambassador-admin-overview');
const referralRewardsBackfill = require('./api/referral-rewards-backfill');
const referralLedgerRepair = require('./api/referral-ledger-repair');
const coachLegacyApprove = require('./api/coach-legacy-approve');
const coachManagementAdmin = require('./api/coach-management-admin');
const customerManagementAdmin = require('./api/customer-management-admin');
const teamManagementAdmin = require('./api/team-management-admin');
const peakupCoachBlockCancel = require('./api/peakup-coach-block-cancel');
const peakupCoachEventCancel = require('./api/peakup-coach-event-cancel');
const cancellationCasesAdmin = require('./api/cancellation-cases-admin');

const createUserWithIdp = require('./api/auth/createUserWithIdp');

const { authenticateFacebook, authenticateFacebookCallback } = require('./api/auth/facebook');
const { authenticateGoogle, authenticateGoogleCallback } = require('./api/auth/google');

const router = express.Router();

// ================ API router middleware: ================ //

// Coach applications include base64 document payloads — higher limit on this route only.
router.post('/coach-application', express.json({ limit: '30mb' }), coachApplication);
router.post('/team-application', express.json({ limit: '2mb' }), teamApplication);
router.post('/team-roster', express.json({ limit: '64kb' }), teamRoster);
router.get('/team-roster/manage', teamRosterManage.getManage);
router.get('/team-roster/search', teamRosterManage.search);
router.post('/team-roster/invite', express.json({ limit: '64kb' }), teamRosterManage.invite);
router.post(
  '/team-roster/invite/cancel',
  express.json({ limit: '64kb' }),
  teamRosterManage.cancelInvite
);
router.post(
  '/team-roster/member/remove',
  express.json({ limit: '64kb' }),
  teamRosterManage.removeMember
);
router.post('/team-roster/respond', express.json({ limit: '64kb' }), teamRosterManage.respondInvite);
router.get('/team-roster/my-invites', teamRosterManage.myInvites);
router.get('/team-members/:teamId', teamMembers);

// Ambassador Program activation for verified coaches.
router.post('/ambassador-activation', express.json({ limit: '64kb' }), ambassadorActivation);
router.get('/peakup/coach-block-cancel', (req, res) => {
  res.status(405).json({ message: 'Method not allowed. Use POST with JSON body.' });
});
router.post('/peakup/coach-block-cancel', express.json({ limit: '256kb' }), peakupCoachBlockCancel);
router.get('/peakup/coach-event-cancel', (req, res) => {
  res.status(405).json({ message: 'Method not allowed. Use POST with JSON body.' });
});
router.post('/peakup/coach-event-cancel', express.json({ limit: '256kb' }), peakupCoachEventCancel);
// eslint-disable-next-line no-console
console.log('[PeakUp API ROUTE REGISTERED] /api/peakup/coach-block-cancel');
// eslint-disable-next-line no-console
console.log('[PeakUp API ROUTE REGISTERED] /api/peakup/coach-event-cancel');

// Live Referral Center dashboard for active ambassadors.
router.get('/referral-center', referralCenter);

// Public ambassador cards for Ambassador Program page.
const ambassadorsShowcase = require('./api/ambassadors-showcase');
router.get('/ambassadors-showcase', ambassadorsShowcase);

// Internal admin review (protected by COACH_APPLICATION_ADMIN_TOKEN).
router.use('/coach-applications', coachApplicationsAdmin);
router.use('/team-applications', teamApplicationsAdmin);
router.use('/ambassador-activations', ambassadorActivationsAdmin);
router.use('/cancellation-cases', cancellationCasesAdmin);
router.get(
  '/ambassador-admin/overview',
  ambassadorAdminOverview.requireCoachApplicationAdmin,
  ambassadorAdminOverview
);

// PeakUp HQ — Coach Management (directory + partner priority).
router.get(
  '/coach-management-admin',
  coachManagementAdmin.requireCoachApplicationAdmin,
  coachManagementAdmin.listCoaches
);
router.post(
  '/coach-management-admin/partner-priority',
  express.json({ limit: '64kb' }),
  coachManagementAdmin.requireCoachApplicationAdmin,
  coachManagementAdmin.assignPartnerPriority
);
router.post(
  '/coach-management-admin/partner-priority/clear',
  express.json({ limit: '64kb' }),
  coachManagementAdmin.requireCoachApplicationAdmin,
  coachManagementAdmin.removePartnerPriority
);

router.get(
  '/customer-management-admin',
  customerManagementAdmin.requireCoachApplicationAdmin,
  customerManagementAdmin.listCustomers
);

router.get(
  '/team-management-admin',
  teamManagementAdmin.requireCoachApplicationAdmin,
  teamManagementAdmin.listTeams
);

// Dev/admin: repair referral ledger coach ↔ ambassador links.
router.post(
  '/referral-ledger/repair',
  express.json({ limit: '64kb' }),
  referralLedgerRepair.requireCoachApplicationAdmin,
  referralLedgerRepair.runRepair
);
router.get(
  '/referral-ledger/repair',
  referralLedgerRepair.requireCoachApplicationAdmin,
  referralLedgerRepair.runRepair
);

// Dev/admin: accrue missing ambassador rewards for Console-completed bookings.
router.post(
  '/referral-rewards/backfill',
  express.json({ limit: '64kb' }),
  referralRewardsBackfill.requireCoachApplicationAdmin,
  referralRewardsBackfill.runBackfill
);
router.get(
  '/referral-rewards/backfill',
  referralRewardsBackfill.requireCoachApplicationAdmin,
  referralRewardsBackfill.runBackfill
);

// Dev/admin: approve legacy manually-created coach accounts (dry-run by default).
router.post(
  '/coach-legacy-approve',
  express.json({ limit: '64kb' }),
  coachLegacyApprove.requireCoachApplicationAdmin,
  coachLegacyApprove.runLegacyCoachApprove
);
router.get(
  '/coach-legacy-approve',
  coachLegacyApprove.requireCoachApplicationAdmin,
  coachLegacyApprove.runLegacyCoachApprove
);

// JSON routes (e.g. PeakUp soft holds) — must run before Transit body parser.
router.use(express.json({ limit: '64kb' }));

// Parse Transit body first to a string
router.use(
  bodyParser.text({
    type: 'application/transit+json',
  })
);

// Deserialize Transit body string to JS data
router.use((req, res, next) => {
  if (req.get('Content-Type') === 'application/transit+json' && typeof req.body === 'string') {
    try {
      req.body = deserialize(req.body);
    } catch (e) {
      console.error('Failed to parse request body as Transit:');
      console.error(e);
      res.status(400).send('Invalid Transit in request body.');
      return;
    }
  }
  next();
});

// ================ API router endpoints: ================ //

router.get('/initiate-login-as', initiateLoginAs);
router.get('/login-as', loginAs);
router.post('/transaction-line-items', transactionLineItems);
router.post('/initiate-privileged', initiatePrivileged);
router.post('/transition-privileged', transitionPrivileged);
router.post('/transaction-transition-webhook', transactionTransitionWebhook);
router.post('/delete-account', deleteAccount);

router.post('/peakup/booking-hold', peakupBookingHold);
router.post('/peakup/booking-hold/release', peakupBookingHoldRelease);

// Create user with identity provider (e.g. Facebook or Google)
// This endpoint is called to create a new user after user has confirmed
// they want to continue with the data fetched from IdP (e.g. name and email)
router.post('/auth/create-user-with-idp', createUserWithIdp);

// Facebook authentication endpoints

// This endpoint is called when user wants to initiate authenticaiton with Facebook
router.get('/auth/facebook', authenticateFacebook);

// This is the route for callback URL the user is redirected after authenticating
// with Facebook. In this route a Passport.js custom callback is used for calling
// loginWithIdp endpoint in Sharetribe Auth API to authenticate user to the marketplace
router.get('/auth/facebook/callback', authenticateFacebookCallback);

// Google authentication endpoints

// This endpoint is called when user wants to initiate authenticaiton with Google
router.get('/auth/google', authenticateGoogle);

// This is the route for callback URL the user is redirected after authenticating
// with Google. In this route a Passport.js custom callback is used for calling
// loginWithIdp endpoint in Sharetribe Auth API to authenticate user to the marketplace
router.get('/auth/google/callback', authenticateGoogleCallback);

module.exports = router;
