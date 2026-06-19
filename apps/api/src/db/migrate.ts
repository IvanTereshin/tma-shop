import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDb, createPool } from './client.js';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://tma:tma@localhost:5432/tma_shop';

async function main(): Promise<void> {
  const pool = createPool(DATABASE_URL);
  const db = createDb(pool);
  console.log('Running migrations…');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations complete.');
  await pool.end();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
