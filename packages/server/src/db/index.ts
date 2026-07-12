import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

import * as schemaPg from './schema.pg.js';
import * as schemaSqlite from './schema.sqlite.js';

dotenv.config();

const provider = process.env.DB_PROVIDER || 'sqlite';
const databaseUrl = process.env.DATABASE_URL || 'file:./local.db';

export const isPg = provider === 'postgres';

let dbInstance: any;
let activeSchema: any;

if (isPg) {
  const queryClient = postgres(databaseUrl);
  dbInstance = drizzlePostgres(queryClient, { schema: schemaPg });
  activeSchema = schemaPg;
} else {
  // If it's a file database, ensure the directory exists
  if (databaseUrl.startsWith('file:')) {
    const filePath = databaseUrl.replace('file:', '');
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir) && dir !== '.' && dir !== '') {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  const client = createClient({ url: databaseUrl });
  dbInstance = drizzleLibsql(client, { schema: schemaSqlite });
  activeSchema = schemaSqlite;
}

export const db = dbInstance;
export const schema = activeSchema;
