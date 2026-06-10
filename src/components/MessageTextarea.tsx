type MessageTextareaProps = {
  locked: boolean;
  value: string;
  maxLength: number;
  placeholder: string;
  onChange: (value: string) => void;
};

export function MessageTextarea({
  locked,
  value,
  maxLength,
  placeholder,
  onChange,
}: MessageTextareaProps) {
  return (
    <div>
      <label htmlFor="message-input" className="sr-only">
        תוכן לניתוח
      </label>
      <textarea
        id="message-input"
        dir="rtl"
        rows={10}
        disabled={locked}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 text-base leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-50"
      />
      <p className="mt-1 text-xs text-zinc-600">
        {value.length.toLocaleString("he-IL")} /{" "}
        {maxLength.toLocaleString("he-IL")}
      </p>
    </div>
  );
}
