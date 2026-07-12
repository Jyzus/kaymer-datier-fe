import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

const provider = process.env.DB_PROVIDER || 'sqlite';
const databaseUrl = process.env.DATABASE_URL || 'file:./local.db';

export default provider === 'postgres'
  ? defineConfig({
      schema: './src/db/schema.pg.ts',
      out: './drizzle/pg',
      dialect: 'postgresql',
      dbCredentials: {
        url: databaseUrl,
      },
    })
  : defineConfig({
      schema: './src/db/schema.sqlite.ts',
      out: './drizzle/sqlite',
      dialect: 'sqlite',
      dbCredentials: {
        url: databaseUrl,
      },
    });
