import { AppHeader } from "@/components/layout/AppHeader";

type AppShellLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function AppShellLayout({ children }: AppShellLayoutProps) {
  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
