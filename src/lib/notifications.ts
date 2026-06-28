import { createClient } from './supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface Notification {
  id: string;
  user_id: string;
  type:
    | 'new_order'
    | 'order_status'
    | 'new_chat'
    | 'payment'
    | 'role_change'
    | 'delivery_update'
    | 'system';
  title: string;
  body: string;
  is_read: boolean;
  metadata: Record<string, any> | null;
  created_at: string;
}

const supabase = createClient();

/**
 * Fetches all notifications for the current user (most recent first).
 */
export async function getNotifications(userId: string, limit = 30): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as Notification[];
}

/**
 * Returns the count of unread notifications for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) return 0;
  return count ?? 0;
}

/**
 * Marks a single notification as read.
 */
export async function markAsRead(notificationId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
}

/**
 * Marks all notifications for a user as read.
 */
export async function markAllAsRead(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
}

/**
 * Deletes all notifications for a user.
 */
export async function clearAllNotifications(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId);
  if (error) throw error;
}

/**
 * Subscribes to new notifications for a specific user via Supabase Realtime.
 * Returns a channel subscription that should be unsubscribed when done.
 */
export function subscribeToNotifications(
  userId: string,
  onNewNotification: (notification: Notification) => void
) {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload: RealtimePostgresChangesPayload<Notification>) => {
        onNewNotification(payload.new as Notification);
      }
    )
    .subscribe();
}

/**
 * Creates a notification for a specific user (called from admin/server actions).
 * Note: On client side this requires the user to have insert permissions on notifications.
 * For production, call a server action or API route instead.
 */
export async function createNotification(params: {
  userId: string;
  type: Notification['type'];
  title: string;
  body: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    metadata: params.metadata ?? null,
    is_read: false,
  });

  if (error) throw error;
}
