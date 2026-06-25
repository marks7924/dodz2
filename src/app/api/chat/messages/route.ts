import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const chatId = url.searchParams.get('chatId');
    const customerId = url.searchParams.get('customerId');

    if (!chatId && !customerId) {
      return NextResponse.json(
        { error: 'Either chatId or customerId query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    let targetChatId = chatId;

    // Resolve chatId from customerId if needed
    if (!targetChatId && customerId && isValidUuid(customerId)) {
      const { data: existingChat } = await supabase
        .from('support_chats')
        .select('id')
        .eq('customer_id', customerId)
        .eq('status', 'OPEN')
        .maybeSingle();

      if (existingChat) {
        targetChatId = existingChat.id;
      } else {
        // Return empty messages list if chat doesn't exist yet
        return NextResponse.json({ success: true, messages: [], chatId: null });
      }
    }

    if (!targetChatId || !isValidUuid(targetChatId)) {
      return NextResponse.json({ success: true, messages: [], chatId: null });
    }

    const { data: messages, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('chat_id', targetChatId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      chatId: targetChatId,
      messages,
    });
  } catch (err: any) {
    console.error('Failed to retrieve chat messages:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, senderId, senderRole, senderName, content } = body;

    if (!chatId || !senderId || !senderRole || !content) {
      return NextResponse.json(
        { error: 'Missing required chat message parameters' },
        { status: 400 }
      );
    }

    if (!isValidUuid(chatId) || !isValidUuid(senderId)) {
      return NextResponse.json(
        { error: 'chatId and senderId must be valid UUIDs' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Insert message
    const { data: message, error } = await supabase
      .from('support_messages')
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        sender_role: senderRole,
        content,
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Touch support_chats updated_at
    await supabase
      .from('support_chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chatId);

    // 3. Send notification to the other party
    try {
      const adminSupabase = createAdminClient();

      // Retrieve chat session details
      const { data: chatSession } = await adminSupabase
        .from('support_chats')
        .select('customer_id, assigned_staff_id')
        .eq('id', chatId)
        .single();

      if (chatSession) {
        const isStaffSender = ['STAFF', 'ADMIN', 'DEVELOPER', 'OWNER'].includes(senderRole);

        if (isStaffSender && chatSession.customer_id) {
          // Notify customer that staff replied
          await adminSupabase.from('notifications').insert({
            user_id: chatSession.customer_id,
            type: 'new_chat',
            title: `Support Message from ${senderName}`,
            body: content.length > 50 ? `${content.substring(0, 50)}...` : content,
            metadata: { chatId },
          });
        } else if (!isStaffSender && chatSession.assigned_staff_id) {
          // Notify assigned staff
          await adminSupabase.from('notifications').insert({
            user_id: chatSession.assigned_staff_id,
            type: 'new_chat',
            title: `Customer Message from ${senderName}`,
            body: content.length > 50 ? `${content.substring(0, 50)}...` : content,
            metadata: { chatId },
          });
        }
      }
    } catch (notifyErr) {
      console.error('Failed to dispatch chat message notification:', notifyErr);
    }

    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    console.error('Failed to post chat message:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
