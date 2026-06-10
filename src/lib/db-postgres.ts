import { Pool } from "pg";

let pool: Pool | null = null;

function isPlaceholderUrl(url: string): boolean {
  return (
    url.includes("[YOUR-PASSWORD]") ||
    url.includes("YOUR_PASSWORD") ||
    url.includes("user:password@")
  );
}

export function isPostgresConfigured(): boolean {
  const url = process.env.POSTGRES_URL?.trim() ?? "";
  return url.length > 0 && !isPlaceholderUrl(url);
}

export function getPostgresPool(): Pool | null {
  if (!isPostgresConfigured()) return null;

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    pool.on("error", (err) => {
      console.error("Postgres pool error:", err);
    });
  }

  return pool;
}
