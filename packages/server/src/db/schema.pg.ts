import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const projects = pgTable(
  'projects',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    userId: text('user_id'),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  table => ({
    tenantIdIdx: index('projects_tenant_id_idx').on(table.tenantId),
  })
);

export const schemas = pgTable('schemas', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  value: text('value').notNull(),
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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});
