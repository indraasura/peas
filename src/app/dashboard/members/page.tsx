'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Search,
  AlertCircle,
  CheckCircle,
  User,
  Building2,
  BarChart3,
} from 'lucide-react'
import { getMembers, createMember, updateMember, deleteMember, isPODCommitteeMember } from '@/lib/data'
import { type Profile } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export default function MembersPage() {
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [teamFilter, setTeamFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isPODCommittee, setIsPODCommittee] = useState(false)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingMember, setEditingMember] = useState<Profile | null>(null)
  const [memberForm, setMemberForm] = useState({
    name: '',
    email: '',
    team: '',
    password: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchMembers()
    checkPODCommitteeStatus()
  }, [])

  const checkPODCommitteeStatus = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (currentUser) {
        const isCommittee = await isPODCommitteeMember(currentUser.id)
        setIsPODCommittee(isCommittee)
      }
    } catch (error) {
      console.error('Error checking POD committee status:', error)
    }
  }

  const fetchMembers = async () => {
    try {
      const membersData = await getMembers()
      // Calculate bandwidth for each member (bandwidth_percentage is stored as decimals 0-1)
      const membersWithBandwidth = membersData.map(member => {
        const usedBandwidth = member.pod_members?.reduce((sum: number, pm: any) => 
          sum + (pm.bandwidth_percentage || 0), 0) || 0
        return {
          ...member,
          bandwidth: usedBandwidth // This is already in 0-1 format from the database
        }
      })
      setMembers(membersWithBandwidth)
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = members.filter(member => {
    const matchesTeam = teamFilter === 'all' || member.team === teamFilter
    const matchesSearch = searchQuery === '' || 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTeam && matchesSearch
  })

  const uniqueTeams = Array.from(new Set(members.map(member => member.team)))

  const getBandwidthColor = (bandwidth: number) => {
    if (bandwidth >= 0.8) return 'bg-red-100 text-red-800'
    if (bandwidth >= 0.6) return 'bg-yellow-100 text-yellow-800'
    if (bandwidth >= 0.4) return 'bg-blue-100 text-blue-800'
    return 'bg-green-100 text-green-800'
  }

  const getAvailabilityText = (bandwidth: number) => {
    if (bandwidth >= 0.8) return 'High Utilization'
    if (bandwidth >= 0.6) return 'Medium-High Utilization'
    if (bandwidth >= 0.4) return 'Medium Utilization'
    return 'Low Utilization'
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      if (editingMember) {
        await updateMember(editingMember.id, memberForm)
        setSuccess('Member updated successfully!')
      } else {
        await createMember(memberForm)
        setSuccess('Member created successfully!')
      }
      
      setOpenDialog(false)
      setEditingMember(null)
      resetForm()
      fetchMembers()
    } catch (error) {
      console.error('Error saving member:', error)
      setError('Failed to save member. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setMemberForm({
      name: '',
      email: '',
      team: '',
      password: ''
    })
  }

  const handleAddMember = () => {
    setEditingMember(null)
    resetForm()
    setOpenDialog(true)
  }

  const handleEditMember = (member: Profile) => {
    setEditingMember(member)
    setMemberForm({
      name: member.name || '',
      email: member.email || '',
      team: member.team || '',
      password: ''
    })
    setOpenDialog(true)
  }

  const handleDeleteMember = async (member: Profile) => {
    if (window.confirm(`Are you sure you want to delete "${member.name}"?`)) {
      try {
        await deleteMember(member.id)
        fetchMembers()
      } catch (error) {
        console.error('Error deleting member:', error)
        setError('Failed to delete member. Please try again.')
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
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
        <h1 className="text-3xl font-bold tracking-tight">Members</h1>
        {isPODCommittee && (
          <Button onClick={handleAddMember}>
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teams</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueTeams.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Utilization</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {members.filter(m => (m.bandwidth || 0) > 0 && (m.bandwidth || 0) < 0.4).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Utilization</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {members.filter(m => (m.bandwidth || 0) >= 0.8).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filter Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {uniqueTeams.map((team) => (
                  <SelectItem key={team} value={team}>
                    {team}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Members List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Assigned Capacity</TableHead>
                <TableHead>Available Capacity</TableHead>
                <TableHead>Status</TableHead>
                {isPODCommittee && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => {
                const assignedBandwidth = member.bandwidth || 0
                const availableBandwidth = 1 - assignedBandwidth // Allow negative values for over-allocation
                
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                          {member.name?.charAt(0)}
                        </div>
                        <span className="font-medium">{member.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{member.team}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {assignedBandwidth.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`text-sm font-medium ${availableBandwidth < 0 ? 'text-red-600' : ''}`}>
                        {availableBandwidth.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getBandwidthColor(assignedBandwidth)}>
                        {getAvailabilityText(assignedBandwidth)}
                      </Badge>
                    </TableCell>
                    {isPODCommittee && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditMember(member)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMember(member)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Member Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMember ? 'Edit Member' : 'Add New Member'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={memberForm.name}
                onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                placeholder="Enter member name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={memberForm.email}
                onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="team">Team</Label>
              <Select
                value={memberForm.team}
                onValueChange={(value) => setMemberForm({ ...memberForm, team: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POD committee">POD Committee</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Product">Product</SelectItem>
                  <SelectItem value="Design">Design</SelectItem>
                  <SelectItem value="QA">QA</SelectItem>
                  <SelectItem value="DevOps">DevOps</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!editingMember && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={memberForm.password}
                  onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })}
                  placeholder="Enter password"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : (editingMember ? 'Update' : 'Create')} Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
