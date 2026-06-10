// Buduje public/sos-index.json: { cid: mod } dla wszystkich plików SOS.
// Mały plik (poza wykluczeniami tracingu Vercela) — route /s/[cid] importuje go
// statycznie i przekierowuje do statycznego /sos/<mod>/<cid>.html.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sosRoot = path.join(root, "public/sos");
const out = path.join(root, "public/sos-index.json");

const index = {};
for (const mod of fs.readdirSync(sosRoot)) {
  const dir = path.join(sosRoot, mod);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith(".html")) index[file.slice(0, -5)] = mod;
  }
}

fs.writeFileSync(out, JSON.stringify(index));
console.log(`sos-index.json: ${Object.keys(index).length} wpisów`);
