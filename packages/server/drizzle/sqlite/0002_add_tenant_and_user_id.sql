ALTER TABLE `projects` ADD `tenant_id` text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `user_id` text;
