/**
 * One-off terminology cleanup for PeakUp marketing copy.
 * Run: node scripts/apply-terminology-cleanup.js
 */
const fs = require('fs');
const path = require('path');

const translationsDir = path.join(__dirname, '../src/translations');

const patches = {
  en: {
    'AboutPage.communityBody':
      'From trail sessions to après-ski meetups, PeakUp is where certified sports professionals and customers find each other — in the places they already love to move.',
    'AboutPage.heroCtaPrimary': 'Find certified sports professionals',
    'AboutPage.heroLead':
      'PeakUp connects customers and travelers with trusted certified instructors, guides, and coaches for authentic sports experiences worldwide.',
    'AboutPage.missionBody':
      'We connect people with certified sports professionals through a trusted, cinematic experience — from discovery to booking to the moment you show up ready to enjoy your session.',
    'AboutPage.schemaDescription':
      'Discover PeakUp — the marketplace for certified sports professionals.',
    'AboutPage.valueAccessDesc':
      'Book certified instructors, guides, and coaches across destinations — mountain, ocean, court, and city.',
    'AboutPage.valueTrustDesc':
      'Every profile is reviewed so customers book with confidence.',
    'AboutPage.wellnessBody':
      'Yoga at sunrise, recovery by the water, coaching woven into travel — PeakUp helps people book experiences that feel as intentional as the training itself.',
    'AboutPage.whyLead':
      'Generic marketplaces weren’t built for sport. PeakUp was — for certified sports professionals who teach at the edge and customers who chase new experiences.',
    'AboutPage.whyPoint2': 'Profiles that feel like premium sports professional cards',
    'HowItWorksPage.clientsBlock1Title': 'Find certified sports professionals',
    'HowItWorksPage.clientsSectionDescription':
      'Discover, book, and train with the best certified instructors, guides, and coaches around you.',
    'HowItWorksPage.coachesSectionTitle': 'For certified sports professionals',
    'HowItWorksPage.ctaAthleteButton': 'Find certified sports professionals',
    'HowItWorksPage.ctaAthleteText':
      'Find the right certified professional and book your session today.',
    'HowItWorksPage.ctaCoachText':
      'Join our community of certified sports professionals and grow your business.',
    'HowItWorksPage.heroDescription':
      'The marketplace for certified sports professionals. Book in minutes. Train anywhere.',
    'HowItWorksPage.schemaDescription':
      'Discover how PeakUp works for customers and certified sports professionals — find, book, and grow.',
    'InstructorsPage.schemaDescription':
      'Grow with PeakUp — get more bookings, stay independent, and join the marketplace for certified sports professionals.',
    'InstructorsPage.stepsSectionDescription':
      'We are currently onboarding a limited number of early certified sports professionals',
    'AuthenticationPage.signupPathClientHint':
      'Find certified instructors, guides, and coaches near you.',
    'AuthenticationPage.signupPathCoach': 'Join as a certified sports professional',
    'AuthenticationPage.signupPathCoachHint':
      'Grow independently on PeakUp and connect with customers worldwide.',
    'AuthenticationPage.signupPathSubtitle':
      'Pick your path — book experiences, grow as a pro, or build your team.',
    'AuthenticationPage.signupPathTeamHint':
      'Create a team and showcase your certified sports professionals.',
    'AuthenticationPage.signupChoiceCoach': 'Join as a certified sports professional',
    'AuthenticationPage.signupChoiceCoachHint':
      'Create your account, verify your email, then complete the PeakUp professional application — reviewed within 48h.',
    'AuthenticationPage.signupChoiceClientHint':
      'Sign up below to find certified sports professionals and book sessions in minutes.',
    'CancellationPolicyPage.heroSubheadline':
      'PeakUp cancellation policies are designed to protect both customers and certified sports professionals while keeping outdoor sports flexible, safe and professional.',
    'CancellationPolicyPage.philosophyText':
      'PeakUp believes great sport experiences require trust, flexibility and mutual respect between customers and certified sports professionals. Our cancellation policy is designed to protect customers, support professional providers and keep outdoor sports safe and fair.',
    'CancellationPolicyPage.summaryCustomerText':
      'Clear refund windows help protect both customers and certified sports professionals.',
    'CoachApplicationPage.stepCoachingHint':
      'Share your experience, certifications, and how you work with clients.',
    'CoachCalendarPage.bookingCustomerFallback': 'Customer',
    'CoachDashboardPage.cardInboxHint': 'Review booking requests and messages from customers.',
    'CoachDashboardPage.cardPublicProfileHint':
      'See how customers view your PeakUp professional profile.',
    'CoachDashboardPage.teamInvitationsLead':
      'Organizations can invite you to appear on their team page. Accept only if you want to be listed — you keep your own PeakUp profile and payouts.',
    'CoachEarningsPage.earningsAthleteLabel': 'Customer pays',
    'CoachEarningsPage.providesItem5': 'Customer discovery',
    'CustomerDashboardPage.heroNameFallback': 'Customer',
    'LandingHeroSection.featureVerified': 'Verified professionals',
    'LandingHeroSection.headlineLineOne': 'The marketplace for',
    'LandingHeroSection.headlineLineTwoRest': 'certified sports professionals',
    'LandingHeroSection.primaryCta': 'Find professionals',
    'LandingHeroSection.subtitle':
      'Discover verified instructors, guides, and coaches for every sport and destination, wherever your next trip takes you.',
    'LandingHowItWorksSection.cardFindBookText':
      'Browse certified professionals, check availability, and book your session in minutes.',
    'LandingHowItWorksSection.cardEnjoyText':
      'Learn with experienced instructors, guides, and coaches and enjoy your session.',
    'LandingHowItWorksSection.cardReviewText':
      'Help others find the right professional. Share your experience with the community.',
    'LandingHowItWorksSection.subtitle':
      'Find a professional. Book your session. Enjoy your sport.',
    'LandingWhyPeakupSection.cardAthleteCta': 'Find certified sports professionals',
    'LandingWhyPeakupSection.cardAthleteTitle': 'Find certified sports professionals',
    'LandingWhyPeakupSection.cardCoachCta': 'Grow your business',
    'LandingWhyPeakupSection.cardCoachText':
      'Grow your visibility, bookings, and independence as a certified sports professional.',
    'LandingWhyPeakupSection.cardCoachTitle': 'Grow as a certified sports professional',
    'LandingWhyPeakupSection.subtitle':
      'One platform. Two journeys. Built for customers and certified sports professionals.',
    'LandingWhyPeakupSection.trustVerified': 'Verified professionals',
    'LandingPage.schemaDescription':
      'The marketplace for certified sports professionals — book instructors, guides, and coaches worldwide.',
    'CoachDirectory.heroTitleWithSport': 'Find certified {sport} professionals',
    'CoachDirectory.heroTitleGeneric': 'Find certified sports professionals',
    'CoachDirectory.heroTitle.ski': 'Find certified ski instructors',
    'CoachDirectory.heroTitle.snowboard': 'Find certified snowboard instructors',
    'CoachDirectory.heroTitle.mtb': 'Find certified MTB guides',
    'CoachDirectory.heroTitle.hiking': 'Find certified hiking guides',
    'CoachDirectory.heroTitle.climbing': 'Find certified climbing instructors',
    'CoachDirectory.heroTitle.surf': 'Find certified surf instructors',
    'CoachDirectory.heroTitle.kitesurf': 'Find certified kitesurf instructors',
    'CoachDirectory.heroTitle.wakeboard': 'Find certified wakeboard instructors',
    'CoachDirectory.heroTitle.wakesurf': 'Find certified wakesurf instructors',
    'CoachDirectory.heroTitle.yoga': 'Find certified yoga instructors',
    'CoachDirectory.heroTitle.tennis': 'Find tennis instructors and coaches',
    'CoachDirectory.heroTitle.golf': 'Find golf professionals and instructors',
    'CoachDirectory.heroTitle.fitness': 'Find personal trainers and fitness coaches',
    'CoachDirectory.heroTitle.skydive': 'Find certified tandem instructors',
    'CoachDirectory.heroTitle.crosscountry': 'Find certified cross-country instructors',
    'CoachDirectory.heroTitle.skateboard': 'Find certified skateboard instructors',
    'CoachDirectory.heroBannerAriaLabelGeneric': 'PeakUp certified sports professionals',
    'CoachesPage.empty': 'No certified professionals match this sport yet.',
    'CoachesPage.regionLabel': 'PeakUp professionals',
    'CoachesPage.schemaDescription': 'Browse certified sports professionals by sport on PeakUp.',
    'CoachesPage.subtitle':
      'Find the right certified instructor, guide, or coach for your next experience.',
    'CoachesPage.title': 'Certified sports professionals',
    'SectionFooter.trustGlobalCommunityText':
      'Certified sports professionals and customers from 30+ countries.',
    'SectionFooter.trustVerifiedCoachesTitle': 'Verified professionals',
    'SectionFooter.trustVerifiedCoachesText': 'Every professional profile is reviewed by PeakUp.',
    'SectionPeakupFeaturedCoaches.subtitle': 'Top rated professionals by our community',
    'ProfileSettingsForm.teamAboutSectionInfo':
      'Tell customers who you are, what you teach and what makes your team unique.',
    'ProfileSettingsForm.teamBioInfo':
      'Tell customers what your team is about. This appears on your public team page.',
    'ProfileSettingsForm.teamMapLocationInfo':
      'Choose where your team is based so customers can find you on the map.',
    'SignupForm.displayNamePlaceholderTeam': 'Team name',
    'TeamApplicationPage.lead':
      'Apply to bring your team onto PeakUp — simple, visual, community-first.',
    'TeamApplicationPage.leadNote':
      'Each professional on your team keeps their own profile and gets verified individually. You do not upload certificates here.',
    'TeamCard.verifiedCrew': 'Verified team',
    'TeamCard.viewCrew': 'View team →',
    'TeamInviteBanner.title': '{teamName} invited you to join their team',
    'TeamMapPopup.crewBadge': 'Team',
    'TeamMapPopup.viewCrew': 'View team',
    'TeamProfilePage.verifiedCrew': 'Verified team',
    'AddTeamCoachModal.notVerifiedHint':
      'This professional must complete PeakUp verification before joining a team.',
    'TermsOfServicePage.heroSubtitle':
      'Marketplace terms for customers, certified sports professionals, instructors, and guides.',
    'TermsOfServicePage.schemaDescription':
      'Read the PeakUp Terms of Service for customers and certified sports professionals.',
    'Page.schemaDescription': 'The marketplace for certified sports professionals.',
  },
  it: {
    'AboutPage.communityBody':
      'Dalle sessioni sulle piste agli incontri après-ski, PeakUp è il luogo in cui professionisti sportivi certificati e clienti si incontrano, nei posti in cui già amano muoversi.',
    'AboutPage.heroCtaPrimary': 'Trova professionisti sportivi certificati',
    'AboutPage.heroLead':
      'PeakUp mette in contatto clienti e viaggiatori con istruttori, guide e maestri certificati di fiducia per esperienze sportive autentiche in tutto il mondo.',
    'AboutPage.missionBody':
      'Mettiamo in contatto le persone con professionisti sportivi certificati attraverso un’esperienza affidabile e cinematografica — dalla scoperta alla prenotazione fino al momento in cui arrivi pronto a vivere la sessione.',
    'AboutPage.schemaDescription':
      'Scopri PeakUp — il marketplace per professionisti sportivi certificati.',
    'AboutPage.valueTrustDesc':
      'Ogni profilo viene verificato così i clienti prenotano con fiducia.',
    'AboutPage.wellnessBody':
      'Yoga all’alba, recupero in acqua, coaching nel viaggio — PeakUp aiuta le persone a prenotare esperienze intenzionali quanto l’allenamento stesso.',
    'AboutPage.whyLead':
      'I marketplace generici non sono stati costruiti per lo sport. PeakUp sì — per professionisti certificati che insegnano al limite e clienti che cercano nuove esperienze.',
    'AboutPage.whyPoint2': 'Profili che sembrano carte premium di professionisti sportivi',
    'HowItWorksPage.clientsBlock1Title': 'Trova professionisti sportivi certificati',
    'HowItWorksPage.clientsSectionDescription':
      'Scopri, prenota e allenati con i migliori istruttori, guide e maestri certificati vicino a te.',
    'HowItWorksPage.coachesSectionTitle': 'Per professionisti sportivi certificati',
    'HowItWorksPage.ctaAthleteButton': 'Trova professionisti sportivi certificati',
    'HowItWorksPage.ctaAthleteText':
      'Trova il professionista certificato giusto e prenota la sessione oggi.',
    'HowItWorksPage.ctaCoachText':
      'Unisciti alla community di professionisti sportivi certificati e fai crescere il tuo business.',
    'HowItWorksPage.heroDescription':
      'Il marketplace per professionisti sportivi certificati. Prenota in pochi minuti. Allenati ovunque.',
    'HowItWorksPage.schemaDescription':
      'Scopri come funziona PeakUp per clienti e professionisti sportivi certificati — trovare, prenotare e crescere.',
    'AuthenticationPage.signupPathCoachHint':
      'Cresci in modo indipendente su PeakUp e connettiti con clienti in tutto il mondo.',
    'AuthenticationPage.signupPathSubtitle':
      'Scegli il tuo percorso — prenota esperienze, cresci come professionista o costruisci il tuo team.',
    'AuthenticationPage.signupPathTeamHint':
      'Crea un team e metti in mostra i tuoi professionisti sportivi certificati.',
    'AuthenticationPage.signupPathCoach': 'Unisciti come professionista sportivo certificato',
    'CancellationPolicyPage.heroSubheadline':
      'Le policy di cancellazione PeakUp proteggono clienti e professionisti sportivi certificati mantenendo lo sport outdoor flessibile, sicuro e professionale.',
    'CancellationPolicyPage.philosophyText':
      'PeakUp crede che grandi esperienze sportive richiedano fiducia, flessibilità e rispetto reciproco tra clienti e professionisti certificati. La nostra policy protegge i clienti, supporta i professionisti e mantiene lo sport outdoor sicuro ed equo.',
    'CancellationPolicyPage.summaryCustomerText':
      'Finestre di rimborso chiare proteggono clienti e professionisti certificati.',
    'CoachApplicationPage.stepCoachingHint':
      'Condividi esperienza, certificazioni e come lavori con i clienti.',
    'CoachDashboardPage.cardInboxHint': 'Rivedi richieste di prenotazione e messaggi dei clienti.',
    'CoachDashboardPage.cardPublicProfileHint':
      'Vedi come i clienti vedono il tuo profilo professionale PeakUp.',
    'CoachEarningsPage.earningsAthleteLabel': 'Il cliente paga',
    'CoachEarningsPage.providesItem5': 'Visibilità verso i clienti',
    'CustomerDashboardPage.heroNameFallback': 'Cliente',
    'LandingHeroSection.featureVerified': 'Professionisti verificati',
    'LandingHeroSection.headlineLineOne': 'Il marketplace per',
    'LandingHeroSection.headlineLineTwoRest': 'professionisti sportivi certificati',
    'LandingHeroSection.primaryCta': 'Trova professionisti',
    'LandingHeroSection.subtitle':
      'Scopri istruttori, guide e maestri verificati per ogni sport e destinazione, ovunque ti porti il prossimo viaggio.',
    'LandingHowItWorksSection.cardFindBookText':
      'Sfoglia professionisti certificati, controlla disponibilità e prenota in pochi minuti.',
    'LandingHowItWorksSection.cardEnjoyText':
      'Impara con istruttori, guide e maestri esperti e goditi la sessione.',
    'LandingHowItWorksSection.cardReviewText':
      'Aiuta altri a trovare il professionista giusto. Condividi la tua esperienza.',
    'LandingHowItWorksSection.subtitle':
      'Trova un professionista. Prenota la sessione. Goditi lo sport.',
    'LandingWhyPeakupSection.cardAthleteCta': 'Trova professionisti sportivi certificati',
    'LandingWhyPeakupSection.cardAthleteTitle': 'Trova professionisti sportivi certificati',
    'LandingWhyPeakupSection.cardCoachTitle': 'Cresci come professionista certificato',
    'LandingWhyPeakupSection.cardCoachText':
      'Aumenta visibilità, prenotazioni e indipendenza come professionista sportivo certificato.',
    'LandingWhyPeakupSection.subtitle':
      'Una piattaforma. Due percorsi. Pensata per clienti e professionisti sportivi certificati.',
    'LandingWhyPeakupSection.trustVerified': 'Professionisti verificati',
    'LandingPage.schemaDescription':
      'Il marketplace per professionisti sportivi certificati — prenota istruttori, guide e maestri in tutto il mondo.',
    'CoachDirectory.heroTitleGeneric': 'Trova professionisti sportivi certificati',
    'CoachDirectory.heroTitle.ski': 'Trova maestri di sci certificati',
    'CoachDirectory.heroTitle.snowboard': 'Trova maestri di snowboard certificati',
    'CoachDirectory.heroTitle.mtb': 'Trova guide MTB certificate',
    'CoachDirectory.heroTitle.surf': 'Trova istruttori di surf certificati',
    'CoachDirectory.heroTitle.yoga': 'Trova insegnanti di yoga certificati',
    'CoachDirectory.heroTitle.tennis': 'Trova istruttori e coach di tennis',
    'CoachDirectory.heroTitle.golf': 'Trova professionisti e istruttori di golf',
    'CoachesPage.title': 'Professionisti sportivi certificati',
    'SectionFooter.trustGlobalCommunityText':
      'Professionisti sportivi certificati e clienti da oltre 30 paesi.',
    'ProfileSettingsForm.teamAboutSectionInfo':
      'Racconta ai clienti chi siete, cosa insegnate e cosa rende unico il vostro team.',
    'ProfileSettingsForm.teamBioInfo':
      'Racconta ai clienti di cosa si occupa il tuo team. Appare sulla pagina team pubblica.',
    'ProfileSettingsForm.teamMapLocationInfo':
      'Scegli dove ha sede il team così i clienti vi trovano sulla mappa.',
    'TeamCard.viewCrew': 'Vedi team →',
    'TeamMapPopup.viewCrew': 'Vedi team',
    'TermsOfServicePage.heroSubtitle':
      'Termini del marketplace per clienti, professionisti sportivi certificati, istruttori e guide.',
    'TermsOfServicePage.schemaDescription':
      'Leggi i Termini di servizio PeakUp per clienti e professionisti sportivi certificati.',
  },
  de: {
    'AboutPage.communityBody':
      'Von Trail-Sessions bis Après-Ski-Treffen — auf PeakUp finden zertifizierte Sportprofis und Kundinnen und Kunden einander dort, wo sie sich ohnehin bewegen.',
    'AboutPage.whyPoint2': 'Profile wie Premium-Sportprofikarten',
    'CoachApplicationPage.stepCoachingHint':
      'Teile deine Erfahrung, Zertifizierungen und wie du mit Kundinnen und Kunden arbeitest.',
    'CoachDashboardPage.cardInboxHint': 'Buchungsanfragen und Nachrichten von Kundinnen und Kunden prüfen.',
    'CoachDashboardPage.cardPublicProfileHint':
      'So sehen Kundinnen und Kunden dein PeakUp-Profil.',
    'HowItWorksPage.ctaAthleteText':
      'Finde den passenden zertifizierten Profi und buche deine Session noch heute.',
    'AboutPage.heroLead':
      'PeakUp verbindet Kundinnen, Kunden und Reisende mit vertrauenswürdigen zertifizierten Instruktoren, Guides und Coaches für authentische Sporterlebnisse weltweit.',
    'AboutPage.schemaDescription':
      'Entdecke PeakUp — den Marktplatz für zertifizierte Sportprofis.',
    'AboutPage.whyLead':
      'Generische Marktplätze wurden nicht für Sport gebaut. PeakUp schon — für zertifizierte Sportprofis und Kundinnen und Kunden, die neue Erlebnisse suchen.',
    'HowItWorksPage.heroDescription':
      'Der Marktplatz für zertifizierte Sportprofis. In Minuten buchen. Überall trainieren.',
    'LandingHeroSection.headlineLineOne': 'Der Marktplatz für',
    'LandingHeroSection.headlineLineTwoRest': 'zertifizierte Sportprofis',
    'LandingWhyPeakupSection.subtitle':
      'Eine Plattform. Zwei Wege. Für Kundinnen, Kunden und zertifizierte Sportprofis.',
    'AuthenticationPage.signupPathCoachHint':
      'Wachse unabhängig auf PeakUp und verbinde dich mit Kundinnen und Kunden weltweit.',
    'AuthenticationPage.signupPathTeamHint':
      'Erstelle ein Team und präsentiere deine zertifizierten Sportprofis.',
    'CoachEarningsPage.earningsAthleteLabel': 'Kunde zahlt',
    'CustomerDashboardPage.heroNameFallback': 'Kunde',
    'CoachesPage.title': 'Zertifizierte Sportprofis',
    'TeamCard.viewCrew': 'Team ansehen →',
    'TeamMapPopup.viewCrew': 'Team ansehen',
  },
  fr: {
    'LandingWhyPeakupSection.cardAthleteCta': 'Trouvez des professionnels certifiés',
    'LandingWhyPeakupSection.cardAthleteTitle': 'Trouvez des professionnels certifiés',
    'HowItWorksPage.ctaAthleteText':
      'Trouvez le bon professionnel certifié et réservez votre session dès aujourd’hui.',
    'AboutPage.heroLead':
      'PeakUp met en relation clients et voyageurs avec des instructeurs, guides et coaches certifiés de confiance pour des expériences sportives authentiques dans le monde entier.',
    'AboutPage.schemaDescription':
      'Découvrez PeakUp — la marketplace pour professionnels du sport certifiés.',
    'LandingHeroSection.headlineLineOne': 'La marketplace pour',
    'LandingHeroSection.headlineLineTwoRest': 'professionnels du sport certifiés',
    'LandingWhyPeakupSection.subtitle':
      'Une plateforme. Deux parcours. Pour clients et professionnels du sport certifiés.',
    'AuthenticationPage.signupPathCoachHint':
      'Développez-vous sur PeakUp et connectez-vous avec des clients dans le monde entier.',
    'CoachEarningsPage.earningsAthleteLabel': 'Le client paie',
    'CustomerDashboardPage.heroNameFallback': 'Client',
    'CoachesPage.title': 'Professionnels du sport certifiés',
    'TeamCard.viewCrew': 'Voir l’équipe →',
    'TeamMapPopup.viewCrew': 'Voir l’équipe',
  },
  es: {
    'HowItWorksPage.ctaAthleteText':
      'Encuentra al profesional certificado ideal y reserva tu sesión hoy.',
    'AboutPage.heroLead':
      'PeakUp conecta clientes y viajeros con instructores, guías y coaches certificados de confianza para experiencias deportivas auténticas en todo el mundo.',
    'AboutPage.schemaDescription':
      'Descubre PeakUp — el marketplace para profesionales deportivos certificados.',
    'LandingHeroSection.headlineLineOne': 'El marketplace para',
    'LandingHeroSection.headlineLineTwoRest': 'profesionales deportivos certificados',
    'LandingWhyPeakupSection.subtitle':
      'Una plataforma. Dos caminos. Para clientes y profesionales deportivos certificados.',
    'AuthenticationPage.signupPathCoachHint':
      'Crece de forma independiente en PeakUp y conecta con clientes de todo el mundo.',
    'CoachEarningsPage.earningsAthleteLabel': 'El cliente paga',
    'CustomerDashboardPage.heroNameFallback': 'Cliente',
    'CoachesPage.title': 'Profesionales deportivos certificados',
    'TeamCard.viewCrew': 'Ver equipo →',
    'TeamMapPopup.viewCrew': 'Ver equipo',
  },
  pt: {
    'LandingWhyPeakupSection.cardAthleteCta': 'Encontre profissionais certificados',
    'LandingWhyPeakupSection.cardAthleteTitle': 'Encontre profissionais certificados',
    'HowItWorksPage.ctaAthleteButton': 'Encontre profissionais certificados',
    'HowItWorksPage.ctaAthleteText':
      'Encontre o profissional certificado certo e reserve a sua sessão hoje.',
    'AboutPage.heroLead':
      'A PeakUp liga clientes e viajantes a instrutores, guias e coaches certificados de confiança para experiências desportivas autênticas em todo o mundo.',
    'AboutPage.schemaDescription':
      'Descobre a PeakUp — o marketplace para profissionais desportivos certificados.',
    'LandingHeroSection.headlineLineOne': 'O marketplace para',
    'LandingHeroSection.headlineLineTwoRest': 'profissionais desportivos certificados',
    'LandingWhyPeakupSection.subtitle':
      'Uma plataforma. Dois caminhos. Para clientes e profissionais desportivos certificados.',
    'AuthenticationPage.signupPathCoachHint':
      'Cresce de forma independente na PeakUp e conecta-te com clientes em todo o mundo.',
    'CoachEarningsPage.earningsAthleteLabel': 'O cliente paga',
    'CustomerDashboardPage.heroNameFallback': 'Cliente',
    'CoachesPage.title': 'Profissionais desportivos certificados',
    'TeamCard.viewCrew': 'Ver equipa →',
    'TeamMapPopup.viewCrew': 'Ver equipa',
  },
};

const locales = ['en', 'it', 'de', 'fr', 'es', 'pt'];

/** Keys where "coach" in marketing should stay technical — skip bulk replace */
const SKIP_BULK_KEYS = new Set(['CoachDashboardPage.schemaTitle']);

const bulkValueReplacements = {
  en: [
    [/athletes and coaches/gi, 'customers and certified sports professionals'],
    [/athletes and travelers/gi, 'customers and travelers'],
    [/passionate athletes/gi, 'people'],
    [/so athletes book/gi, 'so customers book'],
    [/helps athletes/gi, 'helps people'],
    [/from athletes/gi, 'from customers'],
    [/for athletes/gi, 'for customers'],
    [/both athletes and coaches/gi, 'both customers and certified sports professionals'],
    [/between athletes and coaches/gi, 'between customers and certified sports professionals'],
    [/how athletes view/gi, 'how customers view'],
    [/Athlete pays/gi, 'Customer pays'],
    [/Athlete discovery/gi, 'Customer discovery'],
    [/"Athlete"/g, '"Customer"'],
    [/Find your coach/gi, 'Find certified sports professionals'],
    [/Find a Coach/gi, 'Find professionals'],
    [/Verified crew/gi, 'Verified team'],
    [/View crew/gi, 'View team'],
    [/"Crew"/g, '"Team"'],
    [/your crew/gi, 'your team'],
    [/their crew/gi, 'their team'],
    [/a crew/gi, 'a team'],
    [/academy, camp, or crew/gi, 'team'],
    [/academy, camp, or collective/gi, 'team'],
    [/Crew \/ academy name/gi, 'Team name'],
  ],
  it: [
    [/atleti e coach/gi, 'clienti e professionisti sportivi certificati'],
    [/atleti e viaggiatori/gi, 'clienti e viaggiatori'],
    [/atleti appassionati/gi, 'persone'],
    [/gli atleti/gi, 'i clienti'],
    [/agli atleti/gi, 'ai clienti'],
    [/degli atleti/gi, 'dei clienti'],
    [/atleta/gi, 'cliente'],
    [/Trova il tuo coach/gi, 'Trova professionisti sportivi certificati'],
    [/equipaggio/gi, 'team'],
  ],
  de: [
    [/Athleten und Coaches/gi, 'Kundinnen, Kunden und zertifizierte Sportprofis'],
    [/Athletinnen, Athleten und Coaches/gi, 'Kundinnen, Kunden und zertifizierte Sportprofis'],
    [/Athleten und Reisende/gi, 'Kundinnen, Kunden und Reisende'],
    [/leidenschaftliche Athleten/gi, 'Menschen'],
    [/damit Athleten/gi, 'damit Kundinnen und Kunden'],
    [/von Athleten/gi, 'von Kundinnen und Kunden'],
    [/Athlet zahlt/gi, 'Kunde zahlt'],
    [/Athleten-Entdeckung/gi, 'Kundenreichweite'],
    [/Finde deinen Coach/gi, 'Finde zertifizierte Sportprofis'],
    [/Verifizierte Crew/gi, 'Verifiziertes Team'],
  ],
  fr: [
    [/athlètes et coachs/gi, 'clients et professionnels du sport certifiés'],
    [/athlètes et voyageurs/gi, 'clients et voyageurs'],
    [/athlètes passionnés/gi, 'personnes'],
    [/les athlètes/gi, 'les clients'],
    [/des athlètes/gi, 'des clients'],
    [/Trouvez votre coach/gi, 'Trouvez des professionnels certifiés'],
    [/Crew vérifiée/gi, 'Équipe vérifiée'],
  ],
  es: [
    [/atletas y coaches/gi, 'clientes y profesionales deportivos certificados'],
    [/atletas y viajeros/gi, 'clientes y viajeros'],
    [/atletas apasionados/gi, 'personas'],
    [/los atletas/gi, 'los clientes'],
    [/Encuentra tu coach/gi, 'Encuentra profesionales certificados'],
    [/Crew verificada/gi, 'Equipo verificado'],
  ],
  pt: [
    [/atletas e coaches/gi, 'clientes e profissionais desportivos certificados'],
    [/atletas e viajantes/gi, 'clientes e viajantes'],
    [/atletas apaixonados/gi, 'pessoas'],
    [/os atletas/gi, 'os clientes'],
    [/Tripulação verificada/gi, 'Equipa verificada'],
  ],
};

locales.forEach(locale => {
  const filePath = path.join(translationsDir, `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const patch = patches[locale] || {};
  Object.entries(patch).forEach(([key, value]) => {
    data[key] = value;
  });

  const replacements = bulkValueReplacements[locale] || [];
  Object.entries(data).forEach(([key, value]) => {
    if (SKIP_BULK_KEYS.has(key) || typeof value !== 'string') return;
    let next = value;
    replacements.forEach(([pattern, replacement]) => {
      next = next.replace(pattern, replacement);
    });
    data[key] = next;
  });

  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Updated ${locale}.json (${Object.keys(patch).length} explicit keys)`);
});
