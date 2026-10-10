"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Countdown timer hook. Returns days, hours, minutes, seconds until the target date.
 * Returns null if the target date has passed.
 */
export function useCountdown(targetDate: string | Date) {
  const calculateTimeLeft = useCallback(() => {
    const target = typeof targetDate === "string" ? new Date(targetDate) : targetDate;
    const diff = target.getTime() - Date.now();

    if (diff <= 0) return null;

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      total: diff,
    };
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      const tl = calculateTimeLeft();
      setTimeLeft(tl);
      if (!tl) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  return timeLeft;
}
