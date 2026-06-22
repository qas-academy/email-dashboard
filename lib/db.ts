import { Pool, QueryResult, QueryResultRow } from "pg";

const databaseUrl = process.env.DATABASE_URL;
const databaseSsl = process.env.DATABASE_SSL?.toLowerCase();

if (!databaseUrl) {
  throw new Error(
    'Missing DATABASE_URL environment variable. Please configure it in your Vercel project settings.'
  );
}

const poolConfig = {
  connectionString: databaseUrl,
  ssl:
    databaseSsl === "false" || databaseSsl === "disable"
      ? false
      : { rejectUnauthorized: false },
  max: 20, // Increased from 10 for better concurrency
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  statement_timeout: 30000, // 30 second query timeout
};

type QueryParam = string | number | boolean | null | undefined | string[] | number[];

declare global {
  var postgres: Pool | undefined;
}

function getPool(): Pool {
  if (!globalThis.postgres) {
    globalThis.postgres = new Pool(poolConfig);
    globalThis.postgres.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  return globalThis.postgres;
}

export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: QueryParam[] = []
): Promise<QueryResult<T>> => {
  const pool = getPool();
  return pool.query(text, params);
};
