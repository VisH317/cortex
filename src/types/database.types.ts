// Database TypeScript Types for SynapseVault

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type FileType = 'document' | 'image' | 'audio' | 'video' | 'code' | 'dataset' | 'other'

export type EmbeddingStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type AgentType = 'finder' | 'curator' | 'generator'

export type MessageRole = 'user' | 'assistant'

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string
          user_id: string
          name: string
          phone: string | null
          age: number | null
          gender: Gender | null
          blood_type: BloodType | null
          date_of_birth: string | null
          address: string | null
          emergency_contact: string | null
          insurance_info: string | null
          medical_history: string | null
          allergies: string | null
          current_medications: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          phone?: string | null
          age?: number | null
          gender?: Gender | null
          blood_type?: BloodType | null
          date_of_birth?: string | null
          address?: string | null
          emergency_contact?: string | null
          insurance_info?: string | null
          medical_history?: string | null
          allergies?: string | null
          current_medications?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          phone?: string | null
          age?: number | null
          gender?: Gender | null
          blood_type?: BloodType | null
          date_of_birth?: string | null
          address?: string | null
          emergency_contact?: string | null
          insurance_info?: string | null
          medical_history?: string | null
          allergies?: string | null
          current_medications?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      folders: {
        Row: {
          id: string
          user_id: string
          name: string
          slug: string
          parent_id: string | null
          patient_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          slug: string
          parent_id?: string | null
          patient_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          slug?: string
          parent_id?: string | null
          patient_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      files: {
        Row: {
          id: string
          user_id: string
          folder_id: string | null
          patient_id: string | null
          name: string
          type: FileType
          mime_type: string
          size_bytes: number
          storage_path: string
          description: string | null
          tags: string[] | null
          embedding_status: EmbeddingStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          folder_id?: string | null
          patient_id?: string | null
          name: string
          type: FileType
          mime_type: string
          size_bytes: number
          storage_path: string
          description?: string | null
          tags?: string[] | null
          embedding_status?: EmbeddingStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          folder_id?: string | null
          patient_id?: string | null
          name?: string
          type?: FileType
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          description?: string | null
          tags?: string[] | null
          embedding_status?: EmbeddingStatus
          created_at?: string
          updated_at?: string
        }
      }
      website_shortcuts: {
        Row: {
          id: string
          user_id: string
          folder_id: string | null
          url: string
          title: string
          description: string | null
          favicon_url: string | null
          og_image: string | null
          og_description: string | null
          author: string | null
          published_date: string | null
          embedding_status: EmbeddingStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          folder_id?: string | null
          url: string
          title: string
          description?: string | null
          favicon_url?: string | null
          og_image?: string | null
          og_description?: string | null
          author?: string | null
          published_date?: string | null
          embedding_status?: EmbeddingStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          folder_id?: string | null
          url?: string
          title?: string
          description?: string | null
          favicon_url?: string | null
          og_image?: string | null
          og_description?: string | null
          author?: string | null
          published_date?: string | null
          embedding_status?: EmbeddingStatus
          created_at?: string
          updated_at?: string
        }
      }
      embeddings: {
        Row: {
          id: string
          user_id: string
          file_id: string | null
          website_id: string | null
          patient_id: string | null
          content_chunk: string
          chunk_index: number
          embedding: number[] // pgvector represented as number array
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_id?: string | null
          website_id?: string | null
          patient_id?: string | null
          content_chunk: string
          chunk_index: number
          embedding: number[]
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_id?: string | null
          website_id?: string | null
          patient_id?: string | null
          content_chunk?: string
          chunk_index?: number
          embedding?: number[]
          metadata?: Json
          created_at?: string
        }
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          agent_type: AgentType
          title: string | null
          folder_context_id: string | null
          patient_context_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          agent_type: AgentType
          title?: string | null
          folder_context_id?: string | null
          patient_context_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          agent_type?: AgentType
          title?: string | null
          folder_context_id?: string | null
          patient_context_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          session_id: string
          role: MessageRole
          content: string
          citations: Json
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: MessageRole
          content: string
          citations?: Json
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: MessageRole
          content?: string
          citations?: Json
          created_at?: string
        }
      }
    }
    Functions: {
      match_embeddings: {
        Args: {
          query_embedding: number[]
          query_user_id: string
          match_threshold?: number
          match_count?: number
          filter_folder_id?: string | null
          filter_patient_id?: string | null
        }
        Returns: {
          id: string
          file_id: string | null
          website_id: string | null
          content_chunk: string
          metadata: Json
          similarity: number
        }[]
      }
    }
  }
}

// Helper types for easier use
export type Patient = Database['public']['Tables']['patients']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Folder = Database['public']['Tables']['folders']['Row']
export type File = Database['public']['Tables']['files']['Row']
export type WebsiteShortcut = Database['public']['Tables']['website_shortcuts']['Row']
export type Embedding = Database['public']['Tables']['embeddings']['Row']
export type ChatSession = Database['public']['Tables']['chat_sessions']['Row']
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']

export type InsertPatient = Database['public']['Tables']['patients']['Insert']
export type InsertProfile = Database['public']['Tables']['profiles']['Insert']
export type InsertFolder = Database['public']['Tables']['folders']['Insert']
export type InsertFile = Database['public']['Tables']['files']['Insert']
export type InsertWebsiteShortcut = Database['public']['Tables']['website_shortcuts']['Insert']
export type InsertEmbedding = Database['public']['Tables']['embeddings']['Insert']
export type InsertChatSession = Database['public']['Tables']['chat_sessions']['Insert']
export type InsertChatMessage = Database['public']['Tables']['chat_messages']['Insert']

export type UpdatePatient = Database['public']['Tables']['patients']['Update']
export type UpdateProfile = Database['public']['Tables']['profiles']['Update']
export type UpdateFolder = Database['public']['Tables']['folders']['Update']
export type UpdateFile = Database['public']['Tables']['files']['Update']
export type UpdateWebsiteShortcut = Database['public']['Tables']['website_shortcuts']['Update']
export type UpdateEmbedding = Database['public']['Tables']['embeddings']['Update']
export type UpdateChatSession = Database['public']['Tables']['chat_sessions']['Update']
export type UpdateChatMessage = Database['public']['Tables']['chat_messages']['Update']

