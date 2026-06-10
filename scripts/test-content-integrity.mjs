#!/usr/bin/env node
// Gate integralności treści — chroni przed regresją błędów naprawionych w PR #5:
//  * kreatory SOS: klasa `card` na krokach, spójne TOTAL_STEPS, elementy DOM,
//    localStorage w try/catch, brak składni psującej stary iOS/WebView,
//  * print-resolver bez martwych wskazań, brak redundantnych PDF (z bliźniakiem HTML),
//  * brak artefaktów w plikach (znaki sterujące, MASK_ATTR, BOM, mojibake, CRLF,
//    treść przed <!DOCTYPE, zewnętrzne <script src>).
// Uruchamiany lokalnie (`npm test`) i w CI. Zero zależności — czysty Node.

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const SOS = path.join(root, "public/sos");
const PRINT = path.join(root, "public/handouts/print");
const CLINICIAN = path.join(root, "public/handouts/clinician");

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const fails = [];
const rel = (p) => path.relative(root, p);
function check(name, brokenList) {
  if (brokenList.length) {
    fails.push(name);
    console.log(`  FAIL  ${name}  (${brokenList.length}) np.: ${brokenList.slice(0, 5).map(rel).join(", ")}`);
  } else {
    console.log(`  PASS  ${name}`);
  }
}

const sosFiles = walk(SOS);

// ---- localStorage zabezpieczony? (obsługa wieloliniowego try{}catch) ----
function localStorageUnguarded(s) {
  let i = s.indexOf("localStorage");
  while (i !== -1) {
    const before = s.slice(0, i);
    if (before.lastIndexOf("try") <= before.lastIndexOf("catch")) return true;
    i = s.indexOf("localStorage", i + 1);
  }
  return false;
}

const tagRe = /<(?:section|div|article)\b([^>]*\bdata-step="\d+"[^>]*)>/gi;
const classesOf = (attrs) => {
  const m = attrs.match(/class="([^"]*)"/);
  return m ? new Set(m[1].split(/\s+/)) : new Set();
};

const badClass = [], totalMismatch = [], gaps = [], missingId = [], lsBad = [],
      noNextFn = [], oc = [], lookbehind = [], nullish = [], logAssign = [];
const REQ = ["dots", "stepNum", "backBtn", "nextBtn"];

for (const p of sosFiles) {
  const s = fs.readFileSync(p, "utf8");
  const tags = [...s.matchAll(tagRe)].map((m) => m[1]);
  if (tags.length && !tags.every((a) => classesOf(a).has("card"))) badClass.push(p);

  const tm = s.match(/TOTAL_STEPS\s*=\s*(\d+)/);
  const total = tm ? Number(tm[1]) : null;
  const steps = [...new Set([...s.matchAll(/data-step="(\d+)"/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
  if (total && steps.length && (Math.max(...steps) !== total || steps.length !== total)) totalMismatch.push(p);
  if (steps.length && steps.some((v, idx) => v !== idx + 1)) gaps.push(p);

  if (REQ.some((id) => !s.includes(`id="${id}"`))) missingId.push(p);
  if (localStorageUnguarded(s)) lsBad.push(p);
  if (!/function\s+nextStep/.test(s)) noNextFn.push(p);
  if (/[\w)\]]\?\.\s*[A-Za-z_[(]/.test(s)) oc.push(p);
  if (s.includes("(?<=") || s.includes("(?<!")) lookbehind.push(p);
  if (/[\w)\]"']\s*\?\?\s*[\w(["']/.test(s)) nullish.push(p);
  if (/(\?\?=|\|\|=|&&=)/.test(s)) logAssign.push(p);
}

console.log(`# Kreatory SOS (${sosFiles.length} plików)`);
check("SOS: klasa 'card' na elementach data-step", badClass);
check("SOS: TOTAL_STEPS == liczba kroków", totalMismatch);
check("SOS: brak luk w numeracji kroków", gaps);
check("SOS: wymagane elementy DOM (dots/stepNum/backBtn/nextBtn)", missingId);
check("SOS: localStorage w try/catch", lsBad);
check("SOS: nextStep() zdefiniowany", noNextFn);
check("SOS: brak optional chaining '?.'", oc);
check("SOS: brak regex lookbehind", lookbehind);
check("SOS: brak nullish '??'", nullish);
check("SOS: brak logical-assign (??= ||= &&=)", logAssign);

// ---- print-resolver + redundantne PDF ----
console.log(`# Handouty / resolver`);
const resolver = JSON.parse(fs.readFileSync(path.join(PRINT, "..", "print-resolver.json"), "utf8")).resolver;
const dead = Object.entries(resolver).filter(
  ([, v]) => !fs.existsSync(path.join(PRINT, v.mod, `${v.file}.${v.ext}`))
).map(([k]) => k);
check("resolver: 0 martwych wskazań na plik", dead);

const redundant = walk(PRINT).filter(
  (p) => p.endsWith(".pdf") && fs.existsSync(p.slice(0, -4) + ".html")
);
check("0 redundantnych PDF (z bliźniakiem HTML)", redundant);

// ---- skan artefaktów na wszystkich plikach HTML ----
const allHtml = [...walk(SOS), ...walk(PRINT), ...walk(CLINICIAN), path.join(root, "kompendium.html")];
const ctrlChars = [], bom = [], maskAttr = [], mojibake = [], crlf = [], beforeDoctype = [], extScript = [];
const CTRL = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;
const MOJIBAKE = /â€|Ã[-¿]/;
const CRLF = Buffer.from("\r\n");
for (const p of allHtml) {
  const raw = fs.readFileSync(p);
  const s = raw.toString("utf8");
  if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) bom.push(p);
  if (CTRL.test(s)) ctrlChars.push(p);
  if (s.includes("MASK_ATTR")) maskAttr.push(p);
  if (MOJIBAKE.test(s)) mojibake.push(p);
  if (raw.includes(CRLF)) crlf.push(p);
  const head = s.replace(/^\s+/, "").slice(0, 20).toLowerCase();
  if (!head.startsWith("<!doctype") && !head.startsWith("<html")) beforeDoctype.push(p);
  if (/<script[^>]*\bsrc\s*=\s*["'](https?:)?\/\//i.test(s)) extScript.push(p);
}
console.log(`# Skan artefaktów (${allHtml.length} plików HTML)`);
check("0 znaków sterujących (np. maskowanie \\x01)", ctrlChars);
check("0 placeholderów MASK_ATTR", maskAttr);
check("0 BOM na początku pliku", bom);
check("0 mojibake (podwójne kodowanie)", mojibake);
check("0 końcówek CRLF", crlf);
check("0 treści przed <!DOCTYPE", beforeDoctype);
check("0 zewnętrznych <script src> (ślad AV/proxy)", extScript);

// ---- arkusze klinicysty: indeks (cardId -> "mod/plik") wskazuje plik,
//      którego TREŚĆ należy do karty (ochrona przed pomieszaniem treści) ----
const normT = (t) =>
  t.replace(/<[^>]+>/g, " ").normalize("NFD").replace(/\p{M}/gu, "")
    .toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const kompendium = fs.readFileSync(path.join(root, "kompendium.html"), "utf8");
const cardTitle = new Map();
for (const m of kompendium.matchAll(/<details class="card" id="([^"]+)"[\s\S]*?<span class="nm">([\s\S]*?)<\/span>/g)) {
  cardTitle.set(m[1], normT(m[2]));
}
const clinData = JSON.parse(
  fs.readFileSync(path.join(root, "public/handouts/clinician-handout-index.json"), "utf8")
);
const clinIndex = clinData.index;
const clinVerified = new Set(clinData.verified || []); // ręcznie zweryfikowane (pass-3)
const clinDead = [], clinWrong = [];
const tk = (x) => new Set(x.split(" ").filter((w) => w.length >= 4));
for (const [cardId, ref] of Object.entries(clinIndex)) {
  const fp = path.join(root, "public/handouts/clinician", `${ref}.html`);
  if (!fs.existsSync(fp)) { clinDead.push(`${cardId}->${ref}`); continue; }
  if (clinVerified.has(cardId)) continue; // przegląd ręczny — pomijamy auto-kontrolę treści
  const html = fs.readFileSync(fp, "utf8");
  const m = html.match(/<title>[^—–-]*[—–-]\s*([^<]+)/i);
  const ct = m ? normT(m[1]) : "";
  const own = cardTitle.get(cardId) || "";
  if (!own) continue;
  // zgodne, gdy tytuł arkusza pokrywa się z tytułem karty (substring) LUB
  // gdy TREŚĆ pliku pokrywa >=60% słów tytułu karty (arkusz z innym tytułem).
  // Pomieszany arkusz (inny temat) ma pokrycie ~0 -> wykrywany.
  if (own === ct || own.includes(ct) || ct.includes(own)) continue;
  const bodyTok = tk(normT(html.replace(/<(script|style)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ").slice(0, 3000)));
  const ownTok = tk(own);
  let cov = 0;
  for (const w of ownTok) if (bodyTok.has(w)) cov++;
  if (!ownTok.size || cov / ownTok.size < 0.6) clinWrong.push(`${cardId}->${ref}`);
}
console.log(`# Arkusze klinicysty (${Object.keys(clinIndex).length} mapowań)`);
check("klinicysta: 0 martwych wskazań na plik", clinDead);
check("klinicysta: treść pliku zgodna z kartą (0 pomieszanych)", clinWrong);

// ---- handouty do druku: symulacja serwowania (strażnik fixu scramble) ----
// Replikuje resolvePrintHandoutUrl: skip -> criticalAliases -> manual ->
// HANDOUT_FILE_INDEX(<id>) -> HANDOUT_INDEX(<id>) -> resolver. Gwarantuje, że
// (a) karty w skip[] dają placeholder mimo istnienia <id>.html (scramble),
// (b) kuratorowany override wygrywa z plikiem o dokładnej nazwie.
const PRINTROOT = path.join(root, "public/handouts/print");
const printExists = (mod, f) =>
  fs.existsSync(path.join(PRINTROOT, mod, `${f}.html`)) || fs.existsSync(path.join(PRINTROOT, mod, `${f}.pdf`));
const rjson = JSON.parse(fs.readFileSync(path.join(root, "public/handouts/print-resolver.json"), "utf8"));
const printResolver = rjson.resolver, skipSet = new Set(rjson.skip || []);
const fileIdx = JSON.parse(fs.readFileSync(path.join(root, "public/handouts/handout-file-index.json"), "utf8")).index;
// criticalAliases z handoutOverrides.ts
const hoSrc = fs.readFileSync(path.join(root, "src/lib/handoutOverrides.ts"), "utf8");
const caBlock = (hoSrc.match(/var criticalAliases = \{([\s\S]*?)\};/) || [, ""])[1];
const critAlias = {};
for (const mm of caBlock.matchAll(/"([^"]+)":\s*\{\s*mod:\s*"([^"]+)",\s*file:\s*"([^"]+)"/g)) critAlias[mm[1]] = { mod: mm[2], file: mm[3] };
// HANDOUT_INDEX z kompendium.html
const hIndex = {};
const hiM = kompendium.match(/window\.HANDOUT_INDEX\s*=\s*(\{[\s\S]*?\});/);
if (hiM) for (const mm of hiM[1].matchAll(/"([^"]+)"\s*:\s*"([^"]+)"/g)) hIndex[mm[1]] = mm[2];
function resolvePrint(id) {
  if (skipSet.has(id)) return null;
  const r = printResolver[id];
  const cand = [];
  if (critAlias[id]) cand.push(critAlias[id]);
  if (r && r.manual) cand.push({ mod: r.mod, file: r.file });
  if (fileIdx[id]) cand.push({ mod: fileIdx[id], file: id });
  if (hIndex[id]) cand.push({ mod: hIndex[id], file: id });
  if (r) cand.push({ mod: r.mod, file: r.file });
  for (const c of cand) if (printExists(c.mod, c.file)) return c;
  return null;
}
const skipLeak = [...skipSet].filter((id) => resolvePrint(id)).map((id) => `${id}->${resolvePrint(id).mod}/${resolvePrint(id).file}`);
const manualBroken = [];
for (const [id, r] of Object.entries(printResolver)) {
  if (!r.manual || critAlias[id]) continue; // criticalAlias ma pierwszeństwo
  const got = resolvePrint(id);
  if (!got || got.file !== r.file) manualBroken.push(`${id} chce ${r.file}, dostaje ${got ? got.file : "placeholder"}`);
}
console.log(`# Handouty do druku — symulacja serwowania`);
check("druk: karty SKIP dają placeholder (scramble nie serwowany)", skipLeak);
check("druk: override manual wygrywa z plikiem exact-id", manualBroken);

console.log("");
if (fails.length) {
  console.error(`✖ Integralność: ${fails.length} testów FAIL`);
  process.exit(1);
}
console.log(`✓ Integralność treści OK — wszystkie testy przeszły (${allHtml.length} plików HTML)`);
