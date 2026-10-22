import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { fetchCurrentUser } from "./django";

const currentUser = cache(fetchCurrentUser);

export async function requireUser(destination?: "/pwa") {
  const user = await currentUser();
  if (!user) redirect(destination === "/pwa" ? "/login?next=/pwa" : "/login");
  return user;
}
