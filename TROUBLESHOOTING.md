# Troubleshooting Guide

## Issues and Solutions

### 1. Assigned Members Not Showing in POD List

**Problem**: Members are not displaying in the POD list even though they are assigned.

**Possible Causes & Solutions**:

#### A. Missing Environment Variables
The most common cause is missing Supabase environment variables.

**Solution**: Create a `.env.local` file in the root directory with your Supabase credentials:

```bash
# Create .env.local file
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**How to get your Supabase credentials**:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy the "Project URL" and "anon public" key

#### B. Database Schema Issues
Ensure the database schema is properly set up.

**Solution**: Run the database schema in your Supabase SQL Editor:
1. Copy the contents of `database-schema-update.sql`
2. Paste it into your Supabase SQL Editor
3. Execute the script

#### C. POD Members Not Created
Check if POD members are being created when you create/edit PODs.

**Solution**: 
1. Create a new POD and assign members
2. Check the `pod_members` table in Supabase to verify records are created
3. Ensure the relationship between `pods` and `pod_members` is working

### 2. My PODs Error for Non-POD Committee Members

**Problem**: Application error when non-POD committee users try to access My PODs.

**Possible Causes & Solutions**:

#### A. Authentication Issues
The user might not be properly authenticated.

**Solution**:
1. Ensure the user is logged in
2. Check if the user has a profile in the `profiles` table
3. Verify the user's `team` field is set correctly

#### B. Missing User Profile
The user might not have a profile record.

**Solution**:
1. Check the `profiles` table in Supabase
2. Ensure the user has a record with their `id`, `email`, `name`, and `team`
3. If missing, create a profile record manually or through the signup process

#### C. Database Connection Issues
Supabase connection might be failing.

**Solution**:
1. Verify your Supabase credentials in `.env.local`
2. Check if your Supabase project is active
3. Ensure Row Level Security (RLS) policies are set up correctly

## Debugging Steps

### 1. Check Browser Console
Open browser developer tools and check for any JavaScript errors or network failures.

### 2. Check Supabase Dashboard
1. Go to your Supabase project dashboard
2. Check the "Logs" section for any errors
3. Verify your tables have data

### 3. Test Database Connection
Create a simple test to verify Supabase connection:

```javascript
// Add this to any page temporarily to test
useEffect(() => {
  const testConnection = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').limit(1)
      console.log('Connection test:', { data, error })
    } catch (err) {
      console.error('Connection failed:', err)
    }
  }
  testConnection()
}, [])
```

### 4. Verify Data Structure
Check if the data is being fetched correctly:

```javascript
// Add this to PODs page to debug
useEffect(() => {
  const debugData = async () => {
    const pods = await getPods()
    console.log('PODs with members:', pods)
  }
  debugData()
}, [])
```

## Common Fixes

### 1. Restart Development Server
After making changes to environment variables:
```bash
npm run dev
```

### 2. Clear Browser Cache
Clear your browser cache and cookies, then try again.

### 3. Check Network Tab
In browser developer tools, check the Network tab to see if API calls are failing.

### 4. Verify RLS Policies
Ensure your Supabase tables have proper Row Level Security policies:

```sql
-- Example RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pod_members ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all data
CREATE POLICY "Allow authenticated reads" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated reads" ON public.pods FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated reads" ON public.pod_members FOR SELECT USING (auth.uid() IS NOT NULL);
```

## Still Having Issues?

If you're still experiencing problems:

1. **Check the browser console** for specific error messages
2. **Verify your Supabase project** is active and accessible
3. **Ensure all environment variables** are set correctly
4. **Check the database schema** matches the expected structure
5. **Test with a fresh browser session** (incognito/private mode)

The most common issue is missing environment variables, so start there first!
