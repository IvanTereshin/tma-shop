import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Cart } from '@tma-shop/shared';
import { api } from '../api/client.js';
import { useSession } from './SessionProvider.js';

interface CartValue {
  cart: Cart | null;
  loading: boolean;
  itemCount: number;
  refresh: () => Promise<void>;
  add: (productId: string, quantity: number) => Promise<void>;
  setQuantity: (productId: string, quantity: number) => Promise<void>;
  remove: (productId: string) => Promise<void>;
}

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { status } = useSession();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCart(await api.getCart());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'ready') void refresh();
  }, [status, refresh]);

  const add = useCallback(async (productId: string, quantity: number) => {
    setCart(await api.addToCart(productId, quantity));
  }, []);

  const setQuantity = useCallback(async (productId: string, quantity: number) => {
    setCart(await api.setCartItem(productId, quantity));
  }, []);

  const remove = useCallback(async (productId: string) => {
    setCart(await api.removeCartItem(productId));
  }, []);

  const value = useMemo<CartValue>(
    () => ({ cart, loading, itemCount: cart?.itemCount ?? 0, refresh, add, setQuantity, remove }),
    [cart, loading, refresh, add, setQuantity, remove],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
