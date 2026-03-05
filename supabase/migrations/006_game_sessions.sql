-- ============================================================
-- Migration 006: Game Sessions & Multiplayer Play Mode
-- ============================================================

-- ── game_sessions ──
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL,
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  join_code CHAR(6) NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'in_progress', 'finished')),
  current_question_index INT NOT NULL DEFAULT -1,
  time_per_question_seconds INT NOT NULL DEFAULT 30,
  total_players_connected INT NOT NULL DEFAULT 0,
  quiz_name TEXT,
  quiz_config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_join_code
  ON public.game_sessions(join_code);
CREATE INDEX IF NOT EXISTS idx_game_sessions_host
  ON public.game_sessions(host_user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status
  ON public.game_sessions(status);

-- ── game_players ──
CREATE TABLE IF NOT EXISTS public.game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  join_order INT NOT NULL DEFAULT 0,
  total_score INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_players_session
  ON public.game_players(game_session_id);

-- ── game_responses ──
CREATE TABLE IF NOT EXISTS public.game_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  game_player_id UUID NOT NULL REFERENCES public.game_players(id) ON DELETE CASCADE,
  question_index INT NOT NULL,
  selected_answer TEXT NOT NULL CHECK (selected_answer IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN NOT NULL DEFAULT false,
  response_time_ms INT,
  points_awarded INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One response per player per question
  UNIQUE (game_session_id, game_player_id, question_index)
);

CREATE INDEX IF NOT EXISTS idx_game_responses_session
  ON public.game_responses(game_session_id);
CREATE INDEX IF NOT EXISTS idx_game_responses_question
  ON public.game_responses(game_session_id, question_index);

-- ── RLS ──
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_responses ENABLE ROW LEVEL SECURITY;

-- Sessions: host can do everything; anyone can read (for join code lookup)
CREATE POLICY "Hosts manage own sessions"
  ON public.game_sessions FOR ALL
  USING (host_user_id = auth.uid());

CREATE POLICY "Anyone can read sessions"
  ON public.game_sessions FOR SELECT
  USING (true);

-- Players: anyone can join (insert) and read
CREATE POLICY "Anyone can join games"
  ON public.game_players FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read players"
  ON public.game_players FOR SELECT
  USING (true);

-- Allow score updates on game_players
CREATE POLICY "Anyone can update player scores"
  ON public.game_players FOR UPDATE
  USING (true);

-- Responses: anyone can insert and read
CREATE POLICY "Anyone can submit responses"
  ON public.game_responses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read responses"
  ON public.game_responses FOR SELECT
  USING (true);

-- Enable Realtime for game tables (so broadcast channels work)
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_players;
