/**
 * Renders the layered database context produced by the client
 * (packages/app/src/utils/schemaContext.ts) into the prompt sent to the model.
 *
 * Keep the interfaces below in sync with that file.
 */

import type { ChatMessage } from './ai.js';

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
  reason: 'focused' | 'related' | 'mentioned';
}

export interface ContextTableOutline {
  name: string;
  columnCount: number;
  keyColumns: string[];
}

export interface ContextRelationship {
  from: string;
  fromColumns: string[];
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
  map: SchemaMapEntry[];
  tables: ContextTable[];
  outlines: ContextTableOutline[];
  relationships: ContextRelationship[];
}

/**
 * How many prior messages travel with the request. Older turns are dropped so a
 * previous conversation about another table cannot outweigh the active focus.
 */
export const MAX_HISTORY_MESSAGES = 8;

const renderColumn = (column: ContextColumn): string => {
  const parts = [`  ${column.name} ${column.dataType}`];
  if (column.primaryKey) parts.push('PRIMARY KEY');
  if (column.notNull && !column.primaryKey) parts.push('NOT NULL');
  if (column.unique) parts.push('UNIQUE');
  if (column.autoIncrement) parts.push('AUTO_INCREMENT');
  if (column.default) parts.push(`DEFAULT ${column.default}`);
  const line = parts.join(' ');
  return column.comment ? `${line} -- ${column.comment}` : line;
};

const renderTable = (table: ContextTable): string => {
  const lines: string[] = [];
  if (table.comment) lines.push(`-- ${table.comment}`);
  lines.push(`CREATE TABLE ${table.name} (`);
  lines.push(table.columns.map(renderColumn).join(',\n'));
  lines.push(');');
  for (const index of table.indexes) {
    lines.push(
      `CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX ${index.name} ON ${
        table.name
      } (${index.columns.join(', ')});`
    );
  }
  return lines.join('\n');
};

const renderRelationship = (rel: ContextRelationship): string =>
  `${rel.from}(${rel.fromColumns.join(', ')}) -> ${
    rel.to
  }(${rel.toColumns.join(', ')})  [${rel.cardinality}${
    rel.identifying ? ', identifying' : ''
  }]`;

export const renderSchemaContext = (context: SchemaContext): string => {
  if (context.map.length === 0) {
    return 'The diagram currently has no tables defined.';
  }

  const sections: string[] = [];

  sections.push(
    [
      '## Schema overview (all tables in the diagram)',
      ...context.map.map(
        entry =>
          `- ${entry.name} (${entry.columnCount} column${entry.columnCount === 1 ? '' : 's'})${
            entry.relatedTo.length
              ? ` -> related: ${entry.relatedTo.join(', ')}`
              : ''
          }`
      ),
    ].join('\n')
  );

  if (context.tables.length > 0) {
    const focused = context.tables.filter(t => t.reason === 'focused');
    const others = context.tables.filter(t => t.reason !== 'focused');

    if (focused.length > 0) {
      sections.push(
        [
          '## Focused table (full definition)',
          '```sql',
          ...focused.map(renderTable),
          '```',
        ].join('\n')
      );
    }
    if (others.length > 0) {
      sections.push(
        [
          focused.length > 0
            ? '## Related tables (full definition)'
            : '## Tables (full definition)',
          '```sql',
          ...others.map(renderTable),
          '```',
        ].join('\n')
      );
    }
  }

  if (context.outlines.length > 0) {
    sections.push(
      [
        '## Other related tables (outline only — ask the user if you need their full definition)',
        ...context.outlines.map(
          outline =>
            `- ${outline.name}: ${outline.columnCount} columns${
              outline.keyColumns.length
                ? `, PK: ${outline.keyColumns.join(', ')}`
                : ''
            }`
        ),
      ].join('\n')
    );
  }

  if (context.relationships.length > 0) {
    sections.push(
      [
        '## Foreign key relationships',
        ...context.relationships.map(renderRelationship),
      ].join('\n')
    );
  }

  return sections.join('\n\n');
};

export const buildSystemPrompt = (context: SchemaContext | null): string => {
  const focused = context?.focusedTable;

  return `You are an expert Database Architect AI. You help developers design, structure, improve, and explain their database schemas.

${
  focused
    ? `SCOPE: the user has focused the table '${focused}'. Answer about '${focused}' and its relationships. If the question genuinely concerns another table, say so explicitly before answering, and never silently switch subject.
`
    : ''
}${
    context
      ? `Current database context:\n\n${renderSchemaContext(context)}`
      : 'Currently, the diagram has no tables defined.'
  }

Rules about the context above:
- Only the tables shown under "full definition" have complete column lists. Never invent columns for tables listed only in the overview or the outline section — ask the user to focus that table instead.
- The overview lists every table that exists, so do not propose creating a table that is already there.

Instructions:
1. Explain structural details in a clear and pedagogical way if the user asks for explanations.
2. If you suggest modifications, additions, or a new database structure:
   - Provide the complete or partial SQL DDL script needed for those changes.
   - Always put the SQL script inside standard markdown blocks with the sql language identifier, e.g.:
     \`\`\`sql
     CREATE TABLE users (...);
     \`\`\`
   - Do NOT mix text explanations within the SQL block. The UI will parse any \`\`\`sql block to let the user import it directly into their visual canvas.
   - For modifications to existing tables (like adding columns), you can output the full updated \`CREATE TABLE table_name (...)\` statement. The merger will automatically overwrite the old table with the new definition.
   - CRITICAL: If you rename a table, do NOT just output \`CREATE TABLE new_table_name (...)\`. You MUST output an explicit \`ALTER TABLE old_table_name RENAME TO new_table_name;\` statement so the system knows to rename the table instead of creating a duplicate table.
   - Similarly, if you rename columns, prefer using explicit \`ALTER TABLE table_name RENAME COLUMN old_col TO new_col;\` statements.
3. Be helpful, concise, and professional.`;
};

/**
 * Trims the conversation to the most recent turns and re-states the active
 * focus immediately before the last user message, where it carries the most
 * weight against older turns about other tables.
 */
export const buildConversation = (
  messages: ChatMessage[],
  context: SchemaContext | null
): ChatMessage[] => {
  const recent = messages.slice(-MAX_HISTORY_MESSAGES);
  const focused = context?.focusedTable;
  if (!focused || recent.length === 0) return recent;

  const head = recent.slice(0, -1);
  const last = recent[recent.length - 1];
  return [
    ...head,
    {
      role: 'system',
      content: `Reminder: the active focus is the table '${focused}'. Answer the next message with respect to that table.`,
    },
    last,
  ];
};
