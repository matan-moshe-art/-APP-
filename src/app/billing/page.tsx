"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SubResponse = {
  entitled: boolean;
  subscription: {
    status: string;
    currentPeriodEnd?: string | null;
    planId?: string | null;
  } | null;
};

async function safeJson<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export default function BillingPage() {
  const router = useRouter();
  const [sub, setSub] = useState<SubResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const loadSub = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/billing/subscription");
      if (!res.ok) {
        if (res.status === 401) {
          router.replace("/auth/login?next=%2Fbilling");
          return;
        }
        const errorData = await safeJson<{ message?: string }>(res);
        setSub(null);
        setError(errorData?.message ?? "לא ניתן לטעון את סטטוס המנוי כרגע.");
        return;
      }
      const data = await safeJson<SubResponse>(res);
      if (!data) {
        throw new Error("תשובה לא תקינה מהשרת.");
      }
      setSub(data);
    } catch {
      setError("לא ניתן לטעון את סטטוס החיוב כרגע.");
    }
  }, [router]);

  useEffect(() => {
    void loadSub();
  }, [loadSub]);

  const activateSubscription = useCallback(async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      if (res.status === 401) {
        router.replace("/auth/login?next=%2Fbilling");
        return;
      }
      const data = await safeJson<{
        checkoutUrl?: string;
        message?: string;
        testMode?: boolean;
      }>(res);
      if (!res.ok) {
        throw new Error(data?.message ?? "הפעלת מנוי נכשלה.");
      }

      if (data?.testMode || data?.checkoutUrl?.startsWith("/")) {
        setNotice("המנוי הופעל בהצלחה!");
        await loadSub();
        return;
      }

      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      throw new Error("הפעלת מנוי נכשלה.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "הפעלת מנוי נכשלה.");
    } finally {
      setBusy(false);
    }
  }, [loadSub, router]);

  const cancelSubscription = useCallback(async () => {
    setShowCancelConfirm(false);
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      if (res.status === 401) {
        router.replace("/auth/login?next=%2Fbilling");
        return;
      }
      const data = await safeJson<{ message?: string }>(res);
      if (!res.ok) {
        throw new Error(data?.message ?? "ביטול מנוי נכשל.");
      }
      setNotice(data?.message ?? "המנוי בוטל בהצלחה.");
      await loadSub();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "ביטול מנוי נכשל.");
    } finally {
      setBusy(false);
    }
  }, [loadSub, router]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 text-right sm:px-6">
      <button
        type="button"
        onClick={() => router.push("/")}
        className="mb-4 flex items-center gap-1.5 self-end text-sm font-medium text-zinc-400 transition-colors hover:text-white"
      >
        <span>→</span>
        <span>חזרה לעמוד הבית</span>
      </button>
      <h1 className="text-3xl font-bold text-white">מנוי ותשלומים</h1>
      <p className="mt-2 text-zinc-400">
        הפעלה וביטול מנוי. התשלום מתבצע בדף מאובטח של ספק הסליקה.
      </p>

      <section className="glass-dark-strong mt-8 rounded-2xl border border-white/10 p-6">
        <div className="mb-4 rounded-xl border border-teal-500/25 bg-teal-500/10 p-3">
          <p className="text-sm font-semibold text-teal-100">
            תכנית בדיקה: 0 ש&quot;ח
          </p>
          <p className="mt-1 text-xs text-teal-200/90">
            בזמן בדיקה, לחיצה על הפעלת מנוי מפעילה הרשאה מיידית לניתוח.
          </p>
        </div>

        <p className="text-sm text-zinc-400">סטטוס מנוי</p>
        <p className="mt-2 text-lg font-semibold text-white">
          {sub?.entitled ? "פעיל" : "לא פעיל"}
        </p>

        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        {notice ? (
          <p className="mt-3 text-sm text-teal-300">{notice}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={activateSubscription}
            className="btn-primary rounded-full px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            הפעלת מנוי (0 ש&quot;ח)
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setShowCancelConfirm(true)}
            className="btn-ghost rounded-full border border-rose-500/40 px-5 py-2.5 text-sm font-medium text-rose-200 disabled:opacity-60"
          >
            ביטול מנוי
          </button>
        </div>
      </section>

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-dark-strong mx-4 w-full max-w-md rounded-2xl border border-white/10 p-6 text-right">
            <h2 className="text-lg font-bold text-white">ביטול מנוי</h2>
            <p className="mt-3 text-sm text-zinc-300">
              האם אתה בטוח שברצונך לבטל את המנוי?
            </p>
            <div className="mt-6 flex flex-wrap justify-start gap-3">
              <button
                type="button"
                onClick={cancelSubscription}
                className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
              >
                כן, בטל את המנוי
              </button>
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="btn-ghost rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/5"
              >
                חזרה
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
