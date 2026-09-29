/**
 * Target database engines Datier can model for. The numeric values mirror the
 * bitmask used by erd-editor's `settings.database`
 * (packages/erd-editor-schema/src/v3/schema/settings.ts).
 *
 * We persist the vendor NAME on `schemas.database` (human readable / queryable)
 * and translate to the bitmask when generating the diagram JSON `value`.
 */
export const DatabaseVendorToBitmask = {
  MariaDB: 1,
  MSSQL: 2,
  MySQL: 4,
  Oracle: 8,
  PostgreSQL: 16,
  SQLite: 32,
} as const;

export type DatabaseVendor = keyof typeof DatabaseVendorToBitmask;

export const BitmaskToDatabaseVendor: Record<number, DatabaseVendor> = {
  1: 'MariaDB',
  2: 'MSSQL',
  4: 'MySQL',
  8: 'Oracle',
  16: 'PostgreSQL',
  32: 'SQLite',
};

export const DatabaseVendorList: DatabaseVendor[] = Object.keys(
  DatabaseVendorToBitmask
) as DatabaseVendor[];

export function isDatabaseVendor(value: unknown): value is DatabaseVendor {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(DatabaseVendorToBitmask, value)
  );
}
