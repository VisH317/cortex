/**
 * Test script to verify embeddings are working
 * Run with: npx tsx scripts/test-embeddings.ts
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testEmbeddings() {
  console.log("🔍 Testing Embeddings System...\n")

  try {
    // Check files with embeddings
    const { data: files, error: filesError } = await supabase
      .from("files")
      .select("id, name, type, embedding_status, created_at")
      .order("created_at", { ascending: false })
      .limit(10)

    if (filesError) {
      throw filesError
    }

    console.log("📁 Recent Files:")
    console.log("─".repeat(80))
    
    if (!files || files.length === 0) {
      console.log("   No files found. Upload some files to test!")
      return
    }

    for (const file of files) {
      const { data: embeddings } = await supabase
        .from("embeddings")
        .select("id, metadata")
        .eq("file_id", file.id)

      const embeddingCount = embeddings?.length || 0
      const model = embeddings?.[0]?.metadata?.embedding_model || "N/A"
      
      const statusEmoji = {
        completed: "✅",
        processing: "⏳",
        pending: "⏸️",
        failed: "❌",
      }[file.embedding_status as string] || "❓"

      console.log(`   ${statusEmoji} ${file.name}`)
      console.log(`      Type: ${file.type}`)
      console.log(`      Status: ${file.embedding_status}`)
      console.log(`      Embeddings: ${embeddingCount}`)
      console.log(`      Model: ${model}`)
      console.log("")
    }

    // Summary statistics
    console.log("\n📊 Summary Statistics:")
    console.log("─".repeat(80))

    const { data: stats } = await supabase
      .from("files")
      .select("type, embedding_status")

    if (stats) {
      const byType: Record<string, number> = {}
      const byStatus: Record<string, number> = {}

      for (const item of stats) {
        byType[item.type] = (byType[item.type] || 0) + 1
        byStatus[item.embedding_status] = (byStatus[item.embedding_status] || 0) + 1
      }

      console.log("\n   Files by Type:")
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`      ${type}: ${count}`)
      })

      console.log("\n   Files by Status:")
      Object.entries(byStatus).forEach(([status, count]) => {
        const emoji = {
          completed: "✅",
          processing: "⏳",
          pending: "⏸️",
          failed: "❌",
        }[status] || "❓"
        console.log(`      ${emoji} ${status}: ${count}`)
      })
    }

    // Check embedding models in use
    const { data: embeddingStats } = await supabase.rpc('get_embedding_stats' as any).single()

    const { data: embeddings } = await supabase
      .from("embeddings")
      .select("metadata")
      .limit(1000)

    if (embeddings && embeddings.length > 0) {
      console.log("\n   Embedding Models:")
      const models: Record<string, number> = {}
      
      for (const emb of embeddings) {
        const model = emb.metadata?.embedding_model || "unknown"
        models[model] = (models[model] || 0) + 1
      }

      Object.entries(models).forEach(([model, count]) => {
        console.log(`      ${model}: ${count} embeddings`)
      })
    }

    // Check for failed embeddings
    const { data: failed } = await supabase
      .from("files")
      .select("name, type")
      .eq("embedding_status", "failed")

    if (failed && failed.length > 0) {
      console.log("\n⚠️  Failed Embeddings:")
      console.log("─".repeat(80))
      failed.forEach(f => {
        console.log(`   ❌ ${f.name} (${f.type})`)
      })
      console.log("\n   Tip: Check server logs for error details")
    }

    console.log("\n✅ Test Complete!\n")

  } catch (error: any) {
    console.error("❌ Error:", error.message)
    process.exit(1)
  }
}

// Run the test
testEmbeddings()

