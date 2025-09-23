import { supabase, type Profile } from './supabase'

export type { Profile }

export async function getCurrentUser(): Promise<Profile | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    console.log('getCurrentUser - Auth user:', user?.id, 'Error:', error)
    
    // If we have an auth user, get their profile
    if (!error && user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      console.log('getCurrentUser - Profile for auth user:', profile, 'Error:', profileError)

      if (profileError) {
        console.error('Profile error:', profileError)
        return null
      }

      return profile
    }

    // If no auth user, check if there's a stored session for non-auth users
    // This is a fallback for team members who don't have auth users
    const storedUserId = localStorage.getItem('current_user_id')
    console.log('getCurrentUser - Stored user ID:', storedUserId)
    
    if (storedUserId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', storedUserId)
        .single()

      console.log('getCurrentUser - Profile for stored user:', profile, 'Error:', profileError)

      if (!profileError && profile) {
        return profile
      }
    }

    console.log('getCurrentUser - No user found')
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
  console.log('signIn - Attempting login for:', email)
  
  // First, check if this is a POD committee member by looking up their profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single()

  console.log('signIn - Profile lookup:', profile, 'Error:', profileError)

  if (profileError || !profile) {
    throw new Error('User not found')
  }

  // If it's a POD committee member, try Supabase auth
  if (profile.team === 'POD committee') {
    console.log('signIn - POD committee member, trying Supabase auth')
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    console.log('signIn - Supabase auth result:', authData?.user?.id, 'Error:', authError)

    if (authData?.user) {
      console.log('signIn - POD committee auth successful')
      // Clear any stored non-auth user session
      localStorage.removeItem('current_user_id')
      return authData
    }

    // If auth fails, check if it's an email confirmation issue
    if (authError) {
      console.error('POD committee auth error:', authError)
      
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
  console.log('signIn - Using profile-based auth for:', profile.team)
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
