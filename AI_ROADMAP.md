# Vericar AI — Context-Aware Vehicle Chat

## Cel

Pierwszym produktem AI w Vericarze będzie czat dotyczący wybranego pojazdu. Czat ma odpowiadać na podstawie właściwego kontekstu, a nie wyłącznie ogólnej wiedzy modelu.

```text
pytanie użytkownika
+ profil pojazdu
+ historia serwisowa
+ dokumenty znalezione przez RAG
+ aktualne źródła internetowe
+ historia bieżącej rozmowy
→ odpowiedź ze źródłami, niepewnością i bezpiecznym kolejnym krokiem
```

Proaktywne rekomendacje na dashboardzie powstaną później. Wykorzystają gotowy silnik kontekstu i odpowiedzi zbudowany dla czatu.

## Możliwości docelowego czatu

Użytkownik będzie mógł między innymi:

- opisać objaw i poznać możliwe przyczyny,
- odpowiedzieć na pytania uzupełniające modelu,
- zapytać, co warto sprawdzić przy danym wieku i przebiegu,
- zapytać o typowe problemy modelu lub silnika,
- otrzymać propozycję badań diagnostycznych,
- poznać pilność problemu i orientacyjny koszt,
- pytać o informacje zapisane w historii i dokumentach,
- zobaczyć źródła wykorzystane do przygotowania odpowiedzi.

Czat nie może potwierdzić stanu technicznego ani postawić pewnej diagnozy bez oględzin i pomiarów. Nie zastępuje mechanika i nie podaje instrukcji wykonywania niebezpiecznych napraw.

## Źródła kontekstu

### Dane strukturalne

Profil pojazdu i zatwierdzona historia serwisowa pochodzą z PostgreSQL. Są pobierane przez backend z tokenem użytkownika i ochroną Supabase RLS.

### Dokumenty użytkownika

Faktury, instrukcje i inne dokumenty są przetwarzane przez RAG. Wyszukiwanie zawsze filtruje fragmenty po użytkowniku, pojeździe i dokumencie.

### Wiedza zewnętrzna

Web search służy do wyszukiwania aktualnych informacji o typowych usterkach, diagnostyce i orientacyjnych kosztach. Odpowiedź rozróżnia źródła oficjalne, branżowe i społecznościowe.

### Rozmowa

Do kontekstu trafiają tylko wiadomości potrzebne do bieżącego pytania. Starsza rozmowa jest skracana lub streszczana, aby kontrolować liczbę tokenów i koszt.

## Etap 1 — LLM Fundamentals

- połączenie Supabase Edge Function z LLM API,
- podstawowy prompt systemowy,
- structured output i walidacja,
- tokeny, limity, timeout i błędy,
- pierwsze przypadki testowe bezpieczeństwa.

**Rezultat:** backend potrafi zwrócić zwalidowaną odpowiedź dla testowego pytania bez dostępu do danych użytkownika.

## Etap 2 — Minimalny czat

- ekran czatu dostępny z istniejącego kafelka AI,
- wysyłanie wiadomości do Edge Function,
- obsługa anulowania, błędu i ponowienia,
- podstawowa historia rozmowy tylko w bieżącej sesji.

Streaming odpowiedzi pozostaje poza zakresem MVP. Można wrócić do niego po potwierdzeniu potrzeby produktowej.

**Rezultat:** użytkownik może prowadzić prostą rozmowę z modelem, ale model nie zna jeszcze jego pojazdu.

## Etap 3 — pełny kontekst pojazdu

- uwierzytelnienie użytkownika,
- sprawdzenie własności pojazdu przez RLS i backend,
- pobieranie profilu pojazdu,
- pobieranie wyłącznie zatwierdzonej historii serwisowej,
- przekazywanie prywatnościowo odfiltrowanego snapshotu przebiegu, przypomnień, opon, felg, wyposażenia, warsztatów i uproszczonych wpisów paliwowych,
- pomijanie VIN-u, tablicy rejestracyjnej, `owner_id`, `intake_token`, technicznych dat utworzenia, raportów i ogłoszeń marketplace,
- maksymalnie 100 najnowszych kompaktowych wpisów serwisowych i 100 najnowszych wpisów paliwowych,
- wyraźne oznaczenie danych podanych przez użytkownika i danych nieznanych,
- walidacja pól bezpieczeństwa i deterministyczne pokazanie ich użytkownikowi w jednym naturalnym dymku, bez ujawniania wewnętrznych odwołań do rekordów.

**Rezultat:** czat zna odfiltrowany snapshot danych wybranego pojazdu i użytkownika dostępny w chmurze, lecz nie otrzymuje VIN-u, tablicy rejestracyjnej, pól autoryzacyjnych, raportów, ogłoszeń, nadmiarowych pól tankowań, lokalnych zdjęć, dokumentów, załączników ani aktualnego internetu.

## Etap 4 — dokumenty w chmurze

Obecne dokumenty są lokalne, dlatego backend nie może ich analizować. Dodajemy:

- prywatny Supabase Storage,
- tabelę metadanych dokumentów,
- RLS i Storage Policies,
- bezpieczny upload, synchronizację i usuwanie,
- świadomą zgodę na przetwarzanie przez AI,
- niedestrukcyjną migrację plików lokalnych.

**Rezultat:** backend może odczytać dokument należący do właściwego użytkownika i pojazdu.

## Etap 5 — indeksowanie dokumentów

- ekstrakcja tekstu z obsługiwanych plików,
- zachowanie relacji z dokumentem i numerem strony,
- chunking,
- generowanie embeddings,
- włączenie `pgvector`,
- zapis fragmentów wraz z metadanymi,
- ponowne indeksowanie i usuwanie indeksu.

**Rezultat:** dokumenty są przygotowane do bezpiecznego wyszukiwania semantycznego.

## Etap 6 — RAG i cytowania

- embedding pytania,
- similarity search,
- metadata filtering po użytkowniku i pojeździe,
- przekazanie znalezionych fragmentów do LLM,
- odpowiedź ze wskazaniem dokumentu i strony,
- zestaw testowy do RAG evaluation.

**Rezultat:** użytkownik może pytać o treść własnych dokumentów i sprawdzać źródło odpowiedzi.

## Etap 7 — web search i hybrid retrieval

- wyszukiwanie typowych usterek, metod diagnostycznych i kosztów,
- źródła oraz data ich pobrania,
- ochrona przed prompt injection z internetu,
- połączenie SQL, full-text search, vector search i web search,
- reranking dopiero wtedy, gdy ewaluacje pokażą problem z kolejnością wyników.

**Rezultat:** czat łączy wiedzę o konkretnym pojeździe z aktualnymi informacjami zewnętrznymi.

## Etap 8 — multimodalność

- analiza zdjęć i PDF przez model vision,
- odczyt faktur i dokumentów,
- rozpoznawanie kontrolek lub widocznych elementów bez gwarantowania diagnozy,
- structured extraction dat, przebiegu, czynności, części i kosztów,
- podgląd oraz korekta przed zapisaniem danych.

**Rezultat:** obraz lub faktura stają się dodatkowym kontekstem rozmowy i historii pojazdu.

## Etap 9 — tools i function calling

Czat otrzymuje wąskie narzędzia, np.:

- `get_vehicle`,
- `get_service_history`,
- `search_vehicle_documents`,
- `search_web`,
- `calculate_costs`,
- `draft_reminder`,
- `draft_service_entry`.

Backend waliduje argumenty i autoryzuje każde wywołanie. Zapis danych wymaga podglądu oraz potwierdzenia użytkownika.

**Rezultat:** model wybiera właściwe źródło kontekstu i może przygotować bezpieczną akcję do zatwierdzenia.

## Etap 10 — context engineering, memory i ograniczony agent

- wybór tylko potrzebnego kontekstu,
- kontrola okna kontekstowego i tokenów,
- streszczanie starszej rozmowy,
- opcjonalna, jawna i usuwalna pamięć długoterminowa,
- ograniczona pętla model → narzędzie → wynik → model,
- limity liczby kroków, czasu i kosztu,
- agent evaluation.

**Rezultat:** czat wykonuje kontrolowane zadania wieloetapowe bez nieograniczonej autonomii.

## Etap 11 — proaktywne rekomendacje

Rekomendacje korzystają z gotowych elementów czatu:

- profilu i historii,
- dokumentów oraz RAG,
- wiedzy internetowej,
- tego samego formatu źródeł i niepewności,
- tych samych reguł bezpieczeństwa.

Rekomendacje są uruchamiane po istotnej zmianie, np. aktualizacji przebiegu, dodaniu wpisu lub zatwierdzeniu faktury. Pokazują priorytety, a nie wymyślony procent „stanu samochodu”.

**Rezultat:** Vericar sam wskazuje obszary wymagające uwagi, ale użytkownik zachowuje kontrolę nad decyzjami.

## Etap 12 — production hardening i opcjonalne MCP

- guardrails i prompt injection protection,
- AI security i izolacja użytkowników,
- evaluation, RAG evaluation i agent evaluation,
- observability, tracing i bezpieczne logowanie,
- token/cost tracking oraz latency monitoring,
- production monitoring,
- model selection i model fallbacks,
- rate limiting,
- timeout, retry, circuit breaker, idempotencja i inne reliability patterns,
- feature flag oraz kill switch.

MCP dodajemy tylko wtedy, gdy stabilne narzędzia Vericara mają zostać udostępnione innym systemom lub agentom. Nie jest wymagane do działania aplikacji mobilnej.

**Rezultat:** czat i rekomendacje mogą działać jako kontrolowane funkcje produkcyjne z mierzalną jakością, kosztem i niezawodnością.

## Pokrycie tematów AI Engineering

- Etapy 1–3: LLM APIs, prompt engineering, structured outputs i tokens.
- Etapy 4–6: embeddings, chunking, vector databases, `pgvector`, similarity search, metadata filtering, RAG, citations i RAG evaluation.
- Etap 7: hybrid retrieval, opcjonalny reranking oraz prompt injection protection.
- Etap 8: multimodal AI i vision models.
- Etapy 9–10: tool calling, function calling, agent loops, ReAct-style flow, memory, context engineering i agent evaluation.
- Etapy 1–12: guardrails, AI security i evaluation.
- Etap 12: observability, tracing, logging, pomiar kosztu i opóźnienia, monitoring, dobór modeli, fallbacki, rate limiting i reliability patterns.
- MCP pozostaje świadomie opcjonalne.
