"use client";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseClientEnvConfigured } from "@/lib/supabase/env";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { AuthFullPageCard } from "./AuthFullPageCard";

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/";
  }
  return raw;
}

type AuthMethod = "magic" | "password";
type PasswordMode = "signin" | "signup";

function mapAuthErrorToHebrew(raw: string | null): string | null {
  if (!raw) return null;

  if (raw === "auth" || raw === "session") {
    return "לא הצלחנו להשלים את ההתחברות. נסו שוב.";
  }
  if (raw === "link") {
    return "קישור ההתחברות לא תקין או שפג תוקפו. בקשו קישור חדש.";
  }
  if (raw === "rate_limit") {
    return "הגעתם למגבלת שליחת מיילים זמנית. נסו שוב בעוד זמן קצר.";
  }

  return "לא הצלחנו להשלים את ההתחברות. נסו שוב.";
}

function mapSupabaseErrorToHebrew(
  err: { status?: number; code?: string; message?: string } | null,
): string {
  if (!err) return "אירעה שגיאה. נסו שוב בעוד רגע.";
  const msg = (err.message || "").toLowerCase();

  if (err.status === 429 || err.code === "over_email_send_rate_limit") {
    return "הגעתם למגבלת שליחת מיילים זמנית. נסו שוב בעוד זמן קצר.";
  }
  if (
    err.code === "invalid_credentials" ||
    msg.includes("invalid login credentials")
  ) {
    return "האימייל או הסיסמה שגויים.";
  }
  if (msg.includes("email not confirmed")) {
    return "החשבון נוצר, אבל צריך לאשר את האימייל לפני כניסה.";
  }
  if (msg.includes("password should be at least")) {
    return "הסיסמה חלשה מדי. בחרו סיסמה חזקה יותר.";
  }
  if (msg.includes("user already registered")) {
    return "כבר קיים חשבון עם האימייל הזה. נסו להתחבר.";
  }
  if (msg.includes("signup is disabled")) {
    return "הרשמה חדשה אינה זמינה כרגע.";
  }

  return "לא הצלחנו להשלים את הפעולה. נסו שוב.";
}

function mapRuntimeErrorToHebrew(err: unknown): string {
  const message = err instanceof Error ? err.message.toLowerCase() : "";
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "אין כרגע חיבור לשרת ההתחברות. בדקו אינטרנט והגדרות Supabase ונסו שוב.";
  }
  return "אירעה שגיאה. נסו שוב בעוד רגע.";
}

async function syncAppUserRecord(): Promise<void> {
  try {
    await fetch("/api/auth/sync", { method: "POST" });
  } catch {
    // Do not block login UX on sync issues.
  }
}

export function SupabaseMagicLinkForm() {
  const formId = useId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>("magic");
  const [passwordMode, setPasswordMode] = useState<PasswordMode>("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(mapAuthErrorToHebrew(authError));
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (!isSupabaseClientEnvConfigured()) {
    return (
      <AuthFullPageCard>
        <p className="text-center text-sm leading-relaxed text-zinc-300">
          ההתחברות לא זמינה כרגע. נסו שוב בעוד כמה דקות.
        </p>
      </AuthFullPageCard>
    );
  }

  async function onSubmitMagic(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("נא להזין כתובת אימייל.");
      return;
    }

    const origin = window.location.origin;
    const callback = new URL("/auth/callback", origin);
    callback.searchParams.set("next", nextPath);
    const emailRedirectTo = callback.toString();

    setBusy(true);
    try {
      const supabase = createClient();
      const { error: signErr } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo,
          shouldCreateUser: true,
        },
      });
      if (signErr) {
        setError(mapSupabaseErrorToHebrew(signErr));
        return;
      }
      setSent(true);
    } catch (err) {
      setError(mapRuntimeErrorToHebrew(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("נא להזין כתובת אימייל.");
      return;
    }
    if (!password) {
      setError("נא להזין סיסמה.");
      return;
    }
    if (passwordMode === "signup" && password.length < 6) {
      setError("הסיסמה חייבת לכלול לפחות 6 תווים.");
      return;
    }

    const origin = window.location.origin;
    const callback = new URL("/auth/callback", origin);
    callback.searchParams.set("next", nextPath);
    const emailRedirectTo = callback.toString();

    setBusy(true);
    try {
      const supabase = createClient();
      if (passwordMode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });
        if (signInError) {
          setError(mapSupabaseErrorToHebrew(signInError));
          return;
        }
        await syncAppUserRecord();
        router.replace(nextPath);
        router.refresh();
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email: trimmed,
        password,
        options: {
          emailRedirectTo,
        },
      });
      if (signUpError) {
        setError(mapSupabaseErrorToHebrew(signUpError));
        return;
      }
      await syncAppUserRecord();
      setMessage("ההרשמה בוצעה. אם נדרש אימות מייל, נשלחה אליכם הודעה להשלמת הכניסה.");
      setPassword("");
      setPasswordMode("signin");
    } catch (err) {
      setError(mapRuntimeErrorToHebrew(err));
    } finally {
      setBusy(false);
    }
  }

  function resetView() {
    setError(null);
    setMessage(null);
    setSent(false);
  }

  const loginUrl =
    nextPath === "/"
      ? "/auth/login"
      : `/auth/login?next=${encodeURIComponent(nextPath)}`;

  return (
    <AuthFullPageCard>
      <div className="mb-4 text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-2xl shadow-lg shadow-violet-600/35">
          {"\u{1F6E1}\uFE0F"}
        </div>
        <h1
          id={`${formId}-title`}
          className="bg-gradient-to-l from-violet-200 via-fuchsia-200 to-violet-300 bg-clip-text text-xl font-extrabold text-transparent sm:text-2xl"
        >
          התחברות לחשבון
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400 sm:text-base">
          בחרו את שיטת ההתחברות המועדפת עליכם.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-zinc-950/50 p-1">
        <button
          type="button"
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            authMethod === "magic"
              ? "bg-violet-500/25 text-violet-100"
              : "text-zinc-300 hover:bg-white/5"
          }`}
          onClick={() => {
            setAuthMethod("magic");
            resetView();
          }}
          disabled={busy}
        >
          קישור למייל
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            authMethod === "password"
              ? "bg-violet-500/25 text-violet-100"
              : "text-zinc-300 hover:bg-white/5"
          }`}
          onClick={() => {
            setAuthMethod("password");
            resetView();
          }}
          disabled={busy}
        >
          אימייל וסיסמה
        </button>
      </div>

      {authMethod === "magic" && sent ? (
        <div
          className="rounded-2xl border border-teal-500/25 bg-teal-500/10 p-4 text-center text-sm text-teal-100"
          role="status"
        >
          נשלח קישור לאימייל. פתחו אותו באותו דפדפן כדי להשלים את הכניסה.
        </div>
      ) : (
        <form
          onSubmit={authMethod === "magic" ? onSubmitMagic : onSubmitPassword}
          className="space-y-4"
          aria-labelledby={`${formId}-title`}
        >
          <div className="text-start" dir="ltr">
            <label
              htmlFor={`${formId}-email`}
              className="mb-1.5 block text-xs font-medium text-zinc-400"
            >
              אימייל
            </label>
            <input
              id={`${formId}-email`}
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 outline-none ring-violet-500/30 transition placeholder:text-zinc-600 focus:border-violet-500/40 focus:ring-2 disabled:opacity-60"
              placeholder="name@example.com"
            />
          </div>

          {authMethod === "password" ? (
            <>
              <div className="text-start" dir="ltr">
                <label
                  htmlFor={`${formId}-password`}
                  className="mb-1.5 block text-xs font-medium text-zinc-400"
                >
                  סיסמה
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/80 px-2 focus-within:border-violet-500/40 focus-within:ring-2 focus-within:ring-violet-500/30">
                  <input
                    id={`${formId}-password`}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      passwordMode === "signin" ? "current-password" : "new-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                    className="w-full bg-transparent px-2 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 disabled:opacity-60"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="rounded-md px-2 py-1 text-xs text-zinc-300 transition hover:bg-white/5"
                  >
                    {showPassword ? "הסתר" : "הצג"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-zinc-950/50 p-1">
                <button
                  type="button"
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    passwordMode === "signin"
                      ? "bg-violet-500/25 text-violet-100"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                  onClick={() => {
                    setPasswordMode("signin");
                    setError(null);
                    setMessage(null);
                  }}
                  disabled={busy}
                >
                  כניסה
                </button>
                <button
                  type="button"
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    passwordMode === "signup"
                      ? "bg-violet-500/25 text-violet-100"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                  onClick={() => {
                    setPasswordMode("signup");
                    setError(null);
                    setMessage(null);
                  }}
                  disabled={busy}
                >
                  הרשמה
                </button>
              </div>
            </>
          ) : null}

          {message ? (
            <p className="text-center text-sm text-teal-300" role="status">
              {message}
            </p>
          ) : null}

          {error ? (
            <p className="text-center text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-l from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:opacity-95 disabled:opacity-50"
          >
            {authMethod === "magic"
              ? busy
                ? "שולחים…"
                : "שלחו לי קישור"
              : passwordMode === "signin"
                ? busy
                  ? "מתחברים…"
                  : "כניסה עם סיסמה"
                : busy
                  ? "יוצרים חשבון…"
                  : "יצירת חשבון"}
          </button>
        </form>
      )}

    </AuthFullPageCard>
  );
}
