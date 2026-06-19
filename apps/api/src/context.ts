import type { Env } from './config/env.js';
import type { Database } from './db/client.js';
import type { SessionClaims } from './auth/jwt.js';

/** Dependencies shared across the whole API, injected at app construction. */
export interface AppDeps {
  env: Env;
  db: Database;
}

/** Hono context variables available to handlers and middleware. */
export interface AppVariables {
  env: Env;
  db: Database;
  /** Id of the active shop, resolved per request from env or the database. */
  shopId: string;
  /** Present only on routes behind the auth middleware. */
  claims: SessionClaims;
}

export interface AppBindings {
  Variables: AppVariables;
}
