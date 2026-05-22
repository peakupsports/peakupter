import {
  appendPeakupMeetingPointToOrderValues,
  buildPeakUpCoachMapMeetingPointSearch,
  googleMapsDirectionsUrlForMeetingPoint,
  coachPreferredMeetingPointsList,
  peakupMeetingPointForProtectedData,
  peakupMeetingPointFromFormValues,
  peakupMeetingPointInitialValues,
} from './peakupMeetingPoint';

describe('peakupMeetingPoint', () => {
  const points = [
    {
      id: 'mp-1',
      label: 'Cable car',
      address: 'Laax, Switzerland',
      notes: 'Meet at lift',
      lat: 46.8,
      lng: 9.26,
    },
    {
      id: 'mp-2',
      label: 'Parking',
      address: 'Flims parking',
      notes: '',
    },
  ];

  it('coachPreferredMeetingPointsList reads author publicData including address-only points', () => {
    const list = coachPreferredMeetingPointsList({
      attributes: { profile: { publicData: { preferredMeetingPoints: points } } },
    });
    expect(list).toHaveLength(2);
    expect(list[0].label).toBe('Cable car');
    expect(list[1].label).toBe('Parking');
    expect(list[1].address).toBe('Flims parking');
  });

  it('peakupMeetingPointInitialValues preselects when only one point', () => {
    expect(peakupMeetingPointInitialValues([points[0]])).toEqual({ peakupMeetingPointId: 'mp-1' });
    expect(peakupMeetingPointInitialValues(points)).toEqual({});
  });

  it('peakupMeetingPointFromFormValues resolves by id or single default', () => {
    const pointsWithCoords = [
      points[0],
      { ...points[1], lat: 47.1, lng: 8.5 },
    ];
    expect(
      peakupMeetingPointFromFormValues({ peakupMeetingPointId: 'mp-2' }, pointsWithCoords)?.label
    ).toBe('Parking');
    expect(peakupMeetingPointFromFormValues({}, [points[0]])?.id).toBe('mp-1');
    expect(peakupMeetingPointFromFormValues({}, points)).toBeNull();
  });

  it('appendPeakupMeetingPointToOrderValues skips when peakupMeetingPoint already set', () => {
    const existing = {
      peakupMeetingPoint: { id: 'mp-1', label: 'A', address: 'Addr', notes: '' },
      peakupMeetingPointId: 'mp-1',
    };
    const out = appendPeakupMeetingPointToOrderValues(existing, points);
    expect(out.peakupMeetingPoint).toEqual(existing.peakupMeetingPoint);
    expect(out.peakupMeetingPointId).toBeUndefined();
  });

  it('appendPeakupMeetingPointToOrderValues adds peakupMeetingPoint', () => {
    const out = appendPeakupMeetingPointToOrderValues(
      { peakupMeetingPointId: 'mp-1', bookingStartTime: '1' },
      points
    );
    expect(out.peakupMeetingPoint).toMatchObject({
      id: 'mp-1',
      label: 'Cable car',
      address: 'Laax, Switzerland',
      lat: 46.8,
    });
    expect(out.peakupMeetingPointId).toBeUndefined();
  });

  it('googleMapsDirectionsUrlForMeetingPoint prefers coordinates', () => {
    expect(
      googleMapsDirectionsUrlForMeetingPoint({
        id: 'mp-1',
        label: 'Lift',
        address: 'Laax',
        lat: 46.8,
        lng: 9.26,
      })
    ).toBe('https://www.google.com/maps/dir/?api=1&destination=46.8,9.26');
    expect(
      googleMapsDirectionsUrlForMeetingPoint({
        id: 'mp-2',
        label: 'Parking',
        address: 'Flims parking',
      })
    ).toBe('https://www.google.com/maps/dir/?api=1&destination=Flims%20parking');
  });

  it('buildPeakUpCoachMapMeetingPointSearch builds coach-map deep link', () => {
    expect(
      buildPeakUpCoachMapMeetingPointSearch({
        coachId: 'coach-uuid',
        meetingPointId: 'mp-1',
      })
    ).toBe('?coachId=coach-uuid&meetingPointId=mp-1');
    expect(buildPeakUpCoachMapMeetingPointSearch({ coachId: 'coach-uuid' })).toBe('?coachId=coach-uuid');
    expect(buildPeakUpCoachMapMeetingPointSearch({ meetingPointId: 'mp-1' })).toBeNull();
  });

  it('peakupMeetingPointForProtectedData passes zoom when stored', () => {
    const stored = peakupMeetingPointForProtectedData({
      id: 'mp-1',
      label: 'Lift',
      address: 'Laax',
      notes: '',
      lat: 46.8,
      lng: 9.26,
      zoom: 17,
    });
    expect(stored.zoom).toBe(17);
  });

  it('peakupMeetingPointForProtectedData omits invalid coords', () => {
    const stored = peakupMeetingPointForProtectedData(points[1]);
    expect(stored.lat).toBeUndefined();
    expect(stored.notes).toBe('');
  });
});
