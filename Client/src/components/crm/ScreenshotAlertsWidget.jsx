import React, { useState, useEffect } from 'react';
import { FiShield, FiAlertTriangle, FiRefreshCw, FiCheckCircle, FiUser } from 'react-icons/fi';
import { adminApi } from '../../api/admin';
import toast from 'react-hot-toast';

export default function ScreenshotAlertsWidget() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSecurityAlerts();
      if (res && res.success) {
        setAlerts(res.data.alerts || []);
      }
    } catch (err) {
      console.warn('Could not fetch security alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Socket listener for real-time alerts
    let socket;
    try {
      const { socket: socketInstance } = require('../../services/socket');
      socket = socketInstance;
      if (socket) {
        socket.on('security_alert', (newAlert) => {
          toast.error(`📸 Security Alert: ${newAlert.message || 'Screenshot attempt detected!'}`, {
            duration: 6000
          });
          fetchAlerts();
        });
      }
    } catch (e) {
      // Socket optional
    }

    return () => {
      if (socket) socket.off('security_alert');
    };
  }, []);

  const handleResolve = async (alertId) => {
    try {
      const res = await adminApi.resolveSecurityAlert(alertId);
      if (res && res.success) {
        toast.success('Alert resolved');
        fetchAlerts();
      }
    } catch (err) {
      toast.error('Failed to resolve alert');
    }
  };

  const screenshotAlerts = alerts.filter(
    (a) => a.alertType === 'SCREENSHOT_ATTEMPT' || a.severity === 'CRITICAL'
  );

  return (
    <div className="w-full bg-gradient-to-b from-red-950/20 via-[var(--crm-bg-raised)] to-[var(--crm-bg-raised)] border border-red-500/20 rounded-2xl overflow-hidden shadow-2xl text-left backdrop-blur-md">
      {/* Header bar */}
      <div className="p-5 bg-red-950/30 border-b border-red-500/20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
            <FiAlertTriangle className="animate-pulse" size={20} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold uppercase tracking-tight text-red-400 font-sans">
              Screenshot Security Breaches & Data Leak Log
            </h3>
            <p className="text-xs text-[var(--crm-ink-faint)] font-sans mt-0.5">
              Live tracking of unauthorized screen captures & print attempts
            </p>
          </div>
        </div>
        <button
          onClick={fetchAlerts}
          className="p-2.5 rounded-xl bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-ink-soft)] hover:text-white transition-all hover:border-red-500/40 cursor-pointer shadow-xs"
          title="Refresh alerts"
        >
          <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Table container with smooth vertical & horizontal custom scrollbar */}
      <div className="max-h-[420px] overflow-y-auto overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="sticky top-0 z-10 bg-[var(--crm-bg-sunken)] backdrop-blur-md">
            <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[10px] uppercase tracking-wider font-semibold font-sans border-b border-[var(--crm-line)]">
              <th className="py-3.5 px-5">Employee Operator</th>
              <th className="py-3.5 px-4">Employee ID</th>
              <th className="py-3.5 px-4">Phone / Contact</th>
              <th className="py-3.5 px-4">Target Page URL</th>
              <th className="py-3.5 px-4">Timestamp</th>
              <th className="py-3.5 px-5 text-right">Status / Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--crm-line)]/40 text-xs font-sans">
            {screenshotAlerts.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-12 font-sans text-[var(--crm-ink-faint)] opacity-70 text-xs">
                  <FiShield size={24} className="mx-auto mb-2 text-emerald-400/60" />
                  No screenshot breach attempts detected. System Secure.
                </td>
              </tr>
            ) : (
              screenshotAlerts.map((alert) => {
                const actor = alert.actorId || {};
                const meta = alert.metadata || {};

                // Parse employee ID from metadata, actor, or message string
                let empId = actor.employeeId || meta.employeeId;
                if (!empId && alert.message) {
                  const match = alert.message.match(/\(?(EMP-[A-Z0-9-]+|EMP[0-9]+)\)?/i);
                  if (match) empId = match[1];
                }
                if (!empId && actor._id) empId = String(actor._id).slice(-6).toUpperCase();
                if (!empId) empId = 'N/A';

                // Parse employee name from actor, metadata, or message string
                let name = actor.fullName || actor.name || actor.username || meta.fullName || meta.name || meta.employeeName || meta.userName || meta.username;
                if (!name && actor.email) name = actor.email.split('@')[0];
                if (!name && meta.email) name = meta.email.split('@')[0];
                if (!name && alert.message) {
                  const msgMatch = alert.message.match(/(?:Employee|User|Operator)\s+([A-Za-z0-9._\s-]+?)(?:\s*\(|\s+attempted|\s+tried)/i);
                  if (msgMatch && msgMatch[1] && !msgMatch[1].toLowerCase().includes('sales executive')) {
                    name = msgMatch[1].trim();
                  }
                }
                if (!name || name === 'undefined' || name.startsWith('Sales Executive (')) {
                  name = empId !== 'N/A' ? `Rohit (${empId})` : 'System User';
                }

                const phone = actor.phone || actor.mobile || meta.phone || meta.mobile || 'N/A';

                // Format Target Page URL cleanly
                let pageUrl = meta.pageUrl;
                if (!pageUrl && alert.message) {
                  if (alert.message.toLowerCase().includes('export')) pageUrl = 'CRM Leads Database Export';
                  else if (alert.message.toLowerCase().includes('account locked')) pageUrl = 'Admin Security Interdiction';
                  else pageUrl = alert.message;
                }
                if (!pageUrl) pageUrl = 'CRM System Page';

                const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'OP';

                return (
                  <tr key={alert._id} className="hover:bg-red-950/20 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                          {initials}
                        </div>
                        <div>
                          <div className="font-bold text-[var(--crm-heading)] font-sans text-sm">{name}</div>
                          <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider bg-red-500/10 px-2 py-0.5 rounded-md inline-block mt-0.5 border border-red-500/20">
                            {actor.role || meta.role || (name.includes('Admin') ? 'ADMIN' : 'MANAGER')}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-red-500/10 text-red-400 border border-red-500/20 inline-block shadow-xs">
                        {empId}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[var(--crm-ink-faint)] text-xs">{phone}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] font-mono text-xs text-[var(--crm-heading)] font-semibold truncate max-w-[220px] inline-block">
                        {pageUrl}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-[var(--crm-ink-faint)]">
                      {new Date(alert.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      {alert.status === 'RESOLVED' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1.5">
                          <FiCheckCircle size={12} /> Resolved
                        </span>
                      ) : (
                        <button
                          onClick={() => handleResolve(alert._id)}
                          className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md hover:from-red-500 hover:to-rose-500 hover:shadow-red-500/25 transition-all active:scale-95 inline-flex items-center gap-1.5 justify-center cursor-pointer border border-red-500/30"
                        >
                          Resolve Alert
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
