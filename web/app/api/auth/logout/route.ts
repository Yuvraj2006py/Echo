import { NextResponse } from "next/server";

const ACCESS_COOKIE = process.env.AUTH_ACCESS_COOKIE ?? "echo_session";
const REFRESH_COOKIE = process.env.AUTH_REFRESH_COOKIE ?? "echo_refresh";
const CSRF_COOKIE = process.env.AUTH_CSRF_COOKIE ?? "csrf_token";
const cookieDomain = process.env.AUTH_COOKIE_DOMAIN;
const isProduction = process.env.NODE_ENV === "production";

function expiredCookie(name: string) {
  return {
    name,
    value: "",
    expires: new Date(0),
    httpOnly: true as const,
    sameSite: "strict" as const,
    secure: isProduction,
    path: "/",
    domain: cookieDomain
  };
}

export async function POST() {
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(expiredCookie(ACCESS_COOKIE));
  response.cookies.set(expiredCookie(REFRESH_COOKIE));
  response.cookies.set(expiredCookie(CSRF_COOKIE));
  return response;
}
