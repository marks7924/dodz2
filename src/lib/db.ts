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
}

export interface Product {
  id: string;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  priceSingle: number;
  priceDouble?: number;
  imageUrl: string;
  categoryId: string;
  isAvailable: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  productNameEn: string;
  productNameAr: string;
  size: 'SINGLE' | 'DOUBLE' | 'NONE';
  quantity: number;
  price: number;
}

export interface Branch {
  id: string;
  nameEn: string;
  nameAr: string;
  mapUrl: string;
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
  couponCode?: string;
  discount: number;
  paymentMethod: 'COD' | 'FAWRY' | 'CARD';
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'DRIVER' | 'STAFF' | 'OWNER' | 'ADMIN' | 'DEVELOPER';
  phone?: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  productId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  isActive: boolean;
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
  { id: 'coup-1', code: 'FIRST15', discountType: 'PERCENT', discountValue: 15, isActive: true },
  { id: 'coup-2', code: 'DODZ10', discountType: 'FIXED', discountValue: 30, isActive: true },
];

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
  return { id: c.id, nameEn: c.name_en, nameAr: c.name_ar };
}

function mapProduct(p: any): Product {
  return {
    id: p.id,
    categoryId: p.category_id,
    nameEn: p.name_en,
    nameAr: p.name_ar,
    descEn: p.desc_en,
    descAr: p.desc_ar,
    priceSingle: Number(p.price_single),
    priceDouble: p.price_double ? Number(p.price_double) : undefined,
    imageUrl: p.image_url,
    isAvailable: p.is_available,
  };
}

function mapBranch(b: any): Branch {
  return { id: b.id, nameEn: b.name_en, nameAr: b.name_ar, mapUrl: b.map_url || '' };
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
    couponCode: o.coupon_code || undefined,
    discount: Number(o.discount),
    paymentMethod: o.payment_method,
    driverId: o.driver_id || undefined,
    driverName: o.driver?.full_name || undefined,
    driverPhone: o.driver?.phone || undefined,
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
  };
}

function mapCoupon(c: any): Coupon {
  return {
    id: c.id,
    code: c.code,
    discountType: c.discount_type,
    discountValue: Number(c.discount_value),
    isActive: c.is_active,
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
  async getProducts(categoryId?: string): Promise<Product[]> {
    if (isSupabaseConfigured()) {
      try {
        let query = getSupabase().from('menu_items').select('*').eq('is_available', true);
        if (categoryId && isValidUuid(categoryId)) {
          query = query.eq('category_id', categoryId);
        }
        const { data, error } = await query;
        if (!error && data) return data.map(mapProduct);
      } catch (err) {
        console.error('getProducts Supabase error, falling back to mock:', err);
      }
    }
    if (categoryId) {
      return mockProducts.filter((p) => p.categoryId === categoryId);
    }
    return mockProducts;
  },

  async getProductById(id: string): Promise<Product | undefined> {
    if (isSupabaseConfigured() && isValidUuid(id)) {
      try {
        const { data, error } = await getSupabase()
          .from('menu_items')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) return mapProduct(data);
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
            name_en: data.nameEn,
            name_ar: data.nameAr,
            desc_en: data.descEn,
            desc_ar: data.descAr,
            price_single: data.priceSingle,
            price_double: data.priceDouble || null,
            image_url: data.imageUrl,
            is_available: true,
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
    return newProd;
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    if (isSupabaseConfigured() && isValidUuid(id)) {
      try {
        const updateData: any = {};
        if (data.categoryId !== undefined) updateData.category_id = data.categoryId;
        if (data.nameEn !== undefined) updateData.name_en = data.nameEn;
        if (data.nameAr !== undefined) updateData.name_ar = data.nameAr;
        if (data.descEn !== undefined) updateData.desc_en = data.descEn;
        if (data.descAr !== undefined) updateData.desc_ar = data.descAr;
        if (data.priceSingle !== undefined) updateData.price_single = data.priceSingle;
        if (data.priceDouble !== undefined) updateData.price_double = data.priceDouble || null;
        if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl;
        if (data.isAvailable !== undefined) updateData.is_available = data.isAvailable;

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

  async deleteProduct(id: string): Promise<boolean> {
    if (isSupabaseConfigured() && isValidUuid(id)) {
      try {
        const { error } = await getSupabase()
          .from('menu_items')
          .update({ is_available: false })
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
          .eq('role', 'DRIVER')
          .eq('is_active', true);

        if (!error && data) {
          return data.map((p: any) => ({
            id: p.id,
            email: '',
            name: p.full_name,
            role: 'DRIVER',
            phone: p.phone || undefined,
          }));
        }
      } catch (err) {
        console.error('getDrivers Supabase error:', err);
      }
    }
    return mockUsers.filter((u) => u.role === 'DRIVER');
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
  async getOrders(filters?: { userId?: string; driverId?: string; status?: string }): Promise<Order[]> {
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
      ...data,
      items: data.items.map((it, idx) => ({ id: `oi-${Date.now()}-${idx}`, ...it })),
    };
    mockOrders.push(newOrder);
    return newOrder;
  },

  async updateOrderStatus(
    orderId: string,
    status: Order['status'],
    driverId?: string
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
  async getReviews(productId: string): Promise<Review[]> {
    if (isSupabaseConfigured() && isValidUuid(productId)) {
      try {
        const { data, error } = await getSupabase()
          .from('reviews')
          .select('*, profiles(full_name)')
          .eq('menu_item_id', productId)
          .order('created_at', { ascending: false });

        if (!error && data) return data.map(mapReview);
      } catch (err) {
        console.error('getReviews Supabase error, falling back to mock:', err);
      }
    }
    return mockReviews.filter((r) => r.productId === productId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
      ...data,
    };
    mockReviews.push(newReview);
    return newReview;
  },

  // COUPONS
  async getCouponByCode(code: string): Promise<Coupon | undefined> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getSupabase()
          .from('coupons')
          .select('*')
          .eq('code', code.toUpperCase())
          .eq('is_active', true)
          .single();

        if (!error && data) return mapCoupon(data);
      } catch (err) {
        console.error('getCouponByCode Supabase error:', err);
      }
    }
    return mockCoupons.find((c) => c.code.toUpperCase() === code.toUpperCase() && c.isActive);
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

  async getChatMessages(userId: string): Promise<ChatMessage[]> {
    if (isSupabaseConfigured() && isValidUuid(userId)) {
      try {
        const { data: chat } = await getSupabase()
          .from('support_chats')
          .select('id')
          .eq('customer_id', userId)
          .eq('status', 'OPEN')
          .single();
        
        if (chat) {
          const { data: messages, error } = await getSupabase()
            .from('support_messages')
            .select('*, profiles:sender_id(full_name)')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: true });
            
          if (!error && messages) {
            return messages.map((m: any) => ({
              id: m.id,
              userId: userId,
              senderId: m.sender_id,
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

  async getActiveChats(): Promise<{ userId: string; userName: string; lastMessage: string; updatedAt: string }[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getSupabase()
          .from('support_chats')
          .select(`
            customer_id,
            updated_at,
            profiles!support_chats_customer_id_fkey(full_name),
            support_messages(content, created_at)
          `)
          .eq('status', 'OPEN')
          .order('updated_at', { ascending: false });

        if (!error && data) {
          return data.map((chat: any) => {
            const msgs = chat.support_messages || [];
            msgs.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1].content : '';
            return {
              userId: chat.customer_id,
              userName: chat.profiles?.full_name || 'Customer',
              lastMessage: lastMsg,
              updatedAt: chat.updated_at,
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
          .select('id')
          .eq('customer_id', userId)
          .eq('status', 'OPEN')
          .single();

        if (!chat) {
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
                senderId: senderId,
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
      senderId: 'mock-staff-id',
      senderRole,
      senderName,
      text,
      createdAt: new Date().toISOString(),
    };
    mockChatMessages.push(newMessage);
    return newMessage;
  }
};
