'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useCartStore, CartItem } from '@/store/useCartStore';
import { X, Plus, Minus, Trash2, Tag, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { useBranch } from '@/context/BranchContext';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CartSidebar() {
  const { t, locale, dir } = useLanguage();
  const { user } = useAuth();
  const { alert, confirm } = useModal();
  const router = useRouter();
  const {
    items,
    cartOpen,
    setCartOpen,
    addItem,
    removeItem,
    deleteItem,
    coupon,
    applyCoupon,
    removeCoupon,
    deliveryFee,
    getSubtotal,
    getDiscountAmount,
    getTotal,
    clearCart,
  } = useCartStore();

  const { selectedBranchId, isClosed } = useBranch();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (coupon) {
      setCouponInput(coupon.code);
      setCouponSuccess(true);
    }
  }, [coupon]);

  if (!mounted) return null;
  if (!cartOpen) return null;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    setCouponSuccess(false);

    if (!couponInput.trim()) return;

    try {
      const result = await db.validateCoupon(couponInput.trim(), selectedBranchId || undefined, user?.id);
      if (result.isValid && result.coupon) {
        const foundCoupon = result.coupon;
        applyCoupon({
          code: foundCoupon.code,
          discountType: foundCoupon.discountType,
          discountValue: foundCoupon.discountValue,
          applicableCategoryId: (foundCoupon as any).applicableCategoryId || null,
        });
        setCouponSuccess(true);
      } else {
        setCouponError(result.error || t('couponInvalid'));
      }
    } catch (err) {
      setCouponError(t('couponInvalid'));
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setCouponInput('');
    setCouponSuccess(false);
    setCouponError('');
  };

  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount();
  const total = getTotal();

  return (
    <div className="fixed inset-0 z-50 flex justify-end rtl:justify-start">
      {/* Backdrop Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setCartOpen(false)}
      />

      {/* Drawer Container */}
      <div
        className="relative w-full max-w-md h-full bg-card border-l rtl:border-l-0 rtl:border-r border-card-border shadow-2xl flex flex-col z-10 animate-in slide-in-from-right rtl:slide-in-from-left duration-300"
      >
        {/* Header */}
        <div className="p-4 border-b border-card-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary-red" />
            <h2 className="text-lg font-bold text-foreground">{t('yourCart')}</h2>
            <span className="px-2 py-0.5 rounded-full bg-primary-red/10 text-primary-red text-xs font-bold">
              {items.reduce((acc, it) => acc + it.quantity, 0)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={async () => {
                  if (await confirm(locale === 'en' ? 'Are you sure you want to clear your cart?' : 'هل أنت متأكد من رغبتك في تفريغ سلة التسوق؟')) {
                    clearCart();
                  }
                }}
                className="text-[10px] uppercase font-bold text-primary-red hover:underline cursor-pointer px-2 py-1 rounded bg-primary-red/5 border border-primary-red/20 transition-all"
              >
                {locale === 'en' ? 'Clear Cart' : 'تفريغ السلة'}
              </button>
            )}
            <button
              onClick={() => setCartOpen(false)}
              className="p-1.5 rounded-lg hover:bg-card-border transition-colors text-foreground cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 p-8">
              <div className="h-16 w-16 rounded-full bg-card-border flex items-center justify-center text-text-muted">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <p className="text-sm text-text-muted max-w-[240px]">
                {t('cartEmpty')}
              </p>
              <button
                onClick={() => {
                  setCartOpen(false);
                  router.push('/');
                }}
                className="px-6 py-2 rounded-xl bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold transition-all cursor-pointer"
              >
                {t('viewMenu')}
              </button>
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={`${item.productId}-${item.size}-${idx}`}
                className="flex gap-3 p-3 rounded-xl bg-[#18181B] border border-card-border hover:border-primary-red/20 transition-all"
              >
                {/* Item Image */}
                <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-card-border flex-shrink-0">
                  <img
                    src={item.imageUrl}
                    alt={locale === 'en' ? item.nameEn : item.nameAr}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Item Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-foreground truncate">
                      {locale === 'en' ? item.nameEn : item.nameAr}
                    </h3>
                    {item.size !== 'NONE' && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-primary-red/10 text-[9px] uppercase font-bold text-primary-red border border-primary-red/20">
                        {item.size === 'SINGLE' ? t('single') : t('double')}
                      </span>
                    )}
                    {item.customizations && item.customizations.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.customizations.map((cust, cIdx) => (
                          <span
                            key={cIdx}
                            className="inline-block px-1.5 py-0.5 rounded bg-[#27272A] text-[9px] text-text-muted font-medium border border-card-border"
                          >
                            +{locale === 'en' ? cust.nameEn : cust.nameAr} ({cust.price} EGP)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quantity Actions */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => removeItem(item.productId, item.size, item.customizations)}
                      className="p-1 rounded bg-card-border hover:bg-card hover:text-primary-red transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => {
                        if (isClosed) {
                          alert(
                            locale === 'en'
                              ? 'The store is currently closed. You can start ordering again during working hours.'
                              : 'المطعم مغلق حالياً. يمكنك بدء الطلب مرة أخرى خلال ساعات العمل.',
                            locale === 'en' ? 'Store Closed' : 'المطعم مغلق'
                          );
                          return;
                        }
                        addItem({ ...item });
                      }}
                      className="p-1 rounded bg-card-border hover:bg-card hover:text-accent-amber transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Price and Delete */}
                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => deleteItem(item.productId, item.size, item.customizations)}
                    className="p-1 rounded text-text-muted hover:text-primary-red transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-accent-amber">
                    {item.price * item.quantity} {t('egp')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer calculation section */}
        {items.length > 0 && (
          <div className="p-4 border-t border-card-border bg-[#0C0C0E] space-y-4">
            
            {/* Coupon input */}
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-2.5 rtl:right-2.5 rtl:left-auto top-2.5 h-4 w-4 text-text-muted" />
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder={t('couponCodePlaceholder')}
                  disabled={couponSuccess}
                  className="w-full text-xs bg-card border border-card-border rounded-xl pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2.5 text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary-red/50 transition-colors disabled:opacity-50"
                />
              </div>
              {couponSuccess ? (
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="px-4 py-2 bg-primary-red/10 border border-primary-red/20 text-primary-red hover:bg-primary-red/20 text-xs font-bold rounded-xl transition-all"
                >
                  {locale === 'en' ? 'Remove' : 'إزالة'}
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent-amber hover:bg-accent-amber-hover text-white text-xs font-bold rounded-xl transition-all"
                >
                  {t('applyCoupon')}
                </button>
              )}
            </form>

            {/* Error or Success notification */}
            {couponError && <p className="text-[11px] text-primary-red">{couponError}</p>}
            {couponSuccess && (
              <p className="text-[11px] text-green-500 font-medium">
                {t('couponApplied')}{' '}
                {coupon?.discountType === 'PERCENT'
                  ? `(${coupon.discountValue}%)`
                  : `(${coupon?.discountValue} ${t('egp')})`}
              </p>
            )}

            {/* Price breakdown */}
            <div className="space-y-1.5 border-t border-card-border/50 pt-3">
              <div className="flex justify-between text-xs text-text-muted">
                <span>{t('subtotal')}</span>
                <span>{subtotal} {t('egp')}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-green-500 font-medium">
                  <span>{t('discount')}</span>
                  <span>-{discountAmount} {t('egp')}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-text-muted">
                <span>{t('deliveryFee')}</span>
                <span>{deliveryFee} {t('egp')}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-foreground border-t border-card-border/30 pt-2">
                <span>{t('total')}</span>
                <span className="text-accent-amber">{total} {t('egp')}</span>
              </div>
            </div>

            <a
              href="/checkout"
              onClick={() => {
                setCartOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all pulse-glow-red cursor-pointer text-center"
            >
              <span>{t('checkoutBtn')}</span>
              {dir === 'ltr' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
