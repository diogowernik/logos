import { requireUser } from "@/server/auth";
import { Library } from "@/features/library/Library";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ collection?: string; search?: string; create?: string }> }) {
  await requireUser();
  const query = await searchParams;
  return <Library key={`${query.collection ?? "all"}-${query.create ?? ""}`} collectionId={query.collection ? Number(query.collection) : null} autofocus={query.search === "1"} createKind={query.create === "project" || query.create === "collection" ? query.create : null} />;
}
