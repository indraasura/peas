import React from 'react'
import { Box, Skeleton, Card, CardContent, Stack } from '@mui/material'

interface SkeletonLoaderProps {
  variant?: 'card' | 'list' | 'kanban' | 'table'
  count?: number
}

export function SkeletonLoader({ variant = 'card', count = 3 }: SkeletonLoaderProps) {
  const renderSkeletonCard = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Stack spacing={2}>
          <Skeleton variant="text" width="60%" height={24} />
          <Skeleton variant="text" width="40%" height={20} />
          <Skeleton variant="rectangular" width="100%" height={60} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="rounded" width={60} height={24} />
            <Skeleton variant="rounded" width={60} height={24} />
            <Skeleton variant="rounded" width={60} height={24} />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )

  const renderSkeletonKanban = () => (
    <Box sx={{ display: 'flex', gap: 2, p: 2, minHeight: '400px' }}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Box key={index} sx={{ flex: 1, minWidth: '280px' }}>
          <Skeleton variant="text" width="80%" height={32} sx={{ mb: 2 }} />
          <Stack spacing={2}>
            {Array.from({ length: 3 }).map((_, cardIndex) => (
              <Card key={cardIndex} sx={{ p: 2 }}>
                <Stack spacing={1.5}>
                  <Skeleton variant="text" width="70%" height={20} />
                  <Skeleton variant="text" width="50%" height={16} />
                  <Skeleton variant="rectangular" width="100%" height={40} />
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Skeleton variant="rounded" width={40} height={20} />
                    <Skeleton variant="rounded" width={40} height={20} />
                  </Box>
                </Stack>
              </Card>
            ))}
          </Stack>
        </Box>
      ))}
    </Box>
  )

  const renderSkeletonList = () => (
    <Stack spacing={1}>
      {Array.from({ length: count }).map((_, index) => (
        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={20} />
            <Skeleton variant="text" width="40%" height={16} />
          </Box>
          <Skeleton variant="rounded" width={80} height={24} />
        </Box>
      ))}
    </Stack>
  )

  const renderSkeletonTable = () => (
    <Box>
      {/* Table header */}
      <Box sx={{ display: 'flex', gap: 2, p: 2, borderBottom: 1, borderColor: 'divider' }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} variant="text" width="25%" height={20} />
        ))}
      </Box>
      {/* Table rows */}
      {Array.from({ length: count }).map((_, rowIndex) => (
        <Box key={rowIndex} sx={{ display: 'flex', gap: 2, p: 2, borderBottom: 1, borderColor: 'divider' }}>
          {Array.from({ length: 4 }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" width="25%" height={16} />
          ))}
        </Box>
      ))}
    </Box>
  )

  switch (variant) {
    case 'kanban':
      return renderSkeletonKanban()
    case 'list':
      return renderSkeletonList()
    case 'table':
      return renderSkeletonTable()
    case 'card':
    default:
      return (
        <Stack spacing={2}>
          {Array.from({ length: count }).map((_, index) => (
            <React.Fragment key={index}>
              {renderSkeletonCard()}
            </React.Fragment>
          ))}
        </Stack>
      )
  }
}

// Specific skeleton components for different pages
export function AreaCardSkeleton() {
  return (
    <Card sx={{ mb: 2, p: 2 }}>
      <Stack spacing={1.5}>
        <Skeleton variant="text" width="70%" height={24} />
        <Skeleton variant="text" width="50%" height={16} />
        <Skeleton variant="rectangular" width="100%" height={60} />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Skeleton variant="rounded" width={50} height={24} />
          <Skeleton variant="rounded" width={50} height={24} />
          <Skeleton variant="rounded" width={50} height={24} />
          <Skeleton variant="rounded" width={50} height={24} />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton variant="text" width="40%" height={14} />
          <Skeleton variant="rounded" width={80} height={28} />
        </Box>
      </Stack>
    </Card>
  )
}

export function PodCardSkeleton() {
  return (
    <Card sx={{ mb: 2, p: 2 }}>
      <Stack spacing={1.5}>
        <Skeleton variant="text" width="60%" height={20} />
        <Skeleton variant="text" width="40%" height={16} />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Skeleton variant="rounded" width={80} height={24} />
          <Skeleton variant="rounded" width={60} height={24} />
        </Box>
        <Skeleton variant="rectangular" width="100%" height={40} />
      </Stack>
    </Card>
  )
}

export function MemberCardSkeleton() {
  return (
    <Card sx={{ mb: 2, p: 2 }}>
      <Stack spacing={1.5} direction="row" alignItems="center">
        <Skeleton variant="circular" width={48} height={48} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" height={20} />
          <Skeleton variant="text" width="40%" height={16} />
          <Skeleton variant="text" width="30%" height={14} />
        </Box>
        <Skeleton variant="rounded" width={80} height={24} />
      </Stack>
    </Card>
  )
}
