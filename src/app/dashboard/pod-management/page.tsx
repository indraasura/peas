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
  Users,
  Calendar,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  Play,
  Package,
  Settings,
  Building2,
} from 'lucide-react'
import { getPods, createPod, updatePod, deletePod, getAreas, getAvailableMembers, updatePodMembers, updatePodDependencies, getPodDependencies } from '@/lib/data'
import { getCurrentUser, type Profile } from '@/lib/auth'
import { type Pod, type Area } from '@/lib/supabase'

const podStatuses = ['Awaiting development', 'In development', 'In testing', 'Released']

export default function PodManagementPage() {
  const [pods, setPods] = useState<Pod[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [availableMembers, setAvailableMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingPod, setEditingPod] = useState<Pod | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    area_id: '',
    status: 'Awaiting development' as 'Awaiting development' | 'In development' | 'In testing' | 'Released',
    start_date: '',
    end_date: '',
    members: [] as Array<{
      member_id: string
      bandwidth_percentage: number
      is_leader: boolean
    }>,
    dependencies: [] as string[]
  })
  const [error, setError] = useState('')
  const [user, setUser] = useState<Profile | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [currentUser, podsData, areasData, membersData] = await Promise.all([
        getCurrentUser(),
        getPods(),
        getAreas(),
        getAvailableMembers()
      ])
      
      setUser(currentUser)
      setPods(podsData)
      setAreas(areasData)
      setAvailableMembers(membersData)
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
      const { members, dependencies, ...podData } = formData

      if (editingPod) {
        await updatePod(editingPod.id, podData)
        await updatePodMembers(editingPod.id, members)
        await updatePodDependencies(editingPod.id, dependencies)
      } else {
        const newPod = await createPod(podData)
        await updatePodMembers(newPod.id, members)
        await updatePodDependencies(newPod.id, dependencies)
      }

      setOpenDialog(false)
      setEditingPod(null)
      resetForm()
      fetchData()
    } catch (error) {
      console.error('Error saving pod:', error)
      setError('Failed to save pod. Please try again.')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      area_id: '',
      status: 'Awaiting development',
      start_date: '',
      end_date: '',
      members: [],
      dependencies: []
    })
  }

  const handleAddPod = () => {
    setEditingPod(null)
    resetForm()
    setOpenDialog(true)
  }

  const handleEditPod = (pod: Pod) => {
    setEditingPod(pod)
    setFormData({
      name: pod.name,
      description: pod.description || '',
      area_id: pod.area_id || '',
      status: pod.status || 'Awaiting development',
      start_date: pod.start_date || '',
      end_date: pod.end_date || '',
      members: pod.members?.map(m => ({
        member_id: m.member_id,
        bandwidth_percentage: m.bandwidth_percentage,
        is_leader: m.is_leader
      })) || [],
      dependencies: pod.dependencies?.map(d => d.id) || []
    })
    setOpenDialog(true)
  }

  const handleDeletePod = async (pod: Pod) => {
    if (window.confirm(`Are you sure you want to delete "${pod.name}"?`)) {
      try {
        await deletePod(pod.id)
        fetchData()
      } catch (error) {
        console.error('Error deleting pod:', error)
        setError('Failed to delete pod. Please try again.')
      }
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

  const addMember = () => {
    setFormData({
      ...formData,
      members: [
        ...formData.members,
        {
          member_id: '',
          bandwidth_percentage: 0,
          is_leader: false
        }
      ]
    })
  }

  const removeMember = (index: number) => {
    setFormData({
      ...formData,
      members: formData.members.filter((_, i) => i !== index)
    })
  }

  const updateMember = (index: number, field: string, value: any) => {
    const newMembers = [...formData.members]
    newMembers[index] = { ...newMembers[index], [field]: value }
    setFormData({ ...formData, members: newMembers })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">POD Management</h1>
        <Button onClick={handleAddPod}>
          <Plus className="mr-2 h-4 w-4" />
          Add POD
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PODs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pods.length}</div>
            <p className="text-xs text-muted-foreground">
              All PODs in the system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active PODs</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pods.filter(pod => pod.status === 'In development').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently in development
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Released PODs</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pods.filter(pod => pod.status === 'Released').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* PODs Management Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            POD Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>POD Name</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Bandwidth</TableHead>
                <TableHead>Timeline</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pods.map((pod) => {
                const totalBandwidth = pod.members?.reduce((sum, member) =>
                  sum + (member.bandwidth_percentage || 0), 0) || 0
                
                return (
                  <TableRow key={pod.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{pod.name}</div>
                        {pod.description && (
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {pod.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {pod.area?.name || 'No Area'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(pod.status || 'Awaiting development')}
                        <Badge className={getStatusColor(pod.status || 'Awaiting development')}>
                          {pod.status || 'Awaiting development'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {pod.members?.slice(0, 3).map((member) => (
                            <Avatar key={member.id} className="h-6 w-6 border-2 border-background">
                              <AvatarFallback className="text-xs">
                                {member.member?.name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {pod.members && pod.members.length > 3 && (
                            <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                              +{pod.members.length - 3}
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {pod.members?.length || 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {totalBandwidth.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        {pod.start_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(pod.start_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {pod.end_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(pod.end_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPod(pod)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePod(pod)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit POD Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPod ? 'Edit POD' : 'Add New POD'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">POD Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter POD name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="area_id">Area</Label>
                <Select
                  value={formData.area_id}
                  onValueChange={(value) => setFormData({ ...formData, area_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter POD description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {podStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Team Members</Label>
                <Button type="button" variant="outline" size="sm" onClick={addMember}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto border rounded-md p-3">
                {formData.members.map((member, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex-1 space-y-2">
                      <Select
                        value={member.member_id}
                        onValueChange={(value) => updateMember(index, 'member_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select member" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableMembers.map((availableMember) => (
                            <SelectItem key={availableMember.id} value={availableMember.id}>
                              {availableMember.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`bandwidth-${index}`} className="text-sm">
                          Bandwidth:
                        </Label>
                        <Input
                          id={`bandwidth-${index}`}
                          type="number"
                          min="0"
                          max="1"
                          step="0.1"
                          value={member.bandwidth_percentage}
                          onChange={(e) => updateMember(index, 'bandwidth_percentage', parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`leader-${index}`}
                          checked={member.is_leader}
                          onCheckedChange={(checked) => updateMember(index, 'is_leader', checked)}
                        />
                        <Label htmlFor={`leader-${index}`} className="text-sm">
                          Leader
                        </Label>
                      </div>
                      
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMember(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
              {editingPod ? 'Update' : 'Create'} POD
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
