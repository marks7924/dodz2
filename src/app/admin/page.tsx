'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartSidebar from '@/components/cart/CartSidebar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, Order, Product, Category } from '@/lib/db';
import { Plus, Edit2, Trash2, ShieldAlert, Bell, DollarSign, ListOrdered, Check, AlertTriangle, EyeOff, RotateCcw, Tag, X, Activity, MapPin, Sliders, Star, ChevronUp, ChevronDown, Pencil } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBranch } from '@/context/BranchContext';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useModal } from '@/context/ModalContext';

export default function AdminDashboardPage() {
  const { t, locale } = useLanguage();
  const { confirm, prompt, alert } = useModal();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const { user, profile, role, isAuthenticated, isLoading } = useAuth();
  const { selectedBranchId, selectBranch, allBranches, userBranches, hasGlobalAccess, isGlobalView, storeStatus, fetchStoreStatus, refetchBranches } = useBranch();

  // Tab state: 'ORDERS', 'MENU', 'COUPONS', 'CHAT', 'LOGS' or 'REVIEWS'
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'MENU' | 'COUPONS' | 'CHAT' | 'LOGS' | 'REVIEWS'>('ORDERS');
  const [showClosedChats, setShowClosedChats] = useState(false);
  // Legacy filter kept for UI compat; now synced from BranchContext
  const filterBranchId = selectedBranchId || 'ALL';
  const setFilterBranchId = (id: string) => selectBranch(id === 'ALL' ? null : id);
  
  // Audio state
  const [alertAudioEnabled, setAlertAudioEnabled] = useState(true);
  const previousOrdersCountRef = useRef<number>(0);

  // Menu editor modal state
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isCustomPricing, setIsCustomPricing] = useState(false);

  // Branch Overrides Modal state
  const [branchOverrideProduct, setBranchOverrideProduct] = useState<Product | null>(null);
  const [branchOverrides, setBranchOverrides] = useState<{ branch_id: string; price_single: string; price_double: string; is_available: boolean }[]>([]);
  const [isSavingOverrides, setIsSavingOverrides] = useState(false);

  // Customizations Mapping Modal state
  const [customizationMappingProduct, setCustomizationMappingProduct] = useState<Product | null>(null);
  const [selectedMappingProductIds, setSelectedMappingProductIds] = useState<string[]>([]);
  const [customizationGroupsList, setCustomizationGroupsList] = useState<any[]>([]);
  const [assignedCustomizationGroupIds, setAssignedCustomizationGroupIds] = useState<string[]>([]);
  const [isSavingCustomizations, setIsSavingCustomizations] = useState(false);
  const [applyProductsExpanded, setApplyProductsExpanded] = useState(false);
  const [showStatsOverlay, setShowStatsOverlay] = useState(false);
  const [selectedStatsOrder, setSelectedStatsOrder] = useState<Order | null>(null);
  const [statsFilter, setStatsFilter] = useState<'DAY' | 'WEEK' | 'MONTH' | 'ALL'>('ALL');

  // Inline cell editing states
  const [inlineEditCell, setInlineEditCell] = useState<{ productId: string; field: 'nameEn' | 'nameAr' | 'descEn' | 'descAr' | 'priceSingle' | 'priceDouble' | 'categoryId' | 'imageUrl' } | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>('');
  const [inlineEditValueDouble, setInlineEditValueDouble] = useState<string>('');

  // Customization group management inside the customization modal
  const [showAddGroupForm, setShowAddGroupForm] = useState(false);
  const [newGroupNameEn, setNewGroupNameEn] = useState('');
  const [newGroupNameAr, setNewGroupNameAr] = useState('');
  const [newGroupMin, setNewGroupMin] = useState('0');
  const [newGroupMax, setNewGroupMax] = useState('1');
  const [newGroupOptionsList, setNewGroupOptionsList] = useState<{ name_en: string; name_ar: string; price: number }[]>([]);
  const [manualOptNameEn, setManualOptNameEn] = useState('');
  const [manualOptNameAr, setManualOptNameAr] = useState('');
  const [manualOptPrice, setManualOptPrice] = useState('');
  const [manualOptFree, setManualOptFree] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [selectedImportProductIds, setSelectedImportProductIds] = useState<string[]>([]);
  const [quickAddSelectedId, setQuickAddSelectedId] = useState<string>('');
  const [quickAddPrice, setQuickAddPrice] = useState<string>('');
  const [quickAddFree, setQuickAddFree] = useState<boolean>(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
      
      setEditingProduct((prev: any) => ({ ...prev, imageUrl: data.publicUrl }));
    } catch (error) {
      console.error('Error uploading image:', error);
      await alert(locale === 'en' ? 'Failed to upload image' : 'فشل تحميل الصورة');
    } finally {
      setIsUploadingImage(false);
    }
  };

  useEffect(() => {
    setMounted(true);

    const checkEdit = async () => {
      // Handle auto-edit redirect param
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const editId = params.get('edit');
        if (editId) {
          if (role === 'OWNER' || role === 'ADMIN') {
            setActiveTab('MENU');
            const prod = await db.getProductById(editId);
            if (prod) {
              setEditingProduct(prod);
              setIsEditingProduct(true);
            }
          } else {
            await alert('Access Denied: Staff accounts are not permitted to edit menu configurations.');
          }
        }
      }
    };

    checkEdit();
    if (role === 'CUSTOMER_SERVICE') {
      setActiveTab('CHAT');
    }
  }, [role]);

  // Poll orders database every 2 seconds for live kitchen updates!
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['admin-orders', filterBranchId],
    queryFn: () => db.getOrders(
      filterBranchId && filterBranchId !== 'ALL'
        ? { branchId: filterBranchId }
        : undefined
    ),
    refetchInterval: 2000,
    enabled: isAuthenticated && ['OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER', 'STAFF', 'CUSTOMER_SERVICE'].includes(role || ''),
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['admin-products', filterBranchId],
    queryFn: () => db.getProducts(
      undefined,
      filterBranchId && filterBranchId !== 'ALL' ? filterBranchId : undefined
    ),
    refetchInterval: 2000,
    enabled: isAuthenticated && ['OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER', 'STAFF', 'CUSTOMER_SERVICE'].includes(role || ''),
  });

  const [filterEditCategoryId, setFilterEditCategoryId] = useState<string>('ALL');

  const displayedProducts = filterEditCategoryId === 'ALL'
    ? products
    : products.filter((p) => p.categoryId === filterEditCategoryId || p.categoryIds?.includes(filterEditCategoryId));

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['admin-categories'],
    queryFn: () => db.getCategories(),
    enabled: isAuthenticated && ['OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER', 'STAFF', 'CUSTOMER_SERVICE'].includes(role || ''),
  });

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ['admin-branches'],
    queryFn: () => db.getBranches(),
    enabled: isAuthenticated && ['OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER', 'STAFF', 'CUSTOMER_SERVICE'].includes(role || ''),
  });

  // Category management state
  const supabase = createClient();
  const canManageCategories = role && ['OWNER', 'HEAD_ADMIN', 'DEVELOPER'].includes(role);

  const handleToggleStoreStatus = async () => {
    try {
      if (filterBranchId === 'ALL') {
        if (!hasGlobalAccess) return;
        const newStatus = storeStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
        
        const { data } = await supabase
          .from('restaurant_settings')
          .select('key')
          .eq('key', 'restaurant_status')
          .is('branch_id', null);

        if (data && data.length > 0) {
          const { error } = await supabase
            .from('restaurant_settings')
            .update({ value: newStatus })
            .eq('key', 'restaurant_status')
            .is('branch_id', null);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('restaurant_settings')
            .insert({ key: 'restaurant_status', value: newStatus });
          if (error) throw error;
        }
        
        await fetchStoreStatus();
        alert(
          locale === 'en' 
            ? `Whole restaurant status set to ${newStatus}` 
            : `تم تغيير حالة المطعم بالكامل إلى ${newStatus === 'OPEN' ? 'يعمل' : 'مغلق'}`,
          locale === 'en' ? 'Success' : 'نجاح'
        );
      } else {
        const hasBranchPermission = hasGlobalAccess || userBranches.some(b => b.id === filterBranchId);
        if (!hasBranchPermission) {
          alert(
            locale === 'en' 
              ? 'Access Denied: You do not have permission to manage this branch' 
              : 'تم رفض الدخول: ليس لديك صلاحية لإدارة هذا الفرع',
            locale === 'en' ? 'Access Denied' : 'غير مسموح'
          );
          return;
        }

        const branchObj = allBranches.find(b => b.id === filterBranchId);
        if (!branchObj) return;
        const newStatus = branchObj.status === 'OPEN' ? 'CLOSED' : 'OPEN';
        
        const { error } = await supabase
          .from('branches')
          .update({ status: newStatus })
          .eq('id', filterBranchId);

        if (error) throw error;
        
        await refetchBranches();
        alert(
          locale === 'en' 
            ? `Branch status set to ${newStatus}` 
            : `تم تغيير حالة الفرع إلى ${newStatus === 'OPEN' ? 'يعمل' : 'مغلق'}`,
          locale === 'en' ? 'Success' : 'نجاح'
        );
      }
    } catch (e: any) {
      alert('Error updating status: ' + e.message);
    }
  };

  const handleMoveCategory = async (catId: string, direction: 'UP' | 'DOWN') => {
    const idx = adminCategories.findIndex((c: any) => c.id === catId);
    if (idx === -1) return;
    const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= adminCategories.length) return;

    const currentCat = adminCategories[idx];
    const targetCat = adminCategories[targetIdx];

    let currentOrder = currentCat.sort_order;
    let targetOrder = targetCat.sort_order;

    if (currentOrder === targetOrder || currentOrder === null || targetOrder === null) {
      for (let i = 0; i < adminCategories.length; i++) {
        await supabase
          .from('categories')
          .update({ sort_order: i })
          .eq('id', adminCategories[i].id);
      }
      refetchCategories();
      setTimeout(() => handleMoveCategory(catId, direction), 500);
      return;
    }

    const { error: err1 } = await supabase
      .from('categories')
      .update({ sort_order: targetOrder })
      .eq('id', currentCat.id);
    const { error: err2 } = await supabase
      .from('categories')
      .update({ sort_order: currentOrder })
      .eq('id', targetCat.id);

    if (err1 || err2) {
      alert(locale === 'en' ? 'Failed to move category' : 'فشل نقل القسم');
    } else {
      refetchCategories();
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    }
  };

  const handleMoveProduct = async (productId: string, direction: 'UP' | 'DOWN') => {
    const idx = products.findIndex((p) => p.id === productId);
    if (idx === -1) return;
    const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= products.length) return;

    const currentProd = products[idx];
    const targetProd = products[targetIdx];

    let currentOrder = currentProd.sortOrder;
    let targetOrder = targetProd.sortOrder;

    if (currentOrder === targetOrder || currentOrder === null || targetOrder === null || currentOrder === undefined || targetOrder === undefined) {
      for (let i = 0; i < products.length; i++) {
        await supabase
          .from('menu_items')
          .update({ sort_order: i })
          .eq('id', products[i].id);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setTimeout(() => handleMoveProduct(productId, direction), 500);
      return;
    }

    const { error: err1 } = await supabase
      .from('menu_items')
      .update({ sort_order: targetOrder })
      .eq('id', currentProd.id);
    const { error: err2 } = await supabase
      .from('menu_items')
      .update({ sort_order: currentOrder })
      .eq('id', targetProd.id);

    if (err1 || err2) {
      alert(locale === 'en' ? 'Failed to move product' : 'فشل نقل المنتج');
    } else {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    }
  };

  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null);
  const [dragOverProdId, setDragOverProdId] = useState<string | null>(null);

  const handleReorderCategories = async (draggedId: string, targetId: string) => {
    const dragIdx = adminCategories.findIndex((c: any) => c.id === draggedId);
    const targetIdx = adminCategories.findIndex((c: any) => c.id === targetId);
    if (dragIdx === -1 || targetIdx === -1 || dragIdx === targetIdx) return;

    const updatedList = [...adminCategories];
    const [removed] = updatedList.splice(dragIdx, 1);
    updatedList.splice(targetIdx, 0, removed);

    const success = await db.reorderCategories(updatedList.map((c: any) => c.id));

    if (!success) {
      alert(locale === 'en' ? 'Failed to reorder categories' : 'فشل إعادة ترتيب الأقسام');
    } else {
      refetchCategories();
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    }
  };

  const handleReorderProducts = async (draggedId: string, targetId: string) => {
    const dragIdx = displayedProducts.findIndex((p) => p.id === draggedId);
    const targetIdx = displayedProducts.findIndex((p) => p.id === targetId);
    if (dragIdx === -1 || targetIdx === -1 || dragIdx === targetIdx) return;

    const updatedList = [...displayedProducts];
    const [removed] = updatedList.splice(dragIdx, 1);
    updatedList.splice(targetIdx, 0, removed);

    const success = await db.reorderProducts(updatedList.map((p) => p.id));

    if (!success) {
      alert(locale === 'en' ? 'Failed to reorder items' : 'فشل إعادة ترتيب المنتجات');
    } else {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    }
  };

  const [editingCategory, setEditingCategory] = useState<any | null>(null);

  const { data: adminCategories = [], refetch: refetchCategories } = useQuery({
    queryKey: ['admin-categories-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data || [];
    },
    enabled: isAuthenticated,
  });

  const saveCategoryMutation = useMutation({
    mutationFn: async (cat: { id?: string; name_en: string; name_ar: string; desc_en?: string; desc_ar?: string; is_default?: boolean }) => {
      if (cat.is_default) {
        await supabase
          .from('categories')
          .update({ is_default: false })
          .neq('id', cat.id || '00000000-0000-0000-0000-000000000000');
      }

      if (cat.id) {
        const { error } = await supabase
          .from('categories')
          .update({
            name_en: cat.name_en,
            name_ar: cat.name_ar || cat.name_en,
            desc_en: cat.desc_en || '',
            desc_ar: cat.desc_ar || '',
            is_default: cat.is_default || false,
          })
          .eq('id', cat.id);
        if (error) throw error;
      } else {
        const maxOrder = adminCategories.reduce((m: number, c: any) => Math.max(m, c.sort_order || 0), 0);
        const { error } = await supabase.from('categories').insert({
          name_en: cat.name_en,
          name_ar: cat.name_ar || cat.name_en,
          desc_en: cat.desc_en || '',
          desc_ar: cat.desc_ar || '',
          is_default: cat.is_default || false,
          sort_order: maxOrder + 1,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      const action = variables.id ? 'EDITED_CATEGORY' : 'CREATED_CATEGORY';
      db.logActivity(action, 'category', variables.id || '', { name: variables.name_en });
      refetchCategories();
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setEditingCategory(null);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      db.logActivity('DELETED_CATEGORY', 'category', '');
      refetchCategories();
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  // Coupons states & React Query
  const [isAddingCoupon, setIsAddingCoupon] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [newCouponValue, setNewCouponValue] = useState(0);
  const [newCouponExpiry, setNewCouponExpiry] = useState('');
  const [newCouponBranchId, setNewCouponBranchId] = useState('');
  const [newCouponMaxUsesPerUser, setNewCouponMaxUsesPerUser] = useState<string>('');
  const [newCouponUsageLimit, setNewCouponUsageLimit] = useState<string>('');
  const [newCouponCategoryId, setNewCouponCategoryId] = useState('');

  const handleOpenAddCoupon = () => {
    if (!hasGlobalAccess && userBranches.length > 0) {
      setNewCouponBranchId(userBranches[0].id);
    } else {
      setNewCouponBranchId('');
    }
    setIsAddingCoupon(true);
  };

  const { data: coupons = [] } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => db.getCoupons(),
    enabled: isAuthenticated && ['OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER', 'STAFF'].includes(role || ''),
  });

  const createCouponMutation = useMutation({
    mutationFn: (data: { 
      code: string; 
      discountType: 'PERCENT' | 'FIXED'; 
      discountValue: number; 
      expiryDate: Date; 
      branchId?: string | null;
      maxUsesPerUser?: number | null;
      usageLimit?: number | null;
      applicableCategoryId?: string | null;
    }) => db.createCoupon(data),
    onSuccess: () => {
      db.logActivity('CREATED_COUPON', 'coupon', '', { code: newCouponCode });
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setIsAddingCoupon(false);
      setNewCouponCode('');
      setNewCouponValue(0);
      setNewCouponExpiry('');
      setNewCouponBranchId('');
      setNewCouponMaxUsesPerUser('');
      setNewCouponUsageLimit('');
      setNewCouponCategoryId('');
    },
  });

  // Discounts states & React Query
  const [isAddingDiscount, setIsAddingDiscount] = useState(false);
  const [newDiscountName, setNewDiscountName] = useState('');
  const [newDiscountType, setNewDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [newDiscountValue, setNewDiscountValue] = useState(0);
  const [newDiscountAppliesTo, setNewDiscountAppliesTo] = useState('ALL');
  const [newDiscountBranchId, setNewDiscountBranchId] = useState('');

  const handleOpenAddDiscount = () => {
    if (!hasGlobalAccess && userBranches.length > 0) {
      setNewDiscountBranchId(userBranches[0].id);
    } else {
      setNewDiscountBranchId('');
    }
    setIsAddingDiscount(true);
  };

  const { data: discounts = [] } = useQuery({
    queryKey: ['admin-discounts'],
    queryFn: () => db.getDiscounts(),
    enabled: isAuthenticated && ['OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER', 'STAFF'].includes(role || ''),
  });

  const createDiscountMutation = useMutation({
    mutationFn: (data: { name: string; discountType: 'PERCENT' | 'FIXED'; discountValue: number; appliesTo: string; branchId?: string | null }) =>
      db.createDiscount(data),
    onSuccess: () => {
      db.logActivity('CREATED_DISCOUNT', 'discount', '', { name: newDiscountName });
      queryClient.invalidateQueries({ queryKey: ['admin-discounts'] });
      setIsAddingDiscount(false);
      setNewDiscountName('');
      setNewDiscountValue(0);
      setNewDiscountAppliesTo('ALL');
      setNewDiscountBranchId('');
    },
  });

  const toggleDiscountMutation = useMutation({
    mutationFn: (data: { id: string; isActive: boolean }) =>
      db.toggleDiscount(data.id, data.isActive),
    onSuccess: (_, variables) => {
      db.logActivity('TOGGLED_DISCOUNT', 'discount', variables.id, { isActive: variables.isActive });
      queryClient.invalidateQueries({ queryKey: ['admin-discounts'] });
    },
  });

  // Settings query & toggle reviews setting mutation
  const { data: legacySettings = [] } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('restaurant_settings').select('*');
      if (error) throw error;
      return data || [];
    },
    enabled: isAuthenticated,
  });

  const toggleReviewsActiveMutation = useMutation({
    mutationFn: async (newValue: string) => {
      const { data, error: selectErr } = await supabase
        .from('restaurant_settings')
        .select('id')
        .eq('key', 'reviews_active')
        .is('branch_id', null);
      
      if (selectErr) throw selectErr;

      if (data && data.length > 0) {
        const { error } = await supabase
          .from('restaurant_settings')
          .update({ value: newValue })
          .eq('key', 'reviews_active')
          .is('branch_id', null);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('restaurant_settings')
          .insert({ key: 'reviews_active', value: newValue, branch_id: null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-settings'] });
    },
  });

  // Admin Reviews query & status mutation
  const { data: adminReviews = [] } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: () => db.getReviews(undefined, true), // includeAllForAdmin = true
    enabled: isAuthenticated && ['OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER'].includes(role || ''),
  });

  const updateReviewStatusMutation = useMutation({
    mutationFn: async (data: { id: string; status: 'APPROVED' | 'REJECTED' }) => {
      const ok = await db.updateReviewStatus(data.id, data.status);
      if (!ok) throw new Error('Failed to update review status');
      return ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
    onError: (err: any) => {
      alert(locale === 'en' ? 'Failed to update review status. Please check your permissions.' : 'فشل في تحديث حالة التقييم. يرجى التحقق من الصلاحيات.');
    }
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['admin-drivers'],
    queryFn: () => db.getDrivers(),
    enabled: isAuthenticated && ['OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER', 'STAFF', 'CUSTOMER_SERVICE'].includes(role || ''),
  });

  // Support Chat admin states
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [activeChatUserName, setActiveChatUserName] = useState('');
  const [adminChatText, setAdminChatText] = useState('');
  const adminChatBottomRef = useRef<HTMLDivElement>(null);

  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const { data: activeChats = [] } = useQuery({
    queryKey: ['active-chats', filterBranchId],
    queryFn: async () => {
      const chats = await db.getActiveChats(['OWNER', 'HEAD_ADMIN', 'DEVELOPER', 'ADMIN', 'STAFF', 'CUSTOMER_SERVICE'].includes(role || ''));
      if (filterBranchId && filterBranchId !== 'ALL') {
        return chats.filter((c: any) => !c.branchId || c.branchId === filterBranchId);
      }
      return chats;
    },
    refetchInterval: 2000,
    enabled: isAuthenticated && ['OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER', 'STAFF', 'CUSTOMER_SERVICE'].includes(role || ''),
  });

  const { data: adminChatMessages = [] } = useQuery({
    queryKey: ['admin-chat-messages', activeChatUserId],
    queryFn: () => (activeChatUserId ? db.getChatMessages(activeChatUserId) : Promise.resolve([])),
    refetchInterval: 2000,
    enabled: isAuthenticated && ['OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER', 'STAFF', 'CUSTOMER_SERVICE'].includes(role || '') && !!activeChatUserId,
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

  const closeChatMutation = useMutation({
    mutationFn: (chatId: string) => db.closeChatSession(chatId),
    onSuccess: () => {
      db.logActivity('CLOSED_CHAT', 'chat', activeChatId || '');
      queryClient.invalidateQueries({ queryKey: ['active-chats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-chat-messages', activeChatUserId] });
      setActiveChatId(null);
      setActiveChatUserId(null);
    },
  });

  const { data: settings = [], refetch: refetchSettings } = useQuery<any[]>({
    queryKey: ['restaurant-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('key, value');
      if (error) throw error;
      return data || [];
    },
  });

  const saveSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data, error: selectErr } = await supabase
        .from('restaurant_settings')
        .select('id')
        .eq('key', key)
        .is('branch_id', null);
      
      if (selectErr) throw selectErr;

      if (data && data.length > 0) {
        const { error } = await supabase
          .from('restaurant_settings')
          .update({
            value,
            updated_at: new Date().toISOString(),
          })
          .eq('key', key)
          .is('branch_id', null);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('restaurant_settings')
          .insert({
            key,
            value,
            branch_id: null,
            updated_at: new Date().toISOString(),
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      refetchSettings();
      queryClient.invalidateQueries({ queryKey: ['restaurant-settings'] });
    },
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => db.getAuditLogs(),
    enabled: isAuthenticated && ['OWNER', 'HEAD_ADMIN', 'DEVELOPER'].includes(role || ''),
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

  const [acknowledgedCancellations, setAcknowledgedCancellations] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('acknowledged-cancellations');
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const handleAcknowledgeCancellation = (orderId: string) => {
    setAcknowledgedCancellations((prev) => {
      const next = [...prev, orderId];
      if (typeof window !== 'undefined') {
        localStorage.setItem('acknowledged-cancellations', JSON.stringify(next));
      }
      return next;
    });
  };

  const customerCancelledOrders = (orders || []).filter((o) => {
    const isCancelledByCust = o.status === 'CANCELLED' && 
      (o.cancellationReason === 'Cancelled by Customer' || o.cancellationReason === 'تم الإلغاء بواسطة العميل');
    const isRecent = Date.now() - new Date(o.updatedAt).getTime() < 10 * 60 * 1000;
    return isCancelledByCust && isRecent && !acknowledgedCancellations.includes(o.id);
  });

  const previousCancelledCountRef = useRef(0);
  useEffect(() => {
    const count = customerCancelledOrders.length;
    if (count > previousCancelledCountRef.current && alertAudioEnabled) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playBeep = (time: number, freq: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.frequency.setValueAtTime(freq, time);
          gain.gain.setValueAtTime(0.3, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
          osc.start(time);
          osc.stop(time + 0.15);
        };
        playBeep(audioCtx.currentTime, 880);
        playBeep(audioCtx.currentTime + 0.2, 880);
      } catch (e) {
        console.warn('Audio alert blocked or unsupported.');
      }
    }
    previousCancelledCountRef.current = count;
  }, [customerCancelledOrders, alertAudioEnabled]);

  // MUTATIONS
  const acceptOrderMutation = useMutation({
    mutationFn: (orderId: string) => db.updateOrderStatus(orderId, 'PREPARING'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (data: { orderId: string; reason: string }) => {
      const res = await fetch(`/api/orders/${data.orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED', cancellationReason: data.reason }),
      });
      if (!res.ok) throw new Error('Failed to cancel order');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data: { orderId: string; status: Order['status'] }) => {
      const res = await fetch(`/api/orders/${data.orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: data.status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
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
    mutationFn: async (data: { productId: string; isAvailable: boolean }) => {
      if (filterBranchId && filterBranchId !== 'ALL') {
        return db.updateProductBranchOverride(data.productId, filterBranchId, {
          isAvailable: data.isAvailable,
        });
      } else {
        return db.updateProduct(data.productId, { isAvailable: data.isAvailable });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  const saveProductMutation = useMutation({
    mutationFn: async (prod: Partial<Product>) => {
      if (!prod.id) {
        return db.createProduct(prod as any);
      }

      if (filterBranchId && filterBranchId !== 'ALL') {
        // Save global details first (so name/description/etc. are updated)
        await db.updateProduct(prod.id, prod);
        
        // Save branch override
        await db.updateProductBranchOverride(prod.id, filterBranchId, {
          priceSingle: prod.priceSingle,
          priceDouble: prod.priceDouble !== undefined ? prod.priceDouble : null,
          isAvailable: prod.isAvailable !== undefined ? prod.isAvailable : true,
        });
        return prod as Product;
      } else {
        return db.updateProduct(prod.id, prod);
      }
    },
    onSuccess: (_, variables) => {
      const action = variables.id ? 'EDITED_PRODUCT' : 'CREATED_PRODUCT';
      db.logActivity(action, 'product', variables.id, { name: variables.nameEn });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setIsEditingProduct(false);
      setEditingProduct(null);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (productId: string) => db.deleteProduct(productId),
    onSuccess: (_, productId) => {
      db.logActivity('DELETED_PRODUCT', 'product', productId);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  if (!mounted || isLoading) return null;

  // Access Protection
  const hasAccess = isAuthenticated && ['OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER', 'STAFF', 'CUSTOMER_SERVICE'].includes(role || '');
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

  const getFilteredStatsOrders = () => {
    const now = new Date();
    return filteredOrders.filter((o) => {
      const orderDate = new Date(o.createdAt);
      const diffTime = Math.abs(now.getTime() - orderDate.getTime());
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (statsFilter === 'DAY') return diffDays <= 1;
      if (statsFilter === 'WEEK') return diffDays <= 7;
      if (statsFilter === 'MONTH') return diffDays <= 30;
      return true; // ALL
    });
  };

  const statsOrders = getFilteredStatsOrders();
  const statsDeliveredOrders = statsOrders.filter((o) => o.status === 'DELIVERED');
  const statsRevenue = statsDeliveredOrders.reduce((sum, o) => sum + o.total, 0);
  const statsCount = statsOrders.length;
  const statsAOV = statsDeliveredOrders.length > 0 ? Math.round(statsRevenue / statsDeliveredOrders.length) : 0;

  const handleOpenBranchOverrides = async (product: Product) => {
    setBranchOverrideProduct(product);
    setBranchOverrides([]);
    try {
      const { data, error } = await supabase
        .from('branch_menu_items')
        .select('*')
        .eq('menu_item_id', product.id);
      if (!error && data) {
        setBranchOverrides(
          allBranches.map((branch) => {
            const match = data.find((bmi: any) => bmi.branch_id === branch.id);
            return {
              branch_id: branch.id,
              price_single: match && match.price_single !== null ? String(match.price_single) : '',
              price_double: match && match.price_double !== null ? String(match.price_double) : '',
              is_available: match && match.is_available !== null ? match.is_available : true,
            };
          })
        );
      } else {
        setBranchOverrides(
          allBranches.map((branch) => ({
            branch_id: branch.id,
            price_single: '',
            price_double: '',
            is_available: true,
          }))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveBranchOverrides = async () => {
    if (!branchOverrideProduct) return;
    setIsSavingOverrides(true);
    try {
      for (const override of branchOverrides) {
        if (override.price_single.trim()) {
          const { error } = await supabase.from('branch_menu_items').upsert({
            branch_id: override.branch_id,
            menu_item_id: branchOverrideProduct.id,
            price_single: parseFloat(override.price_single),
            price_double: override.price_double.trim() ? parseFloat(override.price_double) : null,
            is_available: override.is_available,
          });
          if (error) throw error;
        } else {
          await supabase
            .from('branch_menu_items')
            .delete()
            .eq('branch_id', override.branch_id)
            .eq('menu_item_id', branchOverrideProduct.id);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setBranchOverrideProduct(null);
    } catch (e: any) {
      alert('Save overrides failed: ' + e.message);
    } finally {
      setIsSavingOverrides(false);
    }
  };

  const handleOpenCustomizationMapping = async (product: Product) => {
    setCustomizationMappingProduct(product);
    setSelectedMappingProductIds([product.id]);
    setIsSavingCustomizations(false);
    setApplyProductsExpanded(false);
    setShowAddGroupForm(false);
    setNewGroupNameEn('');
    setNewGroupNameAr('');
    setNewGroupMin('0');
    setNewGroupMax('1');
    setNewGroupOptionsList([]);
    await fetchCustomizationsData(product.id);
  };

  const fetchCustomizationsData = async (productId: string) => {
    try {
      const { data: groups, error: err1 } = await supabase
        .from('customization_groups')
        .select('*, customization_options(*)');
      if (grpErrCheck(err1)) throw err1;
      setCustomizationGroupsList(groups || []);

      const { data: mappings, error: err2 } = await supabase
        .from('menu_item_customization_groups')
        .select('group_id')
        .eq('menu_item_id', productId);
      if (err2) throw err2;
      setAssignedCustomizationGroupIds(mappings ? mappings.map((m: any) => m.group_id) : []);
    } catch (e) {
      console.error(e);
    }
  };

  const grpErrCheck = (err: any) => {
    return !!err;
  };

  const handleSaveCustomizationsMapping = async () => {
    if (selectedMappingProductIds.length === 0) {
      alert('Please select at least one product.');
      return;
    }
    setIsSavingCustomizations(true);
    try {
      const { error: delErr } = await supabase
        .from('menu_item_customization_groups')
        .delete()
        .in('menu_item_id', selectedMappingProductIds);
      if (delErr) throw delErr;

      if (assignedCustomizationGroupIds.length > 0) {
        const rows: any[] = [];
        selectedMappingProductIds.forEach((prodId) => {
          assignedCustomizationGroupIds.forEach((groupId) => {
            rows.push({
              menu_item_id: prodId,
              group_id: groupId,
            });
          });
        });
        const { error: insErr } = await supabase
          .from('menu_item_customization_groups')
          .insert(rows);
        if (insErr) throw insErr;
      }

      queryClient.invalidateQueries({ queryKey: ['products'] });
      setCustomizationMappingProduct(null);
    } catch (e: any) {
      alert('Save failed: ' + e.message);
    } finally {
      setIsSavingCustomizations(false);
    }
  };

  const handleDeleteCustomizationGroup = async (groupId: string) => {
    if (!confirm(locale === 'en' ? 'Are you sure you want to delete this customization group?' : 'هل أنت متأكد من حذف مجموعة الخيارات هذه؟')) return;
    try {
      const { error } = await supabase
        .from('customization_groups')
        .delete()
        .eq('id', groupId);
      if (error) throw error;
      
      if (customizationMappingProduct) {
        await fetchCustomizationsData(customizationMappingProduct.id);
      }
    } catch (e: any) {
      alert('Delete failed: ' + e.message);
    }
  };

  const handleCreateCustomizationGroup = async () => {
    if (!newGroupNameEn.trim() || !newGroupNameAr.trim()) {
      alert('Please fill out name in English and Arabic');
      return;
    }
    if (newGroupOptionsList.length === 0) {
      alert('Please add at least one option to this group.');
      return;
    }
    try {
      let groupId = editingGroupId;

      if (editingGroupId) {
        const { error: grpErr } = await supabase
          .from('customization_groups')
          .update({
            name_en: newGroupNameEn.trim(),
            name_ar: newGroupNameAr.trim(),
            min_selected: parseInt(newGroupMin) || 0,
            max_selected: parseInt(newGroupMax) || 1,
          })
          .eq('id', editingGroupId);
        if (grpErr) throw grpErr;

        const { error: delErr } = await supabase
          .from('customization_options')
          .delete()
          .eq('group_id', editingGroupId);
        if (delErr) throw delErr;
      } else {
        const { data: group, error: grpErr } = await supabase
          .from('customization_groups')
          .insert({
            name_en: newGroupNameEn.trim(),
            name_ar: newGroupNameAr.trim(),
            min_selected: parseInt(newGroupMin) || 0,
            max_selected: parseInt(newGroupMax) || 1,
          })
          .select()
          .single();
        if (grpErr) throw grpErr;
        groupId = group.id;
      }

      const rows = newGroupOptionsList.map(opt => ({
        group_id: groupId,
        name_en: opt.name_en || 'Option',
        name_ar: opt.name_ar || 'خيار',
        price: opt.price || 0,
      }));

      if (rows.length > 0) {
        const { error: optErr } = await supabase
          .from('customization_options')
          .insert(rows);
        if (optErr) throw optErr;
      }

      if (customizationMappingProduct) {
        await fetchCustomizationsData(customizationMappingProduct.id);
      }

      setShowAddGroupForm(false);
      setEditingGroupId(null);
      setNewGroupNameEn('');
      setNewGroupNameAr('');
      setNewGroupMin('0');
      setNewGroupMax('1');
      setNewGroupOptionsList([]);
    } catch (e: any) {
      alert('Save customization group failed: ' + e.message);
    }
  };

  const handleOpenAddProduct = () => {
    setIsCustomPricing(false);
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

  const handleOpenEditProduct = async (product: Product) => {
    setIsCustomPricing(false);
    setEditingProduct({ ...product });

    if (filterBranchId && filterBranchId !== 'ALL') {
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('*, branch_menu_items(*)')
          .eq('id', product.id)
          .single();

        if (!error && data) {
          const override = data.branch_menu_items?.find((bmi: any) => bmi.branch_id === filterBranchId);
          if (override) {
            setIsCustomPricing(true);
            setEditingProduct({
              ...product,
              priceSingle: override.price_single !== null && override.price_single !== undefined ? Number(override.price_single) : Number(data.price_single),
              priceDouble: override.price_double !== null && override.price_double !== undefined ? Number(override.price_double) : (data.price_double ? Number(data.price_double) : undefined),
              isAvailable: override.is_available !== null && override.is_available !== undefined ? override.is_available : data.is_available,
            });
          }
        }
      } catch (err) {
        console.error('Error fetching product overrides:', err);
      }
    }

    setIsEditingProduct(true);
  };

  const handleInlineEditSave = (product: Product, field: 'nameEn' | 'nameAr' | 'descEn' | 'descAr' | 'priceSingle' | 'priceDouble' | 'categoryId' | 'imageUrl') => {
    if (!inlineEditCell) return;

    const updatedProd: Partial<Product> = { id: product.id };

    if (field === 'nameEn') {
      if (!inlineEditValue.trim()) { setInlineEditCell(null); return; }
      updatedProd.nameEn = inlineEditValue.trim();
    } else if (field === 'nameAr') {
      if (!inlineEditValue.trim()) { setInlineEditCell(null); return; }
      updatedProd.nameAr = inlineEditValue.trim();
    } else if (field === 'descEn') {
      updatedProd.descEn = inlineEditValue.trim();
    } else if (field === 'descAr') {
      updatedProd.descAr = inlineEditValue.trim();
    } else if (field === 'priceSingle') {
      const val = parseFloat(inlineEditValue);
      if (isNaN(val) || val < 0) { setInlineEditCell(null); return; }
      updatedProd.priceSingle = val;
    } else if (field === 'priceDouble') {
      const val = inlineEditValue.trim() ? parseFloat(inlineEditValue) : undefined;
      updatedProd.priceDouble = (val !== undefined && !isNaN(val)) ? val : undefined;
    } else if (field === 'categoryId') {
      updatedProd.categoryId = inlineEditValue;
    } else if (field === 'imageUrl') {
      if (!inlineEditValue.trim()) { setInlineEditCell(null); return; }
      updatedProd.imageUrl = inlineEditValue.trim();
    }

    const fullProd = { ...product, ...updatedProd };
    saveProductMutation.mutate(fullProd);
    setInlineEditCell(null);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    saveProductMutation.mutate(editingProduct);
  };

  // Pre-computed chat lists (used by CHAT tab without IIFE)
  const sortedChats = [...activeChats].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const chatOpenSessions = sortedChats.filter(c => c.status !== 'CLOSED');
  const chatClosedSessions = sortedChats.filter(c => c.status === 'CLOSED');

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
            {/* Branch Filter Dropdown & Status Toggle */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2 bg-card border border-card-border px-4 py-2.5 rounded-2xl w-full sm:w-auto">
                <span className="text-[10px] text-text-muted font-bold uppercase shrink-0">{locale === 'en' ? 'Branch:' : 'الفرع:'}</span>
                <select
                  value={filterBranchId}
                  onChange={(e) => setFilterBranchId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer flex-1 sm:flex-none"
                >
                  {hasGlobalAccess && (
                    <option value="ALL" className="bg-[#18181B] text-white font-bold">{locale === 'en' ? '🌐 All Branches' : '🌐 جميع الفروع'}</option>
                  )}
                  {(hasGlobalAccess ? allBranches : userBranches).map((b) => (
                    <option key={b.id} value={b.id} className="bg-[#18181B] text-white font-bold">
                      {locale === 'en' ? b.nameEn : b.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              {(() => {
                const isCurrentlyOpen = filterBranchId === 'ALL'
                  ? storeStatus === 'OPEN'
                  : (allBranches.find(b => b.id === filterBranchId)?.status !== 'CLOSED');
                
                const canManageCurrentStatus = filterBranchId === 'ALL'
                  ? hasGlobalAccess
                  : (hasGlobalAccess || userBranches.some(b => b.id === filterBranchId));

                return (
                  <button
                    onClick={handleToggleStoreStatus}
                    disabled={!canManageCurrentStatus}
                    className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                      isCurrentlyOpen
                        ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/10'
                        : 'bg-primary-red hover:bg-primary-red-hover text-white shadow-red-500/10'
                    }`}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        isCurrentlyOpen ? 'bg-green-400' : 'bg-red-400'
                      }`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${
                        isCurrentlyOpen ? 'bg-green-300' : 'bg-red-500'
                      }`}></span>
                    </span>
                    <span>
                      {filterBranchId === 'ALL'
                        ? (locale === 'en'
                            ? `Store: ${isCurrentlyOpen ? 'OPEN' : 'CLOSED'}`
                            : `المطعم: ${isCurrentlyOpen ? 'مفتوح' : 'مغلق'}`)
                        : (locale === 'en'
                            ? `Branch: ${isCurrentlyOpen ? 'OPEN' : 'CLOSED'}`
                            : `الفرع: ${isCurrentlyOpen ? 'مفتوح' : 'مغلق'}`)}
                    </span>
                  </button>
                );
              })()}
            </div>

            {/* Desktop Navigation for Main Tabs */}
            <div className="hidden md:flex gap-1 bg-[#18181B] p-1 rounded-xl border border-card-border">
              {role !== 'CUSTOMER_SERVICE' && (
                <button
                  onClick={() => setActiveTab('ORDERS')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'ORDERS' ? 'bg-primary-red text-white shadow-md shadow-primary-red/20' : 'text-text-muted hover:text-white hover:bg-card-border'
                  }`}
                >
                  {locale === 'en' ? 'Orders' : 'الطلبات'}
                </button>
              )}
              
              {['OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER', 'STAFF', 'CUSTOMER_SERVICE'].includes(role || '') && (
                <>
                  {['OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER'].includes(role || '') && (
                    <button
                      onClick={() => setActiveTab('MENU')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeTab === 'MENU' ? 'bg-primary-red text-white shadow-md shadow-primary-red/20' : 'text-text-muted hover:text-white hover:bg-card-border'
                      }`}
                    >
                      {locale === 'en' ? 'Menu' : 'المنيو'}
                    </button>
                  )}
                  {['OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER'].includes(role || '') && (
                    <button
                      onClick={() => setActiveTab('COUPONS')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeTab === 'COUPONS' ? 'bg-primary-red text-white shadow-md shadow-primary-red/20' : 'text-text-muted hover:text-white hover:bg-card-border'
                      }`}
                    >
                      {locale === 'en' ? 'Coupons' : 'كوبونات'}
                    </button>
                  )}
                  {['OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER'].includes(role || '') && (
                    <button
                      onClick={() => setActiveTab('REVIEWS')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeTab === 'REVIEWS' ? 'bg-primary-red text-white shadow-md shadow-primary-red/20' : 'text-text-muted hover:text-white hover:bg-card-border'
                      }`}
                    >
                      {locale === 'en' ? 'Reviews' : 'التقييمات'}
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
                  {['OWNER', 'HEAD_ADMIN', 'DEVELOPER'].includes(role || '') && (
                    <button
                      onClick={() => setActiveTab('LOGS')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        activeTab === 'LOGS' ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'text-text-muted hover:text-white hover:bg-card-border'
                      }`}
                    >
                      <Activity className="h-3 w-3" />
                      {locale === 'en' ? 'Activity' : 'النشاطات'}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Sub-pages Navigation for Admins — visible on desktop only; on mobile use Header links */}
            <div className="hidden sm:flex gap-2 flex-wrap items-center">
              {['OWNER', 'HEAD_ADMIN', 'DEVELOPER'].includes(role || '') && (
                <>
                  <Link href="/admin/users" className="px-4 py-2 rounded-xl text-[10px] font-bold text-text-muted hover:text-white bg-card border border-card-border hover:bg-card-border/50 transition-all uppercase tracking-wider">
                    {locale === 'en' ? 'Users Mgmt' : 'المستخدمين'}
                  </Link>
                  <Link href="/admin/branches" className="px-4 py-2 rounded-xl text-[10px] font-bold text-text-muted hover:text-white bg-card border border-card-border hover:bg-card-border/50 transition-all uppercase tracking-wider flex items-center gap-1">
                    🏪 {locale === 'en' ? 'Branches' : 'الفروع'}
                  </Link>
                  <Link href="/admin/analytics" className="px-4 py-2 rounded-xl text-[10px] font-bold text-text-muted hover:text-white bg-card border border-card-border hover:bg-card-border/50 transition-all uppercase tracking-wider">
                    {locale === 'en' ? 'Analytics' : 'التحليلات'}
                  </Link>
                  <Link href="/admin/settings" className="px-4 py-2 rounded-xl text-[10px] font-bold text-text-muted hover:text-white bg-card border border-card-border hover:bg-card-border/50 transition-all uppercase tracking-wider flex items-center gap-1">
                    ⚙️ {locale === 'en' ? 'Settings' : 'الإعدادات'}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* OWNER, HEAD_ADMIN & DEVELOPER METRICS PANEL (Only visible if role === OWNER, HEAD_ADMIN or DEVELOPER) */}
        {['OWNER', 'HEAD_ADMIN', 'DEVELOPER'].includes(role || '') && (
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

            <div
              onClick={() => setShowStatsOverlay(true)}
              className="p-4 rounded-2xl bg-[#18181B] border border-card-border hover:border-accent-amber/50 hover:bg-[#1f1f23] transition-all cursor-pointer flex items-center gap-4 text-white group"
            >
              <div className="h-10 w-10 rounded-xl bg-accent-amber/10 text-accent-amber flex items-center justify-center group-hover:scale-110 transition-transform">
                <ListOrdered className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-text-muted block font-semibold group-hover:text-white transition-colors">{t('totalOrdersCount')}</span>
                <span className="text-lg font-black text-white">{totalOrdersCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ACTIVE ORDERS CONTROLLER TAB */}
        {/* ========================================================================= */}
        {activeTab === 'ORDERS' && role !== 'CUSTOMER_SERVICE' && (
          <div className="space-y-6">
            {/* Customer Cancellation Alert Banner */}
            {customerCancelledOrders.length > 0 && (
              <div className="bg-red-500/10 border-2 border-red-500/50 rounded-3xl p-6 space-y-4 shadow-2xl shadow-red-500/10">
                <div className="flex items-center gap-2.5 text-red-500">
                  <span className="relative flex h-3.5 w-3.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                  </span>
                  <h2 className="text-sm font-black uppercase tracking-wider animate-pulse">
                    {locale === 'en' ? '⚠️ ATTENTION: Customer Cancelled Orders!' : '⚠️ تنبيه: طلبات تم إلغاؤها من العملاء!'}
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {customerCancelledOrders.map((o) => (
                    <div key={o.id} className="flex justify-between items-center text-xs text-text-muted bg-[#18181B] p-4 rounded-2xl border border-red-500/25">
                      <div className="space-y-1">
                        <span className="font-extrabold text-white block">ORDER #{o.id}</span>
                        <span className="block font-medium">{o.userName} ({o.userPhone})</span>
                      </div>
                      <button
                        onClick={() => handleAcknowledgeCancellation(o.id)}
                        className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-[10px] font-extrabold rounded-xl transition-all cursor-pointer shadow-md shadow-red-600/15"
                      >
                        {locale === 'en' ? 'Acknowledge' : 'تأكيد'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                      <div className="text-[11px] text-text-muted space-y-1.5">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="space-y-0.5">
                            <div>• {it.quantity}x {locale === 'en' ? it.productNameEn : it.productNameAr} {it.size !== 'NONE' && `(${it.size})`}</div>
                            {it.customizations && it.customizations.length > 0 && (
                              <div className="pl-4 text-[9px] text-accent-amber font-semibold flex flex-wrap gap-1">
                                {it.customizations.map((cust: any, cIdx: number) => (
                                  <span key={cIdx} className="bg-accent-amber/10 border border-accent-amber/20 px-1 py-0.2 rounded">
                                    + {locale === 'en' ? cust.nameEn : cust.nameAr}
                                  </span>
                                ))}
                              </div>
                            )}
                            {it.extras && it.extras.length > 0 && (
                              <div className="pl-4 text-[9px] font-semibold flex flex-wrap gap-1">
                                {it.extras.map((extra: any, eIdx: number) => {
                                  if (extra.isStandard && extra.quantity === 0) {
                                    return (
                                      <span key={eIdx} className="bg-red-500/10 border border-red-500/25 px-1 py-0.2 rounded text-red-500">
                                        NO {locale === 'en' ? extra.nameEn.toUpperCase() : extra.nameAr}
                                      </span>
                                    );
                                  }
                                  if (!extra.isStandard && extra.quantity > 0) {
                                    return (
                                      <span key={eIdx} className="bg-accent-amber/10 border border-accent-amber/20 px-1 py-0.2 rounded text-accent-amber">
                                        + {locale === 'en' ? extra.nameEn : extra.nameAr} {extra.quantity > 1 ? `x${extra.quantity}` : ''}
                                      </span>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Address / Contact */}
                      <div className="text-[11px] text-text-muted space-y-1 bg-[#18181B] p-2.5 rounded-xl border border-card-border/50">
                        <div className="text-white font-bold">{order.userName}</div>
                        <div>{order.address}</div>
                        {order.notes && (
                          <div className="text-[10px] bg-accent-amber/5 border border-accent-amber/20 text-accent-amber p-2 rounded-xl mt-1">
                            <span className="font-bold block uppercase text-[8px] tracking-wider mb-0.5">⚠️ Instructions:</span>
                            <span className="italic font-medium">{order.notes}</span>
                          </div>
                        )}
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

                      {role && ['OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER'].includes(role) && (
                        <button
                          onClick={async () => {
                            const reason = await prompt(locale === 'en' ? 'Enter reason for cancellation:' : 'أدخل سبب الإلغاء:');
                            if (reason !== null && reason !== undefined) {
                              cancelOrderMutation.mutate({ orderId: order.id, reason: reason || 'No reason specified' });
                            }
                          }}
                          className="w-full py-2 border border-red-500/30 hover:bg-red-500/10 text-red-400 text-[11px] font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 mt-2"
                        >
                          <span>{locale === 'en' ? 'Cancel Order' : 'إلغاء الطلب'}</span>
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
                      <div className="text-[11px] text-text-muted space-y-1.5">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="space-y-0.5">
                            <div>• {it.quantity}x {locale === 'en' ? it.productNameEn : it.productNameAr} {it.size !== 'NONE' && `(${it.size})`}</div>
                            {it.customizations && it.customizations.length > 0 && (
                              <div className="pl-4 text-[9px] text-accent-amber font-semibold flex flex-wrap gap-1">
                                {it.customizations.map((cust: any, cIdx: number) => (
                                  <span key={cIdx} className="bg-accent-amber/10 border border-accent-amber/20 px-1 py-0.2 rounded">
                                    + {locale === 'en' ? cust.nameEn : cust.nameAr}
                                  </span>
                                ))}
                              </div>
                            )}
                            {it.extras && it.extras.length > 0 && (
                              <div className="pl-4 text-[9px] font-semibold flex flex-wrap gap-1">
                                {it.extras.map((extra: any, eIdx: number) => {
                                  if (extra.isStandard && extra.quantity === 0) {
                                    return (
                                      <span key={eIdx} className="bg-red-500/10 border border-red-500/25 px-1 py-0.2 rounded text-red-500">
                                        NO {locale === 'en' ? extra.nameEn.toUpperCase() : extra.nameAr}
                                      </span>
                                    );
                                  }
                                  if (!extra.isStandard && extra.quantity > 0) {
                                    return (
                                      <span key={eIdx} className="bg-accent-amber/10 border border-accent-amber/20 px-1 py-0.2 rounded text-accent-amber">
                                        + {locale === 'en' ? extra.nameEn : extra.nameAr} {extra.quantity > 1 ? `x${extra.quantity}` : ''}
                                      </span>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Contact details */}
                      <div className="text-[11px] text-text-muted space-y-1">
                        <div className="text-white font-bold">{order.userName} ({order.userPhone})</div>
                        {order.type === 'DELIVERY' && <div>📍 {order.address}</div>}
                        {order.notes && (
                          <div className="text-[10px] bg-accent-amber/5 border border-accent-amber/20 text-accent-amber p-2 rounded-xl mt-1">
                            <span className="font-bold block uppercase text-[8px] tracking-wider mb-0.5">⚠️ Instructions:</span>
                            <span className="italic font-medium">{order.notes}</span>
                          </div>
                        )}
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
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          {order.status === 'PREPARING' && (
                            <button
                              onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'ON_THE_WAY' })}
                              className="w-full py-2 bg-accent-amber hover:bg-accent-amber-hover text-white text-[10px] font-bold rounded-xl transition-all cursor-pointer text-center"
                            >
                              Set Out for Delivery
                            </button>
                          )}
                          {order.status === 'ON_THE_WAY' && (
                            <button
                              onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'DELIVERED' })}
                              className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold rounded-xl transition-all cursor-pointer text-center"
                            >
                              Mark Delivered
                            </button>
                          )}
                        </div>
                        {role && ['OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER'].includes(role) && (
                          <button
                            onClick={async () => {
                              const reason = await prompt(locale === 'en' ? 'Enter reason for cancellation:' : 'أدخل سبب الإلغاء:');
                              if (reason !== null && reason !== undefined) {
                                cancelOrderMutation.mutate({ orderId: order.id, reason: reason || 'No reason specified' });
                              }
                            }}
                            className="w-full py-2 border border-red-500/30 hover:bg-red-500/10 text-red-400 text-[10px] font-bold rounded-xl transition-all cursor-pointer text-center"
                          >
                            {locale === 'en' ? 'Cancel Order' : 'إلغاء الطلب'}
                          </button>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        {/* ========================================================================= */}
        {/* MENU CRUD CONTROL PANEL TAB */}
        {/* ========================================================================= */}
        {activeTab === 'MENU' && (
          <div className="bg-card border border-card-border rounded-3xl p-6 space-y-6">
            
            {/* Header CRUD */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
                <h2 className="text-sm font-bold uppercase tracking-wider text-accent-amber">{t('menuManagement')}</h2>
                
                {/* Category Selection Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">{locale === 'en' ? 'Category Filter:' : 'تصفية بالقسم:'}</span>
                  <select
                    value={filterEditCategoryId}
                    onChange={(e) => setFilterEditCategoryId(e.target.value)}
                    className="bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary-red/50 cursor-pointer"
                  >
                    <option value="ALL">{locale === 'en' ? `ALL (${products.length})` : `الكل (${products.length})`}</option>
                    {categories.map((c: any) => {
                      const count = products.filter((p) => p.categoryId === c.id || p.categoryIds?.includes(c.id)).length;
                      return (
                        <option key={c.id} value={c.id}>
                          {locale === 'en' ? c.nameEn : c.nameAr} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <button
                onClick={handleOpenAddProduct}
                className="px-4 py-2 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer w-full sm:w-auto justify-center"
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
                  {displayedProducts.map((product) => (
                    <tr 
                      key={product.id} 
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', product.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverProdId !== product.id) {
                          setDragOverProdId(product.id);
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverProdId === product.id) {
                          setDragOverProdId(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverProdId(null);
                        const draggedId = e.dataTransfer.getData('text/plain');
                        handleReorderProducts(draggedId, product.id);
                      }}
                      className={`hover:bg-card-border/20 transition-all cursor-grab active:cursor-grabbing ${
                        dragOverProdId === product.id 
                          ? 'border-t-2 border-primary-red bg-primary-red/5' 
                          : ''
                      }`}
                    >
                      <td className="p-4 flex items-center gap-3">
                        <span className="text-text-muted select-none text-xs">☰</span>
                        {inlineEditCell?.productId === product.id && inlineEditCell?.field === 'imageUrl' ? (
                          <div className="flex items-center gap-1.5 relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  const fileExt = file.name.split('.').pop();
                                  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                                  const filePath = `${fileName}`;
                                  const { error: uploadError } = await supabase.storage
                                    .from('product-images')
                                    .upload(filePath, file);
                                  if (uploadError) throw uploadError;
                                  const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
                                  
                                  await db.updateProduct(product.id, { imageUrl: data.publicUrl });
                                  queryClient.invalidateQueries({ queryKey: ['products'] });
                                  setInlineEditCell(null);
                                } catch (error) {
                                  console.error('Error uploading image:', error);
                                  await alert(locale === 'en' ? 'Failed to upload image' : 'فشل رفع الصورة');
                                }
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <button
                              type="button"
                              className="px-2 py-1 bg-primary-red hover:bg-primary-red-hover text-white text-[9px] font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              {locale === 'en' ? 'Choose File' : 'اختر ملف'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setInlineEditCell(null)}
                              className="p-1 rounded-lg hover:bg-card-border text-text-muted hover:text-white"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <img 
                            src={product.imageUrl} 
                            alt={product.nameEn} 
                            onClick={() => {
                              setInlineEditCell({ productId: product.id, field: 'imageUrl' });
                              setInlineEditValue(product.imageUrl);
                            }}
                            className="h-10 w-10 rounded-lg object-cover bg-card-border flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary-red transition-all" 
                            title={locale === 'en' ? 'Click to upload new image' : 'اضغط لرفع صورة جديدة'}
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          {inlineEditCell?.productId === product.id && inlineEditCell?.field === (locale === 'en' ? 'nameEn' : 'nameAr') ? (
                            <input
                              type="text"
                              value={inlineEditValue}
                              onChange={(e) => setInlineEditValue(e.target.value)}
                              onBlur={() => handleInlineEditSave(product, locale === 'en' ? 'nameEn' : 'nameAr')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineEditSave(product, locale === 'en' ? 'nameEn' : 'nameAr');
                                if (e.key === 'Escape') setInlineEditCell(null);
                              }}
                              autoFocus
                              className="bg-[#18181B] border border-primary-red/50 text-xs rounded px-1.5 py-0.5 text-white focus:outline-none w-full"
                            />
                          ) : (
                            <span 
                              onClick={() => {
                                setInlineEditCell({ productId: product.id, field: locale === 'en' ? 'nameEn' : 'nameAr' });
                                setInlineEditValue(locale === 'en' ? product.nameEn : product.nameAr);
                              }}
                              className="font-bold text-white block cursor-pointer hover:underline decoration-dashed decoration-primary-red"
                              title={locale === 'en' ? 'Click to edit name' : 'اضغط لتعديل الاسم'}
                            >
                              {locale === 'en' ? product.nameEn : product.nameAr}
                            </span>
                          )}

                          {inlineEditCell?.productId === product.id && inlineEditCell?.field === (locale === 'en' ? 'descEn' : 'descAr') ? (
                            <input
                              type="text"
                              value={inlineEditValue}
                              onChange={(e) => setInlineEditValue(e.target.value)}
                              onBlur={() => handleInlineEditSave(product, locale === 'en' ? 'descEn' : 'descAr')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineEditSave(product, locale === 'en' ? 'descEn' : 'descAr');
                                if (e.key === 'Escape') setInlineEditCell(null);
                              }}
                              autoFocus
                              className="bg-[#18181B] border border-primary-red/50 text-[10px] rounded px-1.5 py-0.5 text-white focus:outline-none w-full mt-1"
                            />
                          ) : (
                            <span 
                              onClick={() => {
                                setInlineEditCell({ productId: product.id, field: locale === 'en' ? 'descEn' : 'descAr' });
                                setInlineEditValue(locale === 'en' ? product.descEn : product.descAr);
                              }}
                              className="text-[10px] text-text-muted line-clamp-1 max-w-[200px] block cursor-pointer hover:underline decoration-dashed"
                              title={locale === 'en' ? 'Click to edit description' : 'اضغط لتعديل الوصف'}
                            >
                              {locale === 'en' ? product.descEn : product.descAr}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-medium text-text-muted">
                        {inlineEditCell?.productId === product.id && inlineEditCell?.field === 'categoryId' ? (
                          <select
                            value={inlineEditValue}
                            onChange={(e) => {
                              setInlineEditValue(e.target.value);
                              const updatedProd = { ...product, categoryId: e.target.value };
                              saveProductMutation.mutate(updatedProd);
                              setInlineEditCell(null);
                            }}
                            onBlur={() => setInlineEditCell(null)}
                            autoFocus
                            className="bg-[#18181B] border border-primary-red/50 text-xs rounded px-1 py-1 text-white focus:outline-none w-full"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>{locale === 'en' ? c.nameEn : c.nameAr}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            onClick={() => {
                              setInlineEditCell({ productId: product.id, field: 'categoryId' });
                              setInlineEditValue(product.categoryId);
                            }}
                            className="font-medium text-text-muted cursor-pointer hover:underline hover:text-white"
                            title={locale === 'en' ? 'Click to edit category' : 'اضغط لتعديل القسم'}
                          >
                            {categories.find((c: any) => c.id === product.categoryId)
                              ? (locale === 'en'
                                  ? categories.find((c: any) => c.id === product.categoryId)?.nameEn
                                  : categories.find((c: any) => c.id === product.categoryId)?.nameAr)
                              : '—'}
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono font-bold text-accent-amber">
                        {inlineEditCell?.productId === product.id && (inlineEditCell?.field === 'priceSingle' || inlineEditCell?.field === 'priceDouble') ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-text-muted">S:</span>
                              <input
                                type="number"
                                value={inlineEditValue}
                                onChange={(e) => setInlineEditValue(e.target.value)}
                                onBlur={() => handleInlineEditSave(product, 'priceSingle')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleInlineEditSave(product, 'priceSingle');
                                  if (e.key === 'Escape') setInlineEditCell(null);
                                }}
                                autoFocus={inlineEditCell?.field === 'priceSingle'}
                                className="bg-[#18181B] border border-primary-red/50 text-[10px] rounded px-1 py-0.5 text-white focus:outline-none w-14"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-text-muted">D:</span>
                              <input
                                type="number"
                                value={inlineEditValueDouble}
                                onChange={(e) => setInlineEditValueDouble(e.target.value)}
                                onBlur={() => {
                                  setInlineEditValue(inlineEditValueDouble);
                                  setTimeout(() => {
                                    handleInlineEditSave(product, 'priceDouble');
                                  }, 50);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    setInlineEditValue(inlineEditValueDouble);
                                    setTimeout(() => {
                                      handleInlineEditSave(product, 'priceDouble');
                                    }, 50);
                                  }
                                  if (e.key === 'Escape') setInlineEditCell(null);
                                }}
                                autoFocus={inlineEditCell?.field === 'priceDouble'}
                                placeholder="None"
                                className="bg-[#18181B] border border-primary-red/50 text-[10px] rounded px-1 py-0.5 text-white focus:outline-none w-14"
                              />
                            </div>
                          </div>
                        ) : (
                          <span
                            onClick={() => {
                              setInlineEditCell({ productId: product.id, field: 'priceSingle' });
                              setInlineEditValue(String(product.priceSingle));
                              setInlineEditValueDouble(product.priceDouble !== undefined ? String(product.priceDouble) : '');
                            }}
                            className="font-mono font-bold text-accent-amber cursor-pointer hover:underline"
                            title={locale === 'en' ? 'Click to edit prices' : 'اضغط لتعديل الأسعار'}
                          >
                            {product.priceSingle} EGP {product.priceDouble ? `/ ${product.priceDouble} EGP` : ''}
                          </span>
                        )}
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
                            onClick={() => handleOpenBranchOverrides(product)}
                            title={locale === 'en' ? 'Branch Pricing Overrides' : 'أسعار الفروع'}
                            className="p-1.5 rounded bg-card border border-card-border text-text-muted hover:text-accent-amber transition-colors cursor-pointer"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenCustomizationMapping(product)}
                            title={locale === 'en' ? 'Customization Options' : 'خيارات التخصيص'}
                            className="p-1.5 rounded bg-card border border-card-border text-text-muted hover:text-indigo-400 transition-colors cursor-pointer"
                          >
                            <Sliders className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditProduct(product)}
                            className="p-1.5 rounded bg-card border border-card-border text-text-muted hover:text-white transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              if (await confirm('Delete this product?')) {
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

            {/* ── Categories Management (OWNER / HEAD_ADMIN / DEVELOPER) ── */}
            {canManageCategories && (
              <div className="border-t border-card-border pt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-accent-amber" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-accent-amber">
                      {locale === 'en' ? 'Menu Categories' : 'أقسام المنيو'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setEditingCategory({ name_en: '', name_ar: '', desc_en: '', desc_ar: '', is_default: false })}
                    className="px-3 py-1.5 bg-accent-amber/10 border border-accent-amber/30 text-accent-amber text-xs font-bold rounded-xl hover:bg-accent-amber hover:text-black transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {locale === 'en' ? 'Add Category' : 'إضافة قسم'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {adminCategories.map((cat: any) => (
                    <div 
                      key={cat.id} 
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', cat.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverCatId !== cat.id) {
                          setDragOverCatId(cat.id);
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverCatId === cat.id) {
                          setDragOverCatId(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverCatId(null);
                        const draggedId = e.dataTransfer.getData('text/plain');
                        handleReorderCategories(draggedId, cat.id);
                      }}
                      className={`flex items-center justify-between bg-[#18181B] border rounded-xl px-4 py-3 cursor-grab active:cursor-grabbing transition-all ${
                        dragOverCatId === cat.id 
                          ? 'border-primary-red bg-primary-red/5 scale-[1.02] shadow-lg shadow-primary-red/10' 
                          : 'border-card-border hover:border-white/20'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span className="text-text-muted select-none">☰</span>
                          <span>{cat.name_en}</span>
                          {cat.is_default && <span className="text-[8px] bg-green-500/10 border border-green-500/20 text-green-400 font-bold px-1.5 py-0.5 rounded uppercase">Default</span>}
                        </p>
                        <p className="text-[10px] text-text-muted pl-4">{cat.name_ar}</p>
                        {(cat.desc_en || cat.desc_ar) && (
                          <p className="text-[9px] text-[#A1A1AA] italic mt-0.5 line-clamp-1 pl-4">
                            {locale === 'en' ? cat.desc_en : cat.desc_ar}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setEditingCategory({
                            id: cat.id,
                            name_en: cat.name_en,
                            name_ar: cat.name_ar,
                            desc_en: cat.desc_en || '',
                            desc_ar: cat.desc_ar || '',
                            is_default: cat.is_default || false,
                          })}
                          className="p-1.5 rounded-lg bg-card border border-card-border text-text-muted hover:text-white transition-colors cursor-pointer"
                          title={locale === 'en' ? 'Edit Category' : 'تعديل القسم'}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (await confirm(locale === 'en' ? 'Delete this category? Products inside will lose their category.' : 'حذف هذا القسم؟')) {
                              deleteCategoryMutation.mutate(cat.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-card border border-card-border text-text-muted hover:text-primary-red transition-colors cursor-pointer"
                          title={locale === 'en' ? 'Delete Category' : 'حذف القسم'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Combo Price Customizer ── */}
                <div className="bg-[#18181B] border border-card-border rounded-2xl p-5 mt-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-accent-amber" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                      {locale === 'en' ? 'Combo Price Customization' : 'تخصيص تسعير وجبات الكومبو'}
                    </h3>
                  </div>
                  <p className="text-[10px] text-text-muted">
                    {locale === 'en' 
                      ? 'Configure discounts or fixed pricing for customers upgrading items to a combo meal.' 
                      : 'تعديل الخصم أو السعر الموحد الذي يتم تطبيقه عند اختيار إضافة الكومبو للمنتجات.'}
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(() => {
                      const discountSetting = settings.find((s: any) => s.key === 'combo_discount_percentage') || { value: '25' };
                      return (
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted block font-bold uppercase tracking-wider">
                            {locale === 'en' ? 'Combo Offer Discount (%)' : 'نسبة خصم الكومبو (%)'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            defaultValue={discountSetting.value}
                            className="w-full text-xs bg-card border border-card-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary-red/50"
                            onBlur={(e) => saveSettingMutation.mutate({ key: 'combo_discount_percentage', value: e.target.value })}
                          />
                        </div>
                      );
                    })()}

                    {(() => {
                      const fixedPriceSetting = settings.find((s: any) => s.key === 'combo_fixed_price') || { value: '' };
                      return (
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted block font-bold uppercase tracking-wider">
                            {locale === 'en' ? 'Combo Fixed Price (EGP) - Overrides %' : 'سعر الكومبو الثابت (ج.م)'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 50"
                            defaultValue={fixedPriceSetting.value}
                            className="w-full text-xs bg-card border border-card-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary-red/50"
                            onBlur={(e) => saveSettingMutation.mutate({ key: 'combo_fixed_price', value: e.target.value })}
                          />
                        </div>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#27272A]/50">
                    {(() => {
                      const priceS = settings.find((s: any) => s.key === 'combo_price_s') || { value: '30' };
                      return (
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted block font-bold uppercase tracking-wider">
                            {locale === 'en' ? 'Combo Price - Small (EGP)' : 'سعر الكومبو - صغير (ج.م)'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            defaultValue={priceS.value}
                            className="w-full text-xs bg-card border border-card-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary-red/50"
                            onBlur={(e) => saveSettingMutation.mutate({ key: 'combo_price_s', value: e.target.value })}
                          />
                        </div>
                      );
                    })()}

                    {(() => {
                      const priceM = settings.find((s: any) => s.key === 'combo_price_m') || { value: '40' };
                      return (
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted block font-bold uppercase tracking-wider">
                            {locale === 'en' ? 'Combo Price - Medium (EGP)' : 'سعر الكومبو - وسط (ج.م)'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            defaultValue={priceM.value}
                            className="w-full text-xs bg-card border border-card-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary-red/50"
                            onBlur={(e) => saveSettingMutation.mutate({ key: 'combo_price_m', value: e.target.value })}
                          />
                        </div>
                      );
                    })()}

                    {(() => {
                      const priceF = settings.find((s: any) => s.key === 'combo_price_f') || { value: '80' };
                      return (
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted block font-bold uppercase tracking-wider">
                            {locale === 'en' ? 'Combo Price - Family (EGP)' : 'سعر الكومبو - عائلي (ج.م)'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            defaultValue={priceF.value}
                            className="w-full text-xs bg-card border border-card-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary-red/50"
                            onBlur={(e) => saveSettingMutation.mutate({ key: 'combo_price_f', value: e.target.value })}
                          />
                        </div>
                      );
                    })()}
                  </div>

                  {/* Select Combo Items Checklist */}
                  {(() => {
                    const comboItemsSetting = settings.find((s: any) => s.key === 'combo_items_list') || { value: '' };
                    const selectedIds = comboItemsSetting.value ? comboItemsSetting.value.split(',') : [];
                    
                    const allowedCategories = adminCategories.filter((cat: any) => {
                      const nameEn = (cat.name_en || cat.nameEn || '').toLowerCase();
                      const nameAr = (cat.name_ar || cat.nameAr || '').toLowerCase();
                      return (
                        nameEn.includes('side') ||
                        nameEn.includes('appetizer') ||
                        nameEn.includes('drink') ||
                        nameEn.includes('beverage') ||
                        nameEn.includes('addon') ||
                        nameEn.includes('add-on') ||
                        nameEn.includes('add on') ||
                        nameEn.includes('extra') ||
                        nameAr.includes('جانب') ||
                        nameAr.includes('مشروب') ||
                        nameAr.includes('إضاف')
                      );
                    });

                    return (
                      <div className="space-y-2 pt-4 border-t border-[#27272A]">
                        <label className="text-[10px] text-accent-amber block font-bold uppercase tracking-wider">
                          {locale === 'en' ? 'Select Combo Items' : 'تحديد عناصر عرض الكومبو'}
                        </label>
                        <p className="text-[9px] text-text-muted leading-tight">
                          {locale === 'en' 
                            ? 'Choose which items (from addons, appetizers, and drinks) will be added to the customer order when they accept the make-it-combo offer.' 
                            : 'اختر العناصر (من الإضافات، المقبلات، والمشروبات) التي سيتم إضافتها لطلب العميل عند قبوله لعرض الكومبو.'}
                        </p>
                        <div className="max-h-48 overflow-y-auto bg-card border border-card-border rounded-xl p-3 space-y-3.5 scrollbar-thin">
                          {allowedCategories.map((cat: any) => {
                            const catProducts = products.filter((p: any) => p.categoryId === cat.id);
                            if (catProducts.length === 0) return null;
                            return (
                              <div key={cat.id} className="space-y-1.5">
                                <p className="text-[10px] font-extrabold text-primary-red uppercase tracking-wider border-b border-card-border/20 pb-0.5 mb-1.5">
                                  {locale === 'en' ? cat.name_en || cat.nameEn : cat.name_ar || cat.nameAr}
                                </p>
                                <div className="space-y-1 pl-1">
                                  {catProducts.map((p: any) => {
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
                                            saveSettingMutation.mutate({ key: 'combo_items_list', value: newIds.join(',') });
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
                          })}
                          {allowedCategories.length === 0 && (
                            <p className="text-text-muted text-[10px] text-center py-2">
                              {locale === 'en' ? 'No addons/appetizers/drinks categories found.' : 'لم يتم العثور على فئات للإضافات/المقبلات/المشروبات.'}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Free Items Selection per Combo Size */}
                  {(() => {
                    const adminSides = products.filter((p: any) => {
                      const cat = adminCategories.find((c: any) => c.id === p.categoryId);
                      if (!cat) return false;
                      const catName = ((cat.name_en || cat.nameEn || '') + ' ' + (cat.name_ar || cat.nameAr || '')).toLowerCase();
                      return catName.includes('side') || catName.includes('appetizer') || catName.includes('addon') ||
                             catName.includes('add-on') || catName.includes('add on') || catName.includes('extra') ||
                             catName.includes('جانب') || catName.includes('مقبلات') || catName.includes('إضاف');
                    });

                    const adminDrinks = products.filter((p: any) => {
                      const cat = adminCategories.find((c: any) => c.id === p.categoryId);
                      if (!cat) return false;
                      const catName = ((cat.name_en || cat.nameEn || '') + ' ' + (cat.name_ar || cat.nameAr || '')).toLowerCase();
                      return catName.includes('drink') || catName.includes('juice') || catName.includes('soda') ||
                             catName.includes('مشروب') || catName.includes('مشروبات') || catName.includes('عصير');
                    });

                    return (
                      <div className="pt-4 border-t border-[#27272A] space-y-3">
                        <label className="text-[10px] text-accent-amber block font-bold uppercase tracking-wider">
                          {locale === 'en' ? 'Free Side & Drink Configuration per Size' : 'تحديد الجانبي والمشروب المجاني لكل حجم'}
                        </label>
                        <p className="text-[9px] text-text-muted leading-tight">
                          {locale === 'en'
                            ? 'Configure which specific side item and drink are included for free in each combo size upgrade. Any other option selected by the customer will calculate dynamic markups automatically.'
                            : 'حدد الجانبي والمشروب المشمول مجاناً في كل حجم كومبو. أي خيار آخر يختاره العميل سيحسب تكلفة إضافية تلقائياً.'}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Small Combo config */}
                          <div className="bg-card border border-card-border/40 rounded-xl p-3 space-y-2.5">
                            <p className="text-[10px] font-bold text-white border-b border-card-border/20 pb-1">
                              {locale === 'en' ? 'Small Combo Upgrade' : 'ترقية كومبو صغير'}
                            </p>
                            {(() => {
                              const freeSideS = settings.find((s: any) => s.key === 'combo_free_side_s') || { value: '' };
                              const freeDrinkS = settings.find((s: any) => s.key === 'combo_free_drink_s') || { value: '' };
                              return (
                                <div className="space-y-2">
                                  <div className="space-y-1">
                                    <label className="text-[8px] text-text-muted block font-bold uppercase">
                                      {locale === 'en' ? 'Free Side' : 'الجانبي المجاني'}
                                    </label>
                                    <select
                                      value={freeSideS.value}
                                      onChange={(e) => saveSettingMutation.mutate({ key: 'combo_free_side_s', value: e.target.value })}
                                      className="w-full text-[11px] bg-[#18181B] border border-card-border rounded-lg px-2 py-1 text-white focus:outline-none focus:border-primary-red/50"
                                    >
                                      <option value="">{locale === 'en' ? '-- Select Side --' : '-- اختر الجانبي --'}</option>
                                      {adminSides.map((p: any) => (
                                        <option key={p.id} value={p.id}>{locale === 'en' ? p.nameEn : p.nameAr} ({p.priceSingle} EGP)</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] text-text-muted block font-bold uppercase">
                                      {locale === 'en' ? 'Free Drink' : 'المشروب المجاني'}
                                    </label>
                                    <select
                                      value={freeDrinkS.value}
                                      onChange={(e) => saveSettingMutation.mutate({ key: 'combo_free_drink_s', value: e.target.value })}
                                      className="w-full text-[11px] bg-[#18181B] border border-card-border rounded-lg px-2 py-1 text-white focus:outline-none focus:border-primary-red/50"
                                    >
                                      <option value="">{locale === 'en' ? '-- Select Drink --' : '-- اختر المشروب --'}</option>
                                      {adminDrinks.map((p: any) => (
                                        <option key={p.id} value={p.id}>{locale === 'en' ? p.nameEn : p.nameAr} ({p.priceSingle} EGP)</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Medium Combo config */}
                          <div className="bg-card border border-card-border/40 rounded-xl p-3 space-y-2.5">
                            <p className="text-[10px] font-bold text-white border-b border-card-border/20 pb-1">
                              {locale === 'en' ? 'Medium Combo Upgrade' : 'ترقية كومبو وسط'}
                            </p>
                            {(() => {
                              const freeSideM = settings.find((s: any) => s.key === 'combo_free_side_m') || { value: '' };
                              const freeDrinkM = settings.find((s: any) => s.key === 'combo_free_drink_m') || { value: '' };
                              return (
                                <div className="space-y-2">
                                  <div className="space-y-1">
                                    <label className="text-[8px] text-text-muted block font-bold uppercase">
                                      {locale === 'en' ? 'Free Side' : 'الجانبي المجاني'}
                                    </label>
                                    <select
                                      value={freeSideM.value}
                                      onChange={(e) => saveSettingMutation.mutate({ key: 'combo_free_side_m', value: e.target.value })}
                                      className="w-full text-[11px] bg-[#18181B] border border-card-border rounded-lg px-2 py-1 text-white focus:outline-none focus:border-primary-red/50"
                                    >
                                      <option value="">{locale === 'en' ? '-- Select Side --' : '-- اختر الجانبي --'}</option>
                                      {adminSides.map((p: any) => (
                                        <option key={p.id} value={p.id}>{locale === 'en' ? p.nameEn : p.nameAr} ({p.priceSingle} EGP)</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] text-text-muted block font-bold uppercase">
                                      {locale === 'en' ? 'Free Drink' : 'المشروب المجاني'}
                                    </label>
                                    <select
                                      value={freeDrinkM.value}
                                      onChange={(e) => saveSettingMutation.mutate({ key: 'combo_free_drink_m', value: e.target.value })}
                                      className="w-full text-[11px] bg-[#18181B] border border-card-border rounded-lg px-2 py-1 text-white focus:outline-none focus:border-primary-red/50"
                                    >
                                      <option value="">{locale === 'en' ? '-- Select Drink --' : '-- اختر المشروب --'}</option>
                                      {adminDrinks.map((p: any) => (
                                        <option key={p.id} value={p.id}>{locale === 'en' ? p.nameEn : p.nameAr} ({p.priceSingle} EGP)</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Family Combo config */}
                          <div className="bg-card border border-card-border/40 rounded-xl p-3 space-y-2.5">
                            <p className="text-[10px] font-bold text-white border-b border-card-border/20 pb-1">
                              {locale === 'en' ? 'Family Combo Upgrade' : 'ترقية كومبو عائلي'}
                            </p>
                            {(() => {
                              const freeSideF = settings.find((s: any) => s.key === 'combo_free_side_f') || { value: '' };
                              const freeDrinkF = settings.find((s: any) => s.key === 'combo_free_drink_f') || { value: '' };
                              return (
                                <div className="space-y-2">
                                  <div className="space-y-1">
                                    <label className="text-[8px] text-text-muted block font-bold uppercase">
                                      {locale === 'en' ? 'Free Side' : 'الجانبي المجاني'}
                                    </label>
                                    <select
                                      value={freeSideF.value}
                                      onChange={(e) => saveSettingMutation.mutate({ key: 'combo_free_side_f', value: e.target.value })}
                                      className="w-full text-[11px] bg-[#18181B] border border-card-border rounded-lg px-2 py-1 text-white focus:outline-none focus:border-primary-red/50"
                                    >
                                      <option value="">{locale === 'en' ? '-- Select Side --' : '-- اختر الجانبي --'}</option>
                                      {adminSides.map((p: any) => (
                                        <option key={p.id} value={p.id}>{locale === 'en' ? p.nameEn : p.nameAr} ({p.priceSingle} EGP)</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] text-text-muted block font-bold uppercase">
                                      {locale === 'en' ? 'Free Drink' : 'المشروب المجاني'}
                                    </label>
                                    <select
                                      value={freeDrinkF.value}
                                      onChange={(e) => saveSettingMutation.mutate({ key: 'combo_free_drink_f', value: e.target.value })}
                                      className="w-full text-[11px] bg-[#18181B] border border-card-border rounded-lg px-2 py-1 text-white focus:outline-none focus:border-primary-red/50"
                                    >
                                      <option value="">{locale === 'en' ? '-- Select Drink --' : '-- اختر المشروب --'}</option>
                                      {adminDrinks.map((p: any) => (
                                        <option key={p.id} value={p.id}>{locale === 'en' ? p.nameEn : p.nameAr} ({p.priceSingle} EGP)</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* ── Often Ordered With (Upsells) ── */}
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
                    saveSettingMutation.mutate({ key: 'recommended_product_ids', value: JSON.stringify(updated) });
                  };

                  return (
                    <div className="bg-[#18181B] border border-card-border rounded-2xl p-5 mt-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-accent-amber" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-white">
                          {locale === 'en' ? 'Often Ordered With (Upsells)' : 'المنتجات التي تُطلب غالباً معاً (توصيات)'}
                        </h3>
                      </div>
                      <p className="text-[10px] text-text-muted">
                        {locale === 'en'
                          ? 'Select which items will be offered in the "Often Ordered With" slider when customers add items to their cart.'
                          : 'اختر العناصر التي سيتم عرضها في شريط "غالباً ما يُطلب مع" عند إضافة عناصر إلى السلة.'}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto bg-card border border-card-border rounded-xl p-3 scrollbar-thin">
                        {products.length === 0 ? (
                          <p className="col-span-full text-xs text-text-muted italic py-4 text-center">
                            {locale === 'en' ? 'No products available.' : 'لا توجد منتجات متاحة.'}
                          </p>
                        ) : (
                          products.map((p: any) => {
                            const isRec = currentRecommendedIds.includes(p.id);
                            return (
                              <label key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-card-border/30 border border-card-border/50 hover:border-card-border cursor-pointer select-none">
                                <span className="text-[11px] text-white pr-2 truncate" title={locale === 'en' ? p.nameEn : p.nameAr}>
                                  {locale === 'en' ? p.nameEn : p.nameAr}
                                </span>
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

                {editingCategory && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingCategory(null)} />
                    <div className="relative w-full max-w-sm bg-[#111113] border border-[#27272A] rounded-2xl p-6 shadow-2xl space-y-4 z-10 animate-in zoom-in duration-200">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-extrabold text-white">
                          {editingCategory.id 
                            ? (locale === 'en' ? 'Edit Category' : 'تعديل القسم')
                            : (locale === 'en' ? 'New Category' : 'قسم جديد')}
                        </h3>
                        <button onClick={() => setEditingCategory(null)} className="p-1 rounded-full hover:bg-[#27272A] text-text-muted cursor-pointer">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider mb-1">Name (English) *</label>
                          <input 
                            type="text" 
                            value={editingCategory.name_en || ''} 
                            onChange={(e) => setEditingCategory({ ...editingCategory, name_en: e.target.value })} 
                            placeholder="e.g. Wraps & Rolls"
                            className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary-red/50" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider mb-1">Name (Arabic)</label>
                          <input 
                            type="text" 
                            value={editingCategory.name_ar || ''} 
                            onChange={(e) => setEditingCategory({ ...editingCategory, name_ar: e.target.value })} 
                            placeholder="مثال: لفائف" 
                            dir="rtl"
                            className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary-red/50" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider mb-1">Description (English)</label>
                          <textarea 
                            value={editingCategory.desc_en || ''} 
                            onChange={(e) => setEditingCategory({ ...editingCategory, desc_en: e.target.value })} 
                            placeholder="English description"
                            rows={2}
                            className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary-red/50 resize-none" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider mb-1">Description (Arabic)</label>
                          <textarea 
                            value={editingCategory.desc_ar || ''} 
                            onChange={(e) => setEditingCategory({ ...editingCategory, desc_ar: e.target.value })} 
                            placeholder="الوصف باللغة العربية" 
                            rows={2}
                            dir="rtl"
                            className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary-red/50 resize-none" 
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="cat-is-default"
                            checked={editingCategory.is_default || false}
                            onChange={(e) => setEditingCategory({ ...editingCategory, is_default: e.target.checked })}
                            className="rounded border-card-border bg-card-border text-primary-red focus:ring-primary-red/50 focus:ring-offset-background"
                          />
                          <label htmlFor="cat-is-default" className="text-xs text-text-muted cursor-pointer select-none">
                            {locale === 'en' ? 'Set as default category' : 'تعيين كقسم افتراضي للعملاء'}
                          </label>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <button onClick={() => setEditingCategory(null)} className="px-3 py-1.5 border border-[#27272A] rounded-xl text-xs font-bold text-text-muted hover:text-white cursor-pointer">
                          {locale === 'en' ? 'Cancel' : 'إلغاء'}
                        </button>
                        <button 
                          disabled={!editingCategory.name_en?.trim() || saveCategoryMutation.isPending}
                          onClick={() => saveCategoryMutation.mutate(editingCategory)}
                          className="px-4 py-1.5 bg-primary-red text-white text-xs font-bold rounded-xl hover:bg-primary-red-hover flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {saveCategoryMutation.isPending ? '...' : (editingCategory.id ? (locale === 'en' ? 'Save' : 'حفظ') : (locale === 'en' ? 'Add' : 'إضافة'))}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

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
                onClick={handleOpenAddCoupon}
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
                    <th className="p-4 font-bold">{locale === 'en' ? 'Branch' : 'الفرع'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Discount Type' : 'نوع الخصم'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Discount Value' : 'قيمة الخصم'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Max per User' : 'الحد الأقصى لكل مستخدم'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Usage Limit' : 'حد الاستخدام الكلي'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Status' : 'الحالة'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border/30">
                  {coupons.map((cp) => (
                    <tr key={cp.id} className="hover:bg-card-border/20 transition-all">
                      <td className="p-4 font-bold text-white font-mono">{cp.code}</td>
                      <td className="p-4 text-text-muted font-medium">
                        <div>
                          {cp.branchId ? (
                            branches.find((b: any) => b.id === cp.branchId)
                              ? (locale === 'en' ? branches.find((b: any) => b.id === cp.branchId)?.nameEn : branches.find((b: any) => b.id === cp.branchId)?.nameAr)
                              : 'Specific Branch'
                          ) : (
                            <span className="text-[10px] bg-white/5 border border-white/10 text-white font-bold px-1.5 py-0.5 rounded">
                              {locale === 'en' ? '🌐 All Branches' : '🌐 جميع الفروع'}
                            </span>
                          )}
                        </div>
                        {cp.applicableCategoryId && (
                          <div className="text-[10px] text-accent-amber font-bold mt-1">
                            🏷️ {
                              categories.find((c: any) => c.id === cp.applicableCategoryId)
                                ? (locale === 'en' ? categories.find((c: any) => c.id === cp.applicableCategoryId)?.nameEn : categories.find((c: any) => c.id === cp.applicableCategoryId)?.nameAr)
                                : 'Selected Category'
                            }
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-text-muted">{cp.discountType}</td>
                      <td className="p-4 font-bold text-accent-amber">
                        {cp.discountValue} {cp.discountType === 'PERCENT' ? '%' : 'EGP'}
                      </td>
                      <td className="p-4 text-text-muted font-medium">
                        {cp.maxUsesPerUser ? `${cp.maxUsesPerUser}x` : '—'}
                      </td>
                      <td className="p-4 text-text-muted font-medium">
                        {cp.usageLimit ? `${cp.usageLimit}x` : '—'}
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
                      branchId: newCouponBranchId || null,
                      maxUsesPerUser: newCouponMaxUsesPerUser ? Number(newCouponMaxUsesPerUser) : null,
                      usageLimit: newCouponUsageLimit ? Number(newCouponUsageLimit) : null,
                      applicableCategoryId: newCouponCategoryId || null,
                    });
                  }}
                  className="relative w-full max-w-md bg-card border border-card-border rounded-3xl p-6 shadow-2xl space-y-4 z-10"
                >
                  <h3 className="text-base font-extrabold text-white">
                    {locale === 'en' ? 'Create New Discount Coupon' : 'إنشاء كود خصم جديد'}
                  </h3>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Scope (Branch)</label>
                      <select
                        value={newCouponBranchId}
                        onChange={(e) => setNewCouponBranchId(e.target.value)}
                        disabled={!hasGlobalAccess}
                        className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 disabled:opacity-75"
                      >
                        {hasGlobalAccess && <option value="">All Branches (Global)</option>}
                        {branches
                          .filter((b) => hasGlobalAccess || userBranches.some((ub) => ub.id === b.id))
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {locale === 'en' ? b.nameEn : b.nameAr}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Scope (Category - Optional)</label>
                      <select
                        value={newCouponCategoryId}
                        onChange={(e) => setNewCouponCategoryId(e.target.value)}
                        className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                      >
                        <option value="">All Categories (Default)</option>
                        {categories.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {locale === 'en' ? c.nameEn : c.nameAr}
                          </option>
                        ))}
                      </select>
                    </div>

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

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Max Uses per User (Optional)</label>
                        <input
                          type="number"
                          placeholder="e.g. 1"
                          value={newCouponMaxUsesPerUser}
                          onChange={(e) => setNewCouponMaxUsesPerUser(e.target.value)}
                          className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Total Usage Limit (Optional)</label>
                        <input
                          type="number"
                          placeholder="e.g. 10"
                          value={newCouponUsageLimit}
                          onChange={(e) => setNewCouponUsageLimit(e.target.value)}
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

            {/* DIVIDER */}
            <hr className="border-card-border my-6" />

            {/* EVENT DISCOUNTS SECTION */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-primary-red">
                  {locale === 'en' ? 'Event & Menu Discounts' : 'تخفيضات القائمة والمناسبات'}
                </h2>
                <p className="text-[10px] text-text-muted mt-1">
                  {locale === 'en' ? 'Automatically applies to the menu without a coupon code.' : 'تطبق تلقائياً على القائمة بدون الحاجة لكود خصم.'}
                </p>
              </div>
              <button
                onClick={handleOpenAddDiscount}
                className="px-4 py-2 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-4.5 w-4.5" />
                <span>{locale === 'en' ? 'Create Event Discount' : 'إضافة تخفيض مباشر'}</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right text-xs">
                <thead className="bg-[#18181B] text-text-muted border-b border-card-border">
                  <tr>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Event Name' : 'اسم الحدث'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Branch' : 'الفرع'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Applies To' : 'ينطبق على'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Discount Value' : 'قيمة الخصم'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Status' : 'الحالة'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border/30">
                  {discounts.map((dsc) => (
                    <tr key={dsc.id} className="hover:bg-card-border/20 transition-all">
                      <td className="p-4 font-bold text-white">{dsc.name}</td>
                      <td className="p-4 text-text-muted font-medium">
                        {dsc.branchId ? (
                          branches.find((b: any) => b.id === dsc.branchId)
                            ? (locale === 'en' ? branches.find((b: any) => b.id === dsc.branchId)?.nameEn : branches.find((b: any) => b.id === dsc.branchId)?.nameAr)
                            : 'Specific Branch'
                        ) : (
                          <span className="text-[10px] bg-white/5 border border-white/10 text-white font-bold px-1.5 py-0.5 rounded">
                            {locale === 'en' ? '🌐 All Branches' : '🌐 جميع الفروع'}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-text-muted">
                        {dsc.appliesTo === 'ALL'
                          ? 'Entire Menu'
                          : dsc.appliesTo.startsWith('CAT:')
                            ? `Category: ${
                                categories.find((c: any) => c.id === dsc.appliesTo.substring(4))
                                  ? (locale === 'en' ? categories.find((c: any) => c.id === dsc.appliesTo.substring(4))?.nameEn : categories.find((c: any) => c.id === dsc.appliesTo.substring(4))?.nameAr)
                                  : dsc.appliesTo.substring(4)
                              }`
                            : products.find(p => p.id === dsc.appliesTo)?.nameEn || dsc.appliesTo}
                      </td>
                      <td className="p-4 font-bold text-primary-red">
                        {dsc.discountValue} {dsc.discountType === 'PERCENT' ? '%' : 'EGP'}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => toggleDiscountMutation.mutate({ id: dsc.id, isActive: !dsc.isActive })}
                          className={`px-3 py-1 rounded-full text-[9px] font-bold border transition-all cursor-pointer ${
                            dsc.isActive ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-card border-card-border text-text-muted'
                          }`}
                        >
                          {dsc.isActive ? t('available') : 'Disabled'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Dialog for Adding Discount */}
            {isAddingDiscount && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setIsAddingDiscount(false)} />
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newDiscountName.trim() || newDiscountValue <= 0) return;
                    createDiscountMutation.mutate({
                      name: newDiscountName.trim(),
                      discountType: newDiscountType,
                      discountValue: newDiscountValue,
                      appliesTo: newDiscountAppliesTo,
                      branchId: newDiscountBranchId || null,
                    });
                  }}
                  className="relative w-full max-w-md bg-card border border-card-border rounded-3xl p-6 shadow-2xl space-y-4 z-10"
                >
                  <h3 className="text-base font-extrabold text-white">
                    {locale === 'en' ? 'Create Event Discount' : 'إنشاء تخفيض مباشر'}
                  </h3>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Scope (Branch)</label>
                      <select
                        value={newDiscountBranchId}
                        onChange={(e) => setNewDiscountBranchId(e.target.value)}
                        disabled={!hasGlobalAccess}
                        className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 disabled:opacity-75"
                      >
                        {hasGlobalAccess && <option value="">All Branches (Global)</option>}
                        {branches
                          .filter((b) => hasGlobalAccess || userBranches.some((ub) => ub.id === b.id))
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {locale === 'en' ? b.nameEn : b.nameAr}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Event / Discount Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Summer Festival"
                        value={newDiscountName}
                        onChange={(e) => setNewDiscountName(e.target.value)}
                        required
                        className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Applies To</label>
                      <select
                        value={newDiscountAppliesTo}
                        onChange={(e) => setNewDiscountAppliesTo(e.target.value)}
                        className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none"
                      >
                        <option value="ALL">Entire Menu (All Products)</option>
                        <optgroup label="Categories">
                          {categories.map((c: any) => (
                            <option key={c.id} value={`CAT:${c.id}`}>Category: {locale === 'en' ? c.nameEn : c.nameAr}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Products">
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.nameEn} ({p.nameAr})</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Discount Type</label>
                        <select
                          value={newDiscountType}
                          onChange={(e) => setNewDiscountType(e.target.value as any)}
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
                          value={newDiscountValue || ''}
                          onChange={(e) => setNewDiscountValue(Number(e.target.value))}
                          required
                          className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setIsAddingDiscount(false)}
                        className="flex-1 py-3 bg-[#18181B] hover:bg-card-border border border-card-border text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        {locale === 'en' ? 'Cancel' : 'إلغاء'}
                      </button>
                      <button
                        type="submit"
                        disabled={createDiscountMutation.isPending}
                        className="flex-1 py-3 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="h-4.5 w-4.5" />
                        <span>{createDiscountMutation.isPending ? 'Saving...' : (locale === 'en' ? 'Create Discount' : 'حفظ التخفيض')}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* REVIEWS MODERATION PANEL TAB */}
        {/* ========================================================================= */}
        {activeTab === 'REVIEWS' && (
          <div className="bg-card border border-card-border rounded-3xl p-4 sm:p-6 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-card-border/50">
              <div>
                <h2 className="text-lg font-black text-white">
                  {locale === 'en' ? 'Reviews Moderation & Settings' : 'إشراف وإعدادات التقييمات'}
                </h2>
                <p className="text-xs text-text-muted">
                  {locale === 'en'
                    ? 'Approve or reject customer reviews before they appear on the site.'
                    : 'الموافقة على تقييمات العملاء أو رفضها قبل ظهورها على الموقع.'}
                </p>
              </div>

              {/* Toggle Review System globally */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-white font-bold">
                  {locale === 'en' ? 'Review System Status:' : 'حالة نظام التقييمات:'}
                </span>
                {(() => {
                  const setting = (legacySettings.length > 0 ? legacySettings : settings).find((s: any) => s.key === 'reviews_active');
                  const isActive = setting ? setting.value === 'true' : true;
                  return (
                    <button
                      onClick={() => toggleReviewsActiveMutation.mutate(isActive ? 'false' : 'true')}
                      className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20'
                          : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
                      }`}
                    >
                      {isActive
                        ? (locale === 'en' ? '🟢 Active (Resume)' : '🟢 نشط (يعمل)')
                        : (locale === 'en' ? '🔴 Stopped (Pause)' : '🔴 متوقف')}
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* Reviews List for moderation */}
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right text-xs">
                <thead className="bg-[#18181B] text-text-muted border-b border-card-border">
                  <tr>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Customer' : 'العميل'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Product' : 'المنتج'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Rating' : 'التقييم'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Comment' : 'التعليق'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Status' : 'الحالة'}</th>
                    <th className="p-4 font-bold text-center">{locale === 'en' ? 'Actions' : 'إجراءات'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border/30">
                  {adminReviews.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-text-muted italic">
                        {locale === 'en' ? 'No reviews found.' : 'لا توجد تقييمات مضافة.'}
                      </td>
                    </tr>
                  ) : (
                    adminReviews.map((rev: any) => {
                      const prodName = products.find((p) => p.id === rev.productId)
                        ? (locale === 'en' ? products.find((p) => p.id === rev.productId)?.nameEn : products.find((p) => p.id === rev.productId)?.nameAr)
                        : 'Unknown Product';
                      return (
                        <tr key={rev.id} className="hover:bg-card-border/20 transition-all text-white animate-in fade-in duration-200">
                          <td className="p-4 font-bold">{rev.userName}</td>
                          <td className="p-4 text-text-muted font-medium">{prodName}</td>
                          <td className="p-4">
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3.5 w-3.5 ${
                                    i < rev.rating ? 'fill-accent-amber text-accent-amber' : 'text-card-border'
                                  }`}
                                />
                              ))}
                            </div>
                          </td>
                          <td className="p-4 text-text-muted max-w-xs truncate" title={rev.comment}>
                            {rev.comment || '—'}
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                rev.status === 'APPROVED'
                                  ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                  : rev.status === 'REJECTED'
                                  ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                  : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                              }`}
                            >
                              {rev.status || 'PENDING'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {rev.status !== 'APPROVED' && (
                                <button
                                  onClick={() => updateReviewStatusMutation.mutate({ id: rev.id, status: 'APPROVED' })}
                                  className="px-2.5 py-1 bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                                >
                                  {locale === 'en' ? 'Approve' : 'موافقة'}
                                </button>
                              )}
                              {rev.status !== 'REJECTED' && (
                                <button
                                  onClick={() => updateReviewStatusMutation.mutate({ id: rev.id, status: 'REJECTED' })}
                                  className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                                >
                                  {locale === 'en' ? 'Reject' : 'رفض'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
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
                  {chatOpenSessions.length === 0 ? (
                    <div className="text-xs text-text-muted italic">No active customer chats.</div>
                  ) : (
                    chatOpenSessions.map((chat) => (
                      <button
                        key={chat.userId}
                        onClick={() => {
                          setActiveChatUserId(chat.userId);
                          setActiveChatUserName(chat.userName);
                          setActiveChatId(chat.chatId || null);
                        }}
                        className={`w-full text-left rtl:text-right p-3 rounded-xl border text-xs transition-all flex flex-col gap-1 cursor-pointer ${
                          activeChatUserId === chat.userId
                            ? 'border-primary-red bg-primary-red/5'
                            : chat.hasUnread
                              ? 'border-red-500/80 bg-red-500/5 animate-pulse'
                              : 'border-card-border hover:bg-card-border/20'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full font-bold">
                          <span className="text-white flex items-center gap-1.5">
                            {chat.userName}
                            {chat.hasUnread && (
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                            )}
                          </span>
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

                {/* Collapsible Closed Sessions Accordion */}
                {chatClosedSessions.length > 0 && (
                  <div className="border-t border-card-border pt-4 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowClosedChats(!showClosedChats)}
                      className="w-full flex items-center justify-between text-[11px] font-black text-text-muted hover:text-white uppercase tracking-wider cursor-pointer"
                    >
                      <span>{locale === 'en' ? `Closed Sessions (${chatClosedSessions.length})` : `الجلسات المغلقة (${chatClosedSessions.length})`}</span>
                      {showClosedChats ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    
                    {showClosedChats && (
                      <div className="space-y-2 mt-3 max-h-[200px] overflow-y-auto pr-1 no-scrollbar animate-in slide-in-from-top-2 duration-200">
                        {chatClosedSessions.map((chat) => (
                          <button
                            key={chat.userId}
                            onClick={() => {
                              setActiveChatUserId(chat.userId);
                              setActiveChatUserName(chat.userName);
                              setActiveChatId(chat.chatId || null);
                            }}
                            className={`w-full text-left rtl:text-right p-2.5 rounded-xl border text-[11px] transition-all flex flex-col gap-1 cursor-pointer opacity-70 hover:opacity-100 ${
                              activeChatUserId === chat.userId
                                ? 'border-primary-red bg-primary-red/5'
                                : 'border-card-border/60 hover:bg-card-border/10'
                            }`}
                          >
                            <div className="flex justify-between items-center w-full font-bold">
                              <span className="text-white">{chat.userName}</span>
                              <span className="text-[8px] text-text-muted">
                                {new Date(chat.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <p className="text-[10px] text-text-muted truncate max-w-full italic">
                              {chat.lastMessage}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

            {/* Right details: chat conversations */}
            <div className="md:w-2/3 flex flex-col justify-between">
              {activeChatUserId ? (
                <>
                  {/* Messages Area */}
                  <div className="bg-[#121214]/40 border border-card-border rounded-2xl p-4 h-[320px] overflow-y-auto space-y-3 mb-4 text-xs relative">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-card-border/50 sticky top-0 bg-[#121214] z-10 p-1">
                      <span className="text-[10px] text-text-muted font-bold block">
                        Chatting with <b className="text-white">{activeChatUserName}</b>
                      </span>
                      {activeChatId && activeChats.find(c => c.chatId === activeChatId)?.status !== 'CLOSED' && (
                        <button
                          onClick={async () => {
                            if (await confirm(locale === 'en' ? 'Are you sure you want to close this chat session?' : 'هل أنت متأكد من إنهاء هذه المحادثة؟')) {
                              closeChatMutation.mutate(activeChatId);
                            }
                          }}
                          className="px-2 py-1 bg-card border border-card-border rounded text-[9px] text-text-muted hover:text-white hover:bg-card-border cursor-pointer transition-colors"
                        >
                          {locale === 'en' ? 'End Chat' : 'إنهاء المحادثة'}
                        </button>
                      )}
                    </div>
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
        {/* ACTIVITY LOGS TAB */}
        {/* ========================================================================= */}
        {activeTab === 'LOGS' && (
          <div className="bg-[#18181B] border border-card-border rounded-3xl p-6">
            <h2 className="text-lg font-bold text-indigo-400 mb-6 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {locale === 'en' ? 'System Activity Logs' : 'سجل نشاطات النظام'}
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right text-xs">
                <thead className="text-text-muted border-b border-card-border/50">
                  <tr>
                    <th className="pb-3 font-bold">{locale === 'en' ? 'Time' : 'الوقت'}</th>
                    <th className="pb-3 font-bold">{locale === 'en' ? 'Actor' : 'المستخدم'}</th>
                    <th className="pb-3 font-bold">{locale === 'en' ? 'Action' : 'الحدث'}</th>
                    <th className="pb-3 font-bold">{locale === 'en' ? 'Resource' : 'العنصر'}</th>
                    <th className="pb-3 font-bold">{locale === 'en' ? 'Details' : 'التفاصيل'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border/30">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-text-muted italic">
                        {locale === 'en' ? 'No activity logs found.' : 'لا توجد سجلات.'}
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-card-border/10">
                        <td className="py-3 text-[10px] text-text-muted">
                          {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-3 font-bold text-white">{log.actor_email}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded bg-card-border text-[9px] uppercase font-bold text-indigo-400">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 text-text-muted">{log.resource_type} {log.resource_id ? `#${log.resource_id.substring(0, 8)}` : ''}</td>
                        <td className="py-3 text-[10px] text-text-muted truncate max-w-[200px]">
                          {JSON.stringify(log.metadata)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 transition-colors disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">{t('productNameAr')}</label>
                  <input
                    type="text"
                    value={editingProduct.nameAr || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, nameAr: e.target.value })}
                    required
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 transition-colors disabled:opacity-50"
                  />
                </div>

                {/* Category select */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">{t('productCategory')}</label>
                  <select
                    value={editingProduct.categoryId || 'cat-1'}
                    onChange={(e) => {
                      const newCatId = e.target.value;
                      const currentIds = editingProduct.categoryIds || [];
                      const filteredIds = currentIds.filter((id) => id !== newCatId);
                      setEditingProduct({ ...editingProduct, categoryId: newCatId, categoryIds: filteredIds });
                    }}
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 transition-colors disabled:opacity-50"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{locale === 'en' ? c.nameEn : c.nameAr}</option>
                    ))}
                  </select>
                </div>

                {/* Secondary Categories checkmarks */}
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">
                    {locale === 'en' ? 'Secondary Categories (Optional)' : 'تصنيفات إضافية (اختياري)'}
                  </label>
                  <div className="flex flex-wrap gap-3 bg-[#18181B] p-3 rounded-xl border border-card-border">
                    {categories
                      .filter((c) => c.id !== (editingProduct.categoryId || categories[0]?.id))
                      .map((c) => {
                        const isChecked = (editingProduct.categoryIds || []).includes(c.id);
                        return (
                          <label key={c.id} className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const currentIds = editingProduct.categoryIds || [];
                                const newIds = e.target.checked
                                  ? [...currentIds, c.id]
                                  : currentIds.filter((id) => id !== c.id);
                                setEditingProduct({ ...editingProduct, categoryIds: newIds });
                              }}
                              className="rounded border-card-border bg-card-border text-primary-red focus:ring-primary-red/50 focus:ring-offset-background"
                            />
                            <span>{locale === 'en' ? c.nameEn : c.nameAr}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>

                {/* Branch Scope select */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">
                    {locale === 'en' ? 'Item Branch Scope' : 'نطاق فرع المنتج'}
                  </label>
                  <select
                    value={editingProduct.branchId || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, branchId: e.target.value || null })}
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 transition-colors disabled:opacity-50"
                  >
                    <option value="">{locale === 'en' ? 'All Branches (Global)' : 'جميع الفروع (عام)'}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{locale === 'en' ? b.nameEn : b.nameAr}</option>
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
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 transition-colors resize-none disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">{t('productDescAr')}</label>
                  <textarea
                    value={editingProduct.descAr || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, descAr: e.target.value })}
                    required
                    rows={2}
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 transition-colors resize-none disabled:opacity-50"
                  />
                </div>

                {/* Size Type & Pricing System */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">
                    {locale === 'en' ? 'Size Option System' : 'نظام خيارات الحجم'}
                  </label>
                  <select
                    value={editingProduct.sizeType || 'NUMERIC'}
                    onChange={(e) => setEditingProduct({ 
                      ...editingProduct, 
                      sizeType: e.target.value as 'NUMERIC' | 'SIZE' 
                    })}
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 transition-colors disabled:opacity-50"
                  >
                    <option value="NUMERIC">{locale === 'en' ? 'Numeric (Single / Double / Triple)' : 'رقمي (سنجل / دبل / تربل)'}</option>
                    <option value="SIZE">{locale === 'en' ? 'Standard Sizes (Small / Medium / Large / Family)' : 'الأحجام القياسية (صغير / وسط / كبير / عائلي)'}</option>
                  </select>
                </div>

                {/* Prices based on sizeType */}
                {(editingProduct.sizeType === 'SIZE') ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">
                        {locale === 'en' ? 'Price (Small)' : 'السعر (صغير)'}
                      </label>
                      <input
                        type="number"
                        value={editingProduct.priceSingle || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, priceSingle: Number(e.target.value) })}
                        required
                        className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 transition-colors disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">
                        {locale === 'en' ? 'Price (Medium)' : 'السعر (وسط)'}
                      </label>
                      <input
                        type="number"
                        value={editingProduct.priceDouble || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, priceDouble: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 transition-colors disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">
                        {locale === 'en' ? 'Price (Large)' : 'السعر (كبير)'}
                      </label>
                      <input
                        type="number"
                        value={editingProduct.priceTriple || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, priceTriple: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 transition-colors disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">
                        {locale === 'en' ? 'Price (Family)' : 'السعر (عائلي)'}
                      </label>
                      <input
                        type="number"
                        value={editingProduct.priceFamily || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, priceFamily: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 transition-colors disabled:opacity-50"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">
                        {locale === 'en' ? 'Price (Single)' : 'السعر (سنجل)'}
                      </label>
                      <input
                        type="number"
                        value={editingProduct.priceSingle || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, priceSingle: Number(e.target.value) })}
                        required
                        className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 transition-colors disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">
                        {locale === 'en' ? 'Price (Double)' : 'السعر (دبل)'}
                      </label>
                      <input
                        type="number"
                        value={editingProduct.priceDouble || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, priceDouble: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 transition-colors disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">
                        {locale === 'en' ? 'Price (Triple)' : 'السعر (تربل)'}
                      </label>
                      <input
                        type="number"
                        value={editingProduct.priceTriple || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, priceTriple: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 transition-colors disabled:opacity-50"
                      />
                    </div>
                  </>
                )}

                {/* Image URL / Upload */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">
                    {t('productImage')} {locale === 'en' ? '(Link or Upload)' : '(رابط أو رفع ملف)'}
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={editingProduct.imageUrl || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                      placeholder="https://..."
                      className="flex-1 text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50 transition-colors disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setEditingProduct({ ...editingProduct, imageUrl: '/logo.png' })}
                      className="px-3 py-2.5 bg-card border border-card-border text-accent-amber text-xs font-bold rounded-xl whitespace-nowrap hover:bg-card-border transition-colors cursor-pointer"
                    >
                      {locale === 'en' ? 'Use Placeholder' : 'استخدام الافتراضي'}
                    </button>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploadingImage}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        disabled={isUploadingImage}
                        className="px-3 py-2.5 bg-card border border-card-border text-white text-xs font-bold rounded-xl whitespace-nowrap hover:bg-card-border transition-colors disabled:opacity-50"
                      >
                        {isUploadingImage ? '...' : (locale === 'en' ? 'Upload' : 'رفع')}
                      </button>
                    </div>
                  </div>
                  {editingProduct.imageUrl && (
                    <div className="mt-2 h-24 w-24 rounded-lg border border-card-border overflow-hidden bg-[#18181B]">
                      <img src={editingProduct.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Sandwich Extras Configuration */}
                <div className="space-y-3 sm:col-span-2 border-t border-card-border/50 pt-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-accent-amber block font-black uppercase tracking-widest">
                      {locale === 'en' ? 'Sandwich Extras Configuration' : 'إعداد إضافات الساندوتش'}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const currentExtras = editingProduct.extrasConfig || [];
                        const newExtra = {
                          id: `extra-${Date.now()}`,
                          nameEn: '',
                          nameAr: '',
                          isStandard: false,
                          price: 0,
                          maxLimit: 1
                        };
                        setEditingProduct({ ...editingProduct, extrasConfig: [...currentExtras, newExtra] });
                      }}
                      className="px-2.5 py-1.5 bg-card border border-card-border text-[9px] text-white hover:text-primary-red rounded-lg transition-colors cursor-pointer"
                    >
                      + {locale === 'en' ? 'Add Custom Item' : 'إضافة عنصر مخصص'}
                    </button>
                  </div>

                  <p className="text-[10px] text-text-muted">
                    {locale === 'en' 
                      ? 'Standard items can be deselected by customers (will print "NO [Item]" on ticket). Non-standard items are paid extras with a price and maximum limit.'
                      : 'العناصر الأساسية يمكن للعميل إلغاء تحديدها (ستطبع "بدون [العنصر]" باللون الأحمر على الفاتورة). العناصر غير الأساسية هي إضافات مدفوعة بسعر وحد أقصى.'}
                  </p>

                  {/* Extras list */}
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                    {((editingProduct.extrasConfig && Array.isArray(editingProduct.extrasConfig)) ? editingProduct.extrasConfig : []).length === 0 ? (
                      <div className="text-[10px] text-text-muted italic bg-[#18181B] p-4 rounded-xl border border-card-border/50 text-center">
                        {locale === 'en' ? 'No extras configured yet. Click "Add Custom Item" or initialize defaults below.' : 'لم يتم إعداد إضافات بعد. انقر على إضافة عنصر مخصص أو تهيئة الافتراضي أدناه.'}
                        <div className="mt-2 flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const defaults = [
                                { id: 'lettuce', nameEn: 'Lettuce', nameAr: 'خس', isStandard: true, price: 0, maxLimit: 1 },
                                { id: 'onion', nameEn: 'Onion', nameAr: 'بصل', isStandard: true, price: 0, maxLimit: 1 },
                                { id: 'pickle', nameEn: 'Pickles', nameAr: 'مخلل', isStandard: true, price: 0, maxLimit: 1 },
                                { id: 'tomato', nameEn: 'Tomato', nameAr: 'طماطم', isStandard: true, price: 0, maxLimit: 1 },
                                { id: 'cheese', nameEn: 'Extra Cheese', nameAr: 'جبنة إضافية', isStandard: false, price: 15, maxLimit: 3 },
                                { id: 'patty', nameEn: 'Extra Patty', nameAr: 'شريحة لحم إضافية', isStandard: false, price: 40, maxLimit: 2 }
                              ];
                              setEditingProduct({ ...editingProduct, extrasConfig: defaults });
                            }}
                            className="px-3 py-1 bg-primary-red/10 border border-primary-red/20 text-primary-red text-[9px] font-bold rounded-lg hover:bg-primary-red/25 transition-colors cursor-pointer"
                          >
                            {locale === 'en' ? 'Initialize Default Sandwich Config' : 'تهيئة الإعداد الافتراضي للساندوتش'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {editingProduct.extrasConfig?.map((item: any, idx: number) => (
                          <div key={item.id || idx} className="grid grid-cols-1 sm:grid-cols-6 gap-2 bg-[#18181B] p-2.5 rounded-xl border border-card-border/50 items-center">
                            
                            {/* Type Switch */}
                            <div className="sm:col-span-1">
                              <select
                                value={item.isStandard ? 'standard' : 'extra'}
                                onChange={(e) => {
                                  const updated = [...(editingProduct.extrasConfig || [])];
                                  updated[idx] = { 
                                    ...item, 
                                    isStandard: e.target.value === 'standard',
                                    price: e.target.value === 'standard' ? 0 : (item.price || 15),
                                    maxLimit: e.target.value === 'standard' ? 1 : (item.maxLimit || 3)
                                  };
                                  setEditingProduct({ ...editingProduct, extrasConfig: updated });
                                }}
                                className="w-full text-[10px] bg-[#121214] border border-card-border rounded-lg px-2 py-1.5 text-white focus:outline-none"
                              >
                                <option value="standard">{locale === 'en' ? 'Standard' : 'أساسي'}</option>
                                <option value="extra">{locale === 'en' ? 'Extra' : 'إضافي'}</option>
                              </select>
                            </div>

                            {/* Name EN */}
                            <div className="sm:col-span-2">
                              <input
                                type="text"
                                value={item.nameEn || ''}
                                onChange={(e) => {
                                  const updated = [...(editingProduct.extrasConfig || [])];
                                  updated[idx] = { ...item, nameEn: e.target.value };
                                  setEditingProduct({ ...editingProduct, extrasConfig: updated });
                                }}
                                placeholder="Name (EN)"
                                required
                                className="w-full text-[10px] bg-[#121214] border border-card-border rounded-lg px-2 py-1.5 text-white focus:outline-none"
                              />
                            </div>

                            {/* Name AR */}
                            <div className="sm:col-span-1">
                              <input
                                type="text"
                                value={item.nameAr || ''}
                                onChange={(e) => {
                                  const updated = [...(editingProduct.extrasConfig || [])];
                                  updated[idx] = { ...item, nameAr: e.target.value };
                                  setEditingProduct({ ...editingProduct, extrasConfig: updated });
                                }}
                                placeholder="Name (AR)"
                                required
                                className="w-full text-[10px] bg-[#121214] border border-card-border rounded-lg px-2 py-1.5 text-white focus:outline-none"
                              />
                            </div>

                            {/* Price & Max (Only if Extra) */}
                            <div className="sm:col-span-1 flex gap-1 items-center">
                              {!item.isStandard ? (
                                <>
                                  <input
                                    type="number"
                                    value={item.price || 0}
                                    onChange={(e) => {
                                      const updated = [...(editingProduct.extrasConfig || [])];
                                      updated[idx] = { ...item, price: Number(e.target.value) };
                                      setEditingProduct({ ...editingProduct, extrasConfig: updated });
                                    }}
                                    placeholder="Price"
                                    className="w-1/2 text-[10px] bg-[#121214] border border-card-border rounded-lg px-1.5 py-1.5 text-white text-center focus:outline-none"
                                  />
                                  <input
                                    type="number"
                                    value={item.maxLimit || 1}
                                    onChange={(e) => {
                                      const updated = [...(editingProduct.extrasConfig || [])];
                                      updated[idx] = { ...item, maxLimit: Number(e.target.value) };
                                      setEditingProduct({ ...editingProduct, extrasConfig: updated });
                                    }}
                                    placeholder="Max"
                                    className="w-1/2 text-[10px] bg-[#121214] border border-card-border rounded-lg px-1.5 py-1.5 text-white text-center focus:outline-none"
                                  />
                                </>
                              ) : (
                                <span className="text-[9px] text-text-muted block text-center w-full italic">Standard</span>
                              )}
                            </div>

                            {/* Delete button */}
                            <div className="sm:col-span-1 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (editingProduct.extrasConfig || []).filter((_: any, i: number) => i !== idx);
                                  setEditingProduct({ ...editingProduct, extrasConfig: updated });
                                }}
                                className="p-1.5 text-text-muted hover:text-primary-red cursor-pointer rounded-lg hover:bg-card-border/30 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>

                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                  disabled={saveProductMutation.isPending}
                  className="px-5 py-2.5 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {saveProductMutation.isPending ? '...' : t('save')}
                </button>
              </div>

            </form>
          </div>
        )}

      </main>

      {/* ===== STICKY BOTTOM TAB BAR — Mobile Only (md:hidden) ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#0E0E10]/95 backdrop-blur-md border-t border-card-border safe-bottom">
        <div className="flex items-stretch h-16">
          {role !== 'CUSTOMER_SERVICE' && (
            <button
              onClick={() => setActiveTab('ORDERS')}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                activeTab === 'ORDERS' ? 'text-primary-red' : 'text-text-muted'
              }`}
            >
              <ListOrdered className="h-5 w-5" />
              <span>{locale === 'en' ? 'Orders' : 'الطلبات'}</span>
            </button>
          )}

          {['OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER'].includes(role || '') && (
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
              {['OWNER', 'HEAD_ADMIN', 'ADMIN'].includes(role || '') && (
                <>
                  <button
                    onClick={() => setActiveTab('COUPONS')}
                    className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                      activeTab === 'COUPONS' ? 'text-primary-red' : 'text-text-muted'
                    }`}
                  >
                    <DollarSign className="h-5 w-5" />
                    <span>{locale === 'en' ? 'Coupons' : 'كوبونات'}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('REVIEWS')}
                    className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                      activeTab === 'REVIEWS' ? 'text-primary-red' : 'text-text-muted'
                    }`}
                  >
                    <Star className="h-5 w-5" />
                    <span>{locale === 'en' ? 'Reviews' : 'التقييمات'}</span>
                  </button>
                </>
              )}
            </>
          )}

          {['OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER', 'STAFF', 'CUSTOMER_SERVICE'].includes(role || '') && (
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

        {showStatsOverlay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setShowStatsOverlay(false)} />
            <div className="relative w-full max-w-4xl bg-card border border-card-border rounded-3xl p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200 space-y-6">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-card-border/50">
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {locale === 'en' ? 'Dodz Platform Business Analytics' : 'تحليلات أعمال منصة دودز'}
                  </h3>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {locale === 'en'
                      ? 'Detailed breakdown of customer orders and revenue parameters.'
                      : 'تفصيل كامل لطلبات العملاء ومعايير الإيرادات.'}
                  </p>
                </div>
                <button
                  onClick={() => setShowStatsOverlay(false)}
                  className="p-1.5 rounded-lg hover:bg-card-border transition-colors text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Time Range Filter Selector */}
              <div className="flex gap-2 p-1 bg-card-border rounded-xl w-fit">
                {(['DAY', 'WEEK', 'MONTH', 'ALL'] as const).map((filter) => {
                  const label = {
                    DAY: locale === 'en' ? 'Today' : 'اليوم',
                    WEEK: locale === 'en' ? 'This Week' : 'هذا الأسبوع',
                    MONTH: locale === 'en' ? 'This Month' : 'هذا الشهر',
                    ALL: locale === 'en' ? 'All-Time' : 'كل الأوقات',
                  }[filter];
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setStatsFilter(filter)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        statsFilter === filter ? 'bg-primary-red text-white' : 'text-text-muted hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Aggregated KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[#18181B] border border-card-border flex items-center gap-4 text-white">
                  <div className="h-10 w-10 rounded-xl bg-accent-amber/10 text-accent-amber flex items-center justify-center">
                    <ListOrdered className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted block font-semibold">{locale === 'en' ? 'Orders count' : 'عدد الطلبات'}</span>
                    <span className="text-lg font-black text-white">{statsCount}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#18181B] border border-card-border flex items-center gap-4 text-white">
                  <div className="h-10 w-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted block font-semibold">{t('revenue')}</span>
                    <span className="text-lg font-black text-white">{statsRevenue} EGP</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#18181B] border border-card-border flex items-center gap-4 text-white">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted block font-semibold">{locale === 'en' ? 'Avg Order Value' : 'متوسط قيمة الطلب'}</span>
                    <span className="text-lg font-black text-white">{statsAOV} EGP</span>
                  </div>
                </div>
              </div>

              {/* Orders History List Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  {locale === 'en' ? 'Historical Orders List' : 'قائمة الطلبات التاريخية'}
                </h4>
                <div className="overflow-x-auto border border-card-border rounded-2xl">
                  <table className="w-full text-left rtl:text-right text-[11px] text-white">
                    <thead className="bg-[#18181B] text-text-muted border-b border-card-border">
                      <tr>
                        <th className="p-3 font-bold">{locale === 'en' ? 'Order ID' : 'رقم الطلب'}</th>
                        <th className="p-3 font-bold">{locale === 'en' ? 'Customer' : 'العميل'}</th>
                        <th className="p-3 font-bold">{locale === 'en' ? 'Date' : 'التاريخ'}</th>
                        <th className="p-3 font-bold">{locale === 'en' ? 'Status' : 'الحالة'}</th>
                        <th className="p-3 font-bold">{locale === 'en' ? 'Payment' : 'الدفع'}</th>
                        <th className="p-3 font-bold">{locale === 'en' ? 'Total' : 'الإجمالي'}</th>
                        <th className="p-3 font-bold text-center">{locale === 'en' ? 'Action' : 'إجراء'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border/30 bg-[#0E0E10]">
                      {statsOrders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-text-muted italic">
                            {locale === 'en' ? 'No orders in this period.' : 'لا توجد طلبات في هذه الفترة.'}
                          </td>
                        </tr>
                      ) : (
                        statsOrders.map((o) => {
                          const dateStr = new Date(o.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'ar-EG', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          });
                          return (
                            <tr key={o.id} className="hover:bg-card-border/20 transition-all">
                              <td className="p-3 font-bold text-accent-amber font-mono">#{o.id}</td>
                              <td className="p-3">
                                <div>{o.userName}</div>
                                <div className="text-[10px] text-text-muted font-mono">{o.userPhone}</div>
                              </td>
                              <td className="p-3 text-text-muted">{dateStr}</td>
                              <td className="p-3">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  o.status === 'DELIVERED' ? 'bg-green-500/10 text-green-500' :
                                  o.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500' :
                                  'bg-accent-amber/10 text-accent-amber'
                                }`}>
                                  {o.status}
                                </span>
                              </td>
                              <td className="p-3 text-text-muted uppercase font-semibold">{o.paymentMethod}</td>
                              <td className="p-3 font-bold text-white">{o.total} EGP</td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => {
                                    setSelectedStatsOrder(o);
                                  }}
                                  className="px-2 py-1 bg-primary-red hover:bg-primary-red-hover text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                                >
                                  {locale === 'en' ? 'View Details' : 'عرض التفاصيل'}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Statistics Order Details Modal */}
        {selectedStatsOrder && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setSelectedStatsOrder(null)} />
            <div className="relative w-full max-w-lg bg-card border border-card-border rounded-3xl p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200 space-y-6">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-card-border/50">
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {locale === 'en' ? 'Order Details' : 'تفاصيل الطلب'}
                  </h3>
                  <p className="text-xs font-mono text-accent-amber mt-0.5">#{selectedStatsOrder.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStatsOrder(null)}
                  className="p-1.5 rounded-lg hover:bg-card-border text-text-muted hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Status and Branch */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#18181B] p-3 rounded-2xl border border-card-border/50 text-xs">
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-bold tracking-wider mb-0.5">{locale === 'en' ? 'Branch' : 'الفرع'}</span>
                  <span className="text-white font-bold">
                    {(() => {
                      const b = allBranches.find(br => br.id === selectedStatsOrder.branchId);
                      return b ? (locale === 'en' ? b.nameEn : b.nameAr) : (locale === 'en' ? 'Global (All)' : 'عام');
                    })()}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-bold tracking-wider mb-0.5">{locale === 'en' ? 'Status' : 'الحالة'}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase inline-block ${
                    selectedStatsOrder.status === 'DELIVERED' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                    selectedStatsOrder.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                    'bg-accent-amber/10 text-accent-amber border border-accent-amber/20'
                  }`}>
                    {selectedStatsOrder.status}
                  </span>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-2.5 text-xs text-text-muted">
                <h4 className="text-[10px] text-accent-amber font-extrabold uppercase tracking-widest">{locale === 'en' ? 'Customer details' : 'تفاصيل العميل'}</h4>
                <div className="bg-[#18181B] p-3.5 rounded-2xl border border-card-border/50 space-y-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-white">{selectedStatsOrder.userName}</span>
                    <span className="font-mono">{selectedStatsOrder.userPhone}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-text-muted font-bold uppercase mb-0.5">{locale === 'en' ? 'Delivery Address' : 'عنوان التوصيل'}</span>
                    <span className="text-white text-xs">{selectedStatsOrder.address || (locale === 'en' ? 'Pickup from Branch' : 'استلام من الفرع')}</span>
                  </div>
                  {selectedStatsOrder.notes && (
                    <div className="bg-accent-amber/5 border border-accent-amber/20 text-accent-amber p-2.5 rounded-xl mt-1 text-[11px] font-medium italic">
                      ⚠️ {selectedStatsOrder.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2.5 text-xs">
                <h4 className="text-[10px] text-accent-amber font-extrabold uppercase tracking-widest">{locale === 'en' ? 'Items List' : 'قائمة المشتريات'}</h4>
                <div className="bg-[#18181B] p-3 rounded-2xl border border-card-border/50 divide-y divide-card-border/30">
                  {selectedStatsOrder.items?.map((it: any, idx: number) => (
                    <div key={idx} className="py-2.5 space-y-1">
                      <div className="flex justify-between items-center text-xs text-text-muted">
                        <div>
                          <span className="font-bold text-white">{it.quantity}x</span>{' '}
                          <span className="text-foreground">{locale === 'en' ? it.productNameEn : it.productNameAr}</span>
                          {it.size !== 'NONE' && (
                            <span className="block text-[9px] text-primary-red font-bold uppercase mt-0.5">
                              {it.size}
                            </span>
                          )}
                        </div>
                        <span className="text-white font-bold font-mono">{it.price * it.quantity} EGP</span>
                      </div>
                      
                      {/* Customizations */}
                      {it.customizations && it.customizations.length > 0 && (
                        <div className="pl-4 text-[9px] text-accent-amber font-semibold flex flex-wrap gap-1">
                          {it.customizations.map((cust: any, cIdx: number) => (
                            <span key={cIdx} className="bg-accent-amber/10 border border-accent-amber/25 px-1 py-0.2 rounded">
                              + {locale === 'en' ? cust.nameEn : cust.nameAr}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Extras */}
                      {it.extras && it.extras.length > 0 && (
                        <div className="pl-4 text-[9px] font-semibold flex flex-wrap gap-1">
                          {it.extras.map((extra: any, eIdx: number) => {
                            if (extra.isStandard && extra.quantity === 0) {
                              return (
                                <span key={eIdx} className="bg-red-500/10 border border-red-500/25 px-1 py-0.2 rounded text-red-500">
                                  NO {locale === 'en' ? extra.nameEn.toUpperCase() : extra.nameAr}
                                </span>
                              );
                            }
                            if (!extra.isStandard && extra.quantity > 0) {
                              return (
                                <span key={eIdx} className="bg-accent-amber/10 border border-accent-amber/20 px-1 py-0.2 rounded text-accent-amber">
                                  + {locale === 'en' ? extra.nameEn : extra.nameAr} {extra.quantity > 1 ? `x${extra.quantity}` : ''}
                                </span>
                              );
                            }
                            return null;
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial summary */}
              <div className="bg-[#18181B] p-4 rounded-2xl border border-card-border/50 space-y-2 text-xs text-text-muted">
                <div className="flex justify-between">
                  <span>{locale === 'en' ? 'Subtotal' : 'الإجمالي الفرعي'}:</span>
                  <span className="text-white font-bold font-mono">{selectedStatsOrder.total - selectedStatsOrder.deliveryFee + selectedStatsOrder.discount} EGP</span>
                </div>
                {selectedStatsOrder.discount > 0 && (
                  <div className="flex justify-between text-green-500">
                    <span>{locale === 'en' ? 'Discount' : 'الخصم'}:</span>
                    <span className="font-bold font-mono">-{selectedStatsOrder.discount} EGP</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{locale === 'en' ? 'Delivery Fee' : 'رسوم التوصيل'}:</span>
                  <span className="text-white font-bold font-mono">{selectedStatsOrder.deliveryFee} EGP</span>
                </div>
                <div className="flex justify-between text-sm text-white font-black border-t border-card-border/50 pt-2">
                  <span>{locale === 'en' ? 'Grand Total' : 'الإجمالي الكلي'}:</span>
                  <span className="text-accent-amber font-mono">{selectedStatsOrder.total} EGP</span>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStatsOrder(null)}
                  className="px-6 py-2.5 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {locale === 'en' ? 'Close' : 'إغلاق'}
                </button>
              </div>

            </div>
          </div>
        )}

        {branchOverrideProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setBranchOverrideProduct(null)} />
            <div className="relative w-full max-w-lg bg-card border border-card-border rounded-3xl p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-card-border/50">
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {locale === 'en' ? 'Branch Pricing Overrides' : 'تعديل أسعار الفروع'}
                  </h3>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {locale === 'en' ? `Product: ${branchOverrideProduct.nameEn}` : `المنتج: ${branchOverrideProduct.nameAr}`}
                  </p>
                </div>
                <button onClick={() => setBranchOverrideProduct(null)} className="p-1.5 rounded-lg hover:bg-card-border text-text-muted hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
              </div>

              <div className="space-y-4">
                {branchOverrides.map((override, index) => {
                  const branchObj = allBranches.find(b => b.id === override.branch_id);
                  const branchName = branchObj ? (locale === 'en' ? branchObj.nameEn : branchObj.nameAr) : 'Branch';

                  return (
                    <div key={override.branch_id} className="p-4 bg-[#18181B] border border-card-border rounded-2xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-accent-amber">{branchName}</span>
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{locale === 'en' ? 'Available' : 'متاح'}</label>
                          <input
                            type="checkbox"
                            checked={override.is_available}
                            onChange={(e) => {
                              const updated = [...branchOverrides];
                              updated[index].is_available = e.target.checked;
                              setBranchOverrides(updated);
                            }}
                            className="rounded bg-card border-card-border text-primary-red focus:ring-primary-red/50"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted block font-bold uppercase tracking-wider">
                            {locale === 'en' ? 'Single Price Override (EGP)' : 'سعر السنجل'}
                          </label>
                          <input
                            type="number"
                            placeholder={`Base: ${branchOverrideProduct.priceSingle}`}
                            value={override.price_single}
                            onChange={(e) => {
                              const updated = [...branchOverrides];
                              updated[index].price_single = e.target.value;
                              setBranchOverrides(updated);
                            }}
                            className="w-full text-xs bg-card border border-card-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary-red/50"
                          />
                        </div>
                        {branchOverrideProduct.priceDouble !== undefined && (
                          <div className="space-y-1">
                            <label className="text-[9px] text-text-muted block font-bold uppercase tracking-wider">
                              {locale === 'en' ? 'Double Price Override (EGP)' : 'سعر الدبل'}
                            </label>
                            <input
                              type="number"
                              placeholder={`Base: ${branchOverrideProduct.priceDouble}`}
                              value={override.price_double}
                              onChange={(e) => {
                                const updated = [...branchOverrides];
                                updated[index].price_double = e.target.value;
                                setBranchOverrides(updated);
                              }}
                              className="w-full text-xs bg-card border border-card-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary-red/50"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBranchOverrideProduct(null)}
                  className="flex-1 py-3 bg-card border border-card-border hover:bg-white/5 text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                >
                  {locale === 'en' ? 'Cancel' : 'إلغاء'}
                </button>
                <button
                  type="button"
                  disabled={isSavingOverrides}
                  onClick={handleSaveBranchOverrides}
                  className="flex-1 py-3 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSavingOverrides ? '...' : (locale === 'en' ? 'Save Overrides' : 'حفظ التغييرات')}
                </button>
              </div>
            </div>
          </div>
        )}

        {customizationMappingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setCustomizationMappingProduct(null)} />
            <div className="relative w-full max-w-lg bg-card border border-card-border rounded-3xl p-6 shadow-2xl z-10 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-card-border/50">
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {locale === 'en' ? 'Configure Customizations' : 'تهيئة خيارات التخصيص'}
                  </h3>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {locale === 'en' ? `Product: ${customizationMappingProduct.nameEn}` : `المنتج: ${customizationMappingProduct.nameAr}`}
                  </p>
                </div>
                <button onClick={() => setCustomizationMappingProduct(null)} className="p-1.5 rounded-lg hover:bg-card-border text-text-muted hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
              </div>

              {/* Scrollable list area */}
              <div className="flex-1 overflow-y-auto py-2 space-y-4 pr-1 scrollbar-thin">
                {/* Add New Customization Group Button/Form */}
                <div className="bg-[#18181B] border border-card-border rounded-2xl p-4 space-y-3">
                  {!showAddGroupForm ? (
                    <button
                      type="button"
                      onClick={() => setShowAddGroupForm(true)}
                      className="w-full py-2 bg-[#131316] hover:bg-card-border text-indigo-400 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 border border-indigo-500/20"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{locale === 'en' ? 'Create Customization Group' : 'إنشاء مجموعة خيارات جديدة'}</span>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-indigo-400">{locale === 'en' ? 'New Customization Group' : 'مجموعة خيارات جديدة'}</span>
                        <button type="button" onClick={() => setShowAddGroupForm(false)} className="text-[10px] text-text-muted hover:text-white">{locale === 'en' ? 'Cancel' : 'إلغاء'}</button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted block font-bold uppercase tracking-wider">Group Name (En)</label>
                          <input type="text" placeholder="e.g. Cheese Options" value={newGroupNameEn} onChange={(e) => setNewGroupNameEn(e.target.value)}
                            className="w-full text-xs bg-card border border-card-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500/50" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted block font-bold uppercase tracking-wider">Group Name (Ar)</label>
                          <input type="text" placeholder="مثال: خيارات الجبن" value={newGroupNameAr} onChange={(e) => setNewGroupNameAr(e.target.value)}
                            className="w-full text-xs bg-card border border-card-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500/50" />
                        </div>
                      </div>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                             {newGroupOptionsList.map((opt, idx) => (
                               <div key={idx} className="flex gap-2 items-center bg-[#18181B] border border-card-border p-2 rounded-xl">
                                 <input
                                   type="text"
                                   value={opt.name_en}
                                   onChange={(e) => {
                                     const val = e.target.value;
                                     setNewGroupOptionsList(prev => prev.map((o, i) => i === idx ? { ...o, name_en: val } : o));
                                   }}
                                   placeholder="Name (EN)"
                                   className="w-1/3 text-[10px] bg-black border border-card-border rounded-lg px-2 py-1 text-white focus:outline-none focus:border-primary-red/50"
                                 />
                                 <input
                                   type="text"
                                   value={opt.name_ar}
                                   onChange={(e) => {
                                     const val = e.target.value;
                                     setNewGroupOptionsList(prev => prev.map((o, i) => i === idx ? { ...o, name_ar: val } : o));
                                   }}
                                   placeholder="الاسم (عربي)"
                                   className="w-1/3 text-[10px] bg-black border border-card-border rounded-lg px-2 py-1 text-white text-right focus:outline-none focus:border-primary-red/50"
                                 />
                                 <div className="w-1/4 flex items-center gap-1">
                                   <input
                                     type="number"
                                     value={opt.price}
                                     onChange={(e) => {
                                       const val = parseFloat(e.target.value) || 0;
                                       setNewGroupOptionsList(prev => prev.map((o, i) => i === idx ? { ...o, price: val } : o));
                                     }}
                                     placeholder="Price"
                                     className="w-full text-[10px] bg-black border border-card-border rounded-lg px-2 py-1 text-white focus:outline-none focus:border-primary-red/50"
                                   />
                                   <span className="text-[9px] text-text-muted shrink-0">EGP</span>
                                 </div>
                                 <button
                                   type="button"
                                   onClick={() => setNewGroupOptionsList(newGroupOptionsList.filter((_, i) => i !== idx))}
                                   className="text-red-500 hover:text-red-400 font-bold ml-1 text-xs cursor-pointer focus:outline-none"
                                 >
                                   &times;
                                 </button>
                               </div>
                             ))}
                           </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted block font-bold uppercase tracking-wider">Min Selections</label>
                          <input type="number" min="0" value={newGroupMin} onChange={(e) => setNewGroupMin(e.target.value)}
                            className="w-full text-xs bg-card border border-card-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500/50" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted block font-bold uppercase tracking-wider">Max Selections</label>
                          <input type="number" min="1" value={newGroupMax} onChange={(e) => setNewGroupMax(e.target.value)}
                            className="w-full text-xs bg-card border border-card-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500/50" />
                        </div>
                      </div>

                      {/* Visual Options List Manager */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-text-muted block font-bold uppercase tracking-wider">
                          {locale === 'en' ? 'Group Options List' : 'قائمة خيارات المجموعة'}
                        </label>
                        {newGroupOptionsList.length === 0 ? (
                          <div className="p-3 text-center border border-dashed border-card-border rounded-xl text-text-muted text-[10px]">
                            {locale === 'en' ? 'No options added yet' : 'لم يتم إضافة خيارات بعد'}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 p-2 bg-[#131316] border border-card-border rounded-xl">
                            {newGroupOptionsList.map((opt, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-[#18181B] border border-card-border rounded-lg text-[10px] text-white">
                                <span>{locale === 'en' ? `${opt.name_en} (+${opt.price} EGP)` : `${opt.name_ar} (+${opt.price} ج.م)`}</span>
                                <button
                                  type="button"
                                  onClick={() => setNewGroupOptionsList(newGroupOptionsList.filter((_, i) => i !== idx))}
                                  className="text-red-500 hover:text-red-400 font-bold ml-1 text-xs cursor-pointer focus:outline-none"
                                >
                                  &times;
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Select & Import from Menu Items */}
                      <div className="p-3 bg-[#131316] border border-card-border rounded-xl space-y-2">
                        <label className="text-[10px] text-[#fbbf24] block font-black uppercase tracking-wider">
                          {locale === 'en' ? 'Option A: Add from Menu Items (Multi-select)' : 'الخيار أ: إضافة من عناصر المنيو (تحديد متعدد)'}
                        </label>
                        
                        <div className="space-y-2">
                          <div className="max-h-40 overflow-y-auto bg-[#18181B] border border-card-border rounded-xl p-3 space-y-3 scrollbar-thin">
                            {categories.map((cat) => {
                              const catProducts = products.filter(p => p.categoryId === cat.id);
                              if (catProducts.length === 0) return null;
                              return (
                                <div key={cat.id} className="space-y-1">
                                  <p className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-wider border-b border-card-border/20 pb-0.5 mb-1">
                                    {locale === 'en' ? cat.nameEn : cat.nameAr}
                                  </p>
                                  <div className="grid grid-cols-2 gap-1.5 pl-1.5">
                                    {catProducts.map((p) => {
                                      const isChecked = selectedImportProductIds.includes(p.id);
                                      return (
                                        <label key={p.id} className="flex items-center gap-1.5 text-[10px] font-bold text-white cursor-pointer hover:text-primary-red transition-colors">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedImportProductIds(prev => [...prev, p.id]);
                                              } else {
                                                setSelectedImportProductIds(prev => prev.filter(id => id !== p.id));
                                              }
                                            }}
                                            className="accent-primary-red shrink-0"
                                          />
                                          <span className="truncate" title={locale === 'en' ? p.nameEn : p.nameAr}>
                                            {locale === 'en' ? `${p.nameEn} (${p.priceSingle} EGP)` : `${p.nameAr} (${p.priceSingle} ج.م)`}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex justify-between items-center gap-4 pt-1">
                            <span className="text-[9px] text-text-muted">
                              {locale === 'en' 
                                ? `${selectedImportProductIds.length} items selected` 
                                : `تم تحديد ${selectedImportProductIds.length} عنصر`}
                            </span>
                            <button
                              type="button"
                              disabled={selectedImportProductIds.length === 0}
                              onClick={() => {
                                const newOpts = [...newGroupOptionsList];
                                selectedImportProductIds.forEach((pid) => {
                                  const prod = products.find(p => p.id === pid);
                                  if (prod) {
                                    newOpts.push({
                                      name_en: prod.nameEn,
                                      name_ar: prod.nameAr,
                                      price: prod.priceSingle || 0,
                                    });
                                  }
                                });
                                setNewGroupOptionsList(newOpts);
                                setSelectedImportProductIds([]);
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-[10px] font-black uppercase rounded-lg transition-colors cursor-pointer"
                            >
                              {locale === 'en' ? 'Add Selected' : 'إضافة المحددة'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Manual custom option builder */}
                      <div className="p-3 bg-[#131316] border border-card-border rounded-xl space-y-3">
                        <label className="text-[10px] text-[#fbbf24] block font-black uppercase tracking-wider">
                          {locale === 'en' ? 'Option B: Add Custom Option Manually' : 'الخيار ب: إضافة خيار مخصص يدوياً'}
                        </label>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[8px] text-text-muted block font-bold uppercase">{locale === 'en' ? 'Name (En)' : 'الاسم (En)'}</label>
                            <input
                              type="text"
                              placeholder="e.g. Extra Cheese"
                              value={manualOptNameEn}
                              onChange={(e) => setManualOptNameEn(e.target.value)}
                              className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-2 py-1.5 text-white focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] text-text-muted block font-bold uppercase">{locale === 'en' ? 'Name (Ar)' : 'الاسم (Ar)'}</label>
                            <input
                              type="text"
                              placeholder="مثال: جبن إضافي"
                              value={manualOptNameAr}
                              onChange={(e) => setManualOptNameAr(e.target.value)}
                              className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-2 py-1.5 text-white focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 items-center">
                          <div className="flex-1 space-y-1">
                            <label className="text-[8px] text-text-muted block font-bold uppercase">{locale === 'en' ? 'Price' : 'السعر'}</label>
                            <input
                              type="number"
                              disabled={manualOptFree}
                              value={manualOptFree ? '0' : manualOptPrice}
                              onChange={(e) => setManualOptPrice(e.target.value)}
                              className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-2 py-1.5 text-white focus:outline-none disabled:opacity-50"
                            />
                          </div>
                          <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer pt-4 font-bold select-none">
                            <input
                              type="checkbox"
                              checked={manualOptFree}
                              onChange={(e) => setManualOptFree(e.target.checked)}
                              className="accent-primary-red"
                            />
                            <span>{locale === 'en' ? 'Free Option' : 'خيار مجاني'}</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              if (!manualOptNameEn.trim() || !manualOptNameAr.trim()) {
                                alert(locale === 'en' ? 'Please fill out names' : 'يرجى ملء الأسماء');
                                return;
                              }
                              const finalPrice = manualOptFree ? 0 : parseFloat(manualOptPrice) || 0;
                              setNewGroupOptionsList([
                                ...newGroupOptionsList,
                                { name_en: manualOptNameEn.trim(), name_ar: manualOptNameAr.trim(), price: finalPrice }
                              ]);
                              setManualOptNameEn('');
                              setManualOptNameAr('');
                              setManualOptPrice('');
                              setManualOptFree(false);
                            }}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase rounded-lg transition-colors mt-4"
                          >
                            {locale === 'en' ? 'Add' : 'إضافة'}
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCreateCustomizationGroup}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        {locale === 'en' ? 'Add Group' : 'إضافة المجموعة'}
                      </button>
                    </div>
                  )}
                </div>

                {/* List of groups to assign */}
                <div className="space-y-2">
                  <h4 className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{locale === 'en' ? 'Available Groups' : 'مجموعات الخيارات المتاحة'}</h4>
                  {customizationGroupsList.length === 0 ? (
                    <p className="text-xs text-text-muted italic">{locale === 'en' ? 'No customization groups found.' : 'لا توجد مجموعات خيارات بعد.'}</p>
                  ) : (
                    customizationGroupsList.map((group) => {
                      const isAssigned = assignedCustomizationGroupIds.includes(group.id);

                      const handleCheckboxToggle = () => {
                        if (isAssigned) {
                          setAssignedCustomizationGroupIds(assignedCustomizationGroupIds.filter(id => id !== group.id));
                        } else {
                          setAssignedCustomizationGroupIds([...assignedCustomizationGroupIds, group.id]);
                        }
                      };

                      return (
                        <div
                          key={group.id}
                          onClick={handleCheckboxToggle}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                            isAssigned
                              ? 'bg-indigo-500/10 border-indigo-500 text-white'
                              : 'bg-card border-card-border hover:border-card-border-hover text-text-muted'
                          }`}
                        >
                          <div className="space-y-0.5 flex-grow pr-2 min-w-0">
                            <span className="text-white block truncate">{locale === 'en' ? (group.name_en || group.nameEn) : (group.name_ar || group.nameAr)}</span>
                            <span className="text-[10px] text-text-muted block font-mono font-medium truncate">
                              {group.customization_options?.map((o: any) => locale === 'en' ? o.name_en : o.name_ar).join(' • ') || 'No options'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Edit Group button */}
                            <button
                              type="button"
                              title={locale === 'en' ? 'Edit Group' : 'تعديل المجموعة'}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingGroupId(group.id);
                                setNewGroupNameEn(group.name_en || group.nameEn || '');
                                setNewGroupNameAr(group.name_ar || group.nameAr || '');
                                setNewGroupMin((group.min_selected !== undefined ? group.min_selected : group.minSelected || 0).toString());
                                setNewGroupMax((group.max_selected !== undefined ? group.max_selected : group.maxSelected || 1).toString());
                                const opts = group.customization_options?.map((o: any) => ({
                                  name_en: o.name_en || o.nameEn || '',
                                  name_ar: o.name_ar || o.nameAr || '',
                                  price: o.price || 0
                                })) || [];
                                setNewGroupOptionsList(opts);
                                setShowAddGroupForm(true);
                              }}
                              className="p-1 rounded bg-[#1A1A1E] hover:bg-[#27272C] text-indigo-400 border border-card-border hover:text-white transition-colors"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>

                            {/* Delete Group button */}
                            <button
                              type="button"
                              title={locale === 'en' ? 'Delete Group' : 'حذف المجموعة'}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomizationGroup(group.id);
                              }}
                              className="p-1 rounded bg-[#1A1A1E] hover:bg-red-500/10 text-red-500 border border-card-border hover:border-red-500 transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>

                            {/* Checkbox */}
                            <div className={`h-4.5 w-4.5 rounded flex items-center justify-center border ${
                              isAssigned ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-card-border bg-card-border'
                            }`}>
                              {isAssigned && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Product Multi-Selector */}
              <div className="border-t border-card-border/50 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setApplyProductsExpanded(!applyProductsExpanded)}
                  className="w-full flex items-center justify-between text-[10px] text-accent-amber font-bold uppercase tracking-wider mb-2 hover:text-[#ffdf6d] transition-colors focus:outline-none bg-card-border/20 px-3 py-2.5 rounded-xl border border-card-border/30 cursor-pointer"
                >
                  <span>{locale === 'en' ? 'Apply to Products (Multi-select)' : 'تطبيق على المنتجات (تحديد متعدد)'}</span>
                  {applyProductsExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-accent-amber" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-accent-amber" />
                  )}
                </button>
                
                {applyProductsExpanded && (
                  <div className="max-h-40 overflow-y-auto bg-[#18181B] border border-card-border rounded-xl p-3 space-y-3 scrollbar-thin animate-in fade-in slide-in-from-top-2 duration-200">
                    {adminCategories.map((cat: any) => {
                      const catProducts = products.filter((p: any) => p.categoryId === cat.id);
                      if (catProducts.length === 0) return null;
                      return (
                        <div key={cat.id} className="space-y-1.5">
                          <p className="text-[9px] font-extrabold text-primary-red uppercase tracking-wider border-b border-card-border/20 pb-0.5 mb-1">
                            {locale === 'en' ? cat.name_en || cat.nameEn : cat.name_ar || cat.nameAr}
                          </p>
                          <div className="grid grid-cols-2 gap-1.5 pl-1">
                            {catProducts.map((p: any) => {
                              const isChecked = selectedMappingProductIds.includes(p.id);
                              return (
                                <label key={p.id} className="flex items-center gap-1.5 text-[10px] font-bold text-white cursor-pointer hover:text-primary-red transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedMappingProductIds(prev => [...prev, p.id]);
                                      } else {
                                        setSelectedMappingProductIds(prev => prev.filter(id => id !== p.id));
                                      }
                                    }}
                                    className="accent-primary-red shrink-0"
                                  />
                                  <span className="truncate">{locale === 'en' ? p.nameEn : p.nameAr}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal actions */}
              <div className="flex gap-3 pt-4 border-t border-card-border/50">
                <button
                  type="button"
                  onClick={() => setCustomizationMappingProduct(null)}
                  className="flex-1 py-3 bg-card border border-card-border hover:bg-white/5 text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                >
                  {locale === 'en' ? 'Cancel' : 'إلغاء'}
                </button>
                <button
                  type="button"
                  disabled={isSavingCustomizations}
                  onClick={handleSaveCustomizationsMapping}
                  className="flex-1 py-3 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSavingCustomizations ? '...' : (locale === 'en' ? 'Save Customizations' : 'حفظ خيارات التخصيص')}
                </button>
              </div>
            </div>
          </div>
        )}

      <Footer />
    </>
  );
}
