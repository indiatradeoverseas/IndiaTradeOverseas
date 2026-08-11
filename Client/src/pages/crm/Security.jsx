import React, { useState, useEffect } from 'react';
import { FiShield, FiAlertTriangle, FiCheckCircle, FiEye, FiClock } from 'react-icons/fi';
import api from '../../api/axiosInstance';

export default function Security() {
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('alerts');

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      const [alertsRes, logsRes] = await Promise.all([
        api.get('/security/alerts'),
        api.get('/security/logs')
      ]);
      if (alertsRes.data.success) setAlerts(alertsRes.data.data.alerts);
      if (logsRes.data.success) setLogs(logsRes.data.data.logs);
    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      LOW: 'bg-[var(--crm-info-bg)] text-[var(--crm-info)] border border-[var(--crm-info)]/20',
      MEDIUM: 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border border-[var(--crm-warning)]/20',
      HIGH: 'bg-orange-950/20 text-orange-400 border border-orange-500/20',
      CRITICAL: 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border border-[var(--crm-danger)]/20'
    };
    return colors[severity] || 'bg-[var(--crm-bg-raised)] text-[var(--crm-ink-faint)] border border-[var(--crm-ink-soft)]/10';
  };

  const getStatusColor = (status) => {
    const colors = {
      OPEN: 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border border-[var(--crm-danger)]/20',
      ACKNOWLEDGED: 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border border-[var(--crm-warning)]/20',
      RESOLVED: 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border border-[var(--crm-positive)]/20'
    };
    return colors[status] || 'bg-[var(--crm-bg-raised)] text-[var(--crm-ink-faint)] border border-[var(--crm-ink-soft)]/10';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--crm-heading)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--crm-heading)]">Security Center</h1>
        <p className="text-[var(--crm-ink-faint)] mt-1">Monitor security alerts and audit logs</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[var(--crm-bg-raised)]/30 rounded-xl border border-[var(--crm-ink-soft)]/15 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--crm-ink-faint)]">Open Alerts</p>
              <p className="text-2xl font-bold text-[var(--crm-danger)]">{alerts.filter(a => a.status === 'OPEN').length}</p>
            </div>
            <FiAlertTriangle className="text-[var(--crm-danger)]" size={32} />
          </div>
        </div>
        <div className="bg-[var(--crm-bg-raised)]/30 rounded-xl border border-[var(--crm-ink-soft)]/15 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--crm-ink-faint)]">Resolved Alerts</p>
              <p className="text-2xl font-bold text-[var(--crm-positive)]">{alerts.filter(a => a.status === 'RESOLVED').length}</p>
            </div>
            <FiCheckCircle className="text-[var(--crm-positive)]" size={32} />
          </div>
        </div>
        <div className="bg-[var(--crm-bg-raised)]/30 rounded-xl border border-[var(--crm-ink-soft)]/15 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--crm-ink-faint)]">Total Logs</p>
              <p className="text-2xl font-bold text-[var(--crm-heading)]">{logs.length}</p>
            </div>
            <FiEye className="text-[var(--crm-info)]" size={32} />
          </div>
        </div>
        <div className="bg-[var(--crm-bg-raised)]/30 rounded-xl border border-[var(--crm-ink-soft)]/15 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--crm-ink-faint)]">Critical Alerts</p>
              <p className="text-2xl font-bold text-[var(--crm-warning)]">{alerts.filter(a => a.severity === 'CRITICAL' && a.status === 'OPEN').length}</p>
            </div>
            <FiShield className="text-[var(--crm-warning)]" size={32} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--crm-ink-soft)]/10">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'alerts'
                ? 'border-[var(--crm-heading)] text-[var(--crm-heading)]'
                : 'border-transparent text-[var(--crm-ink-faint)] hover:text-[var(--crm-ink-soft)] hover:border-[var(--crm-ink-soft)]/30'
              }`}
          >
            Security Alerts
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'logs'
                ? 'border-[var(--crm-heading)] text-[var(--crm-heading)]'
                : 'border-transparent text-[var(--crm-ink-faint)] hover:text-[var(--crm-ink-soft)] hover:border-[var(--crm-ink-soft)]/30'
              }`}
          >
            Audit Logs
          </button>
        </nav>
      </div>

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="bg-[var(--crm-bg-raised)]/10 rounded-xl border border-[var(--crm-ink-soft)]/15 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--crm-bg-sunken)] border-b border-[var(--crm-ink-soft)]/15">
                <th className="text-left py-3 px-4 text-xs font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider">Type</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider">Severity</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider">Message</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--crm-ink-soft)]/10">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-[var(--crm-ink-faint)]">No alerts found</td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert._id} className="hover:bg-[var(--crm-bg-raised)]/40 transition-colors">
                    <td className="py-3 px-4 text-sm text-[var(--crm-ink-soft)]">{alert.alertType}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--crm-ink-soft)]">{alert.message}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(alert.status)}`}>
                        {alert.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1">
                        <FiClock size={14} className="text-[var(--crm-ink-faint)]" />
                        <span className="text-sm text-[var(--crm-ink-faint)]">{new Date(alert.createdAt).toLocaleString()}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}


      {activeTab === 'logs' && (
        <div className="bg-[var(--crm-bg-raised)]/10 rounded-xl border border-[var(--crm-ink-soft)]/15 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--crm-bg-sunken)] border-b border-[var(--crm-ink-soft)]/15">
                <th className="text-left py-3 px-4 text-xs font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider">Action</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider">Entity</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider">Severity</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider">User ID</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--crm-ink-soft)]/10">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-[var(--crm-ink-faint)]">No logs found</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-[var(--crm-bg-raised)]/40 transition-colors">
                    <td className="py-3 px-4 text-sm text-[var(--crm-ink-soft)]">{log.actionType}</td>
                    <td className="py-3 px-4 text-sm text-[var(--crm-ink-soft)]">{log.entityType}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(log.severity)}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--crm-ink-soft)]">{log.actorId}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1">
                        <FiClock size={14} className="text-[var(--crm-ink-faint)]" />
                        <span className="text-sm text-[var(--crm-ink-faint)]">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
