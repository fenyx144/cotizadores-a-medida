CREATE TABLE IF NOT EXISTS attributes (
  id serial PRIMARY KEY,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'lista',
  unit text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS attribute_values (
  id serial PRIMARY KEY,
  attribute_id integer NOT NULL,
  name text NOT NULL,
  code text NOT NULL DEFAULT '',
  hex text NOT NULL DEFAULT '',
  surcharge real NOT NULL DEFAULT 0,
  surcharge_kind text NOT NULL DEFAULT 'fijo',
  only_for text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE product_families ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS value_ids text NOT NULL DEFAULT '';
