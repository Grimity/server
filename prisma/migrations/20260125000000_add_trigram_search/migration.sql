-- Enable pg_trgm extension for trigram-based similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index on Feed.title for ILIKE search optimization
CREATE INDEX IF NOT EXISTS "Feed_title_trgm_idx" ON "Feed" USING GIN (title gin_trgm_ops);

-- Create GIN index on Post.title for ILIKE search optimization
CREATE INDEX IF NOT EXISTS "Post_title_trgm_idx" ON "Post" USING GIN (title gin_trgm_ops);