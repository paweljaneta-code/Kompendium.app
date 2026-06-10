import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const printRoot = path.join(root, "public/handouts/print");

// ---- zbierz wszystkie pliki HTML ----
const htmlFiles = [];
const pdfFiles = [];
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.html$/i.test(e.name)) htmlFiles.push(p);
    else if (/\.pdf$/i.test(e.name)) pdfFiles.push(p);
  }
}
walk(printRoot);

const rel = (p) => path.relative(printRoot, p);
const modOf = (p) => rel(p).split(path.sep)[0];

// ---- analiza pojedynczego pliku HTML ----
function analyze(file) {
  const html = fs.readFileSync(file, "utf8");
  const bytes = Buffer.byteLength(html);
  const lower = html.toLowerCase();

  const flags = {
    // struktura druku
    a4: /210mm|width\s*:\s*210mm|@page/.test(lower) && /297mm|size\s*:\s*a4|a4/.test(lower),
    mediaPrint: /@media\s+print/.test(lower),
    pageRule: /@page/.test(lower),
    pageClass: /class\s*=\s*["'][^"']*\bpage\b/.test(lower),
    pageBreak: /page-break-after|break-after\s*:\s*page/.test(lower),
    // typografia / design
    fonts: /fonts\.googleapis|font-family/.test(lower),
    footer: /class\s*=\s*["'][^"']*\bfoot\b/.test(lower) || /kompendium/.test(lower),
    header: /class\s*=\s*["'][^"']*hdr-title/.test(lower) || /<h1/.test(lower),
    icons: /<svg|<use\s/.test(lower),
    // poprawność
    hasTitle: /<title>[^<]+<\/title>/.test(html),
    langPl: /<html[^>]*lang\s*=\s*["']pl/.test(lower),
    charset: /charset\s*=\s*["']?utf-8/.test(lower),
    // problemy
    emptyTitle: /<title>\s*<\/title>/.test(html),
    mojibake: /Ã|Â|�|�/.test(html),
    externalFontDep: /fonts\.googleapis\.com/.test(lower), // zależność sieciowa przy druku offline
    inlineStyleHeavy: (html.match(/style\s*=/g) || []).length,
  };

  // wersja designu / pilota
  const verMatch = html.match(/pilot\s+([\w\- ]+v\d+)/i) || html.match(/lineart\s+v\d+/i);
  const version = verMatch ? verMatch[0].trim() : null;

  // liczba stron (deklarowanych)
  const pageCount = (html.match(/class\s*=\s*["'][^"']*\bpage\b/gi) || []).length;
  const pgNumMax = [...html.matchAll(/str\.?\s*\d+\s*\/\s*(\d+)/gi)].reduce(
    (m, x) => Math.max(m, +x[1]), 0);

  // tytuł
  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  const title = titleMatch ? titleMatch[1].trim() : "";

  return { file, bytes, version, pageCount, pgNumMax, title, flags };
}

const results = htmlFiles.map(analyze);

// ---- agregacje ----
const N = results.length;
const pct = (n) => `${((n / N) * 100).toFixed(1)}%`;
const count = (fn) => results.filter(fn).length;

const metrics = {
  "Strona A4 zdefiniowana": count((r) => r.flags.a4),
  "@media print": count((r) => r.flags.mediaPrint),
  "@page (margines/rozmiar)": count((r) => r.flags.pageRule),
  "klasa .page": count((r) => r.flags.pageClass),
  "page-break (łamanie stron)": count((r) => r.flags.pageBreak),
  "Czcionki zdefiniowane": count((r) => r.flags.fonts),
  "Stopka/branding": count((r) => r.flags.footer),
  "Nagłówek/H1": count((r) => r.flags.header),
  "Ikony SVG": count((r) => r.flags.icons),
  "Tytuł <title>": count((r) => r.flags.hasTitle),
  "lang=pl": count((r) => r.flags.langPl),
  "charset utf-8": count((r) => r.flags.charset),
};

console.log("══════════════════════════════════════════════════════════");
console.log("  AUDYT JAKOŚCI HANDOUTÓW DO DRUKU — kompendium.app");
console.log("══════════════════════════════════════════════════════════");
console.log(`\nPliki HTML:  ${htmlFiles.length}`);
console.log(`Pliki PDF:   ${pdfFiles.length}`);
console.log(`Moduły:      ${new Set(htmlFiles.map(modOf)).size}`);

console.log("\n── POKRYCIE CECH JAKOŚCI (HTML) ───────────────────────────");
for (const [k, v] of Object.entries(metrics)) {
  const bar = "█".repeat(Math.round((v / N) * 24)).padEnd(24, "░");
  console.log(`  ${k.padEnd(28)} ${bar} ${pct(v)} (${v}/${N})`);
}

// ---- problemy ----
const problems = {
  "Brak @media print": results.filter((r) => !r.flags.mediaPrint),
  "Brak definicji strony A4": results.filter((r) => !r.flags.a4),
  "Brak stopki/brandingu": results.filter((r) => !r.flags.footer),
  "Pusty <title>": results.filter((r) => r.flags.emptyTitle),
  "Brak <title>": results.filter((r) => !r.flags.hasTitle),
  "Możliwy mojibake (zła kodyfikacja)": results.filter((r) => r.flags.mojibake),
  "Zależność od Google Fonts (druk offline)": results.filter((r) => r.flags.externalFontDep),
  "Niespójna numeracja stron (pg-num != .page)": results.filter(
    (r) => r.pgNumMax && r.pageCount && r.pgNumMax !== r.pageCount),
  "Bardzo mały plik (<8KB — możliwy stub)": results.filter((r) => r.bytes < 8000),
};

console.log("\n── WYKRYTE PROBLEMY ───────────────────────────────────────");
for (const [k, arr] of Object.entries(problems)) {
  console.log(`  ${arr.length.toString().padStart(4)}  ${k}`);
}

// ---- wersje designu ----
const versions = {};
for (const r of results) {
  const v = r.version || "(brak znacznika wersji)";
  versions[v] = (versions[v] || 0) + 1;
}
console.log("\n── WERSJE DESIGNU (znacznik 'pilot/lineart vN') ───────────");
for (const [v, c] of Object.entries(versions).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${c.toString().padStart(4)}  ${v}`);
}

// ---- rozkład rozmiarów ----
const sizes = results.map((r) => r.bytes).sort((a, b) => a - b);
const q = (p) => sizes[Math.floor((sizes.length - 1) * p)];
console.log("\n── ROZKŁAD ROZMIARÓW PLIKÓW HTML ──────────────────────────");
console.log(`  min ${(q(0)/1024).toFixed(1)}KB · p25 ${(q(.25)/1024).toFixed(1)}KB · mediana ${(q(.5)/1024).toFixed(1)}KB · p75 ${(q(.75)/1024).toFixed(1)}KB · max ${(q(1)/1024).toFixed(1)}KB`);
console.log(`  średnia ${(sizes.reduce((a,b)=>a+b,0)/sizes.length/1024).toFixed(1)}KB`);

// ---- rozkład liczby stron ----
const pageDist = {};
for (const r of results) pageDist[r.pageCount] = (pageDist[r.pageCount] || 0) + 1;
console.log("\n── LICZBA STRON (klasa .page) ─────────────────────────────");
for (const [p, c] of Object.entries(pageDist).sort((a,b)=>+a[0]-+b[0])) {
  console.log(`  ${p} stron: ${c}`);
}

// ---- jakość per moduł ----
console.log("\n── JAKOŚĆ PER MODUŁ (śr. % spełnionych cech kluczowych) ───");
const keyFlags = ["a4","mediaPrint","footer","hasTitle","fonts"];
const byMod = {};
for (const r of results) {
  const m = modOf(r.file);
  byMod[m] ??= { n: 0, score: 0, bytes: 0 };
  byMod[m].n++;
  byMod[m].score += keyFlags.filter((f) => r.flags[f]).length / keyFlags.length;
  byMod[m].bytes += r.bytes;
}
const modRows = Object.entries(byMod)
  .map(([m, v]) => ({ m, n: v.n, q: v.score / v.n, kb: v.bytes / v.n / 1024 }))
  .sort((a, b) => a.q - b.q);
console.log("  NAJSŁABSZE 12:");
for (const r of modRows.slice(0, 12)) {
  console.log(`    ${r.m.padEnd(16)} ${(r.q*100).toFixed(0).padStart(3)}%  (${r.n} plików, śr ${r.kb.toFixed(0)}KB)`);
}
console.log("  NAJLEPSZE 5:");
for (const r of modRows.slice(-5).reverse()) {
  console.log(`    ${r.m.padEnd(16)} ${(r.q*100).toFixed(0).padStart(3)}%  (${r.n} plików, śr ${r.kb.toFixed(0)}KB)`);
}

// ---- ocena ogólna ----
const overall = results.reduce((s, r) =>
  s + keyFlags.filter((f) => r.flags[f]).length / keyFlags.length, 0) / N;
console.log("\n══════════════════════════════════════════════════════════");
console.log(`  OCENA OGÓLNA (cechy kluczowe): ${(overall*100).toFixed(1)}%`);
console.log("══════════════════════════════════════════════════════════");
