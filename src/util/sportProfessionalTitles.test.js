import { getSportDirectoryHeroTitleId } from './sportProfessionalTitles';

describe('sportProfessionalTitles', () => {
  it('returns sport-specific hero title ids', () => {
    expect(getSportDirectoryHeroTitleId('ski')).toBe('CoachDirectory.heroTitle.ski');
    expect(getSportDirectoryHeroTitleId('snowboard')).toBe('CoachDirectory.heroTitle.snowboard');
    expect(getSportDirectoryHeroTitleId('surf')).toBe('CoachDirectory.heroTitle.surf');
  });

  it('maps ski variants to ski instructors copy', () => {
    expect(getSportDirectoryHeroTitleId('freerideskiing')).toBe('CoachDirectory.heroTitle.ski');
  });

  it('falls back to generic title for unknown sports', () => {
    expect(getSportDirectoryHeroTitleId('unknown-sport')).toBe('CoachDirectory.heroTitleGeneric');
  });
});
