"use client";

import React, { useEffect, useState } from "react";

interface CountdownTimerProps {
  targetTime: string;
  size?: "sm" | "lg";
}

function TimeSegment({ value, label, flash }: { value: string; label: string; flash?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={`
        bg-zinc-900 border border-zinc-850 rounded-xl 
        px-2.5 py-1.5 min-w-[44px] text-center
        shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]
        ${flash ? 'text-violet-300' : 'text-white'}
      `}>
        <span className="font-mono text-xl font-black tabular-nums leading-none">
          {value}
        </span>
      </div>
      <span className="text-[8px] font-bold tracking-[0.15em] text-zinc-500 uppercase">
        {label}
      </span>
    </div>
  );
}

function Separator() {
  return (
    <span className="text-zinc-500 font-black text-lg mb-3.5 select-none">:</span>
  );
}

export default function CountdownTimer({ targetTime, size = "sm" }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isLive: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isLive: false,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetTime) - +new Date();
      
      if (difference <= 0) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isLive: true,
        };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isLive: false,
      };
    };

    // Initial check
    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const time = calculateTimeLeft();
      setTimeLeft(time);
      if (time.isLive) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTime]);

  if (timeLeft.isLive) {
    return (
      <span className="font-bold text-emerald-400 uppercase tracking-wider animate-pulse [text-shadow:0_0_12px_rgba(52,211,153,0.8)] filter drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
        DROP IS LIVE
      </span>
    );
  }

  const pad = (num: number) => num.toString().padStart(2, "0");

  if (size === "lg") {
    return (
      <div className="flex items-center gap-2">
        {timeLeft.days > 0 && (
          <TimeSegment value={pad(timeLeft.days)} label="DAYS" />
        )}
        <TimeSegment value={pad(timeLeft.hours)} label="HRS" />
        <Separator />
        <TimeSegment value={pad(timeLeft.minutes)} label="MIN" />
        <Separator />
        <TimeSegment value={pad(timeLeft.seconds)} label="SEC" flash />
      </div>
    );
  }

  return (
    <span className="font-mono text-sm font-semibold tracking-tight text-purple-300">
      {timeLeft.days > 0 && <span>{timeLeft.days}d </span>}
      {pad(timeLeft.hours)}h : {pad(timeLeft.minutes)}m : {pad(timeLeft.seconds)}s
    </span>
  );
}
