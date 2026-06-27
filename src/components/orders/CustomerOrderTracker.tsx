'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { useLanguage } from '@/context/LanguageContext';
import { Clock, Truck, ChefHat, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function CustomerOrderTracker({ userId }: { userId?: string }) {
  const { locale, t } = useLanguage();

  const { data: orders = [] } = useQuery({
    queryKey: ['customer-active-orders', userId],
    queryFn: () => db.getOrders({ userId }),
    refetchInterval: 3000,
    enabled: !!userId,
  });

  const activeOrders = orders.filter((o) => 
    ['PENDING', 'PREPARING', 'ON_THE_WAY'].includes(o.status)
  );

  if (activeOrders.length === 0) return null;

  // Take the most recently active order
  const order = activeOrders[0];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return {
          icon: <Clock className="h-4 w-4 animate-pulse text-amber-500" />,
          textEn: 'Pending Approval',
          textAr: 'في انتظار الموافقة',
          bg: 'bg-amber-500/10 border-amber-500/20',
          text: 'text-amber-500',
        };
      case 'PREPARING':
        return {
          icon: <ChefHat className="h-4 w-4 text-primary-red animate-bounce" />,
          textEn: 'Preparing in Kitchen',
          textAr: 'يتم التجهيز بالمطبخ',
          bg: 'bg-primary-red/10 border-primary-red/20',
          text: 'text-primary-red',
        };
      case 'ON_THE_WAY':
        return {
          icon: <Truck className="h-4 w-4 text-blue-400" />,
          textEn: 'Out for Delivery',
          textAr: 'في الطريق إليك',
          bg: 'bg-blue-500/10 border-blue-500/20',
          text: 'text-blue-400',
        };
      default:
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
          textEn: 'Delivered',
          textAr: 'تم التوصيل',
          bg: 'bg-green-500/10 border-green-500/20',
          text: 'text-green-500',
        };
    }
  };

  const config = getStatusConfig(order.status);

  return (
    <Link 
      href={`/track/${order.id}`}
      className="block w-full bg-[#18181B] border-b border-card-border overflow-hidden hover:bg-[#202024] transition-colors group cursor-pointer"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className={`flex items-center justify-between px-4 py-2 rounded-xl border ${config.bg} backdrop-blur-md`}>
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg bg-card border border-card-border ${config.text}`}>
              {config.icon}
            </div>
            <div>
              <div className="text-[10px] font-bold text-text-muted font-mono tracking-wider">
                ORDER #{order.id.slice(0, 8)}
              </div>
              <div className={`text-xs font-black ${config.text}`}>
                {locale === 'en' ? config.textEn : config.textAr}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:block">
              {order.type === 'DELIVERY' && order.driverName && (
                <div className="text-[10px] text-text-muted">
                  Driver: <span className="font-bold text-white">{order.driverName}</span>
                </div>
              )}
            </div>
            
            <span className="px-3 py-1.5 bg-primary-red group-hover:bg-primary-red-hover text-white text-[10px] font-black rounded-lg transition-colors flex items-center gap-1.5">
              <span>{locale === 'en' ? 'Track Live' : 'تتبع الآن'}</span>
              <span className="text-xs transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1">➔</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
