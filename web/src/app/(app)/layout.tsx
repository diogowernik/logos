import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { requireUser } from "@/server/auth";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <>
    <header className="app-header"><Link href="/">Logos</Link><LogoutButton /></header>
    <main className="workspace">{children}</main>
  </>;
}
