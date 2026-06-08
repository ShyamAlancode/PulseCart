"use client";

import React, { useState } from "react";

interface ShareButtonProps {
  productName: string;
}

export default function ShareButton({ productName }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const text = `I just copped ${productName} on PulseCart before it sold out 🔥`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex-1 py-3 px-4 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-sm tracking-wide transition-all select-none active:scale-[0.98] flex items-center justify-center gap-2"
    >
      <svg
        className="w-4 h-4 text-zinc-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {copied ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M5 13l4 4L19 7"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 10.742l4.757-2.378m0 5.472l-4.757-2.378m9.229-4.223A2.5 2.5 0 1114 4a2.5 2.5 0 014.223 1.777zm-9.223 4.223A2.5 2.5 0 116 8a2.5 2.5 0 011.778 1.222zm9.223 4.223A2.5 2.5 0 1114 20a2.5 2.5 0 014.223-1.778z"
          />
        )}
      </svg>
      {copied ? "Copied Link!" : "Share the Drop"}
    </button>
  );
}
