'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Switch,
  FormControlLabel,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Chip,
  Paper
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  Business as AreasIcon,
  Inventory as PodsIcon,
  Assignment as MyPodsIcon,
  People as MembersIcon,
  Person as ProfileIcon,
  DarkMode as DarkModeIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon
} from '@mui/icons-material'
import { getCurrentUser, signOut, type Profile } from '@/lib/auth'
import { useTheme } from './ThemeProvider'

const drawerWidth = 240

const menuItems = [
  { icon: DashboardIcon, label: 'Dashboard', href: '/dashboard' },
  { icon: AreasIcon, label: 'Areas', href: '/dashboard/areas', requirePODCommittee: true },
  { icon: PodsIcon, label: 'PODs', href: '/dashboard/pods', requirePODCommittee: true },
  { icon: MyPodsIcon, label: 'My PODs', href: '/dashboard/my-pods' },
  { icon: MembersIcon, label: 'Members', href: '/dashboard/members', requirePODCommittee: true },
  { icon: ProfileIcon, label: 'Profile', href: '/dashboard/profile' },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(true)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const { darkMode, setDarkMode } = useTheme()

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          // Only redirect if we're not already on the login page
          if (pathname !== '/auth/login') {
            router.push('/auth/login')
          }
          return
        }
        setUser(currentUser)
        setLoading(false)
      } catch (error) {
        console.error('Error loading user:', error)
        if (pathname !== '/auth/login') {
          router.push('/auth/login')
        }
      }
    }
    loadUser()
  }, [router, pathname])

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleDesktopDrawerToggle = () => {
    setDesktopOpen(!desktopOpen)
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/auth/login')
  }

  const isPODCommittee = user?.team === 'POD committee'

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography>Loading...</Typography>
      </Box>
    )
  }

  const drawer = (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: darkMode ? 'background.paper' : 'background.paper'
    }}>
      <Toolbar sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        minHeight: '64px !important'
      }}>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
          POD Management
        </Typography>
      </Toolbar>
      <Divider />
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List sx={{ px: 1, py: 2 }}>
          {menuItems.map((item) => {
            if (item.requirePODCommittee && !isPODCommittee) return null
            
            const isActive = pathname === item.href
            return (
              <ListItem key={item.label} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={isActive}
                  onClick={() => router.push(item.href)}
                  sx={{
                    borderRadius: 2,
                    mx: 1,
                    py: 1.5,
                    transition: 'all 0.2s ease-in-out',
                    '&.Mui-selected': {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'white',
                      }
                    },
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      transform: 'translateX(4px)',
                    }
                  }}
                >
                  <ListItemIcon sx={{ 
                    minWidth: 40,
                    transition: 'color 0.2s ease-in-out'
                  }}>
                    <item.icon />
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.label} 
                    primaryTypographyProps={{ 
                      fontWeight: isActive ? 600 : 400,
                      fontSize: '0.95rem'
                    }}
                  />
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
      </Box>
      <Divider />
      <Box sx={{ p: 2, backgroundColor: 'background.paper' }}>
        <Paper 
          elevation={1}
          sx={{ 
            p: 2, 
            borderRadius: 2,
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white'
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: 'white',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  },
                }}
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <DarkModeIcon sx={{ fontSize: 18 }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {darkMode ? 'Dark' : 'Light'} Mode
                </Typography>
              </Box>
            }
            sx={{ 
              m: 0,
              '& .MuiFormControlLabel-label': {
                color: 'white',
                fontWeight: 500
              }
            }}
          />
        </Paper>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: desktopOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
          ml: { sm: desktopOpen ? `${drawerWidth}px` : 0 },
          transition: 'all 0.3s ease',
          background: darkMode 
            ? 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
          backdropFilter: 'blur(10px)',
          borderBottom: darkMode 
            ? '1px solid rgba(255,255,255,0.08)'
            : '1px solid rgba(0,0,0,0.08)',
          '&.MuiAppBar-root': {
            color: 'text.primary',
          },
          '&.MuiAppBar-colorPrimary': {
            backgroundColor: 'transparent',
          }
        }}
      >
        <Toolbar sx={{ minHeight: '64px !important' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 2, 
              display: { sm: 'none' },
              backgroundColor: 'rgba(0,0,0,0.04)',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.08)',
              }
            }}
          >
            <MenuIcon />
          </IconButton>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            edge="start"
            onClick={handleDesktopDrawerToggle}
            sx={{ 
              mr: 2, 
              display: { xs: 'none', sm: 'block' },
              backgroundColor: 'rgba(0,0,0,0.04)',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.08)',
              }
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '1.5rem'
            }}
          >
            {menuItems.find(item => item.href === pathname)?.label || 'Dashboard'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              px: 2,
              py: 1,
              borderRadius: 2,
              backgroundColor: 'rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.08)'
            }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {user?.name}
              </Typography>
              <Chip 
                label={user?.team || 'Member'} 
                size="small" 
                sx={{ 
                  backgroundColor: 'primary.main',
                  color: 'white',
                  fontWeight: 500,
                  fontSize: '0.75rem'
                }}
              />
            </Box>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenuOpen}
              sx={{
                backgroundColor: 'primary.main',
                color: 'white',
                width: 40,
                height: 40,
                '&:hover': {
                  backgroundColor: 'primary.dark',
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <Avatar sx={{ width: 32, height: 32, backgroundColor: 'transparent' }}>
                {user?.name?.charAt(0)}
              </Avatar>
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={() => { router.push('/dashboard/profile'); handleMenuClose(); }}>
                <ListItemIcon>
                  <ProfileIcon fontSize="small" />
                </ListItemIcon>
                Profile
              </MenuItem>
              <MenuItem onClick={() => { handleLogout(); handleMenuClose(); }}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: desktopOpen ? drawerWidth : 0,
              transition: 'width 0.3s ease',
              overflow: 'hidden',
            },
          }}
          open={desktopOpen}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: desktopOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
          transition: 'all 0.3s ease',
          background: darkMode 
            ? 'linear-gradient(135deg, #000000 0%, #111827 100%)'
            : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <Box sx={{ 
          maxWidth: '1400px', 
          mx: 'auto',
          '& > *': {
            animation: 'fadeIn 0.5s ease-in-out'
          }
        }}>
          {children}
        </Box>
      </Box>
    </Box>
  )
}
