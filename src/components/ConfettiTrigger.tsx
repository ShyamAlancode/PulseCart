"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

export default function ConfettiTrigger() {
  useEffect(() => {
    // Fire confetti on mount
    try {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.55 },
        colors: ["#a855f7", "#ec4899", "#06b6d4", "#10b981", "#fbbf24"],
      });
    } catch (err) {
      console.error("Failed to fire success confetti:", err);
    }
  }, []);

  return null; // Invisible component
}
