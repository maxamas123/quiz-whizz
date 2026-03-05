// src/pages/PlayGamePage.tsx
//
// Main game orchestrator. Detects host vs player, subscribes to Realtime,
// manages the game state machine, and renders the appropriate view per phase.

import { useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuizStore } from "@/store/quizStore";
import { useGameStore } from "@/store/gameStore";
import { useAuth } from "@/lib/auth";
import { gameRealtime } from "@/lib/gameRealtime";
import {
  getGameSession,
  getSessionPlayers,
  startGame as apiStartGame,
  advanceQuestion,
  finishGame as apiFinishGame,
  submitPlayerResponse,
  getLeaderboard,
  getQuestionResults,
} from "@/lib/gameApi";
import type { GeneratedQuestion } from "@/types/quiz";
import type {
  QuestionRevealedPayload,
  PlayerAnsweredPayload,
  QuestionResultsPayload,
  GameFinishedPayload,
} from "@/types/gameSession";

// Components
import { HostLobby } from "@/components/play/HostLobby";
import { HostGameView } from "@/components/play/HostGameView";
import { HostResults } from "@/components/play/HostResults";
import { HostFinalResults } from "@/components/play/HostFinalResults";
import { PlayerLobby } from "@/components/play/PlayerLobby";
import { PlayerQuestionView } from "@/components/play/PlayerQuestionView";
import { PlayerResultsView } from "@/components/play/PlayerResultsView";
import { PlayerFinalScore } from "@/components/play/PlayerFinalScore";
import { Loader2 } from "lucide-react";

export function PlayGamePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Quiz store (host has the quiz data)
  const generatedQuiz = useQuizStore((s) => s.generatedQuiz);

  // Game store
  const gameSession = useGameStore((s) => s.gameSession);
  const isHost = useGameStore((s) => s.isHost);
  const phase = useGameStore((s) => s.phase);
  const currentQuestionIndex = useGameStore((s) => s.currentQuestionIndex);
  const setGameSession = useGameStore((s) => s.setGameSession);
  const setGamePlayers = useGameStore((s) => s.setGamePlayers);
  const setPhase = useGameStore((s) => s.setPhase);
  const setCurrentQuestion = useGameStore((s) => s.setCurrentQuestion);
  const setCurrentQuestionIndex = useGameStore((s) => s.setCurrentQuestionIndex);
  const setTotalQuestions = useGameStore((s) => s.setTotalQuestions);
  const setCountdownEndTimestamp = useGameStore((s) => s.setCountdownEndTimestamp);
  const setCorrectAnswer = useGameStore((s) => s.setCorrectAnswer);
  const setExplanation = useGameStore((s) => s.setExplanation);
  const setQuestionResults = useGameStore((s) => s.setQuestionResults);
  const setLeaderboard = useGameStore((s) => s.setLeaderboard);
  const setFinalLeaderboard = useGameStore((s) => s.setFinalLeaderboard);
  const incrementAnsweredCount = useGameStore((s) => s.incrementAnsweredCount);
  const resetForNextQuestion = useGameStore((s) => s.resetForNextQuestion);
  const markAnswered = useGameStore((s) => s.markAnswered);
  const selectAnswer = useGameStore((s) => s.selectAnswer);
  const currentPlayer = useGameStore((s) => s.currentPlayer);

  // Ref to track if already initialised
  const initRef = useRef(false);
  // Ref to track question start time (for response timing)
  const questionStartRef = useRef<number>(0);
  // Ref for auto-timer after question ends (host reveals results)
  const timerEndRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Use refs for values accessed in callbacks to avoid stale closures ───
  const gameSessionRef = useRef(gameSession);
  gameSessionRef.current = gameSession;

  const generatedQuizRef = useRef(generatedQuiz);
  generatedQuizRef.current = generatedQuiz;

  const currentQuestionIndexRef = useRef(currentQuestionIndex);
  currentQuestionIndexRef.current = currentQuestionIndex;

  // ─── Flatten quiz questions for indexing ───
  const allQuestions = useRef<GeneratedQuestion[]>([]);

  useEffect(() => {
    if (generatedQuiz) {
      const flat: GeneratedQuestion[] = [];
      for (const round of generatedQuiz.rounds) {
        for (const q of round.questions) {
          flat.push(q);
        }
      }
      allQuestions.current = flat;
      setTotalQuestions(flat.length);
    }
  }, [generatedQuiz, setTotalQuestions]);

  // ─── Initialise: load session + subscribe to Realtime ───
  useEffect(() => {
    if (!sessionId || initRef.current) return;
    initRef.current = true;

    async function init() {
      try {
        // If we don't already have the session in store, fetch it
        if (!gameSessionRef.current) {
          const session = await getGameSession(sessionId!);
          setGameSession(session);
          gameSessionRef.current = session;
        }

        // Load existing players
        const players = await getSessionPlayers(sessionId!);
        setGamePlayers(players);

        // Subscribe to Realtime
        gameRealtime.subscribe(sessionId!, {
          onGameStarted: () => {
            setPhase("question");
          },
          onQuestionRevealed: (data: QuestionRevealedPayload) => {
            resetForNextQuestion();
            setCurrentQuestionIndex(data.questionIndex);
            setTotalQuestions(data.totalQuestions);
            setCountdownEndTimestamp(data.countdownEndTimestamp);
            questionStartRef.current = Date.now();

            // For players: set the question data from the broadcast
            if (!isHost) {
              setCurrentQuestion({
                questionText: data.question.questionText,
                options: data.question.options,
                topic: data.question.topic,
                difficulty: data.question.difficulty as any,
                correctAnswer: "", // Don't reveal to players
                explanation: "",
              });
            }
            setPhase("question");
          },
          onPlayerAnswered: (_data: PlayerAnsweredPayload) => {
            incrementAnsweredCount();
          },
          onResultsShown: (data: QuestionResultsPayload) => {
            setCorrectAnswer(data.correctAnswer);
            setExplanation(data.explanation);
            setQuestionResults(data.playerResults);
            setLeaderboard(data.leaderboard);
            setPhase("results");
          },
          onGameFinished: (data: GameFinishedPayload) => {
            setFinalLeaderboard(data.finalLeaderboard);
            setPhase("finished");
          },
          onPresenceSync: () => {
            // Reload players on presence change
            getSessionPlayers(sessionId!).then(setGamePlayers).catch(() => {});
          },
        });

        // Track presence
        const presenceData = isHost
          ? { id: user?.id ?? "host", displayName: "Host", isHost: true }
          : {
              id: currentPlayer?.id ?? "player",
              displayName: currentPlayer?.displayName ?? "Player",
            };
        gameRealtime.trackPresence(presenceData);
      } catch (err) {
        console.error("Failed to init game:", err);
        navigate("/");
      }
    }

    init();

    return () => {
      gameRealtime.unsubscribe();
      if (timerEndRef.current) clearTimeout(timerEndRef.current);
    };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Host: Reveal a question (uses refs to avoid stale closures) ───
  const revealQuestion = useCallback(
    async (index: number) => {
      const quiz = generatedQuizRef.current;
      const session = gameSessionRef.current;

      if (!quiz || !session) {
        console.error("revealQuestion: missing quiz or session", { quiz: !!quiz, session: !!session });
        return;
      }

      const q = allQuestions.current[index];
      if (!q) {
        console.error("revealQuestion: no question at index", index);
        return;
      }

      resetForNextQuestion();
      setCurrentQuestionIndex(index);
      setCurrentQuestion(q);

      const timeLimit = session.timePerQuestionSeconds;
      const countdownEnd = Date.now() + timeLimit * 1000;
      setCountdownEndTimestamp(countdownEnd);
      questionStartRef.current = Date.now();

      await advanceQuestion(sessionId!, index);

      // Broadcast to all players (without correct answer!)
      await gameRealtime.broadcastQuestionRevealed({
        questionIndex: index,
        question: {
          questionText: q.questionText,
          options: q.options,
          topic: q.topic,
          difficulty: q.difficulty,
        },
        countdownEndTimestamp: countdownEnd,
        totalQuestions: allQuestions.current.length,
      });

      setPhase("question");

      // Auto-show results when timer ends
      timerEndRef.current = setTimeout(
        () => showResults(index),
        timeLimit * 1000 + 1500 // small buffer after timer
      );
    },
    [sessionId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ─── Host: Start Game ───
  const handleStartGame = useCallback(async () => {
    if (!sessionId || !generatedQuizRef.current) return;

    await apiStartGame(sessionId);
    await gameRealtime.broadcastGameStarted();

    // Reveal first question
    revealQuestion(0);
  }, [sessionId, revealQuestion]);

  // ─── Host: Show results for a question ───
  const showResults = useCallback(
    async (index: number) => {
      if (!sessionId) return;

      const q = allQuestions.current[index];
      if (!q) return;

      const [results, board] = await Promise.all([
        getQuestionResults(sessionId, index),
        getLeaderboard(sessionId),
      ]);

      setCorrectAnswer(q.correctAnswer);
      setExplanation(q.explanation);
      setQuestionResults(results);
      setLeaderboard(board);

      await gameRealtime.broadcastResults({
        questionIndex: index,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        playerResults: results,
        leaderboard: board,
      });

      setPhase("results");
    },
    [sessionId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ─── Host: Next question or finish ───
  const handleNextQuestion = useCallback(async () => {
    if (timerEndRef.current) {
      clearTimeout(timerEndRef.current);
      timerEndRef.current = null;
    }

    const nextIndex = currentQuestionIndexRef.current + 1;

    if (nextIndex >= allQuestions.current.length) {
      // Game over
      const board = await getLeaderboard(sessionId!);
      setFinalLeaderboard(board);
      await apiFinishGame(sessionId!);
      await gameRealtime.broadcastGameFinished({
        finalLeaderboard: board,
      });
      setPhase("finished");
    } else {
      revealQuestion(nextIndex);
    }
  }, [sessionId, revealQuestion]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Player: Submit answer ───
  const handlePlayerAnswer = useCallback(
    async (letter: string) => {
      const session = gameSessionRef.current;
      if (!session || !currentPlayer || !sessionId) return;

      selectAnswer(letter);
      markAnswered();

      const responseTimeMs = Date.now() - questionStartRef.current;

      try {
        await submitPlayerResponse(
          sessionId,
          currentPlayer.id,
          currentQuestionIndexRef.current,
          letter,
          false, // Will be validated server-side or by host
          responseTimeMs,
          session.timePerQuestionSeconds * 1000
        );

        // Broadcast that this player answered (no details, just count)
        await gameRealtime.broadcastPlayerAnswered({
          playerId: currentPlayer.id,
          displayName: currentPlayer.displayName,
          questionIndex: currentQuestionIndexRef.current,
        });
      } catch (err) {
        console.error("Failed to submit answer:", err);
      }
    },
    [currentPlayer, sessionId, selectAnswer, markAnswered]
  );

  // ─── Render based on phase ───

  if (!gameSession) {
    return (
      <div className="mx-auto max-w-md pt-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Loading game...</p>
      </div>
    );
  }

  // HOST views
  if (isHost) {
    switch (phase) {
      case "lobby":
        return (
          <HostLobby
            onStartGame={handleStartGame}
            isStarting={false}
          />
        );
      case "question":
        return <HostGameView />;
      case "results":
      case "leaderboard":
        return (
          <HostResults
            onNextQuestion={handleNextQuestion}
            isLastQuestion={currentQuestionIndex >= allQuestions.current.length - 1}
          />
        );
      case "finished":
        return <HostFinalResults />;
    }
  }

  // PLAYER views
  switch (phase) {
    case "lobby":
      return <PlayerLobby />;
    case "question":
      return <PlayerQuestionView onAnswer={handlePlayerAnswer} />;
    case "results":
    case "leaderboard":
      return <PlayerResultsView />;
    case "finished":
      return <PlayerFinalScore />;
  }

  return null;
}
