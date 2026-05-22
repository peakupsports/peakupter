import { applicationToExportValues, splitInstagramWebsite } from './coachApplicationExport';

const sampleApplication = {
  fullName: 'Alex Coach',
  email: 'alex@example.com',
  phone: '+41 79 000 00 00',
  country: 'CH',
  cityArea: 'Zurich',
  languagesSpoken: 'EN, DE',
  mainSport: 'Snowboard',
  otherSports: 'Surf',
  yearsExperience: '8',
  certificationLevel: 'national',
  federationSchool: 'SSSA',
  instagramWebsite: 'https://instagram.com/alex',
  ambassadorReferralCode: '',
  interestedInAmbassador: false,
  applyingIndependently: true,
  status: 'pending',
  submittedAt: '2026-05-20T10:00:00.000Z',
  updatedAt: '2026-05-20T10:00:00.000Z',
};

describe('coachApplicationExport', () => {
  it('splits instagram and website values', () => {
    expect(splitInstagramWebsite('@coachpeak')).toEqual({
      instagram: '@coachpeak',
      website: '',
    });
    expect(splitInstagramWebsite('https://example.com https://instagram.com/coach')).toEqual({
      instagram: 'https://instagram.com/coach',
      website: 'https://example.com',
    });
  });

  it('maps application fields for export rows', () => {
    const row = applicationToExportValues(sampleApplication);
    expect(row[0]).toBe('Alex Coach');
    expect(row[9]).toBe('National certification');
    expect(row[14]).toBe('No');
    expect(row[16]).toBe('Pending');
  });

  it('maps dates as Date objects when requested', () => {
    const row = applicationToExportValues(sampleApplication, { datesAsDateObjects: true });
    expect(row[17]).toBeInstanceOf(Date);
    expect(row[18]).toBeInstanceOf(Date);
  });
});
