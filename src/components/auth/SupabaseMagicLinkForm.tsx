"use client";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseClientEnvConfigured } from "@/lib/supabase/env";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { AuthFullPageCard } from "./AuthFullPageCard";

/* ── Password-strength rules (signup only) ── */

type PasswordRule = {
  id: string;
  label: string;
  test: (pw: string) => boolean;
};

const PASSWORD_RULES: PasswordRule[] = [
  { id: "len", label: "לפחות 8 תווים", test: (pw) => pw.length >= 8 },
  {
    id: "upper",
    label: "אות גדולה באנגלית (A-Z)",
    test: (pw) => /[A-Z]/.test(pw),
  },
  {
    id: "lower",
    label: "אות קטנה באנגלית (a-z)",
    test: (pw) => /[a-z]/.test(pw),
  },
  { id: "digit", label: "ספרה (0-9)", test: (pw) => /[0-9]/.test(pw) },
  {
    id: "special",
    label: "תו מיוחד (!@#$%^&*...)",
    test: (pw) => /[^A-Za-z0-9]/.test(pw),
  },
  {
    id: "ascii",
    label: "אותיות באנגלית בלבד (ללא עברית)",
    test: (pw) => /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~ ]*$/.test(pw),
  },
];

function validatePassword(pw: string): {
  valid: boolean;
  results: { id: string; passed: boolean }[];
} {
  const results = PASSWORD_RULES.map((r) => ({
    id: r.id,
    passed: r.test(pw),
  }));
  return { valid: results.every((r) => r.passed), results };
}

function PasswordChecklist({ password }: { password: string }) {
  const { results } = useMemo(() => validatePassword(password), [password]);
  return (
    <ul className="mt-2 space-y-1 text-xs" dir="rtl">
      {PASSWORD_RULES.map((rule) => {
        const r = results.find((x) => x.id === rule.id);
        const passed = r?.passed ?? false;
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 transition-colors ${
              passed ? "text-emerald-400" : "text-zinc-500"
            }`}
          >
            <span className="inline-block w-4 text-center">
              {passed ? "\u2713" : "\u2022"}
            </span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

/* ── Helpers ── */

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/";
  }
  return raw;
}

type AuthMethod = "magic" | "password";
type PasswordMode = "signin" | "signup";

type CodedError = { message: string; code: string };

function mapAuthErrorToCoded(raw: string | null): CodedError | null {
  if (!raw) return null;

  if (raw === "auth" || raw === "session") {
    return {
      message: "לא הצלחנו להשלים את ההתחברות. נסו שוב.",
      code: "AUTH-301",
    };
  }
  if (raw === "link") {
    return {
      message: "קישור ההתחברות לא תקין או שפג תוקפו. בקשו קישור חדש.",
      code: "AUTH-302",
    };
  }
  if (raw === "rate_limit") {
    return {
      message: "הגעתם למגבלת שליחת מיילים זמנית. נסו שוב בעוד זמן קצר.",
      code: "AUTH-303",
    };
  }

  return {
    message: "לא הצלחנו להשלים את ההתחברות. נסו שוב.",
    code: "AUTH-300",
  };
}

function mapSupabaseSignInErrorToCoded(
  err: { status?: number; code?: string; message?: string } | null,
): CodedError {
  if (!err) {
    return {
      message: "אירעה שגיאה. נסו שוב בעוד רגע.",
      code: "AUTH-100",
    };
  }
  const msg = (err.message || "").toLowerCase();

  if (err.status === 429 || err.code === "over_email_send_rate_limit") {
    return {
      message: "הגעתם למגבלת שליחת מיילים זמנית. נסו שוב בעוד זמן קצר.",
      code: "AUTH-104",
    };
  }
  if (
    err.code === "invalid_credentials" ||
    msg.includes("invalid login credentials")
  ) {
    return {
      message: "האימייל או הסיסמה שגויים.",
      code: "AUTH-101",
    };
  }
  if (msg.includes("email not confirmed")) {
    return {
      message: "החשבון נוצר, אבל צריך לאשר את האימייל לפני כניסה.",
      code: "AUTH-102",
    };
  }

  return {
    message: "לא הצלחנו להשלים את הכניסה. נסו שוב.",
    code: "AUTH-103",
  };
}

function mapSupabaseSignUpErrorToCoded(
  err: { status?: number; code?: string; message?: string } | null,
): CodedError {
  if (!err) {
    return {
      message: "ההרשמה נכשלה. נסו שוב.",
      code: "REG-100",
    };
  }
  const msg = (err.message || "").toLowerCase();

  if (err.status === 429 || err.code === "over_email_send_rate_limit") {
    return {
      message: "הגעתם למגבלת שליחת מיילים זמנית. נסו שוב בעוד זמן קצר.",
      code: "REG-104",
    };
  }
  if (msg.includes("password should be at least")) {
    return {
      message: "הסיסמה חלשה מדי. בחרו סיסמה חזקה יותר.",
      code: "REG-101",
    };
  }
  if (msg.includes("user already registered")) {
    return {
      message: "כבר קיים חשבון עם האימייל הזה. נסו להתחבר.",
      code: "REG-102",
    };
  }
  if (msg.includes("signup is disabled")) {
    return {
      message: "הרשמה חדשה אינה זמינה כרגע.",
      code: "REG-103",
    };
  }

  return {
    message: "ההרשמה נכשלה. נסו שוב בעוד רגע.",
    code: "REG-105",
  };
}

function mapRuntimeErrorToCoded(err: unknown): CodedError {
  const message = err instanceof Error ? err.message.toLowerCase() : "";
  if (message.includes("failed to fetch") || message.includes("network")) {
    return {
      message:
        "אין כרגע חיבור לשרת ההתחברות. בדקו אינטרנט והגדרות Supabase ונסו שוב.",
      code: "AUTH-201",
    };
  }
  return {
    message: "אירעה שגיאה. נסו שוב בעוד רגע.",
    code: "AUTH-200",
  };
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
  const initialError = mapAuthErrorToCoded(authError);
  const [error, setError] = useState<CodedError | null>(initialError);
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (!isSupabaseClientEnvConfigured()) {
    return (
      <AuthFullPageCard>
        <p className="text-center text-sm leading-relaxed text-zinc-300">
          ההתחברות לא זמינה כרגע. נסו שוב בעוד כמה דקות.
          <span className="me-2 font-mono text-xs text-zinc-500">
            (AUTH-001)
          </span>
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
      setError({ message: "נא להזין כתובת אימייל.", code: "AUTH-110" });
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
        setError(mapSupabaseSignInErrorToCoded(signErr));
        return;
      }
      setSent(true);
    } catch (err) {
      setError(mapRuntimeErrorToCoded(err));
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
      setError({ message: "נא להזין כתובת אימייל.", code: "AUTH-110" });
      return;
    }
    if (!password) {
      setError({ message: "נא להזין סיסמה.", code: "AUTH-111" });
      return;
    }
    if (passwordMode === "signup") {
      const { valid } = validatePassword(password);
      if (!valid) {
        setError({
          message: "הסיסמה לא עומדת בכל הדרישות. בדקו את הרשימה למטה.",
          code: "REG-110",
        });
        return;
      }
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
          setError(mapSupabaseSignInErrorToCoded(signInError));
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
        setError(mapSupabaseSignUpErrorToCoded(signUpError));
        return;
      }
      await syncAppUserRecord();
      setMessage(
        "ההרשמה בוצעה. אם נדרש אימות מייל, נשלחה אליכם הודעה להשלמת הכניסה.",
      );
      setPassword("");
      setPasswordMode("signin");
    } catch (err) {
      setError(mapRuntimeErrorToCoded(err));
    } finally {
      setBusy(false);
    }
  }

  function resetView() {
    setError(null);
    setMessage(null);
    setSent(false);
  }

  return (
    <AuthFullPageCard>
      <div className="mb-4 text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-green-600 text-2xl shadow-lg shadow-emerald-600/35">
          {"\u{1F6E1}\uFE0F"}
        </div>
        <h1
          id={`${formId}-title`}
          className="bg-gradient-to-l from-emerald-200 via-green-200 to-emerald-300 bg-clip-text text-xl font-extrabold text-transparent sm:text-2xl"
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
              ? "bg-emerald-500/25 text-emerald-100"
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
              ? "bg-emerald-500/25 text-emerald-100"
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
              className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 outline-none ring-emerald-500/30 transition placeholder:text-zinc-600 focus:border-emerald-500/40 focus:ring-2 disabled:opacity-60"
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
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/80 px-2 focus-within:border-emerald-500/40 focus-within:ring-2 focus-within:ring-emerald-500/30">
                  <input
                    id={`${formId}-password`}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      passwordMode === "signin"
                        ? "current-password"
                        : "new-password"
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
                {passwordMode === "signup" && (
                  <PasswordChecklist password={password} />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-zinc-950/50 p-1">
                <button
                  type="button"
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    passwordMode === "signin"
                      ? "bg-emerald-500/25 text-emerald-100"
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
                      ? "bg-emerald-500/25 text-emerald-100"
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
              {error.message}
              <span className="me-2 font-mono text-xs text-red-300/80">
                ({error.code})
              </span>
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-l from-emerald-600 to-green-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:opacity-95 disabled:opacity-50"
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
