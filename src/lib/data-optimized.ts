import { supabase, type Area, type Pod, type Profile, type PodMember, type PodNote } from './supabase'
import { dataCache, CACHE_KEYS, createCacheKey } from './cache'

// Optimized data fetching with caching and reduced queries

// Areas - optimized with caching and reduced joins
export async function getAreasOptimized(): Promise<Area[]> {
  const cacheKey = CACHE_KEYS.AREAS
  const cached = dataCache.get<Area[]>(cacheKey)
  if (cached) {
    console.log('Using cached areas data')
    return cached
  }

  try {
    // Use a simpler query first for faster loading
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching areas:', error)
      return []
    }

    // Transform data and add empty arrays for missing relations
    const areasWithDefaults = (data || []).map(area => ({
      ...area,
      decision_quorum: [],
      comments: []
    }))

    // Cache for 5 minutes
    dataCache.set(cacheKey, areasWithDefaults, 5 * 60 * 1000)
    
    return areasWithDefaults
  } catch (error) {
    console.error('Unexpected error in getAreasOptimized:', error)
    return []
  }
}

// Get areas with full relations (only when needed)
export async function getAreasWithRelations(): Promise<Area[]> {
  const cacheKey = `${CACHE_KEYS.AREAS}:relations`
  const cached = dataCache.get<Area[]>(cacheKey)
  if (cached) {
    console.log('Using cached areas with relations')
    return cached
  }

  try {
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
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching areas with relations:', error)
      return []
    }

    const areasWithQuorum = (data || []).map(area => ({
      ...area,
      decision_quorum: area.area_decision_quorum?.map((quorum: any) => quorum.member).filter(Boolean) || [],
      comments: area.area_comments?.map((comment: any) => ({
        ...comment,
        creator: comment.creator
      })) || []
    }))

    // Cache for 3 minutes (shorter TTL for complex data)
    dataCache.set(cacheKey, areasWithQuorum, 3 * 60 * 1000)
    
    return areasWithQuorum
  } catch (error) {
    console.error('Unexpected error in getAreasWithRelations:', error)
    return []
  }
}

// PODs - optimized with caching
export async function getPodsOptimized(): Promise<Pod[]> {
  const cacheKey = CACHE_KEYS.PODS
  const cached = dataCache.get<Pod[]>(cacheKey)
  if (cached) {
    console.log('Using cached PODs data')
    return cached
  }

  try {
    const { data, error } = await supabase
      .from('pods')
      .select(`
        *,
        members:pod_members(
          *,
          member:profiles(*)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching PODs:', error)
      return []
    }

    // Convert bandwidth percentages from integers (0-100) back to decimals (0-1)
    const podsWithConvertedBandwidth = (data || []).map(pod => ({
      ...pod,
      members: pod.members?.map((member: any) => ({
        ...member,
        bandwidth_percentage: member.bandwidth_percentage / 100
      })) || []
    }))

    // Cache for 5 minutes
    dataCache.set(cacheKey, podsWithConvertedBandwidth, 5 * 60 * 1000)
    
    return podsWithConvertedBandwidth
  } catch (error) {
    console.error('Unexpected error in getPodsOptimized:', error)
    return []
  }
}

// Members - optimized with caching
export async function getMembersOptimized(): Promise<Profile[]> {
  const cacheKey = CACHE_KEYS.MEMBERS
  const cached = dataCache.get<Profile[]>(cacheKey)
  if (cached) {
    console.log('Using cached members data')
    return cached
  }

  try {
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

    // Convert bandwidth percentages from integers (0-100) back to decimals (0-1)
    const membersWithConvertedBandwidth = (data || []).map(member => ({
      ...member,
      pod_members: member.pod_members?.map((pm: any) => ({
        ...pm,
        bandwidth_percentage: pm.bandwidth_percentage / 100
      })) || []
    }))

    // Cache for 10 minutes (members change less frequently)
    dataCache.set(cacheKey, membersWithConvertedBandwidth, 10 * 60 * 1000)
    
    return membersWithConvertedBandwidth
  } catch (error) {
    console.error('Unexpected error in getMembersOptimized:', error)
    return []
  }
}

// Available members - optimized with caching
export async function getAvailableMembersOptimized(): Promise<Profile[]> {
  const cacheKey = CACHE_KEYS.AVAILABLE_MEMBERS
  const cached = dataCache.get<Profile[]>(cacheKey)
  if (cached) {
    console.log('Using cached available members data')
    return cached
  }

  try {
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
      console.error('Error fetching available members:', error)
      return []
    }

    // Convert bandwidth percentages and filter for available members
    const availableMembers = (data || [])
      .map(member => ({
        ...member,
        pod_members: member.pod_members?.map((pm: any) => ({
          ...pm,
          bandwidth_percentage: pm.bandwidth_percentage / 100
        })) || []
      }))
      .filter(member => member.team !== 'POD committee')

    // Cache for 10 minutes
    dataCache.set(cacheKey, availableMembers, 10 * 60 * 1000)
    
    return availableMembers
  } catch (error) {
    console.error('Unexpected error in getAvailableMembersOptimized:', error)
    return []
  }
}

// Optimized revised end dates - batch fetch all at once
export async function getAllAreaRevisedEndDates(areaIds: string[]): Promise<Record<string, string[]>> {
  if (areaIds.length === 0) return {}

  const cacheKey = createCacheKey(CACHE_KEYS.AREA_REVISED_DATES, { areaIds: areaIds.sort().join(',') })
  const cached = dataCache.get<Record<string, string[]>>(cacheKey)
  if (cached) {
    console.log('Using cached revised end dates')
    return cached
  }

  try {
    // Get all PODs for all areas in one query
    const { data: areaPods, error: podsError } = await supabase
      .from('pods')
      .select('id, area_id')
      .in('area_id', areaIds)

    if (podsError) {
      console.error('Error fetching PODs for areas:', podsError)
      return {}
    }

    if (!areaPods || areaPods.length === 0) {
      console.log('No PODs found for areas')
      return {}
    }

    const podIds = areaPods.map(pod => pod.id)
    const podToAreaMap = new Map(areaPods.map(pod => [pod.id, pod.area_id]))

    // Get all revised end dates for those PODs in one query
    const { data, error } = await supabase
      .from('pod_notes')
      .select('pod_id, revised_end_date')
      .in('pod_id', podIds)
      .not('revised_end_date', 'is', null)
      .order('review_date', { ascending: false })

    if (error) {
      console.error('Error fetching revised end dates:', error)
      return {}
    }

    // Group by area
    const revisedDatesMap: Record<string, string[]> = {}
    areaIds.forEach(areaId => {
      revisedDatesMap[areaId] = []
    })

    const uniqueDates = new Set<string>()
    data?.forEach(item => {
      const areaId = podToAreaMap.get(item.pod_id)
      if (areaId && item.revised_end_date) {
        uniqueDates.add(item.revised_end_date)
        revisedDatesMap[areaId].push(item.revised_end_date)
      }
    })

    // Remove duplicates and sort
    Object.keys(revisedDatesMap).forEach(areaId => {
      revisedDatesMap[areaId] = [...new Set(revisedDatesMap[areaId])].sort()
    })

    // Cache for 5 minutes
    dataCache.set(cacheKey, revisedDatesMap, 5 * 60 * 1000)
    
    return revisedDatesMap
  } catch (error) {
    console.error('Unexpected error in getAllAreaRevisedEndDates:', error)
    return {}
  }
}

// Cache invalidation helpers
export function invalidateAreasCache(): void {
  dataCache.delete(CACHE_KEYS.AREAS)
  dataCache.invalidatePattern(`${CACHE_KEYS.AREAS}:`)
  dataCache.invalidatePattern(`${CACHE_KEYS.AREA_REVISED_DATES}:`)
}

export function invalidatePodsCache(): void {
  dataCache.delete(CACHE_KEYS.PODS)
  dataCache.invalidatePattern(`${CACHE_KEYS.AREA_REVISED_DATES}:`)
}

export function invalidateMembersCache(): void {
  dataCache.delete(CACHE_KEYS.MEMBERS)
  dataCache.delete(CACHE_KEYS.AVAILABLE_MEMBERS)
}

export function invalidateAllCache(): void {
  dataCache.clear()
}

// Preload critical data
export async function preloadCriticalData(): Promise<void> {
  try {
    console.log('Preloading critical data...')
    await Promise.all([
      getAreasOptimized(),
      getPodsOptimized(),
      getMembersOptimized()
    ])
    console.log('Critical data preloaded')
  } catch (error) {
    console.error('Error preloading critical data:', error)
  }
}
