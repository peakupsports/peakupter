import {
  isPeakUpTeamUserType,
  isPeakUpVerifiedTeam,
  isPeakUpTeamProfile,
  getPeakupTeamMemberIds,
  getTeamShortLocationLabel,
  matchesEntityFilter,
  resolveCoachTeamAffiliation,
  isTeamProfileComplete,
  resolveTeamPostLoginRedirectTarget,
  resolveTeamLogoLink,
  resolveTeamDashboardLink,
  TEAM_DASHBOARD_ROUTE_NAME,
  TEAM_PROFILE_SETTINGS_PATH,
  PEAKUP_AFFILIATION_ACTIVE,
} from './peakupTeam';

describe('peakupTeam', () => {
  it('detects team user type', () => {
    expect(isPeakUpTeamUserType({ userType: 'team' })).toBe(true);
    expect(isPeakUpTeamUserType({ userType: 'coach' })).toBe(false);
  });

  it('requires verification for public team', () => {
    expect(
      isPeakUpVerifiedTeam({ peakupVerifiedTeam: true, peakupTeamVisibility: 'public' })
    ).toBe(true);
    expect(isPeakUpVerifiedTeam({ peakupVerifiedTeam: true, peakupTeamVisibility: 'draft' })).toBe(
      false
    );
  });

  it('team profile layout excludes customer-only', () => {
    expect(isPeakUpTeamProfile({ userType: 'team' }, { provider: true })).toBe(true);
    expect(isPeakUpTeamProfile({ userType: 'team' }, { customer: true, provider: false })).toBe(
      false
    );
  });

  it('prefers teamCityText for short location', () => {
    const label = getTeamShortLocationLabel({
      author: {
        attributes: {
          profile: {
            publicData: { teamCityText: 'St. Moritz, Switzerland' },
          },
        },
      },
      representativeListing: null,
    });
    expect(label).toBe('St. Moritz');
  });

  it('parses roster member ids', () => {
    expect(getPeakupTeamMemberIds({ peakupTeamMemberIds: ['a', 'b'] })).toEqual(['a', 'b']);
  });

  it('filters map entities', () => {
    expect(matchesEntityFilter('all', 'coach')).toBe(true);
    expect(matchesEntityFilter('teams', 'coach')).toBe(false);
    expect(matchesEntityFilter('teams', 'team')).toBe(true);
  });

  it('resolves active coach affiliation', () => {
    const aff = resolveCoachTeamAffiliation(
      {
        peakupAffiliatedTeamId: 'team-1',
        peakupAffiliationStatus: PEAKUP_AFFILIATION_ACTIVE,
      },
      {
        attributes: {
          profile: {
            displayName: 'Team Azzurro',
            publicData: { peakupVerifiedTeam: true, peakupTeamVisibility: 'public' },
          },
        },
      }
    );
    expect(aff?.teamId).toBe('team-1');
    expect(aff?.isPublic).toBe(true);
  });

  it('detects incomplete team profile for post-login redirect', () => {
    const incompleteTeam = {
      id: { uuid: 'team-user-1' },
      attributes: {
        profile: {
          displayName: 'Team Azzurro',
          publicData: { userType: 'team' },
        },
      },
    };
    expect(isTeamProfileComplete(incompleteTeam)).toBe(false);
    expect(resolveTeamPostLoginRedirectTarget(incompleteTeam)).toBe(TEAM_PROFILE_SETTINGS_PATH);
  });

  it('redirects complete team profile to public profile path', () => {
    const completeTeam = {
      id: { uuid: 'team-user-2' },
      attributes: {
        profile: {
          displayName: 'Team Azzurro',
          publicData: {
            userType: 'team',
            teamCityText: 'St. Moritz, Switzerland',
            lat: 46.5,
            lng: 9.8,
            teamTagline: 'Alpine crew',
          },
        },
      },
    };
    expect(isTeamProfileComplete(completeTeam)).toBe(true);
    expect(resolveTeamPostLoginRedirectTarget(completeTeam)).toBe(TEAM_PROFILE_SETTINGS_PATH);
  });

  it('resolves team logo link to profile settings (V1)', () => {
    const incompleteTeam = {
      id: { uuid: 'team-user-1' },
      attributes: {
        profile: {
          displayName: 'Team Azzurro',
          publicData: { userType: 'team' },
        },
      },
    };
    expect(resolveTeamLogoLink(incompleteTeam)).toEqual({
      linkName: TEAM_DASHBOARD_ROUTE_NAME,
    });
    expect(resolveTeamDashboardLink()).toEqual({ linkName: TEAM_DASHBOARD_ROUTE_NAME });

    const completeTeam = {
      id: { uuid: 'team-user-2' },
      attributes: {
        profile: {
          displayName: 'Team Azzurro',
          publicData: {
            userType: 'team',
            teamCityText: 'St. Moritz, Switzerland',
            lat: 46.5,
            lng: 9.8,
            teamTagline: 'Alpine crew',
          },
        },
      },
    };
    expect(resolveTeamLogoLink(completeTeam)).toEqual({ linkName: TEAM_DASHBOARD_ROUTE_NAME });
  });
});
