import { getPrisma } from "@/lib/db";
import type { User } from "@supabase/supabase-js";

export async function upsertAppUserFromAuth(user: User): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) return;

  const normalizedEmail = user.email?.trim().toLowerCase() || null;
  const displayNameRaw =
    (typeof user.user_metadata?.full_name === "string" &&
      user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    null;
  const avatarUrlRaw =
    (typeof user.user_metadata?.avatar_url === "string" &&
      user.user_metadata.avatar_url) ||
    (typeof user.user_metadata?.picture === "string" &&
      user.user_metadata.picture) ||
    null;
  const displayName = displayNameRaw?.trim() || null;
  const avatarUrl = avatarUrlRaw?.trim() || null;
  const now = new Date();

  await prisma.appUser.upsert({
    where: { supabaseUserId: user.id },
    update: {
      email: normalizedEmail,
      displayName,
      avatarUrl,
      lastSignInAt: now,
    },
    create: {
      supabaseUserId: user.id,
      email: normalizedEmail,
      displayName,
      avatarUrl,
      lastSignInAt: now,
    },
  });
}
