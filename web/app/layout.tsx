import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "../lib/utils";
import { Providers } from "../components/providers";
import { EchoNavbar } from "../components/EchoNavbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Echo Studio",
  description: "Understand your emotions like data across web and mobile."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={cn(inter.className, "bg-echoDark text-slate-100 antialiased")}>
        <Providers>
          <div className="relative min-h-screen">
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
              <div className="absolute left-1/2 top-[-10%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-echoBlue/30 blur-[160px]" />
              <div className="absolute right-[-10%] bottom-[-20%] h-[380px] w-[380px] rounded-full bg-echoLavender/20 blur-[180px]" />
              <div className="absolute left-[-10%] bottom-[15%] h-[300px] w-[300px] rounded-full bg-[#3C41A7]/30 blur-[150px]" />
            </div>
            <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
              <EchoNavbar />
              <main className="flex-1">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
