
-- Analytics and Business Intelligence Table
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    event_type TEXT NOT NULL, -- page_view, clicked_business, search, filter, directions
    session_id UUID NOT NULL,
    resource_id TEXT, -- business_id if applicable
    category TEXT,
    query TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for performance
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_resource_id ON analytics_events(resource_id);
CREATE INDEX idx_analytics_created_at ON analytics_events(created_at);

-- RLS Policies (Insert Only for Public, Select for Admin)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert analytics" ON analytics_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view analytics" ON analytics_events
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'editor')
        )
    );
