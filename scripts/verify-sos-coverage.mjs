import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const komp = fs.readFileSync(path.join(root, "kompendium.html"), "utf8");
const marker = "window.SOS_INDEX = ";
const start = komp.indexOf(marker) + marker.length;
let depth = 0;
let end = start;
for (let i = start; i < komp.length; i++) {
  if (komp[i] === "{") depth++;
  else if (komp[i] === "}") {
    depth--;
    if (!depth) {
      end = i + 1;
      break;
    }
  }
}
const sosIndex = eval("(" + komp.slice(start, end) + ")");

const disk = new Map();
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name.endsWith(".html")) {
      disk.set(entry.name.slice(0, -5), path.basename(path.dirname(p)));
    }
  }
}
walk(path.join(root, "public/sos"));

const missing = Object.entries(sosIndex)
  .filter(([cid]) => !disk.has(cid))
  .map(([cid, mod]) => ({ cid, mod }));

console.log("Brak pliku dla wpisow SOS_INDEX (" + missing.length + "):");
for (const item of missing) {
  console.log("  " + item.cid + " -> " + item.mod);
}

const wrongMod = Object.entries(sosIndex).filter(([cid, mod]) => disk.has(cid) && disk.get(cid) !== mod);
if (wrongMod.length) {
  console.log("");
  console.log("Zly folder (" + wrongMod.length + "):");
  for (const [cid, mod] of wrongMod.slice(0, 20)) {
    console.log("  " + cid + ": indeks=" + mod + ", dysk=" + disk.get(cid));
  }
}

console.log("");
console.log("Pliki na dysku:", disk.size);
