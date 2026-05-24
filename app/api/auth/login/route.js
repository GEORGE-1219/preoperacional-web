import { NextResponse } from "next/server";
import { createSessionToken, ADMIN_COOKIE_NAME } from "@/lib/session-token";
import { findAdminUserByEmail, touchAdminAccess, verifyPassword } from "@/lib/admin-users";
import { json } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const user = await findAdminUserByEmail(body.email);

  if (!user || !user.activo || !(await verifyPassword(body.password, user.passwordHash))) {
    return json({ success: false, mensaje: "Correo o contraseña inválidos." }, 401);
  }

  await touchAdminAccess(user.id);
  const token = await createSessionToken(user);
  const response = NextResponse.json({
    success: true,
    user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol }
  });

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
