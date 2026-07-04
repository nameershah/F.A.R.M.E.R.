import React, { useState } from "react";
import { Header } from "./components/Header";
import { StatusBadge } from "./components/StatusBadge";
import { UploadCard } from "./components/UploadCard";
import { ResultCard } from "./components/ResultCard";
import { TraceList } from "./components/TraceList";
import { submitQuery } from "./lib/api";
import type { QueryResponse } from "./types";
import sunsetBgUrl from "./assets/sunset_wheat_field.png";

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuerySubmit = async (text: string, file: File | null) => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await submitQuery(text, file);
      setResponse(data);
      
      // Confidentiality: gate payload logging behind DEV environment guard
      if (import.meta.env.DEV) {
        console.log("[DEV] Query response payload:", data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected network error occurred.";
      setError(message);
      
      if (import.meta.env.DEV) {
        console.error("[DEV] Query submission error:", err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-4 md:p-8 relative font-sans overflow-y-auto"
      style={{ backgroundImage: `url(${sunsetBgUrl})`, willChange: "transform" }}
    >
      {/* Background Dark Overlay */}
      <div className="absolute inset-0 bg-black/45 z-0" />

      {/* Glassmorphism Card Wrapper */}
      <div className="w-full max-w-5xl glass-card rounded-3xl p-6 md:p-8 flex flex-col gap-6 relative z-10 shadow-2xl shadow-black/50 animate-in fade-in" style={{ contain: "layout" }}>
        {/* Floating pill header inside the card */}
        <Header />
        
        {/* Responsive Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-2">
          
          {/* Left Column: Hero Content & Brand Value (col-span-5) */}
          <div className="lg:col-span-5 flex flex-col justify-between h-full gap-8">
            <div className="flex flex-col gap-5">
              {/* Main Heading */}
              <h1 className="font-outfit font-semibold text-2xl md:text-3xl text-slate-100 tracking-tight">
                Making sense of crop issues locally.
              </h1>
              
              {/* Description */}
              <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
                I built this tool to help route agricultural questions, though it is not a perfect science. You upload a picture of a leaf or ask about local soil conditions. The system then tries to suggest a potential diagnosis. It might point to a specific pest or recommend irrigation adjustments, but we always suggest double checking with a local extension officer before making big changes.
              </p>
            </div>
            
          </div>
          
          {/* Right Column: Diagnostic & Interactive Center (col-span-7) */}
          <main className="lg:col-span-7 flex flex-col gap-5">
            {/* Console Indicator and Status Badge */}
            <div className="flex items-center justify-between w-full">
              <span className="font-mono text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                Diagnosis Console
              </span>
              <StatusBadge />
            </div>

            {/* Error Message Box */}
            {error && (
              <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4 animate-in fade-in flex gap-3">
                <svg 
                  className="w-5 h-5 text-red-500 shrink-0 mt-0.5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                  />
                </svg>
                <div className="flex flex-col gap-1 w-full">
                  <span className="font-mono text-[9px] text-red-400 uppercase tracking-widest font-bold">
                    Network / Server Failure
                  </span>
                  <p className="font-sans text-xs text-red-200/90 leading-relaxed">
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="font-mono text-[9px] text-red-400 hover:text-red-300 underline uppercase tracking-widest text-left mt-2 cursor-pointer font-bold"
                  >
                    DISMISS ERROR
                  </button>
                </div>
              </div>
            )}

            {/* Form Upload & Input Card */}
            <UploadCard onSubmitting={handleQuerySubmit} isLoading={isLoading} />

            {/* Result Card Output */}
            {response && (
              <ResultCard 
                answer={response.answer} 
                escalated={response.escalated} 
              />
            )}

            {/* Trace steps */}
            {response && response.trace && response.trace.length > 0 && (
              <TraceList trace={response.trace} />
            )}
          </main>
          
        </div>
      </div>
    </div>
  );
};

export default App;
