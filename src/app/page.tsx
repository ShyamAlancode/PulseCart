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
      <div className="space-y-4 text-center sm:text-left">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-950 dark:text-white bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 dark:from-purple-400 dark:via-pink-505 dark:to-indigo-500 bg-clip-text text-transparent">
          PulseCart Flash Drops
        </h1>
        <p className="text-zinc-650 dark:text-zinc-400 max-w-2xl text-sm sm:text-base leading-relaxed">
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
