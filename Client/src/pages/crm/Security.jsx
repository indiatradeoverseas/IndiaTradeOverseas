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
      LOW: 'bg-sky-950/20 text-sky-400 border border-sky-500/20',
      MEDIUM: 'bg-amber-950/20 text-amber-400 border border-amber-500/20',
      HIGH: 'bg-orange-950/20 text-orange-400 border border-orange-500/20',
      CRITICAL: 'bg-rose-950/20 text-rose-400 border border-rose-500/20'
    };
    return colors[severity] || 'bg-[#121D29] text-[#6D7886] border border-[#C5CBD3]/10';
  };

  const getStatusColor = (status) => {
    const colors = {
      OPEN: 'bg-rose-950/20 text-rose-400 border border-rose-500/20',
      ACKNOWLEDGED: 'bg-amber-950/20 text-amber-400 border border-amber-500/20',
      RESOLVED: 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/20'
    };
    return colors[status] || 'bg-[#121D29] text-[#6D7886] border border-[#C5CBD3]/10';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F2F4F7]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F2F4F7]">Security Center</h1>
        <p className="text-[#6D7886] mt-1">Monitor security alerts and audit logs</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#121D29]/30 rounded-xl border border-[#C5CBD3]/15 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#6D7886]">Open Alerts</p>
              <p className="text-2xl font-bold text-rose-400">{alerts.filter(a => a.status === 'OPEN').length}</p>
            </div>
            <FiAlertTriangle className="text-rose-400" size={32} />
          </div>
        </div>
        <div className="bg-[#121D29]/30 rounded-xl border border-[#C5CBD3]/15 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#6D7886]">Resolved Alerts</p>
              <p className="text-2xl font-bold text-emerald-400">{alerts.filter(a => a.status === 'RESOLVED').length}</p>
            </div>
            <FiCheckCircle className="text-emerald-400" size={32} />
          </div>
        </div>
        <div className="bg-[#121D29]/30 rounded-xl border border-[#C5CBD3]/15 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#6D7886]">Total Logs</p>
              <p className="text-2xl font-bold text-[#F2F4F7]">{logs.length}</p>
            </div>
            <FiEye className="text-sky-400" size={32} />
          </div>
        </div>
        <div className="bg-[#121D29]/30 rounded-xl border border-[#C5CBD3]/15 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#6D7886]">Critical Alerts</p>
              <p className="text-2xl font-bold text-amber-400">{alerts.filter(a => a.severity === 'CRITICAL' && a.status === 'OPEN').length}</p>
            </div>
            <FiShield className="text-amber-400" size={32} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#C5CBD3]/10">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'alerts'
                ? 'border-[#F2F4F7] text-[#F2F4F7]'
                : 'border-transparent text-[#6D7886] hover:text-[#C5CBD3] hover:border-[#C5CBD3]/30'
              }`}
          >
            Security Alerts
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'logs'
                ? 'border-[#F2F4F7] text-[#F2F4F7]'
                : 'border-transparent text-[#6D7886] hover:text-[#C5CBD3] hover:border-[#C5CBD3]/30'
              }`}
          >
            Audit Logs
          </button>
        </nav>
      </div>

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="bg-[#121D29]/10 rounded-xl border border-[#C5CBD3]/15 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#040A12] border-b border-[#C5CBD3]/15">
                <th className="text-left py-3 px-4 text-xs font-bold text-[#6D7886] uppercase tracking-wider">Type</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#6D7886] uppercase tracking-wider">Severity</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#6D7886] uppercase tracking-wider">Message</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#6D7886] uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#6D7886] uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C5CBD3]/10">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-[#6D7886]">No alerts found</td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert._id} className="hover:bg-[#121D29]/40 transition-colors">
                    <td className="py-3 px-4 text-sm text-[#C5CBD3]">{alert.alertType}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-[#C5CBD3]">{alert.message}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(alert.status)}`}>
                        {alert.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1">
                        <FiClock size={14} className="text-[#6D7886]" />
                        <span className="text-sm text-[#6D7886]">{new Date(alert.createdAt).toLocaleString()}</span>
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
        <div className="bg-[#121D29]/10 rounded-xl border border-[#C5CBD3]/15 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#040A12] border-b border-[#C5CBD3]/15">
                <th className="text-left py-3 px-4 text-xs font-bold text-[#6D7886] uppercase tracking-wider">Action</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#6D7886] uppercase tracking-wider">Entity</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#6D7886] uppercase tracking-wider">Severity</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#6D7886] uppercase tracking-wider">User ID</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#6D7886] uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C5CBD3]/10">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-[#6D7886]">No logs found</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-[#121D29]/40 transition-colors">
                    <td className="py-3 px-4 text-sm text-[#C5CBD3]">{log.actionType}</td>
                    <td className="py-3 px-4 text-sm text-[#C5CBD3]">{log.entityType}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(log.severity)}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-[#C5CBD3]">{log.actorId}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1">
                        <FiClock size={14} className="text-[#6D7886]" />
                        <span className="text-sm text-[#6D7886]">{new Date(log.createdAt).toLocaleString()}</span>
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
