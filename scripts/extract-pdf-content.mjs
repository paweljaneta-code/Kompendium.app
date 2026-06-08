import fs from "node:fs";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const root = path.resolve(import.meta.dirname, "..");
const printRoot = path.join(root, "public/handouts/print");

// id (mod/file) podawany w argv; zwraca strukturę tekstu z pozycjami
async function extract(id) {
  const pdfPath = path.join(printRoot, id + ".pdf");
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await getDocument({ data, useSystemFonts: false }).promise;
  const meta = await doc.getMetadata().catch(() => ({ info: {} }));
  const out = {
    id,
    title: meta?.info?.Title || null,
    created: meta?.info?.CreationDate || null,
    pages: [],
  };
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items = tc.items
      .filter((it) => it.str && it.str.trim() !== "")
      .map((it) => {
        const tr = it.transform; // [a,b,c,d,e,f]
        return {
          str: it.str,
          x: +tr[4].toFixed(1),
          y: +(vp.height - tr[5]).toFixed(1), // top-left origin
          size: +Math.hypot(tr[1], tr[0]).toFixed(1),
          font: it.fontName,
          w: +it.width.toFixed(1),
          bold: /bold|semibold|600|700/i.test(it.fontName || ""),
          italic: /italic|ital/i.test(it.fontName || ""),
        };
      });
    out.pages.push({ n: p, w: +vp.width.toFixed(1), h: +vp.height.toFixed(1), items });
  }
  return out;
}

// grupuj itemy w wiersze (po y), posortuj po x — czytelny zrzut do rekonstrukcji
function dumpReadable(ex) {
  const lines = [];
  lines.push(`### ${ex.id}  | title="${ex.title}" | stron=${ex.pages.length}`);
  for (const pg of ex.pages) {
    lines.push(`\n========== STRONA ${pg.n} (${pg.w}x${pg.h}) ==========`);
    // klastrowanie wierszy po y (tolerancja 3pt)
    const rows = [];
    for (const it of pg.items.sort((a, b) => a.y - b.y || a.x - b.x)) {
      let row = rows.find((r) => Math.abs(r.y - it.y) <= 3);
      if (!row) { row = { y: it.y, items: [] }; rows.push(row); }
      row.items.push(it);
    }
    for (const r of rows.sort((a, b) => a.y - b.y)) {
      const sorted = r.items.sort((a, b) => a.x - b.x);
      const sizes = [...new Set(sorted.map((i) => i.size))].join("/");
      const flags =
        (sorted.some((i) => i.bold) ? "B" : "") +
        (sorted.some((i) => i.italic) ? "i" : "");
      const text = sorted.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim();
      lines.push(
        `[y${String(Math.round(r.y)).padStart(4)} x${String(Math.round(sorted[0].x)).padStart(3)} sz${sizes}${flags ? " " + flags : ""}]  ${text}`
      );
    }
  }
  return lines.join("\n");
}

const ids = process.argv.slice(2);
if (!ids.length) {
  console.error("Usage: node extract-pdf-content.mjs <mod/file> [<mod/file> ...]");
  process.exit(1);
}
const outDir = path.join(root, "scripts/pilot-extract");
fs.mkdirSync(outDir, { recursive: true });
for (const id of ids) {
  const ex = await extract(id);
  const safe = id.replace(/\//g, "__");
  fs.writeFileSync(path.join(outDir, safe + ".json"), JSON.stringify(ex, null, 1));
  fs.writeFileSync(path.join(outDir, safe + ".txt"), dumpReadable(ex));
  console.log(`✓ ${id}: ${ex.pages.length} stron, ${ex.pages.reduce((s,p)=>s+p.items.length,0)} fragmentów tekstu`);
}
