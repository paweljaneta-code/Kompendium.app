# Audyt językowy SOS-ów (elektroniczne wersje handoutów)

**Zakres:** wszystkie SOS-y w `public/sos/` — **1391 plików HTML**
(interaktywne, wielokrokowe wersje handoutów; ~13,5 mln znaków tekstu).
**Data:** 2026-06-11

## Dlaczego audyt SOS-ów jest dokładniejszy niż druku

SOS-y zawierają znacznie więcej swobodnej prozy niż wersje do druku, w tym tekst
**ukryty przed prostą ekstrakcją**:
- atrybuty `placeholder` / `title` / `aria-label` pól `<textarea>`,
- **proza w literałach szablonowych JS** — dynamiczne komunikaty zwrotne przy suwakach
  (`${v}/10 — silna fuzja…`), toasty, etykiety przycisków.

Ekstrakcja objęła wszystkie te warstwy (po usunięciu znaczników HTML wewnątrz stringów JS,
miękkich myślników i wyrażeń `${…}`). Daje to ~2,5× więcej tekstu do sprawdzenia niż w druku.

## Metodologia

1. **Ekstrakcja warstwowa** (body + atrybuty + proza JS) z 1391 plików.
2. **Słownik** — `hunspell pl_PL` (UTF-8); 11 573 unikalnych nieznanych tokenów (109 513 wystąpień).
3. **Triaż wielogrupowy** z weryfikacją kontekstową każdego kandydata:
   grupy diakrytyczne, „polsko wyglądające" bez diakrytyków, wielką literą oraz
   pasmo średnich częstości (wyłapuje błędy powtarzalne).
4. **Walidacja po naprawie** — sprawdzono, że wszystkie nowe formy to poprawne słowa
   lub konsekwentne terminy autorskie (żadnego nowego błędu nie wprowadzono).

## Wynik

Poprawiono **278 wystąpień błędów** (≈ 160 unikalnych) w **197 plikach**. Główne klasy:

- **Błędne formy fleksyjne / czasowniki:** przeszłem→przeszedłem, weszedł→wszedł,
  wszedłam→weszłam, weznę→wezmę, zaniesę→zaniosę, zaczęłem→zacząłem, Bierzę→Biorę,
  Jedzesz→Jesz, Stojesz→Stoisz, Stratiłem→Straciłem, tonają→toną, tonąsz/tonisz→toniesz,
  ucząsz→uczysz, kalecisz→kaleczysz, ceniasz→cenisz, ryknesz→rykniesz, przewidziesz→przewidzisz,
  pominąłaś→pominęłaś, mogłbym/Mogłbym→mógłbym/Mógłbym, mogłoś→mogłeś.
- **Brakujące / błędne znaki diakrytyczne:** grożby→groźby, mąża→męża, miłło→miło,
  jednoczesnie→jednocześnie, wczesnie→wcześnie, wezmiesz→weźmiesz, skróc→skróć,
  kosztow→kosztów, kliniczych→klinicznych, tłący→tlący, ciełeśnie→cieleśnie,
  najbolesniejszą→najboleśniejszą, gorzejj→gorzej.
- **Powtarzalne literówki (pasmo średnie):** recidiwę/recidywą→recydywę/recydywą (11×),
  komponenetów→komponentów (6×), bańek→baniek (5×), prevencją→prewencją (5×),
  Karzenie→Karanie (5×), suicidalność/Suicidalność→suicydalność/Suicydalność (9×),
  „z nikąd"→„znikąd" (5×), narcyzistyczna→narcystyczna (3×), satysfakcjujący→satysfakcjonujący,
  katastrofujących→katastrofizujących, dziala→działa.
- **Anglicyzmy / zła latynizacja:** escalację→eskalację, intervencję→interwencję,
  invalidacją→inwalidacją, rationalizacją→racjonalizacją, medikalizację→medykalizację,
  hyperwentylacją→hiperwentylacją, misogyniczna→mizoginiczna, historicznie→historycznie,
  rigorystyczny→rygorystyczny, Plasticność→Plastyczność, Transtheoretyczny→Transteoretyczny,
  alexithymią/alexitymią→aleksytymią, antyciklicznie→antycyklicznie,
  Niekriminogeniczne→Niekryminogenne; prefiks hyper-/hypo-→hiper-/hipo- w słowach polskich
  (hyperfokus, hyperaktywny, hyperwentylacja, hypoaktywacja, hyperstymulacji, hyperempatia).
- **Garbnięcia / sklejenia / rozcięcia:** Karkbrzuch→„Kark, brzuch", niedotyczy→„nie dotyczy",
  „Ten przesun"→„To przesunięcie", całą ekosystemę→cały ekosystem,
  „przyjaciołce/przyjaciele"→„przyjaciółce/przyjacielowi", osiągnęłczyń→osiągnięć,
  najbólańiejszego→najboleśniejszego, nieprzeprzeżytych→nieprzeżytych.
- **Złe słowa znaczeniowo:** kuszył→kusił, wygaszył→wygasił, wymyśleć→wymyślić,
  korektywać→korygować, uracjonalizować→zracjonalizować, kontrkonzależność→kontrzależność,
  metawiadomość→metaświadomość, odlęczenie→odłączenie, śpienie/śpienia→spanie/spania.

## Świadomie pozostawione (nie błędy lub poza zakresem)

- **Slugi nawigacyjne w atrybutach `data-go`** (`strzalka-w-dol`, `znieksztalcenia`) — to
  identyfikatory linków `qg-link`, NIE proza; zmiana zepsułaby nawigację.
- **Poprawne nazwiska bez polskich diakrytyków:** Trzesniewski (Kali Trzesniewski),
  Wrzesniewski (Amy Wrzesniewski), Mikolajczak (Moïra Mikolajczak), Czeisler, Pennebaker,
  Boszormenyi, Pyszczynski, Weisz, Kolacz, Cysarz.
- **Poprawne terminy fachowe:** ciało suteczkowate, suicydalność, dysregulacja, interocepcja,
  neuroróżnorodność i konsekwentne neologizmy autorskie (samowspółczucie, defuzja,
  współregulacja, grandiozja, pomagacz/zakłócacz, rodzicowanie itp.).
- **Świadoma stylizacja** (np. defuzyjne „Niee daszzz radyy" wymawiane głosem robota).

## Niespójności systemowe — rekomendacja (nie naprawiane masowo)

Pozostawione do decyzji autora, bo to spójne wybory stosowane w wielu plikach, nie pojedyncze
literówki:

- **`externalizacja` (x) vs `eksternalizacja` (ks)** — ~66 vs ~74 wystąpień; warto ujednolicić
  do polskiej formy `eksternalizacja`.
- **`forensyczny` / `iatrogeniczny`** — anglicyzmy używane wielokrotnie obok wariantów z `i/y`.
- **`leczalny` / `nieleczalny`** — konsekwentny termin autorski („poddający się leczeniu");
  niestandardowy słownikowo, ale spójny — jak w wersjach do druku.
- Pojedyncze, niejednoznaczne neologizmy (np. `lubliwość`, `Naładowywalnia`, `Wytłumicz`,
  `przerajowują`) pozostawiono bez zmian z braku pewnej formy docelowej.
