import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Cell, Input, List, Section } from '@telegram-apps/telegram-ui';
import { api } from '../api/client.js';
import { useAsync } from '../hooks/useAsync.js';
import { useCart } from '../providers/CartProvider.js';
import { useSession } from '../providers/SessionProvider.js';
import { Loader } from '../components/Loader.js';
import { ErrorView } from '../components/ErrorView.js';
import { ProductCard } from '../components/ProductCard.js';

export function CatalogPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const { isAdmin } = useSession();
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');

  const categories = useAsync(() => api.getCategories(), []);
  const products = useAsync(
    () => api.getProducts({ categoryId, search: search.trim() || undefined }),
    [categoryId, search],
  );

  return (
    <List>
      <Section>
        <Cell
          onClick={() => navigate('/cart')}
          after={itemCount > 0 ? <Badge type="number">{itemCount}</Badge> : undefined}
        >
          🛒 Cart
        </Cell>
        <Cell onClick={() => navigate('/orders')}>📦 My orders</Cell>
        {isAdmin && <Cell onClick={() => navigate('/admin')}>🛠️ Admin</Cell>}
      </Section>

      <Section header="Catalog">
        <Input
          placeholder="Search products"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8, padding: '8px 16px', flexWrap: 'wrap' }}>
          <Button
            size="s"
            mode={categoryId === undefined ? 'filled' : 'bezeled'}
            onClick={() => setCategoryId(undefined)}
          >
            All
          </Button>
          {categories.data?.map((category) => (
            <Button
              key={category.id}
              size="s"
              mode={categoryId === category.id ? 'filled' : 'bezeled'}
              onClick={() => setCategoryId(category.id)}
            >
              {category.title}
            </Button>
          ))}
        </div>
      </Section>

      {products.loading && <Loader />}
      {products.error && <ErrorView message={products.error} />}
      {products.data && (
        <Section>
          {products.data.items.length === 0 ? (
            <Cell>No products found</Cell>
          ) : (
            products.data.items.map((product) => <ProductCard key={product.id} product={product} />)
          )}
        </Section>
      )}
    </List>
  );
}
