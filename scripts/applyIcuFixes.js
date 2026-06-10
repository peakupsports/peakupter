/**
 * Apply hand-crafted ICU/status string fixes across all locales.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src', 'translations');
const FIXES = require('./lib/icuStatusFixes');

const sortKeys = obj =>
  Object.keys(obj)
    .sort()
    .reduce((acc, k) => {
      acc[k] = obj[k];
      return acc;
    }, {});

['de', 'fr', 'es', 'it', 'pt'].forEach(lang => {
  const file = path.join(ROOT, `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  let applied = 0;
  Object.entries(FIXES).forEach(([key, byLang]) => {
    if (byLang[lang]) {
      data[key] = byLang[lang];
      applied += 1;
    }
  });
  fs.writeFileSync(file, `${JSON.stringify(sortKeys(data), null, 2)}\n`);
  console.log(`${lang}: applied ${applied} ICU fixes`);
});
