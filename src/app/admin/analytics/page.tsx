'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ShieldAlert, TrendingUp, DollarSign, ShoppingBag, Users, Calendar, ArrowUpRight, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function AnalyticsPage() {
  const { locale, t } = useLanguage();
  const { role, isLoading: authLoading, isAuthenticated } = useAuth();
  const supabase = createClient();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');

  // Fetch orders data
  const { data: analyticsData, isLoading: dataLoading } = useQuery({
    queryKey: ['admin-analytics', timeRange],
    queryFn: async () => {
      // Pull orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*, branch:branches(name_en, name_ar)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Pull customer count
      const { count: customerCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'CUSTOMER');

      // Calculate statistics
      const ordersList = (orders || []) as any[];
      const totalRevenue = ordersList
        .filter((o: any) => o.status === 'DELIVERED')
        .reduce((sum: number, o: any) => sum + Number(o.total), 0);

      const totalOrders = ordersList.length;
      const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

      // Status breakdown
      const statusCounts = ordersList.reduce((acc: any, o: any) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, { PENDING: 0, PREPARING: 0, ON_THE_WAY: 0, DELIVERED: 0, CANCELLED: 0 });

      // Branch breakdown
      const branchRevenue = ordersList
        .filter((o: any) => o.status === 'DELIVERED')
        .reduce((acc: any, o: any) => {
          const branchName = o.branch ? (locale === 'en' ? o.branch.name_en : o.branch.name_ar) : 'Unknown';
          acc[branchName] = (acc[branchName] || 0) + Number(o.total);
          return acc;
        }, {});


      return {
        totalRevenue,
        totalOrders,
        avgOrderValue,
        customerCount: customerCount || 0,
        statusCounts,
        branchRevenue: Object.entries(branchRevenue).map(([name, value]) => ({ name, value: Number(value) })),
        orders: orders.slice(0, 10), // latest 10
      };
    },
    enabled: isAuthenticated && ['ADMIN', 'HEAD_ADMIN', 'OWNER', 'DEVELOPER'].includes(role || ''),
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary-red animate-spin" />
      </div>
    );
  }

  const isAuthorized = isAuthenticated && ['ADMIN', 'HEAD_ADMIN', 'OWNER', 'DEVELOPER'].includes(role || '');

  if (!isAuthorized) {
    return (
      <>
        <Header />
        <main className="flex-grow max-w-md mx-auto px-4 py-16 flex flex-col justify-center items-center text-center space-y-6">
          <div className="h-16 w-16 rounded-full bg-primary-red/10 text-primary-red flex items-center justify-center border border-primary-red/20">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">{locale === 'en' ? 'Access Denied' : 'غير مسموح بالدخول'}</h1>
            <p className="text-xs text-text-muted">
              {locale === 'en'
                ? 'Only Administrators, Developers, and Restaurant Owners can view analytics reports.'
                : 'يسمح فقط للمسؤولين والمطورين ومالكي المطعم بعرض تقارير التحليلات.'}
            </p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const stats = analyticsData || {
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    customerCount: 0,
    statusCounts: { PENDING: 0, PREPARING: 0, ON_THE_WAY: 0, DELIVERED: 0, CANCELLED: 0 },
    branchRevenue: [],
    orders: [],
  };

  return (
    <>
      <Header />
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 min-h-screen text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
              <span>{locale === 'en' ? 'Restaurant Analytics' : 'تحليلات المطعم'}</span>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-primary-red/10 text-primary-red border border-primary-red/20">
                Live
              </span>
            </h1>
            <p className="text-xs text-text-muted">
              {locale === 'en' ? 'Analyze restaurant sales performance, revenue, and trends.' : 'تحليل أداء مبيعات المطعم والإيرادات والاتجاهات.'}
            </p>
          </div>

          <div className="flex gap-1.5 bg-card border border-card-border p-1 rounded-xl self-start sm:self-auto">
            {(['7d', '30d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeRange === range ? 'bg-primary-red text-white' : 'text-text-muted hover:text-white'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>
        </div>

        {dataLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="h-8 w-8 text-primary-red animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1 */}
              <div className="bg-card border border-card-border rounded-3xl p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block font-semibold uppercase">{locale === 'en' ? 'Total Revenue' : 'إجمالي المبيعات'}</span>
                  <span className="text-2xl font-black">{stats.totalRevenue.toFixed(1)} EGP</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-card border border-card-border rounded-3xl p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary-red/10 text-primary-red flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block font-semibold uppercase">{locale === 'en' ? 'Total Orders' : 'إجمالي الطلبات'}</span>
                  <span className="text-2xl font-black">{stats.totalOrders}</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-card border border-card-border rounded-3xl p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-accent-amber/10 text-accent-amber flex items-center justify-center">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block font-semibold uppercase">{locale === 'en' ? 'Avg. Ticket' : 'متوسط قيمة الطلب'}</span>
                  <span className="text-2xl font-black">{stats.avgOrderValue.toFixed(1)} EGP</span>
                </div>
              </div>

              {/* Card 4 */}
              <div className="bg-card border border-card-border rounded-3xl p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block font-semibold uppercase">{locale === 'en' ? 'Registered Customers' : 'العملاء المسجلين'}</span>
                  <span className="text-2xl font-black">{stats.customerCount}</span>
                </div>
              </div>
            </div>

            {/* Graphs / Detail Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales by Branch */}
              <div className="bg-card border border-card-border rounded-3xl p-6 space-y-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">{locale === 'en' ? 'Sales by Branch' : 'المبيعات حسب الفرع'}</h2>
                <div className="space-y-4">
                  {stats.branchRevenue.length === 0 ? (
                    <p className="text-xs text-text-muted italic">No branch data available</p>
                  ) : (
                    stats.branchRevenue.map((br: any, idx: number) => {
                      const maxVal = Math.max(...stats.branchRevenue.map((b: any) => b.value));
                      const percentage = maxVal > 0 ? (br.value / maxVal) * 100 : 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span>{br.name}</span>
                            <span className="text-accent-amber">{br.value.toFixed(1)} EGP</span>
                          </div>
                          <div className="w-full bg-[#18181B] h-3 rounded-full overflow-hidden border border-card-border/30">
                            <div
                              className="bg-gradient-to-r from-primary-red to-accent-amber h-full rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Order Status Breakdown */}
              <div className="bg-card border border-card-border rounded-3xl p-6 space-y-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">{locale === 'en' ? 'Order Status distribution' : 'توزيع حالات الطلبات'}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {Object.entries(stats.statusCounts).map(([status, count]) => (
                    <div key={status} className="bg-[#18181B] border border-card-border p-4 rounded-2xl text-center">
                      <span className="text-[10px] text-text-muted block font-semibold uppercase">{status}</span>
                      <span className="text-xl font-bold">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
