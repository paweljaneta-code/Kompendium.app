"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const accountLinks = [
  { href: "/account/profile", label: "Profil" },
  { href: "/account/subscription", label: "Subskrypcja" }
];

type AccountLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function AccountLayout({ children }: AccountLayoutProps) {
  const pathname = usePathname();

  return (
    <main className="mx-auto min-h-[calc(100dvh-3.5rem)] w-full max-w-6xl px-6 py-8 sm:px-10 sm:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Konto</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Zarządzaj profilem i subskrypcją Kompendium.
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <nav className="flex shrink-0 gap-2 lg:w-48 lg:flex-col lg:gap-1">
          {accountLinks.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--primary)] text-white"
                    : "text-gray-600 hover:bg-white hover:text-gray-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </main>
  );
}
