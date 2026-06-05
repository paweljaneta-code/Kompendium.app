import fs from "node:fs";

const inputPath = process.argv[2] ?? "kompendium.html";
const html = fs.readFileSync(inputPath, "utf8");

console.log("File:", inputPath);
console.log("Size MB:", (html.length / 1024 / 1024).toFixed(2));
console.log("Title:", html.match(/<title>([^<]+)/)?.[1]);

const patterns = [
  "loadHandout",
  "openHandout",
  "openHandoutFile",
  "openHandoutPdf",
  "downloadStandaloneHandout",
  "openElectronic",
  "handoutData",
  "HANDOUT_INDEX",
  "handouts/",
  ".pdf",
  ".html",
];

for (const p of patterns) {
  const count = html.split(p).length - 1;
  if (count) console.log(`${p}: ${count}`);
}

const btnMatches = [...html.matchAll(/onclick="([^"]*(?:handout|Handout|electronic|pdf)[^"]*)"/gi)].slice(0, 15);
console.log("\nSample onclick:");
for (const m of btnMatches) console.log(" ", m[1].slice(0, 140));

const handoutBlock = html.match(/\/\/ === HANDOUT SYSTEM ===[\s\S]{0,8000}/);
if (handoutBlock) console.log("\nHandout system start:\n", handoutBlock[0].slice(0, 3500));
