import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { miniApp, retrieveLaunchParams, useSignal } from '@telegram-apps/sdk-react';
import { AppRoot, Placeholder } from '@telegram-apps/telegram-ui';
import { SessionProvider, useSession } from './providers/SessionProvider.js';
import { CartProvider } from './providers/CartProvider.js';
import { useBackButton } from './hooks/useBackButton.js';
import { Loader } from './components/Loader.js';
import { CatalogPage } from './pages/CatalogPage.js';
import { ProductPage } from './pages/ProductPage.js';
import { CartPage } from './pages/CartPage.js';
import { OrdersPage } from './pages/OrdersPage.js';
import { AdminPage } from './pages/AdminPage.js';

function platform(): 'ios' | 'base' {
  try {
    return retrieveLaunchParams().tgWebAppPlatform === 'ios' ? 'ios' : 'base';
  } catch {
    return 'base';
  }
}

function Shell(): React.JSX.Element {
  useBackButton();
  const { status, error } = useSession();

  if (status === 'loading') return <Loader />;
  if (status === 'error') {
    return (
      <Placeholder header="Couldn’t sign you in" description={error ?? 'Please reopen the app'}>
        <span style={{ fontSize: 48 }}>🔒</span>
      </Placeholder>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<CatalogPage />} />
      <Route path="/product/:id" element={<ProductPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App(): React.JSX.Element {
  const isDark = useSignal(miniApp.isDark);

  return (
    <AppRoot appearance={isDark ? 'dark' : 'light'} platform={platform()}>
      <SessionProvider>
        <CartProvider>
          <HashRouter>
            <Shell />
          </HashRouter>
        </CartProvider>
      </SessionProvider>
    </AppRoot>
  );
}
