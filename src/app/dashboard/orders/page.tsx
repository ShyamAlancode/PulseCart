import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserOrders, getDrop } from "@/lib/queries";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ShoppingBag, ArrowLeft, Calendar, Tag, CreditCard } from "lucide-react";

export const revalidate = 0;

export default async function UserOrdersPage() {
  // 1. Authenticate user
  const session = await auth();
  const user = session?.user;

  if (!user || !user.id) {
    redirect("/auth/signin");
  }

  // 2. Fetch all orders for the user
  const ordersRaw = await getUserOrders(user.id);

  // 3. Retrieve drop details for each order concurrently
  const orders = await Promise.all(
    ordersRaw.map(async (order) => {
      const drop = await getDrop(order.dropId);
      return {
        id: order.SK.split("#")[1] || "unknown",
        dropTitle: drop ? drop.title : "Exclusive Item",
        imageUrl: drop ? drop.imageUrl : "",
        timestamp: order.timestamp,
        total: order.total,
        status: order.status,
        sku: order.productId,
      };
    })
  );

  // Sort orders by timestamp descending (most recent first)
  const sortedOrders = orders.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="space-y-8 py-8 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-zinc-100 min-h-screen">
      {/* Header and Back Link */}
      <div className="space-y-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Catalog
        </Link>
        <div className="border-b border-zinc-800/60 pb-6">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-500 bg-clip-text text-transparent">
            My Purchase History
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Review your successful limited-edition checkouts secured on PulseCart.
          </p>
        </div>
      </div>

      {sortedOrders.length === 0 ? (
        // Empty State
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-zinc-800 rounded-3xl bg-zinc-950/20 backdrop-blur-md space-y-5">
          <div className="p-4 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500">
            <ShoppingBag className="w-8 h-8 animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-zinc-300">No orders placed yet</h3>
            <p className="text-sm text-zinc-550 max-w-xs mx-auto">
              Ready to secure your first exclusive drop? Explore our active drops page.
            </p>
          </div>
          <Link
            href="/"
            className="btn-shimmer text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all select-none active:scale-[0.98]"
          >
            Explore Catalog
          </Link>
        </div>
      ) : (
        // List Display
        <div className="space-y-6">
          {sortedOrders.map((order) => {
            const formattedDate = new Date(order.timestamp).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            });

            return (
              <Card key={order.id} className="overflow-hidden border border-zinc-800 bg-zinc-950/20 hover:border-purple-500/30 transition-all flex flex-col md:flex-row justify-between">
                <div className="flex flex-col md:flex-row gap-6 p-6 items-start md:items-center">
                  {/* Image Preview */}
                  <div className="relative w-full md:w-24 aspect-video md:aspect-square overflow-hidden bg-zinc-900 border border-zinc-800 rounded-xl flex-shrink-0">
                    {order.imageUrl ? (
                      <img
                        src={order.imageUrl}
                        alt={order.dropTitle}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-650 font-mono">
                        No Preview
                      </div>
                    )}
                  </div>

                  {/* Order Meta details */}
                  <div className="space-y-2">
                    <div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider mb-1">
                        CONFIRMED
                      </span>
                      <CardTitle className="text-lg font-black text-white">{order.dropTitle}</CardTitle>
                      <CardDescription className="text-zinc-500 font-mono text-[9px] tracking-wider uppercase select-all mt-0.5">
                        Order ID: {order.id}
                      </CardDescription>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 text-xs text-zinc-405">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        {formattedDate}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-zinc-500" />
                        SKU: {order.sku}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Price Box */}
                <div className="border-t md:border-t-0 md:border-l border-zinc-800/60 p-6 flex md:flex-col justify-between md:justify-center items-center md:items-end gap-2 bg-zinc-950/40 md:w-48">
                  <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
                    Amount Paid
                  </span>
                  <span className="text-2xl font-black text-white font-mono">
                    ₹{(order.total / 100).toFixed(2)}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
