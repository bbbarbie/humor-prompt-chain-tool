import { AppShell } from "@/components/app-shell";
import { requireStudioPageAccess } from "@/lib/auth";

export default async function StudioLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = await requireStudioPageAccess();

  return <AppShell email={user.email}>{children}</AppShell>;
}
