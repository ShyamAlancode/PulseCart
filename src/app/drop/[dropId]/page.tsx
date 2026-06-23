import React, { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { getDrop, getAggregatedInventory } from "@/lib/queries";
import CountdownTimer from "@/components/CountdownTimer";
import LiveInventory from "@/components/LiveInventory";
import InventorySkeleton from "@/components/InventorySkeleton";
import BuyButton from "@/components/BuyButton";
import {
  Card,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export const revalidate = 0;

interface DropDetailsPageProps {
  params: Promise<{ dropId: string }>;
}

export default async function DropDetailsPage({ params }: DropDetailsPageProps) {
  const { dropId } = await params;

  // 1. Fetch drop metadata
  const drop = await getDrop(dropId);
  if (!drop) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-zinc-100">
        <h2 className="text-2xl font-bold">Drop Not Found</h2>
        <p className="text-zinc-500 text-sm">The product launch you are looking for does not exist.</p>
        <Link href="/" className="text-purple-400 hover:underline text-sm font-semibold">
          Back to Catalog
        </Link>
      </div>
    );
  }

  // 2. Fetch drop inventory
  const inventoryItem = await getAggregatedInventory(dropId);
  const productId = inventoryItem ? inventoryItem.SK.split("#")[1] : "product-001";
  const price = inventoryItem ? inventoryItem.price : 0;
  const availableCount = inventoryItem ? inventoryItem.availableCount : 0;

  // 3. Determine active state variables
  const now = new Date();
  const startTime = new Date(drop.startTime);
  const endTime = new Date(drop.endTime);

  const hasStarted = startTime <= now;
  const hasEnded = endTime < now;
  const isLive = hasStarted && !hasEnded;
  const isSoldOut = availableCount <= 0;

  // Target time for countdown widget
  const countdownTarget = !hasStarted ? drop.startTime : drop.endTime;

  return (
    <div className="min-h-screen text-zinc-100 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      {/* Back navigation */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Back to Drops
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Aspect: Product Media */}
        <div className="md:col-span-7 space-y-4">
          <div className="overflow-hidden rounded-3xl border border-white/5 bg-zinc-950/40 backdrop-blur-md">
            <Image
              src={drop.imageUrl}
              alt={drop.title}
              className="object-cover w-full aspect-square"
              width={600}
              height={600}
              unoptimized
            />
          </div>
        </div>

        {/* Right Aspect: Context details, buy box */}
        <div className="md:col-span-5 space-y-6">
          <Card className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-widest">
                  ✦ Limited Edition Drop
                </span>
                {isLive && !isSoldOut && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 backdrop-blur-md uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    LIVE
                  </span>
                )}
              </div>
              <CardTitle className="text-3xl font-black text-white">{drop.title}</CardTitle>
              <CardDescription className="text-zinc-300 text-sm leading-relaxed pt-2">
                {drop.description}
              </CardDescription>
            </div>

            <div className="border-t border-b border-zinc-800/60 py-4 flex items-center justify-between">
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                  Price
                </span>
                <span className="text-2xl font-black text-white">
                  ₹{(price / 100).toFixed(2)}
                </span>
              </div>

              <div className="flex flex-col space-y-1 items-end">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                  Inventory
                </span>
                <Suspense fallback={<InventorySkeleton />}>
                  <LiveInventory dropId={dropId} initialAvailableCount={availableCount} />
                </Suspense>
              </div>
            </div>

            {/* Sold progress bar — shows "47% claimed" */}
            {inventoryItem && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-zinc-500">Claimed</span>
                  <span className="text-violet-400">
                    {inventoryItem.baseInventory > 0 
                      ? Math.round(((inventoryItem.baseInventory - inventoryItem.availableCount) / inventoryItem.baseInventory) * 100) 
                      : 0}% gone
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-900 border border-zinc-800/30 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${inventoryItem.baseInventory > 0 
                        ? Math.round(((inventoryItem.baseInventory - inventoryItem.availableCount) / inventoryItem.baseInventory) * 100) 
                        : 0}%` 
                    }}
                  />
                </div>
              </div>
            )}



            {/* Countdown Banner */}
            <div className="p-4 rounded-2xl bg-zinc-950/40 border border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-zinc-400 font-semibold">
                {!hasStarted ? "Launches In:" : hasEnded ? "Drop Ended:" : "Closes In:"}
              </span>
              {hasEnded ? (
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  COMPLETED
                </span>
              ) : (
                <CountdownTimer targetTime={countdownTarget} size="lg" />
              )}
            </div>

            {/* Checkout Action Trigger */}
            <div className="pt-2">
              {isSoldOut ? (
                <div className="w-full py-4 rounded-2xl font-bold bg-red-950/40 border border-red-500/20 text-red-400 text-center uppercase tracking-wider">
                  Sold Out
                </div>
              ) : (
                <BuyButton
                  dropId={dropId}
                  productId={productId}
                  price={price}
                  disabled={!hasStarted || hasEnded}
                />
              )}
            </div>

            {/* DynamoDB guarantee trust badge */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] text-zinc-500 text-center">
                Zero-oversell guaranteed via{" "}
                <span className="text-emerald-400 font-semibold">
                  DynamoDB atomic transactions
                </span>
                {" "}— powered by AWS
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
