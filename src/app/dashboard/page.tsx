'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  IconButton,
  Collapse
} from '@mui/material'
import {
  Assessment as AssessmentIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  TrendingUp as TrendingUpIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Assignment as AssignmentIcon,
  Close as CloseIcon
} from '@mui/icons-material'
import { getPods, getMembers, getAreas, getAvailableMembers } from '@/lib/data'
import { getCurrentUser, type Profile } from '@/lib/auth'

interface TeamBandwidthData {
  team: string
  assignedCapacity: number
  availableCapacity: number
  members: Array<{
    id: string
    name: string
    email: string
    bandwidth_percentage: number
    pod_members: Array<{ bandwidth_percentage: number }>
  }>
}

interface AssignmentFormData {
  memberId: string
  memberName: string
  bandwidth: number
  podId: string
  maxBandwidth: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [bandwidthData, setBandwidthData] = useState<TeamBandwidthData[]>([])
  const [pods, setPods] = useState<any[]>([])
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({})
  const [assignmentDialog, setAssignmentDialog] = useState<{
    open: boolean
    formData: AssignmentFormData | null
  }>({ open: false, formData: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState<Profile | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [currentUser, podsData] = await Promise.all([
        getCurrentUser(),
        getPods()
      ])
      setUser(currentUser)
      setPods(podsData)
      await fetchBandwidthData()
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const fetchBandwidthData = async () => {
    try {
      const [members, pods] = await Promise.all([
        getMembers(),
        getPods()
      ])

      // Filter out POD committee members and group remaining members by team
      const nonCommitteeMembers = members.filter((member: any) => member.team !== 'POD committee')
      const teamGroups = nonCommitteeMembers.reduce((acc: any, member: any) => {
        const team = member.team || 'Unassigned'
        if (!acc[team]) {
          acc[team] = []
        }
        acc[team].push(member)
        return acc
      }, {})

      // Calculate bandwidth for each team (bandwidth_percentage is stored as decimals 0-1)
      const teamData: TeamBandwidthData[] = Object.entries(teamGroups).map(([team, teamMembers]: [string, any]) => {
        const totalCapacity = teamMembers.length * 1 // Assuming 1.0 capacity per member (decimal format)
        let assignedCapacity = 0

        // Calculate assigned capacity from POD assignments
        teamMembers.forEach((member: any) => {
          if (member.pod_members) {
            member.pod_members.forEach((pm: any) => {
              assignedCapacity += pm.bandwidth_percentage || 0
            })
          }
        })

        const availableCapacity = totalCapacity - assignedCapacity // Allow negative values for over-allocation

        console.log(`Team: ${team}, Assigned: ${assignedCapacity}, Available: ${availableCapacity}, Total: ${totalCapacity}`)

        return {
          team,
          assignedCapacity,
          availableCapacity,
          members: teamMembers
        }
      })

      setBandwidthData(teamData.sort((a, b) => b.assignedCapacity - a.assignedCapacity))
    } catch (error) {
      console.error('Error fetching bandwidth data:', error)
      setError('Failed to load bandwidth data')
    } finally {
      setLoading(false)
    }
  }

  const getCapacityColor = (availableCapacity: number, assignedCapacity: number) => {
    const totalCapacity = assignedCapacity + availableCapacity
    const percentage = (availableCapacity / totalCapacity) * 100
    if (percentage > 30) return '#4caf50' // Green
    if (percentage > 10) return '#ff9800' // Orange
    return '#f44336' // Red
  }

  const getCapacityStatus = (availableCapacity: number, assignedCapacity: number) => {
    const totalCapacity = assignedCapacity + availableCapacity
    const percentage = (availableCapacity / totalCapacity) * 100
    if (percentage > 30) return 'Healthy'
    if (percentage > 10) return 'Moderate'
    return 'Critical'
  }

  const handleExpandClick = (teamName: string) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamName]: !prev[teamName]
    }))
  }

  const handleOpenAssignmentDialog = (member: any, team: TeamBandwidthData) => {
    const assignedBandwidth = member.pod_members?.reduce(
      (sum: number, pm: any) => sum + (pm.bandwidth_percentage || 0),
      0
    )
    const availableBandwidth = 1 - assignedBandwidth // Assuming 1.0 is full capacity

    setAssignmentDialog({
      open: true,
      formData: {
        memberId: member.id,
        memberName: member.name || member.email,
        bandwidth: availableBandwidth,
        podId: '',
        maxBandwidth: availableBandwidth
      }
    })
  }

  const handleCloseAssignmentDialog = () => {
    setAssignmentDialog({ open: false, formData: null })
  }

  const handleAssignmentSubmit = async () => {
    if (!assignmentDialog.formData || !assignmentDialog.formData.podId) {
      setError('Please select a POD')
      return
    }
    
    try {
      // TODO: Implement the actual assignment logic here
      console.log('Assigning member to POD:', assignmentDialog.formData)
      // await assignToPod({
      //   memberId: assignmentDialog.formData.memberId,
      //   podId: assignmentDialog.formData.podId,
      //   bandwidth: assignmentDialog.formData.bandwidth
      // })
      
      // Refresh data
      await fetchBandwidthData()
      handleCloseAssignmentDialog()
    } catch (error) {
      console.error('Error assigning member to POD:', error)
      setError('Failed to assign member to POD')
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Box>
    )
  }

  const totalAvailableCapacity = bandwidthData.reduce((sum, team) => sum + team.availableCapacity, 0)
  const totalAssignedCapacity = bandwidthData.reduce((sum, team) => sum + team.assignedCapacity, 0)
  const totalCapacity = totalAssignedCapacity + totalAvailableCapacity

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Capacity Management Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<AssessmentIcon />}
          onClick={() => router.push('/dashboard/areas')}
          sx={{ borderRadius: '8px' }}
        >
          Manage Areas
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Assigned Capacity
                  </Typography>
                  <Typography variant="h4">
                    {totalAssignedCapacity.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    (excluding POD committee)
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Available Capacity
                  </Typography>
                  <Typography variant="h4" color={getCapacityColor(totalAvailableCapacity, totalAssignedCapacity)}>
                    {totalAvailableCapacity.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    (excluding POD committee)
                  </Typography>
                </Box>
                <PersonIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Team-wise Bandwidth Allocation Table */}
      <Card>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentIcon />
            Team-wise Bandwidth Allocation
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Capacity calculations exclude POD committee members who are responsible for planning and oversight.
          </Typography>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Team</TableCell>
                  <TableCell align="center">Assigned Capacity</TableCell>
                  <TableCell align="center">Available Capacity</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Utilization</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bandwidthData.map((team) => {
                  const totalTeamCapacity = team.assignedCapacity + team.availableCapacity
                  const utilizationPercentage = (team.assignedCapacity / totalTeamCapacity) * 100
                  const capacityColor = getCapacityColor(team.availableCapacity, team.assignedCapacity)
                  const status = getCapacityStatus(team.availableCapacity, team.assignedCapacity)
                  
                  return (
                    <React.Fragment key={team.team}>
                      <TableRow hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleExpandClick(team.team)
                              }}
                            >
                              {expandedTeams[team.team] ? (
                                <KeyboardArrowUpIcon />
                              ) : (
                                <KeyboardArrowDownIcon />
                              )}
                            </IconButton>
                            <GroupIcon sx={{ fontSize: 20 }} />
                            <Typography variant="body1" fontWeight="medium">
                              {team.team}
                            </Typography>
                            <Chip 
                              label={`${team.members.length} members`} 
                              size="small" 
                              variant="outlined"
                            />
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body1" fontWeight="medium">
                            {team.assignedCapacity.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography 
                            variant="body1" 
                            fontWeight="medium"
                            color={capacityColor}
                          >
                            {team.availableCapacity.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={status}
                            size="small"
                            sx={{
                              backgroundColor: capacityColor,
                              color: 'white',
                              fontWeight: 'medium'
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ width: '100%', minWidth: 100 }}>
                            <LinearProgress
                              variant="determinate"
                              value={utilizationPercentage}
                              sx={{
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: '#e0e0e0',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: capacityColor,
                                  borderRadius: 4
                                }
                              }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                              {(utilizationPercentage / 100).toFixed(3)}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded row with member details */}
                      <TableRow>
                        <TableCell style={{ padding: 0 }} colSpan={5}>
                          <Collapse in={expandedTeams[team.team]} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2, backgroundColor: 'background.default' }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Members with Available Bandwidth
                              </Typography>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell align="right">Available Bandwidth</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {team.members
                                    .filter(member => {
                                      const assignedBandwidth = member.pod_members?.reduce(
                                        (sum: number, pm: any) => sum + (pm.bandwidth_percentage || 0),
                                        0
                                      )
                                      const availableBandwidth = 1 - assignedBandwidth
                                      return availableBandwidth > 0
                                    })
                                    .map((member) => {
                                      const assignedBandwidth = member.pod_members?.reduce(
                                        (sum: number, pm: any) => sum + (pm.bandwidth_percentage || 0),
                                        0
                                      )
                                      const availableBandwidth = 1 - assignedBandwidth
                                      
                                      return (
                                        <TableRow key={member.id}>
                                          <TableCell>{member.name || 'Unnamed'}</TableCell>
                                          <TableCell>{member.email}</TableCell>
                                          <TableCell align="right">
                                            <Box display="flex" alignItems="center" justifyContent="flex-end">
                                              <Box width={100} mr={2}>
                                                <LinearProgress
                                                  variant="determinate"
                                                  value={availableBandwidth * 100}
                                                  sx={{
                                                    height: 8,
                                                    borderRadius: 4,
                                                    backgroundColor: 'divider',
                                                    '& .MuiLinearProgress-bar': {
                                                      backgroundColor: 'success.main',
                                                      borderRadius: 4
                                                    }
                                                  }}
                                                />
                                              </Box>
                                              {(availableBandwidth * 100).toFixed(0)}%
                                            </Box>
                                          </TableCell>
                                          <TableCell align="right">
                                            <Button
                                              size="small"
                                              variant="outlined"
                                              startIcon={<AssignmentIcon fontSize="small" />}
                                              onClick={() => handleOpenAssignmentDialog(member, team)}
                                              disabled={availableBandwidth <= 0}
                                            >
                                              Assign to POD
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      )
                                    })}
                                  
                                  {team.members.filter(member => {
                                    const assignedBandwidth = member.pod_members?.reduce(
                                      (sum: number, pm: any) => sum + (pm.bandwidth_percentage || 0),
                                      0
                                    )
                                    return (1 - assignedBandwidth) > 0
                                  }).length === 0 && (
                                    <TableRow>
                                      <TableCell colSpan={4} align="center" sx={{ py: 2, color: 'text.secondary' }}>
                                        No members with available bandwidth in this team
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<AssessmentIcon />}
              onClick={() => router.push('/dashboard/areas')}
              sx={{ borderRadius: '8px' }}
            >
              Manage Planning
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<GroupIcon />}
              onClick={() => router.push('/dashboard/pods')}
              sx={{ borderRadius: '8px' }}
            >
              Manage Execution
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<PersonIcon />}
              onClick={() => router.push('/dashboard/members')}
              sx={{ borderRadius: '8px' }}
            >
              View Members
            </Button>
          </Grid>
          {user?.team !== 'POD committee' && (
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<TrendingUpIcon />}
                onClick={() => router.push('/dashboard/my-pods')}
                sx={{ borderRadius: '8px' }}
              >
                My PODs
              </Button>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Assignment Dialog */}
      <Dialog 
        open={assignmentDialog.open} 
        onClose={handleCloseAssignmentDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <span>Assign to POD</span>
            <IconButton onClick={handleCloseAssignmentDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {assignmentDialog.formData && (
            <Box sx={{ pt: 2 }}>
              <TextField
                label="Member"
                value={assignmentDialog.formData.memberName}
                fullWidth
                margin="normal"
                InputProps={{
                  readOnly: true,
                }}
              />
              
              <TextField
                label="Bandwidth"
                type="number"
                value={assignmentDialog.formData.bandwidth}
                onChange={(e) => {
                  const value = parseFloat(e.target.value)
                  if (!isNaN(value) && value >= 0 && value <= assignmentDialog.formData!.maxBandwidth) {
                    setAssignmentDialog(prev => ({
                      ...prev,
                      formData: prev.formData ? {
                        ...prev.formData,
                        bandwidth: value
                      } : null
                    }))
                  }
                }}
                fullWidth
                margin="normal"
                InputProps={{
                  endAdornment: <InputAdornment position="end">/ {assignmentDialog.formData.maxBandwidth.toFixed(2)}</InputAdornment>,
                  inputProps: {
                    min: 0,
                    max: assignmentDialog.formData.maxBandwidth,
                    step: 0.1
                  }
                }}
              />
              
              <TextField
                select
                label="Select POD"
                value={assignmentDialog.formData.podId}
                onChange={(e) => {
                  setAssignmentDialog(prev => ({
                    ...prev,
                    formData: prev.formData ? {
                      ...prev.formData,
                      podId: e.target.value
                    } : null
                  }))
                }}
                fullWidth
                margin="normal"
                required
                SelectProps={{
                  native: true
                }}
              >
                <option value="">Select a POD</option>
                {pods.map((pod) => (
                  <option key={pod.id} value={pod.id}>
                    {pod.name || `POD ${pod.id}`}
                  </option>
                ))}
              </TextField>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={handleCloseAssignmentDialog} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleAssignmentSubmit} 
            variant="contained"
            disabled={!assignmentDialog.formData}
          >
            Assign to POD
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}