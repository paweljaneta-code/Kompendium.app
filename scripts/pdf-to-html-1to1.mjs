// Renderer PDF → HTML/SVG 1:1 (wektorowo, tekst jako tekst).
// Odtwarza: tekst na dokładnych pozycjach, grafikę wektorową (ścieżki/prostokąty/linie),
// kolory wypełnień/obrysów, fonty jak w PDF (serif/sans). Wynik: A4 z @media print.
import fs from "node:fs";
import path from "node:path";
import { getDocument, OPS, Util } from "pdfjs-dist/legacy/build/pdf.mjs";

const root = path.resolve(import.meta.dirname, "..");
const printRoot = path.join(root, "public/handouts/print");

const rgb = (a) => {
  const to = (v) => Math.max(0, Math.min(255, Math.round(v <= 1 ? v * 255 : v)));
  return `rgb(${to(a[0])},${to(a[1])},${to(a[2])})`;
};
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmt = (n) => (Math.round(n * 100) / 100);

// liczba argumentów współrzędnych per sub-op constructPath
const PATH_ARGN = { [OPS.moveTo]: 2, [OPS.lineTo]: 2, [OPS.curveTo]: 6, [OPS.curveTo2]: 4, [OPS.curveTo3]: 4, [OPS.closePath]: 0, [OPS.rectangle]: 4 };

function buildPathD(subOps, coords, ctm) {
  let d = "", ci = 0;
  const P = (x, y) => { const p = Util.applyTransform([x, y], ctm); return `${fmt(p[0])} ${fmt(p[1])}`; };
  for (const op of subOps) {
    const n = PATH_ARGN[op] ?? 0;
    const a = coords.slice(ci, ci + n); ci += n;
    if (op === OPS.moveTo) d += `M${P(a[0], a[1])} `;
    else if (op === OPS.lineTo) d += `L${P(a[0], a[1])} `;
    else if (op === OPS.curveTo) d += `C${P(a[0], a[1])} ${P(a[2], a[3])} ${P(a[4], a[5])} `;
    else if (op === OPS.curveTo2) d += `C${P(a[0], a[1])} ${P(a[2], a[3])} ${P(a[2], a[3])} `;
    else if (op === OPS.curveTo3) d += `C${P(a[0], a[1])} ${P(a[0], a[1])} ${P(a[2], a[3])} `;
    else if (op === OPS.rectangle) {
      const [x, y, w, h] = a;
      d += `M${P(x, y)} L${P(x + w, y)} L${P(x + w, y + h)} L${P(x, y + h)} Z `;
    } else if (op === OPS.closePath) d += "Z ";
  }
  return d.trim();
}

function fontStack(name = "") {
  const serif = /serif/i.test(name) && !/sans/i.test(name);
  const italic = /italic|oblique/i.test(name);
  const bold = /bold|semibold/i.test(name);
  const fam = serif
    ? "'Liberation Serif','Times New Roman',Georgia,serif"
    : "'Liberation Sans','DejaVu Sans',Arial,Helvetica,sans-serif";
  return { fam, italic, bold };
}

async function renderPage(page) {
  const vp = page.getViewport({ scale: 1 });
  const W = vp.width, H = vp.height;
  const opl = await page.getOperatorList();

  let ctm = [1, 0, 0, 1, 0, 0];
  const stack = [];
  let fill = [0, 0, 0], stroke = [0, 0, 0], lineWidth = 1;
  let Tm = [1, 0, 0, 1, 0, 0];
  const graphics = [];
  const runColors = []; // {x,y,color}
  let pendingD = null;

  for (let i = 0; i < opl.fnArray.length; i++) {
    const fn = opl.fnArray[i], a = opl.argsArray[i];
    switch (fn) {
      case OPS.save: stack.push({ ctm: ctm.slice(), fill: fill.slice(), stroke: stroke.slice(), lineWidth }); break;
      case OPS.restore: { const s = stack.pop(); if (s) { ctm = s.ctm; fill = s.fill; stroke = s.stroke; lineWidth = s.lineWidth; } break; }
      case OPS.transform: ctm = Util.transform(ctm, a); break;
      case OPS.setFillRGBColor: fill = a; break;
      case OPS.setStrokeRGBColor: stroke = a; break;
      case OPS.setLineWidth: lineWidth = a[0]; break;
      case OPS.constructPath: pendingD = buildPathD(a[0], a[1], ctm); break;
      case OPS.fill: case OPS.eoFill:
        if (pendingD) graphics.push({ d: pendingD, fill: rgb(fill), eo: fn === OPS.eoFill });
        break;
      case OPS.stroke: {
        // przybliżona grubość: skala ctm × lineWidth
        const sc = Math.hypot(ctm[0], ctm[1]);
        if (pendingD) graphics.push({ d: pendingD, stroke: rgb(stroke), lw: Math.max(0.3, lineWidth * sc) });
        break;
      }
      case OPS.setTextMatrix: {
        Tm = a;
        const p = Util.applyTransform([0, 0], Util.transform(ctm, Tm));
        runColors.push({ x: p[0], y: p[1], color: rgb(fill) });
        break;
      }
      default: break;
    }
  }

  // tekst z getTextContent (dokładne pozycje/rozmiary/fonty)
  const tc = await page.getTextContent();
  const texts = [];
  for (const it of tc.items) {
    if (!it.str || !it.str.trim()) continue;
    const tr = it.transform;
    const x = tr[4], y = H - tr[5];
    const size = Math.hypot(tr[0], tr[1]);
    // kolor: najbliższy run
    let color = "rgb(28,38,32)", best = 1e9;
    for (const rc of runColors) {
      const dd = Math.abs(rc.x - x) + Math.abs(rc.y - y);
      if (dd < best) { best = dd; color = rc.color; }
    }
    const f = fontStack(it.fontName && safeFontName(page, it.fontName));
    texts.push({ x, y, size, str: it.str, w: it.width, color, ...f });
  }

  // SVG
  let svg = `<svg class="pg" viewBox="0 0 ${fmt(W)} ${fmt(H)}" xmlns="http://www.w3.org/2000/svg" font-family="'Liberation Sans',Arial,sans-serif">`;
  for (const g of graphics) {
    if (g.fill !== undefined) svg += `<path d="${g.d}" fill="${g.fill}"${g.eo ? ' fill-rule="evenodd"' : ""}/>`;
    else svg += `<path d="${g.d}" fill="none" stroke="${g.stroke}" stroke-width="${fmt(g.lw)}"/>`;
  }
  for (const t of texts) {
    const style = `font-size:${fmt(t.size)}px;fill:${t.color}` + (t.italic ? ";font-style:italic" : "") + (t.bold ? ";font-weight:700" : "");
    const tl = t.w ? ` textLength="${fmt(t.w)}" lengthAdjust="spacingAndGlyphs"` : "";
    svg += `<text x="${fmt(t.x)}" y="${fmt(t.y)}" style="${style};font-family:${t.fam}"${tl}>${esc(t.str)}</text>`;
  }
  svg += `</svg>`;
  return { svg, W, H };
}

function safeFontName(page, fn) {
  try { const f = page.commonObjs.get(fn); return (f && (f.name || f.fallbackName)) || fn; } catch { return fn; }
}

async function convert(id) {
  const data = new Uint8Array(fs.readFileSync(path.join(printRoot, id + ".pdf")));
  const doc = await getDocument({ data }).promise;
  const meta = await doc.getMetadata().catch(() => ({ info: {} }));
  const title = meta?.info?.Title || id.split("/").pop();
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) pages.push(await renderPage(await doc.getPage(p)));
  const W = pages[0].W, H = pages[0].H;
  const css = `*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#fff}
.page{width:210mm;height:297mm;margin:0 auto;position:relative;overflow:hidden;page-break-after:always;background:#fff}
.page:last-child{page-break-after:auto}
svg.pg{display:block;width:100%;height:100%}
svg.pg text{white-space:pre}
@media print{@page{size:A4;margin:0}.page{margin:0}}
@media screen{body{padding:24px 16px;background:#e8e3d4}.page{box-shadow:0 4px 24px rgba(0,0,0,.08);margin-bottom:24px}}`;
  let html = `<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"><title>${esc(title)}</title><style>${css}</style></head><body>`;
  for (const pg of pages) html += `<div class="page">${pg.svg}</div>`;
  html += `</body></html>\n`;
  return html;
}

const ids = process.argv.slice(2);
const outRoot = path.join(root, "scripts/reconstructed-1to1");
for (const id of ids) {
  const html = await convert(id);
  const out = path.join(outRoot, id + ".html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(`✓ ${id}  (${(html.length / 1024).toFixed(1)} KB)`);
}
