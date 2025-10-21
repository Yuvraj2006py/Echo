import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import crypto from "node:crypto";

const ACCESS_COOKIE = process.env.AUTH_ACCESS_COOKIE ?? "echo_session";
const REFRESH_COOKIE = process.env.AUTH_REFRESH_COOKIE ?? "echo_refresh";
const CSRF_COOKIE = process.env.AUTH_CSRF_COOKIE ?? "csrf_token";
const cookieDomain = process.env.AUTH_COOKIE_DOMAIN;
const isProduction = process.env.NODE_ENV === "production";

interface SessionInput {
  access_token?: string;
  refresh_token?: string | null;
  expires_at?: number | null;
}

function cookieOptions(maxAgeSeconds: number | undefined) {
  return {
    httpOnly: true as const,
    sameSite: "strict" as const,
    secure: isProduction,
    path: "/",
    domain: cookieDomain,
    maxAge: maxAgeSeconds
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as SessionInput | null;
  if (!body?.access_token) {
    return NextResponse.json({ error: "Missing access token." }, { status: 400 });
  }

  const csrfToken = crypto.randomBytes(32).toString("hex");
  const response = NextResponse.json(
    { csrfToken },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );

  const nowSeconds = Math.floor(Date.now() / 1000);
  const accessMaxAge =
    typeof body.expires_at === "number" && body.expires_at > nowSeconds
      ? Math.max(body.expires_at - nowSeconds, 60)
      : 60 * 60;

  response.cookies.set({
    name: ACCESS_COOKIE,
    value: body.access_token,
    ...cookieOptions(accessMaxAge)
  });

  if (body.refresh_token) {
    response.cookies.set({
      name: REFRESH_COOKIE,
      value: body.refresh_token,
      ...cookieOptions(60 * 60 * 24 * 7)
    });
  }

  response.cookies.set({
    name: CSRF_COOKIE,
    value: csrfToken,
    ...cookieOptions(60 * 60 * 24)
  });

  return response;
}
