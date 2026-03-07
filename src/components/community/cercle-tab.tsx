"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, X, Users, Plus, Trash2, MessageCircle, User } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useNotificationStore } from "@/stores/notificationStore";
import { useUiStore } from "@/stores/uiStore";
import AddCircleContactModal from "./AddCircleContactModal";

interface CercleTabProps {
  isDark: boolean;
  userId: string | null;
  onOpenConversation?: (partnerId: string, partnerName: string, partnerAvatar: string | null) => void;
}

interface ContactRow {
  id: string;
  contact_id: string;
  name: string;
  avatar: string;
  avatarUrl: string | null;
  relation: string | null;
}

interface PendingRequest {
  id: string;
  user_id: string;
  name: string;
  avatar: string;
  avatarUrl: string | null;
  created_at: string;
}

function timeAgo(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)}h`;
  return `il y a ${Math.floor(s / 86400)}j`;
}

export default function CercleTab({ isDark, userId, onOpenConversation }: CercleTabProps) {
  const openProfile = useUiStore((s) => s.openProfile);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedContact, setSelectedContact] = useState<ContactRow | null>(null);
  const [removing, setRemoving] = useState(false);

  const handleAdded = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleRemoveContact = async () => {
    if (!selectedContact || removing) return;
    setRemoving(true);
    const { error } = await supabase
      .from("trusted_contacts")
      .delete()
      .eq("id", selectedContact.id);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      setContacts((prev) => prev.filter((c) => c.id !== selectedContact.id));
      toast.success("Contact supprimé du cercle");
    }
    setSelectedContact(null);
    setRemoving(false);
  };

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);

      // Fetch accepted contacts where I'm the user_id
      const { data: myContacts } = await supabase
        .from("trusted_contacts")
        .select("id, contact_id, contact_name, contact_relation")
        .eq("user_id", userId)
        .eq("status", "accepted");

      // Fetch accepted contacts where I'm the contact_id (someone added me, I accepted)
      const { data: reverseContacts } = await supabase
        .from("trusted_contacts")
        .select("id, user_id, contact_name, contact_relation")
        .eq("contact_id", userId)
        .eq("status", "accepted");

      // Fetch pending requests where I'm the contact_id (someone added me)
      const { data: incoming } = await supabase
        .from("trusted_contacts")
        .select("id, user_id, created_at")
        .eq("contact_id", userId)
        .eq("status", "pending");

      // Enrich with profiles
      const contactIds = (myContacts || []).map((c) => c.contact_id).filter(Boolean);
      const reverseIds = (reverseContacts || []).map((c) => c.user_id).filter(Boolean);
      const requesterIds = (incoming || []).map((r) => r.user_id);
      const allIds = [...new Set([...contactIds, ...reverseIds, ...requesterIds])];

      let profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
      if (allIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", allIds);
        profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      }

      const myContactRows = (myContacts || []).map((c) => {
        const p = profileMap.get(c.contact_id);
        const name = p?.display_name || c.contact_name || "Contact";
        return {
          id: c.id,
          contact_id: c.contact_id,
          name,
          avatar: name.charAt(0).toUpperCase(),
          avatarUrl: p?.avatar_url || null,
          relation: c.contact_relation,
        };
      });

      const reverseContactRows = (reverseContacts || []).map((c) => {
        const p = profileMap.get(c.user_id);
        const name = p?.display_name || c.contact_name || "Contact";
        return {
          id: c.id,
          contact_id: c.user_id,
          name,
          avatar: name.charAt(0).toUpperCase(),
          avatarUrl: p?.avatar_url || null,
          relation: c.contact_relation,
        };
      });

      // Deduplicate by contact_id
      const seen = new Set<string>();
      const allContacts: ContactRow[] = [];
      for (const c of [...myContactRows, ...reverseContactRows]) {
        if (!seen.has(c.contact_id) && c.contact_id !== userId) {
          seen.add(c.contact_id);
          allContacts.push(c);
        }
      }
      setContacts(allContacts);

      setPendingRequests(
        (incoming || []).map((r) => {
          const p = profileMap.get(r.user_id);
          const name = p?.display_name || "Utilisateur";
          return {
            id: r.id,
            user_id: r.user_id,
            name,
            avatar: name.charAt(0).toUpperCase(),
            avatarUrl: p?.avatar_url || null,
            created_at: r.created_at,
          };
        })
      );
      setLoading(false);
    })();
  }, [userId, refreshKey]);

  // ── Realtime: listen for accepted invitations I sent ────────────────────
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("circle_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "circle_invitations",
          filter: `sender_id=eq.${userId}`,
        },
        async (payload) => {
          const row = payload.new as { status: string; receiver_id: string };
          if (row.status !== "accepted") return;

          // Refresh circle list
          setRefreshKey((k) => k + 1);

          // Get receiver name for notification
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", row.receiver_id)
            .single();

          useNotificationStore.getState().addNotification({
            id: `circle-accepted-${row.receiver_id}-${Date.now()}`,
            type: "circle_accepted",
            payload: {
              receiverName: profile?.display_name ?? "Quelqu\u2019un",
              receiverId: row.receiver_id,
            },
            read: false,
            created_at: new Date().toISOString(),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleAccept = async (requestId: string) => {
    const { error } = await supabase
      .from("trusted_contacts")
      .update({ status: "accepted" })
      .eq("id", requestId);
    if (error) {
      toast.error("Erreur");
      return;
    }
    // Also sync circle_invitations status
    const accepted = pendingRequests.find((r) => r.id === requestId);
    if (accepted && userId) {
      await supabase
        .from("circle_invitations")
        .update({ status: "accepted" })
        .eq("sender_id", accepted.user_id)
        .eq("receiver_id", userId);
    }
    setPendingRequests((p) => p.filter((r) => r.id !== requestId));
    if (accepted) {
      setContacts((prev) => [
        ...prev,
        {
          id: accepted.id,
          contact_id: accepted.user_id,
          name: accepted.name,
          avatar: accepted.avatar,
          avatarUrl: accepted.avatarUrl,
          relation: null,
        },
      ]);
    }
    toast.success("Contact accepté !");
  };

  const handleDecline = async (requestId: string) => {
    await supabase
      .from("trusted_contacts")
      .update({ status: "declined" })
      .eq("id", requestId);
    setPendingRequests((p) => p.filter((r) => r.id !== requestId));
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
          fontSize: 13,
        }}
      >
        Chargement…
      </div>
    );
  }

  return (
    <div style={{ padding: "16px" }}>
      {/* Mon Cercle Section */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: isDark ? "#64748B" : "#94A3B8",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              margin: 0,
            }}
          >
            Mon Cercle
          </h3>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 12px",
              borderRadius: 10,
              border: "none",
              backgroundColor: "#3BB4C1",
              color: "#FFFFFF",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={14} />
            Inviter
          </motion.button>
        </div>
        {contacts.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "32px 0",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 32 }}>💛</span>
            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: isDark ? "#94A3B8" : "#64748B",
              }}
            >
              Aucun contact de confiance
            </p>
            <p
              style={{
                fontSize: 12,
                color: isDark ? "#64748B" : "#94A3B8",
              }}
            >
              Invitez vos proches pour créer votre cercle
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: 20,
              overflowX: "auto",
              paddingBottom: 8,
            }}
          >
            {contacts.map((contact, index) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedContact(contact)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 70,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    padding: 3,
                    background: "#34D399",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      fontWeight: 600,
                      color: isDark ? "#FFFFFF" : "#0F172A",
                      overflow: "hidden",
                    }}
                  >
                    {contact.avatarUrl ? (
                      <img
                        src={contact.avatarUrl}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      contact.avatar
                    )}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: isDark ? "#FFFFFF" : "#0F172A",
                    fontWeight: 500,
                  }}
                >
                  {contact.name}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Demandes en attente */}
      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: isDark ? "#64748B" : "#94A3B8",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 16,
            }}
          >
            Demandes en attente
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {pendingRequests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                style={{
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  borderRadius: 16,
                  padding: 16,
                  border: `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background:
                        "linear-gradient(135deg, #3BB4C1, #06B6D4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    {request.avatarUrl ? (
                      <img
                        src={request.avatarUrl}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <Users
                        size={18}
                        style={{ color: "#FFFFFF" }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: 14,
                        color: isDark ? "#FFFFFF" : "#0F172A",
                      }}
                    >
                      <strong>{request.name}</strong> vous invite
                      à rejoindre son cercle de confiance
                    </p>
                    <span
                      style={{
                        fontSize: 12,
                        color: isDark ? "#64748B" : "#94A3B8",
                      }}
                    >
                      {timeAgo(request.created_at)}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAccept(request.id)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        backgroundColor: "rgba(52, 211, 153, 0.15)",
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Check
                        size={18}
                        style={{ color: "#34D399" }}
                      />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDecline(request.id)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        backgroundColor: "rgba(239, 68, 68, 0.15)",
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <X size={18} style={{ color: "#EF4444" }} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no contacts and no requests */}
      {contacts.length === 0 && pendingRequests.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "20px 0",
            color: isDark ? "#64748B" : "#94A3B8",
            fontSize: 12,
          }}
        >
          Partagez votre lien d&apos;invitation pour inviter des contacts
        </div>
      )}

      <AddCircleContactModal
        isDark={isDark}
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={handleAdded}
      />

      {/* Remove contact confirmation */}
      <AnimatePresence>
        {selectedContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedContact(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 1000,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              padding: 16,
            }}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 360,
                background: isDark ? "#1E293B" : "#FFFFFF",
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: isDark ? "#FFFFFF" : "#0F172A" }}>
                  {selectedContact.name}
                </div>
              </div>
              {/* Envoyer message */}
              <button
                onClick={() => {
                  if (!onOpenConversation) return;
                  onOpenConversation(selectedContact.contact_id, selectedContact.name, selectedContact.avatarUrl);
                  setSelectedContact(null);
                }}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 12,
                  background: "#3BB4C1",
                  border: "none",
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <MessageCircle size={15} />
                Envoyer message
              </button>
              {/* Voir profil */}
              <button
                onClick={() => {
                  openProfile(selectedContact.contact_id);
                  setSelectedContact(null);
                }}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 12,
                  background: "transparent",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.1)"}`,
                  color: isDark ? "#FFFFFF" : "#0F172A",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <User size={15} />
                Voir profil
              </button>
              {/* Supprimer du cercle */}
              <button
                onClick={handleRemoveContact}
                disabled={removing}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 12,
                  background: "#EF4444",
                  border: "none",
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: removing ? 0.6 : 1,
                  marginBottom: 8,
                }}
              >
                <Trash2 size={15} />
                {removing ? "Suppression…" : "Supprimer du cercle"}
              </button>
              {/* Annuler */}
              <button
                onClick={() => setSelectedContact(null)}
                style={{
                  width: "100%",
                  padding: "10px 0",
                  borderRadius: 12,
                  background: "transparent",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.1)"}`,
                  color: isDark ? "#94A3B8" : "#64748B",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
