import React, { useState, useEffect } from 'react';
import { FiMenu, FiX } from 'react-icons/fi';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../../hooks/useAuth';

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
    <div className="min-h-screen bg-[#f8fafc]">

      <div className="md:hidden bg-[#f8fafc] shadow-sm border-b border-[#cbd5e1] fixed top-0 left-0 right-0 z-[52]">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex items-center justify-center rounded-md p-2 text-[#0f4c75] hover:bg-[#e2e8f0] transition duration-200 focus:outline-none focus:ring-2 focus:ring-[#0f4c75]"
            aria-label="Open menu"
          >
            <FiMenu size={22} />
          </button>
          <div className="text-base font-semibold text-slate-900">India Trade Center</div>
          <div className="w-8" />
        </div>
      </div>

      <div className="flex min-h-screen">

        <div
          className={`fixed inset-y-0 left-0 z-[60] w-64 sm:w-72 transform bg-gradient-to-b from-[#0f4c75] to-[#0a3a5c] text-white transition-all duration-300 ease-in-out shadow-xl md:static md:translate-x-0 md:shadow-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <Sidebar onClose={() => isMobile && setSidebarOpen(false)} />
        </div>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm md:hidden animate-fadeIn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          />
        )}

        <div className="flex-1 flex flex-col min-h-screen">
          <div className="md:hidden h-[57px]" />

          <Navbar />
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 pt-4 md:pt-6 lg:pt-8">
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
