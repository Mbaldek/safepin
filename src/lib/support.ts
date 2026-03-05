import { supabase } from './supabase';

export const SUPPORT_USER_ID = process.env.NEXT_PUBLIC_SUPPORT_USER_ID ?? '';

/** Find existing conversation with support, or create one */
export async function getOrCreateSupportConversation(userId: string) {
  // Look for existing conversation where one side is the support user
  const { data: existing } = await supabase
    .from('dm_conversations')
    .select('*')
    .or(
      `and(user1_id.eq.${userId},user2_id.eq.${SUPPORT_USER_ID}),and(user1_id.eq.${SUPPORT_USER_ID},user2_id.eq.${userId})`,
    )
    .limit(1)
    .single();

  if (existing) return existing;

  // Create new conversation
  const { data: created, error } = await supabase
    .from('dm_conversations')
    .insert({
      user1_id: userId,
      user2_id: SUPPORT_USER_ID,
      last_message: null,
      last_message_sender_id: null,
      last_message_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return created;
}

/** Send a message in a DM conversation */
export async function sendSupportMessage(
  conversationId: string,
  senderId: string,
  content: string,
) {
  const now = new Date().toISOString();

  const { error: msgErr } = await supabase.from('direct_messages').insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content,
    content_type: 'text',
  });
  if (msgErr) throw msgErr;

  // Update conversation metadata
  await supabase
    .from('dm_conversations')
    .update({
      last_message: content,
      last_message_sender_id: senderId,
      last_message_at: now,
    })
    .eq('id', conversationId);
}

/** Mark conversation as read */
export async function markConversationRead(
  conversationId: string,
  userId: string,
  position: 'user1' | 'user2',
) {
  const field = position === 'user1' ? 'user1_last_read_at' : 'user2_last_read_at';
  await supabase
    .from('dm_conversations')
    .update({ [field]: new Date().toISOString() })
    .eq('id', conversationId);
}
