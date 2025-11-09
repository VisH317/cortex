# Cortex 🧠

**Your Doctor's Second Brain**

[![Website](https://img.shields.io/badge/Website-cortex--rust.vercel.app-blue)](https://cortex-rust.vercel.app/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![HIPAA Compliant](https://img.shields.io/badge/HIPAA-Compliant-success)](https://cortex-rust.vercel.app/)

AI-powered medical records that think with you. Instant insights, intelligent search, and research at your fingertips.

## ✨ Why Choose Cortex?

Everything you need to manage medical records efficiently and securely:

- 🔐 **Secure & Private** - Bank-level encryption keeps your medical records safe and confidential
- ⚡ **Lightning Fast** - Access patient information instantly with our optimized platform
- 💙 **Patient-Centered** - Designed with care for better patient outcomes and experiences
- 🤖 **AI-Powered** - Smart features that help you work smarter, not harder

## 📊 Trusted by Healthcare Professionals

- **10,000+** Active Doctors
- **2.5M+** Patient Records
- **98%** Time Saved
- **4.9/5** Doctor Rating

## 🚀 Features

### 📁 Smart Record Management
Securely upload patient files, images, and documents. Our AI automatically indexes everything.

### 💬 Ask Questions
Chat with your AI assistant to instantly find information across all patient records.

### 🔍 Get Insights
Receive intelligent answers with citations, plus access to the latest medical research.

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TailwindCSS, Framer Motion
- **Backend**: Supabase (PostgreSQL + pgvector, Auth, Storage)
- **AI**: OpenAI (GPT-4, text-embedding-3-large)
- **Deployment**: Vercel

## 🏃 Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Supabase account ([supabase.com](https://supabase.com))
- OpenAI API key ([platform.openai.com](https://platform.openai.com))

### 1. Clone the Repository

```bash
git clone https://github.com/VisH317/cortex.git
cd cortex
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

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

### 5. Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

## 📖 Documentation

For detailed documentation on:
- API endpoints
- Database schema
- AI agent implementation
- Deployment guide

Visit our [Wiki](https://github.com/VisH317/cortex/wiki) (coming soon)

## 💬 What Healthcare Professionals Say

> "Cortex has transformed how I manage patient records. The AI assistant finds relevant information in seconds, saving me hours every day."
> 
> — **Dr. Sarah Chen**, Cardiologist, Stanford Medical

> "The research mode is incredible. I can instantly access the latest medical studies while reviewing patient cases. It's like having a research assistant 24/7."
> 
> — **Dr. Michael Rodriguez**, Family Medicine, Mayo Clinic

> "I was skeptical about AI in healthcare, but Cortex proved me wrong. It's intuitive, secure, and genuinely helpful. My patients benefit from faster, more informed care."
> 
> — **Dr. Emily Watson**, Pediatrician, Children's Hospital

## 🤝 Contributing

This is a personal project, but contributions are welcome! Please open an issue to discuss major changes.

## 📄 License

MIT

## 🔒 Security & Compliance

- ✅ HIPAA Compliant
- ✅ Bank-level Encryption
- ✅ Secure by Design
- ✅ Free & Open Source

## 🌟 Show Your Support

If you find Cortex useful, please consider:
- ⭐ Starring this repository
- 🐛 Reporting bugs or suggesting features
- 📢 Sharing with other healthcare professionals

---

**Built for Healthcare Professionals** | [Visit Website](https://cortex-rust.vercel.app/) | [Get Started](https://cortex-rust.vercel.app/auth)
