'use client'

import React from 'react'
import { Button, Box, keyframes } from '@mui/material'

interface AnimatedAIButtonProps {
  onClick: () => void
  disabled?: boolean
}

const sparkleAnimation = keyframes`
  0%, 100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
  50% {
    transform: scale(1.2) rotate(180deg);
    opacity: 0.8;
  }
`

const sparkleAnimation2 = keyframes`
  0%, 100% {
    transform: scale(1) rotate(0deg);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.1) rotate(-180deg);
    opacity: 1;
  }
`

const sparkleAnimation3 = keyframes`
  0%, 100% {
    transform: scale(1) rotate(0deg);
    opacity: 0.9;
  }
  50% {
    transform: scale(1.15) rotate(90deg);
    opacity: 0.7;
  }
`

const pulseAnimation = keyframes`
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
  }
`

const SparkleIcon = ({ animation, delay = 0 }: { animation: any; delay?: number }) => (
  <Box
    sx={{
      width: '12px',
      height: '12px',
      position: 'relative',
      animation: `${animation} 2s ease-in-out infinite`,
      animationDelay: `${delay}s`,
      '&::before': {
        content: '""',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '8px',
        height: '8px',
        background: 'linear-gradient(45deg, #3b82f6, #10b981, #f59e0b)',
        clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
      }
    }}
  />
)

export default function AnimatedAIButton({ onClick, disabled = false }: AnimatedAIButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant="outlined"
      sx={{
        borderRadius: '50px',
        px: 3,
        py: 1.5,
        minWidth: '140px',
        height: '48px',
        textTransform: 'none',
        fontWeight: 700,
        fontSize: '16px',
        color: '#3b82f6',
        borderColor: '#3b82f6',
        background: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        boxShadow: disabled ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.2)',
        animation: disabled ? 'none' : `${pulseAnimation} 3s ease-in-out infinite`,
        '&:hover': {
          backgroundColor: '#eff6ff',
          borderColor: '#2563eb',
          color: '#2563eb',
          transform: 'translateY(-1px)',
          boxShadow: '0 6px 16px rgba(59, 130, 246, 0.3)',
        },
        '&:active': {
          transform: 'translateY(0px)',
        },
        '&:disabled': {
          background: '#f1f5f9',
          color: '#94a3b8',
          borderColor: '#cbd5e1',
          boxShadow: 'none',
          animation: 'none',
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <SparkleIcon animation={sparkleAnimation} />
        <SparkleIcon animation={sparkleAnimation2} delay={0.3} />
        <SparkleIcon animation={sparkleAnimation3} delay={0.6} />
      </Box>
      <Box sx={{ fontWeight: 700, fontSize: '16px' }}>
        Ask Neko
      </Box>
    </Button>
  )
}
