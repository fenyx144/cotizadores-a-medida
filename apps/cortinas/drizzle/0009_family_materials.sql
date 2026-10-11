ALTER TABLE product_families ADD COLUMN IF NOT EXISTS materials text NOT NULL DEFAULT '';
UPDATE product_families f SET materials = coalesce((SELECT string_agg(DISTINCT m.material, ',') FROM product_models m WHERE m.family_id = f.id), '');
