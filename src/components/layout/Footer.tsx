'use client';
 
import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Phone, Clock, MapPin, Heart, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
 
export default function Footer() {
  const { t, locale } = useLanguage();
  const supabase = createClient();
 
  const [footerData, setFooterData] = useState({
    phone: '16974',
    facebook: 'https://www.facebook.com/Dodz.Egypt?mibextid=ZbWKwL',
    instagram: 'https://www.instagram.com/dodzfriedchicken?igsh=MWVicWN6aWh3dGNi',
    whatsapp: '201038952671',
    tiktok: 'https://www.tiktok.com/@dodzfriedchicken1',
    desc_en: 'Craving hot fire-grilled burgers & hand-breaded crispy fried chicken? Dodz is your premium local destination. Order now for ultimate satisfaction!',
    desc_ar: 'عايز برجر مشوي على الفحم أو دجاج مقرمش متبل؟ دودز هو اختيارك الأول. اطلب الآن واستمتع بطعم لا يقاوم!',
    hours_en: 'Daily: 11:00 AM - 03:00 AM',
    hours_ar: 'يومياً: ١١:٠٠ صباحاً - ٠٣:٠٠ فجراً'
  });

  const [dbBranches, setDbBranches] = useState<any[]>([]);
 
  useEffect(() => {
    const fetchFooterSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('restaurant_settings')
          .select('key, value')
          .eq('key', 'footer_settings')
          .single();
 
        if (!error && data?.value) {
          const parsed = JSON.parse(data.value);
          setFooterData((prev) => ({
            phone: parsed.phone || prev.phone,
            facebook: parsed.facebook || prev.facebook,
            instagram: parsed.instagram || prev.instagram,
            whatsapp: parsed.whatsapp || prev.whatsapp,
            tiktok: parsed.tiktok || prev.tiktok,
            desc_en: parsed.desc_en || prev.desc_en,
            desc_ar: parsed.desc_ar || prev.desc_ar,
            hours_en: parsed.hours_en || prev.hours_en,
            hours_ar: parsed.hours_ar || prev.hours_ar
          }));
        }
      } catch (e) {
        console.warn('Error reading footer settings, using defaults:', e);
      }
    };

    const fetchBranches = async () => {
      try {
        const { data, error } = await supabase
          .from('branches')
          .select('*')
          .eq('is_active', true);
        if (!error && data) {
          setDbBranches(data);
        }
      } catch (e) {
        console.warn('Error reading branches for footer:', e);
      }
    };

    fetchFooterSettings();
    fetchBranches();
  }, [supabase]);
 
  const branchesList = dbBranches.length > 0 ? dbBranches.map(b => ({
    nameEn: b.name_en,
    nameAr: b.name_ar,
    url: b.map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.name_en)}`
  })) : [
    { nameEn: 'Seashell Walk Branch', nameAr: 'سي شيل ووك - الساحل', url: 'https://maps.app.goo.gl/41ghzJmGZFH5ydau9' },
    { nameEn: 'Marina Walk Branch', nameAr: 'مارينا ووك - الساحل', url: 'https://maps.app.goo.gl/uFNMVQf7mARqx3VP6?g_st=ac' },
    { nameEn: 'Tagamoa Branch', nameAr: 'فرع التجمع الخامس', url: 'https://maps.app.goo.gl/PY39jUeRrMDCEcoa9' },
    { nameEn: 'Almaza Branch', nameAr: 'فرع الماظه', url: 'https://maps.app.goo.gl/b8dnYd1XsQ31qsb89' },
    { nameEn: 'Nasr City Branch', nameAr: 'فرع مدينه نصر', url: 'https://maps.app.goo.gl/xra2XTm54n3K6kaD9?g_st=ac' },
    { nameEn: 'Hadayek El-Kobba Branch', nameAr: 'فرع حدائق القبه', url: 'https://maps.app.goo.gl/a8UYTCEwjHojwvFy5?g_st=ac' },
    { nameEn: 'Ain Shams Branch', nameAr: 'فرع عين شمس', url: 'https://maps.app.goo.gl/gYqVryurQyTXWqibA' },
  ];
 
  return (
    <footer className="w-full bg-[#070708] border-t border-card-border mt-auto font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Brand Info & Socials */}
          <div className="flex flex-col space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-extrabold tracking-wider bg-gradient-to-r from-primary-red to-accent-amber bg-clip-text text-transparent">
                DODZ
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-foreground px-2 py-0.5 rounded bg-primary-red">
                Chicken
              </span>
            </Link>
            <p className="text-xs text-text-muted leading-relaxed">
              {locale === 'en' ? footerData.desc_en : footerData.desc_ar}
            </p>
            {/* Social Handles */}
            <div className="flex items-center gap-3 pt-2">
              {footerData.facebook && (
                <a
                  href={footerData.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-full bg-card hover:bg-primary-red border border-card-border hover:border-transparent text-foreground hover:text-white flex items-center justify-center transition-all"
                  title="Facebook"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M9 8H7v3h2v9h3v-9h3.6L16 8h-3V6.3C13 5.4 13.5 5 14.5 5H16V2h-2.5C10.5 2 9 3.5 9 6.5V8z" />
                  </svg>
                </a>
              )}
              {footerData.instagram && (
                <a
                  href={footerData.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-full bg-card hover:bg-primary-red border border-card-border hover:border-transparent text-foreground hover:text-white flex items-center justify-center transition-all"
                  title="Instagram"
                >
                  <svg className="h-4 w-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>
              )}
              {footerData.tiktok && (
                <a
                  href={footerData.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-full bg-card hover:bg-primary-red border border-card-border hover:border-transparent text-foreground hover:text-white flex items-center justify-center transition-all font-bold text-xs"
                  title="TikTok"
                >
                  🎵
                </a>
              )}
              {footerData.whatsapp && (
                <a
                  href={footerData.whatsapp.startsWith('http') ? footerData.whatsapp : `https://wa.me/${footerData.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-full bg-card hover:bg-green-600 border border-card-border hover:border-transparent text-foreground hover:text-white flex items-center justify-center transition-all"
                  title="WhatsApp Support"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
 
          {/* Contact & Hotline */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-accent-amber">
              {locale === 'en' ? 'Contact Details' : 'تفاصيل الاتصال'}
            </h3>
            <div className="space-y-3 text-xs text-foreground">
              <a href={`tel:${footerData.phone}`} className="flex items-center gap-2 hover:text-primary-red transition-colors font-black text-sm text-primary-red">
                <Phone className="h-4 w-4" />
                <span>Hotline: {footerData.phone}</span>
              </a>
              <div className="space-y-1">
                <span className="text-[10px] text-text-muted uppercase font-bold block">{locale === 'en' ? 'Phone & WhatsApp' : 'رقم الموبايل والواتساب'}</span>
                {footerData.whatsapp && (
                  <a href={footerData.whatsapp.startsWith('http') ? footerData.whatsapp : `https://wa.me/${footerData.whatsapp}`} className="hover:text-accent-amber transition-colors font-bold text-white">
                    {footerData.whatsapp.replace('https://wa.me/', '')}
                  </a>
                )}
              </div>
              <div className="p-2.5 rounded bg-card border border-card-border">
                <span className="text-[10px] uppercase font-bold text-primary-red">
                  {locale === 'en' ? 'DELIVERY GUARANTEE' : 'ضمان توصيل سريع'}
                </span>
                <p className="text-[10px] text-text-muted mt-0.5">
                  {locale === 'en' ? 'Order hot and fresh food to your door.' : 'اطلب الحين وبيوصلك سخن ومقرمش.'}
                </p>
              </div>
            </div>
          </div>
 
          {/* Operating Hours */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-accent-amber">
              {locale === 'en' ? 'Operating Hours' : 'ساعات العمل'}
            </h3>
            <div className="space-y-2 text-xs text-text-muted">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent-amber" />
                <span>{locale === 'en' ? footerData.hours_en : footerData.hours_ar}</span>
              </div>
              <div className="pt-2">
                <h4 className="text-[10px] uppercase font-bold text-white mb-1">Quick Links</h4>
                <ul className="space-y-1">
                  <li>
                    <Link href="/driver" className="text-text-muted hover:text-white transition-colors">
                      {t('driverPortal')}
                    </Link>
                  </li>
                  <li>
                    <Link href="/admin" className="text-text-muted hover:text-white transition-colors">
                      {t('adminPanel')}
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
 
          {/* Our Branches */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-accent-amber">
              {locale === 'en' ? 'Our Branches' : 'فروعنا'}
            </h3>
            <ul className="space-y-2 text-xs">
              {branchesList.map((b, idx) => (
                <li key={idx}>
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-muted hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <MapPin className="h-3.5 w-3.5 text-primary-red flex-shrink-0" />
                    <span className="truncate max-w-[200px]">
                      {locale === 'en' ? b.nameEn : b.nameAr}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
 
        </div>
 
        {/* Footer Bottom */}
        <div className="border-t border-card-border mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-text-muted">
          <p>© {new Date().getFullYear()} {t('appName')}. All rights reserved.</p>
          <p className="flex items-center gap-1">
            <span>Made with</span>
            <Heart className="h-3 w-3 text-primary-red fill-current" />
            <span>in Egypt</span>
          </p>
          <p className="flex items-center gap-1.5">
            <span className="opacity-50">⌨️</span>
            <span>
              Built by{' '}
              <a
                href="https://linktr.ee/Mark7924"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-accent-amber hover:text-white transition-colors underline underline-offset-2 decoration-dotted"
              >
                Mark
              </a>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
