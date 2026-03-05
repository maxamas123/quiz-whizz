// src/pages/LandingPage.tsx

import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Wand2,
  Play,
  BookOpen,
  SlidersHorizontal,
  Star,
  ArrowRight,
  Zap,
  Heart,
} from "lucide-react";

// ── Scroll animation hook ──────────────────────────────
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
}

// ── Scroll reveal wrapper ──────────────────────────────
function ScrollReveal({
  children,
  delay = 0,
  direction = "up",
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right";
  className?: string;
}) {
  const { ref, isInView } = useInView();

  const offsets: Record<string, { x: number; y: number }> = {
    up: { x: 0, y: 32 },
    left: { x: 32, y: 0 },
    right: { x: -32, y: 0 },
  };

  const offset = offsets[direction] ?? offsets.up;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: `opacity 700ms ease-out ${delay}ms, transform 700ms ease-out ${delay}ms`,
        opacity: isInView ? 1 : 0,
        transform: isInView
          ? "translate(0, 0)"
          : `translate(${offset.x}px, ${offset.y}px)`,
      }}
    >
      {children}
    </div>
  );
}

// ── Steps data ─────────────────────────────────────────
const STEPS = [
  {
    number: 1,
    icon: BookOpen,
    title: "Choose your topics",
    description:
      "Pick from 10+ categories like History, Science & Technology, Music, Sport — or add your own custom topic.",
  },
  {
    number: 2,
    icon: SlidersHorizontal,
    title: "Customise everything",
    description:
      "Set difficulty per topic, number of rounds, time periods, and more. Make it exactly how you want.",
  },
  {
    number: 3,
    icon: Wand2,
    title: "Questions generated instantly",
    description:
      "Unique, factually-accurate questions with rich explanations — generated in seconds, every time.",
  },
  {
    number: 4,
    icon: Play,
    title: "Play, print or share!",
    description:
      "Answer interactively with keyboard shortcuts, print for pub quiz night, or save and replay.",
  },
];

// ── Testimonials data ──────────────────────────────────
const TESTIMONIALS = [
  {
    name: "Sophie R.",
    role: "Teacher",
    quote:
      "I use Quiz Whizz every week to create revision quizzes for my GCSE students. It nails the difficulty level every time.",
    stars: 5,
    accent: "bg-violet-100 text-violet-600",
  },
  {
    name: "James T.",
    role: "Pub Quiz Host",
    quote:
      "This has saved me hours of quiz writing. I just set the topics, tweak the difficulty, and print. Our regulars love the variety.",
    stars: 5,
    accent: "bg-amber-100 text-amber-600",
  },
  {
    name: "Emily K.",
    role: "Student",
    quote:
      "The keyboard shortcuts make it so fast to answer. I use it to test myself before exams — way better than flashcards.",
    stars: 5,
    accent: "bg-emerald-100 text-emerald-600",
  },
  {
    name: "David M.",
    role: "Quiz Enthusiast",
    quote:
      "Finally, a quiz generator that doesn't ask the same boring questions. The questions are genuinely interesting and surprising.",
    stars: 5,
    accent: "bg-sky-100 text-sky-600",
  },
  {
    name: "Priya S.",
    role: "Corporate Trainer",
    quote:
      "We use it for team-building sessions. Custom topics let me create quizzes about our industry, which is a total game changer.",
    stars: 5,
    accent: "bg-rose-100 text-rose-600",
  },
  {
    name: "Tom B.",
    role: "Content Creator",
    quote:
      "I create pub quiz content for my YouTube channel. Quiz Whizz gives me a solid starting point that I can fine-tune every time.",
    stars: 4,
    accent: "bg-orange-100 text-orange-600",
  },
];

// ── Landing Page ───────────────────────────────────────
export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="pb-20">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 pb-20 pt-12 text-center sm:pt-20">
        {/* Decorative gradient orbs */}
        <div
          className="pointer-events-none absolute left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full blur-3xl"
          style={{ top: "-10rem", background: "rgba(var(--primary-rgb, 99,102,241), 0.06)" }}
        />
        <div
          className="pointer-events-none absolute right-0 h-[300px] w-[300px] rounded-full blur-3xl"
          style={{ top: "-5rem", background: "rgba(var(--primary-rgb, 99,102,241), 0.04)" }}
        />

        <div className="relative mx-auto max-w-3xl space-y-6">
          {/* Badge */}
          <ScrollReveal delay={0}>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Zap className="h-3.5 w-3.5" />
              Custom Quiz Generator
            </div>
          </ScrollReveal>

          {/* Title */}
          <ScrollReveal delay={100}>
            <h1 className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Create{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                perfect quizzes
              </span>{" "}
              in seconds
            </h1>
          </ScrollReveal>

          {/* Subtitle */}
          <ScrollReveal delay={200}>
            <p className="mx-auto max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Choose your topics, set the difficulty, and instantly generate
              unique, challenging quiz questions — perfect for pub nights,
              classrooms, or testing yourself.
            </p>
          </ScrollReveal>

          {/* CTA */}
          <ScrollReveal delay={300}>
            <div className="flex flex-col items-center gap-3 pt-2">
              <Button
                size="lg"
                className="gap-2.5 rounded-full px-8 py-6 text-lg shadow-lg shadow-primary/25 transition-transform hover:scale-105"
                onClick={() => navigate("/create")}
              >
                <Sparkles className="h-5 w-5" />
                Create a quiz for free
              </Button>
              <p className="text-sm text-muted-foreground">
                No sign-up required · Free to start
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── How Does It Work? ── */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
        <ScrollReveal>
          <div className="mb-12 text-center sm:mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How does it work?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Four simple steps to your perfect quiz.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid gap-8 sm:grid-cols-2 lg:gap-12">
          {STEPS.map((step, i) => (
            <ScrollReveal
              key={step.number}
              delay={i * 150}
              direction={i % 2 === 0 ? "left" : "right"}
            >
              <div className="group relative flex gap-5 rounded-2xl border border-border/40 bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                {/* Number circle */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
                  {step.number}
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <step.icon className="h-4 w-4 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
        <ScrollReveal>
          <div className="mb-12 text-center sm:mb-16">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-sm font-medium text-rose-600">
              <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
              Loved by quizzers
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Quiz people love us!
            </h2>
          </div>
        </ScrollReveal>

        <div className="columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3">
          {TESTIMONIALS.map((t, i) => (
            <ScrollReveal key={t.name} delay={i * 100}>
              <div className="break-inside-avoid rounded-2xl border border-border/40 bg-card p-5 shadow-sm transition-shadow duration-300 hover:shadow-md">
                {/* Stars */}
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star
                      key={j}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                  {Array.from({ length: 5 - t.stars }).map((_, j) => (
                    <Star
                      key={`empty-${j}`}
                      className="h-4 w-4 text-muted-foreground/30"
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="mb-4 text-sm leading-relaxed text-foreground">
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${t.accent}`}
                  >
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
        <ScrollReveal>
          <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-10 sm:p-14">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Ready to create your quiz?
            </h2>
            <p className="mt-3 text-muted-foreground">
              It takes less than a minute. No sign-up required.
            </p>
            <Button
              size="lg"
              className="mt-6 gap-2.5 rounded-full px-8 py-6 text-lg shadow-lg shadow-primary/25 transition-transform hover:scale-105"
              onClick={() => navigate("/create")}
            >
              Get started for free
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
