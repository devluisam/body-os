import { sqliteTable, text, primaryKey, index } from "drizzle-orm/sqlite-core";
export const users = sqliteTable(
  "users",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.userId] }),
    index("idx_users_user_date").on(t.userId, t.date),
  ],
);
export const goals = sqliteTable(
  "goals",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.userId] }),
    index("idx_goals_user_date").on(t.userId, t.date),
  ],
);
export const body_metrics = sqliteTable(
  "body_metrics",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.userId] }),
    index("idx_body_metrics_user_date").on(t.userId, t.date),
  ],
);
export const weight_logs = sqliteTable(
  "weight_logs",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.userId] }),
    index("idx_weight_logs_user_date").on(t.userId, t.date),
  ],
);
export const body_measurements = sqliteTable(
  "body_measurements",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.userId] }),
    index("idx_body_measurements_user_date").on(t.userId, t.date),
  ],
);
export const progress_photos = sqliteTable(
  "progress_photos",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.userId] }),
    index("idx_progress_photos_user_date").on(t.userId, t.date),
  ],
);
export const foods = sqliteTable(
  "foods",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.userId] }),
    index("idx_foods_user_date").on(t.userId, t.date),
  ],
);
export const meals = sqliteTable(
  "meals",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.userId] }),
    index("idx_meals_user_date").on(t.userId, t.date),
  ],
);
export const meal_items = sqliteTable(
  "meal_items",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.userId] }),
    index("idx_meal_items_user_date").on(t.userId, t.date),
  ],
);
export const nutrition_targets = sqliteTable(
  "nutrition_targets",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.userId] }),
    index("idx_nutrition_targets_user_date").on(t.userId, t.date),
  ],
);
export const jiujitsu_sessions = sqliteTable(
  "jiujitsu_sessions",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.userId] }),
    index("idx_jiujitsu_sessions_user_date").on(t.userId, t.date),
  ],
);
export const gym_sessions = sqliteTable(
  "gym_sessions",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.userId] }),
    index("idx_gym_sessions_user_date").on(t.userId, t.date),
  ],
);
export const gym_exercises = sqliteTable(
  "gym_exercises",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.userId] }),
    index("idx_gym_exercises_user_date").on(t.userId, t.date),
  ],
);
export const cardio_sessions = sqliteTable(
  "cardio_sessions",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.userId] }),
    index("idx_cardio_sessions_user_date").on(t.userId, t.date),
  ],
);
export const daily_checkins = sqliteTable(
  "daily_checkins",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.userId] }),
    index("idx_daily_checkins_user_date").on(t.userId, t.date),
  ],
);
export const sleep_logs = sqliteTable(
  "sleep_logs",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.userId] }),
    index("idx_sleep_logs_user_date").on(t.userId, t.date),
  ],
);
export const water_logs = sqliteTable(
  "water_logs",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.userId] }),
    index("idx_water_logs_user_date").on(t.userId, t.date),
  ],
);
export const competition_events = sqliteTable(
  "competition_events",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.userId] }),
    index("idx_competition_events_user_date").on(t.userId, t.date),
  ],
);
export const competition_categories = sqliteTable(
  "competition_categories",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.userId] }),
    index("idx_competition_categories_user_date").on(t.userId, t.date),
  ],
);
export const weekly_reports = sqliteTable(
  "weekly_reports",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.userId] }),
    index("idx_weekly_reports_user_date").on(t.userId, t.date),
  ],
);
export const ai_conversations = sqliteTable(
  "ai_conversations",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.userId] }),
    index("idx_ai_conversations_user_date").on(t.userId, t.date),
  ],
);
export const settings = sqliteTable(
  "settings",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.userId] }),
    index("idx_settings_user_date").on(t.userId, t.date),
  ],
);
