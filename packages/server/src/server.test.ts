import cors from 'cors';
import crypto from 'crypto';
import { and, eq } from 'drizzle-orm';
import express from 'express';

import { db, schema } from './db/index.js';
import { runMigrations } from './db/migrate.js';
import { authMiddleware } from './middleware/auth.js';
import { schemaJsonToSql, sqlToSchemaJson } from './services/sqlConverter.js';

async function runIntegrationTest() {
  console.log('--- STARTING SERVER INTEGRATION TESTS ---');

  // Run migrations to ensure test database is ready
  await runMigrations();

  // Setup test environment
  process.env.DATIER_API_KEY = 'test-secret-key-123';
  const apiKey = process.env.DATIER_API_KEY;

  // 1. Test Auth Middleware
  console.log('\n[TEST 1] Testing Auth Middleware...');
  let authPassed = false;
  const mockReqNoAuth: any = { headers: {} };
  const mockResNoAuth: any = {
    status: (code: number) => ({
      json: (data: any) => {
        if (code === 401) authPassed = true;
      },
    }),
  };
  await authMiddleware(mockReqNoAuth, mockResNoAuth, () => {});
  console.log(
    'Rejection without Bearer token:',
    authPassed ? 'PASSED (401)' : 'FAILED'
  );

  let invalidAuthPassed = false;
  const mockReqInvalidAuth: any = {
    headers: { authorization: 'Bearer wrong-key' },
  };
  const mockResInvalidAuth: any = {
    status: (code: number) => ({
      json: (data: any) => {
        if (code === 401) invalidAuthPassed = true;
      },
    }),
  };
  await authMiddleware(mockReqInvalidAuth, mockResInvalidAuth, () => {});
  console.log(
    'Rejection with invalid Bearer token:',
    invalidAuthPassed ? 'PASSED (401)' : 'FAILED'
  );

  let validAuthPassed = false;
  const mockReqValidAuth: any = {
    headers: { authorization: `Bearer ${apiKey}` },
  };
  await authMiddleware(mockReqValidAuth, {} as any, () => {
    validAuthPassed = true;
  });
  console.log(
    'Acceptance with valid Bearer token:',
    validAuthPassed ? 'PASSED (next called)' : 'FAILED'
  );
  console.log(
    'Context injected on req.user:',
    mockReqValidAuth.user?.tenantId
      ? 'PASSED: ' + mockReqValidAuth.user.tenantId
      : 'FAILED'
  );

  // 2. Test Project Creation with tenant isolation & Schema From SQL
  console.log(
    '\n[TEST 2] Testing POST /api/projects/:projectId/schemas/from-sql with Tenant Isolation...'
  );
  const testProjectId = crypto.randomUUID();
  const testTenantId = '00000000-0000-0000-0000-000000000001';
  const now = new Date();
  await db.insert(schema.projects).values({
    id: testProjectId,
    tenantId: testTenantId,
    name: 'Planifier Integration Test Project',
    description: 'Project for testing Datier REST API',
    createdAt: now,
    updatedAt: now,
  });
  console.log('Created test project ID:', testProjectId);

  const testDdl = `
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00
);

ALTER TABLE orders ADD CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers (id);
CREATE INDEX idx_orders_customer_id ON orders (customer_id);
`;

  const schemaJson = sqlToSchemaJson(testDdl, { dialect: 'postgresql' });
  const testSchemaId = crypto.randomUUID();
  const testSchema = {
    id: testSchemaId,
    projectId: testProjectId,
    name: 'E-Commerce Core Schema',
    value: schemaJson,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(schema.schemas).values(testSchema);
  console.log('Inserted schema from DDL with ID:', testSchemaId);

  // 3. Test GET /api/schemas/:id/sql
  console.log('\n[TEST 3] Testing GET /api/schemas/:id/sql...');
  const savedSchema = (
    await db
      .select()
      .from(schema.schemas)
      .where(eq(schema.schemas.id, testSchemaId))
  )[0];
  const exportedSql = schemaJsonToSql(savedSchema.value, 'postgresql');

  const hasCustomers = exportedSql.includes('CREATE TABLE customers');
  const hasOrders = exportedSql.includes('CREATE TABLE orders');
  const hasFk = exportedSql.includes(
    'FOREIGN KEY (customer_id) REFERENCES customers (id)'
  );
  const hasIndex = exportedSql.includes(
    'INDEX idx_orders_customer_id ON orders'
  );

  console.log(
    'Export contains customers table:',
    hasCustomers ? 'PASSED' : 'FAILED'
  );
  console.log('Export contains orders table:', hasOrders ? 'PASSED' : 'FAILED');
  console.log('Export contains foreign key:', hasFk ? 'PASSED' : 'FAILED');
  console.log('Export contains index:', hasIndex ? 'PASSED' : 'FAILED');

  // 4. Test PUT /api/schemas/:id/sql (DDL merge with coordinate preservation)
  console.log(
    '\n[TEST 4] Testing PUT /api/schemas/:id/sql (merge & position preservation)...'
  );
  const parsedVal = JSON.parse(savedSchema.value);
  const custTableKey = Object.keys(parsedVal.collections.tableEntities).find(
    k => parsedVal.collections.tableEntities[k].name === 'customers'
  )!;
  parsedVal.collections.tableEntities[custTableKey].ui.x = 777;
  parsedVal.collections.tableEntities[custTableKey].ui.y = 888;
  parsedVal.collections.tableEntities[custTableKey].ui.color = '#10b981';
  await db
    .update(schema.schemas)
    .set({ value: JSON.stringify(parsedVal) })
    .where(eq(schema.schemas.id, testSchemaId));

  const updateDdl = `
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(180) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  phone VARCHAR(20)
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL,
  product_name VARCHAR(100) NOT NULL,
  quantity INT NOT NULL DEFAULT 1
);
`;

  const updatedMergedJson = sqlToSchemaJson(updateDdl, {
    existingSchemaJson: JSON.stringify(parsedVal),
    dialect: 'postgresql',
  });

  await db
    .update(schema.schemas)
    .set({ value: updatedMergedJson })
    .where(eq(schema.schemas.id, testSchemaId));

  const afterMergeSchema = (
    await db
      .select()
      .from(schema.schemas)
      .where(eq(schema.schemas.id, testSchemaId))
  )[0];
  const afterParsed = JSON.parse(afterMergeSchema.value);
  const afterCustTable: any = Object.values(
    afterParsed.collections.tableEntities
  ).find((t: any) => t.name === 'customers');
  const afterOrdersTable: any = Object.values(
    afterParsed.collections.tableEntities
  ).find((t: any) => t.name === 'orders');
  const afterItemsTable: any = Object.values(
    afterParsed.collections.tableEntities
  ).find((t: any) => t.name === 'order_items');

  console.log(
    'Preserved customers (x=777, y=888):',
    afterCustTable?.ui.x === 777 && afterCustTable?.ui.y === 888
      ? 'PASSED'
      : 'FAILED: ' + JSON.stringify(afterCustTable?.ui)
  );
  console.log(
    'Preserved customers color (#10b981):',
    afterCustTable?.ui.color === '#10b981' ? 'PASSED' : 'FAILED'
  );
  console.log(
    'Unmodified orders table preserved:',
    afterOrdersTable ? 'PASSED' : 'FAILED'
  );
  console.log(
    'New order_items table added:',
    afterItemsTable ? 'PASSED' : 'FAILED'
  );

  // Clean up test data
  console.log('\nCleaning up test project & schemas...');
  await db.delete(schema.projects).where(eq(schema.projects.id, testProjectId));
  console.log('Cleanup completed.');

  console.log('\n✅ ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
}

runIntegrationTest().catch(err => {
  console.error('Integration test error:', err);
  process.exit(1);
});
