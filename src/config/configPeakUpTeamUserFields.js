/**
 * PeakUp team / crew provider profile fields (`publicData`).
 * Lifestyle community layer — keep fields minimal (no enterprise roster UI).
 *
 * Console: add matching `team` user type with `provider` role in user-types.json.
 */

export const PEAK_UP_TEAM_PROFILE_KEYS = [
  'teamTagline',
  'teamBio',
  'teamSports',
  'teamCityText',
  'teamLocation',
  'teamFoundedYear',
  'teamWebsite',
  'teamInstagram',
  'teamCoachCount',
  'lat',
  'lng',
  'peakupTeamVisibility',
  'peakupVerifiedTeam',
  'teamApproved',
  'peakupTeamMemberIds',
  'peakupTeamPendingInviteIds',
  'peakupTeamDeclinedInviteIds',
];

const TEAM_SPORT_OPTIONS = [
  { option: 'surf', label: 'Surf' },
  { option: 'snowboard', label: 'Snowboard' },
  { option: 'ski', label: 'Ski' },
  { option: 'tennis', label: 'Tennis' },
  { option: 'golf', label: 'Golf' },
  { option: 'mtb', label: 'MTB' },
  { option: 'climbing', label: 'Climbing' },
  { option: 'yoga', label: 'Yoga' },
  { option: 'fitness', label: 'Fitness' },
];

export { TEAM_SPORT_OPTIONS };

export const peakUpTeamUserTypes = [
  {
    userType: 'team',
    label: 'Team',
    roles: ['provider'],
  },
];

export const peakUpTeamUserFields = [
  {
    key: 'teamTagline',
    scope: 'public',
    schemaType: 'text',
    showConfig: {
      label: 'Team tagline',
      displayInProfile: true,
    },
    saveConfig: {
      label: 'Team tagline',
      displayInSignUp: false,
      isRequired: false,
      placeholderMessage: 'Short tagline on your hero (e.g. Freeski team · Laax)',
    },
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['team'],
    },
  },
  {
    key: 'teamBio',
    scope: 'public',
    schemaType: 'text',
    showConfig: {
      label: 'About your team',
      displayInProfile: true,
    },
    saveConfig: {
      label: 'About your team',
      displayInSignUp: false,
      isRequired: false,
      placeholderMessage: 'Tell customers what your team is about.',
    },
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['team'],
    },
  },
  {
    key: 'teamSports',
    scope: 'public',
    schemaType: 'multi-enum',
    enumOptions: TEAM_SPORT_OPTIONS,
    showConfig: {
      label: 'Sports',
      displayInProfile: true,
    },
    saveConfig: {
      label: 'Sports',
      displayInSignUp: false,
      isRequired: false,
    },
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['team'],
    },
  },
  {
    key: 'teamCityText',
    scope: 'public',
    schemaType: 'text',
    showConfig: {
      label: 'Location',
      displayInProfile: true,
    },
    saveConfig: {
      label: 'Location',
      displayInSignUp: false,
      isRequired: false,
      placeholderMessage: 'e.g. Ericeira, Laax, Chamonix',
    },
    helpTextTranslationId: 'ProfileSettingsForm.teamLocationHelp',
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['team'],
    },
  },
  {
    key: 'teamFoundedYear',
    scope: 'public',
    schemaType: 'text',
    showConfig: {
      label: 'Since',
      displayInProfile: true,
    },
    saveConfig: {
      label: 'Since',
      displayInSignUp: false,
      isRequired: false,
      placeholderMessage: '2018',
    },
    helpTextTranslationId: 'ProfileSettingsForm.teamSinceYearHelp',
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['team'],
    },
  },
  {
    key: 'teamWebsite',
    scope: 'public',
    schemaType: 'text',
    showConfig: {
      label: 'Website',
      displayInProfile: true,
    },
    saveConfig: {
      label: 'Website',
      displayInSignUp: false,
      isRequired: false,
      placeholderMessage: 'https://yourteam.com',
    },
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['team'],
    },
  },
  {
    key: 'teamInstagram',
    scope: 'public',
    schemaType: 'text',
    showConfig: {
      label: 'Instagram',
      displayInProfile: true,
    },
    saveConfig: {
      label: 'Instagram',
      displayInSignUp: false,
      isRequired: false,
      placeholderMessage: '@yourteam',
    },
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['team'],
    },
  },
  {
    key: 'teamCoachCount',
    scope: 'public',
    schemaType: 'text',
    showConfig: {
      label: 'Coaches on the team',
      displayInProfile: false,
    },
    saveConfig: {
      label: 'Number of coaches (optional)',
      displayInSignUp: false,
      isRequired: false,
      placeholderMessage: 'e.g. 6 — shown until your roster is live',
    },
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['team'],
    },
  },
];
