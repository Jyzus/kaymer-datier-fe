ALTER TABLE "projects" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "user_id" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_tenant_id_idx" ON "projects" ("tenant_id");