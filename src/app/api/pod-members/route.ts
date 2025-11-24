import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Using the same environment variable names as in the Netlify config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables')
      console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl ? 'set' : 'not set')
      console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseKey ? 'set' : 'not set')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const { podId, memberId, bandwidth } = await request.json()

    if (!podId || !memberId || bandwidth === undefined) {
      return NextResponse.json(
        { error: 'podId, memberId, and bandwidth are required' },
        { status: 400 }
      )
    }

    // Check if the member is already assigned to this POD
    const { data: existingAssignment, error: findError } = await supabase
      .from('pod_members')
      .select('*')
      .eq('pod_id', podId)
      .eq('member_id', memberId)
      .single()

    if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw findError
    }

    if (existingAssignment) {
      // Update existing assignment
      const { data, error } = await supabase
        .from('pod_members')
        .update({
          bandwidth_percentage: bandwidth,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAssignment.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(data)
    } else {
      // Create new assignment
      const { data, error } = await supabase
        .from('pod_members')
        .insert([
          {
            pod_id: podId,
            member_id: memberId,
            bandwidth_percentage: bandwidth
          }
        ])
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(data)
    }
  } catch (error) {
    console.error('Error assigning member to POD:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assign member to POD' },
      { status: 500 }
    )
  }
}
