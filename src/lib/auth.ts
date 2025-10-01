import { supabase, type Profile } from './supabase'

export type { Profile }

export async function getCurrentUser(): Promise<Profile | null> {
  try {
    // First check for Supabase auth user (POD committee members)
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (!error && user) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .limit(1)

      if (profileError || !profiles || profiles.length === 0) {
        return null
      }

      return profiles[0]
    }

    // If no auth user, check for member session
    const storedMemberId = localStorage.getItem('current_member_id')
    
    if (storedMemberId) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', storedMemberId)
        .limit(1)

      if (!profileError && profiles && profiles.length > 0) {
        const profile: Profile = profiles[0]
        return {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          team: profile.team,
          bandwidth: profile.bandwidth,
          available_bandwidth: profile.available_bandwidth,
          used_bandwidth: profile.used_bandwidth,
          created_at: profile.created_at,
          updated_at: profile.updated_at
        }
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
  // Clear stored member session
  localStorage.removeItem('current_member_id')
}

export async function canManagePodNotes(podId: string): Promise<boolean> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return false

  // POD committee members can manage all notes
  if (currentUser.team === 'POD committee') return true

  // For regular members, check if they're assigned to this POD
  const { data: podMembers, error } = await supabase
    .from('pod_members')
    .select('*')
    .eq('pod_id', podId)
    .eq('member_id', currentUser.id)

  if (error) {
    console.error('Error checking POD membership:', error)
    return false
  }

  return podMembers && podMembers.length > 0
}

export async function getMemberAssignedPods(): Promise<any[]> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return []

  // Get all PODs this member is assigned to
  const { data: podMembers, error } = await supabase
    .from('pod_members')
    .select(`
      *,
      pods (
        *,
        areas (*)
      )
    `)
    .eq('member_id', currentUser.id)

  if (error) {
    console.error('Error fetching assigned PODs:', error)
    return []
  }

  return podMembers || []
}

export async function createMemberProfile(memberData: { name: string; email: string; team: string; password: string; bandwidth?: number }) {
  // Only POD committee members can create member profiles
  const currentUser = await getCurrentUser()
  
  if (!currentUser) {
    throw new Error('You must be logged in to create member profiles.')
  }
  
  if (currentUser.team !== 'POD committee') {
    throw new Error(`Only POD committee members can create member profiles. Your team: ${currentUser.team}`)
  }

  // Use direct insert instead of RPC function to avoid dependency issues
  const newId = crypto.randomUUID()
  
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: newId,
      email: memberData.email,
      password_hash: memberData.password,
      name: memberData.name,
      team: memberData.team,
      bandwidth: memberData.bandwidth || 100,
      available_bandwidth: memberData.bandwidth || 100,
      used_bandwidth: 0
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating member profile:', error)
    throw new Error(`Failed to create member profile: ${error.message}`)
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
    // First, try Supabase auth (for POD committee members)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authData?.user) {
      // Clear any stored member session
      localStorage.removeItem('current_member_id')
      
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
          console.warn('Profile creation failed, but allowing login')
        }
      }

      return authData
    }

    // If Supabase auth fails, try profile authentication (for regular members)
    const { data: profileData, error: profileError } = await supabase.rpc('authenticate_profile', {
      p_email: email,
      p_password: password
    })

    if (profileData && profileData.length > 0) {
      const profile = profileData[0]
      // Store profile session
      localStorage.setItem('current_member_id', profile.id)
      
      // Return a mock auth response for members
      return {
        user: {
          id: profile.id,
          email: profile.email,
          user_metadata: {
            name: profile.name,
            team: profile.team,
            bandwidth: profile.bandwidth,
            available_bandwidth: profile.available_bandwidth,
            used_bandwidth: profile.used_bandwidth,
            is_member: true // Flag to identify this as a member, not POD committee
          }
        },
        session: null
      }
    }

    // If both fail, throw error
    if (authError) {
      if (authError.message?.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password.')
      }
      throw authError
    }

    throw new Error('Invalid email or password.')

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
