// src/lib/gameApi.ts
//
// All game-session CRUD operations for multiplayer Play Mode.

import { supabase } from "@/lib/supabase";
import type {
  GameSession,
  GamePlayer,
  GameResponse,
  LeaderboardEntry,
  PlayerQuestionResult,
} from "@/types/gameSession";

// ─── Helpers ─────────────────────────────────────────────

/** Generate a 6-character alphanumeric join code */
function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapSession(row: any): GameSession {
  return {
    id: row.id,
    quizId: row.quiz_id,
    hostUserId: row.host_user_id,
    joinCode: row.join_code,
    status: row.status,
    currentQuestionIndex: row.current_question_index,
    timePerQuestionSeconds: row.time_per_question_seconds,
    totalPlayersConnected: row.total_players_connected,
    createdAt: row.created_at,
    startedAt: row.started_at ?? undefined,
    finishedAt: row.finished_at ?? undefined,
    quizConfig: row.quiz_config ?? undefined,
    quizName: row.quiz_name ?? undefined,
  };
}

function mapPlayer(row: any): GamePlayer {
  return {
    id: row.id,
    gameSessionId: row.game_session_id,
    userId: row.user_id,
    displayName: row.display_name,
    joinOrder: row.join_order,
    totalScore: row.total_score,
    createdAt: row.created_at,
  };
}

function mapResponse(row: any): GameResponse {
  return {
    id: row.id,
    gameSessionId: row.game_session_id,
    gamePlayerId: row.game_player_id,
    questionIndex: row.question_index,
    selectedAnswer: row.selected_answer,
    isCorrect: row.is_correct,
    responseTimeMs: row.response_time_ms,
    pointsAwarded: row.points_awarded,
    createdAt: row.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Scoring ─────────────────────────────────────────────

/**
 * Calculate points for a response.
 * Correct: 1000 base + up to 500 speed bonus (linear, capped at timeLimit).
 * Incorrect / no answer: 0.
 */
export function calculatePoints(
  isCorrect: boolean,
  responseTimeMs: number | null,
  timeLimitMs: number
): number {
  if (!isCorrect) return 0;
  const base = 1000;
  if (responseTimeMs == null || responseTimeMs >= timeLimitMs) return base;
  // Speed bonus: faster = more points, linear scale
  const fraction = Math.max(0, 1 - responseTimeMs / timeLimitMs);
  return base + Math.round(fraction * 500);
}

// ─── Game Session CRUD ───────────────────────────────────

export async function createGameSession(
  quizId: string,
  hostUserId: string,
  timePerQuestionSeconds: number,
  quizName: string,
  quizConfig: unknown
): Promise<GameSession> {
  const joinCode = generateJoinCode();

  const { data, error } = await supabase
    .from("game_sessions")
    .insert({
      quiz_id: quizId,
      host_user_id: hostUserId,
      join_code: joinCode,
      time_per_question_seconds: timePerQuestionSeconds,
      quiz_name: quizName,
      quiz_config: quizConfig,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create game: ${error.message}`);
  return mapSession(data);
}

export async function getGameSession(sessionId: string): Promise<GameSession> {
  const { data, error } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error) throw new Error(`Session not found: ${error.message}`);
  return mapSession(data);
}

export async function lookupSessionByCode(
  joinCode: string
): Promise<GameSession> {
  const { data, error } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("join_code", joinCode.toUpperCase().trim())
    .single();

  if (error || !data) throw new Error("Game code not found");
  return mapSession(data);
}

export async function startGame(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("game_sessions")
    .update({
      status: "in_progress",
      started_at: new Date().toISOString(),
      current_question_index: 0,
    })
    .eq("id", sessionId);

  if (error) throw new Error(`Failed to start game: ${error.message}`);
}

export async function advanceQuestion(
  sessionId: string,
  questionIndex: number
): Promise<void> {
  const { error } = await supabase
    .from("game_sessions")
    .update({ current_question_index: questionIndex })
    .eq("id", sessionId);

  if (error) throw new Error(`Failed to advance question: ${error.message}`);
}

export async function finishGame(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("game_sessions")
    .update({
      status: "finished",
      finished_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) throw new Error(`Failed to finish game: ${error.message}`);
}

// ─── Players ─────────────────────────────────────────────

export async function joinGameSession(
  joinCode: string,
  displayName: string,
  userId?: string
): Promise<{ session: GameSession; player: GamePlayer }> {
  const session = await lookupSessionByCode(joinCode);

  if (session.status !== "waiting") {
    throw new Error("This game has already started");
  }

  // Get current player count for join_order
  const { count } = await supabase
    .from("game_players")
    .select("id", { count: "exact", head: true })
    .eq("game_session_id", session.id);

  const joinOrder = (count ?? 0) + 1;

  const { data, error } = await supabase
    .from("game_players")
    .insert({
      game_session_id: session.id,
      user_id: userId ?? null,
      display_name: displayName.trim(),
      join_order: joinOrder,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to join game: ${error.message}`);

  // Update player count on session
  await supabase
    .from("game_sessions")
    .update({ total_players_connected: joinOrder })
    .eq("id", session.id);

  return { session, player: mapPlayer(data) };
}

export async function getSessionPlayers(
  sessionId: string
): Promise<GamePlayer[]> {
  const { data, error } = await supabase
    .from("game_players")
    .select("*")
    .eq("game_session_id", sessionId)
    .order("join_order", { ascending: true });

  if (error) return [];
  return (data ?? []).map(mapPlayer);
}

export async function updatePlayerScore(
  playerId: string,
  totalScore: number
): Promise<void> {
  await supabase
    .from("game_players")
    .update({ total_score: totalScore })
    .eq("id", playerId);
}

// ─── Responses ───────────────────────────────────────────

export async function submitPlayerResponse(
  gameSessionId: string,
  gamePlayerId: string,
  questionIndex: number,
  selectedAnswer: string,
  isCorrect: boolean,
  responseTimeMs: number | null,
  timeLimitMs: number
): Promise<GameResponse> {
  const pointsAwarded = calculatePoints(isCorrect, responseTimeMs, timeLimitMs);

  const { data, error } = await supabase
    .from("game_responses")
    .insert({
      game_session_id: gameSessionId,
      game_player_id: gamePlayerId,
      question_index: questionIndex,
      selected_answer: selectedAnswer,
      is_correct: isCorrect,
      response_time_ms: responseTimeMs,
      points_awarded: pointsAwarded,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to submit response: ${error.message}`);
  return mapResponse(data);
}

// ─── Leaderboard ─────────────────────────────────────────

export async function getLeaderboard(
  sessionId: string
): Promise<LeaderboardEntry[]> {
  // Aggregate all responses by player
  const { data: responses, error: respErr } = await supabase
    .from("game_responses")
    .select("game_player_id, points_awarded")
    .eq("game_session_id", sessionId);

  if (respErr) return [];

  const { data: players, error: playErr } = await supabase
    .from("game_players")
    .select("id, display_name")
    .eq("game_session_id", sessionId);

  if (playErr) return [];

  const nameMap = new Map<string, string>();
  for (const p of players ?? []) {
    nameMap.set(p.id, p.display_name);
  }

  const scoreMap = new Map<string, number>();
  for (const r of responses ?? []) {
    const current = scoreMap.get(r.game_player_id) ?? 0;
    scoreMap.set(r.game_player_id, current + (r.points_awarded ?? 0));
  }

  // Include players with 0 score
  for (const p of players ?? []) {
    if (!scoreMap.has(p.id)) scoreMap.set(p.id, 0);
  }

  const sorted = Array.from(scoreMap.entries())
    .map(([playerId, totalScore]) => ({
      playerId,
      displayName: nameMap.get(playerId) ?? "Unknown",
      totalScore,
      rank: 0,
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  // Assign ranks
  sorted.forEach((entry, i) => {
    entry.rank = i + 1;
  });

  return sorted;
}

export async function getQuestionResults(
  sessionId: string,
  questionIndex: number
): Promise<PlayerQuestionResult[]> {
  const { data, error } = await supabase
    .from("game_responses")
    .select("game_player_id, selected_answer, is_correct, response_time_ms, points_awarded")
    .eq("game_session_id", sessionId)
    .eq("question_index", questionIndex);

  if (error) return [];

  // Get player names
  const playerIds = [...new Set((data ?? []).map((r) => r.game_player_id))];
  const { data: players } = await supabase
    .from("game_players")
    .select("id, display_name")
    .in("id", playerIds);

  const nameMap = new Map<string, string>();
  for (const p of players ?? []) {
    nameMap.set(p.id, p.display_name);
  }

  return (data ?? []).map((r) => ({
    playerId: r.game_player_id,
    displayName: nameMap.get(r.game_player_id) ?? "Unknown",
    answer: r.selected_answer,
    isCorrect: r.is_correct,
    responseTimeMs: r.response_time_ms ?? 0,
    pointsAwarded: r.points_awarded ?? 0,
  }));
}
