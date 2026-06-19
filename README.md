# tma-shop

> A universal e-commerce **Telegram Mini App** store — a React storefront backed by a typed Hono/PostgreSQL API, with server-side Telegram `initData` validation and **Telegram Stars** checkout.

[![CI](https://github.com/IvanTereshin/tma-shop/actions/workflows/ci.yml/badge.svg)](https://github.com/IvanTereshin/tma-shop/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](./tsconfig.base.json)

🇬🇧 English · [🇷🇺 Русский](#-русский)

---

## ✨ Overview

`tma-shop` is a reusable storefront that any merchant can configure: set a shop name, currency and catalog, and you have a native-feeling Telegram Mini App with a catalog, cart, checkout and order history. It is built as a small, strict TypeScript monorepo and ships with tests, CI, Docker and a seedable demo store.

It is intentionally **universal**: the entire store is driven by a single shop configuration record plus catalog data. Multi-tenant hosting is noted as a future path.

### Features

- 🛍️ **Storefront** — categories, product search, product details, cart and checkout
- 🔐 **Secure auth** — server-side HMAC-SHA256 validation of Telegram `initData` → short-lived JWT session
- ⭐ **Telegram Stars payments** — invoice link → native `openInvoice` → webhook reconciliation (idempotent)
- 📦 **Orders** — order history for customers, an admin view for managing products and order status
- 🧩 **Shared types** — one set of zod schemas validates the API and types the client
- 🎨 **Native UX** — Telegram UI components, theme sync, MainButton / BackButton, hash routing
- ✅ **Quality bar** — TS strict, ESLint + Prettier, Vitest (unit + live-Postgres integration), GitHub Actions CI, Docker + Compose

---

## 🏗️ Architecture

```
┌────────────────────────┐        initData (HMAC) → JWT        ┌─────────────────────────┐
│      apps/miniapp       │  ───────────────────────────────►  │        apps/api         │
│  React 18 + Vite        │            REST + Bearer            │  Hono + Drizzle ORM     │
│  @telegram-apps/sdk v3  │  ◄───────────────────────────────  │  PostgreSQL             │
│  Telegram UI            │             JSON / zod              │  Stars invoices         │
└────────────────────────┘                                     └────────────┬────────────┘
            ▲                                                                │
            │ openInvoice(⭐)                                                 │ Bot API
            ▼                                                                ▼
     Telegram client  ───────────  successful_payment webhook  ───────►  reconcile order
```

| Package           | Stack                                                                   | Responsibility                                             |
| ----------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| `packages/shared` | TypeScript, **zod 4**                                                   | Schemas & types shared by API and client                   |
| `apps/api`        | **Hono 4**, **Drizzle 0.45**, PostgreSQL, **jose**                      | initData validation, JWT, catalog/cart/orders/admin, Stars |
| `apps/miniapp`    | **React 18.3**, **Vite 8**, `@telegram-apps/sdk-react` 3, Telegram UI 2 | Storefront UI                                              |

> **Why React 18 in the Mini App?** `@telegram-apps/telegram-ui` peers on React 18, so the storefront pins React 18.3 while the rest of the stack tracks the latest releases.

---

## 🔐 Telegram `initData` validation

Authentication never trusts the client. The Mini App sends the raw `initData` string; the API verifies it before issuing a session:

1. Parse the query string and pull out `hash` (and ignore the Ed25519 `signature` field).
2. Build the **data-check-string**: every remaining field as `key=value`, sorted by key, joined by `\n`.
3. Derive the secret key: `HMAC_SHA256(key="WebAppData", message=botToken)`.
4. Compute `HMAC_SHA256(key=secretKey, message=dataCheckString)` and compare to `hash` in constant time.
5. Reject if `auth_date` is older than `INITDATA_MAX_AGE_SECONDS` (replay protection).

The validator is a pure, dependency-free function in [`apps/api/src/auth/init-data.ts`](apps/api/src/auth/init-data.ts) and is covered by deterministic unit tests (valid, tampered, wrong-token, expired, missing-field, signature-ignored). On success the API upserts the user and signs a short-lived JWT.

## ⭐ Stars payment flow

1. Customer checks out → API creates an order from the server-side cart.
2. API calls Bot API `createInvoiceLink` (currency `XTR`) and returns the link.
3. The client opens it with `openInvoice` from the SDK.
4. Telegram calls the webhook: `pre_checkout_query` is answered after re-validating the order, and `successful_payment` marks the order paid and decrements stock — **idempotently**, so retried updates are safe.

---

## 🚀 Quick start

### Prerequisites

- Node.js ≥ 22 (repo developed on Node 24)
- PostgreSQL 16 (or use Docker Compose)

### Local development

```bash
# 1. Install
npm install

# 2. Build the shared package (consumed by api & miniapp)
npm run build --workspace packages/shared

# 3. Configure the API
cp apps/api/.env.example apps/api/.env   # set BOT_TOKEN, JWT_SECRET, DATABASE_URL

# 4. Create the schema and seed a demo store
npm run db:migrate --workspace apps/api
npm run db:seed    --workspace apps/api

# 5. Run API and Mini App (two terminals)
npm run dev:api        # http://localhost:3000
npm run dev:miniapp    # http://localhost:5173 (proxies /api → :3000)
```

### Docker Compose

```bash
# Brings up Postgres + API (auto-migrated) + the Mini App (nginx)
BOT_TOKEN=123:abc JWT_SECRET=$(openssl rand -hex 32) docker compose up --build
# API → http://localhost:3000 · Mini App → http://localhost:8080
```

---

## 🧪 Testing & quality

```bash
npm run lint        # ESLint (flat config) across the monorepo
npm run format      # Prettier check
npm run typecheck   # tsc --noEmit, every workspace
npm test            # Vitest: shared + api (+ integration) + miniapp
```

The API ships a full **integration test** that runs against a real Postgres (`apps/api/src/__tests__/integration.test.ts`). It is skipped unless `TEST_DATABASE_URL` is set; CI provides a Postgres service and exercises the whole auth → cart → order → payment flow. The same checks run in [GitHub Actions](.github/workflows/ci.yml) on every push and PR.

---

## 📁 Project structure

```
tma-shop/
├── apps/
│   ├── api/                 # Hono + Drizzle backend
│   │   ├── src/auth/        # initData validation, JWT, middleware
│   │   ├── src/db/          # Drizzle schema, client, migrations, seed
│   │   ├── src/routes/      # auth, catalog, cart, orders, admin, webhook
│   │   ├── src/services/    # business logic (cart, orders, payments, …)
│   │   └── src/telegram/    # Bot API client & update types
│   └── miniapp/             # React + Vite storefront
│       └── src/             # pages, providers, hooks, SDK init, API client
├── packages/shared/         # zod schemas + inferred types
└── .github/workflows/ci.yml
```

---

## ⚙️ Configuration (API)

| Variable                   | Description                                       | Default |
| -------------------------- | ------------------------------------------------- | ------- |
| `DATABASE_URL`             | Postgres connection string                        | —       |
| `BOT_TOKEN`                | Telegram bot token (from @BotFather)              | —       |
| `JWT_SECRET`               | Secret for signing session JWTs (≥16 chars)       | —       |
| `JWT_TTL_SECONDS`          | Session lifetime                                  | `3600`  |
| `INITDATA_MAX_AGE_SECONDS` | Max accepted `initData` age                       | `86400` |
| `ADMIN_TELEGRAM_IDS`       | Comma-separated admin user ids                    | —       |
| `TELEGRAM_WEBHOOK_SECRET`  | Secret token for the webhook                      | —       |
| `SHOP_ID`                  | Active shop id (optional; resolved automatically) | —       |
| `CORS_ORIGIN`              | Allowed Mini App origin(s)                        | `*`     |

---

## 📝 License

[MIT](./LICENSE) © Ivan Tereshin

---

## 🇷🇺 Русский

> Универсальный магазин в формате **Telegram Mini App** — витрина на React и типизированный API на Hono/PostgreSQL, с серверной проверкой Telegram `initData` и оплатой через **Telegram Stars**.

### Возможности

- 🛍️ **Витрина** — категории, поиск, карточка товара, корзина и оформление
- 🔐 **Безопасная авторизация** — серверная проверка `initData` по HMAC-SHA256 → короткоживущий JWT
- ⭐ **Оплата Telegram Stars** — invoice-ссылка → нативный `openInvoice` → подтверждение по вебхуку (идемпотентно)
- 📦 **Заказы** — история заказов для покупателя, админ-панель для товаров и статусов
- 🧩 **Общие типы** — единый набор zod-схем валидирует API и типизирует клиент
- 🎨 **Нативный UX** — компоненты Telegram UI, синхронизация темы, MainButton / BackButton
- ✅ **Качество** — TS strict, ESLint + Prettier, Vitest (юнит + интеграция с реальным Postgres), CI, Docker + Compose

### Архитектура

| Пакет             | Стек                                                                    | Назначение                                                    |
| ----------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------- |
| `packages/shared` | TypeScript, **zod 4**                                                   | Схемы и типы для API и клиента                                |
| `apps/api`        | **Hono 4**, **Drizzle 0.45**, PostgreSQL, **jose**                      | Проверка initData, JWT, каталог/корзина/заказы/админка, Stars |
| `apps/miniapp`    | **React 18.3**, **Vite 8**, `@telegram-apps/sdk-react` 3, Telegram UI 2 | Интерфейс витрины                                             |

> **Почему React 18?** `@telegram-apps/telegram-ui` требует React 18, поэтому витрина зафиксирована на React 18.3, а остальной стек использует свежие версии.

### Проверка `initData`

Сервер не доверяет клиенту. Mini App присылает сырую строку `initData`, а API проверяет её перед выдачей сессии:

1. Разобрать query-строку, извлечь `hash` (поле `signature` игнорируется).
2. Собрать **data-check-string**: остальные поля как `key=value`, отсортированные по ключу и соединённые через `\n`.
3. Получить секретный ключ: `HMAC_SHA256(ключ="WebAppData", сообщение=botToken)`.
4. Вычислить `HMAC_SHA256(ключ=secretKey, сообщение=dataCheckString)` и сравнить с `hash` за постоянное время.
5. Отклонить, если `auth_date` старше `INITDATA_MAX_AGE_SECONDS` (защита от повторов).

Валидатор — чистая функция без зависимостей в [`apps/api/src/auth/init-data.ts`](apps/api/src/auth/init-data.ts), покрытая детерминированными тестами (валидный, подменённый, чужой токен, просроченный, отсутствующие поля).

### Оплата Stars

1. Покупатель оформляет заказ → API создаёт заказ из серверной корзины.
2. API вызывает `createInvoiceLink` (валюта `XTR`) и возвращает ссылку.
3. Клиент открывает её через `openInvoice` из SDK.
4. Telegram дёргает вебхук: `pre_checkout_query` подтверждается после повторной проверки заказа, а `successful_payment` помечает заказ оплаченным и списывает остаток — **идемпотентно**.

### Быстрый старт

```bash
npm install
npm run build --workspace packages/shared
cp apps/api/.env.example apps/api/.env   # задать BOT_TOKEN, JWT_SECRET, DATABASE_URL
npm run db:migrate --workspace apps/api
npm run db:seed    --workspace apps/api
npm run dev:api        # http://localhost:3000
npm run dev:miniapp    # http://localhost:5173
```

Или через Docker Compose (Postgres + API + Mini App):

```bash
BOT_TOKEN=123:abc JWT_SECRET=$(openssl rand -hex 32) docker compose up --build
```

### Тесты и качество

```bash
npm run lint
npm run format
npm run typecheck
npm test
```

Интеграционный тест API выполняется против реального Postgres и проверяет весь путь авторизация → корзина → заказ → оплата; в CI поднимается сервис Postgres.

### Лицензия

[MIT](./LICENSE) © Ivan Tereshin
