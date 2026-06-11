import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  FILE_HANDOUT_OVERRIDE_SCRIPT,
  FILE_SOS_OVERRIDE_SCRIPT,
  KOMPENDIUM_MODULE_NAV_SCRIPT
} from "./handoutOverrides";
import {
  KOMPENDIUM_HOME_SCROLL_KEY,
  KOMPENDIUM_PENDING_CARD_KEY,
  KOMPENDIUM_PENDING_HOWTO_KEY
} from "./kompendiumScroll";
import {
  MODULE_HANDOUT_ALIASES,
  buildModuleSearchKeywords
} from "./moduleSearchAliases";

type OriginalModule = {
  slug: string;
  title: string;
  subtitle: string;
  html: string;
};

type OriginalData = {
  style: string;
  moduleFeatureStyles: string;
  header: string;
  navBar: string;
  homeScreen: string;
  handoutScript: string;
  moduleUiScript: string;
  handoutOverlay: string;
  semanticSearchScript: string;
  moduleSearchData: string;
  moduleNames: string;
  moduleColors: string;
  plannerGlobalElements: string;
  plannerScript: string;
  modules: OriginalModule[];
};

function extractBalancedDiv(source: string, start: number): string {
  if (start === -1) return "";
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    if (source.startsWith("<div", i)) depth += 1;
    else if (source.startsWith("</div>", i)) {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + "</div>".length);
    }
  }
  return "";
}

function extractTabContentHtml(source: string, slug: string): string {
  const needle = `<div class="tab-content" id="tab-${slug}"`;
  const start = source.indexOf(needle);
  return extractBalancedDiv(source, start);
}

function extractNavBar(source: string): string {
  const start = source.indexOf('<div class="nav-bar" id="nav-bar"');
  return extractBalancedDiv(source, start);
}

function extractPlannerGlobalElements(source: string): string {
  const start = source.indexOf("<!-- PLAN TERAPII - GLOBAL ELEMENTS -->");
  const scriptMarker = source.indexOf("<!-- PLAN TERAPII - JAVASCRIPT -->");
  if (start === -1 || scriptMarker === -1) return "";
  return source.slice(start, scriptMarker).trim();
}

function extractPlannerScript(source: string): string {
  const marker = source.indexOf("<!-- PLAN TERAPII - JAVASCRIPT -->");
  if (marker === -1) return "";
  const scriptOpen = source.indexOf("<script>", marker);
  if (scriptOpen === -1) return "";
  const contentStart = scriptOpen + "<script>".length;
  const wrapMarker = source.indexOf("wrapOpenPlannerForCtxReset", marker);
  if (wrapMarker === -1) return "";
  const closeParen = source.indexOf("})();", wrapMarker);
  if (closeParen === -1) return "";
  const closeTag = source.indexOf("</script>", closeParen);
  if (closeTag === -1) return "";
  return source.slice(contentStart, closeTag).trim();
}

function extractJsVarObject(source: string, varName: string): string {
  const marker = `var ${varName}=`;
  const start = source.indexOf(marker);
  if (start === -1) return "{}";

  let pos = start + marker.length;
  while (pos < source.length && /\s/.test(source[pos] ?? "")) pos += 1;
  if (source[pos] !== "{") return "{}";

  let depth = 0;
  const begin = pos;
  for (; pos < source.length; pos += 1) {
    const ch = source[pos];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(begin, pos + 1);
    }
  }

  return "{}";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeEmbeddedScript(source: string): string {
  return source.replace(/<\/script/gi, "<\\/script");
}

function buildSearchIndexDom(modules: OriginalModule[]): string {
  const parts = [
    '<div id="kompendium-search-index" style="display:none!important" aria-hidden="true">'
  ];
  const cardRegex =
    /<details[^>]*\bclass="[^"]*\bcard\b[^"]*"[^>]*\bid="([^"]+)"([^>]*)>([\s\S]*?)<\/details>/gi;

  for (const mod of modules) {
    if (mod.slug === "plany") continue;
    parts.push(`<div class="tab-content" id="tab-${mod.slug}">`);

    for (const match of mod.html.matchAll(cardRegex)) {
      const cid = match[1];
      const attrs = match[2];
      const cardHtml = match[0];
      const tagsMatch = attrs.match(/data-tags="([^"]*)"/);
      const tagsAttr = tagsMatch ? ` data-tags="${escapeHtml(tagsMatch[1])}"` : "";
      const { name, sub } = extractCardInfo(cardHtml, cid);
      parts.push(
        `<details class="card" id="${escapeHtml(cid)}"${tagsAttr}>` +
          `<span class="nm">${escapeHtml(name)}</span>` +
          `<span class="sub">${escapeHtml(sub)}</span>` +
          `</details>`
      );
    }

    parts.push("</div>");
  }

  parts.push("</div>");
  return parts.join("\n");
}

function buildHomeGlobalSearchScript(
  moduleSearchData: string,
  moduleNames: string,
  moduleColors: string
): string {
  return `(function () {
  var moduleSearchData = ${moduleSearchData};
  var moduleNames = ${moduleNames};
  var moduleColors = ${moduleColors};
  var moduleSearchAliases = ${JSON.stringify(MODULE_HANDOUT_ALIASES)};
  var PENDING_CARD_KEY = ${JSON.stringify(KOMPENDIUM_PENDING_CARD_KEY)};

  function normalizeSearch(value) {
    return String(value)
      .normalize("NFD")
      .replace(/\\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9\\s]/g, " ")
      .replace(/\\s+/g, " ")
      .trim();
  }

  function moduleMatchesQuery(modKey, query) {
    if (!query || !modKey) return false;
    var mod = moduleSearchData[modKey];
    if (!mod) return false;
    if (normalizeSearch(mod.name).indexOf(query) !== -1) return true;
    if (modKey.indexOf(query) !== -1) return true;
    if (normalizeSearch(mod.keywords).indexOf(query) !== -1) return true;
    var aliases = moduleSearchAliases[modKey] || [];
    for (var ai = 0; ai < aliases.length; ai++) {
      var alias = aliases[ai];
      if (alias.indexOf(query) !== -1 || query.indexOf(alias) !== -1) return true;
    }
    return false;
  }

  var gs = document.getElementById("global-search");
  var gsResults = document.getElementById("gs-results");
  var clearBtn = document.getElementById("gs-clear");
  var searchTimer = null;

  function escHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escAttr(value) {
    return escHtml(value).replace(/'/g, "&#39;");
  }

  function highlightText(text, query) {
    if (!query) return text;
    var idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      text.substring(0, idx) +
      "<mark>" +
      text.substring(idx, idx + query.length) +
      "</mark>" +
      text.substring(idx + query.length)
    );
  }

  function goCard(tabKey, cardId) {
    try {
      window.top.sessionStorage.setItem(
        PENDING_CARD_KEY,
        JSON.stringify({ cardId: cardId })
      );
    } catch (e) {}
    if (typeof window.goModule === "function") window.goModule(tabKey);
  }

  function buildResults(rawQuery) {
    if (!gsResults) return;
    var q = normalizeSearch(rawQuery || "");
    if (!q || q.length < 2) {
      gsResults.innerHTML =
        '<div class="gs-hint">Wpisz min. 2 znaki, by wyszukać…</div>';
      gsResults.classList.add("visible");
      return;
    }

    var html = "";
    var matchedModules = [];
    var cardResults = {};
    var totalCards = 0;

    for (var key in moduleSearchData) {
      var mod = moduleSearchData[key];
      var score = 0;
      if (normalizeSearch(mod.name).indexOf(q) !== -1) score += 3;
      if (normalizeSearch(mod.desc).indexOf(q) !== -1) score += 2;
      if (normalizeSearch(mod.keywords).indexOf(q) !== -1) score += 1;
      if (moduleMatchesQuery(key, q)) score += 1;
      if (score > 0) matchedModules.push({ key: key, score: score });
    }
    matchedModules.sort(function (a, b) {
      return b.score - a.score;
    });
    matchedModules = matchedModules.map(function (m) {
      return m.key;
    });

    var semResult =
      typeof window.searchKompendiumSemantic === "function"
        ? window.searchKompendiumSemantic(q, { maxPerModule: 5, maxTotal: 40 })
        : { results: [], canonicalTags: [], totalMatches: 0 };

    for (var sri = 0; sri < semResult.results.length; sri++) {
      var sr = semResult.results[sri];
      var tabKey = sr.tabKey;
      var card = sr.card;
      var nameEl = card.querySelector(".nm");
      var subEl = card.querySelector(".sub");
      var name = nameEl ? nameEl.textContent : "";
      var sub = subEl ? subEl.textContent : "";
      var hasNameMatch = name.toLowerCase().indexOf(q) !== -1;
      var hasTagMatch =
        sr.why &&
        sr.why.some(function (w) {
          return w.indexOf("tag") !== -1;
        });

      if (!cardResults[tabKey]) cardResults[tabKey] = [];
      cardResults[tabKey].push({
        id: card.getAttribute("id") || "",
        name: name,
        sub: sub,
        titleMatch: hasNameMatch,
        tagMatch: hasTagMatch,
        score: sr.score,
        why: sr.why
      });
      totalCards++;
    }

    for (var modKey in moduleSearchData) {
      if (!moduleMatchesQuery(modKey, q)) continue;
      var tabEl = document.getElementById("tab-" + modKey);
      if (!tabEl) continue;
      if (!cardResults[modKey]) cardResults[modKey] = [];
      var seenCardIds = {};
      for (var sci = 0; sci < cardResults[modKey].length; sci++) {
        seenCardIds[cardResults[modKey][sci].id] = true;
      }
      var tabCards = tabEl.querySelectorAll(".card");
      for (var tci = 0; tci < tabCards.length; tci++) {
        var tabCard = tabCards[tci];
        var tabCardId = tabCard.getAttribute("id") || "";
        if (!tabCardId || seenCardIds[tabCardId]) continue;
        seenCardIds[tabCardId] = true;
        var tabNameEl = tabCard.querySelector(".nm");
        var tabSubEl = tabCard.querySelector(".sub");
        var tabName = tabNameEl ? tabNameEl.textContent : "";
        var tabSub = tabSubEl ? tabSubEl.textContent : "";
        cardResults[modKey].push({
          id: tabCardId,
          name: tabName,
          sub: tabSub,
          titleMatch: normalizeSearch(tabName).indexOf(q) !== -1,
          tagMatch: false,
          score: 2,
          why: ["module"]
        });
        totalCards++;
      }
    }

    if (matchedModules.length > 0) {
      html += '<div class="gs-results-group">';
      html +=
        '<div class="gs-results-header" style="color:var(--accent)">Moduły</div>';
      for (var mi = 0; mi < matchedModules.length; mi++) {
        var modKey = matchedModules[mi];
        var modEntry = moduleSearchData[modKey];
        html += '<div class="gs-result gs-result-module-link" data-tab="' + modKey + '">';
        html +=
          '<div class="gs-result-icon" style="background:' +
          modEntry.color +
          '">' +
          modEntry.name.substring(0, 2) +
          "</div>";
        html +=
          '<div class="gs-result-body"><div class="gs-result-title">' +
          highlightText(modEntry.name, q) +
          '</div><div class="gs-result-sub">' +
          modEntry.desc +
          " · <strong>" +
          modEntry.count +
          "</strong></div></div>";
        html += '<div class="gs-result-arrow">→</div>';
        html += "</div>";
      }
      html += "</div>";
    }

    var suggestions =
      typeof window.suggestConcepts === "function"
        ? window.suggestConcepts(q)
        : [];
    var canonicalSet = {};
    if (semResult && semResult.canonicalTags) {
      for (var ci = 0; ci < semResult.canonicalTags.length; ci++) {
        canonicalSet[semResult.canonicalTags[ci]] = true;
      }
    }
    var newSuggestions = suggestions.filter(function (s) {
      return !canonicalSet[s];
    });
    var showSuggestions =
      newSuggestions.length >= 1 &&
      q.length >= 2 &&
      q.length < 20 &&
      (semResult.totalMatches === 0 ||
        (semResult.canonicalTags && semResult.canonicalTags.length === 0));
    if (showSuggestions) {
      html += '<div class="gs-results-group" style="background:#fff8f0">';
      html +=
        '<div class="gs-results-header" style="color:#a86420">💡 Może chodzi o</div>';
      html += '<div style="padding:6px 14px 12px;font-size:11.5px">';
      for (var si = 0; si < newSuggestions.length; si++) {
        var sId = newSuggestions[si];
        var sC = window.TAG_ONTOLOGY[sId];
        if (!sC) continue;
        var primaryAlias =
          sC.aliases && sC.aliases[0] ? sC.aliases[0] : sC.label;
        html +=
          '<button type="button" class="gs-suggest-chip" data-suggest="' +
          escAttr(primaryAlias) +
          '" style="display:inline-block;background:#fff;border:1px solid #d4a868;color:#7a4a1a;padding:5px 11px;border-radius:14px;margin:3px 5px 3px 0;font-size:11.5px;font-weight:500;cursor:pointer;font-family:inherit">' +
          escHtml(sC.label) +
          "</button>";
      }
      html += "</div></div>";
    }

    if (semResult && semResult.canonicalTags && semResult.canonicalTags.length > 0) {
      html += '<div class="gs-results-group" style="background:#fafaf8">';
      html +=
        '<div class="gs-results-header" style="color:#2a7a5a">🎯 Rozpoznane koncepty kliniczne</div>';
      html += '<div style="padding:6px 14px 10px;font-size:11.5px;color:#555">';
      var canonLimit = Math.min(4, semResult.canonicalTags.length);
      for (var cti = 0; cti < canonLimit; cti++) {
        var cTag = semResult.canonicalTags[cti];
        var concept = window.TAG_ONTOLOGY[cTag];
        if (!concept) continue;
        html +=
          '<span style="display:inline-block;background:#e8f0eb;color:#2a6a5a;padding:3px 9px;border-radius:6px;margin:2px 4px 2px 0;font-weight:500">' +
          concept.label +
          "</span>";
      }
      if (semResult.canonicalTags.length > canonLimit) {
        html +=
          '<span style="display:inline-block;color:#888;font-size:10.5px;padding:3px 4px">+' +
          (semResult.canonicalTags.length - canonLimit) +
          " więcej</span>";
      }
      html += "</div></div>";
    }

    if (totalCards > 0) {
      var sortedKeys = Object.keys(cardResults).sort(function (a, b) {
        var aTitle = cardResults[a].some(function (c) {
          return c.titleMatch;
        });
        var bTitle = cardResults[b].some(function (c) {
          return c.titleMatch;
        });
        if (aTitle && !bTitle) return -1;
        if (!aTitle && bTitle) return 1;
        return 0;
      });

      for (var ki = 0; ki < sortedKeys.length; ki++) {
        var resultTabKey = sortedKeys[ki];
        var modName = moduleNames[resultTabKey] || resultTabKey;
        var modColor = moduleColors[resultTabKey] || "#666";
        var items = cardResults[resultTabKey];
        html += '<div class="gs-results-group">';
        html +=
          '<div class="gs-results-header" style="color:' +
          modColor +
          '">' +
          modName +
          " — narzędzia (" +
          items.length +
          ")</div>";
        for (var ii = 0; ii < items.length; ii++) {
          var it = items[ii];
          html +=
            '<div class="gs-result" data-card-id="' +
            it.id +
            '" data-tab="' +
            resultTabKey +
            '">';
          html +=
            '<div class="gs-result-icon" style="background:' +
            modColor +
            '">' +
            modName.substring(0, 2) +
            "</div>";
          html +=
            '<div class="gs-result-body"><div class="gs-result-title">' +
            highlightText(it.name, q) +
            '</div><div class="gs-result-sub">' +
            it.sub +
            "</div></div>";
          html += "</div>";
        }
        html += "</div>";
      }
    }

    if (matchedModules.length === 0 && totalCards === 0) {
      if (html && html.indexOf("Może chodzi o") !== -1) {
        html =
          '<div class="gs-empty" style="padding:12px 16px;font-size:12.5px;color:#888;border-bottom:1px solid #eee;text-align:left">Brak dokładnych dopasowań dla „' +
          q +
          '” — wybierz najbliższe poniżej:</div>' +
          html;
      } else {
        html =
          '<div class="gs-empty">Brak wyników dla „' + q + "”</div>";
      }
    }

    gsResults.innerHTML = html;
    gsResults.classList.add("visible");
  }

  if (gs) {
    gs.addEventListener("input", function () {
      var q = this.value.toLowerCase().trim();
      if (clearBtn) clearBtn.classList.toggle("visible", !!this.value);
      clearTimeout(searchTimer);
      if (!q) {
        gsResults.classList.remove("visible");
        return;
      }
      searchTimer = setTimeout(function () {
        buildResults(q);
      }, 200);
    });
    gs.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        this.value = "";
        gsResults.classList.remove("visible");
        if (clearBtn) clearBtn.classList.remove("visible");
      }
    });
    gs.addEventListener("focus", function () {
      var q = this.value.toLowerCase().trim();
      buildResults(q);
    });
  }

  if (gsResults) {
    gsResults.addEventListener("click", function (e) {
      var suggestChip = e.target.closest(".gs-suggest-chip");
      if (suggestChip && gs) {
        gs.value = suggestChip.getAttribute("data-suggest") || "";
        if (clearBtn) clearBtn.classList.toggle("visible", !!gs.value);
        buildResults(gs.value.toLowerCase().trim());
        gs.focus();
        return;
      }
      var modLink = e.target.closest(".gs-result-module-link");
      if (modLink) {
        var tk = modLink.getAttribute("data-tab");
        if (tk && typeof window.goModule === "function") {
          gsResults.classList.remove("visible");
          if (gs) gs.value = "";
          if (clearBtn) clearBtn.classList.remove("visible");
          window.goModule(tk);
        }
        return;
      }
      var result = e.target.closest(".gs-result");
      if (!result) return;
      var cardId = result.getAttribute("data-card-id");
      var tabKey = result.getAttribute("data-tab");
      if (cardId && tabKey) {
        gsResults.classList.remove("visible");
        if (gs) gs.value = "";
        if (clearBtn) clearBtn.classList.remove("visible");
        goCard(tabKey, cardId);
      }
    });
  }

  document.addEventListener("click", function (e) {
    if (gsResults && !e.target.closest(".header-search")) {
      gsResults.classList.remove("visible");
    }
  });

  if (gs && clearBtn) {
    clearBtn.addEventListener("click", function () {
      gs.value = "";
      clearBtn.classList.remove("visible");
      gsResults.classList.remove("visible");
    });
  }
})();`;
}

function extractModuleFeatureStyles(source: string): string {
  const gadTab = source.match(/id="tab-gad"[\s\S]*?<\/style>/);
  const style = gadTab?.[0].match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
  return style.replace(/#tab-gad/g, ".tab-content");
}

function stripEmbeddedModuleStyles(html: string): string {
  return html.replace(/<style>[\s\S]*?<\/style>/gi, "");
}

/** Większe marginesy boczne w przewodnikach „Jak pracować z…”. */
const HOWTO_VIEW_LAYOUT_STYLES = `
.howto-view { padding-left: 40px !important; padding-right: 40px !important; }
.howto-view .hg-wrap { padding-left: 40px !important; padding-right: 40px !important; }
.howto-view .hg-section,
.howto-view .hg-phase {
  scroll-margin-top: 80px;
}
@media (max-width: 680px) {
  .howto-view { padding-left: 28px !important; padding-right: 28px !important; }
  .howto-view .hg-wrap { padding-left: 28px !important; padding-right: 28px !important; }
}
`;

const ACCOUNT_HEADER_BUTTON = `<button class="home-toggle" id="account-btn" type="button" title="Konto" aria-label="Zarządzanie kontem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></button>`;

const HEADER_USER_ACTIONS = `<div class="header-user-actions">${ACCOUNT_HEADER_BUTTON}</div>`;

const ACCOUNT_HEADER_STYLES = `
.header-user-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin-left: auto;
}
`;

const HOME_HEADER_SEARCH_STYLES = `
.header-inner {
  position: relative;
}
.header-inner .logo,
.header-inner .header-user-actions {
  position: relative;
  z-index: 1;
}
.header-inner .header-search {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  flex: none;
  width: min(340px, calc(100% - 220px));
  max-width: 340px;
  z-index: 2;
  overflow: visible;
}
.header-inner .header-search .gs-results {
  z-index: 300;
}
@media (max-width: 680px) {
  .header-inner .header-search {
    position: relative;
    left: auto;
    top: auto;
    transform: none;
    flex: 1 1 auto;
    width: auto;
    max-width: none;
  }
}
`;

const KOMPENDIUM_ACCOUNT_BTN_SCRIPT = `(function () {
  var btn = document.getElementById("account-btn");
  if (!btn || btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";
  btn.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    window.top.location.href = "/account";
  });
})();`;

// Mobile: zamiast pigułek kategorii — rozwijana lista (prototyp: moduł gad).
// Budowana z istniejących .lib-sb-filter (auto-mirror etykiet/liczników),
// podpięta pod libFilterSidebar (ta sama mechanika filtrowania).
const KOMPENDIUM_FILTER_DROPDOWN_SCRIPT = `(function () {
  function keyOf(f) {
    var oc = f.getAttribute("onclick") || "";
    var m = oc.match(/libFilterSidebar\\([^,]*,'([^']*)'/);
    return m ? m[1] : null;
  }
  function build(tab) {
    var lv = document.getElementById("library-view-" + tab);
    if (!lv) return;
    var filters = lv.querySelector(".lib-sb-filters");
    if (!filters || lv.querySelector(".lib-dd")) return;
    var els = Array.prototype.slice.call(filters.querySelectorAll(".lib-sb-filter"));
    if (!els.length) return;
    function lbl(f) { return (f.querySelector(".lib-sb-fname") || {}).textContent || ""; }
    function cnt(f) { return (f.querySelector(".lib-sb-fcount") || {}).textContent || ""; }
    var scope = lv.closest(".tab-content") || lv;
    function dotColor(f) {
      var key = keyOf(f);
      if (!key || key === "all") return "";
      var b = scope.querySelector('.card[data-m="' + key + '"] .badge');
      return b ? (b.style.color || "") : "";
    }
    var dd = document.createElement("div");
    dd.className = "lib-dd";
    var trig = document.createElement("button");
    trig.type = "button";
    trig.className = "lib-dd-trigger";
    trig.setAttribute("aria-haspopup", "listbox");
    trig.setAttribute("aria-expanded", "false");
    var dot = document.createElement("span"); dot.className = "lib-dd-dot";
    var cur = document.createElement("span"); cur.className = "lib-dd-current";
    var chev = document.createElement("span"); chev.className = "lib-dd-chev"; chev.textContent = "▾";
    trig.appendChild(dot); trig.appendChild(cur); trig.appendChild(chev);
    var menu = document.createElement("div");
    menu.className = "lib-dd-menu";
    menu.setAttribute("role", "listbox");
    function setCur(f) { cur.textContent = lbl(f); }
    var current = null;
    els.forEach(function (f) { if (f.classList.contains("active")) current = f; });
    if (!current) current = els[0];
    setCur(current);
    dot.style.background = dotColor(current);
    function closeMenu() { dd.classList.remove("open"); trig.setAttribute("aria-expanded", "false"); }
    els.forEach(function (f) {
      var key = keyOf(f);
      if (!key) return;
      var opt = document.createElement("button");
      opt.type = "button";
      opt.className = "lib-dd-opt" + (f === current ? " sel" : "");
      opt.setAttribute("role", "option");
      var la = document.createElement("span"); la.className = "lib-dd-label"; la.textContent = lbl(f);
      var co = document.createElement("span"); co.className = "lib-dd-count"; co.textContent = cnt(f);
      var ck = document.createElement("span"); ck.className = "lib-dd-check"; ck.textContent = "✓";
      opt.appendChild(la); opt.appendChild(co); opt.appendChild(ck);
      opt.addEventListener("click", function () {
        var prev = menu.querySelector(".lib-dd-opt.sel");
        if (prev) prev.classList.remove("sel");
        opt.classList.add("sel");
        setCur(f);
        dot.style.background = dotColor(f);
        closeMenu();
        if (window.libFilterSidebar) window.libFilterSidebar(tab, key, f);
      });
      menu.appendChild(opt);
    });
    trig.addEventListener("click", function (e) {
      e.stopPropagation();
      if (dd.classList.contains("open")) closeMenu();
      else { dd.classList.add("open"); trig.setAttribute("aria-expanded", "true"); }
    });
    document.addEventListener("click", function (e) { if (!dd.contains(e.target)) closeMenu(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
    dd.appendChild(trig); dd.appendChild(menu);
    filters.parentNode.insertBefore(dd, filters);
  }
  function init() { build("gad"); }
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();`;

function withAccountHeaderButton(header: string) {
  if (
    header.includes('class="header-user-actions"') ||
    header.includes('id="account-btn"')
  ) {
    return header;
  }

  const replaced = header.replace(
    /<button class="home-toggle" id="planner-btn"[\s\S]*?<\/button>\s*<button class="home-toggle" id="home-btn"[\s\S]*?<\/button>/,
    `<button class="home-toggle" id="planner-btn" title="Plan Terapii" onclick="window.openPlanner()" style="margin-right:6px">📋</button>
${HEADER_USER_ACTIONS}`
  );

  return replaced;
}

let cache: OriginalData | null = null;
let cacheSourceMtime = 0;
let sosFileIndexCache: Record<string, string> | null = null;
let handoutFileIndexCache: Record<string, string> | null = null;
let clinicianHandoutIndexCache: Record<string, string> | null = null;
let clinicianHandoutIndexMtime: number | null = null;
let printHandoutResolverCache: Record<string, PrintHandoutTarget> | null = null;
let printHandoutResolverMtime: number | null = null;
let printHandoutSkipCache: string[] = [];

type PrintHandoutTarget = { mod: string; file: string; ext?: string };

const sourcePath = path.join(process.cwd(), "kompendium.html");

async function loadJsonIndexFile(
  filePath: string,
  cache: Record<string, string> | null
): Promise<Record<string, string>> {
  if (cache) return cache;

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(raw) as { index?: Record<string, string> };
    return data.index ?? {};
  } catch {
    return {};
  }
}

async function loadSosFileIndex(): Promise<Record<string, string>> {
  if (sosFileIndexCache) return sosFileIndexCache;

  sosFileIndexCache = await loadJsonIndexFile(
    path.join(process.cwd(), "public/sos/sos-file-index.json"),
    sosFileIndexCache
  );
  return sosFileIndexCache;
}

function buildHandoutIndexExtensionScript(fileIndex: Record<string, string>) {
  return `(function () {
  var fileIndex = ${JSON.stringify(fileIndex)};
  window.HANDOUT_FILE_INDEX = fileIndex;
  window.HANDOUT_INDEX = window.HANDOUT_INDEX || {};
  for (var cid in fileIndex) {
    window.HANDOUT_INDEX[cid] = fileIndex[cid];
  }
})();`;
}

// Ukrywa przyciski "drukuj"/"wersja elektroniczna" dla narzędzi bez żadnego
// materiału (ani pliku print, ani SOS). Zestaw dostępności liczony z prawdy
// dyskowej po stronie serwera — gdy materiał powstanie i wejdzie do indeksu,
// przycisk wraca automatycznie. MutationObserver łapie przyciski renderowane
// dynamicznie (planer, picker).
function buildDeadButtonHiderScript(
  resolver: Record<string, PrintHandoutTarget>,
  handoutFiles: Record<string, string>,
  sosFiles: Record<string, string>
) {
  const available = Array.from(
    new Set([
      ...Object.keys(resolver),
      ...Object.keys(handoutFiles),
      ...Object.keys(sosFiles)
    ])
  );
  return `(function () {
  var AV = new Set(${JSON.stringify(available)});
  function cidFrom(el) {
    var oc = el.getAttribute("onclick") || "";
    var m = oc.match(/(?:openHandout|downloadStandaloneHandout)\\((["'])([^"']+)\\1/);
    return m ? m[2] : null;
  }
  function hasMaterial(id) {
    if (!id) return true;
    if (AV.has(id)) return true;
    try {
      if (typeof resolveCardId === "function") {
        var r = resolveCardId(id);
        if (r && AV.has(r)) return true;
      }
    } catch (e) {}
    return false;
  }
  function process(root) {
    if (!root || !root.querySelectorAll) return;
    var btns = root.querySelectorAll(
      '[onclick*="openHandout("], [onclick*="downloadStandaloneHandout("]'
    );
    for (var i = 0; i < btns.length; i++) {
      var el = btns[i];
      if (el.hasAttribute("data-material-checked")) continue;
      el.setAttribute("data-material-checked", "1");
      if (!hasMaterial(cidFrom(el))) el.style.display = "none";
    }
  }
  function start() {
    process(document);
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          if (added[j].nodeType === 1) process(added[j]);
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();`;
}

function toSkipObject(skip: string[]) {
  const o: Record<string, number> = {};
  for (const id of skip) o[id] = 1;
  return o;
}

function buildPrintHandoutResolverScript(resolver: Record<string, PrintHandoutTarget>) {
  return `(function () {
  window.PRINT_HANDOUT_RESOLVER = ${JSON.stringify(resolver)};
  window.PRINT_HANDOUT_SKIP = ${JSON.stringify(toSkipObject(printHandoutSkipCache))};
  fetch("/handouts/print-resolver.json", { credentials: "same-origin" })
    .then(function (resp) {
      return resp.ok ? resp.json() : null;
    })
    .then(function (data) {
      if (data && data.resolver) {
        window.PRINT_HANDOUT_RESOLVER = data.resolver;
      }
      if (data && data.skip) {
        var s = {};
        for (var i = 0; i < data.skip.length; i++) s[data.skip[i]] = 1;
        window.PRINT_HANDOUT_SKIP = s;
      }
    })
    .catch(function () {});
})();`;
}

async function loadPrintHandoutResolver(): Promise<Record<string, PrintHandoutTarget>> {
  const resolverPath = path.join(process.cwd(), "public/handouts/print-resolver.json");

  try {
    const stat = await fs.stat(resolverPath);
    if (
      printHandoutResolverCache &&
      printHandoutResolverMtime === stat.mtimeMs
    ) {
      return printHandoutResolverCache;
    }

    const raw = await fs.readFile(resolverPath, "utf8");
    const data = JSON.parse(raw) as { resolver?: Record<string, PrintHandoutTarget>; skip?: string[] };
    printHandoutResolverCache = data.resolver ?? {};
    printHandoutSkipCache = data.skip ?? [];
    printHandoutResolverMtime = stat.mtimeMs;
  } catch {
    if (!printHandoutResolverCache) {
      printHandoutResolverCache = {};
    }
  }

  return printHandoutResolverCache;
}

async function loadHandoutFileIndex(): Promise<Record<string, string>> {
  if (handoutFileIndexCache) return handoutFileIndexCache;

  handoutFileIndexCache = await loadJsonIndexFile(
    path.join(process.cwd(), "public/handouts/handout-file-index.json"),
    handoutFileIndexCache
  );
  return handoutFileIndexCache;
}

async function loadClinicianHandoutIndex(): Promise<Record<string, string>> {
  const filePath = path.join(process.cwd(), "public/handouts/clinician-handout-index.json");
  try {
    const stat = await fs.stat(filePath);
    if (
      clinicianHandoutIndexCache &&
      clinicianHandoutIndexMtime === stat.mtimeMs
    ) {
      return clinicianHandoutIndexCache;
    }
    clinicianHandoutIndexMtime = stat.mtimeMs;
    clinicianHandoutIndexCache = await loadJsonIndexFile(filePath, null);
  } catch {
    if (!clinicianHandoutIndexCache) {
      clinicianHandoutIndexCache = {};
    }
  }

  return clinicianHandoutIndexCache;
}

function buildClinicianHandoutIndexScript(fileIndex: Record<string, string>) {
  return `(function () {
  window.CLINICIAN_HANDOUT_INDEX = ${JSON.stringify(fileIndex)};
})();`;
}

function buildSosIndexExtensionScript(fileIndex: Record<string, string>) {
  return `(function () {
  var fileIndex = ${JSON.stringify(fileIndex)};
  window.SOS_INDEX = window.SOS_INDEX || {};
  for (var cid in fileIndex) {
    window.SOS_INDEX[cid] = fileIndex[cid];
  }
})();`;
}

const stripTags = (value: string) =>
  value
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

type ToolCardEntry = { id: string; name: string; sub: string };

type ModuleToolsCatalog = {
  slug: string;
  label: string;
  keywords: string[];
  cardCount: number;
  handouts: ToolCardEntry[];
  sos: ToolCardEntry[];
  howto: { label: string } | null;
};

function extractHowtoInfo(html: string, slug: string): { label: string } | null {
  if (!html.includes(`howto-view-${slug}`)) return null;

  const btnMatch =
    html.match(
      new RegExp(
        `id="${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-howto-btn"[^>]*>[\\s\\S]*?<span>([^<]+)<\\/span>`,
        "i"
      )
    ) ?? html.match(/class="gad-howto-cta"[^>]*>[\s\S]*?<span>(Jak pracować[^<]*)<\/span>/i);

  if (btnMatch?.[1]) {
    return { label: stripTags(btnMatch[1]) };
  }

  const h1Match = html.match(
    new RegExp(
      `id="howto-view-${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]*?<h1>([\\s\\S]*?)<\\/h1>`,
      "i"
    )
  );
  if (h1Match?.[1]) {
    return { label: stripTags(h1Match[1]) };
  }

  return { label: "Jak pracować — " + slug };
}

function extractCardInfo(cardHtml: string, cid: string): { name: string; sub: string } {
  const nameMatch =
    cardHtml.match(/class="nm"[^>]*>([\s\S]*?)<\//i) ??
    cardHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) ??
    cardHtml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
  const subMatch = cardHtml.match(/class="sub"[^>]*>([\s\S]*?)<\//i);
  return {
    name: stripTags(nameMatch?.[1] ?? cid),
    sub: subMatch ? stripTags(subMatch[1]) : ""
  };
}

const PRINT_HANDOUTS_ROOT = path.join(process.cwd(), "public/handouts/print");

function printHandoutFileExists(mod: string, basename: string): boolean {
  const modDir = path.join(PRINT_HANDOUTS_ROOT, mod);
  return (
    existsSync(path.join(modDir, `${basename}.html`)) ||
    existsSync(path.join(modDir, `${basename}.pdf`))
  );
}

function canOpenPrintHandout(
  cid: string,
  modSlug: string,
  printResolver: Record<string, PrintHandoutTarget>,
  handoutIndex: Record<string, string>
): boolean {
  const resolved = printResolver[cid];
  if (resolved && printHandoutFileExists(resolved.mod, resolved.file)) {
    return true;
  }

  const modFromIndex = handoutIndex[cid];
  if (modFromIndex && printHandoutFileExists(modFromIndex, cid)) {
    return true;
  }

  const prefixed = `${modSlug}-${cid}`;
  const modFromPrefixed = handoutIndex[prefixed];
  if (modFromPrefixed && printHandoutFileExists(modFromPrefixed, prefixed)) {
    return true;
  }

  return false;
}

function buildToolsCatalog(
  modules: OriginalModule[],
  sosIndex: Record<string, string>,
  handoutIndex: Record<string, string>,
  printResolver: Record<string, PrintHandoutTarget>
): ModuleToolsCatalog[] {
  return modules
    .filter((mod) => mod.slug !== "plany")
    .map((mod) => {
      const handouts: ToolCardEntry[] = [];
      const sos: ToolCardEntry[] = [];
      let cardCount = 0;

      const cardRegex =
        /<details[^>]*\bclass="[^"]*\bcard\b[^"]*"[^>]*\bid="([^"]+)"[\s\S]*?<\/details>/gi;
      for (const match of mod.html.matchAll(cardRegex)) {
        cardCount++;
        const cid = match[1];
        const cardHtml = match[0];
        const info = extractCardInfo(cardHtml, cid);

        const hasHandout = canOpenPrintHandout(
          cid,
          mod.slug,
          printResolver,
          handoutIndex
        );

        const hasSos = cid in sosIndex;

        if (hasHandout) handouts.push({ id: cid, ...info });
        if (hasSos) sos.push({ id: cid, ...info });
      }

      return {
        slug: mod.slug,
        label: mod.title,
        keywords: buildModuleSearchKeywords(mod.slug, mod.title),
        cardCount,
        handouts,
        sos,
        howto: extractHowtoInfo(mod.html, mod.slug)
      };
    });
}

const TOOLS_BROWSER_MODAL = `<div class="modal-bg" id="toolsBrowserModal" style="display:none;align-items:flex-start;justify-content:center;padding-top:40px">
<div class="modal" style="max-width:720px;width:calc(100% - 32px);max-height:80vh;display:flex;flex-direction:column">
<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
<div id="toolsBrowserIcon" style="width:42px;height:42px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">📄</div>
<div style="flex:1;min-width:0">
<h3 id="toolsBrowserTitle" style="margin:0;font-size:18px;letter-spacing:-.2px">Handouty do druku</h3>
<div id="toolsBrowserSubtitle" style="font-size:12.5px;color:var(--muted);margin-top:2px">1,898 arkuszy do druku · grupowane po modułach</div>
</div>
<button onclick="closeToolsBrowser()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--muted);padding:6px;line-height:1" aria-label="Zamknij">✕</button>
</div>
<input type="text" id="toolsBrowserSearch" placeholder="Filtruj po nazwie modułu lub narzędzia…" oninput="renderToolsBrowserList()" style="width:100%;padding:10px 14px;border:1px solid var(--border);background:var(--card);border-radius:10px;font-size:13.5px;color:var(--text);font-family:inherit;margin-bottom:12px">
<div id="toolsBrowserList" style="flex:1;overflow-y:auto;padding-right:4px"></div>
</div>
</div>`;

function buildHomeToolsBrowserScript(
  catalog: ModuleToolsCatalog[],
  counts: { handouts: number; sos: number; modules: number; pathways: number }
) {
  const handoutTotal = catalog.reduce((sum, mod) => sum + mod.handouts.length, 0);
  const sosTotal = catalog.reduce((sum, mod) => sum + mod.sos.length, 0);
  const pathwayTotal = catalog.filter((mod) => mod.howto).length;

  return `(function () {
  var _toolsBrowserType = null;
  var _toolsBrowserResume = null;
  var _catalog = ${JSON.stringify(catalog)};
  var _counts = {
    handouts: ${counts.handouts || handoutTotal},
    sos: ${counts.sos || sosTotal},
    modules: ${counts.modules || catalog.length},
    pathways: ${counts.pathways || pathwayTotal}
  };

  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtCount(value) {
    return Number(value).toLocaleString("en-US");
  }

  function hideToolsBrowserForPreview(groupLabel, toolId) {
    var modal = document.getElementById("toolsBrowserModal");
    var searchEl = document.getElementById("toolsBrowserSearch");
    var listEl = document.getElementById("toolsBrowserList");
    if (!modal || modal.style.display !== "flex") return;
    _toolsBrowserResume = {
      type: _toolsBrowserType,
      query: searchEl ? searchEl.value : "",
      scrollTop: listEl ? listEl.scrollTop : 0,
      openGroupLabel: groupLabel || "",
      toolId: toolId || ""
    };
    modal.style.display = "none";
  }

  function reopenToolsBrowserGroup(listEl, groupLabel, toolId) {
    if (!listEl || !groupLabel) return;
    var groups = listEl.querySelectorAll("details[data-group-label]");
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].getAttribute("data-group-label") === groupLabel) {
        groups[i].setAttribute("open", "");
        if (toolId) {
          var rows = groups[i].querySelectorAll(".tb-tool-row[data-tool-id]");
          for (var j = 0; j < rows.length; j++) {
            if (rows[j].getAttribute("data-tool-id") === toolId) {
              rows[j].scrollIntoView({ block: "nearest" });
              break;
            }
          }
        }
        break;
      }
    }
  }

  window.restoreToolsBrowserIfNeeded = function () {
    if (!_toolsBrowserResume) return false;
    var state = _toolsBrowserResume;
    _toolsBrowserResume = null;
    _toolsBrowserType = state.type;
    var modal = document.getElementById("toolsBrowserModal");
    var searchEl = document.getElementById("toolsBrowserSearch");
    var listEl = document.getElementById("toolsBrowserList");
    if (!modal) return false;
    if (searchEl) searchEl.value = state.query;
    window.renderToolsBrowserList();
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
    if (listEl) {
      requestAnimationFrame(function () {
        reopenToolsBrowserGroup(listEl, state.openGroupLabel, state.toolId);
        listEl.scrollTop = state.scrollTop;
      });
    }
    if (window.refreshHomeChrome) window.refreshHomeChrome();
    return true;
  };

  window.openToolFromToolsBrowser = function (type, id, groupLabel) {
    if (!id) return;
    _toolsBrowserType = type;
    hideToolsBrowserForPreview(groupLabel, id);
    if (type === "handout" && typeof window.openHandout === "function") {
      window.openHandout(id);
    } else if (type === "sos" && typeof window.openSOS === "function") {
      window.openSOS(id);
    }
    if (window.refreshHomeChrome) window.refreshHomeChrome();
  };

  window.openToolsBrowser = function (type) {
    _toolsBrowserType = type;
    _toolsBrowserResume = null;
    var modal = document.getElementById("toolsBrowserModal");
    var titleEl = document.getElementById("toolsBrowserTitle");
    var subtitleEl = document.getElementById("toolsBrowserSubtitle");
    var iconEl = document.getElementById("toolsBrowserIcon");
    var searchEl = document.getElementById("toolsBrowserSearch");
    if (!modal || !titleEl || !subtitleEl || !iconEl || !searchEl) return;

    if (type === "handout") {
      titleEl.textContent = "Handouty do druku";
      subtitleEl.textContent =
        fmtCount(_counts.handouts) + " arkuszy do druku · grupowane po modułach";
      iconEl.innerHTML = "📄";
      iconEl.style.background = "linear-gradient(135deg,var(--golden),var(--golden-deep))";
      iconEl.style.color = "#5a3a1a";
    } else if (type === "sos") {
      titleEl.textContent = "Wersje elektroniczne";
      subtitleEl.textContent =
        fmtCount(_counts.sos) + " interaktywnych narzędzi · grupowane po modułach";
      iconEl.innerHTML = "📱";
      iconEl.style.background = "linear-gradient(135deg,var(--lavender),var(--lavender-deep))";
      iconEl.style.color = "#2d1c44";
    } else if (type === "pathway") {
      titleEl.textContent = "Przewodniki kliniczne";
      subtitleEl.textContent =
        _counts.pathways + " przewodników „Jak pracować z…” · protokoły krok po kroku";
      iconEl.innerHTML = "🛤️";
      iconEl.style.background = "linear-gradient(135deg,#a8c9b8,#6e9d88)";
      iconEl.style.color = "#1f4a36";
    }

    searchEl.value = "";
    searchEl.placeholder =
      type === "pathway"
        ? "Filtruj po nazwie przewodnika lub modułu…"
        : "Filtruj po nazwie modułu lub narzędzia…";
    window.renderToolsBrowserList();
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
    if (window.refreshHomeChrome) window.refreshHomeChrome();
  };

  window.closeToolsBrowser = function () {
    _toolsBrowserResume = null;
    var modal = document.getElementById("toolsBrowserModal");
    if (modal) modal.style.display = "none";
    document.body.style.overflow = "";
    if (window.refreshHomeChrome) window.refreshHomeChrome();
  };

  function normalizeSearch(value) {
    return String(value)
      .normalize("NFD")
      .replace(/\\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9\\s]/g, " ")
      .replace(/\\s+/g, " ")
      .trim();
  }

  function moduleMatchesQuery(mod, query) {
    if (!query || !mod) return false;
    if (normalizeSearch(mod.label).indexOf(query) !== -1) return true;
    if (mod.slug.indexOf(query) !== -1) return true;
    if (
      mod.howto &&
      mod.howto.label &&
      normalizeSearch(mod.howto.label).indexOf(query) !== -1
    ) {
      return true;
    }
    if (
      mod.keywords &&
      mod.keywords.some(function (keyword) {
        return keyword.indexOf(query) !== -1 || query.indexOf(keyword) !== -1;
      })
    ) {
      return true;
    }
    return false;
  }

  var modBySlug = {};
  _catalog.forEach(function (mod) {
    modBySlug[mod.slug] = mod;
  });

  window.renderToolsBrowserList = function () {
    var listEl = document.getElementById("toolsBrowserList");
    var searchEl = document.getElementById("toolsBrowserSearch");
    if (!listEl || !searchEl) return;

    var q = normalizeSearch(searchEl.value || "");
    var type = _toolsBrowserType;

    if (type === "pathway") {
      var items = _catalog
        .filter(function (mod) {
          return mod.howto;
        })
        .map(function (mod) {
          return {
            key: mod.slug,
            label: mod.howto.label,
            moduleLabel: mod.label
          };
        });
      var filteredPath = q
        ? items.filter(function (item) {
            var mod = modBySlug[item.key];
            if (moduleMatchesQuery(mod, q)) return true;
            return (
              normalizeSearch(item.label).indexOf(q) !== -1 ||
              normalizeSearch(item.moduleLabel).indexOf(q) !== -1
            );
          })
        : items;

      if (filteredPath.length === 0) {
        listEl.innerHTML =
          '<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px">Brak przewodników pasujących do filtra.</div>';
        return;
      }

      listEl.innerHTML = filteredPath
        .map(function (item) {
          return (
            '<button type="button" data-module-slug="' +
            esc(item.key) +
            '" class="tb-row tb-path-row" style="display:flex;align-items:center;gap:12px;width:100%;padding:10px 12px;border:none;background:rgba(255,255,255,0.5);border-radius:8px;cursor:pointer;font-family:inherit;text-align:left;margin-bottom:4px;transition:background .15s">' +
            '<div style="width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#a8c9b8,#6e9d88);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">📘</div>' +
            '<div style="flex:1;min-width:0">' +
            '<div style="font-size:13.5px;color:var(--text);font-weight:500;line-height:1.3">' +
            esc(item.label) +
            "</div>" +
            '<div style="font-size:11.5px;color:var(--muted);margin-top:2px;line-height:1.3">' +
            esc(item.moduleLabel) +
            "</div>" +
            "</div>" +
            '<div style="font-size:14px;color:var(--plum)">→</div>' +
            "</button>"
          );
        })
        .join("");
      return;
    }

    var cards = [];
    _catalog.forEach(function (mod) {
      var source = type === "handout" ? mod.handouts : mod.sos;
      source.forEach(function (card) {
        cards.push({
          id: card.id,
          name: card.name,
          sub: card.sub,
          tabKey: mod.slug,
          tabLabel: mod.label
        });
      });
    });

    var grouped = {};
    cards.forEach(function (card) {
      var lbl = card.tabLabel || card.tabKey;
      if (!grouped[lbl]) grouped[lbl] = { key: card.tabKey, cards: [] };
      grouped[lbl].cards.push(card);
    });

    var filteredGroups = {};
    if (q) {
      Object.keys(grouped).forEach(function (lbl) {
        var group = grouped[lbl];
        var mod = modBySlug[group.key];
        var matchingCards = moduleMatchesQuery(mod, q)
          ? group.cards
          : group.cards.filter(function (card) {
              var hay = normalizeSearch(
                [card.name, card.sub, card.id, lbl, card.tabKey].join(" ")
              );
              return hay.indexOf(q) !== -1;
            });
        if (matchingCards.length > 0) {
          filteredGroups[lbl] = { key: group.key, cards: matchingCards };
        }
      });
    } else {
      Object.assign(filteredGroups, grouped);
    }

    var totalShown = Object.values(filteredGroups).reduce(function (sum, group) {
      return sum + group.cards.length;
    }, 0);

    if (totalShown === 0) {
      listEl.innerHTML =
        '<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px">Brak wyników. Spróbuj innego filtra.</div>';
      return;
    }

    var html =
      '<div style="font-size:11.5px;color:var(--muted);margin-bottom:10px">Pokazano ' +
      totalShown +
      " narzędzi w " +
      Object.keys(filteredGroups).length +
      " modułach</div>";

    Object.keys(filteredGroups)
      .sort()
      .forEach(function (lbl) {
        var group = filteredGroups[lbl];
        html +=
          '<details ' +
          (q ? "open" : "") +
          ' data-group-label="' +
          esc(lbl) +
          '" style="margin-bottom:8px;border:0.5px solid var(--border);border-radius:10px;background:rgba(255,255,255,0.5);overflow:hidden">';
        html +=
          '<summary style="padding:10px 14px;cursor:pointer;font-size:13px;font-weight:500;color:var(--text);display:flex;align-items:center;gap:8px;list-style:none">';
        html += '<span style="flex:1">' + esc(lbl) + "</span>";
        html +=
          '<span style="font-size:11.5px;color:var(--muted);font-weight:400">' +
          group.cards.length +
          (type === "handout" ? " handoutów" : " narzędzi") +
          "</span>";
        html += '<span style="font-size:12px;color:var(--muted)">▾</span>';
        html += "</summary>";
        html += '<div style="padding:4px 8px 8px">';
        group.cards.forEach(function (card) {
          html +=
            '<button type="button" data-tool-id="' +
            esc(card.id) +
            '" class="tb-tool-row" style="display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border:none;background:transparent;border-radius:6px;cursor:pointer;font-family:inherit;text-align:left;transition:background .15s" onmouseover="this.style.background=\\'rgba(139,90,60,0.06)\\'" onmouseout="this.style.background=\\'transparent\\'">';
          html += '<div style="flex:1;min-width:0">';
          html +=
            '<div style="font-size:13px;color:var(--text);font-weight:500;line-height:1.3">' +
            esc(card.name) +
            "</div>";
          if (card.sub) {
            html +=
              '<div style="font-size:11.5px;color:var(--muted);margin-top:2px;line-height:1.3">' +
              esc(card.sub) +
              "</div>";
          }
          html += "</div>";
          html +=
            '<div style="font-size:12px;color:' +
            (type === "handout" ? "var(--golden-deep)" : "var(--lavender-deep)") +
            ';font-weight:600;flex-shrink:0">' +
            (type === "handout" ? "🖨️" : "📱") +
            "</div>";
          html += "</button>";
        });
        html += "</div></details>";
      });

    listEl.innerHTML = html;
  };

  document.addEventListener("click", function (event) {
    var modal = document.getElementById("toolsBrowserModal");
    if (modal && event.target === modal) window.closeToolsBrowser();
  });

  var toolsListEl = document.getElementById("toolsBrowserList");
  if (toolsListEl && toolsListEl.dataset.bound !== "1") {
    toolsListEl.dataset.bound = "1";
    toolsListEl.addEventListener("click", function (event) {
      var toolBtn = event.target.closest(".tb-tool-row");
      if (toolBtn) {
        event.preventDefault();
        event.stopPropagation();
        var toolId = toolBtn.getAttribute("data-tool-id");
        var detailsEl = toolBtn.closest("details[data-group-label]");
        var groupLabel = detailsEl
          ? detailsEl.getAttribute("data-group-label")
          : "";
        if (toolId && _toolsBrowserType) {
          window.openToolFromToolsBrowser(_toolsBrowserType, toolId, groupLabel);
        }
        return;
      }
      var pathBtn = event.target.closest(".tb-path-row");
      if (pathBtn) {
        event.preventDefault();
        event.stopPropagation();
        var slug = pathBtn.getAttribute("data-module-slug");
        window.closeToolsBrowser();
        setTimeout(function () {
          if (_toolsBrowserType === "pathway" && typeof window.goModuleHowto === "function") {
            window.goModuleHowto(slug);
          } else {
            window.goModule(slug);
          }
        }, 80);
      }
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && typeof window.handleHomeBack === "function") {
      window.handleHomeBack(event);
    }
  });
})();`;
}

async function loadOriginalData(): Promise<OriginalData> {
  if (!existsSync(sourcePath)) {
    throw new Error(`Missing kompendium source file: ${sourcePath}`);
  }

  const sourceMtime = (await fs.stat(sourcePath)).mtimeMs;
  if (cache && cacheSourceMtime === sourceMtime) return cache;

  cache = null;
  cacheSourceMtime = sourceMtime;

  const source = await fs.readFile(sourcePath, "utf8");
  const style = source.match(/<style>([\s\S]*?)<\/style>/i)?.[1] ?? "";
  const moduleFeatureStyles = extractModuleFeatureStyles(source);
  const handoutStart = source.indexOf("// === HANDOUT SYSTEM ===");
  const printDocStart = source.indexOf("function printDoc(");
  const handoutBlockStart =
    printDocStart !== -1 &&
    handoutStart !== -1 &&
    printDocStart < handoutStart
      ? printDocStart
      : handoutStart;
  const handoutBlockEnd =
    handoutBlockStart === -1 ? -1 : source.indexOf("</script>", handoutBlockStart);
  const handoutScriptRaw =
    handoutBlockStart !== -1 && handoutBlockEnd !== -1
      ? source.slice(handoutBlockStart, handoutBlockEnd).trim()
      : "";
  const handoutScript = handoutScriptRaw
    .replace(
      "return 'sos/' + mod + '/' + cardId + '.html';",
      "return '/sos/' + mod + '/' + cardId + '.html';"
    )
    .replace(
      "return 'handouts/' + mod + '/' + cid + '.json';",
      "return '/handouts/legacy/' + mod + '/' + cid + '.json';"
    );
  const handoutOverlay =
    source.match(
      /(<div id="handout-overlay"[\s\S]*?<\/div>\s*\n\s*<!-- SOS Modal -->[\s\S]*?<iframe id="sos-iframe"[\s\S]*?<\/iframe>\s*<\/div>\s*<\/div>)/
    )?.[1] ??
    source.match(/(<div id="handout-overlay"[\s\S]*?<div id="handout-content"[\s\S]*?<\/div>\s*<\/div>)/i)?.[1] ??
    "";

  const modules: OriginalModule[] = [];
  const moduleRegex =
    /<div class="tab-content"[^>]*id="tab-([^"]+)"[\s\S]*?(?=<div class="tab-content"|<button class="scroll-top"|<\/body>)/g;

  for (const match of source.matchAll(moduleRegex)) {
    const slug = match[1];
    const html =
      slug === "plany" ? extractTabContentHtml(source, slug) : match[0];
    const title = stripTags(html.match(/<h2>([\s\S]*?)<\/h2>/i)?.[1] ?? slug);
    const subtitle = stripTags(html.match(/<span class="tab-subtitle">([\s\S]*?)<\/span>/i)?.[1] ?? "");

    modules.push({
      slug,
      title,
      subtitle,
      html: stripEmbeddedModuleStyles(html)
    });
  }

  const headerStart = source.indexOf('<header class="header"');
  const headerEnd = headerStart === -1 ? -1 : source.indexOf("</header>", headerStart);
  const header =
    headerStart !== -1 && headerEnd !== -1
      ? source.slice(headerStart, headerEnd + "</header>".length)
      : "";

  const homeStart = source.indexOf('<div class="home-screen" id="home-screen"');
  const scrollTopStart = homeStart === -1 ? -1 : source.indexOf('<button class="scroll-top"', homeStart);
  const homeScreen =
    homeStart !== -1 && scrollTopStart !== -1
      ? source.slice(homeStart, scrollTopStart).trim()
      : "";

  const moduleUiStart = source.indexOf("window.switchModuleMode=function");
  const moduleUiScript =
    moduleUiStart === -1
      ? ""
      : (() => {
          const scriptOpen = source.lastIndexOf("<script>", moduleUiStart);
          const scriptClose = source.indexOf("</script>", moduleUiStart);
          if (scriptOpen === -1 || scriptClose === -1) return "";
          const first = source.slice(scriptOpen + "<script>".length, scriptClose).trim();
          const libStart = source.indexOf("window.libFilterSidebar", scriptClose);
          if (libStart === -1) return first;
          const scriptOpen2 = source.lastIndexOf("<script>", libStart);
          const scriptClose2 = source.indexOf("</script>", libStart);
          if (scriptOpen2 === -1 || scriptClose2 === -1) return first;
          const second = source.slice(scriptOpen2 + "<script>".length, scriptClose2).trim();
          return first + "\n" + second;
        })();

  const semanticStart = source.indexOf("// === SEMANTIC SEARCH");
  const semanticEnd = source.indexOf("// === END SEMANTIC SEARCH");
  const semanticSearchScript =
    semanticStart !== -1 && semanticEnd !== -1
      ? source.slice(semanticStart, semanticEnd + "// === END SEMANTIC SEARCH".length).trim()
      : "";

  const navBar = extractNavBar(source);
  const plannerGlobalElements = extractPlannerGlobalElements(source);
  const plannerScript = extractPlannerScript(source);

  cache = {
    style,
    moduleFeatureStyles,
    header,
    navBar,
    homeScreen,
    handoutScript,
    moduleUiScript,
    handoutOverlay,
    semanticSearchScript,
    moduleSearchData: extractJsVarObject(source, "moduleSearchData"),
    moduleNames: extractJsVarObject(source, "moduleNames"),
    moduleColors: extractJsVarObject(source, "moduleColors"),
    plannerGlobalElements,
    plannerScript,
    modules
  };
  return cache;
}

const KOMPENDIUM_HOME_BRIDGE_SCRIPT = `(function () {
  var HOME_SCROLL_KEY = ${JSON.stringify(KOMPENDIUM_HOME_SCROLL_KEY)};
  var PENDING_HOWTO_KEY = ${JSON.stringify(KOMPENDIUM_PENDING_HOWTO_KEY)};

  function saveHomeScroll() {
    try {
      window.top.sessionStorage.setItem(HOME_SCROLL_KEY, String(window.scrollY || 0));
    } catch (e) {}
  }

  function goModule(slug) {
    if (!slug) return;
    saveHomeScroll();
    window.top.location.href = "/modules/" + encodeURIComponent(slug);
  }

  function goModuleHowto(slug) {
    if (!slug) return;
    saveHomeScroll();
    try {
      window.top.sessionStorage.setItem(
        PENDING_HOWTO_KEY,
        JSON.stringify({ slug: slug, mode: "howto", fromHome: true })
      );
    } catch (e) {}
    window.top.location.href = "/modules/" + encodeURIComponent(slug);
  }

  window.goModule = goModule;
  window.goModuleHowto = goModuleHowto;

  document.querySelectorAll(".home-btn[data-tab]").forEach(function (btn) {
    btn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      goModule(btn.getAttribute("data-tab"));
    });
  });

  window.openPlanner = function () {
    window.top.location.href = "/plany";
  };

  var logo = document.querySelector(".logo");
  if (logo) {
    logo.style.cursor = "pointer";
    logo.setAttribute("role", "button");
    logo.setAttribute("tabindex", "0");
    logo.title = "Strona główna";
    logo.setAttribute("aria-label", "Strona główna");
    logo.addEventListener("click", function () {
      window.top.location.href = "/";
    });
    logo.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        window.top.location.href = "/";
      }
    });
  }

  var homeBtn = document.getElementById("home-btn");
  if (homeBtn) {
    homeBtn.addEventListener("click", function () {
      window.top.location.href = "/";
    });
  }

  var backBtn = document.getElementById("back-btn");
  if (backBtn && backBtn.dataset.homeBound !== "1") {
    backBtn.dataset.homeBound = "1";
    backBtn.style.display = "none";
  }

  function isHandoutOpen() {
    var ov = document.getElementById("handout-overlay");
    if (!ov) return false;
    return (
      ov.classList.contains("ho-file-mode") ||
      ov.style.display === "flex" ||
      getComputedStyle(ov).display === "flex"
    );
  }

  function isSosOpen() {
    var sos = document.getElementById("sos-modal-bg");
    return !!(sos && sos.classList.contains("active"));
  }

  function isToolsBrowserOpen() {
    var modal = document.getElementById("toolsBrowserModal");
    return !!(modal && modal.style.display === "flex");
  }

  function refreshHomeChrome() {
    if (!backBtn) return;
    var show = isHandoutOpen() || isSosOpen() || isToolsBrowserOpen();
    backBtn.style.display = show ? "" : "none";
    backBtn.classList.toggle("visible", show);
  }

  window.refreshHomeChrome = refreshHomeChrome;

  function handleHomeBack(event) {
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    if (isHandoutOpen() && typeof window.closeHandout === "function") {
      window.closeHandout();
      return;
    }
    if (isSosOpen() && typeof window.closeSOS === "function") {
      window.closeSOS();
      return;
    }
    if (isToolsBrowserOpen() && typeof window.closeToolsBrowser === "function") {
      window.closeToolsBrowser();
    }
  }

  window.handleHomeBack = handleHomeBack;

  if (backBtn) {
    backBtn.addEventListener("click", handleHomeBack, true);
  }
})();`;

const PLANNER_LIST_LAYOUT_STYLES = `
.planner-route-list #tab-plany .main { display: none !important; }
.planner-route-list #tab-plany .container {
  grid-template-columns: 1fr;
  max-width: 720px;
}
.planner-route-list body.viewing-client #tab-plany .main { display: none !important; }
`;

const PLANNER_CLIENT_LAYOUT_STYLES = `
.planner-route-client #tab-plany .sidebar { display: none !important; }
.planner-route-client #tab-plany .container { grid-template-columns: 1fr; }
.planner-route-client #tab-plany .main { display: flex !important; }
`;

const PLANNER_TOOL_PICKER_STYLES = `
#toolPickerModal .modal {
  height: min(92dvh, 920px) !important;
  max-height: 92dvh !important;
}
#toolPickerModal .tool-picker-tabs {
  flex: 0 1 auto !important;
  max-height: 128px !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
}
#toolPickerModal .tool-picker-list {
  flex: 1 1 0 !important;
  min-height: 0 !important;
  max-height: none !important;
}
`;

type PlannerDocumentView = "list" | "client";

type PlannerDocumentOptions = {
  view?: PlannerDocumentView;
  clientIndex?: number;
};

function sanitizePlannerScript(script: string): string {
  return script.replace(
    /if \(document\.readyState === 'loading'\) \{\s*document\.addEventListener\('DOMContentLoaded', plannerInit\);\s*\} else \{\s*plannerInit\(\);\s*\}\s*/,
    ""
  );
}

function buildPlannerBridgeScript(options: PlannerDocumentOptions): string {
  const view = options.view ?? "list";
  const clientIndex =
    view === "client" && typeof options.clientIndex === "number"
      ? options.clientIndex
      : null;

  return `(function () {
  var ROUTE_VIEW = ${JSON.stringify(view)};
  var ROUTE_CLIENT_INDEX = ${clientIndex === null ? "null" : String(clientIndex)};

  function goHome() {
    window.top.location.href = "/";
  }

  function goClientList() {
    window.top.location.href = "/plany";
  }

  function goClientPage(idx) {
    window.top.location.href = "/plany/" + idx;
  }

  window.openPlanner = function () {
    window._returnToPlannerCtx = null;
    document.querySelectorAll(".tab-content").forEach(function (tab) {
      tab.classList.remove("active");
      tab.style.display = "none";
    });
    var plannerTab = document.getElementById("tab-plany");
    if (plannerTab) {
      plannerTab.classList.add("active");
      plannerTab.style.display = "block";
    }
    document.documentElement.style.setProperty("--accent", "#4a6347");
    var navBar = document.getElementById("nav-bar");
    if (navBar) navBar.style.display = "none";
    var backBtn = document.getElementById("back-btn");
    if (backBtn && !window._returnToPlannerCtx) backBtn.classList.add("visible");
    document.body.classList.remove("viewing-client");
    window.scrollTo(0, 0);
    if (ROUTE_VIEW === "client" && ROUTE_CLIENT_INDEX !== null) {
      if (typeof window.__nativeSelectClient === "function") {
        window.__nativeSelectClient(ROUTE_CLIENT_INDEX);
      }
    } else if (typeof window.__nativePlannerInit === "function") {
      window.__nativePlannerInit();
    }
  };

  function installRouteHooks() {
    if (typeof selectClient === "function" && !window.__nativeSelectClient) {
      window.__nativeSelectClient = selectClient;
      window.selectClient = function (idx) {
        if (ROUTE_VIEW === "list") {
          goClientPage(idx);
          return;
        }
        window.__nativeSelectClient(idx);
      };
    }

    if (typeof plannerInit === "function" && !window.__nativePlannerInit) {
      window.__nativePlannerInit = plannerInit;
      window.plannerInit = function () {
        if (!document.getElementById("clientList")) return;
        if (typeof ensureAllClientsCounters === "function") ensureAllClientsCounters();
        if (typeof renderClientList === "function") renderClientList();
        if (typeof updatePlannerHomeCounts === "function") updatePlannerHomeCounts();
        if (ROUTE_VIEW === "client") {
          if (
            ROUTE_CLIENT_INDEX === null ||
            !db.clients ||
            !db.clients[ROUTE_CLIENT_INDEX]
          ) {
            goClientList();
            return;
          }
          window.__nativeSelectClient(ROUTE_CLIENT_INDEX);
          return;
        }
      };
    }

    if (typeof goBackToList === "function") {
      window.goBackToList = goClientList;
    }

    if (typeof deleteClient === "function" && !window.__nativeDeleteClient) {
      window.__nativeDeleteClient = deleteClient;
      window.deleteClient = async function () {
        await window.__nativeDeleteClient();
        if (ROUTE_VIEW === "client") goClientList();
      };
    }
  }

  var backBtn = document.getElementById("back-btn");
  var homeBtn = document.getElementById("home-btn");
  var logo = document.querySelector(".logo");

  if (backBtn) {
    backBtn.addEventListener(
      "click",
      function (event) {
        if (window._returnToPlannerCtx) return;
        var moduleTab = document.querySelector(".tab-content.active:not(#tab-plany)");
        if (moduleTab) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (ROUTE_VIEW === "client") goClientList();
        else goHome();
      },
      true
    );
  }

  if (homeBtn) {
    homeBtn.addEventListener("click", function (event) {
      event.preventDefault();
      goHome();
    });
  }

  if (logo) {
    logo.style.cursor = "pointer";
    logo.addEventListener("click", goHome);
  }

  function bootPlanner() {
    document.body.classList.add(
      ROUTE_VIEW === "client" ? "planner-route-client" : "planner-route-list"
    );
    window.openPlanner();
  }

  installRouteHooks();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootPlanner);
  } else {
    bootPlanner();
  }
})();`;
}

export async function getKompendiumHomeDocument() {
  const data = await loadOriginalData();
  if (!data.homeScreen) return null;

  const sosFileIndex = await loadSosFileIndex();
  const handoutFileIndex = await loadHandoutFileIndex();
  const clinicianHandoutIndex = await loadClinicianHandoutIndex();
  const printHandoutResolver = await loadPrintHandoutResolver();
  const toolsCatalog = buildToolsCatalog(
    data.modules,
    sosFileIndex,
    handoutFileIndex,
    printHandoutResolver
  );
  const handoutBrowserCount = toolsCatalog.reduce(
    (sum, mod) => sum + mod.handouts.length,
    0
  );
  const sosBrowserCount = toolsCatalog.reduce((sum, mod) => sum + mod.sos.length, 0);
  const pathwayBrowserCount = toolsCatalog.filter((mod) => mod.howto).length;
  const searchIndexDom = buildSearchIndexDom(data.modules);

  const homeHtml = data.homeScreen
    .replace(/style="display:\s*none"/gi, "")
    .replace(
      'class="home-screen"',
      'class="home-screen visible"'
    )
    .replace(
      /(<div class="home-action-title">Przewodniki kliniczne<\/div>\s*<div class="home-action-count">)[^<]+(<\/div>)/,
      `$1${pathwayBrowserCount} przewodników$2`
    );

  const doc = `<!DOCTYPE html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <base href="/" />
    <style>
${data.style}
body { opacity: 1 !important; padding-bottom: 0 !important; }
.nav-bar, .scroll-top { display: none !important; }
.home-screen { display: block !important; }
#kompendium-search-index { display: none !important; }
#planner-btn { display: none; }
${ACCOUNT_HEADER_STYLES}
${HOME_HEADER_SEARCH_STYLES}
    </style>
  </head>
  <body>
${withAccountHeaderButton(data.header)}
${homeHtml}
${searchIndexDom}
${data.handoutOverlay}
${TOOLS_BROWSER_MODAL}
    <script>
${escapeEmbeddedScript(data.semanticSearchScript)}
    </script>
    <script>
${escapeEmbeddedScript(KOMPENDIUM_HOME_BRIDGE_SCRIPT)}
    </script>
    <script>
${escapeEmbeddedScript(
  buildHomeGlobalSearchScript(
    data.moduleSearchData,
    data.moduleNames,
    data.moduleColors
  )
)}
    </script>
    <script>
${escapeEmbeddedScript(
  buildHomeToolsBrowserScript(toolsCatalog, {
    handouts: handoutBrowserCount,
    sos: sosBrowserCount,
    modules: toolsCatalog.length,
    pathways: pathwayBrowserCount
  })
)}
    </script>
    <script>
${escapeEmbeddedScript(data.handoutScript)}
    </script>
    <script>
${buildSosIndexExtensionScript(sosFileIndex)}
    </script>
    <script>
${buildHandoutIndexExtensionScript(handoutFileIndex)}
    </script>
    <script>
${buildClinicianHandoutIndexScript(clinicianHandoutIndex)}
    </script>
    <script>
${buildPrintHandoutResolverScript(printHandoutResolver)}
    </script>
    <script>
window._legacyOpenHandout = window.openHandout;
    </script>
    <script>
${FILE_HANDOUT_OVERRIDE_SCRIPT}
    </script>
    <script>
${FILE_SOS_OVERRIDE_SCRIPT}
    </script>
    <script>
${buildDeadButtonHiderScript(printHandoutResolver, handoutFileIndex, sosFileIndex)}
    </script>
    <script>
${KOMPENDIUM_ACCOUNT_BTN_SCRIPT}
    </script>
    <script>
${KOMPENDIUM_FILTER_DROPDOWN_SCRIPT}
    </script>
  </body>
</html>`;

  return { document: doc };
}

export async function getKompendiumPlannerDocument(
  options: PlannerDocumentOptions = {}
) {
  const view = options.view ?? "list";
  const clientIndex = options.clientIndex;
  const data = await loadOriginalData();
  const planyModule = data.modules.find((item) => item.slug === "plany");
  if (!planyModule || !data.plannerScript) return null;

  if (view === "client" && (clientIndex === undefined || clientIndex < 0)) {
    return null;
  }

  const sosFileIndex = await loadSosFileIndex();
  const handoutFileIndex = await loadHandoutFileIndex();
  const clinicianHandoutIndex = await loadClinicianHandoutIndex();
  const printHandoutResolver = await loadPrintHandoutResolver();

  const planyHtml = planyModule.html
    .replace(/style="display:\s*none"/gi, "")
    .replace(/class="tab-content"/g, 'class="tab-content active"');

  const moduleTabsHtml = data.modules
    .filter((item) => item.slug !== "plany")
    .map((item) =>
      item.html.replace(/class="tab-content"/g, 'class="tab-content" style="display:none"')
    )
    .join("\n");

  const baseHref =
    view === "client" && clientIndex !== undefined
      ? `/plany/${clientIndex}/`
      : "/plany/";
  const routeStyles =
    view === "client" ? PLANNER_CLIENT_LAYOUT_STYLES : PLANNER_LIST_LAYOUT_STYLES;
  const bridgeScript = buildPlannerBridgeScript({ view, clientIndex });

  const doc = `<!DOCTYPE html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <base href="${baseHref}" />
    <style>
${data.style}
${data.moduleFeatureStyles}
body { opacity: 1 !important; padding-bottom: 16px !important; }
.home-screen, .home-footer { display: none !important; }
.nav-bar { display: none; }
.header-search, #planner-btn { display: none; }
#tab-plany { display: block !important; }
.tab-content:not(#tab-plany) { display: none; }
${ACCOUNT_HEADER_STYLES}
${routeStyles}
${PLANNER_TOOL_PICKER_STYLES}
    </style>
  </head>
  <body class="${view === "client" ? "planner-route-client" : "planner-route-list"}">
${withAccountHeaderButton(data.header)}
${data.navBar}
${planyHtml}
${moduleTabsHtml}
${data.plannerGlobalElements}
${data.handoutOverlay}
    <script>
${escapeEmbeddedScript(data.handoutScript)}
    </script>
    <script>
${buildSosIndexExtensionScript(sosFileIndex)}
    </script>
    <script>
${buildHandoutIndexExtensionScript(handoutFileIndex)}
    </script>
    <script>
${buildClinicianHandoutIndexScript(clinicianHandoutIndex)}
    </script>
    <script>
${buildPrintHandoutResolverScript(printHandoutResolver)}
    </script>
    <script>
window._legacyOpenHandout = window.openHandout;
    </script>
    <script>
${FILE_HANDOUT_OVERRIDE_SCRIPT}
    </script>
    <script>
${FILE_SOS_OVERRIDE_SCRIPT}
    </script>
    <script>
${buildDeadButtonHiderScript(printHandoutResolver, handoutFileIndex, sosFileIndex)}
    </script>
    <script>
${escapeEmbeddedScript(data.moduleUiScript)}
    </script>
    <script>
${escapeEmbeddedScript(sanitizePlannerScript(data.plannerScript))}
    </script>
    <script>
${escapeEmbeddedScript(bridgeScript)}
    </script>
    <script>
${KOMPENDIUM_ACCOUNT_BTN_SCRIPT}
    </script>
    <script>
${KOMPENDIUM_FILTER_DROPDOWN_SCRIPT}
    </script>
  </body>
</html>`;

  return { document: doc, view, clientIndex };
}

export async function getOriginalModulesList() {
  const { modules } = await loadOriginalData();
  return modules
    .filter(({ slug }) => slug !== "plany")
    .map(({ slug, title, subtitle }) => ({ slug, title, subtitle }));
}

export async function getOriginalModuleBySlug(slug: string) {
  const { modules } = await loadOriginalData();
  return modules.find((module) => module.slug === slug) ?? null;
}

export async function getOriginalModuleDocument(slug: string) {
  const data = await loadOriginalData();
  const sosFileIndex = await loadSosFileIndex();
  const handoutFileIndex = await loadHandoutFileIndex();
  const clinicianHandoutIndex = await loadClinicianHandoutIndex();
  const printHandoutResolver = await loadPrintHandoutResolver();
  const moduleData = data.modules.find((item) => item.slug === slug);
  if (!moduleData) return null;

  const cleanedHtml = moduleData.html
    .replace(/style="display:\s*none"/gi, "")
    .replace(/class="tab-content"/g, 'class="tab-content active"');

  const doc = `<!DOCTYPE html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <base href="/modules/${slug}/" />
    <style>
${data.style}
${data.moduleFeatureStyles}
${HOWTO_VIEW_LAYOUT_STYLES}
body { opacity: 1 !important; padding-bottom: 16px !important; }
.nav-bar, .home-screen, .home-footer { display: none !important; }
.header-search, #planner-btn { display: none; }
${ACCOUNT_HEADER_STYLES}
.tab-content { display: block !important; }
.tab-content .main { padding-bottom: 20px; }
    </style>
  </head>
  <body>
${withAccountHeaderButton(data.header)}
<button class="scroll-top" id="scroll-top" title="Do góry">↑</button>
${cleanedHtml}
${data.handoutOverlay}
    <script>
${escapeEmbeddedScript(data.handoutScript)}
    </script>
    <script>
${buildSosIndexExtensionScript(sosFileIndex)}
    </script>
    <script>
${buildHandoutIndexExtensionScript(handoutFileIndex)}
    </script>
    <script>
${buildClinicianHandoutIndexScript(clinicianHandoutIndex)}
    </script>
    <script>
${buildPrintHandoutResolverScript(printHandoutResolver)}
    </script>
    <script>
window._legacyOpenHandout = window.openHandout;
    </script>
    <script>
${FILE_HANDOUT_OVERRIDE_SCRIPT}
    </script>
    <script>
${FILE_SOS_OVERRIDE_SCRIPT}
    </script>
    <script>
${buildDeadButtonHiderScript(printHandoutResolver, handoutFileIndex, sosFileIndex)}
    </script>
    <script>
${escapeEmbeddedScript(data.moduleUiScript)}
    </script>
    <script>
${KOMPENDIUM_MODULE_NAV_SCRIPT}
    </script>
    <script>
${KOMPENDIUM_ACCOUNT_BTN_SCRIPT}
    </script>
    <script>
${KOMPENDIUM_FILTER_DROPDOWN_SCRIPT}
    </script>
  </body>
</html>`;

  return {
    slug: moduleData.slug,
    title: moduleData.title,
    subtitle: moduleData.subtitle,
    document: doc
  };
}
