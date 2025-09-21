'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Alert
} from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material'
import { getPods, createPod, deletePod, getAreas, getAvailableMembers } from '@/lib/data'
import { type Pod, type Area, type Profile } from '@/lib/supabase'

export default function PodsPage() {
  const [pods, setPods] = useState<Pod[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [availableMembers, setAvailableMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    area_id: '',
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

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [podsData, areasData, membersData] = await Promise.all([
        getPods(),
        getAreas(),
        getAvailableMembers()
      ])
      setPods(podsData)
      setAreas(areasData)
      setAvailableMembers(membersData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePod = async () => {
    try {
      setError('')
      await createPod({
        name: formData.name,
        description: formData.description,
        area_id: formData.area_id,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        members: formData.members
      })
      setOpenDialog(false)
      setFormData({
        name: '',
        description: '',
        area_id: '',
        start_date: '',
        end_date: '',
        members: []
      })
      fetchData()
    } catch (err: any) {
      setError(err.message || 'Failed to create POD')
    }
  }

  const handleDeletePod = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this POD?')) {
      try {
        await deletePod(id)
        fetchData()
      } catch (error) {
        console.error('Error deleting POD:', error)
      }
    }
  }

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'description', headerName: 'Description', width: 300 },
    { 
      field: 'area', 
      headerName: 'Area', 
      width: 150,
      valueGetter: (params: any) => {
        try {
          return params.row.area?.name || 'N/A'
        } catch (error) {
          return 'N/A'
        }
      }
    },
    { field: 'status', headerName: 'Status', width: 150 },
    { field: 'start_date', headerName: 'Start Date', width: 120 },
    { field: 'end_date', headerName: 'End Date', width: 120 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params: any) => (
        <Box>
          <IconButton size="small" onClick={() => console.log('View', params.id)}>
            <ViewIcon />
          </IconButton>
          <IconButton size="small" onClick={() => console.log('Edit', params.id)}>
            <EditIcon />
          </IconButton>
          <IconButton size="small" onClick={() => handleDeletePod(params.id as string)}>
            <DeleteIcon />
          </IconButton>
        </Box>
      )
    }
  ]

  if (loading) {
    return <Typography>Loading...</Typography>
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">PODs</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Create POD
        </Button>
      </Box>

      <Card>
        <CardContent>
          <DataGrid
            rows={pods}
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

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New POD</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="POD Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Area</InputLabel>
                <Select
                  value={formData.area_id}
                  onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
                  label="Area"
                >
                  {areas.map((area) => (
                    <MenuItem key={area.id} value={area.id}>
                      {area.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Team Members
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                <strong>Note:</strong> Only non-POD Committee members are shown in this list. POD Committee members are not displayed as they have administrative access.
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Add Member</InputLabel>
                <Select
                  value=""
                  onChange={(e) => {
                    const memberId = e.target.value as string
                    if (memberId && !formData.members.find(m => m.member_id === memberId)) {
                      setFormData({
                        ...formData,
                        members: [...formData.members, {
                          member_id: memberId,
                          bandwidth_percentage: 25,
                          is_leader: false
                        }]
                      })
                    }
                  }}
                  label="Add Member"
                >
                  {availableMembers.map((member) => (
                    <MenuItem key={member.id} value={member.id}>
                      {member.name} ({member.available_bandwidth}% available)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {formData.members.map((member, index) => {
                const memberData = availableMembers.find(m => m.id === member.member_id)
                return (
                  <Card key={member.member_id} sx={{ mt: 2 }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">{memberData?.name}</Typography>
                        <IconButton
                          onClick={() => {
                            setFormData({
                              ...formData,
                              members: formData.members.filter((_, i) => i !== index)
                            })
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Bandwidth %"
                            type="number"
                            value={member.bandwidth_percentage}
                            onChange={(e) => {
                              const newMembers = [...formData.members]
                              newMembers[index].bandwidth_percentage = parseInt(e.target.value) || 0
                              setFormData({ ...formData, members: newMembers })
                            }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <FormControl fullWidth>
                            <InputLabel>Role</InputLabel>
                            <Select
                              value={member.is_leader ? 'leader' : 'member'}
                              onChange={(e) => {
                                const newMembers = [...formData.members]
                                newMembers[index].is_leader = e.target.value === 'leader'
                                setFormData({ ...formData, members: newMembers })
                              }}
                              label="Role"
                            >
                              <MenuItem value="member">Member</MenuItem>
                              <MenuItem value="leader">Leader</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                )
              })}
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                POD Dependencies
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select other PODs that this POD depends on
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Dependent PODs</InputLabel>
                <Select
                  multiple
                  value={formData.dependencies}
                  onChange={(e) => setFormData({ ...formData, dependencies: e.target.value as string[] })}
                  label="Dependent PODs"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const pod = pods.find(p => p.id === value)
                        return (
                          <Chip key={value} label={pod?.name || value} size="small" />
                        )
                      })}
                    </Box>
                  )}
                >
                  {pods.map((pod) => (
                    <MenuItem key={pod.id} value={pod.id}>
                      {pod.name} ({pod.area?.name || 'No Area'})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreatePod} variant="contained">
            Create POD
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
