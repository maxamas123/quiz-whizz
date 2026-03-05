-- 005_security_fixes.sql
-- Security hardening: add missing RLS policies, votes column, and cleanup.

-- ──────────────────────────────────────────
-- 1. Add missing UPDATE policy on quizzes table
--    Without this, any authenticated user could rename or
--    modify ANY quiz, not just their own.
-- ──────────────────────────────────────────

CREATE POLICY "Users can update own quizzes"
  ON public.quizzes FOR UPDATE
  USING (user_id = auth.uid());

-- ──────────────────────────────────────────
-- 2. Add missing DELETE policy on questions table
--    Questions cascade-delete via FK, but an explicit policy
--    prevents direct deletion of another user's questions.
-- ──────────────────────────────────────────

CREATE POLICY "Users can delete own quiz questions"
  ON public.questions FOR DELETE
  USING (quiz_id IN (SELECT id FROM public.quizzes WHERE user_id = auth.uid()));

-- ──────────────────────────────────────────
-- 3. Add votes JSONB column to quizzes table
--    Stores per-question vote data: { questionNumber: 1|-1 }
-- ──────────────────────────────────────────

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS votes jsonb DEFAULT '{}'::jsonb;
