import { isTMA, mockTelegramEnv } from '@telegram-apps/sdk-react';

/**
 * In development outside Telegram we fabricate a launch environment so the UI
 * can run in a plain browser. The mocked `initData` carries a demo user but its
 * hash is NOT valid for a real bot token — real authentication only succeeds
 * inside the Telegram client, which is where live testing happens.
 */
export function mockEnvForDev(): void {
  if (!import.meta.env.DEV || isTMA()) {
    return;
  }

  const authDate = Math.floor(Date.now() / 1000);
  const initDataRaw = new URLSearchParams({
    user: JSON.stringify({
      id: 99281932,
      first_name: 'Dev',
      last_name: 'User',
      username: 'devuser',
      language_code: 'en',
    }),
    auth_date: String(authDate),
    hash: 'dev-mock-hash-not-valid-for-real-bot',
  }).toString();

  mockTelegramEnv({
    launchParams: {
      tgWebAppData: initDataRaw,
      tgWebAppVersion: '8.0',
      tgWebAppPlatform: 'tdesktop',
      tgWebAppThemeParams: {
        bg_color: '#ffffff',
        text_color: '#000000',
        hint_color: '#999999',
        link_color: '#2481cc',
        button_color: '#2481cc',
        button_text_color: '#ffffff',
        secondary_bg_color: '#f1f1f1',
      },
    },
  });

  console.info('[tma-shop] Mock Telegram environment enabled for browser development.');
}
