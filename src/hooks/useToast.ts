import { useIsDark } from '@/hooks/useIsDark'
import { bToast } from '@/components/GlobalToast'

export function useToast() {
  const isDark = useIsDark()
  return {
    success: (title: string) => bToast.success({ title }, isDark),
    error: (title: string) => bToast.danger({ title }, isDark),
    warning: (title: string) => bToast.warning({ title }, isDark),
    info: (title: string) => bToast.info({ title }, isDark),
    sos: (title: string) => bToast.sos({ title }, isDark),
  }
}
