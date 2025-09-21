'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Chip
} from '@mui/material'
import {
  Inventory as PodsIcon,
  People as MembersIcon,
  Business as AreasIcon,
  Schedule as TimeIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material'
import { getPods, getMembers, getAreas, getAvailableMembers } from '@/lib/data'

interface DashboardStats {
  totalPods: number
  activePods: number
  totalMembers: number
  totalAreas: number
  avgDeliveryTime: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPods: 0,
    activePods: 0,
    totalMembers: 0,
    totalAreas: 0,
    avgDeliveryTime: 0
  })
  const [upcomingReleases, setUpcomingReleases] = useState<any[]>([])
  const [availableMembers, setAvailableMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [pods, members, areas, availableMembersData] = await Promise.all([
          getPods(),
          getMembers(),
          getAreas(),
          getAvailableMembers()
        ])

        const activePods = pods.filter(pod => pod.status !== 'backlog').length
        const releasedPods = pods.filter(pod => pod.status === 'released')
        
        const avgDeliveryTime = releasedPods.length > 0
          ? Math.round(
              releasedPods.reduce((sum, pod) => {
                const start = new Date(pod.created_at)
                const end = new Date(pod.updated_at)
                return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
              }, 0) / releasedPods.length
            )
          : 0

        // Get upcoming releases (PODs ending next week)
        const nextWeek = new Date()
        nextWeek.setDate(nextWeek.getDate() + 7)
        const upcomingReleasesData = pods.filter(pod => {
          if (!pod.end_date) return false
          const endDate = new Date(pod.end_date)
          const today = new Date()
          return endDate >= today && endDate <= nextWeek
        })

        setStats({
          totalPods: pods.length,
          activePods,
          totalMembers: members.length,
          totalAreas: areas.length,
          avgDeliveryTime
        })
        setUpcomingReleases(upcomingReleasesData)
        setAvailableMembers(availableMembersData)
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    {
      title: 'Total PODs',
      value: stats.totalPods,
      icon: PodsIcon,
      color: 'primary'
    },
    {
      title: 'Active PODs',
      value: stats.activePods,
      icon: PodsIcon,
      color: 'success'
    },
    {
      title: 'Members',
      value: stats.totalMembers,
      icon: MembersIcon,
      color: 'info'
    },
    {
      title: 'Areas',
      value: stats.totalAreas,
      icon: AreasIcon,
      color: 'warning'
    }
  ]

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {statCards.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.title}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      {stat.title}
                    </Typography>
                    <Typography variant="h4">
                      {stat.value}
                    </Typography>
                  </Box>
                  <stat.icon color={stat.color as any} sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Average Delivery Time
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <TimeIcon color="primary" />
                <Typography variant="h4">
                  {stats.avgDeliveryTime}
                </Typography>
                <Typography color="textSecondary">
                  days
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                POD Status Distribution
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Chip label="Backlog" color="default" />
                <Chip label="Planning" color="info" />
                <Chip label="In Development" color="primary" />
                <Chip label="Testing" color="warning" />
                <Chip label="Ready for Release" color="secondary" />
                <Chip label="Released" color="success" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Releases */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <WarningIcon color="warning" />
                <Typography variant="h6">
                  Upcoming Releases
                </Typography>
                <Chip 
                  label={upcomingReleases.length} 
                  color="warning" 
                  size="small" 
                />
              </Box>
              {upcomingReleases.length > 0 ? (
                <Box>
                  {upcomingReleases.slice(0, 3).map((pod) => (
                    <Box key={pod.id} mb={1}>
                      <Typography variant="body2" fontWeight="bold">
                        {pod.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Ends: {new Date(pod.end_date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  ))}
                  {upcomingReleases.length > 3 && (
                    <Typography variant="caption" color="text.secondary">
                      +{upcomingReleases.length - 3} more...
                    </Typography>
                  )}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No releases scheduled for next week
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Available Members */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <TrendingUpIcon color="success" />
                <Typography variant="h6">
                  Available Members
                </Typography>
                <Chip 
                  label={availableMembers.length} 
                  color="success" 
                  size="small" 
                />
              </Box>
              {availableMembers.length > 0 ? (
                <Box>
                  {availableMembers.slice(0, 3).map((member) => (
                    <Box key={member.id} mb={1}>
                      <Typography variant="body2" fontWeight="bold">
                        {member.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {member.available_bandwidth}% bandwidth available
                      </Typography>
                    </Box>
                  ))}
                  {availableMembers.length > 3 && (
                    <Typography variant="caption" color="text.secondary">
                      +{availableMembers.length - 3} more...
                    </Typography>
                  )}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No available members
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
