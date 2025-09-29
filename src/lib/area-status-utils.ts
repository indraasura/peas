import { Area, Pod } from './supabase'

export interface AreaStatusCriteria {
  hasOnePager: boolean
  hasPods: boolean
  hasPodsWithMembers: boolean
  hasStartDate: boolean
  hasEndDate: boolean
}

/**
 * Calculate the appropriate status for an area based on completion criteria
 * 
 * Rules:
 * - Backlog: No one-pager OR no PODs OR no members OR no dates
 * - Planning: Has one-pager but missing PODs/members/dates
 * - Planned: Has one-pager + PODs + members + start/end dates
 * - Executing: Manually kicked off (unchanged)
 * - Released: Manually released (unchanged)
 */
export function calculateAreaStatus(
  area: Area, 
  pods: Pod[] = []
): 'Backlog' | 'Planning' | 'Planned' | 'Executing' | 'Released' {
  // Don't change Executing or Released statuses (these are manual actions)
  if (area.status === 'Executing' || area.status === 'Released') {
    return area.status
  }

  // Get PODs for this area (exclude Released PODs from status calculation)
  const areaPods = pods.filter(pod => 
    pod.area_id === area.id && pod.status !== 'Released'
  )
  
  // Check criteria
  const criteria = getAreaStatusCriteria(area, areaPods)
  
  // Apply status rules
  if (!criteria.hasOnePager) {
    return 'Backlog'
  }
  
  if (!criteria.hasPods || !criteria.hasPodsWithMembers || !criteria.hasStartDate || !criteria.hasEndDate) {
    return 'Planning'
  }
  
  return 'Planned'
}

/**
 * Get the completion criteria for an area
 */
export function getAreaStatusCriteria(area: Area, pods: Pod[]): AreaStatusCriteria {
  const hasOnePager = Boolean(area.one_pager_url && area.one_pager_url.trim() !== '')
  
  // Filter out Released PODs for criteria calculation
  const activePods = pods.filter(pod => pod.status !== 'Released')
  const hasPods = activePods.length > 0
  
  // Check if any POD has members
  const hasPodsWithMembers = activePods.some(pod => 
    pod.members && pod.members.length > 0 && 
    pod.members.some(member => member.bandwidth_percentage > 0)
  )
  
  const hasStartDate = Boolean(area.start_date && area.start_date.trim() !== '')
  const hasEndDate = Boolean(area.end_date && area.end_date.trim() !== '')
  
  return {
    hasOnePager,
    hasPods,
    hasPodsWithMembers,
    hasStartDate,
    hasEndDate
  }
}

/**
 * Get human-readable status explanation
 */
export function getAreaStatusExplanation(area: Area, pods: Pod[] = []): string {
  const criteria = getAreaStatusCriteria(area, pods)
  const currentStatus = area.status
  const calculatedStatus = calculateAreaStatus(area, pods)
  
  if (currentStatus === calculatedStatus) {
    return `Status is correct: ${currentStatus}`
  }
  
  const missingItems: string[] = []
  
  if (!criteria.hasOnePager) {
    missingItems.push('one-pager')
  }
  if (!criteria.hasPods) {
    missingItems.push('PODs')
  }
  if (!criteria.hasPodsWithMembers) {
    missingItems.push('POD members')
  }
  if (!criteria.hasStartDate) {
    missingItems.push('start date')
  }
  if (!criteria.hasEndDate) {
    missingItems.push('end date')
  }
  
  if (missingItems.length === 0) {
    return `Ready to move to ${calculatedStatus}`
  }
  
  return `Missing: ${missingItems.join(', ')}. Should be ${calculatedStatus}`
}

/**
 * Check if an area can be manually moved to a specific status
 */
export function canMoveToStatus(
  area: Area, 
  targetStatus: string, 
  pods: Pod[] = []
): { canMove: boolean; reason?: string } {
  const calculatedStatus = calculateAreaStatus(area, pods)
  
  // Allow manual moves to Executing and Released
  if (targetStatus === 'Executing' || targetStatus === 'Released') {
    return { canMove: true }
  }
  
  // For other statuses, check if the move makes sense
  if (targetStatus === calculatedStatus) {
    return { canMove: true }
  }
  
  // Don't allow moves that contradict the calculated status
  const criteria = getAreaStatusCriteria(area, pods)
  const missingItems: string[] = []
  
  if (!criteria.hasOnePager && targetStatus !== 'Backlog') {
    missingItems.push('one-pager')
  }
  if (!criteria.hasPods && ['Planning', 'Planned'].includes(targetStatus)) {
    missingItems.push('PODs')
  }
  if (!criteria.hasPodsWithMembers && targetStatus === 'Planned') {
    missingItems.push('POD members')
  }
  if ((!criteria.hasStartDate || !criteria.hasEndDate) && targetStatus === 'Planned') {
    missingItems.push('start/end dates')
  }
  
  if (missingItems.length > 0) {
    return { 
      canMove: false, 
      reason: `Cannot move to ${targetStatus}: missing ${missingItems.join(', ')}` 
    }
  }
  
  return { canMove: true }
}

/**
 * Validate POD creation requirements
 */
export function validatePodCreation(area: Area, podMembers: any[]): { 
  isValid: boolean; 
  error?: string 
} {
  if (!area.one_pager_url || area.one_pager_url.trim() === '') {
    return {
      isValid: false,
      error: 'Area must have a one-pager before creating PODs'
    }
  }
  
  if (!podMembers || podMembers.length === 0) {
    return {
      isValid: false,
      error: 'POD must have at least one member'
    }
  }
  
  const hasValidMembers = podMembers.some(member => 
    member.member_id && member.bandwidth_percentage > 0
  )
  
  if (!hasValidMembers) {
    return {
      isValid: false,
      error: 'POD must have at least one member with bandwidth > 0'
    }
  }
  
  return { isValid: true }
}
