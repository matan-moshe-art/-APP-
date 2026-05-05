"use client";

import { NavAuthLink } from "@/components/NavAuthLink";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Result = {
  meaning: string;
  urgency: string;
  action: string;
  suspicious: string;
};

/** Hebrew UI copy as codepoints to avoid encoding glitches in some editors */
const UI = {
  heroGradient:
    "\u05D1\u05D4\u05D9\u05E8\u05D5\u05EA \u05EA\u05D5\u05D7 \u05E9\u05E0\u05D9\u05D5\u05EA",
  heroClosing:
    "\u05E8\u05E7 \u05DE\u05D4 \u05E9\u05E6\u05E8\u05D9\u05DA \u05DB\u05D3\u05D9 \u05DC\u05D4\u05D7\u05DC\u05D9\u05D8 \u05D1\u05D1\u05D9\u05D8\u05D7\u05D5\u05DF.",
  previewNoLegal:
    "\u05DC\u05DC\u05D0 \u05D9\u05D9\u05E2\u05D5\u05E5 \u05DE\u05E9\u05E4\u05D8\u05D9",
  analyzerDisclaimer:
    "\u05DE\u05D7\u05DC\u05D9\u05E3 \u05D9\u05D9\u05E2\u05D5\u05E5 \u05DE\u05E7\u05E6\u05D5\u05E2\u05D9.",
  footerLegal:
    "\u05D4\u05DB\u05DC\u05D9 \u05D0\u05D9\u05E0\u05D5 \u05DE\u05E1\u05E4\u05E7 \u05D9\u05D9\u05E2\u05D5\u05E5 \u05DE\u05E9\u05E4\u05D8\u05D9; \u05D4\u05DE\u05D8\u05E8\u05D4 \u05D4\u05D9\u05D0 \u05D1\u05D4\u05D9\u05E8\u05D5\u05EA \u05D1\u05DC\u05D1\u05D3.",
} as const;

const SECTIONS: {
  key: keyof Result;
  title: string;
  icon: string;
  accent: string;
  bar: string;
  stagger: string;
}[] = [
  {
    key: "meaning",
    title: "פירוש פשוט",
    icon: "\u{1F4A1}",
    accent:
      "border-violet-500/25 bg-gradient-to-bl from-violet-950/50 to-zinc-950/70",
    bar: "bg-gradient-to-b from-violet-400 to-fuchsia-600",
    stagger: "stagger-1",
  },
  {
    key: "urgency",
    title: "רמת דחיפות",
    icon: "\u23F0",
    accent:
      "border-orange-500/20 bg-gradient-to-bl from-orange-950/35 to-zinc-950/70",
    bar: "bg-gradient-to-b from-orange-400 to-amber-600",
    stagger: "stagger-2",
  },
  {
    key: "suspicious",
    title: "מה נראה חשוד או חריג",
    icon: "\u{1F50D}",
    accent:
      "border-amber-500/25 bg-gradient-to-bl from-amber-950/40 to-zinc-950/70",
    bar: "bg-gradient-to-b from-amber-400 to-yellow-600",
    stagger: "stagger-3",
  },
  {
    key: "action",
    title: "מה לעשות עכשיו",
    icon: "\u2705",
    accent:
      "border-teal-500/25 bg-gradient-to-bl from-teal-950/40 to-zinc-950/70",
    bar: "bg-gradient-to-b from-teal-400 to-cyan-600",
    stagger: "stagger-4",
  },
];

const FEATURES = [
  {
    icon: "\u{1F4C4}",
    title: "הבנה מהירה של מסמכים רשמיים",
    text: "שפה משפטית ומנהלתית מתורגמת לעברית פשוטה, בלי לנחש מה רצו מכם.",
  },
  {
    icon: "\u23F1\uFE0F",
    title: "דחיפות ברורה",
    text: "תדעו מה דורש מענה היום ומה יכול לחכות, כדי שלא יפספסו מועדים.",
  },
  {
    icon: "\u{1F3AF}",
    title: "צעדים הבאים",
    text: "המלצות מעשיות: מה לבדוק, למי לפנות, ומה כדאי לתעד לפני שמגיבים.",
  },
  {
    icon: "\u{1F6E1}\uFE0F",
    title: "עין על דברים חריגים",
    text: "סימנים שכדאי לעצור ולבדוק לעומק לפני לחיצה על קישור או העברת מידע.",
  },
];

function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setShown(true);
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out motion-reduce:opacity-100 motion-reduce:translate-y-0 ${
        shown ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function SkeletonCards() {
  return (
    <div className="mt-10 flex w-full flex-col gap-4" aria-busy="true">
      {SECTIONS.map((s) => (
        <div
          key={s.key}
          className={`animate-fade-in relative overflow-hidden rounded-2xl border p-5 shadow-lg shadow-black/20 ${s.accent} ${s.stagger}`}
        >
          <div
            className={`absolute end-0 top-0 h-full w-1.5 rounded-full ${s.bar} opacity-70`}
            aria-hidden
          />
          <div className="shimmer-bg mb-3 h-5 w-40 rounded-lg" />
          <div className="space-y-2.5">
            <div className="shimmer-bg h-3.5 w-full rounded-lg" />
            <div className="shimmer-bg h-3.5 w-[92%] rounded-lg" />
            <div className="shimmer-bg h-3.5 w-4/5 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

const PROGRESS_STEPS = [
  "קוראים את ההודעה...",
  "מזהים את סוג ההודעה...",
  "בודקים מי השולח...",
  "מנתחים את התוכן...",
  "בודקים אם יש תאריכי יעד...",
  "מחפשים סימנים חשודים...",
  "משווים מול דפוסים מוכרים...",
  "בודקים את רמת הדחיפות...",
  "מגבשים המלצות לפעולה...",
  "בודקים קישורים ופרטי קשר...",
  "מוודאים שלא חסר מידע חשוב...",
  "מנסחים את ההסבר בצורה ברורה...",
  "סוקרים הכל פעם אחרונה...",
  "כמעט מוכן, עוד רגע...",
];

function WaitingIndicator() {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    if (stepIdx >= PROGRESS_STEPS.length - 1) return;
    const delay = 1800 + Math.random() * 1200;
    const timer = setTimeout(() => {
      setStepIdx((i) => Math.min(i + 1, PROGRESS_STEPS.length - 1));
    }, delay);
    return () => clearTimeout(timer);
  }, [stepIdx]);

  const progress = Math.round(
    ((stepIdx + 1) / PROGRESS_STEPS.length) * 100,
  );

  return (
    <div className="mt-10 flex w-full flex-col items-center gap-6 py-8">
      <div className="w-full max-w-xs">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-l from-violet-500 via-fuchsia-500 to-violet-400 transition-all duration-700 ease-out shadow-[0_0_12px_rgba(167,139,250,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-2 rounded-full bg-violet-400"
              style={{
                animation: "pulse 1.4s ease-in-out infinite",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
        <p
          className="text-center text-base font-medium text-zinc-400"
          role="status"
          aria-live="polite"
        >
          {PROGRESS_STEPS[stepIdx]}
        </p>
      </div>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="preview-orbit relative mx-auto w-full max-w-lg">
      <div
        className="pointer-events-none absolute -inset-8 rounded-3xl bg-violet-600/15 blur-3xl"
        aria-hidden
      />
      <div className="glass-dark-strong relative overflow-hidden rounded-2xl border border-white/10 p-5 shadow-2xl shadow-violet-950/40 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]"
              aria-hidden
            />
            <span className="text-xs font-medium text-zinc-500">
              ניתוח לדוגמה
            </span>
          </div>
          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
            מוכן לקריאה
          </span>
        </div>
        <div className="space-y-2.5 text-right">
          <div className="h-2.5 w-[88%] rounded bg-zinc-700/80" />
          <div className="h-2.5 w-full rounded bg-zinc-700/60" />
          <div className="h-2.5 w-[72%] rounded bg-zinc-700/50" />
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <span className="rounded-full border border-violet-400/35 bg-violet-500/15 px-3 py-1.5 text-xs text-violet-100 shadow-[0_0_20px_rgba(124,58,237,0.2)]">
            דחיפות: בינונית
          </span>
          <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 text-xs text-teal-100">
            פעולה: לבדוק קישור
          </span>
          <span className="rounded-full border border-zinc-600 bg-zinc-800/80 px-3 py-1.5 text-xs text-zinc-300">
            {UI.previewNoLegal}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const justActivated = searchParams.get("activated") === "1";

  const [text, setText] = useState("");
  const [validation, setValidation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entitled, setEntitled] = useState(justActivated);
  const [entitlementLoading, setEntitlementLoading] = useState(!justActivated);
  const [polling, setPolling] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(false);
  }, []);

  const resetOutputs = useCallback(() => {
    setResult(null);
    setError(null);
    setPolling(false);
    setShowResults(false);
    stopPolling();
  }, [stopPolling]);

  const startPolling = useCallback(
    (correlationId: string) => {
      stopPolling();
      setPolling(true);
      pollStartRef.current = Date.now();

      pollRef.current = setInterval(async () => {
        if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
          stopPolling();
          setLoading(false);
          setError("העיבוד לוקח יותר מדי זמן. נסו שנית.");
          return;
        }

        try {
          const res = await fetch(`/api/analyze/status/${correlationId}`);
          const data: unknown = await res.json().catch(() => null);

          if (
            data &&
            typeof data === "object" &&
            "status" in data &&
            (data as { status: string }).status === "completed" &&
            "result" in data
          ) {
            const r = (data as { result: Record<string, unknown> }).result;
            setResult({
              meaning: String(r.meaning),
              urgency: String(r.urgency),
              action: String(r.action),
              suspicious: String(r.suspicious),
            });
            setLoading(false);
            stopPolling();
          }
        } catch {
          // network hiccup; keep polling
        }
      }, POLL_INTERVAL_MS);
    },
    [stopPolling],
  );

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  useEffect(() => {
    if (justActivated) {
      window.history.replaceState({}, "", "/");
    }
  }, [justActivated]);

  useEffect(() => {
    let cancelled = false;
    const loadSubscription = async () => {
      try {
        const res = await fetch("/api/billing/subscription");
        if (!res.ok) {
          if (!cancelled && !justActivated) setEntitled(false);
          return;
        }
        const data = (await res.json()) as { entitled?: boolean };
        if (!cancelled) {
          setEntitled((prev) => prev || Boolean(data.entitled));
        }
      } catch {
        if (!cancelled && !justActivated) setEntitled(false);
      } finally {
        if (!cancelled) setEntitlementLoading(false);
      }
    };
    void loadSubscription();
    return () => {
      cancelled = true;
    };
  }, [justActivated]);

  const analyze = useCallback(async () => {
    setValidation(null);
    setError(null);
    const trimmed = text.trim();

    if (!trimmed) {
      setValidation("יש להדביק הודעה לפני הניתוח");
      resetOutputs();
      return;
    }
    if (trimmed.length < 10) {
      setValidation("ההודעה קצרה מדי לניתוח");
      resetOutputs();
      return;
    }
    if (trimmed.length > 5000) {
      setValidation(
        "ההודעה ארוכה מדי. נסו לקצר או להדביק את החלק העיקרי",
      );
      resetOutputs();
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("אין חיבור לאינטרנט. בדקו את החיבור ונסו שנית.");
      setShowResults(true);
      setResult(null);
      return;
    }
    if (!entitled) {
      setValidation("כדי לנתח הודעות צריך להפעיל מנוי במסך המנוי.");
      setShowResults(false);
      return;
    }

    setLoading(true);
    setShowResults(true);
    setResult(null);
    setError(null);
    setPolling(false);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        if (
          data &&
          typeof data === "object" &&
          "message" in data &&
          typeof (data as { message: unknown }).message === "string"
        ) {
          setValidation((data as { message: string }).message);
          setShowResults(false);
        } else {
          setError("משהו השתבש. נסו שנית בעוד כמה שניות.");
        }
        return;
      }

      if (
        data &&
        typeof data === "object" &&
        "accepted" in data &&
        (data as { accepted: unknown }).accepted === true &&
        "correlationId" in data &&
        typeof (data as { correlationId: unknown }).correlationId === "string"
      ) {
        startPolling((data as { correlationId: string }).correlationId);
        return;
      }

      if (
        data &&
        typeof data === "object" &&
        "meaning" in data &&
        "urgency" in data &&
        "action" in data &&
        "suspicious" in data
      ) {
        const d = data as Record<string, unknown>;
        setResult({
          meaning: String(d.meaning),
          urgency: String(d.urgency),
          action: String(d.action),
          suspicious: String(d.suspicious),
        });
      } else {
        setError("משהו השתבש. נסו שנית בעוד כמה שניות.");
      }
    } catch {
      setError("אין חיבור לאינטרנט. בדקו את החיבור ונסו שנית.");
    } finally {
      if (!pollRef.current) {
        setLoading(false);
      }
    }
  }, [text, resetOutputs, startPolling, entitled]);

  const clearAndReset = useCallback(() => {
    setText("");
    setValidation(null);
    setResult(null);
    setError(null);
    setPolling(false);
    setShowResults(false);
    stopPolling();
  }, [stopPolling]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="nav-blur sticky top-0 z-50 border-b border-white/5">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          {/* Left side - Subscription button (prominently placed) */}
          <a
            href="/billing"
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-4 py-2 text-sm font-semibold text-amber-100 shadow-lg shadow-amber-900/20 transition hover:border-amber-400/60 hover:from-amber-500/30 hover:to-orange-500/30 hover:text-white"
          >
            <span aria-hidden>{"\u2B50"}</span>
            <span>מנוי</span>
          </a>

          {/* Center - Brand/Logo */}
          <a
            href="#top"
            className="group flex items-center gap-2.5 text-white transition hover:text-violet-200"
          >
            <span
              className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-sm shadow-lg shadow-violet-600/30 transition group-hover:scale-105 group-hover:shadow-violet-500/40"
              aria-hidden
            >
              {"\u{1F6E1}\uFE0F"}
            </span>
            <span className="hidden text-sm font-bold tracking-tight sm:inline sm:text-base">
              מנתח הודעות
            </span>
          </a>

          {/* Right side - Profile/Auth */}
          <div className="flex items-center gap-3">
            <NavAuthLink />
          </div>
        </div>
      </header>

      <main id="top" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
        <section className="text-center">
          <Reveal>
            <div className="animate-slide-down inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-200">
              <span
                className="size-1.5 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.8)]"
                aria-hidden
              />
              מסרים רשמיים, מתורגמים לשפה שאפשר לפעול לפיה
            </div>
          </Reveal>
          <Reveal className="mt-6">
            <h1 className="mx-auto max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
              מנתח הודעות רשמיות.{" "}
              <span className="bg-gradient-to-l from-violet-300 via-fuchsia-300 to-violet-400 bg-clip-text text-transparent">
                {UI.heroGradient}
              </span>
            </h1>
          </Reveal>
          <Reveal className="mt-5">
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              הדביקו מייל, SMS או מסמך מנהלי. תקבלו פירוש פשוט, רמת דחיפות,
              המלצות לפעולה וסימנים לתשומת לב, בלי גרפים ובלי מערכות CRM,{" "}
              {UI.heroClosing}
            </p>
          </Reveal>
          <Reveal className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#analyzer"
              className="btn-primary inline-flex items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white"
            >
              נתחו הודעה עכשיו
            </a>
            <a
              href="#features"
              className="btn-ghost inline-flex items-center justify-center rounded-full border border-zinc-600 bg-transparent px-8 py-3.5 text-base font-medium text-zinc-200"
            >
              למה זה שונה
            </a>
          </Reveal>
        </section>

        <Reveal className="mt-14 sm:mt-20">
          <ProductPreview />
        </Reveal>

        <section
          id="features"
          className="mt-20 scroll-mt-24 sm:mt-28"
          aria-labelledby="features-heading"
        >
          <Reveal>
            <h2
              id="features-heading"
              className="text-center text-2xl font-bold text-white sm:text-3xl"
            >
              בנוי למי שמקבל יותר מדי מסרים רשמיים
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-zinc-400">
              לא עוד לוח בקרה: כלי קל שמסדר את המידע הרגיש שמגיע לתיבה.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title}>
                <article
                  className="feature-card card-hover glass-dark h-full rounded-2xl border border-white/10 p-5 text-right"
                  style={{ transitionDelay: `${i * 40}ms` }}
                >
                  <div className="feature-icon-wrap mb-4 flex size-11 items-center justify-center rounded-xl bg-violet-500/15 text-xl">
                    {f.icon}
                  </div>
                  <h3 className="text-base font-bold text-white">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    {f.text}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section
          id="analyzer"
          className="mt-20 scroll-mt-24 sm:mt-28"
          aria-labelledby="analyzer-heading"
        >
          <Reveal>
            <div className="text-right">
              <h2
                id="analyzer-heading"
                className="text-2xl font-bold text-white sm:text-3xl"
              >
                הניתוח שלכם
              </h2>
              <p className="mt-2 max-w-xl text-zinc-400">
                הדביקו את הטקסט המלא. הניתוח מיועד להבנה כללית בלבד ואינו{" "}
                {UI.analyzerDisclaimer}
              </p>
            </div>
          </Reveal>

          <Reveal className="mt-8">
            <div className="glass-dark-strong animate-slide-up rounded-2xl border border-white/10 p-4 shadow-xl shadow-black/30 sm:p-6">
              <label htmlFor="message" className="sr-only">
                הודעה רשמית
              </label>
              <textarea
                id="message"
                dir="rtl"
                className="min-h-[200px] w-full resize-y rounded-xl border border-zinc-700/80 bg-zinc-900/50 p-4 text-base leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none disabled:opacity-60"
                placeholder="הדביקו כאן את ההודעה הרשמית..."
                value={text}
                maxLength={5000}
                disabled={loading}
                onChange={(e) => {
                  setText(e.target.value);
                  if (validation) setValidation(null);
                }}
              />
              <div className="mt-2 flex justify-between text-xs text-zinc-500">
                <span>{text.length} / 5000</span>
              </div>
              {validation ? (
                <p
                  className="animate-scale-in mt-3 text-sm font-medium text-red-400"
                  role="alert"
                >
                  {validation}
                </p>
              ) : null}
              {!entitlementLoading && !entitled ? (
                <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-100">
                  הניתוח נעול עד להפעלת מנוי.
                  <a
                    href="/billing"
                    className="me-2 font-semibold text-amber-200 underline decoration-amber-300/60 underline-offset-2"
                  >
                    לעמוד המנוי
                  </a>
                </div>
              ) : null}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-start">
                <button
                  type="button"
                  onClick={analyze}
                  disabled={loading || !entitled || entitlementLoading}
                  className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-600/25 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {loading ? (
                    <>
                      <span
                        className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent"
                        aria-hidden
                      />
                      מנתח...
                    </>
                  ) : (
                    "נתח את ההודעה"
                  )}
                </button>
                <button
                  type="button"
                  onClick={clearAndReset}
                  disabled={loading}
                  className="btn-ghost inline-flex w-full items-center justify-center rounded-full border border-zinc-600 bg-zinc-800/40 px-6 py-3.5 text-base font-medium text-zinc-200 disabled:opacity-50 sm:w-auto"
                >
                  נקה ונתח מחדש
                </button>
              </div>
            </div>
          </Reveal>

          {!showResults ? null : loading && !polling ? (
            <SkeletonCards />
          ) : polling ? (
            <WaitingIndicator />
          ) : error ? (
            <div
              className="animate-scale-in relative mt-10 overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-bl from-red-950/50 to-zinc-950/80 p-5 text-right shadow-lg shadow-red-900/20"
              role="alert"
            >
              <div
                className="absolute end-0 top-0 h-full w-1.5 rounded-full bg-gradient-to-b from-red-400 to-rose-600"
                aria-hidden
              />
              <h2 className="flex items-center justify-end gap-2 text-lg font-bold text-red-200">
                שגיאה
                <span className="text-xl">{"\u26A0\uFE0F"}</span>
              </h2>
              <p className="mt-2 text-red-300/90">{error}</p>
            </div>
          ) : result ? (
            <div className="mt-10 flex w-full flex-col gap-4">
              {SECTIONS.map((s) => (
                <article
                  key={s.key}
                  className={`card-hover animate-slide-up relative overflow-hidden rounded-2xl border p-5 text-right shadow-lg shadow-black/25 ${s.accent} ${s.stagger}`}
                >
                  <div
                    className={`absolute end-0 top-0 h-full w-1.5 rounded-full ${s.bar}`}
                    aria-hidden
                  />
                  <h2 className="flex items-center justify-end gap-2 text-lg font-bold text-white">
                    {s.title}
                    <span className="text-xl">{s.icon}</span>
                  </h2>
                  <div className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-zinc-300">
                    {result[s.key]}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <footer className="animate-fade-in mt-20 border-t border-white/5 pt-10 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-500">
            <span className="inline-block size-1.5 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.5)]" />
            <span>מאובטח ופרטי, הנתונים לא נשמרים</span>
          </div>
          <p className="mt-3 text-xs text-zinc-600">
            {UI.footerLegal}
          </p>
        </footer>
      </main>
    </div>
  );
}
