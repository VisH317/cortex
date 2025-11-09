/**
 * AI Chat Agent Service
 * Uses OpenAI Assistants API with function calling for RAG and research
 */

import OpenAI from "openai"
import { searchPatientRecords, formatRAGResultsForAgent } from "./rag"
import { searchGoogleScholar, formatResearchResultsForAgent, type PatientContext } from "./research"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  citations?: Array<{
    file_name: string
    content: string
    similarity: number
  }>
}

/**
 * Function definitions for the agent
 */
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "retrieve_patient_records",
      description: "Search through patient's medical records, images, and documents using semantic search. Use this to answer questions about the patient's medical history, test results, prescriptions, or any uploaded documents.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to find relevant patient records",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_medical_research",
      description: "Search the internet for medical research papers, treatment information, or medical knowledge. Use this when you need up-to-date medical information, research findings, or general medical knowledge not specific to this patient.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The medical research query to search for",
          },
        },
        required: ["query"],
      },
    },
  },
]

/**
 * Process function calls from the assistant
 */
async function handleFunctionCall(
  functionName: string,
  functionArgs: any,
  patientId: string,
  userId: string,
  patientContext?: PatientContext
): Promise<string> {
  if (functionName === "retrieve_patient_records") {
    const { query } = functionArgs

    console.log(`[Agent] Searching patient records with query: "${query}"`)
    console.log(`[Agent] Patient ID: ${patientId}, User ID: ${userId}`)

    // Search patient records using RAG
    const { results, error } = await searchPatientRecords(query, patientId, userId, {
      matchThreshold: 0.4, // Lower threshold for better recall
      matchCount: 15,
    })

    if (error) {
      console.error(`[Agent] Error searching records: ${error}`)
      return `Error searching records: ${error}`
    }

    console.log(`[Agent] Retrieved ${results.length} results`)

    if (results.length === 0) {
      return "No relevant medical records found. The patient's files may still be processing. Please ask the user to wait a moment and try again, or verify that medical records have been uploaded."
    }

    // Format results for the assistant
    const formatted = formatRAGResultsForAgent(results)
    console.log(`[Agent] Formatted results length: ${formatted.length} characters`)
    return formatted
  }

  if (functionName === "search_medical_research") {
    const { query } = functionArgs

    console.log(`[Agent] Searching medical research with query: "${query}"`)
    console.log(`[Agent] Patient context:`, patientContext)

    // Search Google Scholar using SerpAPI with patient context
    // Auto-save top 2 sources to the patient's file system with Playwright scraping
    const { results, error, savedWebsites } = await searchGoogleScholar(query, patientContext, {
      maxResults: 5,
      autoSaveTop2: true,
      userId: userId,
      folderId: null, // Save to root of patient folder (could be enhanced to find "Research" folder)
    })

    if (error) {
      console.error(`[Agent] Error searching research: ${error}`)
      return `Error searching research: ${error}`
    }

    console.log(`[Agent] Retrieved ${results.length} research results`)
    
    if (savedWebsites && savedWebsites.length > 0) {
      console.log(`[Agent] Auto-saved ${savedWebsites.length} top sources with Playwright scraping and background embedding`)
    }

    if (results.length === 0) {
      return "No research papers found for this query. Try rephrasing or using more specific medical terms."
    }

    // Format results for the assistant
    const formatted = formatResearchResultsForAgent(results)
    
    // Add note about saved sources if any were saved
    let finalMessage = formatted
    if (savedWebsites && savedWebsites.length > 0) {
      finalMessage += `\n\n✅ Note: The top ${savedWebsites.length} most relevant sources have been automatically saved to the patient's records and are being processed for future reference.`
    }
    
    console.log(`[Agent] Formatted results length: ${finalMessage.length} characters`)
    return finalMessage
  }

  return "Unknown function called"
}

/**
 * Chat with the medical AI agent
 */
export async function chatWithAgent(
  messages: ChatMessage[],
  patientId: string | null,
  userId: string,
  patientName?: string | null,
  patientInfo?: {
    age?: number | null
    gender?: string | null
    blood_type?: string | null
    date_of_birth?: string | null
    allergies?: string | null
    current_medications?: string | null
    medical_history?: string | null
  },
  filesList?: Array<{
    name: string
    type: string
    mime_type: string
    size_bytes: number
    created_at: string
  }>,
  researchModeEnabled: boolean = false,
  fileSystemStructure?: string
): Promise<{
  response: string
  citations?: Array<{
    file_name: string
    content: string
    similarity: number
  }>
  error?: string
}> {
  try {
    // Format patient information
    const patientDetails = patientInfo ? `

**Patient Information:**
- Name: ${patientName || "Unknown"}
- Age: ${patientInfo.age || "Not specified"}
- Gender: ${patientInfo.gender ? patientInfo.gender.charAt(0).toUpperCase() + patientInfo.gender.slice(1).replace(/_/g, " ") : "Not specified"}
- Blood Type: ${patientInfo.blood_type || "Not specified"}
- Date of Birth: ${patientInfo.date_of_birth ? new Date(patientInfo.date_of_birth).toLocaleDateString() : "Not specified"}
${patientInfo.allergies ? `- Known Allergies: ${patientInfo.allergies}` : ""}
${patientInfo.current_medications ? `- Current Medications: ${patientInfo.current_medications}` : ""}
${patientInfo.medical_history ? `- Medical History: ${patientInfo.medical_history}` : ""}` : `
- Name: ${patientName || "Unknown"}`

    // Format file system structure
    const filesInfo = fileSystemStructure ? `

**Patient File System Structure:**
${fileSystemStructure}

All files have been indexed and are searchable using the retrieve_patient_records function. The structure above shows the complete hierarchical organization of all medical records and documents.` : 
    filesList && filesList.length > 0 ? `

**Available Medical Records (${filesList.length} files):**
${filesList.map((file, i) => {
  const fileSize = file.size_bytes < 1024 * 1024 
    ? `${(file.size_bytes / 1024).toFixed(1)} KB` 
    : `${(file.size_bytes / (1024 * 1024)).toFixed(1)} MB`
  const uploadDate = new Date(file.created_at).toLocaleDateString()
  return `${i + 1}. ${file.name} (${file.type}, ${fileSize}) - Uploaded ${uploadDate}`
}).join('\n')}

These files have been indexed and are searchable using the retrieve_patient_records function.` : `

**Medical Records:** No files have been uploaded yet for this patient.`

    // Build system message with patient context
    const systemMessage = `You are a friendly and helpful medical AI assistant working alongside doctors to manage patient records. Think of yourself as a knowledgeable colleague who's here to make the doctor's job easier! 😊
${patientDetails}
${filesInfo}

**Your Capabilities:**
1. 🔍 **Search Patient Records** (retrieve_patient_records)
   - Access and search through all uploaded medical documents, test results, prescriptions, and images
   - Use this whenever the doctor asks about the patient's medical history or any specific documents
   - Even for general questions like "tell me about this patient" or "what do we have for them"

2. 📚 **Research Medical Information** (search_medical_research)
   - Find medical research papers, treatment guidelines, and clinical studies
   - Use this for general medical knowledge not specific to this patient

**How to Help:**
- Be warm, conversational, and professional - you're a helpful colleague, not a robot! 
- When you reference patient records, cite the specific file name
- Clearly distinguish between this patient's specific data and general medical knowledge
- If you're not sure about something, it's totally okay to say so and suggest consulting specialists
- Focus on giving the doctor insights that help them make informed decisions
- Never give definitive diagnoses - share observations and insights instead
- When asked about a patient, ALWAYS search their records first using retrieve_patient_records before answering
- If asked "what files do we have?" or "what records are available?", you can see the list above - no need to search
- Be concise but thorough - doctors are busy!

Remember: You're here to be genuinely helpful and make the doctor's life easier. Be friendly, accurate, and always have their back! 💪`

    // Prepare patient context for research queries
    const patientContext: PatientContext = {
      medical_history: patientInfo?.medical_history,
      current_medications: patientInfo?.current_medications,
      allergies: patientInfo?.allergies,
    }

    // Conditionally include research tool based on toggle
    const availableTools = researchModeEnabled 
      ? tools 
      : tools.filter(tool => (tool as any).function.name !== "search_medical_research")

    console.log(`[Agent] Research mode: ${researchModeEnabled ? 'ENABLED' : 'DISABLED'}`)
    console.log(`[Agent] Available tools: ${availableTools.map(t => (t as any).function.name).join(', ')}`)

    // Convert messages to OpenAI format
    const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemMessage,
      },
      ...messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ]

    // Initial API call
    let response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: openaiMessages,
      tools: availableTools,
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 1000,
    })

    let assistantMessage = response.choices[0].message
    let citations: any[] = []

    // Handle function calls
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Add assistant's message with tool calls to conversation
      openaiMessages.push(assistantMessage)

      // Process each function call
      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type !== "function") continue
        
        const functionName = toolCall.function.name
        const functionArgs = JSON.parse(toolCall.function.arguments)

        // Execute the function
        const functionResponse = await handleFunctionCall(
          functionName,
          functionArgs,
          patientId as string,
          userId,
          patientContext
        )

        // Add function response to conversation
        openaiMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: functionResponse,
        })

        // Track citations if from RAG
        if (functionName === "retrieve_patient_records") {
          const { results } = await searchPatientRecords(
            functionArgs.query,
            patientId as string,
            userId
          )
          citations.push(...results.map((r) => ({
            file_name: r.metadata.file_name || "Unknown",
            content: r.content.substring(0, 200),
            similarity: r.similarity,
          })))
        }
      }

      // Get next response from assistant
      response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: openaiMessages,
        tools: availableTools,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 1000,
      })

      assistantMessage = response.choices[0].message
    }

    return {
      response: assistantMessage.content || "I couldn't generate a response.",
      citations: citations.length > 0 ? citations : undefined,
    }
  } catch (error: any) {
    console.error("Chat agent error:", error)
    return {
      response: "",
      error: error.message || "Failed to get response from AI agent",
    }
  }
}

