/**
 * Naprawa spójności materiałów SOS (public/sos/**.html).
 * Zakres:
 *   1. <title>  "SOS ·"        -> "Narzędzie ·"
 *   2. .hdr-title prefiks       -> "Narzędzie · <em>...</em>"
 *   3. etykieta przycisku       "Dalej" -> "Dalej →"
 *   4. klucz localStorage       -> konwencja  sos_<nazwa-pliku-z-podkresleniami>
 *   5. opróżnienie wypełnionych pól (3 pliki: adhd-grupa, an-relapse-seed, se-perfekcjonizm)
 *
 * Uruchom:  node scripts/fix-sos-consistency.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sosRoot = path.join(root, "public/sos");

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".html")) files.push(p);
  }
})(sosRoot);
files.sort();

const counts = {
  title: 0,
  hdrPrefix: 0,
  hdrNoPrefix: 0,
  nextBtn: 0,
  key: 0,
  content: 0,
};
const changedFiles = new Set();

function stripEm(s) {
  return s.replace(/<\/?em>/g, "").replace(/\s+/g, " ").trim();
}

for (const file of files) {
  const relPath = path.relative(sosRoot, file).replace(/\\/g, "/");
  const base = path.basename(file, ".html");
  const expectedKey = "sos_" + base.replace(/-/g, "_");
  let html = fs.readFileSync(file, "utf8");
  const before = html;

  // 1. <title> prefix
  html = html.replace(/<title>SOS\s*·/g, () => {
    counts.title++;
    return "<title>Narzędzie ·";
  });

  // 2a. .hdr-title  "SOS ·" -> "Narzędzie ·"
  html = html.replace(/(class="hdr-title">)SOS\s*·/g, (_, p1) => {
    counts.hdrPrefix++;
    return p1 + "Narzędzie ·";
  });

  // 2b. .hdr-title bez prefiksu -> opakuj w "Narzędzie · <em>...</em>"
  html = html.replace(/<div class="hdr-title">([\s\S]*?)<\/div>/g, (m, inner) => {
    if (/^\s*Narzędzie\s*·/.test(inner)) return m;
    const title = stripEm(inner);
    if (!title) return m;
    counts.hdrNoPrefix++;
    return `<div class="hdr-title">Narzędzie · <em>${title}</em></div>`;
  });

  // 3. nextBtn: "Dalej" (bez strzałki) -> "Dalej →"
  html = html.replace(/(id="nextBtn"[^>]*>)Dalej(<\/button>)/g, (_, a, b) => {
    counts.nextBtn++;
    return a + "Dalej →" + b;
  });

  // 4. klucz localStorage -> konwencja sos_<plik>
  html = html.replace(
    /((?:var|const|let)\s+(?:STORAGE_KEY|KEY)\s*=\s*["'])([^"']+)(["'])/g,
    (m, a, val, c) => {
      if (val === expectedKey) return m;
      counts.key++;
      return a + expectedKey + c;
    }
  );

  // 5. Opróżnienie wypełnionych pól (przypadki szczególne)
  if (relPath === "adhd/adhd-grupa.html") {
    const n = (html.match(/class="example-chip picked"/g) || []).length;
    if (n) {
      html = html.replace(/class="example-chip picked"/g, 'class="example-chip"');
      counts.content += n;
    }
  }
  if (relPath === "an/an-relapse-seed.html") {
    const re = /(id="rel-k-tz"[^>]*?)value="([^"]*)"/;
    if (re.test(html)) {
      html = html.replace(re, (_, pre, val) => `${pre}placeholder="${val}"`);
      counts.content++;
    }
  }
  if (relPath === "selfcomp/se-perfekcjonizm.html") {
    html = html.replace(/(id="(?:cur|tar)-[wrhv]"[^>]*?)\svalue="\d+"/g, (_, pre) => {
      counts.content++;
      return pre + ' value=""';
    });
    html = html.replace(/(id="bar-[ct][wrhv]" style="width:)\d+%(;")/g, (_, a, b) => a + "0%" + b);
    html = html.replace(/(id="total(?:Cur|Tar)">)Suma: 100%(<)/g, (_, a, b) => a + "Suma: 0% (powinno = 100%)" + b);
  }

  if (html !== before) {
    fs.writeFileSync(file, html);
    changedFiles.add(relPath);
  }
}

console.log("=== Naprawa spójności SOS — zakończona ===\n");
console.log("Zmienione pliki:", changedFiles.size);
console.log("Podmiany:");
console.log("  <title> 'SOS ·' -> 'Narzędzie ·' :", counts.title);
console.log("  hdr-title prefiks 'SOS ·'        :", counts.hdrPrefix);
console.log("  hdr-title bez prefiksu opakowane :", counts.hdrNoPrefix);
console.log("  przycisk 'Dalej' -> 'Dalej →'    :", counts.nextBtn);
console.log("  klucze localStorage znormalizowane:", counts.key);
console.log("  opróżnione pola (chipy/inputy)   :", counts.content);
