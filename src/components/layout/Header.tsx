'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useCartStore } from '@/store/useCartStore';
import { ShoppingBag, Globe, User, LogOut, Menu, X, MapPin, ChevronDown, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useBranch } from '@/context/BranchContext';
import NotificationBell from './NotificationBell';
import CustomerOrderTracker from '@/components/orders/CustomerOrderTracker';

export default function Header() {
  const { locale, toggleLocale, t } = useLanguage();
  const { items, setCartOpen, cartOpen } = useCartStore();
  const { allBranches, selectedBranch, selectedBranchId, selectBranch } = useBranch();
  const [mounted, setMounted] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [pendingBranchId, setPendingBranchId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [alwaysRemember, setAlwaysRemember] = useState(false);
  const branchDropdownRef = useRef<HTMLDivElement>(null);
  const { user, profile, role, isAuthenticated, signOut, isLoading } = useAuth();

  useEffect(() => { setMounted(true); }, []);

  // Sync pending selection with current branch
  useEffect(() => {
    if (selectedBranchId) setPendingBranchId(selectedBranchId);
  }, [selectedBranchId]);

  // Close branch dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target as Node)) {
        setShowBranchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen, mounted]);

  const totalItemsCount = mounted ? items.reduce((acc, item) => acc + item.quantity, 0) : 0;

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowUserDropdown(false);
      window.location.href = '/';
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleConfirmBranch = () => {
    if (!pendingBranchId || pendingBranchId === selectedBranchId) {
      setShowBranchDropdown(false);
      return;
    }
    setSubmitting(true);
    selectBranch(pendingBranchId, alwaysRemember);
    setShowBranchDropdown(false);
    setTimeout(() => {
      window.location.reload();
    }, 200);
  };

  const showAdminLink = role && ['OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER', 'STAFF'].includes(role);
  const showDriverLink = role === 'DRIVER';

  // ── Branch Selector Dropdown ─────────────────────────────────────────────────
  const branchSelectorContent = (
    <div ref={branchDropdownRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setShowBranchDropdown(!showBranchDropdown)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer group"
        style={{
          background: showBranchDropdown ? 'rgba(220,38,38,0.1)' : 'rgba(255,255,255,0.04)',
          border: showBranchDropdown ? '1px solid rgba(220,38,38,0.3)' : '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <MapPin className="h-3.5 w-3.5 text-primary-red shrink-0" />
        <span className="text-xs font-bold text-white max-w-[130px] truncate">
          {selectedBranch
            ? (locale === 'en' ? selectedBranch.nameEn : selectedBranch.nameAr)
            : (locale === 'en' ? 'Select Branch' : 'اختر فرع')}
        </span>
        <ChevronDown
          className={`h-3 w-3 text-text-muted transition-transform ${showBranchDropdown ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {showBranchDropdown && (
        <div
          className="absolute top-full mt-2 left-0 w-72 rounded-2xl shadow-2xl overflow-hidden z-50"
          style={{
            background: 'linear-gradient(160deg, #111114 0%, #150808 100%)',
            border: '1px solid rgba(220,38,38,0.15)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(220,38,38,0.06)',
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] font-bold text-primary-red uppercase tracking-widest">
              {locale === 'en' ? '📍 Select Branch' : '📍 اختر فرع'}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">
              {locale === 'en'
                ? 'Menu & prices may vary per branch'
                : 'قد يختلف المنيو والأسعار بين الفروع'}
            </p>
          </div>

          {/* Branch list */}
          <div className="p-2 max-h-60 overflow-y-auto space-y-1">
            {allBranches.map((branch) => {
              const isClosed = branch.status === 'CLOSED';
              const isSelected = pendingBranchId === branch.id;
              return (
                <button
                  key={branch.id}
                  type="button"
                  disabled={isClosed}
                  onClick={() => !isClosed && setPendingBranchId(branch.id)}
                  className="w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: isSelected ? 'rgba(220,38,38,0.12)' : 'rgba(255,255,255,0.02)',
                    border: isSelected ? '1px solid rgba(220,38,38,0.3)' : '1px solid transparent',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin
                      className="h-3 w-3 shrink-0"
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
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: isClosed ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                        color: isClosed ? '#f87171' : '#4ade80',
                      }}
                    >
                      {isClosed
                        ? (locale === 'en' ? 'Closed' : 'مغلق')
                        : (locale === 'en' ? 'Open' : 'مفتوح')}
                    </span>
                    {isSelected && (
                      <div className="h-4 w-4 rounded-full bg-primary-red flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Submit */}
          <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {pendingBranchId && pendingBranchId !== selectedBranchId && (
              <div className="mb-2 flex items-center gap-2 px-1">
                <input
                  type="checkbox"
                  id="header-always-remember"
                  checked={alwaysRemember}
                  onChange={(e) => setAlwaysRemember(e.target.checked)}
                  className="rounded bg-[#121214] border-card-border text-primary-red focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="header-always-remember" className="text-[10px] text-text-muted cursor-pointer hover:text-white transition-colors select-none">
                  {locale === 'en' ? 'Always remember selection' : 'تذكر خياري دائماً'}
                </label>
              </div>
            )}
            <button
              type="button"
              onClick={handleConfirmBranch}
              disabled={!pendingBranchId || submitting}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
              style={{
                background: pendingBranchId ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'rgba(220,38,38,0.2)',
                boxShadow: pendingBranchId ? '0 4px 16px rgba(220,38,38,0.3)' : undefined,
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{locale === 'en' ? 'Switching...' : 'جاري التبديل...'}</span>
                </>
              ) : (
                <span>
                  {pendingBranchId === selectedBranchId
                    ? (locale === 'en' ? 'Close' : 'إغلاق')
                    : (locale === 'en' ? '✓ Confirm & Reload' : '✓ تأكيد وإعادة تحميل')}
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Mobile Drawer ─────────────────────────────────────────────────────────────
  const drawerContent = mounted && mobileMenuOpen ? ReactDOM.createPortal(
    <>
      <div
        onClick={() => setMobileMenuOpen(false)}
        style={{ position: 'fixed', inset: 0, zIndex: 9998, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
      />
      <div
        style={{
          position: 'fixed', top: 0, bottom: 0,
          [locale === 'ar' ? 'left' : 'right']: 0,
          zIndex: 9999, width: '18rem', maxWidth: '85vw',
          backgroundColor: '#0D0D0F',
          borderLeft: locale === 'ar' ? 'none' : '1px solid #27272A',
          borderRight: locale === 'ar' ? '1px solid #27272A' : 'none',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.7)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '1.5rem', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Drawer header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #27272A', paddingBottom: '1rem' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 900, background: 'linear-gradient(to right, #E63946, #F4A261)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              DODZ FRIED CHICKEN
            </span>
            <button onClick={() => setMobileMenuOpen(false)} style={{ padding: '0.25rem', borderRadius: '999px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <X style={{ width: '1.25rem', height: '1.25rem' }} />
            </button>
          </div>

          {/* Mobile branch selector */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(220,38,38,0.15)', padding: '0.75rem', borderRadius: '1rem' }}>
            <p style={{ fontSize: '0.6rem', color: '#dc2626', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
              {locale === 'en' ? '📍 Branch' : '📍 الفرع'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto' }}>
              {allBranches.map((branch) => {
                const isClosed = branch.status === 'CLOSED';
                const isSelected = pendingBranchId === branch.id;
                return (
                  <button
                    key={branch.id}
                    type="button"
                    disabled={isClosed}
                    onClick={() => !isClosed && setPendingBranchId(branch.id)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem',
                      borderRadius: '0.625rem', fontSize: '0.75rem', fontWeight: 600,
                      color: isSelected ? '#fff' : '#a1a1aa',
                      background: isSelected ? 'rgba(220,38,38,0.15)' : 'rgba(255,255,255,0.03)',
                      border: isSelected ? '1px solid rgba(220,38,38,0.4)' : '1px solid transparent',
                      cursor: isClosed ? 'not-allowed' : 'pointer', opacity: isClosed ? 0.4 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <span>{locale === 'en' ? branch.nameEn : branch.nameAr}</span>
                    {isSelected && <Check style={{ width: '0.875rem', height: '0.875rem', color: '#dc2626' }} />}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => { handleConfirmBranch(); setMobileMenuOpen(false); }}
              disabled={!pendingBranchId || submitting}
              style={{
                width: '100%', marginTop: '0.75rem', padding: '0.6rem',
                background: pendingBranchId ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'rgba(220,38,38,0.2)',
                border: 'none', borderRadius: '0.75rem', color: '#fff',
                fontSize: '0.7rem', fontWeight: 700, cursor: pendingBranchId ? 'pointer' : 'not-allowed',
                opacity: !pendingBranchId ? 0.4 : 1,
              }}
            >
              {pendingBranchId === selectedBranchId
                ? (locale === 'en' ? 'Close' : 'إغلاق')
                : (locale === 'en' ? '✓ Confirm & Reload' : '✓ تأكيد وإعادة تحميل')}
            </button>
          </div>

          {/* Nav links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <Link href="/" onClick={() => setMobileMenuOpen(false)}
              style={{ display: 'block', padding: '0.7rem 0', fontSize: '0.9rem', fontWeight: 600, color: '#fff', borderBottom: '1px solid #27272A', textDecoration: 'none' }}>
              {locale === 'en' ? 'Browse Menu' : 'تصفح المنيو'}
            </Link>
            {showDriverLink && (
              <Link href="/driver" onClick={() => setMobileMenuOpen(false)}
                style={{ display: 'block', padding: '0.7rem 0', fontSize: '0.9rem', fontWeight: 600, color: '#fff', borderBottom: '1px solid #27272A', textDecoration: 'none' }}>
                {t('driverPortal')}
              </Link>
            )}
            {showAdminLink && (
              <Link href="/admin" onClick={() => setMobileMenuOpen(false)}
                style={{ display: 'block', padding: '0.7rem 0', fontSize: '0.9rem', fontWeight: 600, color: '#fff', borderBottom: '1px solid #27272A', textDecoration: 'none' }}>
                {t('adminPanel')}
              </Link>
            )}
          </nav>
        </div>

        <div style={{ borderTop: '1px solid #27272A', paddingTop: '1rem' }}>
          <button
            onClick={() => { toggleLocale(); setMobileMenuOpen(false); }}
            style={{ width: '100%', padding: '0.65rem', background: '#18181B', border: '1px solid #27272A', borderRadius: '0.75rem', color: '#fff', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
          >
            <Globe style={{ width: '1rem', height: '1rem', color: '#F4A261' }} />
            <span>{locale === 'en' ? 'العربية' : 'English'}</span>
          </button>
        </div>
      </div>
    </>,
    document.body
  ) : null;

  return (
    <>
      <header className="sticky top-0 z-50 w-full glass-panel border-b border-card-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-20">

            {/* Logo */}
            <div className="flex-shrink-0 flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 group">
                <span className="text-xl md:text-3xl font-extrabold tracking-wider bg-gradient-to-r from-primary-red to-accent-amber bg-clip-text text-transparent group-hover:opacity-90 transition-opacity">
                  DODZ
                </span>
                <span className="hidden sm:inline text-sm font-bold uppercase tracking-widest text-foreground px-2 py-0.5 rounded bg-primary-red pulse-glow-red">
                  Fried Chicken
                </span>
              </Link>

              {/* Desktop Branch Selector */}
              {mounted && <div className="hidden lg:block">{branchSelectorContent}</div>}
            </div>

            {/* Center Navigation */}
            <nav className="hidden md:flex space-x-1 lg:space-x-4 items-center rtl:space-x-reverse">
              <Link href="/" className="text-sm font-medium text-foreground hover:text-primary-red px-3 py-2 rounded-md transition-colors">
                {t('menu')}
              </Link>
              {mounted && showDriverLink && (
                <Link href="/driver" className="text-sm font-medium text-text-muted hover:text-foreground px-3 py-2 rounded-md transition-colors">
                  {t('driverPortal')}
                </Link>
              )}
              {mounted && showAdminLink && (
                <Link href="/admin" className="text-sm font-medium text-text-muted hover:text-foreground px-3 py-2 rounded-md transition-colors">
                  {t('adminPanel')}
                </Link>
              )}
            </nav>

            {/* Right elements */}
            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-full hover:bg-card-border transition-colors text-foreground md:hidden flex items-center justify-center cursor-pointer"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              <button
                onClick={toggleLocale}
                className="hidden sm:flex p-2 rounded-full hover:bg-card-border transition-colors text-foreground items-center gap-1.5 text-xs font-semibold"
              >
                <Globe className="h-5 w-5 text-accent-amber" />
                <span>{t('language')}</span>
              </button>

              {mounted && isAuthenticated && <NotificationBell />}

              <button
                onClick={() => setCartOpen(!cartOpen)}
                className="relative p-2.5 rounded-full hover:bg-card-border transition-colors text-foreground"
              >
                <ShoppingBag className="h-6 w-6 text-foreground hover:text-primary-red transition-colors" />
                {totalItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary-red text-white text-xs font-bold flex items-center justify-center pulse-glow-red">
                    {totalItemsCount}
                  </span>
                )}
              </button>

              {mounted && !isLoading && (
                isAuthenticated ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-card hover:bg-card-border border border-card-border transition-all text-xs font-medium text-foreground cursor-pointer"
                    >
                      <User className="h-4 w-4 text-accent-amber" />
                      <span className="max-w-[80px] truncate hidden md:inline">
                        {profile?.full_name || user?.email?.split('@')[0]}
                      </span>
                      {role && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-primary-red/10 text-primary-red border border-primary-red/20">
                          {role}
                        </span>
                      )}
                    </button>

                    {showUserDropdown && (
                      <div className="absolute right-0 mt-2 w-48 max-w-[calc(100vw-2rem)] rounded-xl bg-card border border-card-border shadow-2xl p-2 z-50">
                        <div className="text-[10px] font-bold text-text-muted px-3 py-1 uppercase tracking-wider border-b border-card-border mb-1">
                          {user?.email}
                        </div>
                        {showDriverLink && (
                          <Link href="/driver" onClick={() => setShowUserDropdown(false)}
                            className="w-full text-left rtl:text-right px-3 py-2 text-xs rounded-lg hover:bg-card-border text-foreground block md:hidden">
                            {t('driverPortal')}
                          </Link>
                        )}
                        {showAdminLink && (
                          <Link href="/admin" onClick={() => setShowUserDropdown(false)}
                            className="w-full text-left rtl:text-right px-3 py-2 text-xs rounded-lg hover:bg-card-border text-foreground block md:hidden">
                            {t('adminPanel')}
                          </Link>
                        )}
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left rtl:text-right px-3 py-2 text-xs rounded-lg hover:bg-red-500/10 text-red-400 font-semibold transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span>{t('logout')}</span>
                          <LogOut className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link href="/auth/login" className="text-xs font-bold text-text-muted hover:text-white px-3 py-1.5 rounded-lg transition-colors">
                      {t('login')}
                    </Link>
                    <Link href="/auth/signup" className="text-xs font-bold bg-primary-red hover:bg-primary-red-hover text-white px-3 py-1.5 rounded-lg transition-colors shadow-md shadow-primary-red/10">
                      {t('signup')}
                    </Link>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {mounted && isAuthenticated && role === 'CUSTOMER' && user?.id && (
          <CustomerOrderTracker userId={user.id} />
        )}
      </header>

      {drawerContent}
    </>
  );
}
