# Audyt językowy handoutów do drukowania

**Zakres:** wszystkie handouty do druku w `public/handouts/print/` — **1489 plików HTML**
(≈ 5,3 mln znaków widocznego tekstu, 92 moduły tematyczne).
**Data:** 2026-06-11

## Metodologia

Audyt każdego pliku indywidualnie, w sposób systematyczny i powtarzalny:

1. **Ekstrakcja tekstu** — z każdego pliku wyodrębniono widoczny tekst (usunięto
   CSS/JS/SVG i znaczniki, scalono słowa rozbite miękkim myślnikiem `U+00AD`).
2. **Słownik** — sprawdzenie pisowni przez `hunspell` ze słownikiem `pl_PL`
   (wejście UTF-8). Zagregowano 5 040 unikalnych nieznanych tokenów (29 986 wystąpień).
3. **Triaż** — nieznane tokeny pogrupowano i odsiano warstwy false-positive:
   - terminologia kliniczna i neologizmy autorskie (np. *samowspółczucie, defuzja,
     dekatastrofizacja, neuroróżnorodność, współregulacja, suicydalność*),
   - akronimy (PTSD, CBT, DBT, SUDS…), nazwiska (Linehan, Fairburn, Marlatt,
     **Wrzesniewski** — Amy Wrzesniewski, pisownia bez znaków diakr. jest poprawna;
     **Mikolajczak** — Moïra Mikolajczak, również poprawnie bez diakrytyków),
   - anglicyzmy fachowe (mindfulness, rescripting, recovery),
   - notacja inkluzywna płci (`zauważyłeś/-aś`, `przyjaciel/-ółka`) i skróty
     (`przedł.`, `wywoł.`, `szac.`, `wybudz.`).
4. **Wykrywanie literówek** — analiza tokenów: zawierających polskie znaki diakrytyczne,
   „polsko wyglądających" bez diakrytyków oraz pisanych wielką literą; każdy kandydat
   weryfikowany w kontekście zdania i pliku źródłowego.
5. **Wzorce typowych błędów** — skan pod kątem klasycznych błędów (*napewno, wogóle,
   wziąść, włanczać, narazie, conajmniej*…) — **0 trafień**.

## Wynik

Materiał jest napisany na bardzo wysokim poziomie językowym. Wykryto i poprawiono
**38 błędów** (41 wystąpień) w **39 plikach** — pojedyncze literówki, błędne formy
fleksyjne i brakujące znaki diakrytyczne. Brak błędów systemowych.

### Lista poprawek

| Plik | Było | Jest |
|---|---|---|
| bpd/przeciwne-dzialanie.html | częścia | część |
| npd/28-profilaktyka.html | eksplodzję | eksploduję |
| ppu/ppu-diff.html | hipersepsualnością | hiperseksualnością |
| bpd/bpd-podloze.html | nieobwinjająca | nieobwiniająca |
| ppu/ppu-online.html | następi | następnie |
| psychosis/objawy-neg.html | konsumcję | konsumpcję |
| adhd/slepota-czasowa.html | mnoż | mnóż |
| avpd/10-vs-sad.html · bpd/bpd-walidacja-6-diagram.html · bpd/walidacja.html | przeszłem | przeszedłem |
| dep/ruminacja.html | rumiuję | ruminuję |
| ocd/be-tort.html | technniką | techniką |
| ppu/ppu-nofap-critique.html | wzięłem | wziąłem |
| bn/bn-model-fairburn.html | wąsza | węższa |
| bn/bn-model-fairburn.html | fokuszacja | fiksacja |
| bn/bn-reguly-zywieniowe.html | zniknią | znikną |
| att-avoidant/av-mindful-body.html | środdniowy | śróddniowy |
| health_anx/ha-cyberchondria.html | ulgowało | ulżyło |
| sad/lek-odrzucenia.html | prośb | próśb |
| dep/dep-higiena-snu.html | dospię | dośpię |
| gad/trening-uwagi.html | poznawczo-uważeniowy | poznawczo-uwagowy (zespół CAS) |
| dbt/dbt-modlitwa-m-dry-umys-w-kryzysie.html | w ciszie (×2) | w ciszy |
| npd/27-przeciwprzeniesienie.html | niezniszliwa | niezniszczalna |
| dep/ba-mastery.html | podszepuje | podszeptuje |
| bn/bn-ekspozycja-food.html | budowniczo działa | budująco działa |
| relaks/nadi-shodhana.html | kotwiczaco | kotwicząco |
| burnout/bo-sen.html | odespiesz | odeśpisz |
| burnout/bo-sen.html | dorzucką | dorzutką |
| dep/dep-model-beck.html | o triadze | o triadzie |
| bpd/kryzys-kontakt.html | nosz przy sobie | noś przy sobie |
| bpd/za-i-przeciw.html | do nosza przy sobie | do noszenia przy sobie |
| ppu/ppu-cycle.html | przerwalnymi | przerywalnymi |
| cptsd/ptg-cptsd.html | Klinicyśta | Klinicysta |
| cptsd/stair-cptsd.html | Przeciwskazania | Przeciwwskazania |
| ocd/hamowanie.html | Wygaszyłem | Wygasiłem |
| bn/bn-komunikacja.html | Zniszcza relacje | Niszczy relacje |
| adhd/adhd-desr.html | jeśli jej nie ścigniesz | jeśli jej nie ścigasz |
| adhd/adhd-body.html · adhd/body-doubling.html | Mechanizm trójski | Mechanizm trójdzielny |
| cptsd/ifs-cptsd.html | niewytrzymalny ból | nieznośny ból |
| relaks/oddech-slomka.html | „dziubek" | „dzióbek" |

### Świadomie pozostawione (nie błędy)

- **Konsekwentne terminy autorskie** — `leczalny / leczalna / leczalne / nieleczalny`
  (8+ wystąpień jako spójny termin „poddający się leczeniu"); neologizmy kliniczne
  (`przeramowanie`, `lustrzanienie`, `podpobudzenie`, `przeciwzdanie`, `samodbałość`).
- **Skróty i notacja** — `częśc.`, `przedł.`, `wywoł.`, `szac.`, `wybudz.`,
  `Samousz.`, notacja `/-aś`, `/- łabym` itd.
- **Do ewentualnej decyzji autora** (pozostawione bez zmian): wyrażenie
  `„sleperową torturą"` (ocd/model(1).html, ocd/ocd-model-salkovskis.html) — niejasny
  anglicyzm; oraz nazwa pułapki `Przeplanowanie` (procrast/pr-unschedule.html).
