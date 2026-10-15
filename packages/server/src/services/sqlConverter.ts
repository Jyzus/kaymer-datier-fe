import {
  ERDEditorSchemaV3,
  query,
  SchemaV3Constants,
  schemaV3Parser,
  toJson,
} from '@dineug/erd-editor-schema';
import {
  schemaSQLParser,
  SortType,
  StatementType,
} from '@dineug/schema-sql-parser';
import crypto from 'crypto';

const {
  Database,
  ColumnOption,
  ColumnUIKey,
  RelationshipType,
  OrderType,
  CANVAS_SIZE_MAX,
  CANVAS_SIZE_MIN,
} = SchemaV3Constants;

const COLUMN_MIN_WIDTH = 60;

export const DialectMap: Record<string, number> = {
  postgresql: Database.PostgreSQL,
  postgres: Database.PostgreSQL,
  mysql: Database.MySQL,
  sqlite: Database.SQLite,
  mariadb: Database.MariaDB,
  mssql: Database.MSSQL,
  oracle: Database.Oracle,
};

export const DatabaseToDialect: Record<number, string> = {
  [Database.PostgreSQL]: 'postgresql',
  [Database.MySQL]: 'mysql',
  [Database.SQLite]: 'sqlite',
  [Database.MariaDB]: 'mariadb',
  [Database.MSSQL]: 'mssql',
  [Database.Oracle]: 'oracle',
};

export interface ParsedColumn {
  name: string;
  dataType: string;
  default: string;
  comment: string;
  primaryKey: boolean;
  autoIncrement: boolean;
  unique: boolean;
  nullable: boolean;
}

export interface ParsedIndexCol {
  name: string;
  sort: string;
}

export interface ParsedIndex {
  name: string;
  unique: boolean;
  tableName?: string;
  columns: ParsedIndexCol[];
}

export interface ParsedForeignKey {
  columnNames: string[];
  refTableName: string;
  refColumnNames: string[];
}

export interface ParsedTable {
  name: string;
  comment: string;
  columns: ParsedColumn[];
  indexes: ParsedIndex[];
  foreignKeys: ParsedForeignKey[];
}

function estimateTextWidth(text: string): number {
  if (!text) return COLUMN_MIN_WIDTH;
  return Math.max(COLUMN_MIN_WIDTH, Math.round(text.length * 8.5) + 16);
}

function clampCanvasSize(size: number): number {
  return Math.max(CANVAS_SIZE_MIN, Math.min(CANVAS_SIZE_MAX, size));
}

function bHas(value: number, bit: number): boolean {
  return (value & bit) === bit;
}

interface TableUIState {
  x: number;
  y: number;
  zIndex: number;
  color?: string;
}

interface StatementMap {
  tables: ParsedTable[];
  indexes: any[];
  primaryKeys: any[];
  foreignKeys: any[];
  uniques: any[];
}

function getStatementMap(statements: any[]): StatementMap {
  const map: StatementMap = {
    tables: [],
    indexes: [],
    primaryKeys: [],
    foreignKeys: [],
    uniques: [],
  };

  for (const statement of statements) {
    switch (statement.type) {
      case StatementType.createTable:
        if (statement.name) {
          map.tables.push({
            name: statement.name,
            comment: statement.comment || '',
            columns: statement.columns || [],
            indexes: statement.indexes || [],
            foreignKeys: statement.foreignKeys || [],
          });
        }
        break;
      case StatementType.createIndex:
        if (
          statement.tableName &&
          statement.columns &&
          statement.columns.length
        ) {
          map.indexes.push(statement);
        }
        break;
      case StatementType.alterTableAddPrimaryKey:
        if (
          statement.name &&
          statement.columnNames &&
          statement.columnNames.length
        ) {
          map.primaryKeys.push(statement);
        }
        break;
      case StatementType.alterTableAddForeignKey:
        if (
          statement.name &&
          statement.columnNames &&
          statement.columnNames.length &&
          statement.refTableName &&
          statement.refColumnNames &&
          statement.columnNames.length === statement.refColumnNames.length
        ) {
          map.foreignKeys.push(statement);
        }
        break;
      case StatementType.alterTableAddUnique:
        if (
          statement.name &&
          statement.columnNames &&
          statement.columnNames.length
        ) {
          map.uniques.push(statement);
        }
        break;
    }
  }

  return map;
}

function mergeTables({
  tables,
  indexes,
  primaryKeys,
  foreignKeys,
  uniques,
}: StatementMap): ParsedTable[] {
  const findByName = <T extends { name: string }>(
    list: T[],
    name: string
  ): T | undefined =>
    list.find(item => item.name.toLowerCase() === name.toLowerCase());

  indexes.forEach((index: any) => {
    const table = findByName(tables, index.tableName);
    if (!table) return;

    table.indexes.push({
      name: index.name,
      unique: Boolean(index.unique),
      columns: index.columns,
    });
  });

  primaryKeys.forEach((primaryKey: any) => {
    const table = findByName(tables, primaryKey.name);
    if (!table) return;

    primaryKey.columnNames.forEach((columnName: string) => {
      const column = findByName(table.columns, columnName);
      if (column) {
        column.primaryKey = true;
      }
    });
  });

  uniques.forEach((unique: any) => {
    const table = findByName(tables, unique.name);
    if (!table) return;

    unique.columnNames.forEach((columnName: string) => {
      const column = findByName(table.columns, columnName);
      if (column) {
        column.unique = true;
      }
    });
  });

  foreignKeys.forEach((foreignKey: any) => {
    const table = findByName(tables, foreignKey.name);
    if (!table) return;

    const isDuplicate = table.foreignKeys.some(
      (fk: any) =>
        fk.refTableName.toLowerCase() ===
          foreignKey.refTableName.toLowerCase() &&
        fk.columnNames.length === foreignKey.columnNames.length &&
        fk.columnNames.every(
          (cn: string, i: number) =>
            cn.toLowerCase() === foreignKey.columnNames[i].toLowerCase()
        ) &&
        fk.refColumnNames.length === foreignKey.refColumnNames.length &&
        fk.refColumnNames.every(
          (rcn: string, i: number) =>
            rcn.toLowerCase() === foreignKey.refColumnNames[i].toLowerCase()
        )
    );

    if (!isDuplicate) {
      table.foreignKeys.push({
        columnNames: foreignKey.columnNames,
        refTableName: foreignKey.refTableName,
        refColumnNames: foreignKey.refColumnNames,
      });
    }
  });

  return tables;
}

export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inDollarQuote = false;
  let dollarTag = '';

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const nextCh = sql[i + 1] || '';

    // Handle string literals
    if (ch === "'" && !inDoubleQuote && !inDollarQuote) {
      if (inSingleQuote && nextCh === "'") {
        current += "''";
        i++;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      current += ch;
      continue;
    }

    if (ch === '"' && !inSingleQuote && !inDollarQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += ch;
      continue;
    }

    // Postgres dollar quotes e.g. $$ or $tag$
    if (ch === '$' && !inSingleQuote && !inDoubleQuote) {
      if (!inDollarQuote) {
        const match = sql.substring(i).match(/^\$([a-zA-Z0-9_]*)\$/);
        if (match) {
          dollarTag = match[0];
          inDollarQuote = true;
          current += dollarTag;
          i += dollarTag.length - 1;
          continue;
        }
      } else {
        if (sql.substring(i, i + dollarTag.length) === dollarTag) {
          inDollarQuote = false;
          current += dollarTag;
          i += dollarTag.length - 1;
          continue;
        }
      }
    }

    if (ch === ';' && !inSingleQuote && !inDoubleQuote && !inDollarQuote) {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = '';
      continue;
    }

    current += ch;
  }

  const remaining = current.trim();
  if (remaining.length > 0) {
    statements.push(remaining);
  }

  return statements;
}

export function getCreateTableName(statement: string): string | null {
  const match = statement.match(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_"`\.-]+)/i
  );
  if (!match) return null;
  return match[1]
    .replace(/["'`\[\]]/g, '')
    .trim()
    .toLowerCase();
}

export function getForeignKeySignature(statement: string): string | null {
  const match = statement.match(
    /ALTER\s+TABLE\s+(?:ONLY\s+)?([a-zA-Z0-9_"`\.-]+)[\s\S]*?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([a-zA-Z0-9_"`\.-]+)\s*\(([^)]+)\)/i
  );
  if (!match) return null;
  const table = match[1]
    .replace(/["'`\[\]]/g, '')
    .trim()
    .toLowerCase();
  const cols = match[2].replace(/["'`\[\]\s]/g, '').toLowerCase();
  const refTable = match[3]
    .replace(/["'`\[\]]/g, '')
    .trim()
    .toLowerCase();
  const refCols = match[4].replace(/["'`\[\]\s]/g, '').toLowerCase();
  return `${table}(${cols})->${refTable}(${refCols})`;
}

export function mergeDDL(currentSql: string, newSql: string): string {
  const currentStatements = splitSqlStatements(currentSql);
  const newStatements = splitSqlStatements(newSql);

  const mergedStatements = [...currentStatements];

  for (const newStmt of newStatements) {
    const newTableName = getCreateTableName(newStmt);
    const newFkSig = getForeignKeySignature(newStmt);

    if (newTableName) {
      const existingIdx = mergedStatements.findIndex(stmt => {
        const name = getCreateTableName(stmt);
        return name === newTableName;
      });

      if (existingIdx !== -1) {
        mergedStatements[existingIdx] = newStmt;
      } else {
        mergedStatements.push(newStmt);
      }
    } else if (newFkSig) {
      const existingIdx = mergedStatements.findIndex(stmt => {
        const sig = getForeignKeySignature(stmt);
        return sig === newFkSig;
      });

      if (existingIdx !== -1) {
        mergedStatements[existingIdx] = newStmt;
      } else {
        mergedStatements.push(newStmt);
      }
    } else {
      const cleanNew = newStmt.trim().toLowerCase();
      const existingIdx = mergedStatements.findIndex(
        stmt => stmt.trim().toLowerCase() === cleanNew
      );
      if (existingIdx !== -1) {
        mergedStatements[existingIdx] = newStmt;
      } else {
        mergedStatements.push(newStmt);
      }
    }
  }

  return mergedStatements.join(';\n\n') + ';';
}

/**
 * Simplifies and deduplicates DDL SQL text, removing redundant table definitions,
 * duplicate foreign key constraints, and phantom columns.
 */
export function simplifyDDL(sql: string): string {
  if (!sql || sql.trim() === '') return '';

  const statements = splitSqlStatements(sql);
  const tableMap = new Map<string, string>();
  const fkMap = new Map<string, string>();
  const indexMap = new Map<string, string>();
  const otherStatements: string[] = [];

  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (!trimmed) continue;

    const tableName = getCreateTableName(trimmed);
    const fkSig = getForeignKeySignature(trimmed);

    if (tableName) {
      // Clean phantom ON columns if present
      let cleanStmt = trimmed.replace(
        /,\s*ON\s+(?:VARCHAR|SET|TEXT)[^,\)]*/gi,
        ''
      );
      cleanStmt = cleanStmt.replace(
        /\bON\s+(?:VARCHAR|SET|TEXT)[^,\)]*,\s*/gi,
        ''
      );
      tableMap.set(tableName, cleanStmt);
    } else if (fkSig) {
      fkMap.set(fkSig, trimmed);
    } else if (/CREATE\s+(?:UNIQUE\s+)?INDEX/i.test(trimmed)) {
      const cleanIdx = trimmed.replace(
        /CREATE\s+(UNIQUE\s+)?INDEX\s+IF\s+ON/i,
        'CREATE $1INDEX idx_auto ON'
      );
      const idxMatch = cleanIdx.match(
        /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_"`\.-]+)\s+ON\s+([a-zA-Z0-9_"`\.-]+)/i
      );
      if (idxMatch) {
        const idxKey = `${idxMatch[2].toLowerCase()}::${idxMatch[1].toLowerCase()}`;
        indexMap.set(idxKey, cleanIdx);
      } else {
        indexMap.set(cleanIdx.toLowerCase(), cleanIdx);
      }
    } else {
      otherStatements.push(trimmed);
    }
  }

  const result: string[] = [
    ...Array.from(tableMap.values()),
    ...Array.from(fkMap.values()),
    ...Array.from(indexMap.values()),
    ...otherStatements,
  ];

  return result.join(';\n\n') + ';';
}

/**
 * Sanitizes schema JSON: eliminates phantom ON columns and duplicate relationship entities.
 */
export function sanitizeSchemaJson(input: string | any): string {
  if (!input) return '{}';
  let data: any;
  if (typeof input === 'string') {
    if (input.trim() === '' || input === '{}') return input;
    try {
      data = JSON.parse(input);
    } catch {
      return input;
    }
  } else {
    data = input;
  }

  if (!data || !data.collections) {
    return typeof input === 'string' ? input : JSON.stringify(data);
  }

  const tables = data.collections.tableEntities || {};
  const cols = data.collections.tableColumnEntities || {};
  const rels = data.collections.relationshipEntities || {};
  const doc = data.doc || { relationshipIds: [], tableIds: [] };

  // 1. Remove phantom ON columns
  const onColIds = new Set<string>();
  for (const [cid, col] of Object.entries<any>(cols)) {
    if (col && col.name === 'ON') {
      onColIds.add(cid);
      delete cols[cid];
    }
  }
  for (const table of Object.values<any>(tables)) {
    if (table) {
      table.columnIds = (table.columnIds || []).filter(
        (cid: string) => !onColIds.has(cid)
      );
      table.seqColumnIds = (table.seqColumnIds || []).filter(
        (cid: string) => !onColIds.has(cid)
      );
    }
  }

  // 2. Deduplicate relationships
  const seenRels = new Set<string>();
  const validRelIds: string[] = [];
  const allRelIds = [...(doc.relationshipIds || [])];

  for (const rid of allRelIds) {
    const rel = rels[rid];
    if (!rel || !rel.start || !rel.end) {
      delete rels[rid];
      continue;
    }
    const sTid = rel.start.tableId;
    const eTid = rel.end.tableId;
    if (!tables[sTid] || !tables[eTid]) {
      delete rels[rid];
      continue;
    }
    const sCids = (rel.start.columnIds || []).join(',');
    const eCids = (rel.end.columnIds || []).join(',');
    const sig = `${sTid}(${sCids})->${eTid}(${eCids})`;
    if (seenRels.has(sig)) {
      delete rels[rid];
    } else {
      seenRels.add(sig);
      validRelIds.push(rid);
    }
  }
  doc.relationshipIds = validRelIds;

  // 3. Fix invalid index names like 'IF'
  const indexEntities = data.collections.indexEntities || {};
  const indexColEntities = data.collections.indexColumnEntities || {};
  for (const idx of Object.values<any>(indexEntities)) {
    if (idx && (idx.name === 'IF' || idx.name === 'if')) {
      const table = tables[idx.tableId];
      const tableName = table ? table.name : 'table';
      const indexColId = (idx.indexColumnIds || [])[0];
      const indexCol = indexColId ? indexColEntities[indexColId] : null;
      const colId = indexCol ? indexCol.columnId : null;
      const colName = colId && cols[colId] ? cols[colId].name : 'col';
      idx.name = `idx_${tableName}_${colName}`;
    }
  }

  return JSON.stringify(data);
}

export function normalizePostgreSqlDdl(sql: string): string {
  // Strip comments
  let clean = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove standalone non-table/non-alter statements: CREATE EXTENSION, CREATE TYPE, SET, etc.
  clean = clean.replace(/CREATE\s+EXTENSION[\s\S]*?;/gi, '');
  clean = clean.replace(/CREATE\s+TYPE[\s\S]*?;/gi, '');
  clean = clean.replace(/SET\s+[\s\S]*?;/gi, '');

  // Strip table-level and column-level CHECK constraints with balanced parentheses
  let i = 0;
  let result = '';
  while (i < clean.length) {
    const constraintCheckMatch = clean
      .substring(i)
      .match(/^[,\s]*CONSTRAINT\s+["'`\w]+\s+CHECK\s*\(/i);
    const inlineCheckMatch = clean.substring(i).match(/^[,\s]*CHECK\s*\(/i);

    const match = constraintCheckMatch || inlineCheckMatch;
    if (match) {
      const matchLen = match[0].length;
      let depth = 1;
      let j = i + matchLen;
      while (j < clean.length && depth > 0) {
        if (clean[j] === '(') depth++;
        else if (clean[j] === ')') depth--;
        j++;
      }
      i = j;
      continue;
    }
    result += clean[i];
    i++;
  }

  // Clean any trailing commas before closing parenthesis: , \s* ) -> \n)
  result = result.replace(/,\s*\)/g, '\n)');
  return result;
}

export interface ConvertSqlOptions {
  existingSchemaJson?: string;
  dialect?: string;
  merge?: boolean;
}

/**
 * Converts SQL DDL to ERD Editor Schema v3 JSON.
 * Preserves table positions, colors, and layout from existingSchemaJson if provided.
 */
export function sqlToSchemaJson(
  sql: string,
  options?: ConvertSqlOptions
): string {
  const targetDialect = options?.dialect?.toLowerCase() || 'postgresql';
  const targetDb = DialectMap[targetDialect] || Database.PostgreSQL;

  const tableUIMap = new Map<string, TableUIState>();
  let baseSchemaSettings: any = null;
  const simplified = simplifyDDL(sql);
  const cleanedInputSql =
    targetDialect === 'postgresql' || targetDialect === 'postgres'
      ? normalizePostgreSqlDdl(simplified)
      : simplified;
  let effectiveSql = cleanedInputSql;

  if (options?.existingSchemaJson && options.existingSchemaJson.trim() !== '') {
    try {
      const existingSchema = schemaV3Parser(
        JSON.parse(options.existingSchemaJson)
      );
      baseSchemaSettings = existingSchema.settings;

      const existingTables = query(existingSchema.collections)
        .collection('tableEntities')
        .selectAll();

      existingTables.forEach((t: any) => {
        if (t.name) {
          tableUIMap.set(t.name.toLowerCase(), {
            x: t.ui?.x ?? 200,
            y: t.ui?.y ?? 100,
            zIndex: t.ui?.zIndex ?? 2,
            color: t.ui?.color || '',
          });
        }
      });

      if (options?.merge) {
        const currentSql = schemaJsonToSql(
          options.existingSchemaJson,
          targetDialect
        );
        if (currentSql.trim() !== '') {
          effectiveSql = mergeDDL(currentSql, cleanedInputSql);
        }
      }
    } catch (err) {
      console.warn(
        'Failed to parse existing schema JSON for position preservation:',
        err
      );
    }
  }

  const schema = schemaV3Parser({});
  schema.settings.database = targetDb;
  if (baseSchemaSettings) {
    schema.settings.bracketType =
      baseSchemaSettings.bracketType ?? schema.settings.bracketType;
  }

  const statements = schemaSQLParser(effectiveSql);
  const statementMap = getStatementMap(statements);
  const tables = mergeTables(statementMap);

  const canvasSize = clampCanvasSize(Math.max(3000, tables.length * 400));
  schema.settings.width = canvasSize;
  schema.settings.height = canvasSize;

  let newTableIndex = 0;
  const colsPerRow = 3;
  const colSpacing = 360;
  const rowSpacing = 280;
  const originX = 100;
  const originY = 100;

  // Convert tables
  tables.forEach(table => {
    const lowerName = table.name.toLowerCase();
    const existingUI = tableUIMap.get(lowerName);

    let x = originX + (newTableIndex % colsPerRow) * colSpacing;
    let y = originY + Math.floor(newTableIndex / colsPerRow) * rowSpacing;
    let zIndex = 2;
    let color = '';

    if (existingUI) {
      x = existingUI.x;
      y = existingUI.y;
      zIndex = existingUI.zIndex;
      color = existingUI.color || '';
    } else {
      newTableIndex++;
    }

    const tableId = crypto.randomUUID();
    const newTable = {
      id: tableId,
      name: table.name,
      comment: table.comment || '',
      columnIds: [] as string[],
      seqColumnIds: [] as string[],
      ui: {
        x,
        y,
        zIndex,
        widthName: estimateTextWidth(table.name),
        widthComment: estimateTextWidth(table.comment || ''),
        color,
      },
      meta: {
        updateAt: Date.now(),
        createAt: Date.now(),
      },
    };

    table.columns.forEach((column: ParsedColumn) => {
      let options = 0;
      if (column.autoIncrement) options |= ColumnOption.autoIncrement;
      if (column.primaryKey) options |= ColumnOption.primaryKey;
      if (column.unique) options |= ColumnOption.unique;
      if (!column.nullable) options |= ColumnOption.notNull;

      const columnId = crypto.randomUUID();
      const newColumn = {
        id: columnId,
        tableId,
        name: column.name,
        comment: column.comment || '',
        dataType: column.dataType || 'VARCHAR',
        default: column.default || '',
        options,
        ui: {
          keys: column.primaryKey ? ColumnUIKey.primaryKey : 0,
          widthName: estimateTextWidth(column.name),
          widthComment: estimateTextWidth(column.comment || ''),
          widthDataType: estimateTextWidth(column.dataType || ''),
          widthDefault: estimateTextWidth(column.default || ''),
        },
        meta: {
          updateAt: Date.now(),
          createAt: Date.now(),
        },
      };

      newTable.columnIds.push(columnId);
      newTable.seqColumnIds.push(columnId);
      query(schema.collections)
        .collection('tableColumnEntities')
        .setOne(newColumn);
    });

    schema.doc.tableIds.push(tableId);
    query(schema.collections).collection('tableEntities').setOne(newTable);
  });

  // Convert relationships (Foreign Keys)
  const allTables = query(schema.collections)
    .collection('tableEntities')
    .selectByIds(schema.doc.tableIds);
  const columnCollection = query(schema.collections).collection(
    'tableColumnEntities'
  );

  tables.forEach(table => {
    if (!table.foreignKeys.length) return;

    const endTable = allTables.find(
      (t: any) => t.name.toLowerCase() === table.name.toLowerCase()
    );
    if (!endTable) return;

    const endColumns = columnCollection.selectByIds(endTable.columnIds);

    table.foreignKeys.forEach((foreignKey: ParsedForeignKey) => {
      const startTable = allTables.find(
        (t: any) =>
          t.name.toLowerCase() === foreignKey.refTableName.toLowerCase()
      );
      if (!startTable) return;

      const startColumns = columnCollection.selectByIds(startTable.columnIds);
      const matchedStartCols: any[] = [];
      const matchedEndCols: any[] = [];

      foreignKey.refColumnNames.forEach((refName: string) => {
        const col = startColumns.find(
          (c: any) => c.name.toLowerCase() === refName.toLowerCase()
        );
        if (col) matchedStartCols.push(col);
      });

      foreignKey.columnNames.forEach((colName: string) => {
        const col = endColumns.find(
          (c: any) => c.name.toLowerCase() === colName.toLowerCase()
        );
        if (col) {
          matchedEndCols.push(col);
          if (bHas(col.ui.keys, ColumnUIKey.primaryKey)) {
            col.ui.keys |= ColumnUIKey.foreignKey;
          } else {
            col.ui.keys = ColumnUIKey.foreignKey;
          }
        }
      });

      if (
        matchedStartCols.length > 0 &&
        matchedEndCols.length === matchedStartCols.length
      ) {
        const startColIds = matchedStartCols.map(c => c.id);
        const endColIds = matchedEndCols.map(c => c.id);

        const alreadyExists = query(schema.collections)
          .collection('relationshipEntities')
          .selectAll()
          .some(
            (r: any) =>
              r.start.tableId === startTable.id &&
              r.end.tableId === endTable.id &&
              r.start.columnIds.length === startColIds.length &&
              r.start.columnIds.every(
                (id: string, idx: number) => id === startColIds[idx]
              ) &&
              r.end.columnIds.length === endColIds.length &&
              r.end.columnIds.every(
                (id: string, idx: number) => id === endColIds[idx]
              )
          );

        if (!alreadyExists) {
          const relId = crypto.randomUUID();
          const newRel = {
            id: relId,
            identification: false,
            relationshipType: RelationshipType.ZeroN,
            start: {
              tableId: startTable.id,
              columnIds: startColIds,
            },
            end: {
              tableId: endTable.id,
              columnIds: endColIds,
            },
            meta: {
              updateAt: Date.now(),
              createAt: Date.now(),
            },
          };

          schema.doc.relationshipIds.push(relId);
          query(schema.collections)
            .collection('relationshipEntities')
            .setOne(newRel);
        }
      }
    });
  });

  // Convert indexes
  tables.forEach(table => {
    if (!table.indexes || !table.indexes.length) return;

    const targetTable = allTables.find(
      (t: any) => t.name.toLowerCase() === table.name.toLowerCase()
    );
    if (!targetTable) return;

    const tableCols = columnCollection.selectByIds(targetTable.columnIds);

    table.indexes.forEach((index: ParsedIndex) => {
      const indexId = crypto.randomUUID();
      const indexColIds: string[] = [];

      index.columns.forEach((col: ParsedIndexCol) => {
        const matchedCol = tableCols.find(
          (c: any) => c.name.toLowerCase() === col.name.toLowerCase()
        );
        if (matchedCol) {
          const indexColId = crypto.randomUUID();
          const newIndexCol = {
            id: indexColId,
            indexId,
            columnId: matchedCol.id,
            orderType:
              col.sort === SortType.desc ? OrderType.DESC : OrderType.ASC,
            meta: {
              updateAt: Date.now(),
              createAt: Date.now(),
            },
          };
          query(schema.collections)
            .collection('indexColumnEntities')
            .setOne(newIndexCol);
          indexColIds.push(indexColId);
        }
      });

      if (indexColIds.length > 0) {
        const newIndex = {
          id: indexId,
          tableId: targetTable.id,
          name: index.name,
          unique: Boolean(index.unique),
          indexColumnIds: indexColIds,
          seqIndexColumnIds: [...indexColIds],
          meta: {
            updateAt: Date.now(),
            createAt: Date.now(),
          },
        };
        schema.doc.indexIds.push(indexId);
        query(schema.collections).collection('indexEntities').setOne(newIndex);
      }
    });
  });

  return sanitizeSchemaJson(toJson(schema));
}

/**
 * Converts ERD Editor Schema v3 JSON to clean DDL SQL text.
 */
export function schemaJsonToSql(schemaJson: string, dialect?: string): string {
  if (!schemaJson || schemaJson.trim() === '' || schemaJson === '{}') {
    return '';
  }

  let schema: ERDEditorSchemaV3;
  try {
    schema = schemaV3Parser(JSON.parse(schemaJson));
  } catch (err) {
    console.error('Error parsing schema JSON in schemaJsonToSql:', err);
    return '';
  }

  const { doc, collections, settings } = schema;
  const targetDialect =
    dialect?.toLowerCase() ||
    DatabaseToDialect[settings.database] ||
    'postgresql';
  const bracket =
    targetDialect === 'mysql' || targetDialect === 'mariadb'
      ? '`'
      : targetDialect === 'sqlite'
        ? '"'
        : '';

  const tableCollection = query(collections).collection('tableEntities');
  const columnCollection = query(collections).collection('tableColumnEntities');
  const relCollection = query(collections).collection('relationshipEntities');
  const indexCollection = query(collections).collection('indexEntities');
  const indexColCollection = query(collections).collection(
    'indexColumnEntities'
  );

  const tables = tableCollection
    .selectByIds(doc.tableIds)
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  const statements: string[] = [];

  // Generate CREATE TABLE statements
  tables.forEach((table: any) => {
    const columns = columnCollection.selectByIds(table.columnIds);
    if (columns.length === 0) return;

    const maxNameLen = Math.max(...columns.map((c: any) => c.name.length), 4);
    const maxTypeLen = Math.max(
      ...columns.map((c: any) => c.dataType.length),
      4
    );

    const tableLines: string[] = [];
    tableLines.push(`CREATE TABLE ${bracket}${table.name}${bracket} (`);

    const pkColumns = columns.filter((c: any) =>
      bHas(c.options, ColumnOption.primaryKey)
    );

    const colDefs = columns.map((c: any) => {
      const padName = c.name.padEnd(maxNameLen, ' ');
      const padType = c.dataType.padEnd(maxTypeLen, ' ');
      const parts = [`  ${bracket}${padName}${bracket} ${padType}`];

      if (bHas(c.options, ColumnOption.notNull)) {
        parts.push('NOT NULL');
      }

      if (bHas(c.options, ColumnOption.autoIncrement)) {
        if (targetDialect === 'postgresql') {
          parts.push('GENERATED ALWAYS AS IDENTITY');
        } else if (targetDialect === 'sqlite') {
          parts.push('PRIMARY KEY AUTOINCREMENT');
        } else {
          parts.push('AUTO_INCREMENT');
        }
      } else if (c.default && c.default.trim() !== '') {
        const rawDefault = c.default.trim();
        const isAlreadyQuoted =
          (rawDefault.startsWith("'") && rawDefault.endsWith("'")) ||
          (rawDefault.startsWith('"') && rawDefault.endsWith('"'));
        const isFuncOrKeywordOrNum =
          /^(now\(\)|gen_random_uuid\(\)|current_timestamp|current_date|null|true|false|\d+(\.\d+)?)$/i.test(
            rawDefault
          );
        const formattedDefault =
          isAlreadyQuoted || isFuncOrKeywordOrNum
            ? rawDefault
            : `'${rawDefault.replace(/'/g, "''")}'`;
        parts.push(`DEFAULT ${formattedDefault}`);
      }

      if (bHas(c.options, ColumnOption.unique)) {
        parts.push('UNIQUE');
      }

      if (
        c.comment &&
        c.comment.trim() !== '' &&
        (targetDialect === 'mysql' || targetDialect === 'mariadb')
      ) {
        parts.push(`COMMENT '${c.comment.replace(/'/g, "''")}'`);
      }

      return parts.join(' ');
    });

    if (
      pkColumns.length > 0 &&
      !(
        targetDialect === 'sqlite' &&
        pkColumns.some((c: any) => bHas(c.options, ColumnOption.autoIncrement))
      )
    ) {
      const pkNames = pkColumns
        .map((c: any) => `${bracket}${c.name}${bracket}`)
        .join(', ');
      colDefs.push(`  PRIMARY KEY (${pkNames})`);
    }

    tableLines.push(colDefs.join(',\n'));
    tableLines.push(');');
    statements.push(tableLines.join('\n'));

    // Comments for PostgreSQL
    if (targetDialect === 'postgresql') {
      if (table.comment && table.comment.trim() !== '') {
        statements.push(
          `COMMENT ON TABLE ${table.name} IS '${table.comment.replace(/'/g, "''")}';`
        );
      }
      columns.forEach((c: any) => {
        if (c.comment && c.comment.trim() !== '') {
          statements.push(
            `COMMENT ON COLUMN ${table.name}.${c.name} IS '${c.comment.replace(/'/g, "''")}';`
          );
        }
      });
    }
  });

  // Generate Foreign Key constraints
  const relationships = relCollection.selectByIds(doc.relationshipIds);
  const fkNamesSet = new Set<string>();

  relationships.forEach((rel: any) => {
    const startTable = tableCollection.selectById(rel.start.tableId);
    const endTable = tableCollection.selectById(rel.end.tableId);
    if (!startTable || !endTable) return;

    const startCols = columnCollection
      .selectByIds(rel.start.columnIds)
      .map((c: any) => `${bracket}${c.name}${bracket}`);
    const endCols = columnCollection
      .selectByIds(rel.end.columnIds)
      .map((c: any) => `${bracket}${c.name}${bracket}`);

    if (startCols.length > 0 && endCols.length === startCols.length) {
      let fkName = `fk_${endTable.name}_${startTable.name}`.toLowerCase();
      let counter = 1;
      while (fkNamesSet.has(fkName)) {
        fkName =
          `fk_${endTable.name}_${startTable.name}_${counter++}`.toLowerCase();
      }
      fkNamesSet.add(fkName);

      if (targetDialect !== 'sqlite') {
        statements.push(
          `ALTER TABLE ${bracket}${endTable.name}${bracket}\n  ADD CONSTRAINT ${bracket}${fkName}${bracket} FOREIGN KEY (${endCols.join(', ')}) REFERENCES ${bracket}${startTable.name}${bracket} (${startCols.join(', ')});`
        );
      }
    }
  });

  // Generate Indexes
  const indexes = indexCollection.selectByIds(doc.indexIds);
  indexes.forEach((idx: any) => {
    const table = tableCollection.selectById(idx.tableId);
    if (!table) return;

    const indexCols = indexColCollection.selectByIds(idx.indexColumnIds);
    const colParts = indexCols
      .map((ic: any) => {
        const col = columnCollection.selectById(ic.columnId);
        if (!col) return null;
        const dir = ic.orderType === OrderType.DESC ? ' DESC' : '';
        return `${bracket}${col.name}${bracket}${dir}`;
      })
      .filter(Boolean);

    if (colParts.length > 0) {
      const uniquePart = idx.unique ? 'UNIQUE ' : '';
      statements.push(
        `CREATE ${uniquePart}INDEX ${bracket}${idx.name}${bracket} ON ${bracket}${table.name}${bracket} (${colParts.join(', ')});`
      );
    }
  });

  return statements.join('\n\n') + '\n';
}
