import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Coupon code query parameter is required' },
        { status: 400 }
      );
    }

    const coupon = await db.getCouponByCode(code);

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Invalid or inactive coupon code' },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      coupon,
    });
  } catch (err: any) {
    console.error('Failed to validate coupon:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
