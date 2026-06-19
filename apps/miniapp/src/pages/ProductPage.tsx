import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Cell, List, Section, Text, Title } from '@telegram-apps/telegram-ui';
import { api } from '../api/client.js';
import { useAsync } from '../hooks/useAsync.js';
import { useCart } from '../providers/CartProvider.js';
import { useMainButton } from '../hooks/useMainButton.js';
import { formatPrice } from '../lib/format.js';
import { Loader } from '../components/Loader.js';
import { ErrorView } from '../components/ErrorView.js';

export function ProductPage(): React.JSX.Element {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const [adding, setAdding] = useState(false);

  const { data: product, loading, error } = useAsync(() => api.getProduct(id), [id]);
  const outOfStock = product?.stock !== null && product !== null && (product?.stock ?? 0) <= 0;

  const onAdd = useCallback(async () => {
    if (!product) return;
    setAdding(true);
    try {
      await add(product.id, 1);
      navigate('/cart');
    } finally {
      setAdding(false);
    }
  }, [product, add, navigate]);

  useMainButton({
    text: outOfStock ? 'Out of stock' : 'Add to cart',
    visible: Boolean(product),
    enabled: !outOfStock,
    loading: adding,
    onClick: onAdd,
  });

  if (loading) return <Loader />;
  if (error || !product) return <ErrorView message={error ?? 'Product not found'} />;

  return (
    <List>
      <Section>
        <div style={{ padding: 16 }}>
          <Title level="2" weight="2">
            {product.title}
          </Title>
          <Title level="3" weight="1" style={{ marginTop: 8 }}>
            {formatPrice(product.price, product.currency)}
          </Title>
          <Text style={{ display: 'block', marginTop: 12 }}>{product.description}</Text>
        </div>
      </Section>
      <Section>
        <Cell after={product.stock === null ? 'In stock' : `${product.stock} left`}>
          Availability
        </Cell>
      </Section>
    </List>
  );
}
