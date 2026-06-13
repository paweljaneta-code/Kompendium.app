import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sosRoot = path.join(root, "public/sos");

/** Zbierz wszystkie pliki .html w public/sos */
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    // transdiag/ to przewodniki (inny typ materiału, własny design) — poza zakresem audytu narzędzi
    if (entry.isDirectory()) {
      if (entry.name === "transdiag") continue;
      walk(p);
    } else if (entry.name.endsWith(".html")) files.push(p);
  }
}
walk(sosRoot);
files.sort();

const rel = (p) => path.relative(sosRoot, p).replace(/\\/g, "/");

/** Akumulatory problemów: kategoria -> [ {file, info} ] */
const issues = {};
function add(cat, file, info) {
  (issues[cat] ||= []).push({ file: rel(file), info });
}

/** KEY localStorage -> lista plików (wykrywanie kolizji) */
const keyMap = new Map();

const stats = {
  total: files.length,
  totalSteps: {}, // N -> liczba plików
};

for (const file of files) {
  const html = fs.readFileSync(file, "utf8");

  // 1. Doctype + lang
  if (!/^\s*<!DOCTYPE html>/i.test(html)) add("brak-doctype", file);
  if (!/<html[^>]*\blang="pl"/i.test(html)) add("brak-lang-pl", file);

  // 2. charset + viewport
  if (!/<meta\s+charset="UTF-8"/i.test(html)) add("brak-charset", file);
  if (!/<meta[^>]*name="viewport"/i.test(html)) add("brak-viewport", file);

  // 3. Tytuł i jego format
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (!titleMatch) {
    add("brak-title", file);
  } else {
    const title = titleMatch[1].trim();
    if (!/^Narz[eę]dzie\s*·/.test(title)) add("title-zly-format", file, JSON.stringify(title));
    if (!title || /·\s*$/.test(title)) add("title-pusty", file, JSON.stringify(title));
  }

  // 4. Fonty (DM Sans + Fraunces)
  if (!/fonts\.googleapis\.com/.test(html)) add("brak-google-fonts", file);
  else {
    if (!/DM\+Sans/.test(html)) add("brak-font-dm-sans", file);
    if (!/Fraunces/.test(html)) add("brak-font-fraunces", file);
  }

  // 5. Tokeny designu w :root (8 uniwersalnych, obecne w 100% bazowych plików)
  const requiredTokens = ["--bg", "--ink", "--ink-soft", "--ink-mute", "--sage", "--sage-soft", "--sage-deep", "--warm"];
  const rootMatch = html.match(/:root\s*\{([\s\S]*?)\}/);
  if (!rootMatch) add("brak-root-tokens", file);
  else {
    const missing = requiredTokens.filter((t) => !rootMatch[1].includes(t + ":"));
    if (missing.length) add("niepelne-tokeny", file, missing.join(", "));
  }

  // 6. Nagłówek
  if (!/<header class="hdr">/.test(html)) add("brak-header-hdr", file);
  if (!/class="hdr-title"/.test(html)) add("brak-hdr-title", file);

  // 7. Elementy nawigacji / postępu
  if (!/id="dots"/.test(html)) add("brak-dots", file);
  if (!/id="stepNum"/.test(html)) add("brak-stepNum", file);
  if (!/id="backBtn"/.test(html)) add("brak-backBtn", file);
  if (!/id="nextBtn"/.test(html)) add("brak-nextBtn", file);

  // 8. Logika kroków
  const totalStepsMatch = html.match(/(?:const|let|var)\s+TOTAL_STEPS\s*=\s*(\d+)/);
  const dataSteps = [...html.matchAll(/data-step="(\d+)"/g)].map((m) => Number(m[1]));
  const uniqueSteps = [...new Set(dataSteps)].sort((a, b) => a - b);
  const hdrStepMatch = html.match(/krok\s*<span id="stepNum">\s*\d+\s*<\/span>\s*\/\s*(\d+)/);

  if (!totalStepsMatch) {
    add("brak-TOTAL_STEPS", file);
  } else {
    const N = Number(totalStepsMatch[1]);
    stats.totalSteps[N] = (stats.totalSteps[N] || 0) + 1;

    // liczba kart .card[data-step] zgodna z TOTAL_STEPS
    if (uniqueSteps.length && uniqueSteps.length !== N) {
      add("niezgodnosc-liczby-kart", file, `TOTAL_STEPS=${N}, kart=${uniqueSteps.length} [${uniqueSteps.join(",")}]`);
    }
    // ciągłość numeracji 1..N
    if (uniqueSteps.length) {
      const expected = Array.from({ length: uniqueSteps.length }, (_, i) => i + 1);
      if (JSON.stringify(uniqueSteps) !== JSON.stringify(expected)) {
        add("nieciagla-numeracja-kart", file, `[${uniqueSteps.join(",")}]`);
      }
    }
    // duplikaty data-step
    if (dataSteps.length !== uniqueSteps.length) {
      add("duplikat-data-step", file, `[${dataSteps.join(",")}]`);
    }
    // nagłówek "krok / N" zgodny z TOTAL_STEPS
    if (hdrStepMatch && Number(hdrStepMatch[1]) !== N) {
      add("niezgodny-licznik-w-naglowku", file, `naglowek=/${hdrStepMatch[1]}, TOTAL_STEPS=${N}`);
    }
  }

  // 9. Auto-zapis + KEY (standardowy `KEY` lub wariant `STORAGE_KEY`)
  const keyMatch = html.match(/(?:var|const|let)\s+(?:STORAGE_KEY|KEY)\s*=\s*["']([^"']+)["']/);
  if (!/localStorage/.test(html)) {
    add("brak-autozapisu", file);
  } else if (!keyMatch) {
    add("brak-KEY", file);
  } else {
    const key = keyMatch[1];
    const expected = "sos_" + path.basename(file, ".html").replace(/-/g, "_");
    if (!/^sos_/.test(key)) add("KEY-zly-prefix", file, key);
    else if (key !== expected) add("KEY-niezgodny-z-nazwa", file, `${key} (oczekiwano ${expected})`);
    if (!keyMap.has(key)) keyMap.set(key, []);
    keyMap.get(key).push(rel(file));
  }

  // 10. updateUI() wywołane
  if (!/updateUI\(\)/.test(html)) add("brak-updateUI", file);

  // 11. potwierdzenie resetu
  if (!/confirm\(/.test(html)) add("brak-potwierdzenia-resetu", file);
}

/** Kolizje KEY (ten sam klucz localStorage w wielu plikach) */
const keyCollisions = [...keyMap.entries()].filter(([, fs]) => fs.length > 1);

/* ===================== RAPORT ===================== */
const order = [
  "brak-doctype", "brak-lang-pl", "brak-charset", "brak-viewport",
  "brak-title", "title-zly-format", "title-pusty",
  "brak-google-fonts", "brak-font-dm-sans", "brak-font-fraunces",
  "brak-root-tokens", "niepelne-tokeny",
  "brak-header-hdr", "brak-hdr-title",
  "brak-dots", "brak-stepNum", "brak-backBtn", "brak-nextBtn",
  "brak-TOTAL_STEPS", "niezgodnosc-liczby-kart", "nieciagla-numeracja-kart",
  "duplikat-data-step", "niezgodny-licznik-w-naglowku",
  "brak-autozapisu", "brak-KEY", "KEY-zly-prefix",
  "brak-updateUI", "brak-potwierdzenia-resetu",
];

console.log("===========================================");
console.log("  AUDYT SPÓJNOŚCI SOS (interaktywne materiały)");
console.log("===========================================");
console.log("");
console.log("Przeskanowano plików:", stats.total);
console.log("Folderów (modułów):", new Set(files.map((f) => path.basename(path.dirname(f)))).size);
console.log("");
console.log("Rozkład liczby kroków (TOTAL_STEPS):");
for (const [n, c] of Object.entries(stats.totalSteps).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  console.log("  " + n + " kroków: " + c + " plików");
}
console.log("");

let totalIssues = 0;
console.log("--- PROBLEMY SPÓJNOŚCI ---");
console.log("");
for (const cat of order) {
  const list = issues[cat];
  if (!list || !list.length) continue;
  totalIssues += list.length;
  console.log(`[${cat}] (${list.length}):`);
  for (const it of list.slice(0, 40)) {
    console.log("  - " + it.file + (it.info ? "  →  " + it.info : ""));
  }
  if (list.length > 40) console.log(`  ... oraz ${list.length - 40} więcej`);
  console.log("");
}

// kategorie nieujęte w 'order'
for (const cat of Object.keys(issues)) {
  if (order.includes(cat)) continue;
  const list = issues[cat];
  totalIssues += list.length;
  console.log(`[${cat}] (${list.length}):`);
  for (const it of list.slice(0, 40)) console.log("  - " + it.file + (it.info ? "  →  " + it.info : ""));
  console.log("");
}

console.log("--- KOLIZJE KLUCZY localStorage (KEY) ---");
if (!keyCollisions.length) {
  console.log("OK: brak kolizji — każdy plik ma unikalny KEY.");
} else {
  console.log(`UWAGA: ${keyCollisions.length} kluczy współdzielonych przez wiele plików:`);
  for (const [key, fs] of keyCollisions) {
    console.log("  KEY=" + key + "  (" + fs.length + "):");
    for (const f of fs) console.log("      " + f);
  }
  totalIssues += keyCollisions.length;
}
console.log("");

console.log("===========================================");
console.log("RAZEM problemów:", totalIssues);
console.log("===========================================");
