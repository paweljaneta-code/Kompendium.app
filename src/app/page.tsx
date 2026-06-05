import { getKompendiumHomeDocument } from "@/lib/originalModules";

export default async function Home() {
  const home = await getKompendiumHomeDocument();

  if (!home) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center px-6">
        <p className="text-sm text-[var(--muted)]">
          Nie udało się wczytać ekranu głównego z kompendium.html.
        </p>
      </main>
    );
  }

  return (
    <iframe
      title="Kompendium — strona główna"
      srcDoc={home.document}
      className="block h-[100dvh] w-full border-0"
    />
  );
}
