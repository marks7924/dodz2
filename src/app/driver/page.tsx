'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartSidebar from '@/components/cart/CartSidebar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, Order, User } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Truck, CheckCircle, Clock, MapPin, Phone, ShieldAlert, Shield, DollarSign, ListOrdered, Navigation, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useModal } from '@/context/ModalContext';

export default function DriverPortalPage() {
  const { t, locale } = useLanguage();
  const { confirm, alert } = useModal();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [driverUser, setDriverUser] = useState<any>(null);

  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                 process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-ref');

  useEffect(() => {
    setMounted(true);
  }, []);

  const [showAsDriver, setShowAsDriver] = useState(false);

  useEffect(() => {
    if (profile && (profile.role === 'DRIVER' || profile.role === 'DEVELOPER')) {
      setDriverUser({
        id: profile.id,
        name: profile.full_name,
        email: user?.email || 'driver@dodz.com',
        role: profile.role,
        phone: profile.phone || '',
      });
      setShowAsDriver(profile.show_as_driver || false);
    } else if (isMock) {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed.role === 'DRIVER' || parsed.role === 'DEVELOPER') {
          setDriverUser(parsed);
          setShowAsDriver(parsed.showAsDriver || false);
        }
      }
    } else {
      setDriverUser(null);
    }
  }, [profile, user, isMock]);

  // Poll driver assigned orders (with subscription handling)
  const { data: allOrders = [] } = useQuery<Order[]>({
    queryKey: ['driver-orders'],
    queryFn: () => db.getOrders(),
    refetchInterval: isMock ? 2000 : false, // Poll only in mock mode
    enabled: !!driverUser,
  });

  // Set up Supabase Realtime subscription for real-time order updates
  useEffect(() => {
    if (!driverUser || isMock) return;

    const supabase = createClient();
    const channel = supabase
      .channel('driver-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `driver_id=eq.${driverUser.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverUser, isMock, queryClient]);

  const toggleShowAsDriver = async () => {
    const nextVal = !showAsDriver;
    setShowAsDriver(nextVal);

    if (!isMock && profile?.id) {
      const supabase = createClient();
      await supabase
        .from('profiles')
        .update({ show_as_driver: nextVal })
        .eq('id', profile.id);
    } else {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        parsed.showAsDriver = nextVal;
        localStorage.setItem('user', JSON.stringify(parsed));
      }
    }
  };

  // ---------------------------------------------------------------
  // GPS Live Location Tracking — pushes to Supabase driver_locations
  // ---------------------------------------------------------------
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'active' | 'error'>('idle');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const supabaseRef = useRef(createClient());

  const pushLocation = useCallback(async (
    lat: number,
    lng: number,
    accuracy: number,
    speed: number | null,
    heading: number | null,
    driverId: string,
    activeOrderId?: string
  ) => {
    const { error } = await supabaseRef.current
      .from('driver_locations')
      .upsert({
        driver_id: driverId,
        lat,
        lng,
        accuracy,
        speed: speed ? Math.round(speed * 3.6) : null, // m/s → km/h
        heading,
        is_online: true,
        order_id: activeOrderId || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'driver_id' });
    if (error) console.warn('Failed to push driver location:', error.message);
  }, []);

  // UPDATE only (row must already exist) — avoids 400 from inserting without NOT NULL lat/lng
  const setOffline = useCallback(async (driverId: string) => {
    await supabaseRef.current
      .from('driver_locations')
      .update({ is_online: false, updated_at: new Date().toISOString() })
      .eq('driver_id', driverId);
  }, []);

  useEffect(() => {
    if (!driverUser || !driverUser.id || isMock) return;
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }

    // Get active order to attach to location
    const getActiveOrderId = () => {
      const active = (allOrders || []).find(
        (o: any) => o.driverId === driverUser.id && o.status === 'ON_THE_WAY'
      );
      return active?.id;
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;
        setGpsStatus('active');
        setGpsCoords({ lat: latitude, lng: longitude });
        pushLocation(latitude, longitude, accuracy, speed, heading, driverUser.id, getActiveOrderId());
      },
      (err) => {
        console.warn('GPS error:', err.message);
        // Only attempt setOffline if we had a valid session (row exists)
        // Do NOT call setOffline on first-time permission denial — no row exists yet
        if (gpsCoords !== null) setOffline(driverUser.id);
        setGpsStatus('error');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    const handleOffline = () => setOffline(driverUser.id);
    window.addEventListener('beforeunload', handleOffline);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      window.removeEventListener('beforeunload', handleOffline);
      setOffline(driverUser.id);
    };
  }, [driverUser, isMock, pushLocation, setOffline]);

  // Mutator to update order status via route handler
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { orderId: string; status: Order['status'] }) => {
      const response = await fetch(`/api/orders/${data.orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: data.status }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to update order status');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
    },
    onError: async (err: any) => {
      await alert(err.message || 'Failed to update order status');
    },
  });

  // Mutator to unassign (decline) an order
  const declineOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/orders/${orderId}/unassign`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to decline order');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
    },
    onError: async (err: any) => {
      await alert(err.message || 'Failed to decline order');
    },
  });

  if (!mounted) return null;

  // RBAC Access Protection Check
  if (!driverUser) {
    return (
      <>
        <Header />
        <main className="flex-grow max-w-md mx-auto px-4 py-16 flex flex-col justify-center items-center text-center space-y-6">
          <div className="h-16 w-16 rounded-full bg-primary-red/10 text-primary-red flex items-center justify-center border border-primary-red/20">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">{locale === 'en' ? 'Driver Portal Access' : 'بوابة السائق'}</h1>
            <p className="text-xs text-text-muted">
              {isMock
                ? (locale === 'en'
                  ? 'This portal is restricted to active Delivery Drivers. Please switch your role to DRIVER using the switch helper below or the header widget.'
                  : 'هذا القسم خاص بسائقي التوصيل المعتمدين فقط. يرجى تبديل دور الحساب إلى (DRIVER) من القائمة العلوية أو الزر بالأسفل.')
                : (locale === 'en'
                  ? 'This portal is restricted to active Delivery Drivers. Please login using a driver account.'
                  : 'هذا القسم خاص بسائقي التوصيل المعتمدين فقط. يرجى تسجيل الدخول بحساب سائق.')}
            </p>
          </div>
          {isMock ? (
            <button
              onClick={() => {
                const driver = { id: 'user-driver1', name: 'Mustafa Salem (Driver)', email: 'driver1@dodz.com', role: 'DRIVER', phone: '01255556666' };
                localStorage.setItem('user', JSON.stringify(driver));
                window.location.reload();
              }}
              className="w-full py-3 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              {locale === 'en' ? 'Switch Role to DRIVER (Mock)' : 'تبديل دور الحساب إلى سائق (تجريبي)'}
            </button>
          ) : (
            <Link
              href="/auth/login"
              className="w-full py-3 bg-primary-red hover:bg-primary-red-hover text-white text-center text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              {locale === 'en' ? 'Login as Driver' : 'تسجيل دخول السائق'}
            </Link>
          )}
        </main>
        <Footer />
      </>
    );
  }

  // Filter orders related to this driver
  const assignedOrders = allOrders.filter(
    (o) => o.driverId === driverUser.id && o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
  );

  const deliveredOrders = allOrders.filter(
    (o) => o.driverId === driverUser.id && o.status === 'DELIVERED'
  );

  // Analytics: Total Driver Earnings (Cairo delivery fees go directly to driver!)
  const totalEarnings = deliveredOrders.reduce((acc, o) => acc + o.deliveryFee, 0);

  const handleUpdateStatus = (orderId: string, currentStatus: Order['status']) => {
    let nextStatus: Order['status'] = 'PENDING';
    if (currentStatus === 'PENDING' || currentStatus === 'PREPARING') {
      nextStatus = 'ON_THE_WAY'; // Transition from Assigned/Preparing to On the way (picked up)
    } else if (currentStatus === 'ON_THE_WAY') {
      nextStatus = 'DELIVERED'; // Transition from On the way to Delivered
    }

    updateStatusMutation.mutate({ orderId, status: nextStatus });
  };

  return (
    <>
      <Header />
      <CartSidebar />

      <main className="flex-grow max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        
        {/* Developer Testing Suite Visibility Card */}
        {profile?.role === 'DEVELOPER' && (
          <div className="bg-[#1D1B26] border border-indigo-500/30 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl shadow-indigo-500/5">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="h-4.5 w-4.5 text-indigo-400" />
                <span>Developer Testing Suite</span>
              </h3>
              <p className="text-[11px] text-text-muted">
                Toggle your visibility as a driver. When enabled, your developer account will appear in the order assignment dropdown in the Admin dashboard.
              </p>
            </div>
            <button
              onClick={toggleShowAsDriver}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none shrink-0 ${
                showAsDriver 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20' 
                  : 'bg-[#27272A] hover:bg-[#3F3F46] text-text-muted hover:text-white border border-card-border'
              }`}
            >
              <span>{showAsDriver ? '🟢 Active & Visible as Driver' : '⚪ Hidden from Drivers List'}</span>
            </button>
          </div>
        )}

        {/* GPS Live Status Banner */}
        {!isMock && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-xs font-bold ${
            gpsStatus === 'active'
              ? 'bg-green-500/5 border-green-500/20 text-green-400'
              : gpsStatus === 'error'
              ? 'bg-red-500/5 border-red-500/20 text-red-400'
              : 'bg-card-border/40 border-card-border text-text-muted'
          }`}>
            {gpsStatus === 'active' ? (
              <><Navigation className="h-4 w-4 animate-pulse" />
                <span>{locale === 'en' ? 'GPS Active — Broadcasting Location' : 'GPS نشط — يتم بث موقعك'}</span>
                {gpsCoords && (
                  <span className="ml-auto text-[10px] font-mono opacity-70">
                    {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}
                  </span>
                )}
              </>
            ) : gpsStatus === 'error' ? (
              <><WifiOff className="h-4 w-4" />
                <span>{locale === 'en' ? 'GPS Error — Customers cannot track you' : 'خطأ GPS — لا يمكن للعملاء تتبعك'}</span>
              </>
            ) : (
              <><Wifi className="h-4 w-4" />
                <span>{locale === 'en' ? 'Connecting to GPS…' : 'جارٍ الاتصال بـ GPS…'}</span>
              </>
            )}
          </div>
        )}

        {/* Driver Hero Analytics Dashboard */}
        <div className="bg-card border border-card-border rounded-3xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-1">
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{locale === 'en' ? 'Driver Profile' : 'الملف الشخصي للسائق'}</span>
            <h1 className="text-lg font-black text-white">{driverUser.name}</h1>
            <p className="text-[11px] text-primary-red font-bold font-mono">{driverUser.email}</p>
          </div>

          <div className="p-4 rounded-2xl bg-primary-red/5 border border-primary-red/10 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-red/10 text-primary-red flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-text-muted block font-semibold">{t('earnings')}</span>
              <span className="text-lg font-black text-white">{totalEarnings} {t('egp')}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-accent-amber/5 border border-accent-amber/10 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent-amber/10 text-accent-amber flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-text-muted block font-semibold">{t('deliveredOrders')}</span>
              <span className="text-lg font-black text-white">{deliveredOrders.length}</span>
            </div>
          </div>
        </div>

        {/* Deliveries list section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Active Assigned Deliveries (Span 2) */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary-red animate-pulse" />
              <span>{t('activeDeliveries')}</span>
              <span className="px-2 py-0.5 rounded-full bg-primary-red/10 text-primary-red text-xs font-bold">
                {assignedOrders.length}
              </span>
            </h2>

            {assignedOrders.length === 0 ? (
              <div className="bg-card border border-card-border rounded-3xl p-8 text-center text-xs text-text-muted italic">
                {t('noAssignedOrders')}
              </div>
            ) : (
              <div className="space-y-4">
                {assignedOrders.map((order) => (
                  <div key={order.id} className="bg-card border border-card-border rounded-3xl p-6 space-y-4 hover:border-primary-red/35 transition-colors">
                    
                    {/* Header */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] text-text-muted block font-mono">ORDER #{order.id}</span>
                        <span className="text-xs font-bold text-white">
                          {order.type === 'DELIVERY' ? t('delivery') : t('pickup')}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-accent-amber/10 text-accent-amber border border-accent-amber/20 text-[10px] font-bold">
                        {order.status === 'PENDING' && t('statusPending')}
                        {order.status === 'PREPARING' && t('statusPreparing')}
                        {order.status === 'ON_THE_WAY' && t('statusShipped')}
                      </span>
                    </div>

                    {/* Customer & Location */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-text-muted pt-2 border-t border-card-border/30">
                      <div className="space-y-1">
                        <span className="block font-semibold text-white">{t('customer')}</span>
                        <div className="flex items-center gap-1">
                          <span>{order.userName}</span>
                        </div>
                        <a href={`tel:${order.userPhone}`} className="text-primary-red font-bold flex items-center gap-1 mt-1 hover:underline">
                          <Phone className="h-3 w-3" />
                          <span>{order.userPhone}</span>
                        </a>
                      </div>
                      <div className="space-y-1">
                        <span className="block font-semibold text-white">{locale === 'en' ? 'Address' : 'العنوان'}</span>
                        <div className="flex items-start gap-1">
                          <MapPin className="h-3.5 w-3.5 text-primary-red flex-shrink-0 mt-0.5" />
                          <span>{order.address}</span>
                        </div>
                      </div>
                    </div>

                    {/* Items inside order */}
                    <div className="bg-[#18181B] rounded-2xl p-4 border border-card-border/50 text-xs">
                      <span className="font-bold text-white block mb-2">{locale === 'en' ? 'Items List' : 'قائمة المشتريات'}</span>
                      <div className="divide-y divide-card-border/30">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between py-1.5 text-text-muted">
                            <span>{item.quantity}x {locale === 'en' ? item.productNameEn : item.productNameAr} {item.size !== 'NONE' && `(${item.size})`}</span>
                            <span className="text-white font-bold">{item.price * item.quantity} EGP</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between font-bold text-accent-amber border-t border-card-border/50 pt-2 mt-2">
                        <span>Total:</span>
                        <span>{order.total} EGP</span>
                      </div>
                    </div>

                    {/* Action update status button */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateStatus(order.id, order.status)}
                        className="flex-1 py-3 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary-red/15 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {(order.status === 'PENDING' || order.status === 'PREPARING') && (
                          <>
                            <Truck className="h-4 w-4 animate-bounce" />
                            <span>{locale === 'en' ? 'Confirm & Start' : 'تأكيد وبدء'}</span>
                          </>
                        )}
                        {order.status === 'ON_THE_WAY' && (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            <span>{t('markDelivered')}</span>
                          </>
                        )}
                      </button>
                      
                      {(order.status === 'PENDING' || order.status === 'PREPARING') && (
                        <button
                          onClick={async () => {
                            if (await confirm(locale === 'en' ? 'Are you sure you want to decline this order?' : 'هل أنت متأكد أنك تريد رفض هذا الطلب؟')) {
                              declineOrderMutation.mutate(order.id);
                            }
                          }}
                          className="px-4 py-3 bg-card hover:bg-card-border border border-card-border hover:border-red-500/30 text-text-muted hover:text-red-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center cursor-pointer"
                        >
                          {locale === 'en' ? 'Decline' : 'رفض'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delivered history logs */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-accent-amber" />
              <span>{t('deliveredHistory')}</span>
              <span className="px-2 py-0.5 rounded-full bg-accent-amber/10 text-accent-amber text-xs font-bold">
                {deliveredOrders.length}
              </span>
            </h2>

            {deliveredOrders.length === 0 ? (
              <div className="bg-card border border-card-border rounded-3xl p-6 text-center text-xs text-text-muted italic">
                {locale === 'en' ? 'No delivery history logs.' : 'لا يوجد سجل تسليم.'}
              </div>
            ) : (
              <div className="space-y-3">
                {deliveredOrders.map((order) => (
                  <div key={order.id} className="bg-card border border-card-border rounded-2xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-foreground">ORDER #{order.id}</span>
                      <span className="text-green-500">Delivered</span>
                    </div>
                    <div className="text-text-muted space-y-1">
                      <div className="flex justify-between">
                        <span>Earnings:</span>
                        <span className="text-accent-amber font-bold">+{order.deliveryFee} EGP</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span>Time:</span>
                        <span>{new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </main>

      <Footer />
    </>
  );
}
