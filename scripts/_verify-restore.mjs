import fs from "node:fs";

const html = fs.readFileSync("kompendium.html", "utf8");
const panika = html.match(
  /<div class="tab-content"[^>]*id="tab-panika"[\s\S]*?(?=<div class="tab-content"|<button class="scroll-top")/
)?.[0];

function scoreTab(tab) {
  let s = 0;
  if (tab?.includes("mod-header--gad-feat")) s += 100;
  if (tab?.includes("tool-mats")) s += 50;
  return s;
}

console.log({
  tabs: [...html.matchAll(/id="tab-/g)].length,
  sizeMB: (html.length / 1024 / 1024).toFixed(2),
  hasBody: html.includes("</body></html>"),
  hasHandoutSystem: html.includes("// === HANDOUT SYSTEM ==="),
  przewodniki: html.includes("przewodniki kliniczne"),
  hero1898: html.includes("1,898 arkuszy"),
  panikaScore: scoreTab(panika),
  howtoPanika: html.includes("Jak pracować z paniką"),
});
