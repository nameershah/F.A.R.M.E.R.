import React from "react";

interface ResultCardProps {
  answer: string;
  escalated: boolean;
}

interface WeatherDay {
  date: string;
  minTemp: string;
  maxTemp: string;
  rain: string;
}

function formatDay(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function renderTextWithBold(text: string): React.ReactNode[] {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, index) => {
    // Odd indexes are the matched bold groups
    if (index % 2 === 1) {
      return (
        <strong key={index} className="font-semibold text-slate-100">
          {part}
        </strong>
      );
    }
    return part;
  });
}

const WeatherForecast: React.FC<{ days: WeatherDay[] }> = ({ days }) => {
  return (
    <div className="my-3.5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {days.map((day, idx) => {
          const hasRain = parseFloat(day.rain) > 0;
          return (
            <div 
              key={idx} 
              className="bg-black/25 border border-white/5 hover:border-white/10 rounded-xl p-3 flex flex-col items-center justify-between text-center gap-1.5 transition-all duration-200 shadow-sm"
            >
              <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                {formatDay(day.date)}
              </span>
              
              <div className="flex flex-col items-center my-1">
                {hasRain ? (
                  <svg className="w-5.5 h-5.5 text-sky-400 my-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                ) : (
                  <svg className="w-5.5 h-5.5 text-sunset-gold my-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
                  </svg>
                )}
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-outfit font-extrabold text-slate-100 text-sm">{day.maxTemp}°</span>
                  <span className="text-slate-500 text-[10px] font-mono">/ {day.minTemp}°C</span>
                </div>
              </div>

              <div className={`w-full py-1 px-2 rounded-md font-mono text-[8.5px] font-bold uppercase tracking-wider text-center ${
                hasRain 
                  ? "bg-sky-500/10 text-sky-400 border border-sky-500/15" 
                  : "bg-white/5 text-slate-500 border border-white/5"
              }`}>
                {hasRain ? `${day.rain} mm Rain` : "No Rain"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RecommendationBlock: React.FC<{ items: string[] }> = ({ items }) => {
  return (
    <div className="my-3.5 bg-black/20 border border-white/5 rounded-xl p-3.5 flex flex-col gap-2.5">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2.5">
          <div className="w-4.5 h-4.5 rounded bg-sunset-orange/10 border border-sunset-orange/15 flex items-center justify-center text-sunset-orange shrink-0 mt-0.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-xs text-slate-300 leading-relaxed font-sans pt-0.5">
            {renderTextWithBold(item)}
          </span>
        </div>
      ))}
    </div>
  );
};

function parseMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    if (line === "") {
      i++;
      continue;
    }

    // 1. Detect Weather block header
    if (line.toLowerCase().startsWith("weather ") && line.endsWith(":")) {
      elements.push(
        <div key={`weather-hdr-${i}`} className="flex items-center gap-2 mb-2 mt-3 font-mono text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
          <span>{line.slice(0, -1)}</span>
        </div>
      );
      i++;
      continue;
    }

    // 2. Detect Weather forecast lines
    // Matches: "2026-07-04: 27.4-39.5°C, 0 mm rain" (supports hyphens, en-dashes, and em-dashes)
    const weatherRegex = /^(\d{4}-\d{2}-\d{2}):\s*([\d.]+)[-–—\s~]+([\d.]+)°C,\s*([\d.]+)\s*mm\s*rain/i;
    if (weatherRegex.test(line)) {
      const weatherDays: WeatherDay[] = [];
      while (i < lines.length && weatherRegex.test(lines[i].trim())) {
        const m = lines[i].trim().match(weatherRegex);
        if (m) {
          weatherDays.push({
            date: m[1],
            minTemp: m[2],
            maxTemp: m[3],
            rain: m[4]
          });
        }
        i++;
      }
      elements.push(<WeatherForecast key={`weather-${i}`} days={weatherDays} />);
      continue;
    }

    // 3. Detect Bullet lists
    if (line.startsWith("* ") || line.startsWith("- ")) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith("* ") || lines[i].trim().startsWith("- "))) {
        const content = lines[i].trim().substring(2);
        listItems.push(content);
        i++;
      }
      elements.push(<RecommendationBlock key={`rec-${i}`} items={listItems} />);
      continue;
    }

    // 4. Detect headings
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-[10px] font-bold text-slate-200 mt-4 mb-1.5 font-mono uppercase tracking-wider">
          {renderTextWithBold(line.substring(4))}
        </h3>
      );
      i++;
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-xs font-bold text-sunset-orange/95 mt-5 mb-2.5 font-mono uppercase tracking-widest border-b border-white/5 pb-1 w-full">
          {renderTextWithBold(line.substring(3))}
        </h2>
      );
      i++;
    } else {
      // 5. General paragraph
      elements.push(
        <p key={`p-${i}`} className="my-2 text-xs text-slate-300 leading-relaxed font-sans">
          {renderTextWithBold(line)}
        </p>
      );
      i++;
    }
  }

  return <div className="flex flex-col gap-0.5">{elements}</div>;
}

export const ResultCard: React.FC<ResultCardProps> = ({ answer, escalated }) => {
  if (escalated) {
    return (
      <div className="glass-panel border-sunset-orange/15 bg-sunset-orange/5 rounded-xl p-5 animate-in fade-in select-none">
        <div className="flex items-center gap-2 mb-3.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sunset-orange"></span>
          <h2 className="font-mono text-[10px] text-sunset-orange uppercase tracking-wider font-bold">
            Human Expert Review Required
          </h2>
        </div>
        
        <div className="mb-4">
          {parseMarkdown(answer)}
        </div>

        <div className="border-t border-sunset-orange/10 pt-3">
          <p className="font-mono text-[9px] text-sunset-orange/60 uppercase tracking-wider leading-normal">
            NOTICE: Please contact your local Agriculture Extension Office for a field visit before taking action.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel border-white/5 bg-slate-950/40 rounded-xl p-5 animate-in fade-in select-none">
      <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-accent"></span>
        <h2 className="font-mono text-[10px] text-emerald-accent uppercase tracking-wider font-bold">
          System Automated Response
        </h2>
      </div>

      <div>
        {parseMarkdown(answer)}
      </div>
    </div>
  );
};
