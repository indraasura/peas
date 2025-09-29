import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  getAreasOptimized, 
  getAreasWithRelations,
  getPodsOptimized, 
  getMembersOptimized, 
  getAvailableMembersOptimized,
  getAllAreaRevisedEndDates,
  invalidateAreasCache,
  invalidatePodsCache,
  invalidateMembersCache,
  preloadCriticalData
} from '../lib/data-optimized'
import type { Area, Pod, Profile } from '../lib/supabase'

// Hook for optimized areas data
export function useAreas(includeRelations = false) {
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAreas = useCallback(async () => {
    try {
      setError(null)
      const data = includeRelations ? await getAreasWithRelations() : await getAreasOptimized()
      setAreas(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch areas')
    } finally {
      setLoading(false)
    }
  }, [includeRelations])

  useEffect(() => {
    fetchAreas()
  }, [fetchAreas])

  const refreshAreas = useCallback(() => {
    invalidateAreasCache()
    setLoading(true)
    fetchAreas()
  }, [fetchAreas])

  return { areas, loading, error, refreshAreas }
}

// Hook for optimized PODs data
export function usePods() {
  const [pods, setPods] = useState<Pod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPods = useCallback(async () => {
    try {
      setError(null)
      const data = await getPodsOptimized()
      setPods(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch PODs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPods()
  }, [fetchPods])

  const refreshPods = useCallback(() => {
    invalidatePodsCache()
    setLoading(true)
    fetchPods()
  }, [fetchPods])

  return { pods, loading, error, refreshPods }
}

// Hook for optimized members data
export function useMembers() {
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    try {
      setError(null)
      const data = await getMembersOptimized()
      setMembers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch members')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const refreshMembers = useCallback(() => {
    invalidateMembersCache()
    setLoading(true)
    fetchMembers()
  }, [fetchMembers])

  return { members, loading, error, refreshMembers }
}

// Hook for optimized available members data
export function useAvailableMembers() {
  const [availableMembers, setAvailableMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAvailableMembers = useCallback(async () => {
    try {
      setError(null)
      const data = await getAvailableMembersOptimized()
      setAvailableMembers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch available members')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAvailableMembers()
  }, [fetchAvailableMembers])

  const refreshAvailableMembers = useCallback(() => {
    invalidateMembersCache()
    setLoading(true)
    fetchAvailableMembers()
  }, [fetchAvailableMembers])

  return { availableMembers, loading, error, refreshAvailableMembers }
}

// Hook for area revised end dates
export function useAreaRevisedEndDates(areaIds: string[]) {
  const [revisedDates, setRevisedDates] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRevisedDates = useCallback(async () => {
    if (areaIds.length === 0) {
      setRevisedDates({})
      setLoading(false)
      return
    }

    try {
      setError(null)
      const data = await getAllAreaRevisedEndDates(areaIds)
      setRevisedDates(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch revised end dates')
    } finally {
      setLoading(false)
    }
  }, [areaIds])

  useEffect(() => {
    fetchRevisedDates()
  }, [fetchRevisedDates])

  return { revisedDates, loading, error }
}

// Hook for POD committee members (memoized)
export function usePodCommitteeMembers() {
  const { members, loading, error } = useMembers()
  
  const podCommitteeMembers = useMemo(() => {
    return members.filter(member => member.team === 'POD committee')
  }, [members])

  return { podCommitteeMembers, loading, error }
}

// Hook for comprehensive data loading
export function useComprehensiveData() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { areas, loading: areasLoading, error: areasError, refreshAreas } = useAreas()
  const { pods, loading: podsLoading, error: podsError, refreshPods } = usePods()
  const { members, loading: membersLoading, error: membersError, refreshMembers } = useMembers()
  const { availableMembers, loading: availableMembersLoading, error: availableMembersError, refreshAvailableMembers } = useAvailableMembers()
  
  const areaIds = useMemo(() => areas.map(area => area.id), [areas])
  const { revisedDates, loading: revisedDatesLoading, error: revisedDatesError } = useAreaRevisedEndDates(areaIds)

  const podCommitteeMembers = useMemo(() => {
    return members.filter(member => member.team === 'POD committee')
  }, [members])

  // Refresh all data function
  const refreshAll = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([
        refreshAreas(),
        refreshPods(),
        refreshMembers(),
        refreshAvailableMembers()
      ])
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setLoading(false)
    }
  }, [refreshAreas, refreshPods, refreshMembers, refreshAvailableMembers])

  useEffect(() => {
    const isLoading = areasLoading || podsLoading || membersLoading || availableMembersLoading || revisedDatesLoading
    setLoading(isLoading)
  }, [areasLoading, podsLoading, membersLoading, availableMembersLoading, revisedDatesLoading])

  useEffect(() => {
    const hasError = areasError || podsError || membersError || availableMembersError || revisedDatesError
    setError(hasError || null)
  }, [areasError, podsError, membersError, availableMembersError, revisedDatesError])

  return {
    areas,
    pods,
    members,
    availableMembers,
    podCommitteeMembers,
    revisedDates,
    loading,
    error,
    refreshAll,
    refreshAreas,
    refreshPods,
    refreshMembers,
    refreshAvailableMembers
  }
}

// Hook for data preloading
export function useDataPreloader() {
  const [preloaded, setPreloaded] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const preload = async () => {
      try {
        await preloadCriticalData()
        setPreloaded(true)
      } catch (error) {
        console.error('Error preloading data:', error)
      } finally {
        setLoading(false)
      }
    }

    preload()
  }, [])

  return { preloaded, loading }
}
