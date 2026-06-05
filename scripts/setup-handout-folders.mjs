import fs from "node:fs";
import path from "node:path";

const sourcePath = path.resolve("kompendium.html");
const source = fs.readFileSync(sourcePath, "utf8");

const printRoot = path.resolve("public/handouts/print");
const sosRoot = path.resolve("public/sos");

const moduleSlugs = [
  ...source.matchAll(/<div class="tab-content"[^>]*id="tab-([^"]+)"/g)
].map((match) => match[1]);

const handoutIndexMatch = source.match(/window\.HANDOUT_INDEX = (\{[\s\S]*?\});/);
const sosIndexMatch = source.match(/window\.SOS_INDEX = (\{[\s\S]*?\});/);

const handoutFolders = new Set(moduleSlugs);
const sosFolders = new Set(moduleSlugs);

if (handoutIndexMatch) {
  const handoutIndex = eval("(" + handoutIndexMatch[1] + ")");
  for (const mod of Object.values(handoutIndex)) {
    handoutFolders.add(mod);
  }
}

if (sosIndexMatch) {
  const sosIndex = eval("(" + sosIndexMatch[1] + ")");
  for (const mod of Object.values(sosIndex)) {
    sosFolders.add(mod);
  }
}

for (const slug of handoutFolders) {
  fs.mkdirSync(path.join(printRoot, slug), { recursive: true });
}

for (const slug of sosFolders) {
  fs.mkdirSync(path.join(sosRoot, slug), { recursive: true });
}

const sortedModules = [...moduleSlugs].sort((a, b) => a.localeCompare(b, "pl"));

console.log("Utworzono foldery handoutow:");
console.log("- moduly kompendium (tab-content):", moduleSlugs.length);
console.log("- foldery druku (print):", handoutFolders.size);
console.log("- foldery wersji elektronicznej (sos):", sosFolders.size);
console.log("");
console.log("Sciezki:");
console.log("- public/handouts/print/<modul>/<id-narzedzia>.pdf|.html");
console.log("- public/sos/<modul>/<id-narzedzia>.html");
console.log("");
console.log("Moduly:", sortedModules.join(", "));
