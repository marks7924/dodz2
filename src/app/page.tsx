'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useCartStore } from '@/store/useCartStore';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';

import CartSidebar from '@/components/cart/CartSidebar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, Product, Category, Review } from '@/lib/db';
import { ShoppingBag, Star, Flame, Sparkles, Plus, Check, StarIcon, X, MessageCircle, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';


export default function Home() {
  const { t, locale, dir } = useLanguage();
  const { addItem, cartOpen, setCartOpen } = useCartStore();
  const queryClient = useQueryClient();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<'SINGLE' | 'DOUBLE'>('SINGLE');
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const { user, profile, isAuthenticated } = useAuth();
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setIsAdmin(['STAFF', 'OWNER', 'ADMIN', 'DEVELOPER'].includes(profile.role));
    }
  }, [profile]);

  // Get or create chat session once user is loaded
  useEffect(() => {
    if (chatOpen && isAuthenticated && user) {
      import('@/lib/chat').then(({ getOrCreateChatSession }) => {
        getOrCreateChatSession(user.id)
          .then((sid) => setChatSessionId(sid))
          .catch((err) => console.error('Error fetching chat session:', err));
      });
    }
  }, [chatOpen, isAuthenticated, user]);

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

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => db.getProducts(),
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

  const handleAddProductToCart = (product: Product, size: 'SINGLE' | 'DOUBLE' | 'NONE') => {
    const price = size === 'DOUBLE' && product.priceDouble ? product.priceDouble : product.priceSingle;
    addItem({
      productId: product.id,
      nameEn: product.nameEn,
      nameAr: product.nameAr,
      price,
      size: size as any,
      imageUrl: product.imageUrl,
    });

    setJustAddedId(`${product.id}-${size}`);
    setTimeout(() => {
      setJustAddedId(null);
    }, 1500);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !reviewComment.trim()) return;

    // Get current user details from localStorage
    const savedUser = localStorage.getItem('user');
    const user = savedUser ? JSON.parse(savedUser) : { id: 'user-cust', name: 'Mina Ramzy' };

    submitReviewMutation.mutate({
      userId: user.id,
      userName: reviewName.trim() || user.name || 'Anonymous',
      productId: selectedProduct.id,
      rating: reviewRating,
      comment: reviewComment.trim(),
    });
  };

  const activeProducts = activeCategory === 'all' ? products : products.filter((p) => p.categoryId === activeCategory);

  return (
    <>
      <Header />
      <CartSidebar />

      <main className="flex-1 pb-16">
        {/* Banner Announcement */}
        <div className="w-full bg-gradient-to-r from-primary-red to-accent-amber py-2.5 px-4 text-center text-xs font-bold text-white tracking-wide shadow-md flex items-center justify-center gap-2">
          <Flame className="h-4 w-4 animate-bounce" />
          <span>{t('promoBanner')}</span>
          <Sparkles className="h-4 w-4" />
        </div>

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
                  src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80"
                  alt="Dodz Charcoal Grilled Burger"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                  onClick={() => {
                    const bestseller = products.find(p => p.id === 'prod-dodz-burger');
                    if (bestseller) {
                      setSelectedProduct(bestseller);
                    }
                  }}
                />
                <div className="relative bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 space-y-3 z-10 w-full">
                  <div className="flex justify-between items-center bg-black/55 backdrop-blur-md p-4 rounded-2xl border border-white/5 hover:border-primary-red/35 transition-colors">
                    <div
                      className="cursor-pointer flex-1"
                      onClick={() => {
                        const bestseller = products.find(p => p.id === 'prod-dodz-burger');
                        if (bestseller) setSelectedProduct(bestseller);
                      }}
                    >
                      <h4 className="text-sm font-bold text-white">Dodz Burger (دودز برجر)</h4>
                      <p className="text-[11px] text-accent-amber mt-0.5">Single: 120 EGP | Double: 170 EGP</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const bestseller = products.find(p => p.id === 'prod-dodz-burger');
                        if (bestseller) {
                          handleAddProductToCart(bestseller, 'SINGLE');
                          setCartOpen(true);
                        }
                      }}
                      className="px-2.5 py-1 rounded bg-accent-amber hover:bg-yellow-400 text-black text-[10px] font-extrabold uppercase cursor-pointer transition-all animate-pulse hover:animate-none ml-3 flex-shrink-0"
                    >
                      Buy Now
                    </button>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // STAFF shouldn't edit. Double-check local role first.
                        const savedUser = localStorage.getItem('user');
                        const isOwner = savedUser ? JSON.parse(savedUser).role === 'OWNER' : false;
                        if (isOwner) {
                          window.location.href = '/admin?edit=prod-dodz-burger';
                        } else {
                          alert(locale === 'en' ? 'Permission Denied: Only Owners can edit menu items.' : 'تم رفض الإذن: يمتلك المدير فقط صلاحية تعديل المنتجات.');
                        }
                      }}
                      className="w-full py-2 bg-accent-amber hover:bg-accent-amber-hover text-black text-[10px] font-extrabold uppercase rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      🛠️ {locale === 'en' ? 'Edit as Admin' : 'تعديل كمسؤول'}
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

          {/* Categories Navigation Bar */}
          <div className="sticky top-[64px] md:top-[80px] z-30 w-full glass-panel border border-card-border p-2 rounded-2xl mb-8 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            {/* All category button */}
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-primary-red text-white shadow-md'
                  : 'text-foreground hover:bg-card-border'
              }`}
            >
              {locale === 'en' ? 'All' : 'الكل'}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-primary-red text-white shadow-md'
                    : 'text-foreground hover:bg-card-border'
                }`}
              >
                {locale === 'en' ? cat.nameEn : cat.nameAr}
              </button>
            ))}
          </div>

          {/* Grid Layout of Menu Items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeProducts.map((product) => {
              const hasOptions = !!product.priceDouble;

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
                    {hasOptions ? (
                      <div className="space-y-4 pt-4">
                        {/* Selector tabs for sizes */}
                        <div className="flex justify-between items-center text-xs text-text-muted">
                          <span>{t('single')}: <b className="text-foreground">{product.priceSingle} {t('egp')}</b></span>
                          <span>{t('double')}: <b className="text-foreground">{product.priceDouble} {t('egp')}</b></span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            disabled={!product.isAvailable}
                            onClick={() => handleAddProductToCart(product, 'SINGLE')}
                            className="flex-1 py-2 bg-card hover:bg-card-border border border-card-border hover:border-primary-red/35 text-[11px] font-bold rounded-xl text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {justAddedId === `${product.id}-SINGLE` ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-green-500" />
                                <span className="text-green-500">{t('added')}</span>
                              </>
                            ) : (
                              <>
                                <Plus className="h-3.5 w-3.5" />
                                <span>{t('single')}</span>
                              </>
                            )}
                          </button>
                          <button
                            disabled={!product.isAvailable}
                            onClick={() => handleAddProductToCart(product, 'DOUBLE')}
                            className="flex-1 py-2 bg-primary-red hover:bg-primary-red-hover text-[11px] font-bold rounded-xl text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {justAddedId === `${product.id}-DOUBLE` ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-white" />
                                <span>{t('added')}</span>
                              </>
                            ) : (
                              <>
                                <Plus className="h-3.5 w-3.5" />
                                <span>{t('double')}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-4 pt-4">
                        <span className="text-base font-bold text-accent-amber">
                          {product.priceSingle} {t('egp')}
                        </span>
                        <button
                          disabled={!product.isAvailable}
                          onClick={() => handleAddProductToCart(product, 'NONE')}
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
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-4 w-4 fill-accent-amber text-accent-amber" />
                    ))}
                    <span className="text-xs text-foreground font-bold ml-1">5.0</span>
                    <span className="text-xs text-text-muted">({reviews.length} {t('reviews')})</span>
                  </div>

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
                </div>

                {/* Size choice and add button */}
                <div className="border-t border-card-border/50 pt-4 mt-6 flex items-center justify-between gap-4">
                  {selectedProduct.priceDouble ? (
                    <div className="flex gap-2 bg-card-border p-1 rounded-xl">
                      <button
                        onClick={() => setSelectedSize('SINGLE')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          selectedSize === 'SINGLE' ? 'bg-primary-red text-white' : 'text-text-muted hover:text-white'
                        }`}
                      >
                        {t('single')} ({selectedProduct.priceSingle} EGP)
                      </button>
                      <button
                        onClick={() => setSelectedSize('DOUBLE')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          selectedSize === 'DOUBLE' ? 'bg-primary-red text-white' : 'text-text-muted hover:text-white'
                        }`}
                      >
                        {t('double')} ({selectedProduct.priceDouble} EGP)
                      </button>
                    </div>
                  ) : (
                    <span className="text-lg font-extrabold text-accent-amber">
                      {selectedProduct.priceSingle} {t('egp')}
                    </span>
                  )}

                  <button
                    disabled={!selectedProduct.isAvailable}
                    onClick={() => {
                      handleAddProductToCart(
                        selectedProduct,
                        selectedProduct.priceDouble ? selectedSize : 'NONE'
                      );
                      setSelectedProduct(null);
                    }}
                    className="px-5 py-2.5 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    {t('addToCart')}
                  </button>
                </div>
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
              <button
                onClick={() => setChatOpen(false)}
                className="p-1 rounded hover:bg-card-border text-text-muted hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
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

    </>
  );
}
