'use client'

export const dynamic = 'force-dynamic'

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
  SelectChangeEvent,
  ToggleButton,
  ToggleButtonGroup
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
  Close as CloseIcon,
  Person as PersonIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  ViewAgenda as ViewAgendaIcon
} from '@mui/icons-material'
import { createArea, updateArea, deleteArea, updateAreaDecisionQuorum, getAreaComments, createAreaComment, updateAreaComment, deleteAreaComment, updatePod, kickOffArea, validateAreaForPlanning, validateAreaForPlanned, checkAndUpdateAreaStatus, createPod, updatePodMembers, verifyPODAssociation, updateAreaStatusAutomatically, getPodNotes } from '@/lib/data'
import { type Area, type Profile, type Pod } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { useComprehensiveData } from '@/hooks/useOptimizedData'
import { SkeletonLoader, AreaCardSkeleton } from '@/components/SkeletonLoader'
import { validatePodCreation } from '@/lib/area-status-utils'
import { calculateAreaRiskLevel, calculatePodRiskLevel, getRiskInfo, type RiskLevel } from '@/lib/risk-utils'
import KanbanBoard from '@/components/KanbanBoard'
import { DropResult } from '@hello-pangea/dnd'

const impactLevels = ['Low', 'Medium', 'High']

export default function AreasPage() {
  // Use optimized data fetching hook
  const {
    areas,
    pods,
    members,
    availableMembers,
    podCommitteeMembers,
    revisedDates: areaRevisedEndDates,
    loading,
    error: dataError,
    refreshAll,
    refreshAreas,
    refreshPods
  } = useComprehensiveData()
  const [user, setUser] = useState<Profile | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [openPodDialog, setOpenPodDialog] = useState(false)
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
    revenue_impact: 'Low',
    business_enablement: 'Low',
    efforts: 'Low',
    end_user_impact: 'Low',
    start_date: '',
    end_date: '',
    decision_quorum: [] as string[],
    one_pager_url: '',
    selected_pods: [] as string[]
  })
  const [podFormData, setPodFormData] = useState({
    name: '',
    members: [] as Array<{
      member_id: string
      bandwidth_percentage: number
      is_leader: boolean
    }>
  })
  const [error, setError] = useState('')
  
  // View mode state with persistence
  const [viewMode, setViewMode] = useState<'compact' | 'cozy' | 'detailed'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('areas-view-mode')
      return (saved as 'compact' | 'cozy' | 'detailed') || 'cozy'
    }
    return 'cozy'
  })
  
  const [validationDialog, setValidationDialog] = useState<{
    open: boolean
    title: string
    message: string
    missingFields: string[]
    area: Area | null
    targetStatus: string
  }>({
    open: false,
    title: '',
    message: '',
    missingFields: [],
    area: null,
    targetStatus: ''
  })
  const [validationFormData, setValidationFormData] = useState({
    one_pager_url: '',
    start_date: '',
    end_date: '',
    revenue_impact: 'Low',
    business_enablement: 'Low',
    efforts: 'Low',
    end_user_impact: 'Low'
  })
  const [pendingMove, setPendingMove] = useState<{
    areaId: string
    targetStatus: string
  } | null>(null)
  const [areaRiskLevels, setAreaRiskLevels] = useState<Record<string, RiskLevel>>({})

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.error('Error loading user:', error)
      }
    }
    loadUser()
  }, [])

  // Calculate area risk levels when areas and pods data changes
  useEffect(() => {
    const calculateRiskLevels = async () => {
      if (!areas.length || !pods.length) return

      const riskLevels: Record<string, RiskLevel> = {}
      
      for (const area of areas) {
        const areaPods = pods.filter((pod: Pod) => pod.area_id === area.id)
        const podRiskLevels: Record<string, RiskLevel> = {}
        
        // Calculate risk level for each POD in this area
        for (const pod of areaPods) {
          try {
            const notes = await getPodNotes(pod.id)
            podRiskLevels[pod.id] = calculatePodRiskLevel(notes)
          } catch (error) {
            console.error(`Error fetching notes for POD ${pod.id}:`, error)
            podRiskLevels[pod.id] = 'on-track'
          }
        }
        
        // Calculate area risk level based on POD risk levels
        riskLevels[area.id] = calculateAreaRiskLevel(areaPods, podRiskLevels)
      }
      
      setAreaRiskLevels(riskLevels)
    }

    calculateRiskLevels()
  }, [areas, pods])

  const handleSubmit = async () => {
    try {
      setError('')
      const { decision_quorum, selected_pods, ...areaData } = formData
      
      // Only name is required for area creation
      if (!areaData.name.trim()) {
        setError('Area name is required')
        return
      }
      
      // Clean up areaData to only include defined values
      const cleanAreaData = {
        name: areaData.name.trim(),
        description: areaData.description?.trim() || undefined,
        revenue_impact: areaData.revenue_impact || undefined,
        business_enablement: areaData.business_enablement || undefined,
        efforts: areaData.efforts || undefined,
        end_user_impact: areaData.end_user_impact || undefined,
        start_date: areaData.start_date?.trim() || '',
        end_date: areaData.end_date?.trim() || '',
        one_pager_url: areaData.one_pager_url?.trim() || undefined,
        status: 'Backlog' as const // Will be automatically updated based on criteria
      }
      
      console.log('Creating area with data:', cleanAreaData)
      
      let areaId: string
      if (editingArea) {
        console.log('Updating existing area with ID:', editingArea.id)
        console.log('Area data to update:', cleanAreaData)
        console.log('Editing area object:', editingArea)
        
        if (!editingArea.id) {
          throw new Error('Area ID is missing')
        }
        
        await updateArea(editingArea.id, cleanAreaData)
        await updateAreaDecisionQuorum(editingArea.id, decision_quorum)
        areaId = editingArea.id
      } else {
        console.log('Creating new area with data:', cleanAreaData)
        const newArea: Area = await createArea(cleanAreaData)
        await updateAreaDecisionQuorum(newArea.id, decision_quorum)
        areaId = newArea.id
      }

      // Update POD associations (only if there are selected PODs)
      if (selected_pods.length > 0) {
        try {
          // First, remove all PODs from this area
          const currentAreaPods = pods.filter((pod: Pod) => pod.area_id === areaId)
          console.log('Removing PODs from area:', currentAreaPods.map((p: Pod) => p.id))
          
          for (const pod of currentAreaPods) {
            try {
              await updatePod(pod.id, { area_id: undefined })
              console.log('Successfully removed POD from area:', pod.id)
            } catch (error) {
              console.error('Error removing POD from area:', pod.id, error)
              // Continue with other PODs even if one fails
            }
          }

          // Then, assign selected PODs to this area
          console.log('Assigning PODs to area:', selected_pods)
          for (const podId of selected_pods) {
            try {
              // Check if POD is already assigned to another area
              const pod = pods.find((p: Pod) => p.id === podId)
              if (pod && pod.area_id && pod.area_id !== areaId) {
                console.warn(`POD ${pod.name} is already assigned to another area. Skipping assignment.`)
                continue
              }
              
              await updatePod(podId, { area_id: areaId })
              console.log('Successfully assigned POD to area:', podId)
              
              // Verify the association
              const isCorrect = await verifyPODAssociation(podId, areaId)
              if (!isCorrect) {
                console.warn('POD association verification failed for:', podId)
              }
            } catch (error) {
              console.error('Error assigning POD to area:', podId, error)
              // Continue with other PODs even if one fails
            }
          }
        } catch (error) {
          console.error('Error updating POD associations:', error)
          // Don't throw here - the area update should still succeed
        }
      }

      // Automatically update area status based on completion criteria
      try {
        await updateAreaStatusAutomatically(areaId)
        console.log('Area status automatically updated based on criteria')
      } catch (error) {
        console.error('Error updating area status automatically:', error)
        // Don't fail the operation if status update fails
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
        start_date: '',
        end_date: '',
        decision_quorum: [],
        one_pager_url: '',
        selected_pods: []
      })
      
      // Check if there's a pending move after editing
      if (pendingMove && pendingMove.areaId === areaId) {
        try {
          // Re-validate the area for the target status
          let validation: any = { valid: false }
          if (pendingMove.targetStatus === 'Planning') {
            validation = await validateAreaForPlanning(areaId)
          } else if (pendingMove.targetStatus === 'Planned') {
            validation = await validateAreaForPlanned(areaId)
          }
          
          if (validation.valid) {
            // Move the area to the target status
            await updateArea(areaId, { status: pendingMove.targetStatus as Area['status'] })
            setPendingMove(null)
          }
        } catch (error) {
          console.error('Error validating pending move:', error)
        }
      }
      
      // Refresh data to get updated POD associations
      await Promise.all([refreshAreas(), refreshPods()])
      
      // Show success message
      console.log('Area saved successfully')
    } catch (error) {
      console.error('Error saving area:', error)
      setError(`Failed to save area: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
        setValidationDialog({
          open: true,
          title: 'Cannot Move to Planning',
          message: validation.message,
          missingFields: ['One-pager'],
          area: area,
          targetStatus: 'Planning'
        })
        return
      }
    }

    // Validate move from Planning to Planned
    if (source.droppableId === 'Planning' && destination.droppableId === 'Planned') {
      try {
        console.log('Validating area for Planned status:', area.id)
        const validation = await validateAreaForPlanned(area.id)
        console.log('Validation result:', validation)
        
        if (!validation.valid) {
          setValidationDialog({
            open: true,
            title: 'Cannot Move to Planned',
            message: validation.message,
            missingFields: validation.missing || [],
            area: area,
            targetStatus: 'Planned'
          })
          return
        }
      } catch (error) {
        console.error('Error validating area for Planned status:', error)
        setError(`Failed to validate area: ${error instanceof Error ? error.message : 'Unknown error'}`)
        return
      }
    }

    // Prevent move from Executing to Released - only PODs should control this
    if (source.droppableId === 'Executing' && destination.droppableId === 'Released') {
      setValidationDialog({
        open: true,
        title: 'Cannot Move to Released',
        message: 'Areas cannot be moved directly from "Executing" to "Released". This status change is controlled by the movement of associated PODs.',
        missingFields: [],
        area: area,
        targetStatus: 'Released'
      })
      return
    }

    try {
      const newStatus = destination.droppableId as Area['status']
      console.log('Moving area to status:', newStatus)
      
      await updateArea(area.id, { status: newStatus })
      console.log('Successfully updated area status')
      
      // If moving from Released to any other status, move PODs to 'In development'
      if (source.droppableId === 'Released' && destination.droppableId !== 'Released') {
        const areaPods = pods.filter((pod: Pod) => pod.area_id === area.id)
        console.log('Moving PODs to In development:', areaPods.map((p: Pod) => p.id))
        
        for (const pod of areaPods) {
          try {
            await updatePod(pod.id, { status: 'In development' })
            console.log('Successfully moved POD to In development:', pod.id)
          } catch (podError) {
            console.error('Error moving POD to In development:', pod.id, podError)
            // Continue with other PODs even if one fails
          }
        }
      }
      
      // Refresh data to show updated POD statuses
      await Promise.all([refreshAreas(), refreshPods()])
      
      // Refresh data to show updated POD statuses
      if (source.droppableId === 'Released' && destination.droppableId !== 'Released') {
        await Promise.all([refreshAreas(), refreshPods()])
      }
      
      console.log('Area movement completed successfully')
    } catch (error) {
      console.error('Error moving area:', error)
      setError(`Failed to move area: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
        await Promise.all([refreshAreas(), refreshPods()]) // Refresh data to show updated statuses
      } catch (error) {
        console.error('Error kicking off area:', error)
        setError('Failed to kick off area. Please try again.')
      }
    }
  }

  const handleCreatePod = async () => {
    try {
      setError('')
      const { members, ...podData } = podFormData

      // Validate required fields
      if (!podData.name.trim()) {
        setError('POD name is required')
        return
      }

      // Validate POD creation requirements
      if (!editingArea) {
        setError('No area selected for POD creation')
        return
      }

      const validation = validatePodCreation(editingArea, members)
      if (!validation.isValid) {
        setError(validation.error || 'Invalid POD configuration')
        return
      }

      // Associate the POD with the current area being edited
      const podDataWithArea = {
        ...podData,
        area_id: editingArea.id
      }

      const newPod: Pod = await createPod(podDataWithArea)
      await updatePodMembers(newPod.id, members)
      
      // Ensure POD is not assigned to any other area
      console.log(`Created POD ${newPod.name} and assigned to area ${editingArea.name}`)
      
      // Add the new POD to the selected pods
      setFormData((prev: typeof formData) => ({
        ...prev,
        selected_pods: [...prev.selected_pods, newPod.id]
      }))

      // Reset form and close dialog
      setPodFormData({
        name: '',
        members: []
      })
      setOpenPodDialog(false)
      
      // Refresh data
      await Promise.all([refreshAreas(), refreshPods()])
    } catch (error) {
      console.error('Error creating POD:', error)
      setError('Failed to create POD. Please try again.')
    }
  }

  const handleEditArea = (area: Area) => {
    setEditingArea(area)
    const areaPods = pods.filter((pod: Pod) => pod.area_id === area.id)
    setFormData({
      name: area.name,
      description: area.description || '',
      revenue_impact: area.revenue_impact || 'Low',
      business_enablement: area.business_enablement || 'Low',
      efforts: area.efforts || 'Low',
      end_user_impact: area.end_user_impact || 'Low',
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
        await refreshAreas()
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
      await refreshAreas()
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
      await refreshAreas()
      
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
        await refreshAreas()
      } catch (error) {
        console.error('Error deleting comment:', error)
        setError('Failed to delete comment. Please try again.')
      }
    }
  }

  const handleValidationFormSubmit = async () => {
    if (!validationDialog.area) return

    try {
      setError('')
      
      // Update the area with the missing fields
      const updates: any = {}
      
      if (validationDialog.missingFields.includes('One-pager') && validationFormData.one_pager_url) {
        updates.one_pager_url = validationFormData.one_pager_url
      }
      if (validationDialog.missingFields.includes('Start date') && validationFormData.start_date) {
        updates.start_date = validationFormData.start_date
      }
      if (validationDialog.missingFields.includes('End date') && validationFormData.end_date) {
        updates.end_date = validationFormData.end_date
      }
      if (validationDialog.missingFields.includes('Revenue impact') && validationFormData.revenue_impact) {
        updates.revenue_impact = validationFormData.revenue_impact
      }
      if (validationDialog.missingFields.includes('Business enablement') && validationFormData.business_enablement) {
        updates.business_enablement = validationFormData.business_enablement
      }
      if (validationDialog.missingFields.includes('Efforts') && validationFormData.efforts) {
        updates.efforts = validationFormData.efforts
      }
      if (validationDialog.missingFields.includes('End user impact') && validationFormData.end_user_impact) {
        updates.end_user_impact = validationFormData.end_user_impact
      }

      // Update the area
      await updateArea(validationDialog.area.id, updates)
      
      // Automatically update area status
      await updateAreaStatusAutomatically(validationDialog.area.id)
      
      // Close dialog and refresh data
      setValidationDialog({ ...validationDialog, open: false })
      setValidationFormData({
        one_pager_url: '',
        start_date: '',
        end_date: '',
        revenue_impact: 'Low',
        business_enablement: 'Low',
        efforts: 'Low',
        end_user_impact: 'Low'
      })
      
      await Promise.all([refreshAreas(), refreshPods()])
      
      console.log('Area updated with missing fields and status automatically adjusted')
    } catch (error) {
      console.error('Error updating area with validation form:', error)
      setError(`Failed to update area: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const getImpactColor = (level: string | undefined) => {
    return '#9e9e9e' // Always return grey for all levels
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
  }

  const renderAreaCard = (area: Area) => {
    switch (viewMode) {
      case 'compact':
        return renderCompactAreaCard(area)
      case 'detailed':
        return renderDetailedAreaCard(area)
      case 'cozy':
      default:
        return renderCozyAreaCard(area)
    }
  }

  const renderCompactAreaCard = (area: Area) => {
    const areaPods = pods.filter((pod: Pod) => pod.area_id === area.id)
    
    // Determine POD status color and text based on POD statuses
    const getPodStatusInfo = () => {
      if (areaPods.length === 0) return { color: '#6b7280', text: 'No PODs', status: 'No PODs' }
      
      const podStatuses = areaPods.map(pod => pod.status)
      if (podStatuses.includes('Released')) return { color: '#4caf50', text: 'Released', status: 'Released' }
      if (podStatuses.includes('In testing')) return { color: '#9c27b0', text: 'In Testing', status: 'In testing' }
      if (podStatuses.includes('In development')) return { color: '#2196f3', text: 'In Development', status: 'In development' }
      if (podStatuses.includes('Awaiting development')) return { color: '#ff9800', text: 'Awaiting Dev', status: 'Awaiting development' }
      return { color: '#6b7280', text: 'No Status', status: 'No Status' }
    }
    
    return (
      <Box sx={{ p: 1.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header with title and status */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem', lineHeight: 1.2 }}>
            {area.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                backgroundColor: getPodStatusInfo().color,
                borderRadius: '50%'
              }}
            />
          </Box>
        </Box>
        
        {/* POD count */}
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
          {areaPods.length} POD{areaPods.length !== 1 ? 's' : ''}
        </Typography>
      </Box>
    )
  }

  const renderCozyAreaCard = (area: Area) => {
    const areaPods = pods.filter((pod: Pod) => pod.area_id === area.id)
    const revisedDates = areaRevisedEndDates[area.id] || []
    const riskLevel = areaRiskLevels[area.id] || 'on-track'
    const riskInfo = getRiskInfo(riskLevel)
    
    // Get POD leader for this area
    const podLeader = areaPods.find(pod => pod.members?.some(member => member.is_leader))?.members?.find(member => member.is_leader)
    
    // Determine POD status color and text based on POD statuses
    const getPodStatusInfo = () => {
      if (areaPods.length === 0) return { color: '#6b7280', text: 'No PODs', status: 'No PODs' }
      
      const podStatuses = areaPods.map(pod => pod.status)
      if (podStatuses.includes('Released')) return { color: '#4caf50', text: 'Released', status: 'Released' }
      if (podStatuses.includes('In testing')) return { color: '#9c27b0', text: 'In Testing', status: 'In testing' }
      if (podStatuses.includes('In development')) return { color: '#2196f3', text: 'In Development', status: 'In development' }
      if (podStatuses.includes('Awaiting development')) return { color: '#ff9800', text: 'Awaiting Dev', status: 'Awaiting development' }
      return { color: '#6b7280', text: 'No Status', status: 'No Status' }
    }
    
    return (
        <Box sx={{ p: 2.5, height: '100%' }}>
        {/* Header with title and status indicators */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.3 }}>
            {area.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* POD status indicator - shows POD status instead of area status */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  backgroundColor: getPodStatusInfo().color,
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: 'background.paper',
                  boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 1px 3px rgba(255,255,255,0.1)' : '0 1px 3px rgba(0,0,0,0.1)'
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', fontWeight: 500 }}>
                {getPodStatusInfo().text}
              </Typography>
            </Box>
            {/* Risk level indicator */}
            <Chip
              label={riskInfo.label}
              size="small"
              sx={(theme) => ({
                backgroundColor: riskLevel === 'critical' ? 
                  (theme.palette.mode === 'dark' ? 'rgba(220, 38, 38, 0.15)' : '#fef2f2') : 
                  riskLevel === 'medium-risk' ? 
                  (theme.palette.mode === 'dark' ? 'rgba(217, 119, 6, 0.15)' : '#fffbeb') :
                  riskLevel === 'low-risk' ? 
                  (theme.palette.mode === 'dark' ? 'rgba(107, 114, 128, 0.15)' : '#f3f4f6') : 
                  (theme.palette.mode === 'dark' ? 'rgba(22, 163, 74, 0.15)' : '#f0fdf4'),
                color: riskLevel === 'critical' ? '#dc2626' : 
                       riskLevel === 'medium-risk' ? '#d97706' :
                       riskLevel === 'low-risk' ? '#6b7280' : '#16a34a',
                border: riskLevel === 'critical' ? 
                  (theme.palette.mode === 'dark' ? '1px solid rgba(220, 38, 38, 0.3)' : '1px solid #fecaca') : 
                  riskLevel === 'medium-risk' ? 
                  (theme.palette.mode === 'dark' ? '1px solid rgba(217, 119, 6, 0.3)' : '1px solid #fed7aa') :
                  riskLevel === 'low-risk' ? 
                  (theme.palette.mode === 'dark' ? '1px solid rgba(107, 114, 128, 0.3)' : '1px solid #d1d5db') : 
                  (theme.palette.mode === 'dark' ? '1px solid rgba(22, 163, 74, 0.3)' : '1px solid #bbf7d0'),
                fontWeight: 600,
                fontSize: '0.65rem',
                height: 20,
                borderRadius: '10px'
              })}
            />
          </Box>
        </Box>
        
        {/* Dates Section - improved spacing */}
        <Box sx={{ mb: 2.5 }}>
          {/* Original dates */}
          {(area.start_date || area.end_date) && (
            <Box sx={{ 
              mb: 1, 
              p: 1.5, 
              backgroundColor: 'action.hover', 
              borderRadius: 1.5, 
              border: '1px solid',
              borderColor: 'divider'
            }}>
              <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary', fontWeight: 500 }}>
                📅 Start: {formatDate(area.start_date)} | End: {formatDate(area.end_date)}
              </Typography>
            </Box>
          )}
          {/* Revised end dates */}
          {revisedDates.map((revisedDate: string, index: number) => (
            <Box 
              key={index} 
              sx={(theme) => ({ 
                mb: 1,
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(220, 38, 38, 0.15)' : '#fef2f2',
                border: '1px solid',
                borderColor: theme.palette.mode === 'dark' ? 'rgba(220, 38, 38, 0.3)' : '#fecaca',
                borderRadius: 1.5,
                px: 1.5,
                py: 1
              })}
            >
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'error.main',
                  fontWeight: 600,
                  fontSize: '0.8rem'
                }}
              >
                ⚠️ Revised: {formatDate(revisedDate)}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Description */}
        {area.description && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5, fontSize: '0.85rem' }}>
              {area.description}
            </Typography>
          </Box>
        )}

        {/* Impact Values - improved design */}
        {(area.revenue_impact || area.business_enablement || area.efforts || area.end_user_impact) && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1, display: 'block' }}>
              Impact Assessment
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {area.revenue_impact && (
                <Chip 
                  label={`Revenue: ${area.revenue_impact}`} 
                  size="small" 
                  sx={(theme) => ({ 
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(3, 105, 161, 0.15)' : '#f0f9ff', 
                    color: '#0369a1',
                    fontSize: '0.7rem',
                    height: 24,
                    border: '1px solid',
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(3, 105, 161, 0.3)' : '#bae6fd',
                    borderRadius: '12px',
                    fontWeight: 500
                  })} 
                />
              )}
              {area.business_enablement && (
                <Chip 
                  label={`Business: ${area.business_enablement}`} 
                  size="small" 
                  sx={(theme) => ({ 
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(21, 128, 61, 0.15)' : '#f0fdf4', 
                    color: '#15803d',
                    fontSize: '0.7rem',
                    height: 24,
                    border: '1px solid',
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(21, 128, 61, 0.3)' : '#bbf7d0',
                    borderRadius: '12px',
                    fontWeight: 500
                  })} 
                />
              )}
              {area.efforts && (
                <Chip 
                  label={`Effort: ${area.efforts}`} 
                  size="small" 
                  sx={(theme) => ({ 
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(161, 98, 7, 0.15)' : '#fefce8', 
                    color: '#a16207',
                    fontSize: '0.7rem',
                    height: 24,
                    border: '1px solid',
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(161, 98, 7, 0.3)' : '#fde047',
                    borderRadius: '12px',
                    fontWeight: 500
                  })} 
                />
              )}
              {area.end_user_impact && (
                <Chip 
                  label={`User Impact: ${area.end_user_impact}`} 
                  size="small" 
                  sx={(theme) => ({ 
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(147, 51, 234, 0.15)' : '#fdf4ff', 
                    color: '#9333ea',
                    fontSize: '0.7rem',
                    height: 24,
                    border: '1px solid',
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(147, 51, 234, 0.3)' : '#e9d5ff',
                    borderRadius: '12px',
                    fontWeight: 500
                  })} 
                />
              )}
            </Box>
          </Box>
        )}

        {/* POD Information */}
        {(podLeader || areaPods.length > 0) && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1.5, display: 'block' }}>
              POD Information
            </Typography>
            
            {/* POD Leader */}
            {podLeader && (
              <Box sx={(theme) => ({ 
                mb: 1.5, 
                p: 1.5, 
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(3, 105, 161, 0.15)' : '#f0f9ff', 
                borderRadius: 1.5, 
                border: '1px solid',
                borderColor: theme.palette.mode === 'dark' ? 'rgba(3, 105, 161, 0.3)' : '#bae6fd'
              })}>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#0369a1', fontWeight: 500 }}>
                  <PersonIcon sx={{ fontSize: 16 }} />
                  Leader: {podLeader.member?.name || 'Unknown'}
                </Typography>
              </Box>
            )}
            
            {/* Associated PODs */}
            {areaPods.length > 0 && (
              <Box>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', mb: 1, fontWeight: 500 }}>
                  <GroupIcon sx={{ fontSize: 16 }} />
                  Associated PODs ({areaPods.length})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {areaPods.slice(0, 3).map((pod: Pod) => (
                    <Chip 
                      key={pod.id}
                      label={pod.name}
                      size="small"
                      sx={(theme) => ({ 
                        fontSize: '0.7rem',
                        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(2, 119, 189, 0.15)' : '#e0f2fe',
                        color: '#0277bd',
                        border: '1px solid',
                        borderColor: theme.palette.mode === 'dark' ? 'rgba(2, 119, 189, 0.3)' : '#81d4fa',
                        borderRadius: '8px',
                        fontWeight: 500,
                        height: 22
                      })}
                    />
                  ))}
                  {areaPods.length > 3 && (
                    <Chip 
                      label={`+${areaPods.length - 3} more`}
                      size="small"
                      sx={(theme) => ({ 
                        fontSize: '0.7rem',
                        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(107, 114, 128, 0.15)' : '#f3f4f6',
                        color: '#6b7280',
                        border: '1px solid',
                        borderColor: theme.palette.mode === 'dark' ? 'rgba(107, 114, 128, 0.3)' : '#d1d5db',
                        borderRadius: '8px',
                        fontWeight: 500,
                        height: 22
                      })}
                    />
                  )}
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* One-pager status - improved design */}
        <Box sx={{ mb: 2.5 }}>
          {area.one_pager_url ? (
            <Box sx={(theme) => ({ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              p: 1.5, 
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(22, 163, 74, 0.15)' : '#f0fdf4', 
              borderRadius: 1.5, 
              border: '1px solid',
              borderColor: theme.palette.mode === 'dark' ? 'rgba(22, 163, 74, 0.3)' : '#bbf7d0'
            })}>
              <AttachFileIcon sx={{ fontSize: 16, color: '#16a34a' }} />
              <Typography variant="body2" sx={{ color: '#16a34a', fontWeight: 600 }}>
                One-pager uploaded
              </Typography>
            </Box>
          ) : (
            <Box sx={(theme) => ({ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              p: 1.5, 
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(220, 38, 38, 0.15)' : '#fef2f2', 
              borderRadius: 1.5, 
              border: '1px solid',
              borderColor: theme.palette.mode === 'dark' ? 'rgba(220, 38, 38, 0.3)' : '#fecaca'
            })}>
              <AttachFileIcon sx={{ fontSize: 16, color: '#dc2626' }} />
              <Typography variant="body2" sx={{ color: '#dc2626', fontWeight: 600 }}>
                One-pager required
              </Typography>
            </Box>
          )}
        </Box>

        {/* Kick-off button for Planned areas - moved to bottom right */}
        {area.status === 'Planned' && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => handleKickOff(area)}
              sx={{
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: '0.7rem',
                py: 0.5,
                px: 1.5,
                textTransform: 'none',
                fontWeight: 500,
                borderRadius: 0.5,
                minWidth: 'auto',
                width: 'fit-content',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                }
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
              borderRadius: 0.5,
              px: 1,
              py: 0.5
            }
          }}
          onClick={() => handleViewComments(area)}
        >
          <CommentIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {area.comments?.length || 0} comments
          </Typography>
        </Box>
        </Box>
      )
    }

  const renderDetailedAreaCard = (area: Area) => {
    const areaPods = pods.filter((pod: Pod) => pod.area_id === area.id)
    const revisedDates = areaRevisedEndDates[area.id] || []
    const riskLevel = areaRiskLevels[area.id] || 'on-track'
    const riskInfo = getRiskInfo(riskLevel)
    
    // Get POD leader for this area
    const podLeader = areaPods.find(pod => pod.members?.some(member => member.is_leader))?.members?.find(member => member.is_leader)
    
    // Determine POD status color and text based on POD statuses
    const getPodStatusInfo = () => {
      if (areaPods.length === 0) return { color: '#6b7280', text: 'No PODs', status: 'No PODs' }
      
      const podStatuses = areaPods.map(pod => pod.status)
      if (podStatuses.includes('Released')) return { color: '#4caf50', text: 'Released', status: 'Released' }
      if (podStatuses.includes('In testing')) return { color: '#9c27b0', text: 'In Testing', status: 'In testing' }
      if (podStatuses.includes('In development')) return { color: '#2196f3', text: 'In Development', status: 'In development' }
      if (podStatuses.includes('Awaiting development')) return { color: '#ff9800', text: 'Awaiting Dev', status: 'Awaiting development' }
      return { color: '#6b7280', text: 'No Status', status: 'No Status' }
    }
    
    return (
      <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header with title and status indicators */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
            {area.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            {/* POD status indicator */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: getPodStatusInfo().color,
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: 'background.paper',
                  boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 2px 4px rgba(255,255,255,0.1)' : '0 2px 4px rgba(0,0,0,0.1)'
                }}
              />
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem', fontWeight: 600 }}>
                {getPodStatusInfo().text}
              </Typography>
            </Box>
            {/* Risk level indicator */}
            <Chip
              label={riskInfo.label}
              size="small"
              sx={(theme) => ({
                backgroundColor: riskLevel === 'critical' ? 
                  (theme.palette.mode === 'dark' ? 'rgba(220, 38, 38, 0.15)' : '#fef2f2') : 
                  riskLevel === 'medium-risk' ? 
                  (theme.palette.mode === 'dark' ? 'rgba(217, 119, 6, 0.15)' : '#fffbeb') :
                  riskLevel === 'low-risk' ? 
                  (theme.palette.mode === 'dark' ? 'rgba(107, 114, 128, 0.15)' : '#f3f4f6') : 
                  (theme.palette.mode === 'dark' ? 'rgba(22, 163, 74, 0.15)' : '#f0fdf4'),
                color: riskLevel === 'critical' ? '#dc2626' : 
                       riskLevel === 'medium-risk' ? '#d97706' :
                       riskLevel === 'low-risk' ? '#6b7280' : '#16a34a',
                border: riskLevel === 'critical' ? 
                  (theme.palette.mode === 'dark' ? '1px solid rgba(220, 38, 38, 0.3)' : '1px solid #fecaca') : 
                  riskLevel === 'medium-risk' ? 
                  (theme.palette.mode === 'dark' ? '1px solid rgba(217, 119, 6, 0.3)' : '1px solid #fed7aa') :
                  riskLevel === 'low-risk' ? 
                  (theme.palette.mode === 'dark' ? '1px solid rgba(107, 114, 128, 0.3)' : '1px solid #d1d5db') : 
                  (theme.palette.mode === 'dark' ? '1px solid rgba(22, 163, 74, 0.3)' : '1px solid #bbf7d0'),
                fontWeight: 600,
                fontSize: '0.75rem',
                height: 24,
                borderRadius: '12px'
              })}
            />
          </Box>
        </Box>
        
        {/* Description - more prominent in detailed view */}
        {area.description && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.6, fontSize: '0.95rem' }}>
              {area.description}
            </Typography>
          </Box>
        )}
        
        {/* Dates Section */}
        <Box sx={{ mb: 3 }}>
          {/* Original dates */}
          {(area.start_date || area.end_date) && (
            <Box sx={{ 
              mb: 1.5, 
              p: 2, 
              backgroundColor: 'action.hover', 
              borderRadius: 2, 
              border: '1px solid',
              borderColor: 'divider'
            }}>
              <Typography variant="body2" sx={{ fontSize: '0.85rem', color: 'text.secondary', fontWeight: 500 }}>
                📅 Start: {formatDate(area.start_date)} | End: {formatDate(area.end_date)}
              </Typography>
            </Box>
          )}
          {/* Revised end dates */}
          {revisedDates.map((revisedDate: string, index: number) => (
            <Box 
              key={index} 
              sx={(theme) => ({ 
                mb: 1.5, 
                p: 2, 
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(251, 191, 36, 0.1)' : '#fffbeb',
                borderRadius: 2,
                border: theme.palette.mode === 'dark' ? '1px solid rgba(251, 191, 36, 0.2)' : '1px solid #fed7aa'
              })}>
              <Typography variant="body2" sx={{ fontSize: '0.85rem', color: 'warning.main', fontWeight: 500 }}>
                🔄 Revised End: {formatDate(revisedDate)}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Impact Assessment - expanded */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.primary', fontWeight: 600 }}>
            Impact Assessment
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {[
              { label: 'Revenue Impact', value: area.revenue_impact, icon: '💰' },
              { label: 'Business Enablement', value: area.business_enablement, icon: '🏢' },
              { label: 'Efforts', value: area.efforts, icon: '⚡' },
              { label: 'End User Impact', value: area.end_user_impact, icon: '👥' }
            ].map(({ label, value, icon }) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  label={`${icon} ${value}`}
                  size="small"
                  sx={(theme) => ({
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(107, 114, 128, 0.15)' : '#f3f4f6',
                    color: theme.palette.mode === 'dark' ? '#9ca3af' : '#6b7280',
                    border: theme.palette.mode === 'dark' ? '1px solid rgba(107, 114, 128, 0.3)' : '1px solid #d1d5db',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    height: 26,
                    borderRadius: '13px'
                  })}
                />
              </Box>
            ))}
          </Box>
        </Box>

        {/* POD Information - expanded */}
        {areaPods.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.primary', fontWeight: 600 }}>
              POD Information
            </Typography>
            {/* POD Leader */}
            {podLeader && (
              <Box sx={{ mb: 1.5 }}>
                <Box sx={(theme) => ({ 
                  p: 2, 
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
                  borderRadius: 2,
                  border: theme.palette.mode === 'dark' ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid #bfdbfe'
                })}>
                  <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.85rem' }}>
                    👑 POD Leader: {podLeader.name}
                  </Typography>
                </Box>
              </Box>
            )}
            {/* Associated PODs */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {areaPods.map((pod: Pod) => (
                <Chip
                  key={pod.id}
                  label={pod.name}
                  size="small"
                  sx={(theme) => ({
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
                    color: theme.palette.mode === 'dark' ? '#93c5fd' : '#1d4ed8',
                    border: theme.palette.mode === 'dark' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid #bfdbfe',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    height: 28,
                    borderRadius: '14px'
                  })}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* One-pager Status - expanded */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.primary', fontWeight: 600 }}>
            One-pager Status
          </Typography>
          <Box sx={(theme) => ({ 
            p: 2, 
            backgroundColor: area.one_pager_url ? 
              (theme.palette.mode === 'dark' ? 'rgba(34, 197, 94, 0.1)' : '#f0fdf4') :
              (theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2'),
            borderRadius: 2,
            border: area.one_pager_url ? 
              (theme.palette.mode === 'dark' ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid #bbf7d0') :
              (theme.palette.mode === 'dark' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid #fecaca')
          })}>
            <Typography variant="body2" sx={{ 
              color: area.one_pager_url ? 'success.main' : 'error.main', 
              fontWeight: 600, 
              fontSize: '0.85rem' 
            }}>
              {area.one_pager_url ? '✅ One-pager available' : '❌ One-pager missing'}
            </Typography>
          </Box>
        </Box>

        {/* Kick-off button for Planned areas */}
        {area.status === 'Planned' && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              size="medium"
              onClick={() => handleKickOff(area)}
              sx={{
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: '0.85rem',
                py: 1,
                px: 2.5,
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 1,
                minWidth: 'auto',
                width: 'fit-content',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                }
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
            gap: 1,
            cursor: 'pointer',
            mt: 'auto',
            '&:hover': {
              backgroundColor: 'action.hover',
              borderRadius: 1,
              px: 1.5,
              py: 0.5
            }
          }}
          onClick={() => handleViewComments(area)}
        >
          <CommentIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
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
      color: '#ff9800',
      showAddButton: true
    },
    {
      id: 'Planning',
      title: 'Planning',
      items: planningAreas,
      color: '#ffc107',
      showAddButton: false
    },
    {
      id: 'Planned',
      title: 'Planned',
      items: plannedAreas,
      color: '#4caf50',
      showAddButton: false
    },
    {
      id: 'Executing',
      title: 'Executing',
      items: executingAreas,
      color: '#2196f3',
      showAddButton: false
    },
    {
      id: 'Released',
      title: 'Released',
      items: releasedAreas,
      color: '#9c27b0',
      showAddButton: false
    }
  ]

  if (loading) {
    return <Typography>Loading...</Typography>
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1" sx={{ 
          fontWeight: 700, 
          color: '#111827',
          fontSize: '28px'
        }}>
          Planning
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* View Mode Selector */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(event, newViewMode) => {
              if (newViewMode !== null) {
                setViewMode(newViewMode)
                localStorage.setItem('areas-view-mode', newViewMode)
              }
            }}
            size="small"
            sx={{ 
              '& .MuiToggleButton-root': {
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                '&.Mui-selected': {
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: '#2563eb'
                  }
                }
              }
            }}
          >
            <ToggleButton value="compact" aria-label="compact view">
              <ViewModuleIcon sx={{ fontSize: 16, mr: 0.5 }} />
              Compact
            </ToggleButton>
            <ToggleButton value="cozy" aria-label="cozy view">
              <ViewListIcon sx={{ fontSize: 16, mr: 0.5 }} />
              Cozy
            </ToggleButton>
            <ToggleButton value="detailed" aria-label="detailed view">
              <ViewAgendaIcon sx={{ fontSize: 16, mr: 0.5 }} />
              Detailed
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddArea}
            sx={{
              backgroundColor: '#3b82f6',
            borderRadius: 1,
            px: 3,
            py: 1.5,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '14px',
            '&:hover': {
              backgroundColor: '#2563eb',
            },
          }}
        >
          Add Area
        </Button>
        </Box>
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
                  onChange={(e: SelectChangeEvent<string[]>) => setFormData({ ...formData, decision_quorum: e.target.value as string[] })}
                  label="Decision Quorum (POD Committee Members)"
                >
                  {podCommitteeMembers.map((member: Profile) => (
                    <MenuItem key={member.id} value={member.id}>{member.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {/* POD Assignment - show when creating new areas or when editing areas with one-pager URL */}
            {(!editingArea) || (editingArea && formData.one_pager_url && formData.one_pager_url.trim()) && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                  POD Assignment
                </Typography>
                
                {/* Assigned PODs */}
                {formData.selected_pods.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                      Assigned PODs:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {formData.selected_pods.map((podId) => {
                        const pod = pods.find((p: Pod) => p.id === podId)
                        return pod ? (
                          <Chip
                            key={podId}
                            label={pod.name}
                            onDelete={() => {
                              setFormData({
                                ...formData,
                                selected_pods: formData.selected_pods.filter(id => id !== podId)
                              })
                            }}
                            deleteIcon={<CloseIcon />}
                            sx={(theme) => ({
                              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.15)' : 'primary.light',
                              color: 'primary.dark',
                              border: '1px solid',
                              borderColor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.3)' : 'primary.main',
                              '& .MuiChip-deleteIcon': {
                                color: 'primary.dark',
                                '&:hover': {
                                  color: 'error.main'
                                }
                              }
                            })}
                          />
                        ) : null
                      })}
                    </Box>
                  </Box>
                )}
                
                {/* POD Selection */}
                <Box display="flex" alignItems="center" gap={2}>
                  <FormControl fullWidth>
                    <InputLabel>Assign PODs</InputLabel>
                    <Select
                      multiple
                      value={formData.selected_pods}
                      onChange={(e: SelectChangeEvent<string[]>) => setFormData({ ...formData, selected_pods: e.target.value as string[] })}
                      label="Assign PODs"
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => {
                            const pod = pods.find((p: Pod) => p.id === value)
                            return (
                              <Chip
                                key={value}
                                label={pod?.name || value}
                                size="small"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            )
                          })}
                        </Box>
                      )}
                    >
                      {pods.filter((pod: Pod) => !pod.area_id || pod.area_id === editingArea?.id).map((pod: Pod) => (
                        <MenuItem key={pod.id} value={pod.id}>
                          {pod.name}
                          {pod.area_id && pod.area_id !== editingArea?.id && (
                            <Typography variant="caption" sx={{ ml: 1, color: 'warning.main' }}>
                              (Assigned to another area)
                            </Typography>
                          )}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenPodDialog(true)}
                    sx={{ minWidth: 150, borderRadius: '8px' }}
                  >
                    Create POD
                  </Button>
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} sx={{ borderRadius: '8px' }}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ borderRadius: '8px' }}>
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
                      sx={{ 
                        backgroundColor: '#ffebee', 
                        color: '#d32f2f',
                        border: '1px solid #ffcdd2',
                        fontWeight: 500
                      }} 
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

      {/* Create POD Dialog */}
      <Dialog open={openPodDialog} onClose={() => setOpenPodDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New POD</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="POD Name"
                value={podFormData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPodFormData({ ...podFormData, name: e.target.value })}
                required
              />
            </Grid>
            
            {/* Members Section */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                Members
              </Typography>
              {podFormData.members.map((member: any, index: number) => (
                <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={5}>
                    <FormControl fullWidth>
                      <InputLabel>Member</InputLabel>
                      <Select
                        value={member.member_id}
                        onChange={(e: SelectChangeEvent<string>) => {
                          const newMembers = [...podFormData.members]
                          newMembers[index].member_id = e.target.value
                          
                          // Set default bandwidth to member's maximum available bandwidth
                          if (e.target.value) {
                            const selectedMember = availableMembers.find(member => member.id === e.target.value)
                            if (selectedMember) {
                              const assignedBandwidth = selectedMember.pod_members?.reduce((total: number, pm: any) => {
                                return total + (pm.bandwidth_percentage || 0)
                              }, 0) || 0
                              const availableBandwidth = Math.max(0, 1 - assignedBandwidth)
                              newMembers[index].bandwidth_percentage = availableBandwidth
                            }
                          }
                          
                          setPodFormData({ ...podFormData, members: newMembers })
                        }}
                        label="Member"
                      >
                        {availableMembers.map((memberOption: Profile) => {
                          // Calculate available bandwidth for this member
                          const assignedBandwidth = memberOption.pod_members?.reduce((total: number, pm: any) => {
                            return total + (pm.bandwidth_percentage || 0)
                          }, 0) || 0
                          const availableBandwidth = Math.max(0, 1 - assignedBandwidth)
                          
                          return (
                            <MenuItem key={memberOption.id} value={memberOption.id}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <Typography variant="body2">{memberOption.name}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                                  Available: {(availableBandwidth * 100).toFixed(0)}%
                                </Typography>
                              </Box>
                            </MenuItem>
                          )
                        })}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Bandwidth"
                      type="number"
                      value={member.bandwidth_percentage}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const newMembers = [...podFormData.members]
                        newMembers[index].bandwidth_percentage = parseFloat(e.target.value) || 0
                        setPodFormData({ ...podFormData, members: newMembers })
                      }}
                      inputProps={{ min: 0, max: 1, step: 0.01 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth>
                      <InputLabel>Role</InputLabel>
                      <Select
                        value={member.is_leader ? 'leader' : 'member'}
                        onChange={(e: SelectChangeEvent<string>) => {
                          const newMembers = [...podFormData.members]
                          newMembers[index].is_leader = e.target.value === 'leader'
                          setPodFormData({ ...podFormData, members: newMembers })
                        }}
                        label="Role"
                      >
                        <MenuItem value="member">Member</MenuItem>
                        <MenuItem value="leader">Leader</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={1}>
                    <IconButton
                      color="error"
                      onClick={() => {
                        const newMembers = podFormData.members.filter((_: any, i: number) => i !== index)
                        setPodFormData({ ...podFormData, members: newMembers })
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setPodFormData({
                  ...podFormData,
                  members: [...podFormData.members, { member_id: '', bandwidth_percentage: 0, is_leader: false }]
                })}
                sx={{ mt: 1 }}
              >
                Add Member
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPodDialog(false)} sx={{ borderRadius: '8px' }}>Cancel</Button>
          <Button onClick={handleCreatePod} variant="contained" sx={{ borderRadius: '8px' }}>
            Create POD
          </Button>
        </DialogActions>
      </Dialog>

      {/* Validation Error Dialog */}
      <Dialog 
        open={validationDialog.open} 
        onClose={() => setValidationDialog({ ...validationDialog, open: false })}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>{validationDialog.title}</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {validationDialog.message}
          </Typography>
          
          {validationDialog.area && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Complete Missing Fields:
              </Typography>
              
              <Grid container spacing={2}>
                {validationDialog.missingFields.includes('One-pager') && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="One-pager URL"
                      value={validationFormData.one_pager_url}
                      onChange={(e) => setValidationFormData({ ...validationFormData, one_pager_url: e.target.value })}
                      placeholder="https://example.com/one-pager.pdf"
                      helperText="Enter the URL to the one-pager document"
                    />
                  </Grid>
                )}
                
                {validationDialog.missingFields.includes('Start date') && (
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Start Date"
                      type="date"
                      value={validationFormData.start_date}
                      onChange={(e) => setValidationFormData({ ...validationFormData, start_date: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                )}
                
                {validationDialog.missingFields.includes('End date') && (
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="End Date"
                      type="date"
                      value={validationFormData.end_date}
                      onChange={(e) => setValidationFormData({ ...validationFormData, end_date: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                )}
                
                {validationDialog.missingFields.includes('Revenue impact') && (
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Revenue Impact</InputLabel>
                      <Select
                        value={validationFormData.revenue_impact}
                        onChange={(e) => setValidationFormData({ ...validationFormData, revenue_impact: e.target.value })}
                        label="Revenue Impact"
                      >
                        {impactLevels.map((level) => (
                          <MenuItem key={level} value={level}>{level}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                
                {validationDialog.missingFields.includes('Business enablement') && (
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Business Enablement</InputLabel>
                      <Select
                        value={validationFormData.business_enablement}
                        onChange={(e) => setValidationFormData({ ...validationFormData, business_enablement: e.target.value })}
                        label="Business Enablement"
                      >
                        {impactLevels.map((level) => (
                          <MenuItem key={level} value={level}>{level}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                
                {validationDialog.missingFields.includes('Efforts') && (
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Efforts</InputLabel>
                      <Select
                        value={validationFormData.efforts}
                        onChange={(e) => setValidationFormData({ ...validationFormData, efforts: e.target.value })}
                        label="Efforts"
                      >
                        {impactLevels.map((level) => (
                          <MenuItem key={level} value={level}>{level}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                
                {validationDialog.missingFields.includes('End user impact') && (
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>End User Impact</InputLabel>
                      <Select
                        value={validationFormData.end_user_impact}
                        onChange={(e) => setValidationFormData({ ...validationFormData, end_user_impact: e.target.value })}
                        label="End User Impact"
                      >
                        {impactLevels.map((level) => (
                          <MenuItem key={level} value={level}>{level}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                
                {/* POD Assignment - show when one-pager URL is present */}
                {validationFormData.one_pager_url && validationFormData.one_pager_url.trim() && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                      POD Assignment
                    </Typography>
                    
                    {/* Assigned PODs */}
                    {formData.selected_pods.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                          Assigned PODs:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {formData.selected_pods.map((podId) => {
                            const pod = pods.find((p: Pod) => p.id === podId)
                            return pod ? (
                              <Chip
                                key={podId}
                                label={pod.name}
                                onDelete={() => {
                                  setFormData({
                                    ...formData,
                                    selected_pods: formData.selected_pods.filter(id => id !== podId)
                                  })
                                }}
                                deleteIcon={<CloseIcon />}
                                sx={(theme) => ({
                                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.15)' : 'primary.light',
                                  color: 'primary.dark',
                                  border: '1px solid',
                                  borderColor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.3)' : 'primary.main',
                                  '& .MuiChip-deleteIcon': {
                                    color: 'primary.dark',
                                    '&:hover': {
                                      color: 'error.main'
                                    }
                                  }
                                })}
                              />
                            ) : null
                          })}
                        </Box>
                      </Box>
                    )}
                    
                    {/* POD Selection */}
                    <Box display="flex" alignItems="center" gap={2}>
                      <FormControl fullWidth>
                        <InputLabel>Assign PODs</InputLabel>
                        <Select
                          multiple
                          value={formData.selected_pods}
                          onChange={(e: SelectChangeEvent<string[]>) => setFormData({ ...formData, selected_pods: e.target.value as string[] })}
                          label="Assign PODs"
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((value) => {
                                const pod = pods.find((p: Pod) => p.id === value)
                                return (
                                  <Chip
                                    key={value}
                                    label={pod?.name || value}
                                    size="small"
                                    sx={{ fontSize: '0.7rem' }}
                                  />
                                )
                              })}
                            </Box>
                          )}
                        >
                          {pods.filter((pod: Pod) => !pod.area_id || pod.area_id === validationDialog.area?.id).map((pod: Pod) => (
                            <MenuItem key={pod.id} value={pod.id}>
                              {pod.name}
                              {pod.area_id && pod.area_id !== validationDialog.area?.id && (
                                <Typography variant="caption" sx={{ ml: 1, color: 'warning.main' }}>
                                  (Assigned to another area)
                                </Typography>
                              )}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setOpenPodDialog(true)}
                        sx={{ minWidth: 150, borderRadius: '8px' }}
                      >
                        Create POD
                      </Button>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setValidationDialog({ ...validationDialog, open: false })} sx={{ borderRadius: '8px' }}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleValidationFormSubmit}
            disabled={!validationDialog.area}
            sx={{ borderRadius: '8px' }}
          >
            Update Area
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  )
}