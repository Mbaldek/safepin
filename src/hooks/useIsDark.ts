import { useTheme } from '@/stores/useTheme'

export const useIsDark = () => useTheme((s) => s.theme) === 'dark'
