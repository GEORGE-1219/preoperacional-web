import { cookies } from "next/headers";
import { json } from "@/lib/db";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/session-token";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);

  if (!session) return json({ success: false, mensaje: "Sesión no válida." }, 401);

  return json({
    success: true,
    user: {
      id: session.sub,
      email: session.email,
      nombre: session.nombre,
      rol: session.rol
    }
  });
}
