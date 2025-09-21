import { supabase, type Area, type Pod, type Profile, type PodMember, type PodNote } from './supabase'

// Areas
export async function getAreas(): Promise<Area[]> {
  const { data, error } = await supabase
    .from('areas')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching areas:', error)
    return []
  }

  return data || []
}

export async function createArea(area: Omit<Area, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('areas')
    .insert(area)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateArea(id: string, updates: Partial<Omit<Area, 'id' | 'created_at' | 'updated_at'>>) {
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

  // Ensure area data is properly structured
  const podsWithAreas = (data || []).map(pod => ({
    ...pod,
    area: pod.area || null
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
