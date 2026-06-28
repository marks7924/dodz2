'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useCartStore } from '@/store/useCartStore';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';

import CartSidebar from '@/components/cart/CartSidebar';
import ComboOfferModal from '@/components/cart/ComboOfferModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, Product, Category, Review } from '@/lib/db';
import { ShoppingBag, Star, Flame, Sparkles, Plus, Check, StarIcon, X, MessageCircle, Send, Edit2, Save, Pencil, Trash2, Megaphone, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBranch } from '@/context/BranchContext';
import { createClient } from '@/lib/supabase/client';
import BranchWelcomePopup from '@/components/layout/BranchWelcomePopup';
import { useModal } from '@/context/ModalContext';

// ── Inline editable promo banner ────────────────────────────────────────────
function BannerAnnouncement() {
  const { t, locale } = useLanguage();
  const { role } = useAuth();
  const supabase = createClient();

  const canManage = role && ['OWNER', 'HEAD_ADMIN', 'DEVELOPER'].includes(role);

  const [text, setText] = useState<string | null>(null);
  const [active, setActive] = useState(true); // default: show hardcoded fallback
  const [loaded, setLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('restaurant_settings')
        .select('key, value')
        .in('key', ['promo_banner_text', 'promo_banner_active']);
      const textRow = data?.find((r: any) => r.key === 'promo_banner_text');
      const activeRow = data?.find((r: any) => r.key === 'promo_banner_active');
      if (textRow) setText(textRow.value);
      if (activeRow) setActive(activeRow.value !== 'false');
      setLoaded(true);
    };
    fetch();
  }, []);

  const save = async (newText: string, newActive: boolean) => {
    setSaving(true);
    try {
      const { data: textData } = await supabase
        .from('restaurant_settings')
        .select('id')
        .eq('key', 'promo_banner_text')
        .is('branch_id', null);
        
      if (textData && textData.length > 0) {
        const { error } = await supabase
          .from('restaurant_settings')
          .update({ value: newText, updated_at: new Date().toISOString() })
          .eq('key', 'promo_banner_text')
          .is('branch_id', null);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('restaurant_settings')
          .insert({ key: 'promo_banner_text', value: newText, branch_id: null, updated_at: new Date().toISOString() });
        if (error) throw error;
      }

      const { data: activeData } = await supabase
        .from('restaurant_settings')
        .select('id')
        .eq('key', 'promo_banner_active')
        .is('branch_id', null);
        
      const activeStr = newActive ? 'true' : 'false';
      if (activeData && activeData.length > 0) {
        const { error } = await supabase
          .from('restaurant_settings')
          .update({ value: activeStr, updated_at: new Date().toISOString() })
          .eq('key', 'promo_banner_active')
          .is('branch_id', null);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('restaurant_settings')
          .insert({ key: 'promo_banner_active', value: activeStr, branch_id: null, updated_at: new Date().toISOString() });
        if (error) throw error;
      }

      setText(newText);
      setActive(newActive);
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving banner:', err);
    } finally {
      setSaving(false);
    }
  };

  const displayText = text || t('promoBanner');

  // Hide for regular users if deactivated
  if (loaded && !active && !canManage) return null;

  return (
    <>
      {isEditing && (
        <div className="fixed inset-0 z-[9997] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsEditing(false)} />
          <div className="relative w-full max-w-md bg-[#111113] border border-[#27272A] rounded-2xl p-6 shadow-2xl space-y-4 z-10">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-accent-amber" />
              {locale === 'en' ? 'Edit Promo Banner' : 'تعديل البانر الترويجي'}
            </h3>
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="e.g. 🎉 Get 15% OFF on your first order! Use code: FIRST15"
              rows={3}
              className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary-red/50 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 border border-[#27272A] rounded-xl text-xs font-bold text-text-muted hover:text-white cursor-pointer">
                {locale === 'en' ? 'Cancel' : 'إلغاء'}
              </button>
              <button disabled={saving} onClick={() => save(editValue, editValue.trim().length > 0)}
                className="px-4 py-1.5 bg-primary-red text-white text-xs font-bold rounded-xl hover:bg-primary-red-hover flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                {saving ? '...' : (locale === 'en' ? 'Save & Publish' : 'حفظ ونشر')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full bg-gradient-to-r from-primary-red to-accent-amber py-2.5 px-4 text-center text-xs font-bold text-white tracking-wide shadow-md flex flex-wrap items-center justify-center gap-x-2 gap-y-1 relative group">
        <Flame className="h-4 w-4 animate-bounce flex-shrink-0" />
        <span className="text-center leading-snug">{active ? displayText : <span className="opacity-50 italic">{locale === 'en' ? 'Banner hidden from public' : 'البانر مخفي عن الجمهور'}</span>}</span>
        <Sparkles className="h-4 w-4 flex-shrink-0" />

        {/* Admin controls — shown on hover */}
        {canManage && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => { setEditValue(displayText); setIsEditing(true); }}
              title={locale === 'en' ? 'Edit banner' : 'تعديل البانر'}
              className="p-1 rounded-full bg-black/30 hover:bg-black/60 text-white cursor-pointer"
            >
              <Pencil className="h-3 w-3" />
            </button>
            {active && (
              <button
                onClick={() => save(text || displayText, false)}
                title={locale === 'en' ? 'Hide banner' : 'إخفاء البانر'}
                className="p-1 rounded-full bg-black/30 hover:bg-black/60 text-white cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
            {!active && (
              <button
                onClick={() => save(text || displayText, true)}
                title={locale === 'en' ? 'Show banner' : 'إظهار البانر'}
                className="p-1 rounded-full bg-black/30 hover:bg-black/60 text-white cursor-pointer text-[10px] font-bold px-2"
              >
                Show
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function Home() {
  const { t, locale, dir } = useLanguage();
  const { confirm, alert } = useModal();
  const { addItem, cartOpen, setCartOpen } = useCartStore();
  const queryClient = useQueryClient();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('SINGLE');
  const [productSizes, setProductSizes] = useState<Record<string, string>>({});
  const [customizationProduct, setCustomizationProduct] = useState<{ product: Product, size: string } | null>(null);
  const [selectedCustomizations, setSelectedCustomizations] = useState<{ optionId: string, groupId: string, nameEn: string, nameAr: string, price: number }[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<{ id: string; nameEn: string; nameAr: string; price: number; quantity: number; isStandard: boolean }[]>([]);
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [isCombo, setIsCombo] = useState(false);
  const [comboSize, setComboSize] = useState<'S' | 'M' | 'L' | 'F'>('M');
  const [selectedComboSideId, setSelectedComboSideId] = useState<string>('');
  const [selectedComboDrinkId, setSelectedComboDrinkId] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedProduct) {
      if (selectedProduct.sizeType === 'SIZE') {
        setSelectedSize('SMALL');
      } else if (selectedProduct.priceDouble || selectedProduct.priceTriple) {
        setSelectedSize('SINGLE');
      } else {
        setSelectedSize('NONE');
      }
    }
  }, [selectedProduct]);
  const categoriesNavRef = useRef<HTMLDivElement>(null);
  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoriesNavRef.current) {
      const offset = 200;
      categoriesNavRef.current.scrollBy({
        left: direction === 'left' ? -offset : offset,
        behavior: 'smooth'
      });
    }
  };

  const { user, profile, isAuthenticated, role } = useAuth();
  const { selectedBranch, selectedBranchId, selectBranch, allBranches, isGlobalView, isClosed } = useBranch();
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [showChangeBranchDialog, setShowChangeBranchDialog] = useState(false);
  const [pendingBranchId, setPendingBranchId] = useState<string | null>(null);
  const { items: cartItems } = useCartStore();

  const supabase = createClient();

  const { data: settings = [] } = useQuery<any[]>({
    queryKey: ['restaurant-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('key, value');
      if (error) throw error;
      return data || [];
    },
  });

  const comboDiscountSetting = settings.find((s) => s.key === 'combo_discount_percentage');
  const comboDiscount = comboDiscountSetting ? Number(comboDiscountSetting.value) : 25;
  const comboFixedPriceSetting = settings.find((s) => s.key === 'combo_fixed_price');
  const comboFixedPrice = comboFixedPriceSetting && comboFixedPriceSetting.value ? Number(comboFixedPriceSetting.value) : null;
  const reviewsActiveSetting = settings.find((s) => s.key === 'reviews_active');
  const isReviewsActive = reviewsActiveSetting ? reviewsActiveSetting.value === 'true' : true;

  useEffect(() => {
    if (profile) {
      setIsAdmin(['STAFF', 'OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER'].includes(profile.role));
    }
  }, [profile]);

  // Determine if user can edit menu items (Owner or Admin only)
  const canEditMenu = role === 'OWNER' || role === 'HEAD_ADMIN' || role === 'ADMIN';

  // Combo offer state
  const [comboModal, setComboModal] = useState<{ product: Product } | null>(null);

  // Hero item inline edit state
  const [heroEditOpen, setHeroEditOpen] = useState(false);
  const [heroEditProductId, setHeroEditProductId] = useState<string>('');
  const [heroEditPriceSingle, setHeroEditPriceSingle] = useState<string>('');
  const [heroEditPriceDouble, setHeroEditPriceDouble] = useState<string>('');
  const [heroSaving, setHeroSaving] = useState(false);

  // Mobile Back Button Modal support
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const hasAnyOpen = cartOpen || !!customizationProduct || !!selectedProduct || !!comboModal;
    
    const handlePopState = () => {
      setCartOpen(false);
      setCustomizationProduct(null);
      setSelectedProduct(null);
      setComboModal(null);
    };

    if (hasAnyOpen) {
      if (!prevOpenRef.current) {
        window.history.pushState({ modalOpen: true }, '');
      }
      window.addEventListener('popstate', handlePopState);
    } else {
      if (prevOpenRef.current && window.history.state?.modalOpen) {
        window.history.back();
      }
    }

    prevOpenRef.current = hasAnyOpen;

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [cartOpen, customizationProduct, selectedProduct, comboModal, setCartOpen]);

  // Get or create chat session once user is loaded
  useEffect(() => {
    if (chatOpen && isAuthenticated && user) {
      import('@/lib/chat').then(({ getOrCreateChatSession }) => {
        getOrCreateChatSession(user.id, selectedBranchId)
          .then((sid) => setChatSessionId(sid))
          .catch((err) => console.error('Error fetching chat session:', err));
      });
    }
  }, [chatOpen, isAuthenticated, user, selectedBranchId]);

  // Query message history
  const { data: chatMessages = [] } = useQuery<any[]>({
    queryKey: ['chat-messages', chatSessionId],
    queryFn: async () => {
      if (!chatSessionId) return [];
      const { getChatMessages } = await import('@/lib/chat');
      return getChatMessages(chatSessionId);
    },
    enabled: !!chatSessionId,
  });

  // Subscribe to real-time messages
  useEffect(() => {
    if (!chatSessionId) return;

    let channel: any;
    import('@/lib/chat').then(({ subscribeToChatMessages }) => {
      channel = subscribeToChatMessages(chatSessionId, (newMsg) => {
        queryClient.setQueryData(['chat-messages', chatSessionId], (oldMsgs: any = []) => {
          if (oldMsgs.some((m: any) => m.id === newMsg.id)) return oldMsgs;
          return [...oldMsgs, newMsg];
        });
      });
    });

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [chatSessionId, queryClient]);

  const sendChatMutation = useMutation({
    mutationFn: async (data: { text: string }) => {
      if (!chatSessionId || !user) return;
      const { sendChatMessage } = await import('@/lib/chat');
      return sendChatMessage(chatSessionId, user.id, 'CUSTOMER', data.text);
    },
    onSuccess: () => {
      setChatText('');
      queryClient.invalidateQueries({ queryKey: ['chat-messages', chatSessionId] });
    },
  });

  const closeChatMutation = useMutation({
    mutationFn: async () => {
      if (!chatSessionId) return;
      const { closeChatSession } = await import('@/lib/chat');
      return closeChatSession(chatSessionId);
    },
    onSuccess: () => {
      setChatSessionId(null);
      setChatOpen(false);
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });

  useEffect(() => {
    if (chatOpen && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);


  // Queries
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => db.getCategories(),
  });

  const { data: recommendedProductIds = [], isFetched: isRecFetched } = useQuery<string[]>({
    queryKey: ['recommended-product-ids', user?.id, settings],
    queryFn: async () => {
      const ids = new Set<string>();
      const recSetting = settings.find((s: any) => s.key === 'recommended_product_ids');
      if (recSetting && recSetting.value) {
        try {
          const manualIds = JSON.parse(recSetting.value);
          if (Array.isArray(manualIds)) {
            manualIds.forEach(id => ids.add(id));
          }
        } catch {}
      }
      if (user?.id) {
        try {
          const userOrders = await db.getOrders({ userId: user.id });
          const counts: Record<string, number> = {};
          userOrders.forEach((o) => {
            if (o.items) {
              o.items.forEach((item) => {
                counts[item.productId] = (counts[item.productId] || 0) + item.quantity;
              });
            }
          });
          const sorted = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([pid]) => pid);
          sorted.forEach(id => ids.add(id));
        } catch (e) {
          console.error('Error fetching user orders for recommendations:', e);
        }
      }
      return Array.from(ids);
    },
    enabled: !!settings,
  });

  const hasInitializedDefaultCategoryRef = useRef(false);
  useEffect(() => {
    if (categories && categories.length > 0 && isRecFetched && !hasInitializedDefaultCategoryRef.current) {
      hasInitializedDefaultCategoryRef.current = true;
      const defaultCat = categories.find((c) => c.isDefault);
      if (defaultCat) {
        setActiveCategory(defaultCat.id);
      } else if (recommendedProductIds.length > 0) {
        setActiveCategory('recommended');
      } else {
        setActiveCategory(categories[0]?.id || 'all');
      }
    }
  }, [categories, isRecFetched, recommendedProductIds]);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products', selectedBranchId],
    queryFn: () => db.getProducts(undefined, selectedBranchId || undefined),
  });

  const allowedSides = products.filter((p) => {
    const cat = categories.find((c) => c.id === p.categoryId);
    if (!cat) return false;
    const catName = (cat.nameEn + ' ' + cat.nameAr).toLowerCase();
    return catName.includes('side') || catName.includes('appetizer') || catName.includes('add-on') ||
           catName.includes('add on') || catName.includes('addon') || catName.includes('extra') ||
           catName.includes('جانبي') || catName.includes('مقبلات') || catName.includes('إضافات') ||
           catName.includes('إضافة');
  });

  const allowedDrinks = products.filter((p) => {
    const cat = categories.find((c) => c.id === p.categoryId);
    if (!cat) return false;
    const catName = (cat.nameEn + ' ' + cat.nameAr).toLowerCase();
    return catName.includes('drink') || catName.includes('juice') || catName.includes('soda') ||
           catName.includes('مشروب') || catName.includes('مشروبات') || catName.includes('عصير');
  });

  const baseSide = allowedSides.length > 0 ? allowedSides.reduce((min, p) => p.priceSingle < min.priceSingle ? p : min, allowedSides[0]) : null;
  const baseDrink = allowedDrinks.length > 0 ? allowedDrinks.reduce((min, p) => p.priceSingle < min.priceSingle ? p : min, allowedDrinks[0]) : null;

  useEffect(() => {
    if (customizationProduct) {
      setIsCombo(false);
      setComboSize('M');
      if (allowedSides.length > 0) {
        const fries = allowedSides.find(s => s.nameEn.toLowerCase().includes('fries') || s.nameAr.includes('بطاطس'));
        setSelectedComboSideId(fries?.id || allowedSides[0].id);
      }
      if (allowedDrinks.length > 0) {
        const cola = allowedDrinks.find(d => d.nameEn.toLowerCase().includes('cola') || d.nameEn.toLowerCase().includes('pepsi') || d.nameAr.includes('بيبسي') || d.nameAr.includes('كولا'));
        setSelectedComboDrinkId(cola?.id || allowedDrinks[0].id);
      }
    }
  }, [customizationProduct, allowedSides, allowedDrinks]);

  const featuredProductIdSetting = settings.find((s: any) => s.key === 'featured_product_id');
  const featuredProductId = featuredProductIdSetting?.value;
  const bestseller = products.find((p) => p.id === featuredProductId) || 
                     products.find((p) => p.id === 'prod-dodz-burger' || p.nameEn.toLowerCase().includes('dodz burger')) || 
                     products[0];

  const { data: activeDiscounts = [] } = useQuery({
    queryKey: ['active-discounts', selectedBranchId],
    queryFn: async () => {
      const allDiscounts = await db.getDiscounts(selectedBranchId || undefined);
      return allDiscounts.filter(d => d.isActive);
    },
  });

  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: ['reviews', selectedProduct?.id],
    queryFn: () => (selectedProduct ? db.getReviews(selectedProduct.id) : Promise.resolve([])),
    enabled: !!selectedProduct,
  });

  // Review submission mutation
  const submitReviewMutation = useMutation({
    mutationFn: (newReview: { userId: string; userName: string; productId: string; rating: number; comment: string }) =>
      db.createReview(newReview),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', selectedProduct?.id] });
      setReviewComment('');
      setReviewName('');
      setReviewRating(5);
    },
  });

  const COMBO_CATEGORIES = ['burgers', 'burger', 'chicken', 'دجاج', 'برجر'];

  const handleAddProductToCart = (
    product: Product,
    size: string,
    customizations: { optionId: string; nameEn: string; nameAr: string; price: number }[] = [],
    extras: { id: string; nameEn: string; nameAr: string; price: number; quantity: number; isStandard: boolean }[] = []
  ) => {
    let basePrice = product.priceSingle;
    if (size === 'DOUBLE' && product.priceDouble) basePrice = product.priceDouble;
    else if (size === 'TRIPLE' && product.priceTriple) basePrice = product.priceTriple;
    else if (size === 'MEDIUM' && product.priceDouble) basePrice = product.priceDouble;
    else if (size === 'LARGE' && product.priceTriple) basePrice = product.priceTriple;
    else if (size === 'FAMILY' && product.priceFamily) basePrice = product.priceFamily;

    let discount = activeDiscounts.find(d => d.appliesTo === product.id);
    if (!discount) discount = activeDiscounts.find(d => d.appliesTo === `CAT:${product.categoryId}`);
    if (!discount) discount = activeDiscounts.find(d => d.appliesTo === 'ALL');

    let finalPrice = basePrice;
    if (discount) {
      if (discount.discountType === 'FIXED') finalPrice = Math.max(0, basePrice - discount.discountValue);
      if (discount.discountType === 'PERCENT') finalPrice = Math.max(0, basePrice * (1 - discount.discountValue / 100));
      finalPrice = Math.round(finalPrice);
    }

    const customizationSum = customizations.reduce((sum, c) => sum + c.price, 0);
    finalPrice += customizationSum;

    const extrasSum = extras.reduce((sum, e) => sum + (e.isStandard ? 0 : e.price * e.quantity), 0);
    finalPrice += extrasSum;

    addItem({
      productId: product.id,
      nameEn: product.nameEn,
      nameAr: product.nameAr,
      price: finalPrice,
      size: size as any,
      imageUrl: product.imageUrl,
      customizations,
      extras,
      categoryId: product.categoryId,
    });

    setJustAddedId(`${product.id}-${size}`);
    setTimeout(() => {
      setJustAddedId(null);
    }, 1500);
  };

  const handleAddToCartClicked = (product: Product, size: string) => {
    if (isClosed) {
      alert(
        locale === 'en'
          ? 'The store is currently closed. You can start ordering again during working hours.'
          : 'المطعم مغلق حالياً. يمكنك بدء الطلب مرة أخرى خلال ساعات العمل.',
        locale === 'en' ? 'Store Closed' : 'المطعم مغلق'
      );
      return;
    }

    const mainCat = categories.find(c => c.id === product.categoryId);
    const mainCatName = (mainCat?.nameEn || '').toLowerCase();
    const isComboAvailable = mainCatName.includes('burger') || mainCatName.includes('chicken') || mainCatName.includes('meal') || mainCatName.includes('sandwich');

    const hasGroups = product.customizationGroups && product.customizationGroups.length > 0;
    const hasExtras = product.extrasConfig && product.extrasConfig.length > 0;

    if (hasGroups || hasExtras || isComboAvailable) {
      setCustomizationProduct({ product, size });
      setSelectedCustomizations([]);
      const initialExtras = (product.extrasConfig || []).map((item: any) => ({
        id: item.id,
        nameEn: item.nameEn,
        nameAr: item.nameAr,
        price: item.price || 0,
        quantity: item.isStandard ? 1 : 0,
        isStandard: !!item.isStandard,
        maxLimit: item.maxLimit || 3
      }));
      setSelectedExtras(initialExtras);
    } else {
      handleAddProductToCart(product, size);
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !reviewComment.trim()) return;

    if (!isAuthenticated || !user) {
      alert(locale === 'en' ? 'Please log in first!' : 'يرجى تسجيل الدخول أولاً!');
      return;
    }

    submitReviewMutation.mutate({
      userId: user.id,
      userName: reviewName.trim() || profile?.full_name || user.email?.split('@')[0] || 'Anonymous',
      productId: selectedProduct.id,
      rating: reviewRating,
      comment: reviewComment.trim(),
    });
  };

  const activeProducts = activeCategory === 'all'
    ? products
    : activeCategory === 'recommended'
      ? products.filter((p) => recommendedProductIds.includes(p.id))
      : products.filter((p) => p.categoryId === activeCategory || p.categoryIds?.includes(activeCategory));

  return (
    <>
      <Header />
      <CartSidebar />

      <main className="flex-1 pb-16">
        {/* Banner Announcement — editable by OWNER / HEAD_ADMIN */}
        <BannerAnnouncement />

        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-16 md:py-24 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-red/10 via-[#0A0A0B] to-[#0A0A0B]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Hero Left / Text Content */}
            <div className="space-y-6 text-center lg:text-left rtl:lg:text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-red/10 border border-primary-red/20 text-xs font-bold text-primary-red uppercase tracking-wider">
                <Flame className="h-3 w.5-3 fill-current" />
                {locale === 'en' ? 'Voted #1 Burger in Egypt' : 'تم اختيارنا كأفضل برجر في مصر'}
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                {t('heroTitle')}
              </h1>
              <p className="text-base sm:text-lg text-text-muted leading-relaxed max-w-xl mx-auto lg:mx-0">
                {t('heroSubtitle')}
              </p>
              <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => {
                    const menuSec = document.getElementById('menu-section');
                    if (menuSec) menuSec.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-8 py-3.5 bg-primary-red hover:bg-primary-red-hover text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-red/35 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="h-5 w-5" />
                  <span>{t('orderNow')}</span>
                </button>
                <button
                  onClick={() => {
                    const menuSec = document.getElementById('menu-section');
                    if (menuSec) menuSec.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-8 py-3.5 bg-card hover:bg-card-border border border-card-border text-foreground text-sm font-bold rounded-xl transition-all flex items-center justify-center cursor-pointer"
                >
                  <span>{t('viewMenu')}</span>
                </button>
              </div>
            </div>

            {/* Hero Right / Hero Image */}
            <div className="relative flex justify-center items-center">
              <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-gradient-to-tr from-primary-red/20 to-accent-amber/20 blur-3xl -z-10" />
              <div className="relative w-80 h-80 sm:w-[450px] sm:h-[450px] overflow-hidden rounded-3xl border border-card-border/50 shadow-2xl rotate-2 hover:rotate-0 transition-all duration-500 flex flex-col justify-end group">
                <img
                  src={bestseller?.imageUrl || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80"}
                  alt="Dodz Charcoal Grilled Burger"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                  onClick={() => {
                    if (bestseller) setSelectedProduct(bestseller);
                  }}
                />
                <div className="relative bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 space-y-3 z-10 w-full">
                  <div className="flex justify-between items-center bg-black/55 backdrop-blur-md p-4 rounded-2xl border border-white/5 hover:border-primary-red/35 transition-colors">
                    <div
                      className="cursor-pointer flex-1"
                      onClick={() => {
                        if (bestseller) setSelectedProduct(bestseller);
                      }}
                    >
                      {!bestseller ? (
                        <>
                          <h4 className="text-sm font-bold text-white">Dodz Burger (دودز برجر)</h4>
                          <p className="text-[11px] text-accent-amber mt-0.5">Single: 120 EGP | Double: 170 EGP</p>
                        </>
                      ) : (
                        <>
                          <h4 className="text-sm font-bold text-white">
                            {locale === 'en' ? bestseller.nameEn : bestseller.nameAr}
                          </h4>
                          <p className="text-[11px] text-accent-amber mt-0.5 font-mono">
                            {locale === 'en' ? 'Single' : 'مفرد'}: {bestseller.priceSingle} EGP
                            {bestseller.priceDouble ? ` | ${locale === 'en' ? 'Double' : 'دبل'}: ${bestseller.priceDouble} EGP` : ''}
                          </p>
                        </>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (bestseller) {
                          handleAddToCartClicked(bestseller, bestseller.priceDouble ? 'SINGLE' : 'NONE');
                          setCartOpen(true);
                        }
                      }}
                      className="px-2.5 py-1 rounded bg-accent-amber hover:bg-yellow-400 text-black text-[10px] font-extrabold uppercase cursor-pointer transition-all animate-pulse hover:animate-none ml-3 flex-shrink-0"
                    >
                      Buy Now
                    </button>
                  </div>

                  {isAdmin && canEditMenu && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (bestseller) {
                          setHeroEditProductId(bestseller.id);
                          setHeroEditPriceSingle(String(bestseller.priceSingle));
                          setHeroEditPriceDouble(String(bestseller.priceDouble ?? ''));
                          setHeroEditOpen(true);
                        }
                      }}
                      className="w-full py-2 bg-accent-amber hover:bg-yellow-400 text-black text-[10px] font-extrabold uppercase rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      {locale === 'en' ? 'Edit Featured Item' : 'تعديل العنصر المميز'}
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Features / Marketing Pitch */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-y border-card-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex gap-4 p-5 rounded-2xl bg-card border border-card-border">
              <div className="h-10 w-10 rounded-xl bg-primary-red/10 text-primary-red flex items-center justify-center flex-shrink-0">
                <Flame className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{t('featIngredientsTitle')}</h3>
                <p className="text-xs text-text-muted mt-1">{t('featIngredientsDesc')}</p>
              </div>
            </div>
            <div className="flex gap-4 p-5 rounded-2xl bg-card border border-card-border">
              <div className="h-10 w-10 rounded-xl bg-accent-amber/10 text-accent-amber flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{t('featFastTitle')}</h3>
                <p className="text-xs text-text-muted mt-1">{t('featFastDesc')}</p>
              </div>
            </div>
            <div className="flex gap-4 p-5 rounded-2xl bg-card border border-card-border">
              <div className="h-10 w-10 rounded-xl bg-primary-red/10 text-primary-red flex items-center justify-center flex-shrink-0">
                <Star className="h-6 w-6 fill-current" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{t('featQualityTitle')}</h3>
                <p className="text-xs text-text-muted mt-1">{t('featQualityDesc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Category sticky bar & Menu items Section */}
        <section id="menu-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-8 bg-gradient-to-r from-white to-text-muted bg-clip-text text-transparent">
            {locale === 'en' ? 'Browse Our Menu' : 'تصفح قائمة الطعام'}
          </h2>

          {/* Categories Navigation Bar with Scroll Arrows */}
          <div className="relative w-full mb-8">
            {/* Left scroll arrow button */}
            <button
              onClick={() => scrollCategories('left')}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-40 p-2 rounded-full bg-[#111113]/90 border border-card-border text-white hover:text-primary-red hover:bg-black hover:scale-105 transition-all shadow-lg focus:outline-none cursor-pointer flex items-center justify-center"
              title={locale === 'en' ? 'Scroll Left' : 'التمرير لليسار'}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Categories scroll area */}
            <div
              ref={categoriesNavRef}
              className="sticky top-[64px] md:top-[80px] z-30 w-full glass-panel border border-card-border p-2 rounded-2xl flex gap-2 overflow-x-auto no-scrollbar scroll-smooth px-12"
            >
              {/* Recommended category button */}
              {recommendedProductIds.length > 0 && (
                <button
                  onClick={() => setActiveCategory('recommended')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeCategory === 'recommended'
                      ? 'bg-primary-red text-white shadow-md'
                      : 'text-foreground hover:bg-card-border'
                  }`}
                >
                  {locale === 'en' ? `★ Recommended (${recommendedProductIds.length})` : `★ المقترحات (${recommendedProductIds.length})`}
                </button>
              )}

              {/* All category button */}
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === 'all'
                    ? 'bg-primary-red text-white shadow-md'
                    : 'text-foreground hover:bg-card-border'
                }`}
              >
                {locale === 'en' ? `All (${products.length})` : `الكل (${products.length})`}
              </button>
              {categories.map((cat) => {
                const count = products.filter(p => p.categoryId === cat.id || p.categoryIds?.includes(cat.id)).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      activeCategory === cat.id
                        ? 'bg-primary-red text-white shadow-md'
                        : 'text-foreground hover:bg-card-border'
                    }`}
                  >
                    {locale === 'en' ? cat.nameEn : cat.nameAr} ({count})
                  </button>
                );
              })}
            </div>

            {/* Right scroll arrow button */}
            <button
              onClick={() => scrollCategories('right')}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-40 p-2 rounded-full bg-[#111113]/90 border border-card-border text-white hover:text-primary-red hover:bg-black hover:scale-105 transition-all shadow-lg focus:outline-none cursor-pointer flex items-center justify-center"
              title={locale === 'en' ? 'Scroll Right' : 'التمرير لليمين'}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Grid Layout of Menu Items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeProducts.map((product) => {
              const availableSizes: { code: string; labelEn: string; labelAr: string; price: number }[] = [];
              if (product.sizeType === 'SIZE') {
                if (product.priceSingle) availableSizes.push({ code: 'SMALL', labelEn: 'Small', labelAr: 'صغير', price: product.priceSingle });
                if (product.priceDouble) availableSizes.push({ code: 'MEDIUM', labelEn: 'Medium', labelAr: 'وسط', price: product.priceDouble });
                if (product.priceTriple) availableSizes.push({ code: 'LARGE', labelEn: 'Large', labelAr: 'كبير', price: product.priceTriple });
                if (product.priceFamily) availableSizes.push({ code: 'FAMILY', labelEn: 'Family Size', labelAr: 'عائلي', price: product.priceFamily });
              } else {
                if (product.priceSingle) availableSizes.push({ code: 'SINGLE', labelEn: 'Single', labelAr: 'سنجل', price: product.priceSingle });
                if (product.priceDouble) availableSizes.push({ code: 'DOUBLE', labelEn: 'Double', labelAr: 'دبل', price: product.priceDouble });
                if (product.priceTriple) availableSizes.push({ code: 'TRIPLE', labelEn: 'Triple', labelAr: 'تربل', price: product.priceTriple });
              }

              const selectedProductSizeCode = productSizes[product.id] || availableSizes[0]?.code || 'NONE';
              const currentSizeObj = availableSizes.find(s => s.code === selectedProductSizeCode) || availableSizes[0];
              const basePrice = currentSizeObj ? currentSizeObj.price : product.priceSingle;

              // Apply discounts
              let discount = activeDiscounts.find(d => d.appliesTo === product.id);
              if (!discount) discount = activeDiscounts.find(d => d.appliesTo === `CAT:${product.categoryId}`);
              if (!discount) discount = activeDiscounts.find(d => d.appliesTo === 'ALL');

              const getDiscountedPrice = (price: number) => {
                if (!discount) return price;
                let discounted = price;
                if (discount.discountType === 'FIXED') discounted = Math.max(0, price - discount.discountValue);
                if (discount.discountType === 'PERCENT') discounted = Math.max(0, price * (1 - discount.discountValue / 100));
                return Math.round(discounted);
              };

              const displayPrice = getDiscountedPrice(basePrice);
              const displayOriginalPrice = basePrice;
              const hasDiscount = !!discount;

              return (
                <div
                  key={product.id}
                  className={`glass-card rounded-2xl overflow-hidden flex flex-col justify-between relative ${
                    !product.isAvailable ? 'opacity-60' : ''
                  }`}
                >
                  {/* Out of Stock visual label overlay */}
                  {!product.isAvailable && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] z-10 flex items-center justify-center p-4">
                      <span className="px-4 py-2 rounded-xl bg-black border border-primary-red text-primary-red text-xs font-bold uppercase tracking-wider pulse-glow-red">
                        {t('outOfStock')}
                      </span>
                    </div>
                  )}

                  <div>
                    {/* Item Image */}
                    <div
                      className="relative h-48 w-full bg-card-border overflow-hidden cursor-pointer"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <img
                        src={product.imageUrl}
                        alt={locale === 'en' ? product.nameEn : product.nameAr}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                      {hasDiscount && (
                        <span className="absolute top-3 left-3 bg-primary-red text-white font-extrabold text-[9px] px-2 py-0.5 rounded uppercase shadow-lg shadow-primary-red/20">
                          {discount?.discountType === 'PERCENT' ? `${discount.discountValue}% OFF` : `-${discount?.discountValue} EGP`}
                        </span>
                      )}
                      {product.id.includes('fire') && (
                        <span className="absolute top-3 right-3 bg-red-600/90 text-white font-extrabold text-[9px] px-2 py-0.5 rounded uppercase flex items-center gap-0.5 border border-red-500/25">
                          <Flame className="h-3 w-3 fill-current animate-pulse" /> SPICY
                        </span>
                      )}
                    </div>

                    {/* Item Text Details */}
                    <div className="p-5 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <h3
                          className="text-base font-bold text-white hover:text-primary-red transition-colors cursor-pointer"
                          onClick={() => setSelectedProduct(product)}
                        >
                          {locale === 'en' ? product.nameEn : product.nameAr}
                        </h3>
                      </div>
                      <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
                        {locale === 'en' ? product.descEn : product.descAr}
                      </p>
                    </div>
                  </div>

                  {/* Add action area */}
                  <div className="p-5 pt-0 border-t border-card-border/30 mt-auto">
                    {availableSizes.length > 1 ? (
                      <div className="space-y-4 pt-4">
                        {/* Selector tabs for sizes */}
                        <div className="flex flex-wrap gap-1.5">
                          {availableSizes.map((sz) => {
                            const isSelected = selectedProductSizeCode === sz.code;
                            return (
                              <button
                                key={sz.code}
                                type="button"
                                onClick={() => setProductSizes(prev => ({ ...prev, [product.id]: sz.code }))}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                                  isSelected 
                                    ? 'bg-primary-red/10 border-primary-red/45 text-primary-red font-extrabold' 
                                    : 'bg-card border-card-border hover:bg-card-border/50 text-text-muted hover:text-white'
                                }`}
                              >
                                {locale === 'en' ? sz.labelEn : sz.labelAr}
                              </button>
                            );
                          })}
                        </div>
                        
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-right">
                            {hasDiscount && <div className="text-[10px] line-through opacity-50">{displayOriginalPrice} {t('egp')}</div>}
                            <span className="font-black text-sm text-accent-amber">
                              {displayPrice} {t('egp')}
                            </span>
                          </div>
                          
                          <button
                            disabled={!product.isAvailable}
                            onClick={() => handleAddToCartClicked(product, selectedProductSizeCode)}
                            className="px-4 py-2 bg-primary-red hover:bg-primary-red-hover text-xs font-bold rounded-xl text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {justAddedId === `${product.id}-${selectedProductSizeCode}` ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-white" />
                                <span>{t('added')}</span>
                              </>
                            ) : (
                              <>
                                <Plus className="h-3.5 w-3.5" />
                                <span>{t('addToCart')}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-4 pt-4">
                        <div className="text-right">
                          {hasDiscount && <div className="text-[10px] line-through opacity-50">{displayOriginalPrice} {t('egp')}</div>}
                          <span className={`font-black text-sm ${hasDiscount ? 'text-primary-red' : 'text-accent-amber'}`}>
                            {displayPrice} {t('egp')}
                          </span>
                        </div>
                        <button
                          disabled={!product.isAvailable}
                          onClick={() => handleAddToCartClicked(product, 'NONE')}
                          className="px-4 py-2 bg-primary-red hover:bg-primary-red-hover text-xs font-bold rounded-xl text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {justAddedId === `${product.id}-NONE` ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-white" />
                              <span>{t('added')}</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" />
                              <span>{t('addToCart')}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Product Details & Reviews Modal Dialog */}
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
            <div className="relative w-full max-w-2xl bg-card border border-card-border rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 z-10 flex flex-col md:flex-row max-h-[85vh]">
              {/* Close button */}
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 hover:bg-black/90 transition-colors text-white"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Left Column - Image */}
              <div className="md:w-1/2 relative h-48 md:h-auto min-h-[220px] bg-card-border">
                <img
                  src={selectedProduct.imageUrl}
                  alt={locale === 'en' ? selectedProduct.nameEn : selectedProduct.nameAr}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Right Column - Info, Pricing & Reviews */}
              <div className="md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-accent-amber">Product Details</span>
                    <h2 className="text-xl font-bold text-white mt-0.5">
                      {locale === 'en' ? selectedProduct.nameEn : selectedProduct.nameAr}
                    </h2>
                  </div>

                  <p className="text-xs text-text-muted leading-relaxed">
                    {locale === 'en' ? selectedProduct.descEn : selectedProduct.descAr}
                  </p>

                  {/* Rating summary */}
                  {isReviewsActive && (
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="h-4 w-4 fill-accent-amber text-accent-amber" />
                      ))}
                      <span className="text-xs text-foreground font-bold ml-1">5.0</span>
                      <span className="text-xs text-text-muted">({reviews.length} {t('reviews')})</span>
                    </div>
                  )}

                  {isReviewsActive && (
                    <div className="border-t border-card-border/50 pt-4 space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">{t('reviews')}</h3>
                      
                      {/* Reviews List */}
                      <div className="max-h-[140px] overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                        {reviews.length === 0 ? (
                          <p className="text-[11px] text-text-muted italic">{t('noReviews')}</p>
                        ) : (
                          reviews.map((rev) => (
                            <div key={rev.id} className="p-2.5 rounded-lg bg-card-border/40 text-[11px] border border-card-border/30">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-foreground">{rev.userName}</span>
                                <div className="flex gap-0.5">
                                  {Array.from({ length: rev.rating }).map((_, i) => (
                                    <Star key={i} className="h-3 w-3 fill-accent-amber text-accent-amber" />
                                  ))}
                                </div>
                              </div>
                              <p className="text-text-muted">{rev.comment}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Write Review Form */}
                      <form onSubmit={handleReviewSubmit} className="space-y-2 border-t border-card-border/30 pt-3">
                        <h4 className="text-[11px] font-bold text-white">{t('writeReview')}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={reviewName}
                            onChange={(e) => setReviewName(e.target.value)}
                            placeholder={t('namePlaceholder')}
                            required
                            className="bg-card-border text-[11px] px-2.5 py-1.5 rounded-lg border border-card-border focus:outline-none focus:border-primary-red/50 text-white"
                          />
                          <select
                            value={reviewRating}
                            onChange={(e) => setReviewRating(Number(e.target.value))}
                            className="bg-card-border text-[11px] px-2 py-1.5 rounded-lg border border-card-border focus:outline-none focus:border-primary-red/50 text-white"
                          >
                            <option value={5}>5 Stars</option>
                            <option value={4}>4 Stars</option>
                            <option value={3}>3 Stars</option>
                            <option value={2}>2 Stars</option>
                            <option value={1}>1 Star</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder={t('comment')}
                            required
                            className="flex-1 bg-card-border text-[11px] px-2.5 py-1.5 rounded-lg border border-card-border focus:outline-none focus:border-primary-red/50 text-white"
                          />
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-primary-red hover:bg-primary-red-hover text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            {locale === 'en' ? 'Send' : 'إرسال'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>

                {/* Size choice and add button */}
                {(() => {
                  const availableSizes: { code: string; labelEn: string; labelAr: string; price: number }[] = [];
                  if (selectedProduct.sizeType === 'SIZE') {
                    if (selectedProduct.priceSingle) availableSizes.push({ code: 'SMALL', labelEn: 'Small', labelAr: 'صغير', price: selectedProduct.priceSingle });
                    if (selectedProduct.priceDouble) availableSizes.push({ code: 'MEDIUM', labelEn: 'Medium', labelAr: 'وسط', price: selectedProduct.priceDouble });
                    if (selectedProduct.priceTriple) availableSizes.push({ code: 'LARGE', labelEn: 'Large', labelAr: 'كبير', price: selectedProduct.priceTriple });
                    if (selectedProduct.priceFamily) availableSizes.push({ code: 'FAMILY', labelEn: 'Family Size', labelAr: 'عائلي', price: selectedProduct.priceFamily });
                  } else {
                    if (selectedProduct.priceSingle) availableSizes.push({ code: 'SINGLE', labelEn: 'Single', labelAr: 'سنجل', price: selectedProduct.priceSingle });
                    if (selectedProduct.priceDouble) availableSizes.push({ code: 'DOUBLE', labelEn: 'Double', labelAr: 'دبل', price: selectedProduct.priceDouble });
                    if (selectedProduct.priceTriple) availableSizes.push({ code: 'TRIPLE', labelEn: 'Triple', labelAr: 'تربل', price: selectedProduct.priceTriple });
                  }

                  return (
                    <div className="border-t border-card-border/50 pt-4 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
                      {availableSizes.length > 1 ? (
                        <div className="flex flex-wrap gap-1.5 bg-card-border/30 p-1 rounded-xl border border-card-border/20">
                          {availableSizes.map((sz) => {
                            const isSelected = selectedSize === sz.code;
                            return (
                              <button
                                key={sz.code}
                                type="button"
                                onClick={() => setSelectedSize(sz.code)}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                  isSelected ? 'bg-primary-red text-white' : 'text-text-muted hover:text-white'
                                }`}
                              >
                                {locale === 'en' ? sz.labelEn : sz.labelAr} ({sz.price} EGP)
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-lg font-extrabold text-accent-amber font-mono">
                          {selectedProduct.priceSingle} {t('egp')}
                        </span>
                      )}

                      <button
                        disabled={!selectedProduct.isAvailable}
                        onClick={() => {
                          handleAddToCartClicked(
                            selectedProduct,
                            availableSizes.length > 1 ? selectedSize : 'NONE'
                          );
                          setSelectedProduct(null);
                        }}
                        className="px-5 py-2.5 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 flex-shrink-0"
                      >
                        {t('addToCart')}
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* FLOATING SUPPORT CHAT WIDGET */}
      <div className="fixed bottom-6 right-6 rtl:left-6 rtl:right-auto z-40 font-sans">
        {!chatOpen ? (
          <button
            onClick={() => setChatOpen(true)}
            className="h-14 w-14 rounded-full bg-primary-red hover:bg-primary-red-hover text-white flex items-center justify-center shadow-2xl pulse-glow-red transition-all cursor-pointer border border-white/10"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
        ) : (
          <div className="w-80 h-96 rounded-2xl bg-card border border-card-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250">
            {/* Header */}
            <div className="bg-[#121214] p-3 border-b border-card-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold text-white">Dodz Live Support</span>
              </div>
              <div className="flex items-center gap-1">
                {isAuthenticated && chatSessionId && (
                  <button
                    onClick={async () => {
                      if (await confirm(locale === 'en' ? 'Are you sure you want to end this chat?' : 'هل أنت متأكد من إنهاء المحادثة؟')) {
                        closeChatMutation.mutate();
                      }
                    }}
                    className="p-1 rounded bg-card-border/50 hover:bg-primary-red hover:text-white text-[9px] text-text-muted transition-colors"
                  >
                    {locale === 'en' ? 'End' : 'إنهاء'}
                  </button>
                )}
                <button
                  onClick={() => setChatOpen(false)}
                  className="p-1 rounded hover:bg-card-border text-text-muted hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            {!isAuthenticated ? (
              <div className="flex-grow p-4 flex flex-col items-center justify-center text-center space-y-4 text-white">
                <p className="text-xs text-text-muted">
                  {locale === 'en' ? 'Please login to chat with our support team.' : 'يرجى تسجيل الدخول للتحدث مع فريق الدعم.'}
                </p>
                <Link
                  href="/auth/login"
                  onClick={() => setChatOpen(false)}
                  className="px-4 py-2 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all block text-center"
                >
                  {t('login')}
                </Link>
              </div>
            ) : (
              <>
                <div className="flex-grow p-3 overflow-y-auto space-y-2 text-[11px] text-white">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-text-muted italic">
                      Ask us anything! Our team is online.
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isMe = msg.sender_role === 'CUSTOMER';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <span className="text-[9px] text-text-muted mb-0.5">
                            {isMe ? (locale === 'en' ? 'Me' : 'أنا') : (locale === 'en' ? 'Support' : 'الدعم')}
                          </span>
                          <div
                            className={`px-3 py-2 rounded-2xl max-w-[85%] ${
                              isMe
                                ? 'bg-primary-red text-white rounded-tr-none'
                                : 'bg-card-border text-foreground rounded-tl-none'
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!chatText.trim()) return;
                    sendChatMutation.mutate({ text: chatText.trim() });
                  }}
                  className="p-2 border-t border-card-border bg-[#0C0C0E] flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    className="flex-grow bg-card-border text-[11px] px-3 py-2 rounded-xl text-white focus:outline-none placeholder:text-text-muted"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-primary-red hover:bg-primary-red-hover text-white rounded-xl transition-all flex items-center justify-center cursor-pointer"
                  >
                    <Send className="h-4.5 w-4.5" />
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>


      {/* Hero Inline Edit Modal */}
      {heroEditOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setHeroEditOpen(false)} />
          <div className="relative w-full max-w-sm bg-[#131316] border border-card-border rounded-3xl p-6 shadow-2xl z-10 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white">{locale === 'en' ? 'Edit Featured Item' : 'تعديل العنصر المميز'}</h3>
              <button onClick={() => setHeroEditOpen(false)} className="p-1.5 rounded-lg hover:bg-card-border text-text-muted hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">{locale === 'en' ? 'Select Product' : 'اختر المنتج'}</label>
              <select
                value={heroEditProductId}
                onChange={(e) => {
                  setHeroEditProductId(e.target.value);
                  const p = products.find(p => p.id === e.target.value);
                  if (p) { setHeroEditPriceSingle(String(p.priceSingle)); setHeroEditPriceDouble(String(p.priceDouble ?? '')); }
                }}
                className="w-full bg-card border border-card-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary-red/50"
              >
                {products.map(p => <option key={p.id} value={p.id} className="bg-[#131316]">{locale === 'en' ? p.nameEn : p.nameAr}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">{locale === 'en' ? 'Single Price (EGP)' : 'سعر المفرد'}</label>
                <input type="number" value={heroEditPriceSingle} onChange={(e) => setHeroEditPriceSingle(e.target.value)}
                  className="w-full bg-card border border-card-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary-red/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">{locale === 'en' ? 'Double Price (EGP)' : 'سعر الدبل'}</label>
                <input type="number" value={heroEditPriceDouble} onChange={(e) => setHeroEditPriceDouble(e.target.value)}
                  className="w-full bg-card border border-card-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary-red/50" />
              </div>
            </div>

            <button
              disabled={heroSaving}
              onClick={async () => {
                if (!heroEditProductId) return;
                setHeroSaving(true);
                try {
                  await db.updateProduct(heroEditProductId, {
                    priceSingle: Number(heroEditPriceSingle),
                    priceDouble: heroEditPriceDouble ? Number(heroEditPriceDouble) : undefined,
                  });
                  if (selectedBranchId) {
                    await db.updateProductBranchOverride(heroEditProductId, selectedBranchId, {
                      priceSingle: Number(heroEditPriceSingle),
                      priceDouble: heroEditPriceDouble ? Number(heroEditPriceDouble) : null,
                    });
                  }
                  
                  // Persist featured product selection in settings
                  const { data: existingSetting, error: selectErr } = await supabase
                    .from('restaurant_settings')
                    .select('id')
                    .eq('key', 'featured_product_id')
                    .is('branch_id', null);

                  if (selectErr) throw selectErr;

                  if (existingSetting && existingSetting.length > 0) {
                    const { error: updateErr } = await supabase
                      .from('restaurant_settings')
                      .update({
                        value: heroEditProductId,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', existingSetting[0].id);
                    if (updateErr) throw updateErr;
                  } else {
                    const { error: insertErr } = await supabase
                      .from('restaurant_settings')
                      .insert({
                        key: 'featured_product_id',
                        value: heroEditProductId,
                        branch_id: null,
                        updated_at: new Date().toISOString()
                      });
                    if (insertErr) throw insertErr;
                  }

                  queryClient.invalidateQueries({ queryKey: ['products'] });
                  queryClient.invalidateQueries({ queryKey: ['restaurant-settings'] });
                  setHeroEditOpen(false);
                } catch (err) {
                   await alert('Save failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
                } finally {
                  setHeroSaving(false);
                }
              }}
              className="w-full py-3 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {heroSaving ? (locale === 'en' ? 'Saving...' : 'جاري الحفظ...') : (locale === 'en' ? 'Save Changes' : 'حفظ التغييرات')}
            </button>
          </div>
        </div>
      )}
      {customizationProduct && (() => {
        const { product, size } = customizationProduct;
        let basePrice = product.priceSingle;
        if (size === 'DOUBLE' && product.priceDouble) basePrice = product.priceDouble;
        else if (size === 'TRIPLE' && product.priceTriple) basePrice = product.priceTriple;
        else if (size === 'MEDIUM' && product.priceDouble) basePrice = product.priceDouble;
        else if (size === 'LARGE' && product.priceTriple) basePrice = product.priceTriple;
        else if (size === 'FAMILY' && product.priceFamily) basePrice = product.priceFamily;

        // Apply active discount to basePrice
        let discount = activeDiscounts.find(d => d.appliesTo === product.id);
        if (!discount) discount = activeDiscounts.find(d => d.appliesTo === `CAT:${product.categoryId}`);
        if (!discount) discount = activeDiscounts.find(d => d.appliesTo === 'ALL');

        let discountedBasePrice = basePrice;
        if (discount) {
          if (discount.discountType === 'FIXED') discountedBasePrice = Math.max(0, basePrice - discount.discountValue);
          if (discount.discountType === 'PERCENT') discountedBasePrice = Math.max(0, basePrice * (1 - discount.discountValue / 100));
          discountedBasePrice = Math.round(discountedBasePrice);
        }

        const customizationSum = selectedCustomizations.reduce((sum, c) => sum + c.price, 0);
        const extrasSum = selectedExtras.reduce((sum, e) => sum + (e.isStandard ? 0 : e.price * e.quantity), 0);

        const mainCat = categories.find(c => c.id === product.categoryId);
        const mainCatName = (mainCat?.nameEn || '').toLowerCase();
        const isComboAvailable = mainCatName.includes('burger') || mainCatName.includes('chicken') || mainCatName.includes('meal') || mainCatName.includes('sandwich');

        const getSettingVal = (key: string, def: string) => {
          return settings.find((s) => s.key === key)?.value || def;
        };
        const comboPrices = {
          S: Number(getSettingVal('combo_price_s', '30')),
          M: Number(getSettingVal('combo_price_m', '40')),
          L: Number(getSettingVal('combo_price_l', '50')),
          F: Number(getSettingVal('combo_price_f', '80')),
        };

        const sizeBaseComboPrice = isCombo ? comboPrices[comboSize] : 0;
        const selectedSide = allowedSides.find(s => s.id === selectedComboSideId);
        const selectedDrink = allowedDrinks.find(d => d.id === selectedComboDrinkId);
        const sidePriceDiff = (isCombo && selectedSide && baseSide) ? Math.max(0, selectedSide.priceSingle - baseSide.priceSingle) : 0;
        const drinkPriceDiff = (isCombo && selectedDrink && baseDrink) ? Math.max(0, selectedDrink.priceSingle - baseDrink.priceSingle) : 0;
        
        const comboAddon = isCombo ? (sizeBaseComboPrice + sidePriceDiff + drinkPriceDiff) : 0;
        const originalFinalPrice = basePrice + customizationSum + extrasSum + comboAddon;
        const discountedFinalPrice = discountedBasePrice + customizationSum + extrasSum + comboAddon;
        const hasDiscount = !!discount;

        return (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setCustomizationProduct(null)} />
            <div className="relative w-full max-w-lg bg-[#131316] border border-card-border rounded-3xl p-6 shadow-2xl z-10 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-card-border/50">
                <div>
                  <span className="text-[10px] font-bold text-accent-amber uppercase tracking-wider block">
                    {locale === 'en' ? 'Customize Item' : 'تخصيص الطلب'}
                  </span>
                  <h3 className="text-sm font-black text-white mt-0.5">
                    {locale === 'en' ? product.nameEn : product.nameAr}
                  </h3>
                </div>
                <button onClick={() => setCustomizationProduct(null)} className="p-1.5 rounded-lg hover:bg-card-border text-text-muted hover:text-white cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable Customization Groups list */}
              <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1 scrollbar-thin">
                {product.customizationGroups?.map((group) => {
                  const isSingleSelect = group.maxSelected === 1 && group.minSelected === 1;

                  return (
                    <div key={group.id} className="space-y-3">
                      <div className="flex justify-between items-center bg-card-border/30 px-3 py-2 rounded-xl border border-card-border/20">
                        <h4 className="text-xs font-extrabold text-white">
                          {locale === 'en' ? group.nameEn : group.nameAr}
                        </h4>
                        <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary-red/10 border border-primary-red/20 text-primary-red">
                          {isSingleSelect
                            ? (locale === 'en' ? 'Select 1 option' : 'اختر خياراً واحداً')
                            : (locale === 'en' ? `Choose up to ${group.maxSelected}` : `اختر حتى ${group.maxSelected}`)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.options.map((opt) => {
                          const isSelected = selectedCustomizations.some(c => c.optionId === opt.id);

                          const handleOptionToggle = () => {
                            if (group.maxSelected === 1) {
                              const otherGroups = selectedCustomizations.filter(c => c.groupId !== group.id);
                              if (isSelected) {
                                if (group.minSelected === 0) {
                                  setSelectedCustomizations(otherGroups);
                                }
                              } else {
                                setSelectedCustomizations([
                                  ...otherGroups,
                                  { optionId: opt.id, groupId: group.id, nameEn: opt.nameEn, nameAr: opt.nameAr, price: opt.price }
                                ]);
                              }
                            } else {
                              if (isSelected) {
                                setSelectedCustomizations(selectedCustomizations.filter(c => c.optionId !== opt.id));
                              } else {
                                const groupSelectedCount = selectedCustomizations.filter(c => c.groupId === group.id).length;
                                if (groupSelectedCount < group.maxSelected) {
                                  setSelectedCustomizations([
                                    ...selectedCustomizations,
                                    { optionId: opt.id, groupId: group.id, nameEn: opt.nameEn, nameAr: opt.nameAr, price: opt.price }
                                  ]);
                                }
                              }
                            }
                          };

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={handleOptionToggle}
                              className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all text-left rtl:text-right cursor-pointer ${
                                isSelected
                                  ? 'bg-primary-red/10 border-primary-red text-white'
                                  : 'bg-card border-card-border hover:border-card-border-hover text-text-muted hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`h-4 w-4 rounded flex items-center justify-center border ${
                                  isSelected ? 'border-primary-red bg-primary-red text-white' : 'border-card-border bg-card-border'
                                }`}>
                                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>
                                <span>{locale === 'en' ? opt.nameEn : opt.nameAr}</span>
                              </div>
                              <span className="text-accent-amber font-extrabold font-mono">
                                {opt.price > 0 ? `+${opt.price} EGP` : 'Free'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* ── MAKE IT A COMBO SECTION ── */}
                {isComboAvailable && (
                  <div className="space-y-4 pt-4 border-t border-card-border/50">
                    <div className="flex justify-between items-center bg-[#18181B] px-3.5 py-3 rounded-2xl border border-card-border/30">
                      <div className="flex items-center gap-2">
                        <Flame className="h-4.5 w-4.5 text-accent-amber animate-pulse" />
                        <div>
                          <h4 className="text-xs font-black text-white">
                            {locale === 'en' ? 'Make it a Combo Meal!' : 'اجعلها وجبة كومبو!'}
                          </h4>
                          <p className="text-[10px] text-text-muted">
                            {locale === 'en' ? 'Add a side and a drink at a discounted price' : 'أضف بطاطس ومشروب بسعر مميز'}
                          </p>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setIsCombo(!isCombo)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isCombo
                            ? 'bg-primary-red text-white shadow-lg shadow-primary-red/20'
                            : 'bg-card-border text-text-muted hover:text-white'
                        }`}
                      >
                        {isCombo 
                          ? (locale === 'en' ? 'Combo Active' : 'تم تفعيل الكومبو') 
                          : (locale === 'en' ? 'Add Combo' : 'إضافة كومبو')}
                      </button>
                    </div>

                    {isCombo && (
                      <div className="space-y-4 p-4 rounded-2xl bg-[#111113] border border-card-border/50 animate-in fade-in duration-200">
                        {/* 1. Combo Size */}
                        <div className="space-y-2">
                          <label className="text-[10px] text-text-muted font-bold block uppercase tracking-wider">
                            {locale === 'en' ? 'Combo Size' : 'حجم الكومبو'}
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { code: 'S', label: locale === 'en' ? 'Small' : 'صغير', price: comboPrices.S },
                              { code: 'M', label: locale === 'en' ? 'Medium' : 'وسط', price: comboPrices.M },
                              { code: 'L', label: locale === 'en' ? 'Large' : 'كبير', price: comboPrices.L },
                              { code: 'F', label: locale === 'en' ? 'Family' : 'عائلي', price: comboPrices.F },
                            ].map((sz) => (
                              <button
                                key={sz.code}
                                type="button"
                                onClick={() => setComboSize(sz.code as any)}
                                className={`py-2 px-1 text-center rounded-xl border text-[10px] font-black transition-all cursor-pointer ${
                                  comboSize === sz.code
                                    ? 'bg-primary-red/10 border-primary-red text-white'
                                    : 'bg-card border-card-border text-text-muted hover:text-white'
                                }`}
                              >
                                <span className="block text-white font-extrabold">{sz.code} ({sz.label})</span>
                                <span className="block text-[8px] text-accent-amber mt-0.5 font-mono">+{sz.price} EGP</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 2. Side Item Select */}
                        {allowedSides.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-[10px] text-text-muted font-bold block uppercase tracking-wider">
                              {locale === 'en' ? 'Choose Side / Appetizer' : 'اختر الجانب / المقبلات'}
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {allowedSides.map((side) => {
                                const diff = baseSide ? Math.max(0, side.priceSingle - baseSide.priceSingle) : 0;
                                const isSel = selectedComboSideId === side.id;
                                return (
                                  <button
                                    key={side.id}
                                    type="button"
                                    onClick={() => setSelectedComboSideId(side.id)}
                                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left rtl:text-right text-[11px] font-bold transition-all cursor-pointer ${
                                      isSel
                                        ? 'bg-primary-red/10 border-primary-red text-white'
                                        : 'bg-card border-card-border text-text-muted hover:text-white'
                                    }`}
                                  >
                                    <span className="truncate pr-1">{locale === 'en' ? side.nameEn : side.nameAr}</span>
                                    <span className="text-[9px] text-accent-amber font-mono flex-shrink-0">
                                      {diff > 0 ? `+${diff} EGP` : (locale === 'en' ? 'Included' : 'مشمول')}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 3. Drink Select */}
                        {allowedDrinks.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-[10px] text-text-muted font-bold block uppercase tracking-wider">
                              {locale === 'en' ? 'Choose Drink' : 'اختر المشروب'}
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {allowedDrinks.map((drk) => {
                                const diff = baseDrink ? Math.max(0, drk.priceSingle - baseDrink.priceSingle) : 0;
                                const isSel = selectedComboDrinkId === drk.id;
                                return (
                                  <button
                                    key={drk.id}
                                    type="button"
                                    onClick={() => setSelectedComboDrinkId(drk.id)}
                                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left rtl:text-right text-[11px] font-bold transition-all cursor-pointer ${
                                      isSel
                                        ? 'bg-primary-red/10 border-primary-red text-white'
                                        : 'bg-card border-card-border text-text-muted hover:text-white'
                                    }`}
                                  >
                                    <span className="truncate pr-1">{locale === 'en' ? drk.nameEn : drk.nameAr}</span>
                                    <span className="text-[9px] text-accent-amber font-mono flex-shrink-0">
                                      {diff > 0 ? `+${diff} EGP` : (locale === 'en' ? 'Included' : 'مشمول')}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Sandwich Extras Configuration */}
                {selectedExtras.length > 0 && (
                  <div className="space-y-3 border-t border-card-border/50 pt-4 mt-4">
                    <div className="flex justify-between items-center bg-card-border/30 px-3 py-2 rounded-xl border border-card-border/20">
                      <h4 className="text-xs font-extrabold text-white">
                        {locale === 'en' ? 'Extras & Options' : 'الإضافات والخيارات'}
                      </h4>
                      <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-accent-amber/10 border border-accent-amber/20 text-accent-amber">
                        {locale === 'en' ? 'Customize Sandwich' : 'تخصيص الساندوتش'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {selectedExtras.map((item, idx) => {
                        return (
                          <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl border border-card-border bg-card text-xs font-bold">
                            <span className="text-white flex items-center gap-1.5">
                              {locale === 'en' ? item.nameEn : item.nameAr}
                              {item.isStandard && item.quantity === 0 && (
                                <span className="ml-2 text-primary-red text-[10px] font-black uppercase bg-primary-red/10 px-1.5 py-0.5 rounded border border-primary-red/20 font-sans">
                                  {locale === 'en' ? 'NO' : 'بدون'}
                                </span>
                              )}
                            </span>

                            {item.isStandard ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...selectedExtras];
                                  updated[idx].quantity = item.quantity === 1 ? 0 : 1;
                                  setSelectedExtras(updated);
                                }}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all cursor-pointer ${
                                  item.quantity === 1
                                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                    : 'bg-red-500/10 border-red-500/30 text-red-500'
                                }`}
                              >
                                {item.quantity === 1 
                                  ? (locale === 'en' ? 'Included' : 'مضاف') 
                                  : (locale === 'en' ? 'NO (Omit)' : 'بدون')}
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-text-muted font-extrabold text-[10px] mr-2">
                                  {item.price > 0 ? `+${item.price} EGP` : 'Free'}
                                </span>
                                <div className="flex items-center bg-card-border rounded-lg border border-card-border">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (item.quantity > 0) {
                                        const updated = [...selectedExtras];
                                        updated[idx].quantity -= 1;
                                        setSelectedExtras(updated);
                                      }
                                    }}
                                    className="px-2 py-1 text-xs text-text-muted hover:text-white transition-colors cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="px-2.5 text-[10px] font-extrabold text-white font-mono">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const max = (item as any).maxLimit || 3;
                                      if (item.quantity < max) {
                                        const updated = [...selectedExtras];
                                        updated[idx].quantity += 1;
                                        setSelectedExtras(updated);
                                      }
                                    }}
                                    className="px-2 py-1 text-xs text-text-muted hover:text-white transition-colors cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal footer summary & CTA */}
              <div className="pt-4 border-t border-card-border/50 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider block">
                    {locale === 'en' ? 'Total Price' : 'السعر الإجمالي'}
                  </span>
                  {hasDiscount ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs line-through text-text-muted font-bold font-mono">
                        {originalFinalPrice} EGP
                      </span>
                      <span className="text-lg font-black text-primary-red font-mono">
                        {discountedFinalPrice} EGP
                      </span>
                    </div>
                  ) : (
                    <span className="text-lg font-black text-accent-amber font-mono">
                      {originalFinalPrice} EGP
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    let errorMsg = '';
                    product.customizationGroups?.forEach(group => {
                      const selectedCount = selectedCustomizations.filter(c => c.groupId === group.id).length;
                      if (selectedCount < group.minSelected) {
                        errorMsg = locale === 'en'
                          ? `Please choose at least ${group.minSelected} option(s) for "${group.nameEn}"`
                          : `يرجى اختيار خيار واحد على الأقل لـ "${group.nameAr}"`;
                      }
                    });
                    if (errorMsg) {
                      alert(errorMsg);
                      return;
                    }

                    let finalCustomizations = [...selectedCustomizations];
                    if (isCombo && selectedSide && selectedDrink) {
                      finalCustomizations.push({
                        optionId: `combo-size-${comboSize}`,
                        groupId: 'combo-group-size',
                        nameEn: `Combo Size: ${comboSize === 'S' ? 'Small' : comboSize === 'M' ? 'Medium' : comboSize === 'L' ? 'Large' : 'Family'} (+${sizeBaseComboPrice} EGP)`,
                        nameAr: `حجم الكومبو: ${comboSize === 'S' ? 'صغير' : comboSize === 'M' ? 'وسط' : comboSize === 'L' ? 'كبير' : 'عائلي'} (+${sizeBaseComboPrice} ج.م)`,
                        price: sizeBaseComboPrice,
                      });

                      finalCustomizations.push({
                        optionId: `combo-side-${selectedSide.id}`,
                        groupId: 'combo-group-side',
                        nameEn: `Combo Side: ${selectedSide.nameEn} ${sidePriceDiff > 0 ? `(+${sidePriceDiff} EGP)` : '(Included)'}`,
                        nameAr: `جانبي الكومبو: ${selectedSide.nameAr} ${sidePriceDiff > 0 ? `(+${sidePriceDiff} ج.م)` : '(مشمول)'}`,
                        price: sidePriceDiff,
                      });

                      finalCustomizations.push({
                        optionId: `combo-drink-${selectedDrink.id}`,
                        groupId: 'combo-group-drink',
                        nameEn: `Combo Drink: ${selectedDrink.nameEn} ${drinkPriceDiff > 0 ? `(+${drinkPriceDiff} EGP)` : '(Included)'}`,
                        nameAr: `مشروب الكومبو: ${selectedDrink.nameAr} ${drinkPriceDiff > 0 ? `(+${drinkPriceDiff} ج.م)` : '(مشمول)'}`,
                        price: drinkPriceDiff,
                      });
                    }

                    handleAddProductToCart(product, size, finalCustomizations, selectedExtras);
                    setCustomizationProduct(null);
                    setCartOpen(true);
                  }}
                  className="px-6 py-3 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {locale === 'en' ? 'Confirm & Add to Cart' : 'تأكيد وإضافة للسلة'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      <BranchWelcomePopup />
    </>
  );
}
