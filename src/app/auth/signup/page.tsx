'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/context/LanguageContext';
import { Eye, EyeOff, Flame, AlertCircle, CheckCircle, Loader2, Mail, Lock, User, Phone } from 'lucide-react';

export default function SignupPage() {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    if (!fullName.trim()) {
      setError(locale === 'en' ? 'Full name is required.' : 'الاسم الكامل مطلوب.');
      return false;
    }
    if (password.length < 8) {
      setError(locale === 'en' ? 'Password must be at least 8 characters.' : 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
      return false;
    }
    if (password !== confirmPassword) {
      setError(locale === 'en' ? 'Passwords do not match.' : 'كلمتا المرور غير متطابقتين.');
      return false;
    }
    return true;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
      const redirectUrl = `${appUrl}/auth/callback`;

      const { error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim() || null,
            role: 'CUSTOMER',
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError(
            locale === 'en'
              ? 'This email is already registered. Please login instead.'
              : 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.'
          );
        } else {
          setError(authError.message);
        }
        return;
      }

      setSuccess(true);
    } catch {
      setError(locale === 'en' ? 'An unexpected error occurred.' : 'حدث خطأ غير متوقع.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="h-20 w-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {locale === 'en' ? 'Check Your Email!' : 'تحقق من بريدك الإلكتروني!'}
            </h1>
            <p className="text-sm text-text-muted leading-relaxed">
              {locale === 'en'
                ? `We sent a verification link to ${email}. Click the link to activate your account.`
                : `أرسلنا رابط التفعيل إلى ${email}. اضغط على الرابط لتفعيل حسابك.`}
            </p>
          </div>
          <Link
            href="/auth/login"
            className="inline-block px-8 py-3 bg-primary-red hover:bg-primary-red-hover text-white text-sm font-bold rounded-xl transition-all"
          >
            {t('login')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent-amber/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="text-4xl font-extrabold tracking-wider bg-gradient-to-r from-primary-red to-accent-amber bg-clip-text text-transparent">
              DODZ
            </span>
            <span className="text-sm font-bold uppercase tracking-widest text-white px-2 py-0.5 rounded bg-primary-red">
              Fried Chicken
            </span>
          </Link>
          <p className="mt-3 text-text-muted text-sm">
            {locale === 'en' ? 'Create your customer account' : 'إنشاء حساب عميل جديد'}
          </p>
        </div>

        <div className="bg-card border border-card-border rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-8 rounded-xl bg-accent-amber/10 flex items-center justify-center">
              <Flame className="h-4 w-4 text-accent-amber" />
            </div>
            <h1 className="text-lg font-bold text-white">
              {locale === 'en' ? 'Create Account' : 'إنشاء حساب'}
            </h1>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                {locale === 'en' ? 'Full Name' : 'الاسم الكامل'}
              </label>
              <div className="relative">
                <User className="absolute left-3 rtl:right-3 rtl:left-auto top-3.5 h-4 w-4 text-text-muted" />
                <input
                  id="signup-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={locale === 'en' ? 'Ahmed Ali' : 'أحمد علي'}
                  required
                  className="w-full text-sm bg-card-border border border-card-border rounded-xl pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-3 text-white placeholder:text-text-muted focus:outline-none focus:border-primary-red/60 transition-colors"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                {locale === 'en' ? 'Phone (Optional)' : 'رقم الموبايل (اختياري)'}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 rtl:right-3 rtl:left-auto top-3.5 h-4 w-4 text-text-muted" />
                <input
                  id="signup-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="w-full text-sm bg-card-border border border-card-border rounded-xl pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-3 text-white placeholder:text-text-muted focus:outline-none focus:border-primary-red/60 transition-colors"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                {t('email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 rtl:right-3 rtl:left-auto top-3.5 h-4 w-4 text-text-muted" />
                <input
                  id="signup-email"
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
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                {t('password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 rtl:right-3 rtl:left-auto top-3.5 h-4 w-4 text-text-muted" />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  autoComplete="new-password"
                  className="w-full text-sm bg-card-border border border-card-border rounded-xl pl-10 pr-10 rtl:pr-10 rtl:pl-10 py-3 text-white placeholder:text-text-muted focus:outline-none focus:border-primary-red/60 transition-colors"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 rtl:left-3 rtl:right-auto top-3.5 text-text-muted hover:text-white">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                {locale === 'en' ? 'Confirm Password' : 'تأكيد كلمة المرور'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 rtl:right-3 rtl:left-auto top-3.5 h-4 w-4 text-text-muted" />
                <input
                  id="signup-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  required
                  autoComplete="new-password"
                  className="w-full text-sm bg-card-border border border-card-border rounded-xl pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-3 text-white placeholder:text-text-muted focus:outline-none focus:border-primary-red/60 transition-colors"
                />
              </div>
            </div>

            <button
              id="signup-submit"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-primary-red hover:bg-primary-red-hover disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary-red/30 flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /><span>{t('loading')}</span></>
              ) : (
                <span>{t('signup')}</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-text-muted">
            <span>{t('haveAccount')} </span>
            <Link href="/auth/login" className="text-accent-amber hover:text-accent-amber-hover font-semibold transition-colors">
              {t('login')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
