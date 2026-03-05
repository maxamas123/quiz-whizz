// src/pages/RootPage.tsx

import { useAuth } from "@/lib/auth";
import { LandingPage } from "@/pages/LandingPage";
import { HomePage } from "@/pages/HomePage";
import { Loader2 } from "lucide-react";

export function RootPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl pt-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return user ? <HomePage /> : <LandingPage />;
}
