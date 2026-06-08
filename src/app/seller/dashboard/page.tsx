import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSellerDrops, getDrop, getDropOrders } from "@/lib/queries";
import { docClient, TABLE_NAME } from "@/lib/dynamodb";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import CreateDropModal from "@/components/CreateDropModal";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Calendar, Layers, ShoppingBag, Tag } from "lucide-react";

export const revalidate = 0;

// Helper to query inventory without needing the generated productId
async function getDropInventory(dropId: string) {
  try {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `DROP#${dropId}`,
        ":sk": "INVENTORY#",
      },
    });
    const response = await docClient.send(command);
    return response.Items?.[0] || null;
  } catch (error) {
    console.error(`Error querying inventory for drop ${dropId} on dashboard:`, error);
    return null;
  }
}

export default async function SellerDashboardPage() {
  // 1. Authenticate user
  const session = await auth();
  const user = session?.user as any;

  if (!user || !user.id) {
    redirect("/api/auth/signin");
  }

  // Support both "seller" and "ADMIN" roles on sandbox
  if (user.role !== "seller" && user.role !== "ADMIN") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-zinc-100">
        <h2 className="text-2xl font-bold">Access Forbidden</h2>
        <p className="text-zinc-500 text-sm">You must be registered as a creator/seller to access this panel.</p>
        <Link href="/" className="text-purple-400 hover:underline text-sm font-semibold">
          Back to Catalog
        </Link>
      </div>
    );
  }

  const sellerId = user.id;

  // 2. Fetch drops list for the logged-in seller
  const sellerDrops = await getSellerDrops(sellerId);

  // 3. For each drop, fetch metadata, inventory details, and orders count concurrently
  const dropsData = await Promise.all(
    sellerDrops.map(async (sellerDrop) => {
      const dropId = sellerDrop.SK.split("#")[1];

      const [metadata, inventory, orders] = await Promise.all([
        getDrop(dropId),
        getDropInventory(dropId),
        getDropOrders(dropId),
      ]);

      return {
        id: dropId,
        sellerDropTitle: sellerDrop.title,
        sellerDropStatus: sellerDrop.status,
        metadata,
        inventory,
        totalOrders: orders.length,
      };
    })
  );

  return (
    <div className="space-y-8 py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-zinc-100 min-h-screen">
      {/* Header and Trigger Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-500 bg-clip-text text-transparent">
            Creator Dashboard
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm">
            Monitor inventory status, drop timelines, and orders.
          </p>
        </div>
        <div className="flex-shrink-0">
          <CreateDropModal />
        </div>
      </div>

      {dropsData.length === 0 ? (
        // Empty State
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-zinc-800 rounded-3xl bg-zinc-950/40 backdrop-blur-md space-y-4">
          <div className="p-4 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500">
            <Layers className="w-8 h-8 animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-zinc-300">No drops launched yet</h3>
            <p className="text-sm text-zinc-500 max-w-xs mx-auto">
              Launch your first exclusive flash drop using the button above.
            </p>
          </div>
        </div>
      ) : (
        // Grid Display
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dropsData.map((drop) => {
            const hasMeta = !!drop.metadata;
            const title = drop.metadata?.title || drop.sellerDropTitle;
            const startTime = drop.metadata?.startTime;
            const endTime = drop.metadata?.endTime;
            const imageUrl = drop.metadata?.imageUrl;
            
            // Calculate state badge properties dynamically
            const now = new Date();
            let status = drop.metadata?.status || drop.sellerDropStatus || "SCHEDULED";

            if (startTime && endTime) {
              const start = new Date(startTime);
              const end = new Date(endTime);
              if (end < now) {
                status = "ENDED";
              } else if (start <= now && end >= now) {
                status = "ACTIVE";
              } else {
                status = "SCHEDULED";
              }
            }

            const isLive = status === "ACTIVE";
            const isEnded = status === "ENDED";

            const availableCount = drop.inventory ? drop.inventory.availableCount : 0;
            const baseInventory = drop.inventory ? drop.inventory.baseInventory : 0;
            const price = drop.inventory ? drop.inventory.price : 0;

            const formattedStart = startTime
              ? new Date(startTime).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "Not Scheduled";

            return (
              <Card key={drop.id} className="overflow-hidden border border-zinc-800 bg-zinc-950/20 hover:border-purple-500/40 transition-all flex flex-col justify-between">
                <div>
                  {/* Card Image */}
                  <div className="relative aspect-video w-full overflow-hidden bg-zinc-950/80 border-b border-zinc-800/50">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={title}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600 font-mono text-[10px]">
                        No Image Available
                      </div>
                    )}

                    {/* Status badges */}
                    <div className="absolute top-4 left-4">
                      {isLive ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 backdrop-blur-md uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          ACTIVE
                        </span>
                      ) : isEnded ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 backdrop-blur-md uppercase tracking-wider">
                          ENDED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 backdrop-blur-md uppercase tracking-wider">
                          SCHEDULED
                        </span>
                      )}
                    </div>

                    {/* Price display badge */}
                    {price > 0 && (
                      <div className="absolute bottom-4 right-4 bg-zinc-950/80 border border-white/5 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-black text-white">
                        ₹{(price / 100).toFixed(2)}
                      </div>
                    )}
                  </div>

                  <CardHeader className="space-y-1">
                    <CardTitle className="line-clamp-1 text-white">{title}</CardTitle>
                    <CardDescription className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider select-all">
                      Drop ID: {drop.id}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 text-sm pt-0">
                    {/* Starts In */}
                    <div className="flex items-center gap-2.5 text-xs text-zinc-400">
                      <Calendar className="w-4 h-4 text-zinc-500" />
                      <span>{isEnded ? "Ended Drop" : `Launch: ${formattedStart}`}</span>
                    </div>

                    {/* Quick Specs details */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 flex flex-col gap-1 justify-center">
                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Stock</span>
                        <span className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-zinc-500" />
                          {availableCount} <span className="text-[10px] text-zinc-500 font-normal">/ {baseInventory}</span>
                        </span>
                      </div>

                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 flex flex-col gap-1 justify-center">
                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Orders</span>
                        <span className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                          <ShoppingBag className="w-3.5 h-3.5 text-zinc-500" />
                          {drop.totalOrders}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </div>

                <CardFooter className="border-t border-zinc-800/40 pt-4 flex gap-2">
                  <Link
                    href={`/drop/${drop.id}`}
                    className="flex-1 text-center py-2.5 px-4 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs tracking-wider transition-all uppercase"
                  >
                    View Drop
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
