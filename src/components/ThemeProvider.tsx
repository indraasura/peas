'use client'

import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { useState, useEffect, createContext, useContext } from 'react'

const lightTheme = createTheme({
  typography: {
    button: {
      textTransform: 'none',
    },
  },
  palette: {
    mode: 'light',
    primary: {
      main: '#f5f5dc', // muted pastel blue
      light: '#cbb799',
      dark: '#a07856',
      contrastText: '#0b1220',
    },
    secondary: {
      main: '#c4b5fd', // soft purple
      light: '#e0d9ff',
      dark: '#a78bfa',
      contrastText: '#0b1220',
    },
    background: {
      default: '#f5f5dc', // softer page background
      paper: '#f5f5dc',
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
    },
    success: {
      main: '#8bd3a3', // pastel green
      light: '#bfe9ca',
      dark: '#5fbf82',
    },
    warning: {
      main: '#f7c68b', // pastel amber
      light: '#fde1bc',
      dark: '#e5ae66',
    },
    error: {
      main: '#f2a7a7', // pastel red
      light: '#f8caca',
      dark: '#e08181',
    },
    info: {
      main: '#9bd7e0', // pastel cyan
      light: '#c9ecf1',
      dark: '#76c1cc',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
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
    button: {
      textTransform: 'none',
    },
  },
  palette: {
    mode: 'dark',
    primary: {
      main: '#f5f5dc', // muted pastel blue
      light: '#cbb799',
      dark: '#a07856',
      contrastText: '#0b1220',
    },
    secondary: {
      main: '#b8a6ff', // soft purple accent
      light: '#d6ccff',
      dark: '#9a86ff',
      contrastText: '#0b1220',
    },
    background: {
      default: '#0b1220', // darker page background
      paper: '#0f172a', // darker card background
    },
    text: {
      primary: '#eef2ff',
      secondary: '#cbd5e1',
    },
    success: {
      main: '#7fd3a0',
      light: '#aee8c2',
      dark: '#5ab985',
      contrastText: '#0b1220',
    },
    warning: {
      main: '#f1c48a',
      light: '#f7ddb7',
      dark: '#d6aa6d',
      contrastText: '#0b1220',
    },
    error: {
      main: '#f1a3a3',
      light: '#f7c7c7',
      dark: '#d98888',
      contrastText: '#0b1220',
    },
    info: {
      main: '#93d5de',
      light: '#c3ebf1',
      dark: '#6ebac5',
      contrastText: '#0b1220',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
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
