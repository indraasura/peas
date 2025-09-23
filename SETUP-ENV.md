# Environment Setup Guide

## Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Supabase Setup

1. **Create a new Supabase project** at [supabase.com](https://supabase.com)

2. **Get your project credentials**:
   - Go to Settings → API
   - Copy the Project URL (this is your `NEXT_PUBLIC_SUPABASE_URL`)
   - Copy the `anon` public key (this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

3. **Set up the database**:
   - Go to the SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `database-schema.sql`
   - Run the SQL commands to create all tables, policies, and sample data

4. **Configure Authentication**:
   - Go to Authentication → Settings
   - Enable email confirmations if desired
   - Configure any additional auth settings as needed

## First POD Committee Member

To create your first POD committee member:

1. Run the application: `npm run dev`
2. Go to `/auth/signup`
3. Sign up with your email and password
4. Select "POD committee" as your team
5. Confirm your email (if email confirmation is enabled)
6. Sign in at `/auth/login`

## Creating Team Members

Once you're signed in as a POD committee member:

1. Go to `/dashboard/members`
2. Use the "Add Member" functionality to create profiles for other team members
3. These members will not have authentication accounts but can be assigned to PODs

## Troubleshooting

- **"User not found" error**: Make sure you're signing up as a POD committee member
- **Database errors**: Ensure you've run the complete `database-schema.sql` file
- **Build errors**: Make sure all dependencies are installed with `npm install`