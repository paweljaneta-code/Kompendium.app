# Audyt zorza-app (Kompendium.app) — architektura i warstwa merytoryczna

**Data:** 2026-06-13 · **Zakres:** cała aplikacja „Zorza / Kompendium" — warstwa Next.js (`src/`, 7,2 tys. linii), monolit `kompendium.html` (29,5 MB / 112 tys. linii), pipeline `scripts/`, treść `content/` i `public/` (122 MB), auth/billing (Clerk + Stripe).
**Metoda:** lektura kodu źródłowego (rdzeń przeczytany w całości) + 4 równoległe, niezależne kwerendy eksploracyjne (treść kliniczna, wnętrze monolitu, pipeline, bezpieczeństwo) z weryfikacją liczb w plikach i literaturze.
**Werdykt jednozdaniowy:** wybitna warstwa merytoryczna osadzona w kruchej, „owijającej monolit" architekturze, w której **model płatny nie jest egzekwowany**, a **dane pacjentów trzymane są jawnym tekstem w przeglądarce** — to dwa problemy do rozwiązania przed jakąkolwiek sprzedażą; reszta to dług techniczny i higiena.

---

## 1. Streszczenie wykonawcze

Zorza-app to nie jest „klasyczna" aplikacja Next.js. To **cienka warstwa serwerowa owijająca jeden, ręcznie/AI-budowany dokument HTML o wadze 29,5 MB**. Next.js w czasie żądania parsuje ten monolit regexami i metodą „zbalansowanych nawiasów", wycina z niego moduły, stronę główną i planer, doszywa kilkanaście wstrzykiwanych skryptów inline i serwuje gotowy dokument do `<iframe srcDoc>`. Wszystko, co użytkownik widzi jako „aplikację", dzieje się wewnątrz iframe.

To rozwiązanie **działa i jest pomysłowe**, ale ma daleko idące konsekwencje, które wyłapuje ten audyt. Najważniejsze ustalenia w kolejności wagi:

| # | Ustalenie | Waga | Sekcja |
|---|-----------|------|--------|
| 1 | **Treść płatna jest w całości publiczna.** Tier (Basic/Premium/MAX) nie jest sprawdzany nigdzie na serwerze; `/api/plany/document` jest publiczny i zwraca HTML wszystkich modułów; `public/sos` + `public/handouts` (>4000 plików) to statyczne pliki dostępne bez logowania. Każdy ma wszystko za darmo. | 🔴 P0 | 3A |
| 2 | **Dane pacjentów w `localStorage`, niezaszyfrowane.** Planer zapisuje pseudonimy, diagnozy i notatki z sesji pod kluczem `treatment_plans_pilot_v7`. Ryzyko poufności/RODO, urządzenie współdzielone, brak kopii, ciche ucięcie przy limicie ~5–10 MB. | 🔴 P0/P1 | 3B |
| 3 | **Architektura „owijania monolitu" jest krucha i kosztowna.** Parsowanie 29 MB regexami, kilkanaście skryptów inline na trasę, planer wkleja *wszystkie* moduły, `force-dynamic` bez cache, brak deep-linków, treść w iframe niewidoczna dla wyszukiwarek. | 🟠 P1 | 3C, 3D |
| 4 | **Statystyki rozjechane (≥5 sprzecznych źródeł), nietestowane** + spory martwy kod + rozdwojona marka („Zorza" vs „Kompendium"). | 🟠 P1 | 3E |
| 5 | **Reprodukowalność treści złamana.** `public/**` i monolit są nieodtwarzalne z repo (źródła na pulpicie autora, niezadeklarowany `pdfjs-dist`, ręczny krok redakcyjny). | 🟠 P1 | 3F |
| 6 | Brak webhooka Stripe, wiązanie subskrypcji po e-mailu, okno zwrotu liczone od daty rejestracji, brak nagłówków bezpieczeństwa, brak rate-limitu, wyciek `error.message`. | 🟡 P2 | 3A |
| 7 | **Warstwa merytoryczna: wzorcowa**, ale z lukami strukturalnymi (puste zaślepki `leki.md`/`plany.md`, brak jednolitej stopki bezpieczeństwa w ~1300 SOS, stratny eksport `.md`, backlog 187 arkuszy). | 🟡 P2 | 3I |
| 8 | Higiena kodu: martwy stub „Zorza AI", 12× `console.*`, 86× zduplikowany inline-CSS nagłówka, słaba dostępność, fonty z Google. | 🟢 P3 | 3H |

**Co jest zrobione dobrze (żeby nie zgubić w szumie):** treść kliniczna jest rzetelna i bezpieczna (poprawne punktacje skal, wzorcowa obsługa ryzyka samobójczego, aktualne EBM); dane lecą *wyłącznie* lokalnie (świadoma, pro-prywatnościowa filozofia — choć niedokończona); walidacja parametrów w API jest solidna; notatki klinicysty są escapowane (`escapeHtml`, 87 użyć — brak self-XSS); CI robi `tsc` + `eslint` + build + test integralności; sekrety nie wyciekły do repo; brak trackerów i telemetrii.

---

## 2. Czym jest zorza-app — architektura w pigułce

```
┌──────────────────────────────────────────────────────────────┐
│ kompendium.html  (29,5 MB, 112k linii) — ŹRÓDŁO PRAWDY treści  │
│  • 87–88 modułów (<div class="tab-content" id="tab-*">)        │
│  • 2507 kart-narzędzi (<details class="card">)                 │
│  • 10 bloków <script> (SPA: switchTab, planer, wyszukiwarka     │
│    semantyczna, TAG_ONTOLOGY=206 konceptów), 3040 inline onclick│
└───────────────┬──────────────────────────────────────────────┘
                │  fs.readFile + parsowanie regex/indexOf
                ▼  (src/lib/originalModules.ts — ~2400 linii)
┌──────────────────────────────────────────────────────────────┐
│ Warstwa Next.js (App Router, "force-dynamic")                  │
│  • / → getKompendiumHomeDocument()   → <iframe srcDoc>         │
│  • /modules/[slug] → getOriginalModuleDocument(slug) → iframe  │
│  • /plany, /api/plany/document → planer (WSZYSTKIE moduły!)    │
│  • runtime split modułu "transdiag" na 17 (transdiagSplit.ts)  │
│  • +15 wstrzykiwanych skryptów inline na każdą trasę           │
├──────────────────────────────────────────────────────────────┤
│ public/  (122 MB, STATYCZNE, publiczne)                        │
│  • sos/ 1405 HTML · handouts/print 1489 HTML+12 PDF ·          │
│    handouts/clinician 1278 HTML · howto 17                     │
│  • indeksy JSON (resolvery karta→plik) budowane skryptami      │
├──────────────────────────────────────────────────────────────┤
│ Auth: Clerk (src/proxy.ts) · Billing: Stripe (live-query)      │
│ Marka tu: "Kompendium." (AppHeader) — wewnątrz iframe: "Zorza" │
└──────────────────────────────────────────────────────────────┘
```

Kluczowy wniosek architektoniczny: **monolit jest wejściem, nie wyjściem**. Nie istnieje skrypt składający `kompendium.html` z mniejszych źródeł — to on jest edytowanym artefaktem, a `content/modules/*.md` to jego (stratny, nieużywany) zrzut.

---

## 3. Ustalenia szczegółowe

### 3A. Bezpieczeństwo i model biznesowy — 🔴 najpoważniejszy obszar

**Dobra wiadomość najpierw:** plik `src/proxy.ts` (zamiast `middleware.ts`) **nie jest błędem**. Lockfile przypina `next@16.2.4`, a w Next.js 16 konwencja `middleware.ts` została przemianowana na `proxy.ts`; treść pliku jest zgodna 1:1 z oficjalnym quickstartem Clerk dla Next 16. **`auth.protect()` działa** — trasy nie są otwarte z powodu nazwy pliku. (To częsty mit przy „latest"; rozstrzygnięte wersją.)

**Zła wiadomość — uprawnienia (entitlements) nie są egzekwowane:**

1. **Tier nie jest sprawdzany do bramkowania treści w żadnym miejscu.** `getSubscriptionForUser()` (`src/lib/billing.ts:67`) jest używany wyłącznie w UI konta (`SubscriptionPanel.tsx`) — żadna trasa treści go nie woła. `src/app/(module)/modules/[slug]/page.tsx:37-48` renderuje pełny moduł bez sprawdzenia planu; `plany/*` tak samo. Skutek: **Basic = Premium = MAX = darmowe konto**, a cennik (`pricing/page.tsx`) reklamuje zróżnicowany dostęp („moduły: Podstawowy/Rozszerzony/Pełny", „handouty: Wybrane/Pełna biblioteka"), którego kod nie realizuje.

2. **`/api/plany/document` jest publiczny** (`src/proxy.ts:9`) i nie ma żadnego sprawdzenia auth (`src/app/api/plany/document/route.ts` — zweryfikowane: brak `auth()`/`currentUser()`), a zwracany dokument osadza HTML **wszystkich** modułów (`src/lib/originalModules.ts:2196-2201`, `moduleTabsHtml`). Czyli `GET /api/plany/document?view=list` wydaje całą treść kliniczną **anonimowi**.

3. **`public/sos` i `public/handouts` (>4000 plików) są w pełni publiczne.** Matcher w `src/proxy.ts:20` celowo wyklucza `*.html` — te pliki nigdy nie przechodzą przez Clerk i są serwowane statycznie. Ścieżki łatwo wyenumerować (są wstrzykiwane do dokumentu jako indeksy SOS/handout). Płatne arkusze do druku i interaktywne SOS są więc pobieralne bez logowania.

**Wniosek:** paywall jest dziś kosmetyczny. To problem do naprawy **przed** sprzedażą, bo dotyka samego modelu przychodów.

**Pozostałe, wtórne braki bezpieczeństwa (Stripe):**
- **Brak webhooka Stripe** (zweryfikowane: brak `constructEvent`/`stripe-signature`). Stan subskrypcji nie jest persystowany — `billing.ts` odpytuje Stripe na żywo przy każdym renderze konta, a `getOrCreateCustomerForUser()` **tworzy** klienta Stripe jako efekt uboczny *odczytu* (`billing.ts:31-65`). Brak obsługi `payment_failed`/`subscription.deleted`.
- **Wiązanie subskrypcji po e-mailu, nie po `clerkUserId`** (`billing.ts:40-43`, `customers.list({email}), limit:1`). `clerkUserId` jest zapisywany w metadanych klienta, ale nigdy nie używany do wyszukiwania → zmiana e-maila rozjeżdża powiązanie, możliwe duplikaty.
- **Okno zwrotu liczone od `user.createdAt` (Clerk), nie od daty zakupu** (`stripe/cancel/route.ts`) + `refunds.create` bez idempotencji.
- **Brak nagłówków bezpieczeństwa** (`next.config.ts` nie ma `headers()`): CSP, HSTS, X-Content-Type-Options, frame-ancestors, Referrer-Policy.
- **Brak rate-limitingu** na `stripe/*` (w tym `cancel` ze zwrotami).
- **Wyciek `error.message`** do klienta w trasach Stripe (`checkout:62`, `portal:24`, `cancel:103`, `subscription:16`).
- `.gitignore` ignoruje tylko `.env*.local` — zwykły `.env` nie jest ignorowany (dziś brak, ale ryzyko przypadkowego commita).
- `ACTIVE_STATUSES` traktuje `past_due` i `unpaid` jako „aktywne" (`billing.ts:16`) — nieopłacony zachowuje dostęp.

> ✅ **Dobre w API:** walidacja parametrów jest solidna — whitelist `view`, regex `^\d+$` na indeksie/`cid`, `planKey` przez whitelistę; redirect w `/s/[cid]` budowany bezpiecznie (`new URL(..., req.url)`), bez path-traversal.

### 3B. Prywatność i dane pacjentów (RODO) — 🔴/🟠

Planer „Plan Terapii" to menedżer klientów: pseudonim, diagnoza, plan w fazach, notatki sesji (`tldr`, `insight`, `homework`, `notes`), kolejka narzędzi. **Wszystko jest zapisywane w `localStorage` przeglądarki**, klucz `treatment_plans_pilot_v7` (zapis/odczyt ~`kompendium.html:106534/106621`), jawnym tekstem.

Konsekwencje:
- **Poufność / RODO:** to dane szczególnej kategorii (zdrowie). W `localStorage` są niezaszyfrowane, czytelne dla każdego skryptu na domenie i każdego z dostępem do przeglądarki (urządzenie współdzielone w gabinecie!).
- **Brak trwałości:** brak kopii zapasowej poza ręcznym eksportem JSON; wyczyszczenie danych przeglądarki = utrata. Limit `localStorage` (~5–10 MB) przy wielu klientach grozi **cichym ucięciem zapisu**.
- **Dane „seed":** kod zawiera realistycznego klienta-przykład „AB.2026" (GAD, 6 pełnych notatek sesji) — oznaczony „Pilot v3", ale nie jako jednoznacznie demonstracyjny do usunięcia.

> ✅ **Intencja jest pro-prywatnościowa i szczera:** UI deklaruje „dane wyłącznie lokalnie, nic nie trafia na serwer", a kod to potwierdza (jedyne `fetch` to `same-origin`, brak trackerów). Problem w tym, że „lokalnie i jawnym tekstem" to za mało dla danych medycznych. Trzeba albo (a) zaszyfrować lokalnie hasłem terapeuty + jawne ostrzeżenie i obsługa limitu, albo (b) dać backend z szyfrowaniem i synchronizacją.

- Drobny wyciek metadanych: monolit ładuje fonty przez `@import fonts.googleapis.com` (`kompendium.html:4`) — IP/User-Agent lecą do Google przy każdym ładowaniu. Hostować lokalnie.

### 3C. Architektura aplikacji (monolit + iframe) — 🟠

`src/lib/originalModules.ts` (~2400 linii) to serce systemu i jednocześnie największe ryzyko utrzymaniowe:

- **Parsowanie przez `indexOf`/regex/zliczanie nawiasów** (`extractBalancedDiv`, `extractJsVarObject`, dziesiątki `source.indexOf(...)` po stałych znacznikach jak `"// === HANDOUT SYSTEM ==="`, `"window.switchModuleMode=function"`). Każda zmiana formatowania w monolicie może po cichu zepsuć ekstrakcję. `src/lib/transdiagSplit.ts` posuwa się do chirurgii na literałach JS (`removeJsKey`/`appendJsKey`) i regexowego przepisywania CSS — komentarze same ostrzegają „UWAGA", że dokładne dopasowania są kruche.
- **Każda trasa = pełny dokument w `<iframe srcDoc>`** z wklejonym całym CSS monolitu (`data.style`, ~190 KB) + ~15 skryptami inline. Nawigacja między modułami to pełne przeładowanie top-window (`window.top.location.href`), a stan widoku wewnątrz modułu nie jest w URL (brak deep-linków; powrót do karty działa przez `sessionStorage`-bridge, nie adres).
- **Komunikacja iframe→shell** przez `postMessage("*")` (`handoutOverrides.ts`) z `targetOrigin:"*"` — działa, ale `*` to zła praktyka (origin powinien być jawny).
- **Podwójna warstwa chrome i marki:** strony marketingowe/konta mają React-owy `AppHeader` z marką „Kompendium.", a strony treści — wstrzyknięty nagłówek monolitu „Zorza". Dwa nagłówki, dwie nazwy, dwa przyciski konta. To realny problem brandingowy i UX.

### 3D. Wydajność i SEO — 🟠

- **`force-dynamic` na `/`, `/modules/[slug]`, `/plany` + `no-store`** → brak cache CDN, każde żądanie składa dokument na nowo. Parsowanie monolitu jest cache'owane po `mtime` w pamięci procesu (`loadOriginalData`), ale **składanie stringów** (JSON.stringify katalogów, DOM indeksu wyszukiwania, ~190 KB CSS) wykonuje się per żądanie. Na Vercelu zimny start = ponowny odczyt i parsowanie 29,5 MB.
- **Planer to najcięższy payload:** `getKompendiumPlannerDocument` wkleja HTML **wszystkich** modułów (`moduleTabsHtml`) — to praktycznie cała treść w jednym dokumencie (a do tego publicznym, zob. 3A).
- **SEO ≈ zero dla treści:** cała treść żyje w `<iframe srcDoc>`. Crawler widzi pustą skorupę iframe; metadane są ustawione, ale moduły/karty nie są indeksowalne. Dla produktu treściowego to istotna strata (nawet jeśli docelowo płatne — fragmenty/landing mogłyby być indeksowane).
- Sam monolit (gdyby kiedyś serwowany w całości) to setki tysięcy węzłów DOM — ryzyko zawieszenia na mobile. Produkcyjny podział na moduły to łagodzi, ale planer i strona główna i tak niosą duże dokumenty.

### 3E. Spójność danych, liczniki, martwy kod, marka — 🟠

**Liczniki: co najmniej 5 niezależnych, sprzecznych źródeł, żadne nietestowane.**

| Wielkość | Wartości spotykane w kodzie | Stan faktyczny |
|---|---|---|
| Narzędzia | 1580 (`KompendiumHome.tsx:95`), 1609 (`kompendiumHomeData.ts:30`) | **2507** kart w monolicie |
| Handouty | 879 (`KompendiumHome.tsx:95`), 1898 (`kompendiumHomeData.ts:31` i `originalModules.ts:1181`), 2234 (monolit) | 1489 HTML + 12 PDF (print) |
| Moduły | 29 (`kompendiumHomeData.ts:32`), 86 (monolit), 86→**102** (`transdiagSplit.ts:307`), 48/92/32 (dokumenty audytów) | **88** `id="tab-*"` |
| Wersje elektr./SOS | „895 SOS templates" (monolit), „1391 plików" (`docs/sos-consistency-audit.md`) | **1405** plików SOS |

Mechanizm: część liczb tkwi w **martwym kodzie**, część jest przeliczana w 3 różnych miejscach runtime na różnych zbiorach (`buildHomeToolsBrowserScript`, `KOMPENDIUM_RECOUNT_SCRIPT`, `transdiagSplit`), a część to zamrożone migawki z audytów. Efekt: UI potrafi pokazać różne liczby zależnie od ekranu i stanu hydracji. **Nie ma jednego wyliczanego źródła prawdy.**

**Martwy kod (potwierdzony — brak importów w `src/app` i layoutach):**
- `src/components/kompendium-home/KompendiumHome.tsx` + `src/lib/kompendiumHomeData.ts` (React-owa strona główna — nieużywana; realna strona to iframe monolitu),
- `src/lib/modules.ts` + `src/lib/simpleMarkdown.ts` + **`content/modules/*.md` (87 plików)** — czytane tylko przez siebie nawzajem i przez skrypt zrzucający; aplikacja ich nie dotyka,
- `src/components/landing/HeroSection.tsx`, `FeatureCard.tsx`, `src/modules/therapeutic/*` — zdefiniowane, nierenderowane.

To „dwie ery" UI pozostawione obok siebie. Usunięcie nie wpływa na działanie, a redukuje mylące sygnały (w tym fałszywe liczniki).

### 3F. Pipeline treści i reprodukowalność — 🟠

**`public/**` i `kompendium.html` są nieodtwarzalne z repozytorium** — to efekt jednorazowych migracji:
- Skrypty `import-*` czytają z **pulpitu autora** (`USERPROFILE/HOME + Desktop/...`), niewersjonowanego; `import-clinician-handouts.mjs` robi `fs.rmSync(outRoot)` na starcie.
- Skrypty PDF (`extract-pdf-content`, `extract-pdf-accent`, `pdf-to-html-1to1`) importują **`pdfjs-dist`, którego nie ma w `package.json`** — nie uruchomią się z czystego repo. Źródłowych PDF-ów w repo praktycznie nie ma (12 z ~1500).
- Finalna treść części handoutów przeszła **ręczny krok redakcyjny** (`scripts/from-text/_README.md`: „napisane ręcznie… wierność 98,1%", `rebuild-pilot.mjs` ma treść zaszytą na sztywno).
- Resolvery karta→plik opierają się na **setkach ręcznych wpisów**: `SKIP_PRINT_IDS` (~160), `MANUAL_OVERRIDES` (~130), `ORPHAN_RECOVERY` (54). `INSTRUKCJA-DEDUP-CURSOR.md` opisuje 350 zduplikowanych PDF-ów i fakt, że **~60% przycisków „drukuj" nie trafia w plik**.
- `build-extra-content.mjs` **mutuje swoje wejścia** — wstrzykuje `BRIDGE_SCRIPT` do plików `public/howto/**` (`fs.writeFileSync`), więc build modyfikuje dane źródłowe.
- `predev` (`package.json:6`) buduje **tylko 1 z 4 indeksów** → `next dev` może serwować nieaktualne SOS/clinician/extra.
- Stratny eksport: `extract-modules.mjs` traktuje `<`/`>` jak tagi i wycina progi liczbowe — w `.md` znikają wartości typu „ferrytyna <30" (`labwork.md:104,436`). (Monolit serwowany jest poprawny — uszkodzone są tylko nieużywane `.md`.)

### 3G. Testy i CI — 🟡 (zaskakująco solidne jak na resztę)

`scripts/test-content-integrity.mjs` (228 linii, zero zależności, w CI) to dobrze pomyślany gate: sprawdza kreatory SOS (klasa `card`, `TOTAL_STEPS`, ciągłość kroków, wymagane elementy DOM, `localStorage` w try/catch, **brak nowoczesnej składni JS** dla starego WebView), artefakty (znaki sterujące, BOM, mojibake, CRLF, treść przed `<!DOCTYPE`, zewnętrzne `<script src>`), oraz resolvery (0 martwych wskazań, symulacja serwowania, zgodność treści arkusza z kartą ≥60%). CI dokłada `tsc --noEmit` + `eslint` + build.

**Luki:** zero testów spójności liczników (najbardziej rozjechana powierzchnia); pokrycie przycisków (`audit-handout-coverage`) i drift (`scan-handout-module-integrity`) **nie są w CI**; 991 linii logiki resolvera bez testów jednostkowych; listy `SKIP` zdublowane i rozjechane między skryptami (~160 vs 19); brak testu, że ekstrakcja modułów z monolitu nadal działa (build wyłapie crash, ale nie cichą złą ekstrakcję).

### 3H. Jakość kodu i dostępność — 🟢

- **Martwy stub „Zorza AI"** (`kompendium.html:111651`) — FAB + czat zwracający „asystent w przygotowaniu". Albo dokończyć, albo usunąć.
- 12× `console.*` w monolicie; 86× niemal identyczny inline-CSS nagłówka modułu (`mod-header--gad-feat`) — do jednej reguły klasowej.
- `eval(...)` na fragmentach monolitu w ~6 skryptach build (plik zaufany, ale zapach; do zastąpienia parserem).
- **Dostępność: słaba, nie zerowa.** 191 `aria-*`, ale 176 to `aria-hidden` (ikony dekoracyjne); tylko 5 `role=`, 1 `tabindex`, 1 `alt`. Bazą są natywnie dostępne `<button>` (2806) i `<details>`. Braki: modale bez `role="dialog"`/focus-trap, filtry jako klikalne `<div onclick>` bez obsługi klawiatury, brak zarządzania focusem przy zmianie widoku; pastelowy kontrast (`--muted` na jasnym tle) miejscami poniżej WCAG AA — do weryfikacji narzędziem.
- 3040 inline `onclick` + 10 inline `<script>` **uniemożliwiają restrykcyjne CSP** (`script-src 'self'`). Docelowo delegacja zdarzeń.

### 3I. Warstwa merytoryczna (kliniczna) — 🟡 (jakość wybitna, luki strukturalne)

To najmocniejsza część produktu. Niezależna weryfikacja (w tym sprawdzenie liczb z literaturą) **nie znalazła ani jednego błędu w punktacji skal, cut-offach, dawkach leków czy atrybucjach protokołów.**

- **Skale poprawne:** PHQ-9 (≥10), GAD-7 (≥10), Y-BOCS (0–40, odpowiedź ≥35%), PCL-5 (≥33, Blevins 2015), RSES (0–30, <15, połowa pozycji odwrócona), AAQ-II (7 poz., 7–49 — z **wzorcową notą psychometryczną** o konfundowaniu z neurotyzmem), SCS Neff (26 poz., 13 odwróconych), TOSCA-3, TAF (19 poz., Shafran 1996), AUDIT, ISI, EPDS (≥13), ASI-3, DERS, MSI-BPD.
- **Bezpieczeństwo ryzyka: ponadstandardowe.** PHQ-9 pyt. 9 traktowane jako stały ekran ryzyka w wielu miejscach; `suicide.md` jest wzorcowy (CASE Approach Sheia, plan bezpieczeństwa Stanley-Brown, krytyka kontraktu no-suicide zgodna z NICE 2022, ramy prawne PL); farmakoterapia świadoma ryzyk (switch maniakalny, SJS przy lamotryginie, black-box SSRI u młodzieży, zakres litu, ECT w depresji psychotycznej).

**Luki strukturalne (nie błędy treści):**
1. **`leki.md` i `plany.md` to puste zaślepki (4 linie)**, a strona główna obiecuje „Leki · 6 tabel". Farmakoterapia istnieje jako ~248 kart rozproszonych w modułach — brak jednego miejsca-referencji (interakcje, zespół serotoninowy, odstawianie, ciąża/laktacja). Realna luka.
2. **Brak jednolitej stopki bezpieczeństwa w SOS dla pacjenta.** Na 1405 plików tylko ~117 (8%) ma „nie zastępuje", ~47 (3%) numer telefonu zaufania. Materiały wysokiego ryzyka (BPD/samouszkodzenia, kryzys) są zabezpieczone, ale ~1300 narzędzi (w tym ekspozycja, praca z traumą) nie ma stopki kierującej do specjalisty/112/116 123.
3. **Backlog 187 arkuszy klinicysty w 32 modułach** (`BACKLOG-arkusze-klinicysty.md`) — najpłytsze: teoria przywiązania (21), ACT (14), ADHD (11). Plus stratny eksport `.md` (3F) ukrywa progi kliniczne, jeśli `.md` miałyby służyć jako źródło/druk.
4. Drobiazgi precyzyjne: w `mi.md` warto zaznaczyć, że MI-3 **wycofał** bilans decyzyjny dla osób skłaniających się ku zmianie; ujednolicić czas trwania kryzysu (4–6 vs 4–8 tyg.) i zakres litu; spójność `eksternalizacja` vs `externalizacja`.

---

## 4. Mocne strony (do zachowania)

1. **Treść kliniczna klasy referencyjnej** — EBM, aktualne wytyczne, poprawne psychometrie, wzorcowa obsługa ryzyka. To główna wartość produktu.
2. **Świadoma prywatność** — brak trackerów, dane lokalne, escaping notatek. Intencja właściwa (wymaga dokończenia, 3B).
3. **Solidny gate integralności treści** i przyzwoite CI (tsc/eslint/build).
4. **Pomysłowość warstwy „owijającej"** — wstrzykiwanie funkcji (konto, ukrywanie martwych przycisków, split transdiag) bez edycji monolitu to sprytne rozwiązanie problemu „mam wielki HTML i chcę go uproduktowić".
5. **Walidacja wejścia w API** i bezpieczny redirect short-linków.

---

## 5. Rekomendowana architektura docelowa (usprawnienia konstrukcyjne)

Trzy strategiczne decyzje, które rozwiązują większość ustaleń u źródła:

**(1) Rozstrzygnij „źródło prawdy" treści.** Dziś monolit jest edytowanym artefaktem bez reprodukowalnego buildu. Dwie czyste drogi:
   - *Minimalna:* uznaj `kompendium.html` + `public/**` za kanon, przenieś wszystkie skrypty `import-*`/`extract-pdf-*`/`rebuild-pilot` do `scripts/_migrations/` (poza aktywnym drzewem), udokumentuj w README, że treść jest artefaktem migracji. Szybkie, uczciwe.
   - *Docelowa:* zbuduj monolit/moduły z **treści strukturalnej** (Markdown/MDX/JSON per karta) w czasie buildu. To eliminuje regexowe parsowanie runtime, daje wersjonowanie, recenzje i testy treści.

**(2) Zabij iframe + parsowanie runtime na rzecz natywnego renderu Next.** Build-time ekstrakcja → strukturalne moduły → komponenty React. Zyski: indeksowalny SEO, możliwość CSP, deep-linki/historia, cache (ISR zamiast `force-dynamic`), dostępność, koniec kruchych regexów. To największa inwestycja, ale spina 3C/3D/3H naraz.

**(3) Wprowadź realną warstwę uprawnień i ochrony treści.**
   - Mapa „moduł/handout → wymagany tier" jako dane; egzekwowanie na serwerze w trasach treści (`redirect`/403 wg `getSubscriptionForUser`).
   - Płatne zasoby **poza `public/`** — serwowane przez chronioną trasę API (stream z fs) albo storage z signed-URL o krótkim TTL, generowanym po weryfikacji tieru.
   - Webhook Stripe + persystencja tieru w `privateMetadata` Clerk (autorytatywne, niefałszowalne); bramkowanie czyta metadata zamiast live-query.

**(4) Jedno wyliczane źródło statystyk** — skrypt budujący `src/lib/stats.json` z monolitu + `public/`, używany wszędzie; asercja spójności w `test-content-integrity` + CI.

**(5) Dane planera:** jeśli mają zostać lokalne — szyfrowanie hasłem terapeuty + obsługa limitu + jawne ostrzeżenie o urządzeniu współdzielonym; jeśli ma być produkt — backend z szyfrowaniem i synchronizacją.

---

## 6. Plan działania (priorytetyzowany)

| Prio | Działanie | Adresuje |
|------|-----------|----------|
| **P0** | Egzekwuj tier po stronie serwera w trasach treści; usuń/zabezpiecz publiczny `/api/plany/document` | 3A.1, 3A.2 |
| **P0** | Wyjmij płatne `public/sos`/`public/handouts` spod publicznego dostępu (trasa API / signed-URL) | 3A.3 |
| **P0** | Szyfruj lub jawnie ostrzeż o danych pacjentów w `localStorage`; obsłuż limit pojemności; oznacz/usuń dane „AB.2026" | 3B |
| **P1** | Webhook Stripe + tier w `privateMetadata`; wiązanie po `clerkUserId`; popraw okno zwrotu i idempotencję | 3A |
| **P1** | Jedno źródło statystyk + test spójności w CI | 3E |
| **P1** | Usuń martwy kod (`KompendiumHome`, `kompendiumHomeData`, `modules.ts`, `simpleMarkdown`, `content/modules/*.md`, `landing/*`, `therapeutic/*`); ujednolić markę Zorza/Kompendium | 3C, 3E |
| **P1** | Udokumentuj nieodtwarzalność treści / przenieś skrypty migracyjne; napraw `predev` (4 indeksy); przestań mutować wejścia w `build-extra-content` | 3F |
| **P2** | Nagłówki bezpieczeństwa w `next.config.ts`; rate-limit `stripe/*`; przestań zwracać `error.message`; dodaj `.env` do `.gitignore` | 3A |
| **P2** | Wypełnij/usuń `leki.md`/`plany.md` (rozważ realny moduł farmakoterapii); jednolita stopka bezpieczeństwa we wszystkich szablonach SOS | 3I.1, 3I.2 |
| **P2** | Włącz `audit-handout-coverage` i `scan-*` do CI; ujednolić listy `SKIP` do jednego JSON | 3G |
| **P3** | Realizuj BACKLOG (najpierw teoria przywiązania); nota MI-3; drobne spójności kliniczne | 3I.3, 3I.4 |
| **P3** | Usuń stub „Zorza AI" lub dokończ; sprzątnij `console.*`/zduplikowany CSS; hostuj fonty lokalnie; popraw dostępność (role/dialog/focus/kontrast) | 3B, 3H |
| **P3+** | (Strategiczne) Migracja z iframe+regex na natywny render Next z treści strukturalnej | 3C, 3D, 3H |

---

## 7. Załącznik — kluczowe metryki

- Monolit: 29,5 MB / 112 081 linii; `<style>` główny ~3740 linii; największy blok JS 7984 linii (planer); 2507 kart; 88 modułów; 3040 inline `onclick`; `TAG_ONTOLOGY` = 206 konceptów; `eval`/`new Function` = 0; `escapeHtml` = 87 użyć.
- `src/`: 7207 linii; rdzeń `originalModules.ts` ~2400; `handoutOverrides.ts` 1209; `originalModules` parsuje monolit i składa dokumenty dla `/`, `/modules/[slug]`, `/api/plany/document`.
- `public/`: 122 MB — sos 1405 HTML, print 1489 HTML + 12 PDF, clinician 1278 HTML, howto 17.
- Stack: Next.js 16.2.4, @clerk/nextjs 7.2.3, stripe 22; `node_modules` niezainstalowane w środowisku audytu (wersje z `package-lock.json`).
- Plany: Basic 39 / Premium 79 / MAX 129 PLN/mies; trial 7 dni; zwrot 14 dni.

*Pełne uzasadnienia i cytaty znajdują się w treści sekcji 3 (odnośniki `plik:linia`).*
