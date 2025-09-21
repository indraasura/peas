# Environment Setup Instructions

## Create Environment File

Create a file named `.env.local` in the root directory of your project with the following content:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## How to Get Your Supabase Credentials

1. **Go to Supabase Dashboard**: Visit [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. **Select Your Project**: Choose the project you want to use
3. **Navigate to API Settings**: Go to Settings → API
4. **Copy the Values**:
   - **Project URL**: Copy the "Project URL" and paste it as `NEXT_PUBLIC_SUPABASE_URL`
   - **API Key**: Copy the "anon public" key and paste it as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Example

If your Supabase project URL is `https://abcdefghijklmnop.supabase.co` and your anon key is `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`, your `.env.local` file should look like:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Important Notes

- The `.env.local` file should be in the root directory (same level as `package.json`)
- Never commit the `.env.local` file to version control
- The `.env.local` file is already included in `.gitignore`
- After creating the file, restart your development server (`npm run dev`)

## Next Steps

After setting up the environment variables:

1. Run the database schema: Copy and paste the contents of `database-schema.sql` into your Supabase SQL Editor
2. Start the development server: `npm run dev`
3. Visit `http://localhost:3000` to see your POD management application
