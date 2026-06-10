/**
 * Rebuild it.json / pt.json with native Italian/Portuguese.
 * Removes FR/ES donor contamination. Preserves verified manual translations.
 *
 * Run: node scripts/fixLocaleContamination.js
 */
const fs = require('fs');
const path = require('path');

const { GLOBAL_PHRASE_OVERRIDES, KEY_OVERRIDES } = require('./lib/globalOverrides');
const { SHARED_ENGLISH_FIXES } = require('./lib/sharedEnglishFixes');
const INBOX_LABEL_OVERRIDES = require('./lib/inboxLabelOverrides');
const AMBASSADOR_LABEL_OVERRIDES = require('./lib/ambassadorLabelOverrides');
const ICU_FIXES = require('./lib/icuStatusFixes');
const PRIORITY_IT_FIXES = require('./lib/priorityItFixes');
const PRIORITY_PT_FIXES = require('./lib/priorityPtFixes');

const ROOT = path.join(__dirname, '..', 'src', 'translations');
const LANGS_ALL = ['de', 'fr', 'es', 'it', 'pt'];

const loadJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const loadBatches = files =>
  files.reduce((acc, file) => Object.assign(acc, loadJson(path.join(__dirname, file))), {});

const en = loadJson(path.join(ROOT, 'en.json'));
const fr = loadJson(path.join(ROOT, 'fr.json'));
const es = loadJson(path.join(ROOT, 'es.json'));
const current = {
  de: loadJson(path.join(ROOT, 'de.json')),
  fr: loadJson(path.join(ROOT, 'fr.json')),
  es: loadJson(path.join(ROOT, 'es.json')),
  it: loadJson(path.join(ROOT, 'it.json')),
  pt: loadJson(path.join(ROOT, 'pt.json')),
};

const manualIt = loadBatches([
  'discovery-it-batch1.json',
  'discovery-it-batch2.json',
  'discovery-it-batch3.json',
]);
const manualPt = loadBatches([
  'discovery-pt-batch1.json',
  'discovery-pt-batch2.json',
  'discovery-pt-batch3.json',
]);
const gap = loadJson(path.join(__dirname, 'gap-translations-622.json'));

// Detection for build-time rejection (strict donor markers, not Italian accents).
const frContamination =
  /\b(Trouvez|avec |Comment veux|noi rejoindre|le |la |les |des |du |de la |d'|un |une |vous |votre |vos |êtes |être |annonce|annuler|modifier|rechercher|chargement|commentaires|mot de passe|équipe|entraîneur|bientôt|impossible|fermer|ouvrir|afficher|paramètres|détails|emplacement|réinitialiser|appliquer|effacer|veuillez|bienvenue|retour|continuer|confirmer|accepter|refuser|inviter|invitation|organisation|expérience|vérifié|certifié|aucun|aucune|choisir|sélectionner|comment ça marche|tableau de bord|calendrier|réservation|messagerie|boîte de réception|rejoignez|réseau)\b|à la |définitivement|renseignements/i;
const esContamination =
  /\b(tu |tus |usted |correo electrónico|contraseña|anuncio|anuncios|buscar|búsqueda|cargando|comentarios|evaluaciones|configuración|ubicación|próximamente|bienvenido|volver|continuar|confirmar|aceptar|rechazar|invitar|invitación|organización|experiencia|verificado|certificado|ningún|ninguna|seleccionar|limpiar|aplicar|inténtalo|por favor|cómo funciona|tablero|bandeja|deporte|deportes|tienes |revisa |solicitud|Inicia sesión|Regístrate)\b|ñ|¿|¡/i;

// Report-only: strong FR/ES-only markers (avoids Italian "la" / Portuguese cognates).
const frSuspect =
  /\b(Trouvez|Comment veux|avec |noi rejoindre|vous |votre |veuillez|mot de passe|équipe|entraîneur|comment ça marche|tableau de bord|messagerie|boîte de réception|rejoignez|réseau|annonce|annuler|rechercher|chargement|commentaires|sélectionner|détails|paramètres|expérience|vérifié|certifié|aucun|aucune)\b|à la carte|définitivement|renseignements/i;
const esSuspect =
  /\b(correo electrónico|contraseña|anuncios|búsqueda|cargando|comentarios|evaluaciones|configuración|ubicación|próximamente|inténtalo|cómo funciona|tablero|bandeja|Inicia sesión|Regístrate|ningún|ninguna|tienes |revisa tu)\b|¿|¡/i;

const isCleanIt = (key, value) => {
  if (!value || value === en[key]) return false;
  if (value === fr[key]) return false;
  if (frContamination.test(value)) return false;
  return true;
};

const isCleanPt = (key, value) => {
  if (!value || value === en[key]) return false;
  if (value === es[key]) return false;
  if (esContamination.test(value)) return false;
  return true;
};

const loadNativeChunks = lang => {
  const dir = path.join(__dirname, 'native', lang);
  if (!fs.existsSync(dir)) return {};
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .reduce((acc, file) => Object.assign(acc, loadJson(path.join(dir, file))), {});
};

const nativeIt = loadNativeChunks('it');
const nativePt = loadNativeChunks('pt');

const applyOverrides = (messages, lang) => {
  const out = { ...messages };
  [KEY_OVERRIDES, SHARED_ENGLISH_FIXES, INBOX_LABEL_OVERRIDES, AMBASSADOR_LABEL_OVERRIDES].forEach(
    bundle => {
      Object.entries(bundle).forEach(([key, byLang]) => {
        if (byLang[lang]) out[key] = byLang[lang];
      });
    }
  );
  Object.entries(ICU_FIXES).forEach(([key, byLang]) => {
    if (byLang[lang]) out[key] = byLang[lang];
  });
  Object.entries(out).forEach(([key, value]) => {
    if (typeof value !== 'string') return;
    Object.entries(GLOBAL_PHRASE_OVERRIDES).forEach(([phrase, byLang]) => {
      if (value.includes(phrase) && byLang[lang]) {
        out[key] = value.split(phrase).join(byLang[lang]);
      }
    });
  });
  return out;
};

const buildLocale = lang => {
  const isIt = lang === 'it';
  const isPt = lang === 'pt';
  const manual = isIt ? manualIt : isPt ? manualPt : null;
  const native = isIt ? nativeIt : isPt ? nativePt : null;
  const donor = isIt ? fr : isPt ? es : null;
  const isClean = isIt ? isCleanIt : isPt ? isCleanPt : null;
  const out = {};

  Object.keys(en).forEach(key => {
    if (manual?.[key]) {
      out[key] = manual[key];
      return;
    }
    if (gap[key]?.[lang] && gap[key][lang] !== en[key]) {
      out[key] = gap[key][lang];
      return;
    }
    if (native?.[key] && isClean(key, native[key])) {
      out[key] = native[key];
      return;
    }
    if (isClean && isClean(key, current[lang][key])) {
      out[key] = current[lang][key];
      return;
    }
    // Never keep FR/ES donor copy
    if (donor && current[lang][key] && current[lang][key] !== donor[key]) {
      if (isClean(key, current[lang][key])) {
        out[key] = current[lang][key];
        return;
      }
    }
  });

  const withOverrides = applyOverrides(out, lang);
  const priority = isIt ? PRIORITY_IT_FIXES : isPt ? PRIORITY_PT_FIXES : null;
  if (priority) {
    Object.entries(priority).forEach(([key, value]) => {
      if (en[key] !== undefined) withOverrides[key] = value;
    });
  }
  return withOverrides;
};

const sortKeys = obj =>
  Object.keys(obj)
    .sort()
    .reduce((acc, k) => {
      acc[k] = obj[k];
      return acc;
    }, {});

const report = { it: {}, pt: {}, inbox: {} };

const itOut = buildLocale('it');
const ptOut = buildLocale('pt');

Object.keys(en).forEach(key => {
  if (!itOut[key]) itOut[key] = en[key];
  if (!ptOut[key]) ptOut[key] = en[key];
});

fs.writeFileSync(path.join(ROOT, 'it.json'), `${JSON.stringify(sortKeys(itOut), null, 2)}\n`);
fs.writeFileSync(path.join(ROOT, 'pt.json'), `${JSON.stringify(sortKeys(ptOut), null, 2)}\n`);

// Inbox label fix on DE/FR/ES only
['de', 'fr', 'es'].forEach(lang => {
  const data = { ...current[lang] };
  let changed = 0;
  Object.entries(INBOX_LABEL_OVERRIDES).forEach(([key, byLang]) => {
    if (byLang[lang] && data[key] !== byLang[lang]) {
      data[key] = byLang[lang];
      changed += 1;
    }
  });
  if (changed) {
    fs.writeFileSync(path.join(ROOT, `${lang}.json`), `${JSON.stringify(sortKeys(data), null, 2)}\n`);
    report.inbox[lang] = changed;
  }
});

// Ambassador product terms on all non-EN locales
report.ambassador = {};
['de', 'fr', 'es', 'it', 'pt'].forEach(lang => {
  const filePath = path.join(ROOT, `${lang}.json`);
  const data = loadJson(filePath);
  let changed = 0;
  Object.entries(AMBASSADOR_LABEL_OVERRIDES).forEach(([key, byLang]) => {
    if (byLang[lang] && data[key] !== byLang[lang]) {
      data[key] = byLang[lang];
      changed += 1;
    }
  });
  if (changed) {
    fs.writeFileSync(filePath, `${JSON.stringify(sortKeys(data), null, 2)}\n`);
    report.ambassador[lang] = changed;
  }
});

const countIssues = (lang, out, donor, suspectRe) => {
  const equalsDonor = Object.keys(en).filter(k => out[k] === donor[k]).length;
  const suspectedFragments = Object.keys(en).filter(
    k => suspectRe.test(out[k] || '') && out[k] !== donor[k]
  ).length;
  const suspectedDonorOrFragments = Object.keys(en).filter(
    k => out[k] === donor[k] || suspectRe.test(out[k] || '')
  ).length;
  const missing = Object.keys(en).filter(k => !out[k]).length;
  const fallbackEn = Object.keys(en).filter(k => out[k] === en[k]).length;
  const priorityPrefixes = [
    'CoachDashboardPage.',
    'InboxPage.',
    'CoachCalendarPage.',
    'ManageListingsPage.',
    'AmbassadorToolsPage.',
    'AuthenticationPage.',
    'LoginPage.',
    'SignupPage.',
    'CoachEarningsPage.',
    'AboutPage.',
    'CoachApplicationPage.',
    'Landing',
  ];
  const prioritySuspected = Object.keys(en).filter(k => {
    if (!priorityPrefixes.some(p => k.startsWith(p))) return false;
    return out[k] === donor[k] || suspectRe.test(out[k] || '');
  }).length;
  return {
    equalsDonor,
    suspectedFragments,
    suspectedDonorOrFragments,
    prioritySuspected,
    missing,
    fallbackEn,
    total: Object.keys(out).length,
  };
};

report.it = countIssues('it', itOut, fr, frSuspect);
report.pt = countIssues('pt', ptOut, es, esSuspect);
report.filesChanged = ['src/translations/it.json', 'src/translations/pt.json'];

report.it.remainingSuspectedFrench = Object.keys(en).filter(
  k => frSuspect.test(itOut[k] || '') && itOut[k] !== fr[k]
);
report.pt.remainingSuspectedSpanish = Object.keys(en).filter(
  k => esSuspect.test(ptOut[k] || '') && ptOut[k] !== es[k]
);
report.it.remainingSuspectedFrenchCount = report.it.remainingSuspectedFrench.length;
report.pt.remainingSuspectedSpanishCount = report.pt.remainingSuspectedSpanish.length;
delete report.it.remainingSuspectedFrench;
delete report.pt.remainingSuspectedSpanish;

// corrections vs previous
const prevIt = current.it;
const prevPt = current.pt;
report.it.corrected = Object.keys(en).filter(k => prevIt[k] !== itOut[k]).length;
report.pt.corrected = Object.keys(en).filter(k => prevPt[k] !== ptOut[k]).length;

fs.writeFileSync(path.join(__dirname, 'contamination-fix-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
