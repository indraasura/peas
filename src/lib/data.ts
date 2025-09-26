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

export async function createArea(area: Omit<Area, 'id' | 'created_at' | 'updated_at' | 'decision_quorum' | 'comments' | 'pods'>) {
  // Convert empty strings to null for PostgreSQL date fields
  const cleanArea = {
    ...area,
    start_date: area.start_date && area.start_date.trim() !== '' ? area.start_date : null,
    end_date: area.end_date && area.end_date.trim() !== '' ? area.end_date : null,
    status: area.status || 'Backlog'
  }

  const { data, error } = await supabase
    .from('areas')
    .insert(cleanArea)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateArea(id: string, updates: Partial<Omit<Area, 'id' | 'created_at' | 'updated_at' | 'decision_quorum' | 'comments' | 'pods'>>) {
  // Convert empty strings to null for PostgreSQL date fields
  const cleanUpdates = {
    ...updates,
    start_date: updates.start_date && updates.start_date.trim() !== '' ? updates.start_date : null,
    end_date: updates.end_date && updates.end_date.trim() !== '' ? updates.end_date : null,
  }

  const { data, error } = await supabase
    .from('areas')
    .update(cleanUpdates)
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
    members: (pod.pod_members || []).map((pm: any) => ({
      id: pm.id,
      pod_id: pm.pod_id,
      member_id: pm.member_id,
      bandwidth_percentage: pm.bandwidth_percentage,
      is_leader: pm.is_leader,
      created_at: pm.created_at,
      updated_at: pm.updated_at,
      member: pm.member
    }))
  }))

  return podsWithAreas
}

export async function createPod(podData: {
  name: string
  description?: string
  area_id?: string
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
      description: podData.description || null,
      area_id: podData.area_id || null,
      start_date: podData.start_date || null,
      end_date: podData.end_date || null,
      status: 'Awaiting development'
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
      .eq('status', 'Planned')
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
    // Import the createMemberProfile function from auth.ts
    const { createMemberProfile } = await import('./auth')
    
    // Use the proper createMemberProfile function
    return await createMemberProfile({
      name: memberData.name,
      email: memberData.email,
      team: memberData.team,
      password: memberData.password || 'temp123456',
      bandwidth: 100 // Default bandwidth
    })
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
    // First check if this member has any POD assignments
    const { data: podMembers, error: podMembersError } = await supabase
      .from('pod_members')
      .select('id')
      .eq('member_id', memberId)

    if (podMembersError) {
      throw podMembersError
    }

    if (podMembers && podMembers.length > 0) {
      throw new Error('Cannot delete member who is assigned to PODs. Please remove them from all PODs first.')
    }

    // Check if this member is part of any area decision quorum
    const { data: areaQuorum, error: quorumError } = await supabase
      .from('area_decision_quorum')
      .select('id')
      .eq('member_id', memberId)

    if (quorumError) {
      throw quorumError
    }

    if (areaQuorum && areaQuorum.length > 0) {
      throw new Error('Cannot delete member who is part of area decision quorum. Please remove them from all areas first.')
    }

    // Delete the profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', memberId)

    if (profileError) {
      throw profileError
    }

    console.log('Member profile deleted successfully.')
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

// Area Kick-off and Status Management Functions
export async function kickOffArea(areaId: string): Promise<void> {
  try {
    // Update area status to Executing
    await updateArea(areaId, { status: 'Executing' })
    
    // Get all PODs associated with this area
    const { data: pods, error: podsError } = await supabase
      .from('pods')
      .select('id')
      .eq('area_id', areaId)
    
    if (podsError) {
      throw podsError
    }
    
    // Update all PODs to "Awaiting development" status
    if (pods && pods.length > 0) {
      const podIds = pods.map(pod => pod.id)
      const { error: updateError } = await supabase
        .from('pods')
        .update({ status: 'Awaiting development' })
        .in('id', podIds)
      
      if (updateError) {
        throw updateError
      }
    }
  } catch (error) {
    console.error('Error kicking off area:', error)
    throw error
  }
}

export async function checkAndUpdateAreaStatus(areaId: string): Promise<void> {
  try {
    // Get all PODs for this area
    const { data: pods, error: podsError } = await supabase
      .from('pods')
      .select('status')
      .eq('area_id', areaId)
    
    if (podsError) {
      throw podsError
    }
    
    // Check if all PODs are released
    const allReleased = pods && pods.length > 0 && pods.every(pod => pod.status === 'Released')
    
    if (allReleased) {
      // Update area status to Released
      await updateArea(areaId, { status: 'Released' })
    }
  } catch (error) {
    console.error('Error checking area status:', error)
    throw error
  }
}

export async function validateAreaForPlanning(areaId: string): Promise<{ valid: boolean; message: string }> {
  try {
    const { data: area, error } = await supabase
      .from('areas')
      .select('one_pager_url')
      .eq('id', areaId)
      .single()
    
    if (error) {
      throw error
    }
    
    if (!area.one_pager_url || area.one_pager_url.trim() === '') {
      return { valid: false, message: 'One-pager is required to move to Planning' }
    }
    
    return { valid: true, message: 'Area is ready for Planning' }
  } catch (error) {
    console.error('Error validating area for planning:', error)
    return { valid: false, message: 'Error validating area' }
  }
}

export async function validateAreaForPlanned(areaId: string): Promise<{ valid: boolean; message: string; missing: string[] }> {
  try {
    const { data: area, error } = await supabase
      .from('areas')
      .select('*')
      .eq('id', areaId)
      .single()
    
    if (error) {
      throw error
    }
    
    const missing: string[] = []
    
    // Check one-pager
    if (!area.one_pager_url || area.one_pager_url.trim() === '') {
      missing.push('One-pager')
    }
    
    // Check dates
    if (!area.start_date) {
      missing.push('Start date')
    }
    if (!area.end_date) {
      missing.push('End date')
    }
    
    // Check impact fields
    if (!area.revenue_impact || area.revenue_impact.trim() === '') {
      missing.push('Revenue impact')
    }
    if (!area.business_enablement || area.business_enablement.trim() === '') {
      missing.push('Business enablement')
    }
    if (!area.efforts || area.efforts.trim() === '') {
      missing.push('Efforts')
    }
    if (!area.end_user_impact || area.end_user_impact.trim() === '') {
      missing.push('End user impact')
    }
    
    // Check if area has PODs
    const { data: pods, error: podsError } = await supabase
      .from('pods')
      .select('id')
      .eq('area_id', areaId)
    
    if (podsError) {
      throw podsError
    }
    
    if (!pods || pods.length === 0) {
      missing.push('At least one POD')
    }
    
    const valid = missing.length === 0
    const message = valid ? 'Area is ready for Planned status' : `Missing: ${missing.join(', ')}`
    
    return { valid, message, missing }
  } catch (error) {
    console.error('Error validating area for planned:', error)
    return { valid: false, message: 'Error validating area', missing: [] }
  }
}