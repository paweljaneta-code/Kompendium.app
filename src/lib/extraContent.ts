// Mechanizm "łatwego dorzucania" treści bez edycji monolitu kompendium.html.
// Źródło: src/lib/extra-content.json (generowany przez scripts/build-extra-content.mjs
// z content/extra/** i public/howto/**; importowany statycznie — bundluje się
// na Vercelu niezależnie od outputFileTracingExcludes).
//
// Trzy rodzaje treści:
//  1. tools   — nowe karty narzędzi wstrzykiwane do istniejących modułów,
//  2. modules — całe nowe moduły (nagłówek + biblioteka + karty z "tools"),
//  3. howto   — poradniki "Jak pracować z..." per subsekcja (kontekstowy
//               przycisk 📘 nad listą po wybraniu filtra tematu).
// Schematy JSON: content/extra/README.md.
import extraContentJson from "./extra-content.json";
import { KOMPENDIUM_PENDING_CARD_KEY } from "./kompendiumScroll";

type ExtraToolMaterial =
  | "print"
  | "sos"
  | "clinician"
  | "guide";

export type ExtraTool = {
  id: string;
  tab: string;
  topic?: string;
  name: string;
  sub?: string;
  badge?: string;
  badgeBg?: string;
  badgeFg?: string;
  appTag?: string;
  app?: string;
  m?: string;
  y?: string;
  dur?: string;
  position?: "top" | "bottom";
  tldr?: string;
  bodyHtml?: string;
  materials?: ExtraToolMaterial[];
};

export type ExtraModuleDef = {
  tab: string;
  name: string;
  desc?: string;
  metaEn?: string;
  color?: string;
  iconSvg?: string;
  keywords?: string;
  categories?: { key: string; label: string; color?: string }[];
};

type HowtoEntry = { file: string; label: string };

type ExtraContent = {
  generatedAt: string;
  tools: Record<string, ExtraTool[]>;
  modules: ExtraModuleDef[];
  howto: Record<string, Record<string, HowtoEntry>>;
};

export const EXTRA_CONTENT = extraContentJson as ExtraContent;

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- Generator kart narzędzi (struktura 1:1 z kartami monolitu) ---

const ICONS = {
  print:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6"/><path d="M6 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1"/><rect x="6" y="14" width="12" height="7" rx="1.5"/><path d="M17 11.4h.01"/></svg>',
  sos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.6"/><path d="M10.5 18.5h3"/></svg>',
  clinician:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3h-.5A1.5 1.5 0 0 0 2 4.5V9a6 6 0 0 0 12 0V4.5A1.5 1.5 0 0 0 12.5 3H12"/><path d="M8 15v1a6 6 0 0 0 12 0v-4"/><circle cx="20" cy="10" r="2"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
  share:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>'
};

function materialButton(
  icon: string,
  onclick: string,
  title: string,
  desc: string,
  extraClass = "tm-elec"
): string {
  return (
    `<button class="tool-mat ${extraClass}" onclick="event.stopPropagation();${onclick}">` +
    `<span class="tm-ic">${icon}</span><span class="tm-tx"><span class="tm-t">${esc(title)}</span>` +
    `<span class="tm-d">${esc(desc)}</span></span><span class="tm-chev">›</span></button>`
  );
}

function buildMaterialButtons(tool: ExtraTool): string {
  const materials = tool.materials ?? ["print", "sos", "clinician"];
  const id = tool.id;
  const parts: string[] = [];
  for (const mat of materials) {
    if (mat === "print")
      parts.push(
        materialButton(
          ICONS.print,
          `openHandout('${id}')`,
          "Handout do druku",
          "Arkusz psychoedukacyjny gotowy do druku — z miejscami do wypełnienia, ćwiczeniami i checklistami.",
          "tm-print"
        )
      );
    else if (mat === "sos")
      parts.push(
        materialButton(
          ICONS.sos,
          `downloadStandaloneHandout('${id}')`,
          "Interaktywny materiał elektroniczny",
          "Narzędzie z auto-zapisem — do wypełnienia z klientem na sesji lub jako zadanie domowe."
        )
      );
    else if (mat === "clinician")
      parts.push(
        materialButton(
          ICONS.clinician,
          `openClinicianHandout('${id}')`,
          "Handout dla terapeuty",
          "Wersja dla klinicysty — wskazówki do prowadzenia, najczęstsze pułapki i warianty interwencji.",
          "tm-ther"
        )
      );
    else if (mat === "guide") {
      parts.push(
        materialButton(
          ICONS.eye,
          `openGuideFullscreen('${id}')`,
          "Przejrzyj przewodnik",
          "Otwórz interaktywny przewodnik na pełnym ekranie — możesz przejść wszystkie kroki przed przekazaniem klientowi."
        )
      );
      parts.push(
        materialButton(
          ICONS.share,
          `shareToolLink('${id}')`,
          "Udostępnij przez link",
          "Wygeneruj link dla klienta — przewodnik otwiera się w przeglądarce bez logowania, wypełnienia zapisują się na jego urządzeniu."
        )
      );
    }
  }
  return parts.length ? `<div class="tool-mats">${parts.join("")}</div>` : "";
}

export function buildExtraToolCard(tool: ExtraTool): string {
  const topic = tool.topic ?? "inne";
  const badge = tool.badge ?? "Narzędzie";
  const badgeStyle = `background:${tool.badgeBg ?? "#eef2f0"};color:${tool.badgeFg ?? "#3a5a4a"}`;
  const tldr = tool.tldr
    ? `<div class="tldr-box"><strong><span class="li-ic">${ICONS.bolt}</span> W skrócie:</strong> ${tool.tldr}</div>`
    : "";
  return `<details class="card" id="${esc(tool.id)}" data-m="${esc(tool.m ?? "psycho")}" data-sub="${esc(topic)}" data-y="${esc(tool.y ?? "narzędzie")}" data-app="${esc(tool.app ?? "CBT")}" data-topic="${esc(topic)}">
<summary><div class="card-row">
<div class="card-name"><span class="nm">${esc(tool.name)}</span><span class="sub">${esc(tool.sub ?? "")}</span></div>
<div class="card-meta"><span class="badge" style="${badgeStyle}">${esc(badge)}</span><span class="app-tag">${esc(tool.appTag ?? "terapia poznawczo-behawioralna")}</span></div>
<div class="card-dur">${esc(tool.dur ?? "")}</div>
</div></summary>
<div class="card-detail"><div class="dg">
${tldr}
${tool.bodyHtml ?? ""}
${buildMaterialButtons(tool)}
</div></div>
</details>
`;
}

// Koniec karty <details class="card"> od pozycji startIdx — z licznikiem
// głębokości (karty zawierają zagnieżdżone <details class="card-section">).
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

function injectToolsIntoHtml(html: string, tools: ExtraTool[]): string {
  let out = html;
  for (const tool of tools) {
    const card = buildExtraToolCard(tool);
    let insertAt = -1;
    if (tool.topic) {
      const re = new RegExp(
        `<details class="card"[^>]*data-topic="${tool.topic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`,
        "g"
      );
      const matches = [...out.matchAll(re)];
      if (matches.length) {
        if (tool.position === "top") {
          insertAt = matches[0].index ?? -1;
        } else {
          // domyślnie: za ostatnią kartą tematu (nowe narzędzie na końcu grupy)
          const last = matches[matches.length - 1];
          insertAt = findCardEnd(out, last.index ?? 0);
        }
      }
    }
    if (insertAt === -1) {
      // moduł bez kart tego tematu — na początek listy
      const wrap = out.indexOf('<div class="cards-wrap">');
      if (wrap !== -1) insertAt = wrap + '<div class="cards-wrap">'.length;
    }
    if (insertAt === -1) continue; // moduł bez biblioteki kart — pomiń
    out = out.slice(0, insertAt) + card + out.slice(insertAt);
  }
  return out;
}

// --- Generator całego nowego modułu ---

const DEFAULT_MODULE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="24" height="24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>';

export function buildExtraModuleHtml(
  def: ExtraModuleDef,
  tools: ExtraTool[]
): string {
  const color = def.color ?? "#4a6a5a";
  const cats = def.categories ?? [];
  const total = tools.length;
  const cards = tools.map(buildExtraToolCard).join("\n");
  const pills = [
    `<span class="pill active" data-filter="all">Wszystkie (${total})</span>`,
    ...cats.map(
      (c) =>
        `<span class="pill" data-filter="${esc(c.key)}"><span class="pip" style="background:${c.color ?? color}"></span>${esc(c.label)} (0)</span>`
    )
  ].join("\n");
  const sidebar = [
    `<div class="lib-sb-filter active" onclick="libFilterSidebar('${esc(def.tab)}','all',this)"><span class="lib-sb-fname">Wszystkie</span><span class="lib-sb-fcount">${total}</span></div>`,
    ...cats.map(
      (c) =>
        `<div class="lib-sb-filter" onclick="libFilterSidebar('${esc(def.tab)}','${esc(c.key)}',this)"><span class="lib-sb-fname">${esc(c.label)}</span><span class="lib-sb-fcount">0</span></div>`
    )
  ].join("\n");
  return `<div class="tab-content" id="tab-${esc(def.tab)}">
<span class="tab-subtitle" style="display:none">${esc(def.desc ?? "")}</span>
<div class="mod-header mod-header--gad-feat" style="--accent-mod:${color}"><div class="mod-header-icon">${def.iconSvg ?? DEFAULT_MODULE_ICON}</div><div class="mod-header-text"><h2>${esc(def.name)}</h2><div class="mod-header-meta">${total} narzędzi${def.metaEn ? ` · ${esc(def.metaEn)}` : ""}</div></div></div>
<div class="library-view" id="library-view-${esc(def.tab)}" style="--accent-mod:${color}"><div class="lib-layout"><div class="lib-sidebar-wrap"><div class="lib-sidebar"><div class="lib-sb-head">Filtruj</div><div class="lib-sb-filters">
${sidebar}
</div></div></div>
<div class="lib-content"><div class="main">
<div class="pills">
${pills}
</div>
<div class="search-wrap"><input type="text" placeholder="🔍 Szukaj narzędzia..." /></div><div class="count">Wyświetlono: ${total} z ${total} narzędzi</div><div class="cards-wrap">
${cards}
</div></div></div>
</div></div>
</div>
`;
}

// --- Rozszerzanie danych monolitu ---

type ModuleLike = {
  slug: string;
  title: string;
  subtitle: string;
  html: string;
};

type CacheLike = {
  homeScreen: string;
  moduleSearchData: string;
  moduleNames: string;
  moduleColors: string;
  modules: ModuleLike[];
};

function appendToJsObjectLiteral(raw: string, entry: string): string {
  const end = raw.lastIndexOf("}");
  if (end === -1) return raw;
  const body = raw.slice(0, end).trimEnd();
  const needsComma = !body.endsWith("{") && !body.endsWith(",");
  return body + (needsComma ? "," : "") + entry + "}";
}

function buildHomeButton(def: ExtraModuleDef): string {
  const color = def.color ?? "#4a6a5a";
  return `<button class="home-btn" data-tab="${esc(def.tab)}" style="--btn-color:${color}"><span class="card-icon">${def.iconSvg ?? DEFAULT_MODULE_ICON}</span><span class="home-btn-name">${esc(def.name)}</span><span class="home-btn-desc">${esc(def.desc ?? "")}</span></button>`;
}

export function applyExtraContent(cache: CacheLike): void {
  // 1. Nowe karty w istniejących modułach.
  for (const [tab, tools] of Object.entries(EXTRA_CONTENT.tools)) {
    const mod = cache.modules.find((m) => m.slug === tab);
    if (mod) mod.html = injectToolsIntoHtml(mod.html, tools);
  }

  // 2. Całe nowe moduły (tab spoza monolitu).
  for (const def of EXTRA_CONTENT.modules) {
    if (cache.modules.some((m) => m.slug === def.tab)) continue;
    const tools = EXTRA_CONTENT.tools[def.tab] ?? [];
    cache.modules.push({
      slug: def.tab,
      title: def.name,
      subtitle: def.desc ?? "",
      html: buildExtraModuleHtml(def, tools)
    });

    // Kafelek na stronie głównej — za ostatnim istniejącym home-btn.
    const lastBtn = cache.homeScreen.lastIndexOf('<button class="home-btn"');
    if (lastBtn !== -1) {
      const closeIdx = cache.homeScreen.indexOf("</button>", lastBtn);
      if (closeIdx !== -1) {
        const at = closeIdx + "</button>".length;
        cache.homeScreen =
          cache.homeScreen.slice(0, at) +
          buildHomeButton(def) +
          cache.homeScreen.slice(at);
      }
    }

    // Dane wyszukiwarki globalnej.
    const count = `${tools.length} narzędzi`;
    const color = def.color ?? "#4a6a5a";
    cache.moduleSearchData = appendToJsObjectLiteral(
      cache.moduleSearchData,
      `${JSON.stringify(def.tab)}:{name:${JSON.stringify(def.name)},desc:${JSON.stringify(def.desc ?? "")},keywords:${JSON.stringify(def.keywords ?? def.name)},count:${JSON.stringify(count)},color:${JSON.stringify(color)}}`
    );
    cache.moduleNames = appendToJsObjectLiteral(
      cache.moduleNames,
      `${JSON.stringify(def.tab)}:${JSON.stringify(def.name)}`
    );
    cache.moduleColors = appendToJsObjectLiteral(
      cache.moduleColors,
      `${JSON.stringify(def.tab)}:${JSON.stringify(color)}`
    );
  }
}

// --- Skrypty klienckie ---

// Przelicza liczniki (pigułki, sidebar, "Wyświetlono", meta nagłówka) na
// podstawie faktycznych kart w DOM — liczniki przestają być utrzymywane
// ręcznie i są odporne na wstrzykiwane karty.
export const KOMPENDIUM_RECOUNT_SCRIPT = `(function () {
  function plural(n) {
    if (n === 1) return "narzędzie";
    var d = n % 10, h = n % 100;
    return d >= 2 && d <= 4 && (h < 10 || h >= 20) ? "narzędzia" : "narzędzi";
  }
  function matches(card, f) {
    var m = card.getAttribute("data-m") || "";
    var t = card.getAttribute("data-topic") || "";
    return f === "all" || m === f || t === f || (" " + m + " ").indexOf(" " + f + " ") !== -1;
  }
  function countFor(cards, f) {
    var n = 0;
    for (var i = 0; i < cards.length; i++) if (matches(cards[i], f)) n++;
    return n;
  }
  function recount(lv) {
    var cards = lv.querySelectorAll(".card");
    lv.querySelectorAll(".pill").forEach(function (p) {
      var f = p.getAttribute("data-filter");
      if (!f) return;
      var n = countFor(cards, f);
      for (var i = p.childNodes.length - 1; i >= 0; i--) {
        var nd = p.childNodes[i];
        if (nd.nodeType === 3 && /\\(\\d+\\)\\s*$/.test(nd.nodeValue)) {
          nd.nodeValue = nd.nodeValue.replace(/\\(\\d+\\)(\\s*)$/, "(" + n + ")$1");
          break;
        }
      }
    });
    lv.querySelectorAll(".lib-sb-filter").forEach(function (el) {
      var oc = el.getAttribute("onclick") || "";
      var m = oc.match(/libFilterSidebar\\([^,]*,'([^']*)'/);
      if (!m) return;
      var fc = el.querySelector(".lib-sb-fcount");
      if (fc) fc.textContent = String(countFor(cards, m[1]));
    });
    var total = cards.length;
    var hidden = 0;
    for (var i = 0; i < cards.length; i++) if (cards[i].classList.contains("hidden")) hidden++;
    var ct = lv.querySelector(".count");
    if (ct) ct.textContent = "Wyświetlono: " + (total - hidden) + " z " + total + " " + plural(total);
    var tabEl = lv.closest(".tab-content");
    var meta = tabEl && tabEl.querySelector(".mod-header-meta");
    if (meta && /^\\s*\\d+\\s+narzędz/.test(meta.textContent)) {
      meta.textContent = meta.textContent.replace(/^\\s*\\d+\\s+narzędz\\S*/, total + " " + plural(total));
    }
  }
  function run() {
    document.querySelectorAll(".library-view").forEach(recount);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();`;

// Most: poradnik otwarty w pełnoekranowym iframe wysyła postMessage
// {type:"kompendium-open-card", id} po kliknięciu elementu [data-go];
// strona modułu zamyka nakładkę i otwiera wskazaną kartę (zdejmując filtr,
// jeśli karta jest ukryta — przełącza na pigułkę tematu karty).
export const KOMPENDIUM_CARD_OPEN_BRIDGE_SCRIPT = `(function () {
  var PENDING_CARD_KEY = ${JSON.stringify(KOMPENDIUM_PENDING_CARD_KEY)};
  window.addEventListener("message", function (ev) {
    var data = ev.data;
    if (!data || data.type !== "kompendium-open-card" || !data.id) return;
    var id = String(data.id);
    var el = document.getElementById(id);
    if (!el) {
      // Karta jest w innym module (linki w poradnikach bywają międzymodułowe) —
      // nawiguj do właściwej strony modułu i otwórz kartę po załadowaniu.
      var slug = window.TD_CARD_MODULE && window.TD_CARD_MODULE[id];
      if (slug) {
        try {
          window.top.sessionStorage.setItem(
            PENDING_CARD_KEY,
            JSON.stringify({ cardId: id })
          );
        } catch (e) {}
        var url = "/modules/" + encodeURIComponent(slug);
        try {
          window.top.location.href = url;
        } catch (e2) {
          try {
            window.location.href = url;
          } catch (e3) {}
        }
      }
      return;
    }
    if (typeof window.closeHandout === "function") window.closeHandout();
    if (typeof window.closeSOS === "function") {
      var sos = document.getElementById("sos-modal-bg");
      if (sos && sos.classList.contains("active")) window.closeSOS();
    }
    if (el.classList.contains("hidden")) {
      var lv = el.closest(".library-view");
      var topic = el.getAttribute("data-topic");
      var pill =
        (lv && topic && lv.querySelector('.pill[data-filter="' + topic + '"]')) ||
        (lv && lv.querySelector('.pill[data-filter="all"]'));
      if (pill) pill.click();
    }
    var open = document.querySelectorAll(".card[open]");
    for (var i = 0; i < open.length; i++) {
      if (open[i] !== el) open[i].removeAttribute("open");
    }
    el.setAttribute("open", "");
    setTimeout(function () {
      var hdr = document.querySelector(".header");
      var nav = document.querySelector(".nav-bar");
      var off = (hdr ? hdr.offsetHeight : 0) + (nav ? nav.offsetHeight : 0) + 12;
      var y = el.getBoundingClientRect().top + window.pageYOffset - off;
      window.scrollTo({ top: y, behavior: "smooth" });
    }, 180);
  });
})();`;

// Kontekstowy przycisk 📘 "Jak pracować z..." nad listą narzędzi, widoczny
// gdy aktywny filtr tematu ma poradnik w public/howto/<tab>/<topic>.html.
export function buildTopicHowtoScript(): string {
  return `(function () {
  var IDX = ${JSON.stringify(EXTRA_CONTENT.howto)};
  function tabKey(lv) {
    var m = (lv.id || "").match(/^library-view-(.*)$/);
    return m ? m[1] : null;
  }
  function ensureBanner(lv) {
    var b = lv.querySelector(".topic-howto-banner");
    if (b) return b;
    b = document.createElement("div");
    b.className = "topic-howto-banner";
    b.style.cssText = "margin:0 0 14px";
    var pills = lv.querySelector(".pills");
    if (pills && pills.parentNode) pills.parentNode.insertBefore(b, pills.nextSibling);
    else lv.insertBefore(b, lv.firstChild);
    return b;
  }
  function update(lv) {
    var tab = tabKey(lv);
    var map = tab && IDX[tab];
    if (!map) return;
    var active = lv.querySelector(".pill.active");
    var f = active && active.getAttribute("data-filter");
    var e = f && map[f];
    var b = ensureBanner(lv);
    if (!e) {
      b.innerHTML = "";
      b.style.display = "none";
      return;
    }
    b.innerHTML = "";
    b.style.display = "";
    var btn = document.createElement("button");
    btn.className = "gad-howto-cta";
    btn.style.cssText = "font-size:15px;padding:12px 24px;width:100%;border-radius:12px";
    var emoji = document.createElement("span");
    emoji.className = "ghc-emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = "📘";
    var label = document.createElement("span");
    label.textContent = e.label;
    btn.appendChild(emoji);
    btn.appendChild(label);
    btn.onclick = function () {
      if (window.openHowtoFullscreen) window.openHowtoFullscreen(e.file, e.label);
    };
    b.appendChild(btn);
  }
  function updateAll() {
    document.querySelectorAll(".library-view").forEach(update);
  }
  document.addEventListener("click", function (ev) {
    if (!ev.target || !ev.target.closest) return;
    if (ev.target.closest(".pill") || ev.target.closest(".lib-sb-filter")) {
      setTimeout(updateAll, 0);
    }
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", updateAll);
  else updateAll();
})();`;
}
