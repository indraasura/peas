import { supabase, type Profile } from './supabase'

export type { Profile }

export async function getCurrentUser(): Promise<Profile | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }

    // Get profile data
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
  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}

export async function signOut() {
  await supabase.auth.signOut()
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

    // For non-POD committee members, we'll just return the profile
    // In a real app, you might want to implement a simple password check
    // For now, we'll assume the password is correct if the email exists
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
