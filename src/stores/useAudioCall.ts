import { create } from 'zustand'

export type CallSource = 'cercle' | 'dm' | 'group' | 'walk' | 'escorte'
export type CallState = 'idle' | 'connecting' | 'active' | 'error'

interface AudioCallStore {
  roomName: string | null
  source: CallSource | null
  sourceId: string
  title: string
  participantNames: string[]
  callState: CallState
  muted: boolean
  seconds: number
  callSheetOpen: boolean
  showConfirmEnd: boolean
  chatOpen: boolean

  // actions
  startCall: (params: {
    roomName: string
    source: CallSource
    sourceId: string
    title: string
    participantNames?: string[]
  }) => void
  endCall: () => void
  setCallState: (s: CallState) => void
  setMuted: (m: boolean) => void
  tick: () => void
  toggleCallSheet: () => void
  setCallSheetOpen: (v: boolean) => void
  setShowConfirmEnd: (v: boolean) => void
  setChatOpen: (v: boolean) => void
}

export const useAudioCall = create<AudioCallStore>((set) => ({
  roomName: null,
  source: null,
  sourceId: '',
  title: '',
  participantNames: [],
  callState: 'idle',
  muted: false,
  seconds: 0,
  callSheetOpen: false,
  showConfirmEnd: false,
  chatOpen: false,

  startCall: ({ roomName, source, sourceId, title, participantNames }) =>
    set({
      roomName,
      source,
      sourceId,
      title,
      participantNames: participantNames ?? [],
      callState: 'connecting',
      muted: false,
      seconds: 0,
      callSheetOpen: true,
    }),

  endCall: () =>
    set({
      roomName: null,
      source: null,
      sourceId: '',
      title: '',
      participantNames: [],
      callState: 'idle',
      muted: false,
      seconds: 0,
      callSheetOpen: false,
      showConfirmEnd: false,
      chatOpen: false,
    }),

  setCallState: (s) => set({ callState: s }),
  setMuted: (m) => set({ muted: m }),
  tick: () => set((st) => ({ seconds: st.seconds + 1 })),
  toggleCallSheet: () => set((st) => ({ callSheetOpen: !st.callSheetOpen })),
  setCallSheetOpen: (v) => set({ callSheetOpen: v }),
  setShowConfirmEnd: (v) => set({ showConfirmEnd: v }),
  setChatOpen: (v) => set({ chatOpen: v }),
}))
