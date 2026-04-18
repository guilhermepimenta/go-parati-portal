-- Add buyer information and rotativo session fields to parking_tickets
ALTER TABLE parking_tickets ADD COLUMN IF NOT EXISTS buyer_name TEXT;
ALTER TABLE parking_tickets ADD COLUMN IF NOT EXISTS buyer_cpf TEXT;
ALTER TABLE parking_tickets ADD COLUMN IF NOT EXISTS buyer_email TEXT;
ALTER TABLE parking_tickets ADD COLUMN IF NOT EXISTS qr_code_base64 TEXT;
ALTER TABLE parking_tickets ADD COLUMN IF NOT EXISTS rotativo_session TEXT;
ALTER TABLE parking_tickets ADD COLUMN IF NOT EXISTS rotativo_user_id TEXT;
ALTER TABLE parking_tickets ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- Index for email lookups (receipt history)
CREATE INDEX IF NOT EXISTS idx_parking_tickets_buyer_email ON parking_tickets(buyer_email);
