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
  Schedule as TimeIcon
} from '@mui/icons-material'
import { getPods, getMembers, getAreas } from '@/lib/data'

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [pods, members, areas] = await Promise.all([
          getPods(),
          getMembers(),
          getAreas()
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

        setStats({
          totalPods: pods.length,
          activePods,
          totalMembers: members.length,
          totalAreas: areas.length,
          avgDeliveryTime
        })
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
      </Grid>
    </Box>
  )
}
