"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";
import { Menu, X, LogOut, ShoppingBag } from "lucide-react";

interface NavbarProps {
  session: any;
}

export default function Navbar({ session }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const user = session?.user;
  const isSeller = user?.role === "seller" || user?.role === "ADMIN";

  return (
    <header className="glass sticky top-0 z-50 border-b border-zinc-200 dark:border-white/5 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="w-3 h-3 rounded-full bg-purple-500 animate-pulse shadow-[0_0_10px_#a855f7]" />
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:via-purple-205 dark:to-cyan-400 bg-clip-text text-transparent transition-all">
            PulseCart
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className="text-sm font-semibold text-zinc-650 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
          >
            Home
          </Link>
          
          {user && (
            <Link
              href="/dashboard/orders"
              className="text-sm font-semibold text-zinc-650 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors flex items-center gap-1.5"
            >
              <ShoppingBag className="w-4 h-4" />
              My Orders
            </Link>
          )}

          {isSeller && (
            <Link
              href="/seller/dashboard"
              className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold border border-purple-500/20 px-3 py-1.5 rounded-xl bg-purple-500/5 hover:bg-purple-500/10 transition-all"
            >
              Creator Panel
            </Link>
          )}

          {/* User profile and authentication links */}
          <div className="flex items-center gap-4 border-l border-zinc-200 dark:border-zinc-800 pl-4 h-6">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate max-w-[150px]">
                  {user.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-xs font-bold text-red-500 hover:text-red-650 dark:text-red-400 dark:hover:text-red-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn(undefined, { callbackUrl: "/" })}
                className="text-sm font-bold text-purple-650 dark:text-purple-400 hover:underline cursor-pointer"
              >
                Sign In
              </button>
            )}
            <ThemeToggle />
          </div>
        </nav>

        {/* Mobile menu triggers */}
        <div className="flex items-center gap-4 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white bg-zinc-100 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 cursor-pointer"
            aria-label="Toggle Menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drop-down panel menu */}
      {isOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-4 py-4 space-y-3 shadow-xl animate-in fade-in slide-in-from-top-5 duration-200">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white py-2"
          >
            Home
          </Link>

          {user && (
            <Link
              href="/dashboard/orders"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white py-2"
            >
              <ShoppingBag className="w-4 h-4" />
              My Orders
            </Link>
          )}

          {isSeller && (
            <Link
              href="/seller/dashboard"
              onClick={() => setIsOpen(false)}
              className="block text-sm font-bold text-purple-600 dark:text-purple-400 py-2 border-t border-zinc-200 dark:border-zinc-900 mt-2 pt-2"
            >
              Creator Panel
            </Link>
          )}

          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 flex flex-col gap-2">
            {user ? (
              <div className="space-y-2">
                <div className="text-xs text-zinc-500 font-mono truncate">{user.email}</div>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn(undefined, { callbackUrl: "/" })}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
