import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { desc, eq } from 'drizzle-orm';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  BitmaskToDatabaseVendor,
  DatabaseVendorList,
  DatabaseVendorToBitmask,
  isDatabaseVendor,
} from './constants/database.js';
import { db, schema } from './db/index.js';
import { runMigrations } from './db/migrate.js';
import { getAiClient } from './services/ai.js';
import {
  buildConversation,
  buildSystemPrompt,
  type SchemaContext,
} from './services/schemaPrompt.js';
import {
  createInitialSchemaValue,
  mergeSchemaJson,
  schemaSQLParserToSchemaJson,
} from './utils/schemaSqlParser.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support larger diagram schema JSON sizes

// API Routes

// GET /api/projects - List all projects
app.get('/api/projects', async (req, res) => {
  try {
    const list = await db
      .select()
      .from(schema.projects)
      .orderBy(desc(schema.projects.updatedAt));
    res.json(list);
  } catch (error) {
    console.error('Error listing projects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects - Create a new project
app.post('/api/projects', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const id = crypto.randomUUID();
    const now = new Date();
    const newProject = {
      id,
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

// PUT /api/projects/:id - Update project name/description
app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
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
    if (updated.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/projects/:id - Delete project (cascades to schemas)
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(schema.projects).where(eq(schema.projects.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/projects/:projectId/schemas - List schemas for a project (excludes full diagram state value)
app.get('/api/projects/:projectId/schemas', async (req, res) => {
  try {
    const { projectId } = req.params;
    const list = await db
      .select({
        id: schema.schemas.id,
        projectId: schema.schemas.projectId,
        name: schema.schemas.name,
        database: schema.schemas.database,
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

// POST /api/projects/:projectId/schemas - Create a new schema in a project
app.post('/api/projects/:projectId/schemas', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, database, value } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!isDatabaseVendor(database)) {
      return res.status(400).json({
        error: `Database engine is required and must be one of: ${DatabaseVendorList.join(
          ', '
        )}`,
      });
    }

    // An optional pre-built diagram JSON (e.g. a schema duplicated into another
    // engine). When absent, start from a valid empty editor state whose
    // settings.database matches the chosen engine (never the silent MySQL default).
    let initialValue: string;
    if (typeof value === 'string' && value.trim()) {
      try {
        JSON.parse(value);
        initialValue = value;
      } catch {
        return res.status(400).json({ error: 'value must be valid JSON' });
      }
    } else {
      initialValue = createInitialSchemaValue(
        DatabaseVendorToBitmask[database]
      );
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const newSchema = {
      id,
      projectId,
      name,
      value: initialValue,
      database,
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

// GET /api/schemas/:id - Fetch full schema detail including diagram 'value' JSON state
app.get('/api/schemas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db
      .select()
      .from(schema.schemas)
      .where(eq(schema.schemas.id, id));
    if (result.length === 0) {
      return res.status(404).json({ error: 'Schema not found' });
    }
    res.json(result[0]);
  } catch (error) {
    console.error('Error retrieving schema:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/schemas/:id - Save schema name or diagram 'value'
app.put('/api/schemas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, value, database } = req.body;
    const updateValues: any = { updatedAt: new Date() };
    if (name !== undefined) updateValues.name = name;
    if (value !== undefined) {
      updateValues.value = value;
      try {
        const parsed = JSON.parse(value);
        const bitmask = parsed?.settings?.database;
        if (typeof bitmask === 'number' && BitmaskToDatabaseVendor[bitmask]) {
          updateValues.database = BitmaskToDatabaseVendor[bitmask];
        }
      } catch {
        // value is not JSON or does not contain settings.database
      }
    }
    if (isDatabaseVendor(database)) {
      updateValues.database = database;
    }

    await db
      .update(schema.schemas)
      .set(updateValues)
      .where(eq(schema.schemas.id, id));

    // Also update parent project's updatedAt time so project list sorts properly
    const schemaDetails = await db
      .select({ projectId: schema.schemas.projectId })
      .from(schema.schemas)
      .where(eq(schema.schemas.id, id));
    if (schemaDetails.length > 0) {
      await db
        .update(schema.projects)
        .set({ updatedAt: new Date() })
        .where(eq(schema.projects.id, schemaDetails[0].projectId));
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating schema:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/schemas/:id/sql - Parse SQL DDL and save as JSON schema
app.put('/api/schemas/:id/sql', async (req, res) => {
  try {
    const { id } = req.params;
    const { sql } = req.body;
    if (!sql) {
      return res.status(400).json({ error: 'SQL content is required' });
    }

    const newJsonValue = schemaSQLParserToSchemaJson(sql);

    // Fetch current schema to merge if it exists
    const currentSchemaData = await db
      .select()
      .from(schema.schemas)
      .where(eq(schema.schemas.id, id));

    let finalJsonValue = newJsonValue;
    if (currentSchemaData.length > 0 && currentSchemaData[0].value) {
      finalJsonValue = mergeSchemaJson(
        currentSchemaData[0].value,
        newJsonValue
      );
    }

    await db
      .update(schema.schemas)
      .set({ value: finalJsonValue, updatedAt: new Date() })
      .where(eq(schema.schemas.id, id));

    // Also update parent project's updatedAt time
    const schemaDetails = await db
      .select({ projectId: schema.schemas.projectId })
      .from(schema.schemas)
      .where(eq(schema.schemas.id, id));
    if (schemaDetails.length > 0) {
      await db
        .update(schema.projects)
        .set({ updatedAt: new Date() })
        .where(eq(schema.projects.id, schemaDetails[0].projectId));
    }

    res.json({ success: true, value: finalJsonValue });
  } catch (error: any) {
    console.error('Error parsing/updating schema SQL:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// DELETE /api/schemas/:id - Delete a schema
app.delete('/api/schemas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(schema.schemas).where(eq(schema.schemas.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting schema:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * `chat_messages.context_tables` holds a JSON array of table names. Rows
 * predating the column are null, so callers always get a plain array back.
 */
const parseContextTables = (raw: unknown): string[] => {
  if (typeof raw !== 'string' || raw.length === 0) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(v => typeof v === 'string')
      : [];
  } catch {
    return [];
  }
};

// GET /api/schemas/:schemaId/chat - Fetch paginated chat messages for a schema
app.get('/api/schemas/:schemaId/chat', async (req, res) => {
  try {
    const { schemaId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

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
      focusedTable: m.focusedTable ?? undefined,
      contextTables: parseContextTables(m.contextTables),
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/schemas/:schemaId/chat - Clear chat messages for a schema
app.delete('/api/schemas/:schemaId/chat', async (req, res) => {
  try {
    const { schemaId } = req.params;
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

// POST /api/chat - Talk to AI assistant with layered schema context
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, schemaContext, schemaId } = req.body as {
      messages?: unknown;
      schemaContext?: SchemaContext | null;
      schemaId?: string;
    };
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const aiClient = getAiClient();
    const context = schemaContext ?? null;

    // Recorded on both the question and the answer, so the conversation shows
    // what each exchange was grounded on.
    const focusedTable = context?.focusedTable ?? null;
    const contextTables = context?.tables.length
      ? JSON.stringify(context.tables.map(t => t.name))
      : null;

    const fullMessages = [
      { role: 'system', content: buildSystemPrompt(context) },
      ...buildConversation(messages as any, context),
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
            focusedTable,
            contextTables,
            createdAt: new Date(now.getTime() - 1000),
          });
        }

        // Save AI reply
        await db.insert(schema.chatMessages).values({
          id: crypto.randomUUID(),
          chatId,
          role: 'assistant',
          message: reply,
          focusedTable,
          contextTables,
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
