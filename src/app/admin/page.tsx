'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartSidebar from '@/components/cart/CartSidebar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, Order, Product, Category } from '@/lib/db';
import { Plus, Edit2, Trash2, ShieldAlert, Bell, DollarSign, ListOrdered, Check, AlertTriangle, EyeOff, RotateCcw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { t, locale } = useLanguage();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const { user, profile, role, isAuthenticated, isLoading } = useAuth();

  // Tab state: 'ORDERS', 'MENU', 'COUPONS', or 'CHAT'
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'MENU' | 'COUPONS' | 'CHAT'>('ORDERS');
  const [filterBranchId, setFilterBranchId] = useState<string>('ALL');
  
  // Audio state
  const [alertAudioEnabled, setAlertAudioEnabled] = useState(true);
  const previousOrdersCountRef = useRef<number>(0);

  // Menu editor modal state
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  useEffect(() => {
    setMounted(true);

    // Handle auto-edit redirect param
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const editId = params.get('edit');
      if (editId) {
        if (role === 'OWNER' || role === 'ADMIN') {
          setActiveTab('MENU');
          db.getProductById(editId).then((prod) => {
            if (prod) {
              setEditingProduct(prod);
              setIsEditingProduct(true);
            }
          });
        } else {
          alert('Access Denied: Staff accounts are not permitted to edit menu configurations.');
        }
      }
    }
  }, [role]);

  // Poll orders database every 2 seconds for live kitchen updates!
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['admin-orders'],
    queryFn: () => db.getOrders(),
    refetchInterval: 2000,
    enabled: isAuthenticated && ['OWNER', 'ADMIN', 'DEVELOPER', 'STAFF'].includes(role || ''),
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['admin-products'],
    queryFn: () => db.getProducts(),
    refetchInterval: 2000,
    enabled: isAuthenticated && ['OWNER', 'ADMIN', 'DEVELOPER', 'STAFF'].includes(role || ''),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['admin-categories'],
    queryFn: () => db.getCategories(),
    enabled: isAuthenticated && ['OWNER', 'ADMIN', 'DEVELOPER', 'STAFF'].includes(role || ''),
  });

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ['admin-branches'],
    queryFn: () => db.getBranches(),
    enabled: isAuthenticated && ['OWNER', 'ADMIN', 'DEVELOPER', 'STAFF'].includes(role || ''),
  });

  // Coupons states & React Query
  const [isAddingCoupon, setIsAddingCoupon] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [newCouponValue, setNewCouponValue] = useState(0);
  const [newCouponExpiry, setNewCouponExpiry] = useState('');

  const { data: coupons = [] } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => db.getCoupons(),
    enabled: isAuthenticated && ['OWNER', 'ADMIN', 'DEVELOPER', 'STAFF'].includes(role || ''),
  });

  const createCouponMutation = useMutation({
    mutationFn: (data: { code: string; discountType: 'PERCENT' | 'FIXED'; discountValue: number; expiryDate: Date }) =>
      db.createCoupon(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setIsAddingCoupon(false);
      setNewCouponCode('');
      setNewCouponValue(0);
      setNewCouponExpiry('');
    },
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['admin-drivers'],
    queryFn: () => db.getDrivers(),
    enabled: isAuthenticated && ['OWNER', 'ADMIN', 'DEVELOPER', 'STAFF'].includes(role || ''),
  });

  // Support Chat admin states
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [activeChatUserName, setActiveChatUserName] = useState('');
  const [adminChatText, setAdminChatText] = useState('');
  const adminChatBottomRef = useRef<HTMLDivElement>(null);

  const { data: activeChats = [] } = useQuery({
    queryKey: ['active-chats'],
    queryFn: () => db.getActiveChats(),
    refetchInterval: 2000,
    enabled: isAuthenticated && ['OWNER', 'ADMIN', 'DEVELOPER', 'STAFF'].includes(role || ''),
  });

  const { data: adminChatMessages = [] } = useQuery({
    queryKey: ['admin-chat-messages', activeChatUserId],
    queryFn: () => (activeChatUserId ? db.getChatMessages(activeChatUserId) : Promise.resolve([])),
    refetchInterval: 2000,
    enabled: isAuthenticated && ['OWNER', 'ADMIN', 'DEVELOPER', 'STAFF'].includes(role || '') && !!activeChatUserId,
  });

  const sendAdminChatMutation = useMutation({
    mutationFn: (data: { text: string }) => {
      if (!activeChatUserId || !user) throw new Error('No active chat session');
      return db.sendChatMessage(activeChatUserId, role as any, profile?.full_name || 'Staff', data.text);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chat-messages', activeChatUserId] });
      setAdminChatText('');
    },
  });

  useEffect(() => {
    if (activeChatUserId && adminChatBottomRef.current) {
      adminChatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [adminChatMessages, activeChatUserId]);

  // Audio beep notifier when a new order is received!
  useEffect(() => {
    if (role && orders.length > 0) {
      const pendingOrders = orders.filter((o) => o.status === 'PENDING');
      const count = pendingOrders.length;

      if (count > previousOrdersCountRef.current && alertAudioEnabled) {
        // Play notification audio alert
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc1 = audioCtx.createOscillator();
          const osc2 = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();

          osc1.connect(gainNode);
          osc2.connect(gainNode);
          gainNode.connect(audioCtx.destination);

          osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
          osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
          gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);

          osc1.start();
          osc2.start();

          osc1.stop(audioCtx.currentTime + 0.15);
          osc2.stop(audioCtx.currentTime + 0.15);

          // Second note
          setTimeout(() => {
            const osc3 = audioCtx.createOscillator();
            const osc4 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc3.connect(gain2);
            osc4.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc3.frequency.setValueAtTime(783.99, audioCtx.currentTime); // G5
            osc4.frequency.setValueAtTime(987.77, audioCtx.currentTime); // B5
            gain2.gain.setValueAtTime(0.12, audioCtx.currentTime);
            osc3.start();
            osc4.start();
            osc3.stop(audioCtx.currentTime + 0.25);
            osc4.stop(audioCtx.currentTime + 0.25);
          }, 180);

        } catch (e) {
          console.warn('Audio alert blocked or unsupported.');
        }
      }
      previousOrdersCountRef.current = count;
    }
  }, [orders, role, alertAudioEnabled]);

  // MUTATIONS
  const acceptOrderMutation = useMutation({
    mutationFn: (orderId: string) => db.updateOrderStatus(orderId, 'PREPARING'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
  });

  const assignDriverMutation = useMutation({
    mutationFn: (data: { orderId: string; driverId: string }) =>
      db.updateOrderStatus(data.orderId, 'PENDING', data.driverId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
  });

  const reassignDriverMutation = useMutation({
    mutationFn: (data: { orderId: string; driverId: string; currentStatus: Order['status'] }) =>
      db.updateOrderStatus(data.orderId, data.currentStatus, data.driverId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: (data: { productId: string; isAvailable: boolean }) =>
      db.updateProduct(data.productId, { isAvailable: data.isAvailable }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  const saveProductMutation = useMutation({
    mutationFn: (prod: Partial<Product>) => {
      if (prod.id) {
        return db.updateProduct(prod.id, prod);
      } else {
        return db.createProduct(prod as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setIsEditingProduct(false);
      setEditingProduct(null);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (productId: string) => db.deleteProduct(productId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  if (!mounted || isLoading) return null;

  // Access Protection
  const hasAccess = isAuthenticated && ['OWNER', 'ADMIN', 'DEVELOPER', 'STAFF'].includes(role || '');
  if (!hasAccess) {
    return (
      <>
        <Header />
        <main className="flex-grow max-w-md mx-auto px-4 py-16 flex flex-col justify-center items-center text-center space-y-6 text-white">
          <div className="h-16 w-16 rounded-full bg-primary-red/10 text-primary-red flex items-center justify-center border border-primary-red/20">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">{locale === 'en' ? 'Staff Panel Access' : 'بوابة الموظفين'}</h1>
            <p className="text-xs text-text-muted">
              {locale === 'en'
                ? 'This area is restricted to Authorized Staff. Please log in with a Staff or Admin account.'
                : 'هذا القسم خاص بالموظفين المصرح لهم. يرجى تسجيل الدخول بحساب موظف أو مسؤول.'}
            </p>
          </div>
          <Link
            href="/auth/login"
            className="w-full py-3 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all block text-center"
          >
            {locale === 'en' ? 'Go to Login' : 'الذهاب لتسجيل الدخول'}
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  // Active / Kitchen Orders
  const filteredOrders = filterBranchId === 'ALL'
    ? orders
    : orders.filter((o) => o.branchId === filterBranchId);

  const pendingOrders = filteredOrders.filter((o) => o.status === 'PENDING');
  const activeKitchenOrders = filteredOrders.filter((o) => o.status === 'PREPARING' || o.status === 'ON_THE_WAY');

  // Business metrics (only visible for OWNER!)
  const totalRevenue = filteredOrders.filter((o) => o.status === 'DELIVERED').reduce((acc, o) => acc + o.total, 0);
  const totalOrdersCount = filteredOrders.length;

  const handleOpenAddProduct = () => {
    setEditingProduct({
      nameEn: '',
      nameAr: '',
      descEn: '',
      descAr: '',
      priceSingle: 0,
      priceDouble: undefined,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
      categoryId: categories[0]?.id || 'cat-1',
    });
    setIsEditingProduct(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct({ ...product });
    setIsEditingProduct(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    saveProductMutation.mutate(editingProduct);
  };

  return (
    <>
      <Header />
      <CartSidebar />

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 pb-24 md:pb-8 space-y-6">
        
        {/* Dashboard Title & Admin Metadata */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-card-border pb-6 font-semibold">
          <div className="space-y-1">
            <h1 className="text-xl md:text-3xl font-black text-white flex items-center gap-2 flex-wrap">
              <span>{t('adminDashboard')}</span>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-primary-red/10 text-primary-red border border-primary-red/20">
                {role}
              </span>
            </h1>
            <p className="text-xs text-text-muted">
              {locale === 'en' ? 'Welcome back,' : 'مرحباً بك،'} <span className="text-white font-bold">{profile?.full_name || user?.email}</span>
            </p>
          </div>

          <div className="flex flex-col items-stretch sm:items-end gap-3 w-full sm:w-auto">
            {/* Branch Filter Dropdown */}
            <div className="flex items-center gap-2 bg-card border border-card-border px-4 py-2.5 rounded-2xl w-full sm:w-auto">
              <span className="text-[10px] text-text-muted font-bold uppercase shrink-0">{locale === 'en' ? 'Branch:' : 'الفرع:'}</span>
              <select
                value={filterBranchId}
                onChange={(e) => setFilterBranchId(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer flex-1 sm:flex-none"
              >
                <option value="ALL" className="bg-[#18181B] text-white font-bold">{locale === 'en' ? 'All Branches' : 'جميع الفروع'}</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id} className="bg-[#18181B] text-white font-bold">
                    {locale === 'en' ? b.nameEn : b.nameAr}
                  </option>
                ))}
              </select>
            </div>

            {/* Desktop Navigation for Main Tabs */}
            <div className="hidden md:flex gap-1 bg-[#18181B] p-1 rounded-xl border border-card-border">
              <button
                onClick={() => setActiveTab('ORDERS')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'ORDERS' ? 'bg-primary-red text-white shadow-md shadow-primary-red/20' : 'text-text-muted hover:text-white hover:bg-card-border'
                }`}
              >
                {locale === 'en' ? 'Orders' : 'الطلبات'}
              </button>
              
              {['OWNER', 'ADMIN', 'DEVELOPER'].includes(role || '') && (
                <>
                  <button
                    onClick={() => setActiveTab('MENU')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTab === 'MENU' ? 'bg-primary-red text-white shadow-md shadow-primary-red/20' : 'text-text-muted hover:text-white hover:bg-card-border'
                    }`}
                  >
                    {locale === 'en' ? 'Menu' : 'المنيو'}
                  </button>
                  {['OWNER', 'ADMIN'].includes(role || '') && (
                    <button
                      onClick={() => setActiveTab('COUPONS')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeTab === 'COUPONS' ? 'bg-primary-red text-white shadow-md shadow-primary-red/20' : 'text-text-muted hover:text-white hover:bg-card-border'
                      }`}
                    >
                      {locale === 'en' ? 'Coupons' : 'كوبونات'}
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('CHAT')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTab === 'CHAT' ? 'bg-primary-red text-white shadow-md shadow-primary-red/20' : 'text-text-muted hover:text-white hover:bg-card-border'
                    }`}
                  >
                    {locale === 'en' ? 'Chat' : 'المحادثة'}
                  </button>
                </>
              )}
            </div>

            {/* Sub-pages Navigation for Admins — visible on desktop only; on mobile use Header links */}
            <div className="hidden sm:flex gap-2 flex-wrap items-center">
              {['OWNER', 'ADMIN', 'DEVELOPER'].includes(role || '') && (
                <>
                  <Link href="/admin/users" className="px-4 py-2 rounded-xl text-[10px] font-bold text-text-muted hover:text-white bg-card border border-card-border hover:bg-card-border/50 transition-all uppercase tracking-wider">
                    {locale === 'en' ? 'Users Mgmt' : 'المستخدمين'}
                  </Link>
                  <Link href="/admin/analytics" className="px-4 py-2 rounded-xl text-[10px] font-bold text-text-muted hover:text-white bg-card border border-card-border hover:bg-card-border/50 transition-all uppercase tracking-wider">
                    {locale === 'en' ? 'Analytics' : 'التحليلات'}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* OWNER METRICS PANEL (Only visible if role === OWNER) */}
        {role === 'OWNER' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-card border border-card-border rounded-3xl p-6">
            <div className="space-y-1 sm:col-span-1">
              <span className="text-[10px] text-accent-amber font-extrabold uppercase tracking-widest">Business Report</span>
              <h2 className="text-base font-bold text-white">Dodz Performance</h2>
              <p className="text-[10px] text-text-muted">Real-time metrics compiled from live database stores.</p>
            </div>
            
            <div className="p-4 rounded-2xl bg-[#18181B] border border-card-border flex items-center gap-4 text-white">
              <div className="h-10 w-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-text-muted block font-semibold">{t('revenue')}</span>
                <span className="text-lg font-black text-white">{totalRevenue} EGP</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#18181B] border border-card-border flex items-center gap-4 text-white">
              <div className="h-10 w-10 rounded-xl bg-accent-amber/10 text-accent-amber flex items-center justify-center">
                <ListOrdered className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-text-muted block font-semibold">{t('totalOrdersCount')}</span>
                <span className="text-lg font-black text-white">{totalOrdersCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ACTIVE ORDERS CONTROLLER TAB */}
        {/* ========================================================================= */}
        {activeTab === 'ORDERS' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* INCOMING PENDING ORDERS (Needs driver assignment or acceptance) */}
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-[#18181B] p-4 rounded-2xl border border-card-border">
                <h2 className="text-xs font-bold text-white flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary-red animate-ping" />
                  <span>Incoming Orders</span>
                  <span className="px-2 py-0.5 rounded-full bg-primary-red/10 text-primary-red text-[10px] font-bold">
                    {pendingOrders.length}
                  </span>
                </h2>

                {/* Audio Bell Toggler */}
                <button
                  onClick={() => setAlertAudioEnabled(!alertAudioEnabled)}
                  className={`p-1.5 rounded-lg border transition-all ${
                    alertAudioEnabled ? 'bg-primary-red/10 border-primary-red/35 text-primary-red' : 'bg-card border-card-border text-text-muted'
                  }`}
                  title="Toggle Audio Notifications"
                >
                  <Bell className="h-4 w-4" />
                </button>
              </div>

              {pendingOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted italic bg-card border border-card-border rounded-3xl">
                  {locale === 'en' ? 'No incoming orders currently.' : 'لا توجد طلبات جديدة حالياً.'}
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingOrders.map((order) => (
                    <div key={order.id} className="bg-card border border-card-border rounded-3xl p-5 space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="text-[10px] text-text-muted font-mono">ORDER #{order.id}</span>
                            {(() => {
                              const oBranch = branches.find((b: any) => b.id === order.branchId);
                              return oBranch ? (
                                <span className="px-1.5 py-0.5 bg-accent-amber/10 border border-accent-amber/20 text-accent-amber text-[8px] font-bold rounded">
                                  {locale === 'en' ? oBranch.nameEn : oBranch.nameAr}
                                </span>
                              ) : null;
                            })()}
                          </div>
                          <span className="text-xs font-bold text-white">{order.type === 'DELIVERY' ? t('delivery') : t('pickup')}</span>
                        </div>
                        <span className="text-accent-amber font-extrabold text-xs">{order.total} EGP</span>
                      </div>

                      {/* Items */}
                      <div className="text-[11px] text-text-muted space-y-1">
                        {order.items.map((it, idx) => (
                          <div key={idx}>• {it.quantity}x {locale === 'en' ? it.productNameEn : it.productNameAr}</div>
                        ))}
                      </div>

                      {/* Address / Contact */}
                      <div className="text-[11px] text-text-muted space-y-1 bg-[#18181B] p-2.5 rounded-xl border border-card-border/50">
                        <div className="text-white font-bold">{order.userName}</div>
                        <div>{order.address}</div>
                      </div>

                      {/* Accept/Assign Driver Action widget */}
                      {order.type === 'DELIVERY' && !order.driverId ? (
                        <div className="space-y-2">
                          <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">{t('assignDriver')}</label>
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                assignDriverMutation.mutate({ orderId: order.id, driverId: e.target.value });
                              }
                            }}
                            className="w-full bg-[#18181B] text-[11px] px-2 py-2 rounded-lg border border-card-border focus:outline-none focus:border-primary-red/50 text-white"
                          >
                            <option value="">-- Choose Driver --</option>
                            {drivers.map(driver => (
                              <option key={driver.id} value={driver.id}>{driver.name} ({driver.email || 'Driver'})</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <button
                          onClick={() => acceptOrderMutation.mutate(order.id)}
                          className="w-full py-2 bg-primary-red hover:bg-primary-red-hover text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Check className="h-4.5 w-4.5" />
                          <span>{t('acceptOrder')}</span>
                        </button>
                      )}

                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* KITCHEN ACTIVE / SHIPPED ORDERS (Span 2) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#18181B] p-4 rounded-2xl border border-card-border">
                <h2 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Preparing & Shipped Control Center</span>
                  <span className="px-2 py-0.5 rounded-full bg-accent-amber/10 text-accent-amber text-[10px] font-bold">
                    {activeKitchenOrders.length}
                  </span>
                </h2>
              </div>

              {activeKitchenOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted bg-card border border-card-border rounded-3xl italic">
                  No orders in kitchen or transit.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeKitchenOrders.map((order) => (
                    <div key={order.id} className="bg-card border border-card-border rounded-3xl p-5 space-y-4 hover:border-accent-amber/25 transition-all">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="text-[10px] text-text-muted font-mono">ORDER #{order.id}</span>
                            {(() => {
                              const oBranch = branches.find((b: any) => b.id === order.branchId);
                              return oBranch ? (
                                <span className="px-1.5 py-0.5 bg-accent-amber/10 border border-accent-amber/20 text-accent-amber text-[8px] font-bold rounded">
                                  {locale === 'en' ? oBranch.nameEn : oBranch.nameAr}
                                </span>
                              ) : null;
                            })()}
                          </div>
                          <span className="px-2 py-0.5 rounded bg-primary-red/10 text-primary-red border border-primary-red/20 text-[9px] uppercase font-bold mt-1 inline-block">
                            {order.status === 'PREPARING' ? 'In Kitchen' : 'Out with Driver'}
                          </span>
                        </div>
                        <span className="text-accent-amber font-extrabold text-xs">{order.total} EGP</span>
                      </div>

                      {/* Items */}
                      <div className="text-[11px] text-text-muted space-y-1">
                        {order.items.map((it, idx) => (
                          <div key={idx}>• {it.quantity}x {locale === 'en' ? it.productNameEn : it.productNameAr} {it.size !== 'NONE' && `(${it.size})`}</div>
                        ))}
                      </div>

                      {/* Contact details */}
                      <div className="text-[11px] text-text-muted space-y-1">
                        <div className="text-white font-bold">{order.userName} ({order.userPhone})</div>
                        {order.type === 'DELIVERY' && <div>📍 {order.address}</div>}
                      </div>

                      {/* Driver Assigned / Reassign widget */}
                      {order.type === 'DELIVERY' && (
                        <div className="space-y-1">
                          <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Driver Assigned:</label>
                          <select
                            value={order.driverId || ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                reassignDriverMutation.mutate({ orderId: order.id, driverId: e.target.value, currentStatus: order.status });
                              }
                            }}
                            className="w-full bg-[#18181B] text-[11px] px-2 py-2 rounded-lg border border-card-border focus:outline-none focus:border-primary-red/50 text-white"
                          >
                            <option value="">-- Choose Driver --</option>
                            {drivers.map(driver => (
                              <option key={driver.id} value={driver.id}>{driver.name} ({driver.email || 'Driver'})</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Manual Transition statuses */}
                      <div className="flex gap-2">
                        {order.status === 'PREPARING' && (
                          <button
                            onClick={() => db.updateOrderStatus(order.id, 'ON_THE_WAY')}
                            className="w-full py-2 bg-accent-amber hover:bg-accent-amber-hover text-white text-[10px] font-bold rounded-xl transition-all cursor-pointer"
                          >
                            Set Out for Delivery
                          </button>
                        )}
                        {order.status === 'ON_THE_WAY' && (
                          <button
                            onClick={() => db.updateOrderStatus(order.id, 'DELIVERED')}
                            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold rounded-xl transition-all cursor-pointer"
                          >
                            Mark Delivered
                          </button>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* MENU CRUD CONTROL PANEL TAB */}
        {/* ========================================================================= */}
        {activeTab === 'MENU' && (
          <div className="bg-card border border-card-border rounded-3xl p-6 space-y-6">
            
            {/* Header CRUD */}
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-wider text-accent-amber">{t('menuManagement')}</h2>
              <button
                onClick={handleOpenAddProduct}
                className="px-4 py-2 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-4.5 w-4.5" />
                <span>{t('addNewProduct')}</span>
              </button>
            </div>

            {/* List products grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right text-xs">
                <thead className="bg-[#18181B] text-text-muted border-b border-card-border">
                  <tr>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Item' : 'المنتج'}</th>
                    <th className="p-4 font-bold">{t('productCategory')}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Price (Single / Double)' : 'السعر (سينجل / دبل)'}</th>
                    <th className="p-4 font-bold">{t('itemStatus')}</th>
                    <th className="p-4 font-bold text-center">{locale === 'en' ? 'Actions' : 'إجراءات'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border/30">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-card-border/20 transition-all">
                      <td className="p-4 flex items-center gap-3">
                        <img src={product.imageUrl} alt={product.nameEn} className="h-10 w-10 rounded-lg object-cover bg-card-border flex-shrink-0" />
                        <div>
                          <span className="font-bold text-white block">{locale === 'en' ? product.nameEn : product.nameAr}</span>
                          <span className="text-[10px] text-text-muted line-clamp-1 max-w-[200px]">{locale === 'en' ? product.descEn : product.descAr}</span>
                        </div>
                      </td>
                      <td className="p-4 font-medium text-text-muted">
                        {product.categoryId === 'cat-1' && t('beefBurgers')}
                        {product.categoryId === 'cat-2' && t('friedChicken')}
                        {product.categoryId === 'cat-3' && t('sidesAppetizers')}
                        {product.categoryId === 'cat-4' && t('drinks')}
                      </td>
                      <td className="p-4 font-mono font-bold text-accent-amber">
                        {product.priceSingle} EGP {product.priceDouble ? `/ ${product.priceDouble} EGP` : ''}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => toggleAvailabilityMutation.mutate({ productId: product.id, isAvailable: !product.isAvailable })}
                          className={`px-3 py-1 rounded-full text-[9px] font-bold border transition-all cursor-pointer ${
                            product.isAvailable
                              ? 'bg-green-500/10 text-green-500 border-green-500/20'
                              : 'bg-primary-red/10 text-primary-red border-primary-red/20'
                          }`}
                        >
                          {product.isAvailable ? t('available') : t('notAvailable')}
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditProduct(product)}
                            className="p-1.5 rounded bg-card border border-card-border text-text-muted hover:text-white transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this product?')) {
                                deleteProductMutation.mutate(product.id);
                              }
                            }}
                            className="p-1.5 rounded bg-card border border-card-border text-text-muted hover:text-primary-red transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* COUPONS & OFFERS CONTROL PANEL TAB */}
        {/* ========================================================================= */}
        {activeTab === 'COUPONS' && (
          <div className="bg-card border border-card-border rounded-3xl p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-wider text-accent-amber">
                {locale === 'en' ? 'Coupons & Promotional Offers' : 'إدارة الكوبونات والعروض الترويجية'}
              </h2>
              <button
                onClick={() => setIsAddingCoupon(true)}
                className="px-4 py-2 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-4.5 w-4.5" />
                <span>{locale === 'en' ? 'Create Coupon' : 'إنشاء كوبون جديد'}</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right text-xs">
                <thead className="bg-[#18181B] text-text-muted border-b border-card-border">
                  <tr>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Coupon Code' : 'كود الخصم'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Discount Type' : 'نوع الخصم'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Discount Value' : 'قيمة الخصم'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Status' : 'الحالة'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border/30">
                  {coupons.map((cp) => (
                    <tr key={cp.id} className="hover:bg-card-border/20 transition-all">
                      <td className="p-4 font-bold text-white font-mono">{cp.code}</td>
                      <td className="p-4 text-text-muted">{cp.discountType}</td>
                      <td className="p-4 font-bold text-accent-amber">
                        {cp.discountValue} {cp.discountType === 'PERCENT' ? '%' : 'EGP'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          cp.isActive ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                          {cp.isActive ? t('available') : t('notAvailable')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Dialog for Adding Coupon */}
            {isAddingCoupon && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setIsAddingCoupon(false)} />
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newCouponCode.trim() || newCouponValue <= 0) return;
                    createCouponMutation.mutate({
                      code: newCouponCode.trim().toUpperCase(),
                      discountType: newCouponType,
                      discountValue: newCouponValue,
                      expiryDate: newCouponExpiry ? new Date(newCouponExpiry) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    });
                  }}
                  className="relative w-full max-w-md bg-card border border-card-border rounded-3xl p-6 shadow-2xl space-y-4 z-10"
                >
                  <h3 className="text-base font-extrabold text-white">
                    {locale === 'en' ? 'Create New Discount Coupon' : 'إنشاء كود خصم جديد'}
                  </h3>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Coupon Code</label>
                      <input
                        type="text"
                        placeholder="e.g. DODZNEW"
                        value={newCouponCode}
                        onChange={(e) => setNewCouponCode(e.target.value)}
                        required
                        className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white uppercase focus:outline-none focus:border-primary-red/50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Discount Type</label>
                        <select
                          value={newCouponType}
                          onChange={(e) => setNewCouponType(e.target.value as any)}
                          className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none"
                        >
                          <option value="PERCENT">PERCENT (%)</option>
                          <option value="FIXED">FIXED VALUE (EGP)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Discount Value</label>
                        <input
                          type="number"
                          value={newCouponValue || ''}
                          onChange={(e) => setNewCouponValue(Number(e.target.value))}
                          required
                          className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Expiry Date (Optional)</label>
                      <input
                        type="date"
                        value={newCouponExpiry}
                        onChange={(e) => setNewCouponExpiry(e.target.value)}
                        className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-card-border/50">
                    <button
                      type="button"
                      onClick={() => setIsAddingCoupon(false)}
                      className="px-5 py-2.5 bg-card hover:bg-card-border border border-card-border text-foreground text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      {locale === 'en' ? 'Create' : 'إنشاء'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* LIVE SUPPORT CHAT ADMIN PANEL TAB */}
        {/* ========================================================================= */}
        {activeTab === 'CHAT' && (
          <div className="bg-card border border-card-border rounded-3xl p-4 sm:p-6 flex flex-col md:flex-row gap-6 min-h-[450px]">
            {/* Left list: active chats */}
            <div className="md:w-1/3 border-b md:border-b-0 md:border-r rtl:md:border-r-0 rtl:md:border-l border-card-border pb-4 md:pb-0 md:pr-6 rtl:md:pr-0 rtl:md:pl-6 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active Chat Sessions</h3>
              <div className="space-y-2">
                {activeChats.length === 0 ? (
                  <div className="text-xs text-text-muted italic">No active customer chats.</div>
                ) : (
                  activeChats.map((chat) => (
                    <button
                      key={chat.userId}
                      onClick={() => {
                        setActiveChatUserId(chat.userId);
                        setActiveChatUserName(chat.userName);
                      }}
                      className={`w-full text-left rtl:text-right p-3 rounded-xl border text-xs transition-all flex flex-col gap-1 cursor-pointer ${
                        activeChatUserId === chat.userId
                          ? 'border-primary-red bg-primary-red/5'
                          : 'border-card-border hover:bg-card-border/20'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full font-bold">
                        <span className="text-white">{chat.userName}</span>
                        <span className="text-[9px] text-text-muted">
                          {new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-text-muted truncate max-w-full">
                        {chat.lastMessage}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Right details: chat conversations */}
            <div className="md:w-2/3 flex flex-col justify-between">
              {activeChatUserId ? (
                <>
                  {/* Messages Area */}
                  <div className="bg-[#121214]/40 border border-card-border rounded-2xl p-4 h-[320px] overflow-y-auto space-y-3 mb-4 text-xs">
                    <span className="text-[10px] text-text-muted font-bold block mb-1">
                      Chatting with <b className="text-white">{activeChatUserName}</b>
                    </span>
                    <div className="space-y-3">
                      {adminChatMessages.map((msg) => {
                        const isStaff = msg.senderRole === 'STAFF' || msg.senderRole === 'OWNER';
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                          >
                            <span className="text-[9px] text-text-muted mb-0.5">{msg.senderName} ({msg.senderRole})</span>
                            <div
                              className={`px-3 py-2 rounded-2xl max-w-[85%] ${
                                isStaff
                                  ? 'bg-primary-red text-white rounded-tr-none'
                                  : 'bg-card-border text-foreground rounded-tl-none'
                              }`}
                            >
                              {msg.text}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={adminChatBottomRef} />
                    </div>
                  </div>

                  {/* Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!adminChatText.trim()) return;
                      sendAdminChatMutation.mutate({ text: adminChatText.trim() });
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Type your response..."
                      value={adminChatText}
                      onChange={(e) => setAdminChatText(e.target.value)}
                      className="flex-grow bg-[#18181B] text-xs px-3 py-3 rounded-xl text-white border border-card-border focus:outline-none placeholder:text-text-muted"
                    />
                    <button
                      type="submit"
                      className="px-5 py-3 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Send
                    </button>
                  </form>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-text-muted italic text-center p-8 bg-[#121214]/20 border border-dashed border-card-border rounded-2xl">
                  Select a customer chat session from the list on the left to begin support.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ADD/EDIT MENU PRODUCT MODAL DIALOG */}
        {/* ========================================================================= */}
        {isEditingProduct && editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsEditingProduct(false)} />
            <form
              onSubmit={handleSaveProduct}
              className="relative w-full max-w-xl bg-card border border-card-border rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 z-10 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-base font-extrabold text-white">
                {editingProduct.id ? t('editProduct') : t('addNewProduct')}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Names */}
                <div className="space-y-1">
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">{t('productNameEn')}</label>
                  <input
                    type="text"
                    value={editingProduct.nameEn || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, nameEn: e.target.value })}
                    required
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">{t('productNameAr')}</label>
                  <input
                    type="text"
                    value={editingProduct.nameAr || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, nameAr: e.target.value })}
                    required
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 transition-colors"
                  />
                </div>

                {/* Category select */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">{t('productCategory')}</label>
                  <select
                    value={editingProduct.categoryId || 'cat-1'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 transition-colors"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{locale === 'en' ? c.nameEn : c.nameAr}</option>
                    ))}
                  </select>
                </div>

                {/* Descriptions */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">{t('productDescEn')}</label>
                  <textarea
                    value={editingProduct.descEn || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, descEn: e.target.value })}
                    required
                    rows={2}
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 transition-colors resize-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">{t('productDescAr')}</label>
                  <textarea
                    value={editingProduct.descAr || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, descAr: e.target.value })}
                    required
                    rows={2}
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 transition-colors resize-none"
                  />
                </div>

                {/* Prices */}
                <div className="space-y-1">
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">{t('productPriceSingle')}</label>
                  <input
                    type="number"
                    value={editingProduct.priceSingle || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, priceSingle: Number(e.target.value) })}
                    required
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">{t('productPriceDouble')}</label>
                  <input
                    type="number"
                    value={editingProduct.priceDouble || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, priceDouble: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 transition-colors"
                  />
                </div>

                {/* Image URL */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">{t('productImage')}</label>
                  <input
                    type="text"
                    value={editingProduct.imageUrl || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                    required
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 transition-colors"
                  />
                </div>

              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t border-card-border/50">
                <button
                  type="button"
                  onClick={() => setIsEditingProduct(false)}
                  className="px-5 py-2.5 bg-card hover:bg-card-border border border-card-border text-foreground text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>

            </form>
          </div>
        )}

      </main>

      {/* ===== STICKY BOTTOM TAB BAR — Mobile Only (md:hidden) ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#0E0E10]/95 backdrop-blur-md border-t border-card-border safe-bottom">
        <div className="flex items-stretch h-16">
          <button
            onClick={() => setActiveTab('ORDERS')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
              activeTab === 'ORDERS' ? 'text-primary-red' : 'text-text-muted'
            }`}
          >
            <ListOrdered className="h-5 w-5" />
            <span>{locale === 'en' ? 'Orders' : 'الطلبات'}</span>
          </button>

          {['OWNER', 'ADMIN', 'DEVELOPER'].includes(role || '') && (
            <>
              <button
                onClick={() => setActiveTab('MENU')}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                  activeTab === 'MENU' ? 'text-primary-red' : 'text-text-muted'
                }`}
              >
                <EyeOff className="h-5 w-5" />
                <span>{locale === 'en' ? 'Menu' : 'المنيو'}</span>
              </button>
              {['OWNER', 'ADMIN'].includes(role || '') && (
                <button
                  onClick={() => setActiveTab('COUPONS')}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                    activeTab === 'COUPONS' ? 'text-primary-red' : 'text-text-muted'
                  }`}
                >
                  <DollarSign className="h-5 w-5" />
                  <span>{locale === 'en' ? 'Coupons' : 'كوبونات'}</span>
                </button>
              )}
            </>
          )}

          {['OWNER', 'ADMIN', 'DEVELOPER'].includes(role || '') && (
            <button
              onClick={() => setActiveTab('CHAT')}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                activeTab === 'CHAT' ? 'text-primary-red' : 'text-text-muted'
              }`}
            >
              <Bell className="h-5 w-5" />
              <span>{locale === 'en' ? 'Chat' : 'محادثة'}</span>
            </button>
          )}
        </div>
      </nav>

      <Footer />
    </>
  );
}
