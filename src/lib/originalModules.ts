import fs from "node:fs/promises";
import path from "node:path";
import {
  FILE_HANDOUT_OVERRIDE_SCRIPT,
  FILE_SOS_OVERRIDE_SCRIPT,
  KOMPENDIUM_MODULE_NAV_SCRIPT
} from "./handoutOverrides";

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
  homeScreen: string;
  handoutScript: string;
  moduleUiScript: string;
  handoutOverlay: string;
  modules: OriginalModule[];
};

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
@media (max-width: 680px) {
  .howto-view { padding-left: 28px !important; padding-right: 28px !important; }
  .howto-view .hg-wrap { padding-left: 28px !important; padding-right: 28px !important; }
}
`;

let cache: OriginalData | null = null;
let sosFileIndexCache: Record<string, string> | null = null;
let handoutFileIndexCache: Record<string, string> | null = null;
let printHandoutResolverCache: Record<string, PrintHandoutTarget> | null = null;
let printHandoutResolverMtime: number | null = null;

type PrintHandoutTarget = { mod: string; file: string; ext?: string };

const sourcePath = path.join(process.cwd(), "kompendium.html");

async function loadSosFileIndex(): Promise<Record<string, string>> {
  if (sosFileIndexCache) return sosFileIndexCache;

  const index: Record<string, string> = {};
  const sosRoot = path.join(process.cwd(), "public/sos");

  try {
    const moduleDirs = await fs.readdir(sosRoot);
    for (const mod of moduleDirs) {
      const modDir = path.join(sosRoot, mod);
      const stat = await fs.stat(modDir);
      if (!stat.isDirectory()) continue;

      const files = await fs.readdir(modDir);
      for (const file of files) {
        if (file.endsWith(".html")) {
          index[file.slice(0, -5)] = mod;
        }
      }
    }
  } catch {
    // Brak folderu public/sos — SOS-y jeszcze niewycięte z masterów.
  }

  sosFileIndexCache = index;
  return index;
}

function buildHandoutIndexExtensionScript(fileIndex: Record<string, string>) {
  return `(function () {
  var fileIndex = ${JSON.stringify(fileIndex)};
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

function buildPrintHandoutResolverScript(resolver: Record<string, PrintHandoutTarget>) {
  return `(function () {
  window.PRINT_HANDOUT_RESOLVER = ${JSON.stringify(resolver)};
  fetch("/handouts/print-resolver.json", { credentials: "same-origin" })
    .then(function (resp) {
      return resp.ok ? resp.json() : null;
    })
    .then(function (data) {
      if (data && data.resolver) {
        window.PRINT_HANDOUT_RESOLVER = data.resolver;
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
    const data = JSON.parse(raw) as { resolver?: Record<string, PrintHandoutTarget> };
    printHandoutResolverCache = data.resolver ?? {};
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

  const index: Record<string, string> = {};
  const printRoot = path.join(process.cwd(), "public/handouts/print");

  try {
    const moduleDirs = await fs.readdir(printRoot);
    for (const mod of moduleDirs) {
      const modDir = path.join(printRoot, mod);
      const stat = await fs.stat(modDir);
      if (!stat.isDirectory()) continue;

      const files = await fs.readdir(modDir);
      for (const file of files) {
        if (file.startsWith("_")) continue;
        if (file.endsWith(".html") || file.endsWith(".pdf")) {
          index[file.replace(/\.(html|pdf)$/, "")] = mod;
        }
      }
    }
  } catch {
    // Brak folderu public/handouts/print.
  }

  handoutFileIndexCache = index;
  return index;
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

async function loadOriginalData(): Promise<OriginalData> {
  if (cache) return cache;

  const source = await fs.readFile(sourcePath, "utf8");
  const style = source.match(/<style>([\s\S]*?)<\/style>/i)?.[1] ?? "";
  const moduleFeatureStyles = extractModuleFeatureStyles(source);
  const handoutScriptRaw =
    source.match(
      /(\/\/ === HANDOUT SYSTEM ===[\s\S]*?async function downloadFilledSOS\([\s\S]*?\}\s*)/
    )?.[1] ?? "";
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
    /<div class="tab-content"[^>]*id="tab-([^"]+)"[\s\S]*?(?=<div class="tab-content"|<\/body>)/g;

  for (const match of source.matchAll(moduleRegex)) {
    const slug = match[1];
    const html = match[0];
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

  cache = {
    style,
    moduleFeatureStyles,
    header,
    homeScreen,
    handoutScript,
    moduleUiScript,
    handoutOverlay,
    modules
  };
  return cache;
}

const KOMPENDIUM_HOME_BRIDGE_SCRIPT = `(function () {
  function goModule(slug) {
    if (!slug) return;
    window.top.location.href = "/modules/" + encodeURIComponent(slug);
  }

  document.querySelectorAll(".home-btn[data-tab]").forEach(function (btn) {
    btn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      goModule(btn.getAttribute("data-tab"));
    });
  });

  window.openToolsBrowser = function () {
    window.top.location.href = "/";
  };

  window.openPlanner = function () {
    window.top.location.href = "/";
  };

  var logo = document.querySelector(".logo");
  if (logo) {
    logo.style.cursor = "pointer";
    logo.addEventListener("click", function () {
      window.top.location.href = "/";
    });
  }

  var homeBtn = document.getElementById("home-btn");
  if (homeBtn) {
    homeBtn.addEventListener("click", function () {
      window.top.location.href = "/";
    });
  }

  var backBtn = document.getElementById("back-btn");
  if (backBtn) {
    backBtn.style.display = "none";
  }
})();`;

export async function getKompendiumHomeDocument() {
  const data = await loadOriginalData();
  if (!data.homeScreen) return null;

  const homeHtml = data.homeScreen
    .replace(/style="display:\s*none"/gi, "")
    .replace(
      'class="home-screen"',
      'class="home-screen visible"'
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
.nav-bar, .tab-content, .scroll-top { display: none !important; }
.home-screen { display: block !important; }
.header-search { display: none; }
#planner-btn { display: none; }
    </style>
  </head>
  <body>
${data.header}
${homeHtml}
    <script>
${KOMPENDIUM_HOME_BRIDGE_SCRIPT}
    </script>
  </body>
</html>`;

  return { document: doc };
}

export async function getOriginalModulesList() {
  const { modules } = await loadOriginalData();
  return modules.map(({ slug, title, subtitle }) => ({ slug, title, subtitle }));
}

export async function getOriginalModuleBySlug(slug: string) {
  const { modules } = await loadOriginalData();
  return modules.find((module) => module.slug === slug) ?? null;
}

export async function getOriginalModuleDocument(slug: string) {
  const data = await loadOriginalData();
  const sosFileIndex = await loadSosFileIndex();
  const handoutFileIndex = await loadHandoutFileIndex();
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
    <base href="/" />
    <style>
${data.style}
${data.moduleFeatureStyles}
${HOWTO_VIEW_LAYOUT_STYLES}
body { opacity: 1 !important; padding-bottom: 16px !important; }
.nav-bar, .home-screen, .home-footer { display: none !important; }
.header-search, #planner-btn { display: none; }
.tab-content { display: block !important; }
.tab-content .main { padding-bottom: 20px; }
    </style>
  </head>
  <body>
${data.header}
<button class="scroll-top" id="scroll-top" title="Do góry">↑</button>
${cleanedHtml}
${data.handoutOverlay}
    <script>
${data.handoutScript}
    </script>
    <script>
${buildSosIndexExtensionScript(sosFileIndex)}
    </script>
    <script>
${buildHandoutIndexExtensionScript(handoutFileIndex)}
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
${data.moduleUiScript}
    </script>
    <script>
${KOMPENDIUM_MODULE_NAV_SCRIPT}
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
