# SynapseVault 🧠

An AI-powered research workspace that intelligently organizes, discovers, and synthesizes knowledge from any source.

## Features

- 🗂️ **Smart File Management** - Upload and organize documents, images, videos, code, datasets, and more
- 🔗 **Website Shortcuts** - Save and index web pages as first-class research items
- 🤖 **AI Agents**:
  - **Finder Agent** - Search your vault and get answers with citations
  - **Curator Agent** - Automatically discover and organize relevant research
  - **Generator Agent** - Create literature reviews and research summaries
- 🔍 **Semantic Search** - Find content by meaning using vector embeddings
- 📁 **Hierarchical Folders** - Organize research with nested folder structures

## Tech Stack

- **Frontend**: Next.js 16, React 19, TailwindCSS, Framer Motion
- **Backend**: Supabase (PostgreSQL + pgvector, Auth, Storage)
- **AI**: OpenAI (GPT-4, text-embedding-3-large)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Supabase account ([supabase.com](https://supabase.com))
- OpenAI API key ([platform.openai.com](https://platform.openai.com))

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd brainbox
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migrations:
   - Execute `supabase/migrations/001_initial_schema.sql`
   - Execute `supabase/migrations/002_rls_policies.sql`
3. Enable the **pgvector** extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
4. Create a storage bucket named `files`:
   - Go to **Storage** in Supabase Dashboard
   - Create a new bucket called `files`
   - Set it to **Private**
5. Set up storage policies (follow instructions in `supabase/storage-policies.md`)

### 4. Configure Authentication

In your Supabase Dashboard:

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. (Optional) Enable **Google OAuth**:
   - Create OAuth credentials in Google Cloud Console
   - Add authorized redirect URI: `https://[your-project-id].supabase.co/auth/v1/callback`
   - Copy Client ID and Secret to Supabase

### 5. Set Up Environment Variables

Copy the example environment file:

```bash
cp env.example .env.local
```

Edit `.env.local` with your credentials:

```bash
# Supabase (from Supabase Dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app!

## Project Structure

```
brainbox/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── page.tsx           # Landing page
│   │   ├── auth/              # Authentication pages
│   │   ├── vault/             # Main app (file system)
│   │   └── api/               # API routes (coming soon)
│   ├── components/            # React components
│   │   └── ui/                # UI components
│   ├── lib/                   # Utilities
│   │   └── supabase/          # Supabase clients
│   └── types/                 # TypeScript types
├── supabase/                  # Database migrations
│   └── migrations/
├── public/                    # Static assets
└── README.md
```

## Development Roadmap

### ✅ Phase 1: Foundation (Current)
- [x] Database schema with pgvector
- [x] Landing page
- [x] Authentication (email + Google OAuth)
- [x] File system home page UI
- [ ] File upload/download functionality
- [ ] Website shortcut creation
- [ ] Embedding generation pipeline

### 🚧 Phase 2: Folder Navigation (Next)
- [ ] Dynamic routing with slugs
- [ ] Folder tree sidebar
- [ ] File organization (move, rename, delete)
- [ ] File preview

### 📋 Phase 3: Finder Agent
- [ ] Chat interface
- [ ] RAG implementation with pgvector
- [ ] Context-aware search
- [ ] Chat history

### 📋 Phase 4: Curator Agent
- [ ] External source discovery
- [ ] ArXiv/Semantic Scholar integration
- [ ] Import workflow
- [ ] Duplicate detection

### 📋 Phase 5: Generator Agent
- [ ] Report generation
- [ ] Citation formatting
- [ ] Export to PDF/DOCX

## Contributing

This is a personal project, but contributions are welcome! Please open an issue to discuss major changes.

## License

MIT

---

Built with ❤️ for researchers by researchers
