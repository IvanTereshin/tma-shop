import { eq } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { users } from '../db/schema.js';
import type { InitDataUser } from '../auth/init-data.js';

type UserRow = typeof users.$inferSelect;

/**
 * Inserts or updates a user from validated initData, keeping the profile fresh
 * on every login. The admin role is assigned from the configured allow-list and
 * is never downgraded by a normal login.
 */
export async function upsertUser(
  db: Database,
  tgUser: InitDataUser,
  adminIds: readonly number[],
): Promise<UserRow> {
  const isAdmin = adminIds.includes(tgUser.id);
  const profile = {
    firstName: tgUser.first_name,
    lastName: tgUser.last_name ?? null,
    username: tgUser.username ?? null,
    languageCode: tgUser.language_code ?? null,
    isPremium: tgUser.is_premium ?? false,
    photoUrl: tgUser.photo_url ?? null,
  };

  const [row] = await db
    .insert(users)
    .values({
      telegramId: tgUser.id,
      ...profile,
      role: isAdmin ? 'admin' : 'customer',
    })
    .onConflictDoUpdate({
      target: users.telegramId,
      set: {
        ...profile,
        // Promote to admin if newly allow-listed; never auto-demote here.
        ...(isAdmin ? { role: 'admin' as const } : {}),
      },
    })
    .returning();

  if (!row) throw new Error('Failed to upsert user');
  return row;
}

export async function getUser(db: Database, telegramId: number): Promise<UserRow | undefined> {
  return db.query.users.findFirst({ where: eq(users.telegramId, telegramId) });
}
