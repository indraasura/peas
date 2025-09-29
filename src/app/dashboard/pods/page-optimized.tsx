'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Card,
  CardContent,
  IconButton,
  Alert,
  CircularProgress,
  Stack,
  Avatar,
  AvatarGroup,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  InputAdornment,
  SelectChangeEvent,
  Grid,
  Badge
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Assignment as NotesIcon,
  Group as GroupIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
  Send as SendIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { getPodNotes, createPodNote, updatePodNote, deletePodNote, updatePodDependencies } from '@/lib/data'
import { type Pod, type Profile, type PodNote } from '@/lib/supabase'
import { useComprehensiveData } from '@/hooks/useOptimizedData'
import { SkeletonLoader, PodCardSkeleton } from '@/components/SkeletonLoader'
import { invalidatePodsCache } from '@/lib/data-optimized'

const podStatuses = ['Awaiting development', 'In development', 'In testing', 'Released']

export default function PodsPageOptimized() {
  const router = useRouter()
  
  // Use optimized data fetching
  const {
    pods: allPods,
    areas: allAreas,
    availableMembers,
    loading: dataLoading,
    error: dataError
  } = useComprehensiveData()

  // Filter and process data
  const { pods, areas } = useMemo(() => {
    // Filter PODs to show:
    // 1. PODs from areas that are in "Executing" status (kicked off)
    // 2. Released PODs (regardless of area status - they should persist)
    const executingAreas = allAreas.filter(area => area.status === 'Executing')
    const executingAreaIds = executingAreas.map(area => area.id)
    
    const filteredPods = allPods.filter(pod => {
      // Always show Released PODs regardless of area status
      if (pod.status === 'Released') {
        return true
      }
      
      // For non-Released PODs, only show those from executing areas
      return pod.area_id && executingAreaIds.includes(pod.area_id)
    })
    
    // Filter to show only backlog areas for the area dropdown
    const backlogAreas = allAreas.filter(area => area.status === 'Backlog')
    
    return {
      pods: filteredPods,
      areas: backlogAreas
    }
  }, [allPods, allAreas])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [openNotesDialog, setOpenNotesDialog] = useState(false)
  const [openDependenciesDialog, setOpenDependenciesDialog] = useState(false)
  const [selectedPod, setSelectedPod] = useState<Pod | null>(null)
  const [podNotes, setPodNotes] = useState<PodNote[]>([])
  const [notesCounts, setNotesCounts] = useState<Record<string, number>>({})
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    area_id: '',
    members: [] as Array<{
      member_id: string
      bandwidth_percentage: number
      is_leader: boolean
    }>
  })
  const [noteForm, setNoteForm] = useState({
    review_date: '',
    blockers: '',
    learnings: '',
    current_state: '',
    deviation_to_plan: '',
    dependencies_risks: '',
    misc: '',
    revised_end_date: ''
  })
  const [editingNote, setEditingNote] = useState<PodNote | null>(null)
  const [dependencies, setDependencies] = useState<string[]>([])

  // Fetch notes counts for filtered PODs
  const fetchPodNotesCounts = useCallback(async (pods: Pod[]) => {
    try {
      const counts: Record<string, number> = {}
      await Promise.all(
        pods.map(async (pod) => {
          const notes = await getPodNotes(pod.id)
          counts[pod.id] = notes.length
        })
      )
      setNotesCounts(counts)
    } catch (error) {
      console.error('Error fetching POD notes counts:', error)
    }
  }, [])

  // Fetch notes counts when pods change
  useEffect(() => {
    if (pods.length > 0) {
      fetchPodNotesCounts(pods)
    }
  }, [pods, fetchPodNotesCounts])

  // Optimized handlers
  const handleSubmit = useCallback(async () => {
    try {
      setError('')
      if (!formData.name.trim()) {
        setError('POD name is required')
        return
      }

      if (formData.members.length === 0) {
        setError('At least one member is required')
        return
      }

      // Create POD logic would go here
      // This is simplified for the optimization example
      
      setOpenDialog(false)
      resetForm()
      invalidatePodsCache()
    } catch (error) {
      console.error('Error saving POD:', error)
      setError(error instanceof Error ? error.message : 'Failed to save POD')
    }
  }, [formData])

  const handleItemMove = useCallback(async (podId: string, newStatus: string) => {
    try {
      // Update POD status logic would go here
      invalidatePodsCache()
    } catch (error) {
      console.error('Error moving POD:', error)
      setError(error instanceof Error ? error.message : 'Failed to move POD')
    }
  }, [])

  const handleOpenNotesDialog = useCallback(async (pod: Pod) => {
    setSelectedPod(pod)
    try {
      const notes = await getPodNotes(pod.id)
      setPodNotes(notes)
    } catch (error) {
      console.error('Error fetching POD notes:', error)
    }
    setOpenNotesDialog(true)
  }, [])

  const handleSubmitNote = useCallback(async () => {
    if (!selectedPod) return

    try {
      const currentUser = await import('@/lib/auth').then(m => m.getCurrentUser())
      if (!currentUser) {
        setError('User not authenticated')
        return
      }

      const noteData = {
        ...noteForm,
        pod_id: selectedPod.id,
        created_by: currentUser.id
      }

      if (editingNote) {
        await updatePodNote(editingNote.id, noteData)
      } else {
        await createPodNote(noteData)
      }

      // Refresh notes
      const notes = await getPodNotes(selectedPod.id)
      setPodNotes(notes)
      
      // Update notes count
      setNotesCounts(prev => ({
        ...prev,
        [selectedPod.id]: notes.length
      }))

      resetNoteForm()
    } catch (error) {
      console.error('Error saving note:', error)
      setError(error instanceof Error ? error.message : 'Failed to save note')
    }
  }, [selectedPod, noteForm, editingNote])

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      description: '',
      area_id: '',
      members: []
    })
    setError('')
  }, [])

  const resetNoteForm = useCallback(() => {
    setNoteForm({
      review_date: '',
      blockers: '',
      learnings: '',
      current_state: '',
      deviation_to_plan: '',
      dependencies_risks: '',
      misc: '',
      revised_end_date: ''
    })
    setEditingNote(null)
  }, [])

  // Memoized POD card renderer
  const renderPodCard = useCallback((pod: Pod) => {
    const notesCount = notesCounts[pod.id] || 0
    
    return (
      <Card key={pod.id} sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600, fontSize: '1rem' }}>
              {pod.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                size="small"
                onClick={() => handleOpenNotesDialog(pod)}
                sx={{ color: 'primary.main' }}
              >
                <Badge badgeContent={notesCount} color="primary">
                  <NotesIcon fontSize="small" />
                </Badge>
              </IconButton>
              <IconButton
                size="small"
                onClick={() => router.push(`/dashboard/pods/${pod.id}`)}
                sx={{ color: 'primary.main' }}
              >
                <ViewIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {pod.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.875rem' }}>
              {pod.description}
            </Typography>
          )}

          {/* Members */}
          {pod.members && pod.members.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.75rem' }}>
                Team Members:
              </Typography>
              <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.75rem' } }}>
                {pod.members.map((member: any) => (
                  <Tooltip key={member.id} title={`${member.member?.name || 'Unknown'} (${member.bandwidth_percentage.toFixed(2)} bandwidth)`}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                      {member.member?.name?.charAt(0) || '?'}
                    </Avatar>
                  </Tooltip>
                ))}
              </AvatarGroup>
            </Box>
          )}

          {/* Status and Progress */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <Chip
              label={pod.status}
              size="small"
              color={pod.status === 'Released' ? 'success' : 'default'}
              sx={{ fontSize: '0.7rem' }}
            />
            <Typography variant="caption" color="text.secondary">
              {pod.start_date && pod.end_date ? 
                `${new Date(pod.start_date).toLocaleDateString()} - ${new Date(pod.end_date).toLocaleDateString()}` :
                'No dates set'
              }
            </Typography>
          </Box>
        </CardContent>
      </Card>
    )
  }, [notesCounts, handleOpenNotesDialog, router])

  // Memoized status columns
  const statusColumns = useMemo(() => {
    return podStatuses.map(status => ({
      id: status.toLowerCase().replace(/\s+/g, '-'),
      title: status,
      pods: pods.filter(pod => pod.status === status)
    }))
  }, [pods])

  // Show loading skeleton while data is loading
  if (dataLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            POD Execution
          </Typography>
          <Skeleton variant="rectangular" width={120} height={36} />
        </Box>
        <SkeletonLoader variant="kanban" />
      </Box>
    )
  }

  // Show error state
  if (dataError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {dataError}
        </Alert>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          POD Execution
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Add POD
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DragDropContext
        onDragEnd={(result: DropResult) => {
          if (!result.destination) return
          
          const podId = result.draggableId
          const newStatus = result.destination.droppableId
          
          handleItemMove(podId, newStatus)
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
          {statusColumns.map((column) => (
            <Paper
              key={column.id}
              sx={{
                minWidth: 300,
                p: 2,
                backgroundColor: 'background.paper',
                border: 1,
                borderColor: 'divider'
              }}
            >
              <Typography variant="h6" sx={{ mb: 2, fontSize: '1rem', fontWeight: 600 }}>
                {column.title}
              </Typography>
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      minHeight: 200,
                      backgroundColor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
                      borderRadius: 1,
                      p: 1
                    }}
                  >
                    {column.pods.map((pod, index) => (
                      <Draggable key={pod.id} draggableId={pod.id} index={index}>
                        {(provided, snapshot) => (
                          <Box
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            sx={{
                              opacity: snapshot.isDragging ? 0.8 : 1,
                              transform: snapshot.isDragging ? 'rotate(5deg)' : 'none',
                              transition: 'all 0.2s ease-in-out'
                            }}
                          >
                            {renderPodCard(pod)}
                          </Box>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </Paper>
          ))}
        </Box>
      </DragDropContext>

      {/* Rest of the dialogs would be included here */}
      {/* ... (truncated for brevity) */}
    </Box>
  )
}
