import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const komp = fs.readFileSync(path.join(root, "kompendium.html"), "utf8");
const printRoot = path.join(root, "public/handouts/print");

// HANDOUT_INDEX
const m = komp.match(/window\.HANDOUT_INDEX = (\{[\s\S]*?\});/);
const HANDOUT_INDEX = eval("(" + m[1] + ")");

// PRINT_HANDOUT_RESOLVER (z print-resolver.json)
const resolverData = JSON.parse(
  fs.readFileSync(path.join(root, "public/handouts/print-resolver.json"), "utf8")
);
const RESOLVER = resolverData.resolver || {};

const criticalAliases = {
  "znieksztalcenia-dep": { mod: "dep", file: "dep-znieksztalcenia", ext: "pdf" },
  znieksztalcenia: { mod: "gad", file: "znieksztalcenia", ext: "pdf" },
  "planowanie-aktywnosci": { mod: "dep", file: "ba-scheduling", ext: "pdf" },
  "dieta-dep": { mod: "dep", file: "jedzenie-nastroj", ext: "pdf" },
};

// wszystkie unikalne openHandout id
const ids = new Set();
for (const x of komp.matchAll(/openHandout\(['"]([^'"]+)['"]\)/g)) ids.add(x[1]);

const exists = (mod, file) =>
  fs.existsSync(path.join(printRoot, mod, file + ".pdf")) ||
  fs.existsSync(path.join(printRoot, mod, file + ".html"));

// wierne odwzorowanie resolvePrintHandoutUrl + probe
function resolve(id) {
  const t = criticalAliases[id] || RESOLVER[id];
  if (t && t.mod && t.file) {
    if (exists(t.mod, t.file)) return { ok: true, via: "resolver", mod: t.mod, file: t.file };
    return { ok: false, via: "resolver-dangling", mod: t.mod, file: t.file };
  }
  const mod = HANDOUT_INDEX[id];
  if (!mod) return { ok: false, via: "no-mapping" };
  if (exists(mod, id)) return { ok: true, via: "index-exact", mod, file: id };
  return { ok: false, via: "index-no-file", mod };
}

const stats = {};
const broken = [];
for (const id of ids) {
  const r = resolve(id);
  stats[r.via] = (stats[r.via] || 0) + 1;
  if (!r.ok) broken.push({ id, ...r });
}

const total = ids.size;
const ok = broken.length === 0 ? total : total - broken.length;

console.log("══════════════════════════════════════════════════════════");
console.log("  POKRYCIE PRZYCISKÓW DRUKU (openHandout → plik na dysku)");
console.log("══════════════════════════════════════════════════════════");
console.log(`\nUnikalnych przycisków openHandout(): ${total}`);
console.log(`Rozwiązanych do istniejącego pliku:  ${ok} (${((ok/total)*100).toFixed(1)}%)`);
console.log(`NIEDZIAŁAJĄCYCH:                      ${broken.length} (${((broken.length/total)*100).toFixed(1)}%)`);

console.log("\n── ŚCIEŻKA ROZWIĄZANIA ────────────────────────────────────");
const labels = {
  resolver: "✓ przez PRINT_HANDOUT_RESOLVER",
  "index-exact": "✓ przez HANDOUT_INDEX (nazwa=id)",
  "no-mapping": "✗ brak jakiegokolwiek mapowania",
  "index-no-file": "✗ mapowany moduł, brak pliku o nazwie=id",
  "resolver-dangling": "✗ resolver wskazuje nieistniejący plik",
};
for (const [k, v] of Object.entries(stats).sort((a,b)=>b[1]-a[1])) {
  console.log(`  ${v.toString().padStart(4)}  ${labels[k] || k}`);
}

// niedziałające wg modułu
const byMod = {};
for (const b of broken) {
  const mod = b.mod || HANDOUT_INDEX[b.id] || "(nieznany)";
  byMod[mod] = (byMod[mod] || 0) + 1;
}
console.log("\n── NIEDZIAŁAJĄCE WG MODUŁU (top 15) ───────────────────────");
for (const [mod, c] of Object.entries(byMod).sort((a,b)=>b[1]-a[1]).slice(0,15)) {
  console.log(`  ${c.toString().padStart(4)}  ${mod}`);
}

console.log("\n── PRZYKŁADY NIEDZIAŁAJĄCYCH (15) ─────────────────────────");
for (const b of broken.slice(0, 15)) {
  console.log(`  ${b.id.padEnd(28)} [${b.via}] ${b.mod || ""}`);
}

// pliki-sieroty: na dysku, ale nie wskazane przez żaden działający resolve
const used = new Set();
for (const id of ids) {
  const r = resolve(id);
  if (r.ok) used.add(`${r.mod}/${r.file}`);
}
let orphans = 0, diskFiles = 0;
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(pdf|html)$/i.test(e.name)) {
      diskFiles++;
      const key = path.relative(printRoot, p).replace(/\.(pdf|html)$/i, "");
      if (!used.has(key)) orphans++;
    }
  }
}
walk(printRoot);
console.log("\n── PLIKI-SIEROTY (na dysku, niepodłączone) ────────────────");
console.log(`  Plików na dysku (pdf+html): ${diskFiles}`);
console.log(`  Unikalnych podłączonych:    ${used.size}`);
console.log(`  Sieroty (nieosiągalne z UI): ~${orphans}`);

console.log("\n── HIGIENA KATALOGÓW ──────────────────────────────────────");
const dupes = [], misplaced = [];
function walk2(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name === "_misplaced") misplaced.push(p); walk2(p); }
    else if (/\(\d+\)\.(pdf|html)$/i.test(e.name)) dupes.push(p);
  }
}
walk2(printRoot);
console.log(`  Pliki-duplikaty "(1)/(2)": ${dupes.length}`);
console.log(`  Katalogi _misplaced:       ${misplaced.length}`);
console.log("\n══════════════════════════════════════════════════════════");
