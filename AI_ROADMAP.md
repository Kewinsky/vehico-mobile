# Vericar AI – Vehicle Assistant and Data Import

## Cel

Pierwszym produktem AI w Vericarze jest czat dotyczący wybranego pojazdu. Czat
odpowiada na podstawie zweryfikowanego, odfiltrowanego kontekstu z bazy danych.
Kolejnym celem jest skrócenie ręcznego wprowadzania danych przez tworzenie
edytowalnych szkiców z faktur serwisowych i paragonów paliwowych.

```text
pytanie użytkownika
+ profil pojazdu
+ zatwierdzona historia serwisowa i paliwowa
+ opcjonalne aktualne źródła internetowe
+ potrzebna część bieżącej rozmowy
→ odpowiedź z niepewnością i bezpiecznym kolejnym krokiem

zdjęcie lub PDF
→ ograniczona ekstrakcja do schematu
→ walidacja i mapowanie kategorii
→ podgląd oraz korekta użytkownika
→ jawnie zatwierdzony wpis
```

Pełne przechowywanie dokumentów w chmurze, ich indeksowanie i document RAG nie
należą obecnie do aktywnej roadmapy. Mogą wrócić dopiero po potwierdzeniu
konkretnej potrzeby użytkowników.

## Zasady produktowe

- AI przygotowuje szkic i nigdy nie zapisuje rozpoznanych danych bez potwierdzenia.
- Brakujące albo niepewne pola są widoczne i możliwe do poprawienia.
- Kategorie, typy paliwa i inne wartości zamknięte są mapowane deterministycznie
  do wartości obsługiwanych przez aplikację.
- Importowany plik nie jest utrwalany przez Vericar. Jest przesyłany do backendu
  i dostawcy modelu tylko w ramach żądania potrzebnego do ekstrakcji danych.
- Model output, obrazy, pliki i treść odczytana przez model są niezaufanym wejściem.
- Własność pojazdu jest sprawdzana przez backend przed analizą i przed zapisem.
- AI ma usuwać tarcie z istniejących przepływów, a nie tworzyć osobny system
  dokumentów bez potwierdzonej wartości produktowej.

## Etap 1 – LLM Fundamentals

- połączenie Supabase Edge Function z LLM API,
- podstawowy prompt systemowy,
- structured output i walidacja,
- tokeny, limity, timeout i błędy,
- pierwsze przypadki testowe bezpieczeństwa.

**Rezultat:** backend zwraca zwalidowaną odpowiedź dla testowego pytania bez
dostępu do danych użytkownika.

## Etap 2 – Minimalny czat

- ekran czatu dostępny z istniejącego kafelka AI,
- wysyłanie wiadomości do Edge Function,
- obsługa anulowania, błędu i ponowienia,
- podstawowa historia rozmowy tylko w bieżącej sesji.

Streaming odpowiedzi pozostaje poza zakresem MVP do czasu potwierdzenia potrzeby.

**Rezultat:** użytkownik prowadzi prostą rozmowę z modelem, który nie zna jeszcze
jego pojazdu.

## Etap 3 – Pełny kontekst pojazdu

- uwierzytelnienie użytkownika i sprawdzenie własności pojazdu,
- pobranie profilu pojazdu oraz zatwierdzonej historii serwisowej,
- prywatnościowo odfiltrowany snapshot przebiegu, przypomnień, opon, felg,
  wyposażenia, warsztatów i uproszczonych wpisów paliwowych,
- limity liczby rekordów i rozmiaru kontekstu,
- walidacja pól bezpieczeństwa oraz testy izolacji użytkowników.

**Rezultat:** czat odpowiada na podstawie właściwego pojazdu bez dostępu do VIN-u,
tablicy rejestracyjnej, lokalnych plików ani danych innego użytkownika.

## Etap 4 – Import faktury serwisowej

- kafelek na ekranie importu i przycisk w formularzu wpisu serwisowego,
- wybór zdjęcia lub PDF bez zapisywania go w Storage albo bazie,
- jedno uwierzytelnione żądanie analizujące dokument,
- multimodal vision analizujące tekst razem z tabelami, listami i układem dokumentu,
- structured extraction daty, przebiegu, warsztatu, kosztu i listy wykonanych prac,
- sugestia istniejącej kategorii serwisowej osobno dla każdej rozpoznanej pracy,
- jeden edytowalny szkic, gdy dokument opisuje jedną pracę,
- wybór jednego wpisu z dokładnym opisem albo osobnych szkiców, gdy faktura
  zawiera kilka wykonanych prac,
- osobna, edytowalna kategoria i koszt dla każdego szkicu w trybie multi,
- zapis wyłącznie po podglądzie i potwierdzeniu użytkownika.

**Rezultat:** faktura tworzy jeden lub kilka poprawialnych szkiców bez trwałego
przechowywania dokumentu i bez automatycznego zapisu.

## Etap 5 – Import paragonu paliwowego

- ekstrakcja daty, ilości paliwa, ceny, łącznego kosztu, rodzaju paliwa i stacji,
- wyliczanie brakującej ceny jednostkowej lub sumy wyłącznie deterministycznie,
- wykorzystanie profilu pojazdu do zawężenia dozwolonych rodzajów paliwa,
- jawne wymaganie ręcznego podania przebiegu lub dystansu, jeśli paragon go nie
  zawiera,
- podgląd, korekta i potwierdzenie przed utworzeniem wpisu paliwowego.

**Rezultat:** czytelny paragon tworzy szkic tankowania bez wymyślania brakującego
przebiegu i bez automatycznego zapisu.

## Etap 6 – Jakość i bezpieczeństwo importu

- wspólny kontrakt stanów: rozpoznane, niepewne, brakujące i odrzucone,
- limity typu, rozmiaru, liczby stron, czasu, tokenów i częstotliwości analiz,
- ochrona przed złośliwymi PDF-ami, prompt injection i treścią udającą instrukcje,
- idempotencja i ochrona przed utworzeniem duplikatu po ponowieniu,
- anonimizowany zestaw ewaluacyjny dla faktur i paragonów PL/EN,
- pomiar poprawności pól, kategorii, odrzuceń i liczby korekt użytkownika,
- obserwowalność bez logowania dokumentów, paragonów i danych osobowych.

**Rezultat:** import ma zmierzoną jakość, kontrolowany koszt i bezpiecznie obsługuje
typowe błędy oraz nieczytelne materiały.

## Etap 7 – Web search ze źródłami

- kontrolowane wyszukiwanie aktualnych informacji po stronie backendu,
- zapytania budowane z odfiltrowanego profilu pojazdu i pytania użytkownika,
- preferowanie producentów, dokumentacji i wiarygodnych źródeł branżowych,
- data, typ i adres źródła oraz ochrona przed prompt injection,
- odpowiedź częściowa, gdy źródło jest niedostępne.

**Rezultat:** czat rozróżnia dane użytkownika od aktualnych informacji z internetu
i pokazuje ich źródła.

## Etap 8 – Tools i function calling

- wąskie narzędzia odczytu danych pojazdu i historii,
- deterministyczne narzędzia obliczeniowe,
- szkice przypomnień oraz wpisów bez automatycznego zapisu,
- ścisłe schematy, autoryzacja każdego wywołania i limity liczby kroków,
- podgląd i potwierdzenie każdej zmiany danych.

**Rezultat:** model może wybrać właściwe narzędzie, ale backend kontroluje dostęp,
argumenty i skutki działania.

## Etap 9 – Context engineering, memory i ograniczony agent

- wybór tylko potrzebnego kontekstu,
- budżet tokenów i streszczanie starszej rozmowy,
- opcjonalna, jawna, edytowalna i usuwalna pamięć,
- ograniczona pętla model → narzędzie → wynik → model,
- limity kroków, czasu i kosztu oraz agent evaluation.

**Rezultat:** czat wykonuje kontrolowane zadania wieloetapowe bez nieograniczonej
autonomii.

## Etap 10 – Proaktywne rekomendacje

- wspólny serwis kontekstu używany przez czat i rekomendacje,
- uruchamianie po istotnej zmianie, np. przebiegu lub zatwierdzonym wpisie,
- krótka lista priorytetów z uzasadnieniem i źródłami,
- rozróżnienie braku informacji od dowodu usterki,
- feedback użytkownika bez fikcyjnego procentu stanu pojazdu.

**Rezultat:** Vericar wskazuje obszary wymagające uwagi, ale użytkownik zachowuje
kontrolę nad decyzjami.

## Etap 11 – Production hardening

- guardrails i testy bezpieczeństwa,
- rate limiting, budżety kosztowe, timeouty i kontrolowane retry,
- tracing oraz bezpieczne logowanie metadanych,
- monitoring jakości, błędów, kosztu i opóźnienia,
- porównywanie modeli, fallback, circuit breaker, feature flag i kill switch,
- regresyjne evaluation przed wydaniem.

**Rezultat:** funkcje AI mają mierzalną jakość, koszt i niezawodność oraz bezpieczny
rollback.

## Etap 12 – Opcjonalne rozszerzenia

Tylko po potwierdzeniu potrzeby produktowej można rozważyć:

- trwałą synchronizację dokumentów do prywatnego Storage,
- ekstrakcję tekstu, chunking, embeddings i `pgvector`,
- document RAG z filtrowaniem po użytkowniku i pojeździe,
- hybrid retrieval i reranking,
- analizę zdjęć usterek jako niepewny kontekst diagnostyczny,
- MCP, jeśli narzędzia Vericara mają być dostępne poza aplikacją.

Każde rozszerzenie wymaga osobnej decyzji, kryterium sukcesu i ewaluacji. Nie jest
warunkiem ukończenia aktywnej roadmapy.

## Pokrycie tematów AI Engineering

- Etapy 1–3: LLM APIs, prompting, structured outputs, tokeny i bezpieczny kontekst.
- Etapy 4–6: multimodal AI, vision, ekstrakcja strukturalna i evaluation.
- Etap 7: web search, cytowania i prompt injection protection.
- Etapy 8–9: tool calling, function calling, context engineering, memory i agent loop.
- Etapy 1–11: guardrails, AI security, observability, koszt i reliability patterns.
- Embeddings, vector databases, RAG, reranking i MCP pozostają świadomie opcjonalne.
