import { useTheme } from '@/stores/useTheme'
import { bToast } from '@/components/GlobalToast'

export function useToast() {
  const isDark = useTheme(s => s.theme) === 'dark'
  return {
    success: (title: string) => bToast.success({ title }, isDark),
    error: (title: string) => bToast.danger({ title }, isDark),
    warning: (title: string) => bToast.warning({ title }, isDark),
    info: (title: string) => bToast.info({ title }, isDark),
    sos: (title: string) => bToast.sos({ title }, isDark),
  }
}
