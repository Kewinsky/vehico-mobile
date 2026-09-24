# Vericar AI — etap 2: Minimal Chat & Streaming

Status: implementacja zakończona, oczekuje na ręczny test w development buildzie.

## Cel etapu

Udostępnić użytkownikowi prosty czat z asystentem pojazdu: odpowiedź pojawia się stopniowo, można ją zatrzymać lub ponowić, a historia istnieje wyłącznie do czasu zamknięcia ekranu.

## Przepływ danych

```text
VehicleChatScreen
  → vehicleChatRepo
  → Supabase Edge Function vehicle-chat
  → OpenAI Responses API
  → zdarzenia SSE: delta / complete / error
  → aktualizacja wiadomości na ekranie
```

Klient nie łączy się bezpośrednio z OpenAI i nie zna `OPENAI_API_KEY`. Do Edge Function wysyła publiczny klucz projektu oraz token bieżącej sesji użytkownika. Wrapper `withSupabase({ auth: "user" })` weryfikuje token przed uruchomieniem handlera, więc endpoint jest dostępny tylko dla zalogowanego użytkownika.

## Kontrakt streamingu

Klient rozszerza request z etapu 1 o `stream: true` i opcjonalną, ograniczoną historię:

```json
{
  "message": "Czy mogę jechać dalej?",
  "language": "pl",
  "history": [
    { "role": "user", "content": "Zapaliła się kontrolka oleju." },
    { "role": "assistant", "content": "Zatrzymaj bezpiecznie pojazd." }
  ],
  "stream": true
}
```

Edge Function nadal wymusza structured output. Surowy JSON modelu nie trafia jednak do interfejsu. Backend odczytuje zdarzenia OpenAI i wystawia własny, mały protokół Server-Sent Events:

```text
event: delta
data: {"text":"fragment odpowiedzi"}

event: complete
data: {"answer":"...","urgency":"...","uncertainty":"...","nextStep":"..."}

event: error
data: {"code":"...","message":"..."}
```

`delta` pozwala pokazywać tekst w trakcie generowania. `complete` jest wysyłane dopiero po zwalidowaniu pełnego JSON-u zgodnie ze schematem z etapu 1. Dotychczasowy request bez `stream` nadal zwraca zwykły JSON, więc kontrakt etapu 1 pozostaje kompatybilny.

## Historia rozmowy i limity

- Wiadomości są stanem lokalnym `VehicleChatScreen`; nie są zapisywane w bazie ani na urządzeniu.
- Zamknięcie ekranu usuwa rozmowę.
- Do kolejnego requestu trafia maksymalnie 8 ostatnich poprawnych wiadomości o łącznej długości do 8000 znaków.
- Pojedyncza wiadomość nadal ma limit 2000 znaków.
- Backend ponownie waliduje liczbę, role i rozmiar historii; nie ufa limitom klienta.
- Odpowiedzi przerwane i błędne pozostają widoczne w UI, ale nie są przekazywane modelowi jako historia.

To jest proste okno kontekstu. Inteligentne wybieranie, streszczanie i budżetowanie starszej historii należy do etapu 10.

## Stany interfejsu

- pusty ekran zawiera nagłówek „Asystent AI” oraz gotowe przykładowe pytania, bez dodatkowego podnagłówka „Jak mogę Ci pomóc?”;
- prompt `SYSTEM_PROMPT_V2` obejmuje również ogólne pytania o eksploatację, utrzymanie i koszty pojazdu, ale nie udaje dostępu do danych użytkownika;
- wysłana wiadomość od razu pojawia się na liście;
- przed pierwszym fragmentem odpowiedzi widoczny jest wskaźnik ładowania;
- podczas streamingu przycisk wysyłania zmienia się w przycisk zatrzymania;
- anulowana lub błędna odpowiedź ma lokalny komunikat i przycisk ponowienia;
- po zakończeniu widoczne są odpowiedź, poziom pilności, niepewność i następny krok;
- teksty i etykiety dostępności istnieją po polsku i angielsku;
- lista jest wirtualizowana, pole współpracuje z klawiaturą, a przyciski mają co najmniej 44 punkty.

## Podział odpowiedzialności

| Element | Odpowiedzialność |
| --- | --- |
| `VehicleChatScreen` | Stan bieżącej rozmowy, renderowanie, anulowanie i ponowienie. |
| `vehicleChatRepo` | Sesja Supabase, request HTTP, dekodowanie SSE i walidacja zdarzeń. |
| `vehicle-chat/handler.ts` | Limity, prompt, wywołanie modelu, walidacja structured output i bezpieczny stream dla klienta. |

Wstrzyknięcie zależności w fabryce repozytorium i handlera pozwala testować granice sieci bez prawdziwych, płatnych requestów.

## Testy automatyczne

Testy deterministyczne obejmują:

- poprawną odpowiedź JSON i zgodność wsteczną;
- dzielenie danych na różne fragmenty sieciowe;
- `delta`, `complete`, niekompletny stream oraz błędy dostawcy;
- wymóg aktywnej sesji i nagłówki autoryzacyjne klienta;
- pusty ekran bez usuniętego podnagłówka;
- wysłanie wiadomości i końcowe pola odpowiedzi;
- błąd, retry bez duplikowania pytania oraz anulowanie.

Polecenia:

```bash
npm test -- --runInBand src/__tests__/ai/vehicleChatHandler.test.ts src/__tests__/ai/vehicleChatRepo.test.ts src/__tests__/screens/VehicleChatScreen.test.tsx
npm run typecheck
npm run lint
```

## Ręczny test końcowy

1. Uruchom lokalny Supabase z sekretem `OPENAI_API_KEY` i Edge Functions.
2. Uruchom development build aplikacji i zaloguj się.
3. Otwórz pojazd, wybierz kafelek asystenta AI i wyślij pytanie.
4. Potwierdź, że tekst pojawia się stopniowo oraz że końcowe pola są widoczne.
5. Wyślij pytanie uzupełniające zależne od poprzedniej odpowiedzi.
6. Sprawdź zatrzymanie odpowiedzi i „Spróbuj ponownie”.
7. Zamknij ekran i otwórz go ponownie; poprzednia historia nie powinna wrócić.
8. Powtórz podstawowy przepływ po zmianie języka aplikacji.

Po tym teście można zaznaczyć kryterium zakończenia etapu 2 w `ai.todo` i zmienić status dokumentu na zakończony.

## Ograniczenia i następny etap

- Edge Function nie sprawdza jeszcze własności `vehicleId`; dlatego dane pojazdu nie są wysyłane do modelu.
- Token sesji chroni endpoint przed anonimowym wywołaniem, ale funkcja nie autoryzuje jeszcze dostępu do konkretnego pojazdu. Powiązanie użytkownika z `vehicleId` jest częścią etapu 3, a rate limiting etapu 12.
- Historia nie jest trwała i nie jest jeszcze streszczana.
- Asystent nie korzysta z historii serwisowej, dokumentów ani internetu.

Etap 3 doda bezpieczny kontekst właściwego pojazdu i jego zatwierdzonej historii serwisowej.
