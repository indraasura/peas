# POD Management App

A Next.js application for managing Product-Oriented Development (POD) teams and projects.

## Features

- **POD Committee Authentication**: Only POD committee members can sign up and sign in
- **Member Management**: POD committee members can create and manage other team members
- **Area Management**: Organize work into different areas with priority scoring
- **POD Management**: Create and manage PODs with member assignments
- **Kanban Board**: Visual project management with drag-and-drop functionality
- **Notes & Reviews**: Track POD progress with regular reviews and notes

## Authentication

### POD Committee Members
- Can sign up and sign in using email/password
- Have full access to all features
- Can create and manage other team members
- Can create, edit, and delete areas, PODs, and assignments

### Other Team Members
- Cannot sign up or sign in directly
- Must be created by POD committee members
- Can be assigned to PODs and areas
- Profiles are managed by POD committee members

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env.local` file with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Set up database**:
   
   **Option A: Fresh Setup (if no tables exist)**:
   Run the SQL commands in `database-schema.sql` in your Supabase SQL editor.
   
   **Option B: Migration (if tables already exist)**:
   Run the SQL commands in `database-migration.sql` in your Supabase SQL editor.
   
   **Option C: Reset Everything (if you want to start fresh)**:
   Run `database-reset.sql` first, then `database-schema.sql`.

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

## Database Schema

The application uses the following main tables:
- `profiles`: User profiles (POD committee members and other team members)
- `areas`: Work areas with priority scoring
- `pods`: Product-Oriented Development teams
- `pod_members`: POD member assignments with bandwidth allocation
- `pod_notes`: Regular POD reviews and progress tracking
- `area_comments`: Discussion threads for areas
- `area_decision_quorum`: POD committee members responsible for area decisions

## Key Files

- `src/lib/auth.ts`: Authentication logic (POD committee only)
- `src/lib/supabase.ts`: Database types and Supabase client
- `src/components/KanbanBoard.tsx`: Drag-and-drop project management
- `database-schema.sql`: Complete database schema with RLS policies

## Security

- Row Level Security (RLS) is enabled on all tables
- Only POD committee members can perform write operations
- All other users have read-only access
- Authentication is restricted to POD committee members only

## Deployment

The app is configured for deployment on Netlify with the included `netlify.toml` configuration.