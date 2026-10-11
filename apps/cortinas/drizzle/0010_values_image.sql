ALTER TABLE attribute_values ADD COLUMN IF NOT EXISTS image text NOT NULL DEFAULT '';
UPDATE attributes SET kind='lista' WHERE kind='color';
