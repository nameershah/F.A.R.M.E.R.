import React from "react";

export const Header: React.FC = () => {
  return (
    <header className="w-full flex items-center justify-between px-4 py-2.5 bg-white/5 border border-white/10 rounded-full select-none backdrop-blur-md">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-2.5 pl-1">
        <div className="w-7 h-7 rounded-full bg-sunset-orange flex items-center justify-center text-white shadow-lg shadow-sunset-orange/20 shrink-0">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z"
            />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="font-outfit font-extrabold tracking-tight text-sm text-slate-100 uppercase leading-none">
            F.A.R.M.E.R.
          </span>
          <span className="text-[9px] text-slate-400 font-mono tracking-tight leading-tight mt-0.5 hidden md:inline-block">
            Futuristic Agriculture & Resource Management Ecosystem Router
          </span>
          <span className="text-[9px] text-slate-400 font-mono tracking-tight leading-tight mt-0.5 inline-block md:hidden">
            Agri Router
          </span>
        </div>
      </div>

      {/* Node Info / Version Badge styled as pill */}
      <div className="flex items-center gap-2 pr-1">
        <span className="font-mono text-[9px] text-slate-500 tracking-wider">
          v1.1.0
        </span>
      </div>
    </header>
  );
};
