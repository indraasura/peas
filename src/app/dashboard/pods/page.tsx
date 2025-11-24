'use client'

export const dynamic = 'force-dynamic'

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
  Badge,
  Stack,
  SelectChangeEvent
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
  Comment as CommentIcon,
  Close as CloseIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { getPods, createPod, updatePod, deletePod, getAreas, getAvailableMembers, updatePodMembers, updatePodDependencies, getPodDependencies, getPodNotes, createPodNote, updatePodNote, deletePodNote, checkAndUpdateAreaStatus } from '@/lib/data'
import { getCurrentUser } from '@/lib/auth'
import { type Pod, type Area, type Profile, type PodNote } from '@/lib/supabase'
import { calculatePodRiskLevel, getRiskInfo, getLatestRevisedEndDate, type RiskLevel } from '@/lib/risk-utils'
import KanbanBoard from '@/components/KanbanBoard'
import AIDrawer from '@/components/AIDrawer'
import AnimatedAIButton from '@/components/AnimatedAIButton'
import { DropResult } from '@hello-pangea/dnd'

const executionStatuses = ['Awaiting development', 'In development', 'In testing', 'Released to specific customers', 'Released']
const planningStatuses = ['Backlog', 'Planned', 'In Progress', 'Released to specific customers', 'Done']

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
  const [podNotesCounts, setPodNotesCounts] = useState<Record<string, number>>({})
  const [podRiskLevels, setPodRiskLevels] = useState<Record<string, RiskLevel>>({})
  const [podRevisedDates, setPodRevisedDates] = useState<Record<string, string>>({})
  const [openViewDialog, setOpenViewDialog] = useState(false)
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState<PodNote | null>(null)
  const [editingNote, setEditingNote] = useState<PodNote | null>(null)
  const [newNote, setNewNote] = useState({
    review_date: '',
    revised_end_date: '',
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
    status: 'Awaiting development' as 'Awaiting development' | 'In development' | 'In testing' | 'Released to specific customers' | 'Released',
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
    
    // Set up interval to refresh data every 30 seconds to catch area status changes
    const interval = setInterval(fetchData, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [podsData, allAreasData, membersData] = await Promise.all([
        getPods(),
        getAreas(),
        getAvailableMembers()
      ])
      
      // Filter PODs to show:
      // 1. PODs from areas that are in "Executing" status (kicked off)
      // 2. Released and Released to specific customers PODs (regardless of area status - they should persist)
      const executingAreas = allAreasData.filter(area => area.status === 'Executing')
      const executingAreaIds = executingAreas.map(area => area.id)
      
      const filteredPods = podsData.filter(pod => {
        // Always show Released and Released to specific customers PODs regardless of area status
        if (pod.status === 'Released' || pod.status === 'Released to specific customers') {
          return true
        }
        
        // For non-Released PODs, only show those from executing areas
        return pod.area_id && executingAreaIds.includes(pod.area_id)
      })
      
      setPods(filteredPods)
      // Filter to show only backlog areas for the area dropdown
      setAreas(allAreasData.filter(area => area.status === 'Backlog'))
      setAvailableMembers(membersData)
      
      // Fetch notes counts for filtered PODs
      await fetchPodNotesCounts(filteredPods)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPodNotesCounts = async (pods: Pod[]) => {
    try {
      const counts: Record<string, number> = {}
      const riskLevels: Record<string, RiskLevel> = {}
      const revisedDates: Record<string, string> = {}
      
      await Promise.all(
        pods.map(async (pod) => {
          const notes = await getPodNotes(pod.id)
          counts[pod.id] = notes.length
          riskLevels[pod.id] = calculatePodRiskLevel(notes)
          const latestRevisedDate = getLatestRevisedEndDate(notes)
          if (latestRevisedDate) {
            revisedDates[pod.id] = latestRevisedDate
          }
        })
      )
      setPodNotesCounts(counts)
      setPodRiskLevels(riskLevels)
      setPodRevisedDates(revisedDates)
    } catch (error) {
      console.error('Error fetching pod notes counts:', error)
    }
  }

  const handleSubmit = async () => {
    try {
      setError('')
      const { members, dependencies, status, ...podData } = formData

      // Validate required fields
      if (!podData.name.trim()) {
        setError('POD name is required')
        return
      }
      if (!podData.area_id) {
        setError('Area selection is required')
        return
      }

      if (editingPod) {
        await updatePod(editingPod.id, { ...podData, status })
        await updatePodMembers(editingPod.id, members)
        await updatePodDependencies(editingPod.id, dependencies)
      } else {
        const newPod: Pod = await createPod(podData)
        await updatePodMembers(newPod.id, members)
        await updatePodDependencies(newPod.id, dependencies)
      }

      setOpenDialog(false)
      setEditingPod(null)
      setFormData({
        name: '',
        description: '',
        area_id: '',
        status: 'Awaiting development',
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
    const { source, destination, draggableId } = result;
    
    // Check if the drop is valid
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    // Find the pod being moved
    const pod = pods.find((p: Pod) => p.id === draggableId);
    if (!pod) return;

    try {
      // Determine the new status based on the destination
      const newStatus = destination.droppableId as 'Awaiting development' | 'In development' | 'In testing' | 'Released to specific customers' | 'Released';
      
      // Update the pod's status in the database
      await updatePod(pod.id, { status: newStatus });
      
      // Update local state to reflect the change
      setPods((prevPods: Pod[]) => 
        prevPods.map((p: Pod) => 
          p.id === pod.id ? { ...p, status: newStatus } : p
        )
      );

      // If the pod was moved to 'Released to specific customers' or 'Released', check area completion
      if ((newStatus === 'Released' || newStatus === 'Released to specific customers') && pod.area_id) {
        try {
          // Check and update the area status
          await checkAndUpdateAreaStatus(pod.area_id);
          
          // If moving to 'Released to specific customers', update all pods in the same area
          if (newStatus === 'Released to specific customers') {
            const areaPods = pods.filter(p => p.area_id === pod.area_id && p.id !== pod.id);
            await Promise.all(
              areaPods.map(async (areaPod) => {
                await updatePod(areaPod.id, { status: 'Released to specific customers' });
              })
            );
            
            // Update local state for all pods in the area
            setPods((prevPods: Pod[]) => 
              prevPods.map((p: Pod) => 
                p.area_id === pod.area_id ? { ...p, status: 'Released to specific customers' } : p
              )
            );
          }
          
          // Refresh the data to ensure everything is in sync
          await fetchData();
        } catch (error) {
          console.error('Error updating area status:', error);
          // Don't show error to user as this is a background operation
        }
      }
    } catch (error) {
      console.error('Error moving pod:', error);
      setError('Failed to move pod. Please try again.');
    }
  };

  const handleAddPod = () => {
    setEditingPod(null)
    setFormData({
      name: '',
      description: '',
      area_id: '',
      status: 'Awaiting development' as 'Awaiting development' | 'In development' | 'In testing' | 'Released',
      start_date: '',
      end_date: '',
      members: [],
      dependencies: []
    })
    setOpenDialog(true)
  }

  const handleEditPod = (pod: Pod) => {
    console.log('Editing pod:', pod)
    console.log('Pod members:', pod.members)
    setEditingPod(pod)
    setFormData({
      name: pod.name,
      description: pod.description || '',
      area_id: pod.area_id || '',
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
      revised_end_date: '',
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
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        setError('Please log in to add review notes')
        return
      }
      
      if (editingNote) {
        // Update existing note
        await updatePodNote(editingNote.id, {
          review_date: newNote.review_date,
          revised_end_date: newNote.revised_end_date || undefined,
          blockers: newNote.blockers || undefined,
          learnings: newNote.learnings || undefined,
          current_state: newNote.current_state || undefined,
          deviation_to_plan: newNote.deviation_to_plan || undefined,
          dependencies_risks: newNote.dependencies_risks || undefined,
          misc: newNote.misc || undefined,
        })
      } else {
        // Create new note
        await createPodNote({
          pod_id: selectedPod.id,
          review_date: newNote.review_date,
          revised_end_date: newNote.revised_end_date || undefined,
          blockers: newNote.blockers || undefined,
          learnings: newNote.learnings || undefined,
          current_state: newNote.current_state || undefined,
          deviation_to_plan: newNote.deviation_to_plan || undefined,
          dependencies_risks: newNote.dependencies_risks || undefined,
          misc: newNote.misc || undefined,
          created_by: currentUser.id
        })
      }

      // Refresh notes
      const notes = await getPodNotes(selectedPod.id)
      setPodNotes(notes)
      
      // Update notes count, risk levels, and revised dates
      const updatedRiskLevel = calculatePodRiskLevel(notes)
      const latestRevisedDate = getLatestRevisedEndDate(notes)
      
      setPodNotesCounts(prev => ({
        ...prev,
        [selectedPod.id]: notes.length
      }))
      
      setPodRiskLevels(prev => ({
        ...prev,
        [selectedPod.id]: updatedRiskLevel
      }))
      
      if (latestRevisedDate) {
        setPodRevisedDates(prev => ({
          ...prev,
          [selectedPod.id]: latestRevisedDate
        }))
      } else {
        setPodRevisedDates(prev => {
          const updated = { ...prev }
          delete updated[selectedPod.id]
          return updated
        })
      }
      
      // Refresh all data to ensure areas page shows updated revised dates
      await fetchData()
      
      setOpenNotesDialog(false)
      setEditingNote(null)
      setNewNote({
        review_date: '',
        revised_end_date: '',
        blockers: '',
        learnings: '',
        current_state: '',
        deviation_to_plan: '',
        dependencies_risks: '',
        misc: ''
      })
    } catch (error) {
      console.error('Error saving review note:', error)
      setError('Failed to save review note. Please try again.')
    } finally {
      setAddingNote(false)
    }
  }

  const handleViewNote = (note: PodNote) => {
    setSelectedNote(note)
    setOpenViewDialog(true)
  }

  const handleEditNote = (note: PodNote) => {
    setEditingNote(note)
    setNewNote({
      review_date: note.review_date,
      revised_end_date: note.revised_end_date || '',
      blockers: note.blockers || '',
      learnings: note.learnings || '',
      current_state: note.current_state || '',
      deviation_to_plan: note.deviation_to_plan || '',
      dependencies_risks: note.dependencies_risks || '',
      misc: note.misc || ''
    })
    setOpenNotesDialog(true)
  }

  const handleDeleteNote = async (noteId: string) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await deletePodNote(noteId)
        // Refresh notes
        if (selectedPod) {
          const notes = await getPodNotes(selectedPod.id)
          setPodNotes(notes)
          
          // Update notes count, risk levels, and revised dates
          const updatedRiskLevel = calculatePodRiskLevel(notes)
          const latestRevisedDate = getLatestRevisedEndDate(notes)
          
          setPodNotesCounts(prev => ({
            ...prev,
            [selectedPod.id]: notes.length
          }))
          
          setPodRiskLevels(prev => ({
            ...prev,
            [selectedPod.id]: updatedRiskLevel
          }))
          
          if (latestRevisedDate) {
            setPodRevisedDates(prev => ({
              ...prev,
              [selectedPod.id]: latestRevisedDate
            }))
          } else {
            setPodRevisedDates(prev => {
              const updated = { ...prev }
              delete updated[selectedPod.id]
              return updated
            })
          }
          
          // Refresh all data to ensure areas page shows updated revised dates
          await fetchData()
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
      case 'Awaiting development': return '#9e9e9e'
      case 'In development': return '#ff9800'
      case 'In testing': return '#9c27b0'
      case 'Released to specific customers': return '#2196f3'
      case 'Released': return '#4caf50'
      default: return '#9e9e9e'
    }
  }

  const renderPodCard = (pod: Pod) => {
    const leader = pod.members?.find(m => m.is_leader)
    const memberCount = pod.members?.length || 0
    const riskLevel = podRiskLevels[pod.id] || 'on-track'
    const riskInfo = getRiskInfo(riskLevel)
    const latestRevisedDate = podRevisedDates[pod.id]
    
    return (
        <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {pod.name}
          </Typography>
          <Chip
            label={riskInfo.label}
            size="small"
            sx={{
              backgroundColor: riskInfo.color,
              color: 'white',
              fontWeight: 600,
              fontSize: '0.7rem'
            }}
          />
        </Box>
        
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
                  label={`${member.member?.name || 'Unknown'} (${member.bandwidth_percentage.toFixed(2)})`}
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

        {/* Revised End Date */}
        {latestRevisedDate && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="warning.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
              <ScheduleIcon sx={{ fontSize: 14 }} />
              Revised End: {new Date(latestRevisedDate).toLocaleDateString()}
            </Typography>
          </Box>
        )}

        {/* Notes count */}
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
          onClick={() => handleViewPodDetails(pod)}
        >
          <CommentIcon sx={{ fontSize: 14 }} />
          <Typography variant="caption" color="text.secondary">
            {podNotesCounts[pod.id] || 0} review notes
          </Typography>
        </Box>
        </Box>
      )
    }

  // Group pods by status for execution view
  const podsByStatus = executionStatuses.map((status: string) => ({
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1" sx={{ 
          fontWeight: 700, 
          color: '#0F172A',
          fontSize: '28px'
        }}>
          Execution
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          {/* <AnimatedAIButton onClick={() => setAiDrawerOpen(true)} /> */}
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
            disabled={loading}
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
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {pods.length === 0 && !loading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No PODs are currently visible in the Execution section. PODs will only appear here when their associated area has been kicked off (moved to "Executing" status) in the Planning section, or if they are in "Released" or "Released to specific customers" status.
        </Alert>
      )}

      <KanbanBoard
        columns={podsByStatus}
        onItemMove={handleItemMove}
        onItemEdit={handleEditPod}
        onItemDelete={handleDeletePod}
        onItemView={handleViewPodDetails}
        renderItem={renderPodCard}
        showActionButtons={false}
      />

      {/* Planning Section */}
      <Box mt={6}>
        <Typography variant="h4" component="h1" sx={{ 
          fontWeight: 700, 
          color: '#0F172A',
          fontSize: '28px',
          mb: 4
        }}>
          Planning
        </Typography>
        
        {pods.length === 0 && !loading ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            No PODs are currently visible in the Planning section. PODs will appear here when they are created.
          </Alert>
        ) : (
          <KanbanBoard
            columns={planningStatuses.map((status: string) => ({
              id: status,
              title: status,
              items: pods.filter((pod: Pod) => pod.status === status),
              color: getStatusColor(status)
            }))}
            onItemMove={handleItemMove}
            onItemEdit={handleEditPod}
            onItemDelete={handleDeletePod}
            onItemView={handleViewPodDetails}
            renderItem={renderPodCard}
            showActionButtons={false}
          />
        )}
      </Box>

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
                <Stack spacing={2}>
                  {podNotes.map((note: PodNote) => (
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
                    onClick={handleAddReviewNote}
                    sx={{
                      background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                      boxShadow: '0 3px 5px 2px rgba(25, 118, 210, .3)',
                    }}
                  >
                    Add First Note
                  </Button>
                </Box>
              )}

<Typography variant="h6" sx={{ mb: 2 }}>Team Members</Typography>
              <List>
                {selectedPod.members?.map((member: any) => (
                  <ListItem key={member.id}>
                    <ListItemAvatar>
                      <Avatar>{member.member?.name?.[0] || 'U'}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${member.member?.name || 'Unknown'} ${member.is_leader ? '(Leader)' : ''}`}
                      secondary={`${member.member?.team || 'Unknown Team'} • ${member.bandwidth_percentage.toFixed(2)} bandwidth`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Review Note Dialog */}
      <Dialog open={openNotesDialog} onClose={() => {
        setOpenNotesDialog(false)
        setEditingNote(null)
        setNewNote({
          review_date: '',
          revised_end_date: '',
          blockers: '',
          learnings: '',
          current_state: '',
          deviation_to_plan: '',
          dependencies_risks: '',
          misc: ''
        })
      }} maxWidth="md" fullWidth>
        <DialogTitle>{editingNote ? 'Edit Review Meeting Note' : 'Add Review Meeting Note'}</DialogTitle>
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
                label="Revised End Date (Optional)"
                type="date"
                value={newNote.revised_end_date}
                onChange={(e: any) => setNewNote({ ...newNote, revised_end_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                helperText="If the POD end date needs to be revised based on this review"
              />
            </Grid>
            <Grid item xs={12} md={6}>
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
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Blockers"
                value={newNote.blockers}
                onChange={(e: any) => setNewNote({ ...newNote, blockers: e.target.value })}
                multiline
                rows={3}
                placeholder="List any blockers or impediments..."
              />
            </Grid>
            <Grid item xs={12} md={6}>
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
            <Grid item xs={12} md={6}>
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
            <Grid item xs={12} md={6}>
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
            <Grid item xs={12} md={6}>
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
          <Button onClick={() => {
            setOpenNotesDialog(false)
            setEditingNote(null)
            setNewNote({
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
          <Button 
            onClick={handleSubmitReviewNote} 
            variant="contained"
            disabled={!newNote.review_date || addingNote}
          >
            {addingNote ? (editingNote ? 'Updating...' : 'Adding...') : (editingNote ? 'Update Note' : 'Add Note')}
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

      {/* AI Drawer */}
      <AIDrawer
        open={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        title="POD Execution Analysis"
        contextData={{
          pods: pods,
          podsByStatus: {
            awaiting: pods.filter(pod => pod.status === 'Awaiting development'),
            development: pods.filter(pod => pod.status === 'In development'),
            testing: pods.filter(pod => pod.status === 'In testing'),
            released: pods.filter(pod => pod.status === 'Released')
          },
          areas: areas,
          riskLevels: podRiskLevels,
          revisedDates: podRevisedDates,
          notesCounts: podNotesCounts
        }}
        section="pods"
      />
    </Box>
  )
}