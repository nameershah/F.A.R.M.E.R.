import React, { useEffect, useState } from "react";
import { checkHealth } from "../lib/api";
import type { HealthResponse } from "../types";

export const StatusBadge: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<boolean>(false);

  const performHealthCheck = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await checkHealth();
      setHealth(data);
    } catch (err) {
      setHealth(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performHealthCheck();
    // Poll every 30 seconds for updated system health
    const interval = setInterval(performHealthCheck, 30000);
    return () => clearInterval(interval);
  }, []);

  let dotClass = "bg-neutral-600";
  let statusText = "Checking system routing...";
  let pulse = false;

  if (loading && !health) {
    dotClass = "bg-neutral-600";
    statusText = "Checking system routing...";
    pulse = true;
  } else if (error || !health || health.status !== "ok") {
    dotClass = "bg-neutral-600";
    statusText = "System offline";
  } else if (!health.mongodbLoggingConnected) {
    dotClass = "bg-amber-500";
    statusText = "Logging unavailable";
  } else {
    dotClass = "bg-[#10B981]";
    statusText = "System healthy";
  }

  return (
    <div 
      onClick={performHealthCheck}
      className="flex items-center gap-2 px-2.5 py-1 bg-white/5 border border-white/10 rounded-full cursor-pointer select-none hover:bg-white/10 transition-all w-fit animate-in fade-in"
      title="Click to check health again"
    >
      <span className="relative flex h-1.5 w-1.5">
        {pulse && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotClass}`}></span>
      </span>
      <span className="font-mono text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
        {statusText}
      </span>
    </div>
  );
};
