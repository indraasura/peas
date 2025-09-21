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
  Card,
  CardContent,
  IconButton,
  Alert,
  Grid
} from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material'
import { getAreas, createArea, updateArea, deleteArea, getMembers } from '@/lib/data'
import { type Area } from '@/lib/supabase'

const impactLevels = ['Low', 'Medium', 'High']

export default function AreasPage() {
  const [areas, setAreas] = useState<Area[]>([])
  const [podCommitteeMembers, setPodCommitteeMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingArea, setEditingArea] = useState<Area | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    revenue_impact: 'Low',
    business_enablement: 'Low',
    efforts: 'Low',
    end_user_impact: 'Low',
    decision_quorum: [] as string[]
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAreas()
  }, [])

  const fetchAreas = async () => {
    try {
      const [areasData, membersData] = await Promise.all([
        getAreas(),
        getMembers()
      ])
      setAreas(areasData)
      setPodCommitteeMembers(membersData.filter(member => member.team === 'POD committee'))
    } catch (error) {
      console.error('Error fetching areas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      setError('')
      if (editingArea) {
        await updateArea(editingArea.id, formData)
      } else {
        await createArea(formData)
      }
      setOpenDialog(false)
      setEditingArea(null)
      setFormData({
        name: '',
        description: '',
        revenue_impact: 'Low',
        business_enablement: 'Low',
        efforts: 'Low',
        end_user_impact: 'Low'
      })
      fetchAreas()
    } catch (err: any) {
      setError(err.message || 'Failed to save area')
    }
  }

  const handleEdit = (area: Area) => {
    setEditingArea(area)
    setFormData({
      name: area.name,
      description: area.description,
      revenue_impact: area.revenue_impact,
      business_enablement: area.business_enablement,
      efforts: area.efforts,
      end_user_impact: area.end_user_impact
    })
    setOpenDialog(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this area?')) {
      try {
        await deleteArea(id)
        fetchAreas()
      } catch (error) {
        console.error('Error deleting area:', error)
      }
    }
  }

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'description', headerName: 'Description', width: 300 },
    { field: 'revenue_impact', headerName: 'Revenue Impact', width: 150 },
    { field: 'business_enablement', headerName: 'Business Enablement', width: 180 },
    { field: 'efforts', headerName: 'Efforts', width: 120 },
    { field: 'end_user_impact', headerName: 'End User Impact', width: 150 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params: any) => (
        <Box>
          <IconButton size="small" onClick={() => handleEdit(params.row)}>
            <EditIcon />
          </IconButton>
          <IconButton size="small" onClick={() => handleDelete(params.id as string)}>
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
        <Typography variant="h4">Areas</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Create Area
        </Button>
      </Box>

      <Card>
        <CardContent>
          <DataGrid
            rows={areas}
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

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingArea ? 'Edit Area' : 'Create New Area'}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Area Name"
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
              <FormControl fullWidth>
                <InputLabel>Revenue Impact</InputLabel>
                <Select
                  value={formData.revenue_impact}
                  onChange={(e) => setFormData({ ...formData, revenue_impact: e.target.value })}
                  label="Revenue Impact"
                >
                  {impactLevels.map((level) => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Business Enablement</InputLabel>
                <Select
                  value={formData.business_enablement}
                  onChange={(e) => setFormData({ ...formData, business_enablement: e.target.value })}
                  label="Business Enablement"
                >
                  {impactLevels.map((level) => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Efforts</InputLabel>
                <Select
                  value={formData.efforts}
                  onChange={(e) => setFormData({ ...formData, efforts: e.target.value })}
                  label="Efforts"
                >
                  {impactLevels.map((level) => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>End User Impact</InputLabel>
                <Select
                  value={formData.end_user_impact}
                  onChange={(e) => setFormData({ ...formData, end_user_impact: e.target.value })}
                  label="End User Impact"
                >
                  {impactLevels.map((level) => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Decision Quorum (POD Committee Members)</InputLabel>
                <Select
                  multiple
                  value={formData.decision_quorum}
                  onChange={(e) => setFormData({ ...formData, decision_quorum: e.target.value as string[] })}
                  label="Decision Quorum (POD Committee Members)"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const member = podCommitteeMembers.find(m => m.id === value)
                        return (
                          <Chip key={value} label={member?.name || value} size="small" />
                        )
                      })}
                    </Box>
                  )}
                >
                  {podCommitteeMembers.map((member) => (
                    <MenuItem key={member.id} value={member.id}>
                      {member.name} ({member.email})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingArea ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
