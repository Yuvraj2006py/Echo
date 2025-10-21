import { beforeEach, describe, expect, it } from "vitest";

import { POST } from "./route";

function buildRequest(payload: unknown): Request {
  return new Request("http://localhost/api/auth/set-cookie", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

describe("POST /api/auth/set-cookie", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
  });

  it("persists Supabase session tokens in secure HttpOnly cookies", async () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const response = await POST(
      buildRequest({
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_at: expiresAt
      }) as any
    );

    const setCookieHeader = response.headers.get("set-cookie");
    expect(response.status).toBe(200);
    expect(setCookieHeader).toBeTruthy();

    const payload = (await response.json()) as { csrfToken?: string };
    expect(typeof payload.csrfToken).toBe("string");
    expect(setCookieHeader).toContain("echo_session=access-token");
    expect(setCookieHeader).toContain("echo_refresh=refresh-token");
    expect(setCookieHeader).toContain("csrf_token=");
    expect(setCookieHeader).toContain("HttpOnly");
    expect(setCookieHeader).toContain("SameSite=strict");
  });

  it("rejects requests missing the access token", async () => {
    const response = await POST(buildRequest({ refresh_token: "token" }) as any);
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toBe("Missing access token.");
  });
});
