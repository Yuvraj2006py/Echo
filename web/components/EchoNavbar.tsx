"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { getSupabaseBrowserClient } from "../lib/supabase";
import { fetchProfile } from "../lib/api";
import { rememberUserName, resolveUserName } from "../lib/user-display";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Entries", href: "/entries" },
  { label: "Settings", href: "/settings" }
];

export function EchoNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);
  const [token, setToken] = React.useState<string | null>(null);
  const [userName, setUserName] = React.useState<string | null>(null);
  const emailRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }
      const session = data.session;
      if (!session) {
        setToken(null);
        setUserName(null);
        emailRef.current = null;
        return;
      }
      setToken(session.access_token);
      emailRef.current = session.user?.email ?? null;
      const derivedName = resolveUserName(session);
      if (derivedName) {
        setUserName(derivedName);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }
      if (!session) {
        setToken(null);
        setUserName(null);
        emailRef.current = null;
        return;
      }
      setToken(session.access_token);
      emailRef.current = session.user?.email ?? null;
      const derivedName = resolveUserName(session);
      if (derivedName) {
        setUserName(derivedName);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  useQuery({
    queryKey: ["profile", token],
    queryFn: () => fetchProfile(token!),
    enabled: Boolean(token),
    staleTime: 1000 * 60 * 5,
    onSuccess: (data) => {
      const fetchedName = data.full_name?.trim();
      if (!fetchedName) {
        return;
      }
      setUserName((previous) => (previous === fetchedName ? previous : fetchedName));
      rememberUserName(emailRef.current, fetchedName);
    }
  });

  async function handleSignOut() {
    await supabase.auth.signOut();
    setToken(null);
    setUserName(null);
    emailRef.current = null;
    router.replace("/login");
  }

  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-4 z-50 mx-auto flex max-w-5xl items-center justify-between rounded-full border border-white/10 bg-[rgba(20,23,32,0.65)] px-5 py-3 shadow-[0_0_30px_rgba(124,131,253,0.25)] backdrop-blur-3xl"
    >
      <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-wide text-white">
        <div className="relative inline-flex h-10 w-28 items-center">
          <Image
            src="/images/echo-logo.png"
            alt="Echo logo"
            fill
            priority
            className="object-contain drop-shadow-[0_0_12px_rgba(124,131,253,0.55)]"
          />
        </div>
      </Link>
      <div className="hidden items-center gap-1 md:flex">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative rounded-full px-4 py-2 text-sm text-echoLavender/80 transition-all duration-300 hover:text-white",
                active && "text-white"
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-echoBlue/40 shadow-glow"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              {link.label}
            </Link>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        {userName ? (
          <>
            <span className="hidden text-xs text-echoLavender/70 md:inline">
              {userName}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="hidden md:inline-flex"
            >
              Sign out
            </Button>
          </>
        ) : (
          <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
        )}
        <Button asChild size="sm" className="shadow-glow">
          <Link href="/entries/new">New entry</Link>
        </Button>
      </div>
    </motion.nav>
  );
}
