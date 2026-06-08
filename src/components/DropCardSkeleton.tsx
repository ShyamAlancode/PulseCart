import React from "react";
import { Card, CardHeader, CardFooter } from "./ui/card";

export default function DropCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden flex flex-col justify-between border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/20 animate-pulse">
      <div>
        {/* Aspect ratio cover image skeleton */}
        <div className="relative aspect-video w-full bg-zinc-200 dark:bg-zinc-900" />

        <CardHeader className="space-y-3 p-6">
          {/* Title skeleton */}
          <div className="h-6 w-3/4 rounded-lg bg-zinc-200 dark:bg-zinc-900" />
          {/* Description line 1 & 2 */}
          <div className="space-y-2">
            <div className="h-4 w-full rounded-md bg-zinc-200 dark:bg-zinc-900" />
            <div className="h-4 w-5/6 rounded-md bg-zinc-200 dark:bg-zinc-900" />
          </div>
        </CardHeader>
      </div>

      <CardFooter className="border-t border-zinc-150 dark:border-zinc-800/40 p-6 pt-4 flex items-center justify-between">
        {/* Timer skeleton */}
        <div className="space-y-1.5 flex flex-col">
          <div className="h-2.5 w-12 rounded bg-zinc-200 dark:bg-zinc-900" />
          <div className="h-5 w-24 rounded bg-zinc-200 dark:bg-zinc-900" />
        </div>
        {/* Stock badge skeleton */}
        <div className="h-7 w-20 rounded-lg bg-zinc-200 dark:bg-zinc-900" />
      </CardFooter>
    </Card>
  );
}
