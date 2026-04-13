"use client";

import { useCallback, useState } from "react";

type Result = {
  meaning: string;
  urgency: string;
  action: string;
  suspicious: string;
};

const SECTIONS: {
  key: keyof Result;
  title: string;
  accent: string;
  bar: string;
}[] = [
  {
    key: "meaning",
    title: "פירוש פשוט",
    accent: "border-sky-200 bg-sky-50/80",
    bar: "bg-sky-500",
  },
  {
    key: "urgency",
    title: "רמת דחיפות",
    accent: "border-orange-200 bg-orange-50/80",
    bar: "bg-orange-500",
  },
  {
    key: "action",
    title: "מה לעשות עכשיו",
    accent: "border-emerald-200 bg-emerald-50/80",
    bar: "bg-emerald-600",
  },
  {
    key: "suspicious",
    title: "מה נראה חשוד או חריג",
    accent: "border-amber-200 bg-amber-50/80",
    bar: "bg-amber-500",
  },
];

function SkeletonCards() {
  return (
    <div className="mt-10 flex w-full flex-col gap-4" aria-busy="true">
      {SECTIONS.map((s) => (
        <div
          key={s.key}
          className={`relative overflow-hidden rounded-xl border border-stone-200 bg-white p-5 shadow-sm ${s.accent}`}
        >
          <div
            className={`absolute end-0 top-0 h-full w-1 ${s.bar} opacity-60`}
            aria-hidden
          />
          <div className="mb-3 h-5 w-40 animate-pulse rounded bg-stone-200" />
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-stone-200" />
            <div className="h-3 w-[92%] animate-pulse rounded bg-stone-200" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-stone-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [text, setText] = useState("");
  const [validation, setValidation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  const resetOutputs = useCallback(() => {
    setResult(null);
    setError(null);
    setQueuedMessage(null);
    setShowResults(false);
  }, []);

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

    setLoading(true);
    setShowResults(true);
    setResult(null);
    setError(null);
    setQueuedMessage(null);

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
        "message" in data &&
        typeof (data as { message: unknown }).message === "string"
      ) {
        setQueuedMessage((data as { message: string }).message);
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
      setLoading(false);
    }
  }, [text, resetOutputs]);

  const clearAndReset = useCallback(() => {
    setText("");
    setValidation(null);
    setResult(null);
    setError(null);
    setQueuedMessage(null);
    setShowResults(false);
  }, []);

  return (
    <div className="flex min-h-full flex-col">
      <main className="mx-auto flex w-full max-w-[700px] flex-1 flex-col px-4 py-8 sm:py-12">
        <header className="text-right">
          <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">
            מנתח הודעות רשמיות
          </h1>
          <p className="mt-2 text-base leading-relaxed text-stone-600">
            הדביקו הודעה רשמית וקבלו הסבר פשוט, רמת דחיפות, מה לעשות, ומה חשוד
          </p>
          <p className="mt-2 text-sm text-stone-500">
            הכלי לא מספק ייעוץ משפטי. המטרה היא בהירות בלבד.
          </p>
        </header>

        <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          <label htmlFor="message" className="sr-only">
            הודעה רשמית
          </label>
          <textarea
            id="message"
            dir="rtl"
            className="min-h-[200px] w-full resize-y rounded-xl border border-stone-200 bg-stone-50/50 p-4 text-base leading-relaxed text-stone-900 placeholder:text-stone-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-60"
            placeholder="הדביקו כאן את ההודעה הרשמית..."
            value={text}
            maxLength={5000}
            disabled={loading}
            onChange={(e) => {
              setText(e.target.value);
              if (validation) setValidation(null);
            }}
          />
          <div className="mt-2 flex justify-between text-xs text-stone-400">
            <span>{text.length} / 5000</span>
          </div>
          {validation ? (
            <p
              className="mt-3 text-sm font-medium text-red-600"
              role="alert"
            >
              {validation}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-start">
            <button
              type="button"
              onClick={analyze}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-400 sm:w-auto"
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
              className="inline-flex w-full items-center justify-center rounded-xl border border-stone-300 bg-white px-6 py-3.5 text-base font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50 sm:w-auto"
            >
              נקה ונתח מחדש
            </button>
          </div>
        </section>

        {!showResults ? null : loading ? (
          <SkeletonCards />
        ) : error ? (
          <div
            className="relative mt-10 overflow-hidden rounded-xl border border-red-200 bg-red-50 p-5 text-right shadow-sm"
            role="alert"
          >
            <div
              className="absolute end-0 top-0 h-full w-1 bg-red-500"
              aria-hidden
            />
            <h2 className="text-lg font-bold text-red-900">שגיאה</h2>
            <p className="mt-2 text-red-800">{error}</p>
          </div>
        ) : queuedMessage ? (
          <div
            className="relative mt-10 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-right shadow-sm"
            role="status"
          >
            <div
              className="absolute end-0 top-0 h-full w-1 bg-emerald-500"
              aria-hidden
            />
            <h2 className="text-lg font-bold text-emerald-900">נשלח לעיבוד</h2>
            <p className="mt-2 text-emerald-900">{queuedMessage}</p>
          </div>
        ) : result ? (
          <div className="mt-10 flex w-full flex-col gap-4">
            {SECTIONS.map((s) => (
              <article
                key={s.key}
                className={`relative overflow-hidden rounded-xl border bg-white p-5 text-right shadow-sm ${s.accent}`}
              >
                <div
                  className={`absolute end-0 top-0 h-full w-1 ${s.bar}`}
                  aria-hidden
                />
                <h2 className="text-lg font-bold text-stone-900">{s.title}</h2>
                <div className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-stone-800">
                  {result[s.key]}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
}
