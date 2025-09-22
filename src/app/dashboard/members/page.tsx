'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { getMembers } from '@/lib/data'
import { type Profile } from '@/lib/supabase'

export default function MembersPage() {
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [teamFilter, setTeamFilter] = useState('all')

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      const membersData = await getMembers()
      // Calculate bandwidth for each member
      const membersWithBandwidth = membersData.map(member => {
        const usedBandwidth = member.pod_members?.reduce((sum: number, pm: any) => 
          sum + (pm.bandwidth_percentage || 0), 0) || 0
        return {
          ...member,
          bandwidth: usedBandwidth
        }
      })
      setMembers(membersWithBandwidth)
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = teamFilter === 'all' 
    ? members 
    : members.filter(member => member.team === teamFilter)

  const uniqueTeams = Array.from(new Set(members.map(member => member.team)))

  const getBandwidthColor = (bandwidth: number) => {
    if (bandwidth >= 80) return 'error'
    if (bandwidth >= 60) return 'warning'
    if (bandwidth >= 40) return 'info'
    return 'success'
  }

  const getAvailabilityText = (bandwidth: number) => {
    if (bandwidth >= 80) return 'High'
    if (bandwidth >= 60) return 'Medium'
    if (bandwidth >= 40) return 'Low'
    return 'Available'
  }

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'email', headerName: 'Email', width: 250 },
    { 
      field: 'team', 
      headerName: 'Team', 
      width: 150,
      renderCell: (params: any) => (
        <Chip 
          label={params.value} 
          color={params.value === 'POD committee' ? 'primary' : 'default'}
          size="small"
        />
      )
    },
    { 
      field: 'remaining_bandwidth', 
      headerName: 'Remaining Bandwidth', 
      width: 150,
      renderCell: (params: any) => {
        const usedBandwidth = params.row.bandwidth || 0
        const remainingBandwidth = Math.max(0, 100 - usedBandwidth)
        return (
          <Box>
            <Typography variant="body2">
              {remainingBandwidth}%
            </Typography>
          </Box>
        )
      }
    },
    { 
      field: 'member_usage', 
      headerName: 'Member Usage', 
      width: 120,
      renderCell: (params: any) => {
        const bandwidth = params.row.bandwidth || 0
        return (
          <Chip 
            label={getAvailabilityText(bandwidth)}
            color={getBandwidthColor(bandwidth) as any}
            size="small"
          />
        )
      }
    },
    { 
      field: 'assigned_pods', 
      headerName: 'Assigned PODs', 
      width: 200,
      renderCell: (params: any) => {
        const podNames = params.row.pod_members?.map((pm: any) => pm.pod?.name).filter(Boolean) || []
        return (
          <Typography variant="body2">
            {podNames.length > 0 ? podNames.join(', ') : 'No PODs'}
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Members</Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Team</InputLabel>
          <Select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            label="Filter by Team"
          >
            <MenuItem value="all">All Teams</MenuItem>
            {uniqueTeams.map((team) => (
              <MenuItem key={team} value={team}>
                {team}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Card>
        <CardContent>
          <DataGrid
            rows={filteredMembers}
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

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Team Distribution
              </Typography>
              {uniqueTeams.map((team) => {
                const count = members.filter(m => m.team === team).length
                return (
                  <Box key={team} display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">{team}</Typography>
                    <Typography variant="body2" fontWeight="bold">{count}</Typography>
                  </Box>
                )
              })}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Availability Status
              </Typography>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Available</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {members.filter(m => (m.bandwidth || 0) === 0).length}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Low Utilization</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {members.filter(m => (m.bandwidth || 0) > 0 && (m.bandwidth || 0) < 40).length}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Medium Utilization</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {members.filter(m => (m.bandwidth || 0) >= 40 && (m.bandwidth || 0) < 80).length}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">High Utilization</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {members.filter(m => (m.bandwidth || 0) >= 80).length}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Members
              </Typography>
              <Typography variant="h3" color="primary">
                {members.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Across {uniqueTeams.length} teams
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
