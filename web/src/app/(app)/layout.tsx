import { requireUser } from "@/server/auth";
import { LibraryShell } from "@/features/library/LibraryShell";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <LibraryShell>{children}</LibraryShell>;
}
