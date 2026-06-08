# Instrukcja dla Cursora — de-duplikacja 350 aliasów handoutów do druku

## Kontekst problemu

W `public/handouts/print/` jest **3 327 plików** (1 496 HTML + 1 831 PDF), ale dysproporcja
PDF↔HTML bierze się z bałaganu nazewniczego. Twardy test md5 wykazał:

- **350 plików PDF to bajt-identyczne duplikaty** istniejącego handoutu zapisanego pod
  **nazwą kanoniczną** (która ma komplet `*.html` + `*.pdf`).
  Przykład: `ppu/15min.pdf` ma **ten sam md5** co `ppu/ppu-15min.pdf`, a `ppu/ppu-15min.html` istnieje.
- To NIE są brakujące pliki — to nadmiarowe kopie pod aliasem nazwy (najczęściej bez prefiksu
  modułu: `hormony` zamiast `adhd-hormony`).

Te 350 duplikatów zaśmiecają repo i są częścią tej samej choroby, przez którą ~60% przycisków
„drukuj" w aplikacji nie trafia w plik (patrz audyt pokrycia).

> ⚠️ **Osobny, NIEZWIĄZANY zbiór:** 29 handoutów to PRAWDZIWE braki HTML (lista
> `scripts/worklist-reconstruct.txt`). **NIE dotykaj ich w tym zadaniu** — są odtwarzane osobno
> (pilot w `scripts/pilot-output/`). To zadanie dotyczy WYŁĄCZNIE 350 duplikatów.

## Dane wejściowe (już wygenerowane, użyj ich — nie licz od nowa)

- `scripts/dedup-aliases.json` — 350 mapowań. Każdy wpis:
  ```json
  {
    "aliasId": "ppu/15min",          // plik-duplikat (mod/nazwa, bez rozszerzenia)
    "mod": "ppu",
    "aliasFile": "15min",
    "canonical": "ppu/ppu-15min",    // handout kanoniczny (ma .html + .pdf)
    "canonicalFile": "ppu-15min",
    "hasHtml": true,
    "md5": "9c27b9b4…"               // identyczny dla aliasu i kanonicznego PDF
  }
  ```
- `scripts/worklist-reconstruct.txt` — 29 PRAWDZIWYCH braków (lista wykluczeń — nie ruszać).

## Trzy kategorie aliasów (zweryfikowane względem `openHandout()` w `kompendium.html`)

| Kategoria | Liczba | Kto wskazuje plik | Działanie |
|---|---|---|---|
| Kanoniczny jest wołany przez `openHandout()` | **229** | przycisk już działa na kanonicznym | **usuń sam alias-PDF** |
| Żadna nazwa nie jest wołana (czysta sierota) | **121** | nikt | **usuń sam alias-PDF** |
| **Alias** jest wołany przez `openHandout()` | **12** | przycisk wskazuje alias | **najpierw dodaj mapowanie w resolverze → potem usuń** |

## Zadanie — krok po kroku

### Krok 1. Potwierdź dane
Uruchom i sprawdź, że liczby się zgadzają (350 mapowań, md5 identyczne):
```bash
node -e 'const j=require("./scripts/dedup-aliases.json");console.log(j.count, j.mapping.every(m=>m.hasHtml))'
```

### Krok 2. Wyznacz 12 aliasów wołanych przez `openHandout` (wymagają mapowania)
Napisz skrypt `scripts/dedup-classify.mjs`, który dla każdego `aliasId` z `dedup-aliases.json`
sprawdza, czy `aliasFile` występuje w `openHandout('<id>')` w `kompendium.html`.
Zapisz dwie listy: `dedup-need-mapping.txt` (alias wołany) i `dedup-safe-delete.txt` (reszta).

### Krok 3. Dla 12 „need-mapping" — dodaj aliasy do resolvera
Resolver runtime czyta `public/handouts/print-resolver.json` (klucz `resolver`), patrz
`src/lib/handoutOverrides.ts` → `resolvePrintHandoutUrl`. Dla każdego aliasu dodaj wpis:
```json
"15min": { "mod": "ppu", "file": "ppu-15min", "ext": "pdf" }
```
(klucz = `aliasFile`, wartość wskazuje plik kanoniczny). **Nie edytuj ręcznie** — rozszerz
generator `scripts/build-print-handout-index.mjs` o `MANUAL_OVERRIDES` z tych 12, albo dopisz
je programowo do `print-resolver.json` zachowując strukturę `{generatedAt, mapped, unresolved, resolver}`.

### Krok 4. Usuń 350 alias-PDF
Po wykonaniu kroku 3 usuń wszystkie `aliasId + ".pdf"` z `public/handouts/print/`.
Usuwaj WYŁĄCZNIE pliki z `dedup-aliases.json` (aliasy) — **nigdy** plików `canonical`.
Dodatkowo usuń artefakty `nazwa(1).pdf/html` z `scripts/worklist-dup-pdf.txt` (29 szt.).

### Krok 5. Odśwież resolver i zweryfikuj
```bash
npm run build-print-handout-index        # przebuduje print-resolver.json
node scripts/audit-handout-coverage.mjs  # pokrycie przycisków NIE może spaść
node scripts/verify-print-handouts.mjs   # liczby plików
```

## Kryteria akceptacji (DEFINITION OF DONE)

1. Usunięto dokładnie 350 alias-PDF (+ 29 duplikatów `(1)`), żaden plik `canonical` nietknięty.
2. Pokrycie `openHandout` → plik **nie spadło** względem stanu sprzed zmian
   (`audit-handout-coverage.mjs`) — w szczególności 12 aliasów nadal się rozwiązuje (przez resolver).
3. 29 plików z `worklist-reconstruct.txt` pozostaje nietknięte.
4. `print-resolver.json` zawiera 12 nowych mapowań aliasów i jest poprawnym JSON-em.
5. Brak nowych plików-sierot wprowadzonych przez zmianę.

## Guardraile / czego NIE robić

- ❌ Nie usuwaj plików `*.html`. Usuwasz tylko nadmiarowe `*.pdf`-aliasy.
- ❌ Nie ruszaj 29 handoutów z `worklist-reconstruct.txt` (prawdziwe braki).
- ❌ Nie zmieniaj nazw plików kanonicznych (mają już parę html+pdf i działające przyciski).
- ❌ Nie usuwaj aliasu z kroku 3 zanim mapowanie nie trafi do `print-resolver.json`.
- ✅ Pracuj na osobnym branchu i pokaż diff przed commitem.
