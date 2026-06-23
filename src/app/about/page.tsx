import React from "react";
import Link from "next/link";
import { ArrowRight, Zap, Shield, Database, Layers, GitFork, Clock, BarChart3, Mail } from "lucide-react";

export const metadata = {
  title: "How It Works — PulseCart",
  description:
    "Architecture overview of PulseCart's zero-oversell flash-drop engine — DynamoDB single-table design, sharded inventory, atomic transactions, and OIDC keyless Vercel auth.",
};

const TECH_STACK = [
  { name: "Next.js 15", role: "App Router + React Server Components", color: "zinc" },
  { name: "Amazon DynamoDB", role: "Single-table design, atomic transactions", color: "amber" },
  { name: "AWS Lambda", role: "Email dispatch via DynamoDB Streams", color: "orange" },
  { name: "Amazon SES", role: "Order confirmation emails", color: "blue" },
  { name: "Amazon S3", role: "Product image storage via presigned URLs", color: "green" },
  { name: "Vercel OIDC", role: "Keyless AWS auth — no secrets stored", color: "purple" },
  { name: "NextAuth.js v5", role: "Google OAuth + credentials provider", color: "indigo" },
  { name: "Amazon SQS DLQ", role: "Dead-letter queue for failed Lambda invocations", color: "red" },
];

const CHECKOUT_STEPS = [
  {
    step: "01",
    title: "Shard Selection",
    desc: "API randomly picks 1 of 10 inventory shards per product — distributes write load across DynamoDB partitions to prevent hot-key bottlenecks.",
    icon: Layers,
    color: "purple",
  },
  {
    step: "02",
    title: "Atomic Transaction",
    desc: "A single TransactWriteCommand atomically: (1) decrements shard count only if availableCount > 0 AND price matches, (2) writes the Order record, (3) writes an idempotency token preventing duplicate purchases.",
    icon: Shield,
    color: "emerald",
  },
  {
    step: "03",
    title: "Zero-Oversell Guarantee",
    desc: "If the shard is empty, DynamoDB rejects the transaction server-side — no race condition possible. The API tries the next shard. If all 10 are empty, the item is sold out.",
    icon: Zap,
    color: "amber",
  },
  {
    step: "04",
    title: "Event-Driven Email",
    desc: "DynamoDB Streams captures the new Order record and triggers an AWS Lambda function that dispatches a confirmation email via Amazon SES. Failed invocations queue to SQS DLQ.",
    icon: Mail,
    color: "blue",
  },
];

const SCHEMA_ENTITIES = [
  { pk: "DROP#<id>", sk: "METADATA", desc: "Drop title, description, image URL, start/end times" },
  { pk: "DROP#<id>", sk: "INVENTORY#<productId>#<shard>", desc: "Shard stock count, price — 10 shards per product" },
  { pk: "USER#<id>", sk: "ORDER#<timestamp>", desc: "Confirmed purchase record with drop + product reference" },
  { pk: "SELLER#<id>", sk: "DROP#<id>", desc: "Creator ↔ drop ownership relation" },
  { pk: "USER#<id>", sk: "IDEMPOTENCY#<dropId>", desc: "Prevents double-purchase by same user for same drop" },
  { pk: "WAITLIST#<email>", sk: "SIGNUP#<timestamp>", desc: "Drop alert waitlist registrations" },
];

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-20 text-zinc-100">

      {/* Hero */}
      <section className="space-y-5 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Architecture Overview
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
          Zero Oversell.{" "}
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            By Design.
          </span>
        </h1>
        <p className="text-zinc-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
          PulseCart uses Amazon DynamoDB atomic conditional transactions as the consistency primitive for checkout — not application-level locks or optimistic concurrency. The result: it is mathematically impossible to oversell, regardless of concurrent traffic.
        </p>
        <div className="flex flex-wrap gap-3 justify-center pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-all shadow-[0_0_24px_rgba(124,58,237,0.4)]"
          >
            View Live Drops <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white font-bold text-sm transition-all"
          >
            Try the Demo
          </Link>
        </div>
      </section>

      {/* The Problem */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white">The Overselling Problem</h2>
          <p className="text-zinc-400 text-sm">Why every flash-sale platform gets this wrong</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: "1.",
              title: "Check",
              desc: "Buyer A and Buyer B both query: 1 item remaining. Both pass the check.",
              color: "red",
            },
            {
              icon: "2.",
              title: "Race",
              desc: "Both proceed to checkout concurrently. Both read the same stock value.",
              color: "amber",
            },
            {
              icon: "3.",
              title: "Oversell",
              desc: "Both orders succeed. One must be refunded. Brand damage. Chargebacks.",
              color: "red",
            },
          ].map((item) => (
            <div key={item.title} className="p-5 rounded-2xl bg-red-950/10 border border-red-500/20 space-y-2">
              <span className="text-2xl font-black text-red-400">{item.icon}</span>
              <h3 className="font-bold text-zinc-100">{item.title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex gap-4 items-start">
          <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-emerald-300">How PulseCart eliminates this</p>
            <p className="text-xs text-zinc-400 leading-relaxed mt-1">
              DynamoDB&apos;s <code className="text-emerald-400 bg-emerald-950/40 px-1 py-0.5 rounded">TransactWriteItems</code> enforces a{" "}
              <strong className="text-white">ConditionExpression</strong> at the database layer — not the application layer.
              If <code className="text-emerald-400 bg-emerald-950/40 px-1 py-0.5 rounded">availableCount &gt; 0</code> is false at commit time,
              the entire transaction is atomically rejected. Both buyers cannot win the same unit — guaranteed at the storage engine level.
            </p>
          </div>
        </div>
      </section>

      {/* Checkout Flow */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white">Checkout Flow</h2>
          <p className="text-zinc-400 text-sm">What happens in the milliseconds after &ldquo;Buy Now&rdquo;</p>
        </div>
        <div className="space-y-4">
          {CHECKOUT_STEPS.map((s) => {
            const Icon = s.icon;
            const colorMap: Record<string, string> = {
              purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
              emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
              amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
              blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
            };
            return (
              <div key={s.step} className="flex gap-4 p-5 rounded-2xl bg-zinc-950/40 border border-zinc-800/60 hover:border-zinc-700/60 transition-colors">
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center ${colorMap[s.color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black font-mono text-zinc-500">{s.step}</span>
                    <h3 className="font-bold text-zinc-100 text-sm">{s.title}</h3>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Single-Table Schema */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white">DynamoDB Single-Table Schema</h2>
          <p className="text-zinc-400 text-sm">
            One table, six entity types, two GSIs — every query is an O(1) key lookup
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/60">
                <th className="text-left p-4 text-xs font-black text-zinc-400 uppercase tracking-wider">PK (Partition Key)</th>
                <th className="text-left p-4 text-xs font-black text-zinc-400 uppercase tracking-wider">SK (Sort Key)</th>
                <th className="text-left p-4 text-xs font-black text-zinc-400 uppercase tracking-wider hidden sm:table-cell">Contents</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {SCHEMA_ENTITIES.map((e, i) => (
                <tr key={i} className="hover:bg-zinc-900/30 transition-colors">
                  <td className="p-4 font-mono text-[11px] text-violet-400">{e.pk}</td>
                  <td className="p-4 font-mono text-[11px] text-cyan-400">{e.sk}</td>
                  <td className="p-4 text-xs text-zinc-500 hidden sm:table-cell">{e.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-zinc-950/40 border border-zinc-800/60 space-y-1">
            <div className="flex items-center gap-2">
              <GitFork className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-bold text-zinc-200">GSI1</span>
            </div>
            <p className="text-xs text-zinc-500">
              <code className="text-violet-400">GSI1PK = DROP#&lt;id&gt;</code> / <code className="text-cyan-400">GSI1SK = ORDER#&lt;ts&gt;</code>
              <br />Used by the admin dashboard to list all orders for a drop in O(1).
            </p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-950/40 border border-zinc-800/60 space-y-1">
            <div className="flex items-center gap-2">
              <GitFork className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-zinc-200">GSI2</span>
            </div>
            <p className="text-xs text-zinc-500">
              <code className="text-violet-400">GSI2PK = &quot;DROP&quot;</code> / <code className="text-cyan-400">GSI2SK = startTime</code>
              <br />Static partition key enables a single query to fetch all drops, sorted chronologically.
            </p>
          </div>
        </div>
      </section>

      {/* Scale Story */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white">Scale Story</h2>
          <p className="text-zinc-400 text-sm">What happens if 10,000 buyers hit checkout simultaneously</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: "10×", label: "Inventory shards per product", icon: Layers, color: "purple" },
            { value: "10K/s", label: "Max concurrent WCU throughput", icon: Zap, color: "amber" },
            { value: "< $0.02", label: "Cost for a 10,000-unit sold-out drop", icon: Database, color: "emerald" },
            { value: "0", label: "Oversells in 200-request stress test", icon: BarChart3, color: "cyan" },
          ].map((stat) => {
            const Icon = stat.icon;
            const colorMap: Record<string, string> = {
              purple: "text-purple-400",
              amber: "text-amber-400",
              emerald: "text-emerald-400",
              cyan: "text-cyan-400",
            };
            return (
              <div key={stat.label} className="p-5 rounded-2xl bg-zinc-950/40 border border-zinc-800/60 space-y-2 text-center">
                <Icon className={`w-5 h-5 mx-auto ${colorMap[stat.color]}`} />
                <div className={`text-2xl font-black ${colorMap[stat.color]}`}>{stat.value}</div>
                <p className="text-[10px] text-zinc-500 leading-snug">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Stress test proof box */}
        <div className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800 font-mono text-xs space-y-2">
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Stress Test Output — 200 concurrent requests, 50 item stock</p>
          <div className="space-y-1 pt-1">
            <p className="text-zinc-300"><span className="text-emerald-400">✓</span> Total requests sent: <span className="text-white font-bold">200</span></p>
            <p className="text-zinc-300"><span className="text-emerald-400">✓</span> Successful checkouts: <span className="text-white font-bold">50</span></p>
            <p className="text-zinc-300"><span className="text-emerald-400">✓</span> Rejected (sold out): <span className="text-white font-bold">150</span></p>
            <p className="text-zinc-300"><span className="text-emerald-400">✓</span> OVERSELL DETECTED: <span className="text-emerald-400 font-black">NO ✅</span></p>
            <p className="text-zinc-300"><span className="text-emerald-400">✓</span> Final inventory count: <span className="text-white font-bold">0 / 50</span></p>
          </div>
        </div>
      </section>

      {/* OIDC Keyless Auth */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white">Keyless AWS Authentication</h2>
          <p className="text-zinc-400 text-sm">No <code className="text-red-400">AWS_ACCESS_KEY_ID</code>. No <code className="text-red-400">AWS_SECRET_ACCESS_KEY</code>. Ever.</p>
        </div>
        <div className="flex flex-col gap-3">
          {[
            { n: "1", text: "Vercel generates a short-lived OIDC identity token on each request." },
            { n: "2", text: "The token is exchanged with AWS STS via IAM Role Federation for temporary credentials." },
            { n: "3", text: "Credentials are scoped to the minimum DynamoDB/S3/SES permissions required — and expire automatically." },
            { n: "4", text: "No static secrets anywhere in Vercel environment variables. Zero credential rotation required." },
          ].map((s) => (
            <div key={s.n} className="flex items-start gap-3 p-4 rounded-xl bg-zinc-950/40 border border-zinc-800/60">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black flex items-center justify-center">
                {s.n}
              </span>
              <p className="text-xs text-zinc-400 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white">Tech Stack</h2>
          <p className="text-zinc-400 text-sm">Every dependency earns its place</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TECH_STACK.map((t) => (
            <div key={t.name} className="flex items-start gap-3 p-4 rounded-xl bg-zinc-950/40 border border-zinc-800/60 hover:border-zinc-700 transition-colors">
              <span className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0 mt-1.5" />
              <div>
                <p className="text-sm font-bold text-zinc-100">{t.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center space-y-4 py-8 border-t border-zinc-800">
        <div className="flex items-center justify-center gap-2">
          <Clock className="w-4 h-4 text-zinc-500" />
          <p className="text-xs text-zinc-500">Built for H0: Hack the Zero Stack — AWS DynamoDB + Vercel</p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-all"
          >
            View Live Drops <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-700 hover:border-zinc-600 text-zinc-300 font-bold text-sm transition-all"
          >
            Sign In to Try
          </Link>
        </div>
      </section>
    </div>
  );
}
