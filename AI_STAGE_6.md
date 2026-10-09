# AI Stage 6 – Quality, Security and Production Hardening

## Status

Implementacja repozytorium jest gotowa do weryfikacji środowiskowej. Kontrakt,
limity, guardrails, idempotencja, metryki, retry, fallback, circuit breaker,
feature flags i runner ewaluacyjny są wdrożone lokalnie. Zadania wymagające
zdalnego środowiska pozostają otwarte w `ai.todo`.

## Wspólny kontrakt pól

Każde pole wyodrębnione z dokumentu ma jeden z czterech statusów:

- `recognized` – wartość jest czytelna, poprawna i dozwolona,
- `uncertain` – wartość jest widoczna, ale nie można jej pewnie odczytać,
- `missing` – wartości nie ma w dokumencie,
- `rejected` – wartość jest widoczna, ale nie może zostać użyta, ponieważ jest
  niepoprawna, niezwiązana z polem albo niedozwolona przez reguły produktu.

Statusy `missing` i `rejected` zawsze wymagają wartości `null`. Statusy
`recognized` i `uncertain` zawsze wymagają wartości. Backend i aplikacja
sprawdzają tę regułę niezależnie. Wspólna definicja znajduje się w
`shared/ai/importContract.ts`.

Przykład odrzucenia: paragon pokazuje benzynę 95, ale wybrany pojazd ma silnik
Diesla. Backend usuwa wartość i zwraca `rejected`. Nie przedstawia jej jako
brakującej, ponieważ wartość była obecna, lecz nie pasowała do pojazdu.

## Granica zaufania

Treść pliku i odpowiedź modelu pozostają niezaufanym wejściem. Prompty importu
mają wersję V2 i mówią modelowi, że treść dokumentu nie jest instrukcją. Ścisłe
schematy modelu oraz walidacja backendu i klienta używają tego samego zestawu
statusów. Odrzucona wartość nie może przejść do edytowalnego szkicu.

## Limity istniejące przed tym fragmentem

- plik ma maksymalnie 10 MB,
- faktura może zawierać maksymalnie 20 prac,
- model ma limit 30 sekund,
- odpowiedź faktury ma limit 2400 tokenów,
- odpowiedź paragonu ma limit 1200 tokenów,
- backend sprawdza sygnaturę i obsługiwany typ pliku,
- żądania do modelu używają `store: false`.

## Zaimplementowane zabezpieczenia

- PDF ma limit 10 stron. Pliki z aktywną zawartością, skryptami, akcją otwarcia,
  osadzonym plikiem, XFA lub RichMedia są odrzucane przed wywołaniem modelu.
- Typ, sygnatura, rozmiar, czas i tokeny są sprawdzane po stronie backendu.
- Atomowy RPC rezerwuje godzinowy i dzienny limit oraz budżet tokenów wyjścia dla
  każdego uwierzytelnionego użytkownika.
- Globalny i per-feature kill switch, stabilny rollout procentowy oraz wybór
  modelu są sterowane zmiennymi środowiskowymi.
- Wywołanie modelu ma najwyżej dwie próby. Druga używa opcjonalnego fallbacku.
- Circuit breaker ogranicza ruch do niesprawnego dostawcy na ciepłej instancji.
- Czat ma deterministyczny guardrail dla najważniejszych czerwonych flag. Próba
  wymuszenia niższego poziomu pilności nie może zmienić ich na `monitor`.
- Potwierdzony import używa klucza idempotencji. Retry zwraca istniejący wpis
  zamiast tworzyć duplikat.

## Jakość i obserwowalność

Zdarzenie `ai_trace` zawiera wersję promptu i schematu, model, wynik, czas,
liczbę prób, tokeny i opcjonalny szacowany koszt. Nie zawiera wiadomości,
kontekstu pojazdu, dokumentu, odpowiedzi modelu, user ID ani vehicle ID.

Po zapisaniu szkicu aplikacja wysyła wyłącznie liczniki statusów, korekt i zmian
kategorii. RPC agreguje dane dziennie, a klucz żądania zapobiega podwójnemu
zliczeniu po retry. Tabele metryk nie mają polityk odczytu dla klienta.

Zestaw `ai-evals/imports/cases.json` obejmuje faktury i paragony PL/EN, wiele
pozycji, nieczytelne pola, wartości odrzucone i prompt injection. Runner mierzy
poprawność statusów, wartości, kategorii, recall odrzuceń i liczbę korekt.

Konfiguracja, rollout, alerty, zapytania dashboardu i rollback są opisane w
`AI_OPERATIONS.md`.

## Pozostałe działania operacyjne

Repozytorium nie tworzy zdalnego dashboardu i nie uruchamia płatnych modeli bez
jawnego dostępu do środowiska. Przed zakończeniem etapu należy:

1. Zastosować migracje na środowisku testowym przed wdrożeniem Edge Functions.
2. Ustawić aktualne ceny modeli w sekretach środowiska.
3. Uruchomić wspólny zestaw na modelu podstawowym i fallbacku oraz zapisać wynik.
4. Utworzyć dashboard i alerty na podstawie przygotowanych zapytań i `ai_trace`.
5. Dodać wynik regresyjnej ewaluacji do procesu wydania.
6. Po etapach 7–8 rozszerzyć testy injection o internet i wyniki narzędzi.

Do wykonania tych punktów potrzebne są dane dostępowe albo decyzje wdrożeniowe.
Nie należy uznawać etapu 6 za ukończony tylko na podstawie zmian lokalnych.
