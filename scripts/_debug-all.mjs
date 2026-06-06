import fs from "node:fs";
import { JSDOM } from "jsdom";
import { getKompendiumHomeDocument, getOriginalModulesList } from "../src/lib/originalModules.ts";

const html = fs.readFileSync("kompendium.html", "utf8");
const tabIds = [...html.matchAll(/id="tab-([^"]+)"/g)].map((m) => m[1]);
const uniqueTabs = [...new Set(tabIds)];

console.log("=== kompendium.html ===");
console.log({
  sizeMB: (html.length / 1024 / 1024).toFixed(2),
  tabCount: uniqueTabs.length,
  hasClosingTags: html.includes("</body></html>"),
  hero1898: html.includes("1,898 arkuszy"),
  przewodniki: html.includes("przewodniki kliniczne"),
  openToolsBrowser: html.includes("openToolsBrowser('handout')"),
  globalSearch: html.includes('id="global-search"'),
});

const modules = await getOriginalModulesList();
console.log("\n=== modules API ===");
console.log({ count: modules.length, sample: modules.slice(0, 3).map((m) => m.slug) });

const home = await getKompendiumHomeDocument();
if (!home) {
  console.error("FAIL: getKompendiumHomeDocument returned null");
  process.exit(1);
}

const doc = home.document;
const scriptOpen = (doc.match(/<script>/g) || []).length;
const scriptClose = (doc.match(/<\/script>/g) || []).length;

console.log("\n=== home iframe doc ===");
console.log({
  sizeKB: Math.round(doc.length / 1024),
  scriptTagsBalanced: scriptOpen === scriptClose,
  scriptOpen,
  scriptClose,
  hasSearch: doc.includes('id="global-search"'),
  hasToolsModal: doc.includes("toolsBrowserModal"),
  hasSemanticSearch: doc.includes("searchKompendiumSemantic"),
  searchIndexCards: (doc.match(/<details class="card"/g) || []).length,
  headerSearchHidden: doc.includes(".header-search { display: none"),
});

const dom = new JSDOM(doc, { runScripts: "dangerously", url: "http://localhost/" });
await new Promise((r) => setTimeout(r, 400));

const win = dom.window;
const errors = [];
const origError = win.console.error;
win.console.error = (...args) => errors.push(args.join(" "));

const gs = win.document.getElementById("global-search");
const gsResults = win.document.getElementById("gs-results");

let searchOk = false;
if (gs && typeof win.searchKompendiumSemantic === "function") {
  gs.value = "depresja";
  gs.dispatchEvent(new win.Event("input", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 300));
  searchOk =
    gsResults?.classList.contains("visible") &&
    (gsResults?.innerHTML?.length ?? 0) > 100;
}

let toolsOk = false;
if (typeof win.openToolsBrowser === "function") {
  win.openToolsBrowser("handout");
  const modal = win.document.getElementById("toolsBrowserModal");
  toolsOk = modal?.style.display === "flex";
  win.closeToolsBrowser?.();
}

console.log("\n=== handout script ===");
const handoutStart = doc.indexOf("function printDoc(");
const handoutEnd = doc.indexOf("</script>", handoutStart);
const handoutChunk = handoutStart === -1 ? "" : doc.slice(handoutStart, handoutEnd);
console.log({
  handoutLen: handoutChunk.length,
  endsWithDownloadFilled: handoutChunk.includes("doDownload(blob, fname)"),
  balancedBraces:
    (handoutChunk.match(/\{/g) || []).length ===
    (handoutChunk.match(/\}/g) || []).length
});

console.log("\n=== runtime (jsdom) ===");
console.log({
  searchKompendiumSemantic: typeof win.searchKompendiumSemantic,
  openToolsBrowser: typeof win.openToolsBrowser,
  goModule: typeof win.goModule,
  searchResultsVisible: searchOk,
  toolsBrowserOpens: toolsOk,
  jsErrors: errors.filter((e) => !e.includes("fetch is not defined")).slice(0, 5),
});

const failed = [];
if (uniqueTabs.length < 80) failed.push(`tab count low: ${uniqueTabs.length}`);
if (!html.includes("</body></html>")) failed.push("kompendium.html truncated");
if (!searchOk) failed.push("global search no results");
if (!toolsOk) failed.push("tools browser modal failed");
if (handoutChunk.length < 110000) failed.push("handout script truncated");
if (
  handoutChunk &&
  (handoutChunk.match(/\{/g) || []).length !== (handoutChunk.match(/\}/g) || []).length
) {
  failed.push("handout script unbalanced braces");
}

console.log("\n=== verdict ===");
if (failed.length) {
  console.error("ISSUES:", failed);
  process.exit(1);
}
console.log("OK — all checks passed");
