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
  InputAdornment
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
  Upload as UploadIcon,
  Download as DownloadIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material'
import { getAreas, createArea, updateArea, deleteArea, getMembers, updateAreaDecisionQuorum, getAreaComments, createAreaComment, getPods } from '@/lib/data'
import { type Area, type Profile, type Pod } from '@/lib/supabase'
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
  const [openMoveDialog, setOpenMoveDialog] = useState(false)
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false)
  const [editingArea, setEditingArea] = useState<Area | null>(null)
  const [selectedArea, setSelectedArea] = useState<Area | null>(null)
  const [areaComments, setAreaComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [newCommentLoading, setNewCommentLoading] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
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
  const [moveValidation, setMoveValidation] = useState({
    onePagerRequired: false,
    podsRequired: false,
    message: ''
  })

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
      const { decision_quorum, ...areaData } = formData
      
      if (editingArea) {
        await updateArea(editingArea.id, areaData)
        await updateAreaDecisionQuorum(editingArea.id, decision_quorum)
      } else {
        const newArea = await createArea({ ...areaData, status: 'backlog' })
        await updateAreaDecisionQuorum(newArea.id, decision_quorum)
      }
      
      setOpenDialog(false)
      setEditingArea(null)
      setFormData({
        name: '',
        description: '',
        revenue_impact: 'Low',
        business_enablement: 'Low',
        efforts: 'Low',
        end_user_impact: 'Low',
        decision_quorum: []
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

    const area = areas.find(a => a.id === draggableId)
    if (!area) return

    // Validate move from backlog to planned
    if (source.droppableId === 'backlog' && destination.droppableId === 'planned') {
      const areaPods = pods.filter(pod => pod.area_id === area.id)
      const hasOnePager = area.one_pager_url
      const hasPods = areaPods.length > 0

      if (!hasOnePager || !hasPods) {
        setMoveValidation({
          onePagerRequired: !hasOnePager,
          podsRequired: !hasPods,
          message: `Cannot move to planned: ${!hasOnePager ? 'One-pager required' : ''}${!hasOnePager && !hasPods ? ' and ' : ''}${!hasPods ? 'At least one POD required' : ''}`
        })
        setOpenMoveDialog(true)
        return
      }
    }

    try {
      const newStatus = destination.droppableId === 'planned' ? 'planned' : 'backlog'
      await updateArea(area.id, { status: newStatus })
      
      // Update local state
      setAreas(prev => prev.map(a => 
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
      revenue_impact: 'Low',
      business_enablement: 'Low',
      efforts: 'Low',
      end_user_impact: 'Low',
      decision_quorum: []
    })
    setOpenDialog(true)
  }

  const handleEditArea = (area: Area) => {
    setEditingArea(area)
    setFormData({
      name: area.name,
      description: area.description || '',
      revenue_impact: area.revenue_impact,
      business_enablement: area.business_enablement,
      efforts: area.efforts,
      end_user_impact: area.end_user_impact,
      decision_quorum: area.decision_quorum?.map(q => q.id) || []
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

  const handleFileUpload = async (event: any, area: Area) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type (PDF only)
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file only')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    try {
      setUploadingFile(true)
      setError('')

      // In a real implementation, you would upload to a storage service like Supabase Storage
      // For now, we'll simulate the upload and store a mock URL
      const mockUrl = `https://storage.example.com/one-pagers/${area.id}/${file.name}`
      
      await updateArea(area.id, { one_pager_url: mockUrl })
      
      // Update local state
      setAreas(prev => prev.map(a => 
        a.id === area.id ? { ...a, one_pager_url: mockUrl } : a
      ))

      // Show success message
      setError('') // Clear any previous errors
      alert('One-pager uploaded successfully!')
    } catch (error) {
      console.error('Error uploading file:', error)
      setError('Failed to upload file. Please try again.')
    } finally {
      setUploadingFile(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedArea) return

    try {
      setNewCommentLoading(true)
      // For now, using a placeholder user ID - in real app, get from auth context
      const userId = 'placeholder-user-id'
      await createAreaComment({
        area_id: selectedArea.id,
        content: newComment.trim(),
        created_by: userId
      })
      
      const comments = await getAreaComments(selectedArea.id)
      setAreaComments(comments)
      setNewComment('')
    } catch (error) {
      console.error('Error adding comment:', error)
      setError('Failed to add comment. Please try again.')
    } finally {
      setNewCommentLoading(false)
    }
  }

  const getImpactColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high': return '#f44336'
      case 'medium': return '#ff9800'
      case 'low': return '#4caf50'
      default: return '#9e9e9e'
    }
  }

  const renderAreaCard = (area: Area) => {
    const areaPods = pods.filter(pod => pod.area_id === area.id)
    
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

        {/* Impact Values */}
        <Grid container spacing={1} sx={{ mb: 2 }}>
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
        </Grid>

        {/* Associated PODs */}
        {areaPods.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <GroupIcon sx={{ fontSize: 14 }} />
              Associated PODs ({areaPods.length})
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              {areaPods.slice(0, 3).map(pod => (
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
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
          
          {/* Upload button */}
          <Box>
            <input
              accept=".pdf"
              style={{ display: 'none' }}
              id={`upload-${area.id}`}
              type="file"
              onChange={(e) => handleFileUpload(e, area)}
              disabled={uploadingFile}
            />
            <label htmlFor={`upload-${area.id}`}>
              <IconButton
                size="small"
                component="span"
                disabled={uploadingFile}
                sx={{ 
                  p: 0.5,
                  color: area.one_pager_url ? '#4caf50' : '#1976d2'
                }}
              >
                {uploadingFile ? (
                  <CloudUploadIcon sx={{ fontSize: 16 }} />
                ) : area.one_pager_url ? (
                  <DownloadIcon sx={{ fontSize: 16 }} />
                ) : (
                  <UploadIcon sx={{ fontSize: 16 }} />
                )}
              </IconButton>
            </label>
          </Box>
        </Box>

        {/* Comments count */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CommentIcon sx={{ fontSize: 14 }} />
          <Typography variant="caption" color="text.secondary">
            {area.comments?.length || 0} comments
          </Typography>
        </Box>
        </Box>
      )
  }

  const backlogAreas = areas.filter(area => area.status === 'backlog')
  const plannedAreas = areas.filter(area => area.status === 'planned')

  const columns = [
    {
      id: 'backlog',
      title: 'Backlog',
      items: backlogAreas,
      color: '#ff9800'
    },
    {
      id: 'planned',
      title: 'Planned',
      items: plannedAreas,
      color: '#4caf50'
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
        onItemView={handleViewAreaDetails}
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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Revenue Impact</InputLabel>
                <Select
                  value={formData.revenue_impact}
                  onChange={(e) => setFormData({ ...formData, revenue_impact: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, business_enablement: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, efforts: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, end_user_impact: e.target.value })}
                  label="End User Impact"
                >
                  {impactLevels.map((level) => (
                    <MenuItem key={level} value={level}>{level}</MenuItem>
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
                >
                  {podCommitteeMembers.map((member) => (
                    <MenuItem key={member.id} value={member.id}>{member.name}</MenuItem>
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
      <Dialog open={openCommentsDialog} onClose={() => setOpenCommentsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Comments for {selectedArea?.name}
        </DialogTitle>
        <DialogContent>
          <List>
            {areaComments.map((comment) => (
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
              onChange={(e) => setNewComment(e.target.value)}
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
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Chip 
                    label={selectedArea.status} 
                    sx={{ 
                      backgroundColor: selectedArea.status === 'planned' ? '#4caf50' : '#ff9800', 
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
              {pods.filter(pod => pod.area_id === selectedArea.id).length > 0 ? (
                <List>
                  {pods.filter(pod => pod.area_id === selectedArea.id).map((pod) => (
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
                {areaComments.map((comment) => (
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
                  onChange={(e: any) => setNewComment(e.target.value)}
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

      {/* Move Validation Dialog */}
      <Dialog open={openMoveDialog} onClose={() => setOpenMoveDialog(false)}>
        <DialogTitle>Cannot Move to Planned</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {moveValidation.message}
          </Alert>
          <Typography variant="body2">
            To move an area from backlog to planned, you need:
          </Typography>
          <ul>
            <li>Upload a one-pager document</li>
            <li>Assign at least one POD to the area</li>
          </ul>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMoveDialog(false)}>OK</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}