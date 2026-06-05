import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-6xl items-center justify-center px-6 py-10 sm:px-10">
      <SignUp />
    </main>
  );
}
