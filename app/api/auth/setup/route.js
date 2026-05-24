import { NextResponse } from "next/server";
import { countAdminUsers, createAdminUser, findAdminUserByEmail, touchAdminAccess } from "@/lib/admin-users";
import { json } from "@/lib/db";
import { ADMIN_COOKIE_NAME, createSessionToken } from "@/lib/session-token";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  if ((await countAdminUsers()) > 0) {
    return json({ success: false, mensaje: "La configuración inicial ya fue realizada." }, 409);
  }

  const body = await request.json().catch(() => ({}));
  const created = await createAdminUser({ ...body, rol: "ADMIN" });
  const user = await findAdminUserByEmail(created.email);
  await touchAdminAccess(user.id);

  const token = await createSessionToken(user);
  const response = NextResponse.json({
    success: true,
    user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol }
  }, { status: 201 });

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });

  return response;
}
