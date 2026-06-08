"use client";

import React, { useEffect, useState } from "react";

interface LiveInventoryProps {
  dropId: string;
  initialAvailableCount: number;
}

export default function LiveInventory({
  dropId,
  initialAvailableCount,
}: LiveInventoryProps) {
  const [count, setCount] = useState(initialAvailableCount);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const res = await fetch(`/api/drops/${dropId}/inventory`);
        if (res.ok) {
          const data = await res.json();
          if (data.availableCount !== undefined && data.availableCount !== count) {
            if (data.availableCount < count) {
              setAnimate(true);
            }
            setCount(data.availableCount);
          }
        }
      } catch (err) {
        console.error("Failed to fetch live inventory:", err);
      }
    };

    const interval = setInterval(fetchInventory, 5000);
    return () => clearInterval(interval);
  }, [dropId, count]);

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setAnimate(false), 800);
      return () => clearTimeout(timer);
    }
  }, [animate]);

  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-sm font-black px-3 py-1.5 rounded-xl border transition-all duration-550 transform select-none ${
          animate
            ? "bg-red-500/20 text-red-500 border-red-500/40 scale-120 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse"
            : count > 0
            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
            : "bg-red-500/10 text-red-400 border-red-500/20"
        }`}
      >
        {count > 0 ? `${count} left` : "SOLD OUT"}
      </span>
    </div>
  );
}
