import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const htmlPath = path.join(root, "kompendium.html");
const modulesDir = path.join(root, "content/modules");

const MIN_FILE_BYTES = 20 * 1024 * 1024;
const MIN_TAB_COUNT = 80;

const originalSize = fs.statSync(htmlPath).size;
const htmlRaw = fs.readFileSync(htmlPath, "utf8");
const originalTabs = [...htmlRaw.matchAll(/id="tab-/g)].length;

if (originalSize < MIN_FILE_BYTES || originalTabs < MIN_TAB_COUNT) {
  console.error(
    `Refusing to patch: file looks truncated (${(originalSize / 1024 / 1024).toFixed(2)} MB, ${originalTabs} tabs)`
  );
  process.exit(1);
}

let html = htmlRaw;

function loadIndexCounts(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const index = data.index ?? {};
    const byMod = {};
    for (const mod of Object.values(index)) {
      byMod[mod] = (byMod[mod] ?? 0) + 1;
    }
    return byMod;
  } catch {
    return {};
  }
}

const handoutByMod = loadIndexCounts(
  path.join(root, "public/handouts/handout-file-index.json")
);
const sosByMod = loadIndexCounts(path.join(root, "public/sos/sos-file-index.json"));

function parseMeta(meta) {
  const handouts = meta.match(/(\d+)\s+handout/i)?.[1];
  const sos = meta.match(/(\d+)\s+wersj/i)?.[1];
  return {
    handouts: handouts ? Number(handouts) : 0,
    sos: sos ? Number(sos) : 0,
  };
}

function countFromTab(tabHtml) {
  const handouts = (tabHtml.match(/class="tool-mat tm-print"/g) || []).length;
  const sos = (tabHtml.match(/class="tool-mat tm-elec"/g) || []).length;
  return { handouts, sos };
}

function countFromMarkdown(slug) {
  const mdPath = path.join(modulesDir, `${slug}.md`);
  if (!fs.existsSync(mdPath)) return null;
  const md = fs.readFileSync(mdPath, "utf8");
  return {
    handouts: (md.match(/🖨️ Handout do wydruku/g) || []).length,
    sos: (md.match(/📤 Wersja elektroniczna/g) || []).length,
  };
}

function resolveCounts(slug, tabHtml, metaText) {
  const tab = countFromTab(tabHtml);
  const meta = metaText ? parseMeta(metaText) : { handouts: 0, sos: 0 };
  const md = countFromMarkdown(slug);
  const index = {
    handouts: handoutByMod[slug] ?? 0,
    sos: sosByMod[slug] ?? 0,
  };

  const handouts =
    tab.handouts ||
    meta.handouts ||
    md?.handouts ||
    index.handouts ||
    0;
  const sos =
    tab.sos ||
    meta.sos ||
    md?.sos ||
    index.sos ||
    0;

  return { handouts, sos, source: tab.sos ? "tab" : meta.sos ? "meta" : md?.sos ? "md" : "index" };
}

function statsHtml(handouts, sos) {
  if (handouts > 0 && sos > 0) {
    return `<div class="home-btn-stats"><span class="home-btn-stat"><span class="home-btn-stat-icon">📄</span>${handouts}</span><span class="home-btn-stat-sep">·</span><span class="home-btn-stat"><span class="home-btn-stat-icon">📱</span>${sos}</span></div>`;
  }
  if (handouts > 0) {
    return `<div class="home-btn-stats"><span class="home-btn-stat"><span class="home-btn-stat-icon">📄</span>${handouts}</span></div>`;
  }
  if (sos > 0) {
    return `<div class="home-btn-stats"><span class="home-btn-stat"><span class="home-btn-stat-icon">📱</span>${sos}</span></div>`;
  }
  return "";
}

const tabRegex =
  /<div class="tab-content"[^>]*id="tab-([^"]+)"[\s\S]*?(?=<div class="tab-content"|<button class="scroll-top")/g;
const counts = {};

for (const match of html.matchAll(tabRegex)) {
  const slug = match[1];
  const tabHtml = match[0];
  const metaText = tabHtml.match(/<div class="mod-header-meta">([^<]+)<\/div>/)?.[1];
  counts[slug] = resolveCounts(slug, tabHtml, metaText);
}

const homeStart = html.indexOf('<div class="home-screen"');
const homeEnd = html.indexOf('<button class="scroll-top"', homeStart);
if (homeStart === -1 || homeEnd === -1) {
  console.error("home-screen not found");
  process.exit(1);
}

const homeBefore = html.slice(homeStart, homeEnd);
let home = homeBefore;
let updated = 0;
let mobileAdded = 0;
const missing = [];

home = home.replace(
  /<button class="home-btn" data-tab="([^"]+)"[\s\S]*?<\/button>/g,
  (btn, slug) => {
    if (!btn.includes("home-btn-stats")) return btn;

    const c = counts[slug];
    if (!c) {
      missing.push(slug);
      return btn;
    }

    const hadMobile = btn.includes("📱");
    const newStats = statsHtml(c.handouts, c.sos);
    const next = btn.replace(
      /<div class="home-btn-stats">[\s\S]*?<\/div>/,
      newStats
    );
    if (next !== btn) {
      updated++;
      if (!hadMobile && c.sos > 0) mobileAdded++;
    }
    return next;
  }
);

if (home === homeBefore) {
  console.log("No home card changes needed");
  process.exit(0);
}

html = html.slice(0, homeStart) + home + html.slice(homeEnd);

const finalTabs = [...html.matchAll(/id="tab-/g)].length;
if (finalTabs < originalTabs) {
  console.error(`Refusing to write: tab count dropped ${originalTabs} -> ${finalTabs}`);
  process.exit(1);
}

fs.writeFileSync(htmlPath, html, "utf8");

const newSize = fs.statSync(htmlPath).size;
if (newSize < originalSize * 0.95) {
  console.error("Written file shrank unexpectedly — restoring backup");
  fs.writeFileSync(htmlPath, htmlRaw, "utf8");
  process.exit(1);
}

console.log(`Updated ${updated} home module cards (${mobileAdded} gained 📱)`);
if (missing.length) console.log("No counts for:", missing.join(", "));

const withBoth = Object.values(counts).filter((c) => c.handouts > 0 && c.sos > 0).length;
const totalH = Object.values(counts).reduce((a, c) => a + c.handouts, 0);
const totalS = Object.values(counts).reduce((a, c) => a + c.sos, 0);
console.log(`Modules with both types: ${withBoth}/${Object.keys(counts).length}`);
console.log(`Totals: ${totalH} handouts, ${totalS} electronic`);
console.log(`File: ${(newSize / 1024 / 1024).toFixed(2)} MB, tabs: ${finalTabs}`);
