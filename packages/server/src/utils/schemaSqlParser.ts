import { query, schemaV3Parser, toJson } from '@dineug/erd-editor-schema';
import { schemaSQLParser, StatementType } from '@dineug/schema-sql-parser';
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

  const tables: any[] = [];
  const indexes: any[] = [];

  statements.forEach((stmt: any) => {
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

    table.columns.forEach((column: any) => {
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

/**
 * Fusiona un nuevo esquema JSON (generado desde DDL) con el esquema existente.
 * Conserva la UI (posición, color) y las tablas que no fueron modificadas.
 */
export function mergeSchemaJson(currentJson: any, newJson: any) {
  if (
    !currentJson ||
    !currentJson.collections ||
    !currentJson.collections.tableEntities
  ) {
    return newJson;
  }

  // Clona el JSON actual para no mutar directamente
  const mergedJson = JSON.parse(JSON.stringify(currentJson));

  // Mapa de tablas existentes por nombre (lowercase)
  const existingTablesByName = new Map();
  Object.values(mergedJson.collections.tableEntities).forEach((table: any) => {
    existingTablesByName.set(table.name.toLowerCase(), table);
  });

  // Procesamos cada tabla que viene en el nuevo JSON (el DDL de la IA)
  Object.values(newJson.collections.tableEntities).forEach((newTable: any) => {
    const tableNameLower = newTable.name.toLowerCase();
    const existingTable = existingTablesByName.get(tableNameLower);

    if (existingTable) {
      // 1. Restaurar propiedades UI de la tabla existente
      newTable.ui = { ...newTable.ui, ...existingTable.ui };

      // 2. Limpiar las entidades antiguas asociadas a la tabla existente
      // Eliminar las columnas antiguas
      existingTable.columnIds.forEach((colId: string) => {
        delete mergedJson.collections.tableColumnEntities[colId];
      });

      // Eliminar los índices antiguos asociados
      if (mergedJson.collections.indexEntities) {
        const indexIdsToRemove = Object.values(
          mergedJson.collections.indexEntities
        )
          .filter((idx: any) => idx.tableId === existingTable.id)
          .map((idx: any) => idx.id);

        indexIdsToRemove.forEach((idxId: string) => {
          const idx = mergedJson.collections.indexEntities[idxId] as any;
          if (idx && idx.indexColumnIds) {
            idx.indexColumnIds.forEach((idxColId: string) => {
              delete mergedJson.collections.indexColumnEntities[idxColId];
            });
          }
          delete mergedJson.collections.indexEntities[idxId];

          if (mergedJson.doc.indexIds) {
            mergedJson.doc.indexIds = mergedJson.doc.indexIds.filter(
              (id: string) => id !== idxId
            );
          }
        });
      }

      // Eliminar relaciones conectadas a esta tabla
      if (mergedJson.collections.relationshipEntities) {
        const relIdsToRemove = Object.values(
          mergedJson.collections.relationshipEntities
        )
          .filter(
            (rel: any) =>
              rel.start.tableId === existingTable.id ||
              rel.end.tableId === existingTable.id
          )
          .map((rel: any) => rel.id);

        relIdsToRemove.forEach((relId: string) => {
          delete mergedJson.collections.relationshipEntities[relId];
          if (mergedJson.doc.relationshipIds) {
            mergedJson.doc.relationshipIds =
              mergedJson.doc.relationshipIds.filter(
                (id: string) => id !== relId
              );
          }
        });
      }

      // 3. Eliminar la tabla antigua del objeto
      delete mergedJson.collections.tableEntities[existingTable.id];
      mergedJson.doc.tableIds = mergedJson.doc.tableIds.filter(
        (id: string) => id !== existingTable.id
      );
    }

    // 4. Agregar la nueva tabla al mergedJson
    if (!mergedJson.collections.tableEntities)
      mergedJson.collections.tableEntities = {};
    mergedJson.collections.tableEntities[newTable.id] = newTable;
    if (!mergedJson.doc.tableIds) mergedJson.doc.tableIds = [];
    mergedJson.doc.tableIds.push(newTable.id);

    // 5. Copiar todas las columnas
    if (!mergedJson.collections.tableColumnEntities)
      mergedJson.collections.tableColumnEntities = {};
    newTable.columnIds.forEach((colId: string) => {
      mergedJson.collections.tableColumnEntities[colId] =
        newJson.collections.tableColumnEntities[colId];
    });

    // 6. Copiar índices asociados a la nueva tabla
    if (newJson.collections.indexEntities) {
      const newIndexesForTable = Object.values(
        newJson.collections.indexEntities
      ).filter((idx: any) => idx.tableId === newTable.id);

      if (newIndexesForTable.length > 0) {
        if (!mergedJson.collections.indexEntities)
          mergedJson.collections.indexEntities = {};
        if (!mergedJson.collections.indexColumnEntities)
          mergedJson.collections.indexColumnEntities = {};
        if (!mergedJson.doc.indexIds) mergedJson.doc.indexIds = [];

        newIndexesForTable.forEach((idx: any) => {
          mergedJson.collections.indexEntities[idx.id] = idx;
          mergedJson.doc.indexIds.push(idx.id);

          idx.indexColumnIds.forEach((idxColId: string) => {
            mergedJson.collections.indexColumnEntities[idxColId] =
              newJson.collections.indexColumnEntities[idxColId];
          });
        });
      }
    }
  });

  return mergedJson;
}
