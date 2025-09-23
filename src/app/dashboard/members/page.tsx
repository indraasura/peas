'use client'

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
  Cancel as CancelIcon
} from '@mui/icons-material'
import { getMembers, createMember, updateMember, deleteMember, isPODCommitteeMember } from '@/lib/data'
import { type Profile } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export default function MembersPage() {
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [teamFilter, setTeamFilter] = useState('all')
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
      // Calculate bandwidth for each member
      const membersWithBandwidth = membersData.map(member => {
        const usedBandwidth = member.pod_members?.reduce((sum: number, pm: any) => 
          sum + (pm.bandwidth_percentage || 0), 0) || 0
        return {
          ...member,
          bandwidth: usedBandwidth
        }
      })
      setMembers(membersWithBandwidth)
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = teamFilter === 'all' 
    ? members 
    : members.filter(member => member.team === teamFilter)

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
    if (bandwidth >= 80) return 'error'
    if (bandwidth >= 60) return 'warning'
    if (bandwidth >= 40) return 'info'
    return 'success'
  }

  const getAvailabilityText = (bandwidth: number) => {
    if (bandwidth >= 80) return 'High'
    if (bandwidth >= 60) return 'Medium'
    if (bandwidth >= 40) return 'Low'
    return 'Available'
  }

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'email', headerName: 'Email', width: 250 },
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
      field: 'remaining_bandwidth', 
      headerName: 'Remaining Bandwidth', 
      width: 150,
      renderCell: (params: any) => {
        const usedBandwidth = params.row.bandwidth || 0
        const remainingBandwidth = Math.max(0, 100 - usedBandwidth)
        return (
          <Box>
            <Typography variant="body2">
              {remainingBandwidth}%
            </Typography>
          </Box>
        )
      }
    },
    { 
      field: 'member_usage', 
      headerName: 'Member Usage', 
      width: 120,
      renderCell: (params: any) => {
        const bandwidth = params.row.bandwidth || 0
        return (
          <Chip 
            label={getAvailabilityText(bandwidth)}
            color={getBandwidthColor(bandwidth) as any}
            size="small"
          />
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
                  {members.filter(m => (m.bandwidth || 0) > 0 && (m.bandwidth || 0) < 40).length}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Medium Utilization</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {members.filter(m => (m.bandwidth || 0) >= 40 && (m.bandwidth || 0) < 80).length}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">High Utilization</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {members.filter(m => (m.bandwidth || 0) >= 80).length}
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
    </Box>
  )
}
