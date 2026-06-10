/**
 * Complete all marketplace text locales from en.json baseline.
 *
 * DEPRECATED for IT/PT: uses FR→IT and ES→PT adaptation which causes contamination.
 * Use scripts/fixLocaleContamination.js instead.
 *
 * Run: ALLOW_CONTAMINATED_REBUILD=1 node scripts/completeAllTranslations.js
 */
if (!process.env.ALLOW_CONTAMINATED_REBUILD) {
  console.error(
    'Blocked: completeAllTranslations.js adapts IT from FR and PT from ES (contamination risk).',
  );
  console.error('Use: node scripts/fixLocaleContamination.js');
  console.error('To force run: ALLOW_CONTAMINATED_REBUILD=1 node scripts/completeAllTranslations.js');
  process.exit(1);
}

const fs = require('fs');
const path = require('path');

const { frToIt, esToPt } = require('./lib/localeAdapt');
const { GLOBAL_PHRASE_OVERRIDES, KEY_OVERRIDES } = require('./lib/globalOverrides');
const { SHARED_ENGLISH_FIXES } = require('./lib/sharedEnglishFixes');

const ROOT = path.join(__dirname, '..', 'src', 'translations');
const LANGS = ['de', 'fr', 'es', 'it', 'pt'];

const loadJson = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const gapTranslations = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'gap-translations-622.json'), 'utf8')
);

const en = loadJson('en.json');
const existing = {
  de: loadJson('de.json'),
  fr: loadJson('fr.json'),
  es: loadJson('es.json'),
  it: loadJson('it.json'),
  pt: loadJson('pt.json'),
};

const sortKeys = obj =>
  Object.keys(obj)
    .sort()
    .reduce((acc, k) => {
      acc[k] = obj[k];
      return acc;
    }, {});

const applyOverrides = (messages, lang) => {
  const out = { ...messages };
  Object.entries(KEY_OVERRIDES).forEach(([key, byLang]) => {
    if (byLang[lang]) {
      out[key] = byLang[lang];
    }
  });
  Object.entries(SHARED_ENGLISH_FIXES).forEach(([key, byLang]) => {
    if (byLang[lang]) {
      out[key] = byLang[lang];
    }
  });
  Object.entries(out).forEach(([key, value]) => {
    if (typeof value !== 'string') {
      return;
    }
    Object.entries(GLOBAL_PHRASE_OVERRIDES).forEach(([phrase, byLang]) => {
      if (value.includes(phrase) && byLang[lang]) {
        out[key] = value.split(phrase).join(byLang[lang]);
      }
    });
  });
  return out;
};

const buildFromDonor = (lang, donor, adaptFn, preserved) => {
  const out = { ...preserved };
  Object.keys(en).forEach(key => {
    if (out[key]) {
      return;
    }
    if (gapTranslations[key]?.[lang]) {
      out[key] = gapTranslations[key][lang];
      return;
    }
    const donorValue = donor[key];
    if (donorValue && donorValue !== en[key]) {
      out[key] = adaptFn(donorValue);
    }
  });
  return out;
};

const buildWestern = (lang, base) => {
  const out = { ...base };
  Object.keys(en).forEach(key => {
    if (!out[key] && gapTranslations[key]?.[lang]) {
      out[key] = gapTranslations[key][lang];
    }
  });
  return out;
};

let completed = {
  de: buildWestern('de', existing.de),
  fr: buildWestern('fr', existing.fr),
  es: buildWestern('es', existing.es),
  it: buildFromDonor('it', existing.fr, frToIt, existing.it),
  pt: buildFromDonor('pt', existing.es, esToPt, existing.pt),
};

LANGS.forEach(lang => {
  completed[lang] = applyOverrides(completed[lang], lang);
});

const report = {};
LANGS.forEach(lang => {
  const keys = Object.keys(en);
  const missing = keys.filter(k => !completed[lang][k]);
  const sameAsEn = keys.filter(k => completed[lang][k] === en[k]);
  report[lang] = {
    total: Object.keys(completed[lang]).length,
    missing: missing.length,
    sameAsEn: sameAsEn.length,
  };
  fs.writeFileSync(
    path.join(ROOT, `${lang}.json`),
    `${JSON.stringify(sortKeys(completed[lang]), null, 2)}\n`
  );
});

console.log('Translation completion report:');
console.log(JSON.stringify(report, null, 2));

if (report.it.missing || report.pt.missing) {
  console.warn('Some keys still missing — filling from donor without adaptation.');
  ['it', 'pt'].forEach(lang => {
    const donor = lang === 'it' ? existing.fr : existing.es;
    Object.keys(en).forEach(key => {
      if (!completed[lang][key] && donor[key]) {
        completed[lang][key] = donor[key];
      }
    });
    completed[lang] = applyOverrides(completed[lang], lang);
    fs.writeFileSync(
      path.join(ROOT, `${lang}.json`),
      `${JSON.stringify(sortKeys(completed[lang]), null, 2)}\n`
    );
  });
}
