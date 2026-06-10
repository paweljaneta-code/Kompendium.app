// Patch no-JS dla plików SOS: bez JavaScriptu wszystkie kroki są widoczne
// (przewijalnie) zamiast utknięcia na kroku 1 z martwym przyciskiem "Dalej".
// Idempotentny (marker id="nojs-fallback").
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sosRoot = path.join(root, "public/sos");

let patched = 0, skipped = 0, warned = 0;

function patchFile(p) {
  let h = fs.readFileSync(p, "utf8");
  if (h.includes('id="nojs-fallback"')) { skipped++; return; }

  const m = h.match(/\.card\.active\s*\{[^}]*display\s*:\s*([a-z-]+)/);
  const disp = m ? m[1] : "block";
  if (!m) warned++;

  const detect = '<script>document.documentElement.classList.add("js")</script>';
  const style =
    '<style id="nojs-fallback">' +
    `html:not(.js) .card{display:${disp} !important}` +
    "html:not(.js) #nextBtn,html:not(.js) #backBtn,html:not(.js) #prevBtn{display:none !important}" +
    "</style>";
  const banner =
    '<noscript><div style="background:#4a6347;color:#fff;padding:10px 14px;font:13px/1.5 system-ui,sans-serif;text-align:center">' +
    "Tryb podglądu — wszystkie kroki widoczne poniżej. Aby wypełniać interaktywnie, otwórz link w przeglądarce." +
    "</div></noscript>";

  // detektor zaraz po otwarciu <head>
  h = h.replace(/(<head[^>]*>)/i, "$1" + detect);
  // style przed </head>
  h = h.replace(/<\/head>/i, style + "</head>");
  // banner zaraz po otwarciu <body>
  h = h.replace(/(<body[^>]*>)/i, "$1" + banner);

  fs.writeFileSync(p, h);
  patched++;
}

(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.html$/i.test(e.name)) patchFile(p);
  }
})(sosRoot);

console.log(`Patched: ${patched} · skipped (już ma): ${skipped} · bez reguły .card.active (fallback block): ${warned}`);
