import React, { Suspense } from "react";
import DropList from "@/components/DropList";
import DropCardSkeleton from "@/components/DropCardSkeleton";

// Dynamic page generation
export const revalidate = 0;

function DropGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <DropCardSkeleton />
      <DropCardSkeleton />
      <DropCardSkeleton />
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="space-y-8 py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen">
      {/* Hero Header */}
      <div className="space-y-3 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold tracking-widest uppercase mx-auto sm:mx-0">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Live Drops
        </div>
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white leading-[1.05]">
          PulseCart
          <span className="block text-zinc-400 font-light text-2xl sm:text-3xl tracking-normal mt-1">
            Flash Drops, Zero Oversell.
          </span>
        </h1>
        <p className="text-zinc-400 max-w-2xl text-sm sm:text-base leading-relaxed pt-2">
          Exclusive limited-edition creator drops. Powered by AWS DynamoDB atomic transaction locks to ensure zero overselling.
        </p>
      </div>

      {/* Suspense Wrapper around grid loader list */}
      <Suspense fallback={<DropGridSkeleton />}>
        <DropList />
      </Suspense>
    </div>
  );
}
