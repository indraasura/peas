'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  Paperclip,
  Users,
  Calendar,
  BarChart3,
  Send,
  Check,
  X,
  AlertCircle,
  FileText,
  Play,
  Eye,
} from 'lucide-react'
import { getAreas, createArea, updateArea, deleteArea, getMembers, updateAreaDecisionQuorum, getAreaComments, createAreaComment, updateAreaComment, deleteAreaComment, getPods, updatePod, kickOffArea, validateAreaForPlanning, validateAreaForPlanned, checkAndUpdateAreaStatus, createPod, updatePodMembers, getAvailableMembers } from '@/lib/data'
import { type Area, type Profile, type Pod } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import KanbanBoard from '@/components/KanbanBoard'
import { DropResult } from '@hello-pangea/dnd'

const impactLevels = ['Low', 'Medium', 'High']

export default function AreasPage() {
  const [areas, setAreas] = useState<Area[]>([])
  const [pods, setPods] = useState<Pod[]>([])
  const [podCommitteeMembers, setPodCommitteeMembers] = useState<Profile[]>([])
  const [availableMembers, setAvailableMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [openPodDialog, setOpenPodDialog] = useState(false)
  const [openCommentsDialog, setOpenCommentsDialog] = useState(false)
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false)
  const [editingArea, setEditingArea] = useState<Area | null>(null)
  const [selectedArea, setSelectedArea] = useState<Area | null>(null)
  const [areaComments, setAreaComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [newCommentLoading, setNewCommentLoading] = useState(false)
  const [editingComment, setEditingComment] = useState<any>(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    revenue_impact: 'Low',
    business_enablement: 'Low',
    efforts: 'Low',
    end_user_impact: 'Low',
    start_date: '',
    end_date: '',
    decision_quorum: [] as string[],
    one_pager_url: '',
    selected_pods: [] as string[]
  })
  const [podFormData, setPodFormData] = useState({
    name: '',
    members: [] as Array<{
      member_id: string
      bandwidth_percentage: number
      is_leader: boolean
    }>
  })
  const [error, setError] = useState('')
  const [validationDialog, setValidationDialog] = useState<{
    open: boolean
    title: string
    message: string
    missingFields: string[]
    area: Area | null
  }>({
    open: false,
    title: '',
    message: '',
    missingFields: [],
    area: null
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [areasData, podsData, membersData, availableMembersData] = await Promise.all([
        getAreas(),
        getPods(),
        getMembers(),
        getAvailableMembers()
      ])
      
      setAreas(areasData)
      setPods(podsData)
      setPodCommitteeMembers(membersData.filter(m => m.team === 'POD committee'))
      setAvailableMembers(availableMembersData)
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      setError('')
      const { decision_quorum, selected_pods, ...areaData } = formData

      if (editingArea) {
        await updateArea(editingArea.id, areaData)
        await updateAreaDecisionQuorum(editingArea.id, decision_quorum)
      } else {
        const newArea = await createArea(areaData)
        await updateAreaDecisionQuorum(newArea.id, decision_quorum)
      }

      setOpenDialog(false)
      setEditingArea(null)
      resetForm()
      fetchData()
    } catch (error) {
      console.error('Error saving area:', error)
      setError('Failed to save area. Please try again.')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      revenue_impact: 'Low',
      business_enablement: 'Low',
      efforts: 'Low',
      end_user_impact: 'Low',
      start_date: '',
      end_date: '',
      decision_quorum: [],
      one_pager_url: '',
      selected_pods: []
    })
  }

  const handleAddArea = () => {
    setEditingArea(null)
    resetForm()
    setOpenDialog(true)
  }

  const handleEditArea = (area: Area) => {
    setEditingArea(area)
    setFormData({
      name: area.name,
      description: area.description || '',
      revenue_impact: area.revenue_impact || 'Low',
      business_enablement: area.business_enablement || 'Low',
      efforts: area.efforts || 'Low',
      end_user_impact: area.end_user_impact || 'Low',
      start_date: area.start_date || '',
      end_date: area.end_date || '',
      decision_quorum: area.decision_quorum?.map(m => m.id) || [],
      one_pager_url: area.one_pager_url || '',
      selected_pods: []
    })
    setOpenDialog(true)
  }

  const handleDeleteArea = async (area: Area) => {
    if (window.confirm(`Are you sure you want to delete "${area.name}"?`)) {
      try {
        await deleteArea(area.id)
        fetchData()
      } catch (error) {
        console.error('Error deleting area:', error)
        setError('Failed to delete area. Please try again.')
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Backlog': return 'bg-gray-100 text-gray-800'
      case 'Planning': return 'bg-blue-100 text-blue-800'
      case 'Planned': return 'bg-purple-100 text-purple-800'
      case 'Executing': return 'bg-orange-100 text-orange-800'
      case 'Released': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'Low': return 'bg-green-100 text-green-800'
      case 'Medium': return 'bg-yellow-100 text-yellow-800'
      case 'High': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleStatusChange = async (area: Area, newStatus: string) => {
    try {
      if (newStatus === 'Planning') {
        const validation = await validateAreaForPlanning(area.id)
        if (!validation.valid) {
          setValidationDialog({
            open: true,
            title: 'Cannot Move to Planning',
            message: validation.message,
            missingFields: [],
            area: null
          })
          return
        }
      } else if (newStatus === 'Planned') {
        const validation = await validateAreaForPlanned(area.id)
        if (!validation.valid) {
          setValidationDialog({
            open: true,
            title: 'Cannot Move to Planned',
            message: validation.message,
            missingFields: validation.missing,
            area: area
          })
          return
        }
      } else if (newStatus === 'Executing') {
        await kickOffArea(area.id)
      }

      await updateArea(area.id, { status: newStatus as any })
      fetchData()
    } catch (error) {
      console.error('Error updating area status:', error)
      setError('Failed to update area status. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Planning</h1>
        <Button onClick={handleAddArea}>
          <Plus className="mr-2 h-4 w-4" />
          Add Area
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {areas.map((area) => (
          <Card key={area.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg line-clamp-2">{area.name}</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditArea(area)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteArea(area)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge className={getStatusColor(area.status)}>
                  {area.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {area.description && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {area.description}
                </p>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Revenue Impact:</span>
                  <Badge variant="outline" className={getImpactColor(area.revenue_impact || 'Low')}>
                    {area.revenue_impact || 'Low'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Business Enablement:</span>
                  <Badge variant="outline" className={getImpactColor(area.business_enablement || 'Low')}>
                    {area.business_enablement || 'Low'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Efforts:</span>
                  <Badge variant="outline" className={getImpactColor(area.efforts || 'Low')}>
                    {area.efforts || 'Low'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>End User Impact:</span>
                  <Badge variant="outline" className={getImpactColor(area.end_user_impact || 'Low')}>
                    {area.end_user_impact || 'Low'}
                  </Badge>
                </div>
              </div>

              {area.decision_quorum && area.decision_quorum.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span>Decision Quorum ({area.decision_quorum.length})</span>
                  </div>
                  <div className="flex -space-x-2">
                    {area.decision_quorum.slice(0, 3).map((member) => (
                      <Avatar key={member.id} className="h-6 w-6 border-2 border-background">
                        <AvatarFallback className="text-xs">
                          {member.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {area.decision_quorum.length > 3 && (
                      <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                        +{area.decision_quorum.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Select
                  value={area.status}
                  onValueChange={(value) => handleStatusChange(area, value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Backlog">Backlog</SelectItem>
                    <SelectItem value="Planning">Planning</SelectItem>
                    <SelectItem value="Planned">Planned</SelectItem>
                    <SelectItem value="Executing">Executing</SelectItem>
                    <SelectItem value="Released">Released</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedArea(area)
                    setOpenDetailsDialog(true)
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Area Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingArea ? 'Edit Area' : 'Add New Area'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Area Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter area name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter area description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="revenue_impact">Revenue Impact</Label>
                <Select
                  value={formData.revenue_impact}
                  onValueChange={(value) => setFormData({ ...formData, revenue_impact: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {impactLevels.map((level) => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_enablement">Business Enablement</Label>
                <Select
                  value={formData.business_enablement}
                  onValueChange={(value) => setFormData({ ...formData, business_enablement: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {impactLevels.map((level) => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="efforts">Efforts</Label>
                <Select
                  value={formData.efforts}
                  onValueChange={(value) => setFormData({ ...formData, efforts: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {impactLevels.map((level) => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_user_impact">End User Impact</Label>
                <Select
                  value={formData.end_user_impact}
                  onValueChange={(value) => setFormData({ ...formData, end_user_impact: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {impactLevels.map((level) => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="one_pager_url">One-Pager URL</Label>
              <Input
                id="one_pager_url"
                value={formData.one_pager_url}
                onChange={(e) => setFormData({ ...formData, one_pager_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label>Decision Quorum</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                {podCommitteeMembers.map((member) => (
                  <div key={member.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={member.id}
                      checked={formData.decision_quorum.includes(member.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            decision_quorum: [...formData.decision_quorum, member.id]
                          })
                        } else {
                          setFormData({
                            ...formData,
                            decision_quorum: formData.decision_quorum.filter(id => id !== member.id)
                          })
                        }
                      }}
                    />
                    <Label htmlFor={member.id} className="text-sm">
                      {member.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingArea ? 'Update' : 'Create'} Area
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validation Dialog */}
      <Dialog open={validationDialog.open} onOpenChange={(open) => setValidationDialog({ ...validationDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{validationDialog.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>{validationDialog.message}</p>
            {validationDialog.missingFields.length > 0 && (
              <div>
                <p className="font-medium mb-2">Missing fields:</p>
                <ul className="list-disc list-inside space-y-1">
                  {validationDialog.missingFields.map((field, index) => (
                    <li key={index} className="text-sm">{field}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setValidationDialog({ ...validationDialog, open: false })}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
