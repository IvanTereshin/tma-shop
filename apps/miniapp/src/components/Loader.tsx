import { Spinner } from '@telegram-apps/telegram-ui';

export function Loader(): React.JSX.Element {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
      <Spinner size="l" />
    </div>
  );
}
