# Vericar AI — etap 1: LLM Fundamentals

Status: zakończony 12 września 2026 r.

## Cel etapu

Połączyć Supabase Edge Function z API modelu i zwracać krótką, bezpieczną oraz zwalidowaną odpowiedź bez udostępniania klientowi klucza OpenAI.

## Podjęte decyzje

| Obszar | Decyzja | Uzasadnienie |
| --- | --- | --- |
| Model | `gpt-5.6-luna` | W evalach uzyskał 9/9 `PASS` na czystej próbce T02–T10, a Terra 8/9. |
| API | OpenAI Responses API | Obsługuje instrukcje, reasoning i structured output w jednym żądaniu. |
| Format | JSON Schema w trybie `strict` | Backend nie musi interpretować dowolnego tekstu modelu. |
| Reasoning | `low` | Zadanie jest krótką klasyfikacją i odpowiedzią, a nie złożonym rozumowaniem. |
| Verbosity | `low` | Odpowiedź ma być zwięzła i praktyczna. |
| Limit wyjścia | 500 tokenów | Daje zapas na cztery wymagane pola; w evalach odpowiedzi zużywały średnio 154 tokeny. |
| Limit wejścia | 2000 znaków wiadomości | Ogranicza nadużycia i koszt przed wysłaniem danych do modelu. |
| Timeout | 15 sekund | Zapobiega nieograniczonemu oczekiwaniu Edge Function. |
| Retencja OpenAI | `store: false` | Odpowiedź nie jest zapisywana przez Responses API jako stan aplikacji. |
| Język | jawne `pl` lub `en` | Kontrakt jest przewidywalny i nie zależy od zawodnego wykrywania języka. |

Prompt jest wersjonowany w kodzie jako `SYSTEM_PROMPT_V1`. Jego ocenę na dziesięciu przypadkach PL/EN opisuje `AI_EVALS.md`.

## Kontrakt HTTP

Request:

```json
{
  "message": "Zapaliła się czerwona kontrolka oleju.",
  "language": "pl"
}
```

Poprawna odpowiedź:

```json
{
  "answer": "...",
  "urgency": "monitor | service_soon | stop_driving | unknown",
  "uncertainty": "...",
  "nextStep": "..."
}
```

Backend waliduje zarówno request, jak i wynik modelu. Akceptuje wynik wyłącznie wtedy, gdy odpowiedź OpenAI ma status `completed`, zawiera wszystkie pola, nie zawiera pustych tekstów i używa dozwolonej wartości `urgency`.

## Obsługa błędów

| HTTP | Kod | Znaczenie |
| ---: | --- | --- |
| 400 | `INVALID_JSON` | Body nie jest poprawnym JSON-em. |
| 400 | `INVALID_REQUEST` | Wiadomość lub język nie spełnia kontraktu. |
| 405 | `METHOD_NOT_ALLOWED` | Użyto metody innej niż `POST`. |
| 500 | `SERVER_MISCONFIGURATION` | Brakuje sekretu `OPENAI_API_KEY`. |
| 502 | `MODEL_REQUEST_FAILED` | Dostawca odrzucił żądanie albo połączenie nie powiodło się. |
| 502 | `INVALID_MODEL_RESPONSE` | Wynik jest niekompletny, uszkodzony albo niezgodny z kontraktem. |
| 504 | `MODEL_TIMEOUT` | Model nie odpowiedział przed upływem 15 sekund. |

Komunikaty zwracane klientowi nie zawierają klucza API, treści odpowiedzi dostawcy ani szczegółów wewnętrznych. Log błędu dostawcy zawiera tylko status HTTP i identyfikator requestu.

## Koszt pojedynczego żądania

Techniczny limit kosztu tworzą: maksymalnie 2000 znaków wiadomości, stały prompt systemowy oraz maksymalnie 500 tokenów wyjścia. W czystych evalach Luny T02–T10 średnie zużycie wyniosło 342 tokeny wejścia i 154 tokeny wyjścia.

Stawki `gpt-5.6-luna` dla krótkiego kontekstu, odczytane z cennika konta 12 września 2026 r.:

| Rodzaj tokenów | Cena za 1 mln |
| --- | ---: |
| Input | $0,20 |
| Cached input | $0,02 |
| Cache write | $0,25 |
| Output | $1,20 |

Nasz request należy do kategorii krótkiego kontekstu. Koszt bez cache dla średniego requestu z evali wynosi:

```text
(342 / 1 000 000 × $0,20) + (154 / 1 000 000 × $1,20)
= $0,0002532
```

To około $0,2532 za 1000 podobnych odpowiedzi albo $2,532 za 10 000. Sam maksymalny output 500 tokenów kosztuje $0,0006.

Limit 2000 znaków wiadomości daje konserwatywny budżet około 6500 tokenów wejściowych wraz ze stałymi instrukcjami i schematem. Przy pełnym wykorzystaniu tego budżetu oraz 500 tokenach wyjściowych koszt wynosi około $0,0019. Ustalamy operacyjny limit etapu 1 na **$0,003 za pojedynczy request**. Zawiera on zapas na tokenizację i ewentualny koszt zapisu cache, ale nie obejmuje przyszłych retry, narzędzi ani web search.

Limit kosztowy jest obecnie konsekwencją limitów wejścia i wyjścia, a nie osobnym bezpiecznikiem rozliczeniowym OpenAI. Po dodaniu dłuższej historii lub kontekstu trzeba przeliczyć go ponownie.

## Weryfikacja

Ręczny test lokalny potwierdził pełny przepływ Supabase → OpenAI → Supabase:

- HTTP `200`,
- odpowiedź zgodna ze schematem,
- prawidłowe `urgency: stop_driving` dla czerwonej kontrolki oleju,
- czas całego requestu około 4,9 s,
- brak sekretu w odpowiedzi.

Deterministyczne testy z atrapą dostawcy nie wykonują płatnych requestów. Sprawdzają:

- poprawną i kompletną odpowiedź,
- brak sekretu,
- timeout,
- błąd HTTP dostawcy,
- odpowiedź niezgodną ze schematem,
- przerwaną odpowiedź ze statusem `incomplete`.

Polecenia weryfikacyjne:

```bash
npm test -- --runInBand src/__tests__/ai/vehicleChatHandler.test.ts
npm run typecheck
npm run lint
```

Wynik: 6/6 testów handlera przeszło; typecheck i lint przeszły.

## Ograniczenia i następny etap

- To nadal pojedyncza wiadomość, bez historii rozmowy i streamingu.
- Model nie ma jeszcze kontekstu pojazdu, historii serwisowej, dokumentów ani internetu.
- Drobne błędy stylistyczne modelu są możliwe mimo poprawnego schematu.
- Publishable key nie jest zabezpieczeniem przed nadużyciem płatnego endpointu. Przed publicznym udostępnieniem potrzebne będą uwierzytelnienie i ograniczenia nadużyć.
- Web search zostanie zaprojektowany i oceniony osobno w etapie 7.

Etap 2 doda minimalny interfejs czatu, streaming, anulowanie, ponowienie i historię bieżącej sesji.
