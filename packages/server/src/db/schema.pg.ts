import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const schemas = pgTable('schemas', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  value: text('value').notNull(),
  // Target database engine (vendor name, e.g. 'PostgreSQL'). Nullable for rows
  // created before this column existed; kept in sync with value.settings.database.
  database: text('database'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const chats = pgTable('chats', {
  id: text('id').primaryKey(),
  schemaId: text('schema_id')
    .notNull()
    .references(() => schemas.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const chatMessages = pgTable('chat_messages', {
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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});
