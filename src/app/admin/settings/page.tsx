'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ShieldAlert, Loader2, Save, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function SettingsPage() {
  const { locale, t } = useLanguage();
  const { role, isLoading: authLoading, isAuthenticated, user } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState('');

  const { data: settings = [], isLoading: dataLoading } = useQuery({
    queryKey: ['admin-settings-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('restaurant_settings').select('*');
      if (error) throw error;
      return data;
    },
    enabled: isAuthenticated && ['OWNER', 'HEAD_ADMIN', 'DEVELOPER'].includes(role || ''),
  });

  const saveSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('restaurant_settings')
        .upsert({
          key,
          value,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings-list'] });
      setSuccessMsg(locale === 'en' ? 'Settings updated successfully!' : 'تم تحديث الإعدادات بنجاح!');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary-red animate-spin" />
      </div>
    );
  }

  const isAuthorized = isAuthenticated && ['OWNER', 'HEAD_ADMIN', 'DEVELOPER'].includes(role || '');

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
                ? 'Only Restaurant Owners, Head Admins, and Developers can configure system settings.'
                : 'يسمح فقط لمالكي المطعم، المشرفين العامين، والمطورين بتهيئة إعدادات النظام.'}
            </p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const handleSave = (key: string, value: string) => {
    saveSettingMutation.mutate({ key, value });
  };

  return (
    <>
      <Header />
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 min-h-screen text-white">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
            <span>{locale === 'en' ? 'Restaurant Settings' : 'إعدادات المطعم'}</span>
            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-primary-red/10 text-primary-red border border-primary-red/20">
              System
            </span>
          </h1>
          <p className="text-xs text-text-muted">
            {locale === 'en'
              ? 'Configure delivery options, kitchen parameters, and application preferences.'
              : 'تهيئة خيارات التوصيل، ومعايير المطبخ، وتفضيلات التطبيق.'}
          </p>
        </div>

        {successMsg && (
          <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-xs text-green-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {dataLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="h-8 w-8 text-primary-red animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-card-border rounded-3xl p-6 space-y-6">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">{locale === 'en' ? 'General parameters' : 'المعلمات العامة'}</h2>
              
              <div className="space-y-4">
                {/* Setting 1: Delivery Fee */}
                {(() => {
                  const feeSetting = settings.find((s: any) => s.key === 'delivery_fee') || { value: '25' };
                  return (
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">
                        {locale === 'en' ? 'Base Delivery Fee (EGP)' : 'رسوم التوصيل الأساسية (ج.م)'}
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="setting-delivery-fee"
                          type="number"
                          defaultValue={feeSetting.value}
                          className="flex-grow text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                          onBlur={(e) => handleSave('delivery_fee', e.target.value)}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Setting 2: Minimum Order */}
                {(() => {
                  const minSetting = settings.find((s: any) => s.key === 'min_order_value') || { value: '100' };
                  return (
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">
                        {locale === 'en' ? 'Minimum Order Value (EGP)' : 'الحد الأدنى لقيمة الطلب (ج.م)'}
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="setting-min-order"
                          type="number"
                          defaultValue={minSetting.value}
                          className="flex-grow text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                          onBlur={(e) => handleSave('min_order_value', e.target.value)}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Setting 3: Restaurant Open/Closed Status */}
                {(() => {
                  const statusSetting = settings.find((s: any) => s.key === 'restaurant_status') || { value: 'OPEN' };
                  return (
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">
                        {locale === 'en' ? 'Store Status' : 'حالة المتجر'}
                      </label>
                      <select
                        defaultValue={statusSetting.value}
                        className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                        onChange={(e) => handleSave('restaurant_status', e.target.value)}
                      >
                        <option value="OPEN">OPEN / يعمل</option>
                        <option value="CLOSED">CLOSED / مغلق</option>
                      </select>
                    </div>
                  );
                })()}

                {/* Setting 4: Combo Discount Percentage */}
                {(() => {
                  const comboDiscountSetting = settings.find((s: any) => s.key === 'combo_discount_percentage') || { value: '25' };
                  return (
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">
                        {locale === 'en' ? 'Combo Offer Discount (%)' : 'نسبة خصم عرض الكومبو (%)'}
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="setting-combo-discount"
                          type="number"
                          min="0"
                          max="100"
                          defaultValue={comboDiscountSetting.value}
                          className="flex-grow text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                          onBlur={(e) => handleSave('combo_discount_percentage', e.target.value)}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Setting 5: Combo Fixed Price */}
                {(() => {
                  const comboFixedPriceSetting = settings.find((s: any) => s.key === 'combo_fixed_price') || { value: '' };
                  return (
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">
                        {locale === 'en' ? 'Combo Fixed Price (EGP) - Overrides percentage' : 'السعر الثابت للكومبو (ج.م) - يلغي نسبة الخصم'}
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="setting-combo-fixed"
                          type="number"
                          min="0"
                          placeholder="e.g. 50"
                          defaultValue={comboFixedPriceSetting.value}
                          className="flex-grow text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                          onBlur={(e) => handleSave('combo_fixed_price', e.target.value)}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
