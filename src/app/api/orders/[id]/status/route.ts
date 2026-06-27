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
    const { status, driverId, cancellationReason } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                   process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-ref') ||
                   !user;

    const useSupabase =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-ref');

    if (useSupabase && !isMock) {
      // 1. Fetch current order
      const adminClient = createAdminClient();
      const { data: order, error: orderErr } = await adminClient
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderErr || !order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // Check if user is the customer cancelling their own order
      const isOwnCancellation = order.customer_id === user.id && status === 'CANCELLED';
      const orderTime = new Date(order.created_at).getTime();
      const elapsedMinutes = (Date.now() - orderTime) / 60000;
      
      const isCustomerAllowed = isOwnCancellation && order.status === 'PENDING' && elapsedMinutes < 5;

      if (!isCustomerAllowed) {
        // Otherwise, verify staff/driver role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!profile || !['OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER', 'STAFF', 'DRIVER'].includes(profile.role)) {
          return NextResponse.json({ error: 'Forbidden: Unauthorized role' }, { status: 403 });
        }
      }
    }

    let updatedOrder: any = null;

    if (useSupabase) {
      const adminClient = createAdminClient();
      const updatePayload: any = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (driverId && isValidUuid(driverId)) {
        updatePayload.driver_id = driverId;
      }
      if (cancellationReason) {
        updatePayload.cancellation_reason = cancellationReason;
      }

      const { data, error } = await adminClient
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId)
        .select('*, order_items(*), driver:driver_id(full_name, phone)')
        .single();
      
      if (error) throw error;
      
      // Map it to frontend Order interface
      updatedOrder = {
        id: data.id,
        userId: data.customer_id,
        userName: data.customer_name || 'Customer',
        userPhone: data.customer_phone || '',
        branchId: data.branch_id || '',
        type: data.type,
        status: data.status,
        total: data.total,
        deliveryFee: data.delivery_fee,
        address: data.delivery_address || '',
        couponCode: data.coupon_code || undefined,
        discount: data.discount_value,
        paymentMethod: data.payment_method,
        driverId: data.driver_id || undefined,
        driverName: data.driver?.full_name || undefined,
        driverPhone: data.driver?.phone || undefined,
        notes: data.notes || undefined,
        cancellationReason: data.cancellation_reason || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        items: data.order_items ? data.order_items.map((i: any) => ({
          id: i.id,
          productId: i.menu_item_id,
          productNameEn: i.product_name_en,
          productNameAr: i.product_name_ar,
          size: i.size,
          quantity: i.quantity,
          price: i.unit_price,
        })) : [],
      };
    } else {
      updatedOrder = await db.updateOrderStatus(orderId, status, driverId, cancellationReason);
    }

    // 2. Trigger notification to customer if database is Supabase
    if (useSupabase && isValidUuid(updatedOrder.userId)) {
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
          title = 'Order Cancelled ❌';
          bodyMsg = cancellationReason
            ? `Your order has been cancelled. Reason: ${cancellationReason}`
            : 'Your order has been cancelled.';
        }

        const isOwnCancellation = status === 'CANCELLED' && 
                                   (cancellationReason === 'Cancelled by Customer' || cancellationReason === 'تم الإلغاء بواسطة العميل');
        
        if (!isOwnCancellation) {
          await supabase.from('notifications').insert({
            user_id: updatedOrder.userId,
            type: 'order_status',
            title,
            body: bodyMsg,
            metadata: { orderId, status, cancellationReason },
          });
        }
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
