"use client";

import { NavAuthLink } from "@/components/NavAuthLink";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";

type Result = {
  meaning: string;
  urgency: string;
  action: string;
  suspicious: string;
};

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
      "border-emerald-500/25 bg-gradient-to-bl from-emerald-950/50 to-zinc-950/70",
    bar: "bg-gradient-to-b from-emerald-400 to-green-600",
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
    title: "סימני פישינג",
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
      "border-green-500/25 bg-gradient-to-bl from-green-950/40 to-zinc-950/70",
    bar: "bg-gradient-to-b from-green-400 to-emerald-600",
    stagger: "stagger-4",
  },
];

const EXAMPLE_INPUT =
  "בנק לאומי: זוהתה פעילות חריגה בחשבונך. נדרש אימות מיידי תוך שעה כדי למנוע חסימה: https://leumi-secure-verify.co/login";

const EXAMPLE_RESULT: Result = {
  meaning:
    "ההודעה מתחזה לבנק לאומי ומבקשת ממך ללחוץ על קישור כדי 'לאמת' את החשבון. זוהי הודעת פישינג שמטרתה לגנוב את שם המשתמש והסיסמה שלך לבנק.",
  urgency:
    "אין דחיפות אמיתית. הלחץ של 'תוך שעה' הוא טריק מוכר של פישינג - גורם לפעול בלי לחשוב. הבנק האמיתי לעולם לא ייתן לך שעה ללחוץ על קישור.",
  suspicious:
    "כתובת הקישור (leumi-secure-verify.co) לא שייכת לבנק לאומי - הדומיין הרשמי הוא bankleumi.co.il. השולח לא מזוהה, אין פנייה אישית בשם, וההודעה מבקשת פעולה דחופה דרך לינק חיצוני - שלושה סימני פישינג קלאסיים.",
  action:
    "אל תלחץ על הקישור. אל תזין פרטים. מחק את ההודעה. אם יש חשש אמיתי - היכנס לאפליקציית הבנק ישירות (לא דרך הקישור) או התקשר למוקד הבנק במספר שמופיע בכרטיס שלך. דווח על ההודעה למוקד 105 של מערך הסייבר.",
};

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

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Smooth phased progress targeting the n8n webhook's typical ~25s runtime:
 * 0 -> 30 over ~8s, 30 -> 90 over ~15s, 90 -> 99 over ~5s, jump to 100 on done.
 */
function ProgressBar({ done }: { done: boolean }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (done) {
      setProgress(100);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      let next: number;
      if (elapsed < 8) {
        next = (elapsed / 8) * 30;
      } else if (elapsed < 23) {
        next = 30 + ((elapsed - 8) / 15) * 60;
      } else if (elapsed < 28) {
        next = 90 + ((elapsed - 23) / 5) * 9;
      } else {
        next = 99;
      }
      setProgress((prev) => Math.max(prev, Math.min(99, next)));
    }, 200);
    return () => clearInterval(id);
  }, [done]);

  return (
    <div
      className="mt-10 flex w-full flex-col items-center gap-4 py-8"
      aria-busy={!done}
    >
      <div className="w-full max-w-md">
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-l from-emerald-500 via-green-500 to-emerald-400 shadow-[0_0_12px_rgba(34,197,94,0.5)] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-zinc-500">בודקים את ההודעה...</span>
          <span
            className="font-mono font-semibold text-emerald-300"
            role="status"
            aria-live="polite"
          >
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function ExampleAnalysisPreview() {
  return (
    <div className="preview-orbit relative mx-auto w-full max-w-2xl">
      <div
        className="pointer-events-none absolute -inset-8 rounded-3xl bg-emerald-600/15 blur-3xl"
        aria-hidden
      />
      <div className="glass-dark-strong relative overflow-hidden rounded-2xl border border-white/10 p-5 shadow-2xl shadow-emerald-950/40 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
              aria-hidden
            />
            <span className="text-xs font-medium text-zinc-400">
              ניתוח לדוגמה
            </span>
          </div>
          <span className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200">
            פישינג זוהה
          </span>
        </div>

        <div className="mb-4 rounded-xl border border-zinc-700/60 bg-zinc-900/60 p-3 text-right">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
            ההודעה שנותחה
          </div>
          <p
            dir="rtl"
            className="text-sm leading-relaxed text-zinc-300"
          >
            {EXAMPLE_INPUT}
          </p>
        </div>

        <div className="grid gap-3 text-right">
          {SECTIONS.map((s) => (
            <div
              key={s.key}
              className={`relative overflow-hidden rounded-xl border p-3 ${s.accent}`}
            >
              <div
                className={`absolute end-0 top-0 h-full w-1 rounded-full ${s.bar} opacity-70`}
                aria-hidden
              />
              <div className="flex items-center justify-end gap-2">
                <h3 className="text-sm font-bold text-white">{s.title}</h3>
                <span className="text-base">{s.icon}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
                {EXAMPLE_RESULT[s.key]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const searchParams = useSearchParams();
  const justActivated = searchParams.get("activated") === "1";

  const [text, setText] = useState("");
  const [validation, setValidation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [entitled, setEntitled] = useState(justActivated);
  const [entitlementLoading, setEntitlementLoading] = useState(!justActivated);
  const [polling, setPolling] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [followUpText, setFollowUpText] = useState("");
  const [followUpValidation, setFollowUpValidation] = useState<string | null>(
    null,
  );

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
    setErrorCode(null);
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
          setErrorCode("AN-208");
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

  const submitAnalyze = useCallback(
    async (input: string, isFollowUp: boolean) => {
      const trimmed = input.trim();
      const setLocalValidation = isFollowUp
        ? setFollowUpValidation
        : setValidation;
      setLocalValidation(null);
      setError(null);
      setErrorCode(null);

      if (!trimmed) {
        setLocalValidation("יש להדביק הודעה לפני הניתוח");
        if (!isFollowUp) resetOutputs();
        return;
      }
      if (trimmed.length < 10) {
        setLocalValidation("ההודעה קצרה מדי לניתוח");
        if (!isFollowUp) resetOutputs();
        return;
      }
      if (trimmed.length > 5000) {
        setLocalValidation(
          "ההודעה ארוכה מדי. נסו לקצר או להדביק את החלק העיקרי",
        );
        if (!isFollowUp) resetOutputs();
        return;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setError("אין חיבור לאינטרנט. בדקו את החיבור ונסו שנית.");
        setErrorCode("AN-001");
        setShowResults(true);
        setResult(null);
        return;
      }
      if (!entitled) {
        setLocalValidation("כדי לנתח הודעות צריך להפעיל מנוי במסך המנוי.");
        setShowResults(false);
        return;
      }

      setLoading(true);
      setShowResults(true);
      setResult(null);
      setError(null);
      setErrorCode(null);
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
            setLocalValidation((data as { message: string }).message);
            setShowResults(false);
            if (
              "eventCode" in data &&
              typeof (data as { eventCode: unknown }).eventCode === "string"
            ) {
              setErrorCode((data as { eventCode: string }).eventCode);
            }
          } else {
            setError("משהו השתבש. נסו שנית בעוד כמה שניות.");
            setErrorCode("AN-500");
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
          setErrorCode("AN-501");
        }
      } catch {
        setError("אין חיבור לאינטרנט. בדקו את החיבור ונסו שנית.");
        setErrorCode("AN-002");
      } finally {
        if (!pollRef.current) {
          setLoading(false);
        }
      }
    },
    [entitled, resetOutputs, startPolling],
  );

  const analyze = useCallback(() => submitAnalyze(text, false), [
    submitAnalyze,
    text,
  ]);

  const submitFollowUp = useCallback(async () => {
    const trimmed = followUpText.trim();
    if (!trimmed) {
      setFollowUpValidation("יש להדביק הודעה לפני הניתוח");
      return;
    }
    setText(trimmed);
    setFollowUpText("");
    setFollowUpValidation(null);
    await submitAnalyze(trimmed, true);
  }, [followUpText, submitAnalyze]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="nav-blur sticky top-0 z-50 border-b border-white/5">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <NavAuthLink />
          </div>

          <a
            href="/billing"
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-lg transition ${
              entitlementLoading
                ? "border-zinc-700 bg-zinc-900/60 text-zinc-400 shadow-black/20"
                : entitled
                  ? "border-emerald-500/40 bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-100 shadow-emerald-900/20 hover:border-emerald-400/60 hover:from-emerald-500/30 hover:to-green-500/30 hover:text-white"
                  : "border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-100 shadow-amber-900/20 hover:border-amber-400/60 hover:from-amber-500/30 hover:to-orange-500/30 hover:text-white"
            }`}
          >
            <span aria-hidden>{"\u2B50"}</span>
            <span>
              {entitlementLoading
                ? "טוען מנוי..."
                : entitled
                  ? "מנוי פעיל"
                  : "מנוי לא פעיל"}
            </span>
          </a>
        </div>
      </header>

      <main
        id="top"
        className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-10 sm:px-6 sm:pt-14"
      >
        <section className="text-center">
          <Reveal>
            <h1 className="mx-auto max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
              מזהה פישינג בעברית.{" "}
              <span className="bg-gradient-to-l from-emerald-300 via-green-300 to-emerald-400 bg-clip-text text-transparent">
                הגנה מפני סקאם בשניות
              </span>
            </h1>
          </Reveal>
          <Reveal className="mt-5">
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              הדביקו SMS, מייל או הודעה חשודה. אנחנו נבדוק אם מנסים לגנוב מכם
              מידע, סיסמאות או כסף, ונגיד לכם בדיוק מה לעשות הלאה - כדי שתוכלו
              לפעול בביטחון בלי לחשוש מסקאם.
            </p>
          </Reveal>
          <Reveal className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#analyzer"
              className="btn-primary inline-flex items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white"
            >
              בדקו הודעה עכשיו
            </a>
          </Reveal>
        </section>

        <Reveal className="mt-14 sm:mt-20">
          <div className="mb-4 text-center">
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              ככה נראה ניתוח אמיתי
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              דוגמה ל-SMS פישינג שזוהה ופורק לארבעה חלקים
            </p>
          </div>
          <ExampleAnalysisPreview />
        </Reveal>

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
                בדיקת פישינג
              </h2>
              <p className="mt-2 max-w-xl text-zinc-400">
                הדביקו את ההודעה החשודה במלואה. הבדיקה מיועדת לעזור לכם להחליט -
                לא תחליף לבדיקה ישירה מול הגוף הרשמי או דיווח למוקד 105.
              </p>
            </div>
          </Reveal>

          <Reveal className="mt-8">
            <div className="glass-dark-strong animate-slide-up rounded-2xl border border-white/10 p-4 shadow-xl shadow-black/30 sm:p-6">
              <label htmlFor="message" className="sr-only">
                הודעה חשודה
              </label>
              <textarea
                id="message"
                dir="rtl"
                className="min-h-[200px] w-full resize-y rounded-xl border border-zinc-700/80 bg-zinc-900/50 p-4 text-base leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none disabled:opacity-60"
                placeholder="הדביקו כאן הודעה חשודה (SMS, מייל, וואטסאפ)..."
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
                  {errorCode ? (
                    <span className="me-2 font-mono text-xs text-red-300/80">
                      ({errorCode})
                    </span>
                  ) : null}
                </p>
              ) : null}
              {!entitlementLoading && !entitled ? (
                <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-100">
                  הבדיקה נעולה עד להפעלת מנוי.
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
                  className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-600/25 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {loading ? (
                    <>
                      <span
                        className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent"
                        aria-hidden
                      />
                      בודק...
                    </>
                  ) : (
                    "בדוק את ההודעה"
                  )}
                </button>
              </div>
            </div>
          </Reveal>

          {!showResults ? null : loading || polling ? (
            <ProgressBar done={false} />
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
                {errorCode ? (
                  <span className="rounded-full border border-red-500/40 bg-red-950/60 px-2 py-0.5 font-mono text-xs text-red-200">
                    {errorCode}
                  </span>
                ) : null}
                <span className="text-xl">{"\u26A0\uFE0F"}</span>
              </h2>
              <p className="mt-2 text-red-300/90">{error}</p>
            </div>
          ) : result ? (
            <>
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

              <div className="glass-dark-strong animate-slide-up mt-8 rounded-2xl border border-emerald-500/20 p-4 shadow-xl shadow-black/30 sm:p-6">
                <div className="mb-3 text-right">
                  <h3 className="text-lg font-bold text-white">
                    יש לכם הודעה נוספת לבדוק?
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    הדביקו אותה כאן ולחצו על &quot;בדוק את ההודעה&quot;.
                  </p>
                </div>
                <label htmlFor="follow-up-message" className="sr-only">
                  הודעה חשודה נוספת
                </label>
                <textarea
                  id="follow-up-message"
                  dir="rtl"
                  className="min-h-[140px] w-full resize-y rounded-xl border border-zinc-700/80 bg-zinc-900/50 p-4 text-base leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none disabled:opacity-60"
                  placeholder="הדביקו כאן הודעה חשודה נוספת..."
                  value={followUpText}
                  maxLength={5000}
                  disabled={loading}
                  onChange={(e) => {
                    setFollowUpText(e.target.value);
                    if (followUpValidation) setFollowUpValidation(null);
                  }}
                />
                <div className="mt-2 flex justify-between text-xs text-zinc-500">
                  <span>{followUpText.length} / 5000</span>
                </div>
                {followUpValidation ? (
                  <p
                    className="animate-scale-in mt-3 text-sm font-medium text-red-400"
                    role="alert"
                  >
                    {followUpValidation}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-start">
                  <button
                    type="button"
                    onClick={submitFollowUp}
                    disabled={loading || !entitled || entitlementLoading}
                    className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-600/25 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    בדוק את ההודעה
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </section>

        <footer className="animate-fade-in mt-20 border-t border-white/5 pt-10 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-500">
            <span className="inline-block size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
            <span>
              מאובטח ופרטי. ההודעות שאתם מדביקים לא נשמרות לאחר הבדיקה.
            </span>
          </div>
          <p className="mt-3 text-xs text-zinc-600">
            הכלי עוזר לזהות פישינג, אבל אם יש ספק - תמיד פנו ישירות לבנק / לגוף
            הרשמי או דווחו למוקד הסייבר 105.
          </p>
        </footer>
      </main>
    </div>
  );
}
