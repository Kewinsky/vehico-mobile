-- Seed data script for Vehico
-- Usage: Replace 'YOUR_VEHICLE_ID_HERE' with your actual vehicle UUID before running
-- This script creates seed data for service entries, fueling entries, and reminders
-- for each month from 2025-01 to 2026-01

-- ================
-- CONFIGURATION
-- ================
-- Replace this UUID with your vehicle ID:
DO $$
DECLARE
  vehicle_id uuid := 'YOUR_VEHICLE_ID_HERE'::uuid;
BEGIN

-- ================
-- SERVICE ENTRIES
-- ================
-- Service entries for each month (2025-01 to 2026-01)
-- Categories: maintenance, repair, inspection, upgrade, other
-- Varying quantities per month

-- January 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost) VALUES
(vehicle_id, '2025-01-05', 15000, 'maintenance', 'Wymiana oleju', 'Rutynowa wymiana oleju i filtra', 250.00),
(vehicle_id, '2025-01-15', 15200, 'inspection', 'Przegląd roczny', 'Pełny przegląd pojazdu', 150.00),
(vehicle_id, '2025-01-22', 15350, 'repair', 'Wymiana klocków hamulcowych', 'Wymiana przednich klocków hamulcowych', 450.00);

-- February 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost) VALUES
(vehicle_id, '2025-02-10', 15800, 'maintenance', 'Rotacja opon', 'Rotacja opon i kontrola ciśnienia', 80.00),
(vehicle_id, '2025-02-18', 16000, 'upgrade', 'Reflektory LED', 'Wymiana na reflektory LED', 600.00);

-- March 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost) VALUES
(vehicle_id, '2025-03-08', 16500, 'maintenance', 'Wymiana filtra powietrza', 'Wymiana filtra powietrza silnika', 120.00),
(vehicle_id, '2025-03-20', 16800, 'repair', 'Wymiana akumulatora', 'Wymiana akumulatora samochodowego', 380.00),
(vehicle_id, '2025-03-25', 16900, 'other', 'Myjnia i detailing', 'Profesjonalne mycie i czyszczenie wnętrza', 150.00);

-- April 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost) VALUES
(vehicle_id, '2025-04-12', 17500, 'maintenance', 'Płukanie chłodnicy', 'Płukanie i napełnienie układu chłodzenia', 200.00),
(vehicle_id, '2025-04-28', 17800, 'inspection', 'Przegląd przed sezonem letnim', 'Kontrola pojazdu przed latem', 100.00);

-- May 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost) VALUES
(vehicle_id, '2025-05-05', 18200, 'maintenance', 'Wymiana oleju', 'Rutynowa wymiana oleju', 250.00),
(vehicle_id, '2025-05-15', 18500, 'repair', 'Naprawa klimatyzacji', 'Naprawa sprężarki klimatyzacji', 850.00),
(vehicle_id, '2025-05-22', 18700, 'upgrade', 'Modernizacja systemu audio', 'Montaż nowych głośników i wzmacniacza', 1200.00);

-- June 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost) VALUES
(vehicle_id, '2025-06-10', 19200, 'maintenance', 'Wymiana płynu skrzyni biegów', 'Wymiana płynu w skrzyni biegów', 300.00),
(vehicle_id, '2025-06-18', 19500, 'inspection', 'Kontrola bezpieczeństwa', 'Kontrola bezpieczeństwa i emisji spalin', 120.00);

-- July 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost) VALUES
(vehicle_id, '2025-07-03', 20000, 'maintenance', 'Wymiana oleju', 'Rutynowa wymiana oleju', 250.00),
(vehicle_id, '2025-07-12', 20300, 'repair', 'Ustawienie geometrii kół', 'Korekta ustawienia przednich kół', 150.00),
(vehicle_id, '2025-07-25', 20600, 'other', 'Przyciemnianie szyb', 'Przyciemnianie tylnych szyb', 400.00);

-- August 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost) VALUES
(vehicle_id, '2025-08-08', 21200, 'maintenance', 'Wymiana świec zapłonowych', 'Wymiana wszystkich świec zapłonowych', 180.00),
(vehicle_id, '2025-08-20', 21500, 'repair', 'Naprawa układu wydechowego', 'Wymiana tłumika', 550.00);

-- September 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost) VALUES
(vehicle_id, '2025-09-05', 22000, 'maintenance', 'Wymiana oleju', 'Rutynowa wymiana oleju', 250.00),
(vehicle_id, '2025-09-15', 22300, 'inspection', 'Przegląd przed zimą', 'Kontrola pojazdu przed sezonem zimowym', 150.00),
(vehicle_id, '2025-09-22', 22500, 'maintenance', 'Kontrola akumulatora', 'Test akumulatora i czyszczenie zacisków', 50.00);

-- October 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost) VALUES
(vehicle_id, '2025-10-10', 23000, 'repair', 'Wymiana wycieraczek', 'Montaż nowych piór wycieraczek', 60.00),
(vehicle_id, '2025-10-18', 23200, 'maintenance', 'Płukanie płynu hamulcowego', 'Płukanie układu hamulcowego', 200.00),
(vehicle_id, '2025-10-28', 23500, 'upgrade', 'Opony zimowe', 'Zakup i montaż opon zimowych', 1200.00);

-- November 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost) VALUES
(vehicle_id, '2025-11-05', 24000, 'maintenance', 'Wymiana oleju', 'Rutynowa wymiana oleju', 250.00),
(vehicle_id, '2025-11-12', 24200, 'repair', 'Wymiana nagrzewnicy', 'Wymiana nagrzewnicy', 650.00);

-- December 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost) VALUES
(vehicle_id, '2025-12-08', 24800, 'maintenance', 'Wymiana filtra paliwa', 'Wymiana filtra paliwa', 100.00),
(vehicle_id, '2025-12-15', 25000, 'inspection', 'Serwis roczny', 'Kompleksowy serwis roczny', 500.00),
(vehicle_id, '2025-12-22', 25100, 'other', 'Detailing świąteczny', 'Pełny detailing przed świętami', 200.00);

-- January 2026
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost) VALUES
(vehicle_id, '2026-01-05', 25500, 'maintenance', 'Wymiana oleju', 'Rutynowa wymiana oleju', 250.00),
(vehicle_id, '2026-01-12', 25700, 'repair', 'Wymiana rozrusznika', 'Wymiana rozrusznika', 450.00);

-- ================
-- FUELING ENTRIES
-- ================
-- Fueling entries for each month (varying frequency and amounts)

-- January 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost) VALUES
(vehicle_id, '2025-01-10', 380.2, 45.8, 238.20),
(vehicle_id, '2025-01-24', 390.5, 47.2, 245.80);

-- February 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost) VALUES
(vehicle_id, '2025-02-14', 385.0, 46.5, 241.90);

-- March 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost) VALUES
(vehicle_id, '2025-03-13', 380.0, 45.9, 239.00),
(vehicle_id, '2025-03-27', 390.0, 47.1, 245.20);

-- April 2025
-- Brak tankowań w kwietniu

-- May 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost) VALUES
(vehicle_id, '2025-05-09', 380.3, 46.0, 239.50),
(vehicle_id, '2025-05-23', 390.5, 47.2, 245.80);

-- June 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost) VALUES
(vehicle_id, '2025-06-13', 385.0, 46.5, 242.00);

-- July 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost) VALUES
(vehicle_id, '2025-07-11', 380.8, 46.0, 239.60),
(vehicle_id, '2025-07-25', 390.0, 47.1, 245.00);

-- August 2025
-- Brak tankowań w sierpniu

-- September 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost) VALUES
(vehicle_id, '2025-09-12', 380.0, 45.9, 239.00);

-- October 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost) VALUES
(vehicle_id, '2025-10-10', 385.8, 46.6, 242.60),
(vehicle_id, '2025-10-24', 395.0, 47.8, 248.80);

-- November 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost) VALUES
(vehicle_id, '2025-11-14', 380.2, 46.0, 239.40);

-- December 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost) VALUES
(vehicle_id, '2025-12-12', 385.0, 46.5, 242.00),
(vehicle_id, '2025-12-26', 395.5, 47.8, 248.80);

-- January 2026
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost) VALUES
(vehicle_id, '2026-01-09', 380.8, 46.0, 239.60);

-- ================
-- REMINDERS
-- ================
-- Mix of time-based and mileage-based reminders
-- Some active, some done

-- Time-based reminders
INSERT INTO public.reminders (vehicle_id, type, due_date, days_before, title, notes, status) VALUES
(vehicle_id, 'time', '2025-02-15', 7, 'Wymiana oleju', 'Następna wymiana oleju zaplanowana', 'done'),
(vehicle_id, 'time', '2025-04-01', 14, 'Przegląd wiosenny', 'Roczny przegląd pojazdu wiosenny', 'done'),
(vehicle_id, 'time', '2025-06-10', 7, 'Serwis klimatyzacji', 'Kontrola klimatyzacji przed latem', 'done'),
(vehicle_id, 'time', '2025-09-01', 14, 'Przegląd przed zimą', 'Przygotowanie pojazdu na sezon zimowy', 'done'),
(vehicle_id, 'time', '2025-12-20', 7, 'Serwis świąteczny', 'Serwis przed podróżą świąteczną', 'done'),
(vehicle_id, 'time', '2026-02-01', 14, 'Przegląd roczny', 'Roczny kompleksowy przegląd', 'active'),
(vehicle_id, 'time', '2026-03-15', 7, 'Konserwacja wiosenna', 'Kontrola konserwacyjna wiosenna', 'active'),
(vehicle_id, 'time', '2026-05-01', 14, 'Przygotowanie na lato', 'Przygotowanie pojazdu na lato', 'active');

-- Mileage-based reminders
INSERT INTO public.reminders (vehicle_id, type, due_mileage, title, notes, status) VALUES
(vehicle_id, 'mileage', 20000, 'Serwis główny', 'Główny serwis przy 20 000 km', 'done'),
(vehicle_id, 'mileage', 25000, 'Serwis skrzyni biegów', 'Serwis skrzyni biegów przy 25 000 km', 'done'),
(vehicle_id, 'mileage', 30000, 'Serwis główny', 'Główny serwis przy 30 000 km', 'active'),
(vehicle_id, 'mileage', 35000, 'Kontrola paska rozrządu', 'Kontrola paska rozrządu przy 35 000 km', 'active'),
(vehicle_id, 'mileage', 40000, 'Serwis główny', 'Główny serwis przy 40 000 km', 'active');

-- Podsumowanie
-- Wpisy serwisowe: ~35 wpisów w ciągu 13 miesięcy
-- Wpisy tankowania: ~18 wpisów w ciągu 13 miesięcy (0-2 na miesiąc)
-- Przypomnienia: 13 przypomnień (8 opartych na czasie, 5 opartych na przebiegu)

END $$;
