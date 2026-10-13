import "server-only";
import { notFound, redirect } from "next/navigation";
import { BackendError, djangoFetch, getAuthToken } from "./django";
import type { Collection, Project } from "@/features/library/types";

export type RouteQuery = Record<string, string | string[] | undefined>;

export function querySuffix(query: RouteQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value !== undefined) params.append(key, value);
  }
  return params.size ? `?${params}` : "";
}

export async function resolveResource<K extends "projects" | "collections">(kind: K, reference: string): Promise<K extends "projects" ? Project : Collection> {
  const token = await getAuthToken();
  const response = await djangoFetch(`/api/library/${kind}/${encodeURIComponent(reference)}/`, {
    headers: { Authorization: `Token ${token}` },
  });
  if (response.status === 404) notFound();
  if (response.status === 401 || response.status === 403) redirect("/login");
  if (!response.ok) throw new BackendError();
  return response.json();
}
