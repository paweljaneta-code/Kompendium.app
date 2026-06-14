import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const kompendiumPath = path.join(root, "kompendium.html");
const printRoot = path.join(root, "public/handouts/print");
const outPath = path.join(root, "public/handouts/print-resolver.json");

/** Cards that must not resolve to a print handout (no file / wrong legacy mapping). */
const SKIP_PRINT_IDS = new Set([
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
  "geneza-ocpd",
  "krytyka-ocpd",
  "ocpd-farmakoterapia",
  "adhd-trauma",
  // audyt 2026-06 print: karty bez właściwego pliku -> placeholder
  "aa-baza",
  "aa-injury",
  "aa-priming",
  "adhd-utrzymanie-systemow",
  "codep-plan-utrzymania",
  "cptsd-plan-kryzysy",
  "ip-plan-trudne",
  "ip-zadania-behawioralne",
  "krytyka-ocpd",
  "mct-ha",
  "ppu-behavioral",
  "proc-utrwalenie",
  "psychoed-rodziny-ptsd",
  "workplace-sad",
  // dedup 2026-06: insomnia/eating — pliki to błędne kopie treści OCD/dep
  // (prawidłowa treść nie istnieje); karty direct-match -> placeholder
  "model-3p",
  "dziennik-snu",
  "typy-ed",
  "ruch-ed",
  // dedup 2026-06: karty bez trafnego handoutu (audyt dopasowania) -> placeholder
  "aa-stabilne-przymierze",
  "aa-utrwalenie-zmiany",
  "act-kontakt-ciekawosc",
  "adhd-case-bartek",
  "adhd-diffdiag",
  "affect-phobia-ha",
  "alc-case",
  "alc-leki-interakcje",
  "alc-umiejetnosci",
  "an-diffdiag",
  "an-ede-q",
  "att-anxious-diffdiag",
  "att-avoidant-diffdiag",
  "att-fearful-diffdiag",
  "badd-case",
  "badd-cel",
  "badd-diagnostyka",
  "badd-utrwalenie",
  "bd-depresja",
  "bipolar-case-jan",
  "bn-ede-q",
  "bp-farmako",
  "bp-leki",
  "bp-psychoedukacja",
  "bpd-utrwalenie-umiejetnosci",
  "burnout-case-agata",
  "cb-cbq",
  "cbti-digital",
  "dating-sad",
  "defuzja-dep",
  "dep-case-marta",
  "dep-diffdiag",
  "dep-hopelessness",
  "dep-ipt",
  "dep-mezczyzni",
  "dep-senior",
  "dep-trd",
  "diva5-adhd",
  "dzialanie-sad",
  "dziennik-pozytywow",
  "ekspozycja-pisemna-ptsd",
  "fizjologia-sad",
  "ha-case-kasia",
  "ins-model-3p",
  "itq-cptsd",
  "leki-adhd",
  "leki-panika",
  "mentalization-ha",
  "mot-bezr-case",
  "mot-bezr-gabinet",
  "mot-stpp-breakthrough",
  "mot-stpp-obrony",
  "mot-stpp-przeniesienie",
  "mot-stpp-somatyzacja",
  "mot-stpp-trojkat",
  "motywacja-aspd",
  "npd-utrwalenie-zmiany",
  "obraz-ciala",
  "ocd-case-piotr",
  "ocpd-utrwalenie-elastycznosci",
  "oddychanie-ptsd",
  "panika-case-ewa",
  "panika-diffdiag",
  "panika-vs-leki",
  "paq",
  "pcl5",
  "pg13-grief",
  "phobia-case-marek",
  "phobia-diffdiag",
  "plan-ptsd",
  "powrot-aktywnosci-grief",
  "ppu-scales",
  "proc-case",
  "prot-adhd",
  "prot-dep",
  "prot-gad",
  "prot-ha",
  "prot-ocd",
  "prot-panika",
  "prot-ptsd",
  "prot-sad",
  "ps-farmako",
  "psychosis-case-kamil",
  "ptsd-diffdiag",
  "ptsd-plan-rocznice",
  "rp-bezstronne-przymierze",
  "sad-be-survey",
  "sad-be-videofeedback",
  "sad-diffdiag",
  "samowspolczucie-grief",
  "schema-bezpieczne-przymierze",
  "schema-case-anna",
  "schema-fazy-terapii",
  "schema-sesja-protokol",
  "schema-smi",
  "schema-smi-interpretacja",
  "schema-st-grupowa",
  "schema-st-pary",
  "schema-st-trauma",
  "schema-ysq",
  "se-case",
  "se-cieple-przymierze",
  "se-diffdiag",
  "se-fsc-gilbert",
  "se-scs-neff",
  "self-disclosure",
  // labwork: karty ogólne/referencyjne (psychoedukacja, tabela zbiorcza,
  // interpretacja) NIE mają handoutu „lista badań" — bez wpisu fuzzy-resolver
  // przypisałby im błędnie arkusz innej karty (np. lab-dlaczego -> lab-poznawcze).
  "lab-dlaczego",
  "lab-tabela",
  "lab-interpretacja",
  "skala-narzedzi",
  "st-case",
  "st-ostry-vs-przewlekly",
  "stpp-case-ewa",
  "stpp-model-ha",
  "szacowanie-sad",
  "triangles-ha",
  "video-feedback",
  "wartosci-dep",
  "wartosci-sad",
  "wywiad-genogramowy",
  "zaabsorb-samoreg"
]);

const MANUAL_OVERRIDES = {
  // OCPD — nazwy plików nie odpowiadają treści (<title>); mapowanie po tytule HTML
  "czym-ocpd": { mod: "ocpd", file: "ocpd-relacje" },
  "podloze-ocpd": { mod: "ocpd", file: "delegowanie-ocpd" },
  "praca-zycie-ocpd": { mod: "ocpd", file: "ocpd-profilaktyka" },
  "sknerstwo-ocpd": { mod: "ocpd", file: "ocpd-a-ocd-terapia" },
  "perfekcjonizm-ocpd": { mod: "ocpd", file: "odpoczynek-ocpd" },
  "profilaktyka-ocpd": { mod: "ocpd", file: "perfekcjonizm-ocpd" },
  "ocpd-utrwalenie-elastycznosci": { mod: "ocpd", file: "krytyka-ocpd" },
  "prokrastynacja-ocpd": { mod: "ocpd", file: "ocpd-czym" },
  "decyzyjnosc-ocpd": { mod: "ocpd", file: "sztywnosc-ocpd" },
  "ocpd-a-ocd-terapia": { mod: "ocpd", file: "spontanicznosc-ocpd" },
  "sztywnosc-ocpd": { mod: "ocpd", file: "krytyka-ocpd" },
  "moralizm-ocpd": { mod: "ocpd", file: "ocpd-prokrastynacja" },
  "interpersonalne-ocpd": { mod: "ocpd", file: "imagery-ocpd" },
  "emocje-ocpd": { mod: "ocpd", file: "sknerstwo-ocpd" },
  "spontanicznosc-ocpd": { mod: "ocpd", file: "ocpd-vs-ocd" },
  "relacje-ocpd": { mod: "ocpd", file: "ocpd-sknerstwo" },
  "delegowanie-ocpd": { mod: "ocpd", file: "geneza-ocpd" },
  "skutecznosc-ocpd": { mod: "ocpd", file: "humor-ocpd" },
  "humor-ocpd": { mod: "ocpd", file: "ocpd-podloze" },
  "ocpd-vs-ocd": { mod: "ocpd", file: "decyzyjnosc-ocpd" },
  "schematy-ocpd": { mod: "ocpd", file: "moralizm-ocpd" },
  "odpoczynek-ocpd": { mod: "ocpd", file: "schematy-ocpd" },
  "czym-bdd": { mod: "bdd-dys", file: "bdd-czym-jest" },
  "dieta-dep": { mod: "dep", file: "jedzenie-nastroj" },
  "planowanie-aktywnosci": { mod: "dep", file: "ba-scheduling" },
  "monitorowanie-aktywnosci": { mod: "dep", file: "ba-monitoring" },
  "aktywnosci-przyjemne": { mod: "dep", file: "ba-pleasant" },
  "dep-be-mastery": { mod: "dep", file: "ba-mastery" },
  "znieksztalcenia-dep": { mod: "dep", file: "dep-znieksztalcenia" },
  "znieksztalcenia": { mod: "gad", file: "znieksztalcenia" },
  // dedup 2026-06: aliasy między-modułowe (alias-PDF usunięty, treść bajt-identyczna z kanonicznym)
  "halt-uz": { mod: "ppu", file: "ppu-halt" },
  "uzaleznienia-behaw": { mod: "adhd", file: "adhd-uzaleznienia" },
  "motywacja-aspd": { mod: "adhd", file: "adhd-motywacja" },
  "wstyd-avpd": { mod: "avpd", file: "16-wstyd" },
  "model-beck": { mod: "dep", file: "dep-model-beck" },
  "body-neutrality": { mod: "bn", file: "bn-body-neutrality" },
  "mezczyzni-ed": { mod: "bn", file: "bn-mezczyzni" },
  "wywiad-genogramowy": { mod: "bn", file: "bn-wywiad" },
  "mentalization-ha": { mod: "ppu", file: "ppu-mentalization" },
  "cykl-paniki": { mod: "panika", file: "pan-fizjologia" },
  "dating-sad": { mod: "ppu", file: "ppu-dating" },
  "model-clark": { mod: "sad", file: "sad-model-clark-wells" },
  "rejestr-mysli": { mod: "dep", file: "dziennik-mysli" },
  "dziennik-pozytywow": { mod: "dep", file: "wdziecznosc" },
  "adhd-grief-diagnosis": { mod: "adhd", file: "adhd-grief-diagnosis" },
  "prokrastynacja-adhd": { mod: "adhd", file: "adhd-prokrastynacja" },
  "eksperymenty-sad": { mod: "sad", file: "eksperyment-behawioralny" },
  "asertywnosc-sad": { mod: "sad", file: "sad-asertywnosc" },
  "szacowanie-sad": { mod: "sad", file: "teoria-a-b" },
  "obraz-siebie-sad": { mod: "sad", file: "sad-imagery-rescripting" },
  "umiejetnosci-społ": { mod: "sad", file: "rozmowa" },
  "fizjologia-sad": { mod: "sad", file: "antycypacja" },
  "sad-be-imperfect": { mod: "sad", file: "eksperyment-behawioralny" },
  "self-disclosure": { mod: "sad", file: "komplementy" },
  "workplace-sad": { mod: "sad", file: "wystapienia-publiczne" },
  "wartosci-sad": { mod: "sad", file: "teoria-a-b" },
  // dedup 2026-06: poprawki dopasowania handoutow (audyt per-karta)
  "add-be-urge-surf": { mod: "addiction", file: "uz-be-urge-surf" },
  "add-dual-model": { mod: "addiction", file: "uz-dual-model" },
  "add-dual-ptsd": { mod: "addiction", file: "uz-dual-ptsd" },
  "add-model-marlatt": { mod: "addiction", file: "uz-profilaktyka" },
  "adhd-kobieta2": { mod: "adhd", file: "hormony" },
  "avpd-diffdiag": { mod: "avpd", file: "10-vs-sad" },
  "bd-prodromy": { mod: "bipolar", file: "chad-sygnaly-ostrzegawcze" },
  "bo-sleep": { mod: "burnout", file: "bo-sen" },
  "bo-sygnaly": { mod: "burnout", file: "bo-fazy" },
  "bp-model-cykliczny": { mod: "bipolar", file: "chad-cykl-epizodu" },
  "bp-mood-chart": { mod: "bipolar", file: "chad-wykres-nastroju" },
  "burnout-diffdiag": { mod: "burnout", file: "bo-rozroznienie" },
  "cialo-avpd": { mod: "avpd", file: "17-cialo" },
  "cptsd-diffdiag": { mod: "cptsd", file: "roznice-ptsd-cptsd" },
  "cptsd-plan-kryzysy": { mod: "cptsd", file: "trojfazowy-plan" },
  "dep-be-beliefs": { mod: "dep", file: "be-wprowadzenie" },
  "dep-be-pleasure": { mod: "dep", file: "be-wprowadzenie" },
  "dep-neuro": { mod: "dep", file: "podloze-dep" },
  "derm-wpadka-dane": { mod: "derm", file: "derm-nawroty" },
  "eksperymenty-dep": { mod: "dep", file: "be-wprowadzenie" },
  "fb-be-inhibitory": { mod: "phobia", file: "be-inhibitory" },
  "fb-inhibitory": { mod: "phobia", file: "inhibitory" },
  "fb-protokol": { mod: "phobia", file: "protokol-ost" },
  "gad-be-worry-postpone": { mod: "gad", file: "odroczenie-martwienia" },
  "gad-model-wells": { mod: "gad", file: "model-martwienia" },
  "granice-burnout": { mod: "burnout", file: "bo-granice" },
  "grounding": { mod: "ptsd", file: "ugruntowanie-54321" },
  "ha-be-reassurance": { mod: "health_anx", file: "ha-kontrakt-rodzina" },
  "ha-be-theoryAB": { mod: "health_anx", file: "ha-teoria-a-vs-b" },
  "lapsy-relapsy": { mod: "addiction", file: "uz-lapsy-relapsy" },
  "mbi-skala": { mod: "burnout", file: "bo-mbi" },
  "mct-ha": { mod: "health_anx", file: "ha-detached-mindfulness" },
  "mi-techniki": { mod: "addiction", file: "uz-mi-techniki" },
  "mindfulness-sad": { mod: "sad", file: "att-trening-uwagi" },
  "model-adhd": { mod: "adhd", file: "adhd-model-barkley" },
  "modele-przetwarzania": { mod: "ptsd", file: "pamiec-traumatyczna" },
  "normalizacja-ptsd": { mod: "ptsd", file: "trzy-odpowiedzi" },
  "ocd-be-checking": { mod: "ocd", file: "be-sprawdzanie" },
  "odrzucaj-czym": { mod: "att-avoidant", file: "av-styl" },
  "odrzucaj-emocje": { mod: "att-avoidant", file: "av-odblokowanie" },
  "odrzucaj-relacje": { mod: "att-avoidant", file: "av-relacje" },
  "pary-npd": { mod: "npd", file: "20-pary" },
  "proc-utrwalenie": { mod: "procrast", file: "proc-nawroty" },
  "ps-art": { mod: "psychosis", file: "art" },
  "ps-samobojstwo": { mod: "psychosis", file: "samobojstwo" },
  "psy-cbtp": { mod: "psychosis", file: "cbtp" },
  "psy-czym": { mod: "psychosis", file: "psychosis-czym" },
  "psychoed-rodziny-ptsd": { mod: "ptsd", file: "ujawnianie-bliskim" },
  "relacje-npd": { mod: "npd", file: "19-relacje" },
  "rozwiazywanie-dep": { mod: "dep", file: "ruminacja" },
  "rytualy-pamieci": { mod: "grief", file: "rocznice-grief" },
  "samoobwinianie": { mod: "ptsd", file: "wstyd-i-wina" },
  "zazdrosc-npd": { mod: "npd", file: "11-zazdrosc" },
  // audyt 2026-06 print: weryfikacja per-karta + naprawa scramble
  "aa-mindful": { mod: "att-anxious", file: "aa-samoocena" },
  "imagery-ocpd": { mod: "ocpd", file: "skutecznosc-ocpd" },
  "plan-awaryjny-uz": { mod: "addiction", file: "uz-plan-awaryjny" },
  "ppu-diff": { mod: "ppu", file: "ppu-differential" },
  "rodzina-ha": { mod: "health_anx", file: "ha-kontrakt-rodzina" },
  "sabbatical-burnout": { mod: "burnout", file: "bo-sabbatical" },
  "zapewnienie-ha": { mod: "health_anx", file: "ha-kontrakt-rodzina" },
  // 2026-06: karty 'podłoże' bez przycisku druku — dodano przycisk + mapowanie
  "podloze-avpd": { mod: "avpd", file: "02-podloze" },
  "podloze-behav-add": { mod: "behav-add", file: "ub-25-podloze" },
  "podloze-gad": { mod: "gad", file: "gad-podloze-gad" },
  "podloze-npd": { mod: "npd", file: "02-podloze" },
  "podloze-panika": { mod: "panika", file: "pan-podloze" },
  "podloze-phobia": { mod: "phobia", file: "phobia-podloze" }
};

const STOP_WORDS = new Set([
  "jest",
  "modul",
  "module",
  "oraz",
  "the",
  "and",
  "for",
  "with",
  "lineart",
  "handout",
  "handoutow",
  "narzedzi",
  "terapeutycznych",
  "kompendium",
  "w",
  "i",
  "a",
  "do",
  "na",
  "z",
  "o"
]);

const TOKEN_SYNONYMS = {
  dieta: ["jedzenie", "odzywianie"],
  odzywianie: ["jedzenie", "dieta"],
  jedzenie: ["odzywianie", "dieta"],
  aktywnosci: ["aktywnosc", "scheduling", "pleasant", "mastery"],
  planowanie: ["scheduling", "plan", "tygodnia"],
  monitorowanie: ["monitoring", "monitor"],
  przyjemne: ["pleasant"],
  depresja: ["dep"],
  depresji: ["dep"],
  eksperymenty: ["eksperyment", "behawioralny"],
  eksperyment: ["eksperymenty", "behawioralny"],
  szacowanie: ["teoria", "prawdopodobienstwo"],
  asertywnosc: ["asertywnosci", "odmowa"],
  umiejetnosci: ["rozmowa", "konwersacyjne"],
  fizjologia: ["antycypacja", "objawy"],
  obraz: ["efekt", "reflektora"],
  siebie: ["reflektora", "efekt"]
};

const MODULE_MARKERS = {
  dep: ["depresj", "smutku", "beck", " ba ", " behaw"],
  adhd: ["adhd", "uwagi", "dopamin", "hiperfokus"],
  gad: ["gad", "martwien", "uogolnion"],
  ocd: ["ocd", "obsesj", "kompulsj"],
  ocpd: ["ocpd", "perfekcjonizm perfekcjonist", "sumiennosc"],
  bdd: ["bdd", "dysmorfo", "body dysmorphic"],
  psychosis: ["psychoz", "schizofren"],
  sad: ["sad", "lek spoleczny", "fobia spoleczna", "social anxiety"]
};

const QUESTIONNAIRE_RE =
  /(?:^|-)(wurs|asrs|diva|phq9|phq|bdi|gad7|gad|ocir|oci|ybocs|lsas|msi|npi|hai|epds|pswq|caars|pss|audit|dast|pcl|dass|nssi)(?:-|$)/i;

const MIN_TITLE_OVERLAP = 0.14;
const MIN_TITLE_OVERLAP_DIRECT = 0.1;

function parseHandoutIndex(source) {
  const marker = "window.HANDOUT_INDEX = ";
  const start = source.indexOf(marker);
  if (start === -1) return {};
  const jsonStart = start + marker.length;
  let depth = 0;
  for (let i = jsonStart; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (!depth) return eval("(" + source.slice(jsonStart, i + 1) + ")");
    }
  }
  return {};
}

function buildCardModuleMap(source) {
  const map = {};
  const tabRe =
    /<div class="tab-content"[^>]*id="tab-([^"]+)"[\s\S]*?(?=<div class="tab-content"|<button class="scroll-top")/g;
  for (const match of source.matchAll(tabRe)) {
    for (const cm of match[0].matchAll(/<details class="card" id="([^"]+)"/g)) {
      map[cm[1]] = match[1];
    }
  }
  return map;
}

function parseCardMeta(source) {
  const cards = {};
  const blockRegex = /<details class="card" id="([^"]+)"[\s\S]*?<\/details>/g;
  for (const match of source.matchAll(blockRegex)) {
    const block = match[0];
    const title = block.match(/<span class="nm">([^<]+)/)?.[1]?.trim() || match[1];
    const subtitle = block.match(/<span class="sub">([^<]+)/)?.[1]?.trim() || "";
    cards[match[1]] = { title, subtitle };
  }
  return cards;
}

function parseOpenHandoutIds(source) {
  const ids = new Set();
  for (const match of source.matchAll(/openHandout\(['"]([^'"]+)['"]\)/g)) {
    ids.add(match[1]);
  }
  return ids;
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

function significantWords(...parts) {
  const words = new Set();
  for (const part of parts) {
    for (const word of normalizeText(part).split(" ")) {
      if (word.length >= 4 && !STOP_WORDS.has(word)) words.add(word);
    }
  }
  return [...words];
}

function expandWord(word) {
  const set = new Set([word]);
  for (const synonym of TOKEN_SYNONYMS[word] || []) set.add(synonym);
  return [...set];
}

function isQuestionnaireId(id) {
  return QUESTIONNAIRE_RE.test(id);
}

function questionnaireToken(id) {
  const m = id.match(QUESTIONNAIRE_RE);
  return m ? m[1].toLowerCase().replace(/-/g, "") : "";
}

function fileMatchesQuestionnaire(id, basename) {
  if (!isQuestionnaireId(id)) return true;
  const token = questionnaireToken(id);
  const b = normalizeText(basename);
  if (b.includes(token)) return true;
  if (token === "phq9" && b.includes("phq")) return true;
  if (token === "gad7" && b.includes("gad")) return true;
  if (token === "ocir" && b.includes("oci")) return true;
  return false;
}

function titleWordOverlap(cardTitle, filePath, basename, cardSubtitle = "") {
  const words = significantWords(cardTitle, cardSubtitle);
  if (!words.length) return 0;
  const hay = normalizeText(
    [
      extractDisplayTitle(filePath),
      basename.replace(/-/g, " "),
      extractFileLabels(filePath, basename)
    ].join(" ")
  );
  let hit = 0;
  for (const word of words) {
    for (const variant of expandWord(word)) {
      if (hay.includes(variant)) {
        hit++;
        break;
      }
    }
  }
  return hit / words.length;
}

/** Overlap tylko po tytule/h1 pliku — bez nazwy pliku (ważne przy pomieszanych folderach OCPD). */
function displayTitleWordOverlap(cardTitle, filePath, cardSubtitle = "") {
  const words = significantWords(cardTitle, cardSubtitle);
  if (!words.length) return 0;
  const hay = extractDisplayTitle(filePath);
  if (!hay) return 0;
  let hit = 0;
  for (const word of words) {
    for (const variant of expandWord(word)) {
      if (hay.includes(variant)) {
        hit++;
        break;
      }
    }
  }
  return hit / words.length;
}

function basenameTitleDrift(filePath, basename) {
  const display = extractDisplayTitle(filePath);
  if (!display) return 1;
  const stemWords = significantWords(basename.replace(/-/g, " "));
  if (!stemWords.length) return 1;
  let hit = 0;
  for (const word of stemWords) {
    for (const variant of expandWord(word)) {
      if (display.includes(variant)) {
        hit++;
        break;
      }
    }
  }
  return hit / stemWords.length;
}

function pickBestTitleMatch(meta, files) {
  let best = null;
  let bestOverlap = 0;
  for (const [basename, filePath] of files) {
    const overlap = displayTitleWordOverlap(meta.title, filePath, meta.subtitle);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = basename;
    }
  }
  if (best && bestOverlap >= MIN_TITLE_OVERLAP) {
    return { file: best, overlap: bestOverlap };
  }
  return null;
}

function extractDisplayTitle(filePath) {
  const html = fs.readFileSync(filePath, "utf8");
  const title = html.match(/<title>([^<]+)/i)?.[1]?.trim() || "";
  const h1 =
    html
      .match(/<h1[^>]*class="hdr-title"[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
      ?.replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "";
  return normalizeText([title, h1].join(" "));
}

function titleAlignmentPenalty(cardTitle, fileDisplayTitle) {
  const cardNorm = normalizeText(cardTitle);
  let penalty = 0;

  if (cardNorm.includes("zniekszta") && !fileDisplayTitle.includes("zniekszta")) {
    penalty += 40;
  }
  if (fileDisplayTitle.includes("model poznaw") && !cardNorm.includes("model")) {
    penalty += 45;
  }
  if (fileDisplayTitle.includes("diagram") && !cardNorm.includes("diagram")) {
    penalty += 30;
  }
  if (cardNorm.includes("trauma") && !/(trauma|ptsd|ace|cptsd)/.test(fileDisplayTitle)) {
    penalty += 90;
  }
  if (cardNorm.includes("trauma") && /(kreatywn|dywergent|pomysl)/.test(fileDisplayTitle)) {
    penalty += 90;
  }

  return penalty;
}

function extractFileLabels(filePath, basename) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") {
    const html = fs.readFileSync(filePath, "utf8");
    const title = html.match(/<title>([^<]+)/i)?.[1]?.trim() || "";
    const h1 =
      html
        .match(/<h1[^>]*class="hdr-title"[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
        ?.replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim() || "";
    const eyebrow = html.match(/class="eyebrow"[^>]*>([^<]+)/i)?.[1]?.trim() || "";
    const bodySnippet = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1200);
    return normalizeText([basename, title, h1, eyebrow, bodySnippet].join(" "));
  }

  return normalizeText(basename.replace(/-/g, " "));
}

function modulePenalty(mod, searchText, cardTitle) {
  const markers = MODULE_MARKERS[mod.split("-")[0]] || MODULE_MARKERS[mod] || [];
  const cardNorm = normalizeText(cardTitle);
  let penalty = 0;

  for (const [otherMod, otherMarkers] of Object.entries(MODULE_MARKERS)) {
    if (otherMod === mod || otherMod === mod.split("-")[0]) continue;
    for (const marker of otherMarkers) {
      if (searchText.includes(marker.trim()) && !cardNorm.includes(otherMod)) {
        penalty += 40;
      }
    }
  }

  if (mod === "dep" && searchText.includes("adhd") && !cardNorm.includes("adhd")) {
    penalty += 60;
  }
  if (mod === "ocd" && searchText.includes("ocpd") && !cardNorm.includes("ocpd")) {
    penalty += 80;
  }
  if (mod === "ocpd" && searchText.includes(" ocd") && !cardNorm.includes("ocd")) {
    penalty += 40;
  }

  return penalty;
}

function directIdCandidates(id, mod) {
  const candidates = new Set();
  const push = (value) => {
    if (!value) return;
    candidates.add(value);
    candidates.add(
      value
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
    );
  };

  push(id);
  push(`${mod}-${id}`);

  if (id.startsWith(`${mod}-`)) {
    push(id.slice(mod.length + 1));
  }

  if (id.endsWith(`-${mod}`)) {
    const stem = id.slice(0, -(mod.length + 1));
    push(stem);
    push(`${mod}-${stem}`);
  }

  return [...candidates].filter(Boolean);
}

function pickDirectFile(id, mod, files) {
  for (const candidate of directIdCandidates(id, mod)) {
    if (files.has(candidate)) return candidate;
  }
  return null;
}

function idBasenameBonus(id, mod, basename) {
  let bonus = 0;
  if (basename === id) bonus += 25;
  if (basename === `${mod}-${id}`) bonus += 20;

  if (id.endsWith(`-${mod}`)) {
    const stem = id.slice(0, -(mod.length + 1));
    if (basename === stem || basename === `${mod}-${stem}`) bonus += 35;
  }

  if (id.startsWith(`${mod}-`)) {
    const stem = id.slice(mod.length + 1);
    if (basename === stem) bonus += 25;
  }

  return bonus;
}

function scoreCandidate(id, mod, basename, searchText, cardTitle, cardSubtitle, fileDisplayTitle) {
  const words = significantWords(cardTitle, cardSubtitle);
  if (words.length === 0) return -1;

  let matched = 0;
  for (const word of words) {
    for (const variant of expandWord(word)) {
      if (searchText.includes(variant)) {
        matched += 1;
        break;
      }
    }
  }

  let score = matched * 20;
  const matchRatio = matched / words.length;

  if (basename === id) score += 15;
  if (matchRatio >= 0.5) score += 10;
  if (matchRatio < 0.34) score -= 30;

  score -= modulePenalty(mod, searchText, cardTitle);
  score -= titleAlignmentPenalty(cardTitle, fileDisplayTitle);
  score += idBasenameBonus(id, mod, basename);

  return score;
}

function listModuleFiles(modDir) {
  const files = new Map();
  for (const file of fs.readdirSync(modDir)) {
    if (!/\.(html|pdf)$/i.test(file)) continue;
    const basename = file.replace(/\.(html|pdf)$/i, "");
    if (!files.has(basename)) files.set(basename, path.join(modDir, file));
  }
  return files;
}

function pickPreferredExt(modDir, basename) {
  const pdf = path.join(modDir, `${basename}.pdf`);
  const html = path.join(modDir, `${basename}.html`);
  // HTML-first: treść jest identyczna z PDF, a HTML jest ~7× lżejszy (mniejszy
  // transfer). PDF tylko jako fallback dla materiałów bez wersji HTML.
  if (fs.existsSync(html)) return "html";
  if (fs.existsSync(pdf)) return "pdf";
  return null;
}

const source = fs.readFileSync(kompendiumPath, "utf8");
const handoutIndex = parseHandoutIndex(source);
const cardModuleMap = buildCardModuleMap(source);
const cardMeta = parseCardMeta(source);
const openIds = parseOpenHandoutIds(source);

const resolver = {};
const unresolved = [];
const suspicious = [];

// Cache etykiet plików (globalne wyszukiwanie czyta każdy plik raz)
const labelCache = new Map();
function labelsFor(filePath, basename) {
  let entry = labelCache.get(filePath);
  if (!entry) {
    entry = {
      searchText: extractFileLabels(filePath, basename),
      displayTitle: extractDisplayTitle(filePath)
    };
    labelCache.set(filePath, entry);
  }
  return entry;
}

// Wszystkie moduły → pliki (globalny fallback po dokładnej nazwie)
const allModules = new Map();
for (const m of fs.readdirSync(printRoot)) {
  const dir = path.join(printRoot, m);
  if (!fs.statSync(dir).isDirectory()) continue;
  allModules.set(m, listModuleFiles(dir));
}

// Cross-module TYLKO exact (nazwa pliku = id) lub manual — fuzzy cross-module
// dawał błędne klinicznie dopasowania (czym-ocpd→ocd, zo-farmako→cptsd).
function tryGlobalExact(id, meta, excludeMod) {
  const hits = [];
  for (const [omod, files] of allModules) {
    if (omod === excludeMod) continue;
    if (files.has(id)) hits.push(omod);
  }
  if (!hits.length) return null;
  let chosen = hits[0];
  if (hits.length > 1) {
    let bs = -Infinity;
    for (const omod of hits) {
      const { searchText, displayTitle } = labelsFor(allModules.get(omod).get(id), id);
      const s = scoreCandidate(id, omod, id, searchText, meta.title, meta.subtitle, displayTitle);
      if (s > bs) { bs = s; chosen = omod; }
    }
  }
  const ext = pickPreferredExt(path.join(printRoot, chosen), id);
  return ext ? { mod: chosen, file: id, ext, score: 900, cross: true } : null;
}

for (const id of openIds) {
  if (SKIP_PRINT_IDS.has(id)) {
    unresolved.push({ id, reason: "skip-print" });
    continue;
  }

  // Manual override obowiązuje zawsze (także cross-module i bez modułu w indeksie)
  const manual = MANUAL_OVERRIDES[id];
  if (manual) {
    const ext =
      manual.ext ||
      pickPreferredExt(path.join(printRoot, manual.mod), manual.file);
    if (ext) {
      resolver[id] = { mod: manual.mod, file: manual.file, ext, score: 999, manual: true };
      continue;
    }
  }

  const mod = handoutIndex[id] || cardModuleMap[id];
  const meta = cardMeta[id] || { title: id, subtitle: "" };

  if (!mod) {
    const g = tryGlobalExact(id, meta, null);
    if (g) {
      suspicious.push({ id, mod: g.mod, file: g.file, title: meta.title, score: g.score, cross: true });
      resolver[id] = g;
    } else {
      unresolved.push({ id, reason: "no-module" });
    }
    continue;
  }

  const modDir = path.join(printRoot, mod);
  if (!fs.existsSync(modDir)) {
    const g = tryGlobalExact(id, meta, mod);
    if (g) {
      suspicious.push({ id, mod: g.mod, file: g.file, title: meta.title, score: g.score, cross: true });
      resolver[id] = g;
    } else {
      unresolved.push({ id, mod, reason: "missing-module-dir" });
    }
    continue;
  }

  const files = listModuleFiles(modDir);

  const direct = pickDirectFile(id, mod, files);
  if (direct) {
    const filePath = files.get(direct);
    const overlap = titleWordOverlap(meta.title, filePath, direct, meta.subtitle);
    const displayOverlap = displayTitleWordOverlap(meta.title, filePath, meta.subtitle);
    const exactId = direct === id || direct === `${mod}-${id}`;
    const drift = basenameTitleDrift(filePath, direct);
    const driftOk = drift >= 0.34;
    if (
      fileMatchesQuestionnaire(id, direct) &&
      displayOverlap >= MIN_TITLE_OVERLAP_DIRECT &&
      (driftOk || !exactId || overlap >= MIN_TITLE_OVERLAP)
    ) {
      const ext = pickPreferredExt(modDir, direct);
      if (ext) {
        resolver[id] = { mod, file: direct, ext, score: Math.round(overlap * 100), direct: true };
        continue;
      }
    }
  }

  const titleHit = pickBestTitleMatch(meta, files);
  if (
    titleHit &&
    fileMatchesQuestionnaire(id, titleHit.file) &&
    titleHit.overlap >= MIN_TITLE_OVERLAP
  ) {
    const ext = pickPreferredExt(modDir, titleHit.file);
    if (ext) {
      const score = Math.round(titleHit.overlap * 100);
      if (titleHit.file !== id) {
        suspicious.push({ id, mod, file: titleHit.file, title: meta.title, score, titleMatch: true });
      }
      resolver[id] = { mod, file: titleHit.file, ext, score, titleMatch: true };
      continue;
    }
  }

  let best = null;
  let bestScore = -1;

  for (const [basename, filePath] of files) {
    if (!fileMatchesQuestionnaire(id, basename)) continue;
    const { searchText, displayTitle } = labelsFor(filePath, basename);
    const score = scoreCandidate(
      id, mod, basename, searchText, meta.title, meta.subtitle, displayTitle
    );
    const overlap = titleWordOverlap(meta.title, filePath, basename, meta.subtitle);
    if (score > bestScore && overlap >= MIN_TITLE_OVERLAP) {
      bestScore = score;
      best = basename;
    }
  }

  if (!best || bestScore < 20) {
    const g = tryGlobalExact(id, meta, mod);
    if (g) {
      suspicious.push({ id, mod: g.mod, file: g.file, title: meta.title, score: g.score, cross: true });
      resolver[id] = g;
      continue;
    }
    unresolved.push({ id, mod, title: meta.title, bestScore });
    continue;
  }

  const ext = pickPreferredExt(modDir, best);
  if (!ext) {
    unresolved.push({ id, mod, title: meta.title, reason: "no-file-ext" });
    continue;
  }

  if (best !== id) {
    suspicious.push({ id, mod, file: best, title: meta.title, score: bestScore });
  }

  resolver[id] = { mod, file: best, ext, score: bestScore };
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      mapped: Object.keys(resolver).length,
      unresolved: unresolved.length,
      skip: [...SKIP_PRINT_IDS].sort(),
      resolver
    },
    null,
    2
  )
);

console.log("Mapped:", Object.keys(resolver).length + "/" + openIds.size);
console.log("Unresolved:", unresolved.length);
console.log("Renamed mappings:", suspicious.length);
console.log("Written:", outPath);

if (unresolved.length) {
  console.log("\nFirst unresolved:");
  for (const item of unresolved.slice(0, 20)) {
    console.log(`  - ${item.id} (${item.mod}) "${item.title || ""}" score=${item.bestScore ?? "?"}`);
  }
}

const checkIds = [
  "planowanie-aktywnosci",
  "dieta-dep",
  "czym-bdd",
  "monitorowanie-aktywnosci",
  "znieksztalcenia-dep"
];
console.log("\nSpot checks:");
for (const id of checkIds) {
  const hit = resolver[id];
  console.log(`  ${id} ->`, hit ? `${hit.mod}/${hit.file}.${hit.ext} (${hit.score})` : "MISSING");
}

function buildFileIndexFromDir(rootDir, { skipUnderscore = false, extensions = [".html"] } = {}) {
  const index = {};
  if (!fs.existsSync(rootDir)) return index;

  for (const mod of fs.readdirSync(rootDir)) {
    const modDir = path.join(rootDir, mod);
    if (!fs.statSync(modDir).isDirectory()) continue;

    for (const file of fs.readdirSync(modDir)) {
      if (skipUnderscore && file.startsWith("_")) continue;
      const ext = path.extname(file);
      if (!extensions.includes(ext)) continue;
      index[file.slice(0, -ext.length)] = mod;
    }
  }

  return index;
}

const handoutIndexPath = path.join(root, "public/handouts/handout-file-index.json");
const handoutFileIndex = buildFileIndexFromDir(printRoot, {
  skipUnderscore: true,
  extensions: [".html", ".pdf"]
});
fs.writeFileSync(
  handoutIndexPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      count: Object.keys(handoutFileIndex).length,
      index: handoutFileIndex
    },
    null,
    2
  )
);
console.log("\nHandout file index:", Object.keys(handoutFileIndex).length, "entries");
console.log("Written:", handoutIndexPath);

const sosRoot = path.join(root, "public/sos");
const sosIndexPath = path.join(root, "public/sos/sos-file-index.json");
const sosFileIndex = buildFileIndexFromDir(sosRoot, { extensions: [".html"] });
fs.writeFileSync(
  sosIndexPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      count: Object.keys(sosFileIndex).length,
      index: sosFileIndex
    },
    null,
    2
  )
);
console.log("SOS file index:", Object.keys(sosFileIndex).length, "entries");
console.log("Written:", sosIndexPath);
