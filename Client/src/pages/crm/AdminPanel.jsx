import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUsers, FiShield, FiBarChart2, FiSettings, FiUserCheck, 
  FiAlertCircle, FiFileText, FiMessageSquare, FiSend, FiSmartphone, FiLayers
} from 'react-icons/fi';
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

  // Cinematic Color Configs matching the Trade Platform theme
  const THEME_COLORS = ['#0B2D5B', '#C99B38', '#8A6E3F', '#1E4670', '#D6B469'];

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
      <div className="flex items-center justify-center min-h-[60vh] bg-[#FBF7EF]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C99B38]"></div>
          <p className="text-xs tracking-widest uppercase font-serif text-[#0B2D5B] opacity-70">Securing Administration Vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#0B2D5B] px-4 sm:px-8 py-8 space-y-8 font-sans antialiased">
      
      {/* Top Premium Hero Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#C99B38]/10 pb-6 gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#C99B38] font-bold">Consolidated Trade Desk</span>
          <h1 className="text-3xl font-serif text-[#0B2D5B] font-normal tracking-wide mt-1">Admin Panel</h1>
          <p className="text-sm text-gray-500 font-light mt-0.5">System administration and global intelligence monitoring</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <button
            onClick={handleOpenAssignModal}
            className="bg-[#0B2D5B] hover:bg-[#C99B38] text-white font-medium px-5 py-2.5 rounded-lg border border-transparent shadow-md text-xs uppercase tracking-wider transition-all duration-300 transform active:scale-98"
          >
            Assign Trade Task
          </button>
          <div className="bg-white text-[#0B2D5B] border border-[#C99B38]/30 px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase shadow-sm">
            Admin Access Granted
          </div>
        </div>
      </div>

      {/* Metric Cards - Premium Ivory Panels with Gold Accents */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Users", val: summary?.users || 0, icon: FiUsers, col: "text-[#0B2D5B]" },
          { label: "Active Users", val: summary?.activeUsers || 0, icon: FiUserCheck, col: "text-emerald-700" },
          { label: "Open Alerts", val: summary?.openAlerts || 0, icon: FiAlertCircle, col: "text-rose-700" },
          { label: "Pending Quotations", val: summary?.pendingQuotations || 0, icon: FiFileText, col: "text-amber-600" }
        ].map((item, idx) => (
          <div key={idx} className="bg-white rounded-xl p-6 border border-[#C99B38]/10 shadow-sm relative overflow-hidden group hover:border-[#C99B38]/30 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">{item.label}</p>
                <p className={`text-3xl font-serif mt-2 font-normal ${item.col}`}>{item.val}</p>
              </div>
              <item.icon className="text-[#C99B38] opacity-80 group-hover:scale-11 transition-transform duration-300" size={28} />
            </div>
            <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-[#C99B38] group-hover:w-full transition-all duration-500" />
          </div>
        ))}
      </div>

      {/* Navigation Tabs - Underlined Clean Typography */}
      <div className="border-b border-gray-200 overflow-x-auto scrollbar-none">
        <nav className="flex space-x-6 min-w-max">
          {[
            { id: 'overview', label: 'Overview', icon: FiBarChart2 },
            { id: 'users', label: 'Users & Permissions', icon: FiUsers },
            { id: 'alerts', label: 'Security Alerts', icon: FiShield },
            { id: 'chats', label: 'Support Desks', icon: FiMessageSquare },
            { id: 'devices', label: 'Trusted Devices', icon: FiSmartphone },
            { id: 'settings', label: 'Vault Settings', icon: FiSettings },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'border-[#C99B38] text-[#0B2D5B] font-semibold'
                  : 'border-transparent text-gray-400 hover:text-[#0B2D5B]'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Dynamic Tab Panels with Elegant Cascade Motion */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-[#C99B38]/10 shadow-sm">
                <h2 className="text-sm font-serif uppercase tracking-wider text-[#0B2D5B] mb-6">Lead Pipeline Overview</h2>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={pipeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="_id" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip cursor={{ fill: '#FBF7EF' }} contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #C99B38' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="total" fill="#0B2D5B" radius={[4, 4, 0, 0]} name="Total Leads" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl p-6 border border-[#C99B38]/10 shadow-sm">
                <h2 className="text-sm font-serif uppercase tracking-wider text-[#0B2D5B] mb-6">Stage Distribution Matrix</h2>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={pipeline}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ _id, total }) => `${_id}: ${total}`}
                      outerRadius={100}
                      innerRadius={40}
                      dataKey="total"
                      nameKey="_id"
                    >
                      {pipeline.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={THEME_COLORS[index % THEME_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #C99B38' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-xl border border-[#C99B38]/10 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0B2D5B] text-white text-[11px] uppercase tracking-wider">
                      <th className="py-4 px-5 font-medium">Employee ID</th>
                      <th className="py-4 px-5 font-medium">Name</th>
                      <th className="py-4 px-5 font-medium">Email</th>
                      <th className="py-4 px-5 font-medium">Role</th>
                      <th className="py-4 px-5 font-medium">Department</th>
                      <th className="py-4 px-5 font-medium">Permissions Grid</th>
                      <th className="py-4 px-5 font-medium">Status</th>
                      <th className="py-4 px-5 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {users.map((userItem) => (
                      <tr key={userItem._id} className="hover:bg-[#FBF7EF]/40 transition duration-150">
                        <td className="py-4 px-5 font-mono text-xs font-semibold text-gray-700">{userItem.employeeId}</td>
                        <td className="py-4 px-5 font-medium text-[#0B2D5B]">{userItem.fullName}</td>
                        <td className="py-4 px-5 text-gray-600 text-xs">{userItem.email}</td>
                        <td className="py-4 px-5">
                          <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-[#0B2D5B]/5 text-[#0B2D5B]">
                            {userItem.role}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-gray-600 font-medium text-xs">{userItem.department}</td>
                        <td className="py-4 px-5">
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-gray-600 min-w-[240px]">
                            {[
                              { label: "Product Upload", key: "upload", val: userItem.productUploadPermission },
                              { label: "Export DB", key: "export", val: userItem.exportPermission },
                              { label: "Leads Node", key: "lead", val: userItem.leadPermission },
                              { label: "Documents", key: "document", val: userItem.documentPermission },
                              { label: "Tasks Desk", key: "task", val: userItem.taskPermission },
                              { label: "Dispatch Track", key: "dispatch", val: userItem.dispatchPermission },
                              { label: "Payments Vault", key: "payment", val: userItem.paymentPermission },
                              { label: "Quotation Engine", key: "quotation", val: userItem.quotationPermission }
                            ].map((perm) => (
                              <label key={perm.key} className="inline-flex items-center gap-1.5 cursor-pointer hover:text-[#0B2D5B]">
                                <input
                                  type="checkbox"
                                  checked={perm.val || false}
                                  onChange={() => togglePermission(userItem._id, perm.key, perm.val)}
                                  className="rounded text-[#0B2D5B] focus:ring-[#C99B38] border-gray-300 w-3.5 h-3.5 cursor-pointer accent-[#0B2D5B]"
                                />
                                <span>{perm.label}</span>
                              </label>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                            userItem.isActive ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}>
                            {userItem.isActive ? 'Active Secure' : 'Suspended'}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right space-x-3 whitespace-nowrap">
                          {userItem.isActive ? (
                            <button onClick={() => deactivateUser(userItem._id)} className="text-amber-600 hover:text-[#0B2D5B] text-xs font-semibold tracking-wider uppercase">Deactivate</button>
                          ) : (
                            <button onClick={() => activateUser(userItem._id)} className="text-emerald-600 hover:text-[#0B2D5B] text-xs font-semibold tracking-wider uppercase">Activate</button>
                          )}
                          <button onClick={() => deleteUser(userItem._id)} className="text-rose-600 hover:text-rose-800 text-xs font-semibold tracking-wider uppercase">Purge</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ALERTS TAB */}
          {activeTab === 'alerts' && (
            <div className="bg-white rounded-xl border border-[#C99B38]/10 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0B2D5B] text-white text-[11px] uppercase tracking-wider">
                      <th className="py-4 px-5 font-medium">Threat Vector</th>
                      <th className="py-4 px-5 font-medium">Severity</th>
                      <th className="py-4 px-5 font-medium">Payload Message</th>
                      <th className="py-4 px-5 font-medium">Lifecycle Status</th>
                      <th className="py-4 px-5 font-medium">Timestamp</th>
                      <th className="py-4 px-5 text-right font-medium">Authorization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {alerts.map((alert) => (
                      <tr key={alert._id} className="hover:bg-[#FBF7EF]/40 transition duration-150">
                        <td className="py-4 px-5 font-mono text-xs font-semibold text-gray-700">{alert.alertType}</td>
                        <td className="py-4 px-5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                            alert.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                            alert.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                            alert.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {alert.severity}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-gray-600 max-w-xs truncate text-xs">{alert.message}</td>
                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            alert.status === 'OPEN' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            alert.status === 'ACKNOWLEDGED' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {alert.status}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-gray-500 text-xs">{new Date(alert.createdAt).toLocaleString()}</td>
                        <td className="py-4 px-5 text-right">
                          {alert.status === 'OPEN' && (
                            <button onClick={() => resolveAlert(alert._id)} className="bg-white border border-emerald-600 text-emerald-700 px-3 py-1 rounded text-xs uppercase font-semibold tracking-wider hover:bg-emerald-600 hover:text-white transition-all">Resolve</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUPPORT CHATS TAB */}
          {activeTab === 'chats' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[620px]">
              {/* Sidebar Channels */}
              <div className="bg-white rounded-xl border border-[#C99B38]/10 shadow-sm p-4 overflow-y-auto lg:col-span-4 space-y-2">
                <h3 className="text-xs uppercase tracking-widest text-[#C99B38] font-bold mb-3">Live Communications</h3>
                {chatSessions.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-12">No communication channels established.</p>
                ) : (
                  chatSessions.map((session) => (
                    <button
                      key={session.sessionId}
                      onClick={() => handleSelectSession(session.sessionId)}
                      className={`w-full text-left p-4 rounded-lg border transition-all duration-200 flex flex-col gap-2 ${
                        selectedSessionId === session.sessionId
                          ? 'bg-[#FBF7EF] border-[#C99B38] text-[#0B2D5B] shadow-inner'
                          : 'bg-white border-gray-100 hover:bg-[#FBF7EF]/30'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-serif text-sm text-[#0B2D5B] font-medium truncate">{session.clientName}</span>
                        <span className={`text-[9px] px-2 py-0.5 font-bold tracking-wider rounded uppercase ${
                          session.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {session.status}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-gray-400 truncate">ID: {session.sessionId}</p>
                      <span className="text-[10px] text-gray-400 text-right block w-full">
                        {new Date(session.lastMessageAt).toLocaleTimeString()}
                      </span>
                    </button>
                  ))
                )}
              </div>

              {/* Chat Console Panel */}
              <div className="lg:col-span-8 bg-white rounded-xl border border-[#C99B38]/10 shadow-sm overflow-hidden flex flex-col h-full">
                {selectedSessionId ? (
                  <>
                    <div className="bg-[#FBF7EF] border-b border-[#C99B38]/10 p-4 flex justify-between items-center">
                      <div>
                        <h3 className="font-serif text-[#0B2D5B] font-medium">
                          {chatSessions.find(s => s.sessionId === selectedSessionId)?.clientName || 'Secure Support'}
                        </h3>
                        <p className="text-xs text-gray-400">
                          {chatSessions.find(s => s.sessionId === selectedSessionId)?.clientEmail || 'No profile metadata'}
                        </p>
                      </div>
                      {chatSessions.find(s => s.sessionId === selectedSessionId)?.status === 'OPEN' && (
                        <button
                          onClick={() => handleResolveSession(selectedSessionId)}
                          className="bg-transparent border border-rose-600 text-rose-600 hover:bg-rose-600 hover:text-white px-4 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all"
                        >
                          Resolve Channel
                        </button>
                      )}
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto space-y-4 flex flex-col bg-[#FBF7EF]/20">
                      {chatMessages.map((msg) => {
                        const isSelf = msg.sender === 'ADMIN';
                        const isSystem = msg.sender === 'SYSTEM';

                        if (isSystem) {
                          return (
                            <div key={msg._id} className="text-center py-2">
                              <span className="inline-block bg-gray-100 text-[10px] text-gray-500 px-3 py-0.5 rounded-full uppercase tracking-wider">
                                {msg.message}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div key={msg._id} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                            <span className="text-[9px] uppercase tracking-wider text-gray-400 mb-1 px-1">
                              {msg.senderName} ({msg.sender})
                            </span>
                            <div className={`max-w-[70%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                              isSelf ? 'bg-[#0B2D5B] text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-sm'
                            }`}>
                              {msg.message}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <form onSubmit={handleSendReply} className="p-4 bg-white border-t border-gray-100 flex items-center space-x-3">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type standard trading response..."
                        className="flex-1 px-4 py-3 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] focus:ring-1 focus:ring-[#C99B38] rounded-lg outline-none text-sm transition"
                      />
                      <button
                        type="submit"
                        disabled={!replyText.trim()}
                        className="p-3 rounded-lg bg-[#0B2D5B] text-white hover:bg-[#C99B38] disabled:opacity-30 disabled:cursor-not-allowed transition duration-300 shadow-md"
                      >
                        <FiSend size={16} />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 bg-[#FBF7EF]/10">
                    <FiMessageSquare size={40} className="mb-3 text-[#C99B38] opacity-60" />
                    <p className="text-xs uppercase tracking-widest font-medium text-gray-400">Select communication string from console registry.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TRUSTED DEVICES TAB */}
          {activeTab === 'devices' && (
            <div className="bg-white rounded-xl border border-[#C99B38]/10 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0B2D5B] text-white text-[11px] uppercase tracking-wider">
                      <th className="py-4 px-5 font-medium">System Operator</th>
                      <th className="py-4 px-5 font-medium">Hardware Identifier</th>
                      <th className="py-4 px-5 font-medium">IP Address</th>
                      <th className="py-4 px-5 font-medium">Device Security Hash</th>
                      <th className="py-4 px-5 font-medium">Status</th>
                      <th className="py-4 px-5 text-right font-medium">Authorizations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {devices.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-12 text-xs uppercase tracking-widest text-gray-400">No telemetry records discovered.</td>
                      </tr>
                    ) : (
                      devices.map((device) => (
                        <tr key={device._id} className="hover:bg-[#FBF7EF]/40 transition duration-150">
                          <td className="py-4 px-5">
                            <div>
                              <p className="font-medium text-[#0B2D5B]">{device.userId?.fullName || 'N/A'}</p>
                              <p className="text-xs text-gray-400 font-light">{device.userId?.email || 'N/A'}</p>
                            </div>
                          </td>
                          <td className="py-4 px-5 font-medium text-gray-700 text-xs uppercase tracking-wide">{device.deviceName}</td>
                          <td className="py-4 px-5 text-xs text-gray-600 font-mono">{device.ipAddress}</td>
                          <td className="py-4 px-5 text-xs font-mono text-gray-400">{device.deviceHash}</td>
                          <td className="py-4 px-5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                              device.isApproved ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              {device.isApproved ? 'Authorized' : 'Pending Verification'}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right">
                            {device.isApproved ? (
                              <button onClick={() => handleRevokeDevice(device._id)} className="text-rose-600 hover:text-rose-800 text-xs font-bold uppercase tracking-wider">Revoke Clearance</button>
                            ) : (
                              <button onClick={() => handleApproveDevice(device._id)} className="text-emerald-600 hover:text-emerald-800 text-xs font-bold uppercase tracking-wider">Grant Access</button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl bg-white rounded-xl border border-[#C99B38]/10 shadow-sm p-6 space-y-6">
              <div>
                <h2 className="text-base font-serif text-[#0B2D5B] tracking-wide">Core Engine Diagnostics</h2>
                <p className="text-xs text-gray-400 font-light">Execute configuration state modifications across the trade network architecture.</p>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  { title: "System Maintenance Matrix", desc: "Redirect consumer modules to high-end structural holds.", action: "Enable", class: "border border-gray-300 text-gray-700 hover:bg-gray-50" },
                  { title: "Encrypt & Backup Ledger Data", desc: "Create an isolated architecture snapshot instantly.", action: "Backup Now", class: "bg-[#0B2D5B] text-white hover:bg-[#C99B38]" },
                  { title: "Flush Edge Caches", desc: "Invalidate static schemas globally.", action: "Clear", class: "border border-gray-300 text-gray-700 hover:bg-gray-50" },
                  { title: "Export System Telemetry", desc: "Download integrated database structures into structured JSON.", action: "Export Data", class: "border border-gray-300 text-gray-700 hover:bg-gray-50" }
                ].map((setting, idx) => (
                  <div key={idx} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-[#0B2D5B]">{setting.title}</p>
                      <p className="text-xs text-gray-400 font-light">{setting.desc}</p>
                    </div>
                    <button className={`px-4 py-2 rounded text-xs uppercase tracking-wider font-semibold transition duration-300 ${setting.class}`}>{setting.action}</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ASSIGN TASK MODAL - Premium Modal Layer */}
      <AnimatePresence>
        {showAssignModal && (
          <div className="fixed inset-0 bg-[#0B2D5B]/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md border border-[#C99B38]/20 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-3">
                <h2 className="text-base font-serif text-[#0B2D5B] tracking-wide uppercase">Assign Trade Registry Task</h2>
                <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600 font-light text-xl">&times;</button>
              </div>

              <form onSubmit={handleAssignTask} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-2">Select Target Lead *</label>
                  <select
                    required
                    value={assignFormData.leadId}
                    onChange={(e) => setAssignFormData({ ...assignFormData, leadId: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none cursor-pointer text-[#0B2D5B]"
                  >
                    <option value="">Select registry tracking node...</option>
                    {leadsList.map(l => (
                      <option key={l._id} value={l._id}>
                        {l.leadCode} &mdash; {l.customerName} ({l.productCategory})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-2">Assign Dedicated Operator</label>
                  <select
                    value={assignFormData.assignedTo}
                    onChange={(e) => setAssignFormData({ ...assignFormData, assignedTo: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none cursor-pointer text-[#0B2D5B]"
                  >
                    <option value="">Set as Open Matrix (Unassigned)</option>
                    {users.map(u => (
                      <option key={u._id} value={u._id}>
                        {u.fullName} ({u.role} &bull; {u.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-2">Assign Fleet Department</label>
                  <select
                    value={assignFormData.assignedDepartment}
                    onChange={(e) => setAssignFormData({ ...assignFormData, assignedDepartment: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none cursor-pointer text-[#0B2D5B]"
                  >
                    <option value="">Corporate HQ (None)</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-2">Task Parameters / Manifest Notes</label>
                  <textarea placeholder="Enter special technical guidelines, incoterm verification instructions, or handling instructions..." className="w-full px-3 py-2.5 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none h-20 resize-none text-gray-700 font-light"></textarea>
                </div>

                <div className="flex space-x-3 pt-4 border-t border-gray-100">
                  <button type="submit" disabled={isAssigning} className="flex-1 py-3 bg-[#0B2D5B] hover:bg-[#C99B38] text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300">
                    {isAssigning ? 'Transmitting...' : 'Commit Assignment'}
                  </button>
                  <button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}