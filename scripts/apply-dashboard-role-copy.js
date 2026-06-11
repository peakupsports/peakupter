/**
 * Remove redundant role labels (coach, professional account) from logged-in product UI.
 * Marketing surfaces are unchanged. Run: node scripts/apply-dashboard-role-copy.js
 */
const fs = require('fs');
const path = require('path');

const translationsDir = path.join(__dirname, '../src/translations');

const sharedEn = {
  'CoachCalendarPage.blockConflictReliabilityWarning':
    'Frequent cancellations may impact your reliability status.',
  'CoachCalendarPage.cancelEventReliabilityWarning':
    'Frequent cancellations may impact your reliability status.',
  'CoachCalendarPage.heading': 'Calendar',
  'CoachCalendarPage.title': 'Calendar',
  'CoachDashboardBookingsPage.backToDashboard': '← Back to dashboard',
  'CoachDashboardEventsPage.backToDashboard': '← Back to dashboard',
  'CoachDashboardPage.eyebrow': 'Dashboard',
  'CoachDashboardPage.heroNameFallback': '',
  'CoachDashboardPage.schemaDescription':
    'Your PeakUp home for profile, listings, calendar, and bookings.',
  'CoachDashboardPage.schemaTitle': 'Dashboard | {marketplaceName}',
  'CoachDashboardPage.toolsAria': 'Profile and listings',
  'CoachEarningsPage.ctaCoachLevels': 'Learn about levels',
  'CoachEarningsPage.earningsCoachLabel': 'You receive',
  'CoachEarningsPage.growBullet2': 'Unlock higher levels',
  'CoachEarningsPage.providesItem1': 'Premium profile',
  'CoachEarningsPage.providesItem4': 'Verified professional network',
  'CoachEarningsPage.schemaDescription':
    'Transparent commission and earnings on PeakUp — 9% platform fee, no subscriptions, no hidden charges.',
  'CoachEarningsPage.schemaTitle': 'Earnings & commission | {marketplaceName}',
  'CoachEarningsPage.title': 'Earnings',
  'EditListingAvailabilityPanel.coachCalendarBootstrapFailed':
    'Could not sync availability from Calendar. Open Calendar, save your blocks, and try again.',
  'EditListingAvailabilityPanel.coachCalendarBridgeHelper':
    'Your calendar manages day-to-day availability. A default schedule is created automatically when you return so you can continue this listing.',
  'EditListingAvailabilityPanel.coachCalendarConnected': 'Calendar connected ✓',
  'EditListingAvailabilityPanel.coachCalendarControlsHelper':
    'Your PeakUp calendar controls your bookable availability. Open Calendar to block days or times, then return here to continue.',
  'EditListingAvailabilityPanel.coachCalendarEntryTitle': 'PeakUp Calendar',
  'EditListingAvailabilityPanel.coachCalendarHelper':
    'Manage your global availability from PeakUp Calendar. Block full days or specific time ranges and keep your booking schedule organised.',
  'EditListingAvailabilityPanel.legacyScheduleHint':
    'Sharetribe still uses a weekly default schedule for this listing. Set a minimal plan below to continue this wizard step; day-to-day availability is managed in Calendar.',
  'EditListingAvailabilityPanel.openCoachCalendar': 'Open Calendar',
  'EditListingDetailsForm.incompatibleCurrency':
    '{marketplaceName} supports listings in {supportedCurrencies}. Your selected currency ({currency}) is not allowed. Please update the currency in your profile and try again.',
  'EditListingPricingAndStockPanel.listingPriceCurrencyInvalid':
    'The listing currency ({currency}) is not supported. Allowed currencies: {supportedCurrencies}. Update your profile currency to continue.',
  'EditListingPricingForm.coachProfileCurrencyHint': 'Currency: {currency} from your profile',
  'EditListingPricingPanel.listingPriceCurrencyInvalid':
    'The listing currency ({currency}) is not supported. Allowed currencies: {supportedCurrencies}. Update your profile currency to continue.',
  'ManageListingsPage.createServiceCTASubtext': 'Add a new service',
  'PartnerDashboardPage.cardCoachHubTitle': 'Your hub',
  'ProfileSettingsForm.coachLanguagesLabel': 'Languages you speak',
  'ProfileSettingsForm.coachLocationOnlyInfo':
    "Tell us where you are based. We use the place to position your map pin and to show a short, premium label on your public profile (e.g. Laax, St. Moritz).",
  'ProfileSettingsForm.coachLocationSectionInfo':
    "Tell us where you are based. We use the place to position your map pin and to show a short, premium label on your public profile (e.g. Laax, St. Moritz).",
  'ProfileSettingsForm.coachProfileHeading': 'Services & pricing',
  'ProfileSettingsForm.coachProfileInfo':
    'Session price, city or area label, and map pin appear on your profile.',
  'ProfileSettingsForm.coachSessionPriceInfo':
    'Choose currency and typical hourly rate. Shown on your profile.',
  'ProfileSettingsForm.coachSportsLabel': 'Your sports',
  'ProfileSettingsForm.preferredMeetingPointsInfo':
    'Save named meetup spots for clients. Give each a name, set an exact pin on the map, and add optional notes. Coordinates come only from the pin — your location above covers the general area.',
  'ProfileSettingsPage.pageLabel': 'Your PeakUp Profile',
  'ProfileSettingsPage.pageSubtitle':
    'Complete your profile and showcase your experience.',
  'ReferralCenterPage.criteriaCancellations': 'Your cancellations: MAX 0',
  'ReferralCenterPage.progressCancellations': 'Your cancellations',
  'TeamInvitationInboxPage.dashboardCta': 'Open dashboard',
  'TopbarDesktop.returnToCoachDashboardLink': 'Return to dashboard',
  'TopbarMobileMenu.returnToCoachDashboardLink': 'Return to dashboard',
  'AmbassadorProgramPage.mockNote':
    "You'll be able to track your Ambassador status and progress directly from your profile.",
  'AmbassadorProgramPage.faqPaidAnswer':
    'Ambassador earnings are settled on a regular payout cycle alongside your payouts, once referred bookings are completed.',
  'AmbassadorActivationModal.loginBody':
    'Sign in with your verified account to activate the Ambassador Program.',
  'AmbassadorActivationModal.notVerifiedBody':
    'Ambassador Program access is available only for verified PeakUp professionals.',
  'AmbassadorActivationModal.notVerifiedTitle': 'Verified professionals only',
  'ReferralCenterPage.rewardHistoryCoachPayout': 'Payout',
  'ReferralCenterPage.rewardsFlowHint':
    'Client payment → Stripe → PeakUp fee → Payout → Ambassador %',
  'ReferralCenterPage.nextLevelBody':
    'Progress through referrals, quality, and community impact to unlock the next tier.',
};

const localePatches = {
  en: sharedEn,
  it: {
    ...sharedEn,
    'CoachCalendarPage.heading': 'Calendario',
    'CoachCalendarPage.title': 'Calendario',
    'CoachDashboardBookingsPage.backToDashboard': '← Torna alla dashboard',
    'CoachDashboardEventsPage.backToDashboard': '← Torna alla dashboard',
    'CoachDashboardPage.eyebrow': 'Dashboard',
    'CoachDashboardPage.schemaDescription':
      'Il tuo spazio PeakUp per profilo, annunci, calendario e prenotazioni.',
    'CoachDashboardPage.schemaTitle': 'Dashboard | {marketplaceName}',
    'CoachDashboardPage.toolsAria': 'Profilo e annunci',
    'CoachEarningsPage.ctaCoachLevels': 'Scopri i livelli',
    'CoachEarningsPage.earningsCoachLabel': 'Ricevi',
    'CoachEarningsPage.growBullet2': 'Sblocca livelli superiori',
    'CoachEarningsPage.providesItem1': 'Profilo premium',
    'CoachEarningsPage.providesItem4': 'Rete di professionisti verificati',
    'CoachEarningsPage.schemaDescription':
      'Commissioni e guadagni trasparenti su PeakUp — 9% di commissione, nessun abbonamento, nessun costo nascosto.',
    'CoachEarningsPage.schemaTitle': 'Guadagni e commissioni | {marketplaceName}',
    'CoachEarningsPage.title': 'Guadagni',
    'EditListingAvailabilityPanel.coachCalendarBootstrapFailed':
      'Impossibile sincronizzare dal Calendario. Apri il Calendario, salva i blocchi e riprova.',
    'EditListingAvailabilityPanel.coachCalendarBridgeHelper':
      'Il calendario gestisce la disponibilità quotidiana. Al ritorno viene creato un programma predefinito per continuare con l’annuncio.',
    'EditListingAvailabilityPanel.coachCalendarConnected': 'Calendario collegato ✓',
    'EditListingAvailabilityPanel.coachCalendarControlsHelper':
      'Il calendario PeakUp controlla la disponibilità prenotabile. Apri il Calendario per bloccare giorni o orari, poi torna qui.',
    'EditListingAvailabilityPanel.coachCalendarEntryTitle': 'Calendario PeakUp',
    'EditListingAvailabilityPanel.coachCalendarHelper':
      'Gestisci la disponibilità globale dal Calendario PeakUp. Blocca giorni interi o fasce orarie e organizza le prenotazioni.',
    'EditListingAvailabilityPanel.legacyScheduleHint':
      'Sharetribe usa ancora un programma settimanale predefinito per questo annuncio. Imposta un piano minimo qui sotto; la disponibilità quotidiana si gestisce nel Calendario.',
    'EditListingAvailabilityPanel.openCoachCalendar': 'Apri Calendario',
    'EditListingDetailsForm.incompatibleCurrency':
      '{marketplaceName} supporta annunci in {supportedCurrencies}. La valuta selezionata ({currency}) non è consentita. Aggiorna la valuta nel profilo e riprova.',
    'EditListingPricingAndStockPanel.listingPriceCurrencyInvalid':
      'La valuta dell’annuncio ({currency}) non è supportata. Valute consentite: {supportedCurrencies}. Aggiorna la valuta del profilo per continuare.',
    'EditListingPricingForm.coachProfileCurrencyHint': 'Valuta: {currency} dal tuo profilo',
    'EditListingPricingPanel.listingPriceCurrencyInvalid':
      'La valuta dell’annuncio ({currency}) non è supportata. Valute consentite: {supportedCurrencies}. Aggiorna la valuta del profilo per continuare.',
    'ManageListingsPage.createServiceCTASubtext': 'Aggiungi un nuovo servizio',
    'PartnerDashboardPage.cardCoachHubTitle': 'Il tuo hub',
    'ProfileSettingsForm.coachLanguagesLabel': 'Lingue parlate',
    'ProfileSettingsForm.coachLocationOnlyInfo':
      'Indica dove sei basato. Usiamo il luogo per il pin sulla mappa e un’etichetta breve sul profilo pubblico (es. Laax, St. Moritz).',
    'ProfileSettingsForm.coachLocationSectionInfo':
      'Indica dove sei basato. Usiamo il luogo per il pin sulla mappa e un’etichetta breve sul profilo pubblico (es. Laax, St. Moritz).',
    'ProfileSettingsForm.coachProfileHeading': 'Servizi e prezzi',
    'ProfileSettingsForm.coachProfileInfo':
      'Prezzo sessione, città o area e pin mappa compaiono sul tuo profilo.',
    'ProfileSettingsForm.coachSessionPriceInfo':
      'Scegli valuta e tariffa oraria tipica. Visibile sul tuo profilo.',
    'ProfileSettingsForm.coachSportsLabel': 'I tuoi sport',
    'ProfileSettingsForm.preferredMeetingPointsInfo':
      'Salva punti di incontro per i clienti. Assegna un nome, imposta il pin sulla mappa e aggiungi note opzionali. Le coordinate vengono solo dal pin — la posizione sopra copre l’area generale.',
    'ProfileSettingsPage.pageLabel': 'Il tuo profilo PeakUp',
    'ProfileSettingsPage.pageSubtitle':
      'Completa il profilo e metti in risalto la tua esperienza.',
    'ReferralCenterPage.criteriaCancellations': 'Le tue cancellazioni: MAX 0',
    'ReferralCenterPage.progressCancellations': 'Le tue cancellazioni',
    'TeamInvitationInboxPage.dashboardCta': 'Apri dashboard',
    'TopbarDesktop.returnToCoachDashboardLink': 'Torna alla dashboard',
    'TopbarMobileMenu.returnToCoachDashboardLink': 'Torna alla dashboard',
    'AmbassadorProgramPage.mockNote':
      'Potrai seguire lo stato Ambassador e i progressi direttamente dal tuo profilo.',
    'AmbassadorProgramPage.faqPaidAnswer':
      'I guadagni Ambassador vengono accreditati insieme ai tuoi pagamenti, dopo il completamento delle prenotazioni segnalate.',
    'AmbassadorActivationModal.loginBody':
      'Accedi con il tuo account verificato per attivare il programma Ambassador.',
    'AmbassadorActivationModal.notVerifiedBody':
      'Il programma Ambassador è disponibile solo per professionisti PeakUp verificati.',
    'AmbassadorActivationModal.notVerifiedTitle': 'Solo professionisti verificati',
    'ReferralCenterPage.rewardHistoryCoachPayout': 'Pagamento',
    'ReferralCenterPage.rewardsFlowHint':
      'Pagamento cliente → Stripe → commissione PeakUp → pagamento → % Ambassador',
    'ReferralCenterPage.nextLevelBody':
      'Avanza con referral, qualità e impatto sulla community per sbloccare il livello successivo.',
    'CoachCalendarPage.blockConflictReliabilityWarning':
      'Cancellazioni frequenti possono influire sul tuo stato di affidabilità.',
    'CoachCalendarPage.cancelEventReliabilityWarning':
      'Cancellazioni frequenti possono influire sul tuo stato di affidabilità.',
  },
  de: {
    ...sharedEn,
    'CoachCalendarPage.heading': 'Kalender',
    'CoachCalendarPage.title': 'Kalender',
    'CoachDashboardPage.eyebrow': 'Dashboard',
    'CoachDashboardPage.schemaTitle': 'Dashboard | {marketplaceName}',
    'CoachEarningsPage.title': 'Einnahmen',
    'ProfileSettingsPage.pageLabel': 'Dein PeakUp-Profil',
    'ProfileSettingsPage.pageSubtitle':
      'Vervollständige dein Profil und präsentiere deine Erfahrung.',
    'EditListingAvailabilityPanel.openCoachCalendar': 'Kalender öffnen',
    'EditListingAvailabilityPanel.coachCalendarEntryTitle': 'PeakUp-Kalender',
    'TopbarDesktop.returnToCoachDashboardLink': 'Zurück zum Dashboard',
    'TopbarMobileMenu.returnToCoachDashboardLink': 'Zurück zum Dashboard',
  },
  fr: {
    ...sharedEn,
    'CoachCalendarPage.heading': 'Calendrier',
    'CoachCalendarPage.title': 'Calendrier',
    'CoachDashboardPage.eyebrow': 'Tableau de bord',
    'CoachDashboardPage.schemaTitle': 'Tableau de bord | {marketplaceName}',
    'CoachEarningsPage.title': 'Revenus',
    'ProfileSettingsPage.pageLabel': 'Votre profil PeakUp',
    'ProfileSettingsPage.pageSubtitle':
      'Complétez votre profil et mettez en valeur votre expérience.',
    'EditListingAvailabilityPanel.openCoachCalendar': 'Ouvrir le calendrier',
    'EditListingAvailabilityPanel.coachCalendarEntryTitle': 'Calendrier PeakUp',
    'TopbarDesktop.returnToCoachDashboardLink': 'Retour au tableau de bord',
    'TopbarMobileMenu.returnToCoachDashboardLink': 'Retour au tableau de bord',
  },
  es: {
    ...sharedEn,
    'CoachCalendarPage.heading': 'Calendario',
    'CoachCalendarPage.title': 'Calendario',
    'CoachDashboardPage.eyebrow': 'Panel',
    'CoachDashboardPage.schemaTitle': 'Panel | {marketplaceName}',
    'CoachEarningsPage.title': 'Ingresos',
    'ProfileSettingsPage.pageLabel': 'Tu perfil PeakUp',
    'ProfileSettingsPage.pageSubtitle':
      'Completa tu perfil y muestra tu experiencia.',
    'EditListingAvailabilityPanel.openCoachCalendar': 'Abrir calendario',
    'EditListingAvailabilityPanel.coachCalendarEntryTitle': 'Calendario PeakUp',
    'TopbarDesktop.returnToCoachDashboardLink': 'Volver al panel',
    'TopbarMobileMenu.returnToCoachDashboardLink': 'Volver al panel',
  },
  pt: {
    ...sharedEn,
    'CoachCalendarPage.heading': 'Calendário',
    'CoachCalendarPage.title': 'Calendário',
    'CoachDashboardPage.eyebrow': 'Painel',
    'CoachDashboardPage.schemaTitle': 'Painel | {marketplaceName}',
    'CoachEarningsPage.title': 'Ganhos',
    'ProfileSettingsPage.pageLabel': 'O teu perfil PeakUp',
    'ProfileSettingsPage.pageSubtitle':
      'Completa o perfil e mostra a tua experiência.',
    'EditListingAvailabilityPanel.openCoachCalendar': 'Abrir calendário',
    'EditListingAvailabilityPanel.coachCalendarEntryTitle': 'Calendário PeakUp',
    'TopbarDesktop.returnToCoachDashboardLink': 'Voltar ao painel',
    'TopbarMobileMenu.returnToCoachDashboardLink': 'Voltar ao painel',
  },
};

['en', 'it', 'de', 'fr', 'es', 'pt'].forEach(locale => {
  const filePath = path.join(translationsDir, `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  Object.entries(localePatches[locale] || {}).forEach(([key, value]) => {
    data[key] = value;
  });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Updated ${locale}.json`);
});
