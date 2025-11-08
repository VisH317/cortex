-- SynapseVault Row Level Security Policies
-- Migration 002: RLS Policies

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_shortcuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- FOLDERS POLICIES
-- ============================================================================

-- Users can view their own folders
CREATE POLICY "Users can view own folders"
    ON folders FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own folders
CREATE POLICY "Users can create own folders"
    ON folders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own folders
CREATE POLICY "Users can update own folders"
    ON folders FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own folders
CREATE POLICY "Users can delete own folders"
    ON folders FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- FILES POLICIES
-- ============================================================================

-- Users can view their own files
CREATE POLICY "Users can view own files"
    ON files FOR SELECT
    USING (auth.uid() = user_id);

-- Users can upload their own files
CREATE POLICY "Users can upload own files"
    ON files FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own files
CREATE POLICY "Users can update own files"
    ON files FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own files
CREATE POLICY "Users can delete own files"
    ON files FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- WEBSITE_SHORTCUTS POLICIES
-- ============================================================================

-- Users can view their own website shortcuts
CREATE POLICY "Users can view own website shortcuts"
    ON website_shortcuts FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own website shortcuts
CREATE POLICY "Users can create own website shortcuts"
    ON website_shortcuts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own website shortcuts
CREATE POLICY "Users can update own website shortcuts"
    ON website_shortcuts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own website shortcuts
CREATE POLICY "Users can delete own website shortcuts"
    ON website_shortcuts FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- EMBEDDINGS POLICIES
-- ============================================================================

-- Users can view their own embeddings
CREATE POLICY "Users can view own embeddings"
    ON embeddings FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can insert embeddings (for background jobs)
CREATE POLICY "Service role can insert embeddings"
    ON embeddings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own embeddings
CREATE POLICY "Users can delete own embeddings"
    ON embeddings FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- CHAT_SESSIONS POLICIES
-- ============================================================================

-- Users can view their own chat sessions
CREATE POLICY "Users can view own chat sessions"
    ON chat_sessions FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own chat sessions
CREATE POLICY "Users can create own chat sessions"
    ON chat_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own chat sessions
CREATE POLICY "Users can update own chat sessions"
    ON chat_sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own chat sessions
CREATE POLICY "Users can delete own chat sessions"
    ON chat_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- CHAT_MESSAGES POLICIES
-- ============================================================================

-- Users can view messages in their own sessions
CREATE POLICY "Users can view messages in own sessions"
    ON chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );

-- Users can create messages in their own sessions
CREATE POLICY "Users can create messages in own sessions"
    ON chat_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );

-- Users can delete messages in their own sessions
CREATE POLICY "Users can delete messages in own sessions"
    ON chat_messages FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Note: These need to be added via Supabase Dashboard → Storage → Policies
-- Or via Supabase CLI

-- Bucket: files
-- 1. Users can upload their own files
--    Policy name: "Users can upload own files"
--    Operation: INSERT
--    Policy: bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]

-- 2. Users can view their own files
--    Policy name: "Users can view own files"
--    Operation: SELECT
--    Policy: bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]

-- 3. Users can delete their own files
--    Policy name: "Users can delete own files"
--    Operation: DELETE
--    Policy: bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]

-- 4. Users can update their own files
--    Policy name: "Users can update own files"
--    Operation: UPDATE
--    Policy: bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]

