import { supabase } from './supabase';

/** Find existing DM conversation between two users, or create one */
export async function getOrCreateConversation(userId: string, partnerId: string) {
  const { data: existing } = await supabase
    .from('dm_conversations')
    .select('*')
    .or(
      `and(user1_id.eq.${userId},user2_id.eq.${partnerId}),and(user1_id.eq.${partnerId},user2_id.eq.${userId})`,
    )
    .limit(1)
    .single();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from('dm_conversations')
    .insert({
      user1_id: userId,
      user2_id: partnerId,
      last_message: null,
      last_message_sender_id: null,
      last_message_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return created;
}
