import { useState } from 'react';
import { Button, Cell, Input, List, Section, Textarea } from '@telegram-apps/telegram-ui';
import type { OrderStatus, ProductInput } from '@tma-shop/shared';
import { api, ApiClientError } from '../api/client.js';
import { useAsync } from '../hooks/useAsync.js';
import { useSession } from '../providers/SessionProvider.js';
import { formatPrice } from '../lib/format.js';
import { Loader } from '../components/Loader.js';
import { ErrorView } from '../components/ErrorView.js';

export function AdminPage(): React.JSX.Element {
  const { isAdmin } = useSession();
  const [reloadKey, setReloadKey] = useState(0);
  const reload = (): void => setReloadKey((k) => k + 1);

  const shop = useAsync(() => api.getShop(), []);
  const orders = useAsync(() => api.adminGetOrders(), [reloadKey]);

  if (!isAdmin) return <ErrorView message="Admins only" />;

  const setStatus = async (id: string, status: OrderStatus): Promise<void> => {
    await api.adminSetOrderStatus(id, status);
    reload();
  };

  return (
    <List>
      <NewProductForm currency={shop.data?.currency ?? 'XTR'} onCreated={reload} />

      <Section header="All orders">
        {orders.loading && <Loader />}
        {orders.error && <ErrorView message={orders.error} />}
        {orders.data?.length === 0 && <Cell>No orders</Cell>}
        {orders.data?.map((order) => (
          <Cell
            key={order.id}
            subtitle={`${order.status} · ${formatPrice(order.total, order.currency)}`}
            after={
              <div style={{ display: 'flex', gap: 8 }}>
                {order.status === 'paid' && (
                  <Button
                    size="s"
                    mode="bezeled"
                    onClick={() => void setStatus(order.id, 'fulfilled')}
                  >
                    Fulfill
                  </Button>
                )}
                {(order.status === 'pending' || order.status === 'awaiting_payment') && (
                  <Button
                    size="s"
                    mode="plain"
                    onClick={() => void setStatus(order.id, 'cancelled')}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            }
            multiline
          >
            #{order.id.slice(0, 8)}
          </Cell>
        ))}
      </Section>
    </List>
  );
}

function NewProductForm({
  currency,
  onCreated,
}: {
  currency: string;
  onCreated: () => void;
}): React.JSX.Element {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (): Promise<void> => {
    setBusy(true);
    setMessage(null);
    const input: ProductInput = {
      categoryId: null,
      slug: slug.trim(),
      title: title.trim(),
      description: description.trim(),
      price: Number(price) || 0,
      currency,
      imageUrl: null,
      stock: null,
      isActive: true,
    };
    try {
      const created = await api.adminCreateProduct(input);
      setMessage(`Created "${created.title}"`);
      setTitle('');
      setSlug('');
      setPrice('');
      setDescription('');
      onCreated();
    } catch (err) {
      setMessage(err instanceof ApiClientError ? err.message : 'Failed to create product');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section header="Add product">
      <Input header="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input header="Slug (kebab-case)" value={slug} onChange={(e) => setSlug(e.target.value)} />
      <Input
        header={`Price (${currency})`}
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />
      <Textarea
        header="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div style={{ padding: 16 }}>
        <Button stretched loading={busy} disabled={!title || !slug} onClick={() => void submit()}>
          Create product
        </Button>
        {message && <Cell>{message}</Cell>}
      </div>
    </Section>
  );
}
