import { DataTypeHint } from '@/constants/sql/dataType';

/**
 * SQLite has only 5 storage classes (INTEGER, REAL, TEXT, BLOB, NUMERIC), but
 * it accepts any declared type name and applies type affinity rules
 * (https://www.sqlite.org/datatype3.html#determination_of_column_affinity).
 * We list the 5 canonical classes plus the common aliases developers actually
 * write, so the autocomplete is usable and validation recognises real usage.
 *
 * Ordering note: where a type name is a prefix of another (e.g. DATE / DATETIME,
 * TIME / TIMESTAMP, INT / INTEGER), the more specific one is listed first so the
 * legacy first-match primitiveType resolver picks the right primitiveType.
 */
export const SQLiteTypes: DataTypeHint[] = [
  // Integer affinity
  { name: 'INTEGER', primitiveType: 'int' },
  { name: 'INT', primitiveType: 'int' },
  { name: 'TINYINT', primitiveType: 'int' },
  { name: 'SMALLINT', primitiveType: 'int' },
  { name: 'MEDIUMINT', primitiveType: 'int' },
  { name: 'BIGINT', primitiveType: 'long' },
  { name: 'UNSIGNED BIG INT', primitiveType: 'long' },
  { name: 'INT2', primitiveType: 'int' },
  { name: 'INT8', primitiveType: 'long' },
  // Text affinity
  { name: 'TEXT', primitiveType: 'string' },
  { name: 'CLOB', primitiveType: 'string' },
  { name: 'VARCHAR', primitiveType: 'string' },
  { name: 'NVARCHAR', primitiveType: 'string' },
  { name: 'VARYING CHARACTER', primitiveType: 'string' },
  { name: 'NATIVE CHARACTER', primitiveType: 'string' },
  { name: 'CHARACTER', primitiveType: 'string' },
  { name: 'NCHAR', primitiveType: 'string' },
  { name: 'CHAR', primitiveType: 'string' },
  // Real affinity
  { name: 'REAL', primitiveType: 'double' },
  { name: 'DOUBLE PRECISION', primitiveType: 'double' },
  { name: 'DOUBLE', primitiveType: 'double' },
  { name: 'FLOAT', primitiveType: 'float' },
  // Numeric affinity
  { name: 'NUMERIC', primitiveType: 'decimal' },
  { name: 'DECIMAL', primitiveType: 'decimal' },
  { name: 'BOOLEAN', primitiveType: 'boolean' },
  { name: 'DATETIME', primitiveType: 'dateTime' },
  { name: 'TIMESTAMP', primitiveType: 'dateTime' },
  { name: 'DATE', primitiveType: 'date' },
  { name: 'TIME', primitiveType: 'time' },
  // Blob affinity
  { name: 'BLOB', primitiveType: 'lob' },
];
