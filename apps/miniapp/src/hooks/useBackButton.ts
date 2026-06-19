import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { backButton } from '@telegram-apps/sdk-react';

/** Shows the Telegram BackButton on every screen except the catalog root. */
export function useBackButton(): void {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!backButton.isSupported() || !backButton.isMounted()) return;
    if (location.pathname === '/') {
      backButton.hide();
      return;
    }
    backButton.show();
    const off = backButton.onClick(() => navigate(-1));
    return () => {
      off();
    };
  }, [location.pathname, navigate]);
}
