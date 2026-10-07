# AI Stage 6 – Quality, Security and Production Hardening

## Status

Etap jest w trakcie realizacji. Pierwszy fragment ujednolica kontrakt pól importu
faktur serwisowych i paragonów paliwowych. Pozostałe zadania są śledzone w
`ai.todo` i będą wdrażane małymi, osobno testowanymi zmianami.

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

Limity liczby stron PDF, częstotliwości analiz i kosztu na użytkownika nie są
jeszcze wdrożone. Nie należy uznawać etapu 6 za ukończony, dopóki pozostałe
punkty w `ai.todo` nie zostaną zrealizowane i zweryfikowane.
