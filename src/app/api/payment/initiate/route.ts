import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { validateOrderPayload } from '@/lib/validation';
import {
  getAuthToken,
  createPaymobOrder,
  getPaymentKey,
  payWithFawry,
  isMockMode,
} from '@/lib/paymob';

function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      userName,
      userPhone,
      branchId,
      type,
      address,
      paymentMethod,
      total,
      deliveryFee,
      discount,
      couponCode,
      items,
      lat,
      lng,
      notes,
    } = body;

    // Validate order payload
    const validation = validateOrderPayload(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const useSupabase =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-ref') &&
      isValidUuid(userId);

    let orderId: string;
    let orderTotal = total;

    if (useSupabase) {
      try {
        const supabase = await createClient();

        // 1. Insert order into Supabase
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            customer_id: userId,
            branch_id: isValidUuid(branchId) ? branchId : null,
            type,
            status: 'PENDING',
            payment_method: paymentMethod,
            payment_status: 'PENDING',
            total,
            delivery_fee: deliveryFee || 0,
            address,
            coupon_code: couponCode || null,
            discount: discount || 0,
            customer_name: userName,
            customer_phone: userPhone,
            notes: notes || '',
            lat: lat || null,
            lng: lng || null,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        orderId = orderData.id;
        orderTotal = Number(orderData.total);

        // 2. Insert order items
        const orderItems = items.map((it: any) => ({
          order_id: orderId,
          menu_item_id: isValidUuid(it.productId) ? it.productId : null,
          name_en: it.productNameEn || it.nameEn,
          name_ar: it.productNameAr || it.nameAr,
          size: it.size || 'NONE',
          quantity: it.quantity || 1,
          price: it.price,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;
      } catch (err: any) {
        console.error('Supabase order creation failed, falling back to mock DB:', err.message || err);
        // Fallback to mock DB
        const mockOrder = await db.createOrder({
          userId,
          userName,
          userPhone,
          branchId,
          type,
          address,
          paymentMethod,
          total,
          deliveryFee,
          discount,
          couponCode,
          notes,
          items,
        });
        orderId = mockOrder.id;
      }
    } else {
      // Use mock DB directly
      const mockOrder = await db.createOrder({
        userId,
        userName,
        userPhone,
        branchId,
        type,
        address,
        paymentMethod,
        total,
        deliveryFee,
        discount,
        couponCode,
        notes,
        items,
      });
      orderId = mockOrder.id;
    }

    // 3. Payment handling based on method
    if (paymentMethod === 'COD') {
      return NextResponse.json({
        success: true,
        orderId,
        paymentMethod: 'COD',
      });
    }

    // Paymob parameters
    const totalCents = Math.round(orderTotal * 100);
    const firstName = userName.split(' ')[0] || 'Dodz';
    const lastName = userName.split(' ').slice(1).join(' ') || 'Customer';

    const integrationId =
      paymentMethod === 'CARD'
        ? Number(process.env.PAYMOB_INTEGRATION_ID_CARD || 0)
        : Number(process.env.PAYMOB_INTEGRATION_ID_FAWRY || 0);

    const billingData = {
      first_name: firstName,
      last_name: lastName,
      email: body.email || 'customer@dodz.com',
      phone_number: userPhone,
      street: address || 'NA',
    };

    try {
      // Step A: Paymob Auth
      const authToken = await getAuthToken();

      // Step B: Paymob Order registration
      const paymobOrderId = await createPaymobOrder(authToken, totalCents, orderId);

      // Step C: Paymob Payment key request
      const paymentKey = await getPaymentKey(
        authToken,
        paymobOrderId,
        totalCents,
        integrationId,
        billingData
      );

      // Insert transaction info into Supabase if using real DB
      if (useSupabase) {
        try {
          const supabase = await createClient();
          await supabase.from('payment_transactions').insert({
            order_id: orderId,
            customer_id: userId,
            provider: 'paymob',
            method: paymentMethod,
            amount: orderTotal,
            status: 'PENDING',
            provider_order_id: paymobOrderId.toString(),
            payment_key: paymentKey,
          });
        } catch (dbErr) {
          console.error('Failed to save payment transaction details:', dbErr);
        }
      }

      if (paymentMethod === 'FAWRY') {
        // Step D: Execute payment for Fawry to get the reference code
        const fawryResult = await payWithFawry(paymentKey, userPhone);

        // Update transaction in database
        if (useSupabase) {
          try {
            const supabase = await createClient();
            await supabase
              .from('payment_transactions')
              .update({
                fawry_ref_number: fawryResult.bill_reference,
                provider_transaction_id: fawryResult.id.toString(),
              })
              .eq('order_id', orderId);
          } catch (dbErr) {
            console.error('Failed to update Fawry transaction:', dbErr);
          }
        }

        return NextResponse.json({
          success: true,
          orderId,
          paymentMethod: 'FAWRY',
          fawryRefNumber: fawryResult.bill_reference,
        });
      } else {
        // CARD payment method
        const iframeId = process.env.NEXT_PUBLIC_PAYMOB_IFRAME_ID || '844356';
        const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`;

        return NextResponse.json({
          success: true,
          orderId,
          paymentMethod: 'CARD',
          paymentKey,
          iframeUrl,
        });
      }
    } catch (paymobErr: any) {
      console.error('Paymob workflow failure:', paymobErr.message || paymobErr);
      
      // If Paymob fails but we are in mock mode or error happened, we can return a fallback mock success
      if (isMockMode()) {
        const mockFawryRef = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        return NextResponse.json({
          success: true,
          orderId,
          paymentMethod,
          fawryRefNumber: paymentMethod === 'FAWRY' ? mockFawryRef : undefined,
          iframeUrl:
            paymentMethod === 'CARD'
              ? `/payment/mock-iframe?orderId=${orderId}&amount=${orderTotal}`
              : undefined,
        });
      }

      return NextResponse.json(
        { error: 'Failed to initiate payment gateway' },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error('Initiate payment general failure:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
