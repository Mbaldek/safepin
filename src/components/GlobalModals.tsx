"use client";

import UserProfileModal from "./UserProfileModal";
import UserContextMenu from "./UserContextMenu";
import MyProfileScreen from "./settings/screens/MyProfileScreen";
import { useUiStore } from "@/stores/uiStore";

export default function GlobalModals() {
  const openMyProfile = useUiStore((s) => s.openMyProfile);
  const setOpenMyProfile = useUiStore((s) => s.setOpenMyProfile);

  return (
    <>
      <UserProfileModal />
      <UserContextMenu />
      {openMyProfile && (
        <MyProfileScreen onClose={() => setOpenMyProfile(false)} />
      )}
    </>
  );
}
