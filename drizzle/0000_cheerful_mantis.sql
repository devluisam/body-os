CREATE TABLE `ai_conversations` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_ai_conversations_user_date` ON `ai_conversations` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `body_measurements` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_body_measurements_user_date` ON `body_measurements` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `body_metrics` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_body_metrics_user_date` ON `body_metrics` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `cardio_sessions` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_cardio_sessions_user_date` ON `cardio_sessions` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `competition_categories` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_competition_categories_user_date` ON `competition_categories` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `competition_events` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_competition_events_user_date` ON `competition_events` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `daily_checkins` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_daily_checkins_user_date` ON `daily_checkins` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `foods` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_foods_user_date` ON `foods` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_goals_user_date` ON `goals` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `gym_exercises` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_gym_exercises_user_date` ON `gym_exercises` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `gym_sessions` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_gym_sessions_user_date` ON `gym_sessions` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `jiujitsu_sessions` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_jiujitsu_sessions_user_date` ON `jiujitsu_sessions` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `meal_items` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_meal_items_user_date` ON `meal_items` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `meals` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_meals_user_date` ON `meals` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `nutrition_targets` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_nutrition_targets_user_date` ON `nutrition_targets` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `progress_photos` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_progress_photos_user_date` ON `progress_photos` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_settings_user_date` ON `settings` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `sleep_logs` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_sleep_logs_user_date` ON `sleep_logs` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_users_user_date` ON `users` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `water_logs` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_water_logs_user_date` ON `water_logs` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `weekly_reports` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_weekly_reports_user_date` ON `weekly_reports` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `weight_logs` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_weight_logs_user_date` ON `weight_logs` (`user_id`,`date`);