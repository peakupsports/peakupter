/**
 * Ambassador Program: coach → professional terminology (all locales).
 * Run: node scripts/apply-ambassador-professional-terminology.js
 */
const fs = require('fs');
const path = require('path');

const translationsDir = path.join(__dirname, '../src/translations');

const patches = {
  en: {
    'AmbassadorActivationModal.lead':
      'A lightweight onboarding for verified PeakUp professionals — activate your Bronze tier, get your referral code, and start growing the community.',
    'AmbassadorActivationModal.sectionExpectationsBody':
      'Represent PeakUp with quality service, responsive communication, and professionals you would trust on your own roster.',
    'AmbassadorActivationModal.sectionReferralBody':
      'Share your personal referral code when inviting professionals. When they join and start earning, you unlock ambassador rewards tied to their activity.',
    'AmbassadorActivationModal.sectionRewardsBody':
      'Earn recurring ambassador rewards from referred professional platform revenue, unlock tier perks, and access reduced platform fees as you progress.',
    'AmbassadorActivationModal.sectionTiersBody':
      'You start at Bronze. Progress through Silver, Gold, Platinum, and Diamond by growing referrals, professional quality, and community impact.',
    'AmbassadorProgramPage.ambassadorsEmpty':
      'Ambassador profiles will appear here as professionals join the program.',
    'AmbassadorProgramPage.criteriaReferralsTarget': 'Target: 5 active referred professionals',
    'AmbassadorProgramPage.earningsClarification':
      "Ambassador rewards are calculated from the professional's net payout after PeakUp platform fees — not from the full booking amount.",
    'AmbassadorProgramPage.earningsPayoutLabel': 'Net payout',
    'AmbassadorProgramPage.earningsRewardMicro': 'Recurring reward from referred professional activity.',
    'AmbassadorProgramPage.earningsStepPayoutCaption': 'Professional earnings',
    'AmbassadorProgramPage.faqAutomaticAnswer':
      'Not automatically. You qualify through consistent professional performance, community impact, and referral activity. PeakUp reviews ambassadors periodically.',
    'AmbassadorProgramPage.faqReferralsAnswer':
      'Share your unique Ambassador Code when inviting professionals. When they join, complete onboarding, and start earning, you qualify for ambassador rewards tied to their activity.',
    'AmbassadorProgramPage.heroHighlightCommunityText':
      'Bring talented professionals into the PeakUp network.',
    'AmbassadorProgramPage.levelPopup.benefits.commissionDesc':
      'Recurring rewards on referred professional platform revenue.',
    'AmbassadorProgramPage.levelPopup.bronze.benefits.1': '2% commission on referred professionals',
    'AmbassadorProgramPage.levelPopup.commissionNote':
      "Commission is calculated from PeakUp net platform revenue after platform and transaction fees — not from the professional's full session price.",
    'AmbassadorProgramPage.levelPopup.criteria.cancellations': 'Cancellations',
    'AmbassadorProgramPage.levelPopup.criteria.referrals': 'Referrals (professional)',
    'AmbassadorProgramPage.levelPopup.gold.benefits.1': '4% commission on referred professionals',
    'AmbassadorProgramPage.levelPopup.platinum.benefits.1':
      '5% top referral rewards on referred professionals',
    'AmbassadorProgramPage.levelPopup.silver.benefits.1': '3% commission on referred professionals',
    'AmbassadorProgramPage.levelPopup.silver.benefits.4':
      'Featured placement in professional directories',
    'AmbassadorProgramPage.reward1': 'Earn commission on referred professionals’ bookings',
    'AmbassadorProgramPage.reward4': 'Featured priority in professional directories',
    'AmbassadorProgramPage.schemaDescription':
      'Join the PeakUp Ambassador Program — grow the professional community, earn rewards, and unlock recognition.',
    'AmbassadorProgramPage.step2Text':
      'Share your code with professionals who want to grow their business on PeakUp.',
    'AmbassadorProgramPage.step2Title': 'Invite professionals',
    'AmbassadorProgramPage.step3Text':
      'They complete onboarding, publish listings, and start earning.',
    'ReferralCenterPage.activityCoachActive': 'Professional became active',
    'ReferralCenterPage.activityCoachApplied': 'New professional application',
    'ReferralCenterPage.activityCoachVerified': 'Professional verified',
    'ReferralCenterPage.activityEmpty':
      'Your referral timeline will appear here as professionals join and grow.',
    'ReferralCenterPage.criteriaCancellations': 'Cancellations: MAX 0',
    'ReferralCenterPage.criteriaReferrals': 'Referrals: MIN 5 professionals',
    'ReferralCenterPage.emptyTitle': 'No referred professionals yet.',
    'ReferralCenterPage.founderRewardsUnlockedLead':
      'You earn {percent} on every referred professional booking — Founder tier (Diamond) commission is active.',
    'ReferralCenterPage.inactiveBody':
      'Activate your Ambassador status to unlock your referral code, track invited professionals, and monitor reward progression.',
    'ReferralCenterPage.lead':
      'Track your referral code, invited professionals, onboarding status, active referrals, and ambassador rewards progression.',
    'ReferralCenterPage.nextTierReq1': 'Earn 5+ verified professional referrals',
    'ReferralCenterPage.progressCancellations': 'Cancellations',
    'ReferralCenterPage.progressReferralsTarget': 'Min. 5 professionals',
    'ReferralCenterPage.referralCodeHint':
      'Share your code when inviting professionals to join PeakUp.',
    'ReferralCenterPage.referralsTitle': 'Referred professionals',
    'ReferralCenterPage.rewardHistoryCoach': 'Referred professional',
    'ReferralCenterPage.rewardHistoryEmpty':
      'Reward entries appear here when referred professionals complete paid bookings.',
    'ReferralCenterPage.schemaDescription':
      'Track invited professionals, referral codes, onboarding progress, and ambassador rewards on PeakUp.',
    'ReferralCenterPage.statActive': 'Active referred professionals',
    'ReferralCenterPage.statInvited': 'Invited professionals',
    'ReferralCenterPage.statusActiveCoach': 'Active professional',
    'ReferralCenterPage.tableCoach': 'Professional',
  },
  it: {
    'AmbassadorActivationModal.lead':
      'Onboarding leggero per professionisti PeakUp verificati — attiva il livello Bronze, ottieni il tuo codice referral e inizia a far crescere la community.',
    'AmbassadorActivationModal.sectionExpectationsBody':
      'Rappresenta PeakUp con servizio di qualità, comunicazione reattiva e professionisti di cui ti fideresti nel tuo team.',
    'AmbassadorActivationModal.sectionReferralBody':
      'Condividi il tuo codice referral personale quando inviti professionisti. Quando si iscrivono e iniziano a guadagnare, sblocchi i premi Ambassador legati alla loro attività.',
    'AmbassadorActivationModal.sectionRewardsBody':
      'Guadagna premi Ambassador ricorrenti dai ricavi piattaforma dei professionisti referral, sblocca vantaggi di livello e accedi a commissioni ridotte man mano che avanzi.',
    'AmbassadorActivationModal.sectionTiersBody':
      'Parti da Bronze. Avanza verso Silver, Gold, Platinum e Diamond crescendo referral, qualità professionale e impatto nella community.',
    'AmbassadorProgramPage.ambassadorsEmpty':
      'I profili Ambassador compariranno qui man mano che i professionisti si uniscono al programma.',
    'AmbassadorProgramPage.criteriaReferralsTarget': 'Obiettivo: 5 referral di professionisti attivi',
    'AmbassadorProgramPage.earningsClarification':
      'I premi Ambassador vengono calcolati dal compenso netto del professionista al netto delle commissioni PeakUp, non dall’intero importo della prenotazione.',
    'AmbassadorProgramPage.earningsPayoutLabel': 'Payout netto',
    'AmbassadorProgramPage.earningsRewardMicro':
      'Ricompensa ricorrente dall’attività dei professionisti referral.',
    'AmbassadorProgramPage.earningsStepPayoutCaption': 'Guadagni del professionista',
    'AmbassadorProgramPage.faqAutomaticAnswer':
      'Non automaticamente. Ti qualifichi grazie a prestazioni professionali costanti, impatto nella community e attività referral. PeakUp revisiona periodicamente gli Ambassador.',
    'AmbassadorProgramPage.faqReferralsAnswer':
      'Condividi il tuo codice Ambassador univoco quando inviti professionisti. Quando si iscrivono, completano l’onboarding e iniziano a guadagnare, ottieni premi Ambassador legati alla loro attività.',
    'AmbassadorProgramPage.heroHighlightCommunityText':
      'Porta professionisti di talento nella rete PeakUp.',
    'AmbassadorProgramPage.levelPopup.benefits.commissionDesc':
      'Premi ricorrenti sui ricavi piattaforma dei professionisti referral.',
    'AmbassadorProgramPage.levelPopup.bronze.benefits.1':
      'Commissione del 2% sui professionisti referral',
    'AmbassadorProgramPage.levelPopup.commissionNote':
      'La commissione è calcolata sui ricavi netti PeakUp dopo commissioni di piattaforma e transazione — non sul prezzo pieno della sessione del professionista.',
    'AmbassadorProgramPage.levelPopup.criteria.cancellations': 'Cancellazioni',
    'AmbassadorProgramPage.levelPopup.criteria.referrals': 'Referral (professionista)',
    'AmbassadorProgramPage.levelPopup.gold.benefits.1':
      'Commissione del 4% sui professionisti referral',
    'AmbassadorProgramPage.levelPopup.platinum.benefits.1':
      '5% di premi referral top sui professionisti referral',
    'AmbassadorProgramPage.levelPopup.silver.benefits.1':
      'Commissione del 3% sui professionisti referral',
    'AmbassadorProgramPage.levelPopup.silver.benefits.4':
      'Posizionamento in evidenza nelle directory dei professionisti',
    'AmbassadorProgramPage.reward1':
      'Guadagna commissioni sulle prenotazioni dei professionisti referral',
    'AmbassadorProgramPage.reward4':
      'Priorità in evidenza nelle directory dei professionisti',
    'AmbassadorProgramPage.schemaDescription':
      'Unisciti al programma Ambassador PeakUp — fai crescere la community di professionisti, guadagna premi e ottieni riconoscimento.',
    'AmbassadorProgramPage.step2Text':
      'Condividi il tuo codice con professionisti che vogliono far crescere la propria attività su PeakUp.',
    'AmbassadorProgramPage.step2Title': 'Invita professionisti',
    'AmbassadorProgramPage.step3Text':
      'Completano l’onboarding, pubblicano annunci e iniziano a guadagnare.',
    'ReferralCenterPage.activityCoachActive': 'Professionista attivo',
    'ReferralCenterPage.activityCoachApplied': 'Nuova candidatura professionista',
    'ReferralCenterPage.activityCoachVerified': 'Professionista verificato',
    'ReferralCenterPage.activityEmpty':
      'La timeline referral comparirà qui man mano che i professionisti si uniscono e crescono.',
    'ReferralCenterPage.criteriaCancellations': 'Cancellazioni: MAX 0',
    'ReferralCenterPage.criteriaReferrals': 'Referral: MIN 5 professionisti',
    'ReferralCenterPage.emptyTitle': 'Nessun professionista referral ancora.',
    'ReferralCenterPage.founderRewardsUnlockedLead':
      'Guadagni {percent} su ogni prenotazione dei professionisti referral — la commissione Founder (Diamond) è attiva.',
    'ReferralCenterPage.inactiveBody':
      'Attiva il tuo status Ambassador per sbloccare il codice referral, monitorare i professionisti invitati e seguire i progressi dei premi.',
    'ReferralCenterPage.lead':
      'Monitora codice referral, professionisti invitati, stato onboarding, referral attivi e progressione premi Ambassador.',
    'ReferralCenterPage.nextTierReq1': 'Ottieni 5+ referral di professionisti verificati',
    'ReferralCenterPage.progressCancellations': 'Cancellazioni',
    'ReferralCenterPage.progressReferralsTarget': 'Min. 5 professionisti',
    'ReferralCenterPage.referralCodeHint':
      'Condividi il tuo codice quando inviti professionisti su PeakUp.',
    'ReferralCenterPage.referralsTitle': 'Professionisti referral',
    'ReferralCenterPage.rewardHistoryCoach': 'Professionista referral',
    'ReferralCenterPage.rewardHistoryEmpty':
      'Le voci premio compariranno qui quando i professionisti referral completano prenotazioni pagate.',
    'ReferralCenterPage.schemaDescription':
      'Monitora professionisti invitati, codici referral, progresso onboarding e premi Ambassador su PeakUp.',
    'ReferralCenterPage.statActive': 'Professionisti referral attivi',
    'ReferralCenterPage.statInvited': 'Professionisti invitati',
    'ReferralCenterPage.statusActiveCoach': 'Professionista attivo',
    'ReferralCenterPage.tableCoach': 'Professionista',
  },
  de: {
    'AmbassadorActivationModal.lead':
      'Leichtes Onboarding für verifizierte PeakUp-Profis — aktiviere Bronze, erhalte deinen Referral-Code und wachse mit der Community.',
    'AmbassadorActivationModal.sectionExpectationsBody':
      'Vertrete PeakUp mit Qualität, schneller Kommunikation und Profis, denen du in deinem Netzwerk vertrauen würdest.',
    'AmbassadorActivationModal.sectionReferralBody':
      'Teile deinen persönlichen Referral-Code, wenn du Fachkräfte einlädst. Wenn sie beitreten und verdienen, schaltest du Ambassador-Belohnungen frei.',
    'AmbassadorActivationModal.sectionRewardsBody':
      'Verdiene wiederkehrende Ambassador-Belohnungen aus den Plattform-Einnahmen empfohlener Profis, schalte Stufen-Vorteile frei und reduziere Gebühren.',
    'AmbassadorActivationModal.sectionTiersBody':
      'Du startest bei Bronze. Steige über Silver, Gold, Platinum und Diamond auf — durch Referrals, Profi-Qualität und Community-Impact.',
    'AmbassadorProgramPage.ambassadorsEmpty':
      'Ambassador-Profile erscheinen hier, sobald Profis dem Programm beitreten.',
    'AmbassadorProgramPage.criteriaReferralsTarget': 'Ziel: 5 aktive empfohlene Profis',
    'AmbassadorProgramPage.earningsClarification':
      'Ambassador-Belohnungen basieren auf der Netto-Auszahlung des Profis nach PeakUp-Gebühren — nicht auf dem vollen Buchungsbetrag.',
    'AmbassadorProgramPage.earningsPayoutLabel': 'Netto-Auszahlung',
    'AmbassadorProgramPage.earningsRewardMicro':
      'Wiederkehrende Belohnung aus der Aktivität empfohlener Profis.',
    'AmbassadorProgramPage.earningsStepPayoutCaption': 'Profi-Einnahmen',
    'AmbassadorProgramPage.faqAutomaticAnswer':
      'Nicht automatisch. Du qualifizierst dich durch konstante Profi-Leistung, Community-Impact und Referral-Aktivität. PeakUp prüft Ambassadors regelmäßig.',
    'AmbassadorProgramPage.faqReferralsAnswer':
      'Teile deinen Ambassador-Code, wenn du Fachkräfte einlädst. Wenn sie beitreten, Onboarding abschließen und verdienen, erhältst du Ambassador-Belohnungen.',
    'AmbassadorProgramPage.heroHighlightCommunityText':
      'Bringe talentierte Profis ins PeakUp-Netzwerk.',
    'AmbassadorProgramPage.levelPopup.benefits.commissionDesc':
      'Wiederkehrende Belohnungen auf Plattform-Einnahmen empfohlener Profis.',
    'AmbassadorProgramPage.levelPopup.bronze.benefits.1': '2 % Provision auf empfohlene Profis',
    'AmbassadorProgramPage.levelPopup.commissionNote':
      'Provision basiert auf PeakUp-Netto-Plattformumsatz nach Gebühren — nicht auf dem vollen Session-Preis des Profis.',
    'AmbassadorProgramPage.levelPopup.criteria.cancellations': 'Stornierungen',
    'AmbassadorProgramPage.levelPopup.criteria.referrals': 'Referrals (Profi)',
    'AmbassadorProgramPage.levelPopup.gold.benefits.1': '4 % Provision auf empfohlene Profis',
    'AmbassadorProgramPage.levelPopup.platinum.benefits.1':
      '5 % Top-Referral-Belohnungen auf empfohlene Profis',
    'AmbassadorProgramPage.levelPopup.silver.benefits.1': '3 % Provision auf empfohlene Profis',
    'AmbassadorProgramPage.levelPopup.silver.benefits.4':
      'Featured-Platzierung in Profi-Verzeichnissen',
    'AmbassadorProgramPage.reward1': 'Provision auf Buchungen empfohlener Profis',
    'AmbassadorProgramPage.reward4': 'Featured-Priorität in Profi-Verzeichnissen',
    'AmbassadorProgramPage.schemaDescription':
      'Tritt dem PeakUp Ambassador Program bei — wachse die Profi-Community, verdiene Belohnungen und erhalte Anerkennung.',
    'AmbassadorProgramPage.step2Text':
      'Teile deinen Code mit Fachkräften, die ihr Geschäft mit PeakUp ausbauen möchten.',
    'AmbassadorProgramPage.step2Title': 'Fachkräfte einladen',
    'AmbassadorProgramPage.step3Text':
      'Sie schließen Onboarding ab, veröffentlichen Listings und beginnen zu verdienen.',
    'ReferralCenterPage.activityCoachActive': 'Profi wurde aktiv',
    'ReferralCenterPage.activityCoachApplied': 'Neue Profi-Bewerbung',
    'ReferralCenterPage.activityCoachVerified': 'Profi verifiziert',
    'ReferralCenterPage.activityEmpty':
      'Deine Referral-Timeline erscheint hier, wenn Profis beitreten und wachsen.',
    'ReferralCenterPage.criteriaCancellations': 'Stornierungen: MAX 0',
    'ReferralCenterPage.criteriaReferrals': 'Referrals: MIN 5 Profis',
    'ReferralCenterPage.emptyTitle': 'Noch keine empfohlenen Profis.',
    'ReferralCenterPage.founderRewardsUnlockedLead':
      'Du verdienst {percent} bei jeder Buchung empfohlener Profis — Founder-Stufe (Diamond) ist aktiv.',
    'ReferralCenterPage.inactiveBody':
      'Aktiviere deinen Ambassador-Status, um deinen Referral-Code freizuschalten, eingeladene Profis zu verfolgen und Prämien zu überwachen.',
    'ReferralCenterPage.lead':
      'Verfolge Referral-Code, eingeladene Profis, Onboarding-Status, aktive Referrals und Ambassador-Prämien.',
    'ReferralCenterPage.nextTierReq1': '5+ verifizierte Profi-Referrals erreichen',
    'ReferralCenterPage.progressCancellations': 'Stornierungen',
    'ReferralCenterPage.progressReferralsTarget': 'Min. 5 Profis',
    'ReferralCenterPage.referralCodeHint':
      'Teile deinen Code, wenn du Fachkräfte zu PeakUp einlädst.',
    'ReferralCenterPage.referralsTitle': 'Empfohlene Profis',
    'ReferralCenterPage.rewardHistoryCoach': 'Empfohlener Profi',
    'ReferralCenterPage.rewardHistoryEmpty':
      'Prämien-Einträge erscheinen hier, wenn empfohlene Profis bezahlte Buchungen abschließen.',
    'ReferralCenterPage.schemaDescription':
      'Verfolge eingeladene Profis, Referral-Codes, Onboarding und Ambassador-Belohnungen auf PeakUp.',
    'ReferralCenterPage.statActive': 'Aktive empfohlene Profis',
    'ReferralCenterPage.statInvited': 'Eingeladene Profis',
    'ReferralCenterPage.statusActiveCoach': 'Aktiver Profi',
    'ReferralCenterPage.tableCoach': 'Profi',
  },
  fr: {
    'AmbassadorActivationModal.lead':
      'Onboarding léger pour les professionnels PeakUp vérifiés — activez Bronze, obtenez votre code de parrainage et développez la communauté.',
    'AmbassadorActivationModal.sectionExpectationsBody':
      'Représentez PeakUp avec un service de qualité, une communication réactive et des professionnels de confiance.',
    'AmbassadorActivationModal.sectionReferralBody':
      'Partagez votre code personnel lorsque vous invitez des professionnels. Quand ils rejoignent et gagnent, vous débloquez des récompenses Ambassador.',
    'AmbassadorActivationModal.sectionRewardsBody':
      'Gagnez des récompenses récurrentes sur les revenus plateforme des professionnels parrainés, débloquez des avantages et réduisez vos frais.',
    'AmbassadorActivationModal.sectionTiersBody':
      'Vous commencez en Bronze. Progressez vers Silver, Gold, Platinum et Diamond grâce aux parrainages, à la qualité professionnelle et à l’impact communautaire.',
    'AmbassadorProgramPage.ambassadorsEmpty':
      'Les profils Ambassador apparaîtront ici au fur et à mesure que des professionnels rejoignent le programme.',
    'AmbassadorProgramPage.criteriaReferralsTarget': 'Objectif : 5 professionnels parrainés actifs',
    'AmbassadorProgramPage.earningsClarification':
      'Les récompenses Ambassador sont calculées sur le paiement net du professionnel après frais PeakUp — pas sur le montant total de la réservation.',
    'AmbassadorProgramPage.earningsPayoutLabel': 'Paiement net',
    'AmbassadorProgramPage.earningsRewardMicro':
      'Récompense récurrente liée à l’activité des professionnels parrainés.',
    'AmbassadorProgramPage.earningsStepPayoutCaption': 'Revenus du professionnel',
    'AmbassadorProgramPage.faqAutomaticAnswer':
      'Pas automatiquement. Vous vous qualifiez grâce à une performance professionnelle constante, un impact communautaire et des parrainages. PeakUp révise les Ambassadors régulièrement.',
    'AmbassadorProgramPage.faqReferralsAnswer':
      'Partagez votre code Ambassador unique en invitant des professionnels. Quand ils rejoignent, terminent l’onboarding et gagnent, vous obtenez des récompenses liées à leur activité.',
    'AmbassadorProgramPage.heroHighlightCommunityText':
      'Faites entrer des professionnels talentueux dans le réseau PeakUp.',
    'AmbassadorProgramPage.levelPopup.benefits.commissionDesc':
      'Récompenses récurrentes sur les revenus plateforme des professionnels parrainés.',
    'AmbassadorProgramPage.levelPopup.bronze.benefits.1':
      '2 % de commission sur les professionnels parrainés',
    'AmbassadorProgramPage.levelPopup.commissionNote':
      'La commission est calculée sur les revenus nets PeakUp après frais — pas sur le prix complet de la séance du professionnel.',
    'AmbassadorProgramPage.levelPopup.criteria.cancellations': 'Annulations',
    'AmbassadorProgramPage.levelPopup.criteria.referrals': 'Parrainages (professionnel)',
    'AmbassadorProgramPage.levelPopup.gold.benefits.1':
      '4 % de commission sur les professionnels parrainés',
    'AmbassadorProgramPage.levelPopup.platinum.benefits.1':
      '5 % de récompenses top sur les professionnels parrainés',
    'AmbassadorProgramPage.levelPopup.silver.benefits.1':
      '3 % de commission sur les professionnels parrainés',
    'AmbassadorProgramPage.levelPopup.silver.benefits.4':
      'Mise en avant dans les annuaires de professionnels',
    'AmbassadorProgramPage.reward1':
      'Gagnez une commission sur les réservations des professionnels parrainés',
    'AmbassadorProgramPage.reward4':
      'Priorité mise en avant dans les annuaires de professionnels',
    'AmbassadorProgramPage.schemaDescription':
      'Rejoignez le programme Ambassador PeakUp — développez la communauté de professionnels, gagnez des récompenses et obtenez de la reconnaissance.',
    'AmbassadorProgramPage.step2Text':
      'Partagez votre code avec des professionnels qui souhaitent développer leur activité sur PeakUp.',
    'AmbassadorProgramPage.step2Title': 'Inviter des professionnels',
    'AmbassadorProgramPage.step3Text':
      'Ils terminent l’onboarding, publient des annonces et commencent à gagner.',
    'ReferralCenterPage.activityCoachActive': 'Professionnel devenu actif',
    'ReferralCenterPage.activityCoachApplied': 'Nouvelle candidature professionnelle',
    'ReferralCenterPage.activityCoachVerified': 'Professionnel vérifié',
    'ReferralCenterPage.activityEmpty':
      'Votre timeline de parrainage apparaîtra ici quand des professionnels rejoignent et progressent.',
    'ReferralCenterPage.criteriaCancellations': 'Annulations : MAX 0',
    'ReferralCenterPage.criteriaReferrals': 'Parrainages : MIN 5 professionnels',
    'ReferralCenterPage.emptyTitle': 'Aucun professionnel parrainé pour l’instant.',
    'ReferralCenterPage.founderRewardsUnlockedLead':
      'Vous gagnez {percent} sur chaque réservation de professionnel parrainé — commission Founder (Diamond) active.',
    'ReferralCenterPage.inactiveBody':
      'Activez votre statut Ambassador pour débloquer votre code, suivre les professionnels invités et monitorer vos récompenses.',
    'ReferralCenterPage.lead':
      'Suivez votre code, les professionnels invités, l’onboarding, les parrainages actifs et la progression des récompenses Ambassador.',
    'ReferralCenterPage.nextTierReq1': 'Obtenir 5+ parrainages de professionnels vérifiés',
    'ReferralCenterPage.progressCancellations': 'Annulations',
    'ReferralCenterPage.progressReferralsTarget': 'Min. 5 professionnels',
    'ReferralCenterPage.referralCodeHint':
      'Partagez votre code en invitant des professionnels à rejoindre PeakUp.',
    'ReferralCenterPage.referralsTitle': 'Professionnels parrainés',
    'ReferralCenterPage.rewardHistoryCoach': 'Professionnel parrainé',
    'ReferralCenterPage.rewardHistoryEmpty':
      'Les récompenses apparaîtront ici quand les professionnels parrainés complètent des réservations payées.',
    'ReferralCenterPage.schemaDescription':
      'Suivez les professionnels invités, codes de parrainage, onboarding et récompenses Ambassador sur PeakUp.',
    'ReferralCenterPage.statActive': 'Professionnels parrainés actifs',
    'ReferralCenterPage.statInvited': 'Professionnels invités',
    'ReferralCenterPage.statusActiveCoach': 'Professionnel actif',
    'ReferralCenterPage.tableCoach': 'Professionnel',
  },
  es: {
    'AmbassadorActivationModal.lead':
      'Onboarding ligero para profesionales PeakUp verificados — activa Bronze, obtén tu código de referido y haz crecer la comunidad.',
    'AmbassadorActivationModal.sectionExpectationsBody':
      'Representa PeakUp con servicio de calidad, comunicación ágil y profesionales en los que confiarías.',
    'AmbassadorActivationModal.sectionReferralBody':
      'Comparte tu código personal al invitar profesionales. Cuando se unen y ganan, desbloqueas recompensas Ambassador.',
    'AmbassadorActivationModal.sectionRewardsBody':
      'Gana recompensas recurrentes de los ingresos de plataforma de profesionales referidos, desbloquea ventajas y reduce comisiones.',
    'AmbassadorActivationModal.sectionTiersBody':
      'Empiezas en Bronze. Avanza a Silver, Gold, Platinum y Diamond con referidos, calidad profesional e impacto comunitario.',
    'AmbassadorProgramPage.ambassadorsEmpty':
      'Los perfiles Ambassador aparecerán aquí a medida que se unan profesionales al programa.',
    'AmbassadorProgramPage.criteriaReferralsTarget': 'Objetivo: 5 profesionales referidos activos',
    'AmbassadorProgramPage.earningsClarification':
      'Las recompensas Ambassador se calculan del pago neto del profesional tras las comisiones PeakUp — no del importe total de la reserva.',
    'AmbassadorProgramPage.earningsPayoutLabel': 'Pago neto',
    'AmbassadorProgramPage.earningsRewardMicro':
      'Recompensa recurrente por la actividad de profesionales referidos.',
    'AmbassadorProgramPage.earningsStepPayoutCaption': 'Ingresos del profesional',
    'AmbassadorProgramPage.faqAutomaticAnswer':
      'No automáticamente. Te calificas con rendimiento profesional constante, impacto comunitario y actividad de referidos. PeakUp revisa a los Ambassadors periódicamente.',
    'AmbassadorProgramPage.faqReferralsAnswer':
      'Comparte tu código Ambassador al invitar profesionales. Cuando se unen, completan el onboarding y ganan, obtienes recompensas ligadas a su actividad.',
    'AmbassadorProgramPage.heroHighlightCommunityText':
      'Trae profesionales con talento a la red PeakUp.',
    'AmbassadorProgramPage.levelPopup.benefits.commissionDesc':
      'Recompensas recurrentes sobre ingresos de plataforma de profesionales referidos.',
    'AmbassadorProgramPage.levelPopup.bronze.benefits.1':
      '2 % de comisión sobre profesionales referidos',
    'AmbassadorProgramPage.levelPopup.commissionNote':
      'La comisión se calcula sobre ingresos netos PeakUp tras comisiones — no sobre el precio completo de la sesión del profesional.',
    'AmbassadorProgramPage.levelPopup.criteria.cancellations': 'Cancelaciones',
    'AmbassadorProgramPage.levelPopup.criteria.referrals': 'Referidos (profesional)',
    'AmbassadorProgramPage.levelPopup.gold.benefits.1':
      '4 % de comisión sobre profesionales referidos',
    'AmbassadorProgramPage.levelPopup.platinum.benefits.1':
      '5 % de recompensas top sobre profesionales referidos',
    'AmbassadorProgramPage.levelPopup.silver.benefits.1':
      '3 % de comisión sobre profesionales referidos',
    'AmbassadorProgramPage.levelPopup.silver.benefits.4':
      'Destacado en directorios de profesionales',
    'AmbassadorProgramPage.reward1':
      'Gana comisión por las reservas de profesionales referidos',
    'AmbassadorProgramPage.reward4':
      'Prioridad destacada en directorios de profesionales',
    'AmbassadorProgramPage.schemaDescription':
      'Únete al programa Ambassador PeakUp — haz crecer la comunidad de profesionales, gana recompensas y obtén reconocimiento.',
    'AmbassadorProgramPage.step2Text':
      'Comparte tu código con profesionales que desean hacer crecer su actividad con PeakUp.',
    'AmbassadorProgramPage.step2Title': 'Invitar profesionales',
    'AmbassadorProgramPage.step3Text':
      'Completan el onboarding, publican anuncios y empiezan a ganar.',
    'ReferralCenterPage.activityCoachActive': 'Profesional activo',
    'ReferralCenterPage.activityCoachApplied': 'Nueva solicitud de profesional',
    'ReferralCenterPage.activityCoachVerified': 'Profesional verificado',
    'ReferralCenterPage.activityEmpty':
      'Tu línea de tiempo de referidos aparecerá aquí cuando los profesionales se unan y crezcan.',
    'ReferralCenterPage.criteriaCancellations': 'Cancelaciones: MAX 0',
    'ReferralCenterPage.criteriaReferrals': 'Referidos: MIN 5 profesionales',
    'ReferralCenterPage.emptyTitle': 'Aún no hay profesionales referidos.',
    'ReferralCenterPage.founderRewardsUnlockedLead':
      'Ganas {percent} en cada reserva de profesional referido — comisión Founder (Diamond) activa.',
    'ReferralCenterPage.inactiveBody':
      'Activa tu estado Ambassador para desbloquear tu código, seguir profesionales invitados y monitorizar recompensas.',
    'ReferralCenterPage.lead':
      'Sigue tu código, profesionales invitados, onboarding, referidos activos y progresión de recompensas Ambassador.',
    'ReferralCenterPage.nextTierReq1': 'Consigue 5+ referidos de profesionales verificados',
    'ReferralCenterPage.progressCancellations': 'Cancelaciones',
    'ReferralCenterPage.progressReferralsTarget': 'Mín. 5 profesionales',
    'ReferralCenterPage.referralCodeHint':
      'Comparte tu código al invitar profesionales a PeakUp.',
    'ReferralCenterPage.referralsTitle': 'Profesionales referidos',
    'ReferralCenterPage.rewardHistoryCoach': 'Profesional referido',
    'ReferralCenterPage.rewardHistoryEmpty':
      'Las recompensas aparecerán aquí cuando los profesionales referidos completen reservas pagadas.',
    'ReferralCenterPage.schemaDescription':
      'Sigue profesionales invitados, códigos de referido, onboarding y recompensas Ambassador en PeakUp.',
    'ReferralCenterPage.statActive': 'Profesionales referidos activos',
    'ReferralCenterPage.statInvited': 'Profesionales invitados',
    'ReferralCenterPage.statusActiveCoach': 'Profesional activo',
    'ReferralCenterPage.tableCoach': 'Profesional',
  },
  pt: {
    'AmbassadorActivationModal.lead':
      'Onboarding leve para profissionais PeakUp verificados — ativa Bronze, obtém o teu código de referência e faz crescer a comunidade.',
    'AmbassadorActivationModal.sectionExpectationsBody':
      'Representa a PeakUp com serviço de qualidade, comunicação ágil e profissionais em quem confiarias.',
    'AmbassadorActivationModal.sectionReferralBody':
      'Partilha o teu código pessoal ao convidar profissionais. Quando entram e ganham, desbloqueias recompensas Ambassador.',
    'AmbassadorActivationModal.sectionRewardsBody':
      'Ganha recompensas recorrentes das receitas de plataforma de profissionais referidos, desbloqueia vantagens e reduz comissões.',
    'AmbassadorActivationModal.sectionTiersBody':
      'Começas em Bronze. Avança para Silver, Gold, Platinum e Diamond com referências, qualidade profissional e impacto comunitário.',
    'AmbassadorProgramPage.ambassadorsEmpty':
      'Os perfis Ambassador aparecerão aqui à medida que profissionais entram no programa.',
    'AmbassadorProgramPage.criteriaReferralsTarget': 'Objetivo: 5 profissionais referidos ativos',
    'AmbassadorProgramPage.earningsClarification':
      'As recompensas Ambassador calculam-se a partir do pagamento líquido do profissional após taxas PeakUp — não do valor total da reserva.',
    'AmbassadorProgramPage.earningsPayoutLabel': 'Pagamento líquido',
    'AmbassadorProgramPage.earningsRewardMicro':
      'Recompensa recorrente da atividade de profissionais referidos.',
    'AmbassadorProgramPage.earningsStepPayoutCaption': 'Ganhos do profissional',
    'AmbassadorProgramPage.faqAutomaticAnswer':
      'Não automaticamente. Qualificas-te com desempenho profissional consistente, impacto comunitário e atividade de referência. A PeakUp revê Ambassadors periodicamente.',
    'AmbassadorProgramPage.faqReferralsAnswer':
      'Partilha o teu código Ambassador ao convidar profissionais. Quando entram, completam o onboarding e ganham, obténs recompensas ligadas à atividade deles.',
    'AmbassadorProgramPage.heroHighlightCommunityText':
      'Traz profissionais talentosos para a rede PeakUp.',
    'AmbassadorProgramPage.levelPopup.benefits.commissionDesc':
      'Recompensas recorrentes sobre receitas de plataforma de profissionais referidos.',
    'AmbassadorProgramPage.levelPopup.bronze.benefits.1':
      '2 % de comissão sobre profissionais referidos',
    'AmbassadorProgramPage.levelPopup.commissionNote':
      'A comissão calcula-se sobre receitas líquidas PeakUp após taxas — não sobre o preço total da sessão do profissional.',
    'AmbassadorProgramPage.levelPopup.criteria.cancellations': 'Cancelamentos',
    'AmbassadorProgramPage.levelPopup.criteria.referrals': 'Referências (profissional)',
    'AmbassadorProgramPage.levelPopup.gold.benefits.1':
      '4 % de comissão sobre profissionais referidos',
    'AmbassadorProgramPage.levelPopup.platinum.benefits.1':
      '5 % de recompensas top sobre profissionais referidos',
    'AmbassadorProgramPage.levelPopup.silver.benefits.1':
      '3 % de comissão sobre profissionais referidos',
    'AmbassadorProgramPage.levelPopup.silver.benefits.4':
      'Destaque em diretórios de profissionais',
    'AmbassadorProgramPage.reward1':
      'Ganha comissão nas reservas de profissionais referidos',
    'AmbassadorProgramPage.reward4':
      'Prioridade de destaque em diretórios de profissionais',
    'AmbassadorProgramPage.schemaDescription':
      'Junta-te ao programa Ambassador PeakUp — faz crescer a comunidade de profissionais, ganha recompensas e obtém reconhecimento.',
    'AmbassadorProgramPage.step2Text':
      'Partilha o teu código com profissionais que pretendem desenvolver o seu negócio na PeakUp.',
    'AmbassadorProgramPage.step2Title': 'Convidar profissionais',
    'AmbassadorProgramPage.step3Text':
      'Completam o onboarding, publicam anúncios e começam a ganhar.',
    'ReferralCenterPage.activityCoachActive': 'Profissional ativo',
    'ReferralCenterPage.activityCoachApplied': 'Nova candidatura de profissional',
    'ReferralCenterPage.activityCoachVerified': 'Profissional verificado',
    'ReferralCenterPage.activityEmpty':
      'A tua linha temporal de referências aparecerá aqui quando profissionais entrarem e crescerem.',
    'ReferralCenterPage.criteriaCancellations': 'Cancelamentos: MAX 0',
    'ReferralCenterPage.criteriaReferrals': 'Referências: MIN 5 profissionais',
    'ReferralCenterPage.emptyTitle': 'Ainda não há profissionais referidos.',
    'ReferralCenterPage.founderRewardsUnlockedLead':
      'Ganhas {percent} em cada reserva de profissional referido — comissão Founder (Diamond) ativa.',
    'ReferralCenterPage.inactiveBody':
      'Ativa o teu estado Ambassador para desbloquear o código, acompanhar profissionais convidados e monitorizar recompensas.',
    'ReferralCenterPage.lead':
      'Acompanha código de referência, profissionais convidados, onboarding, referências ativas e progressão de recompensas Ambassador.',
    'ReferralCenterPage.nextTierReq1': 'Obtém 5+ referências de profissionais verificados',
    'ReferralCenterPage.progressCancellations': 'Cancelamentos',
    'ReferralCenterPage.progressReferralsTarget': 'Mín. 5 profissionais',
    'ReferralCenterPage.referralCodeHint':
      'Partilha o teu código ao convidar profissionais para a PeakUp.',
    'ReferralCenterPage.referralsTitle': 'Profissionais referidos',
    'ReferralCenterPage.rewardHistoryCoach': 'Profissional referido',
    'ReferralCenterPage.rewardHistoryEmpty':
      'As recompensas aparecerão aqui quando profissionais referidos completarem reservas pagas.',
    'ReferralCenterPage.schemaDescription':
      'Acompanha profissionais convidados, códigos de referência, onboarding e recompensas Ambassador na PeakUp.',
    'ReferralCenterPage.statActive': 'Profissionais referidos ativos',
    'ReferralCenterPage.statInvited': 'Profissionais convidados',
    'ReferralCenterPage.statusActiveCoach': 'Profissional ativo',
    'ReferralCenterPage.tableCoach': 'Profissional',
  },
};

['en', 'it', 'de', 'fr', 'es', 'pt'].forEach(locale => {
  const filePath = path.join(translationsDir, `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  Object.entries(patches[locale] || {}).forEach(([key, value]) => {
    data[key] = value;
  });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Updated ${locale}.json (${Object.keys(patches[locale] || {}).length} keys)`);
});
