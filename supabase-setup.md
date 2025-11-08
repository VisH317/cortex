# SynapseVault - Supabase Setup Guide

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project credentials:
   - Project URL: `https://[project-id].supabase.co`
   - Anon (public) key
   - Service role key (keep secret!)

## 2. Environment Variables

Create a `.env.local` file in your project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key
```

## 3. Enable pgvector Extension

Run this in the Supabase SQL Editor:

```sql
-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
```

## 4. Create Storage Buckets

Go to Storage section in Supabase Dashboard and create these buckets:

- **files** (for all user file uploads)
  - Public: No
  - File size limit: 50MB (adjust as needed)
  - Allowed MIME types: Allow all

## 5. Run Database Migrations

Execute the SQL scripts in order:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`

## 6. Authentication Setup

In Supabase Dashboard → Authentication:

1. Enable Email provider
2. Enable Google OAuth provider:
   - Create OAuth credentials in Google Cloud Console
   - Add authorized redirect URI: `https://[project-id].supabase.co/auth/v1/callback`
   - Copy Client ID and Secret to Supabase

## Notes

- The embedding dimension is set to 1536 (OpenAI's text-embedding-3-large)
- RLS policies ensure users can only access their own data
- Storage policies allow authenticated users to upload/download their own files

