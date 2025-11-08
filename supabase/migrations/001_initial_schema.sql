-- SynapseVault Database Schema
-- Migration 001: Initial Schema Setup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
-- Stores additional user profile information beyond Supabase Auth
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FOLDERS TABLE
-- ============================================================================
-- Hierarchical folder structure for organizing files
CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique slugs per user and parent folder
    UNIQUE(user_id, parent_id, slug)
);

-- Index for faster folder tree queries
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_slug ON folders(slug);

-- ============================================================================
-- FILES TABLE
-- ============================================================================
-- Stores metadata for all uploaded files
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'document', 'image', 'audio', 'video', 'code', 'dataset', 'other'
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_path TEXT NOT NULL, -- Path in Supabase Storage
    
    -- Extracted metadata
    description TEXT,
    tags TEXT[],
    
    -- File processing status
    embedding_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_type ON files(type);
CREATE INDEX IF NOT EXISTS idx_files_embedding_status ON files(embedding_status);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);

-- ============================================================================
-- WEBSITE_SHORTCUTS TABLE
-- ============================================================================
-- Stores website shortcuts as pseudo-files
CREATE TABLE IF NOT EXISTS website_shortcuts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    favicon_url TEXT,
    
    -- Metadata from scraping
    og_image TEXT,
    og_description TEXT,
    author TEXT,
    published_date TIMESTAMPTZ,
    
    -- Embedding status
    embedding_status TEXT DEFAULT 'pending',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_website_shortcuts_user_id ON website_shortcuts(user_id);
CREATE INDEX IF NOT EXISTS idx_website_shortcuts_folder_id ON website_shortcuts(folder_id);
CREATE INDEX IF NOT EXISTS idx_website_shortcuts_created_at ON website_shortcuts(created_at DESC);

-- ============================================================================
-- EMBEDDINGS TABLE
-- ============================================================================
-- Stores vector embeddings for semantic search
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Reference to source (either file or website)
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    website_id UUID REFERENCES website_shortcuts(id) ON DELETE CASCADE,
    
    -- Content chunk
    content_chunk TEXT NOT NULL,
    chunk_index INTEGER NOT NULL, -- Order of chunk in original document
    
    -- Vector embedding (1536 dimensions for OpenAI text-embedding-3-large)
    embedding vector(1408) NOT NULL,
    
    -- Metadata for context
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure either file_id or website_id is set, but not both
    CHECK (
        (file_id IS NOT NULL AND website_id IS NULL) OR
        (file_id IS NULL AND website_id IS NOT NULL)
    )
);

-- Indexes for vector similarity search
CREATE INDEX IF NOT EXISTS idx_embeddings_user_id ON embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_file_id ON embeddings(file_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_website_id ON embeddings(website_id);

-- Vector similarity search index (HNSW for fast approximate nearest neighbor search)
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ============================================================================
-- CHAT SESSIONS TABLE
-- ============================================================================
-- Stores chat conversation sessions with AI agents
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_type TEXT NOT NULL, -- 'finder', 'curator', 'generator'
    title TEXT,
    folder_context_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_agent_type ON chat_sessions(agent_type);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at DESC);

-- ============================================================================
-- CHAT MESSAGES TABLE
-- ============================================================================
-- Stores individual messages in chat sessions
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user', 'assistant'
    content TEXT NOT NULL,
    
    -- Source citations for assistant messages
    citations JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at ASC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_website_shortcuts_updated_at BEFORE UPDATE ON website_shortcuts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VECTOR SIMILARITY SEARCH FUNCTION
-- ============================================================================
-- Function to search for similar embeddings using cosine similarity
CREATE OR REPLACE FUNCTION match_embeddings(
    query_embedding vector(1408),
    query_user_id UUID,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10,
    filter_folder_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    file_id UUID,
    website_id UUID,
    content_chunk TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.file_id,
        e.website_id,
        e.content_chunk,
        e.metadata,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM embeddings e
    LEFT JOIN files f ON e.file_id = f.id
    LEFT JOIN website_shortcuts w ON e.website_id = w.id
    WHERE
        e.user_id = query_user_id
        AND (1 - (e.embedding <=> query_embedding)) > match_threshold
        AND (
            filter_folder_id IS NULL
            OR f.folder_id = filter_folder_id
            OR w.folder_id = filter_folder_id
        )
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

