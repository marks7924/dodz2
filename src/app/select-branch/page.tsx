'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBranch } from '@/context/BranchContext';
import { useLanguage } from '@/context/LanguageContext';
import { MapPin, Phone, ChevronRight, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SelectBranchPage() {
  const router = useRouter();
  const { allBranches, selectBranch, isLoading } = useBranch();
  const { locale } = useLanguage();
  const [selecting, setSelecting] = useState<string | null>(null);

  const handleSelectBranch = (branchId: string) => {
    setSelecting(branchId);
    selectBranch(branchId);
    setTimeout(() => router.push('/'), 300);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, #0a0a0c 0%, #111114 60%, #1a0a0a 100%)' }}
    >
      {/* Decorative background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary-red/8 blur-[120px]" />
        <div className="absolute top-1/2 -right-32 w-72 h-72 rounded-full bg-primary-red/5 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-amber-600/4 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center flex-grow px-4 py-16">

        {/* Brand Header */}
        <div className="mb-12 text-center space-y-4">
          {/* Logo mark */}
          <div className="relative inline-block mb-4">
            <div className="h-20 w-20 mx-auto rounded-3xl bg-gradient-to-br from-primary-red to-red-700 flex items-center justify-center shadow-2xl shadow-primary-red/30">
              <span className="text-white text-3xl font-black tracking-tight">D</span>
            </div>
            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 border-2 border-background animate-pulse" />
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            {locale === 'en' ? (
              <>Choose Your <span className="text-primary-red">Branch</span></>
            ) : (
              <>اختر <span className="text-primary-red">فرعك</span></>
            )}
          </h1>
          <p className="text-sm text-text-muted max-w-sm mx-auto leading-relaxed">
            {locale === 'en'
              ? 'Select your nearest Dodz location to start your order'
              : 'اختر أقرب فرع Dodz لتبدأ طلبك'}
          </p>
        </div>

        {/* Branch Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-44 rounded-3xl animate-pulse"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
            {allBranches.map((branch) => {
              const isClosed = branch.status === 'CLOSED';
              const isBeingSelected = selecting === branch.id;

              return (
                <button
                  key={branch.id}
                  onClick={() => !isClosed && handleSelectBranch(branch.id)}
                  disabled={isClosed || !!selecting}
                  className={`group relative text-left p-6 rounded-3xl transition-all duration-300 overflow-hidden ${
                    isClosed
                      ? 'opacity-50 cursor-not-allowed'
                      : isBeingSelected
                      ? 'scale-[0.97] opacity-80'
                      : 'cursor-pointer hover:scale-[1.02] hover:-translate-y-1'
                  }`}
                  style={{
                    background: isClosed
                      ? 'rgba(255,255,255,0.03)'
                      : isBeingSelected
                      ? 'linear-gradient(135deg, rgba(220,38,38,0.2), rgba(220,38,38,0.05))'
                      : 'rgba(255,255,255,0.04)',
                    border: isBeingSelected
                      ? '1px solid rgba(220,38,38,0.6)'
                      : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: isBeingSelected
                      ? '0 0 40px rgba(220,38,38,0.15), inset 0 0 40px rgba(220,38,38,0.05)'
                      : undefined,
                  }}
                  onMouseEnter={(e) => {
                    if (!isClosed && !selecting) {
                      (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(220,38,38,0.4)';
                      (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(220,38,38,0.1), rgba(255,255,255,0.04))';
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 20px 60px rgba(220,38,38,0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isClosed && !selecting && selecting !== branch.id) {
                      (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(255,255,255,0.08)';
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = '';
                    }
                  }}
                >
                  {/* Glow on hover */}
                  <div className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${isClosed ? '' : ''}`}
                    style={{ background: 'radial-gradient(ellipse at top left, rgba(220,38,38,0.08), transparent 70%)' }}
                  />

                  {/* Status badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                      style={{
                        background: isClosed ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                        color: isClosed ? '#f87171' : '#4ade80',
                        border: isClosed ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(34,197,94,0.2)',
                      }}
                    >
                      {isClosed
                        ? (locale === 'en' ? '● Closed' : '● مغلق')
                        : (locale === 'en' ? '● Open Now' : '● مفتوح')}
                    </span>
                    {!isClosed && (
                      isBeingSelected ? (
                        <Loader2 className="h-4 w-4 text-primary-red animate-spin" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-text-muted group-hover:text-primary-red group-hover:translate-x-0.5 transition-all" />
                      )
                    )}
                  </div>

                  {/* Branch Name */}
                  <div className="space-y-0.5 mb-4">
                    <h2 className="text-base font-extrabold text-white leading-tight">
                      {locale === 'en' ? branch.nameEn : branch.nameAr}
                    </h2>
                    <p className="text-[11px] text-text-muted">
                      {locale === 'en' ? branch.nameAr : branch.nameEn}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="space-y-2">
                    {(branch.addressEn || branch.addressAr) && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3 w-3 text-primary-red/60 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-text-muted leading-snug">
                          {locale === 'en' ? (branch.addressEn || branch.addressAr) : (branch.addressAr || branch.addressEn)}
                        </p>
                      </div>
                    )}
                    {branch.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-primary-red/60 shrink-0" />
                        <p className="text-[11px] text-text-muted">{branch.phone}</p>
                      </div>
                    )}
                  </div>

                  {/* Select CTA — appears on hover */}
                  {!isClosed && (
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-1">
                      <span className="text-[11px] font-bold text-primary-red/0 group-hover:text-primary-red transition-colors duration-200">
                        {locale === 'en' ? 'Order from this branch' : 'اطلب من هذا الفرع'}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Footer note */}
        <div className="mt-12 text-center space-y-2">
          <p className="text-xs text-text-muted">
            {locale === 'en'
              ? 'Your cart is tied to your selected branch. You can switch branches any time.'
              : 'سلة طلبك مرتبطة بالفرع الذي اخترته. يمكنك تغيير الفرع في أي وقت.'}
          </p>
          <p className="text-xs text-text-muted">
            {locale === 'en' ? 'Already have an account?' : 'لديك حساب؟'}{' '}
            <Link href="/auth/login" className="text-primary-red hover:underline font-bold">
              {locale === 'en' ? 'Sign in' : 'تسجيل الدخول'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
