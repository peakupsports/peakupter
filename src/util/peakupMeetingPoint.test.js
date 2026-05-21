import {
  appendPeakupMeetingPointToOrderValues,
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

  it('coachPreferredMeetingPointsList reads author publicData', () => {
    const list = coachPreferredMeetingPointsList({
      attributes: { profile: { publicData: { preferredMeetingPoints: points } } },
    });
    expect(list).toHaveLength(2);
    expect(list[0].label).toBe('Cable car');
  });

  it('peakupMeetingPointInitialValues preselects when only one point', () => {
    expect(peakupMeetingPointInitialValues([points[0]])).toEqual({ peakupMeetingPointId: 'mp-1' });
    expect(peakupMeetingPointInitialValues(points)).toEqual({});
  });

  it('peakupMeetingPointFromFormValues resolves by id or single default', () => {
    expect(peakupMeetingPointFromFormValues({ peakupMeetingPointId: 'mp-2' }, points)?.label).toBe(
      'Parking'
    );
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

  it('peakupMeetingPointForProtectedData omits invalid coords', () => {
    const stored = peakupMeetingPointForProtectedData(points[1]);
    expect(stored.lat).toBeUndefined();
    expect(stored.notes).toBe('');
  });
});
