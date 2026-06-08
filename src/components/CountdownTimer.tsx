"use client";

import React, { useEffect, useState } from "react";

interface CountdownTimerProps {
  targetTime: string;
}

export default function CountdownTimer({ targetTime }: CountdownTimerProps) {
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

  return (
    <span className="font-mono text-sm font-semibold tracking-tight text-purple-300">
      {timeLeft.days > 0 && <span>{timeLeft.days}d </span>}
      {pad(timeLeft.hours)}h : {pad(timeLeft.minutes)}m : {pad(timeLeft.seconds)}s
    </span>
  );
}
