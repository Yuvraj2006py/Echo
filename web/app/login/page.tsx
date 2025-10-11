"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { rememberUserName } from "../../lib/user-display";

export default function LoginPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName) {
      setMessage("Please share your name so Echo knows how to greet you.");
      return;
    }
    if (!trimmedEmail) {
      setMessage("Enter a valid email address.");
      return;
    }
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` }
    });

    if (error) {
      setMessage(error.message);
    } else {
      rememberUserName(trimmedEmail, trimmedName);
      setMessage("Check your inbox for a magic link.");
    }
    setLoading(false);
  }

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/dashboard");
      }
    });
  }, [router, supabase]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold">Sign in to Echo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-slate-700">
                Name
              </label>
              <Input
                id="fullName"
                type="text"
                placeholder="Echo Explorer"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending magic link..." : "Email me a sign-in link"}
            </Button>
            {message && <p className="text-center text-sm text-slate-500">{message}</p>}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
