import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserOrders } from "@/lib/queries";
import Link from "next/link";

export default async function OrdersPage() {
  const session = await auth();
  const user = session?.user as { id?: string; email?: string | null; role?: string } | undefined;
  const userId = user?.id;
  if (!userId) redirect("/auth/signin");

  const orders = await getUserOrders(userId);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6 text-zinc-100">
      <h1 className="text-3xl font-black text-white">My Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <p>No orders yet.</p>
          <Link href="/" className="text-purple-400 hover:underline mt-4 block">
            Browse drops
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.SK} className="glass p-4 rounded-2xl border border-white/5 flex justify-between items-center">
              <div>
                <p className="text-xs font-mono text-zinc-400">{order.SK.replace("ORDER#", "")}</p>
                <p className="text-sm text-zinc-300 mt-1">Drop: {order.dropId}</p>
                <p className="text-xs text-zinc-500">{new Date(order.timestamp).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <span className="text-emerald-400 font-bold text-sm">CONFIRMED</span>
                <p className="text-white font-black">₹{(order.total / 100).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
