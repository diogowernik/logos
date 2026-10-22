export const lastPageKey = (userId: number) => `books.pwa.lastPage.${userId}`;

// Remember only route paths, never queries, forms, API URLs or create operations.
export function resumablePage(path: string | null): string | null {
  if (path === "/") return path;
  if (!path) return null;
  return /^\/(?:projects\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/read)?|collections\/[a-z0-9]+(?:-[a-z0-9]+)*|texts\/[1-9]\d*)$/.test(path)
    ? path : null;
}

export function resumeEndpoint(path: string): string | null {
  const match = /^\/(projects|collections|texts)\/([^/]+)/.exec(resumablePage(path) ?? "");
  return match ? `/api/library/${match[1]}/${match[2]}/` : null;
}
