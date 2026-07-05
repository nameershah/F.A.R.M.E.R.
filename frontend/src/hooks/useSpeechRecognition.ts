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
  startListening: () => void;
  stopListening: () => void;
}

/** Browser speech-to-text via Web Speech API (Chrome/Edge/Safari). */
export function useSpeechRecognition(
  onTranscript: (text: string) => void,
): UseSpeechRecognitionResult {
  const [supported] = useState(() => getSpeechRecognition() !== null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError("Speech input is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    setError(null);
    recognitionRef.current?.abort();

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (transcript.trim()) {
        onTranscript(transcript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "aborted" || event.error === "no-speech") {
        setListening(false);
        return;
      }
      const messages: Record<string, string> = {
        "not-allowed": "Microphone permission denied. Allow mic access in browser settings.",
        "network": "Speech recognition needs an internet connection.",
        "service-not-allowed": "Speech recognition is blocked on this page.",
      };
      setError(messages[event.error] ?? `Speech error: ${event.error}`);
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [onTranscript]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return { supported, listening, error, startListening, stopListening };
}
