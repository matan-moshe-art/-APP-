"use client";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseClientEnvConfigured } from "@/lib/supabase/env";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";

function getDisplayName(user: User | null): string {
  if (!user) return "";
  const fromMetadata =
    (typeof user.user_metadata?.full_name === "string" &&
      user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    "";
  const trimmed = fromMetadata.trim();
  if (trimmed) return trimmed;
  return "הפרופיל שלי";
}

function getAvatarUrl(user: User | null): string {
  if (!user) return "";
  const raw =
    (typeof user.user_metadata?.avatar_url === "string" &&
      user.user_metadata.avatar_url) ||
    (typeof user.user_metadata?.picture === "string" &&
      user.user_metadata.picture) ||
    "";
  return raw.trim();
}

function createColorAvatar(bg: string, fg: string, symbol: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="${bg}"/><text x="50%" y="53%" text-anchor="middle" dominant-baseline="middle" font-size="30" font-family="Arial, sans-serif" fill="${fg}">${symbol}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const PRESET_AVATARS = [
  createColorAvatar("#7c3aed", "#ffffff", "A"),
  createColorAvatar("#0ea5e9", "#ffffff", "B"),
  createColorAvatar("#14b8a6", "#ffffff", "C"),
  createColorAvatar("#e11d48", "#ffffff", "D"),
  createColorAvatar("#22c55e", "#0b0f19", "E"),
  createColorAvatar("#f97316", "#ffffff", "F"),
  createColorAvatar("#6366f1", "#ffffff", "G"),
  createColorAvatar("#f43f5e", "#ffffff", "H"),
  createColorAvatar("#a855f7", "#ffffff", "I"),
  createColorAvatar("#06b6d4", "#0b0f19", "J"),
  createColorAvatar("#84cc16", "#0b0f19", "K"),
  createColorAvatar("#ef4444", "#ffffff", "L"),
];

function normalizeAvatar(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:image/")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    return "";
  }
  return "";
}

function NavAuthLinkInner() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftAvatarUrl, setDraftAvatarUrl] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const initials = useMemo(() => {
    const email = user?.email?.trim() ?? "";
    if (email) {
      const firstChar = email[0];
      if (firstChar && /[a-zA-Z]/.test(firstChar)) {
        return firstChar.toUpperCase();
      }
    }
    const name = displayName.trim();
    if (name && name !== "הפרופיל שלי") {
      return name[0]?.toUpperCase() ?? "U";
    }
    return "U";
  }, [displayName, user?.email]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const applyUser = (u: User | null) => {
      if (cancelled) return;
      setUser(u);
      const initialName = getDisplayName(u);
      const initialAvatar = getAvatarUrl(u);
      setDisplayName(initialName);
      setAvatarUrl(initialAvatar);
      setDraftName(initialName);
      setDraftAvatarUrl(initialAvatar);
      setLoading(false);
    };

    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        applyUser(session?.user ?? null);
      })
      .catch(() => {
        applyUser(null);
      });

    void supabase.auth
      .getUser()
      .then(({ data: { user: u } }) => {
        applyUser(u);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) {
        const nextUser = session?.user ?? null;
        setUser(nextUser);
        const nextName = getDisplayName(nextUser);
        const nextAvatar = getAvatarUrl(nextUser);
        setDisplayName(nextName);
        setAvatarUrl(nextAvatar);
        setDraftName(nextName);
        setDraftAvatarUrl(nextAvatar);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (!rootRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  if (loading) {
    return (
      <span
        className="inline-flex min-h-9 min-w-16 items-center justify-center rounded-full border border-white/10 bg-zinc-950/50 px-4 text-sm text-zinc-500"
        aria-busy="true"
      >
        …
      </span>
    );
  }

  if (user) {
    return (
      <div ref={rootRef} className="relative flex items-center gap-4">
        {/* Email - Far Right */}
        <span className="max-w-[180px] truncate text-xs text-zinc-400" dir="ltr">
          {user.email?.trim() || ""}
        </span>

        {/* Avatar - Next to Email */}
        <button
          type="button"
          className="flex-shrink-0 rounded-full border-2 border-violet-500/40 p-0.5 transition hover:border-violet-400/70"
          onClick={() => {
            setDraftName(displayName);
            setDraftAvatarUrl(avatarUrl);
            setSaveMessage(null);
            setMenuOpen((prev) => !prev);
          }}
          aria-label="פתח הגדרות פרופיל"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="rounded-full object-cover"
              style={{ width: 32, height: 32 }}
            />
          ) : (
            <span
              className="inline-flex items-center justify-center rounded-full bg-violet-700/70 text-sm font-semibold text-white"
              style={{ width: 32, height: 32 }}
            >
              {initials}
            </span>
          )}
        </button>

        {/* Display Name - Next to Avatar */}
        <span className="max-w-[120px] truncate text-sm font-semibold text-zinc-100">
          {displayName}
        </span>

        {/* Logout Button - Visible in header */}
        <button
          type="button"
          className="hidden rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-red-400/40 hover:text-red-300 sm:inline-flex"
          onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            router.replace("/auth/login");
            router.refresh();
          }}
        >
          יציאה
        </button>

        {/* Dropdown Menu */}
        {menuOpen ? (
          <div className="absolute left-0 top-12 z-50 w-80 rounded-2xl border border-white/10 bg-zinc-950/95 p-4 shadow-2xl shadow-black/40 backdrop-blur">
            {/* Profile Name Input Section */}
            <div className="mb-4 rounded-lg border border-white/5 bg-zinc-900/50 p-3">
              <label className="mb-2 block text-xs font-medium text-zinc-400">
                איך לקרוא לך באתר?
              </label>
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="לדוגמה: מתן"
                className="w-full rounded-lg border border-white/10 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500/50"
              />
              <p className="mt-1.5 text-[10px] text-zinc-500">
                השם שתרשום כאן יופיע בכל מקום באתר
              </p>
            </div>

            {/* Avatar Selection Section */}
            <div className="mb-4 rounded-lg border border-white/5 bg-zinc-900/50 p-3">
              <label className="mb-2 block text-xs font-medium text-zinc-400">בחירת תמונת פרופיל</label>
              <div className="mb-3 grid grid-cols-6 gap-2">
                {PRESET_AVATARS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`rounded-full border p-0.5 transition ${
                      draftAvatarUrl === preset
                        ? "border-violet-400 ring-2 ring-violet-500/30"
                        : "border-white/10 hover:border-white/35"
                    }`}
                    onClick={() => setDraftAvatarUrl(preset)}
                    aria-label="בחירת אווטר"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preset}
                      alt=""
                      className="rounded-full object-cover"
                      style={{ width: 30, height: 30, minWidth: 30, minHeight: 30 }}
                    />
                  </button>
                ))}
              </div>
              <label className="mb-1.5 block text-[10px] text-zinc-500">
                או קישור חיצוני לתמונה
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={draftAvatarUrl}
                  onChange={(e) => setDraftAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 rounded-lg border border-white/10 bg-zinc-800/80 px-3 py-1.5 text-xs text-zinc-100 outline-none focus:border-violet-500/50"
                />
                <button
                  type="button"
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-[10px] text-zinc-400 transition hover:border-white/25 hover:text-zinc-300"
                  onClick={() => setDraftAvatarUrl("")}
                >
                  נקה
                </button>
              </div>
            </div>

            {/* Save Message */}
            {saveMessage ? (
              <div className="mb-3 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2">
                <p className="text-xs text-teal-300">{saveMessage}</p>
              </div>
            ) : null}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={savingProfile}
                className="btn-primary flex-1 rounded-full px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                onClick={async () => {
                  setSavingProfile(true);
                  setSaveMessage(null);
                  const supabase = createClient();
                  const nextName = draftName.trim();
                  const nextAvatar = normalizeAvatar(draftAvatarUrl);
                  const { error } = await supabase.auth.updateUser({
                    data: {
                      full_name: nextName || null,
                      name: nextName || null,
                      avatar_url: nextAvatar || null,
                    },
                  });
                  if (error) {
                    setSaveMessage("לא הצלחנו לשמור כרגע. נסו שוב.");
                    setSavingProfile(false);
                    return;
                  }
                  const visibleName = nextName || "הפרופיל שלי";
                  setDisplayName(visibleName);
                  setAvatarUrl(nextAvatar);
                  setDraftName(visibleName);
                  setDraftAvatarUrl(nextAvatar);
                  setUser((prev) =>
                    prev
                      ? {
                          ...prev,
                          user_metadata: {
                            ...(prev.user_metadata ?? {}),
                            full_name: visibleName,
                            name: visibleName,
                            avatar_url: nextAvatar || null,
                          },
                        }
                      : prev,
                  );
                  try {
                    await fetch("/api/auth/sync", { method: "POST" });
                  } catch {
                    // non-blocking
                  }
                  setSaveMessage("הפרופיל נשמר בהצלחה!");
                  setSavingProfile(false);
                }}
              >
                {savingProfile ? "שומרים..." : "שמור שינויים"}
              </button>
              <button
                type="button"
                className="rounded-full border border-white/15 px-4 py-2.5 text-xs text-zinc-300 transition hover:border-white/25"
                onClick={() => {
                  setDraftName(displayName);
                  setDraftAvatarUrl(avatarUrl);
                  setSaveMessage(null);
                  setMenuOpen(false);
                }}
              >
                סגור
              </button>
            </div>

          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      href="/auth/login"
      className="inline-flex min-h-9 items-center justify-center rounded-full border border-violet-500/40 bg-violet-600/20 px-4 text-sm font-semibold text-violet-100 shadow-sm shadow-violet-900/20 transition hover:border-violet-400/60 hover:bg-violet-600/35 hover:text-white"
    >
      כניסה
    </Link>
  );
}

/** Login / logout in the marketing header (Supabase Auth). */
export function NavAuthLink() {
  if (!isSupabaseClientEnvConfigured()) return null;
  return <NavAuthLinkInner />;
}
