# Vericar AI — Vehicle Advisor Roadmap

## Cel produktu

Vericar ma stać się inteligentnym doradcą dotyczącym pojazdu, a nie tylko chatbotem odczytującym dane zapisane przez użytkownika.

System ma łączyć:

```text
profil pojazdu podany przez użytkownika
+ historia serwisowa
+ opisane objawy
+ aktualna wiedza znaleziona w wiarygodnych źródłach
→ możliwe przyczyny problemu
→ zalecane kontrole i badania
→ priorytety serwisowe
→ orientacyjny koszt
→ wyjaśnienie wraz ze źródłami i ograniczeniami
```

Najważniejsze przypadki użycia:

- „Co warto teraz sprawdzić lub wymienić?”
- „Co typowo psuje się w tym modelu i przy tym przebiegu?”
- „Silnik nierówno pracuje na zimno — co może być przyczyną?”
- „Jakie badania pomogą ocenić stan silnika?”
- „Jaki może być orientacyjny koszt diagnozy lub naprawy?”
- „Czy zgłoszony objaw wymaga natychmiastowego zatrzymania pojazdu?”

## Granice produktu

Vehicle Advisor nie jest mechanikiem i nie wykonuje badania technicznego. Na podstawie profilu oraz historii nie może potwierdzić rzeczywistego stanu silnika, hamulców ani innych podzespołów.

Może natomiast:

- wskazać typowe usterki pasujące do pojazdu i objawów,
- wykryć braki lub niepokojące sygnały w historii,
- zaproponować rozsądną kolejność diagnostyki,
- zasugerować np. odczyt OBD, pomiar kompresji lub test szczelności,
- określić pilność problemu,
- przedstawić orientacyjny zakres kosztów.

Nie może:

- zapewnić, że wskazana diagnoza jest poprawna,
- nazwać silnika sprawnym bez wyników badań,
- podawać instrukcji wykonywania niebezpiecznych napraw,
- gwarantować ceny naprawy,
- zastępować profesjonalnej diagnostyki,
- decydować o dostępie użytkownika do danych.

## Zasady architektury

- Backend oraz Supabase RLS odpowiadają za uwierzytelnianie i autoryzację.
- Profil pojazdu i historia użytkownika są danymi deklarowanymi, a nie zweryfikowaną prawdą.
- Aktualne informacje, typowe usterki i ceny wymagają wyszukiwania internetu lub kontrolowanego źródła danych.
- Odpowiedź rozróżnia fakty użytkownika, informacje ze źródeł i wnioski modelu.
- Model zwraca structured output, który jest walidowany przed pokazaniem w aplikacji.
- Źródła internetowe, dokumenty, treść użytkownika i odpowiedzi modelu są niezaufane.
- Porada podaje brakujące informacje, poziom pewności i powód rekomendacji.
- Najpierw używamy prostego przepływu LLM i web search. RAG oraz agent pojawiają się dopiero wtedy, gdy są potrzebne.

## Etap 1 — kontrakt i bezpieczeństwo Advisora

Definiujemy przypadki testowe dla porad profilaktycznych, analizy objawów, diagnostyki, kosztów oraz sytuacji niebezpiecznych.

Odpowiedź zawiera:

- podsumowanie i poziom pilności,
- możliwe przyczyny uporządkowane jakościowo,
- uzasadnienie każdej hipotezy,
- zalecane kontrole lub badania,
- orientacyjny koszt i jego założenia,
- brakujące informacje,
- źródła oraz ograniczenia.

Nie podajemy sztucznych wartości procentowych bez danych pozwalających skalibrować prawdopodobieństwo. Używamy kategorii: „najbardziej prawdopodobne”, „możliwe”, „mniej prawdopodobne” i „brak danych”.

**Po tym etapie możemy:** jednoznacznie oceniać poprawność i bezpieczeństwo przyszłych odpowiedzi.

**Jeszcze nie możemy:** generować porad w aplikacji.

## Etap 2 — podstawowe połączenie z LLM

Dodajemy Supabase Edge Function komunikującą się z modelem. Sekret pozostaje po stronie backendu. Wprowadzamy wersjonowany prompt, structured output, runtime validation, limity tokenów, timeout i przewidywalną obsługę błędów.

Najpierw poznajemy bezpośredni przepływ request → prompt → model → response. Nie dodajemy frameworka agentowego.

**Po tym etapie możemy:** otrzymać zwalidowaną poradę dla sztucznego przypadku testowego.

**Jeszcze nie możemy:** korzystać z prawdziwych danych pojazdu ani aktualnego internetu.

## Etap 3 — bezpieczny kontekst pojazdu

Edge Function przyjmuje `vehicleId`, pytanie, język i region. Uwierzytelnia użytkownika, używa jego tokenu i RLS, a następnie pobiera profil oraz zatwierdzoną historię serwisową.

Kontekst wyraźnie rozdziela:

- dane profilu podane przez użytkownika,
- zatwierdzone wpisy historii,
- informacje nieznane,
- opis objawów,
- dane pochodzące z zewnętrznych źródeł.

Nie zakładamy, że pojemność silnika jednoznacznie identyfikuje jego wersję. Jeśli brakuje kodu silnika lub dokładnego wariantu, system obniża pewność albo prosi o uzupełnienie informacji.

**Po tym etapie możemy:** analizować profil i historię właściwego pojazdu bez dostępu do danych innych użytkowników.

**Jeszcze nie możemy:** potwierdzić poprawności danych użytkownika ani korzystać z aktualnej wiedzy internetowej.

## Etap 4 — wiedza internetowa ze źródłami

Dodajemy kontrolowane web search. Model wyszukuje typowe usterki, zalecenia serwisowe i informacje diagnostyczne odpowiednie dla pojazdu, silnika, wieku oraz przebiegu.

System:

- preferuje producentów, dokumentację techniczną i wiarygodne serwisy,
- rozróżnia źródła oficjalne, branżowe i społecznościowe,
- zwraca adres, tytuł i datę użytego źródła,
- nie traktuje treści znalezionej w internecie jako instrukcji systemowej,
- nie twierdzi, że popularna usterka występuje w konkretnym egzemplarzu,
- nie wyszukuje instrukcji wykonania niebezpiecznej naprawy.

**Po tym etapie możemy:** udzielać aktualniejszych ogólnych porad i wskazywać źródła.

**Jeszcze nie możemy:** zagwarantować kompletności ani prawdziwości znalezionych informacji.

## Etap 5 — proaktywny przegląd pojazdu

Dodajemy pierwszą główną funkcję produktu: „Przeanalizuj mój pojazd”. System porównuje profil, przebieg i historię z wiedzą o typowych problemach oraz zalecanych kontrolach.

Wynik dzieli obszary pojazdu na:

- dobrze udokumentowane,
- wymagające uwagi,
- wymagające diagnostyki,
- nieznane z powodu braku danych.

Przykład:

> Kluczowe elementy zawieszenia zostały niedawno wymienione, dlatego nie są obecnie priorytetem. W historii nie ma informacji o układzie chłodzenia. Przy tym wieku i przebiegu warto sprawdzić szczelność oraz stan płynu.

**Po tym etapie możemy:** proaktywnie wskazywać sensowne priorytety i braki w historii.

**Jeszcze nie możemy:** stwierdzić, że dany podzespół jest faktycznie sprawny.

## Etap 6 — rozmowa o objawach

Dodajemy tryb analizy usterki. Jeżeli brakuje informacji, asystent najpierw pyta np. kiedy pojawia się objaw, czy silnik jest zimny, jakie kontrolki się świecą, czy występują dźwięki i czy pojazd stracił moc.

Następnie zwraca kilka możliwych przyczyn wraz z:

- dopasowaniem do objawów,
- argumentami za i przeciw,
- informacją, czego jeszcze nie wiadomo,
- bezpieczną kolejnością dalszej diagnostyki.

**Po tym etapie możemy:** przeprowadzić ograniczony wywiad i przygotować różnicową listę możliwych przyczyn.

**Jeszcze nie możemy:** postawić pewnej diagnozy bez pomiarów i oględzin.

## Etap 7 — diagnostyka i triage bezpieczeństwa

System proponuje metody potwierdzenia lub wykluczenia hipotez, np. odczyt OBD, kontrolę w warsztacie, pomiar kompresji, test szczelności cylindrów, test szczelności dolotu lub pomiar ciśnienia oleju.

Każde zalecenie wyjaśnia:

- co badanie może potwierdzić,
- dlaczego pasuje do objawów,
- kto powinien je wykonać,
- czy można kontynuować jazdę,
- jakie sygnały wymagają zatrzymania pojazdu.

Triage bezpieczeństwa wspierają deterministyczne reguły dla oczywistych alarmów, np. utraty ciśnienia oleju, przegrzania lub problemów z hamulcami. Model nie może osłabiać takiego ostrzeżenia.

**Po tym etapie możemy:** zasugerować bezpieczny następny krok i określić pilność sytuacji.

**Nie możemy:** prowadzić użytkownika krok po kroku przez ryzykowną naprawę.

## Etap 8 — orientacyjne koszty

Dodajemy szacowanie zakresów kosztów odpowiednich dla kraju, waluty i daty. Koszt rozdzielamy na diagnostykę, części i robociznę, jeśli źródła na to pozwalają.

Każdy koszt zawiera:

- zakres zamiast jednej kwoty,
- region i walutę,
- datę oszacowania,
- przyjęte założenia,
- źródła,
- informację o wpływie wersji pojazdu, części i warsztatu.

**Po tym etapie możemy:** podać użyteczny rząd wielkości kosztu diagnozy lub naprawy.

**Nie możemy:** zagwarantować ostatecznej ceny ani dokładnie wycenić naprawy przed diagnozą.

## Etap 9 — interfejs Vehicle Advisora

Aktywujemy istniejący kafelek AI. Interfejs oferuje dwa czytelne wejścia:

- „Przeanalizuj mój pojazd”,
- „Opisz problem”.

Odpowiedź osobno prezentuje pilność, możliwe przyczyny, zalecane kontrole, koszt, źródła i brakujące informacje. Po ustabilizowaniu zwykłej odpowiedzi dodajemy streaming i ograniczony kontekst bieżącej rozmowy.

**Po tym etapie możemy:** bezpiecznie udostępnić Vehicle Advisora użytkownikowi aplikacji.

**Jeszcze nie możemy:** pamiętać rozmów między sesjami ani analizować lokalnych dokumentów.

## Etap 10 — dokumenty i faktury

Obecne dokumenty są zapisane lokalnie, dlatego backend AI nie może ich odczytać. Dodajemy prywatny Supabase Storage, metadane, RLS, synchronizację, retencję i świadomą zgodę użytkownika.

Następnie model multimodalny wyciąga z faktur datę, przebieg, warsztat, wykonane czynności, części i koszt. Wynik trafia do formularza jako wersja robocza. Po zatwierdzeniu Vehicle Advisor ponownie analizuje historię i aktualizuje rekomendacje.

**Po tym etapie możemy:** wzbogacać historię i rekomendacje na podstawie faktur.

**Nie możemy:** ufać ekstrakcji bez walidacji i potwierdzenia użytkownika.

## Etap 11 — RAG dla dokumentów użytkownika

RAG służy do przeszukiwania wielu dokumentów użytkownika, a nie jako główne źródło ogólnej wiedzy motoryzacyjnej.

```text
dokument
→ ekstrakcja tekstu
→ chunking
→ embedding
→ pgvector
→ wyszukiwanie filtrowane po użytkowniku i pojeździe
→ kontekst
→ odpowiedź ze wskazaniem dokumentu i strony
```

**Po tym etapie możemy:** łączyć opis problemu, historię serwisową, faktury i aktualne źródła internetowe.

**Nie możemy:** uznać treści dokumentu za prawdziwą tylko dlatego, że została znaleziona przez RAG.

## Etap 12 — działania i przygotowanie produkcyjne

Na końcu dodajemy wąskie narzędzia, np. przygotowanie przypomnienia lub wpisu serwisowego. Każda zmiana danych wymaga podglądu, potwierdzenia, ponownej autoryzacji i idempotencji.

Jeśli realne scenariusze wymagają wielu kroków, możemy dodać ograniczoną pętlę agenta z limitem kroków, czasu, tokenów i kosztu. Pamięć między sesjami jest jawna, edytowalna i usuwalna. MCP ma sens dopiero dla stabilnych narzędzi wymagających integracji z innymi systemami.

Całość otrzymuje:

- rate limiting i budżety,
- monitoring kosztu, tokenów i opóźnienia,
- wersjonowanie promptów i modeli,
- fallback modeli,
- bezpieczne logowanie bez VIN-u, opisów problemów i dokumentów,
- ewaluacje porad, diagnoz, kosztów, cytowań i bezpieczeństwa,
- feature flag oraz kill switch.

**Po tym etapie możemy:** eksploatować Vehicle Advisora jako kontrolowaną funkcję produkcyjną i pozwolić mu przygotowywać działania do zatwierdzenia.

**Nadal nie możemy:** traktować AI jako gwarantowanej diagnozy, ekspertyzy technicznej ani źródła autoryzacji.

## Kolejność wydań

1. Advisor Contract & Safety
2. LLM Fundamentals
3. Vehicle Context
4. Web-grounded Knowledge
5. Proactive Vehicle Review
6. Symptom Analysis
7. Diagnostic Guidance & Safety Triage
8. Cost Estimation
9. Vehicle Advisor UI
10. Cloud Documents & Invoice Reader
11. Document RAG
12. Actions & Production Hardening

Testy, ewaluację, bezpieczeństwo, koszt i obserwowalność rozwijamy od pierwszego etapu. Nie odkładamy ich wyłącznie na koniec.
