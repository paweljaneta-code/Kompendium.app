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
const clinIndex = JSON.parse(
  fs.readFileSync(path.join(root, "public/handouts/clinician-handout-index.json"), "utf8")
).index;
const clinDead = [], clinWrong = [];
for (const [cardId, ref] of Object.entries(clinIndex)) {
  const fp = path.join(root, "public/handouts/clinician", `${ref}.html`);
  if (!fs.existsSync(fp)) { clinDead.push(`${cardId}->${ref}`); continue; }
  const m = fs.readFileSync(fp, "utf8").match(/<title>[^—–-]*[—–-]\s*([^<]+)/i);
  const ct = m ? normT(m[1]) : "";
  const own = cardTitle.get(cardId) || "";
  if (own && ct && !(own === ct || own.includes(ct) || ct.includes(own))) clinWrong.push(`${cardId}->${ref}`);
}
console.log(`# Arkusze klinicysty (${Object.keys(clinIndex).length} mapowań)`);
check("klinicysta: 0 martwych wskazań na plik", clinDead);
check("klinicysta: treść pliku zgodna z kartą (0 pomieszanych)", clinWrong);

console.log("");
if (fails.length) {
  console.error(`✖ Integralność: ${fails.length} testów FAIL`);
  process.exit(1);
}
console.log(`✓ Integralność treści OK — wszystkie testy przeszły (${allHtml.length} plików HTML)`);
