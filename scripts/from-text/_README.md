# Handouty HTML napisane od zera z treści PDF — kompendium.app

29 unikalnych handoutów (31 plików HTML) napisanych ręcznie w szablonie „lineart v2"
na podstawie treści słownej wyekstrahowanej z PDF.

## Co to jest
Czyste, semantyczne pliki HTML (nie render PDF): nagłówek, intro-boxy „Jak używać /
Dlaczego to działa", numerowane sekcje z ikonami, skale 0–10, checklisty, tabele,
pola do wpisania, callouty „Klucz". Każdy to samodzielny A4 z `@media print` — otwórz
w przeglądarce, `Ctrl+P` drukuje.

## Jakość
- Średnia wierność tekstowa: **98,1%** (wszystkie numery, źródła, kryteria odtworzone;
  naprawione artefakty ligatur fi/fl i spacje wokół „cudzysłowów").
- Wszystkie 31 przechodzą audyt produkcyjny (A4, druk, 2 strony, stopka, lang/UTF-8).

## Uwagi
- Moduł BDD używa domyślnego akcentu sage `#3d6b30` (brak zdefiniowanego koloru marki) —
  zmiana zmiennej `--sage` w CSS przefarbuje moduł.
- `czym-bdd` ≡ `bdd-czym-jest`, `interpersonalne-ocpd` ≡ `ocpd-interpersonalne` (duplikaty nazw, ta sama treść).
- `ocpd-praca-zycie` i `ocpd-interpersonalne` w źródle mają treść inną niż sugeruje nazwa
  pliku (mislabeling w oryginalnych PDF) — odtworzono faktyczną treść.
