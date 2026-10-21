CREATE TABLE IF NOT EXISTS `nutrition_days` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_nutrition_days_user_date` ON `nutrition_days` (`user_id`,`date`);