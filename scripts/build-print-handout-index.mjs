import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const kompendiumPath = path.join(root, "kompendium.html");
const printRoot = path.join(root, "public/handouts/print");
const outPath = path.join(root, "public/handouts/print-resolver.json");

const MANUAL_OVERRIDES = {
  "czym-bdd": { mod: "bdd-dys", file: "bdd-czym-jest" },
  "dieta-dep": { mod: "dep", file: "jedzenie-nastroj" },
  "planowanie-aktywnosci": { mod: "dep", file: "ba-scheduling" },
  "monitorowanie-aktywnosci": { mod: "dep", file: "ba-monitoring" },
  "aktywnosci-przyjemne": { mod: "dep", file: "ba-pleasant" },
  "dep-be-mastery": { mod: "dep", file: "ba-mastery" },
  "znieksztalcenia-dep": { mod: "dep", file: "dep-znieksztalcenia", ext: "pdf" },
  "znieksztalcenia": { mod: "gad", file: "znieksztalcenia", ext: "pdf" }
};

const STOP_WORDS = new Set([
  "jest",
  "modul",
  "module",
  "oraz",
  "the",
  "and",
  "for",
  "with",
  "lineart",
  "handout",
  "handoutow",
  "narzedzi",
  "terapeutycznych",
  "kompendium",
  "w",
  "i",
  "a",
  "do",
  "na",
  "z",
  "o"
]);

const TOKEN_SYNONYMS = {
  dieta: ["jedzenie", "odzywianie"],
  odzywianie: ["jedzenie", "dieta"],
  jedzenie: ["odzywianie", "dieta"],
  aktywnosci: ["aktywnosc", "scheduling", "pleasant", "mastery"],
  planowanie: ["scheduling", "plan", "tygodnia"],
  monitorowanie: ["monitoring", "monitor"],
  przyjemne: ["pleasant"],
  depresja: ["dep"],
  depresji: ["dep"]
};

const MODULE_MARKERS = {
  dep: ["depresj", "smutku", "beck", "ba ", " behaw"],
  adhd: ["adhd", "uwagi", "dopamin", "hiperfokus"],
  gad: ["gad", "martwien", "uogolnion"],
  ocd: ["ocd", "obsesj", "kompulsj"],
  bdd: ["bdd", "dysmorfo", "body dysmorphic"],
  psychosis: ["psychoz", "schizofren"]
};

function parseHandoutIndex(source) {
  const match = source.match(/window\.HANDOUT_INDEX = (\{[\s\S]*?\});/);
  return match ? eval("(" + match[1] + ")") : {};
}

function parseCardMeta(source) {
  const cards = {};
  const blockRegex = /<details class="card" id="([^"]+)"[\s\S]*?<\/details>/g;
  for (const match of source.matchAll(blockRegex)) {
    const block = match[0];
    const title = block.match(/<span class="nm">([^<]+)/)?.[1]?.trim() || match[1];
    const subtitle = block.match(/<span class="sub">([^<]+)/)?.[1]?.trim() || "";
    cards[match[1]] = { title, subtitle };
  }
  return cards;
}

function parseOpenHandoutIds(source) {
  const ids = new Set();
  for (const match of source.matchAll(/openHandout\(['"]([^'"]+)['"]\)/g)) {
    ids.add(match[1]);
  }
  return ids;
}

function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantWords(...parts) {
  const words = new Set();
  for (const part of parts) {
    for (const word of normalizeText(part).split(" ")) {
      if (word.length >= 4 && !STOP_WORDS.has(word)) words.add(word);
    }
  }
  return [...words];
}

function expandWord(word) {
  const set = new Set([word]);
  for (const synonym of TOKEN_SYNONYMS[word] || []) set.add(synonym);
  return [...set];
}

function extractDisplayTitle(filePath) {
  const html = fs.readFileSync(filePath, "utf8");
  const title = html.match(/<title>([^<]+)/i)?.[1]?.trim() || "";
  const h1 =
    html
      .match(/<h1[^>]*class="hdr-title"[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
      ?.replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "";
  return normalizeText([title, h1].join(" "));
}

function titleAlignmentPenalty(cardTitle, fileDisplayTitle) {
  const cardNorm = normalizeText(cardTitle);
  let penalty = 0;

  if (cardNorm.includes("zniekszta") && !fileDisplayTitle.includes("zniekszta")) {
    penalty += 40;
  }
  if (fileDisplayTitle.includes("model poznaw") && !cardNorm.includes("model")) {
    penalty += 45;
  }
  if (fileDisplayTitle.includes("diagram") && !cardNorm.includes("diagram")) {
    penalty += 30;
  }

  return penalty;
}

function extractFileLabels(filePath, basename) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") {
    const html = fs.readFileSync(filePath, "utf8");
    const title = html.match(/<title>([^<]+)/i)?.[1]?.trim() || "";
    const h1 =
      html
        .match(/<h1[^>]*class="hdr-title"[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
        ?.replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim() || "";
    const eyebrow = html.match(/class="eyebrow"[^>]*>([^<]+)/i)?.[1]?.trim() || "";
    const bodySnippet = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1200);
    return normalizeText([basename, title, h1, eyebrow, bodySnippet].join(" "));
  }

  return normalizeText(basename.replace(/-/g, " "));
}

function modulePenalty(mod, searchText, cardTitle) {
  const markers = MODULE_MARKERS[mod.split("-")[0]] || MODULE_MARKERS[mod] || [];
  const cardNorm = normalizeText(cardTitle);
  let penalty = 0;

  for (const [otherMod, otherMarkers] of Object.entries(MODULE_MARKERS)) {
    if (otherMod === mod || otherMod === mod.split("-")[0]) continue;
    for (const marker of otherMarkers) {
      if (searchText.includes(marker.trim()) && !cardNorm.includes(otherMod)) {
        penalty += 40;
      }
    }
  }

  if (mod === "dep" && searchText.includes("adhd") && !cardNorm.includes("adhd")) {
    penalty += 60;
  }

  return penalty;
}

function scoreCandidate(id, mod, basename, searchText, cardTitle, cardSubtitle, fileDisplayTitle) {
  const words = significantWords(cardTitle, cardSubtitle);
  if (words.length === 0) return -1;

  let matched = 0;
  for (const word of words) {
    for (const variant of expandWord(word)) {
      if (searchText.includes(variant)) {
        matched += 1;
        break;
      }
    }
  }

  let score = matched * 20;
  const matchRatio = matched / words.length;

  if (basename === id) score += 15;
  if (matchRatio >= 0.5) score += 10;
  if (matchRatio < 0.34) score -= 30;

  score -= modulePenalty(mod, searchText, cardTitle);
  score -= titleAlignmentPenalty(cardTitle, fileDisplayTitle);

  return score;
}

function listModuleFiles(modDir) {
  const files = new Map();
  for (const file of fs.readdirSync(modDir)) {
    if (!/\.(html|pdf)$/i.test(file)) continue;
    const basename = file.replace(/\.(html|pdf)$/i, "");
    if (!files.has(basename)) files.set(basename, path.join(modDir, file));
  }
  return files;
}

function pickPreferredExt(modDir, basename) {
  const pdf = path.join(modDir, `${basename}.pdf`);
  const html = path.join(modDir, `${basename}.html`);
  if (fs.existsSync(pdf)) return "pdf";
  if (fs.existsSync(html)) return "html";
  return null;
}

const source = fs.readFileSync(kompendiumPath, "utf8");
const handoutIndex = parseHandoutIndex(source);
const cardMeta = parseCardMeta(source);
const openIds = parseOpenHandoutIds(source);

const resolver = {};
const unresolved = [];
const suspicious = [];

for (const id of openIds) {
  const mod = handoutIndex[id];
  if (!mod) continue;

  const modDir = path.join(printRoot, mod);
  if (!fs.existsSync(modDir)) {
    unresolved.push({ id, mod, reason: "missing-module-dir" });
    continue;
  }

  const manual = MANUAL_OVERRIDES[id];
  if (manual && manual.mod === mod) {
    const ext =
      manual.ext ||
      pickPreferredExt(path.join(printRoot, manual.mod), manual.file);
    if (ext) {
      resolver[id] = { mod: manual.mod, file: manual.file, ext, score: 999, manual: true };
      continue;
    }
  }

  const meta = cardMeta[id] || { title: id, subtitle: "" };
  const files = listModuleFiles(modDir);

  let best = null;
  let bestScore = -1;

  for (const [basename, filePath] of files) {
    const searchText = extractFileLabels(filePath, basename);
    const fileDisplayTitle = extractDisplayTitle(filePath);
    const score = scoreCandidate(
      id,
      mod,
      basename,
      searchText,
      meta.title,
      meta.subtitle,
      fileDisplayTitle
    );
    if (score > bestScore) {
      bestScore = score;
      best = basename;
    }
  }

  if (!best || bestScore < 15) {
    unresolved.push({ id, mod, title: meta.title, bestScore });
    continue;
  }

  const ext = pickPreferredExt(modDir, best);
  if (!ext) {
    unresolved.push({ id, mod, title: meta.title, reason: "no-file-ext" });
    continue;
  }

  if (best !== id) {
    suspicious.push({ id, mod, file: best, title: meta.title, score: bestScore });
  }

  resolver[id] = { mod, file: best, ext, score: bestScore };
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      mapped: Object.keys(resolver).length,
      unresolved: unresolved.length,
      resolver
    },
    null,
    2
  )
);

console.log("Mapped:", Object.keys(resolver).length + "/" + openIds.size);
console.log("Unresolved:", unresolved.length);
console.log("Renamed mappings:", suspicious.length);
console.log("Written:", outPath);

if (unresolved.length) {
  console.log("\nFirst unresolved:");
  for (const item of unresolved.slice(0, 20)) {
    console.log(`  - ${item.id} (${item.mod}) "${item.title || ""}" score=${item.bestScore ?? "?"}`);
  }
}

const checkIds = [
  "planowanie-aktywnosci",
  "dieta-dep",
  "czym-bdd",
  "monitorowanie-aktywnosci",
  "znieksztalcenia-dep"
];
console.log("\nSpot checks:");
for (const id of checkIds) {
  const hit = resolver[id];
  console.log(`  ${id} ->`, hit ? `${hit.mod}/${hit.file}.${hit.ext} (${hit.score})` : "MISSING");
}

function buildFileIndexFromDir(rootDir, { skipUnderscore = false, extensions = [".html"] } = {}) {
  const index = {};
  if (!fs.existsSync(rootDir)) return index;

  for (const mod of fs.readdirSync(rootDir)) {
    const modDir = path.join(rootDir, mod);
    if (!fs.statSync(modDir).isDirectory()) continue;

    for (const file of fs.readdirSync(modDir)) {
      if (skipUnderscore && file.startsWith("_")) continue;
      const ext = path.extname(file);
      if (!extensions.includes(ext)) continue;
      index[file.slice(0, -ext.length)] = mod;
    }
  }

  return index;
}

const handoutIndexPath = path.join(root, "public/handouts/handout-file-index.json");
const handoutFileIndex = buildFileIndexFromDir(printRoot, {
  skipUnderscore: true,
  extensions: [".html", ".pdf"]
});
fs.writeFileSync(
  handoutIndexPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      count: Object.keys(handoutFileIndex).length,
      index: handoutFileIndex
    },
    null,
    2
  )
);
console.log("\nHandout file index:", Object.keys(handoutFileIndex).length, "entries");
console.log("Written:", handoutIndexPath);

const sosRoot = path.join(root, "public/sos");
const sosIndexPath = path.join(root, "public/sos/sos-file-index.json");
const sosFileIndex = buildFileIndexFromDir(sosRoot, { extensions: [".html"] });
fs.writeFileSync(
  sosIndexPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      count: Object.keys(sosFileIndex).length,
      index: sosFileIndex
    },
    null,
    2
  )
);
console.log("SOS file index:", Object.keys(sosFileIndex).length, "entries");
console.log("Written:", sosIndexPath);
