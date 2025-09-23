import { supabase, type Area, type Pod, type Profile, type PodMember, type PodNote, type AreaDecisionQuorum, type AreaComment } from './supabase'

// Areas
export async function getAreas(): Promise<Area[]> {
  try {
    // First try to get areas with decision quorum and comments
    const { data, error } = await supabase
      .from('areas')
      .select(`
        *,
        area_decision_quorum(
          *,
          member:profiles(*)
        ),
        area_comments(
          *,
          creator:profiles(*)
        )
      `)
      .order('name')

    if (error) {
      console.error('Error fetching areas with quorum:', error)
      // Fallback to simple query
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('areas')
        .select('*')
        .order('name')
      
      if (fallbackError) {
        console.error('Fallback query also failed:', fallbackError)
        return []
      }
      
      return (fallbackData || []).map(area => ({
        ...area,
        decision_quorum: [],
        comments: []
      }))
    }

    // Transform the data to include decision_quorum as an array of profiles and comments
    const areasWithQuorum = (data || []).map(area => ({
      ...area,
      decision_quorum: area.area_decision_quorum?.map((quorum: any) => quorum.member).filter(Boolean) || [],
      comments: area.area_comments?.map((comment: any) => ({
        ...comment,
        creator: comment.creator
      })) || []
    }))

    return areasWithQuorum
  } catch (error) {
    console.error('Unexpected error in getAreas:', error)
    // Return empty array to prevent breaking the app
    return []
  }
}

export async function createArea(area: Omit<Area, 'id' | 'created_at' | 'updated_at' | 'decision_quorum' | 'comments'>) {
  const { data, error } = await supabase
    .from('areas')
    .insert(area)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateArea(id: string, updates: Partial<Omit<Area, 'id' | 'created_at' | 'updated_at' | 'decision_quorum' | 'comments'>>) {
  const { data, error } = await supabase
    .from('areas')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteArea(id: string) {
  const { error } = await supabase
    .from('areas')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Area Decision Quorum Management
export async function updateAreaDecisionQuorum(areaId: string, memberIds: string[]) {
  try {
    // First, remove all existing quorum members for this area
    await supabase
      .from('area_decision_quorum')
      .delete()
      .eq('area_id', areaId)

    // Then, add the new quorum members
    if (memberIds.length > 0) {
      const quorumInserts = memberIds.map(memberId => ({
        area_id: areaId,
        member_id: memberId
      }))

      const { error } = await supabase
        .from('area_decision_quorum')
        .insert(quorumInserts)

      if (error) throw error
    }
  } catch (error) {
    console.error('Error updating area decision quorum:', error)
    throw error
  }
}

// POD Members Management
export async function updatePodMembers(podId: string, members: Array<{
  member_id: string
  bandwidth_percentage: number
  is_leader: boolean
}>) {
  try {
    // First, remove all existing members for this POD
    const { error: deleteError } = await supabase
      .from('pod_members')
      .delete()
      .eq('pod_id', podId)

    if (deleteError) {
      console.error('Error deleting existing POD members:', deleteError)
    }

    // Then, add the new members
    if (members.length > 0) {
      const memberInserts = members.map(member => ({
        pod_id: podId,
        member_id: member.member_id,
        bandwidth_percentage: member.bandwidth_percentage,
        is_leader: member.is_leader
      }))

      const { error } = await supabase
        .from('pod_members')
        .insert(memberInserts)

      if (error) {
        console.error('Error inserting new POD members:', error)
        throw error
      }
    }
  } catch (error) {
    console.error('Error updating POD members:', error)
    throw error
  }
}

// Members/Profiles
export async function getMembers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      pod_members(
        bandwidth_percentage,
        pod:pods(name)
      )
    `)
    .order('name')

  if (error) {
    console.error('Error fetching members:', error)
    return []
  }

  return data || []
}

export async function getAvailableMembers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      pod_members(bandwidth_percentage)
    `)
    .neq('team', 'POD committee')
    .order('name')

  if (error) {
    console.error('Error fetching available members:', error)
    return []
  }

  // Calculate available bandwidth
  const membersWithBandwidth = (data || []).map(member => {
    const usedBandwidth = member.pod_members?.reduce((sum: number, pm: any) => 
      sum + (pm.bandwidth_percentage || 0), 0) || 0
    const availableBandwidth = Math.max(0, 100 - usedBandwidth)
    
    return {
      ...member,
      available_bandwidth: availableBandwidth,
      used_bandwidth: usedBandwidth
    }
  })

  return membersWithBandwidth.filter(member => member.available_bandwidth > 0)
}

// PODs
export async function getPods(): Promise<Pod[]> {
  const { data, error } = await supabase
    .from('pods')
    .select(`
      *,
      area:areas(*),
      pod_members(
        *,
        member:profiles(*)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching pods:', error)
    return []
  }

  // Ensure area data is properly structured and map pod_members to members
  const podsWithAreas = (data || []).map(pod => ({
    ...pod,
    area: pod.area || null,
    members: pod.pod_members || []
  }))

  return podsWithAreas
}

export async function createPod(podData: {
  name: string
  description: string
  area_id: string
  start_date?: string
  end_date?: string
  members?: Array<{
    member_id: string
    bandwidth_percentage: number
    is_leader: boolean
  }>
}) {
  const { data: pod, error: podError } = await supabase
    .from('pods')
    .insert({
      name: podData.name,
      description: podData.description,
      area_id: podData.area_id,
      start_date: podData.start_date,
      end_date: podData.end_date,
      status: 'backlog'
    })
    .select()
    .single()

  if (podError) throw podError

  // Add members if provided
  if (podData.members && podData.members.length > 0) {
    const memberInserts = podData.members.map(member => ({
      pod_id: pod.id,
      member_id: member.member_id,
      bandwidth_percentage: member.bandwidth_percentage,
      is_leader: member.is_leader
    }))

    const { error: membersError } = await supabase
      .from('pod_members')
      .insert(memberInserts)

    if (membersError) {
      console.error('Error adding pod members:', membersError)
    }
  }

  return pod
}

export async function updatePod(id: string, updates: Partial<Pod>) {
  const { data, error } = await supabase
    .from('pods')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deletePod(id: string) {
  const { error } = await supabase
    .from('pods')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// POD Notes
export async function getPodNotes(podId: string): Promise<PodNote[]> {
  const { data, error } = await supabase
    .from('pod_notes')
    .select(`
      *,
      creator:profiles(*)
    `)
    .eq('pod_id', podId)
    .order('review_date', { ascending: false })

  if (error) {
    console.error('Error fetching POD notes:', error)
    return []
  }

  return data || []
}

export async function createPodNote(noteData: {
  pod_id: string
  review_date: string
  blockers?: string
  learnings?: string
  current_state?: string
  deviation_to_plan?: string
  dependencies_risks?: string
  misc?: string
  created_by: string
}) {
  const { data, error } = await supabase
    .from('pod_notes')
    .insert(noteData)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePodNote(id: string, updates: Partial<PodNote>) {
  const { data, error } = await supabase
    .from('pod_notes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deletePodNote(id: string) {
  const { error } = await supabase
    .from('pod_notes')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getPodNote(id: string): Promise<PodNote | null> {
  const { data, error } = await supabase
    .from('pod_notes')
    .select(`
      *,
      creator:profiles(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching POD note:', error)
    return null
  }

  return data
}

// POD Dependencies Management
export async function updatePodDependencies(podId: string, dependentPodIds: string[]) {
  try {
    // First, remove all existing dependencies for this POD
    await supabase
      .from('pod_dependencies')
      .delete()
      .eq('pod_id', podId)

    // Then, add the new dependencies
    if (dependentPodIds.length > 0) {
      const dependencyInserts = dependentPodIds.map(dependentPodId => ({
        pod_id: podId,
        dependent_pod_id: dependentPodId
      }))

      const { error } = await supabase
        .from('pod_dependencies')
        .insert(dependencyInserts)

      if (error) {
        console.error('Error inserting POD dependencies:', error)
        throw error
      }
    }
  } catch (error) {
    console.error('Error updating POD dependencies:', error)
    throw error
  }
}

export async function getPodDependencies(podId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('pod_dependencies')
    .select('dependent_pod_id')
    .eq('pod_id', podId)

  if (error) {
    console.error('Error fetching POD dependencies:', error)
    return []
  }

  return data?.map(dep => dep.dependent_pod_id) || []
}

// Area Comments Management
export async function getAreaComments(areaId: string): Promise<AreaComment[]> {
  const { data, error } = await supabase
    .from('area_comments')
    .select(`
      *,
      creator:profiles(*)
    `)
    .eq('area_id', areaId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching area comments:', error)
    return []
  }

  return data || []
}

export async function createAreaComment(commentData: {
  area_id: string
  content: string
  created_by: string
}) {
  const { data, error } = await supabase
    .from('area_comments')
    .insert(commentData)
    .select(`
      *,
      creator:profiles(*)
    `)
    .single()

  if (error) throw error
  return data
}

export async function updateAreaComment(id: string, updates: Partial<AreaComment>) {
  const { data, error } = await supabase
    .from('area_comments')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      creator:profiles(*)
    `)
    .single()

  if (error) throw error
  return data
}

export async function deleteAreaComment(id: string) {
  const { error } = await supabase
    .from('area_comments')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Get planned areas only (for POD creation dropdown)
export async function getPlannedAreas(): Promise<Area[]> {
  try {
    const { data, error } = await supabase
      .from('areas')
      .select(`
        *,
        area_decision_quorum(
          *,
          member:profiles(*)
        )
      `)
      .eq('status', 'planned')
      .order('name')

    if (error) {
      console.error('Error fetching planned areas:', error)
      return []
    }

    // Transform the data to include decision_quorum as an array of profiles
    const areasWithQuorum = (data || []).map(area => ({
      ...area,
      decision_quorum: area.area_decision_quorum?.map((quorum: any) => quorum.member).filter(Boolean) || []
    }))

    return areasWithQuorum
  } catch (error) {
    console.error('Unexpected error in getPlannedAreas:', error)
    return []
  }
}

// Member Management Functions
export async function createMember(memberData: {
  name: string
  email: string
  team: string
  password?: string
}): Promise<Profile> {
  try {
    // First, create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: memberData.email,
      password: memberData.password || 'temp123456', // Temporary password
      options: {
        data: {
          name: memberData.name,
          team: memberData.team
        }
      }
    })

    if (authError) {
      throw authError
    }

    if (!authData.user) {
      throw new Error('Failed to create user account')
    }

    // Create the profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        name: memberData.name,
        email: memberData.email,
        team: memberData.team
      })
      .select()
      .single()

    if (profileError) {
      throw profileError
    }

    return profileData
  } catch (error) {
    console.error('Error creating member:', error)
    throw error
  }
}

export async function updateMember(memberId: string, updates: {
  name?: string
  email?: string
  team?: string
}): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', memberId)
    .select()
    .single()

  if (error) {
    console.error('Error updating member:', error)
    throw error
  }

  return data
}

export async function deleteMember(memberId: string): Promise<void> {
  try {
    // Delete the profile first
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', memberId)

    if (profileError) {
      throw profileError
    }

    // Note: In a real application, you might want to delete the auth user as well
    // This requires admin privileges and should be done carefully
    console.log('Profile deleted. Auth user deletion requires admin privileges.')
  } catch (error) {
    console.error('Error deleting member:', error)
    throw error
  }
}

export async function isPODCommitteeMember(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('team')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error checking POD committee membership:', error)
    return false
  }

  return data?.team === 'POD committee'
}