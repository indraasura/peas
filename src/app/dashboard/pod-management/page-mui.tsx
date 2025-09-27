'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { SelectChangeEvent } from '@mui/material'
import { Pod, Area, Profile, PodMember } from '@/lib/supabase'
import { getPods, createPod, updatePod, deletePod, getAreas, getMembers, updatePodMembers } from '@/lib/data'

export default function PodManagementPage() {
  const [pods, setPods] = useState<Pod[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [availableMembers, setAvailableMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingPod, setEditingPod] = useState<Pod | null>(null)
  const [podFormData, setPodFormData] = useState({
    name: '',
    area_id: '',
    members: [] as Array<{ member_id: string; bandwidth_percentage: number; is_leader: boolean }>,
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      const [podsData, areasData, membersData] = await Promise.all([
        getPods(),
        getAreas(),
        getMembers(),
      ])
      setPods(podsData)
      setAreas(areasData)
      setAvailableMembers(membersData)
    } catch (err) {
      setError('Failed to fetch data')
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const resetForm = () => {
    setPodFormData({
      name: '',
      area_id: '',
      members: [],
    })
    setEditingPod(null)
  }

  const handleSubmit = async () => {
    if (!podFormData.name.trim()) {
      setError('POD name is required')
      return
    }

    try {
      if (editingPod) {
        await updatePod(editingPod.id, {
          name: podFormData.name,
          area_id: podFormData.area_id || undefined,
        })
        await updatePodMembers(editingPod.id, podFormData.members)
      } else {
        await createPod({
          name: podFormData.name,
          area_id: podFormData.area_id || undefined,
          members: podFormData.members,
        })
      }
      
      await fetchData()
      setOpenDialog(false)
      resetForm()
      setError(null)
    } catch (err) {
      setError('Failed to save POD')
      console.error('Error saving POD:', err)
    }
  }

  const handleAddPod = () => {
    resetForm()
    setOpenDialog(true)
  }

  const handleEditPod = (pod: Pod) => {
    setPodFormData({
      name: pod.name,
      area_id: pod.area_id || '',
      members: (pod.members || []).map((member: PodMember) => ({
        member_id: member.member_id,
        bandwidth_percentage: member.bandwidth_percentage,
        is_leader: member.is_leader,
      })),
    })
    setEditingPod(pod)
    setOpenDialog(true)
  }

  const handleDeletePod = async (podId: string) => {
    if (window.confirm('Are you sure you want to delete this POD?')) {
      try {
        await deletePod(podId)
        await fetchData()
      } catch (err) {
        setError('Failed to delete POD')
        console.error('Error deleting POD:', err)
      }
    }
  }

  const handleAddMember = () => {
    setPodFormData((prev: typeof podFormData) => ({
      ...prev,
      members: [...prev.members, { member_id: '', bandwidth_percentage: 0.5, is_leader: false }],
    }))
  }

  const handleRemoveMember = (index: number) => {
    setPodFormData((prev: typeof podFormData) => ({
      ...prev,
      members: prev.members.filter((_: any, i: number) => i !== index),
    }))
  }

  const handleMemberChange = (index: number, field: string, value: any) => {
    setPodFormData((prev: typeof podFormData) => ({
      ...prev,
      members: prev.members.map((member: any, i: number) =>
        i === index ? { ...member, [field]: value } : member
      ),
    }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Awaiting development':
        return 'default'
      case 'In development':
        return 'primary'
      case 'In testing':
        return 'warning'
      case 'Released':
        return 'success'
      default:
        return 'default'
    }
  }

  const getAreaName = (areaId: string | undefined) => {
    if (!areaId) return 'No Area'
    const area = areas.find((a: Area) => a.id === areaId)
    return area ? area.name : 'Unknown Area'
  }

  const getMemberNames = (members: PodMember[]) => {
    return members.map((member: PodMember) => {
      const profile = availableMembers.find((m: Profile) => m.id === member.member_id)
      return profile ? `${profile.name}${member.is_leader ? ' (Leader)' : ''}` : 'Unknown Member'
    }).join(', ')
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1" sx={{ 
          fontWeight: 700, 
          color: '#0F172A',
          fontSize: '28px'
        }}>
          POD Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddPod}
          sx={{
            backgroundColor: '#3B82F6',
            borderRadius: '12px',
            px: 3,
            py: 1.5,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '14px',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
            '&:hover': {
              backgroundColor: '#2563EB',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
            },
          }}
        >
          Add POD
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Area</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Members</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pods.map((pod: Pod) => (
              <TableRow key={pod.id}>
                <TableCell>{pod.name}</TableCell>
                <TableCell>{getAreaName(pod.area_id)}</TableCell>
                <TableCell>
                  <Chip
                    label={pod.status}
                    color={getStatusColor(pod.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ maxWidth: 300 }}>
                    {getMemberNames(pod.members || [])}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title="Edit POD">
                    <IconButton
                      size="small"
                      onClick={() => handleEditPod(pod)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete POD">
                    <IconButton
                      size="small"
                      onClick={() => handleDeletePod(pod.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit POD Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPod ? 'Edit POD' : 'Add New POD'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="POD Name"
            value={podFormData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPodFormData((prev: typeof podFormData) => ({ ...prev, name: e.target.value }))
            }
            margin="normal"
            required
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Associated Area</InputLabel>
            <Select
              value={podFormData.area_id}
              onChange={(e: SelectChangeEvent<string>) =>
                setPodFormData((prev: typeof podFormData) => ({ ...prev, area_id: e.target.value }))
              }
            >
              <MenuItem value="">
                <em>No Area</em>
              </MenuItem>
              {areas.map((area: Area) => (
                <MenuItem key={area.id} value={area.id}>
                  {area.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Members Section */}
          <Box mt={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Members</Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddMember}
                size="small"
              >
                Add Member
              </Button>
            </Box>

            {podFormData.members.map((member: any, index: number) => (
              <Box key={index} display="flex" gap={2} alignItems="center" mb={2}>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Member</InputLabel>
                  <Select
                    value={member.member_id}
                    onChange={(e: SelectChangeEvent<string>) =>
                      handleMemberChange(index, 'member_id', e.target.value)
                    }
                  >
                    {availableMembers.map((profile: Profile) => (
                      <MenuItem key={profile.id} value={profile.id}>
                        {profile.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Bandwidth"
                  type="number"
                  value={member.bandwidth_percentage}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleMemberChange(index, 'bandwidth_percentage', parseFloat(e.target.value) || 0)
                  }
                  inputProps={{ min: 0, max: 1, step: 0.1 }}
                  sx={{ width: 120 }}
                />

                <FormControl sx={{ minWidth: 100 }}>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={member.is_leader ? 'leader' : 'member'}
                    onChange={(e: SelectChangeEvent<string>) =>
                      handleMemberChange(index, 'is_leader', e.target.value === 'leader')
                    }
                  >
                    <MenuItem value="member">Member</MenuItem>
                    <MenuItem value="leader">Leader</MenuItem>
                  </Select>
                </FormControl>

                <IconButton
                  color="error"
                  onClick={() => handleRemoveMember(index)}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingPod ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}