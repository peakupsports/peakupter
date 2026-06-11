/**
 * Certified vs verified trust positioning for PeakUp.
 * Run: node scripts/apply-trust-positioning.js
 */
const fs = require('fs');
const path = require('path');

const translationsDir = path.join(__dirname, '../src/translations');

const patches = {
  en: {
    'LandingHeroSection.subtitle':
      'Discover certified and verified instructors, guides, and coaches for every sport, wherever you are.',
    'LandingHeroSection.featureVerified': 'Certified & verified',
    'LandingHeroSection.featureVerifiedSubtitle': 'Qualified and PeakUp-approved',
    'LandingWhyPeakupSection.trustVerified': 'Certified & verified',
    'SectionFooter.trustVerifiedCoachesTitle': 'Certified & verified',
    'SectionFooter.trustVerifiedCoachesText': 'Every profile reviewed and approved by PeakUp.',
    'AboutPage.valueTrustTitle': 'Certified & verified',
    'AboutPage.valueTrustDesc':
      'Professionals hold recognized qualifications. PeakUp reviews certifications, identity, insurance and documentation before approval.',
    'AboutPage.trustCenterLabel': 'Trust center',
    'AboutPage.trustCenterTitle': 'Certified and verified',
    'AboutPage.trustCenterLead':
      'PeakUp combines professional qualifications with our own review process — so you know who you are booking.',
    'AboutPage.trustCertifiedTitle': 'Certified',
    'AboutPage.trustCertifiedBody':
      'Professionals hold recognized qualifications and certifications in their discipline.',
    'AboutPage.trustVerifiedTitle': 'Verified',
    'AboutPage.trustVerifiedBody':
      'PeakUp reviews certifications, identity, insurance and required documentation before profiles are approved.',
    'HowItWorksPage.clientsBlock1Text':
      'Browse certified and verified instructors by sport and location. Check profiles, experience, and reviews.',
  },
  it: {
    'LandingHeroSection.subtitle':
      'Scopri istruttori, guide e maestri certificati e verificati per ogni sport, ovunque ti trovi.',
    'LandingHeroSection.featureVerified': 'Certificati e verificati',
    'LandingHeroSection.featureVerifiedSubtitle': 'Qualifiche riconosciute e approvazione PeakUp',
    'LandingWhyPeakupSection.trustVerified': 'Professionisti certificati',
    'SectionFooter.trustVerifiedCoachesTitle': 'Certificati e verificati',
    'SectionFooter.trustVerifiedCoachesText':
      'Ogni profilo esaminato e approvato da PeakUp.',
    'AboutPage.valueTrustTitle': 'Certificati e verificati',
    'AboutPage.valueTrustDesc':
      'I professionisti possiedono qualifiche riconosciute. PeakUp verifica certificazioni, identità, assicurazione e documentazione prima dell’approvazione.',
    'AboutPage.trustCenterLabel': 'Centro fiducia',
    'AboutPage.trustCenterTitle': 'Certificati e verificati',
    'AboutPage.trustCenterLead':
      'PeakUp unisce qualifiche professionali e un processo di revisione interno — così sai con chi prenoti.',
    'AboutPage.trustCertifiedTitle': 'Certificato',
    'AboutPage.trustCertifiedBody':
      'I professionisti possiedono qualifiche e certificazioni riconosciute nella propria disciplina.',
    'AboutPage.trustVerifiedTitle': 'Verificato',
    'AboutPage.trustVerifiedBody':
      'PeakUp verifica certificazioni, identità, assicurazione e documentazione richiesta prima di approvare i profili.',
    'HowItWorksPage.clientsBlock1Text':
      'Sfoglia istruttori certificati e verificati per sport e località. Controlla profili, esperienza e recensioni.',
  },
  de: {
    'LandingHeroSection.subtitle':
      'Entdecke zertifizierte und verifizierte Instruktoren, Guides und Coaches für jede Sportart — überall, wo du bist.',
    'LandingHeroSection.featureVerified': 'Zertifiziert & verifiziert',
    'LandingHeroSection.featureVerifiedSubtitle': 'Qualifiziert und von PeakUp geprüft',
    'LandingWhyPeakupSection.trustVerified': 'Zertifizierte Profis',
    'SectionFooter.trustVerifiedCoachesTitle': 'Zertifiziert & verifiziert',
    'SectionFooter.trustVerifiedCoachesText': 'Jedes Profil von PeakUp geprüft und freigegeben.',
    'AboutPage.valueTrustTitle': 'Zertifiziert & verifiziert',
    'AboutPage.valueTrustDesc':
      'Profis besitzen anerkannte Qualifikationen. PeakUp prüft Zertifikate, Identität, Versicherung und Unterlagen vor der Freigabe.',
    'AboutPage.trustCenterLabel': 'Trust Center',
    'AboutPage.trustCenterTitle': 'Zertifiziert und verifiziert',
    'AboutPage.trustCenterLead':
      'PeakUp verbindet professionelle Qualifikationen mit unserem eigenen Prüfprozess — damit du weißt, bei wem du buchst.',
    'AboutPage.trustCertifiedTitle': 'Zertifiziert',
    'AboutPage.trustCertifiedBody':
      'Profis besitzen anerkannte Qualifikationen und Zertifizierungen in ihrer Disziplin.',
    'AboutPage.trustVerifiedTitle': 'Verifiziert',
    'AboutPage.trustVerifiedBody':
      'PeakUp prüft Zertifikate, Identität, Versicherung und erforderliche Unterlagen, bevor Profile freigegeben werden.',
    'HowItWorksPage.clientsBlock1Text':
      'Durchsuche zertifizierte und verifizierte Instruktoren nach Sport und Ort. Profile, Erfahrung und Bewertungen prüfen.',
  },
  fr: {
    'LandingHeroSection.subtitle':
      'Découvrez des instructeurs, guides et coaches certifiés et vérifiés pour chaque sport, où que vous soyez.',
    'LandingHeroSection.featureVerified': 'Certifiés et vérifiés',
    'LandingHeroSection.featureVerifiedSubtitle': 'Qualifiés et approuvés par PeakUp',
    'LandingWhyPeakupSection.trustVerified': 'Professionnels certifiés',
    'SectionFooter.trustVerifiedCoachesTitle': 'Certifiés et vérifiés',
    'SectionFooter.trustVerifiedCoachesText': 'Chaque profil examiné et approuvé par PeakUp.',
    'AboutPage.valueTrustTitle': 'Certifiés et vérifiés',
    'AboutPage.valueTrustDesc':
      'Les professionnels détiennent des qualifications reconnues. PeakUp vérifie certifications, identité, assurance et documents avant approbation.',
    'AboutPage.trustCenterLabel': 'Centre de confiance',
    'AboutPage.trustCenterTitle': 'Certifiés et vérifiés',
    'AboutPage.trustCenterLead':
      'PeakUp combine qualifications professionnelles et processus de contrôle — pour savoir avec qui vous réservez.',
    'AboutPage.trustCertifiedTitle': 'Certifié',
    'AboutPage.trustCertifiedBody':
      'Les professionnels détiennent des qualifications et certifications reconnues dans leur discipline.',
    'AboutPage.trustVerifiedTitle': 'Vérifié',
    'AboutPage.trustVerifiedBody':
      'PeakUp vérifie certifications, identité, assurance et documents requis avant d’approuver les profils.',
    'HowItWorksPage.clientsBlock1Text':
      'Parcourez des instructeurs certifiés et vérifiés par sport et lieu. Consultez profils, expérience et avis.',
  },
  es: {
    'LandingHeroSection.subtitle':
      'Descubre instructores, guías y coaches certificados y verificados para cada deporte, estés donde estés.',
    'LandingHeroSection.featureVerified': 'Certificados y verificados',
    'LandingHeroSection.featureVerifiedSubtitle': 'Cualificados y aprobados por PeakUp',
    'LandingWhyPeakupSection.trustVerified': 'Profesionales certificados',
    'SectionFooter.trustVerifiedCoachesTitle': 'Certificados y verificados',
    'SectionFooter.trustVerifiedCoachesText': 'Cada perfil revisado y aprobado por PeakUp.',
    'AboutPage.valueTrustTitle': 'Certificados y verificados',
    'AboutPage.valueTrustDesc':
      'Los profesionales tienen cualificaciones reconocidas. PeakUp revisa certificaciones, identidad, seguro y documentación antes de aprobar.',
    'AboutPage.trustCenterLabel': 'Centro de confianza',
    'AboutPage.trustCenterTitle': 'Certificados y verificados',
    'AboutPage.trustCenterLead':
      'PeakUp combina cualificaciones profesionales con nuestro proceso de revisión — para que sepas con quién reservas.',
    'AboutPage.trustCertifiedTitle': 'Certificado',
    'AboutPage.trustCertifiedBody':
      'Los profesionales tienen cualificaciones y certificaciones reconocidas en su disciplina.',
    'AboutPage.trustVerifiedTitle': 'Verificado',
    'AboutPage.trustVerifiedBody':
      'PeakUp revisa certificaciones, identidad, seguro y documentación requerida antes de aprobar los perfiles.',
    'HowItWorksPage.clientsBlock1Text':
      'Explora instructores certificados y verificados por deporte y ubicación. Consulta perfiles, experiencia y reseñas.',
  },
  pt: {
    'LandingHeroSection.subtitle':
      'Descobre instrutores, guias e coaches certificados e verificados para cada desporto, onde quer que estejas.',
    'LandingHeroSection.featureVerified': 'Certificados e verificados',
    'LandingHeroSection.featureVerifiedSubtitle': 'Qualificados e aprovados pela PeakUp',
    'LandingWhyPeakupSection.trustVerified': 'Profissionais certificados',
    'SectionFooter.trustVerifiedCoachesTitle': 'Certificados e verificados',
    'SectionFooter.trustVerifiedCoachesText': 'Cada perfil revisto e aprovado pela PeakUp.',
    'AboutPage.valueTrustTitle': 'Certificados e verificados',
    'AboutPage.valueTrustDesc':
      'Os profissionais têm qualificações reconhecidas. A PeakUp revê certificações, identidade, seguro e documentação antes da aprovação.',
    'AboutPage.trustCenterLabel': 'Centro de confiança',
    'AboutPage.trustCenterTitle': 'Certificados e verificados',
    'AboutPage.trustCenterLead':
      'A PeakUp combina qualificações profissionais com o nosso processo de revisão — para saberes com quem reservas.',
    'AboutPage.trustCertifiedTitle': 'Certificado',
    'AboutPage.trustCertifiedBody':
      'Os profissionais têm qualificações e certificações reconhecidas na sua disciplina.',
    'AboutPage.trustVerifiedTitle': 'Verificado',
    'AboutPage.trustVerifiedBody':
      'A PeakUp revê certificações, identidade, seguro e documentação necessária antes de aprovar perfis.',
    'HowItWorksPage.clientsBlock1Text':
      'Explora instrutores certificados e verificados por desporto e localização. Vê perfis, experiência e avaliações.',
  },
};

['en', 'it', 'de', 'fr', 'es', 'pt'].forEach(locale => {
  const filePath = path.join(translationsDir, `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  Object.entries(patches[locale]).forEach(([key, value]) => {
    data[key] = value;
  });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Updated ${locale}.json`);
});
