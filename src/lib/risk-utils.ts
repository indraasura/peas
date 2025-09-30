import { type Pod, type Area, type PodNote } from './supabase'

export type RiskLevel = 'on-track' | 'low-risk' | 'medium-risk' | 'critical'

export interface RiskInfo {
  level: RiskLevel
  label: string
  color: string
  description: string
}

export const RISK_LEVELS: Record<RiskLevel, RiskInfo> = {
  'on-track': {
    level: 'on-track',
    label: 'On Track',
    color: '#4caf50', // Green
    description: 'No revised dates - POD is on track'
  },
  'low-risk': {
    level: 'low-risk',
    label: 'Low Risk',
    color: '#ff9800', // Orange
    description: '1 revised date - Minor delays expected'
  },
  'medium-risk': {
    level: 'medium-risk',
    label: 'Medium Risk',
    color: '#ff5722', // Deep Orange
    description: '2 revised dates - Significant delays expected'
  },
  'critical': {
    level: 'critical',
    label: 'Critical',
    color: '#f44336', // Red
    description: '3+ revised dates - Major concerns'
  }
}

/**
 * Calculate POD risk level based on number of revised dates in notes
 */
export function calculatePodRiskLevel(podNotes: PodNote[]): RiskLevel {
  const revisedDatesCount = podNotes.filter(note => note.revised_end_date).length
  
  if (revisedDatesCount === 0) return 'on-track'
  if (revisedDatesCount === 1) return 'low-risk'
  if (revisedDatesCount === 2) return 'medium-risk'
  return 'critical'
}

/**
 * Get the latest revised end date from POD notes
 */
export function getLatestRevisedEndDate(podNotes: PodNote[]): string | null {
  const notesWithRevisedDates = podNotes
    .filter(note => note.revised_end_date)
    .sort((a, b) => new Date(b.review_date).getTime() - new Date(a.review_date).getTime())
  
  return notesWithRevisedDates.length > 0 ? notesWithRevisedDates[0].revised_end_date! : null
}

/**
 * Calculate area risk level based on POD risk levels within the area
 */
export function calculateAreaRiskLevel(areaPods: Pod[], podRiskLevels: Record<string, RiskLevel>): RiskLevel {
  if (areaPods.length === 0) return 'on-track'
  
  const podRiskCounts = areaPods.reduce((counts, pod) => {
    const riskLevel = podRiskLevels[pod.id] || 'on-track'
    counts[riskLevel] = (counts[riskLevel] || 0) + 1
    return counts
  }, {} as Record<RiskLevel, number>)
  
  // If any POD is critical, area is critical
  if (podRiskCounts.critical > 0) return 'critical'
  
  // If any POD is medium risk, area is medium risk
  if (podRiskCounts['medium-risk'] > 0) return 'medium-risk'
  
  // If any POD is low risk, area is low risk
  if (podRiskCounts['low-risk'] > 0) return 'low-risk'
  
  return 'on-track'
}

/**
 * Get risk info for a given risk level
 */
export function getRiskInfo(riskLevel: RiskLevel): RiskInfo {
  return RISK_LEVELS[riskLevel]
}
