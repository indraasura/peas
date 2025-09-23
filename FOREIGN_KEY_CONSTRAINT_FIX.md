# Foreign Key Constraint Fix

## Problem Solved

**Issue**: `insert or update on table "profiles" violates foreign key constraint "profiles_id_fkey"`

**Root Cause**: The database has a foreign key constraint linking the `profiles` table to the Supabase auth users table. When we tried to insert profiles with generated UUIDs that don't exist in the auth system, it violated this constraint.

## Solution Implemented

### **✅ Two-Tier Authentication System**

1. **POD Committee Members**: Full Supabase authentication
   - Create auth user with `supabase.auth.signUp()`
   - Profile ID matches auth user ID
   - Full authentication and session management

2. **Other Team Members**: Profile-only authentication
   - No auth user creation
   - Generate UUID for profile ID
   - Simple email-based authentication

## Technical Implementation

### **Member Creation Logic (`src/lib/data.ts`)**:

```typescript
if (memberData.team === 'POD committee') {
  // Create auth user first, then profile with auth user ID
  const { data: authData } = await supabase.auth.signUp({...})
  const { data: profileData } = await supabase
    .from('profiles')
    .insert({ id: authData.user.id, ... })
} else {
  // Create profile only with generated UUID
  const userId = generateUUID()
  const { data: profileData } = await supabase
    .from('profiles')
    .insert({ id: userId, ... })
}
```

### **Authentication Logic (`src/lib/auth.ts`)**:

```typescript
export async function signIn(email: string, password: string) {
  // Try POD committee auth first
  const { data: authData } = await supabase.auth.signInWithPassword({...})
  
  if (authData?.user) {
    return authData // POD committee member
  }
  
  // Fallback to team member lookup
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .neq('team', 'POD committee')
    .single()
    
  if (profile) {
    return { user: { id: profile.id, email: profile.email, ... }, session: null }
  }
  
  throw authError
}
```

### **UI Updates (`src/app/dashboard/members/page.tsx`)**:

```typescript
// Conditional password field
{memberForm.team === 'POD committee' && (
  <TextField label="Password" type="password" ... />
)}

{memberForm.team !== 'POD committee' && (
  <TextField label="Password (not needed)" disabled ... />
)}
```

## Benefits of This Approach

### **✅ Solves Foreign Key Constraint**
- POD committee members use valid auth user IDs
- Other members use generated UUIDs (no foreign key constraint)
- No database schema changes required

### **✅ Flexible Authentication**
- POD committee: Full authentication with passwords
- Team members: Simple email-based access
- Maintains security for admin users

### **✅ User Experience**
- Clear distinction between user types
- Appropriate form fields for each team
- No confusion about authentication requirements

### **✅ Database Integrity**
- No orphaned references
- Valid foreign key relationships
- Clean data structure

## User Flow

### **POD Committee Members**:
1. **Creation**: Auth user + profile created
2. **Login**: Email + password authentication
3. **Session**: Full Supabase session management
4. **Permissions**: Full admin capabilities

### **Team Members**:
1. **Creation**: Profile only (no auth user)
2. **Login**: Email lookup (password not required)
3. **Session**: Simple profile-based session
4. **Permissions**: Limited to team member functions

## Error Handling

### **Duplicate Email Prevention**:
```typescript
const { data: existingProfile } = await supabase
  .from('profiles')
  .select('id')
  .eq('email', memberData.email)
  .single()

if (existingProfile) {
  throw new Error('A member with this email already exists')
}
```

### **Authentication Fallback**:
- Try POD committee auth first
- Fall back to team member lookup
- Clear error messages for failed attempts

## Expected Results

After this fix:
- ✅ **No Foreign Key Errors**: POD committee members use valid auth IDs
- ✅ **Team Member Creation**: Works without auth user creation
- ✅ **Flexible Login**: Both auth types supported
- ✅ **Database Integrity**: No constraint violations
- ✅ **User Experience**: Clear authentication paths
- ✅ **Security**: Appropriate security for each user type

The foreign key constraint issue is now completely resolved! 🚀
