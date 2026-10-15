import {
  ERDEditorSchemaV3,
  query,
  schemaV3Parser,
  toJson,
} from '@dineug/erd-editor-schema';
import {
  AlterTableAddForeignKey,
  AlterTableAddPrimaryKey,
  AlterTableAddUnique,
  CreateIndex,
  CreateTable,
  schemaSQLParser,
  SortType,
  Statement,
  StatementType,
} from '@dineug/schema-sql-parser';

import {
  ColumnOption,
  ColumnUIKey,
  OrderType,
  RelationshipType,
} from '@/constants/schema';
import { EngineContext } from '@/engine/context';
import { Column, IndexColumn } from '@/internal-types';
import { bHas } from '@/utils/bit';
import { createIndex } from '@/utils/collection/index.entity';
import { createIndexColumn } from '@/utils/collection/indexColumn.entity';
import { createRelationship } from '@/utils/collection/relationship.entity';
import { createTable } from '@/utils/collection/table.entity';
import { createColumn } from '@/utils/collection/tableColumn.entity';
import { canvasSizeInRange, textInRange } from '@/utils/validation';

import { findByName } from './utils';

type StatementMap = {
  tables: CreateTable[];
  indexes: CreateIndex[];
  primaryKeys: AlterTableAddPrimaryKey[];
  foreignKeys: AlterTableAddForeignKey[];
  uniques: AlterTableAddUnique[];
};

export function schemaSQLParserToSchemaJson(
  sql: string,
  ctx: EngineContext,
  prepare?: (schema: ERDEditorSchemaV3) => ERDEditorSchemaV3
) {
  const schema = schemaV3Parser({});
  const statements = schemaSQLParser(sql);
  const statementMap = getStatementMap(statements);
  const tables = mergeTables(statementMap);

  const canvasSize = canvasSizeInRange(tables.length * 100);
  schema.settings.width = canvasSize;
  schema.settings.height = canvasSize;

  tables.forEach(table => convertTable(schema, table, ctx));
  convertRelationship(schema, tables);
  convertIndex(schema, tables);

  return toJson(prepare ? prepare(schema) : schema);
}

function getStatementMap(statements: Statement[]): StatementMap {
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
          map.tables.push(statement);
        }
        break;
      case StatementType.createIndex:
        if (statement.tableName && statement.columns.length) {
          map.indexes.push(statement);
        }
        break;
      case StatementType.alterTableAddPrimaryKey:
        if (statement.name && statement.columnNames.length) {
          map.primaryKeys.push(statement);
        }
        break;
      case StatementType.alterTableAddForeignKey:
        if (
          statement.name &&
          statement.columnNames.length &&
          statement.refTableName &&
          statement.refColumnNames.length &&
          statement.columnNames.length === statement.refColumnNames.length
        ) {
          map.foreignKeys.push(statement);
        }
        break;
      case StatementType.alterTableAddUnique:
        if (statement.name && statement.columnNames.length) {
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
}: StatementMap): CreateTable[] {
  indexes.forEach(index => {
    const table = findByName(tables, index.tableName);
    if (!table) return;

    table.indexes.push({
      name: index.name,
      unique: index.unique,
      columns: index.columns,
    });
  });

  primaryKeys.forEach(primaryKey => {
    const table = findByName(tables, primaryKey.name);
    if (!table) return;

    primaryKey.columnNames.forEach(columnName => {
      const column = findByName(table.columns, columnName);
      if (!column) return;

      column.primaryKey = true;
    });
  });

  uniques.forEach(unique => {
    const table = findByName(tables, unique.name);
    if (!table) return;

    unique.columnNames.forEach(columnName => {
      const column = findByName(table.columns, columnName);
      if (!column) return;

      column.unique = true;
    });
  });

  foreignKeys.forEach(foreignKey => {
    const table = findByName(tables, foreignKey.name);
    if (!table) return;

    const isDuplicate = table.foreignKeys.some(
      fk =>
        fk.refTableName.toLowerCase() ===
          foreignKey.refTableName.toLowerCase() &&
        fk.columnNames.length === foreignKey.columnNames.length &&
        fk.columnNames.every(
          (cn, i) =>
            cn.toLowerCase() === foreignKey.columnNames[i].toLowerCase()
        ) &&
        fk.refColumnNames.length === foreignKey.refColumnNames.length &&
        fk.refColumnNames.every(
          (rcn, i) =>
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

function convertTable(
  { doc, collections }: ERDEditorSchemaV3,
  table: CreateTable,
  { toWidth }: EngineContext
) {
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
    query(collections).collection('tableColumnEntities').setOne(newColumn);
  });

  doc.tableIds.push(newTable.id);
  query(collections).collection('tableEntities').setOne(newTable);
}

function convertRelationship(
  { doc, collections }: ERDEditorSchemaV3,
  tables: CreateTable[]
) {
  const newTables = query(collections)
    .collection('tableEntities')
    .selectByIds(doc.tableIds);
  const columnCollection = query(collections).collection('tableColumnEntities');

  tables.forEach(table => {
    if (!table.foreignKeys.length) return;

    const endTable = findByName(newTables, table.name);
    if (!endTable) return;

    const eColumns = columnCollection.selectByIds(endTable.columnIds);

    table.foreignKeys.forEach(foreignKey => {
      const startTable = findByName(newTables, foreignKey.refTableName);
      if (!startTable) return;

      const sColumns = columnCollection.selectByIds(startTable.columnIds);
      const startColumns: Column[] = [];
      const endColumns: Column[] = [];

      foreignKey.refColumnNames.forEach(refColumnName => {
        const column = findByName(sColumns, refColumnName);
        if (!column) return;

        startColumns.push(column);
      });

      foreignKey.columnNames.forEach(columnName => {
        const column = findByName(eColumns, columnName);
        if (!column) return;

        endColumns.push(column);
        if (bHas(column.ui.keys, ColumnUIKey.primaryKey)) {
          column.ui.keys |= ColumnUIKey.foreignKey;
        } else {
          column.ui.keys = ColumnUIKey.foreignKey;
        }
      });

      const startColIds = startColumns.map(column => column.id);
      const endColIds = endColumns.map(column => column.id);

      const alreadyExists = query(collections)
        .collection('relationshipEntities')
        .selectAll()
        .some(
          r =>
            r.start.tableId === startTable.id &&
            r.end.tableId === endTable.id &&
            r.start.columnIds.length === startColIds.length &&
            r.start.columnIds.every((id, idx) => id === startColIds[idx]) &&
            r.end.columnIds.length === endColIds.length &&
            r.end.columnIds.every((id, idx) => id === endColIds[idx])
        );

      if (alreadyExists) return;

      const newRelationship = createRelationship({
        identification: !endColumns.some(
          column =>
            !(
              bHas(column.ui.keys, ColumnUIKey.primaryKey) &&
              bHas(column.ui.keys, ColumnUIKey.foreignKey)
            )
        ),
        relationshipType: RelationshipType.ZeroN,
        start: {
          tableId: startTable.id,
          columnIds: startColIds,
        },
        end: {
          tableId: endTable.id,
          columnIds: endColIds,
        },
      });

      doc.relationshipIds.push(newRelationship.id);
      query(collections)
        .collection('relationshipEntities')
        .setOne(newRelationship);
    });
  });
}

function convertIndex(
  { doc, collections }: ERDEditorSchemaV3,
  tables: CreateTable[]
) {
  const newTables = query(collections)
    .collection('tableEntities')
    .selectByIds(doc.tableIds);

  tables.forEach(table => {
    table.indexes.forEach(index => {
      const targetTable = findByName(newTables, table.name);
      if (!targetTable) return;

      const columns = query(collections)
        .collection('tableColumnEntities')
        .selectByIds(targetTable.columnIds);
      const indexColumns: IndexColumn[] = [];
      const newIndex = createIndex({
        name: index.name,
        tableId: targetTable.id,
        unique: index.unique,
      });

      index.columns.forEach(column => {
        const targetColumn = findByName(columns, column.name);
        if (!targetColumn) return;

        const newIndexColumn = createIndexColumn({
          indexId: newIndex.id,
          columnId: targetColumn.id,
          orderType:
            column.sort === SortType.asc ? OrderType.ASC : OrderType.DESC,
        });
        indexColumns.push(newIndexColumn);
      });

      if (indexColumns.length !== 0) {
        indexColumns.forEach(indexColumn => {
          newIndex.indexColumnIds.push(indexColumn.id);
          newIndex.seqIndexColumnIds.push(indexColumn.id);

          query(collections)
            .collection('indexColumnEntities')
            .setOne(indexColumn);
        });

        doc.indexIds.push(newIndex.id);
        query(collections).collection('indexEntities').setOne(newIndex);
      }
    });
  });
}
