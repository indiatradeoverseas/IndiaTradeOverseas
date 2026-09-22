import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMic, FiSend, FiX, FiVolume2, FiCpu, FiShield, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { aiApi } from '../../api/aiApi';
import { useAuth } from '../../hooks/useAuth';
import { socketService } from '../../services/socket';

export default function AiAssistantWidget() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatLog, setChatLog] = useState([]);
  const [roleGreeting, setRoleGreeting] = useState('');

  const recognitionRef = useRef(null);

  // Initialize Speech Recognition & Fetch Dynamic Role Greeting
  useEffect(() => {
    // 1. Fetch Dynamic Welcome Greeting
    const fetchGreeting = async () => {
      try {
        const res = await aiApi.getRoleGreeting();
        if (res?.success && res.data?.greeting) {
          setRoleGreeting(res.data.greeting);
          setChatLog([{
            id: 'init-greeting',
            sender: 'AI',
            text: res.data.greeting,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        }
      } catch (err) {
        const defaultGreeting = `Welcome ${user?.fullName || user?.name || 'Executive'}! How can I assist your CRM workflow today?`;
        setRoleGreeting(defaultGreeting);
        setChatLog([{ id: 'init-greeting', sender: 'AI', text: defaultGreeting, time: '12:00 PM' }]);
      }
    };

    fetchGreeting();

    // 2. Setup Web Speech Recognition API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setCommandInput(transcript);
          handleExecuteCommand(transcript);
        }
      };

      recognition.onerror = (err) => {
        console.warn('[STT SpeechRecognition Error]:', err.error);
        setIsListening(false);
        toast.error('Voice input error. You can type command directly.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    // 3. Socket.IO Real-Time Listener for Remote Commands
    const handleIncomingSocketAiAction = (actionData) => {
      if (actionData) {
        executeUiAction(actionData);
      }
    };

    const socket = socketService.getSocket();
    if (socket) {
      socket.on('ai_command_action', handleIncomingSocketAiAction);
    }

    return () => {
      if (socket) socket.off('ai_command_action', handleIncomingSocketAiAction);
    };
  }, [user]);

  // Text-To-Speech Output Helper
  const speakText = (text) => {
    if ('speechSynthesis' in window && text) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('[TTS Error]:', err);
      }
    }
  };

  // Toggle Voice Input Recording
  const handleToggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast.error('Browser Speech Recognition not supported in this browser. Use text input.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        setCommandInput('');
        recognitionRef.current.start();
        setIsListening(true);
        toast('🎙️ Listening... Speak your command now!', { icon: '🎙️' });
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Execute Command Intent Handling
  const handleExecuteCommand = async (cmdTextOverride) => {
    const targetCmd = (typeof cmdTextOverride === 'string' ? cmdTextOverride : commandInput).trim();
    if (!targetCmd) return;

    // Add User Message to UI
    const userMsgObj = {
      id: Date.now(),
      sender: 'USER',
      text: targetCmd,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatLog(prev => [...prev, userMsgObj]);
    setCommandInput('');
    setIsProcessing(true);

    try {
      // Send to Backend API for Nvidia Intent Parsing & RBAC Validation
      const res = await aiApi.sendVoiceOrTextCommand(targetCmd);
      if (res && res.success) {
        const actionData = res.data || res;
        
        // Add AI Spoken Response to Chat
        const aiMsgObj = {
          id: Date.now() + 1,
          sender: 'AI',
          text: actionData.spokenResponse || actionData.message || 'Processing your request.',
          allowed: actionData.allowed,
          action: actionData.action,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatLog(prev => [...prev, aiMsgObj]);

        // Speak Back Response
        if (actionData.spokenResponse) {
          speakText(actionData.spokenResponse);
        }

        // Execute Frontend UI Action
        executeUiAction(actionData);
      } else {
        toast.error(res?.message || 'Could not parse command.');
      }
    } catch (err) {
      console.error('[AI Command Error]:', err);
      toast.error('Failed to process command.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute UI Action Based on Intent & Guardrails
  const executeUiAction = (actionData) => {
    const { action, target, targetRoute, allowed, message, spokenResponse } = actionData;

    // 1. RBAC PERMISSION DENIED
    if (allowed === false || action === 'PERMISSION_DENIED') {
      toast.error(`⛔ ${message || spokenResponse || 'Permission Denied for your role.'}`, { duration: 5000 });
      return;
    }

    // 2. HUMAN-IN-THE-LOOP GUARDRAIL (DPR Part 16.2 / P4)
    if (action === 'NAVIGATE_WITH_NOTICE' || actionData.requiresHumanConfirmation) {
      if (targetRoute) navigate(targetRoute);
      toast((t) => (
        <div className="space-y-1 font-sans text-xs">
          <strong className="text-amber-400 font-bold block flex items-center gap-1">
            <FiShield size={14} /> DPR Part 16 Safety Guardrail
          </strong>
          <p className="text-slate-200">
            {spokenResponse || "Sir/Ma'am, AI cannot auto-approve financial or leave actions. Page opened for manual review."}
          </p>
        </div>
      ), { duration: 6000, icon: '⚠️' });
      return;
    }

    // 3. OPEN DASHBOARD INTENT
    if (action === 'OPEN_DASHBOARD') {
      const tgt = (target || '').toUpperCase();
      if (tgt === 'HR') navigate('/crm/hr');
      else if (tgt === 'TRANSPORT') navigate('/crm/transport');
      else if (tgt === 'SALES') navigate('/crm/sales');
      else if (tgt === 'FOUNDER') navigate('/crm/dashboard');
      else navigate('/crm/dashboard');
      toast.success(`🚀 Navigated to ${target || 'Dashboard'}`);
      return;
    }

    // 4. GENERAL NAVIGATION INTENT
    if (action === 'NAVIGATE' && targetRoute) {
      navigate(targetRoute);
      toast.success(`Navigated to ${target || targetRoute}`);
      return;
    }

    // 5. SCROLL ACTIONS
    if (action === 'SCROLL_DOWN') {
      window.scrollBy({ top: 600, behavior: 'smooth' });
      document.documentElement.scrollBy({ top: 600, behavior: 'smooth' });
      document.body.scrollBy({ top: 600, behavior: 'smooth' });

      // Scroll all active scroll containers on page
      const scrollables = document.querySelectorAll('main, #root, div.overflow-y-auto, div.overflow-auto, body');
      scrollables.forEach(el => {
        if (el && el.scrollHeight > el.clientHeight) {
          el.scrollBy({ top: 600, behavior: 'smooth' });
        }
      });

      toast.success('👇 Scrolled Down', { icon: '⬇️' });
      return;
    }

    if (action === 'SCROLL_UP') {
      window.scrollBy({ top: -600, behavior: 'smooth' });
      document.documentElement.scrollBy({ top: -600, behavior: 'smooth' });
      document.body.scrollBy({ top: -600, behavior: 'smooth' });

      const scrollables = document.querySelectorAll('main, #root, div.overflow-y-auto, div.overflow-auto, body');
      scrollables.forEach(el => {
        if (el && el.scrollHeight > el.clientHeight) {
          el.scrollBy({ top: -600, behavior: 'smooth' });
        }
      });

      toast.success('👆 Scrolled Up', { icon: '⬆️' });
      return;
    }

    // 6. LOGOUT INTENT
    if (action === 'LOGOUT') {
      toast.success('Logging out...');
      setTimeout(() => {
        if (logout) logout();
        else navigate('/login');
      }, 1200);
      return;
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9999] font-sans antialiased text-xs">
      
      {/* FLOATING ACTION TRIGGER BUTTON */}
      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="relative p-3.5 bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 text-white rounded-full shadow-2xl border border-teal-400/40 cursor-pointer flex items-center gap-2 group"
          title="Open ITO AI Command Assistant"
        >
          <div className="relative">
            <FiCpu size={20} className="animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
          <span className="font-bold uppercase tracking-wider text-[10px] hidden sm:inline-block pr-1">
            NVIDIA AI Assistant
          </span>
        </motion.button>
      )}

      {/* EXPANDABLE AI COMMAND PANEL */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-[92vw] sm:w-[380px] h-[480px] bg-[#0c0f14]/95 border border-teal-500/40 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col overflow-hidden text-slate-200"
          >
            {/* Header */}
            <div className="p-3.5 bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 border-b border-teal-900/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-teal-900/80 border border-teal-700/60 rounded-lg text-teal-300">
                  <FiCpu size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-teal-200 flex items-center gap-1.5">
                    ITO AI Command Hub
                  </h3>
                  <span className="text-[9px] text-teal-400/80 font-mono block">
                    User Role: <strong className="text-white">{user?.role || 'Staff'}</strong>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <FiX size={16} />
              </button>
            </div>

            {/* CHAT MESSAGES THREAD */}
            <div className="p-3 space-y-2.5 flex-1 overflow-y-auto custom-scrollbar text-xs">
              {chatLog.map((item) => {
                const isAi = item.sender === 'AI';
                return (
                  <div
                    key={item.id}
                    className={`flex flex-col max-w-[88%] ${isAi ? 'self-start items-start' : 'self-end items-end ml-auto'}`}
                  >
                    <div
                      className={`p-3 rounded-xl text-xs leading-relaxed space-y-1 ${
                        isAi
                          ? 'bg-slate-900/90 border border-teal-800/60 text-slate-200 rounded-tl-xs shadow-md'
                          : 'bg-teal-700 text-white rounded-tr-xs shadow-md'
                      }`}
                    >
                      <span className={`text-[9px] font-bold block uppercase tracking-wider ${isAi ? 'text-teal-400' : 'text-teal-100'}`}>
                        {isAi ? 'NVIDIA AI Voice Assistant' : 'You'}
                      </span>
                      <p className="whitespace-pre-wrap">{item.text}</p>
                    </div>
                    <span className="text-[8px] text-slate-500 mt-0.5 font-mono">{item.time}</span>
                  </div>
                );
              })}

              {isProcessing && (
                <div className="p-2.5 bg-slate-900/80 border border-teal-800/40 rounded-xl text-teal-300 text-xs flex items-center gap-2 animate-pulse w-max">
                  <FiCpu className="animate-spin" size={14} />
                  <span>NVIDIA NIM API Intent Parsing...</span>
                </div>
              )}
            </div>

            {/* ACTIVE VOICE RECORDING WAVE INDICATOR */}
            {isListening && (
              <div className="px-3 py-1.5 bg-rose-950/80 border-t border-rose-800/60 text-rose-300 text-[10px] font-bold flex items-center justify-between animate-pulse">
                <span className="flex items-center gap-1.5">
                  <FiMic size={13} className="text-rose-400 animate-ping" /> Listening to your voice... Speak command!
                </span>
                <span className="text-[9px] bg-rose-900 px-1.5 py-0.5 rounded uppercase">LIVE STT</span>
              </div>
            )}

            {/* INPUT FOOTER */}
            <div className="p-3 border-t border-teal-900/60 bg-slate-950 flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleToggleVoiceInput}
                className={`p-2.5 rounded-xl border transition cursor-pointer shrink-0 ${
                  isListening
                    ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                    : 'bg-slate-900 border-teal-800 text-teal-400 hover:bg-slate-800'
                }`}
                title="Click to speak voice command"
              >
                <FiMic size={16} />
              </button>

              <input
                type="text"
                placeholder='e.g. "Open HR dashboard", "Scroll down"...'
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleExecuteCommand();
                  }
                }}
                className="w-full py-2 px-3 bg-slate-900 border border-teal-800/60 rounded-xl text-slate-100 text-xs outline-none focus:border-teal-500 transition font-sans"
              />

              <button
                type="button"
                onClick={() => handleExecuteCommand()}
                disabled={!commandInput.trim() || isProcessing}
                className="p-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl shadow transition cursor-pointer shrink-0"
              >
                <FiSend size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
