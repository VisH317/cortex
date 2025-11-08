-- Medical Dropbox Database Schema
-- Migration 003: Add Patients Table and Update Schema for Medical Records

-- ============================================================================
-- PATIENTS TABLE
-- ============================================================================
-- Stores patient information for doctors
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
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

-- Index for faster patient queries
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at DESC);

-- ============================================================================
-- UPDATE FOLDERS TABLE - Add patient_id
-- ============================================================================
ALTER TABLE folders 
ADD COLUMN IF NOT EXISTS patient_id UUID;

CREATE INDEX IF NOT EXISTS idx_folders_patient_id ON folders(patient_id);

-- ============================================================================
-- UPDATE FILES TABLE - Add patient_id
-- ============================================================================
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS patient_id UUID;

CREATE INDEX IF NOT EXISTS idx_files_patient_id ON files(patient_id);

-- ============================================================================
-- UPDATE CHAT_SESSIONS TABLE - Replace folder_context_id with patient_context_id
-- ============================================================================
ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS patient_context_id UUID;

CREATE INDEX IF NOT EXISTS idx_chat_sessions_patient_context_id ON chat_sessions(patient_context_id);

-- Note: We keep folder_context_id for backward compatibility but will primarily use patient_context_id

-- ============================================================================
-- UPDATE EMBEDDINGS TABLE - Add patient_id
-- ============================================================================
ALTER TABLE embeddings 
ADD COLUMN IF NOT EXISTS patient_id UUID;

CREATE INDEX IF NOT EXISTS idx_embeddings_patient_id ON embeddings(patient_id);

-- ============================================================================
-- UPDATE EMBEDDINGS MATCH FUNCTION - Add patient_id filter
-- ============================================================================
-- Drop existing function
DROP FUNCTION IF EXISTS match_embeddings(vector(1408), UUID, FLOAT, INT, UUID);

-- Recreate with patient_id parameter
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
-- TRIGGERS
-- ============================================================================
-- Add trigger for patients updated_at
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

