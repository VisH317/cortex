import { Pool } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    console.log('🚀 Starting database migrations...\n')

    // Run migration 001: Initial Schema
    console.log('📄 Running 001_initial_schema.sql...')
    const schema = readFileSync(
      join(__dirname, '../supabase/migrations/001_initial_schema.sql'),
      'utf-8'
    )
    await pool.query(schema)
    console.log('✅ Schema created successfully\n')

    // Run migration 002: RLS Policies
    console.log('📄 Running 002_rls_policies.sql...')
    const policies = readFileSync(
      join(__dirname, '../supabase/migrations/002_rls_policies.sql'),
      'utf-8'
    )
    await pool.query(policies)
    console.log('✅ RLS policies created successfully\n')

    console.log('🎉 All migrations completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigrations()

