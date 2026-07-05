import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface UseSpeechRecognitionResult {
  supported: boolean;
  listening: boolean;
  error: string | null;
  startListening: (baseText?: string) => void;
  stopListening: () => void;
}

/** Browser speech-to-text via Web Speech API (Chrome/Edge/Safari). */
export function useSpeechRecognition(
  /** Called with the full transcript for this mic session (replaces session text, not append). */
  onSessionTranscript: (sessionText: string, baseText: string) => void,
): UseSpeechRecognitionResult {
  const [supported] = useState(() => getSpeechRecognition() !== null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const baseTextRef = useRef("");

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const startListening = useCallback(
    (baseText = "") => {
      const Ctor = getSpeechRecognition();
      if (!Ctor) {
        setError("Speech input is not supported in this browser. Try Chrome or Edge.");
        return;
      }

      baseTextRef.current = baseText;
      setError(null);
      recognitionRef.current?.abort();

      const recognition = new Ctor();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setListening(true);

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        // Rebuild the entire session from all results — never append per event
        // (interim + final for the same phrase was causing duplicate words).
        let sessionText = "";
        for (let i = 0; i < event.results.length; i++) {
          sessionText += event.results[i][0].transcript;
        }
        onSessionTranscript(sessionText.trim(), baseTextRef.current);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "aborted" || event.error === "no-speech") {
          setListening(false);
          return;
        }
        const messages: Record<string, string> = {
          "not-allowed": "Microphone permission denied. Allow mic access in browser settings.",
          network: "Speech recognition needs an internet connection.",
          "service-not-allowed": "Speech recognition is blocked on this page.",
        };
        setError(messages[event.error] ?? `Speech error: ${event.error}`);
        setListening(false);
      };

      recognition.onend = () => setListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    },
    [onSessionTranscript],
  );

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return { supported, listening, error, startListening, stopListening };
}
