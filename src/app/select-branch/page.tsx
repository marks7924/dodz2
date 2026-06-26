'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBranch } from '@/context/BranchContext';
import { useLanguage } from '@/context/LanguageContext';
import { MapPin, Phone, ChevronRight, Store } from 'lucide-react';
import Link from 'next/link';

export default function SelectBranchPage() {
  const router = useRouter();
  const { allBranches, selectBranch, isLoading } = useBranch();
  const { locale } = useLanguage();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleSelectBranch = (branchId: string) => {
    selectBranch(branchId);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* Logo / Brand */}
      <div className="mb-10 text-center space-y-3">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary-red/10 border border-primary-red/20 mb-2">
          <Store className="h-8 w-8 text-primary-red" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
          {locale === 'en' ? 'Choose Your Branch' : 'اختر فرعك'}
        </h1>
        <p className="text-sm text-text-muted max-w-sm mx-auto">
          {locale === 'en'
            ? 'Select the nearest Dodz location to start browsing the menu and placing your order.'
            : 'اختر أقرب فرع Dodz للبدء في تصفح المنيو وتقديم طلبك.'}
        </p>
      </div>

      {/* Branch Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 bg-card border border-card-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
          {allBranches.map((branch) => {
            const isClosed = branch.status === 'CLOSED';
            return (
              <button
                key={branch.id}
                onClick={() => !isClosed && handleSelectBranch(branch.id)}
                onMouseEnter={() => setHoveredId(branch.id)}
                onMouseLeave={() => setHoveredId(null)}
                disabled={isClosed}
                className={`relative group text-left p-5 rounded-2xl border transition-all duration-200 ${
                  isClosed
                    ? 'border-card-border bg-card opacity-50 cursor-not-allowed'
                    : hoveredId === branch.id
                    ? 'border-primary-red bg-primary-red/5 shadow-lg shadow-primary-red/10 scale-[1.02]'
                    : 'border-card-border bg-card hover:border-primary-red/50 cursor-pointer'
                }`}
              >
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      isClosed
                        ? 'bg-red-900/30 text-red-400'
                        : 'bg-green-900/30 text-green-400'
                    }`}
                  >
                    {isClosed
                      ? (locale === 'en' ? 'Closed' : 'مغلق')
                      : (locale === 'en' ? 'Open' : 'مفتوح')}
                  </span>
                </div>

                <div className="space-y-2">
                  <h2 className={`text-base font-extrabold leading-tight pr-12 ${isClosed ? 'text-text-muted' : 'text-white'}`}>
                    {locale === 'en' ? branch.nameEn : branch.nameAr}
                  </h2>

                  {(branch.addressEn || branch.addressAr) && (
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3 w-3 text-text-muted shrink-0 mt-0.5" />
                      <p className="text-[11px] text-text-muted leading-snug">
                        {locale === 'en' ? branch.addressEn : branch.addressAr}
                      </p>
                    </div>
                  )}

                  {branch.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-text-muted shrink-0" />
                      <p className="text-[11px] text-text-muted">{branch.phone}</p>
                    </div>
                  )}
                </div>

                {!isClosed && (
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-primary-red opacity-0 group-hover:opacity-100 transition-opacity">
                      {locale === 'en' ? 'Select this branch' : 'اختر هذا الفرع'}
                    </span>
                    <ChevronRight className={`h-4 w-4 text-primary-red transition-transform ${hoveredId === branch.id ? 'translate-x-1' : ''}`} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-xs text-text-muted text-center">
        {locale === 'en' ? 'Already have an account?' : 'لديك حساب بالفعل؟'}{' '}
        <Link href="/auth/login" className="text-primary-red hover:underline font-bold">
          {locale === 'en' ? 'Sign in' : 'تسجيل الدخول'}
        </Link>
      </p>
    </div>
  );
}
