'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartSidebar from '@/components/cart/CartSidebar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, Order, User } from '@/lib/db';
import { Truck, CheckCircle, Clock, MapPin, Phone, ShieldAlert, DollarSign, ListOrdered } from 'lucide-react';

export default function DriverPortalPage() {
  const { t, locale } = useLanguage();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [driverUser, setDriverUser] = useState<User | null>(null);

  useEffect(() => {
    setMounted(true);
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed.role === 'DRIVER') {
        setDriverUser(parsed);
      }
    }
  }, []);

  // Poll driver assigned orders every 2 seconds
  const { data: allOrders = [] } = useQuery<Order[]>({
    queryKey: ['driver-orders'],
    queryFn: () => db.getOrders(),
    refetchInterval: 2000,
    enabled: !!driverUser,
  });

  // Mutator to update order status
  const updateStatusMutation = useMutation({
    mutationFn: (data: { orderId: string; status: Order['status'] }) =>
      db.updateOrderStatus(data.orderId, data.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
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
              {locale === 'en'
                ? 'This portal is restricted to active Delivery Drivers. Please switch your role to DRIVER using the account widget in the header.'
                : 'هذا القسم خاص بسائقي التوصيل المعتمدين فقط. يرجى تبديل دور الحساب إلى (DRIVER) من القائمة العلوية للتجربة.'}
            </p>
          </div>
          <button
            onClick={() => {
              // Quick helper to switch role to driver automatically
              const driver = { id: 'user-driver1', name: 'Mustafa Salem (Driver)', email: 'driver1@dodz.com', role: 'DRIVER', phone: '01255556666' };
              localStorage.setItem('user', JSON.stringify(driver));
              window.location.reload();
            }}
            className="w-full py-3 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all"
          >
            {locale === 'en' ? 'Switch Role to DRIVER' : 'تبديل دور الحساب إلى سائق'}
          </button>
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
    if (currentStatus === 'PENDING') nextStatus = 'PREPARING';
    else if (currentStatus === 'PREPARING') nextStatus = 'ON_THE_WAY';
    else if (currentStatus === 'ON_THE_WAY') nextStatus = 'DELIVERED';

    updateStatusMutation.mutate({ orderId, status: nextStatus });
  };

  return (
    <>
      <Header />
      <CartSidebar />

      <main className="flex-grow max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        
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
                    <button
                      onClick={() => handleUpdateStatus(order.id, order.status)}
                      className="w-full py-3 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary-red/15 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {order.status === 'PENDING' && (
                        <>
                          <Clock className="h-4 w-4" />
                          <span>{t('markPreparing')}</span>
                        </>
                      )}
                      {order.status === 'PREPARING' && (
                        <>
                          <Truck className="h-4 w-4 animate-bounce" />
                          <span>{t('markShipped')}</span>
                        </>
                      )}
                      {order.status === 'ON_THE_WAY' && (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <span>{t('markDelivered')}</span>
                        </>
                      )}
                    </button>

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
