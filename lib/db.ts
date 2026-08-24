import 'server-only';
import postgres from 'postgres';

// Single pooled connection to Supabase (transaction-mode pooler, port 6543).
// prepare:false is required for pgbouncer transaction pooling. This uses the
// database owner credentials server-side ONLY and bypasses RLS by design — the
// last-4 gate scopes every query to one client_id, so the app never leaks across
// clients even though the connection is privileged. RLS remains the second wall
// against any anon/public access path.
const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

export const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL!, {
    prepare: false,
    idle_timeout: 20,
    max: 5,
    ssl: 'require',
  });

if (process.env.NODE_ENV !== 'production') globalForDb.sql = sql;
