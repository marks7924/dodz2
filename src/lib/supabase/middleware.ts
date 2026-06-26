import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project-ref.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key-here';

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing security sensitive checks under paths that are excluded in middleware config
  const { data: { user } } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();

  // Role-based route protection
  if (url.pathname.startsWith('/admin')) {
    if (!user) {
      url.pathname = '/auth/login';
      url.searchParams.set('next', url.pathname);
      return NextResponse.redirect(url);
    }

    // Retrieve user's role from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_suspended')
      .eq('id', user.id)
      .single();

    if (!profile || profile.is_suspended || !['OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER', 'STAFF'].includes(profile.role)) {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  if (url.pathname.startsWith('/driver')) {
    if (!user) {
      url.pathname = '/auth/login';
      url.searchParams.set('next', url.pathname);
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_suspended')
      .eq('id', user.id)
      .single();

    if (!profile || profile.is_suspended || profile.role !== 'DRIVER') {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  if (url.pathname.startsWith('/checkout')) {
    if (!user) {
      url.pathname = '/auth/login';
      url.searchParams.set('next', '/checkout');
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
