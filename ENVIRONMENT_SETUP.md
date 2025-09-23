# Environment Setup Guide

## Missing Supabase Environment Variables

The "Failed to fetch" error is because you don't have Supabase environment variables configured.

### Step 1: Create .env.local file

Create a file called `.env.local` in your project root with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Step 2: Get Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 3: Example .env.local

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcHJvamVjdC1pZCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjE5NTYzNTUyMDB9.your-signature-here
```

### Step 4: Restart Development Server

After creating `.env.local`:
```bash
npm run dev
```

### Step 5: Run Database Script

Run `database-minimal-fix.sql` in your Supabase SQL Editor to set up the database functions.

## Current Issue

- ❌ No `.env.local` file found
- ❌ Supabase client using placeholder values
- ❌ "Failed to fetch" because trying to connect to placeholder URL
- ❌ Authentication failing because no real Supabase connection

## After Setup

- ✅ Supabase connection will work
- ✅ Authentication will work
- ✅ Member creation will work
- ✅ All features will function properly
