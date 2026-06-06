import { execSync } from "node:child_process";
import fs from "node:fs";

const git = "C:\\Program Files\\Git\\cmd\\git.exe";
let html = execSync(`"${git}" show HEAD:kompendium.html`, {
  encoding: "utf8",
  maxBuffer: 100 * 1024 * 1024
});

const SVG = {
  pill20:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true"><path d="M4.5 12.5l8 -8a4.94 4.94 0 0 1 7 7l-8 8a4.94 4.94 0 0 1 -7 -7"/><path d="M8.5 8.5l7 7"/></svg>',
  pill24:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="24" height="24" aria-hidden="true"><path d="M4.5 12.5l8 -8a4.94 4.94 0 0 1 7 7l-8 8a4.94 4.94 0 0 1 -7 -7"/><path d="M8.5 8.5l7 7"/></svg>',
  dice20:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/><circle cx="15" cy="9" r="1"/><circle cx="9" cy="15" r="1"/><circle cx="12" cy="12" r="1"/></svg>',
  dice24:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="24" height="24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/><circle cx="15" cy="9" r="1"/><circle cx="9" cy="15" r="1"/><circle cx="12" cy="12" r="1"/></svg>'
};

const PLACEHOLDER =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="24" height="24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>';

const drugsHomeOld =
  `<button class="home-btn" data-tab="drugs" style="--btn-color:#8a6235">
                <span class="home-btn-icon">💊</span>
                <span class="home-btn-title">Narkotyki i leki</span>
                <span class="home-btn-count">20 narzędzi</span>
                <span class="home-btn-desc">Opioidy, stymulanty, kannabinoidy, benzodiazepiny, nikotyna, NPS</span>
            </button>`;

const drugsHomeNew = `<button class="home-btn" data-tab="drugs" style="--btn-color:#8a6235"><span class="card-icon">${SVG.pill20}</span><span class="home-btn-name">Narkotyki i leki</span><div class="home-btn-stats"><span class="home-btn-stat"><span class="home-btn-stat-icon">📄</span>20 handoutów</span></div><span class="home-btn-desc">Opioidy, stymulanty, kannabinoidy, benzodiazepiny, nikotyna, NPS</span></button>`;

const behavHomeOld =
  `<button class="home-btn" data-tab="behav-add" style="--btn-color:#8a6235">
                <span class="home-btn-icon">🎰</span>
                <span class="home-btn-title">Uzależnienia behawioralne</span>
                <span class="home-btn-count">16 narzędzi</span>
                <span class="home-btn-desc">Hazard, gaming, CSBD, kompulsywne zakupy, food addiction</span>
            </button>`;

const behavHomeNew = `<button class="home-btn" data-tab="behav-add" style="--btn-color:#8a6235"><span class="card-icon">${SVG.dice20}</span><span class="home-btn-name">Uzależnienia behawioralne</span><div class="home-btn-stats"><span class="home-btn-stat"><span class="home-btn-stat-icon">📄</span>16 handoutów</span></div><span class="home-btn-desc">Hazard, gaming, CSBD, kompulsywne zakupy, food addiction</span></button>`;

if (!html.includes(drugsHomeOld)) throw new Error("drugs home button pattern not found");
if (!html.includes(behavHomeOld)) throw new Error("behav-add home button pattern not found");

html = html.replace(drugsHomeOld, drugsHomeNew);
html = html.replace(behavHomeOld, behavHomeNew);

function patchModHeader(tabId, iconSvg) {
  const marker = `id="tab-${tabId}"`;
  const start = html.indexOf(marker);
  if (start === -1) throw new Error(`tab-${tabId} not found`);
  const headerStart = html.indexOf('<div class="mod-header-icon">', start);
  const headerEnd = html.indexOf("</div>", headerStart);
  if (headerStart === -1 || headerEnd === -1) throw new Error(`mod-header-icon for ${tabId} not found`);
  const block = html.slice(headerStart, headerEnd);
  if (!block.includes(PLACEHOLDER)) throw new Error(`placeholder icon for ${tabId} not found`);
  html =
    html.slice(0, headerStart) +
    `<div class="mod-header-icon">${iconSvg}` +
    html.slice(headerEnd);
}

patchModHeader("drugs", SVG.pill24);
patchModHeader("behav-add", SVG.dice24);

fs.writeFileSync("kompendium.html", html, "utf8");

console.log("Patched kompendium.html");
console.log("lines:", html.split("\n").length);
console.log("tab-drugs:", html.includes("tab-drugs"));
console.log("tab-behav-add:", html.includes("tab-behav-add"));
console.log("drugs home card-icon:", html.includes('data-tab="drugs"') && html.includes("card-icon"));
console.log("behav home card-icon:", html.includes('data-tab="behav-add"') && html.includes("card-icon"));
