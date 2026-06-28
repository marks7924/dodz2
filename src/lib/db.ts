// Dual-mode database layer: queries Supabase PostgreSQL tables when configured,
// and gracefully falls back to in-memory mock storage otherwise.

import type { UserRole } from '@/context/AuthContext';
import { createClient as createBrowserClient } from './supabase/client';

// ============================================================
// TYPES & INTERFACES (Front-end compatible)
// ============================================================

export interface Category {
  id: string;
  nameEn: string;
  nameAr: string;
  isDefault?: boolean;
  descEn?: string;
  descAr?: string;
}

export interface CustomizationOption {
  id: string;
  groupId: string;
  nameEn: string;
  nameAr: string;
  price: number;
}

export interface CustomizationGroup {
  id: string;
  nameEn: string;
  nameAr: string;
  minSelected: number;
  maxSelected: number;
  options: CustomizationOption[];
}

export interface Product {
  id: string;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  priceSingle: number;
  priceDouble?: number;
  priceTriple?: number;
  priceFamily?: number;
  sizeType?: 'NUMERIC' | 'SIZE';
  extrasConfig?: any[];
  imageUrl: string;
  categoryId: string;
  categoryIds?: string[];
  isAvailable: boolean;
  branchId?: string | null;
  sortOrder?: number;
  customizationGroups?: CustomizationGroup[];
}

export interface OrderItem {
  id: string;
  productId: string;
  productNameEn: string;
  productNameAr: string;
  size: string;
  quantity: number;
  price: number;
  customizations?: { optionId: string; nameEn: string; nameAr: string; price: number }[];
  extras?: { id: string; nameEn: string; nameAr: string; price: number; quantity: number; isStandard: boolean }[];
}

export interface Branch {
  id: string;
  nameEn: string;
  nameAr: string;
  mapUrl: string;
  lat?: number | null;
  lng?: number | null;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  branchId: string;
  type: 'DELIVERY' | 'PICKUP';
  status: 'PENDING' | 'PREPARING' | 'ON_THE_WAY' | 'DELIVERED' | 'CANCELLED';
  total: number;
  deliveryFee: number;
  address: string;
  lat?: number | null;
  lng?: number | null;
  couponCode?: string;
  discount: number;
  paymentMethod: 'COD' | 'FAWRY' | 'CARD';
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  notes?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'DRIVER' | 'STAFF' | 'OWNER' | 'HEAD_ADMIN' | 'ADMIN' | 'DEVELOPER' | 'CUSTOMER_SERVICE';
  phone?: string;
  showAsDriver?: boolean;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  productId: string;
  rating: number;
  comment: string;
  createdAt: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  isActive: boolean;
  branchId?: string | null;
  maxUsesPerUser?: number | null;
  usageLimit?: number | null;
  applicableCategoryId?: string | null;
}

export interface Discount {
  id: string;
  name: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  appliesTo: string; // 'ALL' or menu_item UUID
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
  branchId?: string | null;
}

export interface ChatMessage {
  id: string;
  userId: string;
  senderRole: 'CUSTOMER' | 'STAFF' | 'OWNER' | 'ADMIN' | 'DEVELOPER';
  senderName: string;
  text: string;
  createdAt: string;
}

// ============================================================
// MOCK DATABASE & DATA SEED (Fallback)
// ============================================================

let mockCategories: Category[] = [
  { id: 'cat-1', nameEn: 'Beef Burgers', nameAr: 'برجر لحم' },
  { id: 'cat-2', nameEn: 'Fried Chicken', nameAr: 'فرايد تشيكن' },
  { id: 'cat-3', nameEn: 'Sides & Appetizers', nameAr: 'المقبلات والجانبيات' },
  { id: 'cat-4', nameEn: 'Drinks', nameAr: 'المشروبات' },
];

let mockProducts: Product[] = [
  {
    id: 'prod-dodz-burger',
    categoryId: 'cat-1',
    nameEn: 'Dodz Burger',
    nameAr: 'دودز برجر',
    descEn: 'Charcoal grilled beef patty, lettuce, tomatoes, pickled cucumbers, cheddar cheese, and Dodz special sauce.',
    descAr: 'قطعة لحم مشوية على الفحم، خس، طماطم، خيار مخلل، جبنة شيدر، صوص دودز المميز',
    priceSingle: 120,
    priceDouble: 170,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
  {
    id: 'prod-mushroom-burger',
    categoryId: 'cat-1',
    nameEn: 'Mushroom Burger',
    nameAr: 'مشروم برجر',
    descEn: 'Grilled beef patty with fresh mushroom pieces and creamy mushroom sauce.',
    descAr: 'قطعة لحم مشوية مع قطع المشروم الفريش وصوص المشروم الكريمي',
    priceSingle: 135,
    priceDouble: 185,
    imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
  {
    id: 'prod-crispy-chicken',
    categoryId: 'cat-2',
    nameEn: 'Crispy Chicken Sandwich',
    nameAr: 'ساندوتش دجاج كريسبي',
    descEn: 'Crunchy fried chicken breast, turkey, lettuce, pickled cucumbers, and melted cheese sauce.',
    descAr: 'صدر دجاج مقلي مقرمش، تركي، خس، خيار مخلل، صوص الجبنة السايحة',
    priceSingle: 110,
    priceDouble: 155,
    imageUrl: 'https://images.unsplash.com/photo-1627662236973-4f8259fa2441?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
  {
    id: 'prod-fire-chicken',
    categoryId: 'cat-2',
    nameEn: 'Dodz Fire Chicken 🌶️',
    nameAr: 'دودز فاير تشيكن 🌶️',
    descEn: 'Spicy crispy chicken, jalapenos, spicy fire sauce, and cheddar cheese.',
    descAr: 'دجاج مقرمش حار، هالبينو، صوص الفاير الحار، وجبنة شيدر',
    priceSingle: 115,
    priceDouble: 160,
    imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
  {
    id: 'prod-chicken-3pcs',
    categoryId: 'cat-2',
    nameEn: 'Fried Chicken Meal (3 Pcs)',
    nameAr: 'وجبة الدجاج المقرمش (٣ قطع)',
    descEn: '3 Pcs Chicken + Fries + Coleslaw + Bun',
    descAr: '٣ قطع دجاج مقرمش + بطاطس + كولسلو + خبز',
    priceSingle: 165,
    imageUrl: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
  {
    id: 'prod-fries',
    categoryId: 'cat-3',
    nameEn: 'French Fries',
    nameAr: 'بطاطس مقلية',
    descEn: 'Golden, crispy classic French fries.',
    descAr: 'أصابع بطاطس مقلية مقرمشة وذهبية',
    priceSingle: 35,
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
  {
    id: 'prod-cheesy-fries',
    categoryId: 'cat-3',
    nameEn: 'Cheesy Fries',
    nameAr: 'بطاطس بالجبنة',
    descEn: 'French fries loaded with hot melted cheddar cheese sauce.',
    descAr: 'بطاطس مقلية مغطاة بصوص جبنة شيدر سايحة',
    priceSingle: 55,
    imageUrl: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
  {
    id: 'prod-soda',
    categoryId: 'cat-4',
    nameEn: 'Soft Drinks (Pepsi/7Up/Mirinda)',
    nameAr: 'مشروب غازي (بيبسي/سفن اب/ميرندا)',
    descEn: 'Chilled soft drinks of your choice.',
    descAr: 'كانز مشروب غازي بارد من اختيارك',
    priceSingle: 20,
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
];

let mockUsers: User[] = [
  { id: 'user-owner', email: 'owner@dodz.com', name: 'Sherif Dodz (Owner)', role: 'OWNER', phone: '01011112222' },
  { id: 'user-headadmin', email: 'headadmin@dodz.com', name: 'Head Admin User', role: 'HEAD_ADMIN', phone: '01055556666' },
  { id: 'user-admin', email: 'admin@dodz.com', name: 'Branch Admin', role: 'ADMIN', phone: '01099998888' },
  { id: 'user-staff', email: 'staff@dodz.com', name: 'Karim Aly (Kitchen)', role: 'STAFF', phone: '01033334444' },
  { id: 'user-driver1', email: 'driver1@dodz.com', name: 'Mustafa Salem (Driver)', role: 'DRIVER', phone: '01255556666' },
  { id: 'user-cust', email: 'customer@test.com', name: 'Mina Ramzy', role: 'CUSTOMER', phone: '01599990000' },
];

let mockBranches: Branch[] = [
  { id: 'branch-1', nameEn: 'Seashell Walk Branch', nameAr: 'سي شيل ووك - الساحل', mapUrl: 'https://maps.app.goo.gl/41ghzJmGZFH5ydau9' },
  { id: 'branch-2', nameEn: 'Marina Walk Branch', nameAr: 'مارينا ووك - الساحل', mapUrl: 'https://maps.app.goo.gl/uFNMVQf7mARqx3VP6?g_st=ac' },
  { id: 'branch-3', nameEn: 'Tagamoa Branch', nameAr: 'فرع التجمع', mapUrl: 'https://maps.app.goo.gl/PY39jUeRrMDCEcoa9' },
  { id: 'branch-4', nameEn: 'Almaza Branch', nameAr: 'فرع الماظه', mapUrl: 'https://maps.app.goo.gl/b8dnYd1XsQ31qsb89' },
  { id: 'branch-5', nameEn: 'Nasr City Branch', nameAr: 'فرع مدينه نصر', mapUrl: 'https://maps.app.goo.gl/xra2XTm54n3K6kaD9?g_st=ac' },
];

let mockOrders: Order[] = [
  {
    id: 'ord-1001',
    userId: 'user-cust',
    userName: 'Mina Ramzy',
    userPhone: '01599990000',
    branchId: 'branch-3',
    type: 'DELIVERY',
    status: 'DELIVERED',
    total: 350,
    deliveryFee: 40,
    address: 'El Obour City, Building 14, Appt 3',
    couponCode: 'DODZ10',
    discount: 30,
    paymentMethod: 'COD',
    driverId: 'user-driver1',
    driverName: 'Mustafa Salem (Driver)',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
    items: [
      { id: 'oi-1', productId: 'prod-dodz-burger', productNameEn: 'Dodz Burger', productNameAr: 'دودز برجر', size: 'DOUBLE', quantity: 2, price: 170 }
    ]
  }
];

let mockReviews: Review[] = [
  { id: 'rev-1', userId: 'user-cust', userName: 'Mina Ramzy', productId: 'prod-dodz-burger', rating: 5, comment: 'Best double burger in Cairo! Super juicy and sauce is perfect.', createdAt: new Date().toISOString() }
];

let mockCoupons: Coupon[] = [
  { id: 'coup-1', code: 'FIRST15', discountType: 'PERCENT', discountValue: 15, isActive: true, maxUsesPerUser: 1 },
  { id: 'coup-2', code: 'DODZ10', discountType: 'FIXED', discountValue: 30, isActive: true, usageLimit: 10 },
];

let mockDiscounts: Discount[] = [];

let mockChatMessages: ChatMessage[] = [];

// ============================================================
// DYNAMIC CLIENT RESOLVER
// ============================================================

function getSupabase() {
  if (typeof window !== 'undefined') {
    return createBrowserClient();
  } else {
    // Dynamically require server side libraries to prevent build issues
    const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project-ref.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key-here';
    return createSupabaseClient(supabaseUrl, supabaseAnonKey);
  }
}

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return !!url && !url.includes('your-project-ref') && !url.includes('placeholder-project-ref');
}

function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// ============================================================
// FIELD MAPPERS
// ============================================================

function mapCategory(c: any): Category {
  return {
    id: c.id,
    nameEn: c.name_en,
    nameAr: c.name_ar,
    isDefault: c.is_default || false,
    descEn: c.desc_en || '',
    descAr: c.desc_ar || '',
  };
}

function mapProduct(p: any, branchId?: string | null): Product {
  let priceSingle = Number(p.price_single);
  let priceDouble = p.price_double ? Number(p.price_double) : undefined;
  let priceTriple = p.price_triple ? Number(p.price_triple) : undefined;
  let priceFamily = p.price_family ? Number(p.price_family) : undefined;
  let isAvailable = p.is_available;

  if (branchId && Array.isArray(p.branch_menu_items)) {
    const override = p.branch_menu_items.find((bmi: any) => bmi.branch_id === branchId);
    if (override) {
      if (override.price_single !== null && override.price_single !== undefined) {
        priceSingle = Number(override.price_single);
      }
      if (override.price_double !== null && override.price_double !== undefined) {
        priceDouble = Number(override.price_double);
      } else if (override.price_double === null) {
        priceDouble = undefined;
      }
      if (override.price_triple !== null && override.price_triple !== undefined) {
        priceTriple = Number(override.price_triple);
      } else if (override.price_triple === null) {
        priceTriple = undefined;
      }
      if (override.price_family !== null && override.price_family !== undefined) {
        priceFamily = Number(override.price_family);
      } else if (override.price_family === null) {
        priceFamily = undefined;
      }
      if (override.is_available !== null && override.is_available !== undefined) {
        isAvailable = override.is_available;
      }
    }
  }

  let customizationGroups: CustomizationGroup[] = [];
  if (Array.isArray(p.menu_item_customization_groups)) {
    customizationGroups = p.menu_item_customization_groups
      .filter((micg: any) => micg.customization_groups)
      .map((micg: any) => {
        const cg = micg.customization_groups;
        return {
          id: cg.id,
          nameEn: cg.name_en,
          nameAr: cg.name_ar,
          minSelected: cg.min_selected || 0,
          maxSelected: cg.max_selected || 1,
          options: Array.isArray(cg.customization_options)
            ? cg.customization_options.map((o: any) => ({
                id: o.id,
                groupId: o.group_id,
                nameEn: o.name_en,
                nameAr: o.name_ar,
                price: Number(o.price),
              }))
            : [],
        };
      });
  }

  return {
    id: p.id,
    categoryId: p.category_id,
    categoryIds: p.category_ids || [],
    nameEn: p.name_en,
    nameAr: p.name_ar,
    descEn: p.desc_en,
    descAr: p.desc_ar,
    priceSingle,
    priceDouble,
    priceTriple,
    priceFamily,
    sizeType: p.size_type || 'NUMERIC',
    extrasConfig: Array.isArray(p.extras_config) ? p.extras_config : [],
    imageUrl: p.image_url,
    isAvailable,
    branchId: p.branch_id || null,
    sortOrder: p.sort_order || 0,
    customizationGroups,
  };
}

function mapBranch(b: any): Branch {
  return {
    id: b.id,
    nameEn: b.name_en,
    nameAr: b.name_ar,
    mapUrl: b.map_url || '',
    lat: b.lat !== undefined && b.lat !== null ? Number(b.lat) : null,
    lng: b.lng !== undefined && b.lng !== null ? Number(b.lng) : null,
  };
}

function mapOrder(o: any): Order {
  return {
    id: o.id,
    userId: o.customer_id,
    userName: o.customer_name,
    userPhone: o.customer_phone,
    branchId: o.branch_id,
    type: o.type,
    status: o.status,
    total: Number(o.total),
    deliveryFee: Number(o.delivery_fee),
    address: o.address,
    lat: o.lat !== undefined ? Number(o.lat) : null,
    lng: o.lng !== undefined ? Number(o.lng) : null,
    couponCode: o.coupon_code || undefined,
    discount: Number(o.discount),
    paymentMethod: o.payment_method,
    driverId: o.driver_id || undefined,
    driverName: o.driver?.full_name || undefined,
    driverPhone: o.driver?.phone || undefined,
    notes: o.notes || undefined,
    cancellationReason: o.cancellation_reason || undefined,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    items: Array.isArray(o.order_items) ? o.order_items.map(mapOrderItem) : [],
  };
}

function mapOrderItem(oi: any): OrderItem {
  return {
    id: oi.id,
    productId: oi.menu_item_id || '',
    productNameEn: oi.name_en,
    productNameAr: oi.name_ar,
    size: oi.size,
    quantity: oi.quantity,
    price: Number(oi.price),
    customizations: Array.isArray(oi.customizations) ? oi.customizations : [],
    extras: Array.isArray(oi.extras) ? oi.extras : [],
  };
}

function mapReview(r: any): Review {
  return {
    id: r.id,
    userId: r.customer_id,
    userName: r.profiles?.full_name || 'Customer',
    productId: r.menu_item_id,
    rating: r.rating,
    comment: r.comment || '',
    createdAt: r.created_at,
    status: r.status || 'APPROVED',
  };
}

function mapCoupon(c: any): Coupon {
  return {
    id: c.id,
    code: c.code,
    discountType: c.discount_type,
    discountValue: Number(c.discount_value),
    isActive: c.is_active,
    branchId: c.branch_id || undefined,
    maxUsesPerUser: c.max_uses_per_user !== null && c.max_uses_per_user !== undefined ? Number(c.max_uses_per_user) : null,
    usageLimit: c.usage_limit !== null && c.usage_limit !== undefined ? Number(c.usage_limit) : null,
    applicableCategoryId: c.applicable_category_id || undefined,
  };
}

function mapDiscount(d: any): Discount {
  return {
    id: d.id,
    name: d.name,
    discountType: d.discount_type,
    discountValue: Number(d.discount_value),
    appliesTo: d.applies_to,
    isActive: d.is_active,
    startsAt: d.starts_at,
    endsAt: d.ends_at,
    branchId: d.branch_id || undefined,
  };
}

// ============================================================
// EXPORTED DATABASE LAYER (SUPABASE + FALLBACK)
// ============================================================

export const db = {
  // CATEGORIES
  async getCategories(): Promise<Category[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getSupabase()
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (!error && data) return data.map(mapCategory);
      } catch (err) {
        console.error('getCategories Supabase error, falling back to mock:', err);
      }
    }
    return mockCategories;
  },

  async createCategory(data: Omit<Category, 'id'>): Promise<Category> {
    if (isSupabaseConfigured()) {
      try {
        const { data: cat, error } = await getSupabase()
          .from('categories')
          .insert({ name_en: data.nameEn, name_ar: data.nameAr })
          .select()
          .single();

        if (!error && cat) return mapCategory(cat);
      } catch (err) {
        console.error('createCategory Supabase error:', err);
      }
    }
    const newCat = { id: `cat-${Date.now()}`, ...data };
    mockCategories.push(newCat);
    return newCat;
  },

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    if (isSupabaseConfigured() && isValidUuid(id)) {
      try {
        const updateData: any = {};
        if (data.nameEn !== undefined) updateData.name_en = data.nameEn;
        if (data.nameAr !== undefined) updateData.name_ar = data.nameAr;

        const { data: cat, error } = await getSupabase()
          .from('categories')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (!error && cat) return mapCategory(cat);
      } catch (err) {
        console.error('updateCategory Supabase error:', err);
      }
    }
    const idx = mockCategories.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Category not found');
    mockCategories[idx] = { ...mockCategories[idx], ...data };
    return mockCategories[idx];
  },

  async deleteCategory(id: string): Promise<boolean> {
    if (isSupabaseConfigured() && isValidUuid(id)) {
      try {
        const { error } = await getSupabase()
          .from('categories')
          .update({ is_active: false })
          .eq('id', id);

        if (!error) return true;
      } catch (err) {
        console.error('deleteCategory Supabase error:', err);
      }
    }
    mockCategories = mockCategories.filter((c) => c.id !== id);
    mockProducts = mockProducts.filter((p) => p.categoryId !== id);
    return true;
  },

  async reorderCategories(orderedIds: string[]): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        const promises = orderedIds.map((id, index) =>
          getSupabase()
            .from('categories')
            .update({ sort_order: index })
            .eq('id', id)
        );
        const results = await Promise.all(promises);
        return !results.some((r) => r.error);
      } catch (err) {
        console.error('reorderCategories error:', err);
        return false;
      }
    }
    // Fallback for mock mode
    const reordered: Category[] = [];
    orderedIds.forEach((id) => {
      const match = mockCategories.find((c) => c.id === id);
      if (match) reordered.push(match);
    });
    mockCategories.forEach((c) => {
      if (!orderedIds.includes(c.id)) reordered.push(c);
    });
    mockCategories = reordered;
    return true;
  },

  async reorderProducts(orderedIds: string[]): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        const promises = orderedIds.map((id, index) =>
          getSupabase()
            .from('menu_items')
            .update({ sort_order: index })
            .eq('id', id)
        );
        const results = await Promise.all(promises);
        return !results.some((r) => r.error);
      } catch (err) {
        console.error('reorderProducts error:', err);
        return false;
      }
    }
    // Fallback for mock mode
    const reordered: Product[] = [];
    orderedIds.forEach((id) => {
      const match = mockProducts.find((p) => p.id === id);
      if (match) reordered.push(match);
    });
    mockProducts.forEach((p) => {
      if (!orderedIds.includes(p.id)) reordered.push(p);
    });
    mockProducts = reordered;
    return true;
  },

  // BRANCHES
  async getBranches(): Promise<Branch[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getSupabase()
          .from('branches')
          .select('*')
          .eq('is_active', true);

        if (!error && data) return data.map(mapBranch);
      } catch (err) {
        console.error('getBranches Supabase error, falling back to mock:', err);
      }
    }
    return mockBranches;
  },

  // PRODUCTS (MENU ITEMS)
  async getProducts(categoryId?: string, branchId?: string): Promise<Product[]> {
    if (isSupabaseConfigured()) {
      try {
        let query = getSupabase()
          .from('menu_items')
          .select('*, branch_menu_items(*), menu_item_customization_groups(*, customization_groups(*, customization_options(*)))')
          .order('sort_order', { ascending: true });
        if (categoryId && isValidUuid(categoryId)) {
          query = query.or(`category_id.eq.${categoryId},category_ids.cs.{"${categoryId}"}`);
        }
        if (branchId && isValidUuid(branchId)) {
          query = query.or(`branch_id.is.null,branch_id.eq.${branchId}`);
        }
        const { data, error } = await query;
        if (!error && data) {
          return data.map((p: any) => mapProduct(p, branchId));
        }
      } catch (err) {
        console.error('getProducts Supabase error, falling back to mock:', err);
      }
    }
    if (categoryId) {
      return mockProducts.filter((p) => p.categoryId === categoryId || p.categoryIds?.includes(categoryId));
    }
    return mockProducts;
  },

  async getProductById(id: string, branchId?: string): Promise<Product | undefined> {
    if (isSupabaseConfigured() && isValidUuid(id)) {
      try {
        const { data, error } = await getSupabase()
          .from('menu_items')
          .select('*, branch_menu_items(*), menu_item_customization_groups(*, customization_groups(*, customization_options(*)))')
          .eq('id', id)
          .single();

        if (!error && data) return mapProduct(data, branchId);
      } catch (err) {
        console.error('getProductById Supabase error:', err);
      }
    }
    return mockProducts.find((p) => p.id === id);
  },

  async createProduct(data: Omit<Product, 'id' | 'isAvailable'>): Promise<Product> {
    if (isSupabaseConfigured()) {
      try {
        const { data: prod, error } = await getSupabase()
          .from('menu_items')
          .insert({
            category_id: data.categoryId,
            category_ids: data.categoryIds || [],
            name_en: data.nameEn,
            name_ar: data.nameAr,
            desc_en: data.descEn,
            desc_ar: data.descAr,
            price_single: data.priceSingle,
            price_double: data.priceDouble || null,
            price_triple: data.priceTriple || null,
            price_family: data.priceFamily || null,
            size_type: data.sizeType || 'NUMERIC',
            extras_config: data.extrasConfig || [],
            image_url: data.imageUrl,
            is_available: true,
            branch_id: data.branchId || null,
          })
          .select()
          .single();

        if (!error && prod) return mapProduct(prod);
      } catch (err) {
        console.error('createProduct Supabase error:', err);
      }
    }
    const newProd = { id: `prod-${Date.now()}`, isAvailable: true, ...data };
    mockProducts.push(newProd);
    return newProd as Product;
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    if (isSupabaseConfigured() && isValidUuid(id)) {
      try {
        const updateData: any = {};
        if (data.categoryId !== undefined) updateData.category_id = data.categoryId;
        if (data.categoryIds !== undefined) updateData.category_ids = data.categoryIds;
        if (data.nameEn !== undefined) updateData.name_en = data.nameEn;
        if (data.nameAr !== undefined) updateData.name_ar = data.nameAr;
        if (data.descEn !== undefined) updateData.desc_en = data.descEn;
        if (data.descAr !== undefined) updateData.desc_ar = data.descAr;
        if (data.priceSingle !== undefined) updateData.price_single = data.priceSingle;
        if (data.priceDouble !== undefined) updateData.price_double = data.priceDouble || null;
        if (data.priceTriple !== undefined) updateData.price_triple = data.priceTriple || null;
        if (data.priceFamily !== undefined) updateData.price_family = data.priceFamily || null;
        if (data.sizeType !== undefined) updateData.size_type = data.sizeType;
        if (data.extrasConfig !== undefined) updateData.extras_config = data.extrasConfig;
        if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl;
        if (data.isAvailable !== undefined) updateData.is_available = data.isAvailable;
        if (data.branchId !== undefined) updateData.branch_id = data.branchId || null;

        const { data: prod, error } = await getSupabase()
          .from('menu_items')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (!error && prod) return mapProduct(prod);
      } catch (err) {
        console.error('updateProduct Supabase error:', err);
      }
    }
    const idx = mockProducts.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Product not found');
    mockProducts[idx] = { ...mockProducts[idx], ...data };
    return mockProducts[idx];
  },

  async updateProductBranchOverride(
    productId: string,
    branchId: string,
    data: {
      priceSingle?: number;
      priceDouble?: number | null;
      priceTriple?: number | null;
      priceFamily?: number | null;
      isAvailable?: boolean;
    }
  ): Promise<void> {
    if (isSupabaseConfigured() && isValidUuid(productId) && isValidUuid(branchId)) {
      try {
        const { error } = await getSupabase()
          .from('branch_menu_items')
          .upsert({
            branch_id: branchId,
            menu_item_id: productId,
            price_single: data.priceSingle !== undefined ? data.priceSingle : null,
            price_double: data.priceDouble !== undefined ? data.priceDouble : null,
            price_triple: data.priceTriple !== undefined ? data.priceTriple : null,
            price_family: data.priceFamily !== undefined ? data.priceFamily : null,
            is_available: data.isAvailable !== undefined ? data.isAvailable : null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'branch_id,menu_item_id' });

        if (error) throw error;
      } catch (err) {
        console.error('updateProductBranchOverride error:', err);
        throw err;
      }
    }
  },

  async deleteProductBranchOverride(productId: string, branchId: string): Promise<void> {
    if (isSupabaseConfigured() && isValidUuid(productId) && isValidUuid(branchId)) {
      try {
        const { error } = await getSupabase()
          .from('branch_menu_items')
          .delete()
          .eq('branch_id', branchId)
          .eq('menu_item_id', productId);

        if (error) throw error;
      } catch (err) {
        console.error('deleteProductBranchOverride error:', err);
        throw err;
      }
    }
  },

  async deleteProduct(id: string): Promise<boolean> {
    if (isSupabaseConfigured() && isValidUuid(id)) {
      try {
        const { error } = await getSupabase()
          .from('menu_items')
          .delete()
          .eq('id', id);
        if (!error) return true;
      } catch (err) {
        console.error('deleteProduct Supabase error:', err);
      }
    }
    mockProducts = mockProducts.filter((p) => p.id !== id);
    return true;
  },

  // USERS / RBAC
  async getUserByEmail(email: string): Promise<User | undefined> {
    if (isSupabaseConfigured()) {
      try {
        // Since email isn't in profiles table, we look up auth users (available on admin server)
        // or check matching local profiles if mapping handles email in metadata/profile.
        // For client side, we fallback gracefully.
      } catch {}
    }
    return mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
  },

  async getUserById(id: string): Promise<User | undefined> {
    if (isSupabaseConfigured() && isValidUuid(id)) {
      try {
        const { data, error } = await getSupabase()
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          return {
            id: data.id,
            email: '',
            name: data.full_name,
            role: data.role,
            phone: data.phone || undefined,
          };
        }
      } catch (err) {
        console.error('getUserById Supabase error:', err);
      }
    }
    return mockUsers.find((u) => u.id === id);
  },

  async getDrivers(): Promise<User[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getSupabase()
          .from('profiles')
          .select('*')
          .or('role.eq.DRIVER,and(role.eq.DEVELOPER,show_as_driver.eq.true)')
          .eq('is_active', true);

        if (!error && data) {
          return data.map((p: any) => ({
            id: p.id,
            email: '',
            name: p.full_name,
            role: p.role,
            phone: p.phone || undefined,
            showAsDriver: p.show_as_driver || false,
          }));
        }
      } catch (err) {
        console.error('getDrivers Supabase error:', err);
      }
    }
    return mockUsers.filter((u) => u.role === 'DRIVER' || (u.role === 'DEVELOPER' && u.showAsDriver));
  },

  async createUser(data: {
    name: string;
    email: string;
    role: UserRole;
    phone?: string;
  }): Promise<User> {
    // Note: Creating real Supabase Auth users should go through Server API /api/admin/users
    // For local memory, we append to mockUsers
    const newUser = { id: `user-${Date.now()}`, ...data };
    mockUsers.push(newUser);
    return newUser;
  },

  // ORDERS
  async getOrders(filters?: { userId?: string; driverId?: string; status?: string; branchId?: string }): Promise<Order[]> {
    if (isSupabaseConfigured()) {
      try {
        let query = getSupabase().from('orders').select('*, order_items(*), driver:driver_id(full_name, phone)');

        if (filters) {
          if (filters.userId && isValidUuid(filters.userId)) {
            query = query.eq('customer_id', filters.userId);
          }
          if (filters.driverId && isValidUuid(filters.driverId)) {
            query = query.eq('driver_id', filters.driverId);
          }
          if (filters.status) {
            query = query.eq('status', filters.status);
          }
          if (filters.branchId && isValidUuid(filters.branchId)) {
            query = query.eq('branch_id', filters.branchId);
          }
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (!error && data) {
          return data.map(mapOrder);
        }
      } catch (err) {
        console.error('getOrders Supabase error, falling back to mock:', err);
      }
    }

    // Mock filtering
    let list = [...mockOrders];
    if (filters) {
      if (filters.userId) list = list.filter((o) => o.userId === filters.userId);
      if (filters.driverId) list = list.filter((o) => o.driverId === filters.driverId);
      if (filters.status) list = list.filter((o) => o.status === filters.status);
      if (filters.branchId) list = list.filter((o) => o.branchId === filters.branchId);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getOrderById(id: string): Promise<Order | undefined> {
    if (isSupabaseConfigured() && isValidUuid(id)) {
      try {
        const { data, error } = await getSupabase()
          .from('orders')
          .select('*, order_items(*), driver:driver_id(full_name, phone)')
          .eq('id', id)
          .single();

        if (!error && data) return mapOrder(data);
      } catch (err) {
        console.error('getOrderById Supabase error:', err);
      }
    }
    if (typeof window !== 'undefined') {
      try {
        const localOrders = JSON.parse(localStorage.getItem('dodz_mock_orders') || '[]');
        const found = localOrders.find((o: any) => o.id === id);
        if (found) return found;
      } catch (e) {
        console.error('Error reading mock orders from localStorage:', e);
      }
    }
    return mockOrders.find((o) => o.id === id);
  },

  async createOrder(data: {
    userId: string;
    userName: string;
    userPhone: string;
    branchId: string;
    type: 'DELIVERY' | 'PICKUP';
    address: string;
    paymentMethod: 'COD' | 'FAWRY' | 'CARD';
    total: number;
    deliveryFee: number;
    discount: number;
    couponCode?: string;
    notes?: string;
    items: Omit<OrderItem, 'id'>[];
  }): Promise<Order> {
    // Creating order on client side calls supabase insert
    if (isSupabaseConfigured() && isValidUuid(data.userId)) {
      try {
        const supabase = getSupabase();

        // 1. Insert parent order
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            customer_id: data.userId,
            branch_id: isValidUuid(data.branchId) ? data.branchId : null,
            type: data.type,
            status: 'PENDING',
            total: data.total,
            delivery_fee: data.deliveryFee,
            address: data.address,
            coupon_code: data.couponCode || null,
            discount: data.discount,
            payment_method: data.paymentMethod,
            customer_name: data.userName,
            customer_phone: data.userPhone,
            notes: data.notes || null,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // 2. Insert children items
        const orderItems = data.items.map((it) => ({
          order_id: orderData.id,
          menu_item_id: isValidUuid(it.productId) ? it.productId : null,
          name_en: it.productNameEn,
          name_ar: it.productNameAr,
          size: it.size,
          quantity: it.quantity,
          price: it.price,
          customizations: it.customizations || [],
          extras: it.extras || [],
        }));

        const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
        if (itemsError) throw itemsError;

        // Fetch completed order details
        const completedOrder = await this.getOrderById(orderData.id);
        if (completedOrder) return completedOrder;
      } catch (err) {
        console.error('createOrder Supabase error, falling back to mock:', err);
      }
    }

    const orderId = `ord-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: Order = {
      id: orderId,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: data.notes || undefined,
      ...data,
      items: data.items.map((it, idx) => ({ id: `oi-${Date.now()}-${idx}`, ...it })),
    };
    mockOrders.push(newOrder);
    return newOrder;
  },

  async updateOrderStatus(
    orderId: string,
    status: Order['status'],
    driverId?: string,
    cancellationReason?: string
  ): Promise<Order> {
    if (isSupabaseConfigured() && isValidUuid(orderId)) {
      try {
        const updatePayload: any = {
          status,
          updated_at: new Date().toISOString(),
        };

        if (driverId && isValidUuid(driverId)) {
          updatePayload.driver_id = driverId;
        }
        if (cancellationReason) {
          updatePayload.cancellation_reason = cancellationReason;
        }

        const { error } = await getSupabase()
          .from('orders')
          .update(updatePayload)
          .eq('id', orderId);

        if (!error) {
          const updatedOrder = await this.getOrderById(orderId);
          if (updatedOrder) return updatedOrder;
        }
      } catch (err) {
        console.error('updateOrderStatus Supabase error:', err);
      }
    }

    const idx = mockOrders.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');

    const update: Partial<Order> = { status, updatedAt: new Date().toISOString() };
    if (cancellationReason) {
      update.cancellationReason = cancellationReason;
    }
    if (driverId) {
      const driver = mockUsers.find((u) => u.id === driverId);
      if (driver) {
        update.driverId = driverId;
        update.driverName = driver.name;
        update.driverPhone = driver.phone || '01200000000';
      }
    }

    mockOrders[idx] = { ...mockOrders[idx], ...update };
    return mockOrders[idx];
  },

  async unassignDriver(orderId: string): Promise<Order> {
    if (isSupabaseConfigured() && isValidUuid(orderId)) {
      try {
        const { error } = await getSupabase()
          .from('orders')
          .update({ driver_id: null, updated_at: new Date().toISOString() })
          .eq('id', orderId);

        if (!error) {
          const updatedOrder = await this.getOrderById(orderId);
          if (updatedOrder) return updatedOrder;
        }
      } catch (err) {
        console.error('unassignDriver Supabase error:', err);
      }
    }

    const idx = mockOrders.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');
    mockOrders[idx] = { 
      ...mockOrders[idx], 
      driverId: undefined, 
      driverName: undefined, 
      driverPhone: undefined,
      updatedAt: new Date().toISOString()
    };
    return mockOrders[idx];
  },

  // REVIEWS
  async getReviews(productId?: string, includeAllForAdmin = false): Promise<Review[]> {
    if (isSupabaseConfigured()) {
      try {
        let query = getSupabase()
          .from('reviews')
          .select('*, profiles(full_name)')
          .order('created_at', { ascending: false });

        if (productId && isValidUuid(productId)) {
          query = query.eq('menu_item_id', productId);
        }

        if (!includeAllForAdmin) {
          query = query.eq('status', 'APPROVED');
        }

        const { data, error } = await query;
        if (!error && data) return data.map(mapReview);
      } catch (err) {
        console.error('getReviews Supabase error, falling back to mock:', err);
      }
    }
    let list = [...mockReviews];
    if (productId) {
      list = list.filter((r) => r.productId === productId);
    }
    if (!includeAllForAdmin) {
      list = list.filter((r) => r.status === 'APPROVED');
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createReview(data: {
    userId: string;
    userName: string;
    productId: string;
    rating: number;
    comment: string;
  }): Promise<Review> {
    if (isSupabaseConfigured() && isValidUuid(data.userId) && isValidUuid(data.productId)) {
      try {
        const { data: rev, error } = await getSupabase()
          .from('reviews')
          .insert({
            customer_id: data.userId,
            menu_item_id: data.productId,
            rating: data.rating,
            comment: data.comment,
            status: 'PENDING',
          })
          .select('*, profiles(full_name)')
          .single();

        if (!error && rev) return mapReview(rev);
      } catch (err) {
        console.error('createReview Supabase error:', err);
      }
    }

    const newReview: Review = {
      id: `rev-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
      ...data,
    };
    mockReviews.push(newReview);
    return newReview;
  },

  async updateReviewStatus(id: string, status: 'APPROVED' | 'REJECTED'): Promise<boolean> {
    if (isSupabaseConfigured() && isValidUuid(id)) {
      try {
        const { error } = await getSupabase()
          .from('reviews')
          .update({ status })
          .eq('id', id);
        return !error;
      } catch (err) {
        console.error('updateReviewStatus error:', err);
        return false;
      }
    }
    const idx = mockReviews.findIndex((r) => r.id === id);
    if (idx !== -1) {
      mockReviews[idx].status = status;
      return true;
    }
    return false;
  },

  // COUPONS
  async getCouponByCode(code: string, branchId?: string): Promise<Coupon | undefined> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getSupabase()
          .from('coupons')
          .select('*')
          .eq('code', code.toUpperCase())
          .eq('is_active', true);

        if (!error && data) {
          // Find first coupon that either applies to all branches (branch_id is null) or specifically matches the branchId
          const match = data.find((c: any) => !c.branch_id || c.branch_id === branchId);
          if (match) return mapCoupon(match);
        }
      } catch (err) {
        console.error('getCouponByCode Supabase error:', err);
      }
    }
    return mockCoupons.find((c) => c.code.toUpperCase() === code.toUpperCase() && c.isActive && (!c.branchId || c.branchId === branchId));
  },

  async validateCoupon(code: string, branchId?: string, userId?: string): Promise<{ isValid: boolean; error?: string; coupon?: Coupon }> {
    const coupon = await this.getCouponByCode(code, branchId);
    if (!coupon) {
      return { isValid: false, error: 'Invalid or inactive coupon code' };
    }

    // Check total limit
    if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usageLimit > 0) {
      let totalCount = 0;
      if (isSupabaseConfigured()) {
        const { count, error } = await getSupabase()
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_code', code.toUpperCase())
          .neq('status', 'CANCELLED');
        if (!error && count !== null) totalCount = count;
      } else {
        totalCount = mockOrders.filter(o => o.couponCode?.toUpperCase() === code.toUpperCase() && o.status !== 'CANCELLED').length;
      }
      if (totalCount >= coupon.usageLimit) {
        return { isValid: false, error: 'This coupon has reached its maximum total usage limit' };
      }
    }

    // Check user limit
    if (userId && coupon.maxUsesPerUser !== null && coupon.maxUsesPerUser !== undefined && coupon.maxUsesPerUser > 0) {
      let userCount = 0;
      if (isSupabaseConfigured()) {
        const { count, error } = await getSupabase()
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_code', code.toUpperCase())
          .eq('customer_id', userId)
          .neq('status', 'CANCELLED');
        if (!error && count !== null) userCount = count;
      } else {
        userCount = mockOrders.filter(o => o.couponCode?.toUpperCase() === code.toUpperCase() && o.userId === userId && o.status !== 'CANCELLED').length;
      }
      if (userCount >= coupon.maxUsesPerUser) {
        return { isValid: false, error: 'You have already used this coupon' };
      }
    }

    return { isValid: true, coupon };
  },

  async getCoupons(): Promise<Coupon[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getSupabase()
          .from('coupons')
          .select('*');

        if (!error && data) return data.map(mapCoupon);
      } catch (err) {
        console.error('getCoupons Supabase error, falling back to mock:', err);
      }
    }
    return mockCoupons;
  },
  async createCoupon(data: Omit<Coupon, 'id' | 'isActive'>): Promise<Coupon> {
    if (isSupabaseConfigured()) {
      try {
        const { data: coup, error } = await getSupabase()
          .from('coupons')
          .insert({
            code: data.code.toUpperCase(),
            discount_type: data.discountType,
            discount_value: data.discountValue,
            is_active: true,
            branch_id: data.branchId || null,
            max_uses_per_user: data.maxUsesPerUser || null,
            usage_limit: data.usageLimit || null,
            applicable_category_id: data.applicableCategoryId || null,
          })
          .select()
          .single();

        if (!error && coup) return mapCoupon(coup);
      } catch (err) {
        console.error('createCoupon Supabase error:', err);
      }
    }
    const newCoupon = { id: `coup-${Date.now()}`, isActive: true, ...data };
    mockCoupons.push(newCoupon);
    return newCoupon;
  },

  // DISCOUNTS
  async getDiscounts(branchId?: string): Promise<Discount[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getSupabase()
          .from('discounts')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const mapped = data.map(mapDiscount);
          if (branchId) {
            return mapped.filter((d: Discount) => !d.branchId || d.branchId === branchId);
          }
          return mapped;
        }
      } catch (err) {
        console.error('getDiscounts Supabase error:', err);
      }
    }
    if (branchId) {
      return mockDiscounts.filter((d: Discount) => !d.branchId || d.branchId === branchId);
    }
    return mockDiscounts;
  },

  async createDiscount(data: Omit<Discount, 'id' | 'isActive'>): Promise<Discount> {
    if (isSupabaseConfigured()) {
      try {
        const { data: dsc, error } = await getSupabase()
          .from('discounts')
          .insert({
            name: data.name,
            discount_type: data.discountType,
            discount_value: data.discountValue,
            applies_to: data.appliesTo,
            starts_at: data.startsAt || null,
            ends_at: data.endsAt || null,
            is_active: true,
            branch_id: data.branchId || null,
          })
          .select()
          .single();

        if (!error && dsc) return mapDiscount(dsc);
      } catch (err) {
        console.error('createDiscount Supabase error:', err);
      }
    }
    const newDsc = { id: `dsc-${Date.now()}`, isActive: true, ...data };
    mockDiscounts.push(newDsc);
    return newDsc;
  },

  async toggleDiscount(id: string, isActive: boolean): Promise<boolean> {
    if (isSupabaseConfigured() && isValidUuid(id)) {
      try {
        const { error } = await getSupabase()
          .from('discounts')
          .update({ is_active: isActive })
          .eq('id', id);

        if (!error) return true;
      } catch (err) {
        console.error('toggleDiscount Supabase error:', err);
      }
    }
    const idx = mockDiscounts.findIndex((d) => d.id === id);
    if (idx !== -1) mockDiscounts[idx].isActive = isActive;
    return true;
  },

  async getChatMessages(userId: string): Promise<ChatMessage[]> {
    if (isSupabaseConfigured() && isValidUuid(userId)) {
      try {
        const { data: chat } = await getSupabase()
          .from('support_chats')
          .select('id, status, updated_at')
          .eq('customer_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        
        if (chat) {
          const isOlderThan24h = (new Date().getTime() - new Date(chat.updated_at).getTime()) > 24 * 60 * 60 * 1000;
          if (chat.status === 'CLOSED' || chat.status === 'RESOLVED' || isOlderThan24h) {
            return []; // Return empty so it acts as a fresh chat for the customer
          }

          const { data: messages, error } = await getSupabase()
            .from('support_messages')
            .select('*, profiles:sender_id(full_name)')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: true });
            
          if (!error && messages) {
            // Mark customer messages as read in the background
            getSupabase()
              .from('support_messages')
              .update({ is_read: true })
              .eq('chat_id', chat.id)
              .eq('is_read', false)
              .eq('sender_role', 'CUSTOMER')
              .then(({ error }: { error: any }) => {
                if (error) console.error('Failed to mark messages as read:', error);
              });

            return messages.map((m: any) => ({
              id: m.id,
              userId: userId,
              senderRole: m.sender_role,
              senderName: m.profiles?.full_name || (m.sender_role === 'CUSTOMER' ? 'Customer' : 'Staff'),
              text: m.content,
              createdAt: m.created_at,
            }));
          }
        }
      } catch (err) {
        console.error('getChatMessages Supabase error:', err);
      }
    }

    return mockChatMessages
      .filter((m) => m.userId === userId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  async getActiveChats(includeClosed: boolean = false): Promise<{ chatId?: string; status?: string; userId: string; userName: string; lastMessage: string; updatedAt: string; branchId?: string; hasUnread?: boolean }[]> {
    if (isSupabaseConfigured()) {
      try {
        let query = getSupabase()
          .from('support_chats')
          .select(`
            id,
            status,
            customer_id,
            updated_at,
            branch_id,
            profiles!support_chats_customer_id_fkey(full_name),
            support_messages(content, created_at, sender_role, is_read)
          `);
          
        if (!includeClosed) {
          query = query.eq('status', 'OPEN');
        }

        const { data, error } = await query.order('updated_at', { ascending: false });

        if (!error && data) {
          const now = new Date().getTime();
          const activeChatsList = [];

          for (const chat of data) {
            const isOlderThan24h = (now - new Date(chat.updated_at).getTime()) > 24 * 60 * 60 * 1000;
            if (chat.status === 'OPEN' && isOlderThan24h) {
              // Auto-close in database (background fire-and-forget)
              getSupabase()
                .from('support_chats')
                .update({ status: 'CLOSED' })
                .eq('id', chat.id)
                .then((res: any) => {
                  if (res.error) console.error('Failed to auto-close chat:', chat.id, res.error);
                });
            } else {
              activeChatsList.push(chat);
            }
          }

          return activeChatsList.map((chat: any) => {
            const msgs = chat.support_messages || [];
            msgs.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1].content : '';
            const hasUnread = msgs.some((m: any) => m.sender_role === 'CUSTOMER' && !m.is_read);
            return {
              chatId: chat.id,
              status: chat.status,
              userId: chat.customer_id,
              userName: chat.profiles?.full_name || 'Customer',
              lastMessage: lastMsg,
              updatedAt: chat.updated_at,
              branchId: chat.branch_id || undefined,
              hasUnread: hasUnread,
            };
          });
        }
      } catch (err) {
        console.error('getActiveChats Supabase error:', err);
      }
    }

    const userIds = Array.from(new Set(mockChatMessages.map((m) => m.userId)));
    return userIds
      .map((uid) => {
        const userMsgs = mockChatMessages
          .filter((m) => m.userId === uid)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const lastMsg = userMsgs[0];
        return {
          userId: uid,
          userName: lastMsg.senderRole === 'CUSTOMER' ? lastMsg.senderName : 'Customer',
          lastMessage: lastMsg.text,
          updatedAt: lastMsg.createdAt,
          hasUnread: userMsgs.length > 0 && userMsgs[0].senderRole === 'CUSTOMER',
        };
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  async sendChatMessage(
    userId: string,
    senderRole: ChatMessage['senderRole'],
    senderName: string,
    text: string
  ): Promise<ChatMessage> {
    if (isSupabaseConfigured() && isValidUuid(userId)) {
      try {
        const supabase = getSupabase();
        let { data: chat } = await supabase
          .from('support_chats')
          .select('id, status, updated_at')
          .eq('customer_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        let isOlderThan24h = false;
        if (chat) {
          isOlderThan24h = (new Date().getTime() - new Date(chat.updated_at).getTime()) > 24 * 60 * 60 * 1000;
        }

        if (!chat || chat.status === 'CLOSED' || chat.status === 'RESOLVED' || isOlderThan24h) {
           const { data: newChat } = await supabase
             .from('support_chats')
             .insert({ customer_id: userId, status: 'OPEN' })
             .select('id')
             .single();
           chat = newChat;
        }

        if (chat) {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          const senderId = currentUser?.id || userId;

          const { data: newMsg, error } = await supabase
            .from('support_messages')
            .insert({
              chat_id: chat.id,
              sender_id: senderId,
              sender_role: senderRole,
              content: text,
            })
            .select()
            .single();

          if (!error && newMsg) {
             await supabase.from('support_chats').update({ updated_at: new Date().toISOString() }).eq('id', chat.id);
             return {
                id: newMsg.id,
                userId: userId,
                senderRole: newMsg.sender_role,
                senderName,
                text: newMsg.content,
                createdAt: newMsg.created_at,
             };
          }
        }
      } catch (err) {
        console.error('sendChatMessage Supabase error:', err);
      }
    }

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      userId,
      senderRole,
      senderName,
      text,
      createdAt: new Date().toISOString(),
    };
    mockChatMessages.push(newMessage);
    return newMessage;
  },

  async closeChatSession(chatId: string): Promise<boolean> {
    if (isSupabaseConfigured() && isValidUuid(chatId)) {
      try {
        const { error } = await getSupabase()
          .from('support_chats')
          .update({ status: 'CLOSED' })
          .eq('id', chatId);
        if (!error) return true;
      } catch (err) {
        console.error('closeChatSession error:', err);
      }
    }
    return true;
  },

  async getAuditLogs(): Promise<any[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getSupabase()
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch (err) {
        console.error('getAuditLogs error:', err);
      }
    }
    return [];
  },

  async logActivity(action: string, resourceType: string, resourceId?: string, metadata?: any): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await getSupabase().rpc('log_activity', {
          p_action: action,
          p_resource_type: resourceType,
          p_resource_id: resourceId,
          p_metadata: metadata || {}
        });
      } catch (err) {
        console.error('logActivity error:', err);
      }
    }
  },

  isSupabaseConfigured(): boolean {
    return isSupabaseConfigured();
  }
};

