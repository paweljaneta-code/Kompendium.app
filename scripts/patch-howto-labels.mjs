import fs from "node:fs";

const LABELS = {
  dep: "depresją",
  "inne-zo": "innymi ZO",
  schema: "schematami",
  stpp: "STPP",
  systemowa: "terapią systemową",
  "att-teoria": "teorią przywiązania",
  "att-anxious": "stylem lękowo-ambiwalentnym",
  "att-avoidant": "stylem unikającym",
  "att-fearful": "stylem zdezorganizowanym",
  relaks: "technikami relaksacyjnymi",
  ruch: "aktywnością fizyczną",
  hobby: "zainteresowaniami",
  panika: "paniką",
  audhd: "AuDHD",
  eating: "zaburzeniami odżywiania",
  derm: "dermatillomanią",
  addiction: "uzależnieniami",
  alcohol: "alkoholem",
  drugs: "narkotykami i lekami",
  "behav-add": "uzależnieniami behawioralnymi",
  psu: "PSU",
  codep: "współuzależnieniem",
  health_anx: "lękiem zdrowotnym",
  phobia: "fobią specyficzną",
  grief: "żałobą",
  dissoc: "zaburzeniami dysocjacyjnymi",
  burnout: "wypaleniem zawodowym",
  bipolar: "zaburzeniem dwubiegunowym",
  psychosis: "zaburzeniami psychotycznymi",
  anger: "złością",
  decisions: "trudnymi wyborami",
  selfcomp: "samooceną",
  procrast: "prokrastynacją",
  mindful: "mindfulness",
  interpers: "umiejętnościami interpersonalnymi",
  shame: "wstydem",
  couples: "relacjami partnerskimi",
  caregivers: "bliskimi pacjenta",
  transitions: "zmianami życiowymi",
  stress: "stresem przewlekłym",
  alliance: "przymierzem terapeutycznym",
  documents: "dokumentacją kliniczną",
  ethics: "prawem i etyką",
  suicide: "ryzykiem samobójczym",
  resilience: "rezyliencją",
  habits: "nawykami",
  supervision: "superwizją",
  labwork: "badaniami laboratoryjnymi",
  group: "terapią grupową",
  budget: "budżetem",
  hejt: "hejtem",
  emotions: "emocjami",
  social: "social media",
  meaning: "poczuciem sensu",
  crisis: "interwencją kryzysową",
  aging: "starzeniem się",
  sexology: "seksuologią",
  wellbeing: "samopoczuciem",
  "therapy-diff": "trudnymi sytuacjami w terapii",
  development: "psychologią rozwoju",
  interview: "wywiadem klinicznym",
  genogram: "genogramem",
  "empathy-comm": "NVC",
  motivation: "MI",
  mi: "MI"
};

const EXTRA_TITLES = {
  "Komunikacja empatyczna": "NVC",
  "Motywacja i zmiana": "MI",
  "Dialog motywujący": "MI"
};

let html = fs.readFileSync("kompendium.html", "utf8");
let buttonPatched = 0;
const tabStartsInitial = [...html.matchAll(/id="tab-([^"]+)"/g)].map((m) => ({
  slug: m[1],
  index: m.index
}));

for (let i = 0; i < tabStartsInitial.length; i++) {
  const { slug, index } = tabStartsInitial[i];
  const label = LABELS[slug];
  if (!label) continue;

  const end =
    i + 1 < tabStartsInitial.length ? tabStartsInitial[i + 1].index : html.length;
  const chunk = html.slice(index, end);
  if (!chunk.includes("<span>Jak pracować z modułem</span>")) continue;

  const newChunk = chunk.replace(
    "<span>Jak pracować z modułem</span>",
    `<span>Jak pracować z ${label}</span>`
  );
  html = html.slice(0, index) + newChunk + html.slice(end);

  const delta = newChunk.length - chunk.length;
  for (let j = i + 1; j < tabStartsInitial.length; j++) {
    tabStartsInitial[j].index += delta;
  }
  buttonPatched++;
}

const tabStarts = [...html.matchAll(/id="tab-([^"]+)"/g)].map((m) => ({
  slug: m[1],
  index: m.index
}));

const titleToLabel = new Map();

for (let i = 0; i < tabStarts.length; i++) {
  const { slug, index } = tabStarts[i];
  const end = i + 1 < tabStarts.length ? tabStarts[i + 1].index : html.length;
  const chunk = html.slice(index, end);
  const title = chunk.match(/<h2>([^<]+)<\/h2>/)?.[1]?.trim();
  const btn = chunk.match(
    /gad-howto-cta[\s\S]*?<span>(Jak pracować z [^<]+)<\/span>/
  )?.[1];
  if (title && btn) {
    titleToLabel.set(title, btn.replace(/^Jak pracować z /, ""));
  } else if (title && EXTRA_TITLES[title]) {
    titleToLabel.set(title, EXTRA_TITLES[title]);
  } else if (title && LABELS[slug]) {
    titleToLabel.set(title, LABELS[slug]);
  }
}

let heroPatched = 0;
html = html.replace(
  /<h1>Jak pracować z modułem „([^”]+)”<\/h1>/g,
  (match, title) => {
  const label = titleToLabel.get(title);
  if (!label) return match;
  heroPatched++;
  return `<h1>Jak pracować z ${label}</h1>`;
});

fs.writeFileSync("kompendium.html", html, "utf8");

const remainingButtons = [
  ...html.matchAll(/gad-howto-cta[\s\S]{0,120}?<span>(Jak pracować z modułem)<\/span>/g)
].length;
const remainingHero = (html.match(/Jak pracować z modułem/g) || []).length;

console.log(`Buttons patched: ${buttonPatched}`);
console.log(`Hero h1 patched: ${heroPatched}`);
console.log(`Remaining generic buttons: ${remainingButtons}`);
console.log(`Remaining 'modułem' total: ${remainingHero}`);
