'use client'

import React, { useState } from 'react'
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Chip,
  Stack,
  Alert,
  Avatar,
  Fade,
  Slide,
  keyframes
} from '@mui/material'
import {
  Close as CloseIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  AutoAwesome as SparkleIcon,
  Psychology as BrainIcon
} from '@mui/icons-material'

interface AIDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  contextData: any
  section: 'areas' | 'pods' | 'members' | 'dashboard'
}

const shimmerAnimation = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`

const floatAnimation = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-4px);
  }
`

export default function AIDrawer({ open, onClose, title, contextData, section }: AIDrawerProps) {
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAskAI = async () => {
    if (!query.trim()) return

    setLoading(true)
    setError('')
    setResponse('')

    try {
      const prompt = generatePrompt(query, contextData, section)
      
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          context: contextData,
          section
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      if (data.error) {
        setError(`${data.error}${data.details ? ': ' + data.details : ''}`)
      } else {
        setResponse(data.summary)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get AI response')
    } finally {
      setLoading(false)
    }
  }

  const generatePrompt = (userQuery: string, data: any, section: string) => {
    const basePrompt = `You are Kynetik AI, an intelligent assistant for project management and team coordination. 
    
Context: You are analyzing ${section} data to provide insights and summaries.

User Query: ${userQuery}

Available Data: ${JSON.stringify(data, null, 2)}

Please provide a comprehensive, well-formatted response that:
1. Directly addresses the user's query
2. Uses the provided data to support your analysis
3. Offers actionable insights and recommendations
4. Formats the response in a clear, professional manner
5. Uses bullet points, numbered lists, and proper formatting for readability

Response should be concise but thorough, focusing on practical insights that help with project management decisions.`

    return basePrompt
  }

  const handleQuickQuestions = (question: string) => {
    setQuery(question)
  }

  const getQuickQuestions = () => {
    switch (section) {
      case 'areas':
        return [
          'What are the main risks across all areas?',
          'Which areas are behind schedule?',
          'Summarize the current status of all areas',
          'What areas need immediate attention?'
        ]
      case 'pods':
        return [
          'Which PODs are at risk?',
          'What are the main blockers across PODs?',
          'Summarize POD progress and status',
          'Which PODs need more resources?'
        ]
      case 'members':
        return [
          'Who has the highest workload?',
          'Which team members are underutilized?',
          'Summarize team capacity and availability',
          'What are the bandwidth distribution patterns?'
        ]
      case 'dashboard':
        return [
          'Give me an overall project health summary',
          'What are the key metrics and trends?',
          'What needs immediate attention?',
          'Summarize the current project status'
        ]
      default:
        return []
    }
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 400,
          maxWidth: '90vw',
          backgroundColor: '#f8fafc',
          borderLeft: '1px solid #e2e8f0'
        }
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          backgroundColor: 'white', 
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AIIcon sx={{ color: '#3b82f6' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              Ask Kynetik AI
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, p: 2, overflow: 'auto' }}>
          <Typography variant="subtitle2" sx={{ mb: 2, color: '#64748b' }}>
            {title}
          </Typography>

          {/* Quick Questions */}
          <Paper sx={{ p: 2, mb: 3, backgroundColor: 'white' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Quick Questions
            </Typography>
            <Stack spacing={1}>
              {getQuickQuestions().map((question, index) => (
                <Chip
                  key={index}
                  label={question}
                  onClick={() => handleQuickQuestions(question)}
                  sx={{
                    justifyContent: 'flex-start',
                    height: 'auto',
                    py: 1,
                    '& .MuiChip-label': {
                      whiteSpace: 'normal',
                      textAlign: 'left'
                    },
                    '&:hover': {
                      backgroundColor: '#3b82f6',
                      color: 'white'
                    }
                  }}
                />
              ))}
            </Stack>
          </Paper>

          {/* Query Input */}
          <Paper sx={{ p: 2, mb: 3, backgroundColor: 'white' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Ask a Question
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask Kynetik AI about your data..."
              sx={{ mb: 2 }}
            />
            <Button
              fullWidth
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
              onClick={handleAskAI}
              disabled={loading || !query.trim()}
              sx={{
                backgroundColor: '#3b82f6',
                '&:hover': {
                  backgroundColor: '#2563eb'
                }
              }}
            >
              {loading ? 'Analyzing...' : 'Ask AI'}
            </Button>
          </Paper>

          {/* Response */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {response && (
            <Paper sx={{ p: 2, backgroundColor: 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  AI Response
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => setResponse('')}
                  title="Clear response"
                >
                  <RefreshIcon />
                </IconButton>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box
                sx={{
                  '& h1, & h2, & h3': {
                    fontWeight: 600,
                    color: '#1e293b',
                    mt: 2,
                    mb: 1
                  },
                  '& h1': { fontSize: '1.25rem' },
                  '& h2': { fontSize: '1.125rem' },
                  '& h3': { fontSize: '1rem' },
                  '& ul, & ol': {
                    pl: 2,
                    mb: 1
                  },
                  '& li': {
                    mb: 0.5
                  },
                  '& p': {
                    mb: 1,
                    lineHeight: 1.6
                  },
                  '& strong': {
                    fontWeight: 600,
                    color: '#1e293b'
                  },
                  '& em': {
                    fontStyle: 'italic',
                    color: '#64748b'
                  }
                }}
                dangerouslySetInnerHTML={{ 
                  __html: response.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')
                }}
              />
            </Paper>
          )}
        </Box>
      </Box>
    </Drawer>
  )
}
