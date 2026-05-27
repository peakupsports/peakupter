jest.mock('./integrationSdk', () => {
  const approve = jest.fn().mockResolvedValue({});
  const updateProfile = jest.fn().mockResolvedValue({});
  const updatePermissions = jest.fn().mockResolvedValue({});
  const show = jest.fn().mockResolvedValue({
    data: {
      data: {
        id: { uuid: 'user-uuid-1' },
        attributes: {
          state: 'pendingApproval',
          email: 'alex@example.com',
          profile: { publicData: { userType: 'instructor' } },
        },
      },
    },
  });

  return {
    getIntegrationSdk: () => ({
      users: { show, approve, updateProfile, updatePermissions, query: jest.fn() },
    }),
    integrationTypes: {
      UUID: function UUID(uuid) {
        this.uuid = uuid;
      },
    },
    __mocks: { show, approve, updateProfile, updatePermissions },
  };
});

const integrationSdkMock = require('./integrationSdk');
const { applyCoachApprovalToSharetribe } = require('./coachApprovalSharetribe');

const defaultShowResponse = {
  data: {
    data: {
      id: { uuid: 'user-uuid-1' },
      attributes: {
        state: 'pendingApproval',
        email: 'alex@example.com',
        profile: { publicData: { userType: 'instructor' } },
      },
    },
  },
};

describe('applyCoachApprovalToSharetribe', () => {
  beforeEach(() => {
    const { show, approve, updateProfile, updatePermissions } = integrationSdkMock.__mocks;
    show.mockResolvedValue(defaultShowResponse);
    approve.mockResolvedValue({});
    updateProfile.mockResolvedValue({});
    updatePermissions.mockResolvedValue({});
  });

  it('approves user, updates profile, and grants postListings permission', async () => {
    const { show, approve, updateProfile, updatePermissions } = integrationSdkMock.__mocks;

    const result = await applyCoachApprovalToSharetribe({
      id: 'app-1',
      email: 'alex@example.com',
      applicantUserId: 'user-uuid-1',
      fullName: 'Alex Coach',
    });

    expect(approve).toHaveBeenCalled();
    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        publicData: expect.objectContaining({
          coachApproved: true,
          pendingCoachApplication: false,
          userType: 'coach',
        }),
      })
    );
    expect(updatePermissions).toHaveBeenCalledWith(
      expect.objectContaining({
        postListings: 'permission/allow',
      })
    );
    expect(result).toEqual({
      userId: 'user-uuid-1',
      email: 'alex@example.com',
      canPostListingsUpdated: true,
    });
  });

  it('throws when Sharetribe permission update fails', async () => {
    const { updatePermissions } = integrationSdkMock.__mocks;
    updatePermissions.mockRejectedValueOnce({
      status: 403,
      message: 'Forbidden',
      data: { errors: [{ title: 'Permission update denied' }] },
    });

    await expect(
      applyCoachApprovalToSharetribe({
        id: 'app-2',
        email: 'alex@example.com',
        applicantUserId: 'user-uuid-1',
      })
    ).rejects.toMatchObject({
      message: 'Permission update denied',
      status: 403,
    });
  });
});
