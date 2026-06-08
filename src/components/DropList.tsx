import React from "react";
import Link from "next/link";
import { getDropsByStatus } from "@/lib/queries";
import { docClient, TABLE_NAME } from "@/lib/dynamodb";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import CountdownTimer from "@/components/CountdownTimer";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

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
    const items = response.Items || [];
    if (items.length === 0) return null;

    const aggregated = {
      availableCount: 0,
      baseInventory: 0,
      price: items[0].price || 0,
      SK: items[0].SK,
    };

    for (const item of items) {
      aggregated.availableCount += item.availableCount || 0;
      aggregated.baseInventory += item.baseInventory || 0;
    }

    return aggregated;
  } catch (error) {
    console.error(`Error querying inventory for drop ${dropId}:`, error);
    return null;
  }
}

export default async function DropList() {
  // 1. Fetch drops by status
  const activeDrops = await getDropsByStatus("ACTIVE");
  const scheduledDrops = await getDropsByStatus("SCHEDULED");
  
  // Combine all active and scheduled drops
  const allDropsRaw = [...activeDrops, ...scheduledDrops];

  // 2. Fetch inventory and price details for each drop concurrently
  const drops = await Promise.all(
    allDropsRaw.map(async (drop) => {
      const dropId = drop.PK.split("#")[1];
      const inventory = await getDropInventory(dropId);

      return {
        id: dropId,
        title: drop.title,
        description: drop.description,
        startTime: drop.startTime,
        endTime: drop.endTime,
        imageUrl: drop.imageUrl,
        status: drop.status,
        price: inventory ? inventory.price : 0,
        availableCount: inventory ? inventory.availableCount : 0,
      };
    })
  );

  if (drops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-100/30 dark:bg-zinc-950/40 backdrop-blur-md space-y-4">
        <svg
          className="w-12 h-12 text-zinc-400 dark:text-zinc-600 animate-pulse"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
        <div className="text-center space-y-1">
          <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">No drops live right now</h3>
          <p className="text-sm text-zinc-500">Check back soon for upcoming limited launches.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {drops.map((drop) => {
        const isLive = drop.status === "ACTIVE";
        const targetTime = isLive ? drop.endTime : drop.startTime;

        return (
          <Link key={drop.id} href={`/drop/${drop.id}`} className="block group">
            <Card className="h-full overflow-hidden transition-all duration-300 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/20 hover:border-purple-500/40 hover:shadow-purple-500/5 hover:-translate-y-1 flex flex-col justify-between">
              <div>
                {/* Card Image Cover */}
                <div className="relative aspect-video w-full overflow-hidden bg-zinc-150 dark:bg-zinc-950">
                  <img
                    src={drop.imageUrl}
                    alt={drop.title}
                    className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Status Badges */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    {isLive ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20 backdrop-blur-md uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        LIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 backdrop-blur-md uppercase tracking-wider">
                        SCHEDULED
                      </span>
                    )}
                  </div>
                  
                  {/* Price Badge */}
                  <div className="absolute bottom-4 right-4 bg-zinc-900/90 dark:bg-zinc-950/80 border border-white/5 backdrop-blur-md px-3 py-1 rounded-xl text-sm font-black text-white">
                    ₹{(drop.price / 100).toFixed(2)}
                  </div>
                </div>

                <CardHeader className="space-y-1">
                  <CardTitle className="group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors text-zinc-900 dark:text-zinc-100">
                    {drop.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-zinc-500 dark:text-zinc-400">
                    {drop.description}
                  </CardDescription>
                </CardHeader>
              </div>

              <CardFooter className="border-t border-zinc-100 dark:border-zinc-800/40 pt-4 flex items-center justify-between">
                {/* Countdown Timer */}
                <div className="flex flex-col space-y-1">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                    {isLive ? "Ends In" : "Starts In"}
                  </span>
                  <CountdownTimer targetTime={targetTime} />
                </div>

                {/* Stock status */}
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                    drop.availableCount > 0
                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                      : "bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20"
                  }`}
                >
                  {drop.availableCount > 0 ? `${drop.availableCount} left` : "SOLD OUT"}
                </span>
              </CardFooter>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
