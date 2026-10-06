# Stage 4 – Service Document Import

## Cel

Stage 4 ma możliwie prosty cel: użytkownik przekazuje zdjęcie lub PDF dokumentu
związanego z serwisem, a Vericar uzupełnia na tej podstawie wpis
serwisowego. Może to być między innymi faktura, paragon, raport serwisowy albo
odręczna notatka. Użytkownik sprawdza i poprawia dane przed ich zapisaniem.

Funkcja jest dostępna jako przycisk w formularzu dodawania wpisu serwisowego.

## Przepływ

```text
wybór zdjęcia lub PDF
→ sprawdzenie formatu i rozmiaru
→ pojedyncze żądanie do uwierzytelnionej Edge Function
→ analiza układu i treści przez model multimodal vision
→ zwalidowana lista wykonanych prac
→ jeden wpis albo wybór sposobu zapisu wielu prac
→ edytowalny formularz lub lista wpisów
→ potwierdzenie użytkownika
→ zapis zwykłego wpisu lub wpisów serwisowych
```

Dokument nie jest zapisywany w Supabase Storage, chmurowej bazie danych ani
logach. Jest przesyłany wyłącznie w ramach żądania potrzebnego do analizy. Edge
Function nie tworzy jego trwałej kopii, a odpowiedź zawiera tylko wyodrębnione
dane. Po zatwierdzeniu wpisu aplikacja zapisuje lokalną kopię dokumentu jako jego
załącznik.

Nie oznacza to, że plik nigdy nie opuszcza urządzenia. Musi zostać przesłany do
backendu i dostawcy modelu. Warunki przetwarzania i retencji po stronie dostawcy
muszą być zgodne z konfiguracją usługi i opisane użytkownikowi.

## Analiza multimodalna

Stage 4 korzysta z modelu multimodal vision, a nie z osobnego pipeline'u OCR. Model
interpretuje tekst razem z układem wizualnym dokumentu, dlatego prace mogą być
przedstawione w tabeli, wypunktowaniu, po myślnikach albo jako zwykły opis.

Backend zwraca listę rozpoznanych prac serwisowych oraz wspólne dane dokumentu:

- datę usługi,
- przebieg,
- warsztat,
- koszt całkowity i walutę,
- nazwy czynności lub części,
- sugerowaną kategorię z `ServiceEntryCategory` dla każdej rozpoznanej pracy,
- informację, których wartości nie udało się wiarygodnie odczytać.

Model nie zwraca identyfikatorów użytkownika, pojazdu ani rekordów bazy. Backend
waliduje daty, kwoty, walutę, przebieg i kategorie przed pokazaniem wyniku.

## Jeden dokument, jeden lub wiele wpisów

Import dokumentu jest zawsze jedną operacją. Wynikiem tej operacji może być jedna
lub kilka rozpoznanych prac serwisowych.

Jeżeli dokument zawiera jedną pracę, aplikacja otwiera jeden uzupełniony formularz
wpisu serwisowego. Jeżeli dokument opisuje kilka wykonanych prac lub napraw,
aplikacja pyta użytkownika, jak chce je zapisać:

- **Jeden wpis – zalecane:** jedna wizyta serwisowa z kosztem całkowitym, a wszystkie
  rozpoznane czynności i części trafiają do opisu lub notatek.
- **Osobne wpisy:** każda praca otrzymuje osobny wpis i może zostać poprawiona
  przed wspólnym zatwierdzeniem.

Koszt jest dzielony między osobne wpisy tylko wtedy, gdy dokument jednoznacznie
podaje koszt każdej pozycji. Podatki, rabaty oraz nierozdzielone kwoty nie są
zgadywane przez model.

W trybie osobnych wpisów data, przebieg i warsztat pozostają wspólne dla całej
wizyty. Każdy wpis ma jednak własny tytuł, koszt i kategorię, którą użytkownik
może zmienić przed zapisem. Obecny formularz multi używa jednej wspólnej kategorii,
dlatego Stage 4 rozszerza stan każdego wiersza o `category` i zapisuje kategorię
osobno dla każdego utworzonego wpisu.

## Ustalenia implementacyjne

- Obsługiwany jest jeden plik PDF, JPG, JPEG, PNG, HEIC lub HEIF o rozmiarze do
  10 MB. Zdjęcie można wybrać z biblioteki albo zrobić bezpośrednio aparatem.
  HEIC i HEIF są lokalnie konwertowane do tymczasowego JPEG przed analizą, a
  oryginalny plik pozostaje lokalnym załącznikiem.
- Aplikacja przesyła plik jako base64 bezpośrednio do Edge Function
  `service-invoice-import`. Endpoint nie używa Storage ani tabel dokumentów.
- Edge Function wysyła jedno żądanie do Responses API z `store: false`, plikiem
  wejściowym i ścisłym schematem `service_invoice_extraction_v1`.
- Koszty są wstawiane do formularza tylko wtedy, gdy wiarygodnie rozpoznana
  waluta dokumentu zgadza się z walutą ustawioną w aplikacji. Aplikacja nie wykonuje
  automatycznego przeliczania walut.
- Standardowe dane API OpenAI nie są używane do trenowania modeli. Dane mogą być
  przechowywane do 30 dni na potrzeby monitorowania nadużyć, chyba że projekt ma
  włączone Zero Data Retention. Użytkownik widzi tę informację i potwierdza
  wysłanie pliku przed analizą.
- Szczegóły retencji są opisane w aktualnej dokumentacji OpenAI:
  <https://developers.openai.com/api/docs/guides/your-data>.

## Granice Stage 4

- Brak cloud documents, indeksowania, osobnego pipeline'u OCR, embeddings i RAG.
- Brak zapisywania analizowanego dokumentu w chmurze. Po zapisaniu wpisu dokument
  jest dołączany do niego lokalnie.
- Brak agenta i function calling – jest jeden endpoint i jeden ustalony przepływ.
- Brak automatycznego zapisu bez podglądu i potwierdzenia użytkownika.
- Obraz, PDF, tekst dokumentu i odpowiedź modelu są niezaufanym wejściem.
- Backend sprawdza sesję oraz własność pojazdu niezależnie od modelu.
- Instrukcje zapisane wewnątrz dokumentu nie mogą zmienić zadania ekstrakcji.

## Kryterium zakończenia

Użytkownik może rozpocząć import z formularza serwisu. Czytelny dokument tworzy
jeden lub kilka poprawialnych wpisów. Po zapisaniu dokument jest dostępny
lokalnie jako załącznik, a żaden wpis nie jest zapisywany bez jawnego potwierdzenia.
