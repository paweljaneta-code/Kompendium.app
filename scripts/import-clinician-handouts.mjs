import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const kompendiumPath = path.join(projectRoot, "kompendium.html");
const defaultSource = path.join(
  process.env.USERPROFILE || "",
  "Desktop/arkusze-klinicysty-extracted/arkusze klinicysty"
);
const sourceRoot = process.argv[2] ? path.resolve(process.argv[2]) : defaultSource;
const outRoot = path.join(projectRoot, "public/handouts/clinician");
const reportPath = path.join(projectRoot, "public/handouts/clinician-import-report.json");

const folderToModule = {
  act: "act",
  adhd: "adhd",
  alkohol: "alcohol",
  anoreksja: "an",
  asd: "asd",
  aspd: "aspd",
  audhd: "audhd",
  avpd: "avpd",
  bdd: "bdd-dys",
  bezsennosc: "insomnia",
  bipolar: "bipolar",
  bpd: "bpd",
  bulimia: "bn",
  dbt: "dbt",
  depresja: "dep",
  dermatilomania: "derm",
  "dialog motywujacy": "mi",
  fobia: "phobia",
  gad: "gad",
  hejt: "hejt",
  "inne zo": "inne-zo",
  "interwencja kryzysowa": "crisis",
  "komunikacja empatyczna": "empathy-comm",
  "lek zdrowotny": "health_anx",
  mindfulness: "mindful",
  "motywacja i zmiana": "motivation",
  "narkotyki i leki": "drugs",
  npd: "npd",
  ocd: "ocd",
  ocpd: "ocpd",
  "praca z emocjami": "emotions",
  "praca ze wstydem": "shame",
  "praca ze zloscia": "anger",
  prokrastynacja: "procrast",
  "przekonania kluczowe": "core-beliefs",
  "przemijanie i starzenie": "aging",
  psu: "psu",
  psychoza: "psychosis",
  "relacje partnerskie": "couples",
  relaksacja: "relaks",
  rezyliencja: "resilience",
  sad: "sad",
  "samoocena i sampwspolczucie": "selfcomp",
  sens: "meaning",
  "social media": "social",
  stpp: "stpp",
  "teoria przywiazania": "att-teoria",
  "terapia systemowa": "systemowa",
  "trudne wybory": "decisions",
  "uzaleznienia behawioralne": "behav-add",
  wspoluzaleznienie: "codep",
  wypalenie: "burnout",
  "zarzadzanie stresem": "stress",
};

function normalize(value) {
  return fixMojibake(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function fixMojibake(value) {
  return value
    .replace(/┼é/g, "ł")
    .replace(/┼/g, "ł")
    .replace(/─Ö/g, "ę")
    .replace(/─Ö/g, "ę")
    .replace(/├│/g, "ó")
    .replace(/├│/g, "ó")
    .replace(/┼Ť/g, "ś")
    .replace(/┼Ť/g, "ś")
    .replace(/┼╝/g, "ź")
    .replace(/┼║/g, "ż")
    .replace(/┼ä/g, "ń")
    .replace(/┼Ü/g, "ś")
    .replace(/ÔÇö/g, "—")
    .replace(/ÔÇô/g, "–")
    .replace(/ÔÇ×/g, "„")
    .replace(/ÔÇŁ/g, "”");
}

function parseModuleCards(slug, source) {
  const start = source.indexOf(`id="tab-${slug}"`);
  if (start === -1) return [];
  const end = source.indexOf('id="tab-', start + 10);
  const chunk = source.slice(start, end === -1 ? start + 800000 : end);
  const cards = [];
  const re =
    /<details class="card" id="([^"]+)"[\s\S]*?<span class="nm">([\s\S]*?)<\/span>/g;
  for (const m of chunk.matchAll(re)) {
    cards.push({
      id: m[1],
      name: m[2].replace(/<[^>]+>/g, "").trim(),
      norm: normalize(fixMojibake(m[2].replace(/<[^>]+>/g, ""))),
    });
  }
  return cards;
}

function parseFileMeta(filename) {
  const base = fixMojibake(filename.replace(/\.html$/i, ""));
  const stripped = base
    .replace(/^[A-Za-z]+\s+/i, "")
    .replace(/^\d+\s*[—–-]\s*/, "")
    .trim();
  const idxMatch = base.match(/(?:^|\s)(\d{1,3})\s*[—–-]/);
  const index = idxMatch ? Number.parseInt(idxMatch[1], 10) : null;
  return {
    title: stripped,
    norm: normalize(stripped),
    index,
  };
}

function resolveCard(cards, meta) {
  const exact = cards.find((c) => c.norm === meta.norm);
  if (exact) return { card: exact, method: "title-exact" };

  const contains = cards.find(
    (c) => c.norm.includes(meta.norm) || meta.norm.includes(c.norm)
  );
  if (contains && meta.norm.length >= 8) return { card: contains, method: "title-fuzzy" };

  if (meta.index && cards[meta.index - 1]) {
    return { card: cards[meta.index - 1], method: "index" };
  }

  let best = null;
  let bestScore = 0;
  for (const card of cards) {
    const a = new Set(meta.norm.split(" ").filter((w) => w.length > 3));
    const b = new Set(card.norm.split(" ").filter((w) => w.length > 3));
    let overlap = 0;
    for (const w of a) if (b.has(w)) overlap++;
    const score = overlap / Math.max(a.size, b.size, 1);
    if (score > bestScore && score >= 0.45) {
      best = card;
      bestScore = score;
    }
  }
  if (best) return { card: best, method: "token-overlap" };
  return null;
}

if (!fs.existsSync(sourceRoot)) {
  console.error("Brak folderu z arkuszami klinicysty:", sourceRoot);
  process.exit(1);
}

const kompendium = fs.readFileSync(kompendiumPath, "utf8");
const copied = [];
const unmatched = [];
const skipped = [];
let totalFiles = 0;

if (fs.existsSync(outRoot)) {
  fs.rmSync(outRoot, { recursive: true, force: true });
}

for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const folderKey = normalize(fixMojibake(entry.name));
  const slug = folderToModule[folderKey];
  if (!slug) {
    skipped.push({ folder: entry.name, reason: "unknown-folder" });
    continue;
  }

  const cards = parseModuleCards(slug, kompendium);
  const folderPath = path.join(sourceRoot, entry.name);

  for (const fileEntry of fs.readdirSync(folderPath, { withFileTypes: true })) {
    if (!fileEntry.isFile() || !fileEntry.name.toLowerCase().endsWith(".html")) continue;
    totalFiles++;
    const meta = parseFileMeta(fileEntry.name);
    const resolved = resolveCard(cards, meta);
    if (!resolved) {
      unmatched.push({
        folder: entry.name,
        slug,
        file: fileEntry.name,
        title: meta.title,
      });
      continue;
    }

    const outDir = path.join(outRoot, slug);
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `${resolved.card.id}.html`);
    fs.copyFileSync(path.join(folderPath, fileEntry.name), outPath);
    copied.push({
      slug,
      cardId: resolved.card.id,
      file: fileEntry.name,
      method: resolved.method,
    });
  }
}

const index = {};
for (const row of copied) {
  index[row.cardId] = row.slug;
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(
  path.join(projectRoot, "public/handouts/clinician-handout-index.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      count: Object.keys(index).length,
      index,
    },
    null,
    2
  ) + "\n",
  "utf8"
);
fs.writeFileSync(
  reportPath,
  JSON.stringify({ totalFiles, copied: copied.length, unmatched, skipped }, null, 2) + "\n",
  "utf8"
);

console.log(
  `Clinician handouts: ${copied.length}/${totalFiles} copied, ${unmatched.length} unmatched, ${skipped.length} skipped folders`
);
console.log(`Index: public/handouts/clinician-handout-index.json`);
console.log(`Report: public/handouts/clinician-import-report.json`);

if (unmatched.length) {
  console.log("\nFirst unmatched:");
  for (const row of unmatched.slice(0, 15)) {
    console.log(`- [${row.slug}] ${row.file}`);
  }
}
