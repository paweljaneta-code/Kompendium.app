/**
 * Naprawa surowych cudzysłowów osadzonych w wartościach atrybutów HTML
 * w materiałach SOS (public/sos/**.html).
 *
 * Problem: autorzy używali prostego `"` jako cudzysłowu typograficznego wewnątrz
 * atrybutów `placeholder="..."` / `onclick="..."`, co przedwcześnie zamyka atrybut
 * i łamie formalne parsowanie HTML (przeglądarki to tolerują, ale to niespójność).
 *
 * Naprawa: wewnętrzne `"` zamieniane na encję `&quot;` (renderuje się identycznie),
 * a `'` wewnątrz atrybutu w pojedynczych cudzysłowach -> `&#39;`.
 *
 * Prawdziwe zamknięcie atrybutu wyznaczane przez sprawdzenie, po którym cudzysłowie
 * reszta taga parsuje się czysto (kolejne atrybuty -> `>`).
 *
 * Uruchom:
 *   node scripts/fix-sos-quotes.mjs           # dry-run (raport)
 *   node scripts/fix-sos-quotes.mjs --write    # zapis zmian
 */
import fs from "node:fs";
import path from "node:path";

const WRITE = process.argv.includes("--write");
const root = path.resolve(import.meta.dirname, "..");
const sosRoot = path.join(root, "public/sos");

const files = [];
(function w(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) w(p);
    else if (e.name.endsWith(".html")) files.push(p);
  }
})(sosRoot);
files.sort();

const WS = new Set([" ", "\t", "\n", "\r", "\f"]);
const NAME_RE = /^[a-zA-Z][a-zA-Z0-9:_.-]*$/;

/** Czy od pozycji `pos` reszta taga to poprawne atrybuty zakończone `>` lub `/>`? */
function remainderClean(h, pos) {
  let i = pos;
  const len = h.length;
  let guard = 0;
  while (i < len) {
    if (++guard > 10000) return false;
    while (i < len && WS.has(h[i])) i++;
    if (i >= len) return false;
    if (h[i] === ">") return true;
    if (h[i] === "/" && h[i + 1] === ">") return true;
    // nazwa atrybutu
    const ns = i;
    while (i < len && !WS.has(h[i]) && h[i] !== "=" && h[i] !== ">" && h[i] !== "/" && h[i] !== '"' && h[i] !== "'") i++;
    const name = h.slice(ns, i);
    if (!NAME_RE.test(name)) return false;
    while (i < len && WS.has(h[i])) i++;
    if (h[i] !== "=") continue; // atrybut logiczny
    i++;
    while (i < len && WS.has(h[i])) i++;
    const q = h[i];
    if (q === '"' || q === "'") {
      const close = findTrueClose(h, i + 1, q);
      if (close === -1) return false;
      i = close + 1;
    } else {
      while (i < len && !WS.has(h[i]) && h[i] !== ">") i++;
    }
  }
  return false;
}

/** Znajdź prawdziwy znak zamykający wartości (pierwszy `q`, po którym reszta taga jest czysta). */
function findTrueClose(h, valStart, q) {
  let i = valStart;
  while (true) {
    const c = h.indexOf(q, i);
    if (c === -1) return -1;
    if (remainderClean(h, c + 1)) return c;
    i = c + 1;
  }
}

/** Przetwórz pojedynczy tag od '<' na `start`. Zwraca {end, escapes:[{pos,q}]} */
function processTag(h, start) {
  const len = h.length;
  let i = start + 1;
  while (i < len && !WS.has(h[i]) && h[i] !== ">" && h[i] !== "/") i++; // nazwa tagu
  const escapes = [];
  let guard = 0;
  while (i < len) {
    if (++guard > 10000) return { end: i, escapes, bail: true };
    while (i < len && WS.has(h[i])) i++;
    if (i >= len) return { end: len - 1, escapes, bail: true };
    if (h[i] === ">") return { end: i, escapes };
    if (h[i] === "/") {
      if (h[i + 1] === ">") return { end: i + 1, escapes };
      i++;
      continue;
    }
    const ns = i;
    while (i < len && !WS.has(h[i]) && h[i] !== "=" && h[i] !== ">" && h[i] !== "/") i++;
    if (i === ns) {
      const gt = h.indexOf(">", i);
      return { end: gt === -1 ? len - 1 : gt, escapes, bail: true };
    }
    while (i < len && WS.has(h[i])) i++;
    if (h[i] !== "=") continue;
    i++;
    while (i < len && WS.has(h[i])) i++;
    const q = h[i];
    if (q === '"' || q === "'") {
      const valStart = i + 1;
      const close = findTrueClose(h, valStart, q);
      if (close === -1) {
        const gt = h.indexOf(">", valStart);
        return { end: gt === -1 ? len - 1 : gt, escapes, bail: true };
      }
      for (let p = valStart; p < close; p++) {
        if (h[p] === q) escapes.push({ pos: p, q });
      }
      i = close + 1;
    } else {
      while (i < len && !WS.has(h[i]) && h[i] !== ">") i++;
    }
  }
  return { end: i - 1, escapes };
}

let totalEsc = 0;
let bailTags = 0;
const changedFiles = [];

for (const file of files) {
  const h = fs.readFileSync(file, "utf8");
  const allEscapes = [];
  let idx = 0;
  while ((idx = h.indexOf("<", idx)) !== -1) {
    const c = h[idx + 1];
    if (c && /[a-zA-Z]/.test(c)) {
      const { end, escapes, bail } = processTag(h, idx);
      if (bail) bailTags++;
      for (const e of escapes) allEscapes.push(e);
      idx = end > idx ? end + 1 : idx + 1;
    } else {
      idx++;
    }
  }
  if (!allEscapes.length) continue;
  allEscapes.sort((a, b) => a.pos - b.pos);
  let out = "";
  let prev = 0;
  for (const e of allEscapes) {
    out += h.slice(prev, e.pos) + (e.q === '"' ? "&quot;" : "&#39;");
    prev = e.pos + 1;
  }
  out += h.slice(prev);
  totalEsc += allEscapes.length;
  changedFiles.push(file.replace("public/sos/", "").replace(sosRoot + "/", ""));
  if (WRITE) fs.writeFileSync(file, out);
}

console.log(WRITE ? "=== ZAPIS ===" : "=== DRY-RUN (bez zapisu) ===");
console.log("Cudzysłowów do zamiany na encje:", totalEsc);
console.log("Plików dotkniętych:", changedFiles.length);
console.log("Tagów nierozwiązanych (bail):", bailTags);
if (!WRITE) console.log("\nUruchom z --write, aby zapisać.");
