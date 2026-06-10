import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

// Publiczny link do pustego narzędzia SOS: /s/<cid>
// Serwuje samodzielny plik HTML z public/sos/<mod>/<cid>.html.
// Wypełnienie zapisuje się lokalnie w przeglądarce klienta (localStorage w pliku SOS).

let indexCache: Record<string, string> | null = null;

async function loadSosIndex(): Promise<Record<string, string>> {
  if (indexCache) return indexCache;
  const root = path.join(process.cwd(), "public/sos");
  const index: Record<string, string> = {};
  for (const mod of await fs.readdir(root)) {
    const dir = path.join(root, mod);
    const stat = await fs.stat(dir);
    if (!stat.isDirectory()) continue;
    for (const file of await fs.readdir(dir)) {
      if (file.endsWith(".html")) index[file.slice(0, -5)] = mod;
    }
  }
  indexCache = index;
  return index;
}

const NOT_FOUND_HTML = `<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Narzędzie niedostępne</title>
<style>body{font-family:system-ui,sans-serif;background:#f4f1ea;color:#1c2620;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}main{max-width:380px}h1{font-family:Georgia,serif;font-weight:400;font-size:22px;color:#4a6347;margin:0 0 14px}p{font-size:14px;line-height:1.6;color:#3a4a40;margin:0}</style>
</head><body><main><h1>Narzędzie niedostępne</h1>
<p>Ten link nie wskazuje na żadne narzędzie. Poproś osobę, która go wysłała, o nowy link.</p>
</main></body></html>`;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cid: string }> }
) {
  const { cid } = await params;

  if (!/^[a-z0-9][a-z0-9_-]{0,80}$/i.test(cid)) {
    return new NextResponse(NOT_FOUND_HTML, {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }

  const index = await loadSosIndex();
  const mod = index[cid];
  if (!mod) {
    return new NextResponse(NOT_FOUND_HTML, {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }

  const filePath = path.join(process.cwd(), "public/sos", mod, `${cid}.html`);
  const html = await fs.readFile(filePath, "utf8");
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex"
    }
  });
}
