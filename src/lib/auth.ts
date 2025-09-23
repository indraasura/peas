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
  // First try to sign in as a POD committee member (has auth user)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (authData?.user) {
    // Clear any stored non-auth user session
    localStorage.removeItem('current_user_id')
    return authData
  }

  // If auth fails, check if it's a regular team member (no auth user)
  if (authError) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .neq('team', 'POD committee')
      .single()

    if (profileError || !profile) {
      throw authError // Return the original auth error
    }

    // For non-POD committee members, store the user ID in localStorage
    // This allows getCurrentUser() to find them later
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

  return authData
}
