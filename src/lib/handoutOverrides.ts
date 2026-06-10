export const FILE_HANDOUT_OVERRIDE_SCRIPT = `
(function () {
  var printExts = [".html", ".pdf"];
  var criticalAliases = {
    "znieksztalcenia-dep": { mod: "dep", file: "dep-znieksztalcenia", ext: "pdf" },
    "znieksztalcenia": { mod: "gad", file: "znieksztalcenia", ext: "pdf" },
    "planowanie-aktywnosci": { mod: "dep", file: "ba-scheduling", ext: "pdf" },
    "dieta-dep": { mod: "dep", file: "jedzenie-nastroj", ext: "pdf" }
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
    var target =
      criticalAliases[id] ||
      (window.PRINT_HANDOUT_RESOLVER && window.PRINT_HANDOUT_RESOLVER[id]);
    if (target && target.mod && target.file) {
      // HTML przed PDF: HTML przewija się i renderuje na mobile,
      // PDF w iframe na telefonach często pokazuje tylko 1. stronę lub nic.
      return [
        "/handouts/print/" + target.mod + "/" + target.file + ".html",
        "/handouts/print/" + target.mod + "/" + target.file + ".pdf"
      ];
    }

    var mod = window.HANDOUT_INDEX && window.HANDOUT_INDEX[id];
    if (!mod) return [];

    return printExts.map(function (ext) {
      return "/handouts/print/" + mod + "/" + id + ext;
    });
  }

  async function probeHandoutUrl(url) {
    try {
      var resp = await fetch(url, {
        method: "HEAD",
        credentials: "same-origin"
      });
      if (resp.ok) return true;
    } catch (e) {}

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
    }
    if (ct) ct.innerHTML = "";
    document.body.style.overflow = "";
    restoreActiveHandoutCard();
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
    if (!ov || !ct) return;

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
    document.body.style.overflow = "";
    restoreActiveSosCard();
    notifyParent({ type: "kompendium-overlay-closed" });
  };

  window.openSOS = function (cardId) {
    var modal = document.getElementById("sos-modal-bg");
    var iframe = document.getElementById("sos-iframe");
    if (!modal || !iframe) {
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
      notifyParent({ type: "kompendium-overlay-open", overlay: "sos" });
      return;
    }

    iframe.removeAttribute("srcdoc");
    iframe.src = path;
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
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

  function closeOpenCards() {
    var openCards = document.querySelectorAll(".card[open]");
    if (!openCards.length) return false;
    for (var i = 0; i < openCards.length; i++) openCards[i].removeAttribute("open");
    setTimeout(function () {
      openCards[0].scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 50);
    return true;
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

  function handleBack(event) {
    if (backBusy) {
      if (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      return;
    }

    if (isHandoutOpen() && typeof window.closeHandout === "function") {
      if (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      window.closeHandout();
      return;
    }

    if (isSosOpen() && typeof window.closeSOS === "function") {
      if (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      window.closeSOS();
      return;
    }

    if (window._returnToHowto) {
      var htab = window._returnToHowto;
      var hv = document.getElementById("howto-view-" + htab);
      if (hv) {
        var atab = document.getElementById("tab-" + htab);
        if (atab) {
          var openc = document.querySelectorAll(".card[open]");
          for (var oc = 0; oc < openc.length; oc++) openc[oc].removeAttribute("open");
          window._returnToHowto = null;
          if (window.switchModuleMode) {
            window._howtoScrollRestore =
              typeof window._howtoScrollPos === "number" ? window._howtoScrollPos : null;
            window._howtoScrollPos = null;
            window.switchModuleMode(htab, "howto");
            return;
          }
        }
      }
      window._returnToHowto = null;
    }

    if (closeOpenCards()) {
      if (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
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
    backBtn.addEventListener("click", handleBack, true);
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
        if (f === "all" || m === f || (" " + m + " ").indexOf(" " + f + " ") !== -1) {
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
          window._returnToHowto = howtoSrc.id.replace("howto-view-", "");
          window._howtoScrollPos = window.pageYOffset;
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
      var q = e.target.value.toLowerCase();
      var p = e.target.closest(".tab-content") || document;
      var cards = p.querySelectorAll(".card");
      var s = 0;
      for (var i = 0; i < cards.length; i++) {
        if (!q || (cards[i].textContent || "").toLowerCase().indexOf(q) !== -1) {
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

  var tab = document.querySelector(".tab-content");
  if (tab) {
    var accent = tab.getAttribute("data-accent");
    if (accent) document.documentElement.style.setProperty("--accent", accent);
  }

  document.body.style.opacity = "1";
})();
`;
