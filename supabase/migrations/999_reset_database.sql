-- ============================================================================
-- COMPLETE DATABASE RESET
-- ============================================================================
-- WARNING: This will delete ALL data in the database!
-- This script drops all tables, functions, and recreates the schema from scratch
-- Use this for development/testing only - NEVER run this in production!
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP EXISTING OBJECTS
-- ============================================================================

-- Drop all tables (in reverse dependency order)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS embeddings CASCADE;
DROP TABLE IF EXISTS website_shortcuts CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS folders CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS match_embeddings(vector(1408), UUID, FLOAT, INT, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS match_embeddings(vector(1408), UUID, FLOAT, INT, UUID) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================================================
-- STEP 2: CREATE TABLES (From 001_initial_schema.sql)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ============================================================================
-- PATIENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic Information
    name TEXT NOT NULL,
    phone TEXT,
    age INTEGER,
    gender TEXT, -- 'male', 'female', 'other', 'prefer_not_to_say'
    
    -- Extended Medical Information
    blood_type TEXT, -- 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
    date_of_birth DATE,
    address TEXT,
    emergency_contact TEXT,
    insurance_info TEXT,
    
    -- Medical Notes
    medical_history TEXT,
    allergies TEXT,
    current_medications TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at DESC);

-- ============================================================================
-- FOLDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    emoji TEXT DEFAULT '📁',
    color TEXT DEFAULT '#3B82F6',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique slugs per parent folder
    UNIQUE(user_id, parent_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_slug ON folders(slug);
CREATE INDEX IF NOT EXISTS idx_folders_patient_id ON folders(patient_id);

-- ============================================================================
-- FILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'document', 'image', 'video', 'audio', 'other'
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    
    -- Embedding status
    embedding_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_type ON files(type);
CREATE INDEX IF NOT EXISTS idx_files_embedding_status ON files(embedding_status);
CREATE INDEX IF NOT EXISTS idx_files_patient_id ON files(patient_id);

-- ============================================================================
-- WEBSITE SHORTCUTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS website_shortcuts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    favicon TEXT,
    description TEXT,
    
    -- Embedding status
    embedding_status TEXT DEFAULT 'pending',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_website_shortcuts_user_id ON website_shortcuts(user_id);
CREATE INDEX IF NOT EXISTS idx_website_shortcuts_folder_id ON website_shortcuts(folder_id);

-- ============================================================================
-- EMBEDDINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Reference to source (either file or website)
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    website_id UUID REFERENCES website_shortcuts(id) ON DELETE CASCADE,
    
    -- Content chunk
    content_chunk TEXT NOT NULL,
    chunk_index INTEGER NOT NULL, -- Order of chunk in original document
    
    -- Vector embedding (1408 dimensions for OpenAI text-embedding-3-large)
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

CREATE INDEX IF NOT EXISTS idx_embeddings_user_id ON embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_file_id ON embeddings(file_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_website_id ON embeddings(website_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_patient_id ON embeddings(patient_id);

-- Create HNSW index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ============================================================================
-- CHAT TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_context_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    folder_context_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    
    title TEXT NOT NULL DEFAULT 'New Chat',
    agent_type TEXT NOT NULL DEFAULT 'finder', -- 'finder', 'curator', 'generator'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_folder_context_id ON chat_sessions(folder_context_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_patient_context_id ON chat_sessions(patient_context_id);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    
    role TEXT NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    
    -- For storing tool calls and results
    tool_calls JSONB,
    tool_results JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- ============================================================================
-- STEP 3: CREATE FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Vector similarity search function with patient filtering
CREATE OR REPLACE FUNCTION match_embeddings(
    query_embedding vector(1408),
    query_user_id UUID,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10,
    filter_folder_id UUID DEFAULT NULL,
    filter_patient_id UUID DEFAULT NULL
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
        AND (
            filter_patient_id IS NULL
            OR e.patient_id = filter_patient_id
        )
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================================================
-- STEP 4: CREATE TRIGGERS
-- ============================================================================

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
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
-- STEP 5: ENABLE ROW LEVEL SECURITY (From 002_rls_policies.sql)
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_shortcuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- PATIENTS POLICIES
-- ============================================================================
CREATE POLICY "Users can view own patients"
    ON patients FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own patients"
    ON patients FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patients"
    ON patients FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own patients"
    ON patients FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- FOLDERS POLICIES
-- ============================================================================
CREATE POLICY "Users can view own folders"
    ON folders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own folders"
    ON folders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
    ON folders FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
    ON folders FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- FILES POLICIES
-- ============================================================================
CREATE POLICY "Users can view own files"
    ON files FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own files"
    ON files FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files"
    ON files FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own files"
    ON files FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- WEBSITE SHORTCUTS POLICIES
-- ============================================================================
CREATE POLICY "Users can view own website shortcuts"
    ON website_shortcuts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own website shortcuts"
    ON website_shortcuts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own website shortcuts"
    ON website_shortcuts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own website shortcuts"
    ON website_shortcuts FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- EMBEDDINGS POLICIES
-- ============================================================================
CREATE POLICY "Users can view own embeddings"
    ON embeddings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own embeddings"
    ON embeddings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own embeddings"
    ON embeddings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own embeddings"
    ON embeddings FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- CHAT SESSIONS POLICIES
-- ============================================================================
CREATE POLICY "Users can view own chat sessions"
    ON chat_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat sessions"
    ON chat_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions"
    ON chat_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat sessions"
    ON chat_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- CHAT MESSAGES POLICIES
-- ============================================================================
CREATE POLICY "Users can view messages from own sessions"
    ON chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create messages in own sessions"
    ON chat_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update messages in own sessions"
    ON chat_messages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete messages from own sessions"
    ON chat_messages FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );

-- ============================================================================
-- STORAGE POLICIES (Supabase Storage)
-- ============================================================================
-- Note: Run these in the Supabase Storage UI or via the dashboard

-- 1. Create storage bucket 'vault-files' if it doesn't exist
-- 2. Set bucket to private
-- 3. Add the following policies:

-- Policy: Users can upload their own files
-- ON bucket 'vault-files' FOR INSERT
-- WITH CHECK (auth.uid()::text = (storage.foldername(name))[1])

-- Policy: Users can update their own files
-- ON bucket 'vault-files' FOR UPDATE
-- USING (auth.uid()::text = (storage.foldername(name))[1])

-- Policy: Users can delete their own files
-- ON bucket 'vault-files' FOR DELETE
-- USING (auth.uid()::text = (storage.foldername(name))[1])

-- Policy: Users can read their own files
-- ON bucket 'vault-files' FOR SELECT
-- USING (auth.uid()::text = (storage.foldername(name))[1])

-- ============================================================================
-- COMPLETE!
-- ============================================================================
-- Database has been completely reset and recreated
-- ============================================================================

