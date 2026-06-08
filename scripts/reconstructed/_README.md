# Odtworzone handouty HTML z PDF — kompendium.app

Paczka zawiera **29 unikalnych handoutów** (31 plików HTML; 2 to celowe duplikaty nazw)
odtworzonych z PDF-ów, dla których brakowało źródła HTML.

## Struktura
`<moduł>/<nazwa>.html` — każdy plik to samodzielny dokument A4 (lineart v2):
osadzony CSS, `@media print`, biblioteka ikon SVG. Otwórz w przeglądarce → podgląd
arkusza; `Ctrl+P` → wydruk.

## Metoda
1. Ekstrakcja tekstu z pozycjami z PDF (pdfjs-dist).
2. Złożenie w kanoniczny szablon lineart v2 (nagłówek, intro-boxy „Jak używać / Dlaczego
   to działa", sekcje 01–0x, skale 0–10, checklisty, callout „Klucz", stopka).
3. Łączenie fragmentów wg geometrii (usuwa rozbite ligatury fi/fl i spacje wokół cudzysłowów).

## Jakość (patrz `_raport-wiernosci.csv`)
- Średnia wierność tekstowa: **~97%** pokrycia słów PDF→HTML.
- **6 plików ręcznych (wzorcowych)** — najwyższa wierność układu (siatki technik, tabele, skale):
  bdd-czym-jest, czym-bdd, bdd-model-cbt, bdd-drabina-ekspozycji, gad-defuzja, gad-mapa-martwienia.
- **Pliki generatora**: wierne treściowo; arkusze z gęstymi polami do wypełnienia
  (np. adhd-prokrastynacja) mogą wymagać lekkiego doszlifowania układu.

## Uwagi
- Moduł **bdd-dys** używa domyślnego akcentu sage `#3d6b30` (brak zdefiniowanego koloru
  marki BDD) — łatwo przefarbować zmienną `--sage` w CSS.
- Pliki `czym-bdd` ≡ `bdd-czym-jest` oraz `interpersonalne-ocpd` ≡ `ocpd-interpersonalne`
  to identyczne treści pod dwiema nazwami (tak jak w oryginalnych PDF).
- `ocpd-praca-zycie.pdf` w źródle zawiera treść „Czym jest OCPD" (mislabeling w źródle) —
  odtworzono wiernie zawartość PDF.
