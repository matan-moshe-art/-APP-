import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function hasUsableDatabaseUrl(url: string | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.includes("[YOUR-PASSWORD]")) return false;
  return true;
}

/**
 * Returns a Prisma client when DATABASE_URL is set; otherwise null (no persistence).
 */
export function getPrisma(): PrismaClient | null {
  if (!hasUsableDatabaseUrl(process.env.DATABASE_URL)) {
    return null;
  }
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["error", "warn"]
          : ["error"],
    });
  }
  return globalForPrisma.prisma;
}
