'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { X, Plus, Flame, Check } from 'lucide-react';

export interface ComboItem {
  id: string;
  nameEn: string;
  nameAr: string;
  price: number;
  imageUrl?: string;
}

interface ComboOfferModalProps {
  triggerItemName: string;
  comboItems: ComboItem[];   // fries + drink items to add
  comboPrice: number;        // total combo add-on price (discounted)
  originalPrice: number;     // what fries + drink would cost separately
  onAccept: () => void;
  onDecline: () => void;
}

export default function ComboOfferModal({
  triggerItemName,
  comboItems,
  comboPrice,
  originalPrice,
  onAccept,
  onDecline,
}: ComboOfferModalProps) {
  const { locale } = useLanguage();
  const savings = originalPrice - comboPrice;
  const savingsPct = Math.round((savings / originalPrice) * 100);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onDecline}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-sm bg-[#131316] border border-card-border rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-200 z-10">

        {/* Header banner */}
        <div className="bg-gradient-to-r from-primary-red to-accent-amber p-4 text-center relative">
          <button
            onClick={onDecline}
            className="absolute top-3 right-3 p-1 rounded-full bg-black/20 hover:bg-black/40 text-white transition-all"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center justify-center gap-2 mb-1">
            <Flame className="h-5 w-5 text-white animate-bounce" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">
              {locale === 'en' ? 'Make it a Combo!' : 'اجعلها كومبو!'}
            </span>
            <Flame className="h-5 w-5 text-white animate-bounce" />
          </div>
          <p className="text-xs text-white/80">
            {locale === 'en'
              ? `You added ${triggerItemName} — complete your meal!`
              : `أضفت ${triggerItemName} — أكمل وجبتك!`}
          </p>
        </div>

        {/* Combo Items */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              {locale === 'en' ? 'Add to your order:' : 'أضف لطلبك:'}
            </span>
          </div>

          <div className="space-y-2">
            {comboItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-card-border"
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={locale === 'en' ? item.nameEn : item.nameAr}
                    className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white">
                    {locale === 'en' ? item.nameEn : item.nameAr}
                  </p>
                </div>
                <Plus className="h-4 w-4 text-text-muted flex-shrink-0" />
              </div>
            ))}
          </div>

          {/* Price Savings */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-accent-amber/10 border border-accent-amber/30">
            <div>
              <p className="text-[10px] text-text-muted line-through">
                {locale === 'en' ? `Was ${originalPrice} EGP` : `كان ${originalPrice} ج.م`}
              </p>
              <p className="text-sm font-black text-accent-amber">
                {locale === 'en' ? `Combo: ${comboPrice} EGP` : `الكومبو: ${comboPrice} ج.م`}
              </p>
            </div>
            <div className="bg-primary-red text-white text-[10px] font-black px-2 py-1 rounded-lg">
              {locale === 'en' ? `Save ${savingsPct}%` : `وفّر ${savingsPct}%`}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-5 flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 py-3 bg-card border border-card-border text-text-muted text-xs font-bold rounded-xl hover:bg-card-border transition-all cursor-pointer"
          >
            {locale === 'en' ? 'No thanks' : 'لا شكراً'}
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-3 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-primary-red/25 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="h-4 w-4" />
            {locale === 'en' ? 'Yes, add combo!' : 'نعم، أضف الكومبو!'}
          </button>
        </div>
      </div>
    </div>
  );
}
