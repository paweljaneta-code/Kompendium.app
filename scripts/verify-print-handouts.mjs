import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const komp = fs.readFileSync(path.join(root, "kompendium.html"), "utf8");
const marker = "window.HANDOUT_INDEX = ";
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
const handoutIndex = eval("(" + komp.slice(start, end) + ")");
const printRoot = path.join(root, "public/handouts/print");

const missing = [];
let covered = 0;
for (const [cid, mod] of Object.entries(handoutIndex)) {
  const pdf = path.join(printRoot, mod, cid + ".pdf");
  const html = path.join(printRoot, mod, cid + ".html");
  if (fs.existsSync(pdf) || fs.existsSync(html)) covered++;
  else missing.push({ cid, mod });
}

let disk = 0;
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(html|pdf)$/i.test(e.name)) disk++;
  }
}
walk(printRoot);

console.log("HANDOUT_INDEX:", Object.keys(handoutIndex).length);
console.log("Pliki na dysku:", disk);
console.log("Indeks z plikiem:", covered);
console.log("Brak w indeksie:", missing.length);
if (missing.length) console.log("Przyklady:", missing.slice(0, 15));
