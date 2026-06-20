"use client";

import { useEffect, useState } from "react";

type LoadingBarProps = {
  label: string;
};

export function LoadingBar({ label }: LoadingBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      let next: number;
      if (elapsed < 8) next = (elapsed / 8) * 30;
      else if (elapsed < 23) next = 30 + ((elapsed - 8) / 15) * 60;
      else if (elapsed < 28) next = 90 + ((elapsed - 23) / 5) * 9;
      else next = 99;
      setProgress((prev) => Math.max(prev, Math.min(99, next)));
    }, 200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mt-8" aria-busy="true" aria-live="polite">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-emerald-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-zinc-500">{label}</p>
    </div>
  );
}
