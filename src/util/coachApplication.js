/**
 * Coach application form helpers — validation, file encoding, submission.
 */

export const COACH_APPLICATION_STEPS = [
  'referral',
  'personal',
  'coaching',
  'documents',
  'consent',
];

export const COACH_APPLICATION_SUBMIT_MODES = {
  API: 'api',
  NETLIFY: 'netlify',
};

export const COACH_APPLICATION_NETLIFY_FORM_NAME = 'coach-application';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const HEAR_ABOUT_OPTIONS = [
  'socialMedia',
  'friendCoach',
  'ambassador',
  'searchEngine',
  'event',
  'other',
];

export const CERTIFICATION_LEVEL_OPTIONS = [
  'none',
  'national',
  'international',
  'federation',
  'instructor',
  'other',
];

export const getSubmitMode = () => {
  const mode = process.env.REACT_APP_COACH_APPLICATION_SUBMIT_MODE;
  return mode === COACH_APPLICATION_SUBMIT_MODES.NETLIFY
    ? COACH_APPLICATION_SUBMIT_MODES.NETLIFY
    : COACH_APPLICATION_SUBMIT_MODES.API;
};

/**
 * @param {File|null|undefined} file
 * @returns {Promise<{ name: string, type: string, size: number, dataBase64: string }|null>}
 */
export const encodeApplicationFile = file => {
  if (!file) {
    return Promise.resolve(null);
  }

  if (file.size > MAX_FILE_BYTES) {
    return Promise.reject(new Error('COACH_APPLICATION_FILE_TOO_LARGE'));
  }

  if (file.type && !ALLOWED_FILE_TYPES.has(file.type)) {
    return Promise.reject(new Error('COACH_APPLICATION_FILE_TYPE'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const dataBase64 = result.includes(',') ? result.split(',')[1] : result;
      resolve({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        dataBase64,
      });
    };
    reader.onerror = () => reject(new Error('COACH_APPLICATION_FILE_READ'));
    reader.readAsDataURL(file);
  });
};

/**
 * Strip File objects and prepare JSON payload for the API.
 *
 * @param {Record<string, unknown>} values
 */
export const buildCoachApplicationPayload = async values => {
  const [idDocument, coachingCertificates, insuranceDocument, otherDocuments] = await Promise.all([
    encodeApplicationFile(values.idDocument),
    encodeApplicationFile(values.coachingCertificates),
    encodeApplicationFile(values.insuranceDocument),
    encodeApplicationFile(values.otherDocuments),
  ]);

  return {
    hearAboutPeakUp: values.hearAboutPeakUp || '',
    ambassadorReferralCode: values.ambassadorReferralCode || '',
    applyingIndependently: Boolean(values.applyingIndependently),
    interestedInAmbassador: Boolean(values.interestedInAmbassador),
    fullName: values.fullName || '',
    email: values.email || '',
    phone: values.phone || '',
    dateOfBirth: values.dateOfBirth || '',
    country: values.country || '',
    cityArea: values.cityArea || '',
    languagesSpoken: values.languagesSpoken || '',
    mainSport: values.mainSport || '',
    otherSports: values.otherSports || '',
    yearsExperience: values.yearsExperience || '',
    certificationLevel: values.certificationLevel || '',
    federationSchool: values.federationSchool || '',
    shortBio: values.shortBio || '',
    instagramWebsite: values.instagramWebsite || '',
    confirmCorrect: Boolean(values.acceptVerification),
    acceptVerification: Boolean(values.acceptVerification),
    understandManualReview: Boolean(values.acceptVerification),
    submittedAt: new Date().toISOString(),
    files: {
      idDocument,
      coachingCertificates,
      insuranceDocument,
      otherDocuments,
    },
  };
};

/**
 * @param {string} stepId
 * @param {Record<string, unknown>} values
 * @param {(key: string) => string} messageForKey
 * @returns {Record<string, string>}
 */
export const validateCoachApplicationStep = (stepId, values, messageForKey) => {
  const errors = {};
  const req = key => {
    errors[key] = messageForKey(key);
  };

  if (stepId === 'referral') {
    if (!values.hearAboutPeakUp) {
      req('hearAboutPeakUpRequired');
    }
  }

  if (stepId === 'personal') {
    if (!values.fullName || !String(values.fullName).trim()) {
      req('fullNameRequired');
    }
    if (!values.email || !String(values.email).trim()) {
      req('emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values.email).trim())) {
      req('emailInvalid');
    }
    if (!values.phone || !String(values.phone).trim()) {
      req('phoneRequired');
    }
    if (!values.dateOfBirth) {
      req('dateOfBirthRequired');
    }
    if (!values.country || !String(values.country).trim()) {
      req('countryRequired');
    }
    if (!values.cityArea || !String(values.cityArea).trim()) {
      req('cityAreaRequired');
    }
    if (!values.languagesSpoken || !String(values.languagesSpoken).trim()) {
      req('languagesRequired');
    }
  }

  if (stepId === 'coaching') {
    if (!values.mainSport || !String(values.mainSport).trim()) {
      req('mainSportRequired');
    }
    if (!values.yearsExperience) {
      req('yearsExperienceRequired');
    }
    if (!values.certificationLevel) {
      req('certificationLevelRequired');
    }
    if (!values.shortBio || !String(values.shortBio).trim()) {
      req('shortBioRequired');
    }
  }

  if (stepId === 'documents') {
    if (!values.idDocument) {
      req('idDocumentRequired');
    }
    if (!values.coachingCertificates) {
      req('coachingCertificatesRequired');
    }
  }

  if (stepId === 'consent') {
    if (!values.acceptLegal) {
      req('acceptLegalRequired');
    }
    if (!values.acceptVerification) {
      req('acceptVerificationRequired');
    }
  }

  return errors;
};
