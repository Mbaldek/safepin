import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type WaitlistState = 'idle' | 'loading' | 'success' | 'already' | 'error'

export function useWaitlist() {
  const [state, setState] = useState<WaitlistState>('idle')

  const join = async ({
    email,
    userId,
    billingPref,
  }: {
    email:       string
    userId?:     string
    billingPref: 'monthly' | 'yearly'
  }) => {
    if (!email || !email.includes('@')) {
      setState('error')
      return
    }

    setState('loading')

    const { error } = await supabase
      .from('pro_waitlist')
      .insert({
        email,
        user_id:      userId ?? null,
        source:       'paywall',
        plan:         'pro',
        billing_pref: billingPref,
      })

    if (!error) {
      setState('success')
      return
    }

    // Code 23505 = unique violation → email already registered
    if (error.code === '23505') {
      setState('already')
      return
    }

    console.error('[useWaitlist]', error)
    setState('error')
  }

  const reset = () => setState('idle')

  return { join, state, reset }
}
