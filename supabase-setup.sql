-- ============================================================
-- PAINEL PESSOAL — Supabase Setup Script
-- ============================================================
-- Execute este script no SQL Editor do Supabase (supabase.com > seu projeto > SQL Editor)
-- Ele cria todas as tabelas, ativa RLS e define as políticas de segurança.
--
-- ANTES de rodar este script:
-- 1. Crie seu projeto no Supabase
-- 2. Vá em Authentication > Settings > desabilite "Allow new users to sign up"
-- 3. Crie seu usuário manualmente em Authentication > Users > Add user
-- ============================================================

-- ============================================================
-- TABELA: transactions (Financeiro)
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    value NUMERIC(12,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT DEFAULT 'Geral',
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ativar RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Políticas: apenas o dono vê/mexe nos próprios dados
CREATE POLICY "Users can view own transactions"
    ON transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
    ON transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
    ON transactions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
    ON transactions FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- TABELA: agenda_items (Briefing / Agenda do dia)
-- ============================================================
CREATE TABLE IF NOT EXISTS agenda_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    text TEXT NOT NULL,
    done BOOLEAN DEFAULT FALSE,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agenda_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agenda_items"
    ON agenda_items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own agenda_items"
    ON agenda_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agenda_items"
    ON agenda_items FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own agenda_items"
    ON agenda_items FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- TABELA: pendencias (Pendências / Tarefas)
-- ============================================================
CREATE TABLE IF NOT EXISTS pendencias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    text TEXT NOT NULL,
    done BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pendencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pendencias"
    ON pendencias FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pendencias"
    ON pendencias FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pendencias"
    ON pendencias FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pendencias"
    ON pendencias FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- TABELA: ideas (Ideias)
-- ============================================================
CREATE TABLE IF NOT EXISTS ideas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tag TEXT DEFAULT 'geral',
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ideas"
    ON ideas FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ideas"
    ON ideas FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ideas"
    ON ideas FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ideas"
    ON ideas FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- TABELA: checkpoints (Checkpoint diário)
-- ============================================================
CREATE TABLE IF NOT EXISTS checkpoints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    text TEXT NOT NULL,
    mood TEXT DEFAULT 'neutral' CHECK (mood IN ('great', 'good', 'neutral', 'bad', 'terrible')),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkpoints"
    ON checkpoints FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkpoints"
    ON checkpoints FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checkpoints"
    ON checkpoints FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own checkpoints"
    ON checkpoints FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_agenda_items_user_date ON agenda_items(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_pendencias_user ON pendencias(user_id, done);
CREATE INDEX IF NOT EXISTS idx_ideas_user_tag ON ideas(user_id, tag);
CREATE INDEX IF NOT EXISTS idx_checkpoints_user_date ON checkpoints(user_id, date DESC);

-- ============================================================
-- PRONTO! Agora:
-- 1. Confirme que RLS está "Enabled" em todas as tabelas (Table Editor > cada tabela > RLS toggle)
-- 2. Vá em Authentication > Settings e confirme que "Allow new users to sign up" está OFF
-- 3. Copie sua SUPABASE_URL e anon public key para configurar no app
-- ============================================================
