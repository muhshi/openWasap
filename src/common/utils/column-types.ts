/**
 * Cross-database column type helpers.
 *
 * SQLite lacks native JSON and timestamp types, so we use `simple-json`
 * (JSON.stringify stored as TEXT) and `text` with DateTransformer.
 *
 * PostgreSQL has native `jsonb` and `timestamptz` types with better
 * indexing and query performance.
 */

const isPostgres = (): boolean => process.env.DATABASE_TYPE === 'postgres';

/**
 * Returns 'jsonb' for PostgreSQL, 'simple-json' for SQLite/MySQL.
 */
export const jsonColumnType = (): 'jsonb' | 'simple-json' => (isPostgres() ? 'jsonb' : 'simple-json');

/**
 * Returns 'timestamptz' for PostgreSQL, 'text' for SQLite/MySQL.
 * Use with DateTransformer for SQLite/MySQL compatibility.
 */
export const dateColumnType = (): 'timestamptz' | 'text' => (isPostgres() ? 'timestamptz' : 'text');

/**
 * Returns 'jsonb' for PostgreSQL, 'simple-array' for SQLite/MySQL.
 * Use for string[] columns that need to be queryable.
 */
export const arrayColumnType = (): 'jsonb' | 'simple-array' => (isPostgres() ? 'jsonb' : 'simple-array');
