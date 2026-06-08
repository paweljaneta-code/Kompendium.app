import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const kompendium = fs.readFileSync(path.join(root, "kompendium.html"), "utf8");
const printRoot = path.join(root, "public/handouts/print");
const resolverData = JSON.parse(
  fs.readFileSync(path.join(root, "public/handouts/print-resolver.json"), "utf8")
);
const resolver = resolverData.resolver;

function parseHandoutIndex(source) {
  const marker = "window.HANDOUT_INDEX = ";
  const start = source.indexOf(marker) + marker.length;
  let depth = 0;
  let end = start;
  for (let i = start; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (!depth) {
        end = i + 1;
        break;
      }
    }
  }
  return eval("(" + source.slice(start, end) + ")");
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

function significantWords(text) {
  const stop = new Set([
    "w", "i", "a", "o", "z", "do", "na", "the", "and", "for", "with", "or", "to",
    "adhd", "ocd", "ocpd", "gad", "bpd", "dep", "sad", "cbt", "act", "dbt", "modul"
  ]);
  return normalizeText(text)
    .split(" ")
    .filter((w) => w.length > 2 && !stop.has(w));
}

function titleOverlap(cardTitle, fileTitle) {
  const cw = significantWords(cardTitle);
  const fw = significantWords(fileTitle);
  if (!cw.length || !fw.length) return 0;
  let hit = 0;
  for (const w of cw) {
    if (fw.some((f) => f.includes(w) || w.includes(f))) hit++;
  }
  return hit / cw.length;
}

function fileExists(mod, basename) {
  const modDir = path.join(printRoot, mod);
  return (
    fs.existsSync(path.join(modDir, `${basename}.html`)) ||
    fs.existsSync(path.join(modDir, `${basename}.pdf`))
  );
}

function readFileTitle(mod, basename) {
  const modDir = path.join(printRoot, mod);
  for (const ext of [".html", ".pdf"]) {
    const p = path.join(modDir, `${basename}${ext}`);
    if (!fs.existsSync(p)) continue;
    const head = fs.readFileSync(p, "utf8").slice(0, 4000);
    const m = head.match(/<title>([^<]+)<\/title>/i);
    if (m) return m[1].trim();
  }
  return null;
}

function findFileInOtherModules(basename, expectedMod) {
  const hits = [];
  if (!fs.existsSync(printRoot)) return hits;
  for (const mod of fs.readdirSync(printRoot)) {
    if (mod === expectedMod) continue;
    const modDir = path.join(printRoot, mod);
    if (!fs.statSync(modDir).isDirectory()) continue;
    if (fileExists(mod, basename)) hits.push(mod);
  }
  return hits;
}

function parseModules(source) {
  const modules = [];
  const tabRegex =
    /<div class="tab-content"[^>]*id="tab-([^"]+)"[\s\S]*?(?=<div class="tab-content"|<button class="scroll-top")/g;
  for (const match of source.matchAll(tabRegex)) {
    const slug = match[1];
    const html = match[0];
    const cards = [];
    const cardRegex =
      /<details class="card" id="([^"]+)"[\s\S]*?<\/details>/g;
    for (const cm of html.matchAll(cardRegex)) {
      const id = cm[1];
      const block = cm[0];
      const title =
        block.match(/<span class="nm">([^<]+)/)?.[1]?.trim() || id;
      const hasPrint =
        /openHandout\(['"]/.test(block) ||
        /tool-mat tm-print/.test(block) ||
        /handout-btn/.test(block);
      if (hasPrint) cards.push({ id, title });
    }
    modules.push({ slug, cards });
  }
  return modules;
}

const handoutIndex = parseHandoutIndex(kompendium);
const modules = parseModules(kompendium);

const SKIP = new Set([
  "wurs-adhd",
  "gad7",
  "pswq",
  "phq9",
  "bdi",
  "ybocs",
  "ocir",
  "npi-npd",
  "lsas-avpd",
  "pi-ocpd",
  "ocpd-mapa-kosztow",
  "ocpd-eksperymenty-behawioralne",
  "ocpd-diffdiag",
  "ocpd-ego-syntonia",
  "imagery-ocpd",
  "geneza-ocpd",
  "krytyka-ocpd",
  "ocpd-farmakoterapia",
  "adhd-trauma"
]);

const stats = {
  modules: 0,
  toolsWithPrint: 0,
  ok: 0,
  skipped: 0,
  noIndex: 0,
  noResolver: 0,
  missingFile: 0,
  wrongModule: 0,
  renamed: 0,
  titleMismatch: 0
};

const issues = {
  noIndex: [],
  noResolver: [],
  missingFile: [],
  wrongModule: [],
  renamed: [],
  titleMismatch: []
};

for (const mod of modules) {
  if (mod.slug === "plany") continue;
  stats.modules++;

  for (const card of mod.cards) {
    stats.toolsWithPrint++;
    const { id, title } = card;

    if (SKIP.has(id)) {
      stats.skipped++;
      continue;
    }

    const expectedMod = handoutIndex[id] || mod.slug;
    if (handoutIndex[id] && expectedMod !== mod.slug) {
      stats.wrongModule++;
      issues.wrongModule.push({
        mod: mod.slug,
        id,
        title,
        reason: `HANDOUT_INDEX=${expectedMod}, card in tab-${mod.slug}`
      });
      continue;
    }

    const hit = resolver[id];
    if (!hit) {
      stats.noResolver++;
      issues.noResolver.push({ mod: mod.slug, id, title });
      continue;
    }

    if (hit.mod !== expectedMod) {
      stats.wrongModule++;
      issues.wrongModule.push({
        mod: mod.slug,
        id,
        title,
        reason: `resolver mod=${hit.mod}, expected=${expectedMod}, file=${hit.file}`
      });
      continue;
    }

    if (!fileExists(hit.mod, hit.file)) {
      stats.missingFile++;
      issues.missingFile.push({
        mod: mod.slug,
        id,
        title,
        file: `${hit.mod}/${hit.file}`
      });
      continue;
    }

    if (hit.file !== id && !hit.manual && !hit.direct && !hit.titleMatch) {
      stats.renamed++;
      issues.renamed.push({
        mod: mod.slug,
        id,
        title,
        file: hit.file,
        score: hit.score
      });
    }

    const fileTitle = readFileTitle(hit.mod, hit.file);
    if (fileTitle && !hit.manual && !hit.titleMatch) {
      const overlap = titleOverlap(title, fileTitle);
      if (overlap < 0.15 && titleOverlap(fileTitle, id.replace(/-/g, " ")) < 0.2) {
        stats.titleMismatch++;
        issues.titleMismatch.push({
          mod: mod.slug,
          id,
          cardTitle: title,
          file: hit.file,
          fileTitle,
          overlap: Math.round(overlap * 100)
        });
      }
    }

    stats.ok++;
  }
}

// Scan print folders: filename vs embedded title (OCPD-style shuffle)
const fileTitleDrift = [];
for (const mod of fs.readdirSync(printRoot)) {
  const modDir = path.join(printRoot, mod);
  if (!fs.statSync(modDir).isDirectory()) continue;
  for (const file of fs.readdirSync(modDir)) {
    if (!/\.(html|pdf)$/i.test(file)) continue;
    const basename = file.replace(/\.(html|pdf)$/i, "");
    const fileTitle = readFileTitle(mod, basename);
    if (!fileTitle) continue;
    const stemOverlap = titleOverlap(basename.replace(/-/g, " "), fileTitle);
    if (stemOverlap < 0.1) {
      fileTitleDrift.push({ mod, file: basename, fileTitle, stemOverlap: Math.round(stemOverlap * 100) });
    }
  }
}

console.log("=== SKAN HANDOUTÓW — spójność modułów ===\n");
console.log(`Moduły: ${stats.modules}`);
console.log(`Narzędzia z przyciskiem druku: ${stats.toolsWithPrint}`);
console.log(`OK (resolver + plik w swoim module): ${stats.ok}`);
console.log(`Pominięte celowo: ${stats.skipped}`);
console.log(`Brak w HANDOUT_INDEX: ${stats.noIndex}`);
console.log(`Brak resolvera: ${stats.noResolver}`);
console.log(`Brak pliku: ${stats.missingFile}`);
console.log(`Zły moduł (index/resolver/tab): ${stats.wrongModule}`);
console.log(`Inna nazwa pliku (auto-map, nie id): ${stats.renamed}`);
console.log(`Podejrzany tytuł pliku vs karta: ${stats.titleMismatch}`);

function printSection(label, items, limit = 25) {
  if (!items.length) return;
  console.log(`\n--- ${label} (${items.length}) ---`);
  for (const item of items.slice(0, limit)) {
    console.log(JSON.stringify(item));
  }
  if (items.length > limit) console.log(`  ... +${items.length - limit} więcej`);
}

printSection("Brak HANDOUT_INDEX", issues.noIndex);
printSection("Brak resolvera", issues.noResolver);
printSection("Brak pliku", issues.missingFile);
printSection("Zły moduł", issues.wrongModule);
printSection("Auto-map na inny plik (score)", issues.renamed.sort((a, b) => (a.score ?? 0) - (b.score ?? 0)));
printSection("Tytuł pliku ≠ karta", issues.titleMismatch);

console.log(`\n--- Pliki: nazwa ≠ tytuł HTML w folderze (${fileTitleDrift.length}) ---`);
const driftByMod = {};
for (const d of fileTitleDrift) {
  driftByMod[d.mod] = (driftByMod[d.mod] || 0) + 1;
}
console.log("Per moduł:", driftByMod);
for (const d of fileTitleDrift.slice(0, 30)) {
  console.log(`  ${d.mod}/${d.file} → „${d.fileTitle}"`);
}
if (fileTitleDrift.length > 30) console.log(`  ... +${fileTitleDrift.length - 30} więcej`);

// Per-module summary
console.log("\n--- Podsumowanie per moduł (narzędzia z drukiem) ---");
const perMod = {};
for (const mod of modules) {
  if (mod.slug === "plany") continue;
  perMod[mod.slug] = { total: mod.cards.length, ok: 0, problems: 0 };
}
for (const mod of modules) {
  for (const card of mod.cards) {
    if (SKIP.has(card.id)) continue;
    const bucket = perMod[mod.slug];
    const bad = [
      ...issues.noIndex,
      ...issues.noResolver,
      ...issues.missingFile,
      ...issues.wrongModule,
      ...issues.titleMismatch
    ].some((i) => i.mod === mod.slug && i.id === card.id);
    if (bad) bucket.problems++;
    else if (handoutIndex[card.id] && resolver[card.id]) bucket.ok++;
  }
}
const sorted = Object.entries(perMod).sort((a, b) => b[1].problems - a[1].problems);
for (const [slug, s] of sorted) {
  if (s.total === 0) continue;
  const pct = s.total ? Math.round((s.ok / s.total) * 100) : 0;
  if (s.problems > 0) console.log(`  ${slug}: ${s.ok}/${s.total} OK (${pct}%), problemy: ${s.problems}`);
}

const modsWithProblems = sorted.filter(([, s]) => s.problems > 0);
console.log(`\nModuły z problemami: ${modsWithProblems.length}/${stats.modules}`);

// Tylko openHandout() — rzeczywiste mapowania druku
const openOnly = new Set(
  [...kompendium.matchAll(/openHandout\(['"]([^'"]+)['"]\)/g)].map((m) => m[1])
);
let openOk = 0;
let openNoRes = 0;
let openNoIdx = 0;
let openWrongMod = 0;
for (const id of openOnly) {
  if (SKIP.has(id)) continue;
  const em = handoutIndex[id];
  if (!em) {
    openNoIdx++;
    continue;
  }
  const hit = resolver[id];
  if (!hit) {
    openNoRes++;
    continue;
  }
  if (hit.mod !== em) openWrongMod++;
  else openOk++;
}
console.log("\n=== Tylko openHandout() (faktyczny druk) ===");
console.log(`Unikalnych ID: ${openOnly.size}`);
console.log(`OK (plik w module z HANDOUT_INDEX): ${openOk}`);
console.log(`Brak resolvera: ${openNoRes}`);
console.log(`Brak HANDOUT_INDEX: ${openNoIdx}`);
console.log(`Resolver w innym module: ${openWrongMod}`);

