import { requireUser } from "@/server/auth";
import { LibraryShell } from "@/features/library/LibraryShell";
import { cookies } from "next/headers";
import { DeviceLockProvider } from "@/features/device-lock/DeviceLockProvider";
import { deviceLockCookie } from "@/features/device-lock/preferences";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const lockEnabled = Boolean((await cookies()).get(deviceLockCookie(user.id))?.value);
  return <DeviceLockProvider key={user.id} initialEnabled={lockEnabled}>
    <LibraryShell userId={user.id}>{children}</LibraryShell>
  </DeviceLockProvider>;
}
