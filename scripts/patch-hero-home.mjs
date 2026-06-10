import fs from "node:fs";
import path from "node:path";

const htmlPath = path.join(path.resolve(import.meta.dirname, ".."), "kompendium.html");
let html = fs.readFileSync(htmlPath, "utf8");

const replacements = [
  [
    "<p>Narzędzia do druku, wersje elektroniczne i ścieżki kliniczne — pogrupowane po obszarze pracy.</p>",
    "<p>Narzędzia do druku, wersje elektroniczne i przewodniki kliniczne — pogrupowane po obszarze pracy.</p>",
  ],
  [
    '<div class="home-action-count">2,234 arkuszy A4</div>',
    '<div class="home-action-count">1,898 arkuszy A4</div>',
  ],
  [
    '<div class="home-action-count">895 interaktywnych narzędzi</div>',
    '<div class="home-action-count">1,391 interaktywnych narzędzi</div>',
  ],
  [
    '<div class="home-action-title">Ścieżki kliniczne</div>',
    '<div class="home-action-title">Przewodniki kliniczne</div>',
  ],
  [
    "<p>Zorza — Narzędzia terapeutyczne dla klinicystów · 2,234 handoutów · 895 wersji elektronicznych · 86 modułów</p>",
    "<p>Zorza — Narzędzia terapeutyczne dla klinicystów · 1,898 handoutów · 1,391 wersji elektronicznych · 86 modułów</p>",
  ],
  ['data-tab="core-beliefs" style="--btn-color:#3a6a8a"', 'data-tab="core-beliefs" style="--btn-color:#558a72"'],
  ['data-tab="stpp" style="--btn-color:#4a3a7a"', 'data-tab="stpp" style="--btn-color:#558a72"'],
  ['data-tab="empathy-comm" style="--btn-color:#3a7a7a"', 'data-tab="empathy-comm" style="--btn-color:#558a72"'],
  ['data-tab="systemowa" style="--btn-color:#4a7a7a"', 'data-tab="systemowa" style="--btn-color:#558a72"'],
  ['data-tab="mi" style="--btn-color:#2a6a7a"', 'data-tab="mi" style="--btn-color:#558a72"'],
  ['data-tab="suicide" style="--btn-color:#6a1b1b"', 'data-tab="suicide" style="--btn-color:#8a2a2a"'],
  ['data-tab="genogram" style="--btn-color:#5a7a8a"', 'data-tab="genogram" style="--btn-color:#5a4a7a"'],
];

let applied = 0;
for (const [from, to] of replacements) {
  if (!html.includes(from)) continue;
  html = html.replaceAll(from, to);
  applied++;
}

fs.writeFileSync(htmlPath, html, "utf8");
console.log(`patch-hero-home: applied ${applied}/${replacements.length} replacements`);
console.log("tabs:", [...html.matchAll(/id="tab-/g)].length);
console.log("size MB:", (html.length / 1024 / 1024).toFixed(2));
