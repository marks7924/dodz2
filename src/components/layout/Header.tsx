'use client';

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useCartStore } from '@/store/useCartStore';
import { ShoppingBag, Globe, User, LogOut, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from './NotificationBell';
import CustomerOrderTracker from '@/components/orders/CustomerOrderTracker';

export default function Header() {
  const { locale, toggleLocale, t } = useLanguage();
  const { items, setCartOpen, cartOpen, selectedBranchId, setSelectedBranchId } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, role, isAuthenticated, signOut, isLoading } = useAuth();

  const branches = [
    { id: 'branch-1', nameEn: 'Seashell Walk Branch', nameAr: 'سي شيل ووك - الساحل' },
    { id: 'branch-2', nameEn: 'Marina Walk Branch', nameAr: 'مارينا ووك - الساحل' },
    { id: 'branch-3', nameEn: 'Tagamoa Branch', nameAr: 'فرع التجمع' },
    { id: 'branch-4', nameEn: 'Almaza Branch', nameAr: 'فرع الماظه' },
    { id: 'branch-5', nameEn: 'Nasr City Branch', nameAr: 'فرع مدينه نصر' },
    { id: 'branch-6', nameEn: 'Hadayek El-Kobba Branch', nameAr: 'فرع حدائق القبه' },
    { id: 'branch-7', nameEn: 'Ain Shams Branch', nameAr: 'فرع عين شمس' },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (!mounted) return;
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen, mounted]);

  const totalItemsCount = mounted
    ? items.reduce((acc, item) => acc + item.quantity, 0)
    : 0;

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowUserDropdown(false);
      window.location.href = '/';
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const showAdminLink = role && ['OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER', 'STAFF'].includes(role);
  const showDriverLink = role === 'DRIVER';

  // ── Mobile Drawer (rendered via portal directly on document.body) ──────────
  const drawerContent = mounted && mobileMenuOpen ? ReactDOM.createPortal(
    <>
      {/* Dark backdrop */}
      <div
        onClick={() => setMobileMenuOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Drawer panel — portal ensures it's OUTSIDE the header's CSS context */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          [locale === 'ar' ? 'left' : 'right']: 0,
          zIndex: 9999,
          width: '18rem',
          maxWidth: '85vw',
          backgroundColor: '#0D0D0F',
          borderLeft: locale === 'ar' ? 'none' : '1px solid #27272A',
          borderRight: locale === 'ar' ? '1px solid #27272A' : 'none',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '1.5rem',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Drawer header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #27272A', paddingBottom: '1rem' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 900, background: 'linear-gradient(to right, #E63946, #F4A261)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              DODZ FRIED CHICKEN
            </span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              style={{ padding: '0.25rem', borderRadius: '999px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X style={{ width: '1.25rem', height: '1.25rem' }} />
            </button>
          </div>

          {/* Branch selector */}
          <div style={{ background: '#18181B', border: '1px solid #27272A', padding: '0.75rem', borderRadius: '0.75rem' }}>
            <label style={{ fontSize: '0.6rem', color: '#F4A261', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
              {locale === 'en' ? 'Delivery / Pickup Branch' : 'فرع التوصيل / الاستلام'}
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.8rem', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} style={{ background: '#0D0D0F', color: '#fff' }}>
                  {locale === 'en' ? b.nameEn : b.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Navigation links */}
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

        {/* Footer */}
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
            <div className="flex-shrink-0 flex items-center gap-2">
              <Link href="/" className="flex items-center gap-2 group">
                <span className="text-xl md:text-3xl font-extrabold tracking-wider bg-gradient-to-r from-primary-red to-accent-amber bg-clip-text text-transparent group-hover:opacity-90 transition-opacity">
                  DODZ
                </span>
                <span className="hidden sm:inline text-sm font-bold uppercase tracking-widest text-foreground px-2 py-0.5 rounded bg-primary-red pulse-glow-red">
                  Fried Chicken
                </span>
              </Link>

              {/* Branch Selector */}
              {mounted && (
                <div className="hidden lg:flex items-center gap-1.5 bg-[#18181B] border border-card-border px-3 py-1.5 rounded-xl text-xs font-semibold">
                  <span className="text-accent-amber font-bold">📍</span>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="bg-transparent border-none text-foreground focus:outline-none cursor-pointer max-w-[150px] text-xs font-semibold"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} className="bg-card text-foreground">
                        {locale === 'en' ? b.nameEn : b.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Center Navigation - Desktop */}
            <nav className="hidden md:flex space-x-1 lg:space-x-4 items-center rtl:space-x-reverse">
              <Link href="/" className="text-sm font-medium text-foreground hover:text-primary-red px-3 py-2 rounded-md transition-colors">
                {t('menu')}
              </Link>
              {mounted && showDriverLink && (
                <Link href="/driver" className="text-sm font-medium text-text-muted hover:text-foreground px-3 py-2 rounded-md transition-colors flex items-center gap-1">
                  <span>{t('driverPortal')}</span>
                </Link>
              )}
              {mounted && showAdminLink && (
                <Link href="/admin" className="text-sm font-medium text-text-muted hover:text-foreground px-3 py-2 rounded-md transition-colors flex items-center gap-1">
                  <span>{t('adminPanel')}</span>
                </Link>
              )}
            </nav>

            {/* Right Interface Elements */}
            <div className="flex items-center gap-2 md:gap-4">

              {/* Hamburger Button for Mobile Nav */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-full hover:bg-card-border transition-colors text-foreground md:hidden flex items-center justify-center cursor-pointer"
                aria-label="Toggle Mobile Menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              {/* Language Switcher - Desktop Only */}
              <button
                onClick={toggleLocale}
                className="hidden sm:flex p-2 rounded-full hover:bg-card-border transition-colors text-foreground items-center gap-1.5 text-xs font-semibold"
                title="Switch Language"
              >
                <Globe className="h-5 w-5 text-accent-amber" />
                <span>{t('language')}</span>
              </button>

              {/* Notification Bell (authenticated users only) */}
              {mounted && isAuthenticated && <NotificationBell />}

              {/* Cart Button */}
              <button
                onClick={() => setCartOpen(!cartOpen)}
                className="relative p-2.5 rounded-full hover:bg-card-border transition-colors text-foreground"
                aria-label="Open Cart"
              >
                <ShoppingBag className="h-6 w-6 text-foreground hover:text-primary-red transition-colors" />
                {totalItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary-red text-white text-xs font-bold flex items-center justify-center pulse-glow-red">
                    {totalItemsCount}
                  </span>
                )}
              </button>

              {/* Auth section */}
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

        {/* Global Customer Active Order Tracker */}
        {mounted && isAuthenticated && role === 'CUSTOMER' && user?.id && (
          <CustomerOrderTracker userId={user.id} />
        )}
      </header>

      {/* Mobile Drawer — rendered via React Portal OUTSIDE the header */}
      {drawerContent}
    </>
  );
}
