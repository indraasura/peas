'use client'

import React, { useState, useEffect } from 'react'
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
  Grid,
  Chip,
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
  SelectChangeEvent
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Comment as CommentIcon,
  AttachFile as AttachFileIcon,
  Group as GroupIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
  Send as SendIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material'
import { getAreas, createArea, updateArea, deleteArea, getMembers, updateAreaDecisionQuorum, getAreaComments, createAreaComment, updateAreaComment, deleteAreaComment, getPods, updatePod, kickOffArea, validateAreaForPlanning, validateAreaForPlanned, checkAndUpdateAreaStatus } from '@/lib/data'
import { type Area, type Profile, type Pod } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import KanbanBoard from '@/components/KanbanBoard'
import { DropResult } from '@hello-pangea/dnd'

const impactLevels = ['Low', 'Medium', 'High']

export default function AreasPage() {
  const [areas, setAreas] = useState<Area[]>([])
  const [pods, setPods] = useState<Pod[]>([])
  const [podCommitteeMembers, setPodCommitteeMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
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
    revenue_impact: '',
    business_enablement: '',
    efforts: '',
    end_user_impact: '',
    start_date: '',
    end_date: '',
    decision_quorum: [] as string[],
    one_pager_url: '',
    selected_pods: [] as string[]
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [areasData, podsData, membersData] = await Promise.all([
        getAreas(),
        getPods(),
        getMembers()
      ])
      setAreas(areasData)
      setPods(podsData)
      setPodCommitteeMembers(membersData.filter(member => member.team === 'POD committee'))
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      setError('')
      const { decision_quorum, selected_pods, ...areaData } = formData
      
      // Only name is required for area creation
      if (!areaData.name.trim()) {
        setError('Area name is required')
        return
      }
      
      let areaId: string
      if (editingArea) {
        await updateArea(editingArea.id, areaData)
        await updateAreaDecisionQuorum(editingArea.id, decision_quorum)
        areaId = editingArea.id
      } else {
        const newArea = await createArea({ ...areaData, status: 'Backlog' })
        await updateAreaDecisionQuorum(newArea.id, decision_quorum)
        areaId = newArea.id
      }

      // Update POD associations
      // First, remove all PODs from this area
      const currentAreaPods = pods.filter((pod: Pod) => pod.area_id === areaId)
      for (const pod of currentAreaPods) {
        await updatePod(pod.id, { area_id: undefined })
      }

      // Then, assign selected PODs to this area
      for (const podId of selected_pods) {
        await updatePod(podId, { area_id: areaId })
      }
      
      setOpenDialog(false)
      setEditingArea(null)
      setFormData({
        name: '',
        description: '',
        revenue_impact: '',
        business_enablement: '',
        efforts: '',
        end_user_impact: '',
        start_date: '',
        end_date: '',
        decision_quorum: [],
        one_pager_url: '',
        selected_pods: []
      })
      fetchData()
    } catch (error) {
      console.error('Error saving area:', error)
      setError('Failed to save area. Please try again.')
    }
  }

  const handleItemMove = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    
    if (!destination || destination.droppableId === source.droppableId) return

    const area = areas.find((a: Area) => a.id === draggableId)
    if (!area) return

    // Validate move from Backlog to Planning
    if (source.droppableId === 'Backlog' && destination.droppableId === 'Planning') {
      const validation = await validateAreaForPlanning(area.id)
      if (!validation.valid) {
        setError(validation.message)
        return
      }
    }

    // Validate move from Planning to Planned
    if (source.droppableId === 'Planning' && destination.droppableId === 'Planned') {
      const validation = await validateAreaForPlanned(area.id)
      if (!validation.valid) {
        setError(validation.message)
        return
      }
    }

    try {
      const newStatus = destination.droppableId as Area['status']
      await updateArea(area.id, { status: newStatus })
      
      // Update local state
      setAreas((prev: Area[]) => prev.map((a: Area) => 
        a.id === area.id ? { ...a, status: newStatus } : a
      ))
    } catch (error) {
      console.error('Error moving area:', error)
      setError('Failed to move area. Please try again.')
    }
  }

  const handleAddArea = () => {
    setEditingArea(null)
    setFormData({
      name: '',
      description: '',
      revenue_impact: '',
      business_enablement: '',
      efforts: '',
      end_user_impact: '',
      start_date: '',
      end_date: '',
      decision_quorum: [],
      one_pager_url: '',
      selected_pods: []
    })
    setOpenDialog(true)
  }

  const handleKickOff = async (area: Area) => {
    if (window.confirm(`Are you sure you want to kick off "${area.name}"? This will move all associated PODs to "Awaiting development" status.`)) {
      try {
        await kickOffArea(area.id)
        fetchData() // Refresh data to show updated statuses
      } catch (error) {
        console.error('Error kicking off area:', error)
        setError('Failed to kick off area. Please try again.')
      }
    }
  }

  const handleEditArea = (area: Area) => {
    setEditingArea(area)
    const areaPods = pods.filter((pod: Pod) => pod.area_id === area.id)
    setFormData({
      name: area.name,
      description: area.description || '',
      revenue_impact: area.revenue_impact || '',
      business_enablement: area.business_enablement || '',
      efforts: area.efforts || '',
      end_user_impact: area.end_user_impact || '',
      start_date: area.start_date || '',
      end_date: area.end_date || '',
      decision_quorum: area.decision_quorum?.map(q => q.id) || [],
      one_pager_url: area.one_pager_url || '',
      selected_pods: areaPods.map((pod: Pod) => pod.id)
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


  const handleViewComments = async (area: Area) => {
    setSelectedArea(area)
    try {
      const comments = await getAreaComments(area.id)
      setAreaComments(comments)
    } catch (error) {
      console.error('Error fetching comments:', error)
      setAreaComments([])
    }
    setOpenCommentsDialog(true)
  }

  const handleViewAreaDetails = async (area: Area) => {
    setSelectedArea(area)
    try {
      const comments = await getAreaComments(area.id)
      setAreaComments(comments)
    } catch (error) {
      console.error('Error fetching comments:', error)
      setAreaComments([])
    }
    setOpenDetailsDialog(true)
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedArea) return

    try {
      setNewCommentLoading(true)
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        setError('Please log in to add comments')
        return
      }

      await createAreaComment({
        area_id: selectedArea.id,
        content: newComment.trim(),
        created_by: currentUser.id
      })
      
      const comments = await getAreaComments(selectedArea.id)
      setAreaComments(comments)
      setNewComment('')
      
      // Refresh areas data to update comment counts in cards
      const areasData = await getAreas()
      setAreas(areasData)
    } catch (error) {
      console.error('Error adding comment:', error)
      setError('Failed to add comment. Please try again.')
    } finally {
      setNewCommentLoading(false)
    }
  }

  const handleEditComment = (comment: any) => {
    setEditingComment(comment)
    setEditCommentText(comment.content)
  }

  const handleSaveEditComment = async () => {
    if (!editingComment || !editCommentText.trim()) return

    try {
      await updateAreaComment(editingComment.id, {
        content: editCommentText.trim()
      })
      
      const comments = await getAreaComments(selectedArea!.id)
      setAreaComments(comments)
      
      // Refresh areas data to update comment counts in cards
      const areasData = await getAreas()
      setAreas(areasData)
      
      setEditingComment(null)
      setEditCommentText('')
    } catch (error) {
      console.error('Error updating comment:', error)
      setError('Failed to update comment. Please try again.')
    }
  }

  const handleCancelEditComment = () => {
    setEditingComment(null)
    setEditCommentText('')
  }

  const handleDeleteComment = async (commentId: string) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await deleteAreaComment(commentId)
        
        const comments = await getAreaComments(selectedArea!.id)
        setAreaComments(comments)
        
        // Refresh areas data to update comment counts in cards
        const areasData = await getAreas()
        setAreas(areasData)
      } catch (error) {
        console.error('Error deleting comment:', error)
        setError('Failed to delete comment. Please try again.')
      }
    }
  }

  const getImpactColor = (level: string | undefined) => {
    return '#9e9e9e' // Always return grey for all levels
  }

  const renderAreaCard = (area: Area) => {
    const areaPods = pods.filter((pod: Pod) => pod.area_id === area.id)
    
    return (
        <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {area.name}
        </Typography>
        
        {area.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {area.description}
          </Typography>
        )}

        {/* Impact Values - only show if they have values */}
        {(area.revenue_impact || area.business_enablement || area.efforts || area.end_user_impact) && (
          <Grid container spacing={1} sx={{ mb: 2 }}>
            {area.revenue_impact && (
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AssessmentIcon sx={{ fontSize: 16, color: getImpactColor(area.revenue_impact) }} />
                  <Typography variant="caption">Revenue</Typography>
                  <Chip 
                    label={area.revenue_impact} 
                    size="small" 
                    sx={{ 
                      backgroundColor: getImpactColor(area.revenue_impact), 
                      color: 'white',
                      fontSize: '0.7rem',
                      height: 20
                    }} 
                  />
                </Box>
              </Grid>
            )}
            {area.business_enablement && (
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AssessmentIcon sx={{ fontSize: 16, color: getImpactColor(area.business_enablement) }} />
                  <Typography variant="caption">Business</Typography>
                  <Chip 
                    label={area.business_enablement} 
                    size="small" 
                    sx={{ 
                      backgroundColor: getImpactColor(area.business_enablement), 
                      color: 'white',
                      fontSize: '0.7rem',
                      height: 20
                    }} 
                  />
                </Box>
              </Grid>
            )}
            {area.efforts && (
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ScheduleIcon sx={{ fontSize: 16, color: getImpactColor(area.efforts) }} />
                  <Typography variant="caption">Efforts</Typography>
                  <Chip 
                    label={area.efforts} 
                    size="small" 
                    sx={{ 
                      backgroundColor: getImpactColor(area.efforts), 
                      color: 'white',
                      fontSize: '0.7rem',
                      height: 20
                    }} 
                  />
                </Box>
              </Grid>
            )}
            {area.end_user_impact && (
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <GroupIcon sx={{ fontSize: 16, color: getImpactColor(area.end_user_impact) }} />
                  <Typography variant="caption">User Impact</Typography>
                  <Chip 
                    label={area.end_user_impact} 
                    size="small" 
                    sx={{ 
                      backgroundColor: getImpactColor(area.end_user_impact), 
                      color: 'white',
                      fontSize: '0.7rem',
                      height: 20
                    }} 
                  />
                </Box>
              </Grid>
            )}
          </Grid>
        )}

        {/* Associated PODs */}
        {areaPods.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <GroupIcon sx={{ fontSize: 14 }} />
              Associated PODs ({areaPods.length})
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              {areaPods.slice(0, 3).map((pod: Pod) => (
                <Chip 
                  key={pod.id}
                  label={pod.name}
                  size="small"
                  variant="outlined"
                  sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }}
                />
              ))}
              {areaPods.length > 3 && (
                <Chip 
                  label={`+${areaPods.length - 3} more`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
            </Box>
          </Box>
        )}

        {/* One-pager status */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          {area.one_pager_url ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AttachFileIcon sx={{ fontSize: 14, color: '#4caf50' }} />
              <Typography variant="caption" color="success.main">
                One-pager uploaded
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AttachFileIcon sx={{ fontSize: 14, color: '#f44336' }} />
              <Typography variant="caption" color="error.main">
                One-pager required
              </Typography>
            </Box>
          )}
        </Box>

        {/* Kick-off button for Planned areas */}
        {area.status === 'Planned' && (
          <Box sx={{ mb: 1 }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => handleKickOff(area)}
              sx={{
                background: 'linear-gradient(45deg, #2196f3 30%, #21cbf3 90%)',
                boxShadow: '0 3px 5px 2px rgba(33, 150, 243, .3)',
                fontSize: '0.7rem',
                py: 0.5,
                px: 1
              }}
            >
              Kick-off
            </Button>
          </Box>
        )}

        {/* Comments count */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 0.5,
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: 'action.hover',
              borderRadius: 1,
              px: 1,
              py: 0.5
            }
          }}
          onClick={() => handleViewComments(area)}
        >
          <CommentIcon sx={{ fontSize: 14 }} />
          <Typography variant="caption" color="text.secondary">
            {area.comments?.length || 0} comments
          </Typography>
        </Box>
        </Box>
      )
    }

  const backlogAreas = areas.filter((area: Area) => area.status === 'Backlog')
  const planningAreas = areas.filter((area: Area) => area.status === 'Planning')
  const plannedAreas = areas.filter((area: Area) => area.status === 'Planned')
  const executingAreas = areas.filter((area: Area) => area.status === 'Executing')
  const releasedAreas = areas.filter((area: Area) => area.status === 'Released')

  const columns = [
    {
      id: 'Backlog',
      title: 'Backlog',
      items: backlogAreas,
      color: '#ff9800'
    },
    {
      id: 'Planning',
      title: 'Planning',
      items: planningAreas,
      color: '#ffc107'
    },
    {
      id: 'Planned',
      title: 'Planned',
      items: plannedAreas,
      color: '#4caf50'
    },
    {
      id: 'Executing',
      title: 'Executing',
      items: executingAreas,
      color: '#2196f3'
    },
    {
      id: 'Released',
      title: 'Released',
      items: releasedAreas,
      color: '#9c27b0'
    }
  ]

  if (loading) {
    return <Typography>Loading...</Typography>
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Areas
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddArea}
        >
          Add Area
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <KanbanBoard
        columns={columns}
        onItemMove={handleItemMove}
        onItemEdit={handleEditArea}
        onItemDelete={handleDeleteArea}
        onItemAdd={handleAddArea}
        renderItem={renderAreaCard}
        addButtonText="Add Area"
      />

      {/* Add/Edit Area Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingArea ? 'Edit Area' : 'Add New Area'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Area Name"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Revenue Impact</InputLabel>
                <Select
                  value={formData.revenue_impact}
                  onChange={(e: SelectChangeEvent<string>) => setFormData({ ...formData, revenue_impact: e.target.value })}
                  label="Revenue Impact"
                >
                  {impactLevels.map((level) => (
                    <MenuItem key={level} value={level}>{level}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Business Enablement</InputLabel>
                <Select
                  value={formData.business_enablement}
                  onChange={(e: SelectChangeEvent<string>) => setFormData({ ...formData, business_enablement: e.target.value })}
                  label="Business Enablement"
                >
                  {impactLevels.map((level) => (
                    <MenuItem key={level} value={level}>{level}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Efforts</InputLabel>
                <Select
                  value={formData.efforts}
                  onChange={(e: SelectChangeEvent<string>) => setFormData({ ...formData, efforts: e.target.value })}
                  label="Efforts"
                >
                  {impactLevels.map((level) => (
                    <MenuItem key={level} value={level}>{level}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>End User Impact</InputLabel>
                <Select
                  value={formData.end_user_impact}
                  onChange={(e: SelectChangeEvent<string>) => setFormData({ ...formData, end_user_impact: e.target.value })}
                  label="End User Impact"
                >
                  {impactLevels.map((level) => (
                    <MenuItem key={level} value={level}>{level}</MenuItem>
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, start_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={formData.end_date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, end_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="One-pager URL"
                value={formData.one_pager_url}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, one_pager_url: e.target.value })}
                placeholder="https://example.com/one-pager.pdf"
                helperText="Enter the URL to the one-pager document"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Decision Quorum (POD Committee Members)</InputLabel>
                <Select
                  multiple
                  value={formData.decision_quorum}
                  onChange={(e: SelectChangeEvent<string[]>) => setFormData({ ...formData, decision_quorum: e.target.value })}
                  label="Decision Quorum (POD Committee Members)"
                >
                  {podCommitteeMembers.map((member: Profile) => (
                    <MenuItem key={member.id} value={member.id}>{member.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Associated PODs</InputLabel>
                <Select
                  multiple
                  value={formData.selected_pods}
                  onChange={(e: SelectChangeEvent<string[]>) => setFormData({ ...formData, selected_pods: e.target.value })}
                  label="Associated PODs"
                >
                  {pods.map((pod: Pod) => (
                    <MenuItem key={pod.id} value={pod.id}>{pod.name}</MenuItem>
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

      {/* Comments Dialog */}
      <Dialog open={openCommentsDialog} onClose={() => {
        setOpenCommentsDialog(false)
        setEditingComment(null)
        setEditCommentText('')
      }} maxWidth="md" fullWidth>
        <DialogTitle>
          Comments for {selectedArea?.name}
        </DialogTitle>
        <DialogContent>
          <List>
            {areaComments.map((comment: any) => (
              <ListItem key={comment.id} alignItems="flex-start">
                <ListItemAvatar>
                  <Avatar>{comment.creator?.name?.[0] || 'U'}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1">
                        {comment.creator?.name || 'Unknown User'}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditComment(comment)}
                          sx={{ 
                            color: 'primary.main',
                            '&:hover': { backgroundColor: 'primary.light', color: 'primary.dark' }
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteComment(comment.id)}
                          sx={{ 
                            color: 'error.main',
                            '&:hover': { backgroundColor: 'error.light', color: 'error.dark' }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  }
                  secondary={
                    <Box>
                      {editingComment?.id === comment.id ? (
                        <Box sx={{ mt: 1 }}>
                          <TextField
                            fullWidth
                            multiline
                            rows={2}
                            value={editCommentText}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditCommentText(e.target.value)}
                            variant="outlined"
                            size="small"
                            sx={{ mb: 1 }}
                          />
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<CheckIcon />}
                              onClick={handleSaveEditComment}
                              disabled={!editCommentText.trim()}
                            >
                              Save
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<CloseIcon />}
                              onClick={handleCancelEditComment}
                            >
                              Cancel
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {comment.content}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(comment.created_at).toLocaleString()}
                          </Typography>
                        </>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewComment(e.target.value)}
              multiline
              rows={2}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || newCommentLoading}
                      edge="end"
                    >
                      <SendIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCommentsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Area Details Dialog */}
      <Dialog open={openDetailsDialog} onClose={() => setOpenDetailsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedArea?.name} - Details
        </DialogTitle>
        <DialogContent>
          {selectedArea && (
            <Box>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {selectedArea.description}
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {selectedArea.revenue_impact && (
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Revenue Impact</Typography>
                    <Chip 
                      label={selectedArea.revenue_impact} 
                      sx={{ 
                        backgroundColor: getImpactColor(selectedArea.revenue_impact), 
                        color: 'white' 
                      }} 
                    />
                  </Grid>
                )}
                {selectedArea.business_enablement && (
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Business Enablement</Typography>
                    <Chip 
                      label={selectedArea.business_enablement} 
                      sx={{ 
                        backgroundColor: getImpactColor(selectedArea.business_enablement), 
                        color: 'white' 
                      }} 
                    />
                  </Grid>
                )}
                {selectedArea.efforts && (
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Efforts</Typography>
                    <Chip 
                      label={selectedArea.efforts} 
                      sx={{ 
                        backgroundColor: getImpactColor(selectedArea.efforts), 
                        color: 'white' 
                      }} 
                    />
                  </Grid>
                )}
                {selectedArea.end_user_impact && (
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">End User Impact</Typography>
                    <Chip 
                      label={selectedArea.end_user_impact} 
                      sx={{ 
                        backgroundColor: getImpactColor(selectedArea.end_user_impact), 
                        color: 'white' 
                      }} 
                    />
                  </Grid>
                )}
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Chip 
                    label={selectedArea.status} 
                    sx={{ 
                      backgroundColor: selectedArea.status === 'Planned' ? '#4caf50' : 
                                      selectedArea.status === 'Executing' ? '#2196f3' :
                                      selectedArea.status === 'Released' ? '#9c27b0' :
                                      selectedArea.status === 'Planning' ? '#ffc107' : '#ff9800', 
                      color: 'white' 
                    }} 
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">One-pager</Typography>
                  {selectedArea.one_pager_url ? (
                    <Chip 
                      label="Uploaded" 
                      sx={{ backgroundColor: '#4caf50', color: 'white' }} 
                    />
                  ) : (
                    <Chip 
                      label="Required" 
                      sx={{ backgroundColor: '#f44336', color: 'white' }} 
                    />
                  )}
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" sx={{ mb: 2 }}>Associated PODs</Typography>
              {pods.filter((pod: Pod) => pod.area_id === selectedArea.id).length > 0 ? (
                <List>
                  {pods.filter((pod: Pod) => pod.area_id === selectedArea.id).map((pod: Pod) => (
                    <ListItem key={pod.id}>
                      <ListItemText
                        primary={pod.name}
                        secondary={pod.description}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">No PODs assigned to this area</Typography>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" sx={{ mb: 2 }}>Comments</Typography>
              <List>
                {areaComments.map((comment: any) => (
                  <ListItem key={comment.id} alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar>{comment.creator?.name?.[0] || 'U'}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={comment.creator?.name || 'Unknown User'}
                      secondary={
                        <Box>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {comment.content}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(comment.created_at).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewComment(e.target.value)}
                  multiline
                  rows={2}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleAddComment}
                          disabled={!newComment.trim() || newCommentLoading}
                          edge="end"
                        >
                          <SendIcon />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

    </Box>
  )
}