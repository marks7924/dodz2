'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useCartStore } from '@/store/useCartStore';
import { ShoppingBag, Globe, User, LogOut, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function Header() {
  const { locale, toggleLocale, t } = useLanguage();
  const { items, setCartOpen, cartOpen, selectedBranchId, setSelectedBranchId } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null);
  const [showRoleSelect, setShowRoleSelect] = useState(false);

  const branches = [
    { id: 'branch-1', nameEn: 'Seashell Walk Branch', nameAr: 'سي شيل ووك - الساحل' },
    { id: 'branch-2', nameEn: 'Marina Walk Branch', nameAr: 'مارينا ووك - الساحل' },
    { id: 'branch-3', nameEn: 'Tagamoa Branch', nameAr: 'فرع التجمع' },
    { id: 'branch-4', nameEn: 'Almaza Branch', nameAr: 'فرع الماظه' },
    { id: 'branch-5', nameEn: 'Nasr City Branch', nameAr: 'فرع مدينه نصر' },
    { id: 'branch-6', nameEn: 'Hadayek El-Kobba Branch', nameAr: 'فرع حدائق القبه' },
    { id: 'branch-7', nameEn: 'Ain Shams Branch', nameAr: 'فرع عين شمس' },
  ];

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    } else {
      // Default mock user as Customer
      const defaultUser = { name: 'Mina Ramzy', email: 'customer@test.com', role: 'CUSTOMER', id: 'user-cust' };
      localStorage.setItem('user', JSON.stringify(defaultUser));
      setCurrentUser(defaultUser);
    }
  }, []);

  const totalItemsCount = mounted
    ? items.reduce((acc, item) => acc + item.quantity, 0)
    : 0;

  const handleRoleChange = (role: 'CUSTOMER' | 'DRIVER' | 'STAFF' | 'OWNER') => {
    let mockUser = { id: 'user-cust', name: 'Mina Ramzy', email: 'customer@test.com', role: 'CUSTOMER' };
    if (role === 'DRIVER') {
      mockUser = { id: 'user-driver1', name: 'Mustafa Salem (Driver)', email: 'driver1@dodz.com', role: 'DRIVER' };
    } else if (role === 'STAFF') {
      mockUser = { id: 'user-staff', name: 'Karim Aly (Kitchen)', email: 'staff@dodz.com', role: 'STAFF' };
    } else if (role === 'OWNER') {
      mockUser = { id: 'user-owner', name: 'Sherif Dodz (Owner)', email: 'owner@dodz.com', role: 'OWNER' };
    }

    localStorage.setItem('user', JSON.stringify(mockUser));
    setCurrentUser(mockUser);
    setShowRoleSelect(false);
    // Reload page to reflect user role across dashboard interfaces
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-card-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">

          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-2xl md:text-3xl font-extrabold tracking-wider bg-gradient-to-r from-primary-red to-accent-amber bg-clip-text text-transparent group-hover:opacity-90 transition-opacity">
                DODZ
              </span>
              <span className="text-sm font-bold uppercase tracking-widest text-foreground px-2 py-0.5 rounded bg-primary-red pulse-glow-red">
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
            <Link href="/driver" className="text-sm font-medium text-text-muted hover:text-foreground px-3 py-2 rounded-md transition-colors flex items-center gap-1">
              <span>{t('driverPortal')}</span>
            </Link>
            <Link href="/admin" className="text-sm font-medium text-text-muted hover:text-foreground px-3 py-2 rounded-md transition-colors flex items-center gap-1">
              <span>{t('adminPanel')}</span>
            </Link>
          </nav>

          {/* Right Interface Elements */}
          <div className="flex items-center gap-2 md:gap-4">

            {/* Language Switcher */}
            <button
              onClick={toggleLocale}
              className="p-2 rounded-full hover:bg-card-border transition-colors text-foreground flex items-center gap-1.5 text-xs font-semibold"
              title="Switch Language"
            >
              <Globe className="h-5 w-5 text-accent-amber" />
              <span className="hidden sm:inline">{t('language')}</span>
            </button>

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

            {/* Simulated Auth / Role Switcher for Testing */}
            {mounted && currentUser && (
              <div className="relative">
                <button
                  onClick={() => setShowRoleSelect(!showRoleSelect)}
                  className="flex items-center gap-1 md:gap-2 px-3 py-1.5 rounded-full bg-card hover:bg-card-border border border-card-border transition-all text-xs font-medium text-foreground"
                >
                  <User className="h-4 w-4 text-accent-amber" />
                  <span className="max-w-[80px] truncate hidden md:inline">{currentUser.name}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-primary-red/10 text-primary-red border border-primary-red/20">
                    {currentUser.role}
                  </span>
                </button>

                {showRoleSelect && (
                  <div className="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-48 rounded-xl bg-card border border-card-border shadow-2xl p-2 z-50">
                    <p className="text-[10px] font-bold text-text-muted px-3 py-1 uppercase tracking-wider border-b border-card-border mb-1 flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3 text-accent-amber" /> Switch Account Role
                    </p>
                    {(['CUSTOMER', 'DRIVER', 'STAFF', 'OWNER'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => handleRoleChange(r)}
                        className={`w-full text-left rtl:text-right px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${currentUser.role === r
                            ? 'bg-primary-red/10 text-primary-red font-semibold'
                            : 'hover:bg-card-border text-foreground'
                          }`}
                      >
                        <span>{r}</span>
                        {currentUser.role === r && <span className="h-1.5 w-1.5 rounded-full bg-primary-red" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
}
