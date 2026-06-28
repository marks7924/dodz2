import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SizeOption = 'SINGLE' | 'DOUBLE' | 'NONE';

export interface CartItem {
  productId: String;
  nameEn: string;
  nameAr: string;
  price: number;
  quantity: number;
  size: SizeOption;
  imageUrl: string;
  customizations?: { optionId: string; nameEn: string; nameAr: string; price: number }[];
  extras?: { id: string; nameEn: string; nameAr: string; price: number; quantity: number; isStandard: boolean }[];
  categoryId?: string;
}

export interface CouponState {
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  applicableCategoryId?: string | null;
}

interface CartStore {
  items: CartItem[];
  coupon: CouponState | null;
  deliveryType: 'DELIVERY' | 'PICKUP';
  deliveryFee: number;
  cartOpen: boolean;
  selectedBranchId: string;
  
  // Actions
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (productId: String, size: SizeOption, customizations?: any[], extras?: any[]) => void;
  deleteItem: (productId: String, size: SizeOption, customizations?: any[], extras?: any[]) => void;
  applyCoupon: (coupon: CouponState) => void;
  removeCoupon: () => void;
  setDeliveryType: (type: 'DELIVERY' | 'PICKUP') => void;
  setCartOpen: (open: boolean) => void;
  setSelectedBranchId: (id: string) => void;
  clearCart: () => void;

  // Derived values
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      coupon: null,
      deliveryType: 'DELIVERY',
      deliveryFee: 40, // Default Egyptian delivery fee in EGP
      cartOpen: false,
      selectedBranchId: 'branch-3', // Default to Tagamoa Branch

      addItem: (item) => {
        set((state) => {
          const getSortedCustomizationsJson = (custs?: any[]) => {
            if (!custs || custs.length === 0) return '[]';
            const sorted = [...custs].sort((a, b) => a.optionId.localeCompare(b.optionId));
            return JSON.stringify(sorted);
          };
          const getSortedExtrasJson = (exts?: any[]) => {
            if (!exts || exts.length === 0) return '[]';
            const sorted = [...exts].sort((a, b) => a.id.localeCompare(b.id));
            return JSON.stringify(sorted);
          };
          const jsonCust = getSortedCustomizationsJson(item.customizations);
          const jsonExt = getSortedExtrasJson(item.extras);
          const existingItemIndex = state.items.findIndex(
            (i) => i.productId === item.productId && 
                   i.size === item.size &&
                   getSortedCustomizationsJson(i.customizations) === jsonCust &&
                   getSortedExtrasJson(i.extras) === jsonExt
          );

          // Automatically open cart when item is added for better UX
          const newState: Partial<CartStore> = { cartOpen: true };

          if (existingItemIndex > -1) {
            const updatedItems = [...state.items];
            updatedItems[existingItemIndex].quantity += 1;
            return { ...newState, items: updatedItems };
          }

          return { ...newState, items: [...state.items, { ...item, quantity: 1 }] };
        });
      },

      removeItem: (productId, size, customizations, extras) => {
        set((state) => {
          const getSortedCustomizationsJson = (custs?: any[]) => {
            if (!custs || custs.length === 0) return '[]';
            const sorted = [...custs].sort((a, b) => a.optionId.localeCompare(b.optionId));
            return JSON.stringify(sorted);
          };
          const getSortedExtrasJson = (exts?: any[]) => {
            if (!exts || exts.length === 0) return '[]';
            const sorted = [...exts].sort((a, b) => a.id.localeCompare(b.id));
            return JSON.stringify(sorted);
          };
          const jsonCust = getSortedCustomizationsJson(customizations);
          const jsonExt = getSortedExtrasJson(extras);
          const existingItemIndex = state.items.findIndex(
            (i) => i.productId === productId && 
                   i.size === size &&
                   getSortedCustomizationsJson(i.customizations) === jsonCust &&
                   getSortedExtrasJson(i.extras) === jsonExt
          );

          if (existingItemIndex === -1) return {};

          const updatedItems = [...state.items];
          const item = updatedItems[existingItemIndex];

          if (item.quantity > 1) {
            item.quantity -= 1;
            return { items: updatedItems };
          } else {
            return { items: state.items.filter((_, idx) => idx !== existingItemIndex) };
          }
        });
      },

      deleteItem: (productId, size, customizations, extras) => {
        set((state) => {
          const getSortedCustomizationsJson = (custs?: any[]) => {
            if (!custs || custs.length === 0) return '[]';
            const sorted = [...custs].sort((a, b) => a.optionId.localeCompare(b.optionId));
            return JSON.stringify(sorted);
          };
          const getSortedExtrasJson = (exts?: any[]) => {
            if (!exts || exts.length === 0) return '[]';
            const sorted = [...exts].sort((a, b) => a.id.localeCompare(b.id));
            return JSON.stringify(sorted);
          };
          const jsonCust = getSortedCustomizationsJson(customizations);
          const jsonExt = getSortedExtrasJson(extras);
          const existingItemIndex = state.items.findIndex(
            (i) => i.productId === productId && 
                   i.size === size &&
                   getSortedCustomizationsJson(i.customizations) === jsonCust &&
                   getSortedExtrasJson(i.extras) === jsonExt
          );
          if (existingItemIndex === -1) return {};
          return {
            items: state.items.filter((_, idx) => idx !== existingItemIndex),
          };
        });
      },

      applyCoupon: (coupon) => set({ coupon }),
      
      removeCoupon: () => set({ coupon: null }),

      setDeliveryType: (type) =>
        set({
          deliveryType: type,
          deliveryFee: type === 'DELIVERY' ? 40 : 0,
        }),

      setCartOpen: (open) => set({ cartOpen: open }),

      setSelectedBranchId: (id) => set({ selectedBranchId: id }),

      clearCart: () => set({ items: [], coupon: null, deliveryType: 'DELIVERY', deliveryFee: 40, cartOpen: false }),

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      getDiscountAmount: () => {
        const coupon = get().coupon;
        if (!coupon) return 0;

        const items = get().items;
        let discountableSubtotal = 0;
        if (coupon.applicableCategoryId) {
          discountableSubtotal = items
            .filter((item) => item.categoryId === coupon.applicableCategoryId)
            .reduce((sum, item) => sum + item.price * item.quantity, 0);
        } else {
          discountableSubtotal = get().getSubtotal();
        }

        if (coupon.discountType === 'PERCENT') {
          return (discountableSubtotal * coupon.discountValue) / 100;
        } else {
          return Math.min(coupon.discountValue, discountableSubtotal);
        }
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const discount = get().getDiscountAmount();
        const deliveryFee = get().deliveryFee;
        return Math.max(0, subtotal - discount + deliveryFee);
      },
    }),
    {
      name: 'dodz-cart-storage', // localstorage key
    }
  )
);
