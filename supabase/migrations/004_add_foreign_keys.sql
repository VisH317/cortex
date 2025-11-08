-- Medical Dropbox Foreign Keys
-- Migration 004: Add foreign key constraints after tables exist

-- This migration adds foreign key constraints separately to avoid issues
-- with auth.users references in some environments

-- Add foreign key for patients.user_id if not already exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'patients_user_id_fkey'
    ) THEN
        ALTER TABLE patients 
        ADD CONSTRAINT patients_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key for folders.patient_id if not already exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'folders_patient_id_fkey'
    ) THEN
        ALTER TABLE folders 
        ADD CONSTRAINT folders_patient_id_fkey 
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key for files.patient_id if not already exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'files_patient_id_fkey'
    ) THEN
        ALTER TABLE files 
        ADD CONSTRAINT files_patient_id_fkey 
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key for chat_sessions.patient_context_id if not already exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chat_sessions_patient_context_id_fkey'
    ) THEN
        ALTER TABLE chat_sessions 
        ADD CONSTRAINT chat_sessions_patient_context_id_fkey 
        FOREIGN KEY (patient_context_id) REFERENCES patients(id) ON DELETE CASCADE;
    END IF;
END $$;

