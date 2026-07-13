-- Usage: Ustaw vehicle_id, seed_base_mileage oraz seed_history_months.
--        Wpisy serwisowe, tankowania i przypomnienia są liczone względem CURRENT_DATE:
--        od (dziś − seed_history_months) do (dziś − 7 dni) – z zachowaniem proporcji oryginalnego szablonu.
--        Np. seed_base_mileage = 78 200 → ostatni serwis ~88 900 km.

-- ================
-- CONFIGURATION
-- ================
DO $$
DECLARE
  vehicle_id uuid := 'b0000001-0000-4000-8000-000000000001'::uuid;
  -- Odczyt licznika przy pierwszym wpisie serwisowym w oknie historycznym:
  seed_base_mileage integer := 78200;
  -- Ile miesięcy wstecz od dziś rozciąga się historia (serwis, paliwo, przypomnienia „done”):
  seed_history_months integer := 13;
  v_owner_id uuid;
  w_mechanic uuid;
  w_detailer uuid;
  w_opony uuid;
  w_elektryk uuid;
  w_blacharz uuid;
  w_mycie uuid;
  m0 integer;
  v_today date := CURRENT_DATE;
  v_history_end date;
  v_history_start date;
  v_orig_span integer := 373; -- oryginalny szablon: 2025-01-05 … 2026-01-12
BEGIN
  m0 := seed_base_mileage;
  v_history_end := v_today - 7;
  v_history_start := (v_today - make_interval(months => seed_history_months))::date;

  SELECT owner_id INTO v_owner_id FROM public.vehicles WHERE id = vehicle_id;
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Vehicle not found. Replace vehicle_id with a valid vehicle UUID.';
  END IF;

  IF seed_base_mileage < 0 THEN
    RAISE EXCEPTION 'seed_base_mileage must be >= 0.';
  END IF;

  IF seed_history_months < 1 THEN
    RAISE EXCEPTION 'seed_history_months must be >= 1.';
  END IF;

  IF v_history_start >= v_history_end THEN
    RAISE EXCEPTION 'seed_history_months too small – history window must span at least 7 days.';
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
-- SERVICE ENTRIES
-- off_days = offset od początku oryginalnego szablonu (2025-01-05); przebieg = m0 + km_offset
-- ================
INSERT INTO public.service_entries (
  vehicle_id, service_date, mileage, category, title, description, cost, workshop_id
)
SELECT
  vehicle_id,
  v_history_start + ((s.off_days * (v_history_end - v_history_start)) / v_orig_span),
  m0 + s.km_offset,
  s.category,
  s.title,
  s.description,
  s.cost,
  CASE s.workshop
    WHEN 'mechanic' THEN w_mechanic
    WHEN 'detailer' THEN w_detailer
    WHEN 'opony' THEN w_opony
    WHEN 'elektryk' THEN w_elektryk
    WHEN 'blacharz' THEN w_blacharz
    WHEN 'mycie' THEN w_mycie
    ELSE NULL
  END
FROM (
  VALUES
    (0, 0, 'oil_change', 'Wymiana oleju i filtra', 'Olej syntetyczny 5W-30, filtr oleju', 280.00, 'mechanic'),
    (10, 200, 'inspection', 'Przegląd okresowy', 'Kontrola stanu technicznego, płyn eksploatacyjny', 149.00, 'mechanic'),
    (17, 350, 'repair', 'Klocki hamulcowe przód', 'Wymiana klocków, pomiar tarcz', 520.00, 'mechanic'),
    (36, 800, 'maintenance', 'Przestrojenie kół', 'Rotacja osi, kontrola ciśnienia', 90.00, 'opony'),
    (44, 1000, 'upgrade', 'Żarówki LED reflektorów', 'Montaż zestawu LED z homologacją', 650.00, NULL),
    (63, 1500, 'maintenance', 'Filtr powietrza silnika', 'Wymiana filtra powietrza', 135.00, 'mechanic'),
    (75, 1800, 'repair', 'Wymiana akumulatora', 'Akumulator 70 Ah, test alternatora', 420.00, 'mechanic'),
    (80, 1900, 'other', 'Mycie ręczne + odkurzacz', 'Program podstawowy myjni', 85.00, 'mycie'),
    (98, 2500, 'maintenance', 'Płyn chłodniczy', 'Spuszczanie, płukanie, uzupełnienie', 220.00, 'mechanic'),
    (114, 2800, 'inspection', 'Kontrola przed sezonem letnim', 'Klimatyzacja, paski osprzętu', 110.00, 'mechanic'),
    (121, 3200, 'oil_change', 'Wymiana oleju', 'Olej + filtr', 270.00, 'mechanic'),
    (131, 3500, 'repair', 'Naprawa klimatyzacji', 'Uzupełnienie czynnika, test szczelności', 890.00, 'mechanic'),
    (138, 3700, 'upgrade', 'Lakier punktowy drzwi', 'Usuwanie rys po parkingu', 420.00, 'blacharz'),
    (157, 4200, 'maintenance', 'Olej w skrzyni biegów', 'Wymiana oleju MTF', 320.00, 'mechanic'),
    (165, 4500, 'inspection', 'Badanie techniczne / przegląd', 'Stacja diagnostyczna', 99.00, 'mechanic'),
    (180, 5000, 'oil_change', 'Wymiana oleju', 'Interwałowy serwis olejowy', 265.00, 'mechanic'),
    (189, 5300, 'repair', 'Geometria kół', 'Pomiar i regulacja zbieżności', 160.00, 'opony'),
    (202, 5600, 'other', 'Przyciemnienie szyb tylnych', 'Folia z certyfikatem', 450.00, 'detailer'),
    (216, 6200, 'maintenance', 'Świece zapłonowe', 'Komplet 4 szt., regulacja luzu', 195.00, 'mechanic'),
    (228, 6500, 'repair', 'Tłumik końcowy', 'Wymiana końcówki + uszczelki', 580.00, 'mechanic'),
    (244, 7000, 'oil_change', 'Wymiana oleju', 'Olej + filtr oleju', 270.00, 'mechanic'),
    (254, 7300, 'inspection', 'Przegląd przed zimą', 'Płyn hamulcowy, oświetlenie', 160.00, 'mechanic'),
    (261, 7500, 'maintenance', 'Test akumulatora', 'Pomiar obciążeniowy, czyszczenie klemm', 0.00, 'mechanic'),
    (279, 8000, 'repair', 'Wycieraczki przód + tył', 'Komplet refilów', 75.00, NULL),
    (287, 8200, 'maintenance', 'Płyn hamulcowy', 'Wymiana DOT4, odpowietrzenie', 210.00, 'mechanic'),
    (297, 8500, 'upgrade', 'Opony zimowe + montaż', 'Komplet 4 szt., balans', 1280.00, 'opony'),
    (305, 9000, 'oil_change', 'Wymiana oleju', 'Olej + filtr', 275.00, 'mechanic'),
    (312, 9200, 'repair', 'Nagrzewnica – nieszczelność', 'Demontaż kokpitu, wymiana nagrzewnicy', 720.00, 'mechanic'),
    (338, 9800, 'maintenance', 'Filtr paliwa', 'Wymiana filtra paliwa', 110.00, 'mechanic'),
    (345, 10000, 'inspection', 'Serwis roczny', 'Pakiet: olej, filtry, przegląd zawieszenia', 520.00, 'mechanic'),
    (352, 10100, 'other', 'Detailing przedświąteczny', 'Mycie detailingowe + wosk', 220.00, 'detailer'),
    (366, 10500, 'oil_change', 'Wymiana oleju', 'Interwał zgodny z książką', 280.00, 'mechanic'),
    (373, 10700, 'repair', 'Rozrusznik – regeneracja', 'Demontaż, szczotki, test', 480.00, 'elektryk')
) AS s(off_days, km_offset, category, title, description, cost, workshop);

-- ================
-- FUELING ENTRIES
-- ================
INSERT INTO public.fueling_entries (
  vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type, gas_station
)
SELECT
  vehicle_id,
  v_history_start + ((f.off_days * (v_history_end - v_history_start)) / v_orig_span),
  f.distance,
  f.fuel_amount,
  f.fuel_cost,
  f.fuel_type,
  f.gas_station
FROM (
  VALUES
    (5, 380.2, 45.8, 268.20, '95', 'shell'),
    (19, 390.5, 47.2, 276.80, '95', 'bp'),
    (40, 385.0, 46.5, 272.90, '98', 'shell'),
    (68, 380.0, 45.9, 269.00, '95', 'circle_k'),
    (82, 390.0, 47.1, 275.20, '95', 'orlen'),
    (125, 380.3, 46.0, 269.50, 'on', 'other'),
    (139, 390.5, 47.2, 275.80, 'on', 'shell'),
    (160, 385.0, 46.5, 272.00, '100', 'shell'),
    (188, 380.8, 46.0, 269.60, '95', 'bp'),
    (202, 390.0, 47.1, 275.00, 'lpg', 'other'),
    (252, 380.0, 45.9, 269.00, '95', 'circle_k'),
    (280, 385.8, 46.6, 272.60, '98', 'orlen'),
    (294, 395.0, 47.8, 278.80, '98', 'shell'),
    (315, 380.2, 46.0, 269.40, '95', 'other'),
    (343, 385.0, 46.5, 272.00, '95', 'shell'),
    (357, 395.5, 47.8, 278.80, '95', 'bp'),
    (370, 380.8, 46.0, 269.60, '95', 'circle_k')
) AS f(off_days, distance, fuel_amount, fuel_cost, fuel_type, gas_station);

-- ================
-- REMINDERS
-- done: daty w oknie historycznym; active: due_date w przyszłości od dziś
-- ================
INSERT INTO public.reminders (vehicle_id, due_date, days_before, title, notes, status)
SELECT
  vehicle_id,
  v_history_start + ((r.off_days * (v_history_end - v_history_start)) / v_orig_span),
  r.days_before,
  r.title,
  r.notes,
  r.status
FROM (
  VALUES
    (41, 7, 'Wymiana oleju', 'Zrealizowane w warsztacie', 'done'),
    (86, 14, 'Przegląd wiosenny', 'Kontrola po zimie', 'done'),
    (157, 7, 'Serwis klimatyzacji', 'Sprawdzenie przed latem', 'done'),
    (240, 14, 'Przegląd przed zimą', 'Opony, płyny', 'done'),
    (350, 7, 'Serwis przed świętami', 'Pakiet kontrolny', 'done')
) AS r(off_days, days_before, title, notes, status);

INSERT INTO public.reminders (
  vehicle_id, due_date, days_before, title, notes, status,
  recurrence_interval_value, recurrence_interval_unit
)
VALUES
(
  vehicle_id,
  (v_today + make_interval(months => 1))::date,
  14,
  'Przegląd techniczny',
  'Coroczny przegląd',
  'active',
  12,
  'months'
),
(
  vehicle_id,
  (v_today + make_interval(months => 2))::date,
  7,
  'Przegląd wiosenny',
  'Po sezonie zimowym',
  'active',
  3,
  'months'
),
(
  vehicle_id,
  (v_today + make_interval(months => 4))::date,
  14,
  'Przygotowanie do lata',
  'Klimatyzacja, opony',
  'active',
  12,
  'months'
);

INSERT INTO public.reminders (vehicle_id, due_mileage, recurrence_anchor_mileage, title, notes, status) VALUES
(vehicle_id, m0 + 5000, m0 + 0, 'Serwis rozrządu / większy', 'Zaplanowany przy +5000 km od bazy', 'done'),
(vehicle_id, m0 + 8000, m0 + 5000, 'Wymiana płynu hamulcowego', 'Wykonane w ramach przeglądu', 'done');

INSERT INTO public.reminders (
  vehicle_id, due_mileage, recurrence_anchor_mileage, recurrence_interval_km,
  title, notes, status
) VALUES
(vehicle_id, m0 + 15000, m0 + 5000, 10000, 'Przegląd duży (interwał km)', 'Co 10 000 km od kotwicy', 'active'),
(vehicle_id, m0 + 18000, m0 + 8000, 10000, 'Kontrola rozrządu', 'Czujność na hałas i zużycie', 'active'),
(vehicle_id, m0 + 21000, m0 + 10700, 10000, 'Kolejny duży serwis', 'Po ostatnim wpisie serwisowym', 'active');

INSERT INTO public.reminders (
  vehicle_id, due_date, due_mileage, days_before,
  recurrence_interval_value, recurrence_interval_unit, recurrence_interval_km, recurrence_anchor_mileage,
  title, notes, status
) VALUES (
  vehicle_id,
  (v_today + make_interval(months => 6))::date,
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
INSERT INTO public.mileage_audit (vehicle_id, reading_date, mileage, source)
SELECT
  vehicle_id,
  v_history_start + ((a.off_days * (v_history_end - v_history_start)) / v_orig_span),
  m0 + a.km_offset,
  'profile'
FROM (
  VALUES
    (0, 0),
    (90, 2400),
    (185, 5100),
    (273, 8100),
    (373, 10700)
) AS a(off_days, km_offset);

-- ================
-- SYNC VEHICLE ODOMETER (zgodny z ostatnim serwisem)
-- ================
  UPDATE public.vehicles
  SET
    mileage = m0 + 10700,
    initial_mileage = GREATEST(0, m0 - 4000),
    mileage_updated_at = v_history_end
  WHERE id = vehicle_id;

END $$;
