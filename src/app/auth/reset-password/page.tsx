'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/context/LanguageContext';
import { Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Flame } from 'lucide-react';

// Inner component that uses useSearchParams — must be wrapped in Suspense
function ResetPasswordContent() {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // If there's a recovery token in URL, we're in "set new password" mode
  const isSettingNewPassword = searchParams.get('type') === 'recovery';

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
      const redirectUrl = `${appUrl}/auth/reset-password?type=recovery`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: redirectUrl }
      );
      if (resetError) throw resetError;
      setSuccess(true);
    } catch {
      setError(locale === 'en' ? 'Failed to send reset email. Please try again.' : 'فشل إرسال بريد إعادة التعيين. حاول مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError(locale === 'en' ? 'Password must be at least 8 characters.' : 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(locale === 'en' ? 'Passwords do not match.' : 'كلمتا المرور غير متطابقتين.');
      return;
    }
    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => router.push('/auth/login'), 2000);
    } catch {
      setError(locale === 'en' ? 'Failed to update password.' : 'فشل تحديث كلمة المرور.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary-red/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="text-4xl font-extrabold tracking-wider bg-gradient-to-r from-primary-red to-accent-amber bg-clip-text text-transparent">DODZ</span>
            <span className="text-sm font-bold uppercase tracking-widest text-white px-2 py-0.5 rounded bg-primary-red">Fried Chicken</span>
          </Link>
        </div>

        <div className="bg-card border border-card-border rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-8 rounded-xl bg-primary-red/10 flex items-center justify-center">
              <Flame className="h-4 w-4 text-primary-red" />
            </div>
            <h1 className="text-lg font-bold text-white">
              {isSettingNewPassword
                ? (locale === 'en' ? 'Set New Password' : 'تعيين كلمة مرور جديدة')
                : t('resetPassword')}
            </h1>
          </div>

          {success ? (
            <div className="text-center space-y-4 py-4">
              <div className="h-16 w-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-sm text-text-muted">
                {isSettingNewPassword
                  ? (locale === 'en' ? 'Password updated! Redirecting to login...' : 'تم تحديث كلمة المرور! جاري إعادة التوجيه...')
                  : t('resetLinkSent')}
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2 text-xs text-red-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {isSettingNewPassword ? (
                <form onSubmit={handleSetNewPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                      {locale === 'en' ? 'New Password' : 'كلمة المرور الجديدة'}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 rtl:right-3 rtl:left-auto top-3.5 h-4 w-4 text-text-muted" />
                      <input
                        id="reset-new-password"
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        required
                        className="w-full text-sm bg-card-border border border-card-border rounded-xl pl-10 pr-10 py-3 text-white placeholder:text-text-muted focus:outline-none focus:border-primary-red/60 transition-colors"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-text-muted hover:text-white">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                      {locale === 'en' ? 'Confirm New Password' : 'تأكيد كلمة المرور'}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 rtl:right-3 rtl:left-auto top-3.5 h-4 w-4 text-text-muted" />
                      <input
                        id="reset-confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        required
                        className="w-full text-sm bg-card-border border border-card-border rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-text-muted focus:outline-none focus:border-primary-red/60 transition-colors"
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={isLoading}
                    className="w-full py-3.5 bg-primary-red hover:bg-primary-red-hover disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer">
                    {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /><span>{t('loading')}</span></> : <span>{locale === 'en' ? 'Update Password' : 'تحديث كلمة المرور'}</span>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <p className="text-xs text-text-muted leading-relaxed">
                    {locale === 'en'
                      ? 'Enter your email address and we will send you a link to reset your password.'
                      : 'أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.'}
                  </p>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">{t('email')}</label>
                    <div className="relative">
                      <Mail className="absolute left-3 rtl:right-3 rtl:left-auto top-3.5 h-4 w-4 text-text-muted" />
                      <input
                        id="reset-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full text-sm bg-card-border border border-card-border rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-text-muted focus:outline-none focus:border-primary-red/60 transition-colors"
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={isLoading}
                    className="w-full py-3.5 bg-primary-red hover:bg-primary-red-hover disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer">
                    {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /><span>{t('loading')}</span></> : <span>{locale === 'en' ? 'Send Reset Link' : 'إرسال رابط إعادة التعيين'}</span>}
                  </button>
                </form>
              )}
            </>
          )}

          <div className="mt-6 text-center text-xs text-text-muted">
            <Link href="/auth/login" className="text-accent-amber hover:text-accent-amber-hover font-semibold transition-colors">
              ← {t('login')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Outer page component wraps the inner in Suspense (required for useSearchParams in Next.js App Router)
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary-red border-t-transparent animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
