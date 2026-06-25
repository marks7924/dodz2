'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/context/LanguageContext';
import { Eye, EyeOff, Flame, AlertCircle, Loader2, Lock, Mail } from 'lucide-react';

type UserRole = 'CUSTOMER' | 'DRIVER' | 'STAFF' | 'ADMIN' | 'DEVELOPER' | 'OWNER';

const ROLE_REDIRECTS: Record<UserRole, string> = {
  OWNER: '/admin',
  ADMIN: '/admin',
  DEVELOPER: '/admin',
  STAFF: '/admin',
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
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        setError(
          locale === 'en'
            ? 'Invalid email or password. Please try again.'
            : 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
        );
        return;
      }

      if (data.user) {
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
        const redirectPath = ROLE_REDIRECTS[role] || '/';
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
