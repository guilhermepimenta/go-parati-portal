-- Blog posts table for Go Paraty content
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT NOT NULL,
    cover_image_url TEXT,
    category TEXT NOT NULL DEFAULT 'noticias',
    author_id UUID REFERENCES auth.users(id),
    author_name TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    meta_description TEXT,
    tags TEXT[] DEFAULT '{}',
    ai_generated BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for slug lookup
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
-- Index for listing queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published ON blog_posts(status, published_at DESC);
-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);

-- Enable RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "blog_posts_public_read" ON blog_posts
    FOR SELECT USING (status = 'published');

-- Authenticated admin can do everything
CREATE POLICY "blog_posts_admin_all" ON blog_posts
    FOR ALL USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_posts_updated_at
    BEFORE UPDATE ON blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_blog_posts_updated_at();
