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
          <Card key={area.id} className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between mb-3">
                <CardTitle className="text-xl font-bold line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                  {area.name}
                </CardTitle>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditArea(area)}
                    className="h-8 w-8 p-0 hover:bg-primary/10"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteArea(area)}
                    className="h-8 w-8 p-0 hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge className={`${getStatusColor(area.status)} font-medium px-3 py-1`}>
                  {area.status}
                </Badge>
                {area.pods && area.pods.length > 0 && (
                  <Badge variant="secondary" className="px-3 py-1">
                    {area.pods.length} POD{area.pods.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {area.description && (
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {area.description}
                </p>
              )}
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Revenue</span>
                    <Badge variant="outline" className={`${getImpactColor(area.revenue_impact || 'Low')} w-full justify-center`}>
                      {area.revenue_impact || 'Low'}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Business</span>
                    <Badge variant="outline" className={`${getImpactColor(area.business_enablement || 'Low')} w-full justify-center`}>
                      {area.business_enablement || 'Low'}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Efforts</span>
                    <Badge variant="outline" className={`${getImpactColor(area.efforts || 'Low')} w-full justify-center`}>
                      {area.efforts || 'Low'}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">User Impact</span>
                    <Badge variant="outline" className={`${getImpactColor(area.end_user_impact || 'Low')} w-full justify-center`}>
                      {area.end_user_impact || 'Low'}
                    </Badge>
                  </div>
                </div>
              </div>

              {area.decision_quorum && area.decision_quorum.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Users className="h-4 w-4 text-primary" />
                    <span>Decision Quorum ({area.decision_quorum.length})</span>
                  </div>
                  <div className="flex -space-x-2">
                    {area.decision_quorum.slice(0, 4).map((member) => (
                      <Avatar key={member.id} className="h-7 w-7 border-2 border-background ring-2 ring-primary/20">
                        <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                          {member.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {area.decision_quorum.length > 4 && (
                      <div className="h-7 w-7 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-xs font-medium text-primary">
                        +{area.decision_quorum.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Select
                  value={area.status}
                  onValueChange={(value) => handleStatusChange(area, value)}
                >
                  <SelectTrigger className="flex-1 h-9">
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
                  className="h-9 px-3 hover:bg-primary/10"
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

      {/* Area Details Dialog */}
      <Dialog open={openDetailsDialog} onOpenChange={setOpenDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Area Details: {selectedArea?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedArea && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedArea.description || 'No description provided'}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Impact Assessment</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Revenue Impact:</span>
                        <Badge className={getImpactColor(selectedArea.revenue_impact || 'Low')}>
                          {selectedArea.revenue_impact || 'Low'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Business Enablement:</span>
                        <Badge className={getImpactColor(selectedArea.business_enablement || 'Low')}>
                          {selectedArea.business_enablement || 'Low'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Efforts:</span>
                        <Badge className={getImpactColor(selectedArea.efforts || 'Low')}>
                          {selectedArea.efforts || 'Low'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">End User Impact:</span>
                        <Badge className={getImpactColor(selectedArea.end_user_impact || 'Low')}>
                          {selectedArea.end_user_impact || 'Low'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Timeline</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Start Date:</span>
                        <span className="text-sm">{selectedArea.start_date || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">End Date:</span>
                        <span className="text-sm">{selectedArea.end_date || 'Not set'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedArea.one_pager_url && (
                    <div>
                      <h3 className="font-semibold mb-2">One-Pager</h3>
                      <a 
                        href={selectedArea.one_pager_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <FileText className="h-4 w-4" />
                        View One-Pager
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Associated PODs</h3>
                  <Button 
                    onClick={() => {
                      setOpenPodDialog(true)
                    }}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create POD
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {pods.filter(pod => pod.area_id === selectedArea.id).length > 0 ? (
                    pods.filter(pod => pod.area_id === selectedArea.id).map((pod) => (
                      <Card key={pod.id} className="p-4 hover:shadow-md transition-shadow border-l-4 border-l-primary/20 bg-gradient-to-r from-card to-card/80">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg mb-1 text-foreground">{pod.name}</h4>
                            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                              {pod.description || 'No description provided'}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {pod.start_date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>Start: {new Date(pod.start_date).toLocaleDateString()}</span>
                                </div>
                              )}
                              {pod.end_date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>End: {new Date(pod.end_date).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className={`${getStatusColor(pod.status)} font-medium px-3 py-1`}>
                              {pod.status}
                            </Badge>
                            {pod.members && pod.members.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" />
                                <span>{pod.members.length} member{pod.members.length !== 1 ? 's' : ''}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                        <Plus className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">No PODs created for this area yet.</p>
                      <p className="text-xs text-muted-foreground">Click "Create POD" to get started.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* POD Creation Dialog */}
      <Dialog open={openPodDialog} onOpenChange={setOpenPodDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New POD for {selectedArea?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="podName">POD Name</Label>
              <Input
                id="podName"
                value={podFormData.name}
                onChange={(e) => setPodFormData({ ...podFormData, name: e.target.value })}
                placeholder="Enter POD name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Assign Members</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                {availableMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`member-${member.id}`}
                        checked={podFormData.members.some(m => m.member_id === member.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setPodFormData({
                              ...podFormData,
                              members: [...podFormData.members, {
                                member_id: member.id,
                                bandwidth_percentage: 50,
                                is_leader: false
                              }]
                            })
                          } else {
                            setPodFormData({
                              ...podFormData,
                              members: podFormData.members.filter(m => m.member_id !== member.id)
                            })
                          }
                        }}
                      />
                      <Label htmlFor={`member-${member.id}`} className="text-sm">
                        {member.name}
                      </Label>
                    </div>
                    {podFormData.members.some(m => m.member_id === member.id) && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`leader-${member.id}`}
                          checked={podFormData.members.find(m => m.member_id === member.id)?.is_leader || false}
                          onCheckedChange={(checked) => {
                            setPodFormData({
                              ...podFormData,
                              members: podFormData.members.map(m => 
                                m.member_id === member.id 
                                  ? { ...m, is_leader: !!checked }
                                  : m
                              )
                            })
                          }}
                        />
                        <Label htmlFor={`leader-${member.id}`} className="text-xs">Leader</Label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPodDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                try {
                  if (!podFormData.name.trim()) {
                    setError('POD name is required')
                    return
                  }
                  
                  await createPod({
                    name: podFormData.name,
                    area_id: selectedArea?.id,
                    members: podFormData.members
                  })
                  
                  setOpenPodDialog(false)
                  setPodFormData({ name: '', members: [] })
                  fetchData()
                } catch (error) {
                  console.error('Error creating POD:', error)
                  setError('Failed to create POD. Please try again.')
                }
              }}
            >
              Create POD
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
