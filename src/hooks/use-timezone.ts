"use client";

import { useState, useEffect } from "react";

/**
 * Returns the user's timezone string (e.g., "Africa/Accra", "America/New_York")
 */
export function useTimezone() {
  const [timezone, setTimezone] = useState("UTC");

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  return timezone;
}
