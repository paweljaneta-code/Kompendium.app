// Podział modułu "Procesy transdiagnostyczne" (tab-transdiag) na osobne moduły
// per proces (perfekcjonizm, ruminacja, …) — transformacja w czasie ładowania,
// BEZ edycji monolitu kompendium.html. Karty mają już data-topic, więc moduł
// jest partycjonowany po tym atrybucie. Nowa kategoria "Procesy
// transdiagnostyczne" trafia do sekcji "Podejścia i narzędzia" (między
// "Podejścia terapeutyczne" a "Emocje i ciało"). Każdy nowy moduł dostaje
// przycisk 📘 "Jak pracować z…" w nagłówku (poradnik z public/howto/transdiag/).
//
// Linki w poradnikach (data-go) bywają międzymodułowe (np. poradnik ruminacji →
// karta z modułu aktywacji). Most kart (KOMPENDIUM_CARD_OPEN_BRIDGE_SCRIPT)
// używa window.TD_CARD_MODULE do nawigacji między stronami modułów.
import { EXTRA_CONTENT } from "./extraContent";

type ModuleLike = { slug: string; title: string; subtitle: string; html: string };

type CacheLike = {
  style: string;
  homeScreen: string;
  moduleSearchData: string;
  moduleNames: string;
  moduleColors: string;
  modules: ModuleLike[];
  transdiagCardModule?: Record<string, string>;
};

type TopicDef = {
  topic: string; // wartość data-topic na kartach
  name: string; // nazwa modułu / przycisku
  color: string; // akcent (z pip pigułek)
  desc: string; // opis na kafelku strony głównej
  keywords: string;
};

// Kolejność = filary kliniczne (jak pigułki w oryginalnym module).
// Kolory z pip pigułek transdiag. "intro" (2 karty) scalone z "protokoly".
export const TRANSDIAG_TOPICS: TopicDef[] = [
  { topic: "perfekcjonizm", name: "Perfekcjonizm", color: "#3c5ba7", desc: "Wygórowane standardy, samokrytyka i „wszystko albo nic” — proces wspólny dla wielu zaburzeń.", keywords: "perfekcjonizm standardy samokrytyka cpq fmps clinical perfectionism" },
  { topic: "niepewnosc", name: "Nietolerancja niepewności", color: "#5a4b97", desc: "„Muszę wiedzieć na pewno” — martwienie, nadmierne sprawdzanie, poszukiwanie gwarancji.", keywords: "nietolerancja niepewnosci intolerance uncertainty ius martwienie dugas" },
  { topic: "ruminacja", name: "Ruminacja (RNT)", color: "#6b3a87", desc: "Powtarzające się rozpamiętywanie i zamartwianie — pętla myśli, która nie prowadzi do rozwiązania.", keywords: "ruminacja rnt rozpamietywanie zamartwianie rfcbt watkins ptq rrs" },
  { topic: "wrazliwosc-lekowa", name: "Wrażliwość lękowa", color: "#8a3a87", desc: "Strach przed objawami lęku — „te doznania z ciała są niebezpieczne”.", keywords: "wrazliwosc lekowa anxiety sensitivity asi interocepcja reiss mcnally" },
  { topic: "samoocena", name: "Niska samoocena", color: "#a0357a", desc: "Rdzenne „jestem niewystarczający” i zachowania, które to przekonanie podtrzymują.", keywords: "niska samoocena low self-esteem fennell rses przekonanie kluczowe" },
  { topic: "unikanie", name: "Unikanie doświadczeniowe", color: "#b5612a", desc: "Ucieczka od trudnych myśli, emocji i doznań — kosztem życia zgodnego z wartościami.", keywords: "unikanie doswiadczeniowe experiential avoidance aaq hayes act" },
  { topic: "regulacja-emocji", name: "Regulacja emocji", color: "#8a5a2a", desc: "Rozpoznawanie, nazywanie i modulowanie emocji — fundament wielu protokołów transdiagnostycznych.", keywords: "regulacja emocji emotion regulation ders gross up barlow fala" },
  { topic: "zachowania-zabezpieczajace", name: "Zachowania zabezpieczające", color: "#3a7a3a", desc: "„Na wszelki wypadek” — subtelne uniki i rytuały, które podtrzymują lęk.", keywords: "zachowania zabezpieczajace safety behaviors salkovskis sprawdzanie zapewnienie" },
  { topic: "ekspozycja", name: "Ekspozycja", color: "#c83a3a", desc: "Uczenie hamujące — konfrontacja z lękiem zamiast ucieczki; serce wielu protokołów.", keywords: "ekspozycja exposure inhibitory learning craske foa hierarchia" },
  { topic: "imagery-rescripting", name: "Przepisywanie obrazów (ImRs)", color: "#b03a5a", desc: "Praca z natrętnymi obrazami i wspomnieniami — zmiana ich emocjonalnego znaczenia.", keywords: "przepisywanie obrazow imagery rescripting arntz irt flashforward most afektywny" },
  { topic: "aktywacja-behawioralna", name: "Aktywacja behawioralna", color: "#d56a2a", desc: "Działanie wyprzedza chęć — odbudowa kontaktu z nagradzającym, wartościowym życiem.", keywords: "aktywacja behawioralna behavioral activation jacobson martell trap trac cobra" },
  { topic: "restrukturyzacja", name: "Restrukturyzacja poznawcza", color: "#a02a5a", desc: "Identyfikacja i testowanie myśli — od automatów do przekonań rdzennych.", keywords: "restrukturyzacja poznawcza cognitive restructuring zapis mysli strzalka w dol abc" },
  { topic: "mct", name: "Metakognicje (MCT)", color: "#2a6a8a", desc: "Praca z przekonaniami o myśleniu i stylem uwagi — model S-REF Wellsa, ATT, DM.", keywords: "metakognicje mct wells s-ref cas att detached mindfulness mcq" },
  { topic: "defuzja-atencja", name: "Defuzja i uwaga", color: "#2a8a8a", desc: "Dystans do myśli i elastyczna uwaga — „myśl to nie rozkaz i nie fakt”.", keywords: "defuzja atencja defusion act taf trening uwagi fuzja poznawcza" },
  { topic: "samokrytycyzm", name: "Samokrytycyzm", color: "#8a6a2a", desc: "Surowy wewnętrzny krytyk — eksternalizacja głosu i budowanie współczującego self.", keywords: "samokrytycyzm self-criticism gilbert cft fscrs dwa krzesla krytyk" },
  { topic: "wstyd-wspolczucie", name: "Wstyd i samowspółczucie", color: "#a0852a", desc: "Od toksycznego wstydu do samowspółczucia — CFT Gilberta, model Neff.", keywords: "wstyd samowspolczucie shame self-compassion neff gilbert tangney scs tosca" },
  { topic: "protokoly", name: "Protokoły zunifikowane", color: "#555555", desc: "UP, ERT, CETA, MATCH — i wprowadzenie do całego podejścia transdiagnostycznego.", keywords: "protokoly zunifikowane unified protocol up ert ceta match transdiagnostyczne wprowadzenie" },
];

const TD_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true"><circle cx="5.5" cy="5.5" r="1.5"/><circle cx="18.5" cy="5.5" r="1.5"/><circle cx="18.5" cy="18.5" r="1.5"/><circle cx="8.5" cy="15.5" r="4.5"/><path d="M5.931 6.936l1.275 4.249m5.607 5.609l4.251 1.275"/><path d="M11.683 12.317l5.759 -5.759"/></svg>';
const TD_ICON_24 = TD_ICON.replace('width="20" height="20"', 'width="24" height="24"');

function esc(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
// dla łańcucha w JS wewnątrz onclick="...('X')"
function escJs(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/'/g, "\\u0027").replace(/"/g, "&quot;");
}

function slugFor(topic: string): string {
  return "td-" + topic;
}

// Koniec <details class="card"> od startIdx — z licznikiem zagnieżdżeń
// (karty zawierają zagnieżdżone <details class="card-section">).
function findCardEnd(html: string, startIdx: number): number {
  const re = /<details\b|<\/details>/g;
  re.lastIndex = startIdx;
  let depth = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[0] === "<details") depth += 1;
    else {
      depth -= 1;
      if (depth === 0) return m.index + "</details>".length;
    }
  }
  return -1;
}

type CardBlock = { id: string; topic: string; html: string };

function extractCards(moduleHtml: string): CardBlock[] {
  const out: CardBlock[] = [];
  const re = /<details class="card" id="([^"]+)"([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(moduleHtml))) {
    const start = m.index;
    const end = findCardEnd(moduleHtml, start);
    if (end === -1) continue;
    const topicMatch = m[2].match(/data-topic="([^"]+)"/);
    out.push({
      id: m[1],
      topic: topicMatch ? topicMatch[1] : "",
      html: moduleHtml.slice(start, end)
    });
    re.lastIndex = end;
  }
  return out;
}

function howtoFor(topic: string): { file: string; label: string } | null {
  const idx = EXTRA_CONTENT.howto?.transdiag as
    | Record<string, { file: string; label: string }>
    | undefined;
  return idx && idx[topic] ? idx[topic] : null;
}

function plural(n: number): string {
  if (n === 1) return "narzędzie";
  const d = n % 10;
  const h = n % 100;
  return d >= 2 && d <= 4 && (h < 10 || h >= 20) ? "narzędzia" : "narzędzi";
}

function buildModuleHtml(def: TopicDef, cardsHtml: string, count: number): string {
  const slug = slugFor(def.topic);
  const howto = howtoFor(def.topic);
  const cta = howto
    ? `<div class="gad-feat-cta"><button class="gad-howto-cta" onclick="openHowtoFullscreen('${escJs(howto.file)}','${escJs(howto.label)}')"><span class="ghc-emoji" aria-hidden="true">📘</span><span>${esc(howto.label)}</span></button><div class="gad-feat-note">Krok po kroku: fazy pracy, kolejność wprowadzania narzędzi i najczęstsze pułapki kliniczne.</div></div>`
    : "";
  // Klasa "active" dodana wprost: wrapper getOriginalModuleDocument aktywuje
  // moduł zamianą class="tab-content" → "tab-content active", ale nasza klasa
  // ma sufiks " td-split", więc dokładne dopasowanie by nie trafiło i moduł
  // zostałby display:none. "td-split" jest ancestrem kart dla re-scope'owanego CSS.
  return `<div class="tab-content active td-split" id="tab-${slug}">
<span class="tab-subtitle" style="display:none">${esc(def.desc)}</span>
<div class="mod-header mod-header--gad-feat" style="--accent-mod:${def.color}"><div class="mod-header-icon">${TD_ICON_24}</div><div class="mod-header-text"><h2>${esc(def.name)}</h2><div class="mod-header-meta">${count} ${plural(count)} · proces transdiagnostyczny</div></div>${cta}</div>
<div class="library-view" id="library-view-${slug}" style="--accent-mod:${def.color}"><div class="lib-layout"><div class="lib-content"><div class="main">
<div class="pills"><span class="pill active" data-filter="all">Wszystkie (${count})</span></div>
<div class="search-wrap"><span class="si">&#128269;</span><input type="text" placeholder="Szukaj narzędzia…"></div><div class="count">Wyświetlono: ${count} z ${count} ${plural(count)}</div><div class="cards-wrap">
${cardsHtml}
</div></div></div></div></div>
</div>`;
}

function buildHomeButton(def: TopicDef): string {
  const slug = slugFor(def.topic);
  return `<button class="home-btn" data-tab="${slug}" style="--btn-color:${def.color}"><span class="card-icon">${TD_ICON}</span><span class="home-btn-name">${esc(def.name)}</span><span class="home-btn-desc">${esc(def.desc)}</span></button>`;
}

// Usuwa <button ...data-tab="transdiag"...>...</button> z homeScreen.
function removeTransdiagButton(home: string): string {
  const anchor = home.indexOf('data-tab="transdiag"');
  if (anchor === -1) return home;
  const start = home.lastIndexOf("<button", anchor);
  if (start === -1) return home;
  const end = home.indexOf("</button>", anchor);
  if (end === -1) return home;
  return home.slice(0, start) + home.slice(end + "</button>".length);
}

// Usuwa wpis "key:{...}" (obiekt) lub key:"..." (string) z literału JS.
function removeJsKey(raw: string, key: string): string {
  const re = new RegExp(',?\\s*"?' + key.replace(/[-]/g, "\\$&") + '"?\\s*:');
  const m = raw.match(re);
  if (!m || m.index === undefined) return raw;
  let i = raw.indexOf(":", m.index) + 1;
  while (i < raw.length && /\s/.test(raw[i])) i++;
  let end = i;
  if (raw[i] === "{") {
    let depth = 0;
    for (; end < raw.length; end++) {
      if (raw[end] === "{") depth++;
      else if (raw[end] === "}") {
        depth--;
        if (depth === 0) {
          end++;
          break;
        }
      }
    }
  } else if (raw[i] === '"') {
    end = raw.indexOf('"', i + 1) + 1;
  } else {
    while (end < raw.length && raw[end] !== "," && raw[end] !== "}") end++;
  }
  // pochłoń poprzedzający przecinek (m[0] zaczyna się od opcjonalnego ',')
  const cut = raw.slice(m.index, end);
  let result = raw.replace(cut, "");
  // jeśli usunięto pierwszy wpis (był wiodący '{,'), napraw '{,'
  result = result.replace(/\{\s*,/, "{");
  return result;
}

function appendJsKey(raw: string, entry: string): string {
  const end = raw.lastIndexOf("}");
  if (end === -1) return raw;
  const body = raw.slice(0, end).trimEnd();
  const needsComma = !body.endsWith("{") && !body.endsWith(",");
  return body + (needsComma ? "," : "") + entry + raw.slice(end);
}

export function splitTransdiagModule(cache: CacheLike): void {
  const idx = cache.modules.findIndex((m) => m.slug === "transdiag");
  if (idx === -1) return;
  const td = cache.modules[idx];

  const cards = extractCards(td.html);
  const byTopic = new Map<string, CardBlock[]>();
  const intro: CardBlock[] = [];
  for (const c of cards) {
    if (c.topic === "intro") {
      intro.push(c);
      continue;
    }
    if (!byTopic.has(c.topic)) byTopic.set(c.topic, []);
    byTopic.get(c.topic)!.push(c);
  }

  const cardModule: Record<string, string> = {};
  const newModules: ModuleLike[] = [];

  for (const def of TRANSDIAG_TOPICS) {
    let blocks = byTopic.get(def.topic) ?? [];
    // "intro" (wprowadzenie do podejścia + roadmapa) dołączone do "protokoly".
    if (def.topic === "protokoly" && intro.length) {
      blocks = [...intro, ...blocks];
    }
    if (!blocks.length) continue;
    const slug = slugFor(def.topic);
    for (const b of blocks) cardModule[b.id] = slug;
    const cardsHtml = blocks.map((b) => b.html).join("\n");
    newModules.push({
      slug,
      title: def.name,
      subtitle: def.desc,
      html: buildModuleHtml(def, cardsHtml, blocks.length)
    });
  }

  // Podmiana w liście modułów: transdiag → 17 nowych (w miejscu transdiag).
  cache.modules.splice(idx, 1, ...newModules);

  // Re-scope CSS scopowanego do #tab-transdiag na klasę .td-split.
  const rescoped = (cache.style.match(/[^{}]*#tab-transdiag[^{}]*\{[^{}]*\}/g) ?? [])
    .map((r) => r.replace(/#tab-transdiag/g, ".td-split"))
    .join("\n");
  if (rescoped) {
    cache.style += "\n/* transdiag split: re-scope kart na osobne moduły */\n" + rescoped;
  }

  // Strona główna: usuń kafelek zbiorczy, wstaw kategorię przed "Emocje i ciało".
  let home = removeTransdiagButton(cache.homeScreen);
  const buttons = TRANSDIAG_TOPICS.filter(
    (d) => newModules.some((m) => m.slug === slugFor(d.topic))
  )
    .map(buildHomeButton)
    .join("\n");
  const categoryBlock = `<div class="appr-cat">
<div class="appr-cat-label">Procesy transdiagnostyczne</div>
<div class="home-items">
${buttons}
</div></div>

`;
  const emoLabel = '<div class="appr-cat-label">Emocje i ciało</div>';
  const emoLabelIdx = home.indexOf(emoLabel);
  if (emoLabelIdx !== -1) {
    const apprStart = home.lastIndexOf('<div class="appr-cat">', emoLabelIdx);
    if (apprStart !== -1) {
      home = home.slice(0, apprStart) + categoryBlock + home.slice(apprStart);
    }
  }
  // Aktualizacja głównego licznika "86 modułów" (total w nagłówku/statystykach).
  // Netto +16 (-1 transdiag zbiorczy, +17 nowych). Celujemy w konkretny token
  // totalu, NIE w podtytuły kategorii typu "6 modułów zaburzeń osobowości".
  home = home.replace(/86 modułów/g, "102 modułów");
  cache.homeScreen = home;

  // Dane wyszukiwarki: usuń transdiag, dodaj nowe moduły.
  cache.moduleSearchData = removeJsKey(cache.moduleSearchData, "transdiag");
  cache.moduleNames = removeJsKey(cache.moduleNames, "transdiag");
  cache.moduleColors = removeJsKey(cache.moduleColors, "transdiag");
  for (const def of TRANSDIAG_TOPICS) {
    const slug = slugFor(def.topic);
    const mod = newModules.find((m) => m.slug === slug);
    if (!mod) continue;
    const count = (mod.html.match(/<details class="card"/g) ?? []).length;
    cache.moduleSearchData = appendJsKey(
      cache.moduleSearchData,
      `${JSON.stringify(slug)}:{name:${JSON.stringify(def.name)},desc:${JSON.stringify(def.desc)},keywords:${JSON.stringify(def.keywords + " transdiagnostyczne procesy")},count:${JSON.stringify(count + " " + plural(count))},color:${JSON.stringify(def.color)}}`
    );
    cache.moduleNames = appendJsKey(cache.moduleNames, `${JSON.stringify(slug)}:${JSON.stringify(def.name)}`);
    cache.moduleColors = appendJsKey(cache.moduleColors, `${JSON.stringify(slug)}:${JSON.stringify(def.color)}`);
  }

  cache.transdiagCardModule = cardModule;
}

// Skrypt wstrzykiwany na strony modułów: mapa karta→moduł dla mostu linków.
export function buildCardModuleIndexScript(map: Record<string, string>): string {
  return `window.TD_CARD_MODULE = Object.assign(window.TD_CARD_MODULE || {}, ${JSON.stringify(map)});`;
}
