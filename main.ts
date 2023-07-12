import { path, Pool } from "./deps.ts";
import { Database } from "https://deno.land/x/sqlite3@0.9.1/mod.ts";

const dbs = {};
const platform = 'macos';

function getDBForLanguage(language:string): DB {
  const existing = dbs[language];
  if (existing) return existing;
  const db = new Database(`output/${language}.db`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id integer NOT NULL,
      source text NOT NULL,
      target text NOT NULL,
      file_name text NOT NULL,
      bundle_path text NOT NULL
    );
  `);
  dbs[language] = db;
  return db;
}

let counter = 0;
let groupId = 1;
let dirIndex = 0;
const groupIds: { [key: string]: number } = {};
const rootDir = "data/" + platform;
const directories = [...Deno.readDirSync(rootDir)];
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

      const k = `${localizable.bundlePath}:${key}`;
      let gid = groupIds[k];
      if (!gid) {
        gid = groupId;
        groupIds[k] = gid;
        groupId++;
      }

      const db = getDBForLanguage(localization.language);
      db.exec(
        `INSERT INTO translations (group_id, source, target, file_name, bundle_path) VALUES($1, $2, $3, $4, $5);`,
          gid,
          key,
          localization.target,
          localization.filename,
          localizable.bundlePath,
      );

      counter++;

      await Deno.stdout.write(new TextEncoder().encode("\r\x1b[K"));
      await Deno.stdout.write(new TextEncoder().encode(`${dirIndex}/${directories.length}\t${localizationKeyIndex}/${localizationKeys.length}\tTotal: ${counter}`));
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
