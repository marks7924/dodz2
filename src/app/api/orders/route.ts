import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { validateOrderPayload } from '@/lib/validation';

function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check if we are running in local fallback / mock mode
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                   process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-ref') ||
                   !user;

    const url = new URL(req.url);
    const statusFilter = url.searchParams.get('status') || undefined;

    if (isMock) {
      // Local development mock orders fallback
      const orders = await db.getOrders({ status: statusFilter });
      return NextResponse.json({ success: true, orders });
    }

    // 1. Fetch authenticated user profile to get their role and branch
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { role, branch_id: branchId } = profile;
    let ordersFilter: { userId?: string; driverId?: string; status?: string } = {
      status: statusFilter,
    };

    // 2. Enforce Role-Based Filters
    if (role === 'CUSTOMER') {
      ordersFilter.userId = user.id;
    } else if (role === 'DRIVER') {
      ordersFilter.driverId = user.id;
    } else if (role === 'STAFF') {
      // Staff see orders from their own branch
      const orders = await db.getOrders({ status: statusFilter });
      const branchOrders = orders.filter((o) => o.branchId === branchId);
      return NextResponse.json({ success: true, orders: branchOrders });
    }
    // OWNER, ADMIN, DEVELOPER see all orders (no role filter applied)

    const orders = await db.getOrders(ordersFilter);
    return NextResponse.json({ success: true, orders });
  } catch (err: any) {
    console.error('Failed to retrieve orders:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate order payload
    const validation = validateOrderPayload(body);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const order = await db.createOrder(body);
    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    console.error('Failed to create order via API:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
