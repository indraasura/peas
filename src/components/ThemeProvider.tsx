'use client'

import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { useState, useEffect, createContext, useContext } from 'react'
import { Montserrat } from 'next/font/google'

// Initialize Montserrat font with required weights
const montserrat = Montserrat({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'sans-serif']
})

const lightTheme = createTheme({
  typography: {
    fontFamily: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { 
      fontFamily: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeight: 500,
      fontSize: '2rem',
      lineHeight: 1.2,
      letterSpacing: '-0.02em'
    },
    h2: { 
      fontFamily: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeight: 500,
      fontSize: '1.75rem',
      lineHeight: 1.25
    },
    h3: { 
      fontFamily: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeight: 500,
      fontSize: '1.5rem',
      lineHeight: 1.3
    },
    h4: { 
      fontFamily: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeight: 500,
      fontSize: '1.25rem',
      lineHeight: 1.35
    },
    h5: { 
      fontFamily: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeight: 500,
      fontSize: '1.125rem',
      lineHeight: 1.4
    },
    h6: { 
      fontFamily: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeight: 500,
      fontSize: '1rem',
      lineHeight: 1.5
    },
    subtitle1: { 
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      fontSize: '1rem',
      lineHeight: 1.5,
      color: 'rgba(0, 0, 0, 0.6)'
    },
    body1: { 
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      fontSize: '1rem',
      lineHeight: 1.5,
      color: 'rgba(0, 0, 0, 0.87)'
    },
    button: { 
      fontFamily: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
      textTransform: 'none',
      fontWeight: 500,
      letterSpacing: '0.01em'
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          WebkitFontSmoothing: 'auto',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '20px',
          padding: '8px 24px',
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
          },
        },
        contained: {
          boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
          '&:hover': {
            boxShadow: '0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
          transition: 'box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px -1px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            '& fieldset': {
              borderColor: '#dadce0',
            },
            '&:hover fieldset': {
              borderColor: '#80868b',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#1a73e8',
              borderWidth: '2px',
            },
          },
        },
      },
    },
  },
  palette: {
    mode: 'light',
    primary: {
      main: '#1a73e8', // Google blue
      light: '#e8f0fe',
      dark: '#1557b0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#fbbc04', // Google yellow
      light: '#fef7e0',
      dark: '#c49000',
      contrastText: '#202124',
    },
    background: {
      default: '#f8f9fa', // Light gray background
      paper: '#ffffff',
    },
    text: {
      primary: '#202124', // Almost black
      secondary: '#5f6368', // Dark gray
      disabled: '#9aa0a6', // Medium gray
    },
    success: {
      main: '#34a853', // Google green
      light: '#e6f4ea',
      dark: '#1e8e3e',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#f9ab00', // Google yellow (darker)
      light: '#fef7e0',
      dark: '#c49000',
      contrastText: '#202124',
    },
    error: {
      main: '#d93025', // Google red
      light: '#fce8e6',
      dark: '#a50e0e',
      contrastText: '#ffffff',
    },
    info: {
      main: '#1a73e8', // Same as primary
      light: '#e8f0fe',
      dark: '#1557b0',
      contrastText: '#ffffff',
    },
    divider: '#dadce0', // Light gray divider
  },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.125rem',
    },
  },
  shape: {
    borderRadius: 4,
  },
  shadows: [
    'none',
    '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  ],
})

const darkTheme = createTheme({
  typography: {
    fontFamily: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { 
      fontFamily: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeight: 500,
      fontSize: '2rem',
      lineHeight: 1.2,
      letterSpacing: '-0.02em'
    },
    h2: { 
      fontFamily: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeight: 500,
      fontSize: '1.75rem',
      lineHeight: 1.25
    },
    h3: { 
      fontFamily: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeight: 500,
      fontSize: '1.5rem',
      lineHeight: 1.3
    },
    h4: { 
      fontFamily: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeight: 500,
      fontSize: '1.25rem',
      lineHeight: 1.35
    },
    h5: { 
      fontFamily: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeight: 500,
      fontSize: '1.125rem',
      lineHeight: 1.4
    },
    h6: { 
      fontFamily: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeight: 500,
      fontSize: '1rem',
      lineHeight: 1.5
    },
    subtitle1: { 
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      fontSize: '1rem',
      lineHeight: 1.5,
      color: 'rgba(255, 255, 255, 0.7)'
    },
    body1: { 
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      fontSize: '1rem',
      lineHeight: 1.5,
      color: 'rgba(255, 255, 255, 0.87)'
    },
    button: { 
      fontFamily: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
      textTransform: 'none',
      fontWeight: 500,
      letterSpacing: '0.01em'
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          WebkitFontSmoothing: 'auto',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '20px',
          padding: '8px 24px',
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.3), 0 4px 5px 0 rgba(0,0,0,0.2)',
          },
        },
        contained: {
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)',
          '&:hover': {
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.3), 0 4px 8px 3px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          backgroundColor: '#2d2d2d',
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)',
          transition: 'box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.3), 0 4px 8px 3px rgba(0,0,0,0.15)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#202124',
          boxShadow: '0 2px 4px -1px rgba(0,0,0,0.5)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            '& fieldset': {
              borderColor: '#5f6368',
            },
            '&:hover fieldset': {
              borderColor: '#9aa0a6',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#8ab4f8',
              borderWidth: '2px',
            },
          },
        },
      },
    },
  },
  palette: {
    mode: 'dark',
    primary: {
      main: '#8ab4f8', // Google blue (lighter for dark mode)
      light: '#e8f0fe',
      dark: '#5d8ff6',
      contrastText: '#202124',
    },
    secondary: {
      main: '#fdd663', // Google yellow (lighter for dark mode)
      light: '#fef7e0',
      dark: '#f7cb45',
      contrastText: '#202124',
    },
    background: {
      default: '#202124', // Dark gray background
      paper: '#2d2d2d', // Slightly lighter gray for cards
    },
    text: {
      primary: '#e8eaed', // Off-white
      secondary: '#9aa0a6', // Light gray
      disabled: '#5f6368', // Medium gray
    },
    success: {
      main: '#81c995', // Google green (lighter for dark mode)
      light: '#e6f4ea',
      dark: '#5bb974',
      contrastText: '#202124',
    },
    warning: {
      main: '#fdd663', // Google yellow (lighter for dark mode)
      light: '#fef7e0',
      dark: '#f7cb45',
      contrastText: '#202124',
    },
    error: {
      main: '#f28b82', // Google red (lighter for dark mode)
      light: '#fce8e6',
      dark: '#d93025',
      contrastText: '#202124',
    },
    info: {
      main: '#8ab4f8', // Same as primary
      light: '#e8f0fe',
      dark: '#5d8ff6',
      contrastText: '#202124',
    },
    divider: '#3c4043', // Dark gray divider
  },
  shape: {
    borderRadius: 4,
  },
  shadows: [
    'none',
    '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  ],
})

const ThemeContext = createContext<{
  darkMode: boolean
  setDarkMode: (darkMode: boolean) => void
}>({
  darkMode: false,
  setDarkMode: () => {},
})

export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('darkMode')
    if (saved) {
      setDarkMode(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('darkMode', JSON.stringify(darkMode))
    }
  }, [darkMode, mounted])

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <MuiThemeProvider theme={darkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(0,0,0,0.2) transparent;
        }
        
        *::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        *::-webkit-scrollbar-track {
          background: transparent;
        }
        
        *::-webkit-scrollbar-thumb {
          background-color: rgba(0,0,0,0.2);
          border-radius: 3px;
        }
        
        *::-webkit-scrollbar-thumb:hover {
          background-color: rgba(0,0,0,0.3);
        }
      `}</style>
      <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
        {children}
      </ThemeContext.Provider>
    </MuiThemeProvider>
  )
}
