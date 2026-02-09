-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  currency_code text default 'GBP',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Purchase items table
create table public.purchase_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  price numeric(12,2) not null,
  lifespan_years numeric(5,2) not null,
  uses_per_week numeric(7,2) not null,
  minutes_per_use numeric(7,2) not null,
  depreciation_rate_percent numeric(5,2) not null,
  category text,
  notes text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.purchase_items enable row level security;

create policy "Users can CRUD own purchase items"
  on public.purchase_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_purchase_items_user_id on public.purchase_items(user_id);

-- Purchase journal table
create table public.purchase_journal (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  purchase_item_id uuid references public.purchase_items(id) on delete set null,
  name text not null,
  purchase_date date not null,
  actual_price numeric(12,2) not null,
  satisfaction_score integer check (satisfaction_score between 1 and 10),
  notes text,
  would_buy_again boolean,
  actual_uses_per_week numeric(7,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.purchase_journal enable row level security;

create policy "Users can CRUD own journal entries"
  on public.purchase_journal for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_purchase_journal_user_id on public.purchase_journal(user_id);

-- AI conversations table
create table public.ai_conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  context_type text not null, -- 'advisor', 'comparison', 'journal_review'
  messages jsonb not null default '[]',
  related_item_ids uuid[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ai_conversations enable row level security;

create policy "Users can CRUD own conversations"
  on public.ai_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_ai_conversations_user_id on public.ai_conversations(user_id);

-- User preferences table
create table public.user_preferences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  theme text default 'system',
  preferred_categories text[] default '{}',
  budget_monthly numeric(12,2),
  value_priorities jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_preferences enable row level security;

create policy "Users can CRUD own preferences"
  on public.user_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Updated_at trigger function
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at_column();

create trigger update_purchase_items_updated_at
  before update on public.purchase_items
  for each row execute procedure public.update_updated_at_column();

create trigger update_purchase_journal_updated_at
  before update on public.purchase_journal
  for each row execute procedure public.update_updated_at_column();

create trigger update_ai_conversations_updated_at
  before update on public.ai_conversations
  for each row execute procedure public.update_updated_at_column();

create trigger update_user_preferences_updated_at
  before update on public.user_preferences
  for each row execute procedure public.update_updated_at_column();
