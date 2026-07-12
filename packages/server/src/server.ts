import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { desc, eq } from 'drizzle-orm';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { db, schema } from './db/index.js';
import { runMigrations } from './db/migrate.js';
import { getAiClient } from './services/ai.js';

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
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
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
    const { name, value } = req.body;
    const updateValues: any = { updatedAt: new Date() };
    if (name !== undefined) updateValues.name = name;
    if (value !== undefined) updateValues.value = value;

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

// POST /api/chat - Talk to AI assistant with DDL schema context
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, ddlContext } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
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
3. Be helpful, concise, and professional.`;

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const reply = await aiClient.generateChatResponse(fullMessages as any);
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
