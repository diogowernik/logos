import { requireUser } from "@/server/auth";
import { OpenText } from "@/features/library/OpenText";

export default async function TextPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  return <OpenText key={(await params).id} textId={(await params).id} />;
}
