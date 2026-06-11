/**
 * Short UI labels for cards, buttons, and panels — layout quality over literal copy.
 * Run: node scripts/apply-ui-compact-copy.js
 */
const fs = require('fs');
const path = require('path');

const translationsDir = path.join(__dirname, '../src/translations');

const patches = {
  en: {
    'AuthenticationPage.signupPathTitle': 'Join PeakUp',
    'AuthenticationPage.signupPathSubtitle': 'Choose your path.',
    'AuthenticationPage.signupPathClient': 'Customer',
    'AuthenticationPage.signupPathClientHint': 'Book lessons and experiences near you.',
    'AuthenticationPage.signupPathCoachHint': 'Grow independently. Reach new clients worldwide.',
    'AuthenticationPage.signupPathTeam': 'Team',
    'AuthenticationPage.signupPathTeamHint': 'Build your team on PeakUp.',
    'AuthenticationPage.signupChoiceTitle': 'Join PeakUp',
    'AuthenticationPage.signupChoiceSubtitle': 'Choose your path.',
    'AuthenticationPage.signupChoiceClient': 'Customer',
    'AuthenticationPage.signupChoiceClientHint': 'Find professionals and book in minutes.',
    'AuthenticationPage.signupChoiceCoachHint': 'Grow independently. Reach new clients worldwide.',
    'LandingWhyPeakupSection.cardAthleteText': 'Sport, location, and time — in a few clicks.',
    'LandingWhyPeakupSection.cardCoachText': 'More visibility. More bookings. Full independence.',
    'LandingHowItWorksSection.cardFindBookText': 'Browse professionals and book in minutes.',
    'LandingHowItWorksSection.cardEnjoyText': 'Learn with great instructors. Enjoy your session.',
    'LandingHowItWorksSection.cardReviewText': 'Share your experience with the community.',
    'CoachDashboardPage.cardPublicProfileHint': 'Preview your public profile.',
    'CoachDashboardPage.cardProfileTitle': 'Edit profile',
    'CoachDashboardPage.cardInboxTitle': 'Inbox',
    'CoachDashboardPage.cardBookingsHint': 'Upcoming, pending, and past sessions.',
    'CoachDashboardPage.cardCalendarHint': 'Set availability and sync your calendar.',
    'CoachDashboardPage.cardAmbassadorHint': 'Referrals, rewards, and network growth.',
    'CoachDashboardPage.cardProfileHint': 'Update bio, sports, photos, and details.',
    'CoachDashboardPage.cardListingsHint': 'Create, edit, and publish your services.',
    'HowItWorksPage.ctaAthleteText': 'Find professionals and book your session today.',
  },
  it: {
    'AuthenticationPage.signupPathTitle': 'Unisciti a PeakUp',
    'AuthenticationPage.signupPathSubtitle': 'Scegli il tuo percorso.',
    'AuthenticationPage.signupPathClient': 'Cliente',
    'AuthenticationPage.signupPathClientHint': 'Prenota lezioni ed esperienze vicino a te.',
    'AuthenticationPage.signupPathCoachHint': 'Cresci in autonomia. Raggiungi nuovi clienti.',
    'AuthenticationPage.signupPathTeam': 'Team',
    'AuthenticationPage.signupPathTeamHint': 'Crea il tuo team su PeakUp.',
    'AuthenticationPage.signupChoiceTitle': 'Unisciti a PeakUp',
    'AuthenticationPage.signupChoiceSubtitle': 'Scegli il tuo percorso.',
    'AuthenticationPage.signupChoiceClient': 'Cliente',
    'AuthenticationPage.signupChoiceClientHint': 'Trova professionisti e prenota in pochi minuti.',
    'AuthenticationPage.signupChoiceCoachHint': 'Cresci in autonomia. Raggiungi nuovi clienti.',
    'LandingWhyPeakupSection.cardAthleteText': 'Sport, luogo e orario — in pochi clic.',
    'LandingWhyPeakupSection.cardCoachText': 'Più visibilità. Più prenotazioni. Piena indipendenza.',
    'LandingHowItWorksSection.cardFindBookText': 'Sfoglia professionisti e prenota in pochi minuti.',
    'LandingHowItWorksSection.cardEnjoyText': 'Impara con ottimi istruttori. Goditi la sessione.',
    'LandingHowItWorksSection.cardReviewText': 'Condividi la tua esperienza con la community.',
    'CoachDashboardPage.cardPublicProfileHint': 'Anteprima del profilo pubblico.',
    'CoachDashboardPage.cardProfileTitle': 'Modifica profilo',
    'CoachDashboardPage.cardInboxTitle': 'Posta in arrivo',
  },
  de: {
    'AuthenticationPage.signupPathTitle': 'PeakUp beitreten',
    'AuthenticationPage.signupPathSubtitle': 'Wähle deinen Weg.',
    'AuthenticationPage.signupPathClient': 'Kunde',
    'AuthenticationPage.signupPathClientHint': 'Buche Erlebnisse in deiner Nähe.',
    'AuthenticationPage.signupPathCoachHint': 'Unabhängig wachsen. Neue Kunden erreichen.',
    'AuthenticationPage.signupPathTeam': 'Team',
    'AuthenticationPage.signupPathTeamHint': 'Baue dein Team auf PeakUp.',
    'AuthenticationPage.signupChoiceClient': 'Kunde',
    'AuthenticationPage.signupChoiceCoachHint': 'Unabhängig wachsen. Neue Kunden erreichen.',
    'LandingWhyPeakupSection.cardCoachText': 'Mehr Sichtbarkeit. Mehr Buchungen. Unabhängig bleiben.',
    'LandingHowItWorksSection.cardFindBookText': 'Profis finden und in Minuten buchen.',
    'LandingHowItWorksSection.cardEnjoyText': 'Mit guten Instruktoren lernen. Session genießen.',
    'LandingHowItWorksSection.cardReviewText': 'Teile deine Erfahrung mit der Community.',
    'CoachDashboardPage.cardProfileTitle': 'Profil bearbeiten',
    'CoachDashboardPage.cardInboxTitle': 'Posteingang',
  },
  fr: {
    'AuthenticationPage.signupPathTitle': 'Rejoindre PeakUp',
    'AuthenticationPage.signupPathSubtitle': 'Choisissez votre parcours.',
    'AuthenticationPage.signupPathClient': 'Client',
    'AuthenticationPage.signupPathClientHint': 'Réservez des expériences près de chez vous.',
    'AuthenticationPage.signupPathCoachHint': 'Grandissez en indépendance. Touchez de nouveaux clients.',
    'AuthenticationPage.signupPathTeam': 'Équipe',
    'AuthenticationPage.signupPathTeamHint': 'Créez votre équipe sur PeakUp.',
    'AuthenticationPage.signupChoiceClient': 'Client',
    'AuthenticationPage.signupChoiceCoachHint': 'Grandissez en indépendance. Touchez de nouveaux clients.',
    'LandingWhyPeakupSection.cardCoachText': 'Plus de visibilité. Plus de réservations. Pleine indépendance.',
    'LandingHowItWorksSection.cardFindBookText': 'Parcourez les professionnels et réservez en minutes.',
    'LandingHowItWorksSection.cardEnjoyText': 'Apprenez avec de bons instructeurs. Profitez de la séance.',
    'LandingHowItWorksSection.cardReviewText': 'Partagez votre expérience avec la communauté.',
    'CoachDashboardPage.cardProfileTitle': 'Modifier le profil',
    'CoachDashboardPage.cardInboxTitle': 'Boîte de réception',
  },
  es: {
    'AuthenticationPage.signupPathTitle': 'Únete a PeakUp',
    'AuthenticationPage.signupPathSubtitle': 'Elige tu camino.',
    'AuthenticationPage.signupPathClient': 'Cliente',
    'AuthenticationPage.signupPathClientHint': 'Reserva experiencias cerca de ti.',
    'AuthenticationPage.signupPathCoachHint': 'Crece con independencia. Llega a nuevos clientes.',
    'AuthenticationPage.signupPathTeam': 'Equipo',
    'AuthenticationPage.signupPathTeamHint': 'Crea tu equipo en PeakUp.',
    'AuthenticationPage.signupChoiceClient': 'Cliente',
    'AuthenticationPage.signupChoiceCoachHint': 'Crece con independencia. Llega a nuevos clientes.',
    'LandingWhyPeakupSection.cardCoachText': 'Más visibilidad. Más reservas. Plena independencia.',
    'LandingHowItWorksSection.cardFindBookText': 'Explora profesionales y reserva en minutos.',
    'LandingHowItWorksSection.cardEnjoyText': 'Aprende con buenos instructores. Disfruta la sesión.',
    'LandingHowItWorksSection.cardReviewText': 'Comparte tu experiencia con la comunidad.',
    'CoachDashboardPage.cardProfileTitle': 'Editar perfil',
    'CoachDashboardPage.cardInboxTitle': 'Bandeja de entrada',
  },
  pt: {
    'AuthenticationPage.signupPathTitle': 'Junta-te à PeakUp',
    'AuthenticationPage.signupPathSubtitle': 'Escolhe o teu caminho.',
    'AuthenticationPage.signupPathClient': 'Cliente',
    'AuthenticationPage.signupPathClientHint': 'Reserva experiências perto de ti.',
    'AuthenticationPage.signupPathCoachHint': 'Cresce com independência. Alcança novos clientes.',
    'AuthenticationPage.signupPathTeam': 'Equipa',
    'AuthenticationPage.signupPathTeamHint': 'Cria a tua equipa na PeakUp.',
    'AuthenticationPage.signupChoiceClient': 'Cliente',
    'AuthenticationPage.signupChoiceCoachHint': 'Cresce com independência. Alcança novos clientes.',
    'LandingWhyPeakupSection.cardCoachText': 'Mais visibilidade. Mais reservas. Plena independência.',
    'LandingHowItWorksSection.cardFindBookText': 'Explora profissionais e reserva em minutos.',
    'LandingHowItWorksSection.cardEnjoyText': 'Aprende com bons instrutores. Aproveita a sessão.',
    'LandingHowItWorksSection.cardReviewText': 'Partilha a tua experiência com a comunidade.',
    'CoachDashboardPage.cardProfileTitle': 'Editar perfil',
    'CoachDashboardPage.cardInboxTitle': 'Caixa de entrada',
  },
};

['en', 'it', 'de', 'fr', 'es', 'pt'].forEach(locale => {
  const filePath = path.join(translationsDir, `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  Object.entries(patches[locale] || {}).forEach(([key, value]) => {
    data[key] = value;
  });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Updated ${locale}.json`);
});
