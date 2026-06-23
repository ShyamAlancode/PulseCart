import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserOrders, getDrop } from "@/lib/queries";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Calendar, CheckCircle, ArrowRight, Package } from "lucide-react";

export const revalidate = 0;

export default async function OrdersPage() {
  const session = await auth();
  const user = session?.user as { id?: string; email?: string | null; role?: string } | undefined;
  const userId = user?.id;
  if (!userId) redirect("/auth/signin");

  const orders = await getUserOrders(userId);

  // Fetch drop metadata for each order concurrently
  const ordersWithDrops = await Promise.all(
    orders.map(async (order) => {
      const drop = await getDrop(order.dropId).catch(() => null);
      return { order, drop };
    })
  );

  // Sort most recent first
  ordersWithDrops.sort(
    (a, b) =>
      new Date(b.order.timestamp).getTime() - new Date(a.order.timestamp).getTime()
  );

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8 text-zinc-100">
      {/* Header */}
      <div className="space-y-1 border-b border-zinc-800/60 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <ShoppingBag className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">My Orders</h1>
            <p className="text-xs text-zinc-500">
              {orders.length} {orders.length === 1 ? "purchase" : "purchases"} confirmed on PulseCart
            </p>
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-zinc-800 rounded-3xl bg-zinc-950/40 backdrop-blur-md space-y-4">
          <div className="p-4 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500">
            <Package className="w-8 h-8" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-zinc-300">No orders yet</h3>
            <p className="text-sm text-zinc-500 max-w-xs mx-auto">
              When you secure a limited drop, your confirmed orders will appear here.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 font-bold text-sm transition-all"
          >
            Browse Drops <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {ordersWithDrops.map(({ order, drop }) => {
            const orderId = order.SK.replace("ORDER#", "");
            const formattedDate = new Date(order.timestamp).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            });

            return (
              <div
                key={order.SK}
                className="group flex items-center gap-4 bg-zinc-950/40 border border-zinc-800 hover:border-purple-500/30 rounded-2xl p-4 transition-all duration-200 hover:bg-zinc-950/60"
              >
                {/* Drop Image */}
                <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
                  {drop?.imageUrl ? (
                    <Image
                      src={drop.imageUrl}
                      alt={drop.title || "Drop image"}
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                      <Package className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* Order Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-bold text-zinc-100 truncate">
                    {drop?.title || "Limited Drop"}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formattedDate}</span>
                  </div>
                  <p className="text-[10px] font-mono text-zinc-600 truncate">
                    Order: {orderId}
                  </p>
                </div>

                {/* Status and Price */}
                <div className="flex-shrink-0 text-right space-y-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle className="w-3 h-3" />
                    {order.status}
                  </span>
                  <p className="text-lg font-black text-white">
                    ₹{(order.total / 100).toFixed(2)}
                  </p>
                </div>

                {/* Arrow */}
                <Link
                  href={`/order/${orderId}/success`}
                  className="flex-shrink-0 p-2 rounded-lg text-zinc-600 hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
