// Buduje indeks { cid: mod } dla wszystkich plików SOS i zapisuje go OBOK
// route'a (src/app/s/[cid]/sos-index.json), aby był importowany statycznie i
// na pewno trafiał do bundla funkcji na Vercelu (niezależnie od
// outputFileTracingExcludes na public/sos/**). Route 307-redirectuje do
// statycznego /sos/<mod>/<cid>.html.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sosRoot = path.join(root, "public/sos");
const out = path.join(root, "src/app/s/[cid]/sos-index.json");

const index = {};
for (const mod of fs.readdirSync(sosRoot)) {
  const dir = path.join(sosRoot, mod);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith(".html")) index[file.slice(0, -5)] = mod;
  }
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(index));
console.log(`sos-index.json: ${Object.keys(index).length} wpisów → ${path.relative(root, out)}`);
