import type { Metadata } from "next";
import { Bebas_Neue, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { AppNav } from "@/components/AppNav";
import { CommandKListener } from "@/components/CommandKListener";

export const metadata: Metadata = {
  title: "OpenClaw Studio",
  description: "Focused operator studio for the OpenClaw gateway.",
};

const display = Bebas_Neue({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const sans = IBM_Plex_Sans({
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#191b22" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#f7f9fb" media="(prefers-color-scheme: light)" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=t?t==='dark':m;document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();",
          }}
        />
      </head>
      <body className={`${display.variable} ${sans.variable} ${mono.variable} antialiased`} suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[200] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
        >
          Skip to main content
        </a>
        <div className="flex h-screen overflow-hidden">
          <AppNav />
          <CommandKListener />
          <main id="main-content" className="min-w-0 flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
