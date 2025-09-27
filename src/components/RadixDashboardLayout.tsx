'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  Building2,
  Package,
  ClipboardList,
  Users,
  User,
  Moon,
  LogOut,
  Menu,
  X,
  Settings,
} from 'lucide-react'
import { getCurrentUser, signOut, type Profile } from '@/lib/auth'
import { useTheme } from './ThemeProvider'

const drawerWidth = 280
const collapsedDrawerWidth = 64

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Building2, label: 'Planning', href: '/dashboard/areas', requirePODCommittee: true },
  { icon: Package, label: 'Execution', href: '/dashboard/pods', requirePODCommittee: true },
  { icon: Settings, label: 'POD Management', href: '/dashboard/pod-management', requirePODCommittee: true },
  { icon: ClipboardList, label: 'My PODs', href: '/dashboard/my-pods', hideFromPODCommittee: true },
  { icon: Users, label: 'Members', href: '/dashboard/members', requirePODCommittee: true },
  { icon: User, label: 'Profile', href: '/dashboard/profile' },
]

export function RadixDashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { darkMode, setDarkMode } = useTheme()

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
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

  const handleLogout = async () => {
    await signOut()
    router.push('/auth/login')
  }

  const isPODCommittee = user?.team === 'POD committee'

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  const drawer = (
    <div className={cn(
      "h-full flex flex-col",
      "bg-card border-r border-border",
      "w-[280px]"
    )}>
      {/* Header */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
            <img 
              src="/images/logo.png" 
              alt="Kynetik Logo" 
              className="w-full h-full object-contain" 
            />
          </div>
          <h1 className="ml-3 text-lg font-bold text-foreground">
            Kynetik
          </h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDesktopDrawerToggle}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Navigation */}
      <div className="flex-1 overflow-auto py-2 px-3">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            if (item.requirePODCommittee && !isPODCommittee) return null
            if (item.hideFromPODCommittee && isPODCommittee) return null
            
            const isActive = pathname === item.href
            const Icon = item.icon
            
            return (
              <Button
                key={item.label}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start h-12 px-3",
                  isActive && "bg-primary/10 text-primary hover:bg-primary/20"
                )}
                onClick={() => router.push(item.href)}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.label}
              </Button>
            )
          })}
        </nav>
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-border space-y-4">
        <div className="flex items-center space-x-3">
          <Switch
            checked={darkMode}
            onCheckedChange={setDarkMode}
            className="data-[state=checked]:bg-primary"
          />
          <div className="flex items-center space-x-2">
            <Moon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Dark mode
            </span>
          </div>
        </div>
        
        <Button
          variant="ghost"
          className="w-full justify-start h-12 px-3 text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex">
      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={handleDrawerToggle} />
          <div className="fixed left-0 top-0 h-full w-[280px] bg-card border-r border-border">
            {drawer}
          </div>
        </div>
      )}

      {/* Desktop Drawer */}
      {desktopOpen && (
        <div className="hidden lg:block">
          {drawer}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDrawerToggle}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDesktopDrawerToggle}
                className="hidden lg:flex"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {menuItems.find(item => item.href === pathname)?.label || 'Dashboard'}
              </h2>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-muted">
                <span className="text-sm font-medium">{user?.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {user?.team || 'Member'}
                </Badge>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 bg-gradient-to-br from-background to-muted/20">
          <div className="max-w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
