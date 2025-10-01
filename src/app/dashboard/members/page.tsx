'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  SmartToy as SmartToyIcon
} from '@mui/icons-material'
import { getMembers, createMember, updateMember, deleteMember, isPODCommitteeMember } from '@/lib/data'
import { type Profile } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import AIDrawer from '@/components/AIDrawer'

export default function MembersPage() {
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [teamFilter, setTeamFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isPODCommittee, setIsPODCommittee] = useState(false)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingMember, setEditingMember] = useState<Profile | null>(null)
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)
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

  const handleOpenDialog = (member?: Profile) => {
    if (member) {
      setEditingMember(member)
      setMemberForm({
        name: member.name,
        email: member.email,
        team: member.team,
        password: ''
      })
    } else {
      setEditingMember(null)
      setMemberForm({
        name: '',
        email: '',
        team: '',
        password: ''
      })
    }
    setOpenDialog(true)
    setError('')
    setSuccess('')
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingMember(null)
    setMemberForm({
      name: '',
      email: '',
      team: '',
      password: ''
    })
    setError('')
    setSuccess('')
  }

  const handleSubmit = async () => {
    // For POD committee members, email is required. For others, it's optional
    const isEmailRequired = memberForm.team === 'POD committee'
    
    if (!memberForm.name || !memberForm.team || (isEmailRequired && !memberForm.email)) {
      setError(isEmailRequired 
        ? 'Please fill in all required fields (Name, Email, Team)' 
        : 'Please fill in Name and Team'
      )
      return
    }

    try {
      setSubmitting(true)
      setError('')

      if (editingMember) {
        // Update existing member
        await updateMember(editingMember.id, {
          name: memberForm.name,
          email: memberForm.email || '',
          team: memberForm.team
        })
        setSuccess('Member updated successfully')
      } else {
        // Create new member
        await createMember({
          name: memberForm.name,
          email: memberForm.email || `${memberForm.name.toLowerCase().replace(/\s+/g, '.')}@company.com`,
          team: memberForm.team,
          password: memberForm.password || undefined
        })
        setSuccess('Member created successfully')
      }

      // Refresh members list
      await fetchMembers()
      handleCloseDialog()
    } catch (error: any) {
      console.error('Error saving member:', error)
      setError(error.message || 'Failed to save member')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (memberId: string, memberName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${memberName}?`)) {
      return
    }

    try {
      await deleteMember(memberId)
      setSuccess('Member deleted successfully')
      await fetchMembers()
    } catch (error: any) {
      console.error('Error deleting member:', error)
      setError(error.message || 'Failed to delete member')
    }
  }

  const getBandwidthColor = (bandwidth: number) => {
    if (bandwidth >= 0.8) return 'error'
    if (bandwidth >= 0.6) return 'warning'
    if (bandwidth >= 0.4) return 'info'
    return 'success'
  }

  const getAvailabilityText = (bandwidth: number) => {
    if (bandwidth >= 0.8) return 'High'
    if (bandwidth >= 0.6) return 'Medium'
    if (bandwidth >= 0.4) return 'Low'
    return 'Available'
  }

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', width: 200 },
    { 
      field: 'team', 
      headerName: 'Team', 
      width: 150,
      renderCell: (params: any) => (
        <Chip 
          label={params.value} 
          color={params.value === 'POD committee' ? 'primary' : 'default'}
          size="small"
        />
      )
    },
    { 
      field: 'assigned_capacity', 
      headerName: 'Assigned Capacity', 
      width: 150,
      valueGetter: (params: any) => params.row.bandwidth || 0,
      renderCell: (params: any) => {
        const assignedBandwidth = params.row.bandwidth || 0
        return (
          <Typography variant="body2">
            {assignedBandwidth.toFixed(2)}
          </Typography>
        )
      }
    },
    { 
      field: 'available_capacity', 
      headerName: 'Available Capacity', 
      width: 150,
      valueGetter: (params: any) => Math.max(0, 1 - (params.row.bandwidth || 0)),
      renderCell: (params: any) => {
        const assignedBandwidth = params.row.bandwidth || 0
        const availableBandwidth = Math.max(0, 1 - assignedBandwidth)
        return (
          <Typography variant="body2" color={availableBandwidth < 0 ? 'error.main' : 'text.primary'}>
            {availableBandwidth.toFixed(2)}
          </Typography>
        )
      }
    },
    { 
      field: 'assigned_pods', 
      headerName: 'Assigned PODs', 
      width: 200,
      renderCell: (params: any) => {
        const podNames = params.row.pod_members?.map((pm: any) => pm.pod?.name).filter(Boolean) || []
        return (
          <Typography variant="body2">
            {podNames.length > 0 ? podNames.join(', ') : 'No PODs'}
          </Typography>
        )
      }
    },
    ...(isPODCommittee ? [{
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params: any) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleOpenDialog(params.row)}
            title="Edit member"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(params.row.id, params.row.name)}
            title="Delete member"
            color="error"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      )
    }] : [])
  ]

  if (loading) {
    return <Typography>Loading...</Typography>
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Members</Typography>
        <Box display="flex" gap={2} alignItems="center">
          <Button
            variant="outlined"
            startIcon={<SmartToyIcon />}
            onClick={() => setAiDrawerOpen(true)}
            sx={{
              borderRadius: '12px',
              px: 3,
              py: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '14px',
              borderColor: '#E2E8F0',
              color: '#64748B',
              '&:hover': {
                borderColor: '#3B82F6',
                color: '#3B82F6',
                backgroundColor: '#EBF8FF',
              },
            }}
          >
            Ask Kynetik AI
          </Button>
          <TextField
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ minWidth: 250 }}
            size="small"
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Team</InputLabel>
            <Select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              label="Filter by Team"
            >
              <MenuItem value="all">All Teams</MenuItem>
              {uniqueTeams.map((team) => (
                <MenuItem key={team} value={team}>
                  {team}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {isPODCommittee && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add Member
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Card>
        <CardContent>
          <DataGrid
            rows={filteredMembers}
            columns={columns}
            pageSizeOptions={[5, 10, 25]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } }
            }}
            disableRowSelectionOnClick
            autoHeight
          />
        </CardContent>
      </Card>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Team Distribution
              </Typography>
              {uniqueTeams.map((team) => {
                const count = members.filter(m => m.team === team).length
                return (
                  <Box key={team} display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">{team}</Typography>
                    <Typography variant="body2" fontWeight="bold">{count}</Typography>
                  </Box>
                )
              })}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Availability Status
              </Typography>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Available</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {members.filter(m => (m.bandwidth || 0) === 0).length}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Low Utilization</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {members.filter(m => (m.bandwidth || 0) > 0 && (m.bandwidth || 0) < 0.4).length}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Medium Utilization</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {members.filter(m => (m.bandwidth || 0) >= 0.4 && (m.bandwidth || 0) < 0.8).length}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">High Utilization</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {members.filter(m => (m.bandwidth || 0) >= 0.8).length}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Members
              </Typography>
              <Typography variant="h3" color="primary">
                {members.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Across {uniqueTeams.length} teams
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add/Edit Member Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingMember ? 'Edit Member' : 'Add New Member'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={memberForm.name}
              onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={memberForm.email}
              onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
              margin="normal"
              required={memberForm.team === 'POD committee'}
              disabled={!!editingMember}
              helperText={
                memberForm.team === 'POD committee' 
                  ? 'Email is required for POD committee members' 
                  : 'Email is optional for team members'
              }
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Team</InputLabel>
              <Select
                value={memberForm.team}
                onChange={(e) => setMemberForm({ ...memberForm, team: e.target.value })}
                label="Team"
              >
                <MenuItem value="Product (PM/UX/QA)">Product (PM/UX/QA)</MenuItem>
                <MenuItem value="Engineering">Engineering</MenuItem>
                <MenuItem value="Configuration">Configuration</MenuItem>
                <MenuItem value="Customer success">Customer Success</MenuItem>
                <MenuItem value="BD/Sales">BD/Sales</MenuItem>
                <MenuItem value="POD committee">POD Committee</MenuItem>
              </Select>
            </FormControl>
            {!editingMember && memberForm.team === 'POD committee' && (
              <TextField
                fullWidth
                label="Password (optional - will use default if not provided)"
                type="password"
                value={memberForm.password}
                onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })}
                margin="normal"
                helperText="If not provided, a temporary password will be generated"
              />
            )}
            {!editingMember && memberForm.team !== 'POD committee' && (
              <TextField
                fullWidth
                label="Password (not needed for team members)"
                type="password"
                value=""
                disabled
                margin="normal"
                helperText="Team members don't need passwords - they can log in with email only"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {submitting ? 'Saving...' : editingMember ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Drawer */}
      <AIDrawer
        open={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        title="Team Members Analysis"
        contextData={{
          members: members,
          membersByTeam: uniqueTeams.reduce((acc, team) => {
            acc[team] = members.filter(member => member.team === team)
            return acc
          }, {} as Record<string, Profile[]>),
          podCommitteeMembers: members.filter(member => member.team === 'POD committee'),
          bandwidthStats: {
            totalAssigned: members.reduce((sum, member) => sum + (member.bandwidth || 0), 0),
            totalAvailable: members.reduce((sum, member) => sum + Math.max(0, 1 - (member.bandwidth || 0)), 0),
            averageBandwidth: members.length > 0 ? members.reduce((sum, member) => sum + (member.bandwidth || 0), 0) / members.length : 0
          }
        }}
        section="members"
      />
    </Box>
  )
}
