'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Package,
  Users,
  Calendar,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  Play,
  FileText,
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Send,
  User,
  Building2,
} from 'lucide-react'
import { getPod, updatePod, getPodNotes, createPodNote, updatePodNote, deletePodNote } from '@/lib/data'
import { getCurrentUser, type Profile } from '@/lib/auth'
import { type Pod, type PodNote } from '@/lib/supabase'

export default function PodDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [pod, setPod] = useState<Pod | null>(null)
  const [podNotes, setPodNotes] = useState<PodNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState<Profile | null>(null)
  const [newNote, setNewNote] = useState({
    review_date: '',
    blockers: '',
    learnings: '',
    current_state: '',
    deviation_to_plan: '',
    dependencies_risks: '',
    misc: ''
  })
  const [addingNote, setAddingNote] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchData()
    }
  }, [params.id])

  const fetchData = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)

      const [podData, notesData] = await Promise.all([
        getPod(params.id as string),
        getPodNotes(params.id as string)
      ])

      setPod(podData)
      setPodNotes(notesData)
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load POD details')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Awaiting development': return 'bg-gray-100 text-gray-800'
      case 'In development': return 'bg-blue-100 text-blue-800'
      case 'In testing': return 'bg-yellow-100 text-yellow-800'
      case 'Released': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Awaiting development': return <Clock className="h-4 w-4" />
      case 'In development': return <Play className="h-4 w-4" />
      case 'In testing': return <CheckCircle className="h-4 w-4" />
      case 'Released': return <Package className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const handleAddNote = async () => {
    if (!pod) return

    try {
      setAddingNote(true)
      await createPodNote(pod.id, newNote)
      setNewNote({
        review_date: '',
        blockers: '',
        learnings: '',
        current_state: '',
        deviation_to_plan: '',
        dependencies_risks: '',
        misc: ''
      })
      fetchData()
    } catch (error) {
      console.error('Error adding note:', error)
      setError('Failed to add note')
    } finally {
      setAddingNote(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error || !pod) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">POD Details</h1>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'POD not found'}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const totalBandwidth = pod.members?.reduce((sum, member) => 
    sum + (member.bandwidth_percentage || 0), 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">{pod.name}</h1>
      </div>

      {/* POD Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              POD Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Description</div>
              <div className="mt-1">{pod.description || 'No description provided'}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Area</div>
                <div className="mt-1">
                  <Badge variant="outline">
                    {pod.area?.name || 'No Area'}
                  </Badge>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-muted-foreground">Status</div>
                <div className="mt-1 flex items-center gap-2">
                  {getStatusIcon(pod.status || 'Awaiting development')}
                  <Badge className={getStatusColor(pod.status || 'Awaiting development')}>
                    {pod.status || 'Awaiting development'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Start Date</div>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{pod.start_date ? new Date(pod.start_date).toLocaleDateString() : 'Not set'}</span>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-muted-foreground">End Date</div>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{pod.end_date ? new Date(pod.end_date).toLocaleDateString() : 'Not set'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Bandwidth Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Bandwidth</span>
              <span className="text-lg font-bold">{totalBandwidth.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Team Size</span>
              <span className="text-lg font-bold">{pod.members?.length || 0} member{(pod.members?.length || 0) !== 1 ? 's' : ''}</span>
            </div>

            {pod.dependencies && pod.dependencies.length > 0 && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Dependencies</div>
                <div className="space-y-1">
                  {pod.dependencies.map((dep) => (
                    <Badge key={dep.id} variant="secondary" className="mr-1">
                      {dep.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pod.members && pod.members.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Bandwidth</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Team</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pod.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                          {member.member?.name?.charAt(0)}
                        </div>
                        <span className="font-medium">{member.member?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {(member.bandwidth_percentage || 0).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {member.is_leader ? (
                        <Badge variant="secondary">Leader</Badge>
                      ) : (
                        <Badge variant="outline">Member</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {member.member?.team}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No members assigned to this POD</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* POD Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            POD Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New Note */}
          <div className="border rounded-lg p-4 space-y-4">
            <h4 className="font-medium">Add New Note</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Review Date</label>
                <input
                  type="date"
                  value={newNote.review_date}
                  onChange={(e) => setNewNote({ ...newNote, review_date: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current State</label>
                <textarea
                  value={newNote.current_state}
                  onChange={(e) => setNewNote({ ...newNote, current_state: e.target.value })}
                  placeholder="Describe the current state..."
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Blockers</label>
                <textarea
                  value={newNote.blockers}
                  onChange={(e) => setNewNote({ ...newNote, blockers: e.target.value })}
                  placeholder="List any blockers..."
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Learnings</label>
                <textarea
                  value={newNote.learnings}
                  onChange={(e) => setNewNote({ ...newNote, learnings: e.target.value })}
                  placeholder="What have we learned..."
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Dependencies & Risks</label>
                <textarea
                  value={newNote.dependencies_risks}
                  onChange={(e) => setNewNote({ ...newNote, dependencies_risks: e.target.value })}
                  placeholder="Dependencies and risks..."
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Miscellaneous</label>
              <textarea
                value={newNote.misc}
                onChange={(e) => setNewNote({ ...newNote, misc: e.target.value })}
                placeholder="Any other notes..."
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                rows={2}
              />
            </div>
            
            <Button onClick={handleAddNote} disabled={addingNote}>
              {addingNote ? 'Adding...' : 'Add Note'}
            </Button>
          </div>

          {/* Existing Notes */}
          <div className="space-y-4">
            {podNotes.length > 0 ? (
              podNotes.map((note) => (
                <div key={note.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h5 className="font-medium">
                        {note.review_date ? new Date(note.review_date).toLocaleDateString() : 'No Date'}
                      </h5>
                      <p className="text-sm text-muted-foreground">
                        Added by {note.author?.name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {note.current_state && (
                      <div>
                        <span className="font-medium">Current State:</span>
                        <p className="text-muted-foreground mt-1">{note.current_state}</p>
                      </div>
                    )}
                    {note.blockers && (
                      <div>
                        <span className="font-medium">Blockers:</span>
                        <p className="text-muted-foreground mt-1">{note.blockers}</p>
                      </div>
                    )}
                    {note.learnings && (
                      <div>
                        <span className="font-medium">Learnings:</span>
                        <p className="text-muted-foreground mt-1">{note.learnings}</p>
                      </div>
                    )}
                    {note.dependencies_risks && (
                      <div>
                        <span className="font-medium">Dependencies & Risks:</span>
                        <p className="text-muted-foreground mt-1">{note.dependencies_risks}</p>
                      </div>
                    )}
                  </div>
                  
                  {note.misc && (
                    <div className="mt-3 text-sm">
                      <span className="font-medium">Miscellaneous:</span>
                      <p className="text-muted-foreground mt-1">{note.misc}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No notes added yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
