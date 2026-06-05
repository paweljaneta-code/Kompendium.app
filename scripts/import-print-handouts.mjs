import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const kompendiumPath = path.resolve(projectRoot, "kompendium.html");
const printRoot = path.resolve(projectRoot, "public/handouts/print");

const defaultSources = [
  path.resolve(process.env.USERPROFILE || "", "Desktop/Handouty-do-druku/Handouty do druku niezintegrowane"),
  path.resolve(process.env.USERPROFILE || "", "Desktop/Handouty do druku niezintegrowane"),
];

const sourceDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : defaultSources.find((dir) => fs.existsSync(dir));

if (!sourceDir) {
  console.error("Brak folderu z handoutami. Podaj sciezke:");
  console.error(
    '  node scripts/import-print-handouts.mjs "C:\\Users\\...\\Desktop\\Handouty-do-druku\\Handouty do druku niezintegrowane"'
  );
  process.exit(1);
}

const folderToModule = {
  act: "act",
  adhd: "adhd",
  alcohol: "alcohol",
  anoreksja: "an",
  "att anxious": "att-anxious",
  avpd: "avpd",
  bdd: "bdd-dys",
  bpd: "bpd",
  bulimia: "bn",
  burnout: "burnout",
  chad: "bipolar",
  codep: "codep",
  cptsd: "cptsd",
  dbt: "dbt",
  depresja: "dep",
  derm: "derm",
  dermatilomania: "derm",
  "dialog motywacyjny": "mi",
  "dla bliskich": "caregivers",
  "fobia specyficzna": "phobia",
  gad: "gad",
  "lekowo-ambiwalentny": "att-fearful",
  "lek zdrowotny": "health_anx",
  mindfulness: "mindful",
  motywacja: "motivation",
  npd: "npd",
  ocd: "ocd",
  ocpd: "ocpd",
  panika: "panika",
  ppu: "ppu",
  "praca z emocjami": "emotions",
  "praca ze wstydem": "shame",
  prokrastynacja: "procrast",
  "przekonania kluczowe": "core-beliefs",
  psychosis: "psychosis",
  ptsd: "ptsd",
  "relacje partnerskie": "couples",
  relaksacja: "relaks",
  rezyliencja: "resilience",
  sad: "sad",
  "samopoczucie i dobrostan": "wellbeing",
  samowspolczucie: "selfcomp",
  stpp: "stpp",
  "terapia schematow": "schema",
  "terapia systemowa": "systemowa",
  "umiejetnosci interpersonalne": "interpers",
  "unikajacy sp": "att-avoidant",
  uzaleznienia: "addiction",
  "uzaleznienia behawioralne": "behav-add",
  wspoluzaleznienie: "codep",
  "zarzadzanie stresem": "stress",
  "zdezorganizowany sp": "att-fearful",
  zaloba: "grief",
  zlosc: "anger",
};

function normalizeFolderName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseHandoutIndex(source) {
  const marker = "window.HANDOUT_INDEX = ";
  const start = source.indexOf(marker);
  if (start === -1) return {};
  const jsonStart = start + marker.length;
  let depth = 0;
  for (let i = jsonStart; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return eval("(" + source.slice(jsonStart, i + 1) + ")");
      }
    }
  }
  return {};
}

function buildCardModuleMap(source) {
  const map = {};
  const tabRe =
    /<div class="tab-content"[^>]*id="tab-([^"]+)"[\s\S]*?(?=<div class="tab-content"|$)/g;
  let match;
  while ((match = tabRe.exec(source)) !== null) {
    for (const cardMatch of match[0].matchAll(/<details class="card" id="([^"]+)"/g)) {
      map[cardMatch[1]] = match[1];
    }
  }
  return map;
}

function buildOpenHandoutIds(source) {
  const ids = new Set();
  for (const match of source.matchAll(/openHandout\(['"]([^'"]+)['"]\)/g)) {
    ids.add(match[1]);
  }
  return ids;
}

function buildFilenameAliases(handoutIndex, cardMap, openHandoutIds) {
  const aliases = new Map();
  const allCids = [
    ...Object.keys(handoutIndex),
    ...Object.keys(cardMap),
    ...openHandoutIds,
  ];

  for (const cid of allCids) {
    aliases.set(cid.normalize("NFC").toLowerCase(), cid);

    const griefMatch = cid.match(/^(.*)-grief$/);
    if (griefMatch) {
      aliases.set(`zaloba-${griefMatch[1]}`.normalize("NFC").toLowerCase(), cid);
    }

    if (cid.startsWith("pgd-")) {
      aliases.set(`zaloba-pgd-czym-jest`, cid);
    }
    if (cid === "perinatal-grief") {
      aliases.set("zaloba-strata-ciazy", cid);
    }
    if (cid === "grief-model-dpm" || cid === "model-dpm") {
      aliases.set("zaloba-model-dwoch-procesow", cid);
      aliases.set("zaloba-czym-jest", cid);
    }
    if (cid === "zalobnicy-grief") {
      aliases.set("zaloba-w-kulturze", cid);
    }
    if (cid === "wsparcie-grief") {
      aliases.set("zaloba-co-mowic", cid);
    }
    if (cid === "rocznice-grief") {
      aliases.set("zaloba-daty-swieta", cid);
    }
    if (cid === "dzieci-grief") {
      aliases.set("zaloba-dziecka", cid);
    }
    if (cid === "podloze-grief") {
      aliases.set("zaloba-neurobiologia", cid);
    }
    if (cid === "czym-bdd") {
      aliases.set("bdd-czym-jest", cid);
    }
    if (cid === "dieta-dep") {
      aliases.set("jedzenie-nastroj", cid);
      aliases.set("dep-jedzenie-nastroj", cid);
    }
    if (cid === "sens-po-stracie") {
      aliases.set("zaloba-szukanie-sensu", cid);
    }
    if (cid === "odbudowa-grief") {
      aliases.set("zaloba-odbudowa", cid);
      aliases.set("zaloba-odbudowa-tozsamosci", cid);
    }
    if (cid === "pgd-grief") {
      aliases.set("zaloba-pgd-czym-jest", cid);
    }
  }

  return aliases;
}

function stripKnownPrefixes(base, folderHint) {
  const prefixes = new Set(["pdf-"]);
  if (folderHint) {
    prefixes.add(`${folderHint}-`);
    if (folderHint === "grief") prefixes.add("zaloba-");
  }

  let current = base;
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of prefixes) {
      if (current.toLowerCase().startsWith(prefix.toLowerCase())) {
        current = current.slice(prefix.length);
        changed = true;
      }
    }
  }
  return current;
}

function fixMojibake(value) {
  return value
    .replace(/ko┼éo/gi, "koło")
    .replace(/spo┼é/gi, "społ")
    .replace(/┼é/g, "ł")
    .replace(/┼/g, "ł");
}

function resolveCanonicalCid(rawBase, aliasMap, folderHint) {
  const candidates = [
    rawBase,
    fixMojibake(rawBase),
    stripKnownPrefixes(rawBase, folderHint),
    stripKnownPrefixes(fixMojibake(rawBase), folderHint),
  ];

  for (const candidate of candidates) {
    const norm = candidate.normalize("NFC").toLowerCase();
    if (aliasMap.has(norm)) return aliasMap.get(norm);
  }

  const base = stripKnownPrefixes(fixMojibake(rawBase), folderHint);
  const norm = base.normalize("NFC").toLowerCase();

  let best = null;
  let bestLen = 0;
  for (const [kNorm, canonical] of aliasMap) {
    if (norm.startsWith(kNorm) && kNorm.length > bestLen && norm.length - kNorm.length <= 12) {
      best = canonical;
      bestLen = kNorm.length;
    }
  }
  if (best) return best;

  for (const [kNorm, canonical] of aliasMap) {
    if (kNorm.startsWith(norm) && kNorm.length - norm.length <= 12) return canonical;
  }

  return base;
}

function resolveModule(cid, folderHint, handoutIndex, cardMap) {
  return handoutIndex[cid] || cardMap[cid] || folderHint || null;
}

function inferFolderModule(folderName) {
  const key = normalizeFolderName(folderName);
  return folderToModule[key] || null;
}

const kompendium = fs.readFileSync(kompendiumPath, "utf8");
const handoutIndex = parseHandoutIndex(kompendium);
const cardMap = buildCardModuleMap(kompendium);
const openHandoutIds = buildOpenHandoutIds(kompendium);
const aliasMap = buildFilenameAliases(handoutIndex, cardMap, openHandoutIds);

const copied = new Map();
const unknown = [];
const skipped = [];
let totalFiles = 0;

for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const folderPath = path.join(sourceDir, entry.name);
  const folderHint = inferFolderModule(entry.name);

  for (const fileEntry of fs.readdirSync(folderPath, { withFileTypes: true })) {
    if (!fileEntry.isFile()) continue;

    const ext = path.extname(fileEntry.name).toLowerCase();
    if (ext !== ".html" && ext !== ".pdf") continue;

    const rawCid = fileEntry.name.slice(0, -ext.length);
    if (rawCid === "index" || rawCid.endsWith("-index")) continue;

    totalFiles++;
    const cid = resolveCanonicalCid(rawCid, aliasMap, folderHint);
    const srcPath = path.join(folderPath, fileEntry.name);

    const moduleSlug = resolveModule(cid, folderHint, handoutIndex, cardMap) || folderHint;
    if (!moduleSlug) {
      unknown.push({ cid, raw: rawCid, folder: entry.name, file: fileEntry.name });
      continue;
    }

    const outDir = path.join(printRoot, moduleSlug);
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `${cid}${ext}`);

    fs.copyFileSync(srcPath, outPath);
    if (rawCid !== cid) {
      const wrongPath = path.join(outDir, `${rawCid}${ext}`);
      if (wrongPath !== outPath && fs.existsSync(wrongPath)) {
        fs.unlinkSync(wrongPath);
      }
    }

    const key = `${moduleSlug}/${cid}${ext}`;
    copied.set(key, entry.name);
  }
}

const byModule = {};
for (const key of copied.keys()) {
  const mod = key.split("/")[0];
  byModule[mod] = (byModule[mod] || 0) + 1;
}

const coveredButtons = [...openHandoutIds].filter((id) => {
  const mod = handoutIndex[id] || cardMap[id];
  if (!mod) return false;
  return (
    fs.existsSync(path.join(printRoot, mod, `${id}.pdf`)) ||
    fs.existsSync(path.join(printRoot, mod, `${id}.html`))
  );
});

console.log("Zrodlo:", sourceDir);
console.log("Pliki zrodlowe (html+pdf):", totalFiles);
console.log("Skopiowano:", copied.size);
console.log("Moduly:", Object.keys(byModule).length);
console.log(
  "Przyciski openHandout z plikiem:",
  coveredButtons.length + "/" + openHandoutIds.size
);
console.log("");

if (unknown.length) {
  console.log(`Bez modulu (${unknown.length}):`);
  for (const item of unknown.slice(0, 25)) {
    console.log(`  - ${item.file} (${item.folder})`);
  }
  if (unknown.length > 25) console.log(`  ... i ${unknown.length - 25} wiecej`);
  console.log("");
}

const missingButtons = [...openHandoutIds].filter((id) => !coveredButtons.includes(id));
if (missingButtons.length) {
  console.log(`Brak pliku dla przycisku (${missingButtons.length}):`);
  for (const id of missingButtons.slice(0, 25)) {
    const mod = handoutIndex[id] || cardMap[id] || "?";
    console.log(`  - ${id} (${mod})`);
  }
  if (missingButtons.length > 25) console.log(`  ... i ${missingButtons.length - 25} wiecej`);
}
