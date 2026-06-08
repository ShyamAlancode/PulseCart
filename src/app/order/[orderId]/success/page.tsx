import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserOrders, getDrop, getInventory } from "@/lib/queries";
import ShareButton from "@/components/ShareButton";
import { Card } from "@/components/ui/card";
import ConfettiTrigger from "@/components/ConfettiTrigger";

export const revalidate = 0;

interface SuccessPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function SuccessPage({ params }: SuccessPageProps) {
  const { orderId } = await params;

  // 1. Fetch user session
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/api/auth/signin");
  }

  // 2. Fetch user's orders and find the matching orderId
  const orders = await getUserOrders(userId);
  const order = orders.find((o) => o.SK === `ORDER#${orderId}`);

  if (!order) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 text-zinc-100 px-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-2">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold">Order Not Found</h2>
        <p className="text-zinc-500 text-sm max-w-md text-center">
          We could not locate an order matching this reference ID in your purchase history.
        </p>
        <Link href="/" className="text-purple-400 hover:underline text-sm font-semibold pt-2">
          Back to Catalog
        </Link>
      </div>
    );
  }

  // 3. Retrieve drop and inventory details
  const [drop, inventory] = await Promise.all([
    getDrop(order.dropId),
    getInventory(order.dropId, order.productId),
  ]);

  const productName = drop ? drop.title : "Exclusive Drop Item";
  const finalPrice = inventory ? inventory.price : order.total;

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 text-zinc-100">
      <ConfettiTrigger />
      <Card className="w-full max-w-lg overflow-hidden border border-white/5 bg-zinc-950/40 backdrop-blur-md rounded-3xl p-8 space-y-8 relative">
        {/* Glow ambient background detail */}
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Checkmark Graphic */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.15)] animate-pulse-glow">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-emerald-400 font-black tracking-widest uppercase bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              Success
            </span>
            <h1 className="text-3xl font-black tracking-tight text-white pt-2">Order Confirmed!</h1>
            <p className="text-xs text-zinc-500">Thank you for your purchase. Your order is secured.</p>
          </div>
        </div>

        {/* Order details panel */}
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/60 p-5 space-y-4">
          <div className="flex justify-between items-center text-sm border-b border-zinc-800/60 pb-3">
            <span className="text-zinc-500 font-semibold">Order ID</span>
            <span className="text-zinc-300 font-mono font-bold select-all">{orderId}</span>
          </div>

          <div className="flex justify-between items-start text-sm border-b border-zinc-800/60 pb-3">
            <span className="text-zinc-500 font-semibold">Product Name</span>
            <span className="text-zinc-100 font-bold text-right max-w-[200px] line-clamp-1">{productName}</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500 font-semibold">Total Paid</span>
            <span className="text-xl font-black text-white">₹{(finalPrice / 100).toFixed(2)}</span>
          </div>
        </div>

        {/* Action button grouping */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/dashboard/orders"
              className="flex-1 py-3.5 px-5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white font-bold text-sm tracking-wide transition-all select-none active:scale-[0.98] text-center flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              View My Orders
            </Link>
            <ShareButton productName={productName} />
          </div>

          <Link
            href="/"
            className="block text-center text-xs text-zinc-500 hover:text-zinc-400 transition-colors pt-2 font-medium"
          >
            Back to Home Catalog
          </Link>
        </div>
      </Card>
    </div>
  );
}
