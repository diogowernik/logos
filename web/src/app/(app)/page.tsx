import { requireUser } from "@/server/auth";
import { Library } from "@/features/library/Library";

export default async function HomePage() {
  await requireUser();
  return <Library />;
}
