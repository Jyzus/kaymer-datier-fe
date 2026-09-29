import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const schemas = sqliteTable('schemas', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  value: text('value').notNull(),
  // Target database engine (vendor name, e.g. 'PostgreSQL'). Nullable for rows
  // created before this column existed; kept in sync with value.settings.database.
  database: text('database'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const chats = sqliteTable('chats', {
  id: text('id').primaryKey(),
  schemaId: text('schema_id')
    .notNull()
    .references(() => schemas.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  chatId: text('chat_id')
    .notNull()
    .references(() => chats.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' | 'assistant'
  message: text('message').notNull(),
  // Table the user had focused when the message was sent, if any.
  focusedTable: text('focused_table'),
  // JSON array with the names of every table whose full definition was sent as
  // context, so the conversation records what the answer was grounded on.
  contextTables: text('context_tables'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
