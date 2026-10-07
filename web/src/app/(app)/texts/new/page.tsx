import { requireUser } from "@/server/auth";
import { OpenText } from "@/features/library/OpenText";

export default async function NewTextPage() {
  await requireUser();
  return <OpenText />;
}
