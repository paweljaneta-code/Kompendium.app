import { KOMPENDIUM_PENDING_CARD_KEY, KOMPENDIUM_PENDING_HOWTO_KEY } from "./kompendiumScroll";
import { MODULE_HANDOUT_ALIASES } from "./moduleSearchAliases";

export const FILE_HANDOUT_OVERRIDE_SCRIPT = `
(function () {
  var printExts = [".html", ".pdf"];
  var criticalAliases = {
    "znieksztalcenia-dep": { mod: "dep", file: "dep-znieksztalcenia", ext: "pdf" },
    "znieksztalcenia": { mod: "gad", file: "znieksztalcenia", ext: "pdf" },
    "planowanie-aktywnosci": { mod: "dep", file: "ba-scheduling", ext: "pdf" },
    "dieta-dep": { mod: "dep", file: "jedzenie-nastroj", ext: "pdf" },
    "rejestr-mysli": { mod: "dep", file: "dziennik-mysli", ext: "html" },
    "adhd-grief-diagnosis": { mod: "adhd", file: "adhd-grief-diagnosis", ext: "html" },
    "prokrastynacja-adhd": { mod: "adhd", file: "adhd-prokrastynacja", ext: "html" },
    "eksperymenty-sad": { mod: "sad", file: "eksperyment-behawioralny", ext: "pdf" },
    "asertywnosc-sad": { mod: "sad", file: "sad-asertywnosc", ext: "pdf" },
    "umiejetnosci-społ": { mod: "sad", file: "rozmowa", ext: "pdf" },
    "sad-be-imperfect": { mod: "sad", file: "eksperyment-behawioralny", ext: "pdf" },
  };

  function ensureHandoutPreviewStyles() {
    if (document.getElementById("kompendium-handout-preview-styles")) return;
    var style = document.createElement("style");
    style.id = "kompendium-handout-preview-styles";
    style.textContent =
      "#handout-overlay.ho-file-mode{display:flex;flex-direction:column;overflow:hidden;}" +
      "#handout-overlay.ho-file-mode #handout-content{max-width:none!important;width:100%!important;padding:0!important;margin:0!important;flex:1 1 auto;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;}" +
      "#handout-overlay.ho-file-mode #handout-content iframe{width:100%;min-height:calc(100dvh - 56px);height:100%;border:none;display:block;background:#fff;}";
    document.head.appendChild(style);
  }

  function injectHtmlHandoutPreviewStyles(doc) {
    if (!doc || doc.getElementById("kompendium-preview-fit")) return;
    var style = doc.createElement("style");
    style.id = "kompendium-preview-fit";
    style.textContent =
      "@media screen{" +
      "html,body{margin:0;padding:0;background:#eceae4;}" +
      "body{padding:12px 0 24px;display:flex;flex-direction:column;align-items:center;gap:16px;}" +
      ".page{" +
      "width:min(210mm,calc(100vw - 24px))!important;" +
      "max-width:100%!important;" +
      "height:auto!important;" +
      "min-height:0!important;" +
      "overflow:visible!important;" +
      "margin:0 auto!important;" +
      "box-shadow:0 2px 14px rgba(0,0,0,.1);" +
      "}" +
      "}";
    doc.head.appendChild(style);
  }

  function notifyParent(state) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(state, "*");
    }
  }

  function restoreActiveHandoutCard() {
    var id = window._activeHandoutId;
    if (!id) return;
    var card = document.getElementById(id);
    if (card) {
      card.setAttribute("open", "");
      setTimeout(function () {
        card.scrollIntoView({ block: "start", behavior: "smooth" });
      }, 50);
    }
    window._activeHandoutId = null;
  }

  function resolvePrintHandoutUrl(id) {
    var urls = [];
    var seen = {};

    function add(url) {
      if (!url || seen[url]) return;
      seen[url] = true;
      urls.push(url);
    }
    function addTriple(mod, file, ext) {
      var declaredExt = ext ? "." + ext : ".pdf";
      add("/handouts/print/" + mod + "/" + file + ".html");
      add("/handouts/print/" + mod + "/" + file + declaredExt);
      add("/handouts/print/" + mod + "/" + file + ".pdf");
    }

    // Karty świadomie bez handoutu (audyt): zwróć brak kandydatów -> placeholder.
    // Konieczne, bo plik o nazwie == id bywa scramblem treści innego narzędzia
    // i sam SKIP w resolverze nie wystarcza (HANDOUT_FILE_INDEX i tak by go podał).
    if (window.PRINT_HANDOUT_SKIP && window.PRINT_HANDOUT_SKIP[id]) return urls;

    var target = criticalAliases[id];
    if (target && target.mod && target.file) addTriple(target.mod, target.file, target.ext);

    // Kuratorowany override (manual) MA PIERWSZEŃSTWO przed plikiem o dokładnej
    // nazwie — bo <id>.html bywa pomieszany (zawiera arkusz innego narzędzia).
    var manual = window.PRINT_HANDOUT_RESOLVER && window.PRINT_HANDOUT_RESOLVER[id];
    if (manual && manual.manual && manual.mod && manual.file) addTriple(manual.mod, manual.file, manual.ext);

    var fileIndex = window.HANDOUT_FILE_INDEX || {};
    if (fileIndex[id]) {
      var indexedMod = fileIndex[id];
      printExts.forEach(function (ext) {
        add("/handouts/print/" + indexedMod + "/" + id + ext);
      });
    }

    var mod = window.HANDOUT_INDEX && window.HANDOUT_INDEX[id];
    if (mod) {
      printExts.forEach(function (ext) {
        add("/handouts/print/" + mod + "/" + id + ext);
      });
    }

    target = window.PRINT_HANDOUT_RESOLVER && window.PRINT_HANDOUT_RESOLVER[id];
    if (target && target.mod && target.file) addTriple(target.mod, target.file, target.ext);

    return urls;
  }

  async function probeHandoutUrl(url) {
    try {
      var resp = await fetch(url, {
        method: "HEAD",
        credentials: "same-origin"
      });
      if (resp.ok) return true;
    } catch (e) {}

    try {
      var resp = await fetch(url, {
        method: "GET",
        credentials: "same-origin"
      });
      if (resp.ok) return true;
    } catch (e2) {}

    return false;
  }

  async function pickFirstAvailableHandoutUrl(candidates) {
    for (var i = 0; i < candidates.length; i++) {
      if (await probeHandoutUrl(candidates[i])) return candidates[i];
    }
    // Brak potwierdzonego pliku = null. Ładowanie 404 do iframe dawało
    // "pusty handout" — gorsze niż jasny komunikat.
    return null;
  }

  window.closeHandout = function () {
    var ov = document.getElementById("handout-overlay");
    var ct = document.getElementById("handout-content");
    if (ov) {
      ov.style.display = "none";
      ov.classList.remove("sage-mode", "ho-printing", "ho-file-mode");
      // Przywróć pasek po podglądzie przewodnika (ukryty „Drukuj",
      // wstrzyknięty „Udostępnij").
      var guideShareBtn = ov.querySelector(".ho-guide-share-btn");
      if (guideShareBtn) guideShareBtn.style.display = "none";
      var printBtn = ov.querySelector(".ho-print-btn:not(.ho-guide-share-btn)");
      if (printBtn) printBtn.style.display = "";
    }
    if (ct) ct.innerHTML = "";
    var restoredBrowser =
      typeof window.restoreToolsBrowserIfNeeded === "function" &&
      window.restoreToolsBrowserIfNeeded();
    if (!restoredBrowser) {
      document.body.style.overflow = "";
      restoreActiveHandoutCard();
    }
    if (window.refreshHomeChrome) window.refreshHomeChrome();
    notifyParent({ type: "kompendium-overlay-closed" });
  };

  function showHandoutUnavailable(id) {
    var ov = document.getElementById("handout-overlay");
    var ct = document.getElementById("handout-content");
    if (!ov || !ct) return;
    ov.classList.remove("sage-mode");
    ov.classList.remove("ho-file-mode");
    ct.innerHTML =
      '<div style="max-width:380px;margin:80px auto;text-align:center;font-family:system-ui,sans-serif">' +
      '<h2 style="font-family:Georgia,serif;font-weight:400;font-size:22px;color:#4a6347;margin:0 0 14px">Wersja do druku w przygotowaniu</h2>' +
      '<p style="font-size:14px;line-height:1.6;color:#3a4a40;margin:0">Ten handout nie ma jeszcze pliku do wydruku. ' +
      "Skorzystaj z opisu narzędzia na karcie lub wróć wkrótce.</p></div>";
    ov.style.display = "flex";
    ov.scrollTop = 0;
    document.body.style.overflow = "hidden";
    notifyParent({ type: "kompendium-overlay-open", overlay: "handout" });
  }

  window.openClinicianHandout = function (id) {
    if (!id) return;
    // Indeks mapuje cardId -> "mod/plik" pliku, którego TREŚĆ należy do tej
    // karty (pliki bywają pomieszane — nazwa pliku != temat treści).
    var ref = window.CLINICIAN_HANDOUT_INDEX && window.CLINICIAN_HANDOUT_INDEX[id];
    if (!ref) {
      alert("Arkusz dla terapeuty niedostepny dla: " + id);
      return;
    }

    var url = "/handouts/clinician/" + ref + ".html";
    ensureHandoutPreviewStyles();

    var ov = document.getElementById("handout-overlay");
    var ct = document.getElementById("handout-content");
    if (!ov || !ct) {
      alert("Nie mozna otworzyc podgladu arkusza (brak warstwy handout).");
      return;
    }

    window._activeHandoutId = id;
    var card = document.getElementById(id);
    if (card) card.setAttribute("open", "");

    ov.classList.remove("sage-mode");
    ov.classList.add("ho-file-mode");
    ct.innerHTML = "";
    var iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.title = "Handout dla terapeuty";
    iframe.onload = function () {
      try {
        injectHtmlHandoutPreviewStyles(iframe.contentDocument);
      } catch (e) {}
    };
    ct.appendChild(iframe);
    ov.style.display = "flex";
    ov.scrollTop = 0;
    document.body.style.overflow = "hidden";
    if (window.refreshHomeChrome) window.refreshHomeChrome();
    notifyParent({ type: "kompendium-overlay-open", overlay: "handout" });
  };

  // Przewodniki interaktywne (transdiag): pełnoekranowy podgląd w tej samej
  // nakładce co arkusze klinicysty, zamiast małego modala SOS.
  window.openGuideFullscreen = function (cardId) {
    var mod = window.SOS_INDEX && window.SOS_INDEX[cardId];
    var ov = document.getElementById("handout-overlay");
    var ct = document.getElementById("handout-content");
    if (!mod || !ov || !ct) {
      if (typeof window.openSOS === "function") return window.openSOS(cardId);
      return;
    }
    ensureHandoutPreviewStyles();
    window._activeHandoutId = cardId;
    var card = document.getElementById(cardId);
    if (card) card.setAttribute("open", "");
    // W pasku nakładki: zamiast „Drukuj" przycisk „Udostępnij" generujący
    // publiczny link /s/<cid> (działa bez logowania).
    var toolbar = ov.querySelector(".ho-toolbar");
    if (toolbar) {
      var printBtn = toolbar.querySelector(".ho-print-btn:not(.ho-guide-share-btn)");
      if (printBtn) printBtn.style.display = "none";
      var shareBtn = toolbar.querySelector(".ho-guide-share-btn");
      if (!shareBtn) {
        shareBtn = document.createElement("button");
        shareBtn.className = "ho-print-btn ho-guide-share-btn";
        toolbar.insertBefore(shareBtn, toolbar.firstChild);
      }
      shareBtn.textContent = "📤 Udostępnij";
      shareBtn.style.display = "";
      shareBtn.onclick = function () {
        if (typeof window.shareToolLink === "function") window.shareToolLink(cardId);
      };
    }
    ov.classList.remove("sage-mode");
    ov.classList.add("ho-file-mode");
    ct.innerHTML = "";
    var iframe = document.createElement("iframe");
    iframe.src = "/sos/" + mod + "/" + cardId + ".html";
    iframe.title = "Przewodnik interaktywny";
    ct.appendChild(iframe);
    ov.style.display = "flex";
    ov.scrollTop = 0;
    document.body.style.overflow = "hidden";
    if (window.refreshHomeChrome) window.refreshHomeChrome();
    notifyParent({ type: "kompendium-overlay-open", overlay: "handout" });
  };

  // Poradniki "Jak pracować z..." (pliki w public/howto/**): pełnoekranowy
  // podgląd w nakładce z domyślnym paskiem (Drukuj/Zamknij).
  window.openHowtoFullscreen = function (url, title) {
    var ov = document.getElementById("handout-overlay");
    var ct = document.getElementById("handout-content");
    if (!ov || !ct || !url) return;
    ensureHandoutPreviewStyles();
    window._activeHandoutId = null;
    ov.classList.remove("sage-mode");
    ov.classList.add("ho-file-mode");
    ct.innerHTML = "";
    var iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.title = title || "Poradnik";
    ct.appendChild(iframe);
    ov.style.display = "flex";
    ov.scrollTop = 0;
    document.body.style.overflow = "hidden";
    if (window.refreshHomeChrome) window.refreshHomeChrome();
    notifyParent({ type: "kompendium-overlay-open", overlay: "handout" });
  };

  window.openHandout = async function (id) {
    var candidates = resolvePrintHandoutUrl(id);
    var url = await pickFirstAvailableHandoutUrl(candidates);
    if (!url) {
      // Fallback: jeśli narzędzie ma wersję elektroniczną SOS — otwórz ją
      // (lepsza interaktywna wersja niż brak materiału).
      if (
        typeof window.openSOS === "function" &&
        window.SOS_INDEX &&
        window.SOS_INDEX[id]
      ) {
        return window.openSOS(id);
      }
      showHandoutUnavailable(id);
      return;
    }

    ensureHandoutPreviewStyles();

    var ov = document.getElementById("handout-overlay");
    var ct = document.getElementById("handout-content");
    if (!ov || !ct) {
      if (typeof window.restoreToolsBrowserIfNeeded === "function") {
        window.restoreToolsBrowserIfNeeded();
      }
      return;
    }

    window._activeHandoutId = id;
    var card = document.getElementById(id);
    if (card) card.setAttribute("open", "");

    ov.classList.remove("sage-mode");
    ov.classList.add("ho-file-mode");
    ct.innerHTML = "";
    var iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.title = "Handout do wydruku";
    iframe.onload = function () {
      if (!/\\.html(?:\\?|$)/i.test(url)) return;
      try {
        injectHtmlHandoutPreviewStyles(iframe.contentDocument);
      } catch (e) {}
    };
    ct.appendChild(iframe);
    ov.style.display = "flex";
    ov.scrollTop = 0;
    document.body.style.overflow = "hidden";
    if (window.refreshHomeChrome) window.refreshHomeChrome();
    notifyParent({ type: "kompendium-overlay-open", overlay: "handout" });
  };

  window.printHandout = function () {
    var ct = document.getElementById("handout-content");
    var iframe = ct && ct.querySelector("iframe");
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      return;
    }
    var ov = document.getElementById("handout-overlay");
    if (ov) {
      ov.classList.add("ho-printing");
      window.print();
      setTimeout(function () {
        ov.classList.remove("ho-printing");
      }, 500);
    }
  };

  window.downloadStandaloneHandout = function (id) {
    if (typeof window.openSOS === "function") {
      window.openSOS(id);
      return;
    }
    alert(
      "Wersja elektroniczna niedostepna. Dodaj plik HTML:\\npublic/sos/<modul>/" +
        id +
        ".html"
    );
  };

  function syncClinicianHandoutButtons() {
    var index = window.CLINICIAN_HANDOUT_INDEX || {};
    document.querySelectorAll("details.card").forEach(function (card) {
      var btn = card.querySelector(".tool-mat.tm-ther");
      if (!btn) return;
      // Karty transdiag (td-*): pokazuj arkusz terapeuty jako placeholder
      // nawet bez pliku (klik -> "Materiał w przygotowaniu").
      var isTd = card.id && card.id.indexOf("td-") === 0;
      btn.style.display = index[card.id] || isTd ? "" : "none";
    });
  }

  window.syncClinicianHandoutButtons = syncClinicianHandoutButtons;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncClinicianHandoutButtons);
  } else {
    syncClinicianHandoutButtons();
  }
})();
`;

export const FILE_SOS_OVERRIDE_SCRIPT = `
(function () {
  var SOS_FALLBACK_HTML =
    '<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>body{font-family:system-ui,sans-serif;background:#f4f1ea;color:#1c2620;display:flex;align-items:center;' +
    'justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}' +
    'main{max-width:380px}h2{font-family:Georgia,serif;font-weight:400;font-size:22px;color:#4a6347;margin:0 0 14px}' +
    'p{font-size:14px;line-height:1.6;color:#3a4a40;margin:0}</style></head><body><main>' +
    "<h2>Wkrotce dostepne</h2><p>Interaktywna wersja tego narzedzia bedzie dostepna w wersji online kompendium. " +
    "Tymczasem skorzystaj z handoutu do wydruku.</p></main></body></html>";

  function notifyParent(state) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(state, "*");
    }
  }

  function restoreActiveSosCard() {
    var id = window._activeSosCardId;
    if (!id) return;
    var card = document.getElementById(id);
    if (card) {
      card.setAttribute("open", "");
      setTimeout(function () {
        card.scrollIntoView({ block: "start", behavior: "smooth" });
      }, 50);
    }
    window._activeSosCardId = null;
  }

  function sosPathForCid(cardId) {
    var mod = window.SOS_INDEX && window.SOS_INDEX[cardId];
    if (!mod) return null;
    return "/sos/" + mod + "/" + cardId + ".html";
  }

  // Strony serwowane przez aplikację nie zawierają markupu #shareModal ani
  // showToast z monolitu, więc oryginalny shareToolLink wywala się na
  // getElementById(null). Nadpisanie: krótki link /s/<cid> przez Web Share
  // (mobile) lub schowek + własny toast.
  function shareNotify(msg) {
    if (typeof window.showToast === "function") {
      window.showToast(msg);
      return;
    }
    var badge = document.getElementById("share-link-toast");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "share-link-toast";
      badge.style.cssText =
        "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);" +
        "background:#2a4a3a;color:#fff;padding:10px 22px;border-radius:22px;" +
        "font-size:13.5px;font-weight:600;font-family:inherit;z-index:10010;" +
        "box-shadow:0 4px 16px rgba(0,0,0,.25);opacity:0;transition:opacity .25s;" +
        "pointer-events:none;max-width:90vw;text-align:center";
      document.body.appendChild(badge);
    }
    badge.textContent = msg;
    badge.style.opacity = "1";
    clearTimeout(badge._t);
    badge._t = setTimeout(function () {
      badge.style.opacity = "0";
    }, 2600);
  }
  // Dokumenty modułów są osadzane przez <iframe srcDoc>, gdzie
  // location.origin === "null" — origin trzeba wziąć z rodzica lub referrera
  // (ten sam wzorzec co appOrigin() w monolicie).
  function shareOrigin() {
    try {
      if (window.location.origin && window.location.origin !== "null")
        return window.location.origin;
    } catch (e) {}
    try {
      var po = window.parent && window.parent !== window && window.parent.location.origin;
      if (po && po !== "null") return po;
    } catch (e) {}
    try {
      if (document.referrer) return new URL(document.referrer).origin;
    } catch (e) {}
    return "";
  }
  window.shareToolLink = function (cardId) {
    if (!(window.SOS_INDEX && window.SOS_INDEX[cardId])) {
      shareNotify("Brak wersji elektronicznej tego narzędzia");
      return;
    }
    var origin = shareOrigin();
    if (!origin) {
      shareNotify("Nie udało się ustalić adresu aplikacji");
      return;
    }
    var url = origin + "/s/" + cardId;
    function done() {
      shareNotify("Link dla klienta skopiowany do schowka");
    }
    function fallbackCopy() {
      try {
        var ta = document.createElement("textarea");
        ta.value = url;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        done();
      } catch (err) {
        window.prompt("Skopiuj link dla klienta:", url);
      }
    }
    function copy() {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, fallbackCopy);
      } else {
        fallbackCopy();
      }
    }
    if (navigator.share) {
      navigator
        .share({ url: url, title: "Narzędzie terapeutyczne" })
        .catch(function (e) {
          if (!e || e.name !== "AbortError") copy();
        });
      return;
    }
    copy();
  };

  window.closeSOS = function () {
    var modal = document.getElementById("sos-modal-bg");
    var iframe = document.getElementById("sos-iframe");
    if (modal) {
      modal.classList.remove("active");
      delete modal.dataset.cardId;
    }
    if (iframe) {
      iframe.removeAttribute("srcdoc");
      iframe.src = "about:blank";
    }
    var restoredBrowser =
      typeof window.restoreToolsBrowserIfNeeded === "function" &&
      window.restoreToolsBrowserIfNeeded();
    if (!restoredBrowser) {
      document.body.style.overflow = "";
      restoreActiveSosCard();
    }
    if (window.refreshHomeChrome) window.refreshHomeChrome();
    notifyParent({ type: "kompendium-overlay-closed" });
  };

  window.openSOS = function (cardId) {
    var modal = document.getElementById("sos-modal-bg");
    var iframe = document.getElementById("sos-iframe");
    if (!modal || !iframe) {
      if (typeof window.restoreToolsBrowserIfNeeded === "function") {
        window.restoreToolsBrowserIfNeeded();
      }
      alert("Wersja elektroniczna niedostepna (brak modala SOS).");
      return;
    }

    window._activeSosCardId = cardId;
    var card = document.getElementById(cardId);
    if (card) card.setAttribute("open", "");

    modal.dataset.cardId = cardId;
    var path = sosPathForCid(cardId);
    if (!path) {
      iframe.removeAttribute("src");
      iframe.srcdoc = SOS_FALLBACK_HTML;
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
      if (window.refreshHomeChrome) window.refreshHomeChrome();
      notifyParent({ type: "kompendium-overlay-open", overlay: "sos" });
      return;
    }

    iframe.removeAttribute("srcdoc");
    iframe.src = path;
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
    if (window.refreshHomeChrome) window.refreshHomeChrome();
    notifyParent({ type: "kompendium-overlay-open", overlay: "sos" });
  };

  document.addEventListener("click", function (e) {
    var modal = document.getElementById("sos-modal-bg");
    if (modal && e.target === modal) window.closeSOS();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var modal = document.getElementById("sos-modal-bg");
      if (modal && modal.classList.contains("active")) window.closeSOS();
    }
  });
})();
`;

export const KOMPENDIUM_MODULE_NAV_SCRIPT = `
(function () {
  var moduleSearchAliases = ${JSON.stringify(MODULE_HANDOUT_ALIASES)};

  function normalizeSearch(value) {
    return String(value)
      .normalize("NFD")
      .replace(/\\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9\\s]/g, " ")
      .replace(/\\s+/g, " ")
      .trim();
  }

  function moduleSearchMatches(tabKey, query) {
    if (!query || !tabKey) return false;
    if (tabKey.indexOf(query) !== -1) return true;
    var aliases = moduleSearchAliases[tabKey] || [];
    for (var ai = 0; ai < aliases.length; ai++) {
      var alias = aliases[ai];
      if (alias.indexOf(query) !== -1 || query.indexOf(alias) !== -1) return true;
    }
    var header = document.querySelector(".tab-header h2");
    if (header && normalizeSearch(header.textContent || "").indexOf(query) !== -1) {
      return true;
    }
    return false;
  }

  var backBtn = document.getElementById("back-btn");
  var scrollBtn = document.getElementById("scroll-top");
  var homeBtn = document.getElementById("home-btn");
  var backBusy = false;

  function notifyParent(state) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(state, "*");
    }
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

  function hasOpenToolCards() {
    return document.querySelectorAll(".card[open]").length > 0;
  }

  function goHome() {
    if (backBusy) return;
    backBusy = true;
    notifyParent({ type: "kompendium-nav-exhausted" });
    setTimeout(function () {
      backBusy = false;
    }, 400);
  }

  function bindOverlayControls() {
    var ov = document.getElementById("handout-overlay");
    if (!ov || ov.dataset.bound === "1") return;
    ov.dataset.bound = "1";
    ov.addEventListener("click", function (event) {
      if (event.target.closest(".ho-close-btn")) {
        event.preventDefault();
        window.closeHandout();
        return;
      }
      if (event.target.closest(".ho-print-btn")) {
        event.preventDefault();
        window.printHandout();
      }
    });
  }

  var sosModal = document.getElementById("sos-modal-bg");
  if (sosModal && sosModal.dataset.bound !== "1") {
    sosModal.dataset.bound = "1";
    sosModal.addEventListener("click", function (event) {
      if (event.target.closest(".sos-modal-close")) {
        event.preventDefault();
        window.closeSOS();
      }
    });
  }

  document.addEventListener(
    "toggle",
    function (e) {
      if (e.target.tagName === "DETAILS" && e.target.classList.contains("card")) {
        if (!e.target.open) {
          setTimeout(function () {
            e.target.scrollIntoView({ block: "nearest" });
          }, 50);
        }
      }
    },
    true
  );

  function hasOpenToolCards() {
    return document.querySelectorAll(".card[open]").length > 0;
  }

  function returnToHowtoGuide(tab) {
    var openc = document.querySelectorAll(".card[open]");
    for (var oc = 0; oc < openc.length; oc++) openc[oc].removeAttribute("open");
    window._returnToHowto = null;
    if (window.switchModuleMode) {
      window._howtoScrollRestore =
        typeof window._howtoScrollPos === "number" ? window._howtoScrollPos : null;
      window._howtoScrollPos = null;
      window.switchModuleMode(tab, "howto");
      return true;
    }
    window._howtoScrollPos = null;
    return false;
  }

  function handleBack(event) {
    if (backBusy) {
      if (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      return;
    }

    if (isHandoutOpen()) {
      if (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      window._returnToHowto = null;
      window._howtoScrollPos = null;
      window.closeHandout();
      return;
    }

    if (isSosOpen()) {
      if (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      window._returnToHowto = null;
      window._howtoScrollPos = null;
      window.closeSOS();
      return;
    }

    if (hasOpenToolCards() && window._returnToHowto) {
      if (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      returnToHowtoGuide(window._returnToHowto);
      return;
    }

    if (hasOpenToolCards()) {
      if (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      window._returnToHowto = null;
      window._howtoScrollPos = null;
      goHome();
      return;
    }

    if (window._returnToHowto) {
      if (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      returnToHowtoGuide(window._returnToHowto);
      return;
    }

    var activeTab =
      document.querySelector('.tab-content[style*="block"]') ||
      document.querySelector(".tab-content.active") ||
      document.querySelector(".tab-content");
    if (activeTab) {
      var tabKey = activeTab.id.replace("tab-", "");
      var hvOpen = document.getElementById("howto-view-" + tabKey);
      if (hvOpen && getComputedStyle(hvOpen).display !== "none") {
        if (window._howtoFromHome) {
          window._howtoFromHome = null;
          if (event) {
            event.preventDefault();
            event.stopImmediatePropagation();
          }
          goHome();
          return;
        }
        if (window.switchModuleMode) {
          var _bm = window._howtoFromMode === "guide" ? "guide" : "library";
          window._howtoFromMode = null;
          window.switchModuleMode(tabKey, _bm);
          return;
        }
      }

      var gv = document.getElementById("guide-view-" + tabKey);
      var lv = document.getElementById("library-view-" + tabKey);
      if (gv && lv) {
        var guideOpen = getComputedStyle(gv).display !== "none";
        var libOpen = getComputedStyle(lv).display !== "none";

        if (libOpen) {
          var panel = lv.querySelector(".lib-section-panel");
          if (
            panel &&
            panel.style.display !== "none" &&
            getComputedStyle(panel).display !== "none"
          ) {
            if (window.libCloseSection) window.libCloseSection(tabKey);
            if (event) {
              event.preventDefault();
              event.stopImmediatePropagation();
            }
            return;
          }
        }

        if (guideOpen) {
          var anyPhaseOpen = false;
          gv.querySelectorAll('[id^="guide-phase-' + tabKey + '-"]').forEach(function (ph) {
            if (getComputedStyle(ph).display !== "none") anyPhaseOpen = true;
          });
          if (anyPhaseOpen) {
            if (window.backToGuideList) window.backToGuideList(tabKey);
            if (event) {
              event.preventDefault();
              event.stopImmediatePropagation();
            }
            return;
          }
          if (window.switchModuleMode) {
            window.switchModuleMode(tabKey, "library");
            if (event) {
              event.preventDefault();
              event.stopImmediatePropagation();
            }
            return;
          }
        }
      }
    }

    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    goHome();
  }

  if (backBtn && backBtn.dataset.navBound !== "1") {
    backBtn.dataset.navBound = "1";
    backBtn.classList.add("visible");
    // Obsługa na pointerdown + click z deduplikacją. Powód: gdy fokus jest w
    // wewnętrznym iframe (otwarty przewodnik / podgląd narzędzia), pierwszy
    // "click" na przycisk wstecz w dokumencie-rodzicu bywa pochłaniany przez
    // przeniesienie fokusu — przez co "czasem nie działa za pierwszym razem".
    // pointerdown nie podlega temu pochłanianiu; click zostaje dla klawiatury.
    var lastBackTs = 0;
    var onBackEvent = function (event) {
      if (event.type === "click" && Date.now() - lastBackTs < 700) {
        // ten click to dopełnienie obsłużonego już pointerdown — pomiń
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (event.type === "pointerdown") {
        if (event.button != null && event.button !== 0) return; // tylko lewy
        lastBackTs = Date.now();
      }
      handleBack(event);
    };
    backBtn.addEventListener("pointerdown", onBackEvent, true);
    backBtn.addEventListener("click", onBackEvent, true);
  }

  if (homeBtn && homeBtn.dataset.navBound !== "1") {
    homeBtn.dataset.navBound = "1";
    homeBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.scrollTo({ top: 0, behavior: "smooth" });
      goHome();
    }, true);
  }

  var logoEl = document.querySelector(".logo");
  if (logoEl && logoEl.dataset.navBound !== "1") {
    logoEl.dataset.navBound = "1";
    logoEl.style.cursor = "pointer";
    logoEl.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      goHome();
    }, true);
  }

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (isHandoutOpen() || isSosOpen()) return;
    handleBack(event);
  });

  window.addEventListener("scroll", function () {
    if (scrollBtn) scrollBtn.classList.toggle("visible", window.scrollY > 400);
  });
  if (scrollBtn) {
    scrollBtn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function findHowtoAnchor(scope, id) {
    if (!scope || scope === document) return document.getElementById(id);
    if (typeof CSS !== "undefined" && CSS.escape) {
      return scope.querySelector("#" + CSS.escape(id));
    }
    var nodes = scope.querySelectorAll("[id]");
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) return nodes[i];
    }
    return null;
  }

  function scrollToHowtoAnchor(id, root) {
    var target = findHowtoAnchor(root && root.querySelector ? root : document, id);
    if (!target) return false;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }

  function openToolFromHowto(tab, el) {
    window._returnToHowto = tab;
    window._howtoScrollPos = window.pageYOffset;
    window._skipHowtoExitScroll = true;
    if (window.switchModuleMode) {
      window.switchModuleMode(tab, "library");
    }
    window._skipHowtoExitScroll = false;

    if (window.libCloseSection) window.libCloseSection(tab);

    var tabRoot = document.getElementById("tab-" + tab);
    if (tabRoot) {
      var allPill = tabRoot.querySelector('.pill[data-filter="all"]');
      if (allPill) allPill.click();
    }

    var open = document.querySelectorAll(".card[open]");
    for (var k = 0; k < open.length; k++) open[k].removeAttribute("open");
    el.classList.remove("hidden");
    el.setAttribute("open", "");
    setTimeout(function () {
      var hdr = document.querySelector(".header");
      var nav = document.querySelector(".nav-bar");
      var off = (hdr ? hdr.offsetHeight : 0) + (nav ? nav.offsetHeight : 0) + 12;
      var y = el.getBoundingClientRect().top + window.pageYOffset - off;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    }, 120);
  }

  function handleHowtoHashClick(e) {
    var anchor = e.target.closest('[id^="howto-view-"] a[href^="#"], .howto-view a[href^="#"]');
    if (!anchor) return;
    var href = anchor.getAttribute("href");
    if (!href || href === "#") return;
    e.preventDefault();
    e.stopImmediatePropagation();
    var id = decodeURIComponent(href.slice(1));
    var howtoView = anchor.closest('[id^="howto-view-"]') || anchor.closest(".howto-view");
    scrollToHowtoAnchor(id, howtoView);
  }

  function handleHowtoQgClick(e) {
    var qg = e.target.closest(".qg-link");
    if (!qg) return;
    var id = qg.getAttribute("data-go");
    if (!id) return;
    var howtoSrc = qg.closest('[id^="howto-view-"]');
    if (!howtoSrc) return;
    var tab = howtoSrc.id.replace("howto-view-", "");
    var tabRoot =
      howtoSrc.closest(".tab-content") || document.getElementById("tab-" + tab);
    var el = tabRoot
      ? tabRoot.querySelector('[id="' + id.replace(/"/g, '\\"') + '"]')
      : document.getElementById(id);
    if (!el || el.tagName !== "DETAILS") return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openToolFromHowto(tab, el);
  }

  document.addEventListener("click", handleHowtoHashClick, true);
  document.addEventListener("click", handleHowtoQgClick, true);

  document.addEventListener("click", function (e) {
    var pill = e.target.closest(".pill");
    if (pill) {
      var p = pill.closest(".tab-content") || document;
      var pills = p.querySelectorAll(".pill");
      var cards = p.querySelectorAll(".card");
      var ct = p.querySelector(".count");
      var f = pill.getAttribute("data-filter");
      for (var i = 0; i < pills.length; i++) pills[i].classList.remove("active");
      pill.classList.add("active");
      var s = 0;
      for (var j = 0; j < cards.length; j++) {
        var m = cards[j].getAttribute("data-m") || "";
        // tab-transdiag: pigułki tematyczne filtrują po data-topic (data-m = kategoria)
        var tt = cards[j].getAttribute("data-topic") || "";
        if (f === "all" || m === f || tt === f || (" " + m + " ").indexOf(" " + f + " ") !== -1) {
          cards[j].classList.remove("hidden");
          s++;
        } else {
          cards[j].classList.add("hidden");
          cards[j].removeAttribute("open");
        }
      }
      if (ct) ct.textContent = "Wy\\u015bwietlono: " + s + " z " + cards.length + " narz\\u0119dzi";
      if (f !== "all") {
        var tgt = p.querySelector('[class*="pills"]');
        if (tgt) {
          setTimeout(function () {
            var y = tgt.getBoundingClientRect().top + window.pageYOffset - 40;
            window.scrollTo({ top: y, behavior: "smooth" });
          }, 150);
        }
      }
    }

    var qg = e.target.closest(".qg-link");
    if (qg) {
      var id = qg.getAttribute("data-go");
      if (!id) return;
      var el = document.getElementById(id);
      if (el && el.tagName === "DETAILS") {
        var howtoSrc = qg.closest('[id^="howto-view-"]');
        if (howtoSrc) {
          return;
        } else {
          window._returnToHowto = null;
          window._howtoScrollPos = null;
        }
        var open = document.querySelectorAll(".card[open]");
        for (var k = 0; k < open.length; k++) open[k].removeAttribute("open");
        el.setAttribute("open", "");
        setTimeout(function () {
          var hdr = document.querySelector(".header");
          var nav = document.querySelector(".nav-bar");
          var off = (hdr ? hdr.offsetHeight : 0) + (nav ? nav.offsetHeight : 0) + 12;
          var y = el.getBoundingClientRect().top + window.pageYOffset - off;
          window.scrollTo({ top: y, behavior: "smooth" });
        }, 150);
      }
      return;
    }

    var area = e.target.closest(".area-link");
    if (area) {
      var ak = area.getAttribute("data-area");
      if (!ak) return;
      var p2 = area.closest(".tab-content");
      if (p2) {
        var tabKey2 = p2.id.replace("tab-", "");
        if (window.libCloseSection) window.libCloseSection(tabKey2);
        var ps = p2.querySelectorAll(".pill");
        for (var i2 = 0; i2 < ps.length; i2++) {
          ps[i2].classList.remove("active");
          if (ps[i2].getAttribute("data-filter") === ak) ps[i2].classList.add("active");
        }
        var cs = p2.querySelectorAll(".card");
        for (var j2 = 0; j2 < cs.length; j2++) {
          if ((cs[j2].getAttribute("data-m") || "") === ak) cs[j2].classList.remove("hidden");
          else {
            cs[j2].classList.add("hidden");
            cs[j2].removeAttribute("open");
          }
        }
        var ct2 = p2.querySelector(".count");
        var vis = p2.querySelectorAll(".card:not(.hidden)").length;
        if (ct2) ct2.textContent = "Wy\\u015bwietlono: " + vis + " z " + cs.length + " narz\\u0119dzi";
        var lvSidebar = document.getElementById("library-view-" + tabKey2);
        if (lvSidebar) {
          lvSidebar.querySelectorAll(".lib-sb-filter").forEach(function (fEl) {
            fEl.classList.remove("active");
            if (
              fEl.getAttribute("onclick") &&
              fEl.getAttribute("onclick").indexOf("'" + ak + "'") >= 0
            ) {
              fEl.classList.add("active");
            }
          });
        }
        var md = area.closest("details");
        if (md) md.removeAttribute("open");
      }
    }
  });

  document.addEventListener("input", function (e) {
    if (e.target.matches(".search-wrap input")) {
      var q = normalizeSearch(e.target.value || "");
      var p = e.target.closest(".tab-content") || document;
      var tabKey = p.id ? p.id.replace(/^tab-/, "") : "";
      var moduleMatch = moduleSearchMatches(tabKey, q);
      var cards = p.querySelectorAll(".card");
      var s = 0;
      for (var i = 0; i < cards.length; i++) {
        if (
          !q ||
          moduleMatch ||
          normalizeSearch(cards[i].textContent || "").indexOf(q) !== -1
        ) {
          cards[i].classList.remove("hidden");
          s++;
        } else {
          cards[i].classList.add("hidden");
          cards[i].removeAttribute("open");
        }
      }
      var ct = p.querySelector(".count");
      if (ct) ct.textContent = "Wy\\u015bwietlono: " + s + " z " + cards.length + " narz\\u0119dzi";
    }
  });

  bindOverlayControls();

  (function wrapSwitchModuleMode() {
    var orig = window.switchModuleMode;
    if (!orig || orig.__navWrapped) return;
    window.switchModuleMode = function (tab, mode) {
      var hv = document.getElementById("howto-view-" + tab);
      var leavingHowto = !!(hv && getComputedStyle(hv).display !== "none" && mode !== "howto");
      orig.call(this, tab, mode);
      if (leavingHowto && !window._skipHowtoExitScroll) {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    };
    window.switchModuleMode.__navWrapped = true;
  })();

  var tab = document.querySelector(".tab-content");
  if (tab) {
    var accent = tab.getAttribute("data-accent");
    if (accent) document.documentElement.style.setProperty("--accent", accent);
  }

  (function openPendingCardFromSearch() {
    try {
      var raw = sessionStorage.getItem(${JSON.stringify(KOMPENDIUM_PENDING_CARD_KEY)});
      if (!raw) return;
      sessionStorage.removeItem(${JSON.stringify(KOMPENDIUM_PENDING_CARD_KEY)});
      var data = JSON.parse(raw);
      if (!data || !data.cardId) return;
      var el = document.getElementById(data.cardId);
      if (!el) return;
      var openc = document.querySelectorAll(".card[open]");
      for (var i = 0; i < openc.length; i++) openc[i].removeAttribute("open");
      el.setAttribute("open", "");
      setTimeout(function () {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    } catch (e) {}
  })();

  (function openPendingHowtoFromNav() {
    try {
      var raw = sessionStorage.getItem(${JSON.stringify(KOMPENDIUM_PENDING_HOWTO_KEY)});
      if (!raw) return;
      sessionStorage.removeItem(${JSON.stringify(KOMPENDIUM_PENDING_HOWTO_KEY)});
      var data = JSON.parse(raw);
      if (!data || !data.slug) return;
      if (!window.switchModuleMode) return;
      if (data.fromHome) window._howtoFromHome = true;
      window.switchModuleMode(data.slug, data.mode || "howto");
      setTimeout(function () {
        window.scrollTo({ top: 0, behavior: "auto" });
      }, 120);
    } catch (e) {}
  })();

  document.body.style.opacity = "1";
})();
`;
