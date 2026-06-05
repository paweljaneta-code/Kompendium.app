import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const kompendiumPath = path.resolve(projectRoot, "kompendium.html");
const sosRoot = path.resolve(projectRoot, "public/sos");

const defaultSource = path.resolve(
  process.env.USERPROFILE || process.env.HOME || "",
  "Desktop/ResztaWE"
);

const sourceDir = process.argv[2] ? path.resolve(process.argv[2]) : defaultSource;

if (!fs.existsSync(sourceDir)) {
  console.error("Brak folderu ResztaWE. Podaj sciezke:");
  console.error('  node scripts/import-resztawe-sos.mjs "C:\\Users\\...\\Desktop\\ResztaWE"');
  process.exit(1);
}

const folderToModule = {
  act: "act",
  adhd: "adhd",
  asd: "asd",
  "att anx": "att-anxious",
  "att avoidant": "att-avoidant",
  bdd: "bdd-dys",
  bulimia: "bn",
  burnout: "burnout",
  cptsd: "cptsd",
  dbt: "dbt",
  emocje: "emotions",
  "empatyczna komunikacja": "empathy-comm",
  gad: "gad",
  "health anx": "health_anx",
  "interpersonalne um": "interpers",
  meaning: "meaning",
  mindfulness: "mindful",
  motywacja: "motivation",
  nawyki: "habits",
  ocd: "ocd",
  panika: "panika",
  ppu: "ppu",
  prokrastynacja: "procrast",
  psu: "psu",
  relaksacja: "relaks",
  sad: "sad",
  selfcompassion: "selfcomp",
  stres: "stress",
  zaloba: "grief",
  "złość": "anger",
  zlosc: "anger",
};

function normalizeFolderName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseSosIndex(source) {
  const marker = "window.SOS_INDEX = ";
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

function buildCanonicalCidMap(cardMap, sosIndex) {
  const canonical = new Map();
  for (const cid of [...Object.keys(cardMap), ...Object.keys(sosIndex)]) {
    canonical.set(cid.normalize("NFC").toLowerCase(), cid);
  }
  return canonical;
}

function fixMojibake(value) {
  return value
    .replace(/ko┼éo/gi, "koło")
    .replace(/spo┼é/gi, "społ")
    .replace(/┼é/g, "ł")
    .replace(/┼/g, "ł");
}

function resolveCanonicalCid(rawCid, canonicalMap) {
  const candidates = [rawCid, fixMojibake(rawCid)];
  for (const candidate of candidates) {
    const hit = canonicalMap.get(candidate.normalize("NFC").toLowerCase());
    if (hit) return hit;
  }
  return rawCid;
}

function isStandaloneHtml(content) {
  return content.includes("<!DOCTYPE") || content.includes("<html");
}

const kompendium = fs.readFileSync(kompendiumPath, "utf8");
const sosIndex = parseSosIndex(kompendium);
const cardMap = buildCardModuleMap(kompendium);
const canonicalCidMap = buildCanonicalCidMap(cardMap, sosIndex);

function resolveModule(cid, folderHint, cardMap, sosIndex) {
  return cardMap[cid] || sosIndex[cid] || folderHint || null;
}

const copied = new Map();
const skipped = [];
const unknown = [];
let totalFiles = 0;

for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const folderPath = path.join(sourceDir, entry.name);
  const folderKey = normalizeFolderName(entry.name);
  const folderHint = folderToModule[folderKey] || folderToModule[entry.name.toLowerCase()] || null;

  if (!folderHint) {
    skipped.push(`Nieznany folder: ${entry.name}`);
    continue;
  }

  for (const fileEntry of fs.readdirSync(folderPath, { withFileTypes: true })) {
    if (!fileEntry.isFile() || !fileEntry.name.toLowerCase().endsWith(".html")) continue;

    totalFiles++;
    const rawCid = fileEntry.name.slice(0, -5);
    const cid = resolveCanonicalCid(rawCid, canonicalCidMap);
    const srcPath = path.join(folderPath, fileEntry.name);
    const content = fs.readFileSync(srcPath, "utf8");

    if (!isStandaloneHtml(content)) {
      skipped.push(`${cid} (${entry.name}) — brak pelnego HTML`);
      continue;
    }

    const moduleSlug = resolveModule(cid, folderHint, cardMap, sosIndex);
    if (!moduleSlug) {
      unknown.push({ cid, folder: entry.name });
      continue;
    }

    const outDir = path.join(sosRoot, moduleSlug);
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `${cid}.html`);

    if (copied.has(outPath)) {
      console.warn(
        `Nadpisuje ${moduleSlug}/${cid}.html (${copied.get(outPath)} -> ${entry.name})`
      );
    } else if (fs.existsSync(outPath)) {
      console.warn(`Nadpisuje istniejacy ${moduleSlug}/${cid}.html (z ${entry.name})`);
    }

    fs.writeFileSync(outPath, content.endsWith("\n") ? content : content + "\n", "utf8");
    if (rawCid !== cid) {
      const brokenPath = path.join(outDir, `${rawCid}.html`);
      if (brokenPath !== outPath && fs.existsSync(brokenPath)) {
        fs.unlinkSync(brokenPath);
      }
    }
    copied.set(outPath, entry.name);
  }
}

const byModule = {};
for (const outPath of copied.keys()) {
  const mod = path.basename(path.dirname(outPath));
  byModule[mod] = (byModule[mod] || 0) + 1;
}

console.log("Zrodlo:", sourceDir);
console.log("Pliki HTML w ResztaWE:", totalFiles);
console.log("Skopiowano do public/sos:", copied.size);
console.log("Moduly:", Object.keys(byModule).length);
console.log("");

if (unknown.length) {
  console.log(`Bez modulu (${unknown.length}):`);
  for (const item of unknown.slice(0, 20)) {
    console.log(`  - ${item.cid} (${item.folder})`);
  }
  if (unknown.length > 20) console.log(`  ... i ${unknown.length - 20} wiecej`);
  console.log("");
}

if (skipped.length) {
  console.log(`Pominiete (${skipped.length}):`);
  for (const line of skipped.slice(0, 15)) console.log(`  - ${line}`);
  if (skipped.length > 15) console.log(`  ... i ${skipped.length - 15} wiecej`);
  console.log("");
}

console.log("Rozklad per modul:");
for (const [mod, count] of Object.entries(byModule).sort((a, b) => a[0].localeCompare(b[0], "pl"))) {
  console.log(`  ${mod}: ${count}`);
}
