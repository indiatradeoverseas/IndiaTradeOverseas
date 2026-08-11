import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUsers, FiShield, FiBarChart2, FiSettings, FiUserCheck, 
  FiAlertCircle, FiFileText, FiMessageSquare, FiSend, FiSmartphone, FiLayers, FiX
} from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { adminApi } from '../../api/admin';
import { chatApi } from '../../api/chat';
import { leadsApi } from '../../api/leads';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

// Cinematic staggered entrance variations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.02, delayChildren: 0.1 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 120, damping: 20 } }
};

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
    } finally { // FIXED: Ensured spelling matches language specification expectations
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

  // Synchronized color array tokens mapping to the Dark Slate system matrix
  const THEME_COLORS = ['var(--crm-ink-soft)', 'var(--crm-ink-faint)', 'var(--crm-bg-raised)', '#1E4670', '#475569'];

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
      <div className="flex items-center justify-center min-h-screen bg-[var(--crm-bg)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-[1px] bg-[var(--crm-ink-soft)]/40 animate-pulse" />
          <p className="text-[10px] tracking-widest uppercase font-mono text-[var(--crm-ink-faint)]">Securing Administration Vault...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants} 
      className="min-h-screen w-full bg-[var(--crm-bg)] text-[var(--crm-ink-soft)] block pb-12"
    >
      
      {/* Top Premium Hero Section */}
      <motion.div variants={blockVariants} className="w-full border-b border-[var(--crm-ink-soft)]/10 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 bg-[var(--crm-bg-sunken)]/40 backdrop-blur-sm">
        <div className="space-y-1 text-left">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--crm-ink-faint)] font-bold block font-mono">Consolidated Trade Desk</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[var(--crm-heading)] uppercase tracking-tight">Admin Panel</h1>
          <p className="text-xs text-[var(--crm-ink-faint)] font-light mt-0.5">System administration and global intelligence monitoring</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <button
            onClick={handleOpenAssignModal} // FIXED: Resolved duplicate naming statement syntax bug
            className="w-full sm:w-auto bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] text-[11px] uppercase tracking-widest font-bold h-[42px] px-5 rounded-sm flex items-center justify-center shadow-md cursor-pointer hover:bg-[var(--crm-ink-soft)]"
          >
            Assign Trade Task
          </button>
          <div className="bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] border border-[var(--crm-ink-soft)]/10 px-4 h-[42px] flex items-center rounded-sm text-[10px] font-mono font-bold tracking-wide uppercase shadow-sm select-none">
            Admin Access Granted
          </div>
        </div>
      </motion.div>

      {/* Main Framework Container Content */}
      <div className="w-full py-8 space-y-6 bg-[var(--crm-bg)]">

        {/* Metric Cards grid */}
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Users", val: summary?.totalEmployees || 0, icon: FiUsers, col: "text-[var(--crm-heading)]" },
            { label: "Active Users", val: summary?.activeEmployees || 0, icon: FiUserCheck, col: "text-[var(--crm-positive)]" },
            { label: "Open Alerts", val: summary?.securityAlerts || 0, icon: FiAlertCircle, col: "text-[var(--crm-danger)]" },
            { label: "Pending Quotations", val: summary?.quotations?.pending || 0, icon: FiFileText, col: "text-[var(--crm-warning)]" }
          ].map((item, idx) => (
            <motion.div 
              key={idx} 
              variants={blockVariants}
              whileHover={{ y: -3, borderColor: 'rgba(197,203,211,0.25)' }}
              className="bg-[var(--crm-bg-raised)]/30 rounded-sm border border-[var(--crm-ink-soft)]/15 p-5 flex items-center justify-between shadow-xl transition-all duration-300"
            >
              <div className="text-left">
                <p className="text-[9px] uppercase tracking-widest font-mono font-bold text-[var(--crm-ink-faint)]">{item.label}</p>
                <p className={`text-3xl font-serif mt-2 font-light ${item.col}`}>{item.val}</p>
              </div>
              <item.icon className="text-[var(--crm-ink-faint)] opacity-80" size={24} />
            </motion.div>
          ))}
        </motion.div>

        {/* Navigation Tabs bar horizontal */}
        <motion.div variants={blockVariants} className="border-b border-[var(--crm-ink-soft)]/10 overflow-x-auto scrollbar-none flex">
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
                className={`py-3 px-1 border-b-2 text-[11px] uppercase tracking-widest font-mono font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-[var(--crm-heading)] text-[var(--crm-heading)]'
                    : 'border-transparent text-[var(--crm-ink-faint)] hover:text-[var(--crm-ink-soft)]'
                }`}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </nav>
        </motion.div>

        {/* Dynamic Tab Panels Canvas */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="border border-[var(--crm-ink-soft)]/15 p-5 bg-[var(--crm-bg-raised)]/20 rounded-sm w-full overflow-hidden text-left shadow-lg">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] mb-6 font-bold border-b border-[var(--crm-ink-soft)]/10 pb-1.5">Lead Pipeline Overview</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={pipeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-ink-soft)" opacity={0.03} vertical={false} />
                      <XAxis dataKey="_id" stroke="var(--crm-ink-faint)" opacity={0.7} fontSize={9} tickLine={false} />
                      <YAxis stroke="var(--crm-ink-faint)" opacity={0.7} fontSize={9} tickLine={false} />
                      <Tooltip cursor={{ fill: 'var(--crm-bg-raised)', opacity: 0.3 }} contentStyle={{ backgroundColor: 'var(--crm-bg)', borderColor: 'rgba(197,203,211,0.2)', textTransform: 'uppercase', fontSize: '10px', fontFamily: 'monospace' }} />
                      <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', color: 'var(--crm-ink-faint)' }} />
                      <Bar dataKey="total" fill="var(--crm-ink-soft)" radius={[1, 1, 0, 0]} name="Total Leads" maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="border border-[var(--crm-ink-soft)]/15 p-5 bg-[var(--crm-bg-raised)]/20 rounded-sm w-full overflow-hidden text-left shadow-lg">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] mb-6 font-bold border-b border-[var(--crm-ink-soft)]/10 pb-1.5">Stage Distribution Matrix</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={pipeline}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ _id, total }) => `${_id}: ${total}`}
                        outerRadius={95}
                        innerRadius={45}
                        dataKey="total"
                        nameKey="_id"
                        fontSize={9}
                        fontFamily="monospace"
                      >
                        {pipeline.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={THEME_COLORS[index % THEME_COLORS.length]} stroke="var(--crm-bg-raised)" strokeWidth={1.5} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'var(--crm-bg)', borderColor: 'rgba(197,203,211,0.2)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && (
              <div className="bg-[var(--crm-bg-raised)]/10 border border-[var(--crm-ink-soft)]/15 rounded-sm shadow-2xl overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[1050px]">
                    <thead>
                      <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest font-mono font-bold border-b border-[var(--crm-ink-soft)]/15">
                        <th className="py-3.5 px-5">Employee ID</th>
                        <th className="py-3.5 px-5">Name</th>
                        <th className="py-3.5 px-5">Email</th>
                        <th className="py-3.5 px-5">Role</th>
                        <th className="py-3.5 px-5">Department</th>
                        <th className="py-3.5 px-5">Permissions Grid (Click to Shift)</th>
                        <th className="py-3.5 px-5">Status</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--crm-ink-soft)]/10 text-xs">
                      {users.map((userItem) => (
                        <tr key={userItem._id} className="hover:bg-[var(--crm-bg-raised)]/40 transition-colors">
                          <td className="py-4 px-5 font-mono font-bold text-[var(--crm-heading)]">{userItem.employeeId}</td>
                          <td className="py-4 px-5 font-serif text-sm text-[var(--crm-heading)]">{userItem.fullName}</td>
                          <td className="py-4 px-5 text-[var(--crm-ink-faint)] font-mono text-[11px]">{userItem.email}</td>
                          <td className="py-4 px-5">
                            <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded-sm bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/10 text-[var(--crm-ink-soft)]">
                              {userItem.role}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-[var(--crm-ink-soft)]/90 font-medium uppercase font-mono text-[11px]">{userItem.department || 'HQ'}</td>
                          <td className="py-4 px-5">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] font-mono text-[var(--crm-ink-faint)] min-w-[270px] text-left py-1">
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
                                <label key={perm.key} className="inline-flex items-center gap-2 cursor-pointer hover:text-[var(--crm-ink-soft)] select-none">
                                  <input
                                    type="checkbox"
                                    checked={perm.val || false}
                                    onChange={() => togglePermission(userItem._id, perm.key, perm.val)}
                                    className="rounded-sm bg-[var(--crm-bg)] border-[var(--crm-ink-soft)]/20 text-[var(--crm-bg)] focus:ring-0 w-3.5 h-3.5 cursor-pointer accent-[var(--crm-heading)]"
                                  />
                                  <span>{perm.label}</span>
                                </label>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <span className={`inline-block px-2 py-0.5 rounded-sm text-[9px] font-mono font-bold uppercase border ${
                              userItem.isActive ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20' : 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/20 opacity-60'
                            }`}>
                              {userItem.isActive ? 'Active Secure' : 'Suspended'}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right space-x-3 whitespace-nowrap font-mono text-[10px] font-bold uppercase">
                            {userItem.isActive ? (
                              <button onClick={() => deactivateUser(userItem._id)} className="text-[var(--crm-warning)] hover:text-white transition-colors cursor-pointer">Deactivate</button>
                            ) : (
                              <button onClick={() => activateUser(userItem._id)} className="text-[var(--crm-positive)] hover:text-white transition-colors cursor-pointer">Activate</button>
                            )}
                            <button onClick={() => deleteUser(userItem._id)} className="text-[var(--crm-danger)] hover:text-white transition-colors cursor-pointer">Purge</button>
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
              <div className="bg-[var(--crm-bg-raised)]/10 border border-[var(--crm-ink-soft)]/15 rounded-sm shadow-2xl overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[850px]">
                    <thead>
                      <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest font-mono font-bold border-b border-[var(--crm-ink-soft)]/15">
                        <th className="py-3.5 px-5">Threat Vector</th>
                        <th className="py-3.5 px-5">Severity</th>
                        <th className="py-3.5 px-5">Payload Message</th>
                        <th className="py-3.5 px-5">Lifecycle Status</th>
                        <th className="py-3.5 px-5">Timestamp</th>
                        <th className="py-3.5 px-5 text-right">Authorization</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--crm-ink-soft)]/10 text-xs">
                      {alerts.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-16 font-mono text-[var(--crm-ink-faint)] opacity-40 uppercase tracking-widest text-[10px]">No security alerts discovered.</td>
                        </tr>
                      ) : (
                        alerts.map((alert) => (
                          <tr key={alert._id} className="hover:bg-[var(--crm-bg-raised)]/40 transition-colors">
                            <td className="py-4 px-5 font-mono font-bold text-[var(--crm-heading)]">{alert.alertType}</td>
                            <td className="py-4 px-5">
                              <span className={`px-2 py-0.5 rounded-sm text-[9px] font-mono font-bold tracking-wider uppercase border ${
                                alert.severity === 'CRITICAL' ? 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/20 font-extrabold' :
                                alert.severity === 'HIGH' ? 'bg-orange-950/20 text-orange-400 border-orange-500/20' :
                                alert.severity === 'MEDIUM' ? 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/20' : 'bg-[var(--crm-info-bg)] text-[var(--crm-info)] border-[var(--crm-info)]/20'
                              }`}>
                                {alert.severity}
                              </span>
                            </td>
                            <td className="py-4 px-5 text-[var(--crm-ink-soft)]/80 max-w-xs truncate text-left font-light">{alert.message}</td>
                            <td className="py-4 px-5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-mono font-bold uppercase border ${
                                alert.status === 'OPEN' ? 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/20 animate-pulse' :
                                alert.status === 'ACKNOWLEDGED' ? 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/20' : 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20'
                              }`}>
                                {alert.status}
                              </span>
                            </td>
                            <td className="py-4 px-5 font-mono text-[var(--crm-ink-faint)]">{new Date(alert.createdAt).toLocaleString()}</td>
                            <td className="py-4 px-5 text-right font-mono text-[10px] font-bold uppercase">
                              {alert.status === 'OPEN' && (
                                <button onClick={() => resolveAlert(alert._id)} className="bg-[var(--crm-bg)] border border-[var(--crm-positive)]/30 text-[var(--crm-positive)] px-3 h-7 rounded-sm tracking-wider hover:bg-[var(--crm-positive)] hover:text-[var(--crm-bg)] transition-colors cursor-pointer shadow-md">Resolve</button>
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

            {/* SUPPORT CHATS TAB */}
            {activeTab === 'chats' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[620px]">
                {/* Sidebar Channels */}
                <div className="bg-[var(--crm-bg-raised)]/20 rounded-sm border border-[var(--crm-ink-soft)]/15 p-4 overflow-y-auto lg:col-span-4 space-y-2 custom-scrollbar text-left shadow-lg">
                  <h3 className="text-[9px] font-mono uppercase tracking-[0.25em] text-[var(--crm-ink-faint)] font-bold mb-4 border-b border-[var(--crm-ink-soft)]/10 pb-1.5">Live Communications</h3>
                  {chatSessions.length === 0 ? (
                    <p className="text-xs text-[var(--crm-ink-faint)] text-center font-light py-12 italic">No communication channels established.</p>
                  ) : (
                    chatSessions.map((session) => (
                      <button
                        key={session.sessionId}
                        onClick={() => handleSelectSession(session.sessionId)}
                        className={`w-full text-left p-4 rounded-sm border transition-all duration-150 flex flex-col gap-1.5 cursor-pointer ${
                          selectedSessionId === session.sessionId
                            ? 'bg-[var(--crm-bg-raised)] border-[var(--crm-ink-soft)]/30 text-[var(--crm-heading)] shadow-inner'
                            : 'bg-[var(--crm-bg)]/40 border-[var(--crm-ink-soft)]/10 text-[var(--crm-ink-soft)] hover:bg-[var(--crm-bg-raised)]/40'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-serif text-sm font-normal truncate">{session.clientName}</span>
                          <span className={`text-[9px] font-mono px-2 py-0.5 font-bold tracking-wider rounded-sm border uppercase ${
                            session.status === 'OPEN' ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20' : 'bg-gray-950/40 text-gray-500 border-gray-500/20'
                          }`}>
                            {session.status}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-[var(--crm-ink-faint)] truncate">ID: {session.sessionId}</p>
                        <span className="text-[10px] font-mono text-[var(--crm-ink-faint)] text-right block w-full mt-1">
                          {new Date(session.lastMessageAt).toLocaleTimeString()}
                        </span>
                      </button>
                    ))
                  )}
                </div>

                {/* Chat Console Panel */}
                <div className="lg:col-span-8 bg-[var(--crm-bg-raised)]/20 rounded-sm border border-[var(--crm-ink-soft)]/15 overflow-hidden flex flex-col h-full shadow-lg">
                  {selectedSessionId ? (
                    <>
                      <div className="bg-[var(--crm-bg-sunken)]/60 border-b border-[var(--crm-ink-soft)]/10 p-4 flex justify-between items-center text-left shrink-0">
                        <div>
                          <h3 className="font-serif text-sm font-normal text-[var(--crm-heading)]">
                            {chatSessions.find(s => s.sessionId === selectedSessionId)?.clientName || 'Secure Support'}
                          </h3>
                          <p className="text-xs text-[var(--crm-ink-faint)] font-mono mt-0.5">
                            {chatSessions.find(s => s.sessionId === selectedSessionId)?.clientEmail || 'No profile metadata'}
                          </p>
                        </div>
                        {chatSessions.find(s => s.sessionId === selectedSessionId)?.status === 'OPEN' && (
                          <button
                            onClick={() => handleResolveSession(selectedSessionId)}
                            className="bg-[var(--crm-bg)] border border-[var(--crm-danger)]/30 text-[var(--crm-danger)] hover:bg-[var(--crm-danger)] hover:text-[var(--crm-bg)] px-4 h-8 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-md"
                          >
                            Resolve Channel
                          </button>
                        )}
                      </div>

                      <div className="flex-1 p-6 overflow-y-auto space-y-4 flex flex-col bg-[var(--crm-bg-sunken)]/20 custom-scrollbar">
                        {chatMessages.map((msg) => {
                          const isSelf = msg.sender === 'ADMIN';
                          const isSystem = msg.sender === 'SYSTEM';

                          if (isSystem) {
                            return (
                              <div className="text-center py-1 shrink-0 animate-fadeIn" key={msg._id}>
                                <span className="inline-block bg-[var(--crm-bg-sunken)]/80 border border-[var(--crm-ink-soft)]/10 font-mono text-[9px] text-[var(--crm-ink-faint)] px-3 py-0.5 rounded-sm uppercase tracking-widest">
                                  {msg.message}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div key={msg._id} className={`flex flex-col shrink-0 animate-fadeIn ${isSelf ? 'items-end' : 'items-start'}`}>
                              <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] mb-1 px-1">
                                {msg.senderName} ({msg.sender})
                              </span>
                              <div className={`max-w-[75%] rounded-sm px-4 py-2.5 text-xs text-left leading-relaxed shadow-md border ${
                                isSelf 
                                  ? 'bg-[var(--crm-bg-raised)] border-[var(--crm-ink-soft)]/20 text-[var(--crm-heading)] rounded-tr-none' 
                                  : 'bg-[var(--crm-bg)] border-[var(--crm-ink-soft)]/10 text-[var(--crm-ink-soft)] rounded-tl-none'
                              }`}>
                                {msg.message}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <form onSubmit={handleSendReply} className="p-4 bg-[var(--crm-bg-sunken)]/40 border-t border-[var(--crm-ink-soft)]/10 flex items-center space-x-3 shrink-0">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type standard trading response..."
                          className="flex-1 px-4 py-3 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-xs rounded-sm outline-none text-[var(--crm-heading)] placeholder-[var(--crm-ink-faint)]"
                        />
                        <button
                          type="submit"
                          disabled={!replyText.trim()}
                          className="p-3 rounded-sm bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] hover:bg-[var(--crm-ink-soft)] disabled:opacity-20 disabled:cursor-not-allowed transition duration-150 shadow-md cursor-pointer"
                        >
                          <FiSend size={15} />
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                      <FiMessageSquare size={36} className="mb-3 text-[var(--crm-ink-faint)] opacity-60" />
                      <p className="text-[10px] font-mono uppercase tracking-widest font-medium text-[var(--crm-ink-faint)]">Select communication string from console registry.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TRUSTED DEVICES TAB */}
            {activeTab === 'devices' && (
              <div className="bg-[var(--crm-bg-raised)]/10 border border-[var(--crm-ink-soft)]/15 rounded-sm shadow-2xl overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest font-mono font-bold border-b border-[var(--crm-ink-soft)]/15">
                        <th className="py-3.5 px-5">System Operator</th>
                        <th className="py-3.5 px-5">Hardware Identifier</th>
                        <th className="py-3.5 px-5">IP Address</th>
                        <th className="py-3.5 px-5">Device Security Hash</th>
                        <th className="py-3.5 px-5">Status</th>
                        <th className="py-3.5 px-5 text-right">Authorizations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--crm-ink-soft)]/10 text-xs">
                      {devices.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-16 font-mono text-[var(--crm-ink-faint)] opacity-40 uppercase tracking-widest text-[10px]">No hardware telemetry records discovered.</td>
                        </tr>
                      ) : (
                        devices.map((device) => (
                          <tr key={device._id} className="hover:bg-[var(--crm-bg-raised)]/40 transition-colors">
                            <td className="py-4 px-5 text-left">
                              <div className="space-y-1">
                                <p className="font-serif text-sm font-normal text-[var(--crm-heading)]">{device.userId?.fullName || 'N/A'}</p>
                                <p className="text-xs text-[var(--crm-ink-faint)] font-mono font-light">{device.userId?.email || 'N/A'}</p>
                              </div>
                            </td>
                            <td className="py-4 px-5 font-mono font-bold text-[var(--crm-ink-soft)] text-xs uppercase tracking-wide text-left">{device.deviceName}</td>
                            <td className="py-4 px-5 text-xs text-[var(--crm-ink-faint)] font-mono text-left">{device.ipAddress}</td>
                            <td className="py-4 px-5 text-xs font-mono text-[var(--crm-ink-faint)]/60 text-left">{device.deviceHash}</td>
                            <td className="py-4 px-5 text-left">
                              <span className={`px-2.5 py-0.5 rounded-sm text-[9px] font-mono font-bold border uppercase tracking-wider ${
                                device.isApproved ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20' : 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/20 animate-pulse'
                              }`}>
                                {device.isApproved ? 'Authorized' : 'Pending Verification'}
                              </span>
                            </td>
                            <td className="py-4 px-5 text-right font-mono text-[10px] font-bold uppercase">
                              {device.isApproved ? (
                                <button onClick={() => handleRevokeDevice(device._id)} className="text-[var(--crm-danger)] hover:text-white transition-colors cursor-pointer">Revoke Clearance</button>
                              ) : (
                                <button onClick={() => handleApproveDevice(device._id)} className="text-[var(--crm-positive)] hover:text-white transition-colors cursor-pointer">Grant Access</button>
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
              <div className="max-w-2xl bg-[var(--crm-bg-raised)]/20 border border-[var(--crm-ink-soft)]/15 rounded-sm p-6 space-y-6 shadow-xl text-left">
                <div className="border-b border-[var(--crm-ink-soft)]/10 pb-3">
                  <h2 className="text-base font-serif font-normal text-[var(--crm-heading)] uppercase tracking-wide">Core Engine Diagnostics</h2>
                  <p className="text-xs text-[var(--crm-ink-faint)] font-light mt-1">Execute configuration state modifications across the trade network architecture.</p>
                </div>
                <div className="divide-y divide-[var(--crm-ink-soft)]/10 font-sans">
                  {[
                    { title: "System Maintenance Matrix", desc: "Redirect consumer modules to high-end structural holds.", action: "Enable Matrix", class: "bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-soft)] hover:bg-[var(--crm-bg-raised)]" },
                    { title: "Encrypt & Backup Ledger Data", desc: "Create an isolated architecture snapshot instantly.", action: "Backup Now", class: "bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] font-bold shadow-md hover:bg-[var(--crm-ink-soft)]" },
                    { title: "Flush Edge Caches", desc: "Invalidate static schemas globally.", action: "Clear Edge", class: "bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-soft)] hover:bg-[var(--crm-bg-raised)]" },
                    { title: "Export System Telemetry", desc: "Download integrated database structures into structured JSON.", action: "Export Data", class: "bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-soft)] hover:bg-[var(--crm-bg-raised)]" }
                  ].map((setting, idx) => (
                    <div key={idx} className="flex items-center justify-between py-4 first:pt-0 last:pb-0 gap-4">
                      <div>
                        <p className="text-sm font-medium text-[var(--crm-heading)]">{setting.title}</p>
                        <p className="text-xs text-[var(--crm-ink-faint)] font-light mt-1 leading-relaxed">{setting.desc}</p>
                      </div>
                      <button className={`px-4 h-9 rounded-sm text-[10px] font-mono uppercase tracking-widest font-bold transition duration-150 shrink-0 cursor-pointer ${setting.class}`}>{setting.action}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ASSIGN TASK MODAL */}
      <AnimatePresence>
        {showAssignModal && (
          <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-[var(--crm-bg-raised)] rounded-sm p-6 w-full max-w-md border border-[var(--crm-ink-soft)]/15 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar relative"
            >
              <div className="flex justify-between items-center mb-6 border-b border-[var(--crm-ink-soft)]/10 pb-3 text-left">
                <div>
                  <h2 className="text-base font-serif font-normal text-[var(--crm-heading)] tracking-wide uppercase">Assign Trade Registry Task</h2>
                  <p className="text-[9px] text-[var(--crm-ink-faint)] tracking-widest uppercase font-mono font-bold mt-1">Operational Matrix Control</p>
                </div>
                <button 
                  onClick={() => setShowAssignModal(false)} 
                  className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] p-1.5 rounded-sm hover:bg-[var(--crm-bg)] transition-all cursor-pointer"
                >
                  <FiX size={16} />
                </button>
              </div>

              <form onSubmit={handleAssignTask} className="space-y-4 text-left font-sans text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Select Target Lead *</label>
                  <div className="relative">
                    <select
                      required
                      value={assignFormData.leadId}
                      onChange={(e) => setAssignFormData({ ...assignFormData, leadId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-xs rounded-sm outline-none appearance-none cursor-pointer text-[var(--crm-heading)] focus:border-[var(--crm-heading)]/40"
                    >
                      <option value="" className="bg-[var(--crm-bg)]">Select registry tracking node...</option>
                      {leadsList.map(l => (
                        <option key={l._id} value={l._id} className="bg-[var(--crm-bg)] text-[var(--crm-ink-soft)]">
                          {l.leadCode} &mdash; {l.customerName} ({l.productCategory})
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--crm-ink-faint)]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Assign Dedicated Operator</label>
                  <div className="relative">
                    <select
                      value={assignFormData.assignedTo}
                      onChange={(e) => setAssignFormData({ ...assignFormData, assignedTo: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-xs rounded-sm outline-none appearance-none cursor-pointer text-[var(--crm-heading)] focus:border-[var(--crm-heading)]/40"
                    >
                      <option value="" className="bg-[var(--crm-bg)]">Set as Open Matrix (Unassigned)</option>
                      {users.map(u => (
                        <option key={u._id} value={u._id} className="bg-[var(--crm-bg)] text-[var(--crm-ink-soft)]">
                          {u.fullName} ({u.role} &bull; {u.department || 'HQ'})
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--crm-ink-faint)]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Assign Fleet Department</label>
                  <div className="relative">
                    <select
                      value={assignFormData.assignedDepartment}
                      onChange={(e) => setAssignFormData({ ...assignFormData, assignedDepartment: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-xs rounded-sm outline-none appearance-none cursor-pointer text-[var(--crm-heading)] focus:border-[var(--crm-heading)]/40"
                    >
                      <option value="" className="bg-[var(--crm-bg)]">Corporate HQ (None)</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept} className="bg-[var(--crm-bg)] text-[var(--crm-ink-soft)]">{dept}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--crm-ink-faint)]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Task Parameters / Manifest Notes</label>
                  <textarea 
                    placeholder="Enter special technical guidelines, incoterm verification instructions, or handling instructions..." 
                    className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-xs rounded-sm outline-none text-[var(--crm-heading)] focus:border-[var(--crm-heading)]/40 h-20 resize-none font-light custom-scrollbar"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-[var(--crm-ink-soft)]/10 mt-4">
                  <button 
                    type="submit" 
                    disabled={isAssigning} 
                    className="flex-1 bg-[var(--crm-heading)] hover:bg-[var(--crm-ink-soft)] text-[var(--crm-bg-sunken)] text-xs font-bold py-3 uppercase rounded-sm cursor-pointer shadow-md transition-colors disabled:opacity-40"
                  >
                    {isAssigning ? 'Transmitting...' : 'Commit Assignment'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowAssignModal(false)} 
                    className="flex-1 bg-[var(--crm-bg)] hover:bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-soft)] text-xs font-bold py-3 rounded-sm cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}