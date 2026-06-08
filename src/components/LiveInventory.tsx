"use client";

import React, { useEffect, useState, useRef } from "react";

interface LiveInventoryProps {
  dropId: string;
  initialAvailableCount: number;
}

export default function LiveInventory({
  dropId,
  initialAvailableCount,
}: LiveInventoryProps) {
  const [count, setCount] = useState(initialAvailableCount);
  const [flash, setFlash] = useState(false);
  const prevCount = useRef(count);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    const setupSSE = () => {
      try {
        eventSource = new EventSource(`/api/drops/${dropId}/live`);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.availableCount !== undefined) {
              setCount(data.availableCount);
            }
          } catch (err) {
            console.error("Error parsing live inventory SSE message:", err);
          }
        };

        eventSource.onerror = (err) => {
          console.error("SSE connection error, falling back to polling:", err);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (!fallbackInterval) {
            startPollingFallback();
          }
        };
      } catch (err) {
        console.error("Failed to establish SSE stream:", err);
        startPollingFallback();
      }
    };

    const startPollingFallback = () => {
      const fetchInventory = async () => {
        try {
          const res = await fetch(`/api/drops/${dropId}/inventory`);
          if (res.ok) {
            const data = await res.json();
            if (data.availableCount !== undefined) {
              setCount(data.availableCount);
            }
          }
        } catch (err) {
          console.error("Failed to fetch inventory fallback:", err);
        }
      };

      fetchInventory();
      fallbackInterval = setInterval(fetchInventory, 3000);
    };

    setupSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, [dropId]);

  useEffect(() => {
    const prev = prevCount.current;
    prevCount.current = count;
    if (count < prev) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(timer);
    }
  }, [count]);

  return (
    <div className="flex items-center gap-1.5 select-none">
      <span className={`
        font-black text-2xl tabular-nums transition-all duration-300 transform
        ${flash ? 'text-red-400 scale-110' : count > 0 ? 'text-violet-400 scale-100' : 'text-red-500 scale-100'}
      `}>
        {count > 0 ? count : "0"}
      </span>
      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
        {count > 0 ? "left" : "SOLD OUT"}
      </span>
    </div>
  );
}
