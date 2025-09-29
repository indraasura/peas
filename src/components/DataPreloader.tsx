import { useEffect } from 'react'
import { useDataPreloader } from '@/hooks/useOptimizedData'

interface DataPreloaderProps {
  children: React.ReactNode
}

export function DataPreloader({ children }: DataPreloaderProps) {
  const { preloaded, loading } = useDataPreloader()

  // Show loading indicator only if preloading is taking too long
  if (loading && !preloaded) {
    // Optional: Show a subtle loading indicator
    return (
      <>
        {children}
        {/* You could add a small loading indicator here if needed */}
      </>
    )
  }

  return <>{children}</>
}

// Hook for prefetching data on route change
export function useRoutePrefetch() {
  useEffect(() => {
    // Prefetch data when component mounts
    const preloadCriticalData = async () => {
      try {
        const { preloadCriticalData } = await import('@/lib/data-optimized')
        await preloadCriticalData()
      } catch (error) {
        console.error('Error prefetching data:', error)
      }
    }

    preloadCriticalData()
  }, [])
}
