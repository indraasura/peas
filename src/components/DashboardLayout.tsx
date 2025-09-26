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
  Paper,
  Tooltip
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
  Menu as MenuIcon,
  Settings as SettingsIcon,
  Close as CloseIcon
} from '@mui/icons-material'
import { getCurrentUser, signOut, type Profile } from '@/lib/auth'
import { useTheme } from './ThemeProvider'

const drawerWidth = 280
const collapsedDrawerWidth = 64

const menuItems = [
  { icon: DashboardIcon, label: 'Dashboard', href: '/dashboard' },
  { icon: AreasIcon, label: 'Planning', href: '/dashboard/areas', requirePODCommittee: true },
  { icon: PodsIcon, label: 'Execution', href: '/dashboard/pods', requirePODCommittee: true },
  { icon: SettingsIcon, label: 'POD Management', href: '/dashboard/pod-management', requirePODCommittee: true },
  { icon: MyPodsIcon, label: 'My PODs', href: '/dashboard/my-pods', hideFromPODCommittee: true },
  { icon: MembersIcon, label: 'Members', href: '/dashboard/members', requirePODCommittee: true },
  { icon: ProfileIcon, label: 'Profile', href: '/dashboard/profile' },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(false)
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
      backgroundColor: darkMode ? '#0F172A' : '#FAFAFA',
      width: drawerWidth,
      borderRight: darkMode ? '1px solid #1E293B' : '1px solid #E2E8F0'
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 3,
        borderBottom: darkMode ? '1px solid #1E293B' : '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box display="flex" alignItems="center">
          <Box sx={{ 
            width: 32, 
            height: 32, 
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            <img 
              src="/images/logo.png" 
              alt="Kynetik Logo" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain' 
              }} 
            />
          </Box>
          <Typography variant="h6" sx={{ 
            fontWeight: 700, 
            color: darkMode ? '#F8FAFC' : '#0F172A',
            ml: 2,
            fontSize: '18px'
          }}>
            Kynetik
          </Typography>
        </Box>
        <IconButton
          onClick={handleDesktopDrawerToggle}
          sx={{
            color: darkMode ? '#94A3B8' : '#64748B',
            '&:hover': {
              backgroundColor: darkMode ? '#1E293B' : '#F1F5F9',
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>
      
      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        <List sx={{ px: 2 }}>
          {menuItems.map((item) => {
            if (item.requirePODCommittee && !isPODCommittee) return null
            if (item.hideFromPODCommittee && isPODCommittee) return null
            
            const isActive = pathname === item.href
            return (
              <ListItem key={item.label} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={isActive}
                  onClick={() => router.push(item.href)}
                  sx={{
                    borderRadius: '12px',
                    py: 1.5,
                    px: 2,
                    transition: 'all 0.2s ease-in-out',
                    '&.Mui-selected': {
                      backgroundColor: darkMode ? '#1E40AF' : '#EBF8FF',
                      color: darkMode ? '#60A5FA' : '#1D4ED8',
                      '&:hover': {
                        backgroundColor: darkMode ? '#1E40AF' : '#EBF8FF',
                      }
                    },
                    '&:hover': {
                      backgroundColor: darkMode ? '#1E293B' : '#F1F5F9',
                    }
                  }}
                >
                  <ListItemIcon sx={{ 
                    minWidth: 40,
                    color: isActive 
                      ? (darkMode ? '#60A5FA' : '#1D4ED8')
                      : (darkMode ? '#94A3B8' : '#64748B'),
                  }}>
                    <item.icon sx={{ fontSize: 22 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.label}
                    sx={{
                      '& .MuiListItemText-primary': {
                        fontSize: '14px',
                        fontWeight: isActive ? 600 : 500,
                        color: isActive 
                          ? (darkMode ? '#60A5FA' : '#1D4ED8')
                          : (darkMode ? '#94A3B8' : '#64748B')
                      }
                    }}
                  />
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
      </Box>
      
      <Box sx={{ p: 2, borderTop: darkMode ? '1px solid #374151' : '1px solid #E5E7EB' }}>
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#2196F3',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#2196F3',
                  },
                }}
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <DarkModeIcon sx={{ fontSize: 18, color: darkMode ? '#9CA3AF' : '#666666' }} />
                <Typography variant="body2" sx={{ fontWeight: 500, color: darkMode ? '#F9FAFB' : '#333333' }}>
                  Switch to dark mode
                </Typography>
              </Box>
            }
            sx={{ 
              m: 0,
              '& .MuiFormControlLabel-label': {
                color: darkMode ? '#F9FAFB' : '#333333',
                fontWeight: 500
              }
            }}
          />
        </Box>
        
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 1,
            py: 1.5,
            px: 2,
            '&:hover': {
              backgroundColor: darkMode ? '#374151' : '#F5F5F5',
            }
          }}
        >
          <ListItemIcon sx={{ 
            minWidth: 40,
            color: darkMode ? '#9CA3AF' : '#666666'
          }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Logout" 
            primaryTypographyProps={{ 
              fontWeight: 400,
              fontSize: '0.95rem',
              color: darkMode ? '#F9FAFB' : '#333333'
            }}
          />
        </ListItemButton>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: '100%',
          ml: 0,
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
          <Tooltip title={desktopOpen ? "Close sidebar" : "Open sidebar"}>
            <IconButton
              color="inherit"
              aria-label="toggle drawer"
              edge="start"
              onClick={handleDesktopDrawerToggle}
              sx={{ 
                mr: 2, 
                display: { xs: 'none', sm: 'block' },
                backgroundColor: darkMode ? '#1E293B' : '#F1F5F9',
                color: darkMode ? '#F8FAFC' : '#0F172A',
                borderRadius: '8px',
                '&:hover': {
                  backgroundColor: darkMode ? '#334155' : '#E2E8F0',
                }
              }}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>
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
          variant="temporary"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
            },
          }}
          open={desktopOpen}
          onClose={handleDesktopDrawerToggle}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: '100%',
          background: darkMode 
            ? 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)'
            : '#FFFFFF',
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <Box sx={{ 
          maxWidth: '100%', 
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
