import {
  getUnreadTeamInvitationIds,
  isTeamInvitationUnread,
  markTeamInvitationReadAt,
  getTeamInvitationReadAt,
} from './teamInvitationInbox';

describe('teamInvitationInbox', () => {
  const userId = 'coach-user-1';
  const teamId = 'team-user-1';

  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('treats invitations without read state as unread', () => {
    const invite = {
      teamId,
      invitedAt: '2026-05-28T10:00:00.000Z',
      threadType: 'team_invitation',
    };
    expect(isTeamInvitationUnread(userId, invite)).toBe(true);
    expect(getUnreadTeamInvitationIds(userId, [invite])).toEqual([teamId]);
  });

  it('marks invitation read after ack timestamp', () => {
    const invite = {
      teamId,
      invitedAt: '2026-05-28T10:00:00.000Z',
    };
    markTeamInvitationReadAt(userId, teamId, '2026-05-28T11:00:00.000Z');
    expect(getTeamInvitationReadAt(userId, teamId)).toBe('2026-05-28T11:00:00.000Z');
    expect(isTeamInvitationUnread(userId, invite)).toBe(false);
  });

  it('stays unread when a newer invitation timestamp arrives', () => {
    markTeamInvitationReadAt(userId, teamId, '2026-05-28T10:00:00.000Z');
    const invite = {
      teamId,
      invitedAt: '2026-05-28T12:00:00.000Z',
    };
    expect(isTeamInvitationUnread(userId, invite)).toBe(true);
  });
});
