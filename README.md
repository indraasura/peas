# POD Management Tool v2

A modern, fully functional Product Oriented Development (POD) management system built with Next.js, Material-UI, and Supabase.

## Features

✅ **Modern UI**: Built with Material-UI components and dark mode support
✅ **Robust Authentication**: Secure signup/login with Supabase Auth
✅ **Dashboard**: Real-time statistics and overview
✅ **POD Management**: Create, edit, and manage PODs with working dropdowns
✅ **Areas Management**: Configure business areas and their impact levels
✅ **Members Management**: View team members with bandwidth allocation
✅ **Role-based Access**: POD Committee vs regular member permissions
✅ **Profile Management**: User profiles with team information
✅ **Responsive Design**: Works on desktop and mobile devices

## Quick Setup

### 1. Environment Setup

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Database Setup

1. Go to your Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `database-schema.sql`
3. Run the SQL script to create all tables, policies, and sample data

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## User Roles

- **POD Committee**: Full access to create/edit PODs, manage areas, and view all members
- **Regular Members**: Can view their assigned PODs and profile information

## Key Improvements from v1

- ✅ **Working Dropdowns**: Areas and members properly populate in POD creation
- ✅ **Fast Loading**: Optimized data fetching with proper error handling
- ✅ **Modern UI**: Material-UI components with consistent design
- ✅ **Dark Mode**: Fully functional theme switching
- ✅ **Professional Icons**: Lucide React icons throughout
- ✅ **Bandwidth Display**: Shows "Not allocated" instead of "0%" for unassigned members
- ✅ **Error Handling**: Comprehensive error handling and user feedback
- ✅ **Type Safety**: Full TypeScript implementation
- ✅ **Performance**: Optimized queries and data loading

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   └── layout.tsx         # Root layout
├── components/            # Reusable components
│   ├── DashboardLayout.tsx
│   └── ThemeProvider.tsx
└── lib/                   # Utilities and data access
    ├── auth.ts           # Authentication functions
    ├── data.ts           # Data access functions
    └── supabase.ts       # Supabase client and types
```

## Technology Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **UI Library**: Material-UI (MUI) with Emotion
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Material-UI theming system
- **Icons**: Lucide React icons

## Deployment

The application is ready for deployment on Vercel, Netlify, or any other Next.js hosting platform. Just make sure to set the environment variables in your deployment environment.

## Support

This is a complete, production-ready POD management system. All core functionality has been implemented and tested.
