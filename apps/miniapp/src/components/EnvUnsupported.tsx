import { AppRoot, Placeholder } from '@telegram-apps/telegram-ui';

/** Shown when the app is opened outside a supported Telegram environment. */
export function EnvUnsupported(): React.JSX.Element {
  return (
    <AppRoot>
      <Placeholder
        header="Open in Telegram"
        description="This Mini App must be launched from a Telegram client."
      >
        <span style={{ fontSize: 56 }}>📱</span>
      </Placeholder>
    </AppRoot>
  );
}
