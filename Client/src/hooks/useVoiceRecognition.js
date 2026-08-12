import { useCallback, useEffect, useRef, useState } from 'react';

const RESTART_DELAY_MS = 250;
// Cap for the exponential backoff applied after consecutive transient errors
// (e.g. a persistent `network` failure) so a dead engine retries at a slower,
// bounded pace instead of hammering `start()` forever at a fixed 250ms.
const MAX_RESTART_DELAY_MS = 20000;
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
  // Counts consecutive transient errors (e.g. repeated `network` failures)
  // so onend can back off exponentially instead of retrying at a fixed
  // interval forever. Reset to 0 whenever the engine successfully comes up
  // (onstart) or successfully delivers a result (onresult) - either one
  // proves the engine isn't in a dead retry loop anymore.
  const consecutiveErrorsRef = useRef(0);

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
    recognition.lang = 'en-IN';

    recognition.onstart = () => {
      // The engine came up successfully - any prior run of consecutive
      // errors is over, so drop back to the fast restart path.
      consecutiveErrorsRef.current = 0;
    };

    recognition.onresult = (event) => {
      consecutiveErrorsRef.current = 0;
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
        return;
      }
      // Transient errors (no-speech, network, aborted) are left to onend's
      // restart logic below — that's the actual fix for the silence-timeout
      // problem, not anything done here. But we do count them here so a
      // *persistent* run of transient errors (e.g. offline/unreachable STT
      // endpoint repeatedly failing with `network`) backs off instead of
      // retrying at a fixed 250ms interval forever.
      consecutiveErrorsRef.current += 1;
    };

    recognition.onend = () => {
      if (desiredStateRef.current === 'off') return;
      clearRestartTimeout();
      const errorCount = consecutiveErrorsRef.current;
      // Only errors push the delay up - a plain onend with no preceding
      // error (the normal silence-timeout restart) always uses the fast
      // fixed delay.
      const delay = errorCount > 0
        ? Math.min(RESTART_DELAY_MS * 2 ** errorCount, MAX_RESTART_DELAY_MS)
        : RESTART_DELAY_MS;
      restartTimeoutRef.current = setTimeout(() => {
        try {
          recognitionRef.current && recognitionRef.current.start();
        } catch {
          // InvalidStateError from a start/stop race - next onend retries.
        }
      }, delay);
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
      // Per the Web Speech spec, stop() can still emit one last buffered
      // `result` (and then `end`) after being called. Detach the handlers
      // first so a late event can't reach a consumer (VoiceAssistantContext)
      // that has already unmounted - e.g. calling navigate() post-unmount.
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      // Discard the now-handler-less instance so a later start() (e.g. the
      // second half of React 18 StrictMode's dev-only mount->cleanup->mount
      // double-invoke, which runs start()->stop()->start() within
      // milliseconds) builds a fresh engine with freshly-attached handlers
      // via ensureEngine(), instead of reusing this permanently deaf one -
      // ensureEngine() only creates a new instance when this ref is null.
      recognitionRef.current = null;
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
