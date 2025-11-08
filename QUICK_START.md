# SynapseVault - Quick Start Guide

## 🚀 What's Been Built

You now have a fully functional AI-powered research file system with:

### Core Features
- ✅ **Folder Management** - Create, navigate, delete nested folders
- ✅ **File Upload** - Drag-and-drop for text and code files
- ✅ **File Viewing** - In-browser file viewer with language detection
- ✅ **Website Shortcuts** - Save and organize web resources
- ✅ **Beautiful UI** - Modern design with dark mode support
- ✅ **Authentication** - Email/password + Google OAuth
- ✅ **Security** - Row-level security with Supabase

## 📋 Setup Checklist

### 1. Database Setup
```bash
# Your DATABASE_URL is already configured
# Run the migration script you created:
node scripts/migrate.ts
```

### 2. Create Supabase Storage Bucket
In your Supabase Dashboard:
1. Go to **Storage**
2. Create a new bucket named `files`
3. Set it to **Private**
4. Add the storage policies from `supabase/storage-policies.md`

### 3. Environment Variables
Your `.env.local` should have:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
OPENAI_API_KEY=your-openai-key (for future embeddings)
```

### 4. Run the App
```bash
pnpm dev
```

Visit `http://localhost:3000`

## 🎯 How to Use

### Create Your First Folder
1. Sign up or log in
2. Click "New Folder" in the top bar
3. Enter a name → folder created with automatic slug

### Upload a File
1. Click "Upload Files"
2. Drag and drop or select text/code files (.txt, .md, .js, .py, etc.)
3. Files are automatically classified and stored

### Add a Website
1. Click "Add Website"
2. Enter URL and title
3. Website appears as a shortcut with favicon

### Navigate
- Use the **folder tree** sidebar to jump between folders
- Use **breadcrumbs** at the top to go back
- Click any file to view it
- Click folders to navigate into them

## 📂 Current File Support

**Text Files:** .txt, .md, .log, .csv  
**Code Files:** .js, .ts, .py, .java, .go, .rs, .php, etc.  
**Websites:** Any valid URL

## 🔧 Key Files Created

| File | Purpose |
|------|---------|
| `src/lib/actions/folders.ts` | Folder CRUD operations |
| `src/components/FolderTree.tsx` | Sidebar navigation |
| `src/components/FileUploadModal.tsx` | File upload UI |
| `src/components/FileViewer.tsx` | File display |
| `src/components/VaultContent.tsx` | Main vault interface |
| `src/lib/utils/file-utils.ts` | File type classification |
| `src/app/vault/[...slug]/page.tsx` | Dynamic folder routing |

## 🎨 UI Features

- **Grid View**: Visual card layout
- **List View**: Compact list with details
- **Dark Mode**: Automatic support
- **Responsive**: Works on all screen sizes
- **Animations**: Smooth transitions with Framer Motion

## 🔐 Security

- All routes protected with middleware
- Row-level security in Supabase
- Files isolated by user ID
- Signed URLs for file access (1-hour expiry)

## ⚡ What's Next

### To Complete Phase 1 (Embeddings):
1. Install text extraction libraries:
   ```bash
   pnpm add pdf-parse mammoth
   ```
2. Create embedding generation API route
3. Implement chunking strategy
4. Call OpenAI embedding API
5. Store vectors in pgvector

### Phase 2: Enhanced File System
- File rename/move
- Bulk operations
- Advanced search
- File tags

### Phase 3: Finder Agent (RAG)
- Vector similarity search
- Chat interface
- Context retrieval
- Citation generation

## 🐛 Troubleshooting

**Files not uploading?**
- Check Supabase storage bucket exists and is named `files`
- Verify storage policies are set up
- Check browser console for errors

**Folders not showing?**
- Refresh the page
- Check Supabase database connection
- Verify RLS policies are applied

**Can't sign in?**
- Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- For Google OAuth, configure redirect URI in Google Cloud Console

## 📊 Database Structure

```
profiles          → User info
folders           → Hierarchical folder structure
files             → File metadata + storage paths
website_shortcuts → Saved websites
embeddings        → Vector embeddings (ready for Phase 1 completion)
chat_sessions     → Future: AI agent conversations
chat_messages     → Future: Chat history
```

## 💡 Tips

1. **Organize early**: Create folders before uploading lots of files
2. **Use meaningful names**: Folder slugs are generated from names
3. **Website shortcuts**: Great for saving research papers, documentation
4. **Embedding status**: Track which files are indexed (shown in file viewer)
5. **File types**: Currently limited to text/code - expand in `file-utils.ts`

## 🎉 You're All Set!

Your research workspace is ready. Start uploading files, organizing folders, and when you're ready, implement embeddings for AI-powered search!

---

**Questions?** Check `IMPLEMENTATION_STATUS.md` for detailed feature breakdown.

