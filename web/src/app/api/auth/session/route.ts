import { clearAuthToken, fetchCurrentUser, noStoreJson } from "@/server/django";

export async function GET() {
  try {
    const user = await fetchCurrentUser();
    if (!user) await clearAuthToken();
    return noStoreJson({ authenticated: Boolean(user), user });
  } catch {
    // An outage is not an expired session: preserve the cookie for retry.
    return noStoreJson({ detail: "A API não respondeu." }, { status: 502 });
  }
}
