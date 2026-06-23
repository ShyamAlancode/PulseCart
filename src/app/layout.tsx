import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import Navbar from "@/components/Navbar";
import { auth } from "@/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PulseCart — Burst-Safe Influencer Flash-Sale Drops",
  description:
    "An e-commerce flash-sale engine ensuring zero oversell via DynamoDB atomic conditional transactions and event-driven stream processing.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-zinc-50 dark:bg-[#07090e] text-zinc-900 dark:text-zinc-100 transition-colors duration-300`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {/* Navigation Bar */}
          <Navbar session={session} />

          {/* Main Content */}
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-zinc-200 dark:border-white/5 py-8 mt-16 bg-zinc-100/40 dark:bg-black/40 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-zinc-500">
                  © {new Date().getFullYear()} PulseCart. Built for{" "}
                  <a
                    href="https://h0hackathon.devpost.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:text-violet-300 font-semibold transition-colors"
                  >
                    #H0Hackathon
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-gray-600">
                <a href="/about" className="hover:text-zinc-400 dark:hover:text-zinc-400 transition-colors">
                  How It Works
                </a>
                <span className="w-px h-3 bg-zinc-300 dark:bg-zinc-700" />
                <span className="flex items-center gap-1.5">
                  Backed by DynamoDB Transactions
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                </span>
              </div>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
