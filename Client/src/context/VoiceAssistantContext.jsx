import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { matchCommand } from '../utils/voiceCommands';
import { getCrmCommandItems } from '../config/crmNav';

const VoiceAssistantContext = createContext(null);

export function VoiceAssistantProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // setMuted only exists once useVoiceRecognition below has been called, but
  // handleTranscript (passed INTO that same call) needs to invoke it - a ref
  // breaks the circular dependency without relying on stale closures.
  const setMutedRef = useRef(() => {});
  // useVoiceRecognition's onresult fires on EVERY final transcript
  // regardless of mute state (mute is a concept this provider owns, not the
  // hook) - so this provider, not the hook, must be the one that refuses to
  // act on a navigate command while muted. A ref (not a status dependency
  // on handleTranscript) avoids the same circularity as setMutedRef above.
  const statusRef = useRef('off');

  const handleTranscript = useCallback((transcript) => {
    const navItems = getCrmCommandItems(user);
    const command = matchCommand(transcript, navItems);
    if (!command) return;

    if (command.type === 'mute') {
      setMutedRef.current(true);
      toast('Voice assistant muted. Say "resume" to continue.');
      return;
    }

    if (command.type === 'resume') {
      setMutedRef.current(false);
      toast.success('Voice assistant listening again.');
      return;
    }

    if (command.type === 'navigate') {
      if (statusRef.current === 'muted') return;
      navigate(command.to);
      toast.success(`Voice: opening ${command.label}`);
    }
  }, [user, navigate]);

  const { status, lastTranscript, start, stop, setMuted } = useVoiceRecognition({
    onFinalTranscript: handleTranscript
  });

  useEffect(() => {
    setMutedRef.current = setMuted;
  }, [setMuted]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // This provider only exists while a CRM user is logged in (see the mount
  // point in App.jsx), so mount/unmount IS login/logout - no separate
  // logout wiring needed.
  useEffect(() => {
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = useCallback(() => {
    const nextMuted = status !== 'muted';
    setMuted(nextMuted);
    if (nextMuted) {
      toast('Voice assistant muted. Say "resume" or click again to continue.');
    } else {
      toast.success('Voice assistant listening again.');
    }
  }, [status, setMuted]);

  const value = { status, lastTranscript, retryListening: start, toggleMute };

  return (
    <VoiceAssistantContext.Provider value={value}>
      {children}
    </VoiceAssistantContext.Provider>
  );
}

export function useVoiceAssistant() {
  const context = useContext(VoiceAssistantContext);
  if (!context) {
    throw new Error('useVoiceAssistant must be used within VoiceAssistantProvider');
  }
  return context;
}
