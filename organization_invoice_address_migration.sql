-- Add explicit address and invoice address fields to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS street2 TEXT,
  ADD COLUMN IF NOT EXISTS zip TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS name_invoice TEXT,
  ADD COLUMN IF NOT EXISTS street_invoice TEXT,
  ADD COLUMN IF NOT EXISTS street2_invoice TEXT,
  ADD COLUMN IF NOT EXISTS zip_invoice TEXT,
  ADD COLUMN IF NOT EXISTS city_invoice TEXT,
  ADD COLUMN IF NOT EXISTS country_invoice TEXT;

COMMENT ON COLUMN organizations.street IS 'Main address street (line 1)';
COMMENT ON COLUMN organizations.street2 IS 'Main address street (line 2, optional)';
COMMENT ON COLUMN organizations.zip IS 'Main address postal code';
COMMENT ON COLUMN organizations.city IS 'Main address city';
COMMENT ON COLUMN organizations.country IS 'Main address country';
COMMENT ON COLUMN organizations.name_invoice IS 'Invoice address recipient/company name';
COMMENT ON COLUMN organizations.street_invoice IS 'Invoice address street (line 1)';
COMMENT ON COLUMN organizations.street2_invoice IS 'Invoice address street (line 2, optional)';
COMMENT ON COLUMN organizations.zip_invoice IS 'Invoice address postal code';
COMMENT ON COLUMN organizations.city_invoice IS 'Invoice address city';
COMMENT ON COLUMN organizations.country_invoice IS 'Invoice address country'; 