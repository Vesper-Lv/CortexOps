export function ContentTagChips({ tags }: { tags?: string[] }) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1" aria-label="Content tags">
      {tags.map((tag) => (
        <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
          {tag}
        </span>
      ))}
    </div>
  );
}
