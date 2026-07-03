import React, { useState, useEffect } from 'react';
import {
  FiUserPlus,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiBriefcase,
  FiShield,
  FiTrendingUp,
  FiDatabase,
  FiPackage,
  FiSearch,
  FiFilter
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
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees & Performance</h1>
          <p className="text-gray-600 mt-1">Manage system accounts, configure listing permissions, and view conversion statistics.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center space-x-2 bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2.5 rounded-xl shadow-lg transition-transform active:scale-95"
        >
          <FiUserPlus size={18} />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Filter and Search Panel */}
      <div className="card p-4 bg-white shadow-sm border border-slate-100 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, ID, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        {/* Department filter dropdown */}
        <div className="w-full md:w-64 flex items-center gap-2">
          <FiFilter className="text-gray-400 shrink-0" />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            {departmentOptions.map(dept => (
              <option key={dept.value} value={dept.value}>{dept.label} Department</option>
            ))}
          </select>
        </div>
      </div>

      {/* Department Quick Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <button
          onClick={() => setSelectedDept('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider shrink-0 transition ${selectedDept === 'ALL'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
        >
          All ({users.length})
        </button>
        {departmentOptions.map(dept => {
          const count = users.filter(u => u.department === dept.value).length;
          return (
            <button
              key={dept.value}
              onClick={() => setSelectedDept(dept.value)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider shrink-0 transition ${selectedDept === dept.value
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
              {dept.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Employees Table List */}
      <div className="card shadow-sm border border-slate-100 rounded-2xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Department & Role</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Listing / Export Permissions</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Performance Metrics</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-500">
                    No employees found matching the filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((emp) => {
                  const perf = getPerfStats(emp.fullName);
                  return (
                    <tr key={emp._id} className="hover:bg-slate-50/40 transition-colors">
                      {/* Name & ID */}
                      <td className="py-4 px-6">
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">{emp.fullName}</div>
                          <div className="text-xs text-slate-400 mt-0.5">ID: {emp.employeeId}</div>
                          <div className="text-xs text-slate-400">{emp.email}</div>
                        </div>
                      </td>

                      {/* Department & Role */}
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-slate-100 text-slate-700">
                            {emp.department} Dept
                          </span>
                          <div className="text-xs font-medium text-slate-500 pl-1">{emp.role}</div>
                        </div>
                      </td>

                      {/* Status Toggle Switch */}
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => toggleUserStatus(emp._id, emp.isActive)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${emp.isActive
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100/70'
                            }`}
                          title={emp.isActive ? "Click to Deactivate" : "Click to Activate"}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${emp.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {emp.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Permissions Toggle Toggles */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-2">
                          {/* Product Upload Toggle */}
                          <label className="inline-flex items-center cursor-pointer text-xs font-medium text-slate-600 gap-2">
                            <input
                              type="checkbox"
                              checked={emp.productUploadPermission || false}
                              onChange={() => togglePermission(emp._id, 'upload', emp.productUploadPermission)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-4 h-4 cursor-pointer"
                            />
                            <span className="flex items-center gap-1">
                              <FiPackage className="text-slate-400" />
                              Product Listing
                            </span>
                          </label>

                          {/* Export Data Toggle */}
                          <label className="inline-flex items-center cursor-pointer text-xs font-medium text-slate-600 gap-2">
                            <input
                              type="checkbox"
                              checked={emp.exportPermission || false}
                              onChange={() => togglePermission(emp._id, 'export', emp.exportPermission)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-4 h-4 cursor-pointer"
                            />
                            <span className="flex items-center gap-1">
                              <FiDatabase className="text-slate-400" />
                              Export Database
                            </span>
                          </label>

                          {/* Job Posting Toggle */}
                          <label className="inline-flex items-center cursor-pointer text-xs font-medium text-slate-600 gap-2">
                            <input
                              type="checkbox"
                              checked={emp.jobPermission || false}
                              onChange={() => togglePermission(emp._id, 'job', emp.jobPermission)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-4 h-4 cursor-pointer"
                            />
                            <span className="flex items-center gap-1">
                              <FiBriefcase className="text-slate-400" />
                              Job Posting
                            </span>
                          </label>
                        </div>
                      </td>

                      {/* Performance Indicators */}
                      <td className="py-4 px-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-slate-500">Leads: <strong>{perf.leads}</strong></span>
                            <span className="text-emerald-600 font-semibold">Won: {perf.won}</span>
                          </div>

                          {/* Performance bar */}
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden max-w-[150px]">
                            <div
                              className="bg-indigo-600 h-1.5 rounded-full"
                              style={{ width: `${perf.rate}%` }}
                            ></div>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
                            <FiTrendingUp className="text-indigo-500" />
                            <span>{perf.rate}% Conversion</span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleDeleteUser(emp._id)}
                          className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50/50 transition"
                          title="Delete Employee Permanent"
                        >
                          <FiTrash2 size={16} />
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

      {/* Create Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-100 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800">Add New CRM Employee</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Employee ID *
                </label>
                <input
                  type="text"
                  required
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  placeholder="e.g. EMP-101"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Jane Smith"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. jane@company.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +1 555-123-4567"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    System Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {roleOptions.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Department *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {departmentOptions.map(dept => (
                      <option key={dept.value} value={dept.value}>{dept.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition"
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
