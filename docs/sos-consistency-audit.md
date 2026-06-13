# Audyt spójności materiałów SOS

> Interaktywne materiały dla klientów: `public/sos/**/*.html`
> Data audytu: 2026-06-13 · Zakres: **1391 plików** w **48 modułach**

## Narzędzia

- `scripts/audit-sos-consistency.mjs` — skaner spójności (raport, brak modyfikacji).
- `scripts/fix-sos-consistency.mjs` — automatyczna naprawa wykrytych niespójności.

```bash
node scripts/audit-sos-consistency.mjs   # raport
node scripts/fix-sos-consistency.mjs     # naprawa
```

## Co jest sprawdzane

Każdy plik SOS to samodzielny, wielokrokowy materiał oparty o wspólny szablon
(design tokens, nagłówek, kropki postępu, nawigacja krok-po-kroku, auto-zapis do
`localStorage`). Audyt weryfikuje m.in.:

- strukturę dokumentu (`<!DOCTYPE>`, `lang="pl"`, `charset`, `viewport`),
- format tytułu (`<title>Narzędzie · …`) i nagłówka (`.hdr-title`),
- komplet tokenów kolorów w `:root` (8 bazowych),
- elementy nawigacji (`#dots`, `#stepNum`, `#backBtn`, `#nextBtn`),
- zgodność liczby kart `data-step` z `TOTAL_STEPS` oraz ciągłość numeracji,
- licznik „krok / N" w nagłówku zgodny z `TOTAL_STEPS`,
- obecność auto-zapisu i konwencję klucza `localStorage` (`sos_<nazwa-pliku>`),
- **kolizje kluczy** `localStorage` (te same dane współdzielone przez różne materiały),
- wypełnione pola (materiał powinien startować pusty).

## Wynik PRZED naprawą

| Niespójność | Liczba | Moduły |
|---|---|---|
| `<title>SOS ·` zamiast `Narzędzie ·` | 78 | act (71), dbt (6), gad (1) |
| Nagłówek `SOS ·` lub brak prefiksu | 78 | te same (starsza generacja) |
| Przycisk „Dalej" bez strzałki `→` | 104 | act, dbt, gad, sad |
| Klucz `localStorage` w formacie `sos-…-v1` | 27 | sad (cały moduł) |
| Pre-zaznaczone chipy / wpisane dane | 17 pól | adhd-grupa, an-relapse-seed, se-perfekcjonizm |
| **Kolizje kluczy `localStorage`** | **0** | — ✅ |
| Tokeny kolorów, logika 5 kroków, nawigacja, struktura | **0** | ✅ w 100% spójne |

**Wniosek:** rdzeń systemu (design tokens, logika kroków, nawigacja, auto-zapis)
był spójny w 100%. Wszystkie niespójności pochodziły z kilku starszych modułów
(`act`, `sad` + ogony w `dbt`/`gad`) utworzonych we wcześniejszej generacji szablonu.

## Zastosowane naprawy (108 plików)

1. **Tytuł** — `<title>SOS ·` → `<title>Narzędzie ·` (78).
2. **Nagłówek** — `.hdr-title`: prefiks `SOS ·` → `Narzędzie ·` (66) oraz opakowanie
   12 nagłówków bez prefiksu w `Narzędzie · <em>…</em>`.
3. **Przycisk** — statyczna etykieta „Dalej" → „Dalej →" (104).
4. **Klucze `localStorage`** — ujednolicone do konwencji `sos_<nazwa-pliku>` (27;
   moduł `sad` + `self-disclosure`). Zgodnie z ustaleniem zapisany w przeglądarce
   postęp pod starym kluczem nie jest migrowany (materiały mają startować puste).
5. **Opróżnienie pól** — materiały startują puste:
   - `adhd/adhd-grupa.html` — usunięto 8 pre-zaznaczonych chipów (`picked`),
   - `an/an-relapse-seed.html` — wpisany telefon zaufania przeniesiony z `value`
     do `placeholder` (pole puste, podpowiedź bezpieczeństwa zachowana, spójnie z
     sąsiednimi polami kontaktów),
   - `selfcomp/se-perfekcjonizm.html` — wyczyszczono 8 przykładowych wartości
     „tortu samooceny" (paski → 0%, sumy → „Suma: 0%").

### Pola, których celowo NIE ruszono

- `placeholder` w `<textarea>`/`<input>` — to podpowiedzi UX, nie dane (zweryfikowano:
  wszystkie 7950 `<textarea>` mają pustą treść).
- Suwaki `type="range"` (`data-default`) oraz liczniki `value="0"` — to naturalny
  stan pusty/początkowy.

## Wynik PO naprawie

```
RAZEM problemów: 0
Kolizje kluczy localStorage: brak
```

## Pozostałe obserwacje (poza zakresem auto-naprawy)

- `sad/self-disclosure.html` używa innego (starszego) wariantu auto-zapisu
  (`STORAGE_KEY` + obiekt JSON, „v3.2") niż uniwersalny blok. Klucz został
  znormalizowany; pełne ujednolicenie mechanizmu wymagałoby ostrożnego przepisania
  (inny kształt danych) — do rozważenia osobno.
- Część placeholderów zawiera niestandardowe proste cudzysłowy `"` zamiast `&quot;`
  / „ ", co psuje formalne parsowanie HTML (przeglądarki tolerują). Kandydat na
  osobne porządki czystości HTML.
