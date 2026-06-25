import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';

function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await req.json();
    const { status, driverId } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                   process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-ref') ||
                   !user;

    if (!isMock) {
      // Check user role in Supabase
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !['OWNER', 'ADMIN', 'DEVELOPER', 'STAFF', 'DRIVER'].includes(profile.role)) {
        return NextResponse.json({ error: 'Forbidden: Unauthorized role' }, { status: 403 });
      }
    }

    // 1. Update order status in the database
    const updatedOrder = await db.updateOrderStatus(orderId, status, driverId);

    // 2. Trigger notification to customer if database is Supabase
    const useSupabase =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-ref') &&
      isValidUuid(updatedOrder.userId);

    if (useSupabase) {
      try {
        const supabase = createAdminClient();

        // Get status message details in EN/AR
        let title = 'Order Update';
        let bodyMsg = `Your order status is now: ${status}`;

        if (status === 'PREPARING') {
          title = 'Cooking Started 🍳';
          bodyMsg = 'Our kitchen is now preparing your delicious fresh meal.';
        } else if (status === 'ON_THE_WAY') {
          title = 'Out for Delivery 🛵';
          bodyMsg = 'Your hot food is on the way to your doorstep!';
        } else if (status === 'DELIVERED') {
          title = 'Order Delivered! 🎉';
          bodyMsg = 'Enjoy your fresh Dodz Fried Chicken! Thank you for ordering.';
        } else if (status === 'CANCELLED') {
          title = 'Order Cancelled';
          bodyMsg = 'Your order has been cancelled.';
        }

        await supabase.from('notifications').insert({
          user_id: updatedOrder.userId,
          type: 'order_status',
          title,
          body: bodyMsg,
          metadata: { orderId, status },
        });
      } catch (notifyErr) {
        console.error('Failed to dispatch status notification:', notifyErr);
      }
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: any) {
    console.error('Failed to update order status:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
