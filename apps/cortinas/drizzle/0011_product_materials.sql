ALTER TABLE product_models ADD COLUMN IF NOT EXISTS materials text NOT NULL DEFAULT '';
UPDATE product_models SET materials = material WHERE materials = '';
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS material text NOT NULL DEFAULT '';
