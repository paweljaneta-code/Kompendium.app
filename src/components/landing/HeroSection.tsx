import Link from "next/link";

export function HeroSection() {
  return (
    <section className="rounded-3xl border border-[var(--card-border)] bg-white/80 p-8 shadow-sm backdrop-blur sm:p-12">
      <p className="inline-flex rounded-full bg-green-50 px-4 py-1 text-sm font-medium text-green-700">
        Spokoj. Uwaga. Regeneracja.
      </p>
      <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
        Twoje miejsce do codziennego dbania o dobrostan psychiczny.
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
        Nowoczesna i minimalistyczna przestrzen terapeutyczna, ktora pomoze Ci
        budowac zdrowe rytualy, monitorowac nastroj i korzystac z praktycznych
        narzedzi wsparcia.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-medium text-[var(--primary-foreground)] transition hover:opacity-90"
        >
          Rozpocznij teraz
        </Link>
        <Link
          href="/pricing"
          className="rounded-xl border border-[var(--card-border)] bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Zobacz cennik
        </Link>
      </div>
    </section>
  );
}
