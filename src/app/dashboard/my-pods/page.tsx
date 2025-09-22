'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Grid
} from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { getPods } from '@/lib/data'
import { getCurrentUser } from '@/lib/auth'
import { type Pod } from '@/lib/supabase'

export default function MyPodsPage() {
  const [pods, setPods] = useState<Pod[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [podsData, currentUser] = await Promise.all([
        getPods(),
        getCurrentUser()
      ])
      
      setUser(currentUser)
      
      if (!currentUser) {
        console.error('No current user found - please ensure you are logged in')
        setPods([])
        return
      }
      
      // Filter PODs where user is a member
      const userPods = podsData.filter(pod => 
        pod.members?.some(member => member.member_id === currentUser.id)
      )
      
      setPods(userPods)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
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

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'POD Name', width: 200 },
    { field: 'description', headerName: 'Description', width: 300 },
    { 
      field: 'area', 
      headerName: 'Area', 
      width: 150,
      valueGetter: (params: any) => params.row.area?.name || 'N/A'
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 150,
      renderCell: (params: any) => (
        <Chip 
          label={params.value} 
          color={getStatusColor(params.value) as any}
          size="small"
        />
      )
    },
    { field: 'start_date', headerName: 'Start Date', width: 120 },
    { field: 'end_date', headerName: 'End Date', width: 120 },
    {
      field: 'my_role',
      headerName: 'My Role',
      width: 120,
      renderCell: (params: any) => {
        const myMembership = params.row.members?.find((member: any) => 
          member.member_id === user?.id
        )
        return (
          <Chip 
            label={myMembership?.is_leader ? 'Leader' : 'Member'}
            color={myMembership?.is_leader ? 'primary' : 'default'}
            size="small"
          />
        )
      }
    },
    {
      field: 'my_bandwidth',
      headerName: 'My Bandwidth',
      width: 120,
      renderCell: (params: any) => {
        const myMembership = params.row.members?.find((member: any) => 
          member.member_id === user?.id
        )
        return (
          <Typography variant="body2">
            {myMembership?.bandwidth_percentage || 0}%
          </Typography>
        )
      }
    }
  ]

  if (loading) {
    return <Typography>Loading...</Typography>
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        My PODs
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        PODs where you are assigned as a team member
      </Typography>

      {pods.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              No PODs Assigned
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You are not currently assigned to any PODs. Contact your POD Committee to get assigned to a project.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <DataGrid
              rows={pods}
              columns={columns}
              pageSizeOptions={[5, 10, 25]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } }
              }}
              disableRowSelectionOnClick
              autoHeight
            />
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                My POD Summary
              </Typography>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Total PODs</Typography>
                <Typography variant="body2" fontWeight="bold">{pods.length}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">As Leader</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {pods.filter(pod => 
                    pod.members?.some(member => 
                      member.member_id === user?.id && member.is_leader
                    )
                  ).length}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">As Member</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {pods.filter(pod => 
                    pod.members?.some(member => 
                      member.member_id === user?.id && !member.is_leader
                    )
                  ).length}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Bandwidth Allocation
              </Typography>
              <Typography variant="h3" color="primary">
                {pods.reduce((total, pod) => {
                  const myMembership = pod.members?.find(member => 
                    member.member_id === user?.id
                  )
                  return total + (myMembership?.bandwidth_percentage || 0)
                }, 0)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Across {pods.length} POD{pods.length !== 1 ? 's' : ''}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
