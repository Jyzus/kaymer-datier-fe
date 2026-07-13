import { query, schemaV3Parser, toJson } from '@dineug/erd-editor-schema';
import {
  CreateIndex,
  CreateTable,
  schemaSQLParser,
  StatementType,
} from '@dineug/schema-sql-parser';
import * as crypto from 'crypto';

// Utilidades simuladas del Canvas (sin navegador)
const textInRange = (w: number) => Math.max(10, Math.min(w, 500));
const canvasSizeInRange = (w: number) => Math.max(2000, Math.min(w, 8000));
const toWidth = (str: string = '') => str.length * 8; // Ancho dummy

const ColumnOption = { autoIncrement: 1, primaryKey: 2, unique: 4, notNull: 8 };
const ColumnUIKey = { primaryKey: 1, foreignKey: 2 };

function createTable(data: any) {
  return { id: crypto.randomUUID(), ...data, columnIds: [], seqColumnIds: [] };
}
function createColumn(data: any) {
  return { id: crypto.randomUUID(), ...data };
}

/**
 * Convierte código SQL DDL puro a JSON Schema (V3)
 * para inyectar en la base de datos de Datier.
 */
export function schemaSQLParserToSchemaJson(sql: string) {
  const schema = schemaV3Parser({});
  const statements = schemaSQLParser(sql);

  const tables: CreateTable[] = [];
  const indexes: CreateIndex[] = [];

  statements.forEach(stmt => {
    if (stmt.type === StatementType.createTable && stmt.name) tables.push(stmt);
    if (
      stmt.type === StatementType.createIndex &&
      stmt.tableName &&
      stmt.columns.length
    )
      indexes.push(stmt);
  });

  const canvasSize = canvasSizeInRange(tables.length * 100);
  schema.settings.width = canvasSize;
  schema.settings.height = canvasSize;

  tables.forEach(table => {
    const newTable = createTable({
      name: table.name,
      comment: table.comment,
      ui: {
        widthName: textInRange(toWidth(table.name)),
        widthComment: textInRange(toWidth(table.comment)),
      },
    });

    table.columns.forEach(column => {
      const newColumn = createColumn({
        tableId: newTable.id,
        name: column.name,
        comment: column.comment,
        dataType: column.dataType,
        default: column.default,
        options:
          (column.autoIncrement ? ColumnOption.autoIncrement : 0) |
          (column.primaryKey ? ColumnOption.primaryKey : 0) |
          (column.unique ? ColumnOption.unique : 0) |
          (column.nullable ? 0 : ColumnOption.notNull),
        ui: {
          widthName: textInRange(toWidth(column.name)),
          widthComment: textInRange(toWidth(column.comment)),
          widthDataType: textInRange(toWidth(column.dataType)),
          widthDefault: textInRange(toWidth(column.default)),
          keys: column.primaryKey ? ColumnUIKey.primaryKey : 0,
        },
      });
      newTable.columnIds.push(newColumn.id);
      newTable.seqColumnIds.push(newColumn.id);
      query(schema.collections)
        .collection('tableColumnEntities')
        .setOne(newColumn as any);
    });

    schema.doc.tableIds.push(newTable.id);
    query(schema.collections)
      .collection('tableEntities')
      .setOne(newTable as any);
  });

  return toJson(schema);
}
