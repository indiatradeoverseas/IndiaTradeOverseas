import React, { useEffect, useState, useContext } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';

export default function SecurityGuard({ children }) {
  const authContext = useContext(AuthContext);
  const authUser = authContext?.user || null;
  const [user, setUser] = useState(null);
  const [isBlurred, setIsBlurred] = useState(false);

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
      return;
    }
    try {
      const storedUser = localStorage.getItem('user') || localStorage.getItem('ito_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.warn('Could not parse user session in SecurityGuard:', e);
    }
  }, [authUser]);

  const role = (user?.role || '').toUpperCase();
  const position = (user?.position || '').toLowerCase();
  const isAdmin =
    ['ADMIN', 'FOUNDER', 'SUPER_ADMIN', 'CO_FOUNDER'].includes(role) ||
    user?.department === 'ADMIN' ||
    position.includes('admin') ||
    position.includes('founder') ||
    role.includes('FOUNDER');

  const reportViolation = async (type) => {
    try {
      const { API_URL } = await import('../../config/env');
      const cleanApiUrl = (API_URL || '').replace(/\/+$/, '');
      const endpoint = cleanApiUrl.endsWith('/api')
        ? `${cleanApiUrl}/security-audit/screenshot-attempt`
        : `${cleanApiUrl}/api/security-audit/screenshot-attempt`;

      const token = localStorage.getItem('token');
      await axios.post(
        endpoint,
        { pageUrl: window.location.pathname, detectionType: type },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
    } catch (err) {
      console.warn('Failed to log screenshot attempt:', err.message);
    }
  };

  useEffect(() => {
    if (!user || isAdmin) return;

    // 1. Detect Screenshot & Print Keyboard Shortcuts
    const handleKeyDown = (e) => {
      const isPrtScn = e.key === 'PrintScreen' || e.key === 'PrtScn';
      const isSnippingTool = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's');
      const isPrint = (e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P');
      const isSave = (e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S');
      if (isPrtScn || isSnippingTool || isPrint || isSave) {
        e.preventDefault();
        e.stopPropagation();

        setIsBlurred(true);
        setTimeout(() => setIsBlurred(false), 4000);

        const detectionType = isPrtScn
          ? 'PRINTSCREEN_KEY'
          : isSnippingTool
          ? 'SNIPPING_TOOL_SHORTCUT'
          : isPrint
          ? 'PRINT_ATTEMPT'
          : 'SAVE_PAGE_ATTEMPT';

        toast.error('🚨 Action Blocked: Screenshot attempt captured & reported to Founder!', {
          id: 'screenshot-blocked-toast',
          duration: 4000
        });

        reportViolation(detectionType);
        return false;
      }
    };

    // 2. Allow Right-Click Context Menu for Inspect / Developer Console Debugging
    const handleContextMenu = () => {
      // Right-click allowed for Inspect Element / Console debugging
      return true;
    };

    // 3. Blur Screen on Focus Loss & Mobile App Switch / Screenshot Gesture
    const handleBlur = () => {
      setIsBlurred(true);
    };

    const handleFocus = () => {
      setIsBlurred(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true);
      } else {
        setIsBlurred(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, isAdmin]);

  return (
    <div className={`relative min-h-screen ${isBlurred && !isAdmin ? 'select-none filter blur-2xl transition-all duration-100' : ''}`}>
      {/* CSS Print Protection */}
      {user && !isAdmin && (
        <style font-mono="true">{`
          @media print {
            body {
              display: none !important;
              visibility: hidden !important;
            }
          }
        `}</style>
      )}

      {/* Dynamic Watermark for Non-Admin Employees */}
      {user && !isAdmin && (
        <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden opacity-[0.06] select-none flex flex-wrap justify-around items-center gap-12 p-8 text-slate-900 dark:text-slate-100 font-mono text-xs font-bold transform -rotate-12">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="whitespace-nowrap uppercase tracking-widest">
              CONFIDENTIAL · {user.fullName || user.name} ({user.employeeId || user.email}) · {new Date().toLocaleDateString()}
            </div>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}
