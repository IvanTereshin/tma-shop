import { Badge, Cell, List, Placeholder, Section } from '@telegram-apps/telegram-ui';
import type { OrderStatus } from '@tma-shop/shared';
import { api } from '../api/client.js';
import { useAsync } from '../hooks/useAsync.js';
import { formatPrice, pluralize } from '../lib/format.js';
import { Loader } from '../components/Loader.js';
import { ErrorView } from '../components/ErrorView.js';

const STATUS_META: Record<OrderStatus, { label: string; type: 'number' | 'dot' }> = {
  pending: { label: 'Pending', type: 'dot' },
  awaiting_payment: { label: 'Awaiting payment', type: 'dot' },
  paid: { label: 'Paid', type: 'dot' },
  cancelled: { label: 'Cancelled', type: 'dot' },
  fulfilled: { label: 'Fulfilled', type: 'dot' },
};

export function OrdersPage(): React.JSX.Element {
  const { data: orders, loading, error } = useAsync(() => api.getOrders(), []);

  if (loading) return <Loader />;
  if (error) return <ErrorView message={error} />;
  if (!orders || orders.length === 0) {
    return (
      <Placeholder header="No orders yet" description="Your orders will appear here">
        <span style={{ fontSize: 48 }}>📦</span>
      </Placeholder>
    );
  }

  return (
    <List>
      <Section header="My orders">
        {orders.map((order) => (
          <Cell
            key={order.id}
            subtitle={pluralize(order.items.length, 'item', 'items')}
            after={formatPrice(order.total, order.currency)}
            description={<Badge type="dot" />}
            hint={STATUS_META[order.status].label}
            multiline
          >
            Order #{order.id.slice(0, 8)}
          </Cell>
        ))}
      </Section>
    </List>
  );
}
