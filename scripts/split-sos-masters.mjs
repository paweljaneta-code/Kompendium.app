import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const kompendiumPath = path.resolve(projectRoot, "kompendium.html");
const sosRoot = path.resolve(projectRoot, "public/sos");

const defaultSourceDirs = [
  path.resolve(process.env.USERPROFILE || process.env.HOME || "", "Desktop/do-wyciecia"),
  path.resolve(process.env.USERPROFILE || process.env.HOME || "", "Desktop/do wyciecia"),
];

const sourceDirs = process.argv.slice(2).length
  ? process.argv.slice(2).map((p) => path.resolve(p))
  : defaultSourceDirs.filter((dir) => fs.existsSync(dir));

if (!sourceDirs.length) {
  console.error("Brak folderu z plikami master. Podaj sciezke:");
  console.error("  node scripts/split-sos-masters.mjs \"C:\\Users\\...\\Desktop\\do-wyciecia\"");
  process.exit(1);
}

function parseSosIndex(source) {
  const marker = "window.SOS_INDEX = ";
  const start = source.indexOf(marker);
  if (start === -1) return {};
  const jsonStart = start + marker.length;
  let depth = 0;
  for (let i = jsonStart; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return eval("(" + source.slice(jsonStart, i + 1) + ")");
      }
    }
  }
  return {};
}

function buildCardModuleMap(source) {
  const map = {};
  const tabRe = /<div class="tab-content"[^>]*id="tab-([^"]+)"[\s\S]*?(?=<div class="tab-content"|$)/g;
  let match;
  while ((match = tabRe.exec(source)) !== null) {
    const moduleSlug = match[1];
    const chunk = match[0];
    for (const cardMatch of chunk.matchAll(/<details class="card" id="([^"]+)"/g)) {
      map[cardMatch[1]] = moduleSlug;
    }
  }
  return map;
}

function inferModuleFromFile(filePath, header) {
  const base = path.basename(filePath, path.extname(filePath));

  const tabMatch = header.match(/modu[łl]u:\s*tab-([a-z0-9-]+)/i);
  if (tabMatch) return tabMatch[1];

  const tabMatch2 = header.match(/tab-([a-z0-9-]+)/i);
  if (tabMatch2) return tabMatch2[1];

  const batchMatch = header.match(/SOS BATCH(?::|\s+MASTER:)\s*([a-z0-9-]+)/i);
  if (batchMatch) {
    const slug = batchMatch[1].replace(/-pelny$/, "");
    if (slug === "phobia") return "phobia";
    if (slug === "budget") return "budget";
    if (slug === "anger") return "anger";
    return slug;
  }

  const masterMatch = base.match(/^master-(.+)$/i);
  if (masterMatch) return masterMatch[1].replace(/-v\d+$/, "");

  const archiveMatch = base.match(/^sos-archive-([a-z0-9-]+)-v\d+$/i);
  if (archiveMatch) return archiveMatch[1];

  const nameMap = {
    AN: "an",
    fobia: "phobia",
    zaloba: "grief",
    audhd: "audhd",
    alcohol: "alcohol",
    "nowe-sos-meaning-mi-pelny": "mi",
    SOS_dermatillomania_odpiete: "derm",
    "aspd-all-sos-do-integracji": "aspd",
    "ocpd-all-sos-do-integracji": "ocpd",
    "budżet": "budget",
    budzet: "budget",
    "złosć": "anger",
    zlosc: "anger",
  };
  if (nameMap[base]) return nameMap[base];

  return null;
}

function extractTemplates(html) {
  const templates = [];
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, "");
  const openRe = /<template id="sos-template-([^"]+)">/g;
  let match;
  while ((match = openRe.exec(withoutComments)) !== null) {
    const cid = match[1];
    if (cid === "CID") continue;
    const contentStart = match.index + match[0].length;
    const closeTag = "</template>";
    const closeIndex = withoutComments.indexOf(closeTag, contentStart);
    if (closeIndex === -1) continue;
    const inner = withoutComments.slice(contentStart, closeIndex).trim();
    templates.push({ cid, inner });
    openRe.lastIndex = closeIndex + closeTag.length;
  }
  return templates;
}

function resolveModule(cid, filePath, header, cardMap, sosIndex, fileModuleHint) {
  return (
    cardMap[cid] ||
    sosIndex[cid] ||
    fileModuleHint ||
    null
  );
}

const kompendium = fs.readFileSync(kompendiumPath, "utf8");
const sosIndex = parseSosIndex(kompendium);
const cardMap = buildCardModuleMap(kompendium);

const htmlFiles = [];
for (const input of sourceDirs) {
  const stat = fs.statSync(input);
  if (stat.isFile() && input.toLowerCase().endsWith(".html")) {
    htmlFiles.push(input);
    continue;
  }
  if (!stat.isDirectory()) continue;
  for (const entry of fs.readdirSync(input, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
      htmlFiles.push(path.join(input, entry.name));
    }
  }
}

htmlFiles.sort((a, b) => a.localeCompare(b, "pl"));

const written = new Map();
const skipped = [];
const unknown = [];
let templateCount = 0;

for (const filePath of htmlFiles) {
  const html = fs.readFileSync(filePath, "utf8");
  const header = html.slice(0, 4000);
  const fileModuleHint = inferModuleFromFile(filePath, header);
  const templates = extractTemplates(html);

  if (!templates.length) {
    skipped.push(`${path.basename(filePath)} (brak <template id="sos-template-...">)`);
    continue;
  }

  for (const { cid, inner } of templates) {
    templateCount++;
    const moduleSlug = resolveModule(cid, filePath, header, cardMap, sosIndex, fileModuleHint);
    if (!moduleSlug) {
      unknown.push({ cid, file: path.basename(filePath) });
      continue;
    }

    if (!inner.includes("<!DOCTYPE") && !inner.includes("<html")) {
      skipped.push(`${cid} w ${path.basename(filePath)} (brak pelnego HTML)`);
      continue;
    }

    const outDir = path.join(sosRoot, moduleSlug);
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `${cid}.html`);

    if (written.has(outPath)) {
      const prev = written.get(outPath);
      console.warn(`Nadpisuje ${moduleSlug}/${cid}.html (${prev} -> ${path.basename(filePath)})`);
    }

    fs.writeFileSync(outPath, inner.endsWith("\n") ? inner : inner + "\n", "utf8");
    written.set(outPath, path.basename(filePath));
  }
}

const modulesUsed = new Set();
for (const outPath of written.keys()) {
  modulesUsed.add(path.basename(path.dirname(outPath)));
}

console.log("Zrodla:", sourceDirs.join(", "));
console.log("Przetworzone pliki master:", htmlFiles.length);
console.log("Znalezione templaty:", templateCount);
console.log("Zapisane pliki SOS:", written.size);
console.log("Moduly z plikami:", modulesUsed.size);
console.log("");

if (unknown.length) {
  console.log(`Bez modulu (${unknown.length}):`);
  for (const item of unknown.slice(0, 30)) {
    console.log(`  - ${item.cid} (${item.file})`);
  }
  if (unknown.length > 30) console.log(`  ... i ${unknown.length - 30} wiecej`);
  console.log("");
}

if (skipped.length) {
  console.log(`Pominiete (${skipped.length}):`);
  for (const line of skipped.slice(0, 15)) console.log(`  - ${line}`);
  if (skipped.length > 15) console.log(`  ... i ${skipped.length - 15} wiecej`);
}
