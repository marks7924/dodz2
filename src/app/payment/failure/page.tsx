'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { AlertCircle, RefreshCw, ShoppingBag } from 'lucide-react';

function PaymentFailureContent() {
  const { t, locale } = useLanguage();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || searchParams.get('id') || '';

  return (
    <div className="flex-grow flex items-center justify-center py-16 px-4">
      <div className="max-w-md w-full bg-[#0E0E10] border border-[#27272A] rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-red-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-amber-500/10 rounded-full blur-3xl" />

        <div className="relative">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-600/10 border border-red-600/20 text-[#E11D48]">
            <AlertCircle className="h-10 w-10 animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-white">
            {locale === 'en' ? 'Payment Failed' : 'فشلت عملية الدفع'}
          </h1>
          <p className="text-xs text-[#A1A1AA]">
            {locale === 'en' 
              ? 'We could not process your transaction. Your card was not charged. Please try again or choose another payment method.'
              : 'لم نتمكن من معالجة عملية الدفع. لم يتم خصم أي مبالغ من بطاقتك. يرجى المحاولة مرة أخرى أو اختيار طريقة دفع أخرى.'}
          </p>
        </div>

        {orderId && (
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl py-3 px-4 flex justify-between items-center text-xs">
            <span className="text-[#A1A1AA]">{t('orderId')}:</span>
            <span className="font-mono font-bold text-[#A1A1AA]">{orderId}</span>
          </div>
        )}

        <div className="pt-2 space-y-3">
          <Link
            href="/checkout"
            className="w-full py-3 bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4 animate-spin-slow" />
            <span>{locale === 'en' ? 'Retry Payment' : 'إعادة محاولة الدفع'}</span>
          </Link>
          <Link
            href="/"
            className="w-full py-3 bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>{t('backToHome')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailurePage() {
  return (
    <>
      <Header />
      <main className="flex flex-col min-h-[65vh] bg-[#0A0A0B]">
        <Suspense fallback={
          <div className="flex-grow flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#E11D48]"></div>
          </div>
        }>
          <PaymentFailureContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
