-- PostgreSQL / Supabase migration blueprint. Not the active D1 backend.
-- Apply to a new Supabase project only after reviewing adapter/migration requirements.
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text, birth_date date, height_cm numeric check(height_cm > 0),
  sex text, lactose_intolerant boolean default true,
  routine jsonb not null default '{}', created_at timestamptz default now()
);
create table public.goals (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade,
 level text not null check(level in ('principal','esportivo','temporário')), title text not null,
 active boolean not null default true, target_bf numeric, target_weight numeric,
 event_id uuid, created_at timestamptz default now()
);
create table public.weight_logs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade,
 date date not null, weight_kg numeric not null check(weight_kg between 30 and 250),
 source text, created_at timestamptz default now(), unique(user_id,date)
);
create table public.body_measurements (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade,
 date date not null, waist_cm numeric, abdomen_cm numeric, neck_cm numeric, hip_cm numeric,
 chest_cm numeric, arm_right_cm numeric, arm_left_cm numeric, thigh_right_cm numeric, thigh_left_cm numeric
);
create table public.body_metrics (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade,
 date date not null, bf numeric not null check(bf between 3 and 60), method text not null,
 weight_log_id uuid references public.weight_logs on delete set null, notes text
);
create table public.progress_photos (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade,
 date date not null, view text not null, object_path text not null, mime_type text not null
);
create table public.foods (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade,
 name text not null, portion numeric not null check(portion>0), unit text default 'g',
 calories numeric not null check(calories>=0), protein numeric not null check(protein>=0),
 carbs numeric not null check(carbs>=0), fat numeric not null check(fat>=0), fiber numeric not null check(fiber>=0),
 sodium_mg numeric, source text, unique(id,user_id)
);
create table public.meals (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade,
 date date not null, time time not null, name text not null, unique(id,user_id)
);
create table public.meal_items (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade,
 meal_id uuid not null, food_id uuid not null, grams numeric not null check(grams>0),
 nutrition_snapshot jsonb not null,
 foreign key(meal_id,user_id) references public.meals(id,user_id) on delete cascade,
 foreign key(food_id,user_id) references public.foods(id,user_id)
);
create table public.nutrition_targets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade,
 date date not null, calories numeric not null, protein numeric not null, carbs numeric not null,
 fat numeric not null, fiber numeric, rationale text, user_confirmed boolean not null default false,
 unique(user_id,date)
);
create table public.jiujitsu_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade,
 date date not null, duration_min numeric not null, rounds integer, round_minutes numeric,
 rpe numeric check(rpe between 1 and 10), cardio numeric, strength numeric, technique numeric,
 energy numeric, recovery numeric, performance numeric, grip numeric, fatigue_at_min numeric,
 heart_rate numeric, techniques text
);
create table public.gym_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade,
 date date not null, duration_min numeric not null, notes text, unique(id,user_id)
);
create table public.gym_exercises (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade,
 session_id uuid, date date not null, exercise text not null, load_kg numeric not null,
 reps integer not null, sets integer not null, rir numeric, rpe numeric,
 foreign key(session_id,user_id) references public.gym_sessions(id,user_id) on delete cascade
);
create table public.cardio_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade,
 date date not null, mode text not null, type text, duration_min numeric not null,
 heart_rate numeric, distance_km numeric, speed_kmh numeric, incline numeric, rpe numeric
);
create table public.daily_checkins (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade,
 date date not null, hours numeric, quality numeric, hunger numeric, energy numeric, stress numeric,
 soreness numeric, motivation numeric, fatigue numeric, performance numeric, steps integer,
 unique(user_id,date)
);
create table public.sleep_logs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade,
 date date not null, bedtime time, waketime time, hours numeric, quality numeric, unique(user_id,date)
);
create table public.water_logs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade,
 date date not null, ml numeric not null check(ml>0), created_at timestamptz default now()
);
create table public.competition_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade,
 name text not null, event_date date not null, category text, weight_limit numeric,
 with_gi boolean not null, gi_kg numeric, weigh_date date, weigh_time time,
 minutes_until_fight numeric, reference_weight numeric, archived boolean default false
);
alter table public.goals add constraint goals_event_fk foreign key(event_id) references public.competition_events on delete set null;
create table public.competition_categories (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade,
 name text not null, weight_limit numeric not null, with_gi boolean not null
);
create table public.weekly_reports (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade,
 week_end date not null, snapshot jsonb not null, created_at timestamptz default now(), unique(user_id,week_end)
);
create table public.ai_conversations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade,
 message text not null, response text not null, mode text not null, created_at timestamptz default now()
);
create table public.settings (
 user_id uuid primary key references public.users on delete cascade, name text default 'BODY OS',
 phase text, step_target integer default 8000, water_target_ml numeric default 2500,
 bf_goal numeric, theme text default 'dark', updated_at timestamptz default now()
);
alter table public.users enable row level security;
create policy own_profile on public.users for all to authenticated using (auth.uid()=id) with check (auth.uid()=id);
do $$ declare t text; begin
 foreach t in array array['goals','weight_logs','body_measurements','body_metrics','progress_photos','foods','meals','meal_items','nutrition_targets','jiujitsu_sessions','gym_sessions','gym_exercises','cardio_sessions','daily_checkins','sleep_logs','water_logs','competition_events','competition_categories','weekly_reports','ai_conversations','settings'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy own_records on public.%I for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id)',t);
 if t <> 'settings' then execute format('create index %I on public.%I (user_id)', 'idx_'||t||'_owner', t); end if;
 end loop;
end $$;
-- For Supabase Storage create a PRIVATE progress-photos bucket and policies matching
-- auth.uid() to the first folder segment. Never use a public bucket for body photos.
-- An adapter must map D1 text IDs to UUIDs, payload fields to normalized columns,
-- platform identity to Supabase auth.uid(), and R2 objects to private Storage paths.
