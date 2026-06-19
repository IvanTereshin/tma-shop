import { useEffect } from 'react';
import { mainButton } from '@telegram-apps/sdk-react';

export interface MainButtonOptions {
  text: string;
  visible: boolean;
  enabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}

/**
 * Declaratively drives the Telegram MainButton from a component. The button is
 * hidden automatically when the owning component unmounts.
 */
export function useMainButton({
  text,
  visible,
  enabled = true,
  loading = false,
  onClick,
}: MainButtonOptions): void {
  useEffect(() => {
    if (!mainButton.mount.isAvailable()) return;
    if (!mainButton.isMounted()) mainButton.mount();

    mainButton.setParams({
      text,
      isVisible: visible,
      isEnabled: enabled && !loading,
      isLoaderVisible: loading,
    });

    const off = mainButton.onClick(onClick);
    return () => {
      off();
      if (mainButton.isMounted()) mainButton.setParams({ isVisible: false });
    };
  }, [text, visible, enabled, loading, onClick]);
}
