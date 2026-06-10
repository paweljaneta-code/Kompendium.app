import { UserProfile } from "@clerk/nextjs";

export default function ProfilePage() {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-white shadow-sm">
      <UserProfile
        routing="path"
        path="/account/profile"
        appearance={{
          elements: {
            rootBox: "w-full",
            cardBox: "w-full shadow-none",
            card: "rounded-2xl border-0 shadow-none",
            navbar: "hidden",
            pageScrollBox: "p-0"
          }
        }}
      />
    </section>
  );
}
