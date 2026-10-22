import { requireUser } from "@/server/auth";
import { PwaLaunch } from "@/components/pwa/PwaLaunch";

export default async function PwaPage() {
  const user = await requireUser("/pwa");
  return <PwaLaunch userId={user.id} />;
}
