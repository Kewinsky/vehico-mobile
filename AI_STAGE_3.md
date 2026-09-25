# Vericar AI — etap 3: Vehicle & Service Context

Status: implementacja zakończona 24 września 2026 r.; zdalny smoke test po wdrożeniu pozostaje do wykonania.

## Cel etapu

Udostępnić modelowi użyteczny, prywatnościowo odfiltrowany snapshot danych śledzonych w chmurze dla pojazdu należącego do zalogowanego użytkownika oraz jego warsztatów. Dostęp do danych, limity i poprawność cytowań są egzekwowane deterministycznie przez backend, a nie przez prompt.

## Przepływ autoryzacji

```text
token użytkownika
→ withSupabase({ auth: "user" })
→ auth.getUser()
→ zapytanie klientem użytkownika chronionym RLS
→ vehicles.id + vehicles.owner_id
→ service_entries.vehicle_id + status = approved
→ ograniczony kontekst modelu
```

Edge Function ponownie pobiera użytkownika przez `auth.getUser()`. Pojazd jest wybierany jednocześnie po `id` i `owner_id`, a zwrócony rekord jest jeszcze raz walidowany przez handler. Brak pojazdu i próba dostępu do obcego pojazdu zwracają ten sam kod `VEHICLE_NOT_FOUND`, bez ujawniania istnienia rekordu.

Klient Supabase udostępniony przez wrapper działa z tokenem bieżącego requestu, dlatego zapytania podlegają istniejącym politykom RLS. Nie używamy service-role key.

## Kontrakt request/response

Request zawiera identyfikator wybranego pojazdu, język odpowiedzi i ograniczoną historię rozmowy:

```json
{
  "vehicleId": "11111111-1111-4111-8111-111111111111",
  "message": "Kiedy ostatnio wymieniałem olej?",
  "language": "pl",
  "history": []
}
```

Publiczna odpowiedź dla aplikacji upraszcza kontrakt etapu 2:

```json
{
  "answer": "..."
}
```

Model nadal zwraca backendowi ustrukturyzowane pola `urgency`, `uncertainty`, `nextStep` oraz pozycje cytowanych wpisów w tablicy `service_history`. Backend waliduje cały structured output, ale publicznie zwraca tylko samodzielne pole `answer`, które zgodnie z promptem musi już zawierać pilność, istotną niepewność i bezpieczny następny krok. Bazowe UUID nie trafiają do modelu, a cytowania nie trafiają do publicznej odpowiedzi API ani interfejsu.

Odpowiedzi mają limit 1200 tokenów. Zwykła odpowiedź pozostaje krótka, natomiast na wyraźną prośbę o wiele rekordów model może zwrócić dłuższą listę. Każdy rekord ma znaleźć się w osobnym punkcie listy, zamiast w jednym zdaniu rozdzielonym przecinkami.

Reguła stylu zabrania używania znaku em dash (`U+2014`). Model ma zamiast niego stosować przecinki, nawiasy, dwukropki albo zwykły łącznik.

## Zakres kontekstu

Każdy request zawiera odfiltrowany snapshot domenowy dostępny w chmurze dla wybranego pojazdu i użytkownika:

- profil pojazdu wraz z notatkami i formalnościami, ale bez VIN-u, tablicy rejestracyjnej, `owner_id`, `intake_token` i technicznych dat utworzenia;
- wszystkie zatwierdzone wpisy serwisowe wyłącznie w formie: data, tytuł, przebieg, koszt i nazwa warsztatu;
- wpisy paliwowe wyłącznie w prostej formie MVP: data, koszt, rodzaj paliwa, stacja benzynowa i dystans;
- przypomnienia wraz z cyklicznością i stanem dostarczenia;
- opony, felgi i wyposażenie;
- warsztaty użytkownika bez `owner_id` i technicznych dat utworzenia.

Raporty, ogłoszenia marketplace, zdjęcia, lokalne dokumenty i załączniki są pominięte. Zawartość dokumentów i zdjęć zostanie obsłużona w etapach dokumentów i vision.

Do kontekstu trafia maksymalnie 100 najnowszych zatwierdzonych wpisów serwisowych i 100 najnowszych wpisów paliwowych. Pozostałe kolekcje zachowują techniczny limit 500 rekordów, a cały snapshot limit 120 000 znaków. Przekroczenie tych pozostałych bezpieczników zwraca `CONTEXT_TOO_LARGE`.

Kontekst jawnie opisuje pochodzenie danych:

- profil jako dane podane przez użytkownika;
- historia jako wpisy zatwierdzone przez użytkownika, a nie niezależny dowód wykonania usługi;
- brak dedykowanych, zweryfikowanych pól dokładnej wersji i kodu silnika; wartości zapisane w notatkach pozostają jawnie danymi użytkownika;
- regresję przebiegu w historii albo przebieg profilu niższy od wpisu serwisowego jako konflikt, którego model nie może rozwiązać przez zgadywanie.

`SYSTEM_PROMPT_V3` traktuje teksty zapisane w profilu i historii jako niezaufane dane. Nie mogą one nadpisywać instrukcji systemowych.

## Obsługa błędów

| HTTP | Kod | Znaczenie |
| ---: | --- | --- |
| 401 | `AUTH_REQUIRED` | Token nie wskazuje zalogowanego użytkownika. |
| 404 | `VEHICLE_NOT_FOUND` | Pojazd nie istnieje albo nie należy do użytkownika. |
| 503 | `CONTEXT_LOAD_FAILED` | Kompletny snapshot nie mógł zostać bezpiecznie pobrany lub zwalidowany. |
| 413 | `CONTEXT_TOO_LARGE` | Snapshot przekracza limit rozmiaru albo limit jednej z pozostałych kolekcji. |
| 502 | `INVALID_MODEL_RESPONSE` | Odpowiedź lub cytowanie nie spełnia kontraktu. |

Pozostałe błędy modelu, Premium, timeoutu i walidacji requestu zachowują kontrakt z etapów 1–2.

UI rozróżnia timeout, przerwaną lub nieprawidłową odpowiedź modelu, chwilową niedostępność dostawcy oraz zbyt duży kontekst. Nie pokazuje użytkownikowi surowych szczegółów technicznych.

## Testy automatyczne

Testy deterministyczne obejmują:

- wymaganie aktywnej sesji przed odczytem danych;
- przekazanie `userId` i właściwego `vehicleId` do granicy danych;
- odrzucenie pojazdu należącego do innego użytkownika;
- odfiltrowanie wpisów `pending` oraz rekordów innego pojazdu;
- pustą historię i błąd pobierania historii;
- sprzeczne przebiegi oraz jawne oznaczenie nieznanego kodu silnika i wersji;
- odfiltrowany snapshot bez wskazanych pól prywatnych, raportów, ogłoszeń i technicznych dat utworzenia;
- przekazywanie tylko pięciu dozwolonych pól każdego wpisu paliwowego;
- ograniczenie historii serwisowej i paliwowej do 100 najnowszych rekordów;
- jawny błąd po przekroczeniu pozostałych limitów kontekstu;
- wewnętrzną walidację cytowań, brak ich w publicznej odpowiedzi i odrzucenie cytowania spoza przekazanego kontekstu;
- przekazanie `vehicleId` i języka przez klienta mobilnego;
- publiczną odpowiedź API zawierającą wyłącznie `answer` i wyświetlenie tylko tej naturalnej odpowiedzi na ekranie czatu.

Polecenia:

```bash
npm test -- --runInBand src/__tests__/ai/vehicleChatHandler.test.ts src/__tests__/ai/vehicleChatRepo.test.ts src/__tests__/screens/VehicleChatScreen.test.tsx
npm run typecheck
npm run lint
```

## Ręczny test po wdrożeniu

1. Zaloguj się jako użytkownik A i zapytaj o zatwierdzony wpis jego pojazdu; sprawdź naturalną odpowiedź bez osobnej sekcji cytowania.
2. Wyślij identyczne pytanie dla pojazdu bez historii; odpowiedź nie może wymyślić wpisu.
3. Spróbuj wywołać endpoint z `vehicleId` użytkownika B; oczekiwany jest `404 VEHICLE_NOT_FOUND`, bez requestu do OpenAI.
4. Dodaj wpis `pending`; nie może pojawić się w kontekście modelu ani odpowiedzi.
5. Powtórz T01–T10 i C01–C06 z `AI_EVALS.md` dla `SYSTEM_PROMPT_V3`.

Nie wdrażamy Edge Function ani nie zmieniamy zdalnych sekretów w ramach lokalnej implementacji.

## Ograniczenia i następny etap

- Model nadal nie ma dostępu do lokalnych zdjęć, dokumentów, załączników ani internetu.
- Historia rozmowy nadal istnieje tylko w bieżącej sesji.
- Rate limiting, monitoring kosztu i produkcyjny kill switch należą do etapu 12.

Etap 4 zaprojektuje zgodę, retencję i bezpieczną synchronizację dokumentów do prywatnego Storage.
