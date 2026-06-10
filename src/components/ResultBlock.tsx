type ResultBlockProps = {
  title: string;
  body: string;
};

export function ResultBlock({ title, body }: ResultBlockProps) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-zinc-300">
        {body}
      </p>
    </section>
  );
}
