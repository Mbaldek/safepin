// src/components/settings/screens/compte/types.ts

export type VisibilityLevel = 'public' | 'circle' | 'private'

export interface AccountData {
  firstName: string
  lastName: string
  username: string
  email: string
  birthDate: string
  country: string
  city: string
  isVerified: boolean
  visibility: {
    username: VisibilityLevel
    city: VisibilityLevel
    country: VisibilityLevel
    birthDate: VisibilityLevel
  }
}

export type CompteScreen =
  | 'main'
  | 'personal-info'
  | 'username'
  | 'visibility'
  | 'verification'
  | 'email'
  | 'password'
  | 'delete-account'
  | 'profile-photo'

// --- Shared animations ---

export const springTransition = { type: 'spring' as const, stiffness: 300, damping: 30 }

export const staggerChildren = {
  animate: { transition: { staggerChildren: 0.05 } },
}

export const fadeSlideUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

export const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
}
