#!/usr/bin/env node
// Kompiluje "łatwo dorzucaną" treść do statycznie importowanego JSON-a:
//   content/extra/tools/<tab>/<cid>.json  -> nowe karty narzędzi w module <tab>
//   content/extra/modules/<tab>.json      -> definicje całych nowych modułów
//   public/howto/<tab>/<topic>.html       -> poradniki "Jak pracować z..." per subsekcja
// Wynik: src/lib/extra-content.json — importowany statycznie przez
// originalModules.ts (musi trafiać do bundla funkcji na Vercelu; odczyt fs
// z public/ jest tam wycięty przez outputFileTracingExcludes — patrz historia
// sos-file-index.json).
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const toolsRoot = path.join(root, "content/extra/tools");
const modulesRoot = path.join(root, "content/extra/modules");
const howtoRoot = path.join(root, "public/howto");
const outPath = path.join(root, "src/lib/extra-content.json");

function listDirs(p) {
  if (!fs.existsSync(p)) return [];
  return fs.readdirSync(p).filter((f) => fs.statSync(path.join(p, f)).isDirectory());
}
function listFiles(p, ext) {
  if (!fs.existsSync(p)) return [];
  return fs.readdirSync(p).filter((f) => f.endsWith(ext)).sort();
}

// --- Narzędzia ---
const tools = {};
let toolCount = 0;
for (const tab of listDirs(toolsRoot)) {
  const entries = [];
  for (const file of listFiles(path.join(toolsRoot, tab), ".json")) {
    const raw = JSON.parse(fs.readFileSync(path.join(toolsRoot, tab, file), "utf8"));
    const id = raw.id || file.slice(0, -5);
    if (!raw.name) throw new Error(`Narzędzie ${tab}/${file}: brak pola "name"`);
    entries.push({ ...raw, id, tab });
    toolCount++;
  }
  if (entries.length) tools[tab] = entries;
}

// --- Moduły ---
const modules = [];
for (const file of listFiles(modulesRoot, ".json")) {
  const raw = JSON.parse(fs.readFileSync(path.join(modulesRoot, file), "utf8"));
  const tab = raw.tab || file.slice(0, -5);
  if (!raw.name) throw new Error(`Moduł ${file}: brak pola "name"`);
  modules.push({ ...raw, tab });
}

// --- Poradniki per subsekcja ---
// Skrypt mostu: klik w element [data-go] wewnątrz poradnika (otwartego
// w pełnoekranowym iframe) prosi stronę modułu o otwarcie wskazanej karty.
// Wstrzykiwany idempotentnie przy buildzie — autor poradnika nie musi
// o nim pamiętać.
const BRIDGE_MARK = "/* kompendium-toollink-bridge */";
const BRIDGE_SCRIPT = `<script>${BRIDGE_MARK}
(function () {
  document.addEventListener("click", function (ev) {
    var el = ev.target && ev.target.closest ? ev.target.closest("[data-go]") : null;
    if (!el) return;
    ev.preventDefault();
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          { type: "kompendium-open-card", id: el.getAttribute("data-go") },
          "*"
        );
      }
    } catch (e) {}
  });
})();
</scr` + `ipt>`;

const howto = {};
let howtoCount = 0;
for (const tab of listDirs(howtoRoot)) {
  const topics = {};
  for (const file of listFiles(path.join(howtoRoot, tab), ".html")) {
    const topic = file.slice(0, -5);
    const fullPath = path.join(howtoRoot, tab, file);
    let html = fs.readFileSync(fullPath, "utf8");
    if (!html.includes(BRIDGE_MARK)) {
      html = html.includes("</body>")
        ? html.replace("</body>", BRIDGE_SCRIPT + "\n</body>")
        : html + BRIDGE_SCRIPT;
      fs.writeFileSync(fullPath, html);
    }
    const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
    // "Poradnik · Jak pracować z X" -> etykieta przycisku "Jak pracować z X"
    const label = title.replace(/^Poradnik\s*·\s*/i, "").trim() || topic;
    topics[topic] = { file: `/howto/${tab}/${file}`, label };
    howtoCount++;
  }
  if (Object.keys(topics).length) howto[tab] = topics;
}

fs.writeFileSync(
  outPath,
  JSON.stringify(
    { generatedAt: new Date().toISOString(), tools, modules, howto },
    null,
    2
  )
);
console.log(
  `extra-content.json: ${toolCount} narzędzi, ${modules.length} modułów, ${howtoCount} poradników → ${path.relative(root, outPath)}`
);
