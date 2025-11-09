import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { createClient } from "@/lib/supabase/server"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { fileId } = await request.json()

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Fetch file from database
    const { data: file, error: fileError } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .eq("user_id", user.id)
      .single()

    if (fileError || !file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      )
    }

    // Get signed URL for the image
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("files")
      .createSignedUrl(file.storage_path, 3600) // 1 hour expiry

    if (urlError || !signedUrlData) {
      return NextResponse.json(
        { error: "Failed to access file" },
        { status: 500 }
      )
    }

    // Prepare the medical imaging analysis prompt
    const systemPrompt = `You are a medical imaging AI assistant. Provide a concise, structured analysis.

**Format your response with these sections:**

### Image Type
Identify modality (X-ray/CT/MRI) and view

### Findings
List key observations (normal and abnormal)

### Assessment
Most likely diagnosis based on findings

### Recommendation
Next steps or additional tests needed

**Guidelines:**
- Be concise - keep total response under 250 words
- Use bullet points for findings
- Highlight urgent findings if present
- Note this is AI-assisted analysis, not definitive diagnosis
- Use clear medical terminology`

    const userPrompt = `Analyze this medical image: "${file.name}". Keep response concise and structured. If not a medical image, state that clearly.`

    // Call OpenAI GPT-4 Vision API
    console.log("[Image Analysis] Analyzing image:", file.name)
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userPrompt,
            },
            {
              type: "image_url",
              image_url: {
                url: signedUrlData.signedUrl,
                detail: "high", // Use high detail for medical images
              },
            },
          ],
        },
      ],
      max_tokens: 1500,
      temperature: 0.3, // Lower temperature for more consistent medical analysis
    })

    const analysis = response.choices[0].message.content

    console.log("[Image Analysis] Analysis completed for:", file.name)

    return NextResponse.json({
      success: true,
      analysis,
      fileName: file.name,
      fileType: file.mime_type,
      disclaimer: "This is an AI-assisted analysis and should not be considered a definitive medical diagnosis. Always consult with qualified healthcare professionals for proper medical evaluation and treatment decisions.",
    })
  } catch (error: any) {
    console.error("[Image Analysis] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to analyze image" },
      { status: 500 }
    )
  }
}

