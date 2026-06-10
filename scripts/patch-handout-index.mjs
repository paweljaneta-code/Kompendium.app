import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const kompendiumPath = path.join(root, "kompendium.html");

function parseHandoutIndex(source) {
  const marker = "window.HANDOUT_INDEX = ";
  const start = source.indexOf(marker);
  if (start === -1) return { json: "{}", start: -1, end: -1 };
  const jsonStart = start + marker.length;
  let depth = 0;
  for (let i = jsonStart; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (!depth) {
        return {
          index: eval("(" + source.slice(jsonStart, i + 1) + ")"),
          start: jsonStart,
          end: i + 1
        };
      }
    }
  }
  return { index: {}, start: -1, end: -1 };
}

function buildCardModuleMap(source) {
  const map = {};
  const tabRe =
    /<div class="tab-content"[^>]*id="tab-([^"]+)"[\s\S]*?(?=<div class="tab-content"|<button class="scroll-top")/g;
  for (const match of source.matchAll(tabRe)) {
    for (const cm of match[0].matchAll(/<details class="card" id="([^"]+)"/g)) {
      map[cm[1]] = match[1];
    }
  }
  return map;
}

function buildOpenHandoutIds(source) {
  const ids = new Set();
  for (const match of source.matchAll(/openHandout\(['"]([^'"]+)['"]\)/g)) {
    ids.add(match[1]);
  }
  return ids;
}

let source = fs.readFileSync(kompendiumPath, "utf8");
const { index, start, end } = parseHandoutIndex(source);
const cardMap = buildCardModuleMap(source);
const openIds = buildOpenHandoutIds(source);

let added = 0;
for (const id of openIds) {
  if (index[id]) continue;
  if (!cardMap[id]) continue;
  index[id] = cardMap[id];
  added++;
}

if (!added) {
  console.log("HANDOUT_INDEX: brak nowych wpisów");
  process.exit(0);
}

const newJson = JSON.stringify(index);
source =
  source.slice(0, start) + newJson + source.slice(end);
fs.writeFileSync(kompendiumPath, source);
console.log(`HANDOUT_INDEX: dodano ${added} wpisów (razem ${Object.keys(index).length})`);
