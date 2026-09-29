import { Database } from '@/constants/schema';
import { PrimitiveTypeMap } from '@/constants/sql/dataType';

/**
 * Canonical target data type for each primitiveType, per database engine.
 *
 * Used when converting a schema from one engine to another: the source column's
 * primitiveType is resolved (see getPrimitiveType) and then mapped here to a
 * concrete type valid for the target engine. Every value is a real type from
 * that engine's hint catalog (constants/sql/dataType/*.ts) — except where an
 * engine lacks a native type (e.g. SQLite has no boolean/date/time), in which
 * case we fall back to the engine's affinity rules.
 *
 * The mapping is deliberately conservative and LOSSY (length/precision are
 * dropped, e.g. VARCHAR(255) -> VARCHAR); the conversion flow surfaces a preview
 * so the user can review before applying.
 */
export const DatabaseDefaultTypeMap: Record<number, PrimitiveTypeMap> = {
  [Database.MariaDB]: {
    int: 'INT',
    long: 'BIGINT',
    float: 'FLOAT',
    double: 'DOUBLE',
    decimal: 'DECIMAL',
    boolean: 'BOOLEAN',
    string: 'VARCHAR',
    lob: 'LONGTEXT',
    date: 'DATE',
    dateTime: 'DATETIME',
    time: 'TIME',
  },
  [Database.MySQL]: {
    int: 'INT',
    long: 'BIGINT',
    float: 'FLOAT',
    double: 'DOUBLE',
    decimal: 'DECIMAL',
    boolean: 'BOOLEAN',
    string: 'VARCHAR',
    lob: 'LONGTEXT',
    date: 'DATE',
    dateTime: 'DATETIME',
    time: 'TIME',
  },
  [Database.MSSQL]: {
    int: 'int',
    long: 'bigint',
    float: 'real',
    double: 'float',
    decimal: 'decimal',
    boolean: 'bit',
    string: 'varchar',
    lob: 'text',
    date: 'date',
    dateTime: 'datetime2',
    time: 'time',
  },
  [Database.Oracle]: {
    // Oracle models all numbers with NUMBER and has no native BOOLEAN/TIME.
    int: 'NUMBER',
    long: 'NUMBER',
    float: 'BINARY_FLOAT',
    double: 'BINARY_DOUBLE',
    decimal: 'NUMBER',
    boolean: 'NUMBER',
    string: 'VARCHAR2',
    lob: 'CLOB',
    date: 'DATE',
    dateTime: 'TIMESTAMP',
    time: 'TIMESTAMP',
  },
  [Database.PostgreSQL]: {
    int: 'integer',
    long: 'bigint',
    float: 'real',
    double: 'double precision',
    decimal: 'numeric',
    boolean: 'boolean',
    string: 'varchar',
    lob: 'text',
    date: 'date',
    dateTime: 'timestamp',
    time: 'time',
  },
  [Database.SQLite]: {
    // SQLite has only 5 storage classes; map every primitive onto its affinity.
    int: 'INTEGER',
    long: 'INTEGER',
    float: 'REAL',
    double: 'REAL',
    decimal: 'NUMERIC',
    boolean: 'INTEGER',
    string: 'TEXT',
    lob: 'BLOB',
    date: 'TEXT',
    dateTime: 'TEXT',
    time: 'TEXT',
  },
};
