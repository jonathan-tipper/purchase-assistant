-- =============================================
-- Purchase Assistant Schema (Multi-App Prefix)
-- =============================================
-- This app uses the public schema with the 'pa_'
-- prefix to isolate it from other apps in the 
-- shared Supabase project.
-- =============================================

-- =============================================
-- Tables
-- =============================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE public.pa_profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name text,
  currency_code text DEFAULT 'GBP',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Purchase items table
CREATE TABLE public.pa_purchase_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  price numeric(12,2) NOT NULL,
  lifespan_years numeric(5,2) NOT NULL,
  uses_per_week numeric(7,2) NOT NULL,
  minutes_per_use numeric(7,2) NOT NULL,
  depreciation_rate_percent numeric(5,2) NOT NULL,
  category text,
  notes text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Purchase journal table
CREATE TABLE public.pa_purchase_journal (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  purchase_item_id uuid REFERENCES public.pa_purchase_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  purchase_date date NOT NULL,
  actual_price numeric(12,2) NOT NULL,
  satisfaction_score integer CHECK (satisfaction_score BETWEEN 1 AND 10),
  notes text,
  would_buy_again boolean,
  actual_uses_per_week numeric(7,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI conversations table
CREATE TABLE public.pa_ai_conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  context_type text NOT NULL, -- 'advisor', 'comparison', 'journal_review'
  messages jsonb NOT NULL DEFAULT '[]',
  related_item_ids uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User preferences table
CREATE TABLE public.pa_user_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  theme text DEFAULT 'system',
  preferred_categories text[] DEFAULT '{}',
  budget_monthly numeric(12,2),
  value_priorities jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- Indexes
-- =============================================

CREATE INDEX idx_pa_purchase_items_user_id ON public.pa_purchase_items(user_id);
CREATE INDEX idx_pa_purchase_journal_user_id ON public.pa_purchase_journal(user_id);
CREATE INDEX idx_pa_ai_conversations_user_id ON public.pa_ai_conversations(user_id);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

ALTER TABLE public.pa_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pa_purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pa_purchase_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pa_ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pa_user_preferences ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile pa"
  ON public.pa_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile pa"
  ON public.pa_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile pa"
  ON public.pa_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Purchase items policy
CREATE POLICY "Users can CRUD own purchase items pa"
  ON public.pa_purchase_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Purchase journal policy
CREATE POLICY "Users can CRUD own journal entries pa"
  ON public.pa_purchase_journal FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- AI conversations policy
CREATE POLICY "Users can CRUD own conversations pa"
  ON public.pa_ai_conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- User preferences policy
CREATE POLICY "Users can CRUD own preferences pa"
  ON public.pa_user_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- Functions & Triggers
-- =============================================

-- Auto-create profile when a new user signs up
CREATE OR REPLACE FUNCTION public.pa_handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.pa_profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', new.email));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: create profile on signup
CREATE TRIGGER pa_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.pa_handle_new_user();

-- Function to auto-update updated_at column
CREATE OR REPLACE FUNCTION public.pa_update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_pa_profiles_updated_at
  BEFORE UPDATE ON public.pa_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.pa_update_updated_at_column();

CREATE TRIGGER update_pa_purchase_items_updated_at
  BEFORE UPDATE ON public.pa_purchase_items
  FOR EACH ROW EXECUTE PROCEDURE public.pa_update_updated_at_column();

CREATE TRIGGER update_pa_purchase_journal_updated_at
  BEFORE UPDATE ON public.pa_purchase_journal
  FOR EACH ROW EXECUTE PROCEDURE public.pa_update_updated_at_column();

CREATE TRIGGER update_pa_ai_conversations_updated_at
  BEFORE UPDATE ON public.pa_ai_conversations
  FOR EACH ROW EXECUTE PROCEDURE public.pa_update_updated_at_column();

CREATE TRIGGER update_pa_user_preferences_updated_at
  BEFORE UPDATE ON public.pa_user_preferences
  FOR EACH ROW EXECUTE PROCEDURE public.pa_update_updated_at_column();
