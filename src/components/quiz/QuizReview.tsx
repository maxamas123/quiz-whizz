// src/components/quiz/QuizReview.tsx

import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuizStore } from "@/store/quizStore";
import { useAuth } from "@/lib/auth";
import { saveQuiz, saveAttempt, renameQuiz, saveQuizVotes, loadQuizVotes, generateReplacementQuestions } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Sparkles,
  BookOpen,
  Trophy,
  Lightbulb,
  Dumbbell,
  Globe,
  Film,
  UtensilsCrossed,
  Palette,
  HelpCircle,
  Music,
  FlaskConical,
  Eye,
  EyeOff,
  Printer,
  FileText,
  ListOrdered,
  RotateCcw,
  Send,
  Save,
  Check,
  Loader2,
  PenLine,
  LogIn,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Skull,
  Swords,
  Plane,
  Heart,
  Gem,
  Gamepad2,
  Leaf,
  Microscope,
  Shield,
  Rocket,
  Anchor,
  Crown,
  Gauge,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DIFFICULTIES } from "@/types/quiz";
import type { GeneratedQuestion, GeneratedRound, Difficulty } from "@/types/quiz";

/** Icon map for built-in topics */
const TOPIC_ICONS: Partial<Record<string, React.ReactNode>> = {
  "General Knowledge": <HelpCircle className="h-4 w-4" />,
  Sport: <Dumbbell className="h-4 w-4" />,
  History: <BookOpen className="h-4 w-4" />,
  Music: <Music className="h-4 w-4" />,
  "Science & Technology": <FlaskConical className="h-4 w-4" />,
  Geography: <Globe className="h-4 w-4" />,
  "Film & TV": <Film className="h-4 w-4" />,
  "Food & Drink": <UtensilsCrossed className="h-4 w-4" />,
  "Art & Literature": <Palette className="h-4 w-4" />,
};

/** Icons for custom topics — deterministically assigned by name hash */
const CUSTOM_ICONS: LucideIcon[] = [
  Skull, Swords, Plane, Heart, Gem, Gamepad2,
  Leaf, Microscope, Shield, Rocket, Anchor, Crown,
];

/** Simple string hash to deterministically pick an icon/colour */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Get icon JSX for any topic (built-in or custom) */
function getTopicIcon(topic: string): React.ReactNode {
  if (TOPIC_ICONS[topic]) return TOPIC_ICONS[topic];
  const Icon = CUSTOM_ICONS[hashString(topic) % CUSTOM_ICONS.length];
  return <Icon className="h-4 w-4" />;
}

/** Difficulty badge colours */
const DIFFICULTY_STYLES: Record<string, string> = {
  Easy: "bg-emerald-100 text-emerald-700",
  Medium: "bg-amber-100 text-amber-700",
  Hard: "bg-rose-100 text-rose-700",
  Insane: "bg-purple-100 text-purple-700",
};

/** Letter labels */
const OPTION_LABELS = ["A", "B", "C", "D"] as const;

/** Print mode type */
type PrintMode = "questions" | "qa" | "answers-only";

/** Vote value: 1 = upvote, -1 = downvote, 0 = no vote */
type Vote = 1 | -1 | 0;

/** Render a single interactive question card */
function QuestionCard({
  q,
  index,
  showAnswers,
  selectedAnswer,
  isSubmitted,
  isActive,
  onSelectAnswer,
  vote,
  onVote,
  isEditMode,
  isSelectedForEdit,
  onToggleEditSelect,
  cardRef,
}: {
  q: GeneratedQuestion;
  index: number;
  showAnswers: boolean;
  selectedAnswer?: string;
  isSubmitted: boolean;
  isActive: boolean;
  onSelectAnswer: (letter: string) => void;
  vote: Vote;
  onVote: (v: Vote) => void;
  isEditMode?: boolean;
  isSelectedForEdit?: boolean;
  onToggleEditSelect?: () => void;
  cardRef?: React.Ref<HTMLDivElement>;
}) {
  const isAnswered = !!selectedAnswer;
  const isCorrectlyAnswered = isSubmitted && selectedAnswer === q.correctAnswer;
  const isWronglyAnswered = isSubmitted && isAnswered && selectedAnswer !== q.correctAnswer;

  return (
    <div
      ref={cardRef}
      onClick={isEditMode ? onToggleEditSelect : undefined}
      className={`print-question-card rounded-2xl bg-card p-5 shadow-sm transition-all print:rounded-lg print:p-3 print:shadow-none print:break-inside-avoid print:border print:border-gray-200 ${
        isEditMode
          ? isSelectedForEdit
            ? "ring-2 ring-rose-400 bg-rose-50/50 cursor-pointer"
            : "cursor-pointer hover:ring-2 hover:ring-muted-foreground/20"
          : isSubmitted
            ? isCorrectlyAnswered
              ? "ring-2 ring-emerald-300"
              : isWronglyAnswered
                ? "ring-2 ring-rose-300"
                : ""
            : isActive
              ? "ring-2 ring-primary/40"
              : ""
      }`}
    >
      {/* Question header */}
      <div className="mb-3 flex items-start justify-between gap-3 print:mb-1.5">
        <div className="flex items-center gap-2">
          {isEditMode && (
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-xs transition-colors ${
                isSelectedForEdit
                  ? "border-rose-500 bg-rose-500 text-white"
                  : "border-muted-foreground/30 bg-white"
              }`}
            >
              {isSelectedForEdit && <Check className="h-3 w-3" />}
            </span>
          )}
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold print:h-5 print:w-5 print:bg-gray-100 print:text-gray-700 print:text-[10px]">
            {index}
          </span>
          {isSubmitted && (
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold print:hidden ${
                isCorrectlyAnswered
                  ? "bg-emerald-100 text-emerald-700"
                  : isWronglyAnswered
                    ? "bg-rose-100 text-rose-700"
                    : "bg-amber-50 text-amber-600"
              }`}
            >
              {isCorrectlyAnswered ? (
                <><CheckCircle2 className="h-3 w-3" /> Correct</>
              ) : isWronglyAnswered ? (
                <><XCircle className="h-3 w-3" /> Incorrect</>
              ) : (
                "Skipped"
              )}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground print:text-[10px]">
            {getTopicIcon(q.topic)}
            {q.topic}
          </span>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium print:px-1.5 print:py-0 print:text-[10px] ${
            DIFFICULTY_STYLES[q.difficulty] ?? "bg-muted text-muted-foreground"
          }`}
        >
          {q.difficulty}
        </span>
      </div>

      {/* Question text */}
      <p className="mb-4 text-[0.95rem] font-medium leading-relaxed text-foreground print:mb-2 print:text-[11px] print:leading-snug">
        {q.questionText}
      </p>

      {/* Options grid — interactive */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 print:grid-cols-2 print:gap-1">
        {q.options.map((option, optIdx) => {
          const letter = OPTION_LABELS[optIdx];
          const isCorrect = q.correctAnswer === letter;
          const isSelected = selectedAnswer === letter;
          const isWrongSelection = isSubmitted && isSelected && !isCorrect;

          // Determine styling based on state
          let containerClass: string;
          let circleClass: string;
          let textClass: string;

          if (isSubmitted) {
            // After submission — show correct/incorrect
            if (isCorrect) {
              containerClass = "bg-emerald-50 ring-1 ring-emerald-200 print:bg-gray-100 print:ring-gray-400";
              circleClass = "bg-emerald-500 text-white print:bg-gray-700 print:text-white";
              textClass = "font-medium text-emerald-800 print:text-gray-900";
            } else if (isWrongSelection) {
              containerClass = "bg-rose-50 ring-1 ring-rose-200";
              circleClass = "bg-rose-500 text-white";
              textClass = "font-medium text-rose-800 line-through";
            } else {
              containerClass = "bg-muted/30";
              circleClass = "bg-background text-muted-foreground/50";
              textClass = "text-foreground/50";
            }
          } else if (isSelected) {
            // Selected but not yet submitted
            containerClass = "bg-primary/10 ring-2 ring-primary/40";
            circleClass = "bg-primary text-primary-foreground";
            textClass = "font-medium text-foreground";
          } else if (showAnswers && isCorrect) {
            // Peeking at answers mode
            containerClass = "bg-emerald-50 ring-1 ring-emerald-200 print:bg-gray-100 print:ring-gray-400";
            circleClass = "bg-emerald-500 text-white print:bg-gray-700 print:text-white";
            textClass = "font-medium text-emerald-800 print:text-gray-900";
          } else {
            // Default unselected
            containerClass = "bg-muted/50 hover:bg-muted/80 cursor-pointer";
            circleClass = "bg-background text-muted-foreground";
            textClass = "text-foreground/80";
          }

          return (
            <button
              key={optIdx}
              type="button"
              disabled={isSubmitted}
              onClick={() => onSelectAnswer(letter)}
              className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm text-left transition-all print:rounded-md print:px-2 print:py-1 print:text-[10px] ${containerClass} ${
                !isSubmitted && !isSelected ? "active:scale-[0.98]" : ""
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors print:h-4 print:w-4 print:text-[9px] ${circleClass}`}
              >
                {letter}
              </span>
              <span className={`print:text-[10px] ${textClass}`}>
                {option}
              </span>
              {isSubmitted && isCorrect && (
                <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-500 print:hidden" />
              )}
              {isWrongSelection && (
                <XCircle className="ml-auto h-4 w-4 shrink-0 text-rose-500 print:hidden" />
              )}
            </button>
          );
        })}
      </div>

      {/* Explanation — only after submission or when peeking */}
      {(showAnswers || isSubmitted) && q.explanation && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-primary/5 px-3.5 py-2.5 print:mt-1.5 print:rounded-md print:px-2 print:py-1">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary/60 print:hidden" />
          <p className="text-sm leading-relaxed text-foreground/70 print:text-[10px] print:leading-snug">
            {q.explanation}
          </p>
        </div>
      )}

      {/* Vote buttons — shown after submission */}
      {isSubmitted && (
        <div className="mt-2.5 flex items-center gap-1.5 print:hidden">
          <span className="mr-1 text-[11px] text-muted-foreground/60">Rate:</span>
          <button
            type="button"
            onClick={() => onVote(vote === 1 ? 0 : 1)}
            className={`rounded-lg p-1.5 transition-colors ${
              vote === 1
                ? "bg-emerald-100 text-emerald-600"
                : "text-muted-foreground/40 hover:text-emerald-500 hover:bg-emerald-50"
            }`}
            title="Good question"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onVote(vote === -1 ? 0 : -1)}
            className={`rounded-lg p-1.5 transition-colors ${
              vote === -1
                ? "bg-rose-100 text-rose-600"
                : "text-muted-foreground/40 hover:text-rose-500 hover:bg-rose-50"
            }`}
            title="Bad question"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Score summary component — centered full-width layout */
function ScoreSummary({
  allQuestions,
  selectedAnswers,
}: {
  allQuestions: { q: GeneratedQuestion; num: number }[];
  selectedAnswers: Record<number, string>;
}) {
  const totalQuestions = allQuestions.length;
  const answered = allQuestions.filter(({ num }) => selectedAnswers[num]).length;
  const correct = allQuestions.filter(
    ({ q, num }) => selectedAnswers[num] === q.correctAnswer
  ).length;
  const incorrect = answered - correct;
  const unanswered = totalQuestions - answered;
  const percentage = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;

  // Score by topic
  const topicScores: Record<string, { correct: number; total: number }> = {};
  for (const { q, num } of allQuestions) {
    if (!topicScores[q.topic]) topicScores[q.topic] = { correct: 0, total: 0 };
    topicScores[q.topic].total++;
    if (selectedAnswers[num] === q.correctAnswer) topicScores[q.topic].correct++;
  }

  // Grade label
  let grade: string;
  let gradeColor: string;
  let ringColor: string;
  if (percentage >= 90) { grade = "Outstanding!"; gradeColor = "text-emerald-600"; ringColor = "text-emerald-500"; }
  else if (percentage >= 70) { grade = "Great job!"; gradeColor = "text-emerald-600"; ringColor = "text-emerald-500"; }
  else if (percentage >= 50) { grade = "Good effort!"; gradeColor = "text-amber-600"; ringColor = "text-amber-500"; }
  else if (percentage >= 30) { grade = "Keep practising!"; gradeColor = "text-amber-600"; ringColor = "text-amber-500"; }
  else { grade = "Better luck next time!"; gradeColor = "text-rose-600"; ringColor = "text-rose-500"; }

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 print:hidden">
      {/* Top — centered score circle + grade */}
      <div className="flex flex-col items-center gap-1 mb-5">
        <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-white shadow-md">
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              className="text-muted/20"
            />
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${percentage * 2.64} 264`}
              className={ringColor}
            />
          </svg>
          <div className="z-10 text-center">
            <span className="text-3xl font-bold text-foreground">{percentage}%</span>
            <p className="text-[11px] text-muted-foreground">{correct}/{totalQuestions}</p>
          </div>
        </div>
        <p className={`mt-1 text-sm font-semibold ${gradeColor}`}>{grade}</p>
      </div>

      {/* Middle — stat boxes */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl bg-emerald-50 px-3 py-3 text-center">
          <CheckCircle2 className="mx-auto mb-1 h-4 w-4 text-emerald-500" />
          <p className="text-xl font-bold text-emerald-700">{correct}</p>
          <p className="text-xs text-emerald-600">Correct</p>
        </div>
        <div className="rounded-xl bg-rose-50 px-3 py-3 text-center">
          <XCircle className="mx-auto mb-1 h-4 w-4 text-rose-500" />
          <p className="text-xl font-bold text-rose-700">{incorrect}</p>
          <p className="text-xs text-rose-600">Incorrect</p>
        </div>
        <div className="rounded-xl bg-muted/50 px-3 py-3 text-center">
          <HelpCircle className="mx-auto mb-1 h-4 w-4 text-muted-foreground/60" />
          <p className="text-xl font-bold text-muted-foreground">{unanswered}</p>
          <p className="text-xs text-muted-foreground">Skipped</p>
        </div>
      </div>

      {/* Bottom — topic breakdown bars */}
      {Object.keys(topicScores).length > 1 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center mb-2">
            Performance by Topic
          </p>
          {Object.entries(topicScores).map(([topic, { correct: c, total: t }]) => {
            const pct = t > 0 ? (c / t) * 100 : 0;
            return (
              <div key={topic} className="flex items-center gap-2.5">
                <span className="flex items-center gap-1.5 w-44 shrink-0 text-xs text-foreground/70">
                  <span className="shrink-0">{getTopicIcon(topic)}</span>
                  <span className="truncate">{topic}</span>
                </span>
                <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted/40">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                      pct >= 70 ? "bg-emerald-400" : pct >= 40 ? "bg-amber-400" : "bg-rose-400"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs font-semibold tabular-nums text-foreground/70">
                  {c}/{t}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function QuizReview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    generatedQuiz,
    clearQuiz,
    activeRound,
    setActiveRound,
    showAnswers,
    setShowAnswers,
    selectedAnswers,
    isSubmitted,
    selectAnswer,
    submitAnswers,
    resetSelections,
    savedQuizId,
    setSavedQuizId,
    isSaving,
    setIsSaving,
    updateQuizMeta,
  } = useQuizStore();

  // Track which print mode is active (for CSS-based hiding)
  const [printMode, setPrintMode] = useState<PrintMode | null>(null);
  const printModeRef = useRef<PrintMode | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts: track active question and refs for scrolling
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const questionRefsMap = useRef<Record<number, HTMLDivElement | null>>({});

  // Question votes: questionNumber → 1 (upvote), -1 (downvote), 0 (none)
  const [votes, setVotes] = useState<Record<number, Vote>>({});

  // Edit mode: select questions to delete / change difficulty / replace
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState<Set<number>>(new Set());
  const [isReplacing, setIsReplacing] = useState(false);
  const [showDifficultyPicker, setShowDifficultyPicker] = useState(false);

  const setQuestionRef = useCallback(
    (qNum: number) => (el: HTMLDivElement | null) => {
      questionRefsMap.current[qNum] = el;
    },
    []
  );

  // Keyboard A/B/C/D handler
  useEffect(() => {
    if (isSubmitted || !generatedQuiz) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const key = e.key.toUpperCase();
      if (!["A", "B", "C", "D"].includes(key)) return;

      e.preventDefault();

      // Build the question list on the fly (same as allDisplayedQuestions)
      const displayedRounds =
        activeRound === -1
          ? generatedQuiz!.rounds
          : generatedQuiz!.rounds.filter((r) => r.roundNumber === activeRound);

      const questionList: { num: number }[] = [];
      let counter = 0;
      for (const round of displayedRounds) {
        for (const _q of round.questions) {
          counter++;
          questionList.push({ num: counter });
        }
      }

      if (questionList.length === 0) return;

      // Clamp index
      const idx = Math.min(activeQuestionIdx, questionList.length - 1);
      const currentQ = questionList[idx];
      selectAnswer(currentQ.num, key);

      // Auto-advance to next unanswered question after a brief delay
      setTimeout(() => {
        // Get fresh state of selected answers
        const answers = useQuizStore.getState().selectedAnswers;
        let nextIdx = -1;
        for (let i = idx + 1; i < questionList.length; i++) {
          if (!answers[questionList[i].num]) {
            nextIdx = i;
            break;
          }
        }
        // If no unanswered after current, wrap around
        if (nextIdx === -1) {
          for (let i = 0; i < idx; i++) {
            if (!answers[questionList[i].num]) {
              nextIdx = i;
              break;
            }
          }
        }

        if (nextIdx >= 0) {
          setActiveQuestionIdx(nextIdx);
          const nextNum = questionList[nextIdx].num;
          questionRefsMap.current[nextNum]?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 200);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitted, generatedQuiz, activeRound, activeQuestionIdx, selectAnswer]);

  // Clear savedQuizId when user logs out (fixes green "Saved" badge + missing Save button)
  useEffect(() => {
    if (!user && savedQuizId) {
      setSavedQuizId(null);
    }
  }, [user, savedQuizId, setSavedQuizId]);

  // Load persisted votes when viewing a saved quiz
  useEffect(() => {
    if (savedQuizId) {
      loadQuizVotes(savedQuizId)
        .then((saved) => {
          if (Object.keys(saved).length > 0) setVotes(saved as Record<number, Vote>);
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedQuizId]);

  // Auto-save votes to Supabase when they change (debounced)
  useEffect(() => {
    if (!savedQuizId || !user || Object.keys(votes).length === 0) return;
    const uid = user.id;
    const timer = setTimeout(() => {
      saveQuizVotes(savedQuizId, votes, uid).catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [votes, savedQuizId, user]);

  // If no quiz in store, redirect back
  if (!generatedQuiz) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 text-center">
        <div className="space-y-2 pt-12">
          <Trophy className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h2 className="text-2xl font-bold text-foreground">No quiz found</h2>
          <p className="text-muted-foreground">
            Head back and configure a quiz to generate questions.
          </p>
        </div>
        <Button
          onClick={() => navigate("/create")}
          className="gap-2 rounded-full px-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Quiz Builder
        </Button>
      </div>
    );
  }

  const { rounds, questions, config } = generatedQuiz;
  const quizName = config?.quizName;

  // Determine which questions to show based on active round
  const displayedRounds: GeneratedRound[] =
    activeRound === -1
      ? rounds
      : rounds.filter((r) => r.roundNumber === activeRound);

  // Flatten all displayed questions for the answer key / scoring
  const allDisplayedQuestions: { q: GeneratedQuestion; num: number }[] = [];
  {
    let counter = 0;
    for (const round of displayedRounds) {
      for (const q of round.questions) {
        counter++;
        allDisplayedQuestions.push({ q, num: counter });
      }
    }
  }

  const totalAnswered = Object.keys(selectedAnswers).length;

  function handleNewQuiz() {
    clearQuiz();
    navigate("/create");
  }

  function doPrint(mode: PrintMode) {
    const prevAnswers = showAnswers;
    printModeRef.current = mode;
    setPrintMode(mode);

    if (mode === "questions") {
      setShowAnswers(false);
    } else {
      setShowAnswers(true);
    }

    setTimeout(() => {
      window.print();
      setPrintMode(null);
      printModeRef.current = null;
      setShowAnswers(prevAnswers);
    }, 150);
  }

  async function handleSaveQuiz() {
    if (!generatedQuiz || !user) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const id = await saveQuiz(generatedQuiz, user.id);
      setSavedQuizId(id);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmitAndSave() {
    submitAnswers();
    // Auto-save attempt if quiz is saved and user is logged in
    if (savedQuizId && user) {
      const correct = allDisplayedQuestions.filter(
        ({ q, num }) => selectedAnswers[num] === q.correctAnswer
      ).length;
      try {
        await saveAttempt(
          savedQuizId,
          user.id,
          selectedAnswers,
          correct,
          allDisplayedQuestions.length
        );
      } catch {
        // Silently fail — attempt save is best-effort
      }
    }
  }

  function startEditingName() {
    setEditingNameValue(quizName || "");
    setIsEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  }

  async function saveEditedName() {
    setIsEditingName(false);
    const trimmed = editingNameValue.trim();
    if (savedQuizId && user && trimmed !== (quizName || "")) {
      try {
        await renameQuiz(savedQuizId, trimmed, user.id);
        // Update config in store without resetting answers/state
        if (generatedQuiz) {
          updateQuizMeta({
            ...generatedQuiz,
            config: { ...generatedQuiz.config, quizName: trimmed },
          });
        }
      } catch {
        // Silently fail on rename
      }
    }
  }

  function toggleEditSelection(qNum: number) {
    setSelectedForEdit((prev) => {
      const next = new Set(prev);
      if (next.has(qNum)) next.delete(qNum);
      else next.add(qNum);
      return next;
    });
  }

  function handleDeleteSelected() {
    if (!generatedQuiz || selectedForEdit.size === 0) return;
    // Build a set of (roundNumber, questionIndex) to remove
    let counter = 0;
    const toRemove = new Set<string>(); // "roundNumber-questionIdx"
    for (const round of generatedQuiz.rounds) {
      for (let qi = 0; qi < round.questions.length; qi++) {
        counter++;
        if (selectedForEdit.has(counter)) {
          toRemove.add(`${round.roundNumber}-${qi}`);
        }
      }
    }

    // Build new rounds with selected questions removed
    const newRounds = generatedQuiz.rounds
      .map((round) => ({
        ...round,
        questions: round.questions.filter(
          (_, qi) => !toRemove.has(`${round.roundNumber}-${qi}`)
        ),
      }))
      .filter((r) => r.questions.length > 0); // Remove empty rounds

    const newQuestions = newRounds.flatMap((r) => r.questions);

    updateQuizMeta({
      ...generatedQuiz,
      rounds: newRounds,
      questions: newQuestions,
    });

    // Clean up edit state
    setSelectedForEdit(new Set());
    setIsEditMode(false);
  }

  function handleChangeDifficulty(newDifficulty: Difficulty) {
    if (!generatedQuiz || selectedForEdit.size === 0) return;
    let counter = 0;
    const newRounds = generatedQuiz.rounds.map((round) => ({
      ...round,
      questions: round.questions.map((q) => {
        counter++;
        if (selectedForEdit.has(counter)) {
          return { ...q, difficulty: newDifficulty };
        }
        return q;
      }),
    }));
    const newQuestions = newRounds.flatMap((r) => r.questions);
    updateQuizMeta({ ...generatedQuiz, rounds: newRounds, questions: newQuestions });
    setSelectedForEdit(new Set());
    setIsEditMode(false);
    setShowDifficultyPicker(false);
  }

  async function handleReplaceSelected() {
    if (!generatedQuiz || selectedForEdit.size === 0) return;
    setIsReplacing(true);
    try {
      // Collect info about selected questions
      let counter = 0;
      const selectedQuestions: GeneratedQuestion[] = [];
      for (const round of generatedQuiz.rounds) {
        for (const q of round.questions) {
          counter++;
          if (selectedForEdit.has(counter)) {
            selectedQuestions.push(q);
          }
        }
      }

      const topics = [...new Set(selectedQuestions.map((q) => q.topic))];
      const difficulties = [...new Set(selectedQuestions.map((q) => q.difficulty))] as Difficulty[];
      const excludeQuestions = generatedQuiz.questions.map((q) => q.questionText);

      // Generate replacement questions
      const replacements = await generateReplacementQuestions(
        topics,
        difficulties,
        selectedQuestions.length,
        excludeQuestions
      );

      // Swap replacements in
      let replIdx = 0;
      counter = 0;
      const newRounds = generatedQuiz.rounds.map((round) => ({
        ...round,
        questions: round.questions.map((q) => {
          counter++;
          if (selectedForEdit.has(counter) && replIdx < replacements.length) {
            return replacements[replIdx++];
          }
          return q;
        }),
      }));
      const newQuestions = newRounds.flatMap((r) => r.questions);
      updateQuizMeta({ ...generatedQuiz, rounds: newRounds, questions: newQuestions });
      setSelectedForEdit(new Set());
      setIsEditMode(false);
    } catch (err) {
      console.error("Replace questions failed:", err);
    } finally {
      setIsReplacing(false);
    }
  }

  // Running question number across all displayed rounds
  let questionCounter = 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ── Header ── */}
      <div className="space-y-2 pb-2 text-center print:pb-1">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 print:hidden">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        {isEditingName ? (
          <input
            ref={nameInputRef}
            type="text"
            value={editingNameValue}
            onChange={(e) => setEditingNameValue(e.target.value)}
            onBlur={saveEditedName}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEditedName();
              if (e.key === "Escape") setIsEditingName(false);
            }}
            className="mx-auto block w-full max-w-md rounded-xl border border-primary/30 bg-white px-4 py-2 text-center text-2xl font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/40"
          />
        ) : quizName ? (
          <h1 className="group inline-flex items-center justify-center gap-2 text-3xl font-bold tracking-tight text-foreground print:text-xl">
            {quizName}
            {savedQuizId && user && (
              <button
                type="button"
                onClick={startEditingName}
                className="rounded-lg p-1 text-muted-foreground/40 transition-colors hover:text-primary group-hover:text-muted-foreground/60 print:hidden"
                title="Rename quiz"
              >
                <PenLine className="h-4 w-4" />
              </button>
            )}
          </h1>
        ) : (
          <h1 className="text-3xl font-bold tracking-tight text-foreground print:text-xl">
            Your quiz is <span className="italic text-primary print:text-gray-900">ready</span>
          </h1>
        )}
        <p className="text-base text-muted-foreground print:text-xs">
          {questions.length} question{questions.length !== 1 ? "s" : ""} across{" "}
          {rounds.length} round{rounds.length !== 1 ? "s" : ""}
          {!isSubmitted && totalAnswered > 0 && (
            <span className="ml-2 text-primary font-medium">
              · {totalAnswered} answered
            </span>
          )}
        </p>
      </div>

      {/* ── Score summary (after submission) ── */}
      {isSubmitted && (
        <ScoreSummary
          allQuestions={allDisplayedQuestions}
          selectedAnswers={selectedAnswers}
        />
      )}

      {/* ── Controls bar (single row, all buttons together) ── */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {!isSubmitted ? (
          <>
            <Button
              variant="default"
              size="sm"
              className="gap-2 rounded-full"
              onClick={handleSubmitAndSave}
              disabled={totalAnswered === 0}
            >
              <Send className="h-4 w-4" />
              Submit Answers
              {totalAnswered > 0 && (
                <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0 text-xs">
                  {totalAnswered}/{questions.length}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-full"
              onClick={() => setShowAnswers(!showAnswers)}
            >
              {showAnswers ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Hide Answers
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Peek at Answers
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-full"
              onClick={resetSelections}
            >
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
            <Button
              variant={isEditMode ? "default" : "outline"}
              size="sm"
              className="gap-2 rounded-full"
              onClick={() => {
                setIsEditMode(!isEditMode);
                if (isEditMode) setSelectedForEdit(new Set());
              }}
            >
              <PenLine className="h-4 w-4" />
              {isEditMode ? "Exit Edit" : "Edit Questions"}
            </Button>
          </>
        )}

        {/* Save button — shown for all users */}
        {!savedQuizId && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-full"
            onClick={user ? handleSaveQuiz : () => setShowLoginPrompt(true)}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? "Saving..." : "Save Quiz"}
          </Button>
        )}
        {savedQuizId && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <Check className="h-3.5 w-3.5" />
            Saved
          </span>
        )}
        {saveError && (
          <span className="text-xs text-rose-600">{saveError}</span>
        )}

        {/* Host Live Game button */}
        {user && (
          <>
            <div className="h-5 w-px bg-border" />
            <Button
              variant="default"
              size="sm"
              className="gap-2 rounded-full"
              onClick={() => navigate("/play/host")}
            >
              <Gamepad2 className="h-4 w-4" />
              Host Live Game
            </Button>
          </>
        )}

        {/* Separator before print buttons */}
        <div className="h-5 w-px bg-border" />

        {/* Print buttons */}
        <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={() => doPrint("questions")}>
          <Printer className="h-4 w-4" />
          Print Questions
        </Button>
        <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={() => doPrint("qa")}>
          <FileText className="h-4 w-4" />
          Print Q&A
        </Button>
        <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={() => doPrint("answers-only")}>
          <ListOrdered className="h-4 w-4" />
          Print Answers
        </Button>
      </div>

      {/* ── Round tabs ── */}
      {rounds.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            onClick={() => setActiveRound(-1)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeRound === -1
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            All
          </button>
          {rounds.map((round) => (
            <button
              key={round.roundNumber}
              onClick={() => setActiveRound(round.roundNumber)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeRound === round.roundNumber
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {round.topic
                ? `R${round.roundNumber}: ${round.topic}`
                : `Round ${round.roundNumber}`}
            </button>
          ))}
        </div>
      )}

      {/* ── Questions by round (hidden when printing answers-only) ── */}
      <div className={`space-y-6 ${printMode === "answers-only" ? "print-hide-for-answers" : ""}`}>
        {displayedRounds.map((round) => (
          <div key={round.roundNumber} className="space-y-4 print:space-y-2">
            {/* Round header */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <h2 className="text-sm font-bold text-muted-foreground print:text-xs">
                {round.topic
                  ? `Round ${round.roundNumber} — ${round.topic}`
                  : `Round ${round.roundNumber}`}
              </h2>
              <div className="h-px flex-1 bg-border" />
            </div>

            {round.questions.map((q) => {
              questionCounter++;
              const qNum = questionCounter;
              const qIdx = qNum - 1; // 0-based index for keyboard tracking
              return (
                <QuestionCard
                  key={`${round.roundNumber}-${qNum}`}
                  q={q}
                  index={qNum}
                  showAnswers={showAnswers}
                  selectedAnswer={selectedAnswers[qNum]}
                  isSubmitted={isSubmitted}
                  isActive={!isSubmitted && qIdx === activeQuestionIdx}
                  onSelectAnswer={(letter) => selectAnswer(qNum, letter)}
                  vote={(votes[qNum] ?? 0) as Vote}
                  onVote={(v) => setVotes((prev) => ({ ...prev, [qNum]: v }))}
                  isEditMode={isEditMode}
                  isSelectedForEdit={selectedForEdit.has(qNum)}
                  onToggleEditSelect={() => toggleEditSelection(qNum)}
                  cardRef={setQuestionRef(qNum)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Floating submit bar (visible when answering, not yet submitted) ── */}
      {!isSubmitted && totalAnswered > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 print:hidden">
          <Button
            size="lg"
            className="gap-2 rounded-full px-8 shadow-lg shadow-primary/25"
            onClick={handleSubmitAndSave}
          >
            <Send className="h-4 w-4" />
            Submit {totalAnswered} Answer{totalAnswered !== 1 ? "s" : ""}
          </Button>
        </div>
      )}

      {/* ── Floating edit bar (visible in edit mode with selections) ── */}
      {isEditMode && selectedForEdit.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 print:hidden">
          <div className="flex flex-col items-center gap-2">
            {/* Difficulty picker (shown when Change Difficulty is clicked) */}
            {showDifficultyPicker && (
              <div className="flex items-center gap-1 rounded-full bg-card px-3 py-1.5 shadow-xl ring-1 ring-border">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleChangeDifficulty(d)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors hover:opacity-80 ${
                      DIFFICULTY_STYLES[d] ?? "bg-muted text-muted-foreground"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
            {/* Main action bar */}
            <div className="flex items-center gap-2 rounded-full bg-card px-4 py-2 shadow-xl ring-1 ring-border">
              <span className="text-sm font-medium text-foreground">
                {selectedForEdit.size} selected
              </span>
              <div className="h-4 w-px bg-border" />
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 rounded-full text-xs"
                onClick={() => setShowDifficultyPicker(!showDifficultyPicker)}
              >
                <Gauge className="h-3.5 w-3.5" />
                Difficulty
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 rounded-full text-xs"
                onClick={handleReplaceSelected}
                disabled={isReplacing}
              >
                {isReplacing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                {isReplacing ? "Replacing..." : "Replace"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="gap-1.5 rounded-full text-xs"
                onClick={handleDeleteSelected}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full text-xs"
                onClick={() => {
                  setSelectedForEdit(new Set());
                  setShowDifficultyPicker(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Answer key section (compact, for Q&A printing) ── */}
      {showAnswers && (
        <div className={`rounded-2xl border border-border bg-card p-5 print:p-3 ${printMode === "answers-only" ? "print-hide-for-answers" : ""}`}>
          <h3 className="mb-4 text-center text-sm font-bold text-foreground print:mb-2 print:text-xs">
            Answer Key
          </h3>
          <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2 print:grid-cols-3 print:text-[10px] print:gap-0.5">
            {allDisplayedQuestions.map(({ q, num }) => (
              <div
                key={`key-${num}`}
                className="flex items-baseline gap-2 rounded-lg px-2 py-1 even:bg-muted/30 print:py-0.5 print:px-1"
              >
                <span className="w-6 shrink-0 font-bold text-primary tabular-nums print:w-4 print:text-gray-700">
                  {num}.
                </span>
                <span className="font-semibold text-emerald-700 print:text-gray-900">
                  {q.correctAnswer}
                </span>
                <span className="truncate text-muted-foreground">
                  —{" "}
                  {q.options[
                    OPTION_LABELS.indexOf(
                      q.correctAnswer as (typeof OPTION_LABELS)[number]
                    )
                  ] ?? q.correctAnswer}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Answers-only section (upside-down, reversed — only visible when printing answers) ── */}
      <div className={`print-answers-only ${printMode === "answers-only" ? "" : "hidden"}`}>
        <div className="print-upside-down">
          <h3 className="mb-4 text-center text-sm font-bold">
            Answer Key {quizName ? `— ${quizName}` : ""}
          </h3>
          <div className="grid grid-cols-4 gap-x-4 gap-y-0.5 text-sm">
            {[...allDisplayedQuestions].reverse().map(({ q, num }) => (
              <div key={`ans-${num}`} className="flex items-baseline gap-1.5 py-0.5">
                <span className="w-5 shrink-0 font-bold tabular-nums text-right">
                  {num}.
                </span>
                <span className="font-semibold">
                  {q.correctAnswer}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center justify-center gap-4 pb-16 pt-4 print:hidden">
        <Button
          variant="outline"
          className="gap-2 rounded-full px-6"
          onClick={handleNewQuiz}
        >
          <ArrowLeft className="h-4 w-4" />
          New Quiz
        </Button>
      </div>

      {/* ── Login prompt dialog (for logged-out users trying to save) ── */}
      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5 text-primary" />
              Sign in to save
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Create a free account or sign in to save your quizzes, track scores, and replay later.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setShowLoginPrompt(false)}
            >
              Not now
            </Button>
            <Button
              size="sm"
              className="gap-2 rounded-full"
              onClick={() => {
                setShowLoginPrompt(false);
                navigate("/auth");
              }}
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
