'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useCartStore } from '@/store/useCartStore';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartSidebar from '@/components/cart/CartSidebar';
import { db } from '@/lib/db';
import { MapPin, Phone, User, CreditCard, ChevronRight, CheckCircle, Navigation } from 'lucide-react';

export default function CheckoutPage() {
  const { t, locale, dir } = useLanguage();
  const router = useRouter();
  const {
    items,
    deliveryType,
    deliveryFee,
    setDeliveryType,
    getSubtotal,
    getDiscountAmount,
    getTotal,
    coupon,
    clearCart,
    selectedBranchId,
  } = useCartStore();

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [payment, setPayment] = useState<'COD' | 'FAWRY' | 'CARD'>('COD');
  
  // Card input states
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Map mock states
  const [pinLat, setPinLat] = useState(30.0444); // Cairo center
  const [pinLng, setPinLng] = useState(31.2357);
  const [customDeliveryFee, setCustomDeliveryFee] = useState(40);
  const [isPinning, setIsPinning] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    db.getBranches().then(setBranches);
    // Load customer name and phone if logged in
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setName(user.name || '');
      setPhone(user.phone || '');
    }
  }, []);

  const selectedBranch = branches.find(b => b.id === selectedBranchId);

  if (!mounted) return null;

  // Calculate dynamic delivery fee based on click coordinates on the mock map!
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert pixel to simulated Cairo coordinates
    const lat = 30.0 + (1 - y / rect.height) * 0.1;
    const lng = 31.0 + (x / rect.width) * 0.4;
    setPinLat(lat);
    setPinLng(lng);
    setIsPinning(true);

    // Calculate distance-based fee: center of Cairo is roughly 30.04, 31.23
    const dist = Math.sqrt(Math.pow(lat - 30.0444, 2) + Math.pow(lng - 31.2357, 2));
    const fee = Math.round(20 + dist * 300); // 20 EGP base + distance multiplier
    setCustomDeliveryFee(fee);
    
    // Update delivery address description dynamically
    setAddress(
      locale === 'en'
        ? `Simulated Address Pin (${lat.toFixed(4)}, ${lng.toFixed(4)}) - Delivery Zone A`
        : `موقع الخريطة المحدد (${lat.toFixed(4)}، ${lng.toFixed(4)}) - منطقة التوصيل أ`
    );
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (!name.trim() || !phone.trim()) return;
    if (deliveryType === 'DELIVERY' && !address.trim()) return;

    setIsOrdering(true);

    // Retrieve simulated user id
    const savedUser = localStorage.getItem('user');
    const user = savedUser ? JSON.parse(savedUser) : { id: 'user-cust' };

    const branchName = selectedBranch
      ? (locale === 'en' ? selectedBranch.nameEn : selectedBranch.nameAr)
      : 'Dodz Restaurant Main Branch';

    try {
      const order = await db.createOrder({
        userId: user.id,
        userName: name,
        userPhone: phone,
        branchId: selectedBranchId,
        type: deliveryType,
        address: deliveryType === 'DELIVERY' ? address : `PICKUP - ${branchName}`,
        paymentMethod: payment,
        total: getTotal(),
        deliveryFee: deliveryType === 'DELIVERY' ? customDeliveryFee : 0,
        discount: getDiscountAmount(),
        couponCode: coupon?.code || undefined,
        items: items.map((it) => ({
          productId: it.productId as string,
          productNameEn: it.nameEn,
          productNameAr: it.nameAr,
          size: it.size,
          quantity: it.quantity,
          price: it.price,
        })),
      });

      // Clear the local cart
      clearCart();
      setIsOrdering(false);

      // Redirect to Order tracking page
      router.push(`/track/${order.id}`);
    } catch (err) {
      console.error(err);
      setIsOrdering(false);
    }
  };

  const subtotal = getSubtotal();
  const discount = getDiscountAmount();
  const finalDeliveryFee = deliveryType === 'DELIVERY' ? customDeliveryFee : 0;
  const total = Math.max(0, subtotal - discount + finalDeliveryFee);

  return (
    <>
      <Header />
      <CartSidebar />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-8 border-b border-card-border pb-4 flex items-center gap-2">
          <span>{t('checkoutTitle')}</span>
          <ChevronRight className="h-5 w-5 text-primary-red rtl:rotate-180" />
        </h1>

        {items.length === 0 ? (
          <div className="text-center py-16 bg-card border border-card-border rounded-3xl p-8 max-w-md mx-auto space-y-4">
            <CheckCircle className="h-12 w-12 text-primary-red mx-auto" />
            <h2 className="text-lg font-bold text-foreground">{locale === 'en' ? 'No Items to Checkout' : 'لا توجد منتجات للدفع'}</h2>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2.5 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all w-full"
            >
              {t('viewMenu')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Form Details & Map Pinning (Span 2) */}
            <form onSubmit={handlePlaceOrder} className="lg:col-span-2 space-y-6">
              
              {/* Order Type Toggle */}
              <div className="bg-card border border-card-border rounded-3xl p-6 space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-accent-amber">{t('orderType')}</h2>
                <div className="flex gap-4 p-1 bg-card-border rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('DELIVERY')}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      deliveryType === 'DELIVERY' ? 'bg-primary-red text-white shadow-md' : 'text-text-muted hover:text-white'
                    }`}
                  >
                    {t('delivery')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryType('PICKUP')}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      deliveryType === 'PICKUP' ? 'bg-primary-red text-white shadow-md' : 'text-text-muted hover:text-white'
                    }`}
                  >
                    {t('pickup')}
                  </button>
                </div>
              </div>

              {/* Personal Details */}
              <div className="bg-card border border-card-border rounded-3xl p-6 space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-accent-amber">
                  {locale === 'en' ? 'Contact Information' : 'معلومات الاتصال'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <User className="absolute left-3 rtl:right-3 rtl:left-auto top-3.5 h-4.5 w-4.5 text-text-muted" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('namePlaceholder')}
                      required
                      className="w-full text-xs bg-card-border border border-card-border rounded-xl pl-10 pr-3 rtl:pr-10 rtl:pl-3 py-3.5 text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary-red/50 transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 rtl:right-3 rtl:left-auto top-3.5 h-4.5 w-4.5 text-text-muted" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t('phonePlaceholder')}
                      required
                      className="w-full text-xs bg-card-border border border-card-border rounded-xl pl-10 pr-3 rtl:pr-10 rtl:pl-3 py-3.5 text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary-red/50 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Address & Map Pinning */}
              {deliveryType === 'DELIVERY' && (
                <div className="bg-card border border-card-border rounded-3xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-accent-amber">{t('deliveryAddress')}</h2>
                    {isPinning && (
                      <span className="text-[10px] text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 flex items-center gap-1">
                        <Navigation className="h-3 w-3 animate-pulse" /> Pin Registered
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <MapPin className="absolute left-3 rtl:right-3 rtl:left-auto top-3.5 h-4.5 w-4.5 text-text-muted" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={t('addressPlaceholder')}
                      required
                      className="w-full text-xs bg-card-border border border-card-border rounded-xl pl-10 pr-3 rtl:pr-10 rtl:pl-3 py-3.5 text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary-red/50 transition-colors"
                    />
                  </div>

                  {/* HIGH FIDELITY SIMULATED GOOGLE MAPS COMPONENT */}
                  <div className="space-y-2">
                    <label className="text-xs text-text-muted block font-medium">
                      {locale === 'en' ? 'Click on map to pin delivery address and calculate distance-based fees:' : 'اضغط على الخريطة لتحديد عنوان التوصيل وحساب الرسوم بدقة:'}
                    </label>
                    <div
                      onClick={handleMapClick}
                      className="relative h-64 w-full bg-[#1e293b] rounded-2xl overflow-hidden border border-card-border cursor-crosshair group shadow-inner"
                    >
                      {/* Grid patterns simulating streets */}
                      <div className="absolute inset-0 opacity-15" style={{
                        backgroundImage: 'radial-gradient(circle, #38bdf8 1px, transparent 1px)',
                        backgroundSize: '24px 24px'
                      }} />
                      <div className="absolute top-1/2 left-0 right-0 h-1 bg-amber-500/20" /> {/* Ring road */}
                      <div className="absolute left-1/3 top-0 bottom-0 w-1 bg-emerald-500/20" /> {/* Nile River */}
                      
                      {/* Cairo labels */}
                      <div className="absolute top-6 left-6 text-[10px] text-slate-400 font-bold">El Obour City (العبور)</div>
                      <div className="absolute bottom-8 right-12 text-[10px] text-slate-400 font-bold">5th Settlement (التجمع الخامس)</div>
                      <div className="absolute top-24 left-1/2 -translate-x-1/2 text-[10px] text-primary-red font-bold">Downtown Cairo (وسط البلد)</div>

                      {/* Moving delivery icon */}
                      <div className="absolute bottom-24 left-24 p-1.5 rounded-lg bg-card border border-card-border text-[9px] font-bold text-white flex items-center gap-1 shadow-md">
                        🛵 {selectedBranch ? (locale === 'en' ? selectedBranch.nameEn : selectedBranch.nameAr) : 'Dodz Tagamoa'}
                      </div>

                      {/* Map Marker Pin */}
                      <div
                        className="absolute -translate-x-1/2 -translate-y-full transition-all duration-300"
                        style={{
                          left: `${((pinLng - 31.0) / 0.4) * 100}%`,
                          top: `${(1 - (pinLat - 30.0) / 0.1) * 100}%`,
                        }}
                      >
                        <div className="relative flex flex-col items-center">
                          <span className="bg-primary-red text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap mb-1">
                            {locale === 'en' ? 'Deliver Here' : 'وصل هنا'}
                          </span>
                          <MapPin className="h-8 w-8 text-primary-red fill-primary-red drop-shadow-md animate-bounce" />
                        </div>
                      </div>

                      {/* Coordinates HUD overlay */}
                      <div className="absolute bottom-3 right-3 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/5 text-[9px] text-text-muted font-mono space-y-0.5">
                        <div className="flex gap-2"><span>LAT:</span> <span className="text-white">{pinLat.toFixed(6)}</span></div>
                        <div className="flex gap-2"><span>LNG:</span> <span className="text-white">{pinLng.toFixed(6)}</span></div>
                        <div className="flex gap-2"><span>ZONE FEE:</span> <span className="text-accent-amber font-bold">{customDeliveryFee} EGP</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Gateways */}
              <div className="bg-card border border-card-border rounded-3xl p-6 space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-accent-amber">{t('paymentMethod')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className={`flex flex-col items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                    payment === 'COD' ? 'border-primary-red bg-primary-red/5' : 'border-card-border hover:border-white/20'
                  }`}>
                    <input
                      type="radio"
                      name="payment"
                      checked={payment === 'COD'}
                      onChange={() => setPayment('COD')}
                      className="sr-only"
                    />
                    <div className="text-center space-y-2">
                      <span className="text-2xl">💵</span>
                      <h3 className="text-xs font-bold text-white">{t('cod')}</h3>
                    </div>
                  </label>

                  <label className={`flex flex-col items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                    payment === 'FAWRY' ? 'border-primary-red bg-primary-red/5' : 'border-card-border hover:border-white/20'
                  }`}>
                    <input
                      type="radio"
                      name="payment"
                      checked={payment === 'FAWRY'}
                      onChange={() => setPayment('FAWRY')}
                      className="sr-only"
                    />
                    <div className="text-center space-y-2">
                      <span className="text-2xl">⚡</span>
                      <h3 className="text-xs font-bold text-white">{t('fawry')}</h3>
                    </div>
                  </label>

                  <label className={`flex flex-col items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                    payment === 'CARD' ? 'border-primary-red bg-primary-red/5' : 'border-card-border hover:border-white/20'
                  }`}>
                    <input
                      type="radio"
                      name="payment"
                      checked={payment === 'CARD'}
                      onChange={() => setPayment('CARD')}
                      className="sr-only"
                    />
                    <div className="text-center space-y-2">
                      <CreditCard className="h-6 w-6 text-accent-amber mx-auto" />
                      <h3 className="text-xs font-bold text-white">{t('card')}</h3>
                    </div>
                  </label>
                </div>

                {/* Card input details display */}
                {payment === 'CARD' && (
                  <div className="p-4 rounded-2xl bg-card-border/40 border border-card-border space-y-3 animate-in fade-in duration-200">
                    <input
                      type="text"
                      placeholder="Card Number"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').substring(0, 16))}
                      required
                      className="w-full text-xs bg-card border border-card-border rounded-xl px-3 py-2.5 text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary-red/50 transition-colors"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value.substring(0, 5))}
                        required
                        className="w-full text-xs bg-card border border-card-border rounded-xl px-3 py-2.5 text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary-red/50 transition-colors"
                      />
                      <input
                        type="password"
                        placeholder="CVV"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 3))}
                        required
                        className="w-full text-xs bg-card border border-card-border rounded-xl px-3 py-2.5 text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary-red/50 transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>

            </form>

            {/* Right Column: Cart Calculation Summary */}
            <div className="space-y-6">
              <div className="bg-card border border-card-border rounded-3xl p-6 space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-accent-amber">
                  {locale === 'en' ? 'Order Summary' : 'ملخص الطلب'}
                </h2>

                {/* List items */}
                <div className="divide-y divide-card-border/30 max-h-[220px] overflow-y-auto pr-2 space-y-3">
                  {items.map((item, index) => (
                    <div key={`${item.productId}-${item.size}-${index}`} className="flex justify-between items-center py-2 text-xs">
                      <div>
                        <span className="font-bold text-foreground">{item.quantity}x</span>{' '}
                        <span>{locale === 'en' ? item.nameEn : item.nameAr}</span>
                        {item.size !== 'NONE' && (
                          <span className="block text-[9px] text-primary-red uppercase font-semibold">
                            {item.size === 'SINGLE' ? t('single') : t('double')}
                          </span>
                        )}
                      </div>
                      <span className="text-accent-amber font-bold">{item.price * item.quantity} {t('egp')}</span>
                    </div>
                  ))}
                </div>

                {/* Calculation breakdown */}
                <div className="border-t border-card-border pt-4 space-y-2 text-xs text-text-muted">
                  <div className="flex justify-between">
                    <span>{t('subtotal')}</span>
                    <span>{subtotal} {t('egp')}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-500">
                      <span>{t('discount')}</span>
                      <span>-{discount} {t('egp')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>{t('deliveryFee')}</span>
                    <span>{finalDeliveryFee} {t('egp')}</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-white border-t border-card-border/50 pt-3">
                    <span>{t('total')}</span>
                    <span className="text-accent-amber text-base">{total} {t('egp')}</span>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={isOrdering}
                  className="w-full py-3.5 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-primary-red/35 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isOrdering ? (
                    <span>{t('loading')}</span>
                  ) : (
                    <>
                      <span>{t('placeOrder')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
