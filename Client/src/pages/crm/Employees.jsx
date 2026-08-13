import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
  FiXCircle,
  FiUser,
  FiEdit,
  FiEye,
  FiShield
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin';


export default function Employees() {
  const [searchParams] = useSearchParams();
  const deptParam = searchParams.get('dept');
  const roleParam = searchParams.get('role');

  const [users, setUsers] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState(null);

  // Profile Master Data persistence
  const [profilesData, setProfilesData] = useState(() => {
    return JSON.parse(localStorage.getItem('hr_employee_profiles_master')) || {};
  });

  useEffect(() => {
    localStorage.setItem('hr_employee_profiles_master', JSON.stringify(profilesData));
  }, [profilesData]);

  const getEmployeeProfile = (empId) => {
    const defaults = {
      dob: '',
      bloodGroup: '',
      emergencyContact: '',
      currentAddress: '',
      permanentAddress: '',
      doj: '',
      reportingManager: '',
      employmentStatus: 'Probation',
      aadhaarVerified: false,
      panVerified: false,
      degreeVerified: false,
      mobileVerified: false,
      emailVerified: false,
      fullNameOverride: '',
      phoneOverride: '',
      roleOverride: '',
      departmentOverride: '',
      bankName: '',
      bankAccount: '',
      bankIFSC: '',
      aadhaar: '',
      photo: ''
    };
    return { ...defaults, ...(profilesData[empId] || {}) };
  };

  const handleUpdateProfile = (empId, fields) => {
    const updated = {
      ...profilesData,
      [empId]: {
        ...getEmployeeProfile(empId),
        ...fields
      }
    };
    setProfilesData(updated);
    toast.success('Employee profile master data updated! 💾');
  };

  const handlePhotoUpload = (empId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      handleUpdateProfile(empId, { photo: e.target.result });
      toast.success('Profile picture uploaded successfully! 📸');
    };
    reader.readAsDataURL(file);
  };

  const getEmployeePhoto = (empId, fullName) => {
    if (profilesData[empId]?.photo) {
      return profilesData[empId].photo;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || "User")}&background=1e293b&color=c89a54&bold=true&size=128`;
  };


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

  useEffect(() => {
    if (deptParam) {
      setSelectedDept(deptParam.toUpperCase());
    } else {
      setSelectedDept('ALL');
    }
    if (roleParam) {
      setSelectedRole(roleParam.toUpperCase());
    } else {
      setSelectedRole('ALL');
    }
  }, [deptParam, roleParam]);

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
    const matchesRole = selectedRole === 'ALL' || user.role === selectedRole;

    return matchesSearch && matchesDept && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[var(--crm-bg)]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--crm-heading)]"></div>
          <p className="text-xs tracking-widest uppercase font-serif text-[var(--crm-ink-soft)] opacity-70">Cataloging Global HR Assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--crm-bg)] text-[var(--crm-ink-soft)] px-4 sm:px-8 py-8 space-y-8 font-sans antialiased">

      {/* Header Deck */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[var(--crm-ink-soft)]/10 pb-6 gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold">Personnel Infrastructure</span>
          <h1 className="text-3xl font-serif text-[var(--crm-heading)] font-normal tracking-wide mt-1">Employees & Performance</h1>
          <p className="text-sm text-[var(--crm-ink-faint)] font-light mt-0.5">Manage system accounts, configure localized operational access, and track live pipeline conversions.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[var(--crm-heading)] hover:bg-[var(--crm-ink-soft)] text-[var(--crm-bg-sunken)] text-xs uppercase tracking-wider font-semibold px-5 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300 shadow-md active:scale-98"
        >
          <FiUserPlus size={14} />
          <span>Add Strategic Employee</span>
        </button>
      </div>

      {/* Control Filters and Intelligence Search */}
      <div className="bg-[var(--crm-bg-raised)]/20 p-4 rounded-xl border border-[var(--crm-ink-soft)]/15 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--crm-ink-faint)]" size={16} />
          <input
            type="text"
            placeholder="Search operator by full name, registration token, or corporate email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 focus:ring-1 focus:ring-[var(--crm-heading)]/20 rounded-lg outline-none text-sm transition text-[var(--crm-heading)]"
          />
        </div>

        <div className="w-full md:w-72 flex items-center gap-2">
          <FiFilter className="text-[var(--crm-ink-faint)] shrink-0" size={16} />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full px-3 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 rounded-lg outline-none text-sm cursor-pointer text-[var(--crm-heading)]"
          >
            <option value="ALL">All Trading Sectors</option>
            {departmentOptions.map(dept => (
              <option key={dept.value} value={dept.value}>{dept.label} Desk</option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Access Department Horizontal Filter Row */}
      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none border-b border-[var(--crm-ink-soft)]/10">
        <button
          onClick={() => setSelectedDept('ALL')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider shrink-0 transition-all duration-200 ${
            selectedDept === 'ALL'
              ? 'bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] shadow-sm'
              : 'bg-[var(--crm-bg)] text-[var(--crm-ink-faint)] border border-[var(--crm-ink-soft)]/20 hover:border-[var(--crm-heading)]/40 hover:text-[var(--crm-ink-soft)]'
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
                  ? 'bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] shadow-sm'
                  : 'bg-[var(--crm-bg)] text-[var(--crm-ink-faint)] border border-[var(--crm-ink-soft)]/20 hover:border-[var(--crm-heading)]/40 hover:text-[var(--crm-ink-soft)]'
              }`}
            >
              {dept.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Core Operational Ledger Table */}
      <div className="bg-[var(--crm-bg-raised)]/10 rounded-xl border border-[var(--crm-ink-soft)]/15 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[11px] uppercase tracking-wider">
                <th className="py-4 px-6 font-medium">Employee Operator</th>
                <th className="py-4 px-6 font-medium">Sector Deployment</th>
                <th className="py-4 px-6 text-center font-medium">Operational Status</th>
                <th className="py-4 px-6 font-medium">Security Access Permissions</th>
                <th className="py-4 px-6 font-medium">Pipeline Metrics</th>
                <th className="py-4 px-6 text-center font-medium">Purge Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--crm-ink-soft)]/10 text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-16 text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] bg-[var(--crm-bg)]/40">
                    No verified operators found matching the active cluster matrices.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((emp) => {
                  const perf = getPerfStats(emp.fullName);
                  const profile = getEmployeeProfile(emp.employeeId);
                  const displayName = profile.fullNameOverride || emp.fullName;
                  const displayPhone = profile.phoneOverride || emp.phone || 'N/A';
                  const displayRole = profile.roleOverride || emp.role;
                  const displayDept = profile.departmentOverride || emp.department || 'HQ';
                  const displayStatus = profile.employmentStatus || 'Probation';
                  return (
                    <tr key={emp._id} className="hover:bg-[var(--crm-bg-raised)]/40 transition duration-150">

                      {/* Identity Column */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3 text-left">
                          <div className="w-9 h-9 rounded-full overflow-hidden border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] shrink-0">
                            <img src={getEmployeePhoto(emp.employeeId, displayName)} alt={displayName} className="w-full h-full object-cover" />
                          </div>
                          <div className="space-y-0.5">
                            <div className="font-serif text-[var(--crm-heading)] font-medium text-base">{displayName}</div>
                            <div className="text-xs font-mono text-[var(--crm-ink-faint)] font-medium">ID: {emp.employeeId} • Phone: {displayPhone}</div>
                            <div className="text-xs text-[var(--crm-ink-faint)] font-light">{emp.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Department and Structural Role */}
                      <td className="py-4 px-6 text-left">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="inline-block px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/10 text-[var(--crm-ink-soft)]">
                              {displayDept} Sector
                            </span>
                            <span className={`inline-block px-1.5 py-0.5 text-[7px] font-mono font-bold tracking-wider uppercase rounded border ${
                              displayStatus === 'Temporary' 
                                ? 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/25' 
                                : displayStatus === 'Probation' 
                                ? 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/25' 
                                : 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/25'
                            }`}>
                              {displayStatus}
                            </span>
                          </div>
                          <div className="text-xs text-[var(--crm-ink-faint)] font-medium tracking-wide pl-0.5">{displayRole}</div>
                        </div>
                      </td>

                      {/* Interactive Toggle Pill */}
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => toggleUserStatus(emp._id, emp.isActive)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border transition-all ${
                            emp.isActive
                              ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20 hover:bg-[var(--crm-positive-bg)]'
                              : 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/20 hover:bg-[var(--crm-danger-bg)]'
                          }`}
                          title={emp.isActive ? "Click to Revoke Authorization" : "Click to Grant Access"}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${emp.isActive ? 'bg-[var(--crm-positive)]' : 'bg-[var(--crm-danger)]'}`}></span>
                          {emp.isActive ? 'Authorized' : 'Suspended'}
                        </button>
                      </td>

                      {/* Granular Permissions Mapping Grid */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-2 min-w-[200px]">

                          <label className="inline-flex items-center cursor-pointer text-[11px] font-medium text-[var(--crm-ink-faint)] gap-2 hover:text-[var(--crm-ink-soft)]">
                            <input
                              type="checkbox"
                              checked={emp.productUploadPermission || false}
                              onChange={() => togglePermission(emp._id, 'upload', emp.productUploadPermission)}
                              className="rounded text-[var(--crm-heading)] focus:ring-[var(--crm-heading)]/40 border-[var(--crm-ink-soft)]/30 w-3.5 h-3.5 cursor-pointer accent-[var(--crm-heading)]"
                            />
                            <span className="flex items-center gap-1">
                              <FiPackage className="text-[var(--crm-ink-faint)]" size={12} />
                              Product Listing Authority
                            </span>
                          </label>

                          <label className="inline-flex items-center cursor-pointer text-[11px] font-medium text-[var(--crm-ink-faint)] gap-2 hover:text-[var(--crm-ink-soft)]">
                            <input
                              type="checkbox"
                              checked={emp.exportPermission || false}
                              onChange={() => togglePermission(emp._id, 'export', emp.exportPermission)}
                              className="rounded text-[var(--crm-heading)] focus:ring-[var(--crm-heading)]/40 border-[var(--crm-ink-soft)]/30 w-3.5 h-3.5 cursor-pointer accent-[var(--crm-heading)]"
                            />
                            <span className="flex items-center gap-1">
                              <FiDatabase className="text-[var(--crm-ink-faint)]" size={12} />
                              Database Export Rights
                            </span>
                          </label>

                          <label className="inline-flex items-center cursor-pointer text-[11px] font-medium text-[var(--crm-ink-faint)] gap-2 hover:text-[var(--crm-ink-soft)]">
                            <input
                              type="checkbox"
                              checked={emp.jobPermission || false}
                              onChange={() => togglePermission(emp._id, 'job', emp.jobPermission)}
                              className="rounded text-[var(--crm-heading)] focus:ring-[var(--crm-heading)]/40 border-[var(--crm-ink-soft)]/30 w-3.5 h-3.5 cursor-pointer accent-[var(--crm-heading)]"
                            />
                            <span className="flex items-center gap-1">
                              <FiBriefcase className="text-[var(--crm-ink-faint)]" size={12} />
                              Careers Node Access
                            </span>
                          </label>

                        </div>
                      </td>

                      {/* Performance Indicators & Dynamic Trackers */}
                      <td className="py-4 px-6">
                        <div className="space-y-2 max-w-[160px]">
                          <div className="flex justify-between items-center text-[11px] text-[var(--crm-ink-faint)] font-medium">
                            <span>Leads: <strong className="text-[var(--crm-heading)]">{perf.leads}</strong></span>
                            <span className="text-[var(--crm-positive)]">Won: {perf.won}</span>
                          </div>

                          <div className="w-full bg-[#2B3440] rounded-full h-[4px] overflow-hidden">
                            <div
                              className="bg-[var(--crm-info)] h-full rounded-full transition-all duration-500"
                              style={{ width: `${perf.rate}%` }}
                            ></div>
                          </div>

                          <div className="flex items-center gap-1 text-[10px] text-[var(--crm-info)] tracking-wider font-bold uppercase">
                            <FiTrendingUp className="text-[var(--crm-info)]" size={12} />
                            <span>{perf.rate}% Conversion Matrix</span>
                          </div>
                        </div>
                      </td>

                      {/* Action Triggers */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingEmpId(emp._id)}
                            className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-accent)] p-2 rounded-lg hover:bg-[var(--crm-bg)] transition duration-200 cursor-pointer"
                            title="Edit Details"
                          >
                            <FiEdit size={14} />
                          </button>
                          <Link
                            to={`/crm/employees/${emp._id}`}
                            className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] p-2 rounded-lg hover:bg-[var(--crm-bg)] transition duration-200 inline-flex"
                            title="View Full Profile"
                          >
                            <FiUser size={15} />
                          </Link>
                          <button
                            onClick={() => handleDeleteUser(emp._id)}
                            className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-danger)] p-2 rounded-lg hover:bg-[var(--crm-danger-bg)] transition duration-200"
                            title="Purge Operator Permanently"
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </div>
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
          <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-[var(--crm-bg-raised)] rounded-xl p-6 w-full max-w-md border border-[var(--crm-ink-soft)]/20 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6 border-b border-[var(--crm-ink-soft)]/10 pb-3">
                <h2 className="text-base font-serif text-[var(--crm-heading)] tracking-wide uppercase">Provision New Operator Profile</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-ink-soft)] font-light text-xl"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">

                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">
                    Employee Registration ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    placeholder="e.g. ITO-ENG-402"
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-sm rounded-lg outline-none text-[var(--crm-heading)]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Vikramaditya Singh"
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-sm rounded-lg outline-none text-[var(--crm-heading)]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">
                    Corporate Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. v.singh@indiatradeoverseas.com"
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-sm rounded-lg outline-none text-[var(--crm-heading)]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">
                    Secured Telephony Contact
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-sm rounded-lg outline-none text-[var(--crm-heading)]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">
                    Initial System Passphrase *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-sm rounded-lg outline-none text-[var(--crm-heading)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">
                      System Role *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-sm rounded-lg outline-none cursor-pointer text-[var(--crm-heading)]"
                    >
                      {roleOptions.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">
                      Department Cluster *
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-sm rounded-lg outline-none cursor-pointer text-[var(--crm-heading)]"
                    >
                      {departmentOptions.map(dept => (
                        <option key={dept.value} value={dept.value}>{dept.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4 border-t border-[var(--crm-ink-soft)]/10">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[var(--crm-heading)] hover:bg-[var(--crm-ink-soft)] text-[var(--crm-bg-sunken)] rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-md"
                  >
                    Commit Secure Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 hover:bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300"
                  >
                    Cancel
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Employee Details Modal */}
      {editingEmpId && (() => {
        const emp = users.find(e => e._id === editingEmpId);
        if (!emp) return null;
        const profile = getEmployeeProfile(emp.employeeId);
        const displayName = profile.fullNameOverride || emp.fullName;
        const photo = getEmployeePhoto(emp.employeeId, displayName);
        return (
          <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--crm-bg-raised)] rounded-sm w-full max-w-3xl border border-[var(--crm-line)] shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col text-left">
              {/* Modal Header */}
              <div className="relative border-b border-[var(--crm-line)] p-6 bg-[var(--crm-bg-sunken)]/40 flex items-start gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border border-[var(--crm-line)] shrink-0 bg-[var(--crm-bg-sunken)]">
                  <img src={photo} alt={displayName} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 space-y-1">
                  <span className="text-[8px] font-mono font-bold tracking-widest bg-[var(--crm-accent-bg)] px-2 py-0.5 border border-[var(--crm-accent)]/20 text-[var(--crm-accent)] uppercase rounded-sm inline-block">
                    {emp.employeeId}
                  </span>
                  <h2 className="font-serif text-lg text-[var(--crm-heading)] leading-none">{displayName}</h2>
                  <p className="text-[10px] text-[var(--crm-ink-faint)] font-mono">{emp.email}</p>
                </div>
                <button
                  onClick={() => setEditingEmpId(null)}
                  className="text-[var(--crm-ink-faint)] hover:text-white font-bold text-sm bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] w-7 h-7 flex items-center justify-center rounded-sm transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)] space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[11px] font-sans">
                  
                  {/* Personal / Identification Column */}
                  <div className="space-y-3">
                    <h5 className="text-[9px] font-mono font-bold text-[var(--crm-accent)] uppercase tracking-wider border-b border-[var(--crm-line)] pb-1 flex items-center gap-1.5">
                      <FiUser size={12} className="text-[var(--crm-accent)]" /> Personal & Photo
                    </h5>
                    <div className="space-y-2">
                      <div className="flex flex-col gap-1.5 items-center pb-3 border-b border-[var(--crm-line)]">
                        <div className="w-20 h-20 rounded-full overflow-hidden border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] relative group">
                          <img src={photo} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <label className="text-[8px] font-mono font-bold uppercase tracking-wider bg-[var(--crm-accent-bg)] border border-[var(--crm-accent)] text-[var(--crm-accent)] px-2.5 py-1 rounded-sm cursor-pointer hover:bg-[var(--crm-accent)] hover:text-[var(--crm-bg-sunken)] transition-all text-center">
                          Change Photo
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handlePhotoUpload(emp.employeeId, e.target.files[0])}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase tracking-wider font-mono text-[var(--crm-ink-faint)]">Employee Name *</span>
                        <input
                          type="text"
                          value={profile.fullNameOverride !== undefined && profile.fullNameOverride !== '' ? profile.fullNameOverride : emp.fullName}
                          onChange={(e) => handleUpdateProfile(emp.employeeId, { fullNameOverride: e.target.value })}
                          className="bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 text-[var(--crm-heading)] px-2 py-1.5 rounded-sm w-full outline-none text-[11px]"
                          placeholder="Full Name"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase tracking-wider font-mono text-[var(--crm-ink-faint)]">Phone Number *</span>
                        <input
                          type="text"
                          value={profile.phoneOverride !== undefined && profile.phoneOverride !== '' ? profile.phoneOverride : (emp.phone || '')}
                          onChange={(e) => handleUpdateProfile(emp.employeeId, { phoneOverride: e.target.value })}
                          className="bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 text-[var(--crm-heading)] px-2 py-1.5 rounded-sm w-full outline-none text-[11px]"
                          placeholder="Phone Number"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Status & Access Column */}
                  <div className="space-y-3">
                    <h5 className="text-[9px] font-mono font-bold text-[var(--crm-accent)] uppercase tracking-wider border-b border-[var(--crm-line)] pb-1 flex items-center gap-1.5">
                      <FiBriefcase size={12} className="text-[var(--crm-accent)]" /> Role & Status
                    </h5>
                    <div className="space-y-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase tracking-wider font-mono text-[var(--crm-ink-faint)]">Corporate Role *</span>
                        <select
                          value={profile.roleOverride || emp.role}
                          onChange={async (e) => {
                            const nextRole = e.target.value;
                            handleUpdateProfile(emp.employeeId, { roleOverride: nextRole });
                            try {
                              await adminApi.updateUserRole(emp._id, nextRole);
                              toast.success(`Role synced to database! 🚀`);
                              fetchData();
                            } catch (err) {
                              console.error(err);
                              toast.error('Failed to sync role to database');
                            }
                          }}
                          className="bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 text-[var(--crm-heading)] px-2 py-1.5 rounded-sm w-full outline-none text-[11px] cursor-pointer"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="MANAGER">MANAGER</option>
                          <option value="SALES">SALES</option>
                          <option value="PROCUREMENT">PROCUREMENT</option>
                          <option value="ACCOUNTS">ACCOUNTS</option>
                          <option value="HR">HR</option>
                          <option value="IT">IT</option>
                          <option value="FINANCE">FINANCE</option>
                          <option value="SOFTWARE_ENGINEER">SOFTWARE ENGINEER</option>
                          <option value="SYSTEM">SYSTEM</option>
                          <option value="AI">AI</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase tracking-wider font-mono text-[var(--crm-ink-faint)]">Department *</span>
                        <select
                          value={profile.departmentOverride || emp.department || 'HQ'}
                          onChange={async (e) => {
                            const nextDept = e.target.value;
                            handleUpdateProfile(emp.employeeId, { departmentOverride: nextDept });
                            try {
                              await adminApi.updateUserDepartment(emp._id, nextDept);
                              toast.success(`Department synced to database! 📁`);
                              fetchData();
                            } catch (err) {
                              console.error(err);
                              toast.error('Failed to sync department to database');
                            }
                          }}
                          className="bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 text-[var(--crm-heading)] px-2 py-1.5 rounded-sm w-full outline-none text-[11px] cursor-pointer"
                        >
                          <option value="STONE">STONE</option>
                          <option value="COAL">COAL</option>
                          <option value="TEA">TEA</option>
                          <option value="RICE">RICE</option>
                          <option value="TRANSPORT">TRANSPORT</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="IT">IT</option>
                          <option value="PROCUREMENT">PROCUREMENT</option>
                          <option value="ACCOUNTS">ACCOUNTS</option>
                          <option value="HR">HR</option>
                          <option value="SALES">SALES</option>
                          <option value="CRM">CRM</option>
                          <option value="FINANCE">FINANCE</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase tracking-wider font-mono text-[var(--crm-ink-faint)]">Employment Status *</span>
                        <select
                          value={profile.employmentStatus || 'Probation'}
                          onChange={(e) => handleUpdateProfile(emp.employeeId, { employmentStatus: e.target.value })}
                          className="bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 text-[var(--crm-heading)] px-2 py-1.5 rounded-sm w-full outline-none text-[11px] cursor-pointer"
                        >
                          <option value="Full-time">Full-time</option>
                          <option value="Temporary">Temporary</option>
                          <option value="Probation">Probation</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Compliance & Financial Column */}
                  <div className="space-y-3">
                    <h5 className="text-[9px] font-mono font-bold text-[var(--crm-accent)] uppercase tracking-wider border-b border-[var(--crm-line)] pb-1 flex items-center gap-1.5">
                      <FiShield size={12} className="text-[var(--crm-accent)]" /> Compliance & Bank
                    </h5>
                    <div className="space-y-2">
                      <div className="space-y-2 pb-3 border-b border-[var(--crm-line)]">
                        <h6 className="text-[9px] font-mono font-bold text-[var(--crm-accent)] uppercase tracking-wider">Aadhaar details</h6>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] uppercase tracking-wider font-mono text-[var(--crm-ink-faint)]">Aadhaar Card Number</span>
                          <input
                            type="text"
                            value={profile.aadhaar || ''}
                            onChange={(e) => handleUpdateProfile(emp.employeeId, { aadhaar: e.target.value })}
                            className="bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 text-[var(--crm-heading)] px-2 py-1.5 rounded-sm w-full outline-none text-[11px]"
                            placeholder="12-digit UIDAI Number"
                          />
                        </div>
                        <div className="flex justify-between items-center pt-1.5">
                          <span className="text-[9px] uppercase tracking-wider font-mono text-[var(--crm-ink-faint)]">Verification status</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateProfile(emp.employeeId, { aadhaarVerified: !profile.aadhaarVerified })}
                            className={`px-2 py-1 text-[9px] font-mono font-bold rounded-sm border transition-all cursor-pointer ${
                              profile.aadhaarVerified
                                ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/25'
                                : 'bg-transparent text-[var(--crm-ink-faint)] border-[var(--crm-line)] hover:border-[var(--crm-accent)] hover:text-white'
                            }`}
                          >
                            {profile.aadhaarVerified ? 'Verified ✓' : 'Verify'}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2 pt-2">
                        <h6 className="text-[9px] font-mono font-bold text-[var(--crm-accent)] uppercase tracking-wider">Bank Details</h6>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] uppercase tracking-wider font-mono text-[var(--crm-ink-faint)]">Bank Name</span>
                          <input
                            type="text"
                            value={profile.bankName || ''}
                            onChange={(e) => handleUpdateProfile(emp.employeeId, { bankName: e.target.value })}
                            className="bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 text-[var(--crm-heading)] px-2 py-1.5 rounded-sm w-full outline-none text-[11px]"
                            placeholder="e.g. State Bank of India"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] uppercase tracking-wider font-mono text-[var(--crm-ink-faint)]">Account Number</span>
                          <input
                            type="text"
                            value={profile.bankAccount || ''}
                            onChange={(e) => handleUpdateProfile(emp.employeeId, { bankAccount: e.target.value })}
                            className="bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 text-[var(--crm-heading)] px-2 py-1.5 rounded-sm w-full outline-none text-[11px]"
                            placeholder="Account Number"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] uppercase tracking-wider font-mono text-[var(--crm-ink-faint)]">IFSC Code</span>
                          <input
                            type="text"
                            value={profile.bankIFSC || ''}
                            onChange={(e) => handleUpdateProfile(emp.employeeId, { bankIFSC: e.target.value })}
                            className="bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 text-[var(--crm-heading)] px-2 py-1.5 rounded-sm w-full outline-none text-[11px] uppercase"
                            placeholder="IFSC Code"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
