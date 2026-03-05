// src/App.tsx

import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { RootPage } from "@/pages/RootPage";
import { QuizWizard } from "@/components/quiz/QuizWizard";
import { QuizReview } from "@/components/quiz/QuizReview";
import { HistoryPage } from "@/pages/HistoryPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { PlayHostPage } from "@/pages/PlayHostPage";
import { PlayJoinPage } from "@/pages/PlayJoinPage";
import { PlayGamePage } from "@/pages/PlayGamePage";

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="px-4 py-8 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<RootPage />} />
            <Route path="/create" element={<QuizWizard />} />
            <Route path="/review" element={<QuizReview />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            {/* Play Mode routes */}
            <Route path="/play/host" element={<PlayHostPage />} />
            <Route path="/play/join" element={<PlayJoinPage />} />
            <Route path="/play/game/:sessionId" element={<PlayGamePage />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
