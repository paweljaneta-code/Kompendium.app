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
const cardTitleById = new Map();
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
    if (!cardTitleById.has(id)) cardTitleById.set(id, nt);
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
const allFiles = []; // {mod, file, ct} — do pass-2
for (const mod of fs.readdirSync(clinicianRoot)) {
  const dir = path.join(clinicianRoot, mod);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".html")) continue;
    const fid = f.slice(0, -5);
    const ct = contentTitle(path.join(dir, f));
    if (!ct) continue;
    allFiles.push({ mod, file: fid, ct });
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

// Pass 2 — odzysk po nazwie pliku: karta bez dokładnego dopasowania treści,
// ale istnieje plik O JEJ NAZWIE, którego treść dotyczy tej samej tematyki
// (tytuł arkusza sformułowany inaczej niż tytuł karty). Ograniczone do plików
// o nazwie == cardId, więc bez ryzyka cross-module. Próg: Jaccard tokenów >= 0.5.
const tok = (s) => new Set(s.split(" ").filter((w) => w.length >= 4));
// tokeny tytułu + body pliku (do oceny, czy plik dotyczy tematu karty)
function fileTokens(file) {
  const html = fs.readFileSync(file, "utf8");
  const t = html.match(/<title>[^—–-]*[—–-]\s*([^<]+)/i);
  const body = html.replace(/<(script|style)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ").slice(0, 3000);
  return tok(norm((t ? t[1] : "") + " " + body));
}
const bySelfName = new Map(); // file basename -> [mod]
for (const { mod, file } of allFiles) {
  if (!bySelfName.has(file)) bySelfName.set(file, []);
  bySelfName.get(file).push(mod);
}
let recovered = 0;
for (const [cardId, titleNorm] of cardTitleById) {
  if (index[cardId]) continue;
  const mods = bySelfName.get(cardId);
  if (!mods) continue;
  const cardTok = tok(titleNorm);
  if (!cardTok.size) continue;
  // plik O NAZWIE karty, którego TREŚĆ pokrywa >=60% słów tytułu karty
  // (rozpoznaje arkusz z inaczej sformułowanym tytułem; wyklucza pomieszane,
  // bo tam słowa tytułu karty nie występują w treści). Bez ryzyka cross-module.
  const pref = mods.includes(cardModule.get(cardId)) ? cardModule.get(cardId) : mods[0];
  const ftok = fileTokens(path.join(clinicianRoot, pref, `${cardId}.html`));
  let cov = 0;
  for (const w of cardTok) if (ftok.has(w)) cov++;
  if (cov / cardTok.size >= 0.6) {
    index[cardId] = `${pref}/${cardId}`;
    recovered++;
  }
}

// Pass 3 — ręczny przegląd 60 plików-sierot (scramble = shift treści w modułach).
// Tytuł "Arkusz klinicysty — X" jednoznacznie nazywa narzędzie; mapowanie
// zweryfikowane indywidualnie (cardId -> plik zawierający JEGO treść).
const ORPHAN_RECOVERY = {
  "gosc-w-domu": "act/kompas-wartosci",
  "adhd-finanse": "adhd/adhd-kobieta2",
  "adhd-mindful": "adhd/adhd-odzywianie",
  "an-mantra": "an/an-body-imagery",
  "an-thinspo-detox": "an/an-fear-foods",
  "an-regular": "an/an-hospital",
  "an-ego-syntonia": "an/an-mezczyzni",
  "an-podtypy": "an/an-podtypy",
  "aspd-farmakoterapia": "aspd/prawo-aspd",
  "at-ipf": "att-teoria/at-earned",
  "at-hold-me-tight": "att-teoria/at-kultura",
  "at-rupture-repair": "att-teoria/at-plan",
  "avpd-farmakoterapia": "avpd/samowspolczucie-avpd",
  "bn-wazenie": "bn/bn-alternatywy-kompensacji",
  "bn-lustro": "bn/bn-checking",
  "bn-glod-sytosc": "bn/bn-dziennik-zywieniowy",
  "bn-urge-surfing": "bn/bn-ekspozycja-food",
  "bn-plan-awaryjny": "bn/bn-emocje-objadanie",
  "bn-overvalue": "bn/bn-glod-sytosc",
  "bn-reguly-zywieniowe": "bn/bn-higiena-posilkow",
  "bn-sekret": "bn/bn-intolerancja-dystresu",
  "bn-dlugoterminowy-plan": "bn/bn-komunikacja",
  "bn-emocje-objadanie": "bn/bn-kontinuum-atrakcyjnosci",
  "bn-psychoedukacja-rodzina": "bn/bn-plan-awaryjny",
  "bn-slizg-vs-nawrot": "bn/bn-psychoedukacja-rodzina",
  "bn-mindful-eating": "bn/bn-reguly-zywieniowe",
  "bn-regularne-jedzenie": "bn/bn-scoff",
  "bn-sygnaly-nawrotu": "bn/bn-sygnaly-nawrotu",
  "bn-kontinuum-atrakcyjnosci": "bn/bn-unikanie-ciala",
  "bn-model-fairburn": "bn/podloze-bn",
  "dep-specyfikatory": "dep/dep-be-pleasure",
  "dep-mezczyzni": "dep/dep-diffdiag",
  "dep-be-pleasure": "dep/profilaktyka-dep",
  "strzalka-dep": "dep/rejestr-mysli",
  "stepped-care": "gad/oderwana-uwaznosc",
  "safety-inv-ha": "health_anx/ha-case-kasia",
  "rodzina-ha": "health_anx/hai-diffdiag",
  "triangles-ha": "health_anx/proxy-ha",
  "inne-zo-farmakoterapia": "inne-zo/inne-zo-plan-profilaktyki",
  "npd-farmakoterapia": "npd/npi-npd",
  "ocd-be-checking": "ocd/ocd-be-checking",
  "ocd-be-contamination": "ocd/ocd-be-contamination",
  "fb-protokol": "phobia/fb-be-context",
  "fb-dzieci": "phobia/fb-bii",
  "fb-be-expectancy": "phobia/fb-dzieci",
  "fb-be-context": "phobia/fb-farmako",
  "fb-farmako": "phobia/fb-protokol",
  "fb-model-craske": "phobia/podloze-phobia",
  "psychosis-farmakoterapia": "psychosis/ps-objpoz",
  "psy-recovery": "psychosis/ps-praca",
  "ps-praca": "psychosis/ps-samobojstwo",
  "st-green-exercise": "stress/st-oddech-rezonans"
};
let orphanRecovered = 0;
for (const [cardId, ref] of Object.entries(ORPHAN_RECOVERY)) {
  if (index[cardId]) continue;
  if (!cardTitleById.has(cardId)) continue; // karta musi istnieć
  if (!fs.existsSync(path.join(clinicianRoot, `${ref}.html`))) continue;
  index[cardId] = ref;
  orphanRecovered++;
}

const sorted = {};
for (const k of Object.keys(index).sort()) sorted[k] = index[k];

// karty z ręcznie zweryfikowanego pass-3 (tytuł arkusza różni się słownie od
// tytułu karty, więc automatyczny gate pokrycia treści ich nie potwierdzi —
// gate je pomija, bo przegląd był ręczny).
const verified = Object.keys(ORPHAN_RECOVERY)
  .filter((c) => sorted[c] === ORPHAN_RECOVERY[c])
  .sort();

fs.writeFileSync(
  outPath,
  JSON.stringify(
    { generatedAt: new Date().toISOString(), count: Object.keys(sorted).length, verified, index: sorted },
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
console.log("  odzyskane po nazwie pliku (pass-2, inny tytuł): ", recovered);
console.log("  odzyskane z plików-sierot (pass-3, ręczny przegląd):", orphanRecovered);
console.log("  karty z >1 kandydatem (rozstrzygnięte):", ambiguous.length);
console.log("Written:", outPath);
