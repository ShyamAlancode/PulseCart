"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface BuyButtonProps {
  dropId: string;
  productId: string;
  price: number;
  disabled: boolean;
}

export default function BuyButton({
  dropId,
  productId,
  price,
  disabled,
}: BuyButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBuy = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dropId, productId }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/order/${data.orderId}/success`);
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (res.status === 409 || data.reason === "SOLD_OUT") {
        setIsSoldOut(true);
        return;
      }

      setErrorMessage(data.message || "Something went wrong. Try again.");
    } catch (err) {
      console.error("Error during checkout invocation:", err);
      setErrorMessage("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-3 transition-all duration-500">
      <button
        onClick={handleBuy}
        disabled={disabled || loading || isSoldOut}
        className={`w-full py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all duration-500 select-none flex items-center justify-center gap-2 group ${
          isSoldOut
            ? "bg-red-500/10 border border-red-500/35 text-red-400 cursor-not-allowed shadow-none"
            : disabled || loading
            ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-300 dark:border-zinc-700/50 cursor-not-allowed"
            : "relative overflow-hidden bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-black tracking-widest shadow-[0_0_24px_rgba(124,58,237,0.4)] hover:shadow-[0_0_36px_rgba(124,58,237,0.6)] active:scale-[0.98] transition-all duration-200 ease-out"
        }`}
      >
        <span 
          className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 pointer-events-none"
          aria-hidden="true"
        />
        {loading ? (
          <>
            <svg
              className="animate-spin h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Securing Stock...
          </>
        ) : isSoldOut ? (
          "Sold Out"
        ) : (
          `Buy Now — ₹${(price / 100).toFixed(2)}`
        )}
      </button>

      {isSoldOut && (
        <p className="text-xs text-zinc-500 mt-2 font-medium text-center animate-fade-in duration-300">
          You just missed this drop. Check back for future listings.
        </p>
      )}

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/20 text-red-400 text-xs font-semibold text-center animate-bounce">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
