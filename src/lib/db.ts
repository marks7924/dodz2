// Dual-mode database layer: tries PostgreSQL via Prisma, falls back to memory.
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

try {
  if (process.env.DATABASE_URL) {
    prisma = new PrismaClient();
  }
} catch (e) {
  console.warn('Prisma client initialization skipped, using mock database storage instead.');
}

// ==========================================
// MOCK DATABASE & DATA SEED
// ==========================================

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
  branchId: string; // Track which branch the order goes to
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
  role: 'CUSTOMER' | 'DRIVER' | 'STAFF' | 'OWNER';
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

// In-Memory Seed Data
let mockCategories: Category[] = [
  { id: 'cat-1', nameEn: 'Beef Burgers', nameAr: 'برجر لحم' },
  { id: 'cat-2', nameEn: 'Fried Chicken', nameAr: 'فرايد تشيكن' },
  { id: 'cat-3', nameEn: 'Sides & Appetizers', nameAr: 'المقبلات والجانبيات' },
  { id: 'cat-4', nameEn: 'Drinks', nameAr: 'المشروبات' },
];

let mockProducts: Product[] = [
  // Beef Burgers
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
  // Fried Chicken
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
    id: 'prod-chicken-5pcs',
    categoryId: 'cat-2',
    nameEn: 'Fried Chicken Meal (5 Pcs)',
    nameAr: 'وجبة الدجاج المقرمش (٥ قطع)',
    descEn: '5 Pcs Chicken + Fries + Coleslaw + 2 Buns',
    descAr: '٥ قطع دجاج مقرمش + بطاطس + كولسلو + ٢ خبز',
    priceSingle: 240,
    imageUrl: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
  // Sides & Appetizers
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
    id: 'prod-strips',
    categoryId: 'cat-3',
    nameEn: 'Chicken Strips (3 Pcs)',
    nameAr: 'تشيكن ستربس (٣ قطع)',
    descEn: '3 Pieces of crispy hand-breaded chicken tenders with dipping sauce.',
    descAr: '٣ قطع ستربس دجاج مقرمش ومتبل مع صوص خارجي',
    priceSingle: 75,
    imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
  {
    id: 'prod-mozzarella',
    categoryId: 'cat-3',
    nameEn: 'Mozzarella Sticks (4 Pcs)',
    nameAr: 'أصابع موتزاريلا (٤ قطع)',
    descEn: '4 Pieces of golden crispy mozzarella sticks.',
    descAr: '٤ أصابع جبنة موتزاريلا مقلية مقرمشة وسايحة',
    priceSingle: 60,
    imageUrl: 'https://images.unsplash.com/photo-1531749668029-2db88e4b76ce?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
  {
    id: 'prod-coleslaw',
    categoryId: 'cat-3',
    nameEn: 'Coleslaw Salad',
    nameAr: 'سلطة كولسلو',
    descEn: 'Freshly prepared shredded cabbage and carrot in sweet creamy dressing.',
    descAr: 'كرنب وجزر مبشور طازة مع صوص كريمي حلو',
    priceSingle: 25,
    imageUrl: 'https://images.unsplash.com/photo-1625938146369-adc83368bda7?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
  // Drinks
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
  {
    id: 'prod-water',
    categoryId: 'cat-4',
    nameEn: 'Mineral Water',
    nameAr: 'مياه معدنية',
    descEn: 'Refreshing bottled mineral water.',
    descAr: 'زجاجة مياه معدنية نقية وباردة',
    priceSingle: 10,
    imageUrl: 'https://images.unsplash.com/photo-1608885898957-a599fb1b4600?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
  },
];

let mockUsers: User[] = [
  { id: 'user-owner', email: 'owner@dodz.com', name: 'Sherif Dodz (Owner)', role: 'OWNER', phone: '01011112222' },
  { id: 'user-staff', email: 'staff@dodz.com', name: 'Karim Aly (Kitchen)', role: 'STAFF', phone: '01033334444' },
  { id: 'user-driver1', email: 'driver1@dodz.com', name: 'Mustafa Salem (Driver)', role: 'DRIVER', phone: '01255556666' },
  { id: 'user-driver2', email: 'driver2@dodz.com', name: 'Tarek Fathy (Driver)', role: 'DRIVER', phone: '01177778888' },
  { id: 'user-cust', email: 'customer@test.com', name: 'Mina Ramzy', role: 'CUSTOMER', phone: '01599990000' },
];

let mockBranches: Branch[] = [
  { id: 'branch-1', nameEn: 'Seashell Walk Branch', nameAr: 'سي شيل ووك - الساحل', mapUrl: 'https://maps.app.goo.gl/41ghzJmGZFH5ydau9' },
  { id: 'branch-2', nameEn: 'Marina Walk Branch', nameAr: 'مارينا ووك - الساحل', mapUrl: 'https://maps.app.goo.gl/uFNMVQf7mARqx3VP6?g_st=ac' },
  { id: 'branch-3', nameEn: 'Tagamoa Branch', nameAr: 'فرع التجمع', mapUrl: 'https://maps.app.goo.gl/PY39jUeRrMDCEcoa9' },
  { id: 'branch-4', nameEn: 'Almaza Branch', nameAr: 'فرع الماظه', mapUrl: 'https://maps.app.goo.gl/b8dnYd1XsQ31qsb89' },
  { id: 'branch-5', nameEn: 'Nasr City Branch', nameAr: 'فرع مدينه نصر', mapUrl: 'https://maps.app.goo.gl/xra2XTm54n3K6kaD9?g_st=ac' },
  { id: 'branch-6', nameEn: 'Hadayek El-Kobba Branch', nameAr: 'فرع حدائق القبه', mapUrl: 'https://maps.app.goo.gl/a8UYTCEwjHojwvFy5?g_st=ac' },
  { id: 'branch-7', nameEn: 'Ain Shams Branch', nameAr: 'فرع عين شمس', mapUrl: 'https://maps.app.goo.gl/gYqVryurQyTXWqibA' },
];

let mockOrders: Order[] = [
  {
    id: 'ord-1001',
    userId: 'user-cust',
    userName: 'Mina Ramzy',
    userPhone: '01599990000',
    branchId: 'branch-3', // Tagamoa
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
  },
  {
    id: 'ord-1002',
    userId: 'user-cust',
    userName: 'Mina Ramzy',
    userPhone: '01599990000',
    branchId: 'branch-4', // Almaza
    type: 'DELIVERY',
    status: 'PENDING',
    total: 205,
    deliveryFee: 40,
    address: '5th Settlement, El-Teseen St, G-12',
    discount: 0,
    paymentMethod: 'COD',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [
      { id: 'oi-2', productId: 'prod-crispy-chicken', productNameEn: 'Crispy Chicken Sandwich', productNameAr: 'ساندوتش دجاج كريسبي', size: 'SINGLE', quantity: 1, price: 110 },
      { id: 'oi-3', productId: 'prod-fries', productNameEn: 'French Fries', productNameAr: 'بطاطس مقلية', size: 'NONE', quantity: 1, price: 35 },
      { id: 'oi-4', productId: 'prod-mozzarella', productNameEn: 'Mozzarella Sticks (4 Pcs)', productNameAr: 'أصابع موتزاريلا (٤ قطع)', size: 'NONE', quantity: 1, price: 60 }
    ]
  }
];

let mockReviews: Review[] = [
  { id: 'rev-1', userId: 'user-cust', userName: 'Mina Ramzy', productId: 'prod-dodz-burger', rating: 5, comment: 'Best double burger in Cairo! Super juicy and sauce is perfect.', createdAt: new Date().toISOString() },
  { id: 'rev-2', userId: 'user-cust', userName: 'Mina Ramzy', productId: 'prod-fire-chicken', rating: 4, comment: 'Very spicy and crispy! Loved the jalapenos.', createdAt: new Date().toISOString() }
];

let mockCoupons: Coupon[] = [
  { id: 'coup-1', code: 'FIRST15', discountType: 'PERCENT', discountValue: 15, isActive: true },
  { id: 'coup-2', code: 'DODZ10', discountType: 'FIXED', discountValue: 30, isActive: true },
];

export interface ChatMessage {
  id: string;
  userId: string;
  senderRole: 'CUSTOMER' | 'STAFF' | 'OWNER';
  senderName: string;
  text: string;
  createdAt: string;
}

let mockChatMessages: ChatMessage[] = [
  { id: 'm-1', userId: 'user-cust', senderRole: 'CUSTOMER', senderName: 'Mina Ramzy', text: 'Hello, is my order on the way?', createdAt: new Date(Date.now() - 50000).toISOString() },
  { id: 'm-2', userId: 'user-cust', senderRole: 'STAFF', senderName: 'Karim Aly (Kitchen)', text: 'Yes Mina, our driver Mustafa has picked it up and is on the way!', createdAt: new Date(Date.now() - 30000).toISOString() },
];

// Helper to write changes to local memory and simulate real DB
export const db = {
  // CATEGORIES
  async getCategories(): Promise<Category[]> {
    return mockCategories;
  },

  async createCategory(data: Omit<Category, 'id'>): Promise<Category> {
    const newCat = { id: `cat-${Date.now()}`, ...data };
    mockCategories.push(newCat);
    return newCat;
  },

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    const idx = mockCategories.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Category not found');
    mockCategories[idx] = { ...mockCategories[idx], ...data };
    return mockCategories[idx];
  },

  async deleteCategory(id: string): Promise<boolean> {
    mockCategories = mockCategories.filter((c) => c.id !== id);
    mockProducts = mockProducts.filter((p) => p.categoryId !== id);
    return true;
  },

  // BRANCHES
  async getBranches(): Promise<Branch[]> {
    return mockBranches;
  },

  // PRODUCTS
  async getProducts(categoryId?: string): Promise<Product[]> {
    if (categoryId) {
      return mockProducts.filter((p) => p.categoryId === categoryId);
    }
    return mockProducts;
  },

  async getProductById(id: string): Promise<Product | undefined> {
    return mockProducts.find((p) => p.id === id);
  },

  async createProduct(data: Omit<Product, 'id' | 'isAvailable'>): Promise<Product> {
    const newProd = { id: `prod-${Date.now()}`, isAvailable: true, ...data };
    mockProducts.push(newProd);
    return newProd;
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const idx = mockProducts.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Product not found');
    mockProducts[idx] = { ...mockProducts[idx], ...data };
    return mockProducts[idx];
  },

  async deleteProduct(id: string): Promise<boolean> {
    mockProducts = mockProducts.filter((p) => p.id !== id);
    return true;
  },

  // USERS / AUTH
  async getUserByEmail(email: string): Promise<User | undefined> {
    return mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
  },

  async getUserById(id: string): Promise<User | undefined> {
    return mockUsers.find((u) => u.id === id);
  },

  async getDrivers(): Promise<User[]> {
    return mockUsers.filter((u) => u.role === 'DRIVER');
  },

  async createUser(data: { name: string; email: string; role: 'CUSTOMER' | 'DRIVER' | 'STAFF' | 'OWNER'; phone?: string }): Promise<User> {
    const newUser = { id: `user-${Date.now()}`, ...data };
    mockUsers.push(newUser);
    return newUser;
  },

  // ORDERS
  async getOrders(filters?: { userId?: string; driverId?: string; status?: string }): Promise<Order[]> {
    let list = [...mockOrders];
    if (filters) {
      if (filters.userId) list = list.filter((o) => o.userId === filters.userId);
      if (filters.driverId) list = list.filter((o) => o.driverId === filters.driverId);
      if (filters.status) list = list.filter((o) => o.status === filters.status);
    }
    // Sort latest first
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getOrderById(id: string): Promise<Order | undefined> {
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

  async updateOrderStatus(orderId: string, status: Order['status'], driverId?: string): Promise<Order> {
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

  // REVIEWS
  async getReviews(productId: string): Promise<Review[]> {
    return mockReviews.filter((r) => r.productId === productId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createReview(data: { userId: string; userName: string; productId: string; rating: number; comment: string }): Promise<Review> {
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
    return mockCoupons.find((c) => c.code.toUpperCase() === code.toUpperCase() && c.isActive);
  },

  async getCoupons(): Promise<Coupon[]> {
    return mockCoupons;
  },

  async createCoupon(data: Omit<Coupon, 'id' | 'isActive'>): Promise<Coupon> {
    const newCoupon = { id: `coup-${Date.now()}`, isActive: true, ...data };
    mockCoupons.push(newCoupon);
    return newCoupon;
  },

  // CHAT SUPPORT
  async getChatMessages(userId: string): Promise<ChatMessage[]> {
    return mockChatMessages
      .filter((m) => m.userId === userId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  async getActiveChats(): Promise<{ userId: string; userName: string; lastMessage: string; updatedAt: string }[]> {
    const userIds = Array.from(new Set(mockChatMessages.map((m) => m.userId)));
    return userIds
      .map((uid) => {
        const userMsgs = mockChatMessages
          .filter((m) => m.userId === uid)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const lastMsg = userMsgs[userMsgs.length - 1];
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
  }
};
