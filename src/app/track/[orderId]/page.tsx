'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartSidebar from '@/components/cart/CartSidebar';
import { useQuery } from '@tanstack/react-query';
import { db, Order } from '@/lib/db';
import { Clock, CheckCircle2, Truck, Check, ChevronRight, ShoppingBag, MapPin, User, Phone, Play } from 'lucide-react';

export default function OrderTrackingPage() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const orderId = params?.orderId as string;
  const [lastStatus, setLastStatus] = useState<Order['status'] | null>(null);
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
    db.getBranches().then(setBranches);
  }, []);

  // Poll order status every 2 seconds to simulate real-time updates!
  const { data: order, isLoading } = useQuery<Order | undefined>({
    queryKey: ['order', orderId],
    queryFn: () => db.getOrderById(orderId),
    refetchInterval: 2000,
  });

  const selectedBranch = order ? branches.find((b) => b.id === order.branchId) : null;

  // Play audio alert when status changes!
  useEffect(() => {
    if (order) {
      if (lastStatus && lastStatus !== order.status) {
        // Trigger a beep/sound notification
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5 note
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.35);
        } catch (e) {
          console.warn('Audio feedback failed or was blocked by browser autoplay policy.');
        }
      }
      setLastStatus(order.status);
    }
  }, [order, lastStatus]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-red" />
        <p className="text-xs text-text-muted mt-4">{t('loading')}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8 text-center space-y-4">
        <h1 className="text-xl font-bold text-white">{locale === 'en' ? 'Order Not Found' : 'لم يتم العثور على الطلب'}</h1>
        <p className="text-xs text-text-muted max-w-sm">
          {locale === 'en'
            ? 'The order details could not be retrieved. Please check the URL or return to home.'
            : 'تعذر استرداد تفاصيل الطلب. يرجى التحقق من الرابط أو العودة للرئيسية.'}
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2.5 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-colors"
        >
          {t('backToHome')}
        </button>
      </div>
    );
  }

  // Map status to progress step index:
  // 0: PENDING
  // 1: PREPARING
  // 2: ON_THE_WAY
  // 3: DELIVERED
  const getStatusIndex = (status: Order['status']) => {
    switch (status) {
      case 'PENDING': return 0;
      case 'PREPARING': return 1;
      case 'ON_THE_WAY': return 2;
      case 'DELIVERED': return 3;
      default: return 0;
    }
  };

  const currentStep = getStatusIndex(order.status);

  const steps = [
    { label: t('statusPending'), desc: locale === 'en' ? 'Kitchen is reviewing your order' : 'يتم مراجعة طلبك في المطعم', icon: Clock },
    { label: t('statusPreparing'), desc: locale === 'en' ? 'Chef is cooking your fresh hot chicken' : 'يتم تجهيز الفرايد تشيكن والبرجر الآن', icon: CheckCircle2 },
    { label: t('statusShipped'), desc: locale === 'en' ? 'Driver is delivering your warm meal' : 'الطلب مع السائق في طريقه إليك', icon: Truck },
    { label: t('statusDelivered'), desc: locale === 'en' ? 'Enjoy your Dodz Fried Chicken!' : 'بالهناء والشفاء! نتمنى لك وجبة شهية', icon: Check },
  ];

  return (
    <>
      <Header />
      <CartSidebar />

      <main className="flex-grow max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        
        {/* Status Header Badge Card */}
        <div className="bg-card border border-card-border rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-accent-amber font-extrabold uppercase tracking-widest">{t('trackingTitle')}</span>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <span>{t('orderId')}:</span>
              <span className="text-primary-red">#{order.id}</span>
            </h1>
            <p className="text-xs text-text-muted">
              {locale === 'en' ? 'Placed on:' : 'تاريخ الطلب:'} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-primary-red/10 border border-primary-red/20 text-center md:text-right">
            <span className="text-[10px] text-text-muted block font-semibold">{t('estimatedDelivery')}</span>
            <span className="text-base font-extrabold text-accent-amber">
              {order.status === 'DELIVERED' ? '0' : order.status === 'ON_THE_WAY' ? '10-20' : '35-45'}{' '}
              {t('minutes')}
            </span>
          </div>
        </div>

        {/* Dynamic Status Timeline Visualizer */}
        <div className="bg-card border border-card-border rounded-3xl p-6 md:p-8 space-y-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-accent-amber">{t('orderStatus')}</h2>
          
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-4">
            {/* Timeline Progress Bar Line - Desktop */}
            <div className="absolute top-6 left-6 right-6 h-1 bg-card-border -z-10 hidden md:block" />
            <div
              className="absolute top-6 left-6 h-1 bg-gradient-to-r from-primary-red to-accent-amber -z-10 hidden md:block transition-all duration-500"
              style={{ width: `${(currentStep / (steps.length - 1)) * 95}%` }}
            />

            {/* Timeline Stages */}
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isCompleted = idx < currentStep;
              const isActive = idx === currentStep;
              const isPending = idx > currentStep;

              return (
                <div key={idx} className="flex md:flex-col items-center gap-4 md:text-center md:flex-1 relative z-10 w-full">
                  {/* Circle Pin Icon */}
                  <div
                    className={`h-12 w-12 rounded-full border-2 flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-gradient-to-tr from-primary-red to-accent-amber border-transparent text-white'
                        : isActive
                        ? 'bg-card border-primary-red text-primary-red shadow-lg shadow-primary-red/20 animate-pulse'
                        : 'bg-card-border border-card-border text-text-muted'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Stage Titles */}
                  <div className="text-left md:text-center space-y-0.5">
                    <h3 className={`text-xs font-bold ${isActive ? 'text-primary-red' : isCompleted ? 'text-white' : 'text-text-muted'}`}>
                      {step.label}
                    </h3>
                    <p className="text-[10px] text-text-muted max-w-[150px] md:mx-auto">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Split grid for Details and Driver Profile Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Driver details card (visible if delivery + driver assigned) */}
          <div className="bg-card border border-card-border rounded-3xl p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-accent-amber">{t('driverDetails')}</h2>
            
            {order.type === 'PICKUP' ? (
              <div className="p-4 rounded-2xl bg-card-border/40 text-center space-y-2">
                <span className="text-2xl">🏪</span>
                <h3 className="text-xs font-bold text-white">{t('pickup')}</h3>
                <p className="text-[10px] text-text-muted">
                  {locale === 'en'
                    ? `Please visit our ${selectedBranch ? selectedBranch.nameEn : 'Tagamoa Branch'} to pick up your order once it is ready.`
                    : `يرجى زيارة ${selectedBranch ? selectedBranch.nameAr : 'فرع التجمع'} لاستلام طلبك عندما يكون جاهزاً.`}
                </p>
                {selectedBranch && (
                  <a
                    href={selectedBranch.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 px-4 py-1.5 bg-accent-amber hover:bg-accent-amber-hover text-black text-[10px] font-black rounded-lg transition-all"
                  >
                    📍 {locale === 'en' ? 'Get Directions on Google Maps' : 'اتجاهات خرائط جوجل'}
                  </a>
                )}
              </div>
            ) : order.driverId ? (
              <div className="flex gap-4 items-center">
                <div className="h-12 w-12 rounded-full bg-accent-amber/10 flex items-center justify-center text-accent-amber flex-shrink-0 border border-accent-amber/20">
                  <User className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-white">{order.driverName}</h3>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider">{locale === 'en' ? 'Active Driver' : 'سائق التوصيل المعتمد'}</p>
                  <a href={`tel:${order.driverPhone}`} className="text-xs text-primary-red font-bold flex items-center gap-1.5 hover:underline mt-1">
                    <Phone className="h-3 w-3" />
                    <span>{order.driverPhone}</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-card-border/20 text-center text-xs text-text-muted italic border border-dashed border-card-border">
                {locale === 'en' ? 'Assigning a delivery driver to your order...' : 'جاري تعيين سائق لتوصيل طلبك...'}
              </div>
            )}
          </div>

          {/* Customer delivery / pickup location details */}
          <div className="bg-card border border-card-border rounded-3xl p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-accent-amber">{locale === 'en' ? 'Delivery Details' : 'تفاصيل التوصيل'}</h2>
            <div className="space-y-3 text-xs text-text-muted">
              <div className="flex gap-2">
                <User className="h-4 w-4 text-primary-red flex-shrink-0" />
                <div>
                  <span className="block font-bold text-white">{order.userName}</span>
                  <span>{order.userPhone}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <MapPin className="h-4 w-4 text-primary-red flex-shrink-0" />
                <div>
                  <span className="block font-bold text-white">{locale === 'en' ? 'Address' : 'العنوان'}</span>
                  <span>{order.address}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Order Items Breakdown */}
        <div className="bg-card border border-card-border rounded-3xl p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-accent-amber">{locale === 'en' ? 'Items List' : 'قائمة المشتريات'}</h2>
          <div className="divide-y divide-card-border/30">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-3 text-xs text-text-muted">
                <div>
                  <span className="font-bold text-white">{item.quantity}x</span>{' '}
                  <span className="text-foreground">{locale === 'en' ? item.productNameEn : item.productNameAr}</span>
                  {item.size !== 'NONE' && (
                    <span className="block text-[9px] text-primary-red font-bold uppercase">
                      {item.size === 'SINGLE' ? t('single') : t('double')}
                    </span>
                  )}
                </div>
                <span className="text-white font-bold">{item.price * item.quantity} {t('egp')}</span>
              </div>
            ))}
          </div>

          {/* Pricing summary */}
          <div className="border-t border-card-border pt-4 flex flex-col items-end gap-1.5 text-xs text-text-muted">
            <div className="flex justify-between w-full max-w-[200px]">
              <span>{t('subtotal')}:</span>
              <span>{order.total - order.deliveryFee + order.discount} {t('egp')}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between w-full max-w-[200px] text-green-500 font-medium">
                <span>{t('discount')}:</span>
                <span>-{order.discount} {t('egp')}</span>
              </div>
            )}
            <div className="flex justify-between w-full max-w-[200px]">
              <span>{t('deliveryFee')}:</span>
              <span>{order.deliveryFee} {t('egp')}</span>
            </div>
            <div className="flex justify-between w-full max-w-[200px] text-sm font-extrabold text-white border-t border-card-border/50 pt-2">
              <span>{t('total')}:</span>
              <span className="text-accent-amber">{order.total} {t('egp')}</span>
            </div>
          </div>
        </div>

      </main>

      <Footer />
    </>
  );
}
