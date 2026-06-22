import React from "react";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAllDrops } from "@/lib/queries";
import { 
  Shield, 
  ArrowRight, 
  Calendar, 
  Tag, 
  Layers, 
  ArrowLeft 
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "@/components/ui/card";

export const revalidate = 0;

export default async function AdminLandingPage() {
  // 1. Authenticate user as admin
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;

  if (!user || !user.id) {
    redirect("/api/auth/signin");
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-zinc-100">
        <h2 className="text-2xl font-bold">Access Forbidden</h2>
        <p className="text-zinc-500 text-sm">You must be registered as an administrator to access this panel.</p>
        <Link href="/" className="text-purple-400 hover:underline text-sm font-semibold">
          Back to Catalog
        </Link>
      </div>
    );
  }

  // 2. Fetch all drops
  const allDrops = await getAllDrops();

  return (
    <div className="space-y-8 py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-zinc-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div className="space-y-1">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Drops
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              System Administration
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 backdrop-blur-md uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" /> ADMIN
            </span>
          </div>
          <p className="text-zinc-400 text-xs sm:text-sm">
            Access the live real-time checkout telemetry for active and scheduled drops.
          </p>
        </div>
      </div>

      {allDrops.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-zinc-800 rounded-3xl bg-zinc-950/40 backdrop-blur-md space-y-4">
          <div className="p-4 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500">
            <Layers className="w-8 h-8 animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-zinc-300">No drops launched yet</h3>
            <p className="text-sm text-zinc-500 max-w-xs mx-auto">
              Seeded drops will appear here once you run the initialization seeders.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allDrops.map((drop) => {
            const now = new Date();
            const start = new Date(drop.startTime);
            const end = new Date(drop.endTime);
            const isLive = start <= now && end >= now;
            const formattedStart = drop.startTime
              ? new Date(drop.startTime).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "Not Scheduled";

            return (
              <Card key={drop.PK} className="overflow-hidden border border-zinc-800 bg-zinc-950/20 hover:border-purple-500/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="relative aspect-video w-full overflow-hidden bg-zinc-950/80 border-b border-zinc-800/50">
                    {drop.imageUrl ? (
                      <Image
                        src={drop.imageUrl}
                        alt={drop.title}
                        className="object-cover w-full h-full"
                        width={400}
                        height={225}
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600 font-mono text-[10px]">
                        No Image
                      </div>
                    )}

                    <div className="absolute top-4 left-4">
                      {isLive ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 backdrop-blur-md uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 backdrop-blur-md uppercase tracking-wider">
                          SCHEDULED
                        </span>
                      )}
                    </div>
                  </div>

                  <CardHeader className="space-y-1">
                    <CardTitle className="line-clamp-1 text-white">{drop.title}</CardTitle>
                    <CardDescription className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider">
                      Drop ID: {drop.PK.replace(/^DROP#/, "")}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 text-sm pt-0">
                    <div className="flex items-center gap-2.5 text-xs text-zinc-400">
                      <Calendar className="w-4 h-4 text-zinc-500" />
                      <span>Launch: {formattedStart}</span>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs text-zinc-400">
                      <Tag className="w-4 h-4 text-zinc-500" />
                      <span>Total Stock: {drop.totalStock} units</span>
                    </div>
                  </CardContent>
                </div>

                <CardFooter className="border-t border-zinc-800/40 pt-4">
                  <Link
                    href={`/admin/drops/${drop.PK.replace(/^DROP#/, "")}`}
                    className="w-full flex items-center justify-center gap-2 text-center py-2.5 px-4 rounded-xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 text-purple-400 hover:text-purple-300 font-semibold text-xs tracking-wider transition-all uppercase"
                  >
                    Launch Analytics <ArrowRight className="w-4 h-4" />
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
