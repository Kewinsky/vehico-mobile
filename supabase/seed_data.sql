-- Usage: Ustaw vehicle_id oraz seed_base_mileage (licznik km przy pierwszym serwisie w 2025-01),
--        tak aby końcowy przebieg (ok. seed_base_mileage + 10 700 km) miał sens dla auta.
--        Np. seed_base_mileage = 145 000 → ostatni serwis ~155 700 km.

-- ================
-- CONFIGURATION
-- ================
DO $$
DECLARE
  vehicle_id uuid := 'YOUR_VEHICLE_ID_HERE'::uuid;
  -- Odczyt licznika przy pierwszym wpisie serwisowym (baseline = dawniej 15 000 km w szablonie):
  seed_base_mileage integer := 78200;
  v_owner_id uuid;
  w_mechanic uuid;
  w_detailer uuid;
  w_opony uuid;
  w_elektryk uuid;
  w_blacharz uuid;
  w_mycie uuid;
  m0 integer; -- skrót: seed_base_mileage
BEGIN
  m0 := seed_base_mileage;

  SELECT owner_id INTO v_owner_id FROM public.vehicles WHERE id = vehicle_id;
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Vehicle not found. Replace YOUR_VEHICLE_ID_HERE with valid vehicle UUID.';
  END IF;

  IF seed_base_mileage < 0 THEN
    RAISE EXCEPTION 'seed_base_mileage must be >= 0.';
  END IF;

-- ================
-- WORKSHOPS (PL: nazwy, adresy, numery – fikcyjne)
-- ================
-- workshop_type: mechanic, electrician, detailer, bodywork, car_wash, other
INSERT INTO public.workshops (owner_id, name, workshop_type, phone_number, address) VALUES
(v_owner_id, 'Warsztat „Pod Kopytem”', 'mechanic', '+48 22 847 39 21', 'ul. Grochowska 118, 04-301 Warszawa')
RETURNING id INTO w_mechanic;

INSERT INTO public.workshops (owner_id, name, workshop_type, phone_number, address) VALUES
(v_owner_id, 'Studio Detailingu Lumen', 'detailer', '+48 12 634 08 55', 'al. Kijowska 14, 30-079 Kraków')
RETURNING id INTO w_detailer;

INSERT INTO public.workshops (owner_id, name, workshop_type, phone_number, address) VALUES
(v_owner_id, 'Opony i Felgi – Mariusz K.', 'other', '+48 61 902 44 17', 'ul. Głogowska 256, 60-111 Poznań')
RETURNING id INTO w_opony;

INSERT INTO public.workshops (owner_id, name, workshop_type, phone_number, address) VALUES
(v_owner_id, 'Auto-Elektryk Serwis 12V', 'electrician', '+48 58 771 03 92', 'ul. Kartuska 302, 80-125 Gdańsk')
RETURNING id INTO w_elektryk;

INSERT INTO public.workshops (owner_id, name, workshop_type, phone_number, address) VALUES
(v_owner_id, 'Blacharnia Lakiernia „Prosto”', 'bodywork', '+48 71 358 66 04', 'ul. Legnicka 54, 54-204 Wrocław')
RETURNING id INTO w_blacharz;

INSERT INTO public.workshops (owner_id, name, workshop_type, phone_number, address) VALUES
(v_owner_id, 'Myjnia Bezdotykowa Błysk', 'car_wash', '+48 42 219 88 73', 'ul. Piotrkowska 277, 90-361 Łódź')
RETURNING id INTO w_mycie;

-- ================
-- SERVICE ENTRIES (przebieg: m0 + offset od oryginalnego 15 000 km)
-- ================
-- January 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-01-05', m0 + 0, 'oil_change', 'Wymiana oleju i filtra', 'Olej syntetyczny 5W-30, filtr oleju', 280.00, w_mechanic),
(vehicle_id, '2025-01-15', m0 + 200, 'inspection', 'Przegląd okresowy', 'Kontrola stanu technicznego, płyn eksploatacyjny', 149.00, w_mechanic),
(vehicle_id, '2025-01-22', m0 + 350, 'repair', 'Klocki hamulcowe przód', 'Wymiana klocków, pomiar tarcz', 520.00, w_mechanic);

-- February 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-02-10', m0 + 800, 'maintenance', 'Przestrojenie kół', 'Rotacja osi, kontrola ciśnienia', 90.00, w_opony),
(vehicle_id, '2025-02-18', m0 + 1000, 'upgrade', 'Żarówki LED reflektorów', 'Montaż zestawu LED z homologacją', 650.00, NULL);

-- March 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-03-08', m0 + 1500, 'maintenance', 'Filtr powietrza silnika', 'Wymiana filtra powietrza', 135.00, w_mechanic),
(vehicle_id, '2025-03-20', m0 + 1800, 'repair', 'Wymiana akumulatora', 'Akumulator 70 Ah, test alternatora', 420.00, w_mechanic),
(vehicle_id, '2025-03-25', m0 + 1900, 'other', 'Mycie ręczne + odkurzacz', 'Program podstawowy myjni', 85.00, w_mycie);

-- April 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-04-12', m0 + 2500, 'maintenance', 'Płyn chłodniczy', 'Spuszczanie, płukanie, uzupełnienie', 220.00, w_mechanic),
(vehicle_id, '2025-04-28', m0 + 2800, 'inspection', 'Kontrola przed sezonem letnim', 'Klimatyzacja, paski osprzętu', 110.00, w_mechanic);

-- May 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-05-05', m0 + 3200, 'oil_change', 'Wymiana oleju', 'Olej + filtr', 270.00, w_mechanic),
(vehicle_id, '2025-05-15', m0 + 3500, 'repair', 'Naprawa klimatyzacji', 'Uzupełnienie czynnika, test szczelności', 890.00, w_mechanic),
(vehicle_id, '2025-05-22', m0 + 3700, 'upgrade', 'Lakier punktowy drzwi', 'Usuwanie rys po parkingu', 420.00, w_blacharz);

-- June 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-06-10', m0 + 4200, 'maintenance', 'Olej w skrzyni biegów', 'Wymiana oleju MTF', 320.00, w_mechanic),
(vehicle_id, '2025-06-18', m0 + 4500, 'inspection', 'Badanie techniczne / przegląd', 'Stacja diagnostyczna', 99.00, w_mechanic);

-- July 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-07-03', m0 + 5000, 'oil_change', 'Wymiana oleju', 'Interwałowy serwis olejowy', 265.00, w_mechanic),
(vehicle_id, '2025-07-12', m0 + 5300, 'repair', 'Geometria kół', 'Pomiar i regulacja zbieżności', 160.00, w_opony),
(vehicle_id, '2025-07-25', m0 + 5600, 'other', 'Przyciemnienie szyb tylnych', 'Folia z certyfikatem', 450.00, w_detailer);

-- August 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-08-08', m0 + 6200, 'maintenance', 'Świece zapłonowe', 'Komplet 4 szt., regulacja luzu', 195.00, w_mechanic),
(vehicle_id, '2025-08-20', m0 + 6500, 'repair', 'Tłumik końcowy', 'Wymiana końcówki + uszczelki', 580.00, w_mechanic);

-- September 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-09-05', m0 + 7000, 'oil_change', 'Wymiana oleju', 'Olej + filtr oleju', 270.00, w_mechanic),
(vehicle_id, '2025-09-15', m0 + 7300, 'inspection', 'Przegląd przed zimą', 'Płyn hamulcowy, oświetlenie', 160.00, w_mechanic),
(vehicle_id, '2025-09-22', m0 + 7500, 'maintenance', 'Test akumulatora', 'Pomiar obciążeniowy, czyszczenie klemm', 0.00, w_mechanic);

-- October 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-10-10', m0 + 8000, 'repair', 'Wycieraczki przód + tył', 'Komplet refilów', 75.00, NULL),
(vehicle_id, '2025-10-18', m0 + 8200, 'maintenance', 'Płyn hamulcowy', 'Wymiana DOT4, odpowietrzenie', 210.00, w_mechanic),
(vehicle_id, '2025-10-28', m0 + 8500, 'upgrade', 'Opony zimowe + montaż', 'Komplet 4 szt., balans', 1280.00, w_opony);

-- November 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-11-05', m0 + 9000, 'oil_change', 'Wymiana oleju', 'Olej + filtr', 275.00, w_mechanic),
(vehicle_id, '2025-11-12', m0 + 9200, 'repair', 'Nagrzewnica – nieszczelność', 'Demontaż kokpitu, wymiana nagrzewnicy', 720.00, w_mechanic);

-- December 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-12-08', m0 + 9800, 'maintenance', 'Filtr paliwa', 'Wymiana filtra paliwa', 110.00, w_mechanic),
(vehicle_id, '2025-12-15', m0 + 10000, 'inspection', 'Serwis roczny', 'Pakiet: olej, filtry, przegląd zawieszenia', 520.00, w_mechanic),
(vehicle_id, '2025-12-22', m0 + 10100, 'other', 'Detailing przedświąteczny', 'Mycie detailingowe + wosk', 220.00, w_detailer);

-- January 2026
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2026-01-05', m0 + 10500, 'oil_change', 'Wymiana oleju', 'Interwał zgodny z książką', 280.00, w_mechanic),
(vehicle_id, '2026-01-12', m0 + 10700, 'repair', 'Rozrusznik – regeneracja', 'Demontaż, szczotki, test', 480.00, w_elektryk);

-- ================
-- FUELING ENTRIES (odległości między tankowaniami ~380 km, sensowne dla PL)
-- ================
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type, gas_station) VALUES
(vehicle_id, '2025-01-10', 380.2, 45.8, 268.20, '95', 'shell'),
(vehicle_id, '2025-01-24', 390.5, 47.2, 276.80, '95', 'bp');

INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type, gas_station) VALUES
(vehicle_id, '2025-02-14', 385.0, 46.5, 272.90, '98', 'shell');

INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type, gas_station) VALUES
(vehicle_id, '2025-03-13', 380.0, 45.9, 269.00, '95', 'circle_k'),
(vehicle_id, '2025-03-27', 390.0, 47.1, 275.20, '95', 'orlen');

INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type, gas_station) VALUES
(vehicle_id, '2025-05-09', 380.3, 46.0, 269.50, 'on', 'other'),
(vehicle_id, '2025-05-23', 390.5, 47.2, 275.80, 'on', 'shell');

INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type, gas_station) VALUES
(vehicle_id, '2025-06-13', 385.0, 46.5, 272.00, '100', 'shell');

INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type, gas_station) VALUES
(vehicle_id, '2025-07-11', 380.8, 46.0, 269.60, '95', 'bp'),
(vehicle_id, '2025-07-25', 390.0, 47.1, 275.00, 'lpg', 'other');

INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type, gas_station) VALUES
(vehicle_id, '2025-09-12', 380.0, 45.9, 269.00, '95', 'circle_k');

INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type, gas_station) VALUES
(vehicle_id, '2025-10-10', 385.8, 46.6, 272.60, '98', 'orlen'),
(vehicle_id, '2025-10-24', 395.0, 47.8, 278.80, '98', 'shell');

INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type, gas_station) VALUES
(vehicle_id, '2025-11-14', 380.2, 46.0, 269.40, '95', 'other');

INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type, gas_station) VALUES
(vehicle_id, '2025-12-12', 385.0, 46.5, 272.00, '95', 'shell'),
(vehicle_id, '2025-12-26', 395.5, 47.8, 278.80, '95', 'bp');

INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type, gas_station) VALUES
(vehicle_id, '2026-01-09', 380.8, 46.0, 269.60, '95', 'circle_k');

-- ================
-- REMINDERS (spójne z progresją m0 … m0+10700; opisy PL)
-- ================
INSERT INTO public.reminders (vehicle_id, due_date, days_before, title, notes, status) VALUES
(vehicle_id, '2025-02-15', 7, 'Wymiana oleju', 'Zrealizowane w warsztacie', 'done'),
(vehicle_id, '2025-04-01', 14, 'Przegląd wiosenny', 'Kontrola po zimie', 'done'),
(vehicle_id, '2025-06-10', 7, 'Serwis klimatyzacji', 'Sprawdzenie przed latem', 'done'),
(vehicle_id, '2025-09-01', 14, 'Przegląd przed zimą', 'Opony, płyny', 'done'),
(vehicle_id, '2025-12-20', 7, 'Serwis przed świętami', 'Pakiet kontrolny', 'done');

INSERT INTO public.reminders (vehicle_id, due_date, days_before, title, notes, status, recurrence_interval_value, recurrence_interval_unit) VALUES
(vehicle_id, '2026-02-01', 14, 'Przegląd techniczny', 'Coroczny przegląd', 'active', 12, 'months'),
(vehicle_id, '2026-03-15', 7, 'Przegląd wiosenny', 'Po sezonie zimowym', 'active', 3, 'months'),
(vehicle_id, '2026-05-01', 14, 'Przygotowanie do lata', 'Klimatyzacja, opony', 'active', 12, 'months');

INSERT INTO public.reminders (vehicle_id, due_mileage, recurrence_anchor_mileage, title, notes, status) VALUES
(vehicle_id, m0 + 5000, m0 + 0, 'Serwis rozrządu / większy', 'Zaplanowany przy +5000 km od bazy', 'done'),
(vehicle_id, m0 + 8000, m0 + 5000, 'Wymiana płynu hamulcowego', 'Wykonane w ramach przeglądu', 'done');

INSERT INTO public.reminders (vehicle_id, due_mileage, recurrence_anchor_mileage, recurrence_interval_km, title, notes, status) VALUES
(vehicle_id, m0 + 15000, m0 + 5000, 10000, 'Przegląd duży (interwał km)', 'Co 10 000 km od kotwicy', 'active'),
(vehicle_id, m0 + 18000, m0 + 8000, 10000, 'Kontrola rozrządu', 'Czujność na hałas i zużycie', 'active'),
(vehicle_id, m0 + 21000, m0 + 10700, 10000, 'Kolejny duży serwis', 'Po ostatnim wpisie serwisowym', 'active');

INSERT INTO public.reminders (
  vehicle_id, due_date, due_mileage, days_before,
  recurrence_interval_value, recurrence_interval_unit, recurrence_interval_km, recurrence_anchor_mileage,
  title, notes, status
) VALUES
(
  vehicle_id,
  '2026-07-01',
  m0 + 11500,
  7,
  12,
  'months',
  8000,
  m0 + 10700,
  'Olej silnikowy',
  'Co 12 miesięcy lub 8 000 km (od bieżącego licznika)',
  'active'
);

-- ================
-- VEHICLE TIRES
-- ================
INSERT INTO public.tires (vehicle_id, name, width_mm, aspect_ratio, diameter_inch, tire_type, dot, is_currently_fitted) VALUES
(vehicle_id, 'Goodyear Eagle F1', 205, 55, 16, 'summer', '2423', true),
(vehicle_id, 'Michelin Alpin 6', 205, 55, 16, 'winter', '2322', false),
(vehicle_id, 'Continental PremiumContact', 205, 55, 16, 'all_season', '2424', false);

-- ================
-- VEHICLE WHEELS
-- ================
INSERT INTO public.wheels (vehicle_id, name, width_inch, diameter_inch, et_offset, bolt_pattern, center_bore_mm, bolt_type, weight_kg, is_currently_fitted) VALUES
(vehicle_id, 'OEM alloy', 7, 16, 45, '5x112', 66.5, 'M14x1.5', 10.2, true),
(vehicle_id, 'Felgi stalowe zimowe', 7, 16, 45, '5x112', 66.5, 'M14x1.5', 12.5, false),
(vehicle_id, 'Felgi aluminiowe letnie', 7, 16, 45, '5x112', 66.5, 'M14x1.5', 10.2, false);

-- ================
-- MILEAGE AUDIT (ręczne aktualizacje licznika z profilu – bez wpisu serwisowego)
-- ================
INSERT INTO public.mileage_audit (vehicle_id, reading_date, mileage, source) VALUES
(vehicle_id, '2025-01-02', m0, 'profile'),
(vehicle_id, '2025-04-05', m0 + 2400, 'profile'),
(vehicle_id, '2025-07-08', m0 + 5100, 'profile'),
(vehicle_id, '2025-10-03', m0 + 8100, 'profile'),
(vehicle_id, '2026-01-12', m0 + 10700, 'profile');

-- ================
-- SYNC VEHICLE ODOMETER (zgodny z ostatnim serwisem)
-- ================
  UPDATE public.vehicles
  SET
    mileage = m0 + 10700,
    initial_mileage = GREATEST(0, m0 - 4000),
    mileage_updated_at = '2026-01-12'
  WHERE id = vehicle_id;

END $$;
