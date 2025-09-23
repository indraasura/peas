'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  Alert,
  Avatar,
  AvatarGroup,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Paper,
  InputAdornment,
  Badge
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  Comment as CommentIcon
} from '@mui/icons-material'
import { getPods, createPod, updatePod, deletePod, getPlannedAreas, getAvailableMembers, updatePodMembers, updatePodDependencies, getPodDependencies, getPodNotes, createPodNote } from '@/lib/data'
import { type Pod, type Area, type Profile, type PodNote } from '@/lib/supabase'
import KanbanBoard from '@/components/KanbanBoard'
import { DropResult } from '@hello-pangea/dnd'

const podStatuses = ['backlog', 'planning', 'in development', 'testing', 'released']

export default function PodsPage() {
  const router = useRouter()
  const [pods, setPods] = useState<Pod[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [availableMembers, setAvailableMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false)
  const [openNotesDialog, setOpenNotesDialog] = useState(false)
  const [editingPod, setEditingPod] = useState<Pod | null>(null)
  const [selectedPod, setSelectedPod] = useState<Pod | null>(null)
  const [podNotes, setPodNotes] = useState<PodNote[]>([])
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
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    area_id: '',
    status: 'backlog',
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
        getPlannedAreas(),
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
      setFormData({
        name: '',
        description: '',
        area_id: '',
        status: 'backlog',
        start_date: '',
        end_date: '',
        members: [],
        dependencies: []
      })
      fetchData()
    } catch (error) {
      console.error('Error saving pod:', error)
      setError('Failed to save pod. Please try again.')
    }
  }

  const handleItemMove = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    
    if (!destination || destination.droppableId === source.droppableId) return

    const pod = pods.find((p: Pod) => p.id === draggableId)
    if (!pod) return

    try {
      const newStatus = destination.droppableId
      await updatePod(pod.id, { status: newStatus })
      
      // Update local state
      setPods((prev: Pod[]) => prev.map((p: Pod) => 
        p.id === pod.id ? { ...p, status: newStatus } : p
      ))
    } catch (error) {
      console.error('Error moving pod:', error)
      setError('Failed to move pod. Please try again.')
    }
  }

  const handleAddPod = () => {
    setEditingPod(null)
    setFormData({
      name: '',
      description: '',
      area_id: '',
      status: 'backlog',
      start_date: '',
      end_date: '',
      members: [],
      dependencies: []
    })
    setOpenDialog(true)
  }

  const handleEditPod = (pod: Pod) => {
    setEditingPod(pod)
    setFormData({
      name: pod.name,
      description: pod.description || '',
      area_id: pod.area_id,
      status: pod.status,
      start_date: pod.start_date || '',
      end_date: pod.end_date || '',
      members: pod.members?.map(m => ({
        member_id: m.member_id,
        bandwidth_percentage: m.bandwidth_percentage,
        is_leader: m.is_leader
      })) || [],
      dependencies: [] // Will be fetched separately
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

  const handleViewPodDetails = async (pod: Pod) => {
    setSelectedPod(pod)
    try {
      const notes = await getPodNotes(pod.id)
      setPodNotes(notes)
        } catch (error) {
      console.error('Error fetching pod notes:', error)
      setPodNotes([])
    }
    setOpenDetailsDialog(true)
  }

  const handleAddReviewNote = () => {
    if (!selectedPod) return
    setNewNote({
      review_date: '',
      blockers: '',
      learnings: '',
      current_state: '',
      deviation_to_plan: '',
      dependencies_risks: '',
      misc: ''
    })
    setOpenNotesDialog(true)
  }

  const handleSubmitReviewNote = async () => {
    if (!selectedPod || !newNote.review_date) return

    try {
      setAddingNote(true)
      // For now, using a placeholder user ID - in real app, get from auth context
      const userId = 'placeholder-user-id'
      
      await createPodNote({
        pod_id: selectedPod.id,
        review_date: newNote.review_date,
        blockers: newNote.blockers || null,
        learnings: newNote.learnings || null,
        current_state: newNote.current_state || null,
        deviation_to_plan: newNote.deviation_to_plan || null,
        dependencies_risks: newNote.dependencies_risks || null,
        misc: newNote.misc || null,
        created_by: userId
      })

      // Refresh notes
      const notes = await getPodNotes(selectedPod.id)
      setPodNotes(notes)
      
      setOpenNotesDialog(false)
      setNewNote({
        review_date: '',
        blockers: '',
        learnings: '',
        current_state: '',
        deviation_to_plan: '',
        dependencies_risks: '',
        misc: ''
      })
        } catch (error) {
      console.error('Error adding review note:', error)
      setError('Failed to add review note. Please try again.')
    } finally {
      setAddingNote(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'backlog': return '#9e9e9e'
      case 'planning': return '#2196f3'
      case 'in development': return '#ff9800'
      case 'testing': return '#9c27b0'
      case 'released': return '#4caf50'
      default: return '#9e9e9e'
    }
  }

  const renderPodCard = (pod: Pod) => {
    const leader = pod.members?.find(m => m.is_leader)
    const memberCount = pod.members?.length || 0
    
    return (
        <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {pod.name}
        </Typography>
        
        {pod.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {pod.description}
          </Typography>
        )}

        {/* Area */}
        {pod.area && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AssignmentIcon sx={{ fontSize: 14 }} />
              Area: {pod.area.name}
            </Typography>
          </Box>
        )}

        {/* Leader */}
        {leader && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PersonIcon sx={{ fontSize: 14 }} />
              Leader: {leader.member?.name || 'Unknown'}
            </Typography>
          </Box>
        )}

        {/* Members */}
        {memberCount > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <GroupIcon sx={{ fontSize: 14 }} />
              Members ({memberCount})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {pod.members?.slice(0, 3).map((member) => (
                <Chip
                  key={member.id}
                  label={`${member.member?.name || 'Unknown'} (${member.bandwidth_percentage}%)`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              ))}
              {memberCount > 3 && (
                <Chip
                  label={`+${memberCount - 3} more`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
            </Box>
          </Box>
        )}

        {/* Dates */}
        {(pod.start_date || pod.end_date) && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ScheduleIcon sx={{ fontSize: 14 }} />
              {pod.start_date && `Start: ${new Date(pod.start_date).toLocaleDateString()}`}
              {pod.start_date && pod.end_date && ' • '}
              {pod.end_date && `End: ${new Date(pod.end_date).toLocaleDateString()}`}
            </Typography>
          </Box>
        )}

        {/* Notes count */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CommentIcon sx={{ fontSize: 14 }} />
          <Typography variant="caption" color="text.secondary">
            {podNotes.filter((note: any) => note.pod_id === pod.id).length} review notes
          </Typography>
        </Box>
        </Box>
      )
    }

  // Group pods by status
  const podsByStatus = podStatuses.map((status: string) => ({
    id: status,
    title: status.charAt(0).toUpperCase() + status.slice(1).replace(/([A-Z])/g, ' $1'),
    items: pods.filter((pod: Pod) => pod.status === status),
    color: getStatusColor(status)
  }))

  if (loading) {
    return <Typography>Loading...</Typography>
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          PODs
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddPod}
        >
          Add POD
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <KanbanBoard
        columns={podsByStatus}
        onItemMove={handleItemMove}
        onItemEdit={handleEditPod}
        onItemDelete={handleDeletePod}
        onItemView={handleViewPodDetails}
        onItemAdd={handleAddPod}
        renderItem={renderPodCard}
        addButtonText="Add POD"
      />

      {/* Add/Edit POD Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingPod ? 'Edit POD' : 'Add New POD'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="POD Name"
                value={formData.name}
                onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Area</InputLabel>
                <Select
                  value={formData.area_id}
                  onChange={(e: any) => setFormData({ ...formData, area_id: e.target.value })}
                  label="Area"
                  required
                >
                  {areas.map((area: any) => (
                    <MenuItem key={area.id} value={area.id}>{area.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e: any) => setFormData({ ...formData, status: e.target.value })}
                  label="Status"
                >
                  {podStatuses.map((status: string) => (
                    <MenuItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1).replace(/([A-Z])/g, ' $1')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={formData.start_date}
                onChange={(e: any) => setFormData({ ...formData, start_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={formData.end_date}
                onChange={(e: any) => setFormData({ ...formData, end_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Members
              </Typography>
              {formData.members.map((member: any, index: number) => (
                <Grid container spacing={1} key={index} sx={{ mb: 1 }}>
                  <Grid item xs={5}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Member</InputLabel>
                <Select
                        value={member.member_id}
                        onChange={(e: any) => {
                          const newMembers = [...formData.members]
                          newMembers[index].member_id = e.target.value
                          setFormData({ ...formData, members: newMembers })
                        }}
                        label="Member"
                      >
                        {availableMembers.map((memberOption: Profile) => (
                          <MenuItem key={memberOption.id} value={memberOption.id}>
                            {memberOption.name} ({memberOption.available_bandwidth || 100}% available)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
                  </Grid>
                  <Grid item xs={3}>
                          <TextField
                            fullWidth
                      size="small"
                            label="Bandwidth %"
                            type="number"
                            value={member.bandwidth_percentage}
                      onChange={(e: any) => {
                              const newMembers = [...formData.members]
                              newMembers[index].bandwidth_percentage = parseInt(e.target.value) || 0
                              setFormData({ ...formData, members: newMembers })
                            }}
                      inputProps={{ min: 0, max: 100 }}
                          />
                        </Grid>
                  <Grid item xs={3}>
                    <FormControl fullWidth size="small">
                            <InputLabel>Role</InputLabel>
                            <Select
                              value={member.is_leader ? 'leader' : 'member'}
                        onChange={(e: any) => {
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
                  <Grid item xs={1}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        const newMembers = formData.members.filter((_: any, i: number) => i !== index)
                        setFormData({ ...formData, members: newMembers })
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                      </Grid>
            </Grid>
              ))}
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => {
                  setFormData({
                    ...formData,
                    members: [...formData.members, {
                      member_id: '',
                      bandwidth_percentage: 25,
                      is_leader: false
                    }]
                  })
                }}
              >
                Add Member
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingPod ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* POD Details Dialog */}
      <Dialog open={openDetailsDialog} onClose={() => setOpenDetailsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedPod?.name} - Details
        </DialogTitle>
        <DialogContent>
          {selectedPod && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedPod.description}
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Area</Typography>
                  <Typography>{selectedPod.area?.name || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Chip 
                    label={selectedPod.status} 
                    sx={{ 
                      backgroundColor: getStatusColor(selectedPod.status), 
                      color: 'white' 
                    }} 
                  />
                </Grid>
                {selectedPod.start_date && (
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Start Date</Typography>
                    <Typography>{new Date(selectedPod.start_date).toLocaleDateString()}</Typography>
                  </Grid>
                )}
                {selectedPod.end_date && (
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">End Date</Typography>
                    <Typography>{new Date(selectedPod.end_date).toLocaleDateString()}</Typography>
                  </Grid>
                )}
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" sx={{ mb: 2 }}>Team Members</Typography>
              <List>
                {selectedPod.members?.map((member: any) => (
                  <ListItem key={member.id}>
                    <ListItemAvatar>
                      <Avatar>{member.member?.name?.[0] || 'U'}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${member.member?.name || 'Unknown'} ${member.is_leader ? '(Leader)' : ''}`}
                      secondary={`${member.member?.team || 'Unknown Team'} • ${member.bandwidth_percentage}% bandwidth`}
                    />
                  </ListItem>
                ))}
              </List>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Review Meeting Notes</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddReviewNote}
                >
                  Add Review Note
                </Button>
              </Box>
              
              {podNotes.length > 0 ? (
                <List>
                  {podNotes.map((note: PodNote) => (
                    <ListItem key={note.id} alignItems="flex-start">
                      <ListItemText
                        primary={`Review Date: ${new Date(note.review_date).toLocaleDateString()}`}
                        secondary={
                          <Box>
                            {note.current_state && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="subtitle2">Current State:</Typography>
                                <Typography variant="body2">{note.current_state}</Typography>
                              </Box>
                            )}
                            {note.blockers && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="subtitle2">Blockers:</Typography>
                                <Typography variant="body2">{note.blockers}</Typography>
                              </Box>
                            )}
                            {note.learnings && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="subtitle2">Learnings:</Typography>
                                <Typography variant="body2">{note.learnings}</Typography>
                              </Box>
                            )}
                            {note.deviation_to_plan && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="subtitle2">Deviation to Plan:</Typography>
                                <Typography variant="body2">{note.deviation_to_plan}</Typography>
                              </Box>
                            )}
                            {note.dependencies_risks && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="subtitle2">Dependencies & Risks:</Typography>
                                <Typography variant="body2">{note.dependencies_risks}</Typography>
                              </Box>
                            )}
                            {note.misc && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="subtitle2">Miscellaneous:</Typography>
                                <Typography variant="body2">{note.misc}</Typography>
                              </Box>
                            )}
                            <Typography variant="caption" color="text.secondary">
                              Created by {note.creator?.name || 'Unknown'} on {new Date(note.created_at).toLocaleString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">No review notes available</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => router.push(`/dashboard/pods/${selectedPod?.id}`)}>
            View Full Details
          </Button>
          <Button onClick={() => setOpenDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add Review Note Dialog */}
      <Dialog open={openNotesDialog} onClose={() => setOpenNotesDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Review Meeting Note</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Review Date"
                type="date"
                value={newNote.review_date}
                onChange={(e: any) => setNewNote({ ...newNote, review_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Current State"
                value={newNote.current_state}
                onChange={(e: any) => setNewNote({ ...newNote, current_state: e.target.value })}
                multiline
                rows={3}
                placeholder="Describe the current state of the POD..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Blockers"
                value={newNote.blockers}
                onChange={(e: any) => setNewNote({ ...newNote, blockers: e.target.value })}
                multiline
                rows={2}
                placeholder="List any blockers or impediments..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Learnings"
                value={newNote.learnings}
                onChange={(e: any) => setNewNote({ ...newNote, learnings: e.target.value })}
                multiline
                rows={2}
                placeholder="What did the team learn during this period?"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Deviation to Plan"
                value={newNote.deviation_to_plan}
                onChange={(e: any) => setNewNote({ ...newNote, deviation_to_plan: e.target.value })}
                multiline
                rows={2}
                placeholder="Any deviations from the original plan..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dependencies & Risks"
                value={newNote.dependencies_risks}
                onChange={(e: any) => setNewNote({ ...newNote, dependencies_risks: e.target.value })}
                multiline
                rows={2}
                placeholder="External dependencies and potential risks..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Miscellaneous"
                value={newNote.misc}
                onChange={(e: any) => setNewNote({ ...newNote, misc: e.target.value })}
                multiline
                rows={2}
                placeholder="Any other notes or observations..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNotesDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmitReviewNote} 
            variant="contained"
            disabled={!newNote.review_date || addingNote}
          >
            {addingNote ? 'Adding...' : 'Add Note'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}