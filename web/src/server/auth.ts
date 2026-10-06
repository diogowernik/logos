import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { fetchCurrentUser } from "./django";

const currentUser = cache(fetchCurrentUser);

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
