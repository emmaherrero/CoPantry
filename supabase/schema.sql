-- CoPantry Database Schema
-- Run this in the Supabase Dashboard SQL Editor after creating your project.

-- ============================================================
-- ENUMS
-- ============================================================

create type public.member_role as enum ('owner', 'member');
create type public.storage_location as enum ('fridge', 'freezer', 'pantry');

-- ============================================================
-- TABLES
-- ============================================================

-- Households: a shared living group
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  created_at timestamptz not null default now()
);

-- Profiles: extends auth.users (auto-created via trigger)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Household members: join table with role
create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  role public.member_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (household_id, user_id),
  unique (user_id)
);

-- Food items: scanned / manually entered inventory
create table public.food_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  barcode text,
  product_name text not null,
  brand text,
  image_url text,
  nutrition_json jsonb,
  quantity numeric not null default 1,
  unit text not null default 'unit',
  storage_location public.storage_location not null default 'fridge',
  expiration_date date,
  added_by uuid not null references public.profiles on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Recipes: AI-generated or user-created
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  title text not null,
  ingredients jsonb not null default '[]'::jsonb,
  instructions jsonb not null default '[]'::jsonb,
  servings int,
  prep_time int, -- minutes
  created_by uuid not null references public.profiles on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_food_items_household on public.food_items (household_id);
create index idx_food_items_expiration on public.food_items (expiration_date);
create index idx_food_items_barcode on public.food_items (barcode);
create index idx_recipes_household on public.recipes (household_id);
create index idx_household_members_user on public.household_members (user_id);

-- ============================================================
-- HELPER FUNCTION
-- ============================================================

-- Returns the current user's household id (first match).
create or replace function public.get_my_household_id()
returns uuid
language sql
stable
security definer
as $$
  select household_id
  from public.household_members
  where user_id = auth.uid()
  limit 1;
$$;

-- ============================================================
-- AUTO-CREATE PROFILE TRIGGER
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.household_members enable row level security;
alter table public.food_items enable row level security;
alter table public.recipes enable row level security;

-- Profiles: users can read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Members can view household profiles"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.household_members viewer_membership
      join public.household_members target_membership
        on viewer_membership.household_id = target_membership.household_id
      where viewer_membership.user_id = auth.uid()
        and target_membership.user_id = public.profiles.id
    )
  );

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Households: members can view their household
create policy "Members can view household"
  on public.households for select
  using (id = public.get_my_household_id());

create policy "Authenticated users can create household"
  on public.households for insert
  to authenticated
  with check (true);

create policy "Members can update household"
  on public.households for update
  using (id = public.get_my_household_id())
  with check (id = public.get_my_household_id());

-- Household members: members see co-members; users can join
create policy "Members can view co-members"
  on public.household_members for select
  using (household_id = public.get_my_household_id());

create policy "Authenticated users can join household"
  on public.household_members for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can leave household"
  on public.household_members for delete
  using (user_id = auth.uid());

-- Food items: scoped to household
create policy "Members can view food items"
  on public.food_items for select
  using (household_id = public.get_my_household_id());

create policy "Members can insert food items"
  on public.food_items for insert
  to authenticated
  with check (household_id = public.get_my_household_id());

create policy "Members can update food items"
  on public.food_items for update
  using (household_id = public.get_my_household_id());

create policy "Members can delete food items"
  on public.food_items for delete
  using (household_id = public.get_my_household_id());

-- Recipes: scoped to household
create policy "Members can view recipes"
  on public.recipes for select
  using (household_id = public.get_my_household_id());

create policy "Members can insert recipes"
  on public.recipes for insert
  to authenticated
  with check (household_id = public.get_my_household_id());

create policy "Members can update recipes"
  on public.recipes for update
  using (household_id = public.get_my_household_id());

create policy "Members can delete recipes"
  on public.recipes for delete
  using (household_id = public.get_my_household_id());

-- ============================================================
-- REALTIME
-- ============================================================

alter publication supabase_realtime add table public.food_items;
