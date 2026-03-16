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
  w_electrician uuid;
  w_bodywork uuid;
  w_car_wash uuid;
BEGIN
  -- Get owner_id from vehicle (workshops are per user)
  SELECT owner_id INTO v_owner_id FROM public.vehicles WHERE id = vehicle_id;
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Vehicle not found. Replace YOUR_VEHICLE_ID_HERE with valid vehicle UUID.';
  END IF;

-- ================
-- WORKSHOPS
-- ================
-- workshop_type: mechanic, electrician, detailer, bodywork, car_wash, other
INSERT INTO public.workshops (owner_id, name, workshop_type, phone_number, address) VALUES
(v_owner_id, 'Kowalski Auto Service', 'mechanic', '+1 555 123 4567', '123 Motor Ave, New York, NY 10001')
RETURNING id INTO w_mechanic;

INSERT INTO public.workshops (owner_id, name, workshop_type, phone_number, address) VALUES
(v_owner_id, 'Detailing Pro', 'detailer', '+1 555 987 6543', '456 Clean St, New York, NY 10002')
RETURNING id INTO w_detailer;

INSERT INTO public.workshops (owner_id, name, workshop_type, phone_number, address) VALUES
(v_owner_id, 'Car Audio Center', 'other', '+1 555 555 1234', '789 Sound Blvd, New York, NY 10003')
RETURNING id INTO w_audio;

INSERT INTO public.workshops (owner_id, name, workshop_type, phone_number, address) VALUES
(v_owner_id, 'Tires & Wheels Max', 'car_wash', '+1 555 444 7788', '321 Tire Lane, New York, NY 10004')
RETURNING id INTO w_tires;

INSERT INTO public.workshops (owner_id, name, workshop_type, phone_number, address) VALUES
(v_owner_id, 'Auto Electrics Expert', 'electrician', '+1 555 777 1122', '12 Volt St, New York, NY 10005')
RETURNING id INTO w_electrician;

INSERT INTO public.workshops (owner_id, name, workshop_type, phone_number, address) VALUES
(v_owner_id, 'Body & Paint Studio', 'bodywork', '+1 555 888 3344', '98 Panel Rd, New York, NY 10006')
RETURNING id INTO w_bodywork;

INSERT INTO public.workshops (owner_id, name, workshop_type, phone_number, address) VALUES
(v_owner_id, 'Sparkle Wash Station', 'car_wash', '+1 555 999 5566', '55 Foam Ave, New York, NY 10007')
RETURNING id INTO w_car_wash;

-- ================
-- SERVICE ENTRIES
-- ================
-- Service entries for each month (2025-01 to 2026-01)
-- Categories: maintenance, oil_change, repair, inspection, upgrade, other
-- Varying quantities per month

-- January 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-01-05', 15000, 'oil_change', 'Oil change', 'Routine oil and filter change', 250.00, w_mechanic),
(vehicle_id, '2025-01-15', 15200, 'inspection', 'Annual inspection', 'Full vehicle inspection', 150.00, w_mechanic),
(vehicle_id, '2025-01-22', 15350, 'repair', 'Brake pad replacement', 'Front brake pads replaced', 450.00, w_mechanic);

-- February 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-02-10', 15800, 'maintenance', 'Tire rotation', 'Tire rotation and pressure check', 80.00, w_tires),
(vehicle_id, '2025-02-18', 16000, 'upgrade', 'LED headlights', 'Upgrade to LED headlights', 600.00, NULL);

-- March 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-03-08', 16500, 'maintenance', 'Air filter replacement', 'Engine air filter replaced', 120.00, w_mechanic),
(vehicle_id, '2025-03-20', 16800, 'repair', 'Battery replacement', 'Car battery replaced', 380.00, w_mechanic),
(vehicle_id, '2025-03-25', 16900, 'other', 'Car wash and detailing', 'Professional wash and interior cleaning', 150.00, w_detailer);

-- April 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-04-12', 17500, 'maintenance', 'Coolant flush', 'Cooling system flush and refill', 200.00, w_mechanic),
(vehicle_id, '2025-04-28', 17800, 'inspection', 'Pre-summer inspection', 'Vehicle check before summer season', 100.00, w_mechanic);

-- May 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-05-05', 18200, 'oil_change', 'Oil change', 'Routine oil change', 250.00, w_mechanic),
(vehicle_id, '2025-05-15', 18500, 'repair', 'AC repair', 'AC compressor repair', 850.00, w_mechanic),
(vehicle_id, '2025-05-22', 18700, 'upgrade', 'Audio system upgrade', 'New speakers and amplifier installed', 1200.00, w_audio);

-- June 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-06-10', 19200, 'maintenance', 'Transmission fluid change', 'Transmission fluid replaced', 300.00, w_mechanic),
(vehicle_id, '2025-06-18', 19500, 'inspection', 'Safety inspection', 'Safety and emissions check', 120.00, w_mechanic);

-- July 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-07-03', 20000, 'oil_change', 'Oil change', 'Routine oil change', 250.00, w_mechanic),
(vehicle_id, '2025-07-12', 20300, 'repair', 'Wheel alignment', 'Front wheel alignment correction', 150.00, w_tires),
(vehicle_id, '2025-07-25', 20600, 'other', 'Window tinting', 'Rear window tinting', 400.00, w_detailer);

-- August 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-08-08', 21200, 'maintenance', 'Spark plug replacement', 'All spark plugs replaced', 180.00, w_mechanic),
(vehicle_id, '2025-08-20', 21500, 'repair', 'Exhaust system repair', 'Muffler replacement', 550.00, w_mechanic);

-- September 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-09-05', 22000, 'oil_change', 'Oil change', 'Routine oil change', 250.00, w_mechanic),
(vehicle_id, '2025-09-15', 22300, 'inspection', 'Pre-winter inspection', 'Vehicle check before winter season', 150.00, w_mechanic),
(vehicle_id, '2025-09-22', 22500, 'maintenance', 'Battery check', 'Battery test and terminal cleaning', 50.00, w_mechanic);

-- October 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-10-10', 23000, 'repair', 'Wiper blade replacement', 'New wiper blades installed', 60.00, NULL),
(vehicle_id, '2025-10-18', 23200, 'maintenance', 'Brake fluid flush', 'Brake system flush', 200.00, w_mechanic),
(vehicle_id, '2025-10-28', 23500, 'upgrade', 'Winter tires', 'Winter tires purchased and fitted', 1200.00, w_tires);

-- November 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-11-05', 24000, 'oil_change', 'Oil change', 'Routine oil change', 250.00, w_mechanic),
(vehicle_id, '2025-11-12', 24200, 'repair', 'Heater core replacement', 'Heater core replaced', 650.00, w_mechanic);

-- December 2025
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2025-12-08', 24800, 'oil_change', 'Fuel filter replacement', 'Fuel filter replaced', 100.00, w_mechanic),
(vehicle_id, '2025-12-15', 25000, 'inspection', 'Annual service', 'Full annual service', 500.00, w_mechanic),
(vehicle_id, '2025-12-22', 25100, 'other', 'Holiday detailing', 'Full detailing before holidays', 200.00, w_detailer);

-- January 2026
INSERT INTO public.service_entries (vehicle_id, service_date, mileage, category, title, description, cost, workshop_id) VALUES
(vehicle_id, '2026-01-05', 25500, 'oil_change', 'Oil change', 'Routine oil change', 250.00, w_mechanic),
(vehicle_id, '2026-01-12', 25700, 'repair', 'Starter replacement', 'Starter motor replaced', 450.00, w_mechanic);

-- ================
-- FUELING ENTRIES
-- ================
-- Fueling entries for each month (varying frequency and amounts).
-- gas_station: one of orlen, bp, shell, circle_k, mol, moya, other (optional).

-- January 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type, gas_station) VALUES
(vehicle_id, '2025-01-10', 380.2, 45.8, 238.20, '95', 'shell'),
(vehicle_id, '2025-01-24', 390.5, 47.2, 245.80, '95', 'bp');

-- February 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type, gas_station) VALUES
(vehicle_id, '2025-02-14', 385.0, 46.5, 241.90, '98', 'shell');

-- March 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type, gas_station) VALUES
(vehicle_id, '2025-03-13', 380.0, 45.9, 239.00, '95', 'circle_k'),
(vehicle_id, '2025-03-27', 390.0, 47.1, 245.20, '95', 'orlen');

-- April 2025
-- No fuel entries in April

-- May 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type, gas_station) VALUES
(vehicle_id, '2025-05-09', 380.3, 46.0, 239.50, 'on', 'other'),
(vehicle_id, '2025-05-23', 390.5, 47.2, 245.80, 'on', 'shell');

-- June 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type, gas_station) VALUES
(vehicle_id, '2025-06-13', 385.0, 46.5, 242.00, '100', 'shell');

-- July 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type, gas_station) VALUES
(vehicle_id, '2025-07-11', 380.8, 46.0, 239.60, '95', 'bp'),
(vehicle_id, '2025-07-25', 390.0, 47.1, 245.00, 'lpg', 'other');

-- August 2025
-- No fuel entries in August

-- September 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type, gas_station) VALUES
(vehicle_id, '2025-09-12', 380.0, 45.9, 239.00, '95', 'circle_k');

-- October 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type, gas_station) VALUES
(vehicle_id, '2025-10-10', 385.8, 46.6, 242.60, '98', 'orlen'),
(vehicle_id, '2025-10-24', 395.0, 47.8, 248.80, '98', 'shell');

-- November 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type, gas_station) VALUES
(vehicle_id, '2025-11-14', 380.2, 46.0, 239.40, '95', 'other');

-- December 2025
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type, gas_station) VALUES
(vehicle_id, '2025-12-12', 385.0, 46.5, 242.00, '95', 'shell'),
(vehicle_id, '2025-12-26', 395.5, 47.8, 248.80, '95', 'bp');

-- January 2026
INSERT INTO public.fueling_entries (vehicle_id, date, distance, fuel_amount, fuel_cost, fuel_type, gas_station) VALUES
(vehicle_id, '2026-01-09', 380.8, 46.0, 239.60, '95', 'circle_k');

-- ================
-- REMINDERS (new format: date and/or mileage; optional recurrence; no type)
-- ================
-- Columns: vehicle_id, due_date?, due_mileage?, days_before?, title, notes?, status,
--   recurrence_interval_value?, recurrence_interval_unit?, recurrence_interval_km?, recurrence_anchor_mileage?
-- Constraint: at least one of due_date, due_mileage must be set.

-- Time-only (one-off)
INSERT INTO public.reminders (vehicle_id, due_date, days_before, title, notes, status) VALUES
(vehicle_id, '2025-02-15', 7, 'Oil change', 'Next oil change scheduled', 'done'),
(vehicle_id, '2025-04-01', 14, 'Spring inspection', 'Annual spring vehicle inspection', 'done'),
(vehicle_id, '2025-06-10', 7, 'AC service', 'AC check before summer', 'done'),
(vehicle_id, '2025-09-01', 14, 'Pre-winter inspection', 'Vehicle prep for winter season', 'done'),
(vehicle_id, '2025-12-20', 7, 'Holiday service', 'Service before holiday trip', 'done');

-- Time recurring (e.g. every 6 months)
INSERT INTO public.reminders (vehicle_id, due_date, days_before, title, notes, status, recurrence_interval_value, recurrence_interval_unit) VALUES
(vehicle_id, '2026-02-01', 14, 'Annual inspection', 'Full annual inspection', 'active', 6, 'months'),
(vehicle_id, '2026-03-15', 7, 'Spring maintenance', 'Spring maintenance check', 'active', 3, 'months'),
(vehicle_id, '2026-05-01', 14, 'Summer prep', 'Vehicle prep for summer', 'active', 12, 'months');

-- Mileage-only (one-off): anchor = starting mileage, due_mileage = target mileage
INSERT INTO public.reminders (vehicle_id, due_mileage, recurrence_anchor_mileage, title, notes, status) VALUES
(vehicle_id, 20000, 15000, 'Major service', 'Major service at 20,000 km', 'done'),
(vehicle_id, 25000, 20000, 'Transmission service', 'Transmission service at 25,000 km', 'done');

-- Mileage recurring (e.g. every 10000 km): anchor + due_mileage + recurrence_interval_km
INSERT INTO public.reminders (vehicle_id, due_mileage, recurrence_anchor_mileage, recurrence_interval_km, title, notes, status) VALUES
(vehicle_id, 30000, 20000, 10000, 'Major service', 'Major service every 10,000 km', 'active'),
(vehicle_id, 35000, 25000, 10000, 'Timing belt check', 'Timing belt check at 35,000 km', 'active'),
(vehicle_id, 40000, 30000, 10000, 'Major service', 'Major service at 40,000 km', 'active');

-- Combined: date + mileage (e.g. oil change every 12 months or 8000 km)
INSERT INTO public.reminders (vehicle_id, due_date, due_mileage, days_before, recurrence_interval_value, recurrence_interval_unit, recurrence_interval_km, recurrence_anchor_mileage, title, notes, status) VALUES
(vehicle_id, '2026-06-01', 128000, 7, 12, 'months', 8000, 120000, 'Engine oil change', 'Every 12 months or 8,000 km', 'active');

-- ================
-- VEHICLE TIRES
-- ================
-- tire_type: summer, winter, all_season, run_flat, uhp, suv_xl
-- One tire fitted (is_currently_fitted=true), the rest in stock
INSERT INTO public.tires (vehicle_id, name, width_mm, aspect_ratio, diameter_inch, tire_type, dot, is_currently_fitted) VALUES
(vehicle_id, 'Goodyear Eagle F1', 205, 55, 16, 'summer', '2423', true),
(vehicle_id, 'Michelin Alpin 6', 205, 55, 16, 'winter', '2322', false),
(vehicle_id, 'Continental PremiumContact', 205, 55, 16, 'all_season', '2424', false);

-- ================
-- VEHICLE WHEELS
-- ================
-- One wheel fitted (is_currently_fitted=true)
INSERT INTO public.wheels (vehicle_id, name, width_inch, diameter_inch, et_offset, bolt_pattern, center_bore_mm, bolt_type, weight_kg, is_currently_fitted) VALUES
(vehicle_id, 'OEM alloy', 7, 16, 45, '5x112', 66.5, 'M14x1.5', 10.2, true),
(vehicle_id, 'Steel winter wheels', 7, 16, 45, '5x112', 66.5, 'M14x1.5', 12.5, false),
(vehicle_id, 'Alloy summer wheels', 7, 16, 45, '5x112', 66.5, 'M14x1.5', 10.2, false);

END $$;
