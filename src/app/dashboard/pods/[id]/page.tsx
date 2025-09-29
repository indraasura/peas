'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Grid,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Stack
} from '@mui/material'
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
  Assessment as AssessmentIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Delete as DeleteIcon
} from '@mui/icons-material'
import { getPods, getPodNotes, createPodNote, updatePodNote, deletePodNote } from '@/lib/data'
import { getCurrentUser } from '@/lib/auth'
import { type Pod, type PodNote } from '@/lib/supabase'

export default function PodViewPage() {
  const params = useParams()
  const router = useRouter()
  const [pod, setPod] = useState<Pod | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<PodNote[]>([])
  const [openNoteDialog, setOpenNoteDialog] = useState(false)
  const [openViewDialog, setOpenViewDialog] = useState(false)
  const [selectedNote, setSelectedNote] = useState<PodNote | null>(null)
  const [editingNote, setEditingNote] = useState<PodNote | null>(null)
  const [noteForm, setNoteForm] = useState({
    review_date: '',
    revised_end_date: '',
    blockers: '',
    learnings: '',
    current_state: '',
    deviation_to_plan: '',
    dependencies_risks: '',
    misc: ''
  })

  useEffect(() => {
    fetchData()
  }, [params.id])

  const fetchData = async () => {
    try {
      const [podsData, currentUser] = await Promise.all([
        getPods(),
        getCurrentUser()
      ])
      
      setUser(currentUser)
      const foundPod = podsData.find(p => p.id === params.id)
      setPod(foundPod || null)
      
      if (foundPod) {
        const notesData = await getPodNotes(foundPod.id)
        setNotes(notesData)
      }
    } catch (error) {
      console.error('Error fetching POD data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async () => {
    try {
      if (!pod || !user) return
      
      if (editingNote) {
        await updatePodNote(editingNote.id, {
          review_date: noteForm.review_date,
          revised_end_date: noteForm.revised_end_date || undefined,
          blockers: noteForm.blockers || undefined,
          learnings: noteForm.learnings || undefined,
          current_state: noteForm.current_state || undefined,
          deviation_to_plan: noteForm.deviation_to_plan || undefined,
          dependencies_risks: noteForm.dependencies_risks || undefined,
          misc: noteForm.misc || undefined,
        })
      } else {
        await createPodNote({
          pod_id: pod.id,
          review_date: noteForm.review_date,
          revised_end_date: noteForm.revised_end_date || undefined,
          blockers: noteForm.blockers || undefined,
          learnings: noteForm.learnings || undefined,
          current_state: noteForm.current_state || undefined,
          deviation_to_plan: noteForm.deviation_to_plan || undefined,
          dependencies_risks: noteForm.dependencies_risks || undefined,
          misc: noteForm.misc || undefined,
          created_by: user.id
        })
      }
      
      setOpenNoteDialog(false)
      setEditingNote(null)
      setNoteForm({
        review_date: '',
        revised_end_date: '',
        blockers: '',
        learnings: '',
        current_state: '',
        deviation_to_plan: '',
        dependencies_risks: '',
        misc: ''
      })
      
      // Refresh notes
      const notesData = await getPodNotes(pod.id)
      setNotes(notesData)
    } catch (error) {
      console.error('Error saving note:', error)
    }
  }

  const handleViewNote = (note: PodNote) => {
    setSelectedNote(note)
    setOpenViewDialog(true)
  }

  const handleEditNote = (note: PodNote) => {
    setEditingNote(note)
    setNoteForm({
      review_date: note.review_date,
      revised_end_date: note.revised_end_date || '',
      blockers: note.blockers || '',
      learnings: note.learnings || '',
      current_state: note.current_state || '',
      deviation_to_plan: note.deviation_to_plan || '',
      dependencies_risks: note.dependencies_risks || '',
      misc: note.misc || ''
    })
    setOpenNoteDialog(true)
  }

  const handleDeleteNote = async (noteId: string) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await deletePodNote(noteId)
        // Refresh notes
        if (pod) {
          const notesData = await getPodNotes(pod.id)
          setNotes(notesData)
        }
      } catch (error) {
        console.error('Error deleting note:', error)
      }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Awaiting development': return 'default'
      case 'In development': return 'primary'
      case 'In testing': return 'warning'
      case 'Released': return 'success'
      default: return 'default'
    }
  }

  if (loading) {
    return <Typography>Loading...</Typography>
  }

  if (!pod) {
    return (
      <Box>
        <Typography variant="h4" color="error">
          POD not found
        </Typography>
        <Button startIcon={<BackIcon />} onClick={() => router.push('/dashboard/pods')}>
          Back to PODs
        </Button>
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => router.push('/dashboard/pods')}>
          <BackIcon />
        </IconButton>
        <Typography variant="h4">{pod.name}</Typography>
        <Chip 
          label={pod.status} 
          color={getStatusColor(pod.status) as any}
          size="small"
        />
      </Box>

      <Grid container spacing={3}>
        {/* POD Details */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                POD Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <BusinessIcon color="primary" />
                    <Typography variant="subtitle2">Area</Typography>
                  </Box>
                  <Typography variant="body1">{pod.area?.name || 'No Area'}</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <ScheduleIcon color="primary" />
                    <Typography variant="subtitle2">Timeline</Typography>
                  </Box>
                  <Typography variant="body1">
                    {pod.start_date ? new Date(pod.start_date).toLocaleDateString() : 'Not set'} - 
                    {pod.end_date ? new Date(pod.end_date).toLocaleDateString() : 'Not set'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Description</Typography>
                  <Typography variant="body1">{pod.description || 'No description provided'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Team Members
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {pod.members && pod.members.length > 0 ? (
                <List>
                  {pod.members.map((member: any) => (
                    <ListItem key={member.id}>
                      <ListItemIcon>
                        <PersonIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${member.member?.name || 'Unknown'} ${member.is_leader ? '(Leader)' : ''}`}
                        secondary={`${member.bandwidth_percentage.toFixed(2)} bandwidth`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">No team members assigned</Typography>
              )}
            </CardContent>
          </Card>

          {/* POD Notes */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  POD Notes & Reviews
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenNoteDialog(true)}
                  sx={{
                    background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                    boxShadow: '0 3px 5px 2px rgba(25, 118, 210, .3)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #1565c0 30%, #1976d2 90%)',
                    }
                  }}
                >
                  Add Note
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {notes.length > 0 ? (
                <Stack spacing={2}>
                  {notes.map((note: any) => (
                    <Paper
                      key={note.id}
                      elevation={2}
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          elevation: 4,
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }
                      }}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Typography variant="h6" color="primary">
                          Review: {formatDate(note.review_date)}
                        </Typography>
                        <Box display="flex" gap={1}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<ViewIcon />}
                            onClick={() => handleViewNote(note)}
                            sx={{
                              borderColor: 'primary.main',
                              color: 'primary.main',
                              '&:hover': {
                                borderColor: 'primary.dark',
                                backgroundColor: 'primary.light',
                                color: 'primary.dark'
                              }
                            }}
                          >
                            View
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => handleEditNote(note)}
                            sx={{
                              borderColor: 'info.main',
                              color: 'info.main',
                              '&:hover': {
                                borderColor: 'info.dark',
                                backgroundColor: 'info.light',
                                color: 'info.dark'
                              }
                            }}
                          >
                            Edit
                          </Button>
                          {user?.team === 'POD committee' && (
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<DeleteIcon />}
                              onClick={() => handleDeleteNote(note.id)}
                              sx={{
                                borderColor: 'error.main',
                                color: 'error.main',
                                '&:hover': {
                                  borderColor: 'error.dark',
                                  backgroundColor: 'error.light',
                                  color: 'error.dark'
                                }
                              }}
                            >
                              Delete
                            </Button>
                          )}
                        </Box>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Created by {note.creator?.name || 'Unknown'} • {formatDate(note.created_at)}
                      </Typography>

                      {/* Show only a summary of key fields */}
                      <Box sx={{ mb: 2 }}>
                        {note.current_state && (
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Current State:</strong> {note.current_state.length > 80 
                              ? `${note.current_state.substring(0, 80)}...` 
                              : note.current_state}
                          </Typography>
                        )}
                        {note.blockers && (
                          <Typography variant="body2" sx={{ mb: 1, color: 'error.main' }}>
                            <strong>Blockers:</strong> {note.blockers.length > 80 
                              ? `${note.blockers.substring(0, 80)}...` 
                              : note.blockers}
                          </Typography>
                        )}
                        {note.learnings && (
                          <Typography variant="body2" sx={{ mb: 1, color: 'success.main' }}>
                            <strong>Learnings:</strong> {note.learnings.length > 80 
                              ? `${note.learnings.substring(0, 80)}...` 
                              : note.learnings}
                          </Typography>
                        )}
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Box 
                  textAlign="center" 
                  py={4}
                  sx={{
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 2,
                    bgcolor: 'action.hover'
                  }}
                >
                  <AssessmentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No Review Notes Yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Start documenting your POD's progress and insights
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenNoteDialog(true)}
                    sx={{
                      background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                      boxShadow: '0 3px 5px 2px rgba(25, 118, 210, .3)',
                    }}
                  >
                    Add First Note
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box display="flex" flexDirection="column" gap={1}>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => router.push(`/dashboard/pods?edit=${pod.id}`)}
                >
                  Edit POD
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setOpenNoteDialog(true)}
                >
                  Add Review Note
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                POD Statistics
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Team Size</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {pod.members?.length || 0}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Total Bandwidth</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {(pod.members?.reduce((sum: number, member: any) => sum + member.bandwidth_percentage, 0) || 0).toFixed(2)}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Notes Count</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {notes.length}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add Note Dialog */}
      <Dialog open={openNoteDialog} onClose={() => setOpenNoteDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingNote ? 'Edit POD Review Note' : 'Add POD Review Note'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Review Date"
                type="date"
                value={noteForm.review_date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNoteForm({ ...noteForm, review_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Revised End Date (Optional)"
                type="date"
                value={noteForm.revised_end_date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNoteForm({ ...noteForm, revised_end_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                helperText="If the POD end date needs to be revised"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Current State"
                multiline
                rows={3}
                value={noteForm.current_state}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNoteForm({ ...noteForm, current_state: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Blockers"
                multiline
                rows={2}
                value={noteForm.blockers}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNoteForm({ ...noteForm, blockers: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Learnings"
                multiline
                rows={2}
                value={noteForm.learnings}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNoteForm({ ...noteForm, learnings: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Deviation to Plan"
                multiline
                rows={2}
                value={noteForm.deviation_to_plan}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNoteForm({ ...noteForm, deviation_to_plan: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dependencies & Risks"
                multiline
                rows={2}
                value={noteForm.dependencies_risks}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNoteForm({ ...noteForm, dependencies_risks: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Miscellaneous Notes"
                multiline
                rows={2}
                value={noteForm.misc}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNoteForm({ ...noteForm, misc: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenNoteDialog(false)
            setEditingNote(null)
            setNoteForm({
              review_date: '',
              revised_end_date: '',
              blockers: '',
              learnings: '',
              current_state: '',
              deviation_to_plan: '',
              dependencies_risks: '',
              misc: ''
            })
          }}>Cancel</Button>
          <Button onClick={handleAddNote} variant="contained">
            {editingNote ? 'Update Note' : 'Add Note'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Note Details Dialog */}
      <Dialog 
        open={openViewDialog} 
        onClose={() => setOpenViewDialog(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1
        }}>
          <Box>
            <Typography variant="h5" component="div">
              Review Note Details
            </Typography>
            {selectedNote && (
              <Typography variant="subtitle1" color="text.secondary">
                {formatDate(selectedNote.review_date)} • Created by {selectedNote.creator?.name || 'Unknown'}
              </Typography>
            )}
          </Box>
          <IconButton onClick={() => setOpenViewDialog(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedNote && (
            <Grid container spacing={3}>
              {selectedNote.current_state && (
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, height: '100%', border: '1px solid', borderColor: 'primary.main' }}>
                    <Typography variant="h6" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssessmentIcon />
                      Current State
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedNote.current_state}
                    </Typography>
                  </Paper>
                </Grid>
              )}
              
              {selectedNote.blockers && (
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, height: '100%', border: '1px solid', borderColor: 'error.main' }}>
                    <Typography variant="h6" color="error.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssessmentIcon />
                      Blockers
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedNote.blockers}
                    </Typography>
                  </Paper>
                </Grid>
              )}
              
              {selectedNote.learnings && (
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, height: '100%', border: '1px solid', borderColor: 'success.main' }}>
                    <Typography variant="h6" color="success.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssessmentIcon />
                      Learnings
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedNote.learnings}
                    </Typography>
                  </Paper>
                </Grid>
              )}
              
              {selectedNote.deviation_to_plan && (
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, height: '100%', border: '1px solid', borderColor: 'warning.main' }}>
                    <Typography variant="h6" color="warning.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssessmentIcon />
                      Deviation to Plan
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedNote.deviation_to_plan}
                    </Typography>
                  </Paper>
                </Grid>
              )}
              
              {selectedNote.dependencies_risks && (
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, height: '100%', border: '1px solid', borderColor: 'info.main' }}>
                    <Typography variant="h6" color="info.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssessmentIcon />
                      Dependencies & Risks
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedNote.dependencies_risks}
                    </Typography>
                  </Paper>
                </Grid>
              )}
              
              {selectedNote.misc && (
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, height: '100%', border: '1px solid', borderColor: 'grey.500' }}>
                    <Typography variant="h6" color="text.primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssessmentIcon />
                      Miscellaneous Notes
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedNote.misc}
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={() => setOpenViewDialog(false)} 
            variant="contained"
            sx={{
              background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
              boxShadow: '0 3px 5px 2px rgba(25, 118, 210, .3)',
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
