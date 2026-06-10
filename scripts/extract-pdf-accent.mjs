import fs from "node:fs";
import path from "node:path";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";

const root = path.resolve(import.meta.dirname, "..");
const file = path.join(root, "public/handouts/print", process.argv[2] + ".pdf");
const data = new Uint8Array(fs.readFileSync(file));
const doc = await getDocument({ data }).promise;
const colors = {};
for (let pn = 1; pn <= doc.numPages; pn++) {
  const page = await doc.getPage(pn);
  const ops = await page.getOperatorList();
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i], a = ops.argsArray[i];
    let rgb = null;
    if ((fn === OPS.setFillRGBColor || fn === OPS.setStrokeRGBColor) && Array.isArray(a) && a.length >= 3) rgb = a.slice(0, 3);
    if ((fn === OPS.setFillColor || fn === OPS.setStrokeColor) && a && a[0] && a[0].length >= 3) rgb = [a[0][0], a[0][1], a[0][2]];
    if (!rgb) continue;
    const to255 = (v) => (v <= 1 ? Math.round(v * 255) : Math.round(v));
    const [r, g, b] = rgb.map(to255);
    if ([r, g, b].some((v) => Number.isNaN(v))) continue;
    const hex = "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
    colors[hex] = (colors[hex] || 0) + 1;
  }
}
const sorted = Object.entries(colors).sort((x, y) => y[1] - x[1]);
const sat = ([h]) => {
  const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
  return Math.max(r, g, b) - Math.min(r, g, b) > 25;
};
console.log(process.argv[2]);
console.log("  wszystkie:", sorted.slice(0, 10).map(([h, c]) => `${h}×${c}`).join(" ") || "(brak)");
console.log("  AKCENT:", sorted.filter(sat).slice(0, 8).map(([h, c]) => `${h}×${c}`).join(" ") || "(brak nasyconych)");
