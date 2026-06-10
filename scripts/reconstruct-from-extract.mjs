// Generator HTML (lineart v2) z wyekstrahowanej struktury PDF.
// Wejście: scripts/pilot-extract/<mod__file>.json  (z extract-pdf-content.mjs)
// Wyjście: scripts/reconstructed/<mod>/<file>.html
// Reużywa shell (head+CSS+ikony) z modułu gad (domyślny akcent sage).
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const shell = fs.readFileSync(path.join(root, "scripts/pilot-output/_shell-gad.html"), "utf8");
const extractDir = path.join(root, "scripts/pilot-extract");

let COL_X = 300;            // próg podziału na 2 kolumny (adaptacyjny per strona)
function computeColX(items) {
  // start prawej kolumny = dominujący x wśród fragmentów x>260
  const h = {};
  for (const it of items) if (it.x > 260) { const k = Math.round(it.x); h[k] = (h[k] || 0) + 1; }
  const e = Object.entries(h).sort((a, b) => b[1] - a[1]);
  const rightX = e.length ? +e[0][0] : 311;
  return rightX - 10;
}
const fixLig = (s) => s
  .replace(/ﬁ/g, "fi").replace(/ﬂ/g, "fl")
  .replace(/\s+([”"”])/g, "$1").replace(/([„"])\s+/g, "$1") // spacje wokół cudzysłowów
  .replace(/\s+([,.;:%])/g, "$1")
  .replace(/\s+/g, " ").trim();

// łączy fragmenty wg odstępu x: brak odstępu = to samo słowo (bez spacji)
function joinItems(its) {
  const s = [...its].sort((a, b) => a.x - b.x);
  let out = "", prev = null;
  for (const it of s) {
    if (prev) {
      const gap = it.x - (prev.x + prev.w);
      out += gap > prev.size * 0.16 ? " " : "";
    }
    out += it.str;
    prev = it;
  }
  return fixLig(out);
}

const esc = (s) => s.replace(/&(?!amp;|lt;|gt;)/g, "&amp;");

// ── klastrowanie itemów w wiersze ──
function rows(items) {
  const rs = [];
  for (const it of [...items].sort((a, b) => a.y - b.y || a.x - b.x)) {
    let r = rs.find((r) => Math.abs(r.y - it.y) <= 3.2);
    if (!r) { r = { y: it.y, items: [] }; rs.push(r); }
    r.items.push(it);
  }
  rs.sort((a, b) => a.y - b.y);
  for (const r of rs) r.items.sort((a, b) => a.x - b.x);
  return rs;
}
const rowText = (r) => joinItems(r.items);
const rowSize = (r) => Math.max(...r.items.map((i) => i.size));
const rowX = (r) => Math.min(...r.items.map((i) => i.x));
const isBold = (r) => r.items.some((i) => i.bold);
// łączy wiersze w 2 kolumny wg x
function splitCols(rws) {
  const L = [], R = [];
  for (const r of rws) {
    const left = r.items.filter((i) => i.x < COL_X);
    const right = r.items.filter((i) => i.x >= COL_X);
    if (left.length) L.push(joinItems(left));
    if (right.length) R.push(joinItems(right));
  }
  return [L.join(" "), R.join(" ")];
}

// usuwa letter-spacing eyebrow: każde słowo jest osobnym itemem z literami rozdzielonymi spacją
function deEyebrow(r) {
  const collapse = (s) => /^[\p{L}0-9]( [\p{L}0-9])+$/u.test(s.trim()) ? s.replace(/ /g, "") : s;
  const its = r.items.map((i) => ({ ...i, str: collapse(i.str) }));
  return joinItems(its).replace(/\s*·\s*/g, " · ").replace(/\s+/g, " ").trim();
}

const SEC_RE = /^(0[1-9])\s+(.*)$/;

function reconstruct(jsonPath) {
  const ex = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const title = ex.title || "Handout";
  // etykieta modułu + eyebrow z 1. strony
  const p0 = rows(ex.pages[0].items);
  const eyebrow = deEyebrow(p0[0]);
  // stopka: ostatni wiersz "KOMPENDIUM ... · MOD · ..."
  const footRow = rowText(p0[p0.length - 1]);
  const modLabel = (footRow.match(/TERAPEUTYCZNYCH\s*·\s*([^·]+?)\s*·/i)?.[1] || "").trim() || "Kompendium";

  const bodyPages = ex.pages.map((pg, pi) => {
    COL_X = computeColX(pg.items);
    return buildPage(rows(pg.items), pi, ex.pages.length, eyebrow, title, modLabel);
  }).join("");
  let head = shell.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  return head + bodyPages + "\n</body></html>\n";
}

function foot(mod, n, total) {
  return `<div class="foot"><span><strong>Kompendium Narzędzi Terapeutycznych · ${esc(mod)} · lineart v2</strong></span><span class="pg-num">str. ${n} / ${total}</span></div>`;
}

function scaleRow() {
  return `<div class="mood-scale"><div class="ms-row">${[0,1,2,3,4,5,6,7,8,9,10].map(i=>`<div class="ms-num">${i}</div>`).join("")}</div></div>`;
}

function buildPage(rws, pi, total, eyebrow, title, modLabel) {
  // odetnij stopkę
  const body = rws.filter((r) => !/KOMPENDIUM NARZĘDZI TERAPEUTYCZNYCH/i.test(rowText(r)));
  let html = `<div class="page">`;
  let i = 0;

  if (pi === 0) {
    // nagłówek
    html += `<header><div class="eyebrow">${esc(eyebrow)}</div>`;
    // tytuł = pierwszy wiersz o rozmiarze ~24
    const tIdx = body.findIndex((r) => rowSize(r) >= 20);
    const tRow = tIdx >= 0 ? body[tIdx] : null;
    html += `<h1 class="hdr-title">${esc(tRow ? rowText(tRow) : title)}</h1>`;
    i = (tIdx >= 0 ? tIdx : 0) + 1;
    // hdr-sub: kolejne wiersze ~10.5 do meta
    let sub = [];
    while (i < body.length && rowSize(body[i]) >= 10 && !/^CZAS:/i.test(rowText(body[i]))) { sub.push(rowText(body[i])); i++; }
    if (sub.length) html += `<div class="hdr-sub">${esc(sub.join(" "))}</div>`;
    // meta: wiersze z CZAS:/ŹRÓDŁO:
    let meta = [];
    while (i < body.length && rowSize(body[i]) < 9 && /CZAS:|ŹRÓDŁO:|min|sesj|·/i.test(rowText(body[i])) && !SEC_RE.test(rowText(body[i]))) {
      meta.push(rowText(body[i])); i++;
      if (meta.join(" ").match(/ŹRÓDŁO:/i)) break;
    }
    html += `<div class="hdr-meta">${esc(meta.join(" · "))}</div></header>`;
    // intro-box: band do pierwszej sekcji 01
    const secStart = body.findIndex((r, k) => k >= i && SEC_RE.test(rowText(r)) && rowSize(r) >= 11);
    const introRows = body.slice(i, secStart >= 0 ? secStart : body.length);
    // odetnij ewentualny nagłówek "JAK UŻYWAĆ ... DLACZEGO"
    const introBody = introRows.filter((r) => !/^J A K|JAK U[ŻZ]Y|DLACZEGO TO DZIA/i.test(rowText(r)) || rowSize(r) > 7.5);
    const [L, R] = splitCols(introBody.filter((r)=>rowSize(r)<10));
    if (L || R) {
      html += `<div class="intro-box-row">
<div class="intro-box"><span class="intro-lbl">Jak używać</span><p>${esc(L)}</p></div>
<div class="intro-box"><span class="intro-lbl">Dlaczego to działa</span><p>${esc(R)}</p></div></div>`;
    }
    i = secStart >= 0 ? secStart : body.length;
  }

  // sekcje + reszta treści
  html += renderSections(body.slice(i), modLabel);
  html += foot(modLabel, pi + 1, total) + `</div>`;
  return html;
}

const ICONS = ["i-board","i-pencil","i-bulb","i-target","i-brain","i-check","i-cal","i-leaf","i-scale"];

function renderSections(rws, modLabel) {
  let html = "", sec = 0;
  let buf = [];
  const flush = () => { if (buf.length) { html += renderBlocks(buf); buf = []; } };
  for (const r of rws) {
    const t = rowText(r);
    const m = t.match(SEC_RE);
    if (m && rowSize(r) >= 11) {
      flush();
      html += `<div class="sec"><h2 class="sec-h"><span class="num">${m[1]}</span><svg class="ico-svg ico-sage"><use href="#${ICONS[sec % ICONS.length]}"/></svg> ${esc(m[2])}</h2>`;
      if (sec > 0) html = html; // sekcje domykane przez renderBlocks/następną
      sec++;
      // zamknięcie poprzedniej sekcji
    }
    if (m && rowSize(r) >= 11) { continue; }
    buf.push(r);
  }
  flush();
  // domknij niezamknięte .sec (każda sekcja otwarta = jeden </div>)
  const opens = (html.match(/<div class="sec">/g) || []).length;
  html += "</div>".repeat(opens);
  return html;
}

// renderuje blok wierszy: wykrywa skale, checklisty, callout, 2 kolumny, prozę
function renderBlocks(rws) {
  let out = "";
  // callout "Klucz:"
  const keyIdx = rws.findIndex((r) => /^Klucz:/i.test(rowText(r)));
  let main = keyIdx >= 0 ? rws.slice(0, keyIdx) : rws;
  let key = keyIdx >= 0 ? rws.slice(keyIdx) : [];

  // checklisty (☐ / ○)
  const checks = main.filter((r) => /^[☐○]/.test(rowText(r)));
  const scaleR = main.find((r) => /\b0\s+1\s+2\s+3\s+4\s+5\s+6\s+7\s+8\s+9\s+10\b/.test(rowText(r).replace(/\s+/g," ")));
  const days = main.filter((r) => /^(Pn|Wt|Śr|Cz|Pt|Sb|Nd)\b/.test(rowText(r)));

  if (checks.length >= 3) {
    out += `<div style="font-size:8.5pt;line-height:1.5;margin-top:4px">` +
      checks.map((r) => `<div style="display:flex;gap:8px;margin-bottom:3px"><span style="color:var(--mute);font-size:10pt">☐</span><div>${esc(rowText(r).replace(/^[☐○]\s*/, ""))}</div></div>`).join("") + `</div>`;
    main = main.filter((r) => !checks.includes(r));
  }

  // pozostała proza: scal 2 kolumny
  const proseRows = main.filter((r) => !days.includes(r) && r !== scaleR);
  if (proseRows.length) {
    const [L, Rr] = splitCols(proseRows);
    if (Rr && L) {
      out += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:4px"><p class="prose">${esc(L)}</p><p class="prose">${esc(Rr)}</p></div>`;
    } else if (L || Rr) {
      out += `<p class="prose">${esc(L || Rr)}</p>`;
    }
  }
  if (scaleR) out += scaleRow();
  if (days.length) {
    out += `<table class="work-table"><tbody>` +
      days.map((r) => `<tr><td style="padding:5px 8px;font-weight:600">${esc(rowText(r).split(" ")[0])}</td><td class="col-divider"></td><td class="col-divider"></td></tr>`).join("") + `</tbody></table>`;
  }
  if (key.length) {
    out += `<div class="callout"><strong>Klucz:</strong> ${esc(fixLig(key.map(rowText).join(" ")).replace(/^Klucz:\s*/i, ""))}</div>`;
  }
  return out;
}

// ── CLI ──
const targets = process.argv.slice(2);
const outRoot = path.join(root, "scripts/reconstructed");
for (const id of targets) {
  const safe = id.replace(/\//g, "__");
  const jsonPath = path.join(extractDir, safe + ".json");
  if (!fs.existsSync(jsonPath)) { console.log("✗ brak ekstrakcji:", id); continue; }
  const html = reconstruct(jsonPath);
  const out = path.join(outRoot, id + ".html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(`✓ ${id}  (${(html.length/1024).toFixed(1)} KB, ${(html.match(/class="page"/g)||[]).length} str.)`);
}
