import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { verifyHmac } from '@/lib/paymob';

function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const hmacReceived = url.searchParams.get('hmac');

    if (!hmacReceived) {
      console.error('Paymob Webhook Error: Missing HMAC parameter');
      return NextResponse.json({ error: 'Missing HMAC signature' }, { status: 401 });
    }

    const payload = await req.json();
    const { type, obj } = payload;

    if (!type || !obj) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // 1. Verify Paymob HMAC Signature
    const isVerified = verifyHmac(hmacReceived, obj);
    if (!isVerified) {
      console.error('Paymob Webhook Error: HMAC signature verification failed');
      return NextResponse.json({ error: 'HMAC verification failed' }, { status: 401 });
    }

    // Only process transaction webhooks
    if (type !== 'TRANSACTION') {
      return NextResponse.json({ success: true, message: 'Non-transaction webhook ignored' });
    }

    const merchantOrderId = obj.order?.merchant_order_id;
    const paymobTransactionId = String(obj.id);
    const paymobOrderId = String(obj.order?.id || '');
    const amount = Number(obj.amount_cents || 0) / 100;
    const isSuccess = obj.success === true || obj.success === 'true';
    const isPending = obj.pending === true || obj.pending === 'true';

    if (!merchantOrderId) {
      console.error('Paymob Webhook Error: Missing merchant_order_id');
      return NextResponse.json({ error: 'Missing merchant_order_id' }, { status: 400 });
    }

    console.log(
      `[Paymob Webhook] Processing transaction ${paymobTransactionId} for Order ${merchantOrderId}: Success=${isSuccess}, Pending=${isPending}`
    );

    // Determine status values
    const paymentStatus = isSuccess ? 'PAID' : isPending ? 'PENDING' : 'FAILED';
    // If paid, change order status to PREPARING
    const orderStatus = isSuccess ? 'PREPARING' : 'PENDING';

    const useSupabase =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-ref') &&
      isValidUuid(merchantOrderId);

    if (useSupabase) {
      const supabase = createAdminClient();

      // Get current order to retrieve customer_id for notifications
      const { data: orderData } = await supabase
        .from('orders')
        .select('customer_id')
        .eq('id', merchantOrderId)
        .single();

      // A. Update Order
      const updateData: any = {
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      };
      if (isSuccess) {
        updateData.status = orderStatus;
      }
      await supabase.from('orders').update(updateData).eq('id', merchantOrderId);

      // B. Update/Upsert Payment Transaction record
      const { data: existingTx } = await supabase
        .from('payment_transactions')
        .select('id')
        .eq('order_id', merchantOrderId)
        .maybeSingle();

      if (existingTx) {
        await supabase
          .from('payment_transactions')
          .update({
            status: paymentStatus,
            provider_transaction_id: paymobTransactionId,
            provider_order_id: paymobOrderId,
            updated_at: new Date().toISOString(),
            metadata: obj,
          })
          .eq('order_id', merchantOrderId);
      } else {
        await supabase.from('payment_transactions').insert({
          order_id: merchantOrderId,
          customer_id: orderData?.customer_id || obj.profile?.id,
          provider: 'paymob',
          method: obj.source_data?.sub_type === 'fawry' ? 'FAWRY' : 'CARD',
          amount,
          status: paymentStatus,
          provider_transaction_id: paymobTransactionId,
          provider_order_id: paymobOrderId,
          metadata: obj,
        });
      }

      // C. Send Notification to User if we have their customer_id
      if (orderData?.customer_id) {
        let title = 'Payment Received!';
        let body = `Thank you! Your payment of ${amount} EGP was received. Your order is now preparing.`;
        
        if (paymentStatus === 'FAILED') {
          title = 'Payment Failed';
          body = `Unfortunately, your payment of ${amount} EGP failed. Please check checkout and try again.`;
        }

        await supabase.from('notifications').insert({
          user_id: orderData.customer_id,
          type: 'payment',
          title,
          body,
          metadata: { orderId: merchantOrderId, transactionId: paymobTransactionId },
        });
      }
    } else {
      // Fallback: Update mock DB orders
      try {
        const order = await db.getOrderById(merchantOrderId);
        if (order) {
          if (isSuccess) {
            await db.updateOrderStatus(merchantOrderId, 'PREPARING');
          }
          // Note: In mock DB, order doesn't store a separate payment_status field directly, 
          // but we simulate changing the overall order status to PREPARING on payment success.
        }
      } catch (err) {
        console.error('Failed to update mock database order status:', err);
      }
    }

    return NextResponse.json({ success: true, status: paymentStatus });
  } catch (err: any) {
    console.error('Paymob Webhook failure:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
