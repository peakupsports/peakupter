import {
  createEmptyPreferredMeetingPointFormRow,
  normalizePreferredMeetingPointsForPublicData,
  preferredMeetingPointsFromPublicData,
  publicDataPatchFromPreferredMeetingPoints,
} from './preferredMeetingPoints';

describe('preferredMeetingPoints', () => {
  it('preferredMeetingPointsFromPublicData maps stored points to form rows', () => {
    const rows = preferredMeetingPointsFromPublicData({
      preferredMeetingPoints: [
        {
          id: 'mp-1',
          label: 'Laax Murschetg cable car',
          address: 'Laax, Grisons, Switzerland',
          notes: 'Meet at the lift',
          lat: 46.81,
          lng: 9.26,
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe('Laax Murschetg cable car');
    expect(rows[0].notes).toBe('Meet at the lift');
    expect(rows[0].location.selectedPlace.origin.lat).toBe(46.81);
  });

  it('normalizePreferredMeetingPointsForPublicData drops incomplete rows', () => {
    const stored = normalizePreferredMeetingPointsForPublicData([
      {
        id: 'mp-1',
        label: 'Tennis club entrance',
        notes: '',
        location: {
          search: 'Club entrance',
          selectedPlace: {
            address: 'Club entrance, Laax',
            origin: { lat: 46.8, lng: 9.25 },
          },
        },
      },
      createEmptyPreferredMeetingPointFormRow(),
      { id: 'x', label: 'No address', notes: '', location: { search: '', selectedPlace: null } },
    ]);
    expect(stored).toHaveLength(1);
    expect(stored[0].label).toBe('Tennis club entrance');
    expect(stored[0].address).toBe('Club entrance, Laax');
    expect(stored[0].lat).toBe(46.8);
  });

  it('publicDataPatchFromPreferredMeetingPoints returns preferredMeetingPoints array', () => {
    const patch = publicDataPatchFromPreferredMeetingPoints([
      {
        id: 'mp-2',
        label: 'Surf school meeting point',
        notes: 'Parking side',
        location: {
          selectedPlace: {
            address: 'Beach road 1',
            origin: { lat: 47.1, lng: 8.5 },
          },
        },
      },
    ]);
    expect(patch.preferredMeetingPoints).toHaveLength(1);
    expect(patch.preferredMeetingPoints[0]).toMatchObject({
      id: 'mp-2',
      label: 'Surf school meeting point',
      address: 'Beach road 1',
      notes: 'Parking side',
      lat: 47.1,
      lng: 8.5,
    });
  });

  it('round-trips through form and publicData', () => {
    const initial = [
      {
        id: 'mp-3',
        label: 'Flims parking area',
        address: 'Flims Waldhaus, Switzerland',
        notes: '',
        lat: 46.83,
        lng: 9.28,
      },
    ];
    const formRows = preferredMeetingPointsFromPublicData({ preferredMeetingPoints: initial });
    const patch = publicDataPatchFromPreferredMeetingPoints(formRows);
    expect(patch.preferredMeetingPoints[0].label).toBe('Flims parking area');
    expect(patch.preferredMeetingPoints[0].address).toBe('Flims Waldhaus, Switzerland');
  });
});
