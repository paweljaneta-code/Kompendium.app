#!/usr/bin/env node
// Buduje indeks arkuszy klinicysty WG TREŚCI (nie wg nazwy pliku).
// Pliki w public/handouts/clinician/<mod>/<id>.html bywają „pomieszane" — plik
// o nazwie karty X potrafi zawierać arkusz innego narzędzia Y (tytuł
// "Arkusz klinicysty — <Y>"). Żeby karta otwierała SWÓJ arkusz, mapujemy
// cardId -> "mod/plik" tego pliku, którego TREŚĆ należy do danej karty.
// Karty bez pliku z pasującą treścią nie trafiają do indeksu (przycisk ukryty).

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const kompendiumPath = path.join(root, "kompendium.html");
const clinicianRoot = path.join(root, "public/handouts/clinician");
const outPath = path.join(root, "public/handouts/clinician-handout-index.json");

function norm(t) {
  return t
    .replace(/<[^>]+>/g, " ") // zdejmij zagnieżdżone tagi (np. <em> w tytule karty)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// karty: normTitle -> [cardId] (do wykrycia, do której karty należy treść pliku)
const source = fs.readFileSync(kompendiumPath, "utf8");
const titleToIds = new Map();
const cardModule = new Map();
const tabRe =
  /<div class="tab-content"[^>]*id="tab-([^"]+)"[\s\S]*?(?=<div class="tab-content"|<button class="scroll-top"|$)/g;
for (const tab of source.matchAll(tabRe)) {
  const mod = tab[1];
  for (const cm of tab[0].matchAll(/<details class="card" id="([^"]+)"[\s\S]*?<span class="nm">([\s\S]*?)<\/span>/g)) {
    const id = cm[1];
    const nt = norm(cm[2]);
    if (!nt) continue;
    if (!titleToIds.has(nt)) titleToIds.set(nt, []);
    titleToIds.get(nt).push(id);
    if (!cardModule.has(id)) cardModule.set(id, mod);
  }
}

// treść pliku -> tytuł narzędzia (po "Arkusz klinicysty — X")
function contentTitle(file) {
  const html = fs.readFileSync(file, "utf8");
  const m = html.match(/<title>[^—–-]*[—–-]\s*([^<]+)/i);
  return m ? norm(m[1]) : "";
}

// dla każdej karty zbierz pliki, których treść do niej należy
const providers = new Map(); // cardId -> [{mod,file,selfNamed}]
for (const mod of fs.readdirSync(clinicianRoot)) {
  const dir = path.join(clinicianRoot, mod);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".html")) continue;
    const fid = f.slice(0, -5);
    const ct = contentTitle(path.join(dir, f));
    if (!ct) continue;
    for (const cardId of titleToIds.get(ct) || []) {
      if (!providers.has(cardId)) providers.set(cardId, []);
      providers.get(cardId).push({ mod, file: fid, selfNamed: fid === cardId });
    }
  }
}

// wybór najlepszego dostawcy dla karty:
//  1) plik o nazwie == cardId (poprawnie nazwany, ma właściwą treść),
//  2) plik w module karty, 3) pierwszy deterministycznie.
const index = {};
const ambiguous = [];
for (const [cardId, list] of providers) {
  list.sort((a, b) => a.mod.localeCompare(b.mod) || a.file.localeCompare(b.file));
  let pick =
    list.find((p) => p.selfNamed) ||
    list.find((p) => p.mod === cardModule.get(cardId)) ||
    list[0];
  index[cardId] = `${pick.mod}/${pick.file}`;
  if (list.length > 1 && !list.some((p) => p.selfNamed)) ambiguous.push(cardId);
}

const sorted = {};
for (const k of Object.keys(index).sort()) sorted[k] = index[k];

fs.writeFileSync(
  outPath,
  JSON.stringify(
    { generatedAt: new Date().toISOString(), count: Object.keys(sorted).length, index: sorted },
    null,
    2
  ) + "\n"
);

// statystyki
let self = 0;
let remap = 0;
for (const [cardId, ref] of Object.entries(sorted)) {
  if (ref === `${cardModule.get(cardId) ?? ref.split("/")[0]}/${cardId}` || ref.endsWith(`/${cardId}`)) self++;
  else remap++;
}
console.log("Clinician index (wg treści):", Object.keys(sorted).length, "kart");
console.log("  treść w pliku o własnej nazwie:", self);
console.log("  treść w INNYM pliku (remap):", remap);
console.log("  karty z >1 kandydatem (rozstrzygnięte):", ambiguous.length);
console.log("Written:", outPath);
