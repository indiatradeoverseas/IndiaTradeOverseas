import React, { useState, useEffect } from 'react';
import { FiMenu, FiX } from 'react-icons/fi';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';
// Removed the duplicate main-site Navbar import from here to protect CRM view real estate

export default function PortalLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return (
    <div
      className="crm-portal min-h-screen antialiased"
      style={{ background: 'var(--crm-bg)', color: 'var(--crm-ink-soft)', fontFamily: 'var(--crm-font-body)' }}
    >

      {/* MOBILE TOP BAR */}
      <div
        className="md:hidden backdrop-blur-md fixed top-0 left-0 right-0 z-[52] border-b"
        style={{ background: 'color-mix(in srgb, var(--crm-nav-bg) 92%, transparent)', borderColor: 'var(--crm-line)' }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex items-center justify-center rounded-sm p-2 transition duration-200 focus:outline-none"
            style={{ color: 'var(--crm-ink)' }}
            aria-label="Open menu"
          >
            <FiMenu size={22} />
          </button>
          <div
            className="text-sm font-medium uppercase tracking-wider"
            style={{ fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' }}
          >
            India Trade Center
          </div>
          <div className="w-8" />
        </div>
      </div>

      <div className="flex min-h-screen">

        {/* PORTAL SIDEBAR BRAND CONTEXT CONTAINER */}
        <div
          className={`fixed inset-y-0 left-0 z-[60] w-64 sm:w-72 transform border-r transition-all duration-300 ease-in-out shadow-2xl md:static md:translate-x-0 md:shadow-none ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ borderColor: 'var(--crm-line)' }}
        >
          <Sidebar onClose={() => isMobile && setSidebarOpen(false)} />
        </div>

        {/* Dynamic Mobile Shield Mask Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-xs md:hidden animate-fadeIn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          />
        )}

        {/* Core Main Viewport Workspace Terminal Container */}
        <div className="flex-1 flex flex-col min-h-screen" style={{ background: 'var(--crm-bg)' }}>
          {/* Buffer spacer block to balance mobile fixed top bar overlay */}
          <div className="md:hidden h-[57px]" />

          {/* Desktop utility bar */}
          <div
            className="hidden md:flex items-center justify-end px-8 py-3 border-b"
            style={{ borderColor: 'var(--crm-line)' }}
          >
            <CommandPalette />
          </div>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pt-6 md:pt-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>

      <style>
        {`@keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-in-out;
        }
        `}
      </style>
    </div>
  );
}