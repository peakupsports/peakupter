/**
 * Normalize Ambassador product terminology across locale JSON files.
 * Run: node scripts/applyAmbassadorTerminology.js
 */
const fs = require('fs');
const path = require('path');

const AMBASSADOR_LABEL_OVERRIDES = require('./lib/ambassadorLabelOverrides');

const ROOT = path.join(__dirname, '..', 'src', 'translations');
const LOCALES = ['en', 'de', 'fr', 'es', 'it', 'pt'];

const loadJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const sortKeys = obj =>
  Object.keys(obj)
    .sort()
    .reduce((acc, k) => {
      acc[k] = obj[k];
      return acc;
    }, {});

const REPLACEMENTS = [
  [/Programma Ambasciatore PeakUp/gi, 'PeakUp Ambassador Program'],
  [/Programa Embaixador PeakUp/gi, 'PeakUp Ambassador Program'],
  [/Programa Embajador PeakUp/gi, 'PeakUp Ambassador Program'],
  [/Programme Ambassadeur PeakUp/gi, 'PeakUp Ambassador Program'],
  [/PeakUp Ambassador Programm\b/gi, 'PeakUp Ambassador Program'],
  [/Programma Ambasciatori\b/gi, 'Ambassador Program'],
  [/Programma Ambasciatore\b/gi, 'Ambassador Program'],
  [/Programa Embaixador\b/gi, 'Ambassador Program'],
  [/Programa Embajador\b/gi, 'Ambassador Program'],
  [/Programme Ambassadeur\b/gi, 'Ambassador Program'],
  [/Programme Ambassador\b/gi, 'Ambassador Program'],
  [/Programma Ambassador\b/gi, 'Ambassador Program'],
  [/Programa Ambassador\b/gi, 'Ambassador Program'],
  [/\bAmbassador Programm\b/gi, 'Ambassador Program'],
  [/\bAmbassador-Programm\b/gi, 'Ambassador Program'],
  [/\bPeakUp-Ambassador-Programm\b/gi, 'PeakUp Ambassador Program'],
  [/\bPrograma Ambassadors\b/gi, 'Ambassador Program'],
  [/\bProgramme Ambassadors\b/gi, 'Ambassador Program'],
  [/\bprograma Ambassadors\b/gi, 'Ambassador Program'],
  [/\bprogramme ambassadors\b/gi, 'Ambassador Program'],
  [/Strumenti dell'ambasciatore/gi, 'Ambassador Tools'],
  [/Strumenti ambassador/gi, 'Ambassador Tools'],
  [/Outils ambassadeur/gi, 'Ambassador Tools'],
  [/Herramientas de embajador/gi, 'Ambassador Tools'],
  [/Ferramentas de embaixador/gi, 'Ambassador Tools'],
  [/Ferramentas ambassador/gi, 'Ambassador Tools'],
  [/Ambassador-Tools/gi, 'Ambassador Tools'],
  [/AMBASCIATORE ✦/g, 'AMBASSADOR ✦'],
  [/EMBAIXADOR ✦/g, 'AMBASSADOR ✦'],
  [/Ambassadeur (Bronze|Silver|Gold|Platinum|Diamond)\b/gi, '$1 Ambassador'],
  [/Embajador (Bronze|Silver|Gold|Platinum|Diamond)\b/gi, '$1 Ambassador'],
  [/Ambasciatore (Bronze|Silver|Gold|Platinum|Diamond)\b/gi, '$1 Ambassador'],
  [/Embaixador (Bronze|Silver|Gold|Platinum|Diamond)\b/gi, '$1 Ambassador'],
  [/\b(Bronze|Silver|Gold|Platinum|Diamond) Ambassadeur\b/gi, '$1 Ambassador'],
  [/\bSilber Ambassador\b/gi, 'Silver Ambassador'],
  [/panel de embajadores/gi, 'Ambassador dashboard'],
  [/tableau ambassadeur/gi, 'Ambassador dashboard'],
  [/painel do Embaixador/gi, 'Ambassador dashboard'],
  [/activations ambassadeur/gi, 'Ambassador activations'],
  [/activaciones de embajadores/gi, 'Ambassador activations'],
  [/attivazioni ambasciatori/gi, 'Ambassador activations'],
  [/attivazioni degli ambasciatori/gi, 'Ambassador activations'],
  [/ativações do embaixador/gi, 'Ambassador activations'],
  [/Ambassador-Aktivierungen/gi, 'Ambassador activations'],
  [/Interesse dell'ambasciatore/gi, 'Interesse Ambassador'],
  [/Interesse do embaixador/gi, 'Interesse Ambassador'],
  [/Bienvenido, embajador/gi, 'Bienvenido, Ambassador'],
  [/Bienvenue, ambassadeur/gi, 'Bienvenue, Ambassador'],
  [/Benvenuto, ambasciatore/gi, 'Benvenuto, Ambassador'],
  [/Bem-vindo, embaixador/gi, 'Bem-vindo, Ambassador'],
  [/Willkommen, Botschafter/gi, 'Willkommen, Ambassador'],
  [/Conoce a nuestros Embajadores/gi, 'Conoce a nuestros Ambassadors'],
  [/Rencontrez nos Ambassadeurs/gi, 'Rencontrez nos Ambassadors'],
  [/Incontra i nostri Ambasciatori/gi, 'Incontra i nostri Ambassadors'],
  [/Conheça nossos Embaixadores/gi, 'Conheça nossos Ambassadors'],
  [/Lerne unsere Botschafter kennen/gi, 'Lerne unsere Ambassadors kennen'],
  [/\bdell'ambasciatore\b/gi, 'Ambassador'],
  [/\bdel embajador\b/gi, 'Ambassador'],
  [/\bdes ambassadeurs\b/gi, 'Ambassadors'],
  [/\bdegli ambasciatori\b/gi, 'Ambassadors'],
  [/\bde embajadores\b/gi, 'Ambassadors'],
  [/\bdo embaixador\b/gi, 'Ambassador'],
  [/\bder Botschafter\b/gi, 'Ambassadors'],
  [/\bAmbasciatori\b/g, 'Ambassadors'],
  [/\bambasciatori\b/g, 'ambassadors'],
  [/\bAmbassadeurs\b/g, 'Ambassadors'],
  [/\bambassadeurs\b/g, 'ambassadors'],
  [/\bEmbajadores\b/g, 'Ambassadors'],
  [/\bembajadores\b/g, 'ambassadors'],
  [/\bEmbaixadores\b/g, 'Ambassadors'],
  [/\bembaixadores\b/g, 'ambassadors'],
  [/\bBotschafter\b/g, 'Ambassador'],
  [/\bbotschafter\b/g, 'ambassador'],
  [/\bAmbasciatore\b/g, 'Ambassador'],
  [/\bambasciatore\b/g, 'ambassador'],
  [/\bAmbassadeur\b/g, 'Ambassador'],
  [/\bambassadeur\b/g, 'ambassador'],
  [/\bEmbajador\b/g, 'Ambassador'],
  [/\bembajador\b/g, 'ambassador'],
  [/\bEmbaixador\b/g, 'Ambassador'],
  [/\bembaixador\b/g, 'ambassador'],
];

const PLURAL_FIXES = [
  [/\bfirst PeakUp Ambassador\b/gi, 'first PeakUp Ambassadors'],
  [/\bfirst Ambassadors PeakUp\b/gi, 'first PeakUp Ambassadors'],
  [/\bunsere Ambassador\b/gi, 'unsere Ambassadors'],
  [/\bnos Ambassador\b/gi, 'nos Ambassadors'],
  [/\bnuestros Ambassador\b/gi, 'nuestros Ambassadors'],
  [/\bi nostri Ambassador\b/gi, 'i nostri Ambassadors'],
  [/\bno Ambassador profiles\b/gi, 'no Ambassador profiles'],
  [/\bder Ambassador\b/gi, 'der Ambassadors'],
  [/\bTotal Ambassador payouts\b/gi, 'Total Ambassador payouts'],
  [/\bGesamtauszahlungen der Ambassador\b/gi, 'Gesamtauszahlungen Ambassador'],
  [/\bPagamenti totali degli Ambassador\b/gi, 'Pagamenti totali Ambassador'],
  [/\bPagos totales de Ambassador\b/gi, 'Pagos totales Ambassador'],
  [/\bPaiements totaux des Ambassador\b/gi, 'Paiements totaux Ambassador'],
  [/\bPagamentos totais do Ambassador\b/gi, 'Pagamentos totais Ambassador'],
];

const normalizeAmbassadorTerminology = value => {
  if (typeof value !== 'string') return value;
  let s = value;
  REPLACEMENTS.forEach(([re, repl]) => {
    s = s.replace(re, repl);
  });
  PLURAL_FIXES.forEach(([re, repl]) => {
    s = s.replace(re, repl);
  });
  return s;
};

const en = loadJson(path.join(ROOT, 'en.json'));
const ambassadorKeys = [
  ...new Set([
    ...Object.keys(en).filter(k => /ambassador/i.test(k)),
    ...Object.keys(en).filter(k => /\bambassador\b/i.test(en[k] || '')),
  ]),
];

const report = {};

LOCALES.forEach(lang => {
  const filePath = path.join(ROOT, `${lang}.json`);
  const data = loadJson(filePath);
  let changed = 0;

  ambassadorKeys.forEach(key => {
    if (data[key] == null) return;
    let next = normalizeAmbassadorTerminology(data[key]);
    const override = AMBASSADOR_LABEL_OVERRIDES[key]?.[lang];
    if (override) next = override;

    if (next !== data[key]) {
      data[key] = next;
      changed += 1;
    }
  });

  // EN: normalize tools label casing only
  if (lang === 'en') {
    ['CoachDashboardPage.cardAmbassadorTitle', 'TopbarDesktop.ambassadorToolsLink', 'TopbarMobileMenu.ambassadorToolsLink'].forEach(
      key => {
        if (data[key] === 'Ambassador tools') {
          data[key] = 'Ambassador Tools';
          changed += 1;
        }
      }
    );
  }

  if (changed) {
    fs.writeFileSync(filePath, `${JSON.stringify(sortKeys(data), null, 2)}\n`);
  }
  report[lang] = changed;
});

const bad = /ambasciat|ambassad|embajad|embaixad|botschafter/i;
const remaining = {};
['de', 'fr', 'es', 'it', 'pt'].forEach(lang => {
  const data = loadJson(path.join(ROOT, `${lang}.json`));
  remaining[lang] = ambassadorKeys.filter(k => bad.test(data[k] || '')).length;
});

console.log(JSON.stringify({ changed: report, remainingTranslatedTerms: remaining }, null, 2));
