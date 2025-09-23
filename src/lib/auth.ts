import { supabase, type Profile } from './supabase'

export type { Profile }

export async function getCurrentUser(): Promise<Profile | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    // If we have an auth user, get their profile
    if (!error && user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Profile error:', profileError)
        return null
      }

      return profile
    }

    // If no auth user, check if there's a stored session for non-auth users
    // This is a fallback for team members who don't have auth users
    const storedUserId = localStorage.getItem('current_user_id')
    
    if (storedUserId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', storedUserId)
        .single()

      if (!profileError && profile) {
        return profile
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
  // First, check if this is a POD committee member by looking up their profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single()

  if (profileError || !profile) {
    throw new Error('User not found')
  }

  // If it's a POD committee member, try Supabase auth
  if (profile.team === 'POD committee') {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authData?.user) {
      // Clear any stored non-auth user session
      localStorage.removeItem('current_user_id')
      return authData
    }

    // If auth fails, check if it's an email confirmation issue
    if (authError) {
      // If it's an email confirmation issue, provide a helpful message
      if (authError.message?.includes('Email not confirmed') || 
          authError.message?.includes('confirm') ||
          authError.message?.includes('verification')) {
        throw new Error('Please check your email and confirm your account before logging in.')
      }
      
      throw authError
    }
  }

  // For non-POD committee members, or if POD committee auth fails
  // Use the profile-based authentication (no password check for now)
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
}
