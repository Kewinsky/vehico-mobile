# Vericar AI — etap 2: Minimal Chat

Status: implementacja zakończona, oczekuje na krótki test ręczny po uproszczeniu.

## Cel etapu

Udostępnić użytkownikowi prosty czat z asystentem pojazdu. Odpowiedź jest wyświetlana po pełnym wygenerowaniu i zwalidowaniu, można anulować request lub go ponowić, a historia istnieje wyłącznie do czasu zamknięcia ekranu.

Streaming odpowiedzi świadomie pozostaje poza zakresem MVP. Można wrócić do niego później, jeśli pomiary lub feedback użytkowników wykażą realną potrzebę.

## Przepływ danych

```text
VehicleChatScreen
  → vehicleChatRepo
  → Supabase Edge Function vehicle-chat
  → OpenAI Responses API
  → zwalidowany JSON
  → aktualizacja wiadomości na ekranie
```

Klient nie łączy się bezpośrednio z OpenAI i nie zna `OPENAI_API_KEY`. Do Edge Function wysyła publiczny klucz projektu oraz token bieżącej sesji użytkownika. Wrapper `withSupabase({ auth: "user" })` weryfikuje token przed uruchomieniem handlera, więc endpoint jest dostępny tylko dla zalogowanego użytkownika.

## Kontrakt request/response

Klient wysyła wiadomość, język i opcjonalną, ograniczoną historię:

```json
{
  "message": "Czy mogę jechać dalej?",
  "language": "pl",
  "history": [
    { "role": "user", "content": "Zapaliła się kontrolka oleju." },
    { "role": "assistant", "content": "Zatrzymaj bezpiecznie pojazd." }
  ]
}
```

Edge Function wymusza structured output i zwraca klientowi dopiero pełną, zwalidowaną odpowiedź:

```json
{
  "answer": "...",
  "urgency": "stop_driving",
  "uncertainty": "...",
  "nextStep": "..."
}
```

Do czasu zakończenia requestu UI pokazuje wskaźnik ładowania. Błędy backendu mają stabilny kontrakt `{ "error": { "code": "...", "message": "..." } }`.

## Historia rozmowy i limity

- Wiadomości są stanem lokalnym `VehicleChatScreen`; nie są zapisywane w bazie ani na urządzeniu.
- Zamknięcie ekranu usuwa rozmowę.
- Do kolejnego requestu trafia maksymalnie 8 ostatnich poprawnych wiadomości o łącznej długości do 8000 znaków.
- Pojedyncza wiadomość ma limit 2000 znaków.
- Backend ponownie waliduje liczbę, role i rozmiar historii; nie ufa limitom klienta.
- Odpowiedzi anulowane i błędne pozostają widoczne w UI, ale nie są przekazywane modelowi jako historia.

To jest proste okno kontekstu. Inteligentne wybieranie, streszczanie i budżetowanie starszej historii należy do etapu 10.

## Stany interfejsu

- pusty ekran zawiera nagłówek „Asystent AI” oraz gotowe przykładowe pytania;
- prompt `SYSTEM_PROMPT_V2` obejmuje ogólne pytania o eksploatację, utrzymanie i koszty pojazdu, ale nie udaje dostępu do danych użytkownika;
- wysłana wiadomość od razu pojawia się na liście;
- podczas oczekiwania widoczny jest wskaźnik ładowania, a przycisk wysyłania anuluje request mobilny i powiązany request do modelu;
- anulowana lub błędna odpowiedź ma lokalny komunikat i przycisk ponowienia;
- po zakończeniu odpowiedź, niepewność i następny krok są widoczne jako jeden naturalny dymek czatu; odpowiedź samodzielnie komunikuje poziom pilności i działania krytyczne dla bezpieczeństwa;
- teksty i etykiety dostępności istnieją po polsku i angielsku;
- lista jest wirtualizowana, pole współpracuje z klawiaturą, a przyciski mają co najmniej 44 punkty.

## Podział odpowiedzialności

| Element | Odpowiedzialność |
| --- | --- |
| `VehicleChatScreen` | Stan bieżącej rozmowy, renderowanie, anulowanie i ponowienie. |
| `vehicleChatRepo` | Sesja Supabase, request HTTP oraz walidacja odpowiedzi. |
| `vehicle-chat/handler.ts` | Limity, prompt, wywołanie modelu i walidacja structured output. |

Wstrzyknięcie zależności w fabryce repozytorium i handlera pozwala testować granice sieci bez prawdziwych, płatnych requestów.

## Testy automatyczne

Testy deterministyczne obejmują:

- poprawną odpowiedź JSON i odrzucenie błędnego kontraktu;
- wymóg aktywnej sesji i nagłówki autoryzacyjne klienta;
- przekazywanie ograniczonej historii rozmowy;
- wysłanie wiadomości i końcowe pola odpowiedzi;
- błąd, retry bez duplikowania pytania oraz anulowanie;
- timeout, błędy dostawcy i niepoprawną odpowiedź modelu.

Polecenia:

```bash
npm test -- --runInBand src/__tests__/ai/vehicleChatHandler.test.ts src/__tests__/ai/vehicleChatRepo.test.ts src/__tests__/screens/VehicleChatScreen.test.tsx
npm run typecheck
npm run lint
```

## Ręczny test końcowy

1. Uruchom development build aplikacji i zaloguj się.
2. Otwórz pojazd, wybierz kafelek asystenta AI i wyślij pytanie.
3. Potwierdź, że podczas oczekiwania widać spinner, a następnie kompletną odpowiedź.
4. Wyślij pytanie uzupełniające zależne od poprzedniej odpowiedzi.
5. Sprawdź anulowanie requestu i „Spróbuj ponownie”.
6. Zamknij ekran i otwórz go ponownie; poprzednia historia nie powinna wrócić.
7. Powtórz podstawowy przepływ po zmianie języka aplikacji.

## Ograniczenia i następny etap

- Własność `vehicleId`, profil pojazdu i zatwierdzona historia serwisowa zostały dodane w etapie 3 opisanym w `AI_STAGE_3.md`.
- Rate limiting pozostaje częścią etapu 12.
- Historia nie jest trwała i nie jest jeszcze streszczana.
- Asystent nie korzysta z historii serwisowej, dokumentów ani internetu.

Etap 3 dodał bezpieczny kontekst właściwego pojazdu i jego zatwierdzonej historii serwisowej.
