import { redirect } from "next/navigation";
import { fetchCurrentUser } from "@/server/django";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  if (await fetchCurrentUser()) redirect("/");
  return <main className="login-page"><section className="login-card">
    <h1>Logos</h1><LoginForm />
  </section></main>;
}
