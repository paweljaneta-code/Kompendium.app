# Synchronizacja planera terapii z Dyskiem Google

Planer terapii („Zorza") pozwala jednym kliknięciem zapisać i wczytać kopię
wszystkich danych (klienci, plany, sesje, postępy) na **własnym Dysku Google**
terapeuty. Dzięki temu te same dane są łatwo dostępne na dwóch (i więcej)
urządzeniach.

## Jak to działa (model prywatności)

- Kopia leci **bezpośrednio z przeglądarki terapeuty na jego Dysk Google**.
  Nie przechodzi przez serwery Kompendium.
- Używamy zakresu OAuth **`drive.file`** — aplikacja widzi i może modyfikować
  **wyłącznie jeden plik, który sama utworzyła** (`kompendium-planer-backup.json`).
  Nie ma dostępu do żadnych innych plików na Dysku.
- Bez konfiguracji (poniżej) przyciski Dysku są ukryte, a planer korzysta z
  ręcznej kopii do pliku JSON (działa zawsze, także offline).

## Konfiguracja (jednorazowo, ~5 minut)

Funkcja wymaga publicznego **OAuth Client ID** z Google Cloud Console.
Client ID jest z założenia publiczny i bezpieczny do osadzenia w kodzie klienta
(to **nie** jest sekret).

### 1. Utwórz projekt w Google Cloud

1. Wejdź na <https://console.cloud.google.com/>.
2. Utwórz nowy projekt (np. „Kompendium Planer") lub wybierz istniejący.

### 2. Włącz Google Drive API

1. Menu → **APIs & Services → Library**.
2. Wyszukaj **Google Drive API** → **Enable**.

### 3. Skonfiguruj ekran zgody (OAuth consent screen)

1. **APIs & Services → OAuth consent screen**.
2. User Type: **External** → **Create**.
3. Uzupełnij nazwę aplikacji, e-mail wsparcia i e-mail kontaktowy dewelopera.
4. **Scopes** → dodaj zakres `.../auth/drive.file`
   (`https://www.googleapis.com/auth/drive.file`). To zakres „nie-wrażliwy",
   który **nie** wymaga ciężkiej weryfikacji bezpieczeństwa od Google.
5. **Test users** → dodaj adresy e-mail terapeutów, którzy będą korzystać z
   funkcji, dopóki aplikacja jest w trybie „Testing".
6. Gdy zechcesz udostępnić funkcję wszystkim (poza listą testerów) — kliknij
   **Publish app**. Przy zakresie `drive.file` publikacja jest prosta.

### 4. Utwórz OAuth Client ID

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized JavaScript origins** — dodaj origin(y), z których serwowana jest
   aplikacja, **bez** ścieżki i bez ukośnika na końcu, np.:
   - `http://localhost:3000` (lokalny development)
   - `https://kompendium.app` (produkcja)
   - `https://twoj-projekt.vercel.app` (preview/produkcja na Vercel)
4. **Authorized redirect URIs** — przy modelu tokenowym GIS (popup) nie jest
   wymagane; możesz zostawić puste.
5. **Create** → skopiuj **Client ID** (kończy się na
   `.apps.googleusercontent.com`).

### 5. Ustaw zmienną środowiskową

Wklej Client ID do zmiennej `NEXT_PUBLIC_GOOGLE_CLIENT_ID`:

- **Lokalnie** — w pliku `.env.local`:

  ```env
  NEXT_PUBLIC_GOOGLE_CLIENT_ID=1234567890-abcdef.apps.googleusercontent.com
  ```

- **Na Vercel** — Project → Settings → Environment Variables → dodaj
  `NEXT_PUBLIC_GOOGLE_CLIENT_ID` i wykonaj redeploy.

Po ustawieniu zmiennej i odświeżeniu planera w sekcji „Twoje dane" pojawią się
przyciski Dysku Google.

## Korzystanie

1. Zaloguj się do aplikacji.
2. W planerze (sidebar „Twoje dane") kliknij **„☁️ Zrób backup na Dysku Google"**.
3. Pierwszy raz: pojawi się okno zgody Google — wybierz konto i potwierdź dostęp
   do **jednego pliku** tworzonego przez aplikację.
4. Gotowe. Od teraz na każdym urządzeniu:
   - **☁️ Wyślij backup** — nadpisuje kopię na Dysku aktualnymi danymi.
   - **⬇️ Pobierz backup** — wczytuje najnowszą kopię z Dysku (z potwierdzeniem
     przed nadpisaniem lokalnych danych).

> Typowy obieg dwóch urządzeń: po sesji na urządzeniu A kliknij **Wyślij**;
> na urządzeniu B przed pracą kliknij **Pobierz**.

## Rozwiązywanie problemów

- **Okno logowania nie pojawia się / jest blokowane** — upewnij się, że
  przeglądarka nie blokuje wyskakujących okienek dla domeny aplikacji.
- **Błąd `redirect_uri_mismatch` lub `origin not allowed`** — origin aplikacji
  nie jest dodany w **Authorized JavaScript origins** (krok 4.3). Dodaj dokładny
  origin (schemat + host + ewentualny port), bez ścieżki.
- **`access_denied` / „aplikacja niezweryfikowana"** — w trybie „Testing" konto
  musi być na liście **Test users** (krok 3.5) albo opublikuj aplikację.
- **Przyciski Dysku się nie pokazują** — `NEXT_PUBLIC_GOOGLE_CLIENT_ID` jest
  pusty lub wymaga redeployu po ustawieniu.
