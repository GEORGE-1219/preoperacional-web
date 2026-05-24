import { cookies } from "next/headers";
import { createAdminUser, findAdminUserById, listAdminUsers } from "@/lib/admin-users";
import { json } from "@/lib/db";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/session-token";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function currentUser() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
  if (!session?.sub) return null;

  const user = await findAdminUserById(Number(session.sub));
  if (!user?.activo) return null;
  return user;
}

export async function GET() {
  const sessionUser = await currentUser();
  if (!sessionUser) {
    return json({ success: false, mensaje: "Sesión no válida." }, 401);
  }

  const users = await listAdminUsers();
  return json(users);
}

export async function POST(request) {
  const sessionUser = await currentUser();
  if (!sessionUser) {
    return json({ success: false, mensaje: "Sesión no válida." }, 401);
  }

  const body = await request.json().catch(() => ({}));
  const requestedRole = String(body.rol || "").toUpperCase();

  if (sessionUser.rol !== "ADMIN" && requestedRole !== "OPERADOR") {
    return json({ success: false, mensaje: "Los operadores solo pueden crear usuarios con rol OPERADOR." }, 403);
  }

  try {
    const user = await createAdminUser({ ...body, rol: requestedRole });
    return json({ success: true, user }, 201);
  } catch (error) {
    const duplicate = error?.code === "ER_DUP_ENTRY";
    return json({
      success: false,
      mensaje: duplicate ? "Ya existe un usuario administrativo con ese correo." : error.message
    }, duplicate ? 409 : 400);
  }
}
