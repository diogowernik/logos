import { requireUser } from "@/server/auth";
import { redirect } from "next/navigation";
import { resolveResource, querySuffix, type RouteQuery } from "@/server/library";
import { collectionLocation } from "@/features/library/resource-location";
import { Library } from "@/features/library/Library";

export default async function CollectionPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RouteQuery>;
}) {
  await requireUser();
  const { id } = await params;
  const collection = await resolveResource("collections", id);
  const query = await searchParams;
  if (id !== collection.slug) redirect(collectionLocation(collection) + querySuffix(query));
  return <Library key={`${collection.id}-${query.create ?? ""}`} collectionId={collection.id} autofocus={query.search === "1"} createKind={query.create === "project" || query.create === "collection" ? query.create : null} />;
}
