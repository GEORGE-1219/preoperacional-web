import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  findAdminUserById,
  hashPassword,
  updateAdminPassword,
  updateAdminProfile,
  validatePassword,
  verifyPassword
} from "@/lib/admin-users";
import { ADMIN_COOKIE_NAME, createSessionToken, verifySessionToken } from "@/lib/session-token";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function profilePayload(user) {
  return {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
    avatarDataUrl: user.avatarBase64 ? `data:${user.avatarMime || "image/jpeg"};base64,${user.avatarBase64}` : ""
  };
}

async function currentUser() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
  if (!session?.sub) return null;

  const user = await findAdminUserById(Number(session.sub));
  if (!user?.activo) return null;
  return user;
}

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ success: false, mensaje: "Sesión no válida." }, { status: 401 });
  }

  return NextResponse.json({ success: true, user: profilePayload(user) });
}

export async function PATCH(request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ success: false, mensaje: "Sesión no válida." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  try {
    if (body.newPassword) {
      if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
        return NextResponse.json({ success: false, mensaje: "La contraseña actual no es correcta." }, { status: 400 });
      }

      const passwordError = validatePassword(body.newPassword);
      if (passwordError) {
        return NextResponse.json({ success: false, mensaje: passwordError }, { status: 400 });
      }

      await updateAdminPassword(user.id, await hashPassword(body.newPassword));
    }

    await updateAdminProfile(user.id, body);
    const updated = await findAdminUserById(user.id);
    const response = NextResponse.json({ success: true, user: profilePayload(updated) });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: await createSessionToken(updated),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8
    });

    return response;
  } catch (error) {
    const duplicate = error?.code === "ER_DUP_ENTRY";
    return NextResponse.json({
      success: false,
      mensaje: duplicate ? "Ya existe otro usuario con ese correo." : error.message
    }, { status: duplicate ? 409 : 400 });
  }
}
