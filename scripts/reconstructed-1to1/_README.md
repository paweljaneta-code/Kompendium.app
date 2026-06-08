# Handouty HTML 1:1 z PDF — kompendium.app

29 unikalnych handoutów (31 plików HTML) odtworzonych **wizualnie 1:1** z PDF-ów.

## Metoda
Renderer operatorowy (pdfjs-dist) odtwarza z PDF:
- tekst na **dokładnych pozycjach** (te same współrzędne co PDF), z szerokością runów
  przypiętą (`textLength`) dla wiernego odstępu,
- **grafikę wektorową** (ramki, linie, pola, diagramy) jako ścieżki SVG,
- **kolory** wypełnień i obrysów (włącznie z akcentami),
- **fonty jak w PDF**: serif → Liberation Serif / Times, sans → Liberation Sans / DejaVu / Arial.

Każdy plik to A4 z `@media print` — otwórz w przeglądarce (wygląd = PDF), `Ctrl+P` drukuje.

## Uwagi
- To wierne odwzorowanie WYGLĄDU PDF (tekst pozostaje tekstem, grafika wektorem) — nie
  semantyczny HTML. Edycja treści jest możliwa, ale to pozycjonowane elementy SVG, nie
  układ z klas CSS.
- Najlepsza wierność przy zainstalowanych fontach Liberation/DejaVu; w innym wypadku
  przeglądarka użyje Arial/Times (metrycznie zbliżone).
- `czym-bdd` ≡ `bdd-czym-jest`, `interpersonalne-ocpd` ≡ `ocpd-interpersonalne` (duplikaty nazw).
