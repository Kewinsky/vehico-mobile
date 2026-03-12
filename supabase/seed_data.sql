-- Seed data script for Vehico
-- Usage: Replace 'YOUR_VEHICLE_ID_HERE' with your actual vehicle UUID before running

-- ================
-- CONFIGURATION
-- ================
-- Replace this UUID with your vehicle ID:
DO $$
DECLARE
  vehicle_id uuid := 'YOUR_VEHICLE_ID_HERE'::uuid;
  v_owner_id uuid;
  w_mechanic uuid;
  w_detailer uuid;
  w_audio uuid;
  w_tires uuid;
BEGIN
  -- Pobierz owner_id z pojazdu (warsztaty są per user)
  SELECT owner_id INTO v_owner_id FROM public.vehicles WHERE id = vehicle_id;
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Vehicle not found. Replace YOUR_VEHICLE_ID_HERE with valid vehicle UUID.';
  END IF;

-- ================
-- WORKSHOPS (warsztaty)
-- ================
-- workshop_type: mechanic, electrician, detailer, bodywork, car_wash, other
INSERT INTO public.workshops (owner_id, name, workshop_type, phone_number, address) VALUES
(v_owner_id, 'AutoSerwis Kowalski', 'mechanic', '+48 22 123 45 67', 'ul. Motoryzacyjna 15, 02-123 Warszawa')
RETURNING id INTO w_mechanic;

INSERT INTO public.workshops (owner_id, name, workshop_type, phone_number, address) VALUES
(v_owner_id, 'Detailing Pro', 'detailer', '+48 22 987 65 43', 'ul. Czysta 8, 00-001 Warszawa')
RETURNING id INTO w_detailer;

INSERT INTO public.workshops (owner_id, name, workshop_type, phone_number, address) VALUES
(v_owner_id, 'Car Audio Center', 'other', '+48 22 555 12 34', 'al. Jerozolimskie 100, 02-001 Warszawa')
RETURNING id INTO w_audio;

INSERT INTO public.workshops (owner_id, name, workshop_type, phone_number, address) VALUES
(v_owner_id, 'Opony i Felgi Max', 'mechanic', '+48 22 444 77 88', 'ul. Oponiarska 3, 03-456 Warszawa')
RETURNING id INTO w_tires;

-- ================
-- SERVICE ENTRIES
-- ================
-- Service entries for each month (2025-01 to 2026-01)
-- Categories: maintenance, oil_change, repair, inspection, upgrade, other
-- Varying quantities per month

-- January 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-01-05', 15000, 'oil_change', 'Wymiana oleju', 'Rutynowa wymiana oleju i filtra', 250.00, w_mechanic),
(vehicle_id, '2025-01-15', 15200, 'inspection', 'Przegląd roczny', 'Pełny przegląd pojazdu', 150.00, w_mechanic),
(vehicle_id, '2025-01-22', 15350, 'repair', 'Wymiana klocków hamulcowych', 'Wymiana przednich klocków hamulcowych', 450.00, w_mechanic);

-- February 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-02-10', 15800, 'maintenance', 'Rotacja opon', 'Rotacja opon i kontrola ciśnienia', 80.00, w_tires),
(vehicle_id, '2025-02-18', 16000, 'upgrade', 'Reflektory LED', 'Wymiana na reflektory LED', 600.00, NULL);

-- March 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-03-08', 16500, 'maintenance', 'Wymiana filtra powietrza', 'Wymiana filtra powietrza silnika', 120.00, w_mechanic),
(vehicle_id, '2025-03-20', 16800, 'repair', 'Wymiana akumulatora', 'Wymiana akumulatora samochodowego', 380.00, w_mechanic),
(vehicle_id, '2025-03-25', 16900, 'other', 'Myjnia i detailing', 'Profesjonalne mycie i czyszczenie wnętrza', 150.00, w_detailer);

-- April 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-04-12', 17500, 'maintenance', 'Płukanie chłodnicy', 'Płukanie i napełnienie układu chłodzenia', 200.00, w_mechanic),
(vehicle_id, '2025-04-28', 17800, 'inspection', 'Przegląd przed sezonem letnim', 'Kontrola pojazdu przed latem', 100.00, w_mechanic);

-- May 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-05-05', 18200, 'oil_change', 'Wymiana oleju', 'Rutynowa wymiana oleju', 250.00, w_mechanic),
(vehicle_id, '2025-05-15', 18500, 'repair', 'Naprawa klimatyzacji', 'Naprawa sprężarki klimatyzacji', 850.00, w_mechanic),
(vehicle_id, '2025-05-22', 18700, 'upgrade', 'Modernizacja systemu audio', 'Montaż nowych głośników i wzmacniacza', 1200.00, w_audio);

-- June 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-06-10', 19200, 'maintenance', 'Wymiana płynu skrzyni biegów', 'Wymiana płynu w skrzyni biegów', 300.00, w_mechanic),
(vehicle_id, '2025-06-18', 19500, 'inspection', 'Kontrola bezpieczeństwa', 'Kontrola bezpieczeństwa i emisji spalin', 120.00, w_mechanic);

-- July 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-07-03', 20000, 'oil_change', 'Wymiana oleju', 'Rutynowa wymiana oleju', 250.00, w_mechanic),
(vehicle_id, '2025-07-12', 20300, 'repair', 'Ustawienie geometrii kół', 'Korekta ustawienia przednich kół', 150.00, w_tires),
(vehicle_id, '2025-07-25', 20600, 'other', 'Przyciemnianie szyb', 'Przyciemnianie tylnych szyb', 400.00, w_detailer);

-- August 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-08-08', 21200, 'maintenance', 'Wymiana świec zapłonowych', 'Wymiana wszystkich świec zapłonowych', 180.00, w_mechanic),
(vehicle_id, '2025-08-20', 21500, 'repair', 'Naprawa układu wydechowego', 'Wymiana tłumika', 550.00, w_mechanic);

-- September 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-09-05', 22000, 'oil_change', 'Wymiana oleju', 'Rutynowa wymiana oleju', 250.00, w_mechanic),
(vehicle_id, '2025-09-15', 22300, 'inspection', 'Przegląd przed zimą', 'Kontrola pojazdu przed sezonem zimowym', 150.00, w_mechanic),
(vehicle_id, '2025-09-22', 22500, 'maintenance', 'Kontrola akumulatora', 'Test akumulatora i czyszczenie zacisków', 50.00, w_mechanic);

-- October 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-10-10', 23000, 'repair', 'Wymiana wycieraczek', 'Montaż nowych piór wycieraczek', 60.00, NULL),
(vehicle_id, '2025-10-18', 23200, 'maintenance', 'Płukanie płynu hamulcowego', 'Płukanie układu hamulcowego', 200.00, w_mechanic),
(vehicle_id, '2025-10-28', 23500, 'upgrade', 'Opony zimowe', 'Zakup i montaż opon zimowych', 1200.00, w_tires);

-- November 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-11-05', 24000, 'oil_change', 'Wymiana oleju', 'Rutynowa wymiana oleju', 250.00, w_mechanic),
(vehicle_id, '2025-11-12', 24200, 'repair', 'Wymiana nagrzewnicy', 'Wymiana nagrzewnicy', 650.00, w_mechanic);

-- December 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-12-08', 24800, 'oil_change', 'Wymiana filtra paliwa', 'Wymiana filtra paliwa', 100.00, w_mechanic),
(vehicle_id, '2025-12-15', 25000, 'inspection', 'Serwis roczny', 'Kompleksowy serwis roczny', 500.00, w_mechanic),
(vehicle_id, '2025-12-22', 25100, 'other', 'Detailing świąteczny', 'Pełny detailing przed świętami', 200.00, w_detailer);

-- January 2026
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2026-01-05', 25500, 'oil_change', 'Wymiana oleju', 'Rutynowa wymiana oleju', 250.00, w_mechanic),
(vehicle_id, '2026-01-12', 25700, 'repair', 'Wymiana rozrusznika', 'Wymiana rozrusznika', 450.00, w_mechanic);

-- ================
-- FUELING ENTRIES
-- ================
-- Fueling entries for each month (varying frequency and amounts)

-- January 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type) VALUES
(vehicle_id, '2025-01-10', 380.2, 45.8, 238.20, '95'),
(vehicle_id, '2025-01-24', 390.5, 47.2, 245.80, '95');

-- February 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type) VALUES
(vehicle_id, '2025-02-14', 385.0, 46.5, 241.90, '98');

-- March 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type) VALUES
(vehicle_id, '2025-03-13', 380.0, 45.9, 239.00, '95'),
(vehicle_id, '2025-03-27', 390.0, 47.1, 245.20, '95');

-- April 2025
-- Brak tankowań w kwietniu

-- May 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type) VALUES
(vehicle_id, '2025-05-09', 380.3, 46.0, 239.50, 'on'),
(vehicle_id, '2025-05-23', 390.5, 47.2, 245.80, 'on');

-- June 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type) VALUES
(vehicle_id, '2025-06-13', 385.0, 46.5, 242.00, '100');

-- July 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type) VALUES
(vehicle_id, '2025-07-11', 380.8, 46.0, 239.60, '95'),
(vehicle_id, '2025-07-25', 390.0, 47.1, 245.00, 'lpg');

-- August 2025
-- Brak tankowań w sierpniu

-- September 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type) VALUES
(vehicle_id, '2025-09-12', 380.0, 45.9, 239.00, '95');

-- October 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type) VALUES
(vehicle_id, '2025-10-10', 385.8, 46.6, 242.60, '98'),
(vehicle_id, '2025-10-24', 395.0, 47.8, 248.80, '98');

-- November 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type) VALUES
(vehicle_id, '2025-11-14', 380.2, 46.0, 239.40, '95');

-- December 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type) VALUES
(vehicle_id, '2025-12-12', 385.0, 46.5, 242.00, '95'),
(vehicle_id, '2025-12-26', 395.5, 47.8, 248.80, '95');

-- January 2026
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type) VALUES
(vehicle_id, '2026-01-09', 380.8, 46.0, 239.60, '95');

-- ================
-- REMINDERS (new format: date and/or mileage; optional recurrence; no type)
-- ================
-- Columns: vehicle_id, due_date?, due_mileage?, days_before?, title, notes?, status,
--   recurrence_interval_value?, recurrence_interval_unit?, recurrence_interval_km?, recurrence_anchor_mileage?
-- Constraint: at least one of due_date, due_mileage must be set.

-- Time-only (one-off)
INSERT INTO public.reminders (vehicle_id, due_date, days_before, title, notes, status) VALUES
(vehicle_id, '2025-02-15', 7, 'Wymiana oleju', 'Następna wymiana oleju zaplanowana', 'done'),
(vehicle_id, '2025-04-01', 14, 'Przegląd wiosenny', 'Roczny przegląd pojazdu wiosenny', 'done'),
(vehicle_id, '2025-06-10', 7, 'Serwis klimatyzacji', 'Kontrola klimatyzacji przed latem', 'done'),
(vehicle_id, '2025-09-01', 14, 'Przegląd przed zimą', 'Przygotowanie pojazdu na sezon zimowy', 'done'),
(vehicle_id, '2025-12-20', 7, 'Serwis świąteczny', 'Serwis przed podróżą świąteczną', 'done');

-- Time recurring (e.g. every 6 months)
INSERT INTO public.reminders (vehicle_id, due_date, days_before, title, notes, status, recurrence_interval_value, recurrence_interval_unit) VALUES
(vehicle_id, '2026-02-01', 14, 'Przegląd roczny', 'Roczny kompleksowy przegląd', 'active', 6, 'months'),
(vehicle_id, '2026-03-15', 7, 'Konserwacja wiosenna', 'Kontrola konserwacyjna wiosenna', 'active', 3, 'months'),
(vehicle_id, '2026-05-01', 14, 'Przygotowanie na lato', 'Przygotowanie pojazdu na lato', 'active', 12, 'months');

-- Mileage-only (one-off): anchor = od którego km liczymy, due_mileage = docelowy przebieg
INSERT INTO public.reminders (vehicle_id, due_mileage, recurrence_anchor_mileage, title, notes, status) VALUES
(vehicle_id, 20000, 15000, 'Serwis główny', 'Główny serwis przy 20 000 km', 'done'),
(vehicle_id, 25000, 20000, 'Serwis skrzyni biegów', 'Serwis skrzyni biegów przy 25 000 km', 'done');

-- Mileage recurring (e.g. every 10000 km): anchor + due_mileage + recurrence_interval_km
INSERT INTO public.reminders (vehicle_id, due_mileage, recurrence_anchor_mileage, recurrence_interval_km, title, notes, status) VALUES
(vehicle_id, 30000, 20000, 10000, 'Serwis główny', 'Główny serwis co 10 000 km', 'active'),
(vehicle_id, 35000, 25000, 10000, 'Kontrola paska rozrządu', 'Kontrola paska rozrządu przy 35 000 km', 'active'),
(vehicle_id, 40000, 30000, 10000, 'Serwis główny', 'Serwis główny przy 40 000 km', 'active');

-- Combined: date + mileage (e.g. oil change every 12 months or 8000 km)
INSERT INTO public.reminders (vehicle_id, due_date, due_mileage, days_before, recurrence_interval_value, recurrence_interval_unit, recurrence_interval_km, recurrence_anchor_mileage, title, notes, status) VALUES
(vehicle_id, '2026-06-01', 128000, 7, 12, 'months', 8000, 120000, 'Wymiana oleju silnikowego', 'Co 12 miesięcy lub co 8000 km', 'active');

-- ================
-- VEHICLE TIRES (opony)
-- ================
-- tire_type: summer, winter, all_season, run_flat, uhp, suv_xl
-- One tire fitted (is_currently_fitted=true), the rest in stock
INSERT INTO public.tires (vehicle_id, name, width_mm, aspect_ratio, diameter_inch, tire_type, dot, is_currently_fitted) VALUES
(vehicle_id, 'Goodyear Eagle F1', 205, 55, 16, 'summer', '2423', true),
(vehicle_id, 'Michelin Alpin 6', 205, 55, 16, 'winter', '2322', false),
(vehicle_id, 'Continental PremiumContact', 205, 55, 16, 'all_season', '2424', false);

-- ================
-- VEHICLE WHEELS (felgi)
-- ================
-- One wheel fitted (is_currently_fitted=true)
INSERT INTO public.wheels (vehicle_id, name, width_inch, diameter_inch, et_offset, bolt_pattern, center_bore_mm, bolt_type, weight_kg, is_currently_fitted) VALUES
(vehicle_id, 'Aluminiowe OEM', 7, 16, 45, '5x112', 66.5, 'M14x1.5', 10.2, true),
(vehicle_id, 'Felgi stalowe zimowe', 7, 16, 45, '5x112', 66.5, 'M14x1.5', 12.5, false),
(vehicle_id, 'Felgi aluminiowe letnie', 7, 16, 45, '5x112', 66.5, 'M14x1.5', 10.2, false);

END $$;
