Vehico — aplikacja mobilna do prowadzenia historii pojazdu (cars + motorcycles)

Model monetyzacji musi być logiczny, uczciwy, skalowalny i maksymalnie prosty dla użytkownika.

Po analizie rynku, UX, modeli CarVertical/AutoDNA oraz zachowań użytkowników — ustaliliśmy optymalny model:

🟩 1. Tylko dwa poziomy planów użytkownika
FREE (hojny i funkcjonalny)

1 pojazd

max 10 zdjęć pojazdu

pełna historia serwisów

pełna historia tankowań

przypomnienia

dokumenty/załączniki (limit: ~20)

podstawowe statystyki

podstawowe wykresy

generowanie raportu → płatne

generowanie ogłoszenia → płatne

publiczny link raportu → tylko po zakupie raportu

LIFETIME Premium (jednorazowa opłata)

Odblokowuje absolutnie wszystko:

unlimited vehicles

unlimited photos

unlimited documents

unlimited reminders

unlimited everything

unlimited premium report generation

unlimited marketplace listings generation (AI)

advanced statistics

advanced charts

premium public report layout

predictive maintenance

AI summary

consistent maintenance score

premium timeline

QR code

priority new features

Lifetime = brak subskrypcji, jednorazowa opłata → najlepsza opcja psychologiczna dla tej branży.

🟨 2. Produkty premium kupowane jednorazowo

Nie subskrypcja.
Nie ograniczanie danych.
Tylko płatność za akcję premium.

Premium Report (jednorazowy zakup, np. 4.99–7.99 EUR)

Najważniejszy produkt.

Daje użytkownikowi możliwość wygenerowania pełnego raportu z:

pełnym layoutem

wszystkimi zdjęciami (również tymi dodanymi tymczasowo, tylko do raportu!)

statystykami zaawansowanymi

timeline premium

AI vehicle summary

QR code

badges ("Proof of Care")

kosztami rocznymi/miesięcznymi

przewidywaniami

wykresami

historią serwisową

historią tankowań

⭐ Raport to snapshot danych, nie edytowalny → tylko regeneracja.

AI Marketplace Listing (jednorazowy zakup, np. 1.99–2.99 EUR)

AI generuje ogłoszenie

user może edytować treść

user może dodać zdjęcia do ogłoszenia

lifetime → unlimited generowanie

free → płaci jednorazowo

🟧 3. Raporty są NIEEDYTOWALNE (immutable)

user nie może modyfikować raz wygenerowanego raportu

raport = snapshot danych

normalne, akceptowane, intuicyjne

🟦 4. Regeneracja raportów
✔ Free user

Każda regeneracja = nowy zakup raportu.

✔ Lifetime user

Regeneracja = darmowa, unlimited.

Raporty przechowywane jako wersje:

Report #1 — snapshot

Report #2 — snapshot

Report #3 — snapshot
(każdy osobny dokument)

🟥 5. Zdjęcia w raportach — kluczowy element

To było super ważne.

→ Użytkownik może dodać dodatkowe zdjęcia podczas generowania raportu, niezależnie od planu.

Te zdjęcia:

nie zapisują się w bazie

są wykorzystywane tylko w raporcie

nie naruszają limitów planu Free

Dzięki temu raport wygląda zawsze pełny i premium.

To genialny UX i najlepszy kompromis.

🟩 6. Jak przechowywać raporty?

Najlepszy model:

raport = HTML + JSON snapshot

zdjęcia = referencje do storage + zdjęcia tymczasowe (upload per report)

raport przechowywany „bezterminowo”

jeśli zdjęcia wygasną → można wygenerować nowy

Najlepszy balans:

niskie koszty

wysoka przejrzystość

zero frustracji

łatwy model monetyzacji

🟧 7. Ekran potwierdzenia przed zakupem raportu

Aby uniknąć reklamacji:

pokazujesz VIN, model, rok, zdjęcia, liczbę wpisów

pokazujesz statystyki, które wejdą do raportu

informacja: „Raport będzie zawierał dane dokładnie w tym stanie, w jakim są obecnie.”

checkbox:
„I confirm all data is correct and understand the report cannot be edited.”

To minimalizuje ryzyko zwrotów do zera.

🟩 8. Podsumowanie modelu (final):
Free

1 vehicle

limits

full app usage

pay-per-report

pay-per-listing

Lifetime

unlimited everything

unlimited reports

unlimited listings

advanced everything

Premium Report (one-time)

full report

extra photos on-the-fly

immutable snapshot

regenerations cost money (unless Lifetime)

Premium Listing (one-time)

AI-generated listing

editing allowed

unlimited for Lifetime

🟪 To jest absolutnie idealny model ekonomiczny + UX dla Vehico.

Masz:

zero subskrypcji (ludzie nienawidzą)

dwie ścieżki monetyzacji

bardzo atrakcyjny Lifetime

no bullshit fees

pełną kontrolę nad wersjonowaniem raportów

minimalny koszt storage

maksymalną skalowalność
