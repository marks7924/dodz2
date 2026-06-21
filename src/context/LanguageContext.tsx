'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Locale = 'en' | 'ar';
type Direction = 'ltr' | 'rtl';

interface Translations {
  [key: string]: {
    en: string;
    ar: string;
  };
}

const translations: Translations = {
  // Navigation & General
  appName: { en: 'Dodz Fried Chicken', ar: 'دودز فرايد تشيكن' },
  home: { en: 'Home', ar: 'الرئيسية' },
  menu: { en: 'Menu', ar: 'القائمة' },
  driverPortal: { en: 'Driver Portal', ar: 'بوابة السائق' },
  adminPanel: { en: 'Admin Panel', ar: 'لوحة التحكم' },
  cart: { en: 'Cart', ar: 'السلة' },
  language: { en: 'العربية', ar: 'English' },
  egp: { en: 'EGP', ar: 'ج.م' },
  loading: { en: 'Loading...', ar: 'جاري التحميل...' },
  backToHome: { en: 'Back to Home', ar: 'العودة للرئيسية' },

  // Hero Section
  heroTitle: { en: 'Craving Hot Burger & Crispy Chicken?', ar: 'عايز برجر مشوي ودجاج مقرمش يجنن؟' },
  heroSubtitle: { en: 'Premium ingredients, fire-grilled patties, and the crispiest chicken in town. Delivered fresh & hot to your door.', ar: 'مكونات ممتازة، قطع لحم مشوية على الفحم، وأقرمش فرايد تشيكن في البلد. دليفري سخن وطازة لباب بيتك.' },
  orderNow: { en: 'Order Now', ar: 'اطلب الآن' },
  viewMenu: { en: 'View Menu', ar: 'عرض القائمة' },
  promoBanner: { en: 'Get 15% OFF on your first order! Use code: FIRST15', ar: 'احصل على خصم ١٥٪ على أول طلب! استخدم كود: FIRST15' },

  // Features
  featIngredientsTitle: { en: 'Premium Beef & Chicken', ar: 'لحوم ودجاج فاخرة' },
  featIngredientsDesc: { en: '100% fresh meat and premium hand-breaded chicken daily.', ar: 'لحوم بلدي طازة ١٠٠٪ ودجاج متبل ومقرمش يومياً.' },
  featFastTitle: { en: 'Super Fast Delivery', ar: 'توصيل فائق السرعة' },
  featFastDesc: { en: 'Hot and crispy delivery within 30-45 minutes.', ar: 'بيوصلك سخن ومقرمش خلال ٣٠-٤٥ دقيقة.' },
  featQualityTitle: { en: 'Top Culinary Standard', ar: 'أعلى معايير الجودة' },
  featQualityDesc: { en: 'Strict hygiene protocols and secret signature spices.', ar: 'بروتوكولات نظافة صارمة وبهارات سرية مميزة.' },

  // Categories
  beefBurgers: { en: 'Beef Burgers', ar: 'برجر لحم' },
  friedChicken: { en: 'Fried Chicken', ar: 'فرايد تشيكن' },
  sidesAppetizers: { en: 'Sides & Appetizers', ar: 'المقبلات والجانبيات' },
  drinks: { en: 'Drinks', ar: 'المشروبات' },

  // Variations & Options
  single: { en: 'Single', ar: 'سينجل' },
  double: { en: 'Double', ar: 'دبل' },
  outOfStock: { en: 'Out of Stock', ar: 'غير متوفر حالياً' },
  addToCart: { en: 'Add to Cart', ar: 'إضافة للسلة' },
  added: { en: 'Added!', ar: 'تمت الإضافة!' },

  // Cart Drawer
  yourCart: { en: 'Your Cart', ar: 'سلتك' },
  cartEmpty: { en: 'Your cart is empty. Add some delicious food!', ar: 'سلتك فارغة. ضيف بعض الأكلات اللذيذة!' },
  subtotal: { en: 'Subtotal', ar: 'المجموع الفرعي' },
  deliveryFee: { en: 'Delivery Fee', ar: 'رسوم التوصيل' },
  discount: { en: 'Discount', ar: 'الخصم' },
  total: { en: 'Total', ar: 'الإجمالي' },
  applyCoupon: { en: 'Apply Coupon', ar: 'تطبيق الكود' },
  couponApplied: { en: 'Coupon applied successfully!', ar: 'تم تطبيق الكود بنجاح!' },
  couponInvalid: { en: 'Invalid coupon code', ar: 'كود الخصم غير صحيح' },
  couponCodePlaceholder: { en: 'Enter coupon code (e.g. DODZ10)', ar: 'أدخل كود الخصم (مثال: DODZ10)' },
  checkoutBtn: { en: 'Proceed to Checkout', ar: 'الذهاب للدفع' },

  // Checkout Page
  checkoutTitle: { en: 'Secure Checkout', ar: 'إتمام الطلب بأمان' },
  orderType: { en: 'Order Type', ar: 'نوع الطلب' },
  delivery: { en: 'Delivery', ar: 'توصيل' },
  pickup: { en: 'Pickup', ar: 'استلام من المطعم' },
  fullName: { en: 'Full Name', ar: 'الاسم بالكامل' },
  phone: { en: 'Phone Number', ar: 'رقم الموبايل' },
  deliveryAddress: { en: 'Delivery Address', ar: 'عنوان التوصيل' },
  pinLocation: { en: 'Pin Location on Map', ar: 'تحديد الموقع على الخريطة' },
  paymentMethod: { en: 'Payment Method', ar: 'طريقة الدفع' },
  cod: { en: 'Cash on Delivery', ar: 'الدفع عند الاستلام' },
  fawry: { en: 'Fawry (Pay Local)', ar: 'فوري' },
  card: { en: 'Credit/Debit Card (Visa/Mastercard)', ar: 'بطاقة ائتمان' },
  placeOrder: { en: 'Place Order', ar: 'تأكيد الطلب' },
  addressPlaceholder: { en: 'Street, Building, Flat No.', ar: 'الشارع، العمارة، رقم الشقة' },
  phonePlaceholder: { en: 'e.g. 01xxxxxxxxx', ar: 'مثال: ٠١xxxxxxxx' },
  namePlaceholder: { en: 'e.g. Ahmed Ali', ar: 'مثال: أحمد علي' },

  // Order Tracking
  trackingTitle: { en: 'Track Your Order', ar: 'تتبع طلبك' },
  orderId: { en: 'Order ID', ar: 'رقم الطلب' },
  orderStatus: { en: 'Order Status', ar: 'حالة الطلب' },
  statusPending: { en: 'Pending Acceptance', ar: 'في انتظار القبول' },
  statusPreparing: { en: 'Preparing in Kitchen', ar: 'يتم التحضير في المطبخ' },
  statusShipped: { en: 'Out for Delivery', ar: 'جاري التوصيل مع السائق' },
  statusDelivered: { en: 'Delivered', ar: 'تم التوصيل بنجاح' },
  statusCancelled: { en: 'Cancelled', ar: 'تم إلغاء الطلب' },
  estimatedDelivery: { en: 'Estimated Delivery Time', ar: 'الوقت المتوقع للوصول' },
  minutes: { en: 'mins', ar: 'دقيقة' },
  driverDetails: { en: 'Driver Details', ar: 'تفاصيل السائق' },
  driverName: { en: 'Driver Name', ar: 'اسم السائق' },
  driverPhone: { en: 'Driver Phone', ar: 'رقم السائق' },

  // Driver Portal
  driverDashboard: { en: 'Driver Dashboard', ar: 'لوحة السائق' },
  activeDeliveries: { en: 'Active Deliveries', ar: 'طلبات التوصيل النشطة' },
  deliveredHistory: { en: 'Delivered History', ar: 'سجل الطلبات المسلمة' },
  earnings: { en: 'Total Earnings', ar: 'إجمالي الأرباح' },
  deliveredOrders: { en: 'Delivered Orders', ar: 'الطلبات المسلمة' },
  customer: { en: 'Customer', ar: 'العميل' },
  markPreparing: { en: 'Start Preparing', ar: 'بدء التحضير' },
  markShipped: { en: 'Start Delivery', ar: 'بدء التوصيل' },
  markDelivered: { en: 'Mark as Delivered', ar: 'تأكيد التسليم' },
  noAssignedOrders: { en: 'No orders assigned currently.', ar: 'لا توجد طلبات معينة لك حالياً.' },

  // Admin Panel
  adminDashboard: { en: 'Admin Dashboard', ar: 'لوحة إدارة المطعم' },
  liveOrdersCenter: { en: 'Live Order Control Center', ar: 'مركز متابعة الطلبات المباشر' },
  menuManagement: { en: 'Menu & Stock Management', ar: 'إدارة المنيو والمخزون' },
  assignDriver: { en: 'Assign Driver', ar: 'تعيين سائق' },
  acceptOrder: { en: 'Accept Order', ar: 'قبول الطلب' },
  selectDriver: { en: 'Select Driver', ar: 'اختر السائق' },
  noDriver: { en: 'No driver assigned', ar: 'لم يتم تعيين سائق بعد' },
  itemStatus: { en: 'Item Status', ar: 'حالة المنتج' },
  available: { en: 'Available', ar: 'متوفر' },
  notAvailable: { en: 'Not Available', ar: 'غير متوفر' },
  addNewProduct: { en: 'Add New Product', ar: 'إضافة منتج جديد' },
  editProduct: { en: 'Edit Product', ar: 'تعديل منتج' },
  productNameEn: { en: 'Name (English)', ar: 'الاسم (بالإنجليزي)' },
  productNameAr: { en: 'Name (Arabic)', ar: 'الاسم (بالعربي)' },
  productDescEn: { en: 'Description (English)', ar: 'الوصف (بالإنجليزي)' },
  productDescAr: { en: 'Description (Arabic)', ar: 'الوصف (بالعربي)' },
  productPriceSingle: { en: 'Price (Single) in EGP', ar: 'سعر السينجل (ج.م)' },
  productPriceDouble: { en: 'Price (Double) in EGP (Optional)', ar: 'سعر الدبل (ج.م - اختياري)' },
  productImage: { en: 'Image URL', ar: 'رابط الصورة' },
  productCategory: { en: 'Category', ar: 'القسم' },
  save: { en: 'Save', ar: 'حفظ' },
  delete: { en: 'Delete', ar: 'حذف' },
  cancel: { en: 'Cancel', ar: 'إلغاء' },
  revenue: { en: 'Total Revenue', ar: 'إجمالي المبيعات' },
  totalOrdersCount: { en: 'Total Orders', ar: 'إجمالي الطلبات' },
  recentOrders: { en: 'Recent Orders', ar: 'الطلبات الأخيرة' },

  // Reviews
  reviews: { en: 'Reviews', ar: 'التقييمات' },
  writeReview: { en: 'Write a Review', ar: 'اكتب تقييمك' },
  submitReview: { en: 'Submit Review', ar: 'إرسال التقييم' },
  rating: { en: 'Rating', ar: 'التقييم' },
  comment: { en: 'Comment', ar: 'التعليق' },
  noReviews: { en: 'No reviews yet for this product. Be the first!', ar: 'لا توجد تقييمات لهذا المنتج بعد. كن الأول!' },
  
  // Auth
  login: { en: 'Login', ar: 'تسجيل الدخول' },
  logout: { en: 'Logout', ar: 'تسجيل الخروج' },
  signup: { en: 'Sign Up', ar: 'إنشاء حساب' },
  email: { en: 'Email Address', ar: 'البريد الإلكتروني' },
  password: { en: 'Password', ar: 'كلمة المرور' },
  noAccount: { en: "Don't have an account?", ar: 'ليس لديك حساب؟' },
  haveAccount: { en: 'Already have an account?', ar: 'لديك حساب بالفعل؟' },
  forgotPassword: { en: 'Forgot Password?', ar: 'نسيت كلمة المرور؟' },
  resetPassword: { en: 'Reset Password', ar: 'إعادة تعيين كلمة المرور' },
  resetLinkSent: { en: 'Password reset link sent to your email!', ar: 'تم إرسال رابط إعادة التعيين لبريدك الإلكتروني!' },
  driverLogin: { en: 'Driver Login', ar: 'دخول السائقين' },
  adminLogin: { en: 'Staff Login', ar: 'دخول الموظفين' }
};

interface LanguageContextType {
  locale: Locale;
  dir: Direction;
  t: (key: string) => string;
  toggleLocale: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>('en');

  // Detect locale on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem('locale') as Locale;
    if (savedLocale === 'en' || savedLocale === 'ar') {
      setLocale(savedLocale);
    } else {
      setLocale('en'); // Default to English
    }
  }, []);

  useEffect(() => {
    // Update document dir and lang attributes
    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
    localStorage.setItem('locale', locale);
  }, [locale]);

  const toggleLocale = () => {
    setLocale((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) return key;
    return translation[locale] || key;
  };

  const dir: Direction = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ locale, dir, t, toggleLocale }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
