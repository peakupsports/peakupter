/**
 * UI vs brand terminology hierarchy for PeakUp.
 * Long-form positioning stays in hero, about, trust, SEO.
 * Short labels for buttons, cards, registration, navigation.
 *
 * Run: node scripts/apply-terminology-hierarchy.js
 */
const fs = require('fs');
const path = require('path');

const translationsDir = path.join(__dirname, '../src/translations');

const uiPatches = {
  en: {
    'AboutPage.heroCtaPrimary': 'Find professionals',
    'AuthenticationPage.signupChoiceCoach': 'Professional',
    'AuthenticationPage.signupChoiceCoachHint':
      'Grow independently and connect with new clients worldwide.',
    'AuthenticationPage.signupChoiceClientHint':
      'Sign up to find professionals and book sessions in minutes.',
    'AuthenticationPage.signupPathCoach': 'Professional',
    'AuthenticationPage.signupPathCoachHint':
      'Grow independently and connect with new clients worldwide.',
    'AuthenticationPage.signupPathTeamHint': 'Create a team and grow your organization.',
    'HowItWorksPage.clientsBlock1Title': 'Find professionals',
    'HowItWorksPage.coachesSectionTitle': 'For professionals',
    'HowItWorksPage.ctaAthleteButton': 'Find professionals',
    'HowItWorksPage.ctaCoachText': 'Grow your business with PeakUp.',
    'HowItWorksPage.ctaAthleteText': 'Find the right professional and book your session today.',
    'InstructorsPage.stepsSectionDescription':
      'We are currently onboarding a limited number of early professionals',
    'CoachDashboardBookingsPage.lead':
      'Upcoming sessions, open requests, reviews, and history for your business.',
    'CoachDashboardPage.heroLead': 'Your business, all in one place.',
    'CoachEarningsPage.controlTitle': 'You run your business',
    'CoachEarningsPage.finalTitle': 'Ready to grow your business?',
    'CoachesPage.title': 'Professionals',
    'CoachesPage.regionLabel': 'PeakUp professionals',
    'CoachDirectory.heroTitleGeneric': 'Find professionals',
    'CoachDirectory.heroBannerAriaLabelGeneric': 'PeakUp professionals',
    'LandingHeroSection.primaryCta': 'Find professionals',
    'LandingHeroSection.featureVerified': 'Verified professionals',
    'LandingWhyPeakupSection.cardAthleteCta': 'Find professionals',
    'LandingWhyPeakupSection.cardAthleteTitle': 'Find professionals',
    'LandingWhyPeakupSection.cardCoachCta': 'Grow your business',
    'LandingWhyPeakupSection.cardCoachTitle': 'Grow your business',
    'LandingWhyPeakupSection.cardCoachText':
      'Build your visibility, grow your bookings, and stay fully independent.',
    'LandingWhyPeakupSection.subtitle':
      'One platform. Two journeys. Built for customers and professionals.',
    'LandingWhyPeakupSection.trustVerified': 'Verified professionals',
    'PageBuilder.SearchCTA.buttonLabel': 'Find professionals',
    'SectionFooter.trustGlobalCommunityText': 'Professionals and customers from 30+ countries.',
    'SectionFooter.trustVerifiedCoachesTitle': 'Verified professionals',
    'SectionPeakupFeaturedCoaches.subtitle': 'Top rated professionals by our community',
  },
  it: {
    'AboutPage.heroCtaPrimary': 'Trova professionisti',
    'AuthenticationPage.signupChoiceCoach': 'Professionista',
    'AuthenticationPage.signupChoiceCoachHint':
      'Cresci in modo indipendente e connettiti con nuovi clienti in tutto il mondo.',
    'AuthenticationPage.signupPathCoach': 'Professionista',
    'AuthenticationPage.signupPathCoachHint':
      'Cresci in modo indipendente e connettiti con nuovi clienti in tutto il mondo.',
    'AuthenticationPage.signupPathTeamHint': 'Crea un team e fai crescere la tua organizzazione.',
    'HowItWorksPage.clientsBlock1Title': 'Trova professionisti',
    'HowItWorksPage.coachesSectionTitle': 'Per professionisti',
    'HowItWorksPage.ctaAthleteButton': 'Trova professionisti',
    'HowItWorksPage.ctaCoachText': 'Fai crescere il tuo business con PeakUp.',
    'CoachDashboardPage.heroLead': 'Il tuo business, tutto in un unico posto.',
    'CoachEarningsPage.controlTitle': 'Gestisci il tuo business',
    'CoachEarningsPage.finalTitle': 'Pronto a far crescere il tuo business?',
    'CoachesPage.title': 'Professionisti',
    'CoachDirectory.heroTitleGeneric': 'Trova professionisti',
    'LandingHeroSection.primaryCta': 'Trova professionisti',
    'LandingWhyPeakupSection.cardAthleteCta': 'Trova professionisti',
    'LandingWhyPeakupSection.cardAthleteTitle': 'Trova professionisti',
    'LandingWhyPeakupSection.cardCoachCta': 'Fai crescere il tuo business',
    'LandingWhyPeakupSection.cardCoachTitle': 'Fai crescere il tuo business',
    'LandingWhyPeakupSection.cardCoachText':
      'Aumenta visibilità, prenotazioni e indipendenza.',
    'LandingWhyPeakupSection.subtitle':
      'Una piattaforma. Due percorsi. Pensata per clienti e professionisti.',
    'PageBuilder.SearchCTA.buttonLabel': 'Trova professionisti',
  },
  de: {
    'AuthenticationPage.signupChoiceCoach': 'Profi',
    'AuthenticationPage.signupPathCoach': 'Profi',
    'AuthenticationPage.signupChoiceCoachHint':
      'Wachse unabhängig und verbinde dich mit neuen Kundinnen und Kunden weltweit.',
    'AuthenticationPage.signupPathCoachHint':
      'Wachse unabhängig und verbinde dich mit neuen Kundinnen und Kunden weltweit.',
    'AuthenticationPage.signupPathTeamHint': 'Erstelle ein Team und entwickle deine Organisation.',
    'HowItWorksPage.clientsBlock1Title': 'Profis finden',
    'HowItWorksPage.coachesSectionTitle': 'Für Profis',
    'HowItWorksPage.ctaAthleteButton': 'Profis finden',
    'HowItWorksPage.ctaCoachText': 'Wachse mit PeakUp.',
    'CoachesPage.title': 'Profis',
    'CoachDirectory.heroTitleGeneric': 'Profis finden',
    'LandingWhyPeakupSection.cardAthleteCta': 'Profis finden',
    'LandingWhyPeakupSection.cardAthleteTitle': 'Profis finden',
    'LandingWhyPeakupSection.cardCoachTitle': 'Business ausbauen',
    'LandingWhyPeakupSection.cardCoachCta': 'Business ausbauen',
    'LandingWhyPeakupSection.subtitle':
      'Eine Plattform. Zwei Wege. Für Kundinnen, Kunden und Profis.',
    'CoachDashboardPage.heroLead': 'Dein Business an einem Ort.',
    'CoachEarningsPage.finalTitle': 'Bereit, dein Business auszubauen?',
    'PageBuilder.SearchCTA.buttonLabel': 'Profis finden',
  },
  fr: {
    'AuthenticationPage.signupChoiceCoach': 'Professionnel',
    'AuthenticationPage.signupPathCoach': 'Professionnel',
    'AuthenticationPage.signupChoiceCoachHint':
      'Développez-vous en toute indépendance et connectez-vous avec de nouveaux clients dans le monde entier.',
    'AuthenticationPage.signupPathCoachHint':
      'Développez-vous en toute indépendance et connectez-vous avec de nouveaux clients dans le monde entier.',
    'AuthenticationPage.signupPathTeamHint': 'Créez une équipe et développez votre organisation.',
    'HowItWorksPage.clientsBlock1Title': 'Trouver des professionnels',
    'HowItWorksPage.coachesSectionTitle': 'Pour les professionnels',
    'HowItWorksPage.ctaAthleteButton': 'Trouver des professionnels',
    'HowItWorksPage.ctaCoachText': 'Développez votre activité avec PeakUp.',
    'CoachesPage.title': 'Professionnels',
    'CoachDirectory.heroTitleGeneric': 'Trouver des professionnels',
    'LandingWhyPeakupSection.cardAthleteCta': 'Trouver des professionnels',
    'LandingWhyPeakupSection.cardAthleteTitle': 'Trouver des professionnels',
    'LandingWhyPeakupSection.cardCoachTitle': 'Développez votre activité',
    'LandingWhyPeakupSection.cardCoachCta': 'Développez votre activité',
    'LandingWhyPeakupSection.subtitle':
      'Une plateforme. Deux parcours. Pour clients et professionnels.',
    'CoachDashboardPage.heroLead': 'Votre activité, au même endroit.',
    'CoachEarningsPage.finalTitle': 'Prêt à développer votre activité ?',
    'PageBuilder.SearchCTA.buttonLabel': 'Trouver des professionnels',
  },
  es: {
    'AuthenticationPage.signupChoiceCoach': 'Profesional',
    'AuthenticationPage.signupPathCoach': 'Profesional',
    'AuthenticationPage.signupChoiceCoachHint':
      'Crece de forma independiente y conecta con nuevos clientes en todo el mundo.',
    'AuthenticationPage.signupPathCoachHint':
      'Crece de forma independiente y conecta con nuevos clientes en todo el mundo.',
    'AuthenticationPage.signupPathTeamHint': 'Crea un equipo y haz crecer tu organización.',
    'HowItWorksPage.clientsBlock1Title': 'Encuentra profesionales',
    'HowItWorksPage.coachesSectionTitle': 'Para profesionales',
    'HowItWorksPage.ctaAthleteButton': 'Encuentra profesionales',
    'HowItWorksPage.ctaCoachText': 'Haz crecer tu negocio con PeakUp.',
    'CoachesPage.title': 'Profesionales',
    'CoachDirectory.heroTitleGeneric': 'Encuentra profesionales',
    'LandingWhyPeakupSection.cardAthleteCta': 'Encuentra profesionales',
    'LandingWhyPeakupSection.cardAthleteTitle': 'Encuentra profesionales',
    'LandingWhyPeakupSection.cardCoachTitle': 'Haz crecer tu negocio',
    'LandingWhyPeakupSection.cardCoachCta': 'Haz crecer tu negocio',
    'LandingWhyPeakupSection.subtitle':
      'Una plataforma. Dos caminos. Para clientes y profesionales.',
    'CoachDashboardPage.heroLead': 'Tu negocio, en un solo lugar.',
    'CoachEarningsPage.finalTitle': '¿Listo para hacer crecer tu negocio?',
    'PageBuilder.SearchCTA.buttonLabel': 'Encuentra profesionales',
  },
  pt: {
    'AuthenticationPage.signupChoiceCoach': 'Profissional',
    'AuthenticationPage.signupPathCoach': 'Profissional',
    'AuthenticationPage.signupChoiceCoachHint':
      'Cresce de forma independente e conecta-te com novos clientes em todo o mundo.',
    'AuthenticationPage.signupPathCoachHint':
      'Cresce de forma independente e conecta-te com novos clientes em todo o mundo.',
    'AuthenticationPage.signupPathTeamHint': 'Cria uma equipa e faz crescer a tua organização.',
    'HowItWorksPage.clientsBlock1Title': 'Encontra profissionais',
    'HowItWorksPage.coachesSectionTitle': 'Para profissionais',
    'HowItWorksPage.ctaAthleteButton': 'Encontra profissionais',
    'HowItWorksPage.ctaCoachText': 'Faz crescer o teu negócio com a PeakUp.',
    'CoachesPage.title': 'Profissionais',
    'CoachDirectory.heroTitleGeneric': 'Encontra profissionais',
    'LandingWhyPeakupSection.cardAthleteCta': 'Encontra profissionais',
    'LandingWhyPeakupSection.cardAthleteTitle': 'Encontra profissionais',
    'LandingWhyPeakupSection.cardCoachTitle': 'Faz crescer o teu negócio',
    'LandingWhyPeakupSection.cardCoachCta': 'Faz crescer o teu negócio',
    'LandingWhyPeakupSection.subtitle':
      'Uma plataforma. Dois caminhos. Para clientes e profissionais.',
    'CoachDashboardPage.heroLead': 'O teu negócio, num só lugar.',
    'CoachEarningsPage.finalTitle': 'Pronto para fazer crescer o teu negócio?',
    'PageBuilder.SearchCTA.buttonLabel': 'Encontra profissionais',
  },
};

['en', 'it', 'de', 'fr', 'es', 'pt'].forEach(locale => {
  const filePath = path.join(translationsDir, `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const patch = uiPatches[locale] || {};
  Object.entries(patch).forEach(([key, value]) => {
    data[key] = value;
  });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Updated ${locale}.json (${Object.keys(patch).length} UI keys)`);
});
