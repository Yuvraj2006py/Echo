import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "node:crypto";

const CSRF_COOKIE = process.env.AUTH_CSRF_COOKIE ?? "csrf_token";
const ACCESS_COOKIE = process.env.AUTH_ACCESS_COOKIE ?? "echo_session";
const cookieDomain = process.env.AUTH_COOKIE_DOMAIN;
const isProduction = process.env.NODE_ENV === "production";

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true as const,
    sameSite: "strict" as const,
    secure: isProduction,
    path: "/",
    domain: cookieDomain,
    maxAge: maxAgeSeconds
  };
}

export async function POST() {
  const store = cookies();
  const sessionCookie = store.get(ACCESS_COOKIE);
  if (!sessionCookie) {
    const response = NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    response.cookies.set({
      name: CSRF_COOKIE,
      value: "",
      expires: new Date(0),
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/",
      domain: cookieDomain
    });
    return response;
  }

  const csrfToken = crypto.randomBytes(32).toString("hex");
  const response = NextResponse.json({ csrfToken }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set({
    name: CSRF_COOKIE,
    value: csrfToken,
    ...cookieOptions(60 * 60 * 24)
  });
  return response;
}
