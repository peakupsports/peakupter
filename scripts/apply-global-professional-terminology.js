/**
 * Global public-facing terminology: generic "coach" → professional/instructor/guide.
 * Internal keys, admin tools, URLs, and sport-specific roles unchanged.
 * Run: node scripts/apply-global-professional-terminology.js
 */
const fs = require('fs');
const path = require('path');

const translationsDir = path.join(__dirname, '../src/translations');

const en = {
  'AboutPage.valueGrowthDesc':
    'Tools that help professionals build reputation, fill sessions, and scale.',
  'AddTeamCoachModal.addCoach': 'Add professional',
  'AddTeamCoachModal.emailLabel': 'Professional email address',
  'AddTeamCoachModal.eyebrow': 'Team professionals',
  'AddTeamCoachModal.inviteCoach': 'Invite professional',
  'AddTeamCoachModal.lead':
    "Search for an independent PeakUp professional. They'll receive an invitation and can accept or decline — no nested accounts, no HR admin panel.",
  'AddTeamCoachModal.noResults':
    'No matching PeakUp professional found. Make sure they already have a PeakUp profile.',
  'AddTeamCoachModal.resultsLabel': 'Matching professionals',
  'AddTeamCoachModal.tabEmail': 'Professional email',
  'AddTeamCoachModal.tabsLabel': 'Find professional by',
  'AddTeamCoachModal.title': 'Add a professional',
  'CoachApplicationPage.ambassadorProgramPanelHint':
    "This is separate from a referral invitation. After you're approved, you can grow into a PeakUp Ambassador and earn rewards when you refer other professionals.",
  'CoachApplicationPage.coachingCertificatesLabel': 'Certification documents',
  'CoachApplicationPage.hearAbout.friendCoach': 'Friend or professional referral',
  'CoachApplicationPage.heroSubheadline':
    'For independent certified instructors, guides, teachers, and sports professionals.',
  'CoachApplicationPage.languagesRequired': 'List the languages you teach in.',
  'CoachApplicationPage.referralInviteSubtitle':
    'Enter the ambassador referral code you received to connect your professional application to a PeakUp Ambassador.',
  'CoachApplicationPage.schemaDescription':
    'Grow with PeakUp — for independent certified instructors, guides, and sports professionals.',
  'CoachApplicationPage.stepReferralTitle': 'Your application path',
  'CoachApplicationPage.stepTrack03': 'Professional',
  'CoachCard.fallbackName': 'Professional',
  'CoachMapPage.coachesSection': 'Certified professionals',
  'CoachMapPage.entity.coaches': 'Professionals',
  'CoachMapPage.mobileSportBarA11y': 'Filter professionals by sport',
  'CoachMapPage.noNearbyCoachesForSport':
    'No {sport} professionals nearby. Showing the closest available professionals.',
  'CoachMapPage.schemaDescription': 'Explore professionals on the map and filter by sport.',
  'CoachMapPage.schemaTitle': 'Professional map | {marketplaceName}',
  'CoachMapPage.title': 'Professional map',
  'CoachMapPopup.close': 'Close profile details',
  'CoachStickerCard.fallbackSport': 'Professional',
  'CancellationPolicyPage.accordionCoachTitle': 'Professional cancellation policy',
  'CancellationPolicyPage.summaryCoachTitle': 'Professional cancellations',
  'CoachesPage.carouselNext': 'Scroll professionals right',
  'CoachesPage.carouselPrev': 'Scroll professionals left',
  'CoachesPage.error': "We couldn't load professionals. Please try again.",
  'CoachesPage.loading': 'Loading professionals…',
  'CoachesPage.scrollNext': 'Scroll to more professionals',
  'CoachesPage.scrollPrev': 'Scroll to previous professionals',
  'CustomerDashboardPage.cardBookingsHint': 'Overview of your sessions and requests.',
  'FieldCoachMapLocation.helpText':
    'Choose a suggestion so we can show your location on the map. Your profile card will display a short version, like Laax or St. Moritz.',
  'InboxPage.default-purchase-day.reviewed-by-customer.status':
    '{transactionRole, select, customer {Waiting for professional review} other {Waiting for your review}}',
  'PeakUpCoachFigurineCard.badge.certifiedCoach': 'Certified professional',
  'PeakUpCoachFigurineCard.badge.topCoach': 'Top professional',
  'PeakupCoachBadgesHierarchyModal.title': 'PeakUp professional badges',
  'PreBookingIntroModal.footerNote': 'Most professionals reply within a few hours.',
  'PreBookingIntroModal.subtitle':
    "A few details help your professional prepare. You'll pick dates and times on the next step.",
  'PreBookingIntroModal.title': 'Tell your professional about your session',
  'ProfilePage.trustTopbar.coachSubtitle': 'PeakUp professional profile',
  'ProfilePage.trustTopbar.coachTitle': 'Professional',
  'ProfilePage.trustTopbar.regionLabel': 'Professional trust highlights',
  'ProfileSettingsForm.bioInfoCustomer':
    'Help professionals understand who you are and how you like to train.',
  'ProfileSettingsForm.teamCoachCountLabel': 'Number of professionals / guides (optional)',
  'ProfileSettingsForm.teamCoachesAdd': '+ Invite professional',
  'ProfileSettingsForm.teamCoachesConnectedCount':
    '{count, plural, =0 {No professionals connected} one {# professional connected} other {# professionals connected}}',
  'ProfileSettingsForm.teamCoachesEmptyLead':
    'Invite verified PeakUp professionals by email or profile. They choose whether to join — you never manage their accounts.',
  'ProfileSettingsForm.teamCoachesEmptyTitle': 'No professionals connected yet',
  'ProfileSettingsForm.teamCoachesHeading': 'Team professionals',
  'ProfileSettingsForm.teamCoachesInfo':
    'Connect independent PeakUp professionals to your organization. Each keeps their own profile, reviews, bookings, and payouts — your team page showcases them together.',
  'ProfileSettingsForm.teamCoachesLoading': 'Loading professionals…',
  'ProfileSettingsForm.teamCoachesRemoveConfirm':
    'Remove this professional from your organization profile?',
  'ProfileSettingsForm.teamCoachesSectionInfo': 'Connected professionals will appear here automatically.',
  'ProfileSettingsForm.teamCoachesSectionTitle': 'Team professionals',
  'ProfileSettingsForm.teamSportsAndLanguagesInfo':
    'Select the sports and languages your team offers. Individual professionals keep their own profiles and certifications.',
  'ProfileSettingsForm.teamSportsInfo':
    'Select the sports your team offers. Individual professionals keep their own profiles and certifications.',
  'ProfileSettingsPage.pageSubtitleCustomer':
    'Create your profile and book the right professional for your next sport experience.',
  'ProfileSettingsPage.pageSubtitleTeam':
    'Build your team profile — photo, story, location, and sports. Professionals on your team manage their own profiles.',
  'SectionPeakupFeaturedCoaches.empty': 'No featured professionals available yet.',
  'SectionPeakupFeaturedCoaches.errorTitle': "We couldn't load professionals right now",
  'SectionPeakupFeaturedCoaches.regionLabel': 'Featured PeakUp professionals',
  'SectionPeakupFeaturedCoaches.scrollNext': 'Scroll to more professionals',
  'SectionPeakupFeaturedCoaches.scrollPrev': 'Scroll to previous professionals',
  'SectionPeakupFeaturedCoaches.titleCoach': 'Professionals',
  'TeamDashboardPage.coachesSectionTitle': 'Team professionals',
  'TeamDashboardPage.statCoaches': 'Connected professionals',
  'TeamInvitationBranding.coachCount':
    '{count, plural, one {# professional} other {# professionals}}',
  'TransactionPage.default-purchase-day.customer.purchased.extraInfo':
    'Your spot has been reserved. Use the chat below to coordinate any final details with your professional.',
  'CancellationPolicyPage.accordionCoachBody':
    'Professionals should only cancel confirmed sessions when absolutely necessary. If a professional needs to cancel, they should inform the customer as soon as possible and try to offer a suitable rescheduling option. Repeated cancellations may negatively affect ranking, visibility, ambassador status, or continued access to the PeakUp platform.',
  'CancellationPolicyPage.summaryCoachText':
    'Professionals are expected to avoid cancellations and prioritize rescheduling whenever possible.',
  'CoachApplicationPage.coachingCertificatesRequired': 'Upload your certification documents.',
  'EmailVerificationForm.coachOnboardingSuccessButtonText': 'Continue application',
  'EmailVerificationForm.coachOnboardingSuccessText':
    'Your email is verified. Continue your PeakUp professional application.',
  'PeakUpCoachUserFields.coachCityTextHelp':
    'Short label shown on your profile and figurina — keep it visual and readable (e.g. Laax, Zermatt, Chamonix). The map pin below stays separate.',
  'PeakupCoachBadgesHierarchyModal.ambassadorBody':
    'Early professionals helping grow the PeakUp community and platform.',
  'PeakupCoachBadgesHierarchyModal.badgeButtonHint': 'Open PeakUp professional badge guide',
  'PeakupCoachBadgesHierarchyModal.certifiedBody':
    'Verified and qualified professional with recognized certifications.',
  'PeakupCoachBadgesHierarchyModal.topCoachBody':
    'Verified professional with 10+ years of certified experience.',
  'ProfilePage.coachBioEmpty': "This professional hasn't added a bio yet.",
  'ProfilePage.coachInquiryEyebrow': 'Get in touch',
  'ProfilePage.memberSavedCoachesHeading': 'Favorite professionals',
  'ProfilePage.memberSavedCoachesHint': 'Saved professionals you love will show up here.',
  'ProfilePage.stickerCoachLevelNew': 'New on PeakUp',
  'ProfilePage.stickerVerifiedCoachBadge': 'Verified professional',
  'TeamCoachRosterCard.tableCoach': 'Professional',
  'TeamMapPopup.coachCount': '{count, plural, one {# professional} other {# professionals}}',
  'TeamProfilePage.coachCount':
    '{count, plural, one {# professional connected} other {# professionals connected}}',
  'TeamProfilePage.coachesKicker': 'Our professionals',
  'TeamProfilePage.rosterEmpty': 'Professionals will appear here as they join the team.',
  'TeamProfilePage.rosterEmptyTitle': 'No professionals connected yet',
  'TeamProfilePage.rosterError': 'Could not load professionals right now.',
  'TeamProfilePage.rosterHeading': 'Meet the team',
  'TeamProfilePage.rosterLead':
    'Book sessions directly with any professional below. Each profile includes reviews, pricing, and availability.',
  'TeamProfilePage.rosterLoading': 'Loading professionals…',
  'TeamProfilePage.sportsOfferedLead': 'Sports and disciplines this team offers through its professionals.',
  'TeamProfilePage.statCoaches': 'Professionals',
  'TeamProfilePage.teamRatingFootnote':
    '{rating} average rating across {count, plural, one {# review} other {# reviews}} from our professionals.',
  'TransactionPanel.peakUpConversation.coachSubtitle': 'Professional',
  'TransactionPanel.peakUpMeetingPointMapHint': 'Where you meet your professional',
  'CoachApplicationPage.yearsExperienceLabel': 'Years of professional experience',
  'CoachApplicationPage.yearsExperienceRequired': 'Enter your years of professional experience.',
  'CoachesPage.schemaTitle': 'Professionals | {marketplaceName}',
  'CustomerDashboardPage.cardInboxHint': 'Conversation threads with professionals.',
  'FieldCoachMapLocation.label': 'Where are you based?',
  'FieldCoachMapLocation.placeholder': 'Search your city, resort or teaching area…',
  'ProfilePage.stickerBadge_certified_coach': 'Certified professional',
  'ProfilePage.stickerBadge_top_coach': 'Top professional',
  'CancellationPolicyPage.accordionCustomerBody':
    'Customers may cancel a booking according to the timing of the cancellation. If a cancellation is made 7 or more days before the scheduled session, the customer may be eligible for a full refund. If the cancellation is made between 48 hours and 7 days before the session, the customer may be eligible for a partial refund. If the cancellation is made less than 48 hours before the session, the booking is generally non-refundable unless the professional or PeakUp approves an exception.',
  'CancellationPolicyPage.accordionForceMajeureBody':
    'Exceptional events outside the control of the customer, professional or PeakUp may be reviewed individually. These may include serious illness, injury, natural events, travel disruption, resort closures, official restrictions, or other extraordinary circumstances.',
  'CancellationPolicyPage.accordionNoShowBody':
    'If a customer does not attend a confirmed session without prior notice, the booking is generally considered non-refundable. If a professional does not attend a confirmed session without valid reason or communication, PeakUp may review the case and take appropriate action.',
  'CancellationPolicyPage.accordionReschedulingBody':
    'PeakUp encourages rescheduling before cancellation whenever possible. If both the customer and professional agree on a new date or time, the booking may be moved without requiring a refund. Rescheduling is especially encouraged for weather-related or operational reasons.',
  'CancellationPolicyPage.accordionWeatherBody':
    'Many PeakUp activities take place outdoors. If weather, snow, water, trail, lift, transport or safety conditions make the activity unsafe or impossible, the professional and customer should first try to reschedule. PeakUp may review cases involving severe weather, resort/lift closures, dangerous conditions, or other safety concerns.',
  'CancellationPolicyPage.example2Result':
    'Normally non-refundable unless approved by the professional or PeakUp.',
  'CancellationPolicyPage.example4Result':
    'Professional visibility, ranking or platform access may be reviewed.',
  'CancellationPolicyPage.example4Title': 'Professional repeatedly cancels confirmed bookings.',
  'CancellationPolicyPage.schemaDescription':
    'PeakUp cancellation rules for customers and professionals — flexible, fair and transparent.',
  'CancellationPolicyPage.summaryCustomerBullet3':
    'Less than 48 hours: no refund unless approved by the professional or PeakUp',
  'CancellationPolicyPage.summaryWeatherBullet3': 'Professional and PeakUp may review exceptional cases',
};

const it = {
  'AboutPage.valueGrowthDesc':
    'Strumenti che aiutano i professionisti a costruire reputazione, riempire le sessioni e crescere.',
  'AddTeamCoachModal.addCoach': 'Aggiungi professionista',
  'AddTeamCoachModal.emailLabel': 'Email del professionista',
  'AddTeamCoachModal.eyebrow': 'Professionisti del team',
  'AddTeamCoachModal.inviteCoach': 'Invita professionista',
  'AddTeamCoachModal.lead':
    'Cerca un professionista PeakUp indipendente. Riceverà un invito e potrà accettare o rifiutare — nessun account annidato, nessun pannello HR.',
  'AddTeamCoachModal.noResults':
    'Nessun professionista PeakUp corrispondente. Assicurati che abbia già un profilo PeakUp.',
  'AddTeamCoachModal.resultsLabel': 'Professionisti corrispondenti',
  'AddTeamCoachModal.tabEmail': 'Email professionista',
  'AddTeamCoachModal.tabsLabel': 'Trova professionista per',
  'AddTeamCoachModal.title': 'Aggiungi un professionista',
  'CoachApplicationPage.ambassadorProgramPanelHint':
    'È distinto da un invito referral. Dopo l’approvazione, puoi diventare Ambassador PeakUp e ottenere premi quando inviti altri professionisti.',
  'CoachApplicationPage.coachingCertificatesLabel': 'Documenti di certificazione',
  'CoachApplicationPage.hearAbout.friendCoach': 'Amico o referral professionista',
  'CoachApplicationPage.heroSubheadline':
    'Per istruttori, guide, insegnanti e professionisti sportivi certificati indipendenti.',
  'CoachApplicationPage.languagesRequired': 'Indica le lingue in cui insegni.',
  'CoachApplicationPage.referralInviteSubtitle':
    'Inserisci il codice referral ambassador ricevuto per collegare la tua candidatura professionale a un Ambassador PeakUp.',
  'CoachApplicationPage.schemaDescription':
    'Cresci con PeakUp — per istruttori, guide e professionisti sportivi certificati indipendenti.',
  'CoachApplicationPage.stepReferralTitle': 'Il tuo percorso di candidatura',
  'CoachApplicationPage.stepTrack03': 'Professionista',
  'CoachCard.fallbackName': 'Professionista',
  'CoachMapPage.coachesSection': 'Professionisti certificati',
  'CoachMapPage.entity.coaches': 'Professionisti',
  'CoachMapPage.mobileSportBarA11y': 'Filtra professionisti per sport',
  'CoachMapPage.noNearbyCoachesForSport':
    'Nessun professionista {sport} nelle vicinanze. Mostriamo i più vicini disponibili.',
  'CoachMapPage.schemaDescription': 'Esplora professionisti sulla mappa e filtra per sport.',
  'CoachMapPage.schemaTitle': 'Mappa professionisti | {marketplaceName}',
  'CoachMapPage.title': 'Mappa professionisti',
  'CoachMapPopup.close': 'Chiudi dettagli profilo',
  'CoachStickerCard.fallbackSport': 'Professionista',
  'CancellationPolicyPage.accordionCoachTitle': 'Policy cancellazioni professionista',
  'CancellationPolicyPage.summaryCoachTitle': 'Cancellazioni professionista',
  'CoachesPage.carouselNext': 'Scorri professionisti a destra',
  'CoachesPage.carouselPrev': 'Scorri professionisti a sinistra',
  'CoachesPage.error': 'Impossibile caricare i professionisti. Riprova.',
  'CoachesPage.loading': 'Caricamento professionisti…',
  'CoachesPage.scrollNext': 'Scorri altri professionisti',
  'CoachesPage.scrollPrev': 'Scorri professionisti precedenti',
  'CustomerDashboardPage.cardBookingsHint': 'Panoramica delle tue sessioni e richieste.',
  'FieldCoachMapLocation.helpText':
    'Scegli un suggerimento per la posizione sulla mappa. La scheda profilo mostrerà un’etichetta breve, es. Laax o St. Moritz.',
  'InboxPage.default-purchase-day.reviewed-by-customer.status':
    '{transactionRole, select, customer {In attesa della recensione del professionista} other {In attesa della tua recensione}}',
  'PeakUpCoachFigurineCard.badge.certifiedCoach': 'Professionista certificato',
  'PeakUpCoachFigurineCard.badge.topCoach': 'Top professionista',
  'PeakupCoachBadgesHierarchyModal.title': 'Badge professionista PeakUp',
  'PreBookingIntroModal.footerNote': 'La maggior parte dei professionisti risponde entro poche ore.',
  'PreBookingIntroModal.subtitle':
    'Alcuni dettagli aiutano il professionista a prepararsi. Sceglierai date e orari al passo successivo.',
  'PreBookingIntroModal.title': 'Racconta la sessione al professionista',
  'ProfilePage.trustTopbar.coachSubtitle': 'Profilo professionista PeakUp',
  'ProfilePage.trustTopbar.coachTitle': 'Professionista',
  'ProfilePage.trustTopbar.regionLabel': 'Punti di fiducia professionista',
  'ProfileSettingsForm.bioInfoCustomer':
    'Aiuta i professionisti a capire chi sei e come ti piace allenarti.',
  'ProfileSettingsForm.teamCoachCountLabel': 'Numero professionisti / guide (opzionale)',
  'ProfileSettingsForm.teamCoachesAdd': '+ Invita professionista',
  'ProfileSettingsForm.teamCoachesConnectedCount':
    '{count, plural, =0 {Nessun professionista collegato} one {# professionista collegato} other {# professionisti collegati}}',
  'ProfileSettingsForm.teamCoachesEmptyLead':
    'Invita professionisti PeakUp verificati via email o profilo. Scelgono loro se unirsi — non gestisci mai i loro account.',
  'ProfileSettingsForm.teamCoachesEmptyTitle': 'Nessun professionista collegato',
  'ProfileSettingsForm.teamCoachesHeading': 'Professionisti del team',
  'ProfileSettingsForm.teamCoachesInfo':
    'Collega professionisti PeakUp indipendenti alla tua organizzazione. Ognuno mantiene profilo, recensioni, prenotazioni e pagamenti — la pagina team li mette in mostra.',
  'ProfileSettingsForm.teamCoachesLoading': 'Caricamento professionisti…',
  'ProfileSettingsForm.teamCoachesRemoveConfirm': 'Rimuovere questo professionista dal profilo organizzazione?',
  'ProfileSettingsForm.teamCoachesSectionInfo': 'I professionisti collegati compariranno qui automaticamente.',
  'ProfileSettingsForm.teamCoachesSectionTitle': 'Professionisti del team',
  'ProfileSettingsForm.teamSportsAndLanguagesInfo':
    'Seleziona sport e lingue del team. I professionisti mantengono profili e certificazioni propri.',
  'ProfileSettingsForm.teamSportsInfo':
    'Seleziona gli sport del team. I professionisti mantengono profili e certificazioni propri.',
  'ProfileSettingsPage.pageSubtitleCustomer':
    'Crea il profilo e prenota il professionista giusto per la prossima esperienza sportiva.',
  'ProfileSettingsPage.pageSubtitleTeam':
    'Costruisci il profilo team — foto, storia, posizione e sport. I professionisti del team gestiscono i propri profili.',
  'SectionPeakupFeaturedCoaches.empty': 'Nessun professionista in evidenza disponibile.',
  'SectionPeakupFeaturedCoaches.errorTitle': 'Impossibile caricare i professionisti in questo momento',
  'SectionPeakupFeaturedCoaches.regionLabel': 'Professionisti PeakUp in evidenza',
  'SectionPeakupFeaturedCoaches.scrollNext': 'Scorri altri professionisti',
  'SectionPeakupFeaturedCoaches.scrollPrev': 'Scorri professionisti precedenti',
  'SectionPeakupFeaturedCoaches.titleCoach': 'in evidenza',
  'SectionPeakupFeaturedCoaches.titleFeatured': 'Professionisti',
  'TeamDashboardPage.coachesSectionTitle': 'Professionisti del team',
  'TeamDashboardPage.statCoaches': 'Professionisti collegati',
  'TeamInvitationBranding.coachCount':
    '{count, plural, one {# professionista} other {# professionisti}}',
  'TransactionPage.default-purchase-day.customer.purchased.extraInfo':
    'Il tuo posto è riservato. Usa la chat qui sotto per coordinare i dettagli finali con il professionista.',
  'CancellationPolicyPage.accordionCoachBody':
    'I professionisti dovrebbero cancellare sessioni confermate solo se strettamente necessario. In caso di cancellazione, devono informare il cliente il prima possibile e proporre un ripianificazione. Cancellazioni ripetute possono influire su ranking, visibilità, status Ambassador o accesso alla piattaforma PeakUp.',
  'CancellationPolicyPage.summaryCoachText':
    'I professionisti devono evitare cancellazioni e privilegiare il ripianificare quando possibile.',
  'CoachApplicationPage.coachingCertificatesRequired': 'Carica i documenti di certificazione.',
  'EmailVerificationForm.coachOnboardingSuccessButtonText': 'Continua candidatura',
  'EmailVerificationForm.coachOnboardingSuccessText':
    'Email verificata. Continua la tua candidatura professionale PeakUp.',
  'PeakUpCoachUserFields.coachCityTextHelp':
    'Etichetta breve su profilo e figurina — mantienila visiva e leggibile (es. Laax, Zermatt, Chamonix). Il pin mappa resta separato.',
  'PeakupCoachBadgesHierarchyModal.ambassadorBody':
    'Professionisti pionieri che aiutano a far crescere la community e la piattaforma PeakUp.',
  'PeakupCoachBadgesHierarchyModal.badgeButtonHint': 'Apri guida badge professionista PeakUp',
  'PeakupCoachBadgesHierarchyModal.certifiedBody':
    'Professionista verificato e qualificato con certificazioni riconosciute.',
  'PeakupCoachBadgesHierarchyModal.topCoachBody':
    'Professionista verificato con oltre 10 anni di esperienza certificata.',
  'ProfilePage.coachBioEmpty': 'Questo professionista non ha ancora aggiunto una bio.',
  'ProfilePage.coachInquiryEyebrow': 'Contatta',
  'ProfilePage.memberSavedCoachesHeading': 'Professionisti preferiti',
  'ProfilePage.memberSavedCoachesHint': 'I professionisti salvati compariranno qui.',
  'ProfilePage.stickerCoachLevelNew': 'Nuovo su PeakUp',
  'ProfilePage.stickerVerifiedCoachBadge': 'Professionista verificato',
  'TeamCoachRosterCard.tableCoach': 'Professionista',
  'TeamMapPopup.coachCount':
    '{count, plural, one {# professionista} other {# professionisti}}',
  'TeamProfilePage.coachCount':
    '{count, plural, one {# professionista collegato} other {# professionisti collegati}}',
  'TeamProfilePage.coachesKicker': 'I nostri professionisti',
  'TeamProfilePage.rosterEmpty': 'I professionisti compariranno qui quando si uniscono al team.',
  'TeamProfilePage.rosterEmptyTitle': 'Nessun professionista collegato',
  'TeamProfilePage.rosterError': 'Impossibile caricare i professionisti in questo momento.',
  'TeamProfilePage.rosterHeading': 'Conosci il team',
  'TeamProfilePage.rosterLead':
    'Prenota sessioni direttamente con i professionisti qui sotto. Ogni profilo include recensioni, prezzi e disponibilità.',
  'TeamProfilePage.rosterLoading': 'Caricamento professionisti…',
  'TeamProfilePage.sportsOfferedLead':
    'Sport e discipline che questo team offre tramite i suoi professionisti.',
  'TeamProfilePage.statCoaches': 'Professionisti',
  'TeamProfilePage.teamRatingFootnote':
    '{rating} valutazione media su {count, plural, one {# recensione} other {# recensioni}} dei nostri professionisti.',
  'TransactionPanel.peakUpConversation.coachSubtitle': 'Professionista',
  'TransactionPanel.peakUpMeetingPointMapHint': 'Dove incontri il professionista',
  'CoachApplicationPage.yearsExperienceLabel': 'Anni di esperienza professionale',
  'CoachApplicationPage.yearsExperienceRequired': 'Inserisci gli anni di esperienza professionale.',
  'CoachesPage.schemaTitle': 'Professionisti | {marketplaceName}',
  'CustomerDashboardPage.cardInboxHint': 'Conversazioni con i professionisti.',
  'FieldCoachMapLocation.label': 'Dove sei basato?',
  'FieldCoachMapLocation.placeholder': 'Cerca città, località o area di insegnamento…',
  'ProfilePage.stickerBadge_certified_coach': 'Professionista certificato',
  'ProfilePage.stickerBadge_top_coach': 'Top professionista',
  'CancellationPolicyPage.accordionCustomerBody':
    'I clienti possono cancellare secondo i tempi previsti. Oltre 7 giorni prima: rimborso completo possibile. Tra 48 ore e 7 giorni: rimborso parziale possibile. Meno di 48 ore: generalmente non rimborsabile salvo approvazione del professionista o PeakUp.',
  'CancellationPolicyPage.accordionForceMajeureBody':
    'Eventi eccezionali fuori dal controllo di cliente, professionista o PeakUp possono essere valutati singolarmente.',
  'CancellationPolicyPage.accordionNoShowBody':
    'Se il cliente non si presenta senza preavviso, la prenotazione è generalmente non rimborsabile. Se il professionista non si presenta senza motivo valido, PeakUp può rivedere il caso.',
  'CancellationPolicyPage.accordionReschedulingBody':
    'PeakUp incoraggia il ripianificare prima della cancellazione. Se cliente e professionista concordano una nuova data, la prenotazione può essere spostata senza rimborso.',
  'CancellationPolicyPage.accordionWeatherBody':
    'Molte attività PeakUp sono all’aperto. Se le condizioni rendono l’attività impossibile o pericolosa, professionista e cliente dovrebbero prima provare a ripianificare.',
  'CancellationPolicyPage.example2Result':
    'Normalmente non rimborsabile salvo approvazione del professionista o PeakUp.',
  'CancellationPolicyPage.example4Result':
    'Visibilità, ranking o accesso piattaforma del professionista possono essere rivisti.',
  'CancellationPolicyPage.example4Title': 'Il professionista cancella ripetutamente prenotazioni confermate.',
  'CancellationPolicyPage.schemaDescription':
    'Regole di cancellazione PeakUp per clienti e professionisti — flessibili, eque e trasparenti.',
  'CancellationPolicyPage.summaryCustomerBullet3':
    'Meno di 48 ore: nessun rimborso salvo approvazione del professionista o PeakUp',
  'CancellationPolicyPage.summaryWeatherBullet3':
    'Professionista e PeakUp possono valutare casi eccezionali',
};

const de = {
  'AddTeamCoachModal.addCoach': 'Profi hinzufügen',
  'AddTeamCoachModal.emailLabel': 'E-Mail des Profis',
  'AddTeamCoachModal.eyebrow': 'Team-Profis',
  'AddTeamCoachModal.inviteCoach': 'Profi einladen',
  'AddTeamCoachModal.lead':
    'Suche einen unabhängigen PeakUp-Profi. Er oder sie erhält eine Einladung und kann annehmen oder ablehnen.',
  'AddTeamCoachModal.noResults':
    'Kein passender PeakUp-Profi gefunden. Stelle sicher, dass bereits ein PeakUp-Profil existiert.',
  'AddTeamCoachModal.resultsLabel': 'Passende Profis',
  'AddTeamCoachModal.tabEmail': 'Profi-E-Mail',
  'AddTeamCoachModal.tabsLabel': 'Profi finden nach',
  'AddTeamCoachModal.title': 'Profi hinzufügen',
  'CoachMapPage.coachesSection': 'Zertifizierte Profis',
  'CoachMapPage.entity.coaches': 'Profis',
  'CoachMapPage.schemaTitle': 'Profikarte | {marketplaceName}',
  'CoachMapPage.title': 'Profikarte',
  'CoachCard.fallbackName': 'Profi',
  'CoachStickerCard.fallbackSport': 'Profi',
  'SectionPeakupFeaturedCoaches.titleCoach': 'Profis',
  'SectionPeakupFeaturedCoaches.titleFeatured': 'Empfohlene',
  'PreBookingIntroModal.title': 'Erzähle deinem Profi von deiner Session',
  'ProfilePage.trustTopbar.coachTitle': 'Profi',
  'TeamDashboardPage.statCoaches': 'Verbundene Profis',
  'CoachesPage.schemaTitle': 'Profis | {marketplaceName}',
  'CustomerDashboardPage.cardInboxHint': 'Konversationen mit Profis.',
  'ProfilePage.coachInquiryEyebrow': 'Kontakt',
  'SectionPeakupFeaturedCoaches.subtitle': 'Top-bewertete Profis aus unserer Community',
  'SectionPeakupFeaturedCoaches.empty': 'Noch keine empfohlenen Profis verfügbar.',
  'SectionPeakupFeaturedCoaches.errorTitle': 'Profis können gerade nicht geladen werden',
  'SectionPeakupFeaturedCoaches.regionLabel': 'Empfohlene PeakUp-Profis',
  'TeamProfilePage.rosterHeading': 'Lerne das Team kennen',
  'TeamProfilePage.rosterError': 'Profis konnten momentan nicht geladen werden.',
};

const coachTermFallback = {
  de: [
    [/\bCoaches\b/g, 'Profis'],
    [/\bCoach\b/g, 'Profi'],
    [/\bcoaches\b/g, 'Profis'],
    [/\bcoach\b/g, 'Profi'],
  ],
  fr: [
    [/\bCoaches\b/g, 'professionnels'],
    [/\bCoach\b/g, 'professionnel'],
    [/\bcoaches\b/g, 'professionnels'],
    [/\bcoach\b/g, 'professionnel'],
    [/\bcoachs\b/g, 'professionnels'],
  ],
  es: [
    [/\bCoaches\b/g, 'profesionales'],
    [/\bCoach\b/g, 'profesional'],
    [/\bcoaches\b/g, 'profesionales'],
    [/\bcoach\b/g, 'profesional'],
  ],
  pt: [
    [/\bCoaches\b/g, 'profissionais'],
    [/\bCoach\b/g, 'profissional'],
    [/\bcoaches\b/g, 'profissionais'],
    [/\bcoach\b/g, 'profissional'],
  ],
};

const fr = {
  'AddTeamCoachModal.addCoach': 'Ajouter un professionnel',
  'AddTeamCoachModal.eyebrow': 'Professionnels de l’équipe',
  'AddTeamCoachModal.inviteCoach': 'Inviter un professionnel',
  'AddTeamCoachModal.title': 'Ajouter un professionnel',
  'CoachMapPage.coachesSection': 'Professionnels certifiés',
  'CoachMapPage.entity.coaches': 'Professionnels',
  'CoachMapPage.schemaTitle': 'Carte des professionnels | {marketplaceName}',
  'CoachMapPage.title': 'Carte des professionnels',
  'CoachCard.fallbackName': 'Professionnel',
  'SectionPeakupFeaturedCoaches.titleCoach': 'Professionnels',
  'SectionPeakupFeaturedCoaches.titleFeatured': 'À la une',
  'PreBookingIntroModal.title': 'Parlez de votre séance au professionnel',
  'ProfilePage.trustTopbar.coachTitle': 'Professionnel',
  'TeamDashboardPage.statCoaches': 'Professionnels connectés',
  'CoachesPage.schemaTitle': 'Professionnels | {marketplaceName}',
  'CustomerDashboardPage.cardInboxHint': 'Fils de conversation avec les professionnels.',
  'ProfilePage.coachInquiryEyebrow': 'Contacter',
  'SectionPeakupFeaturedCoaches.subtitle': 'Les professionnels les mieux notés par notre communauté',
  'TeamProfilePage.rosterHeading': 'Découvrez l’équipe',
};

const es = {
  'AddTeamCoachModal.addCoach': 'Añadir profesional',
  'AddTeamCoachModal.eyebrow': 'Profesionales del equipo',
  'AddTeamCoachModal.inviteCoach': 'Invitar profesional',
  'AddTeamCoachModal.title': 'Añadir un profesional',
  'CoachMapPage.coachesSection': 'Profesionales certificados',
  'CoachMapPage.entity.coaches': 'Profesionales',
  'CoachMapPage.schemaTitle': 'Mapa de profesionales | {marketplaceName}',
  'CoachMapPage.title': 'Mapa de profesionales',
  'CoachCard.fallbackName': 'Profesional',
  'SectionPeakupFeaturedCoaches.titleCoach': 'Profesionales',
  'SectionPeakupFeaturedCoaches.titleFeatured': 'Destacados',
  'PreBookingIntroModal.title': 'Cuéntale al profesional sobre tu sesión',
  'ProfilePage.trustTopbar.coachTitle': 'Profesional',
  'TeamDashboardPage.statCoaches': 'Profesionales conectados',
  'CoachesPage.schemaTitle': 'Profesionales | {marketplaceName}',
  'CustomerDashboardPage.cardInboxHint': 'Hilos de conversación con profesionales.',
  'ProfilePage.coachInquiryEyebrow': 'Contactar',
  'SectionPeakupFeaturedCoaches.subtitle': 'Profesionales mejor valorados por nuestra comunidad',
  'TeamProfilePage.rosterHeading': 'Conoce al equipo',
};

const pt = {
  'AddTeamCoachModal.addCoach': 'Adicionar profissional',
  'AddTeamCoachModal.eyebrow': 'Profissionais da equipa',
  'AddTeamCoachModal.inviteCoach': 'Convidar profissional',
  'AddTeamCoachModal.title': 'Adicionar profissional',
  'CoachMapPage.coachesSection': 'Profissionais certificados',
  'CoachMapPage.entity.coaches': 'Profissionais',
  'CoachMapPage.schemaTitle': 'Mapa de profissionais | {marketplaceName}',
  'CoachMapPage.title': 'Mapa de profissionais',
  'CoachCard.fallbackName': 'Profissional',
  'SectionPeakupFeaturedCoaches.titleCoach': 'Profissionais',
  'SectionPeakupFeaturedCoaches.titleFeatured': 'Em destaque',
  'PreBookingIntroModal.title': 'Fala ao profissional sobre a tua sessão',
  'ProfilePage.trustTopbar.coachTitle': 'Profissional',
  'TeamDashboardPage.statCoaches': 'Profissionais ligados',
  'CoachesPage.schemaTitle': 'Profissionais | {marketplaceName}',
  'CustomerDashboardPage.cardInboxHint': 'Conversas com profissionais.',
  'ProfilePage.coachInquiryEyebrow': 'Contactar',
  'SectionPeakupFeaturedCoaches.subtitle': 'Profissionais mais bem avaliados pela nossa comunidade',
  'TeamProfilePage.rosterHeading': 'Conhece a equipa',
};

const localePatches = { en, it, de, fr, es, pt };

const applyCoachTermFallback = (value, locale) => {
  const rules = coachTermFallback[locale];
  if (!rules || typeof value !== 'string') {
    return value;
  }
  return rules.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
};

['en', 'it', 'de', 'fr', 'es', 'pt'].forEach(locale => {
  const filePath = path.join(translationsDir, `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const patch = localePatches[locale];
  const enKeys = Object.keys(en);
  let updated = 0;

  enKeys.forEach(key => {
    if (data[key] === undefined) {
      return;
    }
    if (patch[key] !== undefined) {
      data[key] = patch[key];
      updated += 1;
      return;
    }
    if (locale !== 'en' && locale !== 'it') {
      const next = applyCoachTermFallback(data[key], locale);
      if (next !== data[key]) {
        data[key] = next;
        updated += 1;
      }
    }
  });

  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Updated ${locale}.json (${updated} keys changed)`);
});
