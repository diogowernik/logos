import { redirect } from "next/navigation";
import { resolveResource, querySuffix } from "@/server/library";
import { collectionLocation } from "@/features/library/resource-location";
import { requireUser } from "@/server/auth";
import { Library } from "@/features/library/Library";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ collection?: string; search?: string; create?: string; source?: string }> }) {
  const query = await searchParams;
  if (query.source === "pwa") redirect("/pwa");
  await requireUser();
  if (query.collection) {
    const collection = await resolveResource("collections", query.collection);
    redirect(collectionLocation(collection) + querySuffix({ search: query.search, create: query.create }));
  }
  return <Library key={`all-${query.create ?? ""}`} autofocus={query.search === "1"} createKind={query.create === "project" || query.create === "collection" ? query.create : null} />;
}
