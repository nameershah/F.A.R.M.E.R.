import React, { useState } from "react";

interface TraceListProps {
  trace: string[];
}

export const TraceList: React.FC<TraceListProps> = ({ trace }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  if (!trace || trace.length === 0) return null;

  return (
    <div className="border border-white/5 bg-white/5 backdrop-blur-sm rounded-xl p-4 animate-in fade-in select-none">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full font-outfit text-xs text-slate-400 hover:text-slate-200 uppercase tracking-widest focus:outline-none cursor-pointer"
      >
        <span className="flex items-center gap-2.5">
          <svg
            className={`w-4 h-4 text-sunset-orange transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
          Agent Reasoning Trace ({trace.length} steps)
        </span>
        <span className="font-extrabold text-[10px] text-sunset-orange hover:underline">{isOpen ? "COLLAPSE" : "EXPAND"}</span>
      </button>

      {isOpen && (
        <div className="mt-3.5 pt-3.5 border-t border-white/10 animate-in fade-in">
          <ol className="list-none flex flex-col gap-3">
            {trace.map((step, index) => (
              <li 
                key={index}
                className="flex items-start gap-2.5 font-mono text-[10.5px] text-slate-300 leading-normal"
              >
                <span className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[9px] text-slate-400 font-bold shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};
