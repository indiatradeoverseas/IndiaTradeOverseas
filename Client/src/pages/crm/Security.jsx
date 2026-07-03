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
      LOW: 'bg-blue-100 text-blue-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      OPEN: 'bg-red-100 text-red-800',
      ACKNOWLEDGED: 'bg-yellow-100 text-yellow-800',
      RESOLVED: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security Center</h1>
        <p className="text-gray-600 mt-1">Monitor security alerts and audit logs</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Open Alerts</p>
              <p className="text-2xl font-bold text-red-600">{alerts.filter(a => a.status === 'OPEN').length}</p>
            </div>
            <FiAlertTriangle className="text-red-500" size={32} />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Resolved Alerts</p>
              <p className="text-2xl font-bold text-green-600">{alerts.filter(a => a.status === 'RESOLVED').length}</p>
            </div>
            <FiCheckCircle className="text-green-500" size={32} />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Logs</p>
              <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
            </div>
            <FiEye className="text-blue-500" size={32} />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical Alerts</p>
              <p className="text-2xl font-bold text-orange-600">{alerts.filter(a => a.severity === 'CRITICAL' && a.status === 'OPEN').length}</p>
            </div>
            <FiShield className="text-orange-500" size={32} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'alerts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Security Alerts
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'logs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Audit Logs
          </button>
        </nav>
      </div>

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Severity</th>
                <th className="text-left py-3 px-4">Message</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Time</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">No alerts found</td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert._id} className="border-b border-gray-100">
                    <td className="py-3 px-4">{alert.alertType}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4">{alert.message}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(alert.status)}`}>
                        {alert.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1">
                        <FiClock size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">{new Date(alert.createdAt).toLocaleString()}</span>
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
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4">Action</th>
                <th className="text-left py-3 px-4">Entity</th>
                <th className="text-left py-3 px-4">Severity</th>
                <th className="text-left py-3 px-4">User ID</th>
                <th className="text-left py-3 px-4">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">No logs found</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="border-b border-gray-100">
                    <td className="py-3 px-4">{log.actionType}</td>
                    <td className="py-3 px-4">{log.entityType}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(log.severity)}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">{log.actorId}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1">
                        <FiClock size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">{new Date(log.createdAt).toLocaleString()}</span>
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