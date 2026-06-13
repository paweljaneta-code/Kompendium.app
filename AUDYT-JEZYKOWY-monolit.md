# Audyt językowy monolitu i nowych materiałów (Zorza)

**Zakres:** `kompendium.html` (monolit aplikacji, ~29,6 mln znaków — **nieobjęty**
wcześniejszymi audytami) oraz wszystkie materiały dodane po 2026‑06‑11:
poradniki „Jak pracować z…" (`public/howto/transdiag/`, 17 plików), interaktywne
przewodniki klienta (`public/sos/transdiag/td-przewodnik-*`, 14 plików), karty
narzędzi (`content/extra/tools/transdiag/`, 95 plików JSON) oraz arkusze
klinicysty (`public/handouts/clinician/`, ~1300 plików — wcześniej nieaudytowane).
**Data:** 2026‑06‑13.

## Metodologia

1. **Ekstrakcja prozy** z każdej warstwy: body HTML + atrybuty
   `placeholder`/`title`/`aria-label`, a dla SOS-ów/poradników także proza
   z literałów szablonowych JS (po usunięciu znaczników, miękkich myślników,
   wyrażeń `${…}`). Tokenizacja słów polskich (z diakrytykami).
2. **Słownik** — `hunspell pl_PL` (wejście UTF‑8). Monolit: ~87 tys. unikalnych
   słów, ~17 tys. nieznanych tokenów.
3. **Triaż wielowarstwowy** odsiewający warstwy false‑positive:
   - akronimy (CBT, DBT, PTSD…), nazwiska (Linehan, McGoldrick, Fairburn…),
     anglicyzmy fachowe (mindfulness, rescripting, recovery),
   - słowa będące poprawnym **angielskim** (krzyżowo przez słownik EN —
     odsiewa cytaty i tytuły),
   - neologizmy autorskie i poprawne złożenia (samowspółczucie, defuzja,
     uważność, kontrposunięcia, dwubiegunówka…),
   - notacja inkluzywna (`zauważyłeś/-aś`).
4. **Wykrywanie literówek**: (a) **glitche wielkości liter** (litera
   diakrytyczna małą literą wewnątrz wyrazu pisanego wersalikami — wzorzec
   `[a-ząćęłńóśźż][A-ZĄĆĘŁŃÓŚŹŻ]`); (b) **kandydaci dist=1** — sugestie hunspella
   z odległością edycyjną 1 do poprawnego słowa, ograniczone do form z polskimi
   diakrytykami; (c) zamknięty zbiór **klasycznych błędów** (napewno, wogóle,
   wziąść, narazie, na codzień…).
5. **Weryfikacja kontekstowa każdego kandydata** przed naprawą (casing zależny
   od zdania: małe / WIELKIE / Tytuł; pominięcie podłańcuchów poprawnych słów
   oraz slugów `data-go`/`id`).
6. **Walidacja po naprawie** — render monolitu (parsowanie do stron modułów),
   test integralności treści (4173 pliki), brak nowych błędów.

## Wynik

W monolicie poprawiono **ponad 220 wystąpień** błędów (cztery zweryfikowane
partie); w materiałach 1. Poniżej rozbicie.

### `kompendium.html` — partia 1: 97 wystąpień

**Glitche wielkości liter (42):** błędna wielkość liter w słowach polskich, każdy
wg kontekstu — m.in. `śWIADOMOŚĆ→świadomość`, `śWIADKIEM→świadkiem`,
`dziaŁa→działa`, `ROśNIE→rośnie`, `SPOSoB→sposób`, `obnIżyć→obniżyć`,
`niePRZEWIDYWALNY→nieprzewidywalny`, `ROZMAWIAłŁ→rozmawiały`,
`SprawdźMY→Sprawdźmy`, `WDZInCZNY→wdzięczny`, `ZWYCIęSTWEM→zwycięstwem`,
`ZASTePOWANIE→zastępowanie`; wersaliki: `RÓżNICA→RÓŻNICA`, `WAżNE→WAŻNE`,
`WśCIEKŁE→WŚCIEKŁE`, `WSpółPRACA→WSPÓŁPRACA`, `WEWNęTRZNE→WEWNĘTRZNE`,
`SZCzĘŚCIA→SZCZĘŚCIA`, `TRUDNOśĆ→TRUDNOŚĆ`, `śRODOWISKO→ŚRODOWISKO`,
`żYCZLIWOŚĆ→ŻYCZLIWOŚĆ`, `źRÓDŁA`/`źródŁa→źródła`; sklejenie `klasterC→klaster C`.

**Realne literówki (55 wystąpień, 18 typów):** anglicyzmy i błędy literowe
z jednoznacznym celem polskim — `veteranów→weteranów`,
`disproporcji→dysproporcji`, `verbalizacja→werbalizacja`,
`tytulowana→tytułowana`, `recidywy→recydywy`, `progressu→progresu`,
`eustress→eustres`, `variancji→wariancji`, `zdroweniu→zdrowieniu`,
`precipitujące→precypitujące`, `stimulanty→stymulanty` (też
`psychostimulanty`), `deficyts→deficits`, `panicki→paniki` („atak paniki"),
`skłubanie→skubanie`, `dowod→dowód` (3×, tylko standalone — „dowodów" z encją
`&#243;` pominięte), `założ buty→załóż buty`, `nie założ→nie zakładaj`,
`wyobraż→wyobraź`.

### `kompendium.html` — partie 3–4: ~130 wystąpień (anglicyzmy/latynizmy/literówki)

Po triażu hunspell‑a (sugestie z odległością edycyjną 1, krzyżowo ze słownikiem
EN), z weryfikacją kontekstową i **kontrolą atrybutów** (token w `data-go`/`id`/
`class`/`href` pomijany jako slug/kod):

- **v→w:** `validacja→walidacja`, `intervencji→interwencji`,
  `konversja→konwersja`, `ambivalencja→ambiwalencja`, `supervizja→superwizja`,
  `improvizacja→improwizacja`, `vomitowanie→womitowanie`, `verbalnie→werbalnie`.
- **podwojone litery:** `effekt→efekt`, `suppresja→supresja`,
  `klassyczne→klasyczne`, `akkomodacja→akomodacja`, `koffeina→kofeina`,
  `traumma→trauma`, `tunnelowanie→tunelowanie`, `dystress→dystres`.
- **hyper/hypo→hiper/hipo:** `hyperaktywny→hiperaktywny`,
  `hypomanii→hipomanii`, `hypokaliemia→hipokaliemia`.
- **i→y w latynizmach:** `dichotomiczne→dychotomiczne`,
  `eksperiment→eksperyment`, `heuristyka→heurystyka`, `koordinacja→koordynacja`,
  `supplementacja→suplementacja`, `glorifikacja→gloryfikacja`,
  `polarizacje→polaryzacje`, `socializacja→socjalizacja`,
  `horizontalnie→horyzontalnie`, `orthopedyczne→ortopedyczne`,
  `resonans→rezonans`, `eksplicitna→eksplicytna`, `introspeksji→introspekcji`,
  `ritualizacja→rytualizacja`, `ekstinkcja→ekstynkcja`,
  `standardyzacja→standaryzacja`, `suicidologiczne→suicydologiczne`,
  `incidencie→incydencie`.
- **literówki literowe:** `dietytycy→dietetycy`, `gineokologa→ginekologa`,
  `oseoporoza→osteoporoza`, `perzentyli→percentyli`, `prokursorem→prekursorem`,
  `rekmrutowanymi→rekrutowanymi`, `niespodziankek→niespodzianek`,
  `frustacja→frustracja`, `deperosonalizacja→depersonalizacja`,
  `desintegracji→dezintegracji`, `decompensacja→dekompensacja`,
  `injekcja→iniekcja`, `processowanie→procesowanie`, `reportuje→raportuje`,
  `behavioralne→behawioralne`, `compulsywnym→kompulsywnym`, `cortyzol→kortyzol`,
  `abnormalny→anormalny`, `deaktywuje→dezaktywuje`, `determiniuje→determinuje`,
  `interrnalizuje→internalizuje`, `konsumcyjna→konsumpcyjna`,
  `komplimenty→komplementy`, `kontynuum→kontinuum`, `najbolesniejszy→najboleśniejszy`,
  `epizodie→epizodzie`.
- **proza z brakującym diakrytykiem (NIE slug):** `przywiazania→przywiązania`
  (6×; slug `genogram-przywiazania` chroniony), `w kazdym kroku→w każdym kroku`,
  `intrusywne→intruzywne`.

**Świadomie pominięte podłańcuchy** (zmiana zepsułaby poprawne słowa): `epizode`
(w „epizodem"), `epizodzi` (w „epizodzie"), `dowod` (w „dowodów"), `tworz`/
`czesto`/`osob`/`wybor` (w „tworzy"/„często"/„osobą"/„wyborów") oraz **slugi**
`data-go`/`id` (`cialo-…`, `sygnaly-…`, `rozwiazywanie`, `genogram-przywiazania`).
Każda partia walidowana renderem monolitu i testem integralności; jedna
partia z błędnym dopasowaniem podłańcucha została wykryta i wycofana przed
zatwierdzeniem (epizodem→epizodm), po czym powtórzona poprawnie.

### Materiały — 1 wystąpienie

- `public/sos/ptsd/okno-tolerancji.html`: `na codzień → na co dzień`.

### Materiały czyste (zero realnych błędów)

- **Nowe poradniki / przewodniki / karty JSON** (126 plików) — kandydaci dist=1
  okazali się w całości poprawnymi neologizmami, złożeniami i przysłówkami
  (`falsyfikowalną`, `wypłaszczają`, `uważność`, `kontrposunięcia`…); rzekome
  „glitche casingu" to identyfikatory JavaScript (`renderChart`,
  `localStorage`…), nie proza.
- **Arkusze klinicysty** (`public/handouts/clinician/`) — kandydaci dist=1 to
  poprawne terminy/kolokwializmy (`dwubiegunówka`, `stygma`, `lżeje`, metafora
  NVC `żyrafemu`).

## Świadomie pozostawione

- **Anglicyzmy‑warianty stosowane konsekwentnie** (zgodnie z linią poprzednich
  audytów, do decyzji autora): `iatrogeniczny`, `forensyczny`, `detoks/detox`,
  `addykcja`, `scrollować`, `deadline`, `framework`, `eksternalizacja`/`externalizacja`.
- **Angielskie cytaty i tytuły** (np. `stimulants`, `attention deficits` jako
  termin), **nazwiska bez diakrytyków**, **slugi nawigacyjne** (`data-go`,
  `id` — np. `ec-para-rytualy`), **identyfikatory JS**.
- **`pogawędkau`** (4×, monolit) — forma błędna, ale poprawny przypadek zależy od
  zdania (dopełniacz `pogawędki` vs narzędnik `pogawędką`); pozostawiona do
  ręcznej decyzji autora, by nie wprowadzić błędu gramatycznego.
- **`content/modules/*.md`** — pliki źródłowe **nieserwowane** w aplikacji
  (brak trasy); poza zakresem audytu treści użytkowej.
- Pojedyncze, niejednoznaczne formy z mieszanym casingiem w emfazie wersalikowej
  (np. `źLE`/`ŹLE` w jednym kontekście).

## Walidacja

Po wszystkich poprawkach: render monolitu do stron modułów bez błędów,
`npm test` (integralność treści, 4173 pliki) — OK.
