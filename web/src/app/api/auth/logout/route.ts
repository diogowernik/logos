import { clearAuthToken, djangoFetch, getAuthToken, isSameOrigin, noStoreJson } from "@/server/django";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return noStoreJson({ detail: "Origem não permitida." }, { status: 403 });
  }
  const token = await getAuthToken();
  if (token) {
    try {
      await djangoFetch("/auth/token/logout/", {
        method: "POST",
        headers: { Authorization: `Token ${token}` },
      });
    } catch {
      // Terminate the local session even if the backend is unavailable.
    }
  }
  await clearAuthToken();
  return noStoreJson({ ok: true });
}
