'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart3,
  Users,
  Building2,
  Package,
  User,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import { getPods, getMembers, getAreas, getAvailableMembers } from '@/lib/data'
import { getCurrentUser, type Profile } from '@/lib/auth'

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
  const [user, setUser] = useState<Profile | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [currentUser] = await Promise.all([
        getCurrentUser(),
        fetchBandwidthData()
      ])
      setUser(currentUser)
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

      // Group members by team
      const teamGroups = members.reduce((acc: any, member: any) => {
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
    if (percentage > 30) return 'text-green-600'
    if (percentage > 10) return 'text-orange-600'
    return 'text-red-600'
  }

  const getCapacityStatus = (availableCapacity: number, assignedCapacity: number) => {
    const totalCapacity = assignedCapacity + availableCapacity
    const percentage = (availableCapacity / totalCapacity) * 100
    if (percentage > 30) return 'Healthy'
    if (percentage > 10) return 'Moderate'
    return 'Critical'
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Healthy': return 'default'
      case 'Moderate': return 'secondary'
      case 'Critical': return 'destructive'
      default: return 'default'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const totalAvailableCapacity = bandwidthData.reduce((sum, team) => sum + team.availableCapacity, 0)
  const totalAssignedCapacity = bandwidthData.reduce((sum, team) => sum + team.assignedCapacity, 0)
  const totalCapacity = totalAssignedCapacity + totalAvailableCapacity

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Capacity Management Dashboard</h1>
        <Button onClick={() => router.push('/dashboard/areas')}>
          <Building2 className="mr-2 h-4 w-4" />
          Manage Areas
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Capacity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssignedCapacity.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Capacity</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getCapacityColor(totalAvailableCapacity, totalAssignedCapacity)}`}>
              {totalAvailableCapacity.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team-wise Bandwidth Allocation Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Team-wise Bandwidth Allocation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead className="text-center">Assigned Capacity</TableHead>
                <TableHead className="text-center">Available Capacity</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Utilization</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bandwidthData.map((team) => {
                const totalTeamCapacity = team.assignedCapacity + team.availableCapacity
                const utilizationPercentage = (team.assignedCapacity / totalTeamCapacity) * 100
                const status = getCapacityStatus(team.availableCapacity, team.assignedCapacity)
                
                return (
                  <TableRow key={team.team}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span className="font-medium">{team.team}</span>
                        <Badge variant="outline" className="text-xs">
                          {team.members.length} members
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {team.assignedCapacity.toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-center font-medium ${getCapacityColor(team.availableCapacity, team.assignedCapacity)}`}>
                      {team.availableCapacity.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getStatusVariant(status)}>
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="space-y-2">
                        <Progress value={utilizationPercentage} className="w-full" />
                        <div className="text-sm text-muted-foreground">
                          {(utilizationPercentage / 100).toFixed(3)}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center space-y-2"
            onClick={() => router.push('/dashboard/areas')}
          >
            <Building2 className="h-6 w-6" />
            <span>Manage Planning</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center space-y-2"
            onClick={() => router.push('/dashboard/pods')}
          >
            <Package className="h-6 w-6" />
            <span>Manage Execution</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center space-y-2"
            onClick={() => router.push('/dashboard/members')}
          >
            <Users className="h-6 w-6" />
            <span>View Members</span>
          </Button>
          {user?.team !== 'POD committee' && (
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => router.push('/dashboard/my-pods')}
            >
              <User className="h-6 w-6" />
              <span>My PODs</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
