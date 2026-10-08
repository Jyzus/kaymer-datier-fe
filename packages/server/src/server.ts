import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { and, desc, eq } from 'drizzle-orm';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { db, schema } from './db/index.js';
import { runMigrations } from './db/migrate.js';
import { authMiddleware } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { getAiClient } from './services/ai.js';
import { schemaJsonToSql, sqlToSchemaJson } from './services/sqlConverter.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support larger diagram schema JSON sizes

// Public authentication routes (proxied to ms-auth)
app.use('/api/auth', authRouter);

// Authentication middleware for protected /api routes
app.use('/api', authMiddleware);

// Helpers for multi-tenant & user-account isolation verification
interface UserContext {
  userId: string;
  tenantId: string;
  isApiKey?: boolean;
}

async function verifyProjectAccess(projectId: string, user: UserContext) {
  if (user.isApiKey && user.userId === 'system') {
    const proj = await db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(
        and(
          eq(schema.projects.id, projectId),
          eq(schema.projects.tenantId, user.tenantId)
        )
      );
    return proj.length > 0;
  }

  // Account-level isolation: must belong strictly to this user
  const proj = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.userId, user.userId)
      )
    );
  return proj.length > 0;
}

async function verifySchemaAccess(schemaId: string, user: UserContext) {
  const query = db
    .select({
      id: schema.schemas.id,
      projectId: schema.schemas.projectId,
      name: schema.schemas.name,
      value: schema.schemas.value,
      createdAt: schema.schemas.createdAt,
      updatedAt: schema.schemas.updatedAt,
    })
    .from(schema.schemas)
    .innerJoin(
      schema.projects,
      eq(schema.schemas.projectId, schema.projects.id)
    );

  const whereClause =
    user.isApiKey && user.userId === 'system'
      ? and(
          eq(schema.schemas.id, schemaId),
          eq(schema.projects.tenantId, user.tenantId)
        )
      : and(
          eq(schema.schemas.id, schemaId),
          eq(schema.projects.userId, user.userId)
        );

  const result = await query.where(whereClause);
  return result[0] || null;
}

// API Routes

// GET /api/projects - List all projects belonging to the active user/account
app.get('/api/projects', async (req, res) => {
  try {
    const user = req.user!;
    let list;
    if (user.isApiKey && user.userId === 'system') {
      list = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.tenantId, user.tenantId))
        .orderBy(desc(schema.projects.updatedAt));
    } else {
      list = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.userId, user.userId))
        .orderBy(desc(schema.projects.updatedAt));
    }
    res.json(list);
  } catch (error) {
    console.error('Error listing projects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects - Create a new project within the active user account
app.post('/api/projects', async (req, res) => {
  try {
    const user = req.user!;
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const id = crypto.randomUUID();
    const now = new Date();
    const newProject = {
      id,
      tenantId: user.tenantId,
      userId: user.userId,
      name,
      description: description || null,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(schema.projects).values(newProject);
    res.status(201).json(newProject);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/projects/:id - Update project name/description (account-isolated)
app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const hasAccess = await verifyProjectAccess(id, req.user!);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const updateValues: any = { updatedAt: new Date() };
    if (name !== undefined) updateValues.name = name;
    if (description !== undefined) updateValues.description = description;

    await db
      .update(schema.projects)
      .set(updateValues)
      .where(eq(schema.projects.id, id));

    const updated = await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, id));
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/projects/:id - Delete project (account-isolated, cascades to schemas)
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const hasAccess = await verifyProjectAccess(id, req.user!);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await db.delete(schema.projects).where(eq(schema.projects.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/projects/:projectId/schemas - List schemas for a project (account-isolated)
app.get('/api/projects/:projectId/schemas', async (req, res) => {
  try {
    const { projectId } = req.params;

    const hasAccess = await verifyProjectAccess(projectId, req.user!);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const list = await db
      .select({
        id: schema.schemas.id,
        projectId: schema.schemas.projectId,
        name: schema.schemas.name,
        createdAt: schema.schemas.createdAt,
        updatedAt: schema.schemas.updatedAt,
      })
      .from(schema.schemas)
      .where(eq(schema.schemas.projectId, projectId))
      .orderBy(desc(schema.schemas.updatedAt));
    res.json(list);
  } catch (error) {
    console.error('Error listing schemas:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/:projectId/schemas - Create a new schema in a project (account-isolated)
app.post('/api/projects/:projectId/schemas', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const hasAccess = await verifyProjectAccess(projectId, req.user!);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const newSchema = {
      id,
      projectId,
      name,
      value: '', // start with an empty editor state
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(schema.schemas).values(newSchema);
    res.status(201).json(newSchema);
  } catch (error) {
    console.error('Error creating schema:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/:projectId/schemas/from-sql - Create a new schema directly from DDL SQL (account-isolated)
app.post('/api/projects/:projectId/schemas/from-sql', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, sql, dialect } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Schema name is required' });
    }
    if (!sql || typeof sql !== 'string' || sql.trim() === '') {
      return res.status(400).json({ error: 'SQL DDL content is required' });
    }

    const hasAccess = await verifyProjectAccess(projectId, req.user!);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Convert SQL DDL to ERD Schema v3 JSON
    const schemaValueJson = sqlToSchemaJson(sql, { dialect });

    const id = crypto.randomUUID();
    const now = new Date();
    const newSchema = {
      id,
      projectId,
      name: name.trim(),
      value: schemaValueJson,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(schema.schemas).values(newSchema);

    // Update parent project's updatedAt timestamp
    await db
      .update(schema.projects)
      .set({ updatedAt: now })
      .where(eq(schema.projects.id, projectId));

    res.status(201).json(newSchema);
  } catch (error: any) {
    console.error('Error creating schema from SQL:', error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// GET /api/schemas/:id - Fetch full schema detail including diagram 'value' JSON state (account-isolated)
app.get('/api/schemas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const currentSchema = await verifySchemaAccess(id, req.user!);
    if (!currentSchema) {
      return res.status(404).json({ error: 'Schema not found' });
    }

    res.json(currentSchema);
  } catch (error) {
    console.error('Error retrieving schema:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/schemas/:id - Save schema name or diagram 'value' (account-isolated)
app.put('/api/schemas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, value } = req.body;

    const currentSchema = await verifySchemaAccess(id, req.user!);
    if (!currentSchema) {
      return res.status(404).json({ error: 'Schema not found' });
    }

    const updateValues: any = { updatedAt: new Date() };
    if (name !== undefined) updateValues.name = name;
    if (value !== undefined) updateValues.value = value;

    await db
      .update(schema.schemas)
      .set(updateValues)
      .where(eq(schema.schemas.id, id));

    // Update parent project's updatedAt
    await db
      .update(schema.projects)
      .set({ updatedAt: new Date() })
      .where(eq(schema.projects.id, currentSchema.projectId));

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating schema:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/schemas/:id/sql - Export clean DDL SQL from diagram (account-isolated)
app.get('/api/schemas/:id/sql', async (req, res) => {
  try {
    const { id } = req.params;
    const dialect = req.query.dialect as string | undefined;
    const format = req.query.format as string | undefined;

    const currentSchema = await verifySchemaAccess(id, req.user!);
    if (!currentSchema) {
      return res.status(404).json({ error: 'Schema not found' });
    }

    const generatedSql = schemaJsonToSql(currentSchema.value, dialect);

    if (format === 'raw' || req.headers.accept?.includes('text/plain')) {
      return res.type('text/plain').send(generatedSql);
    }

    res.json({
      id: currentSchema.id,
      projectId: currentSchema.projectId,
      name: currentSchema.name,
      dialect: dialect || 'postgresql',
      sql: generatedSql,
    });
  } catch (error: any) {
    console.error('Error exporting schema to SQL:', error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// PUT /api/schemas/:id/sql - Update and merge DDL SQL into diagram preserving table UI coordinates (account-isolated)
app.put('/api/schemas/:id/sql', async (req, res) => {
  try {
    const { id } = req.params;
    const { sql, dialect } = req.body;

    if (!sql || typeof sql !== 'string' || sql.trim() === '') {
      return res.status(400).json({ error: 'SQL content is required' });
    }

    const currentSchema = await verifySchemaAccess(id, req.user!);
    if (!currentSchema) {
      return res.status(404).json({ error: 'Schema not found' });
    }

    // Merge DDL and preserve existing table UI coordinates
    const mergedJson = sqlToSchemaJson(sql, {
      existingSchemaJson: currentSchema.value,
      dialect,
    });

    const now = new Date();
    await db
      .update(schema.schemas)
      .set({
        value: mergedJson,
        updatedAt: now,
      })
      .where(eq(schema.schemas.id, id));

    // Update parent project's updatedAt
    await db
      .update(schema.projects)
      .set({ updatedAt: now })
      .where(eq(schema.projects.id, currentSchema.projectId));

    const finalSql = schemaJsonToSql(mergedJson, dialect);

    res.json({
      success: true,
      id: currentSchema.id,
      name: currentSchema.name,
      sql: finalSql,
    });
  } catch (error: any) {
    console.error('Error updating schema with SQL:', error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// DELETE /api/schemas/:id - Delete a schema (account-isolated)
app.delete('/api/schemas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const currentSchema = await verifySchemaAccess(id, req.user!);
    if (!currentSchema) {
      return res.status(404).json({ error: 'Schema not found' });
    }

    await db.delete(schema.schemas).where(eq(schema.schemas.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting schema:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/schemas/:schemaId/chat - Fetch paginated chat messages for a schema (account-isolated)
app.get('/api/schemas/:schemaId/chat', async (req, res) => {
  try {
    const { schemaId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const currentSchema = await verifySchemaAccess(schemaId, req.user!);
    if (!currentSchema) {
      return res.status(404).json({ error: 'Schema not found' });
    }

    // Find or create chat
    const activeChat = await db
      .select()
      .from(schema.chats)
      .where(eq(schema.chats.schemaId, schemaId))
      .limit(1);

    let chatId: string;
    if (activeChat.length === 0) {
      chatId = crypto.randomUUID();
      const now = new Date();
      await db.insert(schema.chats).values({
        id: chatId,
        schemaId,
        createdAt: now,
        updatedAt: now,
      });
      return res.json([]); // New chat has no messages
    } else {
      chatId = activeChat[0].id;
    }

    // Query messages order by createdAt desc (for pagination)
    const messagesList = await db
      .select()
      .from(schema.chatMessages)
      .where(eq(schema.chatMessages.chatId, chatId))
      .orderBy(desc(schema.chatMessages.createdAt))
      .limit(limit)
      .offset(offset);

    // Map database table fields to ChatMessage interface
    const formatted = messagesList.map((m: any) => ({
      role: m.role,
      content: m.message,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/schemas/:schemaId/chat - Clear chat messages for a schema (account-isolated)
app.delete('/api/schemas/:schemaId/chat', async (req, res) => {
  try {
    const { schemaId } = req.params;

    const currentSchema = await verifySchemaAccess(schemaId, req.user!);
    if (!currentSchema) {
      return res.status(404).json({ error: 'Schema not found' });
    }

    const activeChat = await db
      .select()
      .from(schema.chats)
      .where(eq(schema.chats.schemaId, schemaId))
      .limit(1);

    if (activeChat.length > 0) {
      await db
        .delete(schema.chatMessages)
        .where(eq(schema.chatMessages.chatId, activeChat[0].id));
      await db
        .delete(schema.chats)
        .where(eq(schema.chats.id, activeChat[0].id));
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/chat - Talk to AI assistant with DDL schema context (account-isolated)
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, ddlContext, schemaId } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    if (schemaId) {
      const currentSchema = await verifySchemaAccess(schemaId, req.user!);
      if (!currentSchema) {
        return res.status(404).json({ error: 'Schema not found' });
      }
    }

    const aiClient = getAiClient();

    const systemPrompt = `You are an expert Database Architect AI. You help developers design, structure, improve, and explain their database schemas.
${ddlContext ? `Here is the current database DDL schema:\n\`\`\`sql\n${ddlContext}\n\`\`\`` : 'Currently, the diagram has no tables defined.'}

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

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const reply = await aiClient.generateChatResponse(fullMessages as any);

    // Persist messages if schemaId is provided
    if (schemaId && messages.length > 0) {
      try {
        const activeChat = await db
          .select()
          .from(schema.chats)
          .where(eq(schema.chats.schemaId, schemaId))
          .limit(1);

        let chatId: string;
        const now = new Date();

        if (activeChat.length === 0) {
          chatId = crypto.randomUUID();
          await db.insert(schema.chats).values({
            id: chatId,
            schemaId,
            createdAt: now,
            updatedAt: now,
          });
        } else {
          chatId = activeChat[0].id;
          await db
            .update(schema.chats)
            .set({ updatedAt: now })
            .where(eq(schema.chats.id, chatId));
        }

        // Save latest user message
        const lastUserMessage = messages[messages.length - 1];
        if (lastUserMessage && lastUserMessage.role === 'user') {
          await db.insert(schema.chatMessages).values({
            id: crypto.randomUUID(),
            chatId,
            role: 'user',
            message: lastUserMessage.content,
            createdAt: new Date(now.getTime() - 1000),
          });
        }

        // Save AI reply
        await db.insert(schema.chatMessages).values({
          id: crypto.randomUUID(),
          chatId,
          role: 'assistant',
          message: reply,
          createdAt: now,
        });
      } catch (dbErr) {
        console.error('Failed to persist chat messages:', dbErr);
      }
    }

    res.json({ reply });
  } catch (error: any) {
    console.error('AI chat error:', error);
    res
      .status(500)
      .json({ error: error?.message || 'Error processing AI chat request' });
  }
});

// Serve frontend static assets in production
const frontendDistPath = path.resolve(__dirname, '../../app/dist');
if (fs.existsSync(frontendDistPath)) {
  console.log(
    `Serving static files from frontend build at ${frontendDistPath}`
  );
  app.use(express.static(frontendDistPath));

  // Fallback all non-API paths to index.html for React Router
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  console.warn(
    `Warning: Frontend build directory not found at ${frontendDistPath}. API server running stand-alone.`
  );
}

// Start database migrations and then boot HTTP server
async function startServer() {
  await runMigrations();
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
