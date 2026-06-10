import type { ReactNode } from "react";

type ChoiceButtonProps = {
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
};

export function ChoiceButton({
  selected,
  disabled,
  onClick,
  children,
}: ChoiceButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? "border-emerald-500/60 bg-emerald-500/15 text-white"
          : "border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/60"
      }`}
    >
      {children}
    </button>
  );
}
