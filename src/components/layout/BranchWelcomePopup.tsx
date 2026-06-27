'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useBranch } from '@/context/BranchContext';
import { useLanguage } from '@/context/LanguageContext';
import { MapPin, ChevronRight, X, Store } from 'lucide-react';

const POPUP_SESSION_KEY = 'dodz_branch_popup_shown';

export default function BranchWelcomePopup() {
  const { allBranches, selectedBranch, selectedBranchId, selectBranch, isLoading } = useBranch();
  const { locale } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [chosen, setChosen] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Show popup once per session if no branch is selected
    const alreadyShown = sessionStorage.getItem(POPUP_SESSION_KEY);
    if (!alreadyShown && !selectedBranchId) {
      // Small delay so the page loads first
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const handleSubmit = () => {
    if (chosen) {
      selectBranch(chosen);
      // Reload so branch-specific menu/prices load fresh
      setSubmitted(true);
      sessionStorage.setItem(POPUP_SESSION_KEY, '1');
      setTimeout(() => window.location.reload(), 300);
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem(POPUP_SESSION_KEY, '1');
    setVisible(false);
  };

  if (!mounted || !visible || isLoading) return null;

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #111114 0%, #1a0a0a 100%)',
          border: '1px solid rgba(220,38,38,0.2)',
          boxShadow: '0 0 80px rgba(220,38,38,0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow blob */}
        <div
          className="absolute -top-16 -left-16 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'rgba(220,38,38,0.08)', filter: 'blur(60px)' }}
        />

        {/* Close */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-1.5 rounded-full text-text-muted hover:text-white transition-colors cursor-pointer z-10"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative p-7 space-y-6">
          {/* Brand mark */}
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}
            >
              <Store className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-primary-red uppercase tracking-widest">
                {locale === 'en' ? 'Welcome to Dodz 👋' : 'أهلاً بك في Dodz 👋'}
              </p>
              <h2 className="text-base font-extrabold text-white leading-tight">
                {locale === 'en' ? 'Choose Your Branch' : 'اختر فرعك'}
              </h2>
            </div>
          </div>

          <p className="text-xs text-text-muted leading-relaxed">
            {locale === 'en'
              ? 'Select your nearest Dodz location to see the menu, prices and offers available at that branch.'
              : 'اختر أقرب فرع لك لعرض المنيو والأسعار والعروض المتاحة في هذا الفرع.'}
          </p>

          {/* Branch list */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {allBranches.map((branch) => {
              const isClosed = branch.status === 'CLOSED';
              const isSelected = chosen === branch.id;
              return (
                <button
                  key={branch.id}
                  type="button"
                  disabled={isClosed}
                  onClick={() => !isClosed && setChosen(branch.id)}
                  className={`w-full text-left px-4 py-3 rounded-2xl border transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 ${
                    isClosed ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                  style={{
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(220,38,38,0.05))'
                      : 'rgba(255,255,255,0.03)',
                    border: isSelected
                      ? '1px solid rgba(220,38,38,0.5)'
                      : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MapPin
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: isSelected ? '#dc2626' : '#6b7280' }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {locale === 'en' ? branch.nameEn : branch.nameAr}
                      </p>
                      {(branch.addressEn || branch.addressAr) && (
                        <p className="text-[10px] text-text-muted truncate">
                          {locale === 'en' ? branch.addressEn : branch.addressAr}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                      style={{
                        background: isClosed ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                        color: isClosed ? '#f87171' : '#4ade80',
                        border: isClosed ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(34,197,94,0.15)',
                      }}
                    >
                      {isClosed ? (locale === 'en' ? 'Closed' : 'مغلق') : (locale === 'en' ? 'Open' : 'مفتوح')}
                    </span>
                    {isSelected && (
                      <div className="h-5 w-5 rounded-full bg-primary-red flex items-center justify-center">
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSkip}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-text-muted hover:text-white transition-colors cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {locale === 'en' ? 'Skip for now' : 'تخطى الآن'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!chosen || submitted}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: chosen ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'rgba(220,38,38,0.3)',
                boxShadow: chosen ? '0 4px 20px rgba(220,38,38,0.3)' : undefined,
              }}
            >
              {submitted ? (
                <span>{locale === 'en' ? 'Loading...' : 'جاري التحميل...'}</span>
              ) : (
                <>
                  <span>{locale === 'en' ? 'Confirm Branch' : 'تأكيد الفرع'}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}
