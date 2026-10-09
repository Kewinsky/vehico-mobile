# AI Operations

## Cel

Ten dokument opisuje konfigurację, monitoring i bezpieczny rollback funkcji AI.
Nie zawiera treści rozmów, dokumentów ani danych pojazdów.

## Feature flags i rollout

Globalny kill switch:

```text
AI_ENABLED=false
```

Każda funkcja ma osobny prefiks:

```text
AI_VEHICLE_CHAT_*
AI_SERVICE_INVOICE_IMPORT_*
AI_FUEL_RECEIPT_IMPORT_*
```

Dostępne ustawienia dla każdego prefiksu:

- `ENABLED` – osobny kill switch funkcji,
- `ROLLOUT_PERCENT` – stabilny rollout od 0 do 100 procent użytkowników,
- `MODEL` – model podstawowy,
- `FALLBACK_MODEL` – opcjonalny model drugiej próby,
- `INPUT_USD_PER_MILLION_TOKENS` – cena wejścia używana tylko do estymacji,
- `OUTPUT_USD_PER_MILLION_TOKENS` – cena wyjścia używana tylko do estymacji.
- `FALLBACK_INPUT_USD_PER_MILLION_TOKENS` – cena wejścia fallbacku,
- `FALLBACK_OUTPUT_USD_PER_MILLION_TOKENS` – cena wyjścia fallbacku.

Brak ceny nie blokuje funkcji. Ślad zawiera wtedy tokeny bez pola szacowanego
kosztu. Ceny należy ustawić na podstawie aktualnej umowy z dostawcą przed
włączeniem alertów kosztowych. Estymacja obejmuje tokeny zwrócone w metrykach
udanej odpowiedzi dostawcy. Nie zastępuje rozliczenia dostawcy.

## Limity i niezawodność

RPC `consume_ai_request_budget` atomowo rezerwuje limit przed wywołaniem modelu.
Rezerwacja tokenów obejmuje obie dozwolone próby.
Nieudana analiza również zużywa rezerwację, co zapobiega obchodzeniu budżetu
przez celowe wywoływanie błędów.

| Funkcja | Godzina | Dzień | Tokeny wyjścia dziennie |
| --- | ---: | ---: | ---: |
| Czat | 30 | 100 | 120000 |
| Faktura | 10 | 25 | 60000 |
| Paragon | 15 | 40 | 48000 |

Wywołanie modelu ma maksymalnie dwie próby. Jeżeli ustawiono model fallback,
druga próba używa fallbacku. Bez fallbacku ponawiany jest model podstawowy.
Circuit breaker otwiera się po pięciu końcowych błędach i próbuje zamknąć po
60 sekundach. Stan jest lokalny dla ciepłej instancji Edge Function, więc limity
bazodanowe pozostają główną ochroną rozproszoną.

## Bezpieczne ślady

Zdarzenie `ai_trace` zawiera wyłącznie:

- losowy `traceId`, funkcję, model oraz informację o fallbacku,
- wersję promptu i schematu,
- wynik, kod błędu, liczbę prób i czas,
- liczbę tokenów i opcjonalny szacowany koszt.

Nie wolno dodawać do śladu pytań, historii, kontekstu pojazdu, nazw warsztatów,
treści dokumentów, model outputu, identyfikatorów użytkownika ani pojazdu.

Zapytania agregujące wykorzystanie i jakość są w
`supabase/monitoring/ai_dashboard.sql`. W panelu logów należy utworzyć wykresy
dla liczby `ai_trace` według `feature`, `outcome`, `errorCode` i `model`, a także
percentyli `durationMs`, sum tokenów i szacowanego kosztu. Zalecane alerty:

- błędy powyżej 10 procent przez 15 minut,
- p95 czasu powyżej limitu danej funkcji,
- użycie fallbacku powyżej 5 procent,
- wzrost korekt na import powyżej progu zestawu ewaluacyjnego,
- wykorzystanie dziennego budżetu powyżej 80 procent.

## Ewaluacje i wydanie

Zestaw znajduje się w `ai-evals/imports/cases.json`. Wyniki każdego modelu muszą
mieć ten sam format `fields` i identyfikatory przypadków. Porównanie uruchamia:

```bash
npm run eval:ai-imports -- --predictions result-model-a.json,result-model-b.json
```

Skrypt kończy się błędem, jeśli którykolwiek model nie spełnia progów. Realne
pliki testowe muszą być syntetyczne albo zanonimizowane i przechowywane zgodnie
z polityką dostępu projektu. Nie wolno dodawać faktur ani paragonów klientów do
repozytorium.

Przed rolloutem:

1. Uruchom `npm run precheck`.
2. Uruchom ewaluacje na identycznym zestawie dla modelu podstawowego i fallbacku.
3. Sprawdź zapytania dashboardu i alerty.
4. Zacznij od małego `ROLLOUT_PERCENT`.
5. Zwiększaj rollout tylko przy stabilnej jakości, koszcie i czasie.

Rollback zaczyna się od ustawienia właściwego `ENABLED=false`. Globalne
`AI_ENABLED=false` wyłącza wszystkie trzy funkcje. Migracji nie należy cofać
podczas incydentu, ponieważ nie są potrzebne do zatrzymania ruchu AI.
