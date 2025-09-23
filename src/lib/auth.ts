import { supabase, type Profile } from './supabase'

export type { Profile }

export async function getCurrentUser(): Promise<Profile | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    // If we have an auth user, get their profile
    if (!error && user) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .limit(1)

      if (profileError || !profiles || profiles.length === 0) {
        console.error('Profile error:', profileError)
        return null
      }

      return profiles[0]
    }

    // If no auth user, check if there's a stored session for non-auth users
    // This is a fallback for team members who don't have auth users
    const storedUserId = localStorage.getItem('current_user_id')
    
    if (storedUserId) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', storedUserId)
        .limit(1)

      if (!profileError && profiles && profiles.length > 0) {
        return profiles[0]
      }
    }

    return null
  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}

export async function signOut() {
  // Clear auth session
  await supabase.auth.signOut()
  // Clear stored non-auth user session
  localStorage.removeItem('current_user_id')
}

export async function createMemberProfile(memberData: { name: string; email: string; team: string }) {
  // Only POD committee members can create member profiles
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.team !== 'POD committee') {
    throw new Error('Only POD committee members can create member profiles.')
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: crypto.randomUUID(), // Generate a UUID for non-auth users
      email: memberData.email,
      name: memberData.name,
      team: memberData.team
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating member profile:', error)
    throw new Error('Failed to create member profile. Please try again.')
  }

  return data
}

export async function signUp(email: string, password: string, userData: { name: string; team: string }) {
  // Only allow POD committee members to sign up
  if (userData.team !== 'POD committee') {
    throw new Error('Only POD committee members can create accounts. Please contact an administrator.')
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: userData.name,
        team: 'POD committee'
      }
    }
  })

  if (error) {
    console.error('Signup error:', error)
    throw error
  }

  // The profile will be created automatically by the database trigger
  // No need to manually create it here
  return data
}

export async function signIn(email: string, password: string) {
  try {
    // Only allow Supabase auth for POD committee members
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authData?.user) {
      // Clear any stored non-auth user session
      localStorage.removeItem('current_user_id')
      
      // Get profile for this auth user
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .limit(1)

      if (profileError || !profiles || profiles.length === 0) {
        // Profile doesn't exist, create one for POD committee member
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: authData.user.email!,
            name: authData.user.user_metadata?.name || 'User',
            team: 'POD committee'
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating profile:', createError)
          // If profile creation fails, still allow login but log the error
          console.warn('Profile creation failed, but allowing login')
        }
      } else {
        // Check if user is POD committee member
        const profile = profiles[0]
        if (profile.team !== 'POD committee') {
          await supabase.auth.signOut()
          throw new Error('Access denied. Only POD committee members can sign in.')
        }
      }

      return authData
    }

    // If Supabase auth fails, throw error
    if (authError) {
      if (authError.message?.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Only POD committee members can sign in.')
      }
      throw authError
    }

    throw new Error('Authentication failed. Please try again.')

  } catch (error: any) {
    // Handle specific error cases
    if (error.message?.includes('Email not confirmed') || 
        error.message?.includes('confirm') ||
        error.message?.includes('verification')) {
      throw new Error('Please check your email and confirm your account before logging in.')
    }
    
    throw error
  }
}
