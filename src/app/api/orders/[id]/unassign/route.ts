import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';

function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                   process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-ref') ||
                   !user;

    let driverName = 'A driver';
    if (!isMock) {
      // Check user role in Supabase
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'DRIVER') {
        return NextResponse.json({ error: 'Forbidden: Only drivers can decline orders' }, { status: 403 });
      }
      driverName = profile.full_name || 'A driver';
    }

    // 1. Unassign driver in the database
    const useSupabase =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-ref');

    let updatedOrder: any = null;

    if (useSupabase) {
      const adminClient = createAdminClient();
      const { data, error } = await adminClient
        .from('orders')
        .update({ driver_id: null, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select('*, order_items(*), driver:driver_id(full_name, phone)')
        .single();
      
      if (error) throw error;
      updatedOrder = data; // the front-end doesn't strictly need mapped order for this endpoint
    } else {
      updatedOrder = await db.unassignDriver(orderId);
    }

    // 2. Trigger notification to staff if database is Supabase
    if (useSupabase) {
      try {
        const adminSupabase = createAdminClient();

        // Get all staff/admin/owner profiles to notify them
        const { data: staffUsers } = await adminSupabase
          .from('profiles')
          .select('id')
          .in('role', ['OWNER', 'ADMIN', 'STAFF']);

        if (staffUsers && staffUsers.length > 0) {
          const notifications = staffUsers.map((staff: { id: string }) => ({
            user_id: staff.id,
            type: 'system_alert',
            title: 'Driver Declined Order 🚨',
            body: `${driverName} has declined order #${orderId.slice(0, 8)}. It needs to be reassigned immediately.`,
            metadata: { orderId, action: 'reassign_driver' },
          }));

          await adminSupabase.from('notifications').insert(notifications);
        }
      } catch (notifyErr) {
        console.error('Failed to dispatch unassign notification:', notifyErr);
      }
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: any) {
    console.error('Failed to unassign driver:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
