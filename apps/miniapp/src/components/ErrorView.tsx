import { Placeholder } from '@telegram-apps/telegram-ui';

export function ErrorView({ message }: { message: string }): React.JSX.Element {
  return (
    <Placeholder header="Something went wrong" description={message}>
      <span style={{ fontSize: 48 }}>😕</span>
    </Placeholder>
  );
}
