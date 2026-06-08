"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function SoldOutPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // Log the waitlist signup to console as requested
    console.log(`Waitlist signup submitted for email: ${email}`);
    
    setSubmitted(true);
    setEmail("");
  };

  const handleShareFailure = async () => {
    const text = "I tried to cop the latest limited drop on PulseCart but it sold out! 😅";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 text-zinc-100">
      <Card className="w-full max-w-lg overflow-hidden border border-white/5 bg-zinc-950/40 backdrop-blur-md rounded-3xl p-8 space-y-8 relative">
        {/* Glow ambient background detail */}
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Sold Out Graphic Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-red-400 font-black tracking-widest uppercase bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">
              Sold Out
            </span>
            <h1 className="text-3xl font-black tracking-tight text-white pt-2">Missed the Drop!</h1>
            <p className="text-sm text-zinc-400 max-w-xs mx-auto">
              This exclusive listing was secured by other buyers before your transaction processed.
            </p>
          </div>
        </div>

        {/* Waitlist form */}
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/60 p-6 space-y-4">
          <h3 className="text-sm font-bold text-zinc-200">Get Notified of Future Launches</h3>
          <p className="text-xs text-zinc-500 leading-normal">
            Enter your email address to register for our drop alerts waitlist and be the first to know when restocks or similar creator items go live.
          </p>

          {submitted ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold text-center animate-pulse-glow">
              🎉 Added to the waitlist successfully!
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                required
                placeholder="enter your email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                className="bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs px-4 py-2.5 rounded-xl transition-all active:scale-[0.98] select-none"
              >
                Join Waitlist
              </button>
            </form>
          )}
        </div>

        {/* Sharing options and return links */}
        <div className="space-y-3 pt-2">
          <div className="flex gap-3">
            <Link
              href="/"
              className="flex-1 py-3 px-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-sm tracking-wide transition-all select-none active:scale-[0.98] text-center flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Catalog
            </Link>

            <button
              onClick={handleShareFailure}
              className="flex-1 py-3 px-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-sm tracking-wide transition-all select-none active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {copied ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 10.742l4.757-2.378m0 5.472l-4.757-2.378m9.229-4.223A2.5 2.5 0 1114 4a2.5 2.5 0 014.223 1.777zm-9.223 4.223A2.5 2.5 0 116 8a2.5 2.5 0 011.778 1.222zm9.223 4.223A2.5 2.5 0 1114 20a2.5 2.5 0 014.223-1.778z" />
                )}
              </svg>
              {copied ? "Copied!" : "I tried! 😅"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
