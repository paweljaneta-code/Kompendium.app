import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const srcDir = path.resolve(process.env.USERPROFILE || "", "Desktop/do-wyciecia");
const sosRoot = path.join(root, "public/sos");
const kompendium = fs.readFileSync(path.join(root, "kompendium.html"), "utf8");

function extractTemplateCids(html) {
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, "");
  const cids = [];
  const openRe = /<template id="sos-template-([^"]+)">/g;
  let match;
  while ((match = openRe.exec(withoutComments)) !== null) {
    const cid = match[1];
    if (cid === "CID") continue;
    cids.push(cid);
    const closeIndex = withoutComments.indexOf("</template>", match.index + match[0].length);
    if (closeIndex === -1) break;
    openRe.lastIndex = closeIndex + "</template>".length;
  }
  return cids;
}

function buildCardModuleMap(source) {
  const map = {};
  const tabRe =
    /<div class="tab-content"[^>]*id="tab-([^"]+)"[\s\S]*?(?=<div class="tab-content"|$)/g;
  let match;
  while ((match = tabRe.exec(source)) !== null) {
    for (const cardMatch of match[0].matchAll(/<details class="card" id="([^"]+)"/g)) {
      map[cardMatch[1]] = match[1];
    }
  }
  return map;
}

const cardMap = buildCardModuleMap(kompendium);

const masterByCid = new Map();
const masterFiles = fs.readdirSync(srcDir).filter((f) => f.endsWith(".html"));
for (const file of masterFiles) {
  const html = fs.readFileSync(path.join(srcDir, file), "utf8");
  for (const cid of extractTemplateCids(html)) {
    masterByCid.set(cid, file);
  }
}

const diskByCid = new Map();
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name.endsWith(".html")) {
      diskByCid.set(entry.name.slice(0, -5), path.basename(path.dirname(p)));
    }
  }
}
walk(sosRoot);

const missingOnDisk = [...masterByCid.keys()].filter((cid) => !diskByCid.has(cid));
const extraOnDisk = [...diskByCid.keys()].filter(
  (cid) => !masterByCid.has(cid) || cid === "CID"
);
const junkFiles = [...diskByCid.keys()].filter((cid) => cid === "CID");
const wrongModule = [];
for (const [cid, mod] of diskByCid) {
  const expected = cardMap[cid];
  if (expected && expected !== mod) {
    wrongModule.push({ cid, onDisk: mod, expected });
  }
}

const byModule = {};
for (const [, mod] of diskByCid) {
  byModule[mod] = (byModule[mod] || 0) + 1;
}

console.log("=== Weryfikacja wyciecia SOS ===");
console.log("");
console.log("Pliki master (do-wyciecia):", masterFiles.length);
console.log("Unikalne narzedzia w masterach:", masterByCid.size);
console.log("Pliki w public/sos:", diskByCid.size);
console.log("Moduly z plikami:", Object.keys(byModule).length);
console.log("");

if (missingOnDisk.length === 0) {
  console.log("OK: Wszystkie narzedzia z masterow sa na dysku.");
} else {
  console.log("BRAK na dysku (" + missingOnDisk.length + "):");
  for (const cid of missingOnDisk) {
    console.log("  - " + cid + " (z " + masterByCid.get(cid) + ")");
  }
}

console.log("");
if (extraOnDisk.length === 0) {
  console.log("OK: Brak dodatkowych plikow poza masterami.");
} else {
  console.log("Extra pliki (" + extraOnDisk.length + "):", extraOnDisk.join(", "));
}

console.log("");
if (wrongModule.length === 0) {
  console.log("OK: Wszystkie pliki sa w folderach zgodnych z kompendium.");
} else {
  console.log("Niezgodny folder modulu (" + wrongModule.length + "):");
  for (const item of wrongModule.slice(0, 20)) {
    console.log(
      "  - " + item.cid + ": jest " + item.onDisk + ", kompendium oczekuje " + item.expected
    );
  }
}

console.log("");
console.log("Rozklad per modul:");
for (const [mod, count] of Object.entries(byModule).sort((a, b) => a[0].localeCompare(b[0], "pl"))) {
  console.log("  " + mod + ": " + count);
}
