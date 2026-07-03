import React, { useState, useEffect } from 'react';
import { FiUsers, FiShield, FiBarChart2, FiSettings, FiUserCheck, FiAlertCircle, FiFileText, FiDollarSign, FiMessageSquare, FiSend, FiSmartphone } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { adminApi } from '../../api/admin';
import { chatApi } from '../../api/chat';
import { leadsApi } from '../../api/leads';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export default function AdminPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  const [chatSessions, setChatSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [devices, setDevices] = useState([]);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [leadsList, setLeadsList] = useState([]);
  const [assignFormData, setAssignFormData] = useState({
    leadId: '',
    assignedTo: '',
    assignedDepartment: ''
  });
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchAdminData();
    }
  }, [user]);


  useEffect(() => {
    let intervalId;
    if (activeTab === 'chats') {
      fetchChatSessions();
      intervalId = setInterval(() => {
        fetchChatSessions();
        if (selectedSessionId) {
          fetchChatMessages(selectedSessionId);
        }
      }, 4000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeTab, selectedSessionId]);

  const fetchChatSessions = async () => {
    try {
      const response = await chatApi.getAdminSessions();
      if (response.success) {
        setChatSessions(response.data.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching admin chat sessions:', error);
    }
  };

  const fetchChatMessages = async (sessionId) => {
    try {
      const response = await chatApi.getMessages(sessionId);
      if (response.success) {
        setChatMessages(response.data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching admin chat messages:', error);
    }
  };

  const handleSelectSession = (sessionId) => {
    setSelectedSessionId(sessionId);
    fetchChatMessages(sessionId);
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedSessionId) return;
    const text = replyText;
    setReplyText('');

    try {
      const response = await chatApi.sendAdminReply(selectedSessionId, text);
      if (response.success) {
        fetchChatMessages(selectedSessionId);
      }
    } catch (error) {
      console.error('Error sending admin reply:', error);
      toast.error('Failed to send message');
    }
  };

  const handleResolveSession = async (sessionId) => {
    if (window.confirm('Are you sure you want to resolve this chat session?')) {
      try {
        const response = await chatApi.resolveSession(sessionId);
        if (response.success) {
          toast.success('Chat resolved');
          fetchChatSessions();
          if (selectedSessionId === sessionId) {
            setSelectedSessionId(null);
            setChatMessages([]);
          }
        }
      } catch (error) {
        console.error('Error resolving chat session:', error);
        toast.error('Failed to resolve session');
      }
    }
  };

  const handleApproveDevice = async (deviceId) => {
    try {
      const response = await adminApi.approveDevice(deviceId);
      if (response.success) {
        toast.success('Device approved successfully');
        fetchAdminData();
      }
    } catch (error) {
      console.error('Error approving device:', error);
      toast.error('Failed to approve device');
    }
  };

  const handleRevokeDevice = async (deviceId) => {
    try {
      const response = await adminApi.revokeDevice(deviceId);
      if (response.success) {
        toast.success('Device access revoked');
        fetchAdminData();
      }
    } catch (error) {
      console.error('Error revoking device:', error);
      toast.error('Failed to revoke device');
    }
  };

  const fetchAdminData = async () => {
    try {
      const [summaryRes, usersRes, alertsRes, pipelineRes, devicesRes] = await Promise.all([
        adminApi.getDashboardSummary(),
        adminApi.getUsers(),
        adminApi.getSecurityAlerts(),
        adminApi.getPipeline(),
        adminApi.getDevices()
      ]);

      if (summaryRes.success) setSummary(summaryRes.data.summary);
      if (usersRes.success) setUsers(usersRes.data.users);
      if (alertsRes.success) setAlerts(alertsRes.data.alerts);
      if (pipelineRes.success) setPipeline(pipelineRes.data.pipeline);
      if (devicesRes.success) setDevices(devicesRes.data.devices);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const deactivateUser = async (userId) => {
    if (window.confirm('Are you sure you want to deactivate this user?')) {
      try {
        const response = await adminApi.deactivateUser(userId);
        if (response.success) {
          toast.success('User deactivated successfully');
          fetchAdminData();
        }
      } catch (error) {
        console.error('Error deactivating user:', error);
        toast.error('Failed to deactivate user');
      }
    }
  };

  const activateUser = async (userId) => {
    try {
      const response = await adminApi.activateUser(userId);
      if (response.success) {
        toast.success('User activated successfully');
        fetchAdminData();
      }
    } catch (error) {
      console.error('Error activating user:', error);
      toast.error('Failed to activate user');
    }
  };

  const deleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to permanently delete this employee? This will unassign all their leads/tasks.')) {
      try {
        const response = await adminApi.deleteUser(userId);
        if (response.success) {
          toast.success('User deleted successfully');
          fetchAdminData();
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('Failed to delete user');
      }
    }
  };

  const togglePermission = async (id, type, currentValue) => {
    try {
      let response;
      if (type === 'export') {
        response = await adminApi.updateExportPermission(id, !currentValue);
      } else if (type === 'upload') {
        response = await adminApi.updateProductUploadPermission(id, !currentValue);
      } else if (type === 'lead') {
        response = await adminApi.updateLeadPermission(id, !currentValue);
      } else if (type === 'document') {
        response = await adminApi.updateDocumentPermission(id, !currentValue);
      } else if (type === 'task') {
        response = await adminApi.updateTaskPermission(id, !currentValue);
      } else if (type === 'dispatch') {
        response = await adminApi.updateDispatchPermission(id, !currentValue);
      } else if (type === 'payment') {
        response = await adminApi.updatePaymentPermission(id, !currentValue);
      } else if (type === 'quotation') {
        response = await adminApi.updateQuotationPermission(id, !currentValue);
      }
      if (response && response.success) {
        toast.success('Permissions updated successfully!');
        fetchAdminData();
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Failed to update employee permissions');
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      const response = await adminApi.resolveSecurityAlert(alertId);
      if (response.success) {
        toast.success('Alert resolved');
        fetchAdminData();
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const departments = ['STONE', 'COAL', 'TEA', 'RICE', 'TRANSPORT', 'ADMIN', 'IT', 'PROCUREMENT', 'ACCOUNTS', 'HR', 'SALES'];

  const handleOpenAssignModal = async () => {
    setShowAssignModal(true);
    try {
      const response = await leadsApi.getLeads();
      if (response.success) {
        setLeadsList(response.data.leads || []);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to load tasks list');
    }
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    if (!assignFormData.leadId) {
      toast.error('Please select a task/lead');
      return;
    }
    setIsAssigning(true);
    try {
      const response = await adminApi.assignLead(assignFormData.leadId, {
        assignedTo: assignFormData.assignedTo || null,
        assignedDepartment: assignFormData.assignedDepartment || null
      });
      if (response.success) {
        toast.success('Task assigned successfully!');
        setShowAssignModal(false);
        setAssignFormData({ leadId: '', assignedTo: '', assignedDepartment: '' });
        fetchAdminData();
      }
    } catch (error) {
      console.error('Error assigning task:', error);
      toast.error(error.response?.data?.message || 'Failed to assign task');
    } finally {
      setIsAssigning(false);
    }
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

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600 mt-1">System administration and monitoring</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleOpenAssignModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg text-sm transition-all active:scale-95 hover:shadow-indigo-500/20"
          >
            Assign Task
          </button>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
            Admin Access
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.users || 0}</p>
            </div>
            <FiUsers className="text-blue-500" size={32} />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-green-600">{summary?.activeUsers || 0}</p>
            </div>
            <FiUserCheck className="text-green-500" size={32} />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Open Alerts</p>
              <p className="text-2xl font-bold text-red-600">{summary?.openAlerts || 0}</p>
            </div>
            <FiAlertCircle className="text-red-500" size={32} />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Quotations</p>
              <p className="text-2xl font-bold text-yellow-600">{summary?.pendingQuotations || 0}</p>
            </div>
            <FiFileText className="text-yellow-500" size={32} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <FiBarChart2 className="inline mr-2" size={16} />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'users'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <FiUsers className="inline mr-2" size={16} />
            Users
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'alerts'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <FiShield className="inline mr-2" size={16} />
            Security Alerts
          </button>
          <button
            onClick={() => setActiveTab('chats')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'chats'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <FiMessageSquare className="inline mr-2" size={16} />
            Support Chats
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'devices'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <FiSmartphone className="inline mr-2" size={16} />
            Trusted Devices
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'settings'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <FiSettings className="inline mr-2" size={16} />
            Settings
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/*================== Pipeline Chart ================================= */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Pipeline Overview</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pipeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#3b82f6" name="Total Leads" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stage Distribution */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Stage Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pipeline}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ _id, total }) => `${_id}: ${total}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="total"
                  nameKey="_id"
                >
                  {pipeline.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4">Employee ID</th>
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Role</th>
                <th className="text-left py-3 px-4">Department</th>
                <th className="text-left py-3 px-4">Permissions</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((userItem) => (
                <tr key={userItem._id} className="border-b border-gray-100">
                  <td className="py-3 px-4">{userItem.employeeId}</td>
                  <td className="py-3 px-4">{userItem.fullName}</td>
                  <td className="py-3 px-4">{userItem.email}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {userItem.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">{userItem.department}</td>
                  <td className="py-3 px-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 text-xs text-gray-600 min-w-[180px]">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userItem.productUploadPermission || false}
                          onChange={() => togglePermission(userItem._id, 'upload', userItem.productUploadPermission)}
                          className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Product List</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userItem.exportPermission || false}
                          onChange={() => togglePermission(userItem._id, 'export', userItem.exportPermission)}
                          className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Export DB</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userItem.leadPermission || false}
                          onChange={() => togglePermission(userItem._id, 'lead', userItem.leadPermission)}
                          className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Leads</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userItem.documentPermission || false}
                          onChange={() => togglePermission(userItem._id, 'document', userItem.documentPermission)}
                          className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Docs</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userItem.taskPermission || false}
                          onChange={() => togglePermission(userItem._id, 'task', userItem.taskPermission)}
                          className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Tasks</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userItem.dispatchPermission || false}
                          onChange={() => togglePermission(userItem._id, 'dispatch', userItem.dispatchPermission)}
                          className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Dispatch</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userItem.paymentPermission || false}
                          onChange={() => togglePermission(userItem._id, 'payment', userItem.paymentPermission)}
                          className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Payment</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userItem.quotationPermission || false}
                          onChange={() => togglePermission(userItem._id, 'quotation', userItem.quotationPermission)}
                          className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Quotation</span>
                      </label>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${userItem.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {userItem.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 flex items-center space-x-3">
                    {userItem.isActive ? (
                      <button
                        onClick={() => deactivateUser(userItem._id)}
                        className="text-yellow-600 hover:text-yellow-700 text-sm font-medium"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => activateUser(userItem._id)}
                        className="text-green-600 hover:text-green-700 text-sm font-medium"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => deleteUser(userItem._id)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
                <th className="text-left py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert._id} className="border-b border-gray-100">
                  <td className="py-3 px-4">{alert.alertType}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                      alert.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                        alert.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                      }`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4">{alert.message}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${alert.status === 'OPEN' ? 'bg-red-100 text-red-800' :
                      alert.status === 'ACKNOWLEDGED' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                      {alert.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">{new Date(alert.createdAt).toLocaleString()}</td>
                  <td className="py-3 px-4">
                    {alert.status === 'OPEN' && (
                      <button
                        onClick={() => resolveAlert(alert._id)}
                        className="text-green-600 hover:text-green-700 text-sm"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">System Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">Maintenance Mode</p>
                  <p className="text-sm text-gray-500">Put the system in maintenance mode</p>
                </div>
                <button className="btn-secondary">Enable</button>
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">Backup Database</p>
                  <p className="text-sm text-gray-500">Create a backup of all data</p>
                </div>
                <button className="btn-primary">Backup Now</button>
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">Clear Cache</p>
                  <p className="text-sm text-gray-500">Clear application cache</p>
                </div>
                <button className="btn-secondary">Clear</button>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Export All Data</p>
                  <p className="text-sm text-gray-500">Export all system data as JSON</p>
                </div>
                <button className="btn-secondary">Export</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Devices Tab */}
      {activeTab === 'devices' && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4">User</th>
                <th className="text-left py-3 px-4">Device Name</th>
                <th className="text-left py-3 px-4">IP Address</th>
                <th className="text-left py-3 px-4">Device Hash</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">No registered devices found</td>
                </tr>
              ) : (
                devices.map((device) => (
                  <tr key={device._id} className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{device.userId?.fullName || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{device.userId?.email || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-700">{device.deviceName}</td>
                    <td className="py-3 px-4 text-sm">{device.ipAddress}</td>
                    <td className="py-3 px-4 text-xs font-mono">{device.deviceHash}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${device.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {device.isApproved ? 'Approved' : 'Pending Approval'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {device.isApproved ? (
                        <button
                          onClick={() => handleRevokeDevice(device._id)}
                          className="text-red-600 hover:text-red-700 text-sm font-semibold animate-pulse"
                        >
                          Revoke Access
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApproveDevice(device._id)}
                          className="text-green-600 hover:text-green-700 text-sm font-semibold"
                        >
                          Approve Device
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Support Chats Tab */}
      {activeTab === 'chats' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Sessions Sidebar */}
          <div className="card overflow-y-auto lg:col-span-1 p-4 space-y-3">
            <h3 className="font-bold text-slate-800 text-lg mb-3">Conversations</h3>
            {chatSessions.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No active chats found</p>
            ) : (
              chatSessions.map((session) => (
                <button
                  key={session.sessionId}
                  onClick={() => handleSelectSession(session.sessionId)}
                  className={`w-full text-left p-4 rounded-xl border transition duration-200 flex flex-col justify-between ${selectedSessionId === session.sessionId
                    ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-sm'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-bold text-sm truncate">{session.clientName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${session.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                      {session.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 truncate">
                    Session: {session.sessionId}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block self-end">
                    {new Date(session.lastMessageAt).toLocaleTimeString()}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Chat Window Panel */}
          <div className="lg:col-span-2 card p-0 overflow-hidden flex flex-col h-full bg-slate-50">
            {selectedSessionId ? (
              <>
                {/* Chat Header */}
                <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center shadow-sm">
                  <div>
                    <h3 className="font-bold text-slate-800">
                      {chatSessions.find(s => s.sessionId === selectedSessionId)?.clientName || 'Support Chat'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {chatSessions.find(s => s.sessionId === selectedSessionId)?.clientEmail || 'No email provided'}
                    </p>
                  </div>
                  {chatSessions.find(s => s.sessionId === selectedSessionId)?.status === 'OPEN' && (
                    <button
                      onClick={() => handleResolveSession(selectedSessionId)}
                      className="bg-green-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 transition"
                    >
                      Resolve Session
                    </button>
                  )}
                </div>

                {/* Message Log */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col">
                  {chatMessages.map((msg) => {
                    const isSelf = msg.sender === 'ADMIN';
                    const isSystem = msg.sender === 'SYSTEM';

                    if (isSystem) {
                      return (
                        <div key={msg._id} className="text-center px-4 py-1">
                          <span className="inline-block bg-slate-200/80 text-[10px] text-slate-600 px-3 py-0.5 rounded-full font-medium">
                            {msg.message}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg._id}
                        className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                      >
                        <span className="text-[9px] text-slate-400 font-semibold mb-1 px-1">
                          {msg.senderName} ({msg.sender})
                        </span>
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm ${isSelf
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                            }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Message Input Footer */}
                <form onSubmit={handleSendReply} className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your response to the client..."
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className="p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <FiSend size={16} />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                <FiMessageSquare size={48} className="mb-3 opacity-60" />
                <p className="font-medium">Select a conversation from the sidebar to view chat history and reply.</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Assign Task Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-100 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800 font-sans">Assign Task / Lead</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleAssignTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Select Task / Lead *</label>
                <select
                  required
                  value={assignFormData.leadId}
                  onChange={(e) => setAssignFormData({ ...assignFormData, leadId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm cursor-pointer"
                >
                  <option value="">Choose a task/lead...</option>
                  {leadsList.map(l => (
                    <option key={l._id} value={l._id}>
                      {l.leadCode} - {l.customerName} ({l.productCategory})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Assign to Employee</label>
                <select
                  value={assignFormData.assignedTo}
                  onChange={(e) => setAssignFormData({ ...assignFormData, assignedTo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm cursor-pointer"
                >
                  <option value="">Select Employee (Unassigned)</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>
                      {u.fullName} ({u.role} - {u.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Assign to Department</label>
                <select
                  value={assignFormData.assignedDepartment}
                  onChange={(e) => setAssignFormData({ ...assignFormData, assignedDepartment: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm cursor-pointer"
                >
                  <option value="">Select Department (None)</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div >
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Add Notes</label>
                <textarea placeholder='Add Notes' className='w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm cursor-pointer'></textarea>
              </div>

              <div className="flex space-x-3 pt-4 border-t">
                <button type="submit" disabled={isAssigning} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition">
                  {isAssigning ? 'Saving...' : 'Assign Task'}
                </button>
                <button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}