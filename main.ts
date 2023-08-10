import { path, Pool } from "./deps.ts";
import { Database } from "https://deno.land/x/sqlite3@0.9.1/mod.ts";

const dbs = {};

const platform = Deno.args[0]; // ios or macos
if (platform !== 'ios' && platform !== 'macos') {
  throw new Error('Unknown platform: ' + platform);
}

function getDBForLanguage(language:string): DB {
  const existing = dbs[language];
  if (existing) return existing;
  const db = new Database(`output/${platform}/${language}.db`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source text NOT NULL COLLATE NOCASE,
      target text NOT NULL COLLATE NOCASE,
      bundle_path text NOT NULL
    );
  `);
  dbs[language] = db;
  return db;
}

let counter = 0;
let skippedCount = 0;
let dirIndex = 0;
const rootDir = "data/" + platform;
const directories = [...Deno.readDirSync(rootDir)];

const blacklistLower = new Set<string>([
  '<dnl',
  '<no loc',
  '<noloc>',
  '< no loc',
  '<do not',
  '< do not loc',
  '<donotloc>',
  '<do not loc',
  '<don\'t localize',
  '<do not localize',
  '<do_not_localize',
  '<<dnl',
  '<< dnl',
  '<<do not',
  '<< do not',
  '<<< do not localize',
  '<<don\'t localize',
  '<< don\'t localize',
  '<< no loc >>',
  '<<>>',
  '{',
  '${',
  'kbit/s',
  'text cell',
  'table view cell',
  'text field cell',
  'itemview',
  'itema',
  'itemb',
  'itemc',
  '0.00',
  '0,00',
]);
const exactBlacklist = new Set<string>([
  '-',
  ',',
  ' ',
  '0',
  '1',
  '2',
  '=',
  '…',
  '”',
  '--',
  '″',
  '′',
  '.',
  '+',
  '*',
  '?',
  ')',
  '(',
]);
function shouldInclude(source:string, target:string) {
  const lowerTarget = target.toLowerCase();
  for (const b of blacklistLower) {
    if (lowerTarget.includes(b)) return false;
  }
  if (/^item\s?[0-9]\$*/.test(lowerTarget)) return false;
  if (/^objekt\s?[0-9]\$*/.test(lowerTarget)) return false;
  if (exactBlacklist.has(lowerTarget)) return false;
  return true;
}

for (const directory of directories) {
  const localizable: Localizable = JSON.parse(
    await Deno.readTextFile(path.join(rootDir, directory.name)),
  );
  const localizationKeys = Object.keys(localizable.localizations);
  let localizationKeyIndex = 0;
  for (const key of localizationKeys) {
    const localizations: [Localization] = localizable.localizations[key];
    for (const localization of localizations) {
      if (!key) {
        continue;
      }
      if (!localization.target) {
        continue;
      }

      const db = getDBForLanguage(localization.language);
      if (shouldInclude(key, localization.target)) {
        db.exec(
          `INSERT INTO translations (source, target, bundle_path) VALUES($1, $2, $3);`,
            key,
            localization.target,
            localizable.bundlePath,
        );
      } else {
        skippedCount++;
      }

      counter++;

      await Deno.stdout.write(new TextEncoder().encode("\r\x1b[K"));
      await Deno.stdout.write(new TextEncoder().encode(`${dirIndex}/${directories.length}\t${localizationKeyIndex}/${localizationKeys.length}\tTotal: ${counter}\tSkipped: ${skippedCount}`));
    }
    localizationKeyIndex++;
  }
  dirIndex++;
}

console.log('Total entry: ' + counter);
for (const lang in dbs) {
  const db = dbs[lang];
  db.close();
}

interface Localizable {
  localizations: { [key: string]: [Localization] };
  bundlePath: string;
  framework: string;
}

interface Localization {
  language: string;
  target: string;
  filename: string;
}
