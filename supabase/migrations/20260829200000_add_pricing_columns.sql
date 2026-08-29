-- ============================================================
-- Add pricing columns for invoice generation
-- ============================================================

-- Add default_price to dental_services
ALTER TABLE dental_services
  ADD COLUMN default_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (default_price >= 0);

-- Add price to appointment_services (captures price at time of appointment)
ALTER TABLE appointment_services
  ADD COLUMN price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (price >= 0);

-- Update seed data with default prices
UPDATE dental_services SET default_price = 500 WHERE name = 'Dental Checkup';
UPDATE dental_services SET default_price = 1500 WHERE name = 'Teeth Whitening';
UPDATE dental_services SET default_price = 800 WHERE name = 'Dental X-Ray';
UPDATE dental_services SET default_price = 2500 WHERE name = 'Tooth Extraction';
UPDATE dental_services SET default_price = 3500 WHERE name = 'Dental Filling';
UPDATE dental_services SET default_price = 12000 WHERE name = 'Root Canal Therapy';
UPDATE dental_services SET default_price = 15000 WHERE name = 'Dental Crown Fitting';
UPDATE dental_services SET default_price = 25000 WHERE name = 'Denture Fitting';
UPDATE dental_services SET default_price = 800 WHERE name = 'Fluoride Treatment';
UPDATE dental_services SET default_price = 2000 WHERE name = 'Orthodontic Adjustment';

-- Backfill appointment_services prices from dental_services
UPDATE appointment_services aps
  SET price = ds.default_price
  FROM dental_services ds
  WHERE aps.service_id = ds.id;
