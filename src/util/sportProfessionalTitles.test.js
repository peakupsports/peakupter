import {
  getSportDirectoryAriaLabelId,
  getSportDirectoryHeroSubtitleId,
  getSportDirectoryHeroTitleId,
  getSportDirectorySchemaDescriptionId,
  getSportDirectorySchemaTitleId,
  resolveSportDirectorySport,
} from './sportProfessionalTitles';

describe('sportProfessionalTitles', () => {
  it('returns sport-specific hero title ids', () => {
    expect(getSportDirectoryHeroTitleId('ski')).toBe('CoachDirectory.heroTitle.ski');
    expect(getSportDirectoryHeroTitleId('snowboard')).toBe('CoachDirectory.heroTitle.snowboard');
    expect(getSportDirectoryHeroTitleId('surf')).toBe('CoachDirectory.heroTitle.surf');
  });

  it('maps ski variants to ski instructors copy', () => {
    expect(getSportDirectoryHeroTitleId('freerideskiing')).toBe('CoachDirectory.heroTitle.ski');
    expect(resolveSportDirectorySport('freerideskiing')).toBe('ski');
  });

  it('falls back to generic title for unknown sports', () => {
    expect(getSportDirectoryHeroTitleId('unknown-sport')).toBe('CoachDirectory.heroTitleGeneric');
    expect(getSportDirectoryHeroSubtitleId('unknown-sport')).toBe('CoachesPage.subtitle');
    expect(getSportDirectorySchemaTitleId('unknown-sport')).toBe('CoachesPage.schemaTitle');
    expect(getSportDirectorySchemaDescriptionId('unknown-sport')).toBe(
      'CoachesPage.schemaDescription'
    );
    expect(getSportDirectoryAriaLabelId('unknown-sport')).toBe(
      'CoachDirectory.heroBannerAriaLabelGeneric'
    );
  });

  it('returns sport-specific seo and subtitle ids', () => {
    expect(getSportDirectoryHeroSubtitleId('golf')).toBe('CoachDirectory.heroSubtitle.golf');
    expect(getSportDirectorySchemaTitleId('golf')).toBe('CoachDirectory.schemaTitle.golf');
    expect(getSportDirectorySchemaDescriptionId('golf')).toBe(
      'CoachDirectory.schemaDescription.golf'
    );
    expect(getSportDirectoryAriaLabelId('golf')).toBe('CoachDirectory.heroBannerAriaLabel.golf');
  });

  it('returns sport-specific ids for kitesurf and swimming', () => {
    expect(getSportDirectoryHeroSubtitleId('kitesurf')).toBe(
      'CoachDirectory.heroSubtitle.kitesurf'
    );
    expect(getSportDirectorySchemaTitleId('kitesurf')).toBe('CoachDirectory.schemaTitle.kitesurf');
    expect(resolveSportDirectorySport('swimming')).toBe('swimming');
    expect(getSportDirectoryHeroTitleId('swimming')).toBe('CoachDirectory.heroTitle.swimming');
  });
});
