import { NextResponse } from "next/server";
import sosIndex from "./sos-index.json";

// Publiczny krótki link do narzędzia SOS: /s/<cid>
// Przekierowuje do statycznego, już-publicznego pliku /sos/<mod>/<cid>.html
// (serwowanego przez warstwę statyczną Vercela — bez fs w funkcji, odporne na
// outputFileTracingExcludes). Wypełnienie zapisuje się lokalnie w przeglądarce.

const INDEX = sosIndex as Record<string, string>;

const NOT_FOUND_HTML = `<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Narzędzie niedostępne</title>
<style>body{font-family:system-ui,sans-serif;background:#f4f1ea;color:#1c2620;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}main{max-width:380px}h1{font-family:Georgia,serif;font-weight:400;font-size:22px;color:#4a6347;margin:0 0 14px}p{font-size:14px;line-height:1.6;color:#3a4a40;margin:0}</style>
</head><body><main><h1>Narzędzie niedostępne</h1>
<p>Ten link nie wskazuje na żadne narzędzie. Poproś osobę, która go wysłała, o nowy link.</p>
</main></body></html>`;

function notFound() {
  return new NextResponse(NOT_FOUND_HTML, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" }
  });
}

export function GET(req: Request, { params }: { params: Promise<{ cid: string }> }) {
  return params.then(({ cid }) => {
    if (!/^[a-z0-9][a-z0-9_-]{0,80}$/i.test(cid)) return notFound();
    const mod = INDEX[cid];
    if (!mod) return notFound();
    const target = new URL(`/sos/${mod}/${cid}.html`, req.url);
    return NextResponse.redirect(target, 307);
  });
}
