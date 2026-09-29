import { DatabaseVendor } from '@/utils/api';

export type DatabaseVendorMeta = {
  /** Full, human-facing engine name. */
  label: string;
  /** 2-letter monogram shown inside the identity badge. */
  monogram: string;
  /** Brand-ish accent color for the badge background. */
  color: string;
};

/**
 * Visual identity for each supported database engine. A schema's engine is
 * fixed at creation, so it is a stable, recognizable attribute worth surfacing:
 * the badge lets you tell a Postgres schema from a SQLite one at a glance in the
 * sidebar. Colors are chosen to be distinct hues; the monogram + tooltip carry
 * the identity so the meaning never rests on color alone.
 */
export const DATABASE_VENDOR_META: Record<DatabaseVendor, DatabaseVendorMeta> =
  {
    PostgreSQL: { label: 'PostgreSQL', monogram: 'PG', color: '#336791' },
    MySQL: { label: 'MySQL', monogram: 'MY', color: '#E48E00' },
    MariaDB: { label: 'MariaDB', monogram: 'MA', color: '#955A3E' },
    MSSQL: { label: 'SQL Server', monogram: 'MS', color: '#7A1F2B' },
    Oracle: { label: 'Oracle', monogram: 'OR', color: '#E4342B' },
    SQLite: { label: 'SQLite', monogram: 'SL', color: '#2AA0D6' },
  };

/** Meta for schemas created before the engine field existed (database === null). */
export const UNKNOWN_VENDOR_META: DatabaseVendorMeta = {
  label: 'Motor no definido',
  monogram: 'DB',
  color: '#6B7280',
};

export const getVendorMeta = (
  vendor: DatabaseVendor | null | undefined
): DatabaseVendorMeta =>
  vendor ? DATABASE_VENDOR_META[vendor] : UNKNOWN_VENDOR_META;
