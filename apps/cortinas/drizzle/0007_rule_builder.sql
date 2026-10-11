ALTER TABLE constraint_rules ADD COLUMN IF NOT EXISTS conditions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE constraint_rules ADD COLUMN IF NOT EXISTS target_attribute_id integer;
ALTER TABLE constraint_rules ADD COLUMN IF NOT EXISTS target_value_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE constraint_rules ADD COLUMN IF NOT EXISTS surcharge real NOT NULL DEFAULT 0;
ALTER TABLE constraint_rules ADD COLUMN IF NOT EXISTS surcharge_kind text NOT NULL DEFAULT 'fijo';
ALTER TABLE constraint_rules ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT '';
