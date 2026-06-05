type FeatureCardProps = {
  title: string;
  description: string;
};

export function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <article className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{description}</p>
    </article>
  );
}
