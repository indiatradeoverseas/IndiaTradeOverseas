import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  FiCpu, FiSend, FiX, FiMinimize2, FiTrash2, FiZap, 
  FiUser, FiMessageSquare, FiRefreshCw, FiHelpCircle, FiCheckCircle 
} from 'react-icons/fi';
import { aiApi } from '../../api/aiApi';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const QUICK_PROMPTS = [
  { label: '⚡ How to Check-In?', query: 'How do I check in and check out for my attendance shift?' },
  { label: '✉️ Draft Followup Email', query: 'Draft a professional follow-up email for an interested client lead.' },
  { label: '📋 Task Rules', query: 'What is the procedure for updating task status and attaching completion files?' },
  { label: '💼 Sales Pitch Tips', query: 'Give me 3 high-converting sales pitch tips for India Trade Overseas services.' }
];

export default function AiChatMessenger() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('ito_ai_chat_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading AI chat history:', e);
    }
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: `👋 Hello ${user?.fullName || 'Team Member'}! I am **NVIDIA Nemotron AI Assistant**.\nHow can I help you with your tasks, doubts, or CRM work today?`,
        timestamp: new Date().toISOString()
      }
    ];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem('ito_ai_chat_history', JSON.stringify(messages.slice(-20)));
    } catch (e) {
      console.error('Error saving chat history:', e);
    }
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (textToSend = null) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: queryText,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      // Pass only last 10 messages to backend context
      const apiPayload = newMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await aiApi.sendMessage(apiPayload, {
        name: user?.fullName,
        role: user?.role,
        department: user?.department
      });

      if (res.success && res.data?.reply) {
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: res.data.reply,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        toast.error(res.message || 'AI Response failed');
      }
    } catch (error) {
      console.error('AI Messenger Send Error:', error);
      toast.error(error.response?.data?.message || 'Failed to connect to NVIDIA AI assistant');
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '⚠️ *Sorry, I encountered a temporary connection issue. Please click retry or ask again.*',
          timestamp: new Date().toISOString(),
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    const initial = [
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Chat cleared! How can I assist you now, ${user?.fullName || 'Team Member'}?`,
        timestamp: new Date().toISOString()
      }
    ];
    setMessages(initial);
    localStorage.removeItem('ito_ai_chat_history');
    toast.success('Chat history cleared');
  };

  // Helper to format basic markdown formatting (bold, bullet points, line breaks)
  const renderFormattedContent = (content) => {
    if (!content) return null;
    const lines = content.split('\n');

    return lines.map((line, idx) => {
      // Bold replacement regex
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const renderedLine = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-semibold text-emerald-400">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      // Check if bullet point
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <li key={idx} className="ml-4 list-disc my-0.5">
            {renderedLine}
          </li>
        );
      }

      return (
        <p key={idx} className={`${line.trim() === '' ? 'h-2' : 'my-1'}`}>
          {renderedLine}
        </p>
      );
    });
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9999] font-sans">
      {/* FLOATING TRIGGER BUTTON */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="relative group flex items-center gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-4 py-3.5 rounded-full shadow-2xl border border-emerald-400/40 cursor-pointer backdrop-blur-md"
          title="Open AI Work Assistant"
        >
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <FiCpu size={22} className="text-emerald-200 animate-pulse" />
          <span className="font-medium text-xs tracking-wide hidden sm:inline text-white">AI Assistant</span>
          <span className="text-[9px] bg-emerald-950/80 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-700/50 font-mono hidden md:inline">
            NVIDIA
          </span>
        </motion.button>
      )}

      {/* EXPANDABLE CHAT MODAL */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex flex-col w-[92vw] sm:w-[400px] h-[550px] max-h-[82vh] bg-slate-950/95 text-slate-100 rounded-2xl shadow-2xl border border-emerald-500/30 overflow-hidden backdrop-blur-xl"
            style={{ boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 20px rgba(16, 185, 129, 0.15)' }}
          >
            {/* HEADER */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-slate-900 via-slate-950 to-emerald-950/80 border-b border-emerald-500/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                  <FiCpu size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-slate-100 tracking-wide">ITO AI Assistant</h3>
                    <span className="text-[8px] font-mono uppercase bg-emerald-950/90 text-emerald-300 border border-emerald-700/50 px-1.5 py-0.2 rounded">
                      Nemotron NIM
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-400/80 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Ready to solve employee doubts
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                  title="Clear Conversation"
                >
                  <FiTrash2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                  title="Minimize AI Chat"
                >
                  <FiMinimize2 size={14} />
                </button>
              </div>
            </div>

            {/* MESSAGES BODY */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-xs font-sans scrollbar-thin scrollbar-thumb-slate-800">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                        isUser
                          ? 'bg-teal-600 text-white'
                          : 'bg-emerald-950 border border-emerald-500/40 text-emerald-400'
                      }`}
                    >
                      {isUser ? <FiUser size={12} /> : <FiCpu size={12} />}
                    </div>

                    <div
                      className={`max-w-[82%] p-3 rounded-2xl leading-relaxed text-[11px] ${
                        isUser
                          ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-tr-none shadow-md'
                          : msg.isError
                          ? 'bg-rose-950/80 border border-rose-800/60 text-rose-200 rounded-tl-none'
                          : 'bg-slate-900/90 border border-slate-800/90 text-slate-200 rounded-tl-none shadow-inner'
                      }`}
                    >
                      {renderFormattedContent(msg.content)}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2 text-emerald-400/90 text-[10px] italic p-2 bg-emerald-950/30 border border-emerald-900/30 rounded-xl w-fit">
                  <FiRefreshCw size={12} className="animate-spin text-emerald-400" />
                  <span>NVIDIA Nemotron AI is thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* QUICK PROMPTS BAR */}
            <div className="px-2 py-1.5 bg-slate-950 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(qp.query)}
                  disabled={loading}
                  className="whitespace-nowrap text-[9px] bg-slate-900 hover:bg-emerald-950/80 text-slate-300 hover:text-emerald-300 border border-slate-800 hover:border-emerald-700/60 px-2.5 py-1 rounded-full transition cursor-pointer disabled:opacity-50"
                >
                  {qp.label}
                </button>
              ))}
            </div>

            {/* INPUT FIELD */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-2.5 bg-slate-900/95 border-t border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask any task doubt or query..."
                disabled={loading}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-100 text-xs px-3 py-2 rounded-xl outline-none transition disabled:opacity-50 placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white disabled:text-slate-600 rounded-xl transition cursor-pointer disabled:cursor-not-allowed shadow-md"
              >
                <FiSend size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
