import { NextRequest } from "next/server";
import { djangoFetch, getAuthToken, isSameOrigin, noStoreJson } from "@/server/django";

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!["GET", "HEAD"].includes(request.method) && !isSameOrigin(request)) {
    return noStoreJson({ detail: "Origem não permitida." }, { status: 403 });
  }
  const token = await getAuthToken();
  if (!token) return noStoreJson({ detail: "Entre para continuar." }, { status: 401 });
  const { path } = await context.params;
  const processing = path[0] === "epub-imports" || path.at(-1) === "local-epubs" ||
    (request.method === "POST" && ["epub", "imports", "link-epub", "markdown-files", "markdown-preview", "markdown-import"].includes(path.at(-1) ?? ""));
  try {
    const upstream = await djangoFetch(`/api/library/${path.map(encodeURIComponent).join("/")}/${request.nextUrl.search}`, {
      method: request.method,
      headers: { Authorization: `Token ${token}`, "Content-Type": request.headers.get("content-type") ?? "application/json" },
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
      ...(processing ? { signal: AbortSignal.timeout(60_000) } : {}),
    });
    const headers = new Headers({ "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "private, no-store", "Vary": "Cookie" });
    const disposition = upstream.headers.get("content-disposition");
    if (disposition) headers.set("Content-Disposition", disposition);
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(upstream.status === 204 ? null : upstream.body, { status: upstream.status, headers });
  } catch {
    return noStoreJson({ detail: "A API não respondeu. Tente novamente." }, { status: 502 });
  }
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
