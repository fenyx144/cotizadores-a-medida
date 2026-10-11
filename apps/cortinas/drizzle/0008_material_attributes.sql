ALTER TABLE attributes ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'generico';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '[]'::jsonb;
