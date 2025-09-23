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

export async function signUp(email: string, password: string, userData: { name: string; team: string }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData
    }
  })

  if (error) throw error

  // Create profile
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        email: data.user.email!,
        name: userData.name,
        team: userData.team
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
    }
  }

  return data
}

export async function signIn(email: string, password: string) {
  try {
    // First, try direct Supabase auth (for POD committee members)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authData?.user) {
      // Clear any stored non-auth user session
      localStorage.removeItem('current_user_id')
      
      // Try to get or create profile for this auth user
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .limit(1)

      if (profileError || !profiles || profiles.length === 0) {
        // Profile doesn't exist, create one
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: authData.user.email!,
            name: authData.user.user_metadata?.name || 'User',
            team: authData.user.user_metadata?.team || 'POD committee'
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating profile:', createError)
          // Still return auth data even if profile creation fails
        }
      }

      return authData
    }

    // If Supabase auth fails, check if there's a profile in the database
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .limit(1)

    if (profileError) {
      console.error('Profile lookup error:', profileError)
      throw new Error('Database error occurred. Please try again.')
    }

    if (!profiles || profiles.length === 0) {
      throw new Error('User not found. Please check your email or contact an administrator.')
    }

    // Get the first profile (in case there are duplicates)
    const profile = profiles[0]

    // For non-POD committee members, use profile-based authentication
    localStorage.setItem('current_user_id', profile.id)

    // Return a mock auth response
    return {
      user: {
        id: profile.id,
        email: profile.email,
        user_metadata: {
          name: profile.name,
          team: profile.team
        }
      },
      session: null // No real session for non-auth users
    }

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
