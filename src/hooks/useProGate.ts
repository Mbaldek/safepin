'use client'

import { useState, useCallback } from 'react'
import { useIsPro } from '@/lib/useIsPro'

/**
 * Soft paywall gate hook.
 *
 * Usage:
 *   const { gate, showPaywall, closePaywall } = useProGate()
 *   if (!gate('walk-with-me')) return  // opens paywall if not Pro
 *
 * Render <PaywallScreen> conditionally when showPaywall is true.
 */
export function useProGate() {
  const { isPro, loading } = useIsPro()
  const [showPaywall, setShowPaywall] = useState(false)

  const gate = useCallback(
    (_feature?: string): boolean => {
      if (loading) return false
      if (isPro) return true
      setShowPaywall(true)
      return false
    },
    [isPro, loading],
  )

  const closePaywall = useCallback(() => setShowPaywall(false), [])

  return { gate, isPro, showPaywall, closePaywall }
}
