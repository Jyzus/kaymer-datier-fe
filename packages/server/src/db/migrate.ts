import { migrate as migrateSqlite } from 'drizzle-orm/libsql/migrator';
import { migrate as migratePg } from 'drizzle-orm/postgres-js/migrator';
import path from 'path';
import { fileURLToPath } from 'url';

import { db, isPg } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  console.log('Running migrations...');
  try {
    if (isPg) {
      const migrationsFolder = path.resolve(__dirname, '../../drizzle/pg');
      console.log(`Applying Postgres migrations from ${migrationsFolder}...`);
      await migratePg(db, { migrationsFolder });
    } else {
      const migrationsFolder = path.resolve(__dirname, '../../drizzle/sqlite');
      console.log(`Applying SQLite migrations from ${migrationsFolder}...`);
      await migrateSqlite(db, { migrationsFolder });
    }
    console.log('Migrations applied successfully!');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

// If run directly via tsx/node
const isDirectRun =
  process.argv[1] === __filename ||
  process.argv[1]?.endsWith('migrate.ts') ||
  process.argv[1]?.endsWith('migrate.js');
if (isDirectRun) {
  runMigrations().then(() => process.exit(0));
}
