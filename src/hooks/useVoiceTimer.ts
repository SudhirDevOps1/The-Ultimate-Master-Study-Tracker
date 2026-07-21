import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";

export function useVoiceTimer() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(false);

  const pauseSession = useAppStore((s) => s.pauseSession);
  const resumeSession = useAppStore((s) => s.resumeSession);
  const stopSession = useAppStore((s) => s.stopSession);

  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      setSupported(true);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (!supported) return;

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const text = event.results[current][0].transcript.toLowerCase().trim();
        setTranscript(text);

        if (text.includes("pause") || text.includes("stop timer")) {
          void pauseSession();
        } else if (text.includes("resume") || text.includes("start timer")) {
          void resumeSession();
        } else if (text.includes("finish") || text.includes("complete session")) {
          void stopSession();
        }
      };

      recognition.start();
    } catch (err) {
      console.error("Voice timer error:", err);
      setIsListening(false);
    }
  }, [isListening, supported, pauseSession, resumeSession, stopSession]);

  return { isListening, transcript, supported, toggleListening };
}
