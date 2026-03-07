import { create } from 'zustand';

interface ContextMenuUser {
  userId: string;
  username: string;
  displayName?: string;
  city?: string;
  isVerified?: boolean;
}

interface UiStore {
  activeProfileUserId: string | null;
  activeContextMenuUser: ContextMenuUser | null;
  openMyProfile: boolean;
  communityDMTarget: { userId: string; userName: string } | null;
  openProfile: (userId: string) => void;
  openContextMenu: (user: ContextMenuUser) => void;
  closeProfile: () => void;
  closeContextMenu: () => void;
  setOpenMyProfile: (v: boolean) => void;
  openCommunityDM: (target: { userId: string; userName: string }) => void;
  closeCommunityDM: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  activeProfileUserId: null,
  activeContextMenuUser: null,
  openMyProfile: false,
  communityDMTarget: null,
  openProfile: (userId) => set({ activeProfileUserId: userId }),
  openContextMenu: (user) => set({ activeContextMenuUser: user }),
  closeProfile: () => set({ activeProfileUserId: null }),
  closeContextMenu: () => set({ activeContextMenuUser: null }),
  setOpenMyProfile: (v) => set({ openMyProfile: v }),
  openCommunityDM: (target) => set({ communityDMTarget: target }),
  closeCommunityDM: () => set({ communityDMTarget: null }),
}));
