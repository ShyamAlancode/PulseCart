"use client";

import React, { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  ShoppingBag, 
  Loader2, 
  ArrowLeft, 
  Clock,
  RefreshCw
} from "lucide-react";

interface Drop {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  startTime: string;
  endTime: string;
  status: string;
  totalStock: number;
}

interface Order {
  PK: string;
  SK: string;
  dropId: string;
  productId: string;
  status: string;
  total: number;
  timestamp: string;
  email: string;
}

function RevenueLineChart({ orders }: { orders: Order[] }) {
  if (orders.length === 0) return null;

  // Sort orders oldest to newest
  const sorted = [...orders].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Generate cumulative revenue series
  let cumulative = 0;
  const data = sorted.map((o) => {
    cumulative += o.total;
    return {
      time: new Date(o.timestamp),
      value: cumulative,
      email: o.email,
    };
  });

  const width = 600;
  const height = 220;
  const paddingLeft = 55;
  const paddingRight = 25;
  const paddingTop = 15;
  const paddingBottom = 35;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const times = data.map((d) => d.time.getTime());
  const minTime = times[0];
  const maxTime = times[times.length - 1];
  const timeRange = maxTime - minTime || 1;

  const values = data.map((d) => d.value);
  const maxValue = Math.max(...values, 1);
  const minValue = 0;
  const valueRange = maxValue - minValue;

  // Generate path points
  const points = data.map((d) => {
    const x = paddingLeft + ((d.time.getTime() - minTime) / timeRange) * chartWidth;
    const y = paddingTop + chartHeight - ((d.value - minValue) / valueRange) * chartHeight;
    return { x, y, ...d };
  });

  let pathD = "";
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }
  }

  // Path for fill under the line
  const fillD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
    : "";

  return (
    <div className="glass p-6 rounded-2xl border border-white/5 space-y-4 bg-zinc-950/20 backdrop-blur-md">
      <div>
        <h3 className="font-extrabold text-white text-lg">Sales Velocity Growth</h3>
        <p className="text-xs text-zinc-400">
          Cumulative gross sales growth plotted chronologically across transactions
        </p>
      </div>
      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {Array.from({ length: 4 }).map((_, i) => {
            const y = paddingTop + (chartHeight / 3) * i;
            const val = maxValue - (valueRange / 3) * i;
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 3}
                  fill="rgba(255,255,255,0.4)"
                  fontSize="9"
                  textAnchor="end"
                  className="font-mono"
                >
                  ₹{(val / 100).toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Fill under the curve */}
          {fillD && <path d={fillD} fill="url(#chartGradient)" />}

          {/* Line Path */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#a855f7"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points */}
          {points.map((pt, i) => (
            <g key={i} className="group cursor-pointer">
              <circle
                cx={pt.x}
                cy={pt.y}
                r="3.5"
                fill="#818cf8"
                stroke="#a855f7"
                strokeWidth="1.5"
                className="transition-transform duration-200 hover:scale-150"
              />
              <title>
                {`Time: ${pt.time.toLocaleTimeString()}\nRevenue: ₹${(pt.value / 100).toFixed(2)}\nBuyer: ${pt.email}`}
              </title>
            </g>
          ))}

          {/* X-axis time markings */}
          {points.length > 0 && (
            <>
              <text
                x={paddingLeft}
                y={height - 10}
                fill="rgba(255,255,255,0.4)"
                fontSize="9"
                textAnchor="start"
                className="font-mono"
              >
                {points[0].time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </text>
              <text
                x={width - paddingRight}
                y={height - 10}
                fill="rgba(255,255,255,0.4)"
                fontSize="9"
                textAnchor="end"
                className="font-mono"
              >
                {points[points.length - 1].time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </text>
            </>
          )}
        </svg>
      </div>
    </div>
  );
}

export default function AdminDropPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: dropId } = use(params);

  const [drop, setDrop] = useState<Drop | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [pollingActive, setPollingActive] = useState(true);

  // 1. Fetch drop config details
  useEffect(() => {
    async function fetchDropDetails() {
      try {
        const res = await fetch(`/api/drops/${dropId}`);
        if (res.ok) {
          const data = await res.json();
          setDrop(data);
        }
      } catch (err) {
        console.error("Error loading drop details:", err);
      }
    }
    fetchDropDetails();
  }, [dropId]);

  // 2. Fetch orders list
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/drops/${dropId}/orders`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Error loading drop orders:", err);
    } finally {
      setLoading(false);
    }
  }, [dropId]);

  useEffect(() => {
    fetchOrders();
  }, [dropId, fetchOrders]);

  // 3. Poll for new orders every 2 seconds
  useEffect(() => {
    if (!pollingActive) return;

    const interval = setInterval(() => {
      fetchOrders();
    }, 2000);

    return () => clearInterval(interval);
  }, [pollingActive, fetchOrders]);

  if (loading && !drop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
        <p className="text-gray-400 text-sm">Loading admin dashboard...</p>
      </div>
    );
  }

  if (!drop) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-white">Drop Not Found</h2>
        <Link href="/" className="text-purple-400 hover:text-purple-300">
          Back to Home
        </Link>
      </div>
    );
  }

  // Calculations
  const totalSold = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const sellOutRate = Math.min(100, Math.round((totalSold / drop.totalStock) * 100));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Drops
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black text-white">
              Sales Dashboard: <span className="text-purple-400">{drop.title}</span>
            </h1>
            <span className="text-xs bg-purple-500/10 border border-purple-500/20 text-purple-400 font-mono px-2 py-0.5 rounded-full">
              ID: {drop.id}
            </span>
          </div>
          <p className="text-sm text-gray-400">
            Real-time analytics and order validation ledger queried via GSI1.
          </p>
        </div>

        {/* Polling Toggle */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={() => setPollingActive(!pollingActive)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all select-none ${
              pollingActive
                ? "bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
                : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${pollingActive ? "animate-spin" : ""}`} />
            {pollingActive ? "Live Sync Active" : "Sync Paused"}
          </button>
        </div>
      </div>

      {/* KPI metrics cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1: Total Revenue */}
        <div className="glass p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex justify-between items-start">
            <span className="text-sm font-semibold text-gray-400">Total Revenue</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-white">${totalRevenue.toFixed(2)}</div>
            <div className="text-[10px] text-gray-500 font-mono mt-1">
              Price per item: ${drop.price.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Metric 2: Items Sold */}
        <div className="glass p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex justify-between items-start">
            <span className="text-sm font-semibold text-gray-400">Items Sold</span>
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <ShoppingBag className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-white">
              {totalSold} <span className="text-sm font-medium text-gray-500">/ {drop.totalStock}</span>
            </div>
            <div className="text-[10px] text-gray-500 font-mono mt-1">
              Original base stock: {drop.totalStock} units
            </div>
          </div>
        </div>

        {/* Metric 3: Sell-Out Rate */}
        <div className="glass p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex justify-between items-start">
            <span className="text-sm font-semibold text-gray-400">Sell-Out Efficiency</span>
            <div className="p-2 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20">
              <TrendingUp className="w-4 h-4 text-accent-cyan" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-white">{sellOutRate}%</div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-accent-cyan" style={{ width: `${sellOutRate}%` }} />
            </div>
          </div>
        </div>

        {/* Metric 4: Drop Status */}
        <div className="glass p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex justify-between items-start">
            <span className="text-sm font-semibold text-gray-400">Drop Status</span>
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold uppercase tracking-wider text-white">
              {drop.status === "ACTIVE" && totalSold >= drop.totalStock ? "SOLD OUT" : drop.status}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              Start: {new Date(drop.startTime).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Sales Velocity Chart */}
      <RevenueLineChart orders={orders} />

      {/* Order Logs Table */}
      <div className="glass rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-extrabold text-white text-lg">Transaction Ledger</h3>
            <p className="text-xs text-gray-400">
              Confirmed successful purchases registered under sort key `ORDER#`
            </p>
          </div>
          <Link
            href={`/drop/${dropId}`}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-purple-500/20 text-purple-400 hover:bg-purple-500/10"
          >
            Visit Public Drop Page
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Users className="w-10 h-10 text-gray-600 mx-auto" />
            <h4 className="font-semibold text-gray-300">No orders registered yet</h4>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Once buyers start checking out, successful transactions will appear here instantly.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-gray-500 font-semibold text-xs">
                  <th className="p-4 pl-6">Order Timestamp</th>
                  <th className="p-4">Buyer Account / Email</th>
                  <th className="p-4">Sort Key (SK)</th>
                  <th className="p-4">Transaction Status</th>
                  <th className="p-4 pr-6 text-right">Price Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((order) => {
                  const buyerId = order.PK.split("#")[1];
                  const timestampStr = new Date(order.timestamp).toLocaleTimeString();
                  const dateStr = new Date(order.timestamp).toLocaleDateString();

                  return (
                    <tr key={order.PK + order.SK} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 pl-6 font-mono text-xs">
                        <span className="text-white block">{timestampStr}</span>
                        <span className="text-gray-500 text-[10px]">{dateStr}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-white font-medium block">{order.email}</span>
                        <span className="text-gray-500 font-mono text-[10px]">Buyer: {buyerId}</span>
                      </td>
                      <td className="p-4 font-mono text-xs text-gray-400">
                        {order.SK}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right font-bold text-white font-mono">
                        ${order.total.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
