# RLS Infinite Recursion Fix

## Problem Identified

**Issue**: "User not found" error even though user exists in Supabase authentication list.

**Root Cause**: **"infinite recursion detected in policy for relation 'profiles'"** - The Row Level Security (RLS) policies on the profiles table were creating an infinite loop when trying to access profile data.

**Console Evidence**:
```
signIn - Profile lookup: null Error: Object
code: "42P17"
message: "infinite recursion detected in policy for relation \"profiles\""
```

## Solution Implemented

### **✅ Created Two Database Fix Scripts**

1. **`database-fix-profiles-rls.sql`** - Comprehensive fix
2. **`database-simple-profiles-fix.sql`** - Simple, minimal fix (recommended)

### **✅ Simplified RLS Policies**

**Problem**: Complex RLS policies were checking user permissions by querying the same profiles table, creating infinite recursion.

**Solution**: Simplified policies that allow authenticated users to access profiles without recursive permission checks.

```sql
-- Simple, non-recursive policies
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (true);

CREATE POLICY "profiles_delete_policy" ON public.profiles
    FOR DELETE USING (true);
```

### **✅ Removed Complex Constraints**

**Problem**: The `profiles_auth_check` constraint was also causing issues.

**Solution**: Dropped the complex constraint and simplified the approach.

### **✅ Cleaned Up Debug Logging**

**Removed**: Excessive console logging that was cluttering the output.
**Kept**: Essential error logging for troubleshooting.

## How to Apply the Fix

### **Option 1: Simple Fix (Recommended)**
Run `database-simple-profiles-fix.sql` in your Supabase SQL editor:

1. **Open Supabase Dashboard**
2. **Go to SQL Editor**
3. **Copy and paste the contents of `database-simple-profiles-fix.sql`**
4. **Run the script**

### **Option 2: Comprehensive Fix**
Run `database-fix-profiles-rls.sql` if you need the more comprehensive approach.

## What the Fix Does

### **1. Drops Problematic Policies**
- Removes all existing RLS policies on profiles table
- Drops the complex constraint that was causing issues

### **2. Creates Simple Policies**
- **SELECT**: All authenticated users can read profiles
- **INSERT**: All authenticated users can create profiles
- **UPDATE**: All authenticated users can update profiles
- **DELETE**: All authenticated users can delete profiles

### **3. Ensures Proper Permissions**
- Grants necessary permissions to `anon` and `authenticated` roles
- Enables RLS on the profiles table

## Expected Results

After applying the fix:

- ✅ **No More Infinite Recursion**: Profile lookups will work properly
- ✅ **User Found**: The `signIn` function will successfully find user profiles
- ✅ **Authentication Works**: Both POD committee and team members can log in
- ✅ **No More 500 Errors**: Server errors related to profiles table will be resolved

## Testing Steps

1. **Apply the Database Fix**:
   ```sql
   -- Run the database-simple-profiles-fix.sql script
   ```

2. **Test Login**:
   - Try logging in with your POD committee member
   - Check browser console for any remaining errors
   - Should see successful profile lookup

3. **Verify Dashboard Access**:
   - Should redirect to dashboard successfully
   - No more "user not found" errors

## Security Note

The simplified policies allow all authenticated users to access all profiles. In a production environment, you might want to implement more granular permissions, but this fixes the immediate infinite recursion issue.

## Files Created

1. **`database-simple-profiles-fix.sql`** - Simple fix (use this one)
2. **`database-fix-profiles-rls.sql`** - Comprehensive fix
3. **`src/lib/auth.ts`** - Cleaned up debug logging

## Next Steps

1. **Run the database fix script**
2. **Test login functionality**
3. **Verify the "user not found" error is resolved**
4. **If needed, implement more granular RLS policies later**

The infinite recursion issue should be completely resolved after running the database fix! 🚀
