import { countAdminUsers } from "@/lib/admin-users";
import { json } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const total = await countAdminUsers();
  return json({ needsSetup: total === 0 });
}
