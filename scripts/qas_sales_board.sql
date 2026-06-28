-- Sales Kanban status support for qas_registrations.
-- The app also applies this schema lazily from actions/sales-actions.ts,
-- but this script can be run manually in Supabase SQL Editor.

ALTER TABLE qas_registrations
  ADD COLUMN IF NOT EXISTS sales_status TEXT;

UPDATE qas_registrations
SET sales_status = 'queue'
WHERE sales_status IS NULL
   OR sales_status NOT IN ('queue', 'contacted', 'assigned', 'won', 'lost');

ALTER TABLE qas_registrations
  ALTER COLUMN sales_status SET DEFAULT 'queue',
  ALTER COLUMN sales_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'qas_registrations_sales_status_check'
      AND conrelid = 'qas_registrations'::regclass
  ) THEN
    ALTER TABLE qas_registrations
      ADD CONSTRAINT qas_registrations_sales_status_check
      CHECK (sales_status IN ('queue', 'contacted', 'assigned', 'won', 'lost'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS qas_registrations_sales_status_created_at_idx
  ON qas_registrations (sales_status, created_at DESC);
