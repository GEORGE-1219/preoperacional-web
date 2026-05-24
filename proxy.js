import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "./lib/session-token";

function jsonUnauthorized() {
  return NextResponse.json({ success: false, mensaje: "Sesión administrativa requerida." }, { status: 401 });
}

function isProtectedApi(request) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname.startsWith("/api/admin/")) return true;
  if (pathname.startsWith("/api/reportes/")) return true;
  if (pathname === "/api/novedades" && request.method === "GET") return true;
  if (pathname.startsWith("/api/novedades/")) return true;
  if (pathname === "/api/preoperacionales/pdf") return true;
  if (pathname === "/api/preoperacionales" && request.method === "GET") return true;
  if (pathname.startsWith("/api/vehiculos/asignaciones")) return true;
  if (pathname === "/api/vehiculos/pdf") return true;
  if (pathname === "/api/vehiculos" && (request.method !== "GET" || searchParams.get("includeInactive") === "1")) return true;

  return false;
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const protectedPanel = pathname.startsWith("/panel");
  const protectedApi = isProtectedApi(request);

  if (!protectedPanel && !protectedApi) return NextResponse.next();

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (session) return NextResponse.next();

  if (protectedApi) return jsonUnauthorized();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/panel/:path*", "/api/:path*"]
};
