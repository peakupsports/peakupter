/**
 * Merges Search/Map/Profile/Account discovery translations into it.json and pt.json.
 * Run: node scripts/mergeDiscoveryItPt.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src', 'translations');

const prefixes = [
  'SearchPage.',
  'SearchFilters',
  'FilterForm.',
  'CoachMapPage.',
  'ListingPage.',
  'ProfilePage.',
  'ProfileSettingsPage.',
  'ProfileSettingsForm.',
  'ContactDetailsPage.',
  'PasswordChangePage.',
  'ContactDetailsForm.',
  'PasswordChangeForm.',
  'LayoutWrapperAccountSettingsSideNav.',
  'ManageAccountPage.',
  'UserNav.',
  'EditListingPage.',
];

const loadBatches = names =>
  names.reduce((acc, name) => {
    const batch = JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
    return { ...acc, ...batch };
  }, {});

const itDiscovery = loadBatches([
  'discovery-it-batch1.json',
  'discovery-it-batch2.json',
  'discovery-it-batch3.json',
]);

const ptDiscovery = loadBatches([
  'discovery-pt-batch1.json',
  'discovery-pt-batch2.json',
  'discovery-pt-batch3.json',
]);

const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'en.json'), 'utf8'));
const itExisting = JSON.parse(fs.readFileSync(path.join(ROOT, 'it.json'), 'utf8'));
const ptExisting = JSON.parse(fs.readFileSync(path.join(ROOT, 'pt.json'), 'utf8'));

const match = k => prefixes.some(p => k.startsWith(p));
const keys = Object.keys(en).filter(match).sort();

const itOut = { ...itExisting };
const ptOut = { ...ptExisting };

let itAdded = 0;
let ptAdded = 0;

keys.forEach(key => {
  if (itDiscovery[key] && !itExisting[key]) {
    itOut[key] = itDiscovery[key];
    itAdded += 1;
  }
  if (ptDiscovery[key] && !ptExisting[key]) {
    ptOut[key] = ptDiscovery[key];
    ptAdded += 1;
  }
});

const sortKeys = obj =>
  Object.keys(obj)
    .sort()
    .reduce((acc, k) => {
      acc[k] = obj[k];
      return acc;
    }, {});

fs.writeFileSync(path.join(ROOT, 'it.json'), `${JSON.stringify(sortKeys(itOut), null, 2)}\n`);
fs.writeFileSync(path.join(ROOT, 'pt.json'), `${JSON.stringify(sortKeys(ptOut), null, 2)}\n`);

console.log(`IT keys added: ${itAdded} (total: ${Object.keys(itOut).length})`);
console.log(`PT keys added: ${ptAdded} (total: ${Object.keys(ptOut).length})`);

const placeholderRe = /\{[^}]+\}/g;
let warnings = 0;
keys.forEach(key => {
  const enPh = (en[key].match(placeholderRe) || []).sort().join(',');
  [
    ['it', itOut],
    ['pt', ptOut],
  ].forEach(([lang, out]) => {
    if (!out[key]) {
      console.warn(`Missing ${lang} key: ${key}`);
      warnings += 1;
      return;
    }
    const ph = (out[key].match(placeholderRe) || []).sort().join(',');
    if (enPh !== ph) {
      console.warn(`Placeholder mismatch ${lang} ${key}: en=[${enPh}] ${lang}=[${ph}]`);
      warnings += 1;
    }
  });
});

if (warnings === 0) {
  console.log('Placeholder validation: OK');
}

if (Object.keys(itDiscovery).length !== keys.length) {
  console.warn(`IT batch count ${Object.keys(itDiscovery).length} vs expected ${keys.length}`);
}
if (Object.keys(ptDiscovery).length !== keys.length) {
  console.warn(`PT batch count ${Object.keys(ptDiscovery).length} vs expected ${keys.length}`);
}
