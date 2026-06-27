import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: targetUserId } = await params;

    // Check if the current user is authorized (ADMIN or OWNER)
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (!profile || !['ADMIN', 'HEAD_ADMIN', 'OWNER', 'DEVELOPER'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse body parameters
    const updates = await request.json();
    const { fullName, phone, role, branchIds = [], isSuspended, isActive } = updates;

    const adminClient = createAdminClient();

    // Update the profile table
    const firstBranchId = branchIds.length > 0 ? branchIds[0] : null;
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        full_name: fullName,
        phone: phone,
        role: role,
        branch_id: firstBranchId,
        is_suspended: isSuspended,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    // Sync user_branch_assignments
    await adminClient
      .from('user_branch_assignments')
      .delete()
      .eq('user_id', targetUserId);

    if (branchIds && branchIds.length > 0) {
      const assignments = branchIds.map((bid: string) => ({
        user_id: targetUserId,
        branch_id: bid,
      }));
      const { error: assignError } = await adminClient
        .from('user_branch_assignments')
        .insert(assignments);

      if (assignError) {
        console.error('Failed to update branch assignments during user update:', assignError);
      }
    }

    // If suspended is set to true, we should revoke user's sessions
    if (updates.isSuspended) {
      await adminClient.auth.admin.signOut(targetUserId);
    }

    // Log activity
    await adminClient.from('activity_logs').insert({
      actor_id: currentUser.id,
      actor_email: currentUser.email,
      action: 'UPDATE_USER',
      resource_type: 'USER',
      resource_id: targetUserId,
      metadata: updates,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error updating user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: targetUserId } = await params;

    // Check if the current user is authorized (ADMIN or OWNER)
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (!profile || !['ADMIN', 'HEAD_ADMIN', 'OWNER', 'DEVELOPER'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // Delete from auth.users (cascade takes care of profiles)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    // Log activity
    await adminClient.from('activity_logs').insert({
      actor_id: currentUser.id,
      actor_email: currentUser.email,
      action: 'DELETE_USER',
      resource_type: 'USER',
      resource_id: targetUserId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error deleting user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
