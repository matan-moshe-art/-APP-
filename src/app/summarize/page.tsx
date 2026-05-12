"use client";

import { NavAuthLink } from "@/components/NavAuthLink";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";

type Result = {
  topic: string;
  urgency: string;
  actions: string;
  recommendations: string;
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
    key: "topic",
    title: "נושא ההודעה",
    icon: "\u{1F4EC}",
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
    key: "actions",
    title: "מה צריך לעשות עכשיו",
    icon: "\u2705",
    accent:
      "border-green-500/25 bg-gradient-to-bl from-green-950/40 to-zinc-950/70",
    bar: "bg-gradient-to-b from-green-400 to-emerald-600",
    stagger: "stagger-3",
  },
  {
    key: "recommendations",
    title: "המלצות וזהירות",
    icon: "\u{1F9E0}",
    accent:
      "border-sky-500/25 bg-gradient-to-bl from-sky-950/40 to-zinc-950/70",
    bar: "bg-gradient-to-b from-sky-400 to-cyan-600",
    stagger: "stagger-4",
  },
];

const EXAMPLE_INPUT = `היי צוות, כמה דברים,
ראשית לגבי הפגישה של יום ראשון - דנה אמרה שהיא לא יכולה אז אולי להזיז ליום שני אבל רק אם גם עומר פנוי, תבדקו מולו. אם לא, נישאר ביום ראשון בלי דנה אבל אז צריך שמישהו יעדכן אותה אח"כ בכתב.
חוץ מזה, הלקוח מחברת אלפא שלח מייל שהוא צריך עד יום חמישי הזה(!) את גרסה מעודכנת של המצגת עם התיקונים שדיברנו עליהם בשיחה האחרונה + הנתונים מ-Q3 שעדיין לא קיבלנו מהכספים. מישהו יכול לרדוף אחרי הכספים? אני חושב שזה יושב אצל טלי או שירה, לא בטוח.
עוד דבר - צריך לסגור את הנושא של החוזה מול ספק הענן, יעל אמרה שיש בעיה עם הסעיף של ה-SLA ושהיא שלחה הערות ליועצת המשפטית אבל לא קיבלה תשובה כבר שבוע. זה חוסם את ההעלאה לפרודקשן כי בלי חוזה חתום אי אפשר להפעיל את ה-environment. אם לא נסגור את זה עד סוף השבוע הפרויקט מתעכב.
אה וגם - מי שמטפל בגיוס למשרת ה-frontend, יש שני מועמדים שעברו מיון ראשוני וצריך לתאם להם ראיון טכני. נדמה לי שרון אמור לתאם, תזכירו לו.
תודה`;

const EXAMPLE_RESULT: Result = {
  topic:
    "הודעה פנימית לצוות עם ארבעה נושאים שונים שמעורבבים: תיאום פגישה (יום ראשון/שני), דדליין מול לקוח אלפא (מצגת + נתוני Q3 עד יום חמישי), חוזה ספק ענן שחוסם עלייה לפרודקשן, וגיוס למשרת frontend. השולח לא מפרט מי אחראי על מה ומערבב בקשות דחופות עם פחות דחופות.",
  urgency:
    "דחוף\n\nיש שני דדליינים קריטיים: מצגת ללקוח עד יום חמישי (ותלוי בנתונים שעוד לא התקבלו), וחוזה ספק ענן שחוסם את כל הפרויקט אם לא ייסגר עד סוף השבוע. שני הנושאים האחרים פחות דחופים אבל דורשים פעולה השבוע.",
  actions:
    "1. לבדוק מול עומר אם הוא פנוי ביום שני - אם כן, להזיז את הפגישה; אם לא, להשאיר ביום ראשון ולמנות מישהו שיעדכן את דנה בכתב.\n2. לפנות לטלי או שירה בכספים ולבקש את נתוני Q3 בדחיפות (דדליין: יום חמישי).\n3. לעדכן את המצגת ללקוח אלפא עם התיקונים מהשיחה האחרונה, ולשלב את הנתונים ברגע שמגיעים.\n4. לפנות ליועצת המשפטית בנוגע להערות יעל על סעיף ה-SLA בחוזה ספק הענן - זה חוסם פרודקשן.\n5. להזכיר לרון לתאם ראיונות טכניים לשני המועמדים למשרת ה-frontend.",
  recommendations:
    "כדאי לפצל את ההודעה הזו לארבע משימות נפרדות במערכת ניהול משימות (Jira, Monday, Notion וכד') כדי שדברים לא ייפלו. הנושא הכי קריטי הוא החוזה מול ספק הענן - זה חוסם את כל הצוות ולא רק את השולח. מומלץ לקבוע אחראי בשם לכל משימה במקום 'מישהו' גנרי.",
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

function ProgressBar({ done }: { done: boolean }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (done) {
      const id = requestAnimationFrame(() => {
        setProgress(100);
      });
      return () => cancelAnimationFrame(id);
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
          <span className="text-zinc-500">מסכמים את ההודעה...</span>
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

function ExampleSummarizePreview() {
  return (
    <div className="preview-orbit relative mx-auto w-full max-w-2xl">
      <div
        className="pointer-events-none absolute -inset-8 rounded-3xl bg-sky-600/12 blur-3xl"
        aria-hidden
      />
      <div className="glass-dark-strong relative overflow-hidden rounded-2xl border border-white/10 p-5 shadow-2xl shadow-sky-950/30 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]"
              aria-hidden
            />
            <span className="text-xs font-medium text-zinc-400">
              סיכום לדוגמה
            </span>
          </div>
          <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-200">
            ארבעה חלקים
          </span>
        </div>

        <div className="mb-4 rounded-xl border border-zinc-700/60 bg-zinc-900/60 p-3 text-right">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
            ההודעה שסוכמה
          </div>
          <p dir="rtl" className="text-sm leading-relaxed text-zinc-300">
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

export default function SummarizePage() {
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
          setErrorCode("SM-208");
          return;
        }

        try {
          const res = await fetch(`/api/summarize/status/${correlationId}`);
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
              topic: String(r.topic),
              urgency: String(r.urgency),
              actions: String(r.actions),
              recommendations: String(r.recommendations),
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
      window.history.replaceState({}, "", "/summarize");
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

  const submitSummarize = useCallback(
    async (input: string, isFollowUp: boolean) => {
      const trimmed = input.trim();
      const setLocalValidation = isFollowUp
        ? setFollowUpValidation
        : setValidation;
      setLocalValidation(null);
      setError(null);
      setErrorCode(null);

      if (!trimmed) {
        setLocalValidation("יש להדביק טקסט לפני הסיכום");
        if (!isFollowUp) resetOutputs();
        return;
      }
      if (trimmed.length < 10) {
        setLocalValidation("הטקסט קצר מדי לסיכום");
        if (!isFollowUp) resetOutputs();
        return;
      }
      if (trimmed.length > 5000) {
        setLocalValidation(
          "הטקסט ארוך מדי. נסו לקצר או להדביק את החלק העיקרי",
        );
        if (!isFollowUp) resetOutputs();
        return;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setError("אין חיבור לאינטרנט. בדקו את החיבור ונסו שנית.");
        setErrorCode("SM-001");
        setShowResults(true);
        setResult(null);
        return;
      }
      if (!entitled) {
        setLocalValidation("כדי לסכם הודעות צריך להפעיל מנוי במסך המנוי.");
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
        const res = await fetch("/api/summarize", {
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
            setErrorCode("SM-500");
          }
          return;
        }

        if (
          data &&
          typeof data === "object" &&
          "accepted" in data &&
          (data as { accepted: unknown }).accepted === true &&
          "correlationId" in data &&
          typeof (data as { correlationId: unknown }).correlationId ===
            "string"
        ) {
          startPolling((data as { correlationId: string }).correlationId);
          return;
        }

        if (
          data &&
          typeof data === "object" &&
          "topic" in data &&
          "urgency" in data &&
          "actions" in data &&
          "recommendations" in data
        ) {
          const d = data as Record<string, unknown>;
          setResult({
            topic: String(d.topic),
            urgency: String(d.urgency),
            actions: String(d.actions),
            recommendations: String(d.recommendations),
          });
        } else {
          setError("משהו השתבש. נסו שנית בעוד כמה שניות.");
          setErrorCode("SM-501");
        }
      } catch {
        setError("אין חיבור לאינטרנט. בדקו את החיבור ונסו שנית.");
        setErrorCode("SM-002");
      } finally {
        if (!pollRef.current) {
          setLoading(false);
        }
      }
    },
    [entitled, resetOutputs, startPolling],
  );

  const summarize = useCallback(
    () => submitSummarize(text, false),
    [submitSummarize, text],
  );

  const submitFollowUp = useCallback(async () => {
    const trimmed = followUpText.trim();
    if (!trimmed) {
      setFollowUpValidation("יש להדביק טקסט לפני הסיכום");
      return;
    }
    setText(trimmed);
    setFollowUpText("");
    setFollowUpValidation(null);
    await submitSummarize(trimmed, true);
  }, [followUpText, submitSummarize]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="nav-blur sticky top-0 z-50 border-b border-white/5">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-sky-500/35 bg-gradient-to-r from-sky-500/15 to-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-sky-100 shadow-md shadow-sky-950/20 transition hover:border-sky-400/55 hover:from-sky-500/25 hover:to-cyan-500/25 hover:text-white sm:px-4 sm:text-sm"
            >
              מזהה פישינג
              <span aria-hidden className="text-sky-300">
                {"\u2190"}
              </span>
            </Link>
            <NavAuthLink variant="profile" />
          </div>

          <div className="flex items-center gap-3">
            <NavAuthLink variant="actions" />
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
        </div>
      </header>

      <main
        id="top"
        className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-10 sm:px-6 sm:pt-14"
      >
        <section className="text-center">
          <Reveal>
            <h1 className="mx-auto max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
              סיכום הודעות מורכבות בעברית.{" "}
              <span className="bg-gradient-to-l from-sky-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                תבינו מה רוצים מכם בשניות
              </span>
            </h1>
          </Reveal>
          <Reveal className="mt-5">
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              הדביקו הודעה מורכבת, לא מובנית, או עם הרבה שלבים - מייל ארוך,
              הודעת וואטסאפ, מסמך, הנחיות פנימיות. נפרק אותה לנושא, דחיפות,
              רשימת משימות והמלצות חכמות.
            </p>
          </Reveal>
          <Reveal className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#summarizer"
              className="btn-primary inline-flex items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white"
            >
              סכמו הודעה עכשיו
            </a>
          </Reveal>
        </section>

        <Reveal className="mt-14 sm:mt-20">
          <div className="mb-4 text-center">
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              ככה נראה סיכום אמיתי
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              דוגמה להודעה מורכבת שפורקה לארבעה חלקים
            </p>
          </div>
          <ExampleSummarizePreview />
        </Reveal>

        <section
          id="summarizer"
          className="mt-20 scroll-mt-24 sm:mt-28"
          aria-labelledby="summarizer-heading"
        >
          <Reveal>
            <div className="text-right">
              <h2
                id="summarizer-heading"
                className="text-2xl font-bold text-white sm:text-3xl"
              >
                סיכום הודעות מורכבות
              </h2>
              <p className="mt-2 max-w-xl text-zinc-400">
                הדביקו הודעה מורכבת, לא מובנית, או עם הרבה שלבים. הכלי מיועד
                להבנה מהירה - לא תחליף לאימות מול השולח או למדיניות אבטחה בארגון.
              </p>
            </div>
          </Reveal>

          <Reveal className="mt-8">
            <div className="glass-dark-strong animate-slide-up rounded-2xl border border-white/10 p-4 shadow-xl shadow-black/30 sm:p-6">
              <label htmlFor="email-text" className="sr-only">
                טקסט מייל לסיכום
              </label>
              <textarea
                id="email-text"
                dir="rtl"
                className="min-h-[200px] w-full resize-y rounded-xl border border-zinc-700/80 bg-zinc-900/50 p-4 text-base leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none disabled:opacity-60"
                placeholder="הדביקו כאן הודעה מורכבת, מייל ארוך, או טקסט לא מובנה..."
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
                  הסיכום נעול עד להפעלת מנוי.
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
                  onClick={summarize}
                  disabled={loading || !entitled || entitlementLoading}
                  className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-600/25 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {loading ? (
                    <>
                      <span
                        className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent"
                        aria-hidden
                      />
                      מסכמים...
                    </>
                  ) : (
                    "סכם את ההודעה"
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
                    יש לכם הודעה נוספת לסכם?
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    הדביקו אותה כאן ולחצו על &quot;סכם את ההודעה&quot;.
                  </p>
                </div>
                <label htmlFor="follow-up-email" className="sr-only">
                  מייל נוסף לסיכום
                </label>
                <textarea
                  id="follow-up-email"
                  dir="rtl"
                  className="min-h-[140px] w-full resize-y rounded-xl border border-zinc-700/80 bg-zinc-900/50 p-4 text-base leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none disabled:opacity-60"
                  placeholder="הדביקו כאן הודעה מורכבת נוספת..."
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
                    סכם את ההודעה
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
              מאובטח ופרטי. ההודעה שאתם מדביקים לא נשמרת לאחר הסיכום.
            </span>
          </div>
          <p className="mt-3 text-xs text-zinc-600">
            הכלי עוזר להבין הודעות מורכבות מהר. אם זה נראה חשוד - אל תפעלו לפי
            הבקשות, ודאו ישירות מול השולח בערוץ נוסף.
          </p>
          <div className="mt-8 pb-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-400/50 hover:bg-emerald-500/20 hover:text-white"
            >
              יש לכם הודעה חשודה? עברו למזהה הפישינג
              <span aria-hidden className="text-emerald-300">
                {"\u2190"}
              </span>
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
