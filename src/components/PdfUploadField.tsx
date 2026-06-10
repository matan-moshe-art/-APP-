type PdfUploadFieldProps = {
  locked: boolean;
  pdfLoading: boolean;
  pdfFileName: string | null;
  contextText: string;
  onFileSelect: (file: File) => void;
  onContextChange: (value: string) => void;
};

export function PdfUploadField({
  locked,
  pdfLoading,
  pdfFileName,
  contextText,
  onFileSelect,
  onContextChange,
}: PdfUploadFieldProps) {
  return (
    <div>
      <label
        htmlFor="pdf-upload"
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 transition-colors ${
          locked
            ? "cursor-not-allowed border-zinc-800 bg-zinc-900/30 opacity-60"
            : "border-zinc-700 bg-zinc-900/40 hover:border-zinc-600"
        }`}
      >
        <span className="text-sm font-medium text-zinc-300">
          {pdfFileName ?? "בחרו קובץ PDF"}
        </span>
        <span className="mt-1 text-xs text-zinc-500">מטופל כמסמך ארוך</span>
        <input
          id="pdf-upload"
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          disabled={locked || pdfLoading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
            e.target.value = "";
          }}
        />
      </label>
      {pdfLoading ? (
        <p className="mt-2 text-xs text-zinc-500" aria-live="polite">
          קורא את הקובץ...
        </p>
      ) : null}
      <label htmlFor="pdf-context" className="mt-4 block text-sm text-zinc-400">
        הקשר נוסף (אופציונלי)
      </label>
      <textarea
        id="pdf-context"
        dir="rtl"
        rows={3}
        disabled={locked}
        value={contextText}
        onChange={(e) => onContextChange(e.target.value)}
        placeholder="הערה קצרה על המסמך, אם רלוונטי"
        className="mt-2 w-full resize-y rounded-xl border border-zinc-700 bg-zinc-900/50 p-3 text-base text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-50"
      />
    </div>
  );
}
