# Łatwe dorzucanie treści (bez edycji kompendium.html)

Mechanizm: pliki w tym katalogu oraz w `public/howto/**` są kompilowane przez
`scripts/build-extra-content.mjs` (uruchamiany automatycznie w `npm run build`)
do `src/lib/extra-content.json`, importowanego statycznie przez aplikację.
Karty i moduły są wstrzykiwane do stron w czasie renderowania — trafiają też
do wyszukiwarki globalnej i przeglądarki narzędzi. Liczniki (pigułki, sidebar,
nagłówek) przeliczają się same w przeglądarce.

## 1. Nowe narzędzie w istniejącym module

Plik: `content/extra/tools/<tab>/<id>.json` (`<tab>` = id modułu, np.
`transdiag`, `gad`; `<id>` = unikalny identyfikator karty).

```json
{
  "topic": "perfekcjonizm",
  "name": "Nazwa narzędzia",
  "sub": "Autor (rok) — krótki podtytuł",
  "badge": "Technika",
  "badgeBg": "#fde8e8",
  "badgeFg": "#8a2d1d",
  "appTag": "terapia poznawczo-behawioralna",
  "app": "CBT",
  "m": "technika",
  "y": "technika",
  "dur": "20 min",
  "position": "top",
  "tldr": "Jedno zdanie podsumowania (HTML dozwolony).",
  "bodyHtml": "<div class=\"ds\"><h4>Opis</h4><p>Treść karty…</p></div>",
  "materials": ["print", "sos", "clinician"]
}
```

- `topic` musi odpowiadać `data-filter` pigułki w module (karta podlega
  filtrowi); `position: "top"` wstawia kartę na początek grupy tematu.
- `materials`: `print` / `sos` / `clinician` — standardowe przyciski
  (widoczność zależy od istnienia plików w `public/handouts/**`, `public/sos/**`);
  `guide` — para „Przejrzyj przewodnik" (pełny ekran) + „Udostępnij przez link"
  (wymaga pliku `public/sos/<tab>/<id>.html`).

## 2. Cały nowy moduł

Plik: `content/extra/modules/<tab>.json`:

```json
{
  "name": "Nazwa modułu",
  "desc": "Opis na kafelku strony głównej i w wyszukiwarce",
  "metaEn": "English subtitle",
  "color": "#4a6a5a",
  "keywords": "słowa kluczowe wyszukiwarki",
  "categories": [
    { "key": "temat-a", "label": "Temat A", "color": "#3c5ba7" },
    { "key": "temat-b", "label": "Temat B" }
  ]
}
```

Moduł dostaje stronę `/modules/<tab>`, kafelek na stronie głównej i wpis
w wyszukiwarce. Narzędzia dodaje się jak w pkt. 1 (`content/extra/tools/<tab>/…`
z `topic` = `key` kategorii).

## 3. Poradnik „Jak pracować z…" dla subsekcji

Plik: `public/howto/<tab>/<topic>.html` — samodzielny dokument HTML
(`<topic>` = `data-filter` pigułki). Etykieta przycisku brana z `<title>`
(prefiks „Poradnik · " jest ucinany). Po wybraniu filtra subsekcji nad listą
narzędzi pojawia się przycisk 📘 otwierający poradnik na pełnym ekranie.

## Po dodaniu plików

`npm run build-extra-content` (lub po prostu `npm run build`) → commit → push.
Nic więcej — żadnych zmian w `kompendium.html` ani w licznikach.
