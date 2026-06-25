import { createClient } from './supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_role: 'CUSTOMER' | 'DRIVER' | 'STAFF' | 'ADMIN' | 'DEVELOPER' | 'OWNER';
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface ChatSession {
  id: string;
  customer_id: string;
  assigned_staff_id: string | null;
  status: 'OPEN' | 'RESOLVED' | 'CLOSED';
  subject: string | null;
  created_at: string;
  updated_at: string;
}

const supabase = createClient();

/**
 * Gets the current open support chat session for a customer, or creates one if none exists.
 */
export async function getOrCreateChatSession(customerId: string): Promise<string> {
  const { data: existingChat, error: findError } = await supabase
    .from('support_chats')
    .select('id')
    .eq('customer_id', customerId)
    .eq('status', 'OPEN')
    .maybeSingle();

  if (existingChat) {
    return existingChat.id;
  }

  const { data: newChat, error: createError } = await supabase
    .from('support_chats')
    .insert({
      customer_id: customerId,
      status: 'OPEN',
    })
    .select('id')
    .single();

  if (createError) {
    throw createError;
  }

  return newChat.id;
}

/**
 * Retrieves chat history for a given session.
 */
export async function getChatMessages(chatId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as Message[];
}

/**
 * Sends a message in a chat session.
 */
export async function sendChatMessage(chatId: string, senderId: string, senderRole: string, content: string) {
  const { data, error } = await supabase
    .from('support_messages')
    .insert({
      chat_id: chatId,
      sender_id: senderId,
      sender_role: senderRole,
      content: content,
    })
    .select()
    .single();

  if (error) throw error;

  // Touch support_chats updated_at column
  await supabase
    .from('support_chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', chatId);

  return data;
}

/**
 * Subscribes to new messages in a chat session.
 */
export function subscribeToChatMessages(chatId: string, onNewMessage: (message: Message) => void) {
  return supabase
    .channel(`chat_messages:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `chat_id=eq.${chatId}`,
      },
      (payload: RealtimePostgresChangesPayload<Message>) => {
        onNewMessage(payload.new as Message);
      }
    )
    .subscribe();
}

/**
 * Subscribes to typing indicator broadcasts in a chat session.
 */
export function subscribeToTyping(chatId: string, onTyping: (userId: string, isTyping: boolean) => void) {
  const channel = supabase.channel(`chat_typing:${chatId}`);

  channel
    .on('broadcast', { event: 'typing' }, (payload: { payload: { userId: string; isTyping: boolean } }) => {
      onTyping(payload.payload.userId, payload.payload.isTyping);
    })
    .subscribe();

  return {
    sendTyping(userId: string, isTyping: boolean) {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, isTyping },
      });
    },
    unsubscribe() {
      channel.unsubscribe();
    }
  };
}
