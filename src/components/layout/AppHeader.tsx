"use client";

import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { useHydrated } from "@/lib/useHydrated";

export function AppHeader() {
  const mounted = useHydrated();

  return (
    <header className="app-top-header sticky top-0 z-[100] border-b border-[#eae5dd] bg-[rgba(250,248,245,0.92)] backdrop-blur-[16px]">
      <div className="mx-auto flex h-14 w-full max-w-[960px] items-center justify-between gap-3 px-6 sm:px-6">
        <Link
          href="/"
          className="shrink-0 font-[family-name:var(--font-dm-serif)] text-xl tracking-tight text-[#2c2825]"
        >
          Kompendium<span className="text-[#2a7a5a]">.</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
            Cennik
          </Link>
          {mounted ? (
            <>
              <Show when="signed-in">
                <Link href="/account" className="text-gray-600 hover:text-gray-900">
                  Konto
                </Link>
              </Show>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-gray-700">
                    Zaloguj
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[var(--primary-foreground)]">
                    Rejestracja
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <UserButton userProfileUrl="/account/profile" />
              </Show>
            </>
          ) : (
            <span className="inline-block h-9 w-[168px]" aria-hidden="true" />
          )}
        </nav>
      </div>
    </header>
  );
}
