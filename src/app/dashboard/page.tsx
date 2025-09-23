'use client'

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
  CircularProgress
} from '@mui/material'
import {
  Assessment as AssessmentIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material'
import { getPods, getMembers, getAreas, getAvailableMembers } from '@/lib/data'

interface TeamBandwidthData {
  team: string
  assignedCapacity: number
  availableCapacity: number
  members: any[]
}

export default function DashboardPage() {
  const router = useRouter()
  const [bandwidthData, setBandwidthData] = useState<TeamBandwidthData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchBandwidthData()
  }, [])

  const fetchBandwidthData = async () => {
    try {
      const [members, pods] = await Promise.all([
        getMembers(),
        getPods()
      ])

      // Group members by team
      const teamGroups = members.reduce((acc: any, member: any) => {
        const team = member.team || 'Unassigned'
        if (!acc[team]) {
          acc[team] = []
        }
        acc[team].push(member)
        return acc
      }, {})

      // Calculate bandwidth for each team
      const teamData: TeamBandwidthData[] = Object.entries(teamGroups).map(([team, teamMembers]: [string, any]) => {
        const totalCapacity = teamMembers.length * 100 // Assuming 100% capacity per member
        let assignedCapacity = 0

        // Calculate assigned capacity from POD assignments
        teamMembers.forEach((member: any) => {
          if (member.pod_members) {
            member.pod_members.forEach((pm: any) => {
              assignedCapacity += pm.bandwidth_percentage || 0
            })
          }
        })

        const availableCapacity = Math.max(0, totalCapacity - assignedCapacity)

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
                    {totalAssignedCapacity}%
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
                    {totalAvailableCapacity}%
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
          <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentIcon />
            Team-wise Bandwidth Allocation
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
                    <TableRow key={team.team} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
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
                          {team.assignedCapacity}%
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography 
                          variant="body1" 
                          fontWeight="medium"
                          color={capacityColor}
                        >
                          {team.availableCapacity}%
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
                            {utilizationPercentage.toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
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
            >
              Manage Areas
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<GroupIcon />}
              onClick={() => router.push('/dashboard/pods')}
            >
              Manage PODs
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<PersonIcon />}
              onClick={() => router.push('/dashboard/members')}
            >
              View Members
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<TrendingUpIcon />}
              onClick={() => router.push('/dashboard/my-pods')}
            >
              My PODs
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  )
}