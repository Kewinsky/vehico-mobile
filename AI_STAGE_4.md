# Stage 4 – Service Invoice Import

## Cel

Użytkownik może wybrać zdjęcie lub PDF faktury serwisowej i otrzymać wypełniony,
edytowalny szkic istniejącego formularza wpisu serwisowego. AI skraca ręczne
wprowadzanie danych, ale nie zapisuje wpisu samodzielnie.

Cloud documents, indeksowanie, embeddings i document RAG nie należą do tego etapu.
Oryginał pozostaje lokalny, chyba że użytkownik wykorzysta istniejącą funkcję
lokalnego załącznika.

## Przepływ

```text
wybór pojazdu i faktury
→ walidacja typu oraz rozmiaru
→ uwierzytelnienie i sprawdzenie własności pojazdu
→ ograniczony czasowo transfer do analizy
→ ekstrakcja do ścisłego schematu
→ walidacja i normalizacja poza modelem
→ edytowalny formularz ze wskazaniem niepewnych pól
→ korekta i potwierdzenie użytkownika
→ zapis zwykłego wpisu serwisowego
→ usunięcie tymczasowej kopii
```

## Zakres danych

Model może zaproponować:

- datę usługi,
- przebieg,
- opis wykonanych czynności,
- części,
- nazwę warsztatu,
- koszt i walutę,
- jedną z kategorii obsługiwanych przez `ServiceEntryCategory`.

Model nie zwraca identyfikatorów użytkownika, pojazdu ani rekordów bazy. Kategoria
spoza zamkniętej listy jest mapowana na `other`. Daty, kwoty, waluta i przebieg są
walidowane deterministycznie przed pokazaniem szkicu.

## Stany pól

Każde pole ekstrakcji ma jeden z czterech stanów:

- `recognized` – wartość została rozpoznana i przeszła walidację,
- `uncertain` – wartość wymaga uwagi użytkownika,
- `missing` – materiał nie zawiera wystarczających danych,
- `rejected` – wartość jest niepoprawna lub poza dozwolonym zakresem.

Pewność modelu nie zastępuje walidacji. Interfejs musi jasno wskazać pola
niepewne, brakujące i odrzucone.

## Granice bezpieczeństwa

- Backend sprawdza sesję i własność pojazdu przed analizą oraz zapisem.
- Obraz, PDF, tekst OCR i odpowiedź modelu są niezaufanym wejściem.
- Instrukcje znalezione wewnątrz dokumentu nie mogą zmieniać zadania modelu.
- Obowiązują limity typu, rozmiaru, stron, czasu, tokenów i częstotliwości.
- Tymczasowy plik jest usuwany po sukcesie, błędzie, anulowaniu albo po krótkim TTL.
- Logi nie zawierają obrazu, treści faktury, danych osobowych ani surowej odpowiedzi modelu.
- Zapis następuje wyłącznie przez istniejący, walidowany przepływ formularza i po
  jawnym potwierdzeniu użytkownika.

## Poza zakresem

- trwała synchronizacja dokumentów między urządzeniami,
- wyszukiwanie i rozmowa z dokumentami,
- OCR całego archiwum,
- embeddings, `pgvector`, chunking i vector search,
- automatyczny zapis wpisu,
- pewna diagnoza na podstawie zdjęcia.

## Kryterium zakończenia

Reprezentatywna faktura PL lub EN tworzy zwalidowany i poprawialny szkic wpisu.
Nieczytelny, nieobsługiwany albo złośliwy materiał kończy się bezpiecznym błędem,
a żadne dane nie są zapisywane bez potwierdzenia użytkownika.
