/**
 * Builds the database context that is sent to the AI.
 *
 * This reads the editor's structured JSON document (`erd-editor` schema v3)
 * instead of regex-parsing the generated DDL text. The DDL emits foreign keys
 * as separate `ALTER TABLE ... ADD CONSTRAINT` statements, which makes
 * text-based filtering both fragile and blind to relationships.
 *
 * The context is layered so the model always knows what exists without paying
 * for the whole schema:
 *
 *   0. `map`           - one line per table (name, column count, neighbours)
 *   1. `tables`        - full definition of the focused table
 *   2. `tables`        - full definition of directly related tables, while the
 *                        character budget allows; the rest degrade to `outline`
 *   3. `relationships` - explicit FK edges touching the included tables
 */

// Bit flags mirrored from @dineug/erd-editor-schema (v3/schema/tableColumn.entity).
const ColumnOption = {
  autoIncrement: 0b0000000000000000000000000000001,
  primaryKey: 0b0000000000000000000000000000010,
  unique: 0b0000000000000000000000000000100,
  notNull: 0b0000000000000000000000000001000,
} as const;

const RelationshipType = {
  ZeroOne: 0b0000000000000000000000000000010,
  ZeroN: 0b0000000000000000000000000000100,
  OneOnly: 0b0000000000000000000000000001000,
  OneN: 0b0000000000000000000000000010000,
} as const;

const OrderType = {
  ASC: 0b0000000000000000000000000000001,
  DESC: 0b0000000000000000000000000000010,
} as const;

const bHas = (value: number, flag: number) => (value & flag) === flag;

/** Total characters allowed for the fully expanded tables section. */
const TABLE_BUDGET_CHARS = 12_000;

// --- Public shape (kept in sync with packages/server/src/services/schemaPrompt.ts) ---

export interface ContextColumn {
  name: string;
  dataType: string;
  primaryKey: boolean;
  notNull: boolean;
  unique: boolean;
  autoIncrement: boolean;
  default?: string;
  comment?: string;
}

export interface ContextIndex {
  name: string;
  unique: boolean;
  columns: string[];
}

export interface ContextTable {
  name: string;
  comment?: string;
  columns: ContextColumn[];
  indexes: ContextIndex[];
  /** Why this table made it into the context. */
  reason: 'focused' | 'related' | 'mentioned';
}

export interface ContextTableOutline {
  name: string;
  columnCount: number;
  keyColumns: string[];
}

export interface ContextRelationship {
  /** Table holding the foreign key. */
  from: string;
  fromColumns: string[];
  /** Referenced table. */
  to: string;
  toColumns: string[];
  cardinality: string;
  identifying: boolean;
}

export interface SchemaMapEntry {
  name: string;
  columnCount: number;
  relatedTo: string[];
}

export interface SchemaContext {
  focusedTable: string | null;
  /** Layer 0: every table in the diagram, one compact entry each. */
  map: SchemaMapEntry[];
  /** Layers 1-2: fully expanded tables. */
  tables: ContextTable[];
  /** Layer 2 degraded: related tables that did not fit the budget. */
  outlines: ContextTableOutline[];
  /** Layer 3: FK edges touching any included table. */
  relationships: ContextRelationship[];
}

export interface BuildResult {
  context: SchemaContext | null;
  /** Focus was requested but no table matched; the caller must warn the user. */
  unresolvedFocus?: string;
  /** Human-readable list of the tables sent in full, for the UI. */
  includedTables: string[];
  error?: string;
}

// --- Minimal structural types for the editor document ---

interface RawTable {
  id: string;
  name: string;
  comment: string;
  columnIds: string[];
}

interface RawColumn {
  id: string;
  tableId: string;
  name: string;
  comment: string;
  dataType: string;
  default: string;
  options: number;
}

interface RawRelationship {
  id: string;
  identification: boolean;
  relationshipType: number;
  start: { tableId: string; columnIds: string[] };
  end: { tableId: string; columnIds: string[] };
}

interface RawIndex {
  id: string;
  name: string;
  tableId: string;
  indexColumnIds: string[];
  unique: boolean;
}

interface RawIndexColumn {
  id: string;
  indexId: string;
  columnId: string;
  orderType: number;
}

interface EditorDoc {
  doc?: {
    tableIds?: string[];
    relationshipIds?: string[];
    indexIds?: string[];
  };
  collections?: {
    tableEntities?: Record<string, RawTable>;
    tableColumnEntities?: Record<string, RawColumn>;
    relationshipEntities?: Record<string, RawRelationship>;
    indexEntities?: Record<string, RawIndex>;
    indexColumnEntities?: Record<string, RawIndexColumn>;
  };
}

// --- Helpers ---

const cardinalityLabel = (relationshipType: number): string => {
  if (bHas(relationshipType, RelationshipType.ZeroOne)) return '0..1';
  if (bHas(relationshipType, RelationshipType.OneOnly)) return '1';
  if (bHas(relationshipType, RelationshipType.ZeroN)) return '0..N';
  if (bHas(relationshipType, RelationshipType.OneN)) return '1..N';
  return 'N';
};

const normalize = (name: string) => name.trim().toLowerCase();

/**
 * Finds table names explicitly written in the user's question, so asking about
 * a table other than the focused one still ships its definition.
 */
export const detectMentionedTables = (
  question: string,
  tableNames: string[]
): string[] => {
  const lower = question.toLowerCase();
  return tableNames.filter(name => {
    const n = normalize(name);
    if (n.length < 3) return false;
    // Word-boundary match so `user` does not hit `users_roles`.
    const re = new RegExp(`(^|[^a-z0-9_])${escapeRegExp(n)}([^a-z0-9_]|$)`);
    return re.test(lower);
  });
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const estimateTableChars = (table: ContextTable): number =>
  table.name.length +
  (table.comment?.length ?? 0) +
  table.columns.reduce(
    (acc, c) =>
      acc + c.name.length + c.dataType.length + (c.comment?.length ?? 0) + 24,
    0
  ) +
  table.indexes.reduce((acc, i) => acc + i.name.length + 24, 0);

// --- Builder ---

export interface BuildOptions {
  /** The user's question, used to auto-include tables it names. */
  question?: string;
  budgetChars?: number;
}

export const buildSchemaContext = (
  editorValue: string,
  focusedTable: string | null,
  options: BuildOptions = {}
): BuildResult => {
  const { question = '', budgetChars = TABLE_BUDGET_CHARS } = options;

  let parsed: EditorDoc;
  try {
    parsed = JSON.parse(editorValue) as EditorDoc;
  } catch {
    return {
      context: null,
      includedTables: [],
      error: 'No se pudo leer el documento del editor.',
    };
  }

  const tableEntities = parsed.collections?.tableEntities ?? {};
  const columnEntities = parsed.collections?.tableColumnEntities ?? {};
  const relationshipEntities = parsed.collections?.relationshipEntities ?? {};
  const indexEntities = parsed.collections?.indexEntities ?? {};
  const indexColumnEntities = parsed.collections?.indexColumnEntities ?? {};

  // Iterate through `doc` id lists: `collections` may still hold tombstones.
  const tableIds = (parsed.doc?.tableIds ?? []).filter(id => tableEntities[id]);
  const relationshipIds = (parsed.doc?.relationshipIds ?? []).filter(
    id => relationshipEntities[id]
  );
  const indexIds = (parsed.doc?.indexIds ?? []).filter(id => indexEntities[id]);

  if (tableIds.length === 0) {
    return {
      context: {
        focusedTable: null,
        map: [],
        tables: [],
        outlines: [],
        relationships: [],
      },
      includedTables: [],
    };
  }

  const tableById = (id: string) => tableEntities[id];
  const nameById = (id: string) => tableById(id)?.name ?? '';
  const allNames = tableIds.map(nameById).filter(Boolean);

  // --- Relationship graph ---
  const relationships: ContextRelationship[] = relationshipIds
    .map(id => {
      const rel = relationshipEntities[id];
      const from = tableById(rel.end.tableId);
      const to = tableById(rel.start.tableId);
      if (!from || !to) return null;
      return {
        from: from.name,
        fromColumns: rel.end.columnIds
          .map(cid => columnEntities[cid]?.name)
          .filter(Boolean) as string[],
        to: to.name,
        toColumns: rel.start.columnIds
          .map(cid => columnEntities[cid]?.name)
          .filter(Boolean) as string[],
        cardinality: cardinalityLabel(rel.relationshipType),
        identifying: Boolean(rel.identification),
      };
    })
    .filter(Boolean) as ContextRelationship[];

  const neighbours = new Map<string, Set<string>>();
  const addNeighbour = (a: string, b: string) => {
    if (!neighbours.has(a)) neighbours.set(a, new Set());
    neighbours.get(a)!.add(b);
  };
  for (const rel of relationships) {
    addNeighbour(normalize(rel.from), rel.to);
    addNeighbour(normalize(rel.to), rel.from);
  }

  // --- Layer 0: global map ---
  const map: SchemaMapEntry[] = tableIds.map(id => {
    const table = tableById(id);
    return {
      name: table.name,
      columnCount: table.columnIds.length,
      relatedTo: Array.from(neighbours.get(normalize(table.name)) ?? []),
    };
  });

  // --- Focus resolution (no silent fallback to the whole schema) ---
  let focusId: string | undefined;
  if (focusedTable) {
    const target = normalize(focusedTable);
    focusId = tableIds.find(id => normalize(nameById(id)) === target);
    if (!focusId) {
      return {
        context: {
          focusedTable: null,
          map,
          tables: [],
          outlines: [],
          relationships: [],
        },
        unresolvedFocus: focusedTable,
        includedTables: [],
      };
    }
  }

  const buildTable = (
    id: string,
    reason: ContextTable['reason']
  ): ContextTable => {
    const table = tableById(id);
    const columns: ContextColumn[] = table.columnIds
      .map(cid => columnEntities[cid])
      .filter(Boolean)
      .map(column => ({
        name: column.name,
        dataType: column.dataType,
        primaryKey: bHas(column.options, ColumnOption.primaryKey),
        notNull: bHas(column.options, ColumnOption.notNull),
        unique: bHas(column.options, ColumnOption.unique),
        autoIncrement: bHas(column.options, ColumnOption.autoIncrement),
        default: column.default?.trim() || undefined,
        comment: column.comment?.trim() || undefined,
      }));

    const indexes: ContextIndex[] = indexIds
      .map(iid => indexEntities[iid])
      .filter(index => index.tableId === id)
      .map(index => ({
        name: index.name,
        unique: index.unique,
        columns: index.indexColumnIds
          .map(icid => indexColumnEntities[icid])
          .filter(Boolean)
          .map(indexColumn => {
            const column = columnEntities[indexColumn.columnId];
            if (!column) return '';
            const order = bHas(indexColumn.orderType, OrderType.DESC)
              ? ' DESC'
              : '';
            return `${column.name}${order}`;
          })
          .filter(Boolean),
      }));

    return {
      name: table.name,
      comment: table.comment?.trim() || undefined,
      columns,
      indexes,
      reason,
    };
  };

  const outlineTable = (id: string): ContextTableOutline => {
    const table = tableById(id);
    const columns = table.columnIds
      .map(cid => columnEntities[cid])
      .filter(Boolean);
    return {
      name: table.name,
      columnCount: columns.length,
      keyColumns: columns
        .filter(c => bHas(c.options, ColumnOption.primaryKey))
        .map(c => `${c.name} ${c.dataType}`),
    };
  };

  // --- Decide which tables to expand ---
  const idByName = new Map(tableIds.map(id => [normalize(nameById(id)), id]));
  const mentioned = question
    ? detectMentionedTables(question, allNames)
        .map(name => idByName.get(normalize(name)))
        .filter(Boolean as unknown as (id?: string) => id is string)
    : [];

  // No focus and nothing named: send everything, budget permitting.
  if (!focusId && mentioned.length === 0) {
    const tables: ContextTable[] = [];
    const outlines: ContextTableOutline[] = [];
    let used = 0;
    for (const id of tableIds) {
      const table = buildTable(id, 'related');
      const cost = estimateTableChars(table);
      if (used + cost <= budgetChars) {
        tables.push(table);
        used += cost;
      } else {
        outlines.push(outlineTable(id));
      }
    }
    return {
      context: { focusedTable: null, map, tables, outlines, relationships },
      includedTables: tables.map(t => t.name),
    };
  }

  const expanded = new Map<string, ContextTable>();
  let used = 0;
  const tryExpand = (id: string, reason: ContextTable['reason']): boolean => {
    if (expanded.has(id)) return true;
    const table = buildTable(id, reason);
    const cost = estimateTableChars(table);
    // The focused and explicitly mentioned tables always go in, budget or not.
    if (reason !== 'related' || used + cost <= budgetChars) {
      expanded.set(id, table);
      used += cost;
      return true;
    }
    return false;
  };

  if (focusId) tryExpand(focusId, 'focused');
  for (const id of mentioned) tryExpand(id, 'mentioned');

  // Layer 2: direct neighbours of everything expanded so far.
  const outlines: ContextTableOutline[] = [];
  const seeds = Array.from(expanded.keys());
  for (const seedId of seeds) {
    const seedNeighbours = neighbours.get(normalize(nameById(seedId))) ?? [];
    for (const neighbourName of seedNeighbours) {
      const neighbourId = idByName.get(normalize(neighbourName));
      if (!neighbourId || expanded.has(neighbourId)) continue;
      if (!tryExpand(neighbourId, 'related')) {
        outlines.push(outlineTable(neighbourId));
      }
    }
  }

  const includedNames = new Set(
    Array.from(expanded.values()).map(t => normalize(t.name))
  );

  return {
    context: {
      focusedTable: focusId ? nameById(focusId) : null,
      map,
      tables: Array.from(expanded.values()),
      outlines,
      // Layer 3: only edges that touch an expanded table.
      relationships: relationships.filter(
        rel =>
          includedNames.has(normalize(rel.from)) ||
          includedNames.has(normalize(rel.to))
      ),
    },
    includedTables: Array.from(expanded.values()).map(t => t.name),
  };
};
