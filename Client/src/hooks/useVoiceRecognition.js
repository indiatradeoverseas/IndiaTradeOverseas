import { useCallback, useEffect, useRef, useState } from 'react';

const RESTART_DELAY_MS = 250;
const FATAL_ERRORS = new Set(['not-allowed', 'service-not-allowed', 'audio-capture']);

function getSpeechRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function useVoiceRecognition({ onFinalTranscript } = {}) {
  const SpeechRecognitionCtor = getSpeechRecognitionCtor();
  const [status, setStatus] = useState(SpeechRecognitionCtor ? 'off' : 'unsupported');
  const [lastTranscript, setLastTranscript] = useState('');

  const recognitionRef = useRef(null);
  // Source of truth for what SHOULD be happening, independent of what the
  // (often flaky) browser engine actually reports via onend/onerror.
  const desiredStateRef = useRef('off');
  const restartTimeoutRef = useRef(null);
  const onFinalTranscriptRef = useRef(onFinalTranscript);

  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  const clearRestartTimeout = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, []);

  const ensureEngine = useCallback(() => {
    if (!SpeechRecognitionCtor || recognitionRef.current) return recognitionRef.current;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      if (result && result.isFinal) {
        const transcript = result[0].transcript;
        setLastTranscript(transcript);
        if (onFinalTranscriptRef.current) onFinalTranscriptRef.current(transcript);
      }
    };

    recognition.onerror = (event) => {
      if (FATAL_ERRORS.has(event.error)) {
        desiredStateRef.current = 'off';
        clearRestartTimeout();
        setStatus('blocked');
      }
      // Transient errors (no-speech, network, aborted) are left to onend's
      // restart logic below — that's the actual fix for the silence-timeout
      // problem, not anything done here.
    };

    recognition.onend = () => {
      if (desiredStateRef.current === 'off') return;
      clearRestartTimeout();
      restartTimeoutRef.current = setTimeout(() => {
        try {
          recognitionRef.current && recognitionRef.current.start();
        } catch {
          // InvalidStateError from a start/stop race - next onend retries.
        }
      }, RESTART_DELAY_MS);
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [SpeechRecognitionCtor, clearRestartTimeout]);

  const start = useCallback(() => {
    if (!SpeechRecognitionCtor) return;
    desiredStateRef.current = 'listening';
    setStatus('listening');
    const recognition = ensureEngine();
    try {
      recognition.start();
    } catch {
      // Already started - ignore, the existing session continues.
    }
  }, [SpeechRecognitionCtor, ensureEngine]);

  const stop = useCallback(() => {
    desiredStateRef.current = 'off';
    clearRestartTimeout();
    setStatus('off');
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [clearRestartTimeout]);

  const setMuted = useCallback((muted) => {
    if (desiredStateRef.current === 'off') return;
    desiredStateRef.current = muted ? 'muted' : 'listening';
    setStatus(muted ? 'muted' : 'listening');
  }, []);

  useEffect(() => clearRestartTimeout, [clearRestartTimeout]);

  return { status, lastTranscript, start, stop, setMuted };
}
