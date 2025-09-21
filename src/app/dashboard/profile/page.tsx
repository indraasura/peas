'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Grid,
  Divider
} from '@mui/material'
import { getCurrentUser } from '@/lib/auth'
import { type Profile } from '@/lib/supabase'

export default function ProfilePage() {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [])

  if (loading) {
    return <Typography>Loading...</Typography>
  }

  if (!user) {
    return <Typography>User not found</Typography>
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  mx: 'auto',
                  mb: 2,
                  fontSize: '2rem'
                }}
              >
                {user.name.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="h5" gutterBottom>
                {user.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {user.email}
              </Typography>
              <Chip
                label={user.team}
                color={user.team === 'POD committee' ? 'primary' : 'default'}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Full Name
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {user.name}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Email Address
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {user.email}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Team
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {user.team}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Member Since
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {new Date(user.created_at).toLocaleDateString()}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Permissions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box>
                {user.team === 'POD committee' ? (
                  <Box>
                    <Typography variant="body1" gutterBottom>
                      As a POD Committee member, you have full access to:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2 }}>
                      <li>Create and manage PODs</li>
                      <li>Manage Areas and their configurations</li>
                      <li>View and manage all team members</li>
                      <li>Access all POD details and notes</li>
                      <li>Assign members to PODs</li>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body1" gutterBottom>
                      As a team member, you have access to:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2 }}>
                      <li>View your assigned PODs</li>
                      <li>View POD details and notes</li>
                      <li>Update your profile information</li>
                      <li>View team members (read-only)</li>
                    </Box>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
