import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Profile {
  id: string
  email: string
  name: string
  team: string
  created_at: string
  updated_at: string
  bandwidth?: number
  available_bandwidth?: number
  used_bandwidth?: number
  pod_members?: any[]
}

export interface Area {
  id: string
  name: string
  description: string
  revenue_impact: string
  business_enablement: string
  efforts: string
  end_user_impact: string
  created_at: string
  updated_at: string
  decision_quorum?: Profile[] // List of POD committee members for this area
}

export interface Pod {
  id: string
  name: string
  description: string
  area_id: string
  start_date: string | null
  end_date: string | null
  status: string
  created_at: string
  updated_at: string
  area?: Area
  members?: PodMember[]
}

export interface PodMember {
  id: string
  pod_id: string
  member_id: string
  bandwidth_percentage: number
  is_leader: boolean
  created_at: string
  updated_at: string
  member?: Profile
}

export interface PodDependency {
  id: string
  pod_id: string
  dependent_pod_id: string
  created_at: string
}

export interface PodNote {
  id: string
  pod_id: string
  review_date: string
  blockers: string | null
  learnings: string | null
  current_state: string | null
  deviation_to_plan: string | null
  dependencies_risks: string | null
  misc: string | null
  created_by: string
  created_at: string
  updated_at: string
  creator?: Profile
}

export interface AreaDecisionQuorum {
  id: string
  area_id: string
  member_id: string
  created_at: string
  member?: Profile
}