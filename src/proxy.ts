import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing",
  "/sign-in(.*)",
  "/sign-up(.*)",
  // /s/(.*) — publiczne krótkie linki do materiałów udostępnianych pacjentowi
  // przez zalogowanego klinicystę (patrz src/app/s/[cid]/route.ts).
  "/s/(.*)"
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    // Płatna biblioteka klinicysty (arkusze klinicysty + przewodniki „Jak
    // pracować z…") to statyczne pliki .html, które domyślny matcher pomija
    // (wyklucza .html). Obejmujemy je jawnie, by middleware wymusił logowanie.
    // SOS (public/sos) i handouty do druku (public/handouts/print) celowo
    // ZOSTAJĄ poza matcherem — mają być dostępne dla niezalogowanego pacjenta
    // przez udostępniony link (patrz /s/[cid]).
    "/handouts/clinician/:path*",
    "/howto/:path*"
  ]
};
