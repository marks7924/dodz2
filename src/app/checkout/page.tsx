'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useCartStore } from '@/store/useCartStore';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartSidebar from '@/components/cart/CartSidebar';
import { db } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { useBranch } from '@/context/BranchContext';
import { MapPin, Phone, User, CreditCard, ChevronRight, CheckCircle, Navigation, ArrowRight } from 'lucide-react';
import LazyDeliveryMap from '@/components/map/LazyDeliveryMap';
import { searchAddress } from '@/lib/nominatim';
import { calcDeliveryFee } from '@/lib/osrm';
import { useModal } from '@/context/ModalContext';

export default function CheckoutPage() {
  const { t, locale, dir } = useLanguage();
  const { alert } = useModal();
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
  } = useCartStore();

  const { selectedBranchId, selectedBranch, selectBranch, allBranches } = useBranch();

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [apptDetails, setApptDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [saveDetails, setSaveDetails] = useState(false);
  const [payment, setPayment] = useState<'COD' | 'FAWRY' | 'CARD'>('COD');
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Fawry reference states
  const [fawryCode, setFawryCode] = useState<string | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  // Map states — updated by DeliveryMap
  const [pinLat, setPinLat] = useState(30.0444);
  const [pinLng, setPinLng] = useState(31.2357);
  const [isPinning, setIsPinning] = useState(false);
  const [customDeliveryFee, setCustomDeliveryFee] = useState(40);
  const [isOrdering, setIsOrdering] = useState(false);
  const { user, profile, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      router.push('/auth/login?next=/checkout');
    }
  }, [mounted, isLoading, user, router]);

  useEffect(() => {
    let initialName = '';
    let initialPhone = '';
    let initialAddress = '';

    const savedState = localStorage.getItem('dodz_saved_delivery');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        initialName = parsed.name || '';
        initialPhone = parsed.phone || '';
        initialAddress = parsed.address || '';
        if (parsed.apptDetails) setApptDetails(parsed.apptDetails);
        if (parsed.notes) setNotes(parsed.notes);
        setSaveDetails(true);
      } catch (e) {}
    }

    if (profile) {
      if (profile.full_name) initialName = profile.full_name;
      if (profile.phone) initialPhone = profile.phone;
    }

    setName(initialName);
    setPhone(initialPhone);
    setAddress(initialAddress);
  }, [profile]);

  if (!mounted || isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-red" />
      </div>
    );
  }

  // Called by DeliveryMap whenever pin location changes
  const handleLocationChange = (lat: number, lng: number, addr: string, fee: number) => {
    setPinLat(lat);
    setPinLng(lng);
    setAddress(addr);
    setCustomDeliveryFee(fee);
    setIsPinning(true);
  };

  // Automatically search and pin coordinates when user finishes typing address in text field
  const handleAddressBlur = async () => {
    if (!address.trim() || address.trim().length < 5) return;
    try {
      const results = await searchAddress(address);
      if (results && results.length > 0) {
        const topResult = results[0];
        const lat = parseFloat(topResult.lat);
        const lng = parseFloat(topResult.lon);
        setPinLat(lat);
        setPinLng(lng);

        // Distance from Cairo center (Tahrir square fallback base calculation)
        const dist = Math.sqrt(Math.pow(lat - 30.0444, 2) + Math.pow(lng - 31.2357, 2)) * 100;
        const fee = calcDeliveryFee(dist / 10);
        setCustomDeliveryFee(fee);
        setIsPinning(true);
      }
    } catch (e) {
      console.warn('Geocoding on blur failed:', e);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    const newErrors: Record<string, boolean> = {};
    if (!name.trim()) newErrors.name = true;
    if (!phone.trim()) newErrors.phone = true;
    
    if (deliveryType === 'DELIVERY') {
      if (!apptDetails.trim()) newErrors.apptDetails = true;
      if (!address.trim()) newErrors.address = true;
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      await alert(locale === 'en' ? 'Please complete the data' : 'برجاء استكمال البيانات');
      const firstErrorKey = Object.keys(newErrors)[0];
      const errorElement = document.getElementById(`input-${firstErrorKey}`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorElement.focus();
      }
      return;
    }

    if (!selectedBranchId) {
      await alert(locale === 'en' ? 'Please select a branch before completing your checkout.' : 'يرجى اختيار فرع قبل إتمام الطلب.');
      const selectorElement = document.getElementById('checkout-branch-selector');
      if (selectorElement) {
        selectorElement.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    if (coupon?.code) {
      const couponCheck = await db.validateCoupon(coupon.code, selectedBranchId || undefined, user?.id);
      if (!couponCheck.isValid) {
        await alert(couponCheck.error || 'The applied coupon is no longer valid.');
        return;
      }
    }

    setIsOrdering(true);

    const branchName = selectedBranch
      ? (locale === 'en' ? selectedBranch.nameEn : selectedBranch.nameAr)
      : 'Dodz Restaurant Main Branch';

    const finalAddress = deliveryType === 'DELIVERY'
      ? (apptDetails.trim() ? `${apptDetails.trim()}, ${address}` : address)
      : `PICKUP - ${branchName}`;

    const orderPayload = {
      userId: profile?.id || 'guest-user',
      userName: name,
      userPhone: phone,
      branchId: selectedBranchId,
      type: deliveryType,
      address: finalAddress,
      paymentMethod: payment,
      total: getTotal(),
      deliveryFee: deliveryType === 'DELIVERY' ? customDeliveryFee : 0,
      discount: getDiscountAmount(),
      couponCode: coupon?.code || undefined,
      notes: notes.trim() || undefined,
      items: items.map((it) => ({
        productId: it.productId as string,
        productNameEn: it.nameEn,
        productNameAr: it.nameAr,
        size: it.size,
        quantity: it.quantity,
        price: it.price,
        customizations: it.customizations || [],
      })),
      lat: deliveryType === 'DELIVERY' ? pinLat : undefined,
      lng: deliveryType === 'DELIVERY' ? pinLng : undefined,
    };

    if (saveDetails) {
      localStorage.setItem('dodz_saved_delivery', JSON.stringify({
        name,
        phone,
        address: deliveryType === 'DELIVERY' ? address : '',
        apptDetails: deliveryType === 'DELIVERY' ? apptDetails : '',
        notes
      }));
    } else {
      localStorage.removeItem('dodz_saved_delivery');
    }

    try {
      const response = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment initiation failed');
      }

      const data = await response.json();

      if (payment === 'COD') {
        clearCart();
        setIsOrdering(false);
        router.push(`/track/${data.orderId}`);
      } else if (payment === 'CARD') {
        clearCart();
        setIsOrdering(false);
        if (data.iframeUrl) {
          window.location.href = data.iframeUrl;
        } else {
          throw new Error('No iframe URL returned');
        }
      } else if (payment === 'FAWRY') {
        clearCart();
        setIsOrdering(false);
        setFawryCode(data.fawryRefNumber);
        setSuccessOrderId(data.orderId);
      }
    } catch (err: any) {
      console.error('Checkout place order failure:', err);
      await alert(locale === 'en' ? `Error: ${err.message}` : `خطأ: ${err.message}`);
      setIsOrdering(false);
    }
  };

  const subtotal = getSubtotal();
  const discount = getDiscountAmount();
  const finalDeliveryFee = deliveryType === 'DELIVERY' ? customDeliveryFee : 0;
  const total = Math.max(0, subtotal - discount + finalDeliveryFee);

  // Get selected branch lat/lng if available (branches need lat/lng in DB)
  // For now we pass them as undefined — OSRM will gracefully fall back
  const branchLat = undefined;
  const branchLng = undefined;

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

              {/* Branch Selection */}
              <div id="checkout-branch-selector" className="bg-card border border-card-border rounded-3xl p-6 space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-accent-amber">
                  {locale === 'en' ? 'Select Restaurant Branch' : 'اختر فرع المطعم'}
                </h2>
                {selectedBranchId ? (
                  <div className="p-4 rounded-2xl bg-card-border/45 border border-card-border flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary-red/10 flex items-center justify-center text-primary-red shrink-0">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          {locale === 'en' ? selectedBranch?.nameEn : selectedBranch?.nameAr}
                        </h4>
                        <p className="text-[10px] text-text-muted mt-0.5">
                          {locale === 'en' ? selectedBranch?.addressEn : selectedBranch?.addressAr}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectBranch(null)}
                      className="px-3 py-1.5 bg-card hover:bg-card-border border border-card-border rounded-lg text-[10px] font-bold text-white transition-all cursor-pointer hover:text-primary-red animate-in fade-in"
                    >
                      {locale === 'en' ? 'Change' : 'تغيير'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 animate-in fade-in">
                    <p className="text-xs text-text-muted">
                      {locale === 'en'
                        ? 'Please select the branch you want to order from:'
                        : 'يرجى اختيار الفرع الذي ترغب في الطلب منه:'}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {allBranches.map((branch) => {
                        const isClosed = branch.status === 'CLOSED';
                        return (
                          <button
                            key={branch.id}
                            type="button"
                            disabled={isClosed}
                            onClick={() => selectBranch(branch.id)}
                            className="w-full text-left rtl:text-right px-4 py-3 rounded-2xl border transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 bg-card-border/20 border-card-border hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <MapPin className="h-4 w-4 text-text-muted shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate">
                                  {locale === 'en' ? branch.nameEn : branch.nameAr}
                                </p>
                                {(branch.addressEn || branch.addressAr) && (
                                  <p className="text-[10px] text-text-muted truncate mt-0.5">
                                    {locale === 'en' ? branch.addressEn : branch.addressAr}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                              style={{
                                background: isClosed ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                                color: isClosed ? '#f87171' : '#4ade80',
                              }}
                            >
                              {isClosed
                                ? (locale === 'en' ? 'Closed' : 'مغلق')
                                : (locale === 'en' ? 'Open' : 'مفتوح')}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
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
                      id="input-name"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setErrors(prev => ({ ...prev, name: false })); }}
                      placeholder={t('namePlaceholder')}
                      required
                      className={`w-full text-xs bg-card-border border rounded-xl pl-10 pr-3 rtl:pr-10 rtl:pl-3 py-3.5 text-foreground placeholder:text-text-muted focus:outline-none transition-colors ${
                        errors.name ? 'border-red-500' : 'border-card-border focus:border-primary-red/50'
                      }`}
                    />
                    {errors.name && <span className="text-[10px] text-red-500 block mt-1 px-1">{locale === 'en' ? 'Name is required' : 'الاسم مطلوب'}</span>}
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 rtl:right-3 rtl:left-auto top-3.5 h-4.5 w-4.5 text-text-muted" />
                    <input
                      type="tel"
                      id="input-phone"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setErrors(prev => ({ ...prev, phone: false })); }}
                      placeholder={t('phonePlaceholder')}
                      required
                      className={`w-full text-xs bg-card-border border rounded-xl pl-10 pr-3 rtl:pr-10 rtl:pl-3 py-3.5 text-foreground placeholder:text-text-muted focus:outline-none transition-colors ${
                        errors.phone ? 'border-red-500' : 'border-card-border focus:border-primary-red/50'
                      }`}
                    />
                    {errors.phone && <span className="text-[10px] text-red-500 block mt-1 px-1">{locale === 'en' ? 'Phone is required' : 'رقم الهاتف مطلوب'}</span>}
                  </div>
                </div>
              </div>

              {/* Delivery Address & OpenStreetMap */}
              {deliveryType === 'DELIVERY' && (
                <div className="bg-card border border-card-border rounded-3xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-accent-amber">{t('deliveryAddress')}</h2>
                    {isPinning && (
                      <span className="text-[10px] text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 flex items-center gap-1">
                        <Navigation className="h-3 w-3 animate-pulse" />
                        {locale === 'en' ? 'Location Pinned' : 'تم تحديد الموقع'}
                      </span>
                    )}
                  </div>

                   {/* Apartment / Floor / Building details */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">
                      {locale === 'en' ? 'Apartment / Floor / Building Number' : 'رقم الشقة / الطابق / العمارة'}
                    </label>
                    <input
                      type="text"
                      id="input-apptDetails"
                      value={apptDetails}
                      onChange={(e) => { setApptDetails(e.target.value); setErrors(prev => ({ ...prev, apptDetails: false })); }}
                      placeholder={locale === 'en' ? 'e.g. Appt 4, Floor 3, Building 12' : 'مثال: شقة ٤، الدور ٣، عمارة ١٢'}
                      className={`w-full text-xs bg-card-border border rounded-xl px-4 py-3.5 text-foreground placeholder:text-text-muted focus:outline-none transition-colors ${
                        errors.apptDetails ? 'border-red-500' : 'border-card-border focus:border-primary-red/50'
                      }`}
                    />
                    {errors.apptDetails && <span className="text-[10px] text-red-500 block mt-1 px-1">{locale === 'en' ? 'Apartment details are required for delivery' : 'تفاصيل الشقة/العمارة مطلوبة للتوصيل'}</span>}
                  </div>

                  {/* Street address */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">
                      {locale === 'en' ? 'Street Location / Address (Auto-filled by Map)' : 'موقع الشارع / العنوان (يملأ تلقائياً من الخريطة)'}
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 rtl:right-3 rtl:left-auto top-3.5 h-4.5 w-4.5 text-text-muted" />
                      <input
                        type="text"
                        id="input-address"
                        value={address}
                        onChange={(e) => { setAddress(e.target.value); setErrors(prev => ({ ...prev, address: false })); }}
                        onBlur={handleAddressBlur}
                        placeholder={t('addressPlaceholder')}
                        required
                        className={`w-full text-xs bg-card-border border rounded-xl pl-10 pr-3 rtl:pr-10 rtl:pl-3 py-3.5 text-foreground placeholder:text-text-muted focus:outline-none transition-colors ${
                          errors.address ? 'border-red-500' : 'border-card-border focus:border-primary-red/50'
                        }`}
                      />
                    </div>
                    {errors.address && <span className="text-[10px] text-red-500 block mt-1 px-1">{locale === 'en' ? 'Street location/address is required for delivery' : 'موقع الشارع/العنوان مطلوب للتوصيل'}</span>}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="saveDetails"
                      checked={saveDetails}
                      onChange={(e) => setSaveDetails(e.target.checked)}
                      className="rounded border-card-border bg-card-border text-primary-red focus:ring-primary-red/50 focus:ring-offset-background"
                    />
                    <label htmlFor="saveDetails" className="text-xs text-text-muted cursor-pointer select-none">
                      {locale === 'en' ? 'Save delivery details for next time' : 'حفظ تفاصيل التوصيل للمرة القادمة'}
                    </label>
                  </div>

                  {/* Real OpenStreetMap — powered by Leaflet + CartoDB Dark tiles */}
                  <div className="space-y-1">
                    <label className="text-xs text-text-muted block font-medium">
                      {locale === 'en'
                        ? 'Pin your delivery location or search an address:'
                        : 'حدد موقع التوصيل على الخريطة أو ابحث عن عنوان:'}
                    </label>
                    <LazyDeliveryMap
                      initialLat={pinLat}
                      initialLng={pinLng}
                      onLocationChange={handleLocationChange}
                      selectedBranchLat={branchLat}
                      selectedBranchLng={branchLng}
                      locale={locale}
                      height="300px"
                    />
                  </div>
                </div>
              )}

              {/* Custom Instructions / Notes */}
              <div className="bg-card border border-card-border rounded-3xl p-6 space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-accent-amber">
                  {locale === 'en' ? 'Custom Instructions / Notes' : 'تعليمات خاصة / ملاحظات'}
                </h2>
                <div className="space-y-1">
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">
                    {locale === 'en' ? 'Instructions for the Kitchen or Driver' : 'تعليمات للمطبخ أو سائق التوصيل'}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={locale === 'en' 
                      ? "e.g. Please separate the sauces, don't ring the bell, or call when you arrive." 
                      : 'مثال: يرجى فصل الصوصات، عدم رن الجرس، أو الاتصال عند الوصول.'}
                    rows={3}
                    className="w-full text-xs bg-card-border border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary-red/50 transition-colors resize-none"
                  />
                </div>
              </div>

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

                {/* Card payment redirection notice */}
                {payment === 'CARD' && (
                  <div className="p-4 rounded-2xl bg-card-border/45 border border-card-border text-center space-y-2 animate-in fade-in duration-200 text-xs text-text-muted">
                    <CreditCard className="h-8 w-8 text-accent-amber mx-auto" />
                    <p>
                      {locale === 'en'
                        ? 'You will be redirected to Paymob\'s secure window to complete your payment.'
                        : 'سيتم توجيهك إلى نافذة دفع بي موب الآمنة لإتمام عملية الدفع.'}
                    </p>
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

      {/* Fawry Reference Code Modal */}
      {fawryCode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#0E0E10] border border-[#27272A] rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-amber-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-red-600/10 rounded-full blur-3xl" />

            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <span className="text-3xl">⚡</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-white">
                {locale === 'en' ? 'Fawry Reference Code' : 'كود الدفع فوري'}
              </h3>
              <p className="text-xs text-[#A1A1AA]">
                {locale === 'en'
                  ? 'Please use the following reference number to pay at any Fawry kiosk:'
                  : 'برجاء استخدام الرقم المرجعي التالي للدفع من أي منفذ فوري:'}
              </p>
            </div>

            <div className="bg-[#18181B] border border-[#27272A] rounded-2xl py-4 px-6 text-center space-y-1">
              <span className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-wider">
                {locale === 'en' ? 'Reference Number' : 'الرقم المرجعي'}
              </span>
              <div className="text-2xl font-mono font-black text-amber-500 tracking-widest select-all">
                {fawryCode}
              </div>
            </div>

            <button
              onClick={() => {
                if (successOrderId) {
                  router.push(`/track/${successOrderId}`);
                }
              }}
              className="w-full py-3 bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{locale === 'en' ? 'Track Order' : 'تتبع طلبك'}</span>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
