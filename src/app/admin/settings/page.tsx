'use client';
 
import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ShieldAlert, Loader2, Save, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
 
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

  const { data: products = [] } = useQuery({
    queryKey: ['admin-settings-products'],
    queryFn: () => db.getProducts(),
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

                {/* Setting 6: Combo Items List */}
                {(() => {
                  const comboItemsSetting = settings.find((s: any) => s.key === 'combo_items_list') || { value: '' };
                  const selectedIds = comboItemsSetting.value ? comboItemsSetting.value.split(',') : [];
                  
                  return (
                    <div className="space-y-2 pt-2 border-t border-card-border/30">
                      <label className="text-[10px] text-accent-amber block font-bold uppercase tracking-wider">
                        {locale === 'en' ? 'Select Combo Items' : 'تحديد عناصر عرض الكومبو'}
                      </label>
                      <p className="text-[10px] text-text-muted leading-tight mb-2">
                        {locale === 'en' 
                          ? 'Choose which items will be added to the customer order when they accept the make-it-combo offer.' 
                          : 'اختر العناصر التي سيتم إضافتها لطلب العميل عند قبوله لعرض الكومبو.'}
                      </p>
                      <div className="max-h-40 overflow-y-auto bg-[#18181B] border border-card-border rounded-xl p-3 space-y-1.5 scrollbar-thin">
                        {products.map((p: any) => {
                          const isChecked = selectedIds.includes(p.id);
                          return (
                            <label key={p.id} className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer hover:text-primary-red transition-colors">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  let newIds = [...selectedIds];
                                  if (e.target.checked) {
                                    newIds.push(p.id);
                                  } else {
                                    newIds = newIds.filter(id => id !== p.id);
                                  }
                                  handleSave('combo_items_list', newIds.join(','));
                                }}
                                className="accent-primary-red"
                              />
                              <span>{locale === 'en' ? p.nameEn : p.nameAr}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Column 2: Footer, Reviews control and Recommended items */}
            <div className="bg-card border border-card-border rounded-3xl p-6 space-y-6">
              {/* Review System Toggle */}
              {(() => {
                const reviewsActiveSetting = settings.find((s: any) => s.key === 'reviews_active') || { value: 'true' };
                const isReviewsActive = reviewsActiveSetting.value !== 'false';
                return (
                  <div className="space-y-2">
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      {locale === 'en' ? 'Review System Gate' : 'نظام التقييمات والمراجعات'}
                    </h2>
                    <div className="flex items-center justify-between p-3.5 bg-[#18181B] border border-card-border rounded-2xl">
                      <div className="min-w-0 flex-1 pr-3">
                        <span className="text-xs font-bold text-white block">
                          {isReviewsActive ? (locale === 'en' ? 'Active / Resumed' : 'نشط / يعمل') : (locale === 'en' ? 'Disabled / Stopped' : 'معطل / متوقف')}
                        </span>
                        <span className="text-[10px] text-text-muted block leading-relaxed mt-0.5">
                          {locale === 'en' ? 'Toggle to start/stop public reviews visibility' : 'تفعيل أو إيقاف عرض مراجعات وتقييمات العملاء في المتجر'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSave('reviews_active', isReviewsActive ? 'false' : 'true')}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                          isReviewsActive 
                            ? 'bg-red-500/10 border border-red-500/25 text-red-500 hover:bg-red-500 hover:text-white'
                            : 'bg-green-500/10 border border-green-500/25 text-green-500 hover:bg-green-500 hover:text-white'
                        }`}
                      >
                        {isReviewsActive ? (locale === 'en' ? 'Stop System' : 'إيقاف النظام') : (locale === 'en' ? 'Resume System' : 'تشغيل النظام')}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Footer Customization Settings */}
              {(() => {
                const footerSetting = settings.find((s: any) => s.key === 'footer_settings') || { value: '{"phone":"19999","facebook":"","instagram":"","whatsapp":"","tiktok":"","desc_en":"","desc_ar":"","hours_en":"","hours_ar":""}' };
                let footerData = { 
                  phone: '19999', 
                  facebook: '', 
                  instagram: '', 
                  whatsapp: '', 
                  tiktok: '',
                  desc_en: '',
                  desc_ar: '',
                  hours_en: '',
                  hours_ar: ''
                };
                try {
                  footerData = { ...footerData, ...JSON.parse(footerSetting.value) };
                } catch {}

                const handleFooterChange = (field: string, val: string) => {
                  const updated = { ...footerData, [field]: val };
                  handleSave('footer_settings', JSON.stringify(updated));
                };

                return (
                  <div className="space-y-3">
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      {locale === 'en' ? 'Footer & Social Media' : 'إعدادات أسفل الصفحة والروابط'}
                    </h2>
                    <div className="p-4 bg-[#18181B] border border-card-border rounded-2xl space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] text-text-muted block font-bold uppercase tracking-wider">
                          {locale === 'en' ? 'Contact Phone Line' : 'رقم التليفون للاتصال'}
                        </label>
                        <input
                          type="text"
                          defaultValue={footerData.phone}
                          onBlur={(e) => handleFooterChange('phone', e.target.value)}
                          className="w-full text-xs bg-card border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted block font-bold uppercase tracking-wider">Facebook Page Link</label>
                          <input
                            type="text"
                            placeholder="https://facebook.com/..."
                            defaultValue={footerData.facebook}
                            onBlur={(e) => handleFooterChange('facebook', e.target.value)}
                            className="w-full text-xs bg-card border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted block font-bold uppercase tracking-wider">Instagram Page Link</label>
                          <input
                            type="text"
                            placeholder="https://instagram.com/..."
                            defaultValue={footerData.instagram}
                            onBlur={(e) => handleFooterChange('instagram', e.target.value)}
                            className="w-full text-xs bg-card border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted block font-bold uppercase tracking-wider">WhatsApp Contact Link</label>
                          <input
                            type="text"
                            placeholder="https://wa.me/..."
                            defaultValue={footerData.whatsapp}
                            onBlur={(e) => handleFooterChange('whatsapp', e.target.value)}
                            className="w-full text-xs bg-card border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted block font-bold uppercase tracking-wider">TikTok Page Link</label>
                          <input
                            type="text"
                            placeholder="https://tiktok.com/@..."
                            defaultValue={footerData.tiktok}
                            onBlur={(e) => handleFooterChange('tiktok', e.target.value)}
                            className="w-full text-xs bg-card border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] text-text-muted block font-bold uppercase tracking-wider">Description text (English)</label>
                        <textarea
                          rows={2}
                          defaultValue={footerData.desc_en}
                          onBlur={(e) => handleFooterChange('desc_en', e.target.value)}
                          className="w-full text-xs bg-card border border-card-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary-red/50 resize-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-text-muted block font-bold uppercase tracking-wider">Description text (Arabic)</label>
                        <textarea
                          rows={2}
                          defaultValue={footerData.desc_ar}
                          onBlur={(e) => handleFooterChange('desc_ar', e.target.value)}
                          className="w-full text-xs bg-card border border-card-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary-red/50 resize-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted block font-bold uppercase tracking-wider">Working Hours (English)</label>
                          <input
                            type="text"
                            defaultValue={footerData.hours_en}
                            onBlur={(e) => handleFooterChange('hours_en', e.target.value)}
                            className="w-full text-xs bg-card border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted block font-bold uppercase tracking-wider">Working Hours (Arabic)</label>
                          <input
                            type="text"
                            defaultValue={footerData.hours_ar}
                            onBlur={(e) => handleFooterChange('hours_ar', e.target.value)}
                            className="w-full text-xs bg-card border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Recommended Products Selection */}
              {(() => {
                const recommendedSetting = settings.find((s: any) => s.key === 'recommended_product_ids') || { value: '[]' };
                let currentRecommendedIds: string[] = [];
                try {
                  currentRecommendedIds = JSON.parse(recommendedSetting.value || '[]');
                } catch {}

                const handleRecommendToggle = (prodId: string, checked: boolean) => {
                  let updated: string[];
                  if (checked) {
                    updated = [...currentRecommendedIds, prodId];
                  } else {
                    updated = currentRecommendedIds.filter(id => id !== prodId);
                  }
                  handleSave('recommended_product_ids', JSON.stringify(updated));
                };

                return (
                  <div className="space-y-3">
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      {locale === 'en' ? 'Manual Recommended Items' : 'تحديد وجبات مميزة يوصى بها'}
                    </h2>
                    <div className="p-4 bg-[#18181B] border border-card-border rounded-2xl space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin">
                      {products.length === 0 ? (
                        <p className="text-xs text-text-muted italic py-4 text-center">
                          {locale === 'en' ? 'No products available.' : 'لا توجد منتجات متاحة.'}
                        </p>
                      ) : (
                        products.map((p) => {
                          const isRec = currentRecommendedIds.includes(p.id);
                          return (
                            <label key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-card border border-card-border/50 hover:border-card-border cursor-pointer select-none">
                              <span className="text-xs text-white pr-2">{locale === 'en' ? p.nameEn : p.nameAr}</span>
                              <input
                                type="checkbox"
                                checked={isRec}
                                onChange={(e) => handleRecommendToggle(p.id, e.target.checked)}
                                className="rounded bg-[#18181B] border-card-border text-primary-red focus:ring-primary-red/50 shrink-0"
                              />
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
