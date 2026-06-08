"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Lock, Mail, Shield, User, Loader2, ArrowRight } from "lucide-react";

export default function SignInPage() {
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleOAuthSignIn = async () => {
    try {
      setLoadingType("google");
      setErrorMsg("");
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setErrorMsg("Google Sign-In failed. Please try credentials instead.");
      setLoadingType(null);
    }
  };

  const handleQuickSignIn = async (email: string, name: string, role: string) => {
    try {
      setLoadingType(role);
      setErrorMsg("");
      
      const callbackUrl = role === "ADMIN" || role === "seller" ? "/seller" : "/";
      
      const result = await signIn("credentials", {
        email,
        name,
        redirect: true,
        callbackUrl,
      }) as unknown as { error?: string } | undefined;

      if (result?.error) {
        setErrorMsg("Failed to authenticate. Try again.");
        setLoadingType(null);
      }
    } catch {
      setErrorMsg("Something went wrong during sign-in.");
      setLoadingType(null);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail) {
      setErrorMsg("Email is required for credentials login.");
      return;
    }
    
    try {
      setLoadingType("custom");
      setErrorMsg("");
      
      const role = customEmail.includes("admin") || customEmail.includes("judge")
        ? "ADMIN"
        : customEmail.includes("seller")
        ? "seller"
        : "buyer";
      const callbackUrl = role === "ADMIN" || role === "seller" ? "/seller" : "/";

      const result = await signIn("credentials", {
        email: customEmail,
        name: customName || "Custom User",
        redirect: true,
        callbackUrl,
      }) as unknown as { error?: string } | undefined;

      if (result?.error) {
        setErrorMsg("Authentication failed. Please verify fields.");
        setLoadingType(null);
      }
    } catch {
      setErrorMsg("Error submitting custom credentials.");
      setLoadingType(null);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#09090b] overflow-hidden text-zinc-100 font-sans px-4">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Glassmorphic Container */}
      <div className="relative w-full max-w-md bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-8">
        
        {/* Logo and Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-3">
            <Lock className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 via-indigo-300 to-indigo-500 bg-clip-text text-transparent">
            Welcome to PulseCart
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            Secure high-concurrency influencer drops.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-200 text-xs sm:text-sm text-center">
            {errorMsg}
          </div>
        )}

        {/* OAuth Section */}
        <button
          onClick={handleOAuthSignIn}
          disabled={loadingType !== null}
          className="w-full flex items-center justify-center gap-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/90 text-zinc-200 font-medium py-2.5 px-4 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50"
        >
          {loadingType === "google" ? (
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" width="24" height="24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          <span>Sign in with Google</span>
        </button>

        {/* Separator */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800" />
          </div>
          <span className="relative bg-zinc-900/90 border border-zinc-800/80 px-3 text-[10px] sm:text-xs font-semibold text-zinc-500 rounded-full tracking-wider uppercase">
            Quick Sandbox Access
          </span>
        </div>

        {/* Judge/Sandbox Shortcuts */}
        <div className="grid grid-cols-1 gap-3 mb-6">
          <button
            onClick={() => handleQuickSignIn("aws-judge@pulsecart.admin", "AWS DB Judge", "ADMIN")}
            disabled={loadingType !== null}
            className="group flex items-center justify-between text-left bg-gradient-to-r from-purple-950/20 to-zinc-950 hover:from-purple-950/30 hover:to-zinc-900 border border-purple-500/20 hover:border-purple-500/40 py-2.5 px-4 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-200">AWS DB Judge (Admin)</div>
                <div className="text-[10px] text-zinc-400">Syncs admin profile to DynamoDB</div>
              </div>
            </div>
            {loadingType === "ADMIN" ? (
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
            ) : (
              <ArrowRight className="w-4 h-4 text-purple-500 group-hover:translate-x-1 transition-transform" />
            )}
          </button>

          <button
            onClick={() => handleQuickSignIn("alpha-seller@pulsecart.seller", "Alpha Seller", "seller")}
            disabled={loadingType !== null}
            className="group flex items-center justify-between text-left bg-gradient-to-r from-emerald-950/20 to-zinc-950 hover:from-emerald-950/30 hover:to-zinc-900 border border-emerald-500/20 hover:border-emerald-500/40 py-2.5 px-4 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-200">Alpha Creator (Seller)</div>
                <div className="text-[10px] text-zinc-400">Syncs creator profile to DynamoDB</div>
              </div>
            </div>
            {loadingType === "seller" ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              <ArrowRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-1 transition-transform" />
            )}
          </button>

          <button
            onClick={() => handleQuickSignIn("guest-buyer@example.com", "Guest Buyer", "BUYER")}
            disabled={loadingType !== null}
            className="group flex items-center justify-between text-left bg-gradient-to-r from-indigo-950/20 to-zinc-950 hover:from-indigo-950/30 hover:to-zinc-900 border border-indigo-500/20 hover:border-indigo-500/40 py-2.5 px-4 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-200">Standard Buyer Account</div>
                <div className="text-[10px] text-zinc-400">Syncs buyer profile to DynamoDB</div>
              </div>
            </div>
            {loadingType === "BUYER" ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            ) : (
              <ArrowRight className="w-4 h-4 text-indigo-500 group-hover:translate-x-1 transition-transform" />
            )}
          </button>
        </div>

        {/* Separator */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800" />
          </div>
          <span className="relative bg-zinc-900/90 border border-zinc-800/80 px-3 text-[10px] sm:text-xs font-semibold text-zinc-500 rounded-full tracking-wider uppercase">
            Custom Login
          </span>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleCustomSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                placeholder="you@example.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                disabled={loadingType !== null}
                className="w-full pl-10 pr-4 py-2 bg-zinc-950/80 border border-zinc-800 focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 rounded-xl text-sm transition-all outline-none"
              />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Add <code className="text-purple-400">admin/judge</code> for Admin role, or <code className="text-purple-400">seller</code> for Seller role.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">
              Full Name (Optional)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="John Doe"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                disabled={loadingType !== null}
                className="w-full pl-10 pr-4 py-2 bg-zinc-950/80 border border-zinc-800 focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 rounded-xl text-sm transition-all outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingType !== null}
            className="w-full flex items-center justify-center bg-purple-600 hover:bg-purple-500 text-zinc-100 font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            {loadingType === "custom" ? (
              <Loader2 className="w-5 h-5 animate-spin text-zinc-100" />
            ) : (
              <span>Proceed to Sandbox</span>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
