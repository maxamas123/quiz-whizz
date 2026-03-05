// src/store/quizStore.ts

import { create } from "zustand";
import type { GeneratedQuiz } from "@/types/quiz";

interface QuizStore {
  /** The most recently generated quiz */
  generatedQuiz: GeneratedQuiz | null;

  /** Loading state for quiz generation */
  isGenerating: boolean;

  /** Error message from generation */
  generationError: string | null;

  /** Active round index for review tab navigation (-1 = show all) */
  activeRound: number;

  /** Whether to show correct answers in the review screen */
  showAnswers: boolean;

  /** Map of question number → selected answer letter (A/B/C/D) */
  selectedAnswers: Record<number, string>;

  /** Whether answers have been submitted for scoring */
  isSubmitted: boolean;

  /** Database ID if this quiz has been saved to the user's account */
  savedQuizId: string | null;

  /** Whether a save operation is in progress */
  isSaving: boolean;

  /** Set the generated quiz */
  setGeneratedQuiz: (quiz: GeneratedQuiz) => void;

  /** Set loading state */
  setIsGenerating: (loading: boolean) => void;

  /** Set error */
  setGenerationError: (error: string | null) => void;

  /** Set active round tab */
  setActiveRound: (round: number) => void;

  /** Toggle answer visibility */
  setShowAnswers: (show: boolean) => void;

  /** Select an answer for a question */
  selectAnswer: (questionNum: number, letter: string) => void;

  /** Submit all answers for scoring */
  submitAnswers: () => void;

  /** Reset selections (try again) */
  resetSelections: () => void;

  /** Mark quiz as saved */
  setSavedQuizId: (id: string | null) => void;

  /** Set saving state */
  setIsSaving: (saving: boolean) => void;

  /** Update quiz metadata (e.g. name) without resetting answers/state */
  updateQuizMeta: (quiz: GeneratedQuiz) => void;

  /** Clear the generated quiz (go back to config) */
  clearQuiz: () => void;
}

export const useQuizStore = create<QuizStore>((set) => ({
  generatedQuiz: null,
  isGenerating: false,
  generationError: null,
  activeRound: -1,
  showAnswers: false,
  selectedAnswers: {},
  isSubmitted: false,
  savedQuizId: null,
  isSaving: false,

  setGeneratedQuiz: (quiz) =>
    set({
      generatedQuiz: quiz,
      isGenerating: false,
      generationError: null,
      activeRound: -1,
      showAnswers: false,
      selectedAnswers: {},
      isSubmitted: false,
      savedQuizId: null,
      isSaving: false,
    }),

  setIsGenerating: (loading) =>
    set({ isGenerating: loading, generationError: null }),

  setGenerationError: (error) =>
    set({ generationError: error, isGenerating: false }),

  setActiveRound: (round) => set({ activeRound: round }),

  setShowAnswers: (show) => set({ showAnswers: show }),

  selectAnswer: (questionNum, letter) =>
    set((state) => {
      // Don't allow changes after submission
      if (state.isSubmitted) return state;
      // Toggle off if same letter clicked again (deselect)
      if (state.selectedAnswers[questionNum] === letter) {
        const next = { ...state.selectedAnswers };
        delete next[questionNum];
        return { selectedAnswers: next };
      }
      return {
        selectedAnswers: { ...state.selectedAnswers, [questionNum]: letter },
      };
    }),

  submitAnswers: () =>
    set({ isSubmitted: true, showAnswers: true }),

  resetSelections: () =>
    set({ selectedAnswers: {}, isSubmitted: false, showAnswers: false }),

  setSavedQuizId: (id) => set({ savedQuizId: id }),

  setIsSaving: (saving) => set({ isSaving: saving }),

  updateQuizMeta: (quiz) =>
    set({ generatedQuiz: quiz }),

  clearQuiz: () =>
    set({
      generatedQuiz: null,
      isGenerating: false,
      generationError: null,
      activeRound: -1,
      showAnswers: false,
      selectedAnswers: {},
      isSubmitted: false,
      savedQuizId: null,
      isSaving: false,
    }),
}));
