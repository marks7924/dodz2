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
}

export interface CouponState {
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
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
  removeItem: (productId: String, size: SizeOption) => void;
  deleteItem: (productId: String, size: SizeOption) => void;
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
          const existingItemIndex = state.items.findIndex(
            (i) => i.productId === item.productId && i.size === item.size
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

      removeItem: (productId, size) => {
        set((state) => {
          const existingItemIndex = state.items.findIndex(
            (i) => i.productId === productId && i.size === size
          );

          if (existingItemIndex === -1) return {};

          const updatedItems = [...state.items];
          const item = updatedItems[existingItemIndex];

          if (item.quantity > 1) {
            item.quantity -= 1;
            return { items: updatedItems };
          } else {
            return { items: state.items.filter((i) => !(i.productId === productId && i.size === size)) };
          }
        });
      },

      deleteItem: (productId, size) => {
        set((state) => ({
          items: state.items.filter((i) => !(i.productId === productId && i.size === size)),
        }));
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
        const subtotal = get().getSubtotal();
        const coupon = get().coupon;
        if (!coupon) return 0;

        if (coupon.discountType === 'PERCENT') {
          return (subtotal * coupon.discountValue) / 100;
        } else {
          return Math.min(coupon.discountValue, subtotal);
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
