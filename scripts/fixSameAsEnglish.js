/**
 * Replace same-as-English strings using donor locale translations.
 * DEPRECATED for IT/PT: re-applies FR→IT / ES→PT adaptation.
 *
 * Run: ALLOW_CONTAMINATED_REBUILD=1 node scripts/fixSameAsEnglish.js
 */
if (!process.env.ALLOW_CONTAMINATED_REBUILD) {
  console.error(
    'Blocked: fixSameAsEnglish.js re-applies FR→IT / ES→PT donor adaptation for IT/PT.',
  );
  console.error('Use: node scripts/fixLocaleContamination.js');
  process.exit(1);
}

const fs = require('fs');
const path = require('path');

const { frToIt, esToPt } = require('./lib/localeAdapt');
const { GLOBAL_PHRASE_OVERRIDES, KEY_OVERRIDES } = require('./lib/globalOverrides');
const { SHARED_ENGLISH_FIXES } = require('./lib/sharedEnglishFixes');

const applyOverrides = (messages, lang) => {
  const out = { ...messages };
  Object.entries(KEY_OVERRIDES).forEach(([key, byLang]) => {
    if (byLang[lang]) out[key] = byLang[lang];
  });
  Object.entries(SHARED_ENGLISH_FIXES).forEach(([key, byLang]) => {
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

const ROOT = path.join(__dirname, '..', 'src', 'translations');
const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'en.json'), 'utf8'));
const locales = {
  de: JSON.parse(fs.readFileSync(path.join(ROOT, 'de.json'), 'utf8')),
  fr: JSON.parse(fs.readFileSync(path.join(ROOT, 'fr.json'), 'utf8')),
  es: JSON.parse(fs.readFileSync(path.join(ROOT, 'es.json'), 'utf8')),
  it: JSON.parse(fs.readFileSync(path.join(ROOT, 'it.json'), 'utf8')),
  pt: JSON.parse(fs.readFileSync(path.join(ROOT, 'pt.json'), 'utf8')),
};

// Values intentionally identical across languages (brands, names, units, sport names)
const ALLOW_SAME = new Set([
  'PeakUp',
  'PeakUp HQ',
  'PeakUp Sports',
  'PeakUp Member',
  'PeakUp Founder',
  'Ambassador',
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Diamond',
  'Instagram',
  'OK',
  'FAQ',
  'MTB',
  'Ski',
  'Golf',
  'Tennis',
  'Yoga',
  'Surf',
  'Snowboard',
  'Skydive',
  'Kitesurf',
  'Wakeboard',
  'Wakesurf',
  'Skateboard',
  'Fitness',
  'Freeski',
  'No',
  'FAQ',
  'HTTPS',
  'JPG',
  'PNG',
  'CEO',
  'CTO',
  'COO',
  'Laax',
  'Zürich',
  'Verbier',
  'Lugano',
  'St. Moritz',
]);

const isAllowedSame = (value, key) => {
  if (!value || typeof value !== 'string') return true;
  if (ALLOW_SAME.has(value.trim())) return true;
  if (/^[\d\s%./:+•–—-]+$/.test(value)) return true;
  if (/^[\d.,]+\s*(reviews?|€|CHF|USD|MB)$/i.test(value)) return true;
  if (/^[A-Z][a-z]+\s[RK]\.$/.test(value)) return true; // Marco R.
  if (key.includes('.col') && value.length <= 12) return false;
  if (value.includes('PeakUp') && !value.match(/^(Grow|Find|About|Coach)/)) return true;
  return false;
};

const DONOR = {
  de: { donor: locales.fr, adapt: v => v },
  fr: { donor: locales.es, adapt: v => v },
  es: { donor: locales.fr, adapt: v => v },
  it: { donor: locales.fr, adapt: frToIt },
  pt: { donor: locales.es, adapt: esToPt },
};

const sortKeys = obj =>
  Object.keys(obj)
    .sort()
    .reduce((acc, k) => {
      acc[k] = obj[k];
      return acc;
    }, {});

const report = {};

['de', 'fr', 'es', 'it', 'pt'].forEach(lang => {
  const { donor, adapt } = DONOR[lang];
  let fixed = 0;
  Object.keys(en).forEach(key => {
    const current = locales[lang][key];
    if (current !== en[key] || isAllowedSame(current, key)) {
      return;
    }
    const donorValue = donor[key];
    if (donorValue && donorValue !== en[key]) {
      locales[lang][key] = adapt(donorValue);
      fixed += 1;
    }
  });
  const sameAfter = Object.keys(en).filter(
    k => locales[lang][k] === en[k] && !isAllowedSame(en[k], k)
  ).length;
  locales[lang] = applyOverrides(locales[lang], lang);
  report[lang] = { fixed, sameAsEnRemaining: sameAfter };
  fs.writeFileSync(
    path.join(ROOT, `${lang}.json`),
    `${JSON.stringify(sortKeys(locales[lang]), null, 2)}\n`
  );
});

console.log(JSON.stringify(report, null, 2));
