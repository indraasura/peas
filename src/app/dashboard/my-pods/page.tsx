'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Package,
  Users,
  Calendar,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  Play,
  User,
} from 'lucide-react'
import { getPods } from '@/lib/data'
import { getCurrentUser, type Profile } from '@/lib/auth'
import { type Pod } from '@/lib/supabase'

export default function MyPodsPage() {
  const [pods, setPods] = useState<Pod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState<Profile | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        setError('User not authenticated')
        return
      }

      setUser(currentUser)
      const podsData = await getPods()
      
      // Filter pods where the current user is a member
      const userPods = podsData.filter(pod => 
        pod.members?.some(member => member.member_id === currentUser.id)
      )
      
      setPods(userPods)
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load your PODs')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Awaiting development': return 'bg-gray-100 text-gray-800'
      case 'In development': return 'bg-blue-100 text-blue-800'
      case 'In testing': return 'bg-yellow-100 text-yellow-800'
      case 'Released': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Awaiting development': return <Clock className="h-4 w-4" />
      case 'In development': return <Play className="h-4 w-4" />
      case 'In testing': return <CheckCircle className="h-4 w-4" />
      case 'Released': return <Package className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const calculateMyTotalBandwidth = () => {
    return pods.reduce((total, pod) => {
      const myMembership = pod.members?.find(member =>
        member.member_id === user?.id
      )
      return total + (myMembership?.bandwidth_percentage || 0)
    }, 0)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">My PODs</h1>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {pods.length} POD{pods.length !== 1 ? 's' : ''} Assigned
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PODs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pods.length}</div>
            <p className="text-xs text-muted-foreground">
              PODs you're assigned to
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bandwidth</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculateMyTotalBandwidth().toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Your total bandwidth allocation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active PODs</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pods.filter(pod => pod.status === 'In development').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently in development
            </p>
          </CardContent>
        </Card>
      </div>

      {pods.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No PODs Assigned</h3>
            <p className="text-muted-foreground text-center">
              You haven't been assigned to any PODs yet. Contact your POD committee to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Your POD Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>POD Name</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>My Bandwidth</TableHead>
                  <TableHead>Total Team Bandwidth</TableHead>
                  <TableHead>Team Size</TableHead>
                  <TableHead>My Role</TableHead>
                  <TableHead>Timeline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pods.map((pod) => {
                  const myMembership = pod.members?.find(member =>
                    member.member_id === user?.id
                  )
                  const totalBandwidth = pod.members?.reduce((sum, member) =>
                    sum + (member.bandwidth_percentage || 0), 0) || 0
                  
                  return (
                    <TableRow key={pod.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{pod.name}</div>
                          {pod.description && (
                            <div className="text-sm text-muted-foreground line-clamp-2">
                              {pod.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {pod.area?.name || 'No Area'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(pod.status || 'Awaiting development')}
                          <Badge className={getStatusColor(pod.status || 'Awaiting development')}>
                            {pod.status || 'Awaiting development'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {(myMembership?.bandwidth_percentage || 0).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {totalBandwidth.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {pod.members?.length || 0} member{(pod.members?.length || 0) !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {myMembership?.is_leader ? (
                          <Badge variant="secondary">Leader</Badge>
                        ) : (
                          <Badge variant="outline">Member</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          {pod.start_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Start: {new Date(pod.start_date).toLocaleDateString()}</span>
                            </div>
                          )}
                          {pod.end_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>End: {new Date(pod.end_date).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Team Members Overview */}
      {pods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pods.map((pod) => {
                const myMembership = pod.members?.find(member =>
                  member.member_id === user?.id
                )
                
                return (
                  <div key={pod.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{pod.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        My Bandwidth: {(myMembership?.bandwidth_percentage || 0).toFixed(2)}
                      </Badge>
                    </div>
                    
                    {pod.members && pod.members.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {pod.members.map((member) => (
                          <div
                            key={member.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${
                              member.member_id === user?.id
                                ? 'bg-primary/10 border-primary'
                                : 'bg-muted border-border'
                            }`}
                          >
                            <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                              {member.member?.name?.charAt(0)}
                            </div>
                            <span>{member.member?.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {(member.bandwidth_percentage || 0).toFixed(2)}
                            </Badge>
                            {member.is_leader && (
                              <Badge variant="secondary" className="text-xs">
                                Leader
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
