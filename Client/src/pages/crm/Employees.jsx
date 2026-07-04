import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUserPlus,
  FiTrash2,
  FiBriefcase,
  FiTrendingUp,
  FiDatabase,
  FiPackage,
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiXCircle
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin';

export default function Employees() {
  const [users, setUsers] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'SALES',
    department: 'SALES'
  });

  const departmentOptions = [
    { value: 'STONE', label: 'Stone' },
    { value: 'COAL', label: 'Coal' },
    { value: 'TEA', label: 'Tea' },
    { value: 'RICE', label: 'Rice' },
    { value: 'TRANSPORT', label: 'Transport' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'IT', label: 'IT' },
    { value: 'PROCUREMENT', label: 'Procurement' },
    { value: 'ACCOUNTS', label: 'Accounts' },
    { value: 'HR', label: 'HR' },
    { value: 'SALES', label: 'Sales' },
    { value: 'CRM', label: 'CRM' },
    { value: 'FINANCE', label: 'Finance' }
  ];

  const roleOptions = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'SALES', label: 'Sales' },
    { value: 'PROCUREMENT', label: 'Procurement' },
    { value: 'ACCOUNTS', label: 'Accounts' },
    { value: 'HR', label: 'HR' },
    { value: 'FINANCE', label: 'Finance' },
    { value: 'IT', label: 'IT' },
    { value: 'SOFTWARE_ENGINEER', label: 'Software Engineer' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, perfRes] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getEmployeePerformance()
      ]);

      if (usersRes.success) {
        setUsers(usersRes.data.users || []);
      }
      if (perfRes.success) {
        setPerformance(perfRes.data.performance || []);
      }
    } catch (error) {
      console.error('Error fetching employees data:', error);
      toast.error('Failed to load employee list');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await adminApi.createUser(formData);
      if (response.success) {
        toast.success('Employee created successfully! 🎉');
        setShowModal(false);
        setFormData({
          employeeId: '',
          fullName: '',
          email: '',
          phone: '',
          password: '',
          role: 'SALES',
          department: 'SALES'
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.message || 'Failed to create employee');
    }
  };

  const toggleUserStatus = async (id, isActive) => {
    const action = isActive ? 'deactivate' : 'activate';
    if (window.confirm(`Are you sure you want to ${action} this employee?`)) {
      try {
        const response = isActive
          ? await adminApi.deactivateUser(id)
          : await adminApi.activateUser(id);
        if (response.success) {
          toast.success(`Employee ${isActive ? 'deactivated' : 'activated'} successfully`);
          fetchData();
        }
      } catch (error) {
        console.error(`Error toggling status:`, error);
        toast.error(`Failed to ${action} employee`);
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
      } else if (type === 'job') {
        response = await adminApi.updateJobPermission(id, !currentValue);
      }
      if (response && response.success) {
        toast.success('Permissions updated successfully!');
        fetchData();
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Failed to update employee permissions');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to permanently delete this employee? This will unassign all their leads/tasks.')) {
      try {
        const response = await adminApi.deleteUser(userId);
        if (response.success) {
          toast.success('Employee permanently deleted');
          fetchData();
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('Failed to delete employee');
      }
    }
  };

  const getPerfStats = (fullName) => {
    const stats = performance.find(p => p._id === fullName);
    if (!stats) return { leads: 0, won: 0, lost: 0, rate: 0 };
    const rate = stats.leads ? Math.round((stats.won / stats.leads) * 100) : 0;
    return { ...stats, rate };
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = selectedDept === 'ALL' || user.department === selectedDept;

    return matchesSearch && matchesDept;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#FBF7EF]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C99B38]"></div>
          <p className="text-xs tracking-widest uppercase font-serif text-[#0B2D5B] opacity-70">Cataloging Global HR Assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#0B2D5B] px-4 sm:px-8 py-8 space-y-8 font-sans antialiased">
      
      {/* Header Deck */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#C99B38]/10 pb-6 gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#C99B38] font-bold">Personnel Infrastructure</span>
          <h1 className="text-3xl font-serif text-[#0B2D5B] font-normal tracking-wide mt-1">Employees & Performance</h1>
          <p className="text-sm text-gray-500 font-light mt-0.5">Manage system accounts, configure localized operational access, and track live pipeline conversions.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#0B2D5B] hover:bg-[#C99B38] text-white text-xs uppercase tracking-wider font-semibold px-5 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300 shadow-md active:scale-98"
        >
          <FiUserPlus size={14} />
          <span>Add Strategic Employee</span>
        </button>
      </div>

      {/* Control Filters and Intelligence Search */}
      <div className="bg-white p-4 rounded-xl border border-[#C99B38]/10 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search operator by full name, registration token, or corporate email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] focus:ring-1 focus:ring-[#C99B38] rounded-lg outline-none text-sm transition text-[#0B2D5B]"
          />
        </div>

        <div className="w-full md:w-72 flex items-center gap-2">
          <FiFilter className="text-gray-400 shrink-0" size={16} />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] rounded-lg outline-none text-sm cursor-pointer text-[#0B2D5B]"
          >
            <option value="ALL">All Trading Sectors</option>
            {departmentOptions.map(dept => (
              <option key={dept.value} value={dept.value}>{dept.label} Desk</option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Access Department Horizontal Filter Row */}
      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none border-b border-gray-100">
        <button
          onClick={() => setSelectedDept('ALL')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider shrink-0 transition-all duration-200 ${
            selectedDept === 'ALL'
              ? 'bg-[#0B2D5B] text-white shadow-sm'
              : 'bg-white text-gray-500 border border-gray-200/60 hover:border-[#C99B38]/40 hover:text-[#0B2D5B]'
          }`}
        >
          All Clusters ({users.length})
        </button>
        {departmentOptions.map(dept => {
          const count = users.filter(u => u.department === dept.value).length;
          return (
            <button
              key={dept.value}
              onClick={() => setSelectedDept(dept.value)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider shrink-0 transition-all duration-200 ${
                selectedDept === dept.value
                  ? 'bg-[#0B2D5B] text-white shadow-sm'
                  : 'bg-white text-gray-500 border border-gray-200/60 hover:border-[#C99B38]/40 hover:text-[#0B2D5B]'
              }`}
            >
              {dept.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Core Operational Ledger Table */}
      <div className="bg-white rounded-xl border border-[#C99B38]/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0B2D5B] text-white text-[11px] uppercase tracking-wider">
                <th className="py-4 px-6 font-medium">Employee Operator</th>
                <th className="py-4 px-6 font-medium">Sector Deployment</th>
                <th className="py-4 px-6 text-center font-medium">Operational Status</th>
                <th className="py-4 px-6 font-medium">Security Access Permissions</th>
                <th className="py-4 px-6 font-medium">Pipeline Metrics</th>
                <th className="py-4 px-6 text-center font-medium">Purge Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-16 text-xs uppercase tracking-widest text-gray-400 bg-[#FBF7EF]/10">
                    No verified operators found matching the active cluster matrices.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((emp) => {
                  const perf = getPerfStats(emp.fullName);
                  return (
                    <tr key={emp._id} className="hover:bg-[#FBF7EF]/40 transition duration-150">
                      
                      {/* Identity Column */}
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <div className="font-serif text-[#0B2D5B] font-medium text-base">{emp.fullName}</div>
                          <div className="text-xs font-mono text-gray-400 font-medium">ID Token: {emp.employeeId}</div>
                          <div className="text-xs text-gray-500 font-light">{emp.email}</div>
                        </div>
                      </td>

                      {/* Department and Structural Role */}
                      <td className="py-4 px-6">
                        <div className="space-y-1.5">
                          <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-[#0B2D5B]/5 text-[#0B2D5B]">
                            {emp.department} Sector
                          </span>
                          <div className="text-xs text-gray-500 font-medium tracking-wide pl-0.5">{emp.role}</div>
                        </div>
                      </td>

                      {/* Interactive Toggle Pill */}
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => toggleUserStatus(emp._id, emp.isActive)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border transition-all ${
                            emp.isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100/40'
                              : 'bg-rose-50 text-rose-800 border-rose-200/80 hover:bg-rose-100/40'
                          }`}
                          title={emp.isActive ? "Click to Revoke Authorization" : "Click to Grant Access"}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${emp.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {emp.isActive ? 'Authorized' : 'Suspended'}
                        </button>
                      </td>

                      {/* Granular Permissions Mapping Grid */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          
                          <label className="inline-flex items-center cursor-pointer text-[11px] font-medium text-gray-600 gap-2 hover:text-[#0B2D5B]">
                            <input
                              type="checkbox"
                              checked={emp.productUploadPermission || false}
                              onChange={() => togglePermission(emp._id, 'upload', emp.productUploadPermission)}
                              className="rounded text-[#0B2D5B] focus:ring-[#C99B38] border-gray-300 w-3.5 h-3.5 cursor-pointer accent-[#0B2D5B]"
                            />
                            <span className="flex items-center gap-1">
                              <FiPackage className="text-gray-400" size={12} />
                              Product Listing Authority
                            </span>
                          </label>

                          <label className="inline-flex items-center cursor-pointer text-[11px] font-medium text-gray-600 gap-2 hover:text-[#0B2D5B]">
                            <input
                              type="checkbox"
                              checked={emp.exportPermission || false}
                              onChange={() => togglePermission(emp._id, 'export', emp.exportPermission)}
                              className="rounded text-[#0B2D5B] focus:ring-[#C99B38] border-gray-300 w-3.5 h-3.5 cursor-pointer accent-[#0B2D5B]"
                            />
                            <span className="flex items-center gap-1">
                              <FiDatabase className="text-gray-400" size={12} />
                              Database Export Rights
                            </span>
                          </label>

                          <label className="inline-flex items-center cursor-pointer text-[11px] font-medium text-gray-600 gap-2 hover:text-[#0B2D5B]">
                            <input
                              type="checkbox"
                              checked={emp.jobPermission || false}
                              onChange={() => togglePermission(emp._id, 'job', emp.jobPermission)}
                              className="rounded text-[#0B2D5B] focus:ring-[#C99B38] border-gray-300 w-3.5 h-3.5 cursor-pointer accent-[#0B2D5B]"
                            />
                            <span className="flex items-center gap-1">
                              <FiBriefcase className="text-gray-400" size={12} />
                              Careers Node Access
                            </span>
                          </label>

                        </div>
                      </td>

                      {/* Performance Indicators & Dynamic Trackers */}
                      <td className="py-4 px-6">
                        <div className="space-y-2 max-w-[160px]">
                          <div className="flex justify-between items-center text-[11px] text-gray-500 font-medium">
                            <span>Leads: <strong className="text-[#0B2D5B]">{perf.leads}</strong></span>
                            <span className="text-emerald-700">Won: {perf.won}</span>
                          </div>

                          <div className="w-full bg-gray-100 rounded-full h-[4px] overflow-hidden">
                            <div
                              className="bg-[#C99B38] h-full rounded-full transition-all duration-500"
                              style={{ width: `${perf.rate}%` }}
                            ></div>
                          </div>
                          
                          <div className="flex items-center gap-1 text-[10px] text-[#0B2D5B] tracking-wider font-bold uppercase">
                            <FiTrendingUp className="text-[#C99B38]" size={12} />
                            <span>{perf.rate}% Conversion Matrix</span>
                          </div>
                        </div>
                      </td>

                      {/* Action Triggers */}
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleDeleteUser(emp._id)}
                          className="text-gray-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50/50 transition duration-200"
                          title="Purge Operator Permanently"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Layer Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-[#0B2D5B]/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md border border-[#C99B38]/20 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-3">
                <h2 className="text-base font-serif text-[#0B2D5B] tracking-wide uppercase">Provision New Operator Profile</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 font-light text-xl"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                
                <div>
                  <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">
                    Employee Registration ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    placeholder="e.g. ITO-ENG-402"
                    className="w-full px-3 py-2 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none text-[#0B2D5B]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Vikramaditya Singh"
                    className="w-full px-3 py-2 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none text-[#0B2D5B]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">
                    Corporate Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. v.singh@indiatradeoverseas.com"
                    className="w-full px-3 py-2 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none text-[#0B2D5B]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">
                    Secured Telephony Contact
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none text-[#0B2D5B]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">
                    Initial System Passphrase *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none text-[#0B2D5B]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">
                      System Role *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none cursor-pointer text-[#0B2D5B]"
                    >
                      {roleOptions.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">
                      Department Cluster *
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none cursor-pointer text-[#0B2D5B]"
                    >
                      {departmentOptions.map(dept => (
                        <option key={dept.value} value={dept.value}>{dept.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#0B2D5B] hover:bg-[#C99B38] text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-md"
                  >
                    Commit Secure Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300"
                  >
                    Cancel
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}