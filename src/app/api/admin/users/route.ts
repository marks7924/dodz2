import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

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
    const { email, password, fullName, phone, role, branchId } = await request.json();

    if (!email || !password || !fullName || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Initialize admin client to bypass email verification and directly create user
    const adminClient = createAdminClient();

    // Create user in Supabase Auth
    const { data: newAuthUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError || !newAuthUser.user) {
      return NextResponse.json({ error: createError?.message || 'Failed to create auth user' }, { status: 400 });
    }

    const newUserId = newAuthUser.user.id;

    // Create profile
    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id: newUserId,
        full_name: fullName,
        phone: phone || null,
        role: role,
        branch_id: branchId || null,
        is_active: true,
        is_suspended: false,
      });

    if (profileError) {
      // Cleanup auth user if profile creation fails
      await adminClient.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    // Log activity
    await adminClient.from('activity_logs').insert({
      actor_id: currentUser.id,
      actor_email: currentUser.email,
      action: 'CREATE_USER',
      resource_type: 'USER',
      resource_id: newUserId,
      metadata: { role, email, fullName },
    });

    return NextResponse.json({ success: true, userId: newUserId });
  } catch (error: any) {
    console.error('API Error creating user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
