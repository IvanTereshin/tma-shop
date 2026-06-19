import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { openInvoice } from '@telegram-apps/sdk-react';
import { Button, Cell, List, Placeholder, Section } from '@telegram-apps/telegram-ui';
import { api, ApiClientError } from '../api/client.js';
import { useCart } from '../providers/CartProvider.js';
import { useMainButton } from '../hooks/useMainButton.js';
import { formatPrice } from '../lib/format.js';
import { Loader } from '../components/Loader.js';

export function CartPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { cart, loading, setQuantity, remove } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkout = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const { orderId } = await api.createOrder();
      const { invoiceLink } = await api.createInvoice(orderId);
      if (openInvoice.isAvailable()) {
        const status = await openInvoice(invoiceLink, 'url');
        navigate(status === 'paid' ? '/orders' : `/orders`);
      } else {
        // Outside Telegram (browser dev) we cannot open the native invoice.
        navigate('/orders');
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Checkout failed');
    } finally {
      setBusy(false);
    }
  }, [navigate]);

  const hasItems = (cart?.lines.length ?? 0) > 0;

  useMainButton({
    text: cart ? `Checkout · ${formatPrice(cart.total, cart.currency)}` : 'Checkout',
    visible: hasItems,
    loading: busy,
    onClick: checkout,
  });

  if (loading && !cart) return <Loader />;

  if (!hasItems) {
    return (
      <Placeholder header="Your cart is empty" description="Add products from the catalog">
        <span style={{ fontSize: 48 }}>🛒</span>
      </Placeholder>
    );
  }

  return (
    <List>
      {error && (
        <Section>
          <Cell style={{ color: 'var(--tgui--destructive_text_color)' }}>{error}</Cell>
        </Section>
      )}
      <Section header="Cart">
        {cart?.lines.map((line) => (
          <Cell
            key={line.product.id}
            subtitle={formatPrice(line.product.price, line.product.currency)}
            after={formatPrice(line.subtotal, cart.currency)}
            description={
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                <Button
                  size="s"
                  mode="bezeled"
                  onClick={() => void setQuantity(line.product.id, line.quantity - 1)}
                >
                  −
                </Button>
                <span>{line.quantity}</span>
                <Button
                  size="s"
                  mode="bezeled"
                  onClick={() => void setQuantity(line.product.id, line.quantity + 1)}
                >
                  +
                </Button>
                <Button size="s" mode="plain" onClick={() => void remove(line.product.id)}>
                  Remove
                </Button>
              </div>
            }
            multiline
          >
            {line.product.title}
          </Cell>
        ))}
      </Section>
      <Section>
        <Cell after={cart ? formatPrice(cart.total, cart.currency) : ''}>Total</Cell>
      </Section>
    </List>
  );
}
