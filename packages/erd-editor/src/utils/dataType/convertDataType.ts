import { query, schemaV3Parser, toJson } from '@dineug/erd-editor-schema';

import {
  DatabaseHintMap,
  DataTypeHint,
  PrimitiveType,
} from '@/constants/sql/dataType';
import { DatabaseDefaultTypeMap } from '@/constants/sql/dataType/defaultDataType';
import { RootState } from '@/engine/state';

/**
 * Finds the hint that best identifies `dataType` for `database`: the hint whose
 * name is a prefix of the type AND is the longest such match. Preferring the
 * longest prefix avoids the classic mis-hit where e.g. 'timestamp' matches the
 * shorter 'time' hint (which would mislabel a dateTime as a time). Returns
 * undefined when nothing matches (custom/unknown type).
 */
function matchDataTypeHint(
  dataType: string,
  database: number
): DataTypeHint | undefined {
  const hints = DatabaseHintMap[database] ?? [];
  const lower = dataType.toLocaleLowerCase();
  let best: DataTypeHint | undefined;
  for (const hint of hints) {
    const name = hint.name.toLocaleLowerCase();
    if (lower.indexOf(name) === 0) {
      if (!best || name.length > best.name.length) {
        best = hint;
      }
    }
  }
  return best;
}

/**
 * Soft validation: is `dataType` a recognized type for `database`? Matches the
 * base type against the engine catalog at a word boundary, so parameterized and
 * modified forms count as valid (e.g. 'VARCHAR(255)', 'NUMERIC(10,2)',
 * 'INT UNSIGNED'), while typos ('DATETIM', 'FOOBAR') do not. Empty is treated as
 * valid (not-yet-filled, not an error).
 */
export function isKnownDataType(dataType: string, database: number): boolean {
  const lower = (dataType ?? '').trim().toLocaleLowerCase();
  if (lower === '') return true;
  const hints = DatabaseHintMap[database] ?? [];
  return hints.some(hint => {
    const name = hint.name.toLocaleLowerCase();
    if (!lower.startsWith(name)) return false;
    const next = lower.charAt(name.length);
    // Valid only if the hint name ends at a boundary (end of string or a
    // non-identifier char like '(' or ' '), so 'int' does not validate 'integer'.
    return next === '' || !/[a-z0-9_]/.test(next);
  });
}

export type DataTypeConversion = {
  from: string;
  to: string;
  primitiveType: PrimitiveType | null;
  /** to !== from */
  changed: boolean;
  /** source type not recognized in the source engine -> left as-is for review */
  unmapped: boolean;
};

/**
 * Converts a single column data type string from `sourceDb` to `targetDb` using
 * the primitiveType catalog. Unknown types are left untouched and flagged.
 * Lossy by design (length/precision are dropped).
 */
export function convertDataType(
  dataType: string,
  sourceDb: number,
  targetDb: number
): DataTypeConversion {
  const trimmed = (dataType ?? '').trim();

  if (sourceDb === targetDb || trimmed === '') {
    return {
      from: dataType,
      to: dataType,
      primitiveType: null,
      changed: false,
      unmapped: false,
    };
  }

  const hint = matchDataTypeHint(trimmed, sourceDb);
  if (!hint) {
    return {
      from: dataType,
      to: dataType,
      primitiveType: null,
      changed: false,
      unmapped: true,
    };
  }

  const targetMap = DatabaseDefaultTypeMap[targetDb];
  const to = targetMap ? targetMap[hint.primitiveType] : dataType;

  return {
    from: dataType,
    to,
    primitiveType: hint.primitiveType,
    changed: to !== dataType,
    unmapped: false,
  };
}

export type ColumnConversionPreview = {
  tableId: string;
  tableName: string;
  columnId: string;
  columnName: string;
  from: string;
  to: string;
  changed: boolean;
  unmapped: boolean;
};

/**
 * Computes, without mutating anything, how every column's data type would
 * change if the diagram engine switched to `targetDb`. Drives the confirmation
 * preview and the actual conversion action.
 */
export function previewColumnTypeConversion(
  state: RootState,
  targetDb: number
): ColumnConversionPreview[] {
  const sourceDb = state.settings.database;
  const { collections } = state;
  const columnCollection = query(collections).collection('tableColumnEntities');

  const previews: ColumnConversionPreview[] = [];
  for (const table of query(collections)
    .collection('tableEntities')
    .selectAll()) {
    for (const column of columnCollection.selectByIds(table.columnIds)) {
      if (!column) continue;
      const conv = convertDataType(column.dataType, sourceDb, targetDb);
      previews.push({
        tableId: table.id,
        tableName: table.name,
        columnId: column.id,
        columnName: column.name,
        from: conv.from,
        to: conv.to,
        changed: conv.changed,
        unmapped: conv.unmapped,
      });
    }
  }
  return previews;
}

export type SchemaConversionReport = {
  total: number;
  changed: number;
  unmapped: number;
};

/**
 * Value-level conversion: takes a diagram JSON string, rewrites every column's
 * data type to the target engine, sets settings.database, and returns the new
 * JSON string plus a summary. Used to duplicate a schema into another engine
 * without mutating the current editor state. Table positions and all other UI
 * are preserved.
 */
export function convertSchemaValueToDatabase(
  value: string,
  targetDb: number
): { value: string; report: SchemaConversionReport } {
  const json = value && value.trim() ? JSON.parse(value) : {};
  const schema = schemaV3Parser(json);
  const sourceDb = schema.settings.database;

  const report: SchemaConversionReport = { total: 0, changed: 0, unmapped: 0 };
  const columnCollection = query(schema.collections).collection(
    'tableColumnEntities'
  );

  for (const column of columnCollection.selectAll()) {
    report.total++;
    const conv = convertDataType(column.dataType, sourceDb, targetDb);
    if (conv.unmapped) report.unmapped++;
    if (conv.changed) {
      report.changed++;
      columnCollection.updateOne(column.id, entity => {
        entity.dataType = conv.to;
      });
    }
  }

  schema.settings.database = targetDb;
  return { value: toJson(schema), report };
}
