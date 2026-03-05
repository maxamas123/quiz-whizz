// src/pages/PlayGamePage.tsx
//
// Main game orchestrator. Detects host vs player, subscribes to Realtime,
// manages the game state machine, and renders the appropriate view per phase.

import { useEffect, useRef, useCallback, Component, type ReactNode } from "react";
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
  const revealQuestionState = useGameStore((s) => s.revealQuestionState);
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
        // NOTE: The host sets its own state directly via revealQuestion().
        // These broadcast handlers are mainly for PLAYERS.
        // We guard every handler with isHost checks to prevent the host
        // from accidentally processing its own broadcasts (belt-and-suspenders
        // with self:false on the channel config).
        gameRealtime.subscribe(sessionId!, {
          onGameStarted: () => {
            // Host doesn't need this — it already called revealQuestion()
            if (isHost) return;
            setPhase("question");
          },
          onQuestionRevealed: (data: QuestionRevealedPayload) => {
            // Host sets its own state in revealQuestion() — SKIP entirely
            if (isHost) {
              console.log("[Host] Ignoring own question-revealed broadcast");
              return;
            }
            resetForNextQuestion();
            setCurrentQuestionIndex(data.questionIndex);
            setTotalQuestions(data.totalQuestions);
            setCountdownEndTimestamp(data.countdownEndTimestamp);
            questionStartRef.current = Date.now();

            setCurrentQuestion({
              questionText: data.question.questionText,
              options: data.question.options,
              topic: data.question.topic,
              difficulty: data.question.difficulty as any,
              correctAnswer: "", // Don't reveal to players
              explanation: "",
            });
            setPhase("question");
          },
          onPlayerAnswered: (_data: PlayerAnsweredPayload) => {
            incrementAnsweredCount();
          },
          onResultsShown: (data: QuestionResultsPayload) => {
            // Host sets its own results state in showResults() — SKIP
            if (isHost) {
              console.log("[Host] Ignoring own results-shown broadcast");
              return;
            }
            setCorrectAnswer(data.correctAnswer);
            setExplanation(data.explanation);
            setQuestionResults(data.playerResults);
            setLeaderboard(data.leaderboard);
            setPhase("results");
          },
          onGameFinished: (data: GameFinishedPayload) => {
            // Host sets its own finished state — SKIP
            if (isHost) {
              console.log("[Host] Ignoring own game-finished broadcast");
              return;
            }
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

  // ─── Host: Reveal a question ───
  // ALL state is set atomically FIRST, then async calls happen in background.
  const revealQuestion = useCallback(
    (index: number) => {
      const quiz = generatedQuizRef.current;
      const session = gameSessionRef.current;

      console.log("[revealQuestion] index:", index, {
        hasQuiz: !!quiz,
        hasSession: !!session,
        allQLen: allQuestions.current.length,
        timePerQ: session?.timePerQuestionSeconds,
      });

      if (!quiz || !session) {
        console.error("[revealQuestion] ABORT: missing quiz or session");
        return;
      }

      const q = allQuestions.current[index];
      if (!q) {
        console.error("[revealQuestion] ABORT: no question at index", index);
        return;
      }

      console.log("[revealQuestion] question:", q.questionText?.slice(0, 60));

      const timeLimit = session.timePerQuestionSeconds;
      const countdownEnd = Date.now() + timeLimit * 1000;
      questionStartRef.current = Date.now();

      // ✅ Set ALL state atomically in one store update — UI renders immediately
      revealQuestionState({
        question: q,
        questionIndex: index,
        totalQuestions: allQuestions.current.length,
        countdownEndTimestamp: countdownEnd,
      });

      console.log("[revealQuestion] state set! phase should now be 'question'. Store:", {
        phase: useGameStore.getState().phase,
        hasCurrentQuestion: !!useGameStore.getState().currentQuestion,
      });

      // ✅ Async calls in background — failures don't affect host UI
      (async () => {
        try {
          await advanceQuestion(sessionId!, index);
        } catch (err) {
          console.error("advanceQuestion failed (non-fatal):", err);
        }
        try {
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
        } catch (err) {
          console.error("broadcastQuestionRevealed failed (non-fatal):", err);
        }
      })();

      // Auto-show results when timer ends
      timerEndRef.current = setTimeout(
        () => showResults(index),
        timeLimit * 1000 + 1500
      );
    },
    [sessionId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ─── Host: Start Game ───
  const handleStartGame = useCallback(() => {
    if (!sessionId || !generatedQuizRef.current) return;

    // Reveal first question immediately (sets state synchronously)
    revealQuestion(0);

    // Async calls in background — failures don't block UI
    (async () => {
      try {
        await apiStartGame(sessionId);
      } catch (err) {
        console.error("apiStartGame failed (non-fatal):", err);
      }
      try {
        await gameRealtime.broadcastGameStarted();
      } catch (err) {
        console.error("broadcastGameStarted failed (non-fatal):", err);
      }
    })();
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

  // Debug: log every render with current state
  console.log("[PlayGamePage render]", {
    phase,
    isHost,
    hasGameSession: !!gameSession,
    hasCurrentQuestion: !!useGameStore.getState().currentQuestion,
    currentQuestionIndex,
    allQuestionsCount: allQuestions.current.length,
    hasGeneratedQuiz: !!generatedQuiz,
  });

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
      default:
        return (
          <div className="mx-auto max-w-md pt-20 text-center">
            <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-6">
              <h2 className="mb-2 text-lg font-bold text-red-600">
                Unknown phase: "{phase}"
              </h2>
              <p className="text-sm text-red-600/80">isHost: {String(isHost)}</p>
            </div>
          </div>
        );
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
    default:
      return (
        <div className="mx-auto max-w-md pt-20 text-center">
          <p className="text-sm text-muted-foreground">
            Unknown phase: "{phase}" (player view)
          </p>
        </div>
      );
  }
}

// ─── Error Boundary ───
// Catches render errors so the page shows an error message instead of going blank.
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class GameErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("[GameErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-md pt-20 text-center">
          <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-6">
            <h2 className="mb-2 text-lg font-bold text-red-600">
              Game Error
            </h2>
            <p className="mb-4 text-sm text-red-600/80">
              {this.state.error?.message || "Unknown error"}
            </p>
            <button
              className="text-sm font-medium text-primary hover:underline"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Wrapped export with error boundary */
export function PlayGamePageWithErrorBoundary() {
  return (
    <GameErrorBoundary>
      <PlayGamePage />
    </GameErrorBoundary>
  );
}
