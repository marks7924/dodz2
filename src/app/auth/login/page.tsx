'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/context/LanguageContext';
import { Eye, EyeOff, Flame, AlertCircle, Loader2, Lock, Mail } from 'lucide-react';

type UserRole = 'CUSTOMER' | 'DRIVER' | 'STAFF' | 'ADMIN' | 'HEAD_ADMIN' | 'DEVELOPER' | 'OWNER' | 'CUSTOMER_SERVICE';

const ROLE_REDIRECTS: Record<UserRole, string> = {
  OWNER: '/admin',
  HEAD_ADMIN: '/admin',
  ADMIN: '/admin',
  DEVELOPER: '/admin',
  STAFF: '/admin',
  CUSTOMER_SERVICE: '/admin',
  DRIVER: '/driver',
  CUSTOMER: '/',
};

export default function LoginPage() {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let loginEmail = email.trim().toLowerCase();
      let { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (authError) {
        const demoAccounts: Record<string, { role: string; name: string; phone: string; pass: string }> = {
          'owner@dodz.com': { role: 'OWNER', name: 'Sherif Dodz (Owner)', phone: '01011112222', pass: 'owner123' },
          'admin@dodz.com': { role: 'ADMIN', name: 'Branch Admin', phone: '01099998888', pass: 'admin123' },
          'headadmin@dodz.com': { role: 'HEAD_ADMIN', name: 'Head Admin User', phone: '01055556666', pass: 'headadmin123' },
          'staff@dodz.com': { role: 'STAFF', name: 'Karim Aly (Kitchen)', phone: '01033334444', pass: 'staff123' },
          'customerservice@dodz.com': { role: 'CUSTOMER_SERVICE', name: 'Customer Service', phone: '01012345678', pass: 'customerservice123' },
          'driver@dodz.com': { role: 'DRIVER', name: 'Mustafa Salem (Driver)', phone: '01255556666', pass: 'driver123' },
          'customer@dodz.com': { role: 'CUSTOMER', name: 'Mina Ramzy', phone: '01599990000', pass: 'customer123' }
        };

        const demo = demoAccounts[loginEmail];
        if (demo && password === demo.pass) {
          // Provision the user transparently
          const signUpResult = await supabase.auth.signUp({
            email: loginEmail,
            password,
            options: {
              data: {
                full_name: demo.name,
                phone: demo.phone,
                role: demo.role,
              }
            }
          });

          if (!signUpResult.error) {
            const retryResult = await supabase.auth.signInWithPassword({
              email: loginEmail,
              password,
            });
            if (!retryResult.error) {
              data = retryResult.data;
              authError = null;
            }
          }
        }
      }

      if (authError) {
        setError(
          locale === 'en'
            ? 'Invalid email or password. Please try again.'
            : 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
        );
        return;
      }

      if (data && data.user) {
        // Fetch role from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_suspended')
          .eq('id', data.user.id)
          .single();

        if (profile?.is_suspended) {
          await supabase.auth.signOut();
          setError(
            locale === 'en'
              ? 'Your account has been suspended. Please contact support.'
              : 'تم تعليق حسابك. يرجى التواصل مع الدعم.'
          );
          return;
        }

        const role = (profile?.role as UserRole) || 'CUSTOMER';
        const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const nextParam = searchParams ? searchParams.get('next') : null;
        const redirectPath = nextParam || ROLE_REDIRECTS[role] || '/';
        router.push(redirectPath);
        router.refresh();
      }
    } catch {
      setError(locale === 'en' ? 'An unexpected error occurred.' : 'حدث خطأ غير متوقع.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary-red/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <span className="text-4xl font-extrabold tracking-wider bg-gradient-to-r from-primary-red to-accent-amber bg-clip-text text-transparent">
              DODZ
            </span>
            <span className="text-sm font-bold uppercase tracking-widest text-white px-2 py-0.5 rounded bg-primary-red">
              Fried Chicken
            </span>
          </Link>
          <p className="mt-3 text-text-muted text-sm">
            {locale === 'en' ? 'Sign in to your account' : 'تسجيل الدخول إلى حسابك'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-card-border rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-8 rounded-xl bg-primary-red/10 flex items-center justify-center">
              <Flame className="h-4 w-4 text-primary-red" />
            </div>
            <h1 className="text-lg font-bold text-white">
              {locale === 'en' ? 'Welcome Back' : 'مرحباً بعودتك'}
            </h1>
          </div>

          {/* Quick Access Developer / Test Accounts */}
          <div className="mb-6">
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-2 text-center">
              Quick Access (Demo)
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={() => { setEmail('owner@dodz.com'); setPassword('owner123'); }}
                className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-bold rounded-lg hover:bg-purple-500 hover:text-white transition-all"
              >
                Owner
              </button>
              <button
                type="button"
                onClick={() => { setEmail('admin@dodz.com'); setPassword('admin123'); }}
                className="px-3 py-1 bg-primary-red/10 border border-primary-red/30 text-primary-red text-[10px] font-bold rounded-lg hover:bg-primary-red hover:text-white transition-all"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => { setEmail('headadmin@dodz.com'); setPassword('headadmin123'); }}
                className="px-3 py-1 bg-pink-500/10 border border-pink-500/30 text-pink-400 text-[10px] font-bold rounded-lg hover:bg-pink-500 hover:text-white transition-all"
              >
                Head Admin
              </button>
              <button
                type="button"
                onClick={() => { setEmail('staff@dodz.com'); setPassword('staff123'); }}
                className="px-3 py-1 bg-accent-amber/10 border border-accent-amber/30 text-accent-amber text-[10px] font-bold rounded-lg hover:bg-accent-amber hover:text-black transition-all"
              >
                Staff
              </button>
              <button
                type="button"
                onClick={() => { setEmail('customerservice@dodz.com'); setPassword('customerservice123'); }}
                className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold rounded-lg hover:bg-indigo-500 hover:text-white transition-all"
              >
                Customer Service
              </button>
              <button
                type="button"
                onClick={() => { setEmail('driver@dodz.com'); setPassword('driver123'); }}
                className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold rounded-lg hover:bg-blue-500 hover:text-white transition-all"
              >
                Driver
              </button>
              <button
                type="button"
                onClick={() => { setEmail('customer@dodz.com'); setPassword('customer123'); }}
                className="px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-bold rounded-lg hover:bg-green-500 hover:text-white transition-all"
              >
                Customer
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                {t('email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 rtl:right-3 rtl:left-auto top-3.5 h-4 w-4 text-text-muted" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full text-sm bg-card-border border border-card-border rounded-xl pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-3 text-white placeholder:text-text-muted focus:outline-none focus:border-primary-red/60 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  {t('password')}
                </label>
                <Link
                  href="/auth/reset-password"
                  className="text-xs text-primary-red hover:text-primary-red-hover transition-colors"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 rtl:right-3 rtl:left-auto top-3.5 h-4 w-4 text-text-muted" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full text-sm bg-card-border border border-card-border rounded-xl pl-10 pr-10 rtl:pr-10 rtl:pl-10 py-3 text-white placeholder:text-text-muted focus:outline-none focus:border-primary-red/60 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 rtl:left-3 rtl:right-auto top-3.5 text-text-muted hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-primary-red hover:bg-primary-red-hover disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary-red/30 flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t('loading')}</span>
                </>
              ) : (
                <span>{t('login')}</span>
              )}
            </button>
          </form>

          {/* Sign up link */}
          <div className="mt-6 text-center text-xs text-text-muted">
            <span>{t('noAccount')} </span>
            <Link
              href="/auth/signup"
              className="text-accent-amber hover:text-accent-amber-hover font-semibold transition-colors"
            >
              {t('signup')}
            </Link>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-text-muted hover:text-white transition-colors">
            ← {locale === 'en' ? 'Back to Menu' : 'العودة للقائمة'}
          </Link>
        </div>
      </div>
    </div>
  );
}
