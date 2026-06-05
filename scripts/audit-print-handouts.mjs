import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const kompendium = fs.readFileSync(path.join(root, "kompendium.html"), "utf8");
const printRoot = path.join(root, "public/handouts/print");

const handoutIndex = eval(
  "(" + kompendium.match(/window\.HANDOUT_INDEX = (\{[\s\S]*?\});/)[1] + ")"
);

const openHandoutIds = new Set();
for (const match of kompendium.matchAll(/openHandout\(['"]([^'"]+)['"]\)/g)) {
  openHandoutIds.add(match[1]);
}

let missing = 0;
let wrongName = 0;
const samples = [];

for (const id of openHandoutIds) {
  const mod = handoutIndex[id];
  if (!mod) continue;

  const modDir = path.join(printRoot, mod);
  if (!fs.existsSync(modDir)) {
    missing++;
    continue;
  }

  const exact =
    fs.existsSync(path.join(modDir, `${id}.pdf`)) ||
    fs.existsSync(path.join(modDir, `${id}.html`));

  if (exact) continue;

  const files = fs.readdirSync(modDir).filter((f) => /\.(pdf|html)$/i.test(f));
  const tokens = id.split("-").filter(Boolean);
  const candidates = files.filter((f) => {
    const base = f.replace(/\.(pdf|html)$/i, "").toLowerCase();
    return tokens.every((t) => base.includes(t));
  });

  if (candidates.length) {
    wrongName++;
    if (samples.length < 15) {
      samples.push({ id, mod, candidates: candidates.slice(0, 3) });
    }
  } else {
    missing++;
  }
}

console.log("openHandout ids:", openHandoutIds.size);
console.log("missing print file:", missing);
console.log("wrong filename (candidate exists):", wrongName);
console.log("samples:");
for (const s of samples) {
  console.log(`  ${s.id} (${s.mod}) -> ${s.candidates.join(", ")}`);
}
