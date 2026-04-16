-- Parking Tickets table for Rotativo Digital MVP
CREATE TABLE IF NOT EXISTS parking_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
    payment_method TEXT NOT NULL DEFAULT 'pix' CHECK (payment_method IN ('pix', 'card')),
    payment_id TEXT,
    pix_code TEXT,
    qr_code_base64 TEXT,
    location_description TEXT,
    vehicle_brand TEXT,
    vehicle_model TEXT,
    vehicle_color TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Index for looking up active tickets by plate
CREATE INDEX IF NOT EXISTS idx_parking_tickets_plate_status ON parking_tickets (plate, status);

-- Index for webhook lookups by payment_id
CREATE INDEX IF NOT EXISTS idx_parking_tickets_payment_id ON parking_tickets (payment_id);

-- RLS policies
ALTER TABLE parking_tickets ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a ticket (anonymous purchase allowed)
CREATE POLICY "Anyone can create parking tickets"
    ON parking_tickets FOR INSERT
    WITH CHECK (true);

-- Anyone can read their own tickets (by user_id) or look up by plate
CREATE POLICY "Anyone can read parking tickets"
    ON parking_tickets FOR SELECT
    USING (true);

-- Only service role can update (for webhook status changes)
CREATE POLICY "Service role can update parking tickets"
    ON parking_tickets FOR UPDATE
    USING (auth.role() = 'service_role');

-- Pricing table for parking durations
CREATE TABLE IF NOT EXISTS parking_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    duration_minutes INTEGER NOT NULL UNIQUE,
    amount_cents INTEGER NOT NULL,
    label TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE parking_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read parking prices"
    ON parking_prices FOR SELECT
    USING (true);

-- Seed default prices (Paraty typical values)
INSERT INTO parking_prices (duration_minutes, amount_cents, label) VALUES
    (30, 300, '30 minutos'),
    (60, 500, '1 hora'),
    (120, 900, '2 horas'),
    (180, 1200, '3 horas')
ON CONFLICT (duration_minutes) DO NOTHING;
