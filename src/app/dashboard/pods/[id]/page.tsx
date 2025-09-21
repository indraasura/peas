'use client'

import { useState, useEffect } from 'react'
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
  Alert
} from '@mui/material'
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material'
import { getPods, getPodNotes, createPodNote } from '@/lib/data'
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
  const [noteForm, setNoteForm] = useState({
    review_date: '',
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
      
      await createPodNote({
        pod_id: pod.id,
        review_date: noteForm.review_date,
        blockers: noteForm.blockers || undefined,
        learnings: noteForm.learnings || undefined,
        current_state: noteForm.current_state || undefined,
        deviation_to_plan: noteForm.deviation_to_plan || undefined,
        dependencies_risks: noteForm.dependencies_risks || undefined,
        misc: noteForm.misc || undefined,
        created_by: user.id
      })
      
      setOpenNoteDialog(false)
      setNoteForm({
        review_date: '',
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
      console.error('Error adding note:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'backlog': return 'default'
      case 'planning': return 'info'
      case 'in development': return 'primary'
      case 'testing': return 'warning'
      case 'ready for release': return 'secondary'
      case 'released': return 'success'
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
                  {pod.members.map((member) => (
                    <ListItem key={member.id}>
                      <ListItemIcon>
                        <PersonIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${member.member?.name || 'Unknown'} ${member.is_leader ? '(Leader)' : ''}`}
                        secondary={`${member.bandwidth_percentage}% bandwidth`}
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
                >
                  Add Note
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {notes.length > 0 ? (
                <List>
                  {notes.map((note) => (
                    <ListItem key={note.id}>
                      <ListItemText
                        primary={`Review Date: ${new Date(note.review_date).toLocaleDateString()}`}
                        secondary={
                          <Box>
                            {note.current_state && (
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                <strong>Current State:</strong> {note.current_state}
                              </Typography>
                            )}
                            {note.blockers && (
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                <strong>Blockers:</strong> {note.blockers}
                              </Typography>
                            )}
                            {note.learnings && (
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                <strong>Learnings:</strong> {note.learnings}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">No notes added yet</Typography>
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
                  {pod.members?.reduce((sum, member) => sum + member.bandwidth_percentage, 0) || 0}%
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
        <DialogTitle>Add POD Review Note</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Review Date"
                type="date"
                value={noteForm.review_date}
                onChange={(e) => setNoteForm({ ...noteForm, review_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Current State"
                multiline
                rows={3}
                value={noteForm.current_state}
                onChange={(e) => setNoteForm({ ...noteForm, current_state: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Blockers"
                multiline
                rows={2}
                value={noteForm.blockers}
                onChange={(e) => setNoteForm({ ...noteForm, blockers: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Learnings"
                multiline
                rows={2}
                value={noteForm.learnings}
                onChange={(e) => setNoteForm({ ...noteForm, learnings: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Deviation to Plan"
                multiline
                rows={2}
                value={noteForm.deviation_to_plan}
                onChange={(e) => setNoteForm({ ...noteForm, deviation_to_plan: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dependencies & Risks"
                multiline
                rows={2}
                value={noteForm.dependencies_risks}
                onChange={(e) => setNoteForm({ ...noteForm, dependencies_risks: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Miscellaneous Notes"
                multiline
                rows={2}
                value={noteForm.misc}
                onChange={(e) => setNoteForm({ ...noteForm, misc: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNoteDialog(false)}>Cancel</Button>
          <Button onClick={handleAddNote} variant="contained">
            Add Note
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
