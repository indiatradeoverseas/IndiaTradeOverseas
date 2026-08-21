import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaUsers, 
  FaChartLine, 
  FaBuilding, 
  FaBullseye,
  FaBriefcase, 
  FaCalendarCheck, 
  FaUserCheck, 
  FaAngleDown, 
  FaFilter, 
  FaMagnifyingGlass, 
  FaUser,   
  FaCircleCheck, 
  FaCircleXmark, 
  FaChevronRight, 
  FaTriangleExclamation, 
  FaLock, 
  FaPlus,
  FaFileInvoiceDollar,
  FaUserPlus,
  FaVideo,
  FaCalendarDays,
  FaEnvelope,
  FaPhone,
  FaGraduationCap,
  FaLocationDot
} from 'react-icons/fa6';
import toast from 'react-hot-toast';

// Initial Mock Data
const initialEmployees = [
  { id: 'emp_1', employeeId: 'SAL03', name: 'Vikram Singh', role: 'Sales Manager', dept: 'SALES', status: 'Active', email: 'vikram.singh@company.com', phone: '9876543214', salary: 95000, joined: '2022-03-10' },
  { id: 'emp_2', employeeId: 'SAL01', name: 'Rahul Sharma', role: 'Sales Executive', dept: 'SALES', status: 'Active', email: 'rahul.sharma@company.com', phone: '9876543210', salary: 45000, joined: '2023-05-12' },
  { id: 'emp_3', employeeId: 'HR03', name: 'Sanjana Reddy', role: 'HR Manager', dept: 'HR', status: 'Active', email: 'sanjana.reddy@company.com', phone: '9876543215', salary: 80000, joined: '2022-09-11' },
  { id: 'emp_4', employeeId: 'EMP102', name: 'Ananya Patel', role: 'Sales Specialist', dept: 'STONE', status: 'On Leave', email: 'ananya.patel@company.com', phone: '9876543211', salary: 50000, joined: '2024-01-15' },
  { id: 'emp_5', employeeId: 'EMP103', name: 'Neha Gupta', role: 'Operations Assistant', dept: 'COAL', status: 'Active', email: 'neha.gupta@company.com', phone: '9876543212', salary: 38000, joined: '2024-02-18' },
  { id: 'emp_6', employeeId: 'EMP104', name: 'Arjun Reddy', role: 'Logistics Head', dept: 'TRANSPORT', status: 'On Leave', email: 'arjun.reddy@company.com', phone: '9876543213', salary: 70000, joined: '2023-11-20', pendingLWP: true },
  { id: 'emp_7', employeeId: 'IT03', name: 'Anand Mishra', role: 'IT Manager', dept: 'IT', status: 'Active', email: 'anand.mishra@company.com', phone: '9876543216', salary: 85000, joined: '2022-06-01' },
  { id: 'emp_8', employeeId: 'IT01', name: 'Suresh Iyer', role: 'Frontend Lead', dept: 'IT', status: 'Inactive', email: 'suresh.iyer@company.com', phone: '9876543217', salary: 65000, joined: '2023-01-15' }
];

const initialLeaves = [
  { id: 'lv_1', empId: 'emp_6', empName: 'Arjun Reddy', role: 'Logistics Head', dates: 'Aug 20 - Aug 25', days: 6, type: 'LWP (Leave Without Pay)', reason: 'Family medical emergency', overdue: true },
  { id: 'lv_2', empId: 'emp_4', empName: 'Ananya Patel', role: 'Sales Specialist', dates: 'Aug 24 - Aug 26', days: 3, type: 'Casual Leave', reason: 'Personal work', overdue: false },
  { id: 'lv_3', empId: 'emp_2', empName: 'Rahul Sharma', role: 'Sales Executive', dates: 'Aug 28 - Aug 29', days: 2, type: 'Earned Leave', reason: 'Out of town travel', overdue: false }
];

const initialHiring = [
  { id: 'hr_1', title: 'Sales Executive (Stone Vertical)', type: 'Full-time', status: 'Urgent' },
  { id: 'hr_2', title: 'HR Coordinator', type: 'Contract', status: 'Standard' },
  { id: 'hr_3', title: 'Senior Tea Sourcing Lead', type: 'Full-time', status: 'Urgent' },
  { id: 'hr_4', title: 'Transport Dispatch Operator', type: 'Full-time', status: 'Standard' }
];

const initialTargets = [
  { vertical: 'Stone', amount: 450, period: 'Q3 2026', assignedAt: '2026-07-01' },
  { vertical: 'Coal', amount: 800, period: 'Q3 2026', assignedAt: '2026-07-01' },
  { vertical: 'Rice', amount: 350, period: 'Q3 2026', assignedAt: '2026-07-01' }
];

export default function FounderDashboard() {
  // Navigation role switcher state: 'founder' | 'hr' | 'sales'
  const [currentRole, setCurrentRole] = useState('founder');
  
  // Dashboard Core State
  const [employees, setEmployees] = useState(initialEmployees);
  const [leaves, setLeaves] = useState(initialLeaves);
  const [hiring, setHiring] = useState(initialHiring);
  const [targets, setTargets] = useState(initialTargets);
  
  // Search / Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  
  // Modal toggles
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Form Inputs
  const [targetForm, setTargetForm] = useState({ vertical: 'Stone', amount: '', period: 'Q3 2026' });
  const [hiringForm, setHiringForm] = useState({ title: '', status: 'Standard' });

  // Stats derived from state
  const totalEmployeesCount = 142; // static base + local changes
  const activeCount = 128;
  const onLeaveCount = 9 - (3 - leaves.length); // Dynamic adjustments
  const inactiveCount = 5;

  // Q3 Sales target overall progress
  const q3TargetTotal = 18.4;
  const [q3TargetAchieved, setQ3TargetAchieved] = useState(13.2);

  // Set Sales Target Handler
  const handleAssignTarget = (e) => {
    e.preventDefault();
    if (!targetForm.amount || parseFloat(targetForm.amount) <= 0) {
      toast.error('Please enter a valid target amount.');
      return;
    }
    const newTarget = {
      vertical: targetForm.vertical,
      amount: parseFloat(targetForm.amount),
      period: targetForm.period,
      assignedAt: new Date().toISOString().slice(0, 10)
    };
    setTargets([newTarget, ...targets.filter(t => t.vertical !== targetForm.vertical)]);
    toast.success(`Sales target of ₹${targetForm.amount}L assigned to ${targetForm.vertical} team!`);
    setTargetForm({ ...targetForm, amount: '' });
  };

  // Add Hiring Job Handler
  const handlePostJob = (e) => {
    e.preventDefault();
    if (!hiringForm.title.trim()) {
      toast.error('Please enter a job title.');
      return;
    }
    const newJob = {
      id: `hr_${Date.now()}`,
      title: hiringForm.title,
      type: 'Full-time',
      status: hiringForm.status
    };
    setHiring([newJob, ...hiring]);
    toast.success(`Hiring position "${hiringForm.title}" posted successfully!`);
    setHiringForm({ title: '', status: 'Standard' });
  };

  // Leave approval action
  const handleLeaveDecision = (leaveId, decision) => {
    const targetLeave = leaves.find(l => l.id === leaveId);
    if (!targetLeave) return;

    if (decision === 'APPROVED') {
      toast.success(`Leave request approved for ${targetLeave.empName}!`);
      // Update employee status locally if they are in initial list
      setEmployees(prev => prev.map(emp => 
        emp.id === targetLeave.empId ? { ...emp, status: 'On Leave' } : emp
      ));
    } else {
      toast.error(`Leave request rejected for ${targetLeave.empName}.`);
    }
    setLeaves(prev => prev.filter(l => l.id !== leaveId));
  };

  // Switch role helper
  const handleRoleChange = (role) => {
    setCurrentRole(role);
    toast(`Switched perspective to: ${role === 'founder' ? 'Founder' : role === 'hr' ? 'HR Executive' : 'Sales Manager'} Dashboard`, {
      icon: '🔄',
      style: {
        background: '#0a1628',
        color: '#c9a84c',
        border: '1px solid #c9a84c'
      }
    });
  };

  // Execute Bulk Action Handler
  const handleExecuteBulkAction = (action) => {
    if (action === 'approve_all') {
      if (leaves.length === 0) {
        toast.error('No pending leaves to approve.');
        return;
      }
      leaves.forEach(l => {
        setEmployees(prev => prev.map(emp => 
          emp.id === l.empId ? { ...emp, status: 'On Leave' } : emp
        ));
      });
      setLeaves([]);
      toast.success('Approved all pending leave applications in bulk!');
    } else if (action === 'post_critical') {
      const criticalJob = {
        id: `hr_${Date.now()}`,
        title: 'Emergency Logistics Coordinator',
        type: 'Full-time',
        status: 'Urgent'
      };
      setHiring([criticalJob, ...hiring]);
      toast.success('Urgent job vacancy added to HR pipeline!');
    } else if (action === 'adjust_budgets') {
      toast.success('Budget matrices optimized for Q3 & Q4.');
    }
    setShowBulkModal(false);
  };

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === 'ALL' || emp.dept === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="min-h-screen bg-[#0a1628] text-slate-100 font-sans p-4 lg:p-8 selection:bg-[#c9a84c] selection:text-[#0a1628]">
      
      {/* ─── HEADER SECTION ─── */}
      <header className="border-b border-[#c9a84c]/20 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="text-left">
          <div className="flex items-center gap-3">
            <div className="w-3 h-8 bg-[#c9a84c] rounded-full"></div>
            <h1 className="text-2xl lg:text-3xl font-serif font-semibold tracking-wide text-slate-100">
              Founder Command Center
            </h1>
          </div>
          <p className="text-[#c9a84c] text-xs font-mono tracking-wider uppercase mt-1">
            Super Admin Access // Md Ramiz Raza Khan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Role Switcher */}
          <div className="relative inline-block w-full sm:w-64">
            <select
              value={currentRole}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full bg-[#112240] border border-[#c9a84c]/40 text-[#c9a84c] rounded-lg px-4 py-2 text-xs font-mono uppercase tracking-wider outline-none cursor-pointer focus:border-[#c9a84c] transition"
            >
              <option value="founder">Viewing as: Founder</option>
              <option value="hr">Viewing as: HR Executive Dashboard</option>
              <option value="sales">Viewing as: Sales Manager Dashboard</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c9a84c] pointer-events-none">
              <FaAngleDown size={14} />
            </div>
          </div>

          {/* Quick Header Stats */}
          <div className="hidden lg:flex items-center gap-4 text-xs font-mono border-l border-[#c9a84c]/20 pl-4">
            <div>
              <span className="text-slate-400">TOTAL CAPITA:</span>{' '}
              <strong className="text-[#c9a84c]">{totalEmployeesCount}</strong>
            </div>
            <div>
              <span className="text-slate-400">PENDING LEAVES:</span>{' '}
              <strong className="text-rose-400">{leaves.length}</strong>
            </div>
          </div>
        </div>
      </header>

      {/* ─── KEY METRICS ROW ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Metric 1: Total Employees */}
        <div className="bg-[#112240] border border-[#c9a84c]/20 rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-[#c9a84c]/50 transition duration-350">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-slate-100 group-hover:scale-110 transition duration-300">
            <FaUsers size={90} />
          </div>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">Workforce Strength</span>
              <h3 className="text-3xl font-serif text-slate-100 mt-1">{totalEmployeesCount}</h3>
            </div>
            <span className="p-3 bg-[#c9a84c]/10 text-[#c9a84c] rounded-lg">
              <FaUsers size={18} />
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-[10px] font-mono border-t border-slate-700/50 pt-3">
            <div>
              <span className="text-emerald-400 block">● Active</span>
              <strong>{activeCount}</strong>
            </div>
            <div>
              <span className="text-[#c9a84c] block">● Leave</span>
              <strong>{onLeaveCount}</strong>
            </div>
            <div>
              <span className="text-rose-400 block">● Inactive</span>
              <strong>{inactiveCount}</strong>
            </div>
          </div>
        </div>

        {/* Metric 2: Sales Target Q3 */}
        <div className="bg-[#112240] border border-[#c9a84c]/20 rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-[#c9a84c]/50 transition duration-350">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-slate-100 group-hover:scale-110 transition duration-300">
            <FaChartLine size={90} />
          </div>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">Q3 Target Progress</span>
              <h3 className="text-3xl font-serif text-[#c9a84c] mt-1">₹{q3TargetTotal}Cr</h3>
            </div>
            <span className="p-3 bg-[#c9a84c]/10 text-[#c9a84c] rounded-lg">
              <FaChartLine size={18} />
            </span>
          </div>
          <div className="mt-4 border-t border-slate-700/50 pt-3">
            <div className="flex justify-between text-[10px] font-mono mb-1.5">
              <span>Achieved: ₹{q3TargetAchieved}Cr</span>
              <span className="text-[#c9a84c]">72%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-[#c9a84c] h-full rounded-full" style={{ width: '72%' }}></div>
            </div>
          </div>
        </div>

        {/* Metric 3: Open Hiring */}
        <div className="bg-[#112240] border border-[#c9a84c]/20 rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-[#c9a84c]/50 transition duration-350">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-slate-100 group-hover:scale-110 transition duration-300">
            <FaBuilding size={90} />
          </div>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">Hiring Pipeline</span>
              <h3 className="text-3xl font-serif text-slate-100 mt-1">12</h3>
            </div>
            <span className="p-3 bg-red-950/20 text-red-400 border border-red-900/30 rounded-lg">
              <FaTriangleExclamation size={16} />
            </span>
          </div>
          <div className="flex items-center gap-2 mt-4 text-[10px] font-mono border-t border-slate-700/50 pt-3">
            <span className="px-2 py-0.5 bg-red-950 text-red-400 border border-red-900/30 rounded font-bold uppercase tracking-wider">
              4 Critical
            </span>
            <span className="text-slate-400">8 Standard Active Req</span>
          </div>
        </div>

        {/* Metric 4: Leave Requests */}
        <div className="bg-[#112240] border border-[#c9a84c]/20 rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-[#c9a84c]/50 transition duration-350">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-slate-100 group-hover:scale-110 transition duration-300">
            <FaCalendarCheck size={90} />
          </div>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">Leaves Awaiting Desk</span>
              <h3 className={`text-3xl font-serif mt-1 ${leaves.length > 0 ? 'text-rose-450' : 'text-slate-100'}`}>
                {leaves.length}
              </h3>
            </div>
            <span className={`p-3 rounded-lg ${leaves.length > 0 ? 'bg-rose-950/20 text-rose-450 border border-rose-900/30' : 'bg-slate-800 text-slate-400'}`}>
              <FaCalendarCheck size={18} />
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[10px] font-mono border-t border-slate-700/50 pt-3">
            {leaves.filter(l => l.overdue).length > 0 ? (
              <span className="text-rose-400 font-bold animate-pulse">
                ⚠️ {leaves.filter(l => l.overdue).length} Overdue Request(s)
              </span>
            ) : (
              <span className="text-slate-400">All submissions are current</span>
            )}
          </div>
        </div>
      </div>

      {/* ─── DYNAMIC LAYOUT ACCORDING TO ROLE SWITCHER ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8 items-start">
        
        {/* LEFT TWO-COLUMNS PANEL */}
        <div className="lg:col-span-8 space-y-8 text-left">
          
          {/* LEAVE APPROVALS BOARD */}
          {currentRole !== 'sales' && (
            <div className="bg-[#112240] border border-[#c9a84c]/20 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-4 mb-5">
                <h3 className="font-serif text-lg font-medium flex items-center gap-2">
                  <FaCalendarCheck className="text-[#c9a84c]" size={18} /> Leave Approvals Decision Board
                </h3>
                <span className="px-2 py-0.5 bg-[#c9a84c]/10 text-[#c9a84c] text-[10px] font-mono border border-[#c9a84c]/20 rounded uppercase">
                  Founder Override Desk
                </span>
              </div>

              <div className="space-y-4">
                {leaves.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-slate-700 rounded-lg">
                    <FaCircleCheck className="text-emerald-500 mx-auto mb-2" size={24} />
                    <p className="text-xs font-mono text-slate-400 uppercase">All leave applications processed.</p>
                  </div>
                ) : (
                  leaves.map((lv) => (
                    <div 
                      key={lv.id}
                      className={`p-4 bg-[#0a1628]/60 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition duration-200 hover:bg-[#0a1628] ${
                        lv.overdue 
                          ? 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.05)]' 
                          : 'border-[#c9a84c]/30'
                      }`}
                    >
                      <div className="space-y-1.5 max-w-lg">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-serif text-slate-100 font-medium">{lv.empName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({lv.role})</span>
                          {lv.overdue && (
                            <span className="px-2 py-0.5 bg-red-950/80 text-red-405 border border-red-900/30 text-[9px] font-mono font-bold rounded-sm uppercase tracking-wide">
                              Overdue 48h+
                            </span>
                          )}
                          {!lv.overdue && (
                            <span className="px-2 py-0.5 bg-amber-950/60 text-[#c9a84c] border border-amber-900/30 text-[9px] font-mono font-bold rounded-sm uppercase tracking-wide">
                              Standard Review
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#c9a84c] font-mono">
                          Dates: {lv.dates} ({lv.days} Days) • Type: {lv.type}
                        </p>
                        <p className="text-xs text-slate-400 italic">
                          " {lv.reason} "
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => {
                            const emp = employees.find(e => e.id === lv.empId);
                            if (emp) setSelectedEmp(emp);
                          }}
                          className="px-3 py-1.5 border border-slate-600 hover:border-[#c9a84c] text-slate-300 hover:text-[#c9a84c] text-xs font-mono rounded uppercase transition cursor-pointer"
                        >
                          Profile
                        </button>
                        <button
                          onClick={() => handleLeaveDecision(lv.id, 'APPROVED')}
                          className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-mono rounded uppercase transition cursor-pointer flex items-center gap-1"
                        >
                          <FaCircleCheck size={12} /> Approve
                        </button>
                        <button
                          onClick={() => handleLeaveDecision(lv.id, 'REJECTED')}
                          className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-white text-xs font-mono rounded uppercase transition cursor-pointer flex items-center gap-1"
                        >
                          <FaCircleXmark size={12} /> Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* EMPLOYEE DIRECTORY */}
          <div className="bg-[#112240] border border-[#c9a84c]/20 rounded-xl shadow-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-700/80 pb-4 mb-5 gap-4">
              <h3 className="font-serif text-lg font-medium flex items-center gap-2">
                <FaUsers className="text-[#c9a84c]" size={18} /> Workforce Directory Ledger
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <FaMagnifyingGlass size={12} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search name, role, ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-[#0a1628]/60 border border-slate-700 focus:border-[#c9a84c] text-xs px-3 py-1.5 pl-8 rounded-lg outline-none w-full sm:w-48 text-slate-100 transition placeholder:text-slate-500"
                  />
                </div>
                <div className="relative">
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="bg-[#0a1628]/60 border border-slate-700 focus:border-[#c9a84c] text-xs px-3 py-1.5 rounded-lg outline-none cursor-pointer text-[#c9a84c] pr-8 transition"
                  >
                    <option value="ALL">All Sectors</option>
                    <option value="SALES">Sales Desk</option>
                    <option value="HR">HR Team</option>
                    <option value="STONE">Stone Sector</option>
                    <option value="COAL">Coal Sector</option>
                    <option value="TRANSPORT">Transport Desk</option>
                    <option value="IT">IT Infrastructure</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase tracking-wider bg-[#0a1628]/40">
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Sector</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-8 font-mono text-slate-500 uppercase">
                        No operators matching filters found.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr 
                        key={emp.id}
                        className={`hover:bg-[#0a1628]/40 transition duration-150 ${
                          emp.pendingLWP ? 'bg-red-950/15 border-l-2 border-red-505' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/20 text-[#c9a84c] flex items-center justify-center font-mono font-bold shrink-0">
                              {emp.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="text-left">
                              <div className="font-serif font-medium text-slate-100 flex items-center gap-1.5">
                                {emp.name}
                                {emp.pendingLWP && (
                                  <span className="px-1.5 py-0.2 bg-red-900/60 text-red-300 border border-red-800/30 text-[8px] font-mono rounded uppercase tracking-wider font-bold">
                                    LWP Alert
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">ID: {emp.employeeId} • {emp.role}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">{emp.dept} Sector</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            emp.status === 'Active' 
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30'
                              : emp.status === 'On Leave'
                              ? 'bg-amber-950/40 text-[#c9a84c] border border-amber-900/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {emp.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setSelectedEmp(emp)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-[#c9a84c] text-slate-300 hover:text-[#0a1628] rounded border border-slate-700 hover:border-transparent text-[10px] font-mono uppercase transition cursor-pointer"
                          >
                            Profile
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN SIDE PANEL */}
        <div className="lg:col-span-4 space-y-8 text-left">
          
          {/* SET SALES TARGETS */}
          {currentRole !== 'hr' && (
            <div className="bg-[#112240] border border-[#c9a84c]/20 rounded-xl shadow-lg p-6">
              <h3 className="font-serif text-lg font-medium border-b border-slate-700/80 pb-3 mb-4 flex items-center gap-2">
                <FaBullseye className="text-[#c9a84c]" size={16} /> Sales Target Allocator
              </h3>
              
              <form onSubmit={handleAssignTarget} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-mono uppercase mb-1.5">Trade Vertical Desk *</label>
                  <select
                    value={targetForm.vertical}
                    onChange={(e) => setTargetForm({ ...targetForm, vertical: e.target.value })}
                    className="w-full bg-[#0a1628]/60 border border-slate-700 focus:border-[#c9a84c] rounded px-3 py-2 text-slate-100 outline-none cursor-pointer"
                  >
                    <option value="Stone">Stone Vertical</option>
                    <option value="Coal">Coal Vertical</option>
                    <option value="Rice">Rice Vertical</option>
                    <option value="Transport">Transport Vertical</option>
                    <option value="Prakriti">Prakriti Retail</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-mono uppercase mb-1.5">Target Value (₹ Lakhs) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50"
                    value={targetForm.amount}
                    onChange={(e) => setTargetForm({ ...targetForm, amount: e.target.value })}
                    className="w-full bg-[#0a1628]/60 border border-slate-700 focus:border-[#c9a84c] rounded px-3 py-2 text-slate-100 outline-none placeholder:text-slate-650"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-mono uppercase mb-1.5">Assigned Period</label>
                    <select
                      value={targetForm.period}
                      onChange={(e) => setTargetForm({ ...targetForm, period: e.target.value })}
                      className="w-full bg-[#0a1628]/60 border border-slate-700 focus:border-[#c9a84c] rounded px-3 py-1.5 text-slate-100 outline-none cursor-pointer"
                    >
                      <option value="Q3 2026">Q3 2026</option>
                      <option value="Q4 2026">Q4 2026</option>
                      <option value="FY 2026-27">FY 26-27</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full bg-[#c9a84c] hover:bg-[#dfbc5c] text-[#0a1628] py-2 rounded font-mono font-bold uppercase tracking-wider transition cursor-pointer"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              </form>

              {/* Targets List */}
              <div className="mt-6 border-t border-slate-700/60 pt-4">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-2">Live Targets Ledger</span>
                <div className="space-y-2.5 max-h-48 overflow-y-auto custom-scrollbar">
                  {targets.map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-2 bg-[#0a1628]/40 border border-slate-800 rounded">
                      <div>
                        <span className="font-bold text-slate-100">{t.vertical} Team</span>
                        <p className="text-[9px] text-slate-400 font-mono">Assigned: {t.period}</p>
                      </div>
                      <span className="font-mono text-[#c9a84c] font-bold">₹{t.amount} Lakhs</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* HR REQUISITIONS */}
          {currentRole !== 'sales' && (
            <div className="bg-[#112240] border border-[#c9a84c]/20 rounded-xl shadow-lg p-6">
              <h3 className="font-serif text-lg font-medium border-b border-slate-700/80 pb-3 mb-4 flex items-center gap-2">
                <FaBriefcase className="text-[#c9a84c]" size={16} /> HR Active Requisitions
              </h3>

              {/* Post job form */}
              <form onSubmit={handlePostJob} className="flex gap-2 mb-5">
                <input
                  type="text"
                  required
                  placeholder="Hiring role (e.g. Sales Exec)..."
                  value={hiringForm.title}
                  onChange={(e) => setHiringForm({ ...hiringForm, title: e.target.value })}
                  className="flex-1 bg-[#0a1628]/60 border border-slate-700 focus:border-[#c9a84c] text-xs px-3 py-2 rounded outline-none text-slate-100 placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setHiringForm({ ...hiringForm, status: hiringForm.status === 'Urgent' ? 'Standard' : 'Urgent' })}
                  className={`px-3 py-2 text-xs font-mono rounded border transition shrink-0 cursor-pointer ${
                    hiringForm.status === 'Urgent' 
                      ? 'bg-rose-950 text-rose-400 border-rose-900' 
                      : 'border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                  title="Toggle Urgency Status"
                >
                  {hiringForm.status === 'Urgent' ? 'Urgent!' : 'Std'}
                </button>
                <button
                  type="submit"
                  className="bg-[#c9a84c] hover:bg-[#dfbc5c] text-[#0a1628] p-2.5 rounded transition shrink-0 cursor-pointer"
                  title="Add vacancy"
                >
                  <FaPlus size={12} />
                </button>
              </form>

              {/* Jobs List */}
              <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                {hiring.map((job) => (
                  <div key={job.id} className="p-3 bg-[#0a1628]/40 border border-slate-800 rounded flex items-center justify-between gap-2">
                    <div className="min-w-0 text-left">
                      <span className="font-medium text-xs text-slate-100 truncate block">{job.title}</span>
                      <span className={`inline-block text-[8px] font-mono font-bold uppercase rounded-sm px-1.5 py-0.2 border mt-1 ${
                        job.status === 'Urgent'
                          ? 'bg-red-950 text-red-400 border-red-900/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {job.status} Req
                      </span>
                    </div>
                    
                    <button
                      onClick={() => toast(`Hiring workflow triggered for: ${job.title}`)}
                      className="px-2 py-1 bg-slate-800 hover:bg-[#c9a84c] hover:text-[#0a1628] border border-slate-700 hover:border-transparent text-[9px] font-mono uppercase transition rounded cursor-pointer shrink-0"
                    >
                      Interview
                    </button>
                  </div>
                ))}
              </div>

              {/* Join Live Interview */}
              <button
                onClick={() => setShowOverrideModal(true)}
                className="w-full mt-5 bg-gradient-to-r from-red-950 to-red-900 hover:from-red-900 hover:to-red-800 text-red-200 border border-red-800/30 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <FaVideo size={12} /> Join Live Interview (Override)
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ─── ROLE IMPERSONATION / PREVIEW PANEL ─── */}
      <div className="bg-[#112240] border border-[#c9a84c]/20 rounded-xl shadow-lg p-6 text-left">
        <h3 className="font-serif text-lg font-medium border-b border-slate-700/80 pb-3 mb-5 flex items-center gap-2">
          <FaLock className="text-[#c9a84c]" size={16} /> Role Impersonation & Command Center Actions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Column A: HR Executive Impersonation */}
          <div className="p-4 bg-[#0a1628]/60 border border-slate-800 rounded-lg flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-[#c9a84c] uppercase tracking-wider block">
                HR Executive View
              </span>
              <ul className="text-xs space-y-2 text-slate-350">
                <li className="flex justify-between"><span>Open Requisitions:</span> <strong className="text-slate-100">12 Active</strong></li>
                <li className="flex justify-between"><span>Interviews Scheduled:</span> <strong className="text-slate-100">5 Today</strong></li>
                <li className="flex justify-between"><span>Pending Onboarding:</span> <strong className="text-slate-100">3 Candidates</strong></li>
                <li className="flex justify-between"><span>Compliance Docs Missing:</span> <strong className="text-rose-450">2 Logs</strong></li>
              </ul>
            </div>
            <button
              onClick={() => handleRoleChange('hr')}
              className="w-full mt-4 bg-slate-800 hover:bg-[#c9a84c]/25 text-[#c9a84c] border border-[#c9a84c]/30 py-2 rounded text-[10px] font-mono uppercase tracking-wider transition cursor-pointer"
            >
              Switch to HR View
            </button>
          </div>

          {/* Column B: Sales Manager Impersonation */}
          <div className="p-4 bg-[#0a1628]/60 border border-slate-800 rounded-lg flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-[#c9a84c] uppercase tracking-wider block">
                Sales Manager View
              </span>
              <ul className="text-xs space-y-2 text-slate-350">
                <li className="flex justify-between"><span>Assigned Target:</span> <strong className="text-slate-100">₹18.4 Cr</strong></li>
                <li className="flex justify-between"><span>Warm Pipeline Leads:</span> <strong className="text-slate-100">18 Opportunities</strong></li>
                <li className="flex justify-between"><span>Overdue Follow-ups:</span> <strong className="text-rose-450">7 Leads</strong></li>
                <li className="flex justify-between"><span>Est. Pipeline Value:</span> <strong className="text-slate-100">₹45.2 Cr</strong></li>
              </ul>
            </div>
            <button
              onClick={() => handleRoleChange('sales')}
              className="w-full mt-4 bg-slate-800 hover:bg-[#c9a84c]/25 text-[#c9a84c] border border-[#c9a84c]/30 py-2 rounded text-[10px] font-mono uppercase tracking-wider transition cursor-pointer"
            >
              Switch to Sales View
            </button>
          </div>

          {/* Column C: Founder Super Admin Bulk Actions */}
          <div className="p-4 bg-[#0a1628]/60 border border-slate-800 rounded-lg flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-rose-450 uppercase tracking-wider block flex items-center gap-1.5">
                <FaLock className="text-rose-450" size={11} /> Founder Super Admin
              </span>
              <p className="text-[11px] text-slate-400">
                Execute sweeping bulk operations and settings overrides across the entire enterprise database.
              </p>
            </div>
            <button
              onClick={() => setShowBulkModal(true)}
              className="w-full mt-4 bg-[#c9a84c] hover:bg-[#dfbc5c] text-[#0a1628] py-2 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition cursor-pointer"
            >
              Execute Bulk Action
            </button>
          </div>

        </div>
      </div>

      {/* ─── FOOTER SECTION ─── */}
      <footer className="mt-12 pt-6 border-t border-[#c9a84c]/15 text-center text-slate-500 text-[10px] font-mono space-y-1">
        <p>© 2026 INDIA TRADE OVERSEAS (ITO) • ALL SYSTEM PARAMETERS PROTECTED UNDER END-TO-END AES-256</p>
        <p className="text-rose-450">WARNING: LOGGED IN WITH GLOBAL ROOT OVERRIDE CREDS. ALL ACTIONS LOGGED FOR AUDITING.</p>
      </footer>

      {/* ─── MODAL A: EMPLOYEE PROFILE DETAILS VIEW ─── */}
      <AnimatePresence>
        {selectedEmp && (
          <div 
            className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setSelectedEmp(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#112240] border border-[#c9a84c] rounded-xl shadow-2xl w-full max-w-2xl text-left overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-700/80 bg-[#0a1628]/80 flex justify-between items-start gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#c9a84c]/15 border border-[#c9a84c] text-[#c9a84c] text-xl font-mono font-bold flex items-center justify-center">
                    {selectedEmp.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h2 className="text-xl font-serif font-semibold text-slate-100 flex items-center gap-2">
                      {selectedEmp.name}
                      {selectedEmp.pendingLWP && (
                        <span className="px-2 py-0.5 bg-red-950 text-red-400 border border-red-900/30 text-[9px] font-mono rounded uppercase font-bold tracking-wider">
                          LWP Pending
                        </span>
                      )}
                    </h2>
                    <p className="text-xs font-mono text-[#c9a84c]">
                      {selectedEmp.role} • ID: {selectedEmp.employeeId}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedEmp(null)}
                  className="text-slate-400 hover:text-slate-100 transition text-lg bg-[#0a1628] border border-slate-800 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 text-xs custom-scrollbar max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  
                  {/* Basic information */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-mono font-bold text-[#c9a84c] uppercase tracking-wider border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                      <FaUser size={12} /> Contact & Contract details
                    </h4>
                    <div className="space-y-2.5 font-mono text-slate-350">
                      <div className="flex justify-between"><span>Sector/Dept:</span> <span className="text-slate-100">{selectedEmp.dept}</span></div>
                      <div className="flex justify-between"><span>Corporate Email:</span> <span className="text-slate-100 select-all">{selectedEmp.email}</span></div>
                      <div className="flex justify-between"><span>Personal Phone:</span> <span className="text-slate-100 select-all">{selectedEmp.phone}</span></div>
                      <div className="flex justify-between"><span>Date of Joining:</span> <span className="text-slate-100">{selectedEmp.joined}</span></div>
                      <div className="flex justify-between"><span>Employment Status:</span> <span className="text-emerald-400 font-bold">{selectedEmp.status}</span></div>
                    </div>
                  </div>

                  {/* Financials & PII */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                      <FaFileInvoiceDollar size={12} /> Sensitive Compensation
                    </h4>
                    <div className="space-y-2.5 font-mono text-slate-350">
                      <div className="flex justify-between"><span>Basic Monthly Salary:</span> <strong className="text-slate-100">₹{selectedEmp.salary.toLocaleString()}</strong></div>
                      <div className="flex justify-between"><span>Provident Fund (PF):</span> <span className="text-slate-100">₹1,800 (Statutory limit)</span></div>
                      <div className="flex justify-between"><span>ESI Contribution:</span> <span className="text-slate-100">₹320 (Applicable scale)</span></div>
                      <div className="flex justify-between"><span>In-Hand Scale:</span> <strong className="text-[#c9a84c]">₹{(selectedEmp.salary - 2120).toLocaleString()}</strong></div>
                      <div className="flex justify-between"><span>Tax ID (PAN):</span> <span className="text-slate-100">XXXX-XXXX-9012 (Masked)</span></div>
                    </div>
                  </div>

                </div>

                {/* Compliance Documents */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1.5">
                    Secured Compliance Documents Vault
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-[#0a1628]/60 border border-slate-800 rounded flex items-center justify-between">
                      <span className="font-mono text-[10px]">Aadhaar Card copy</span>
                      <span className="text-emerald-400 font-mono text-[9px] font-bold">Verified</span>
                    </div>
                    <div className="p-3 bg-[#0a1628]/60 border border-slate-800 rounded flex items-center justify-between">
                      <span className="font-mono text-[10px]">PAN Card copy</span>
                      <span className="text-emerald-400 font-mono text-[9px] font-bold">Verified</span>
                    </div>
                    <div className="p-3 bg-[#0a1628]/60 border border-slate-800 rounded flex items-center justify-between">
                      <span className="font-mono text-[10px]">Academic Degree</span>
                      <span className="text-emerald-400 font-mono text-[9px] font-bold">Verified</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-[#0a1628]/40 border-t border-slate-700/80 text-right flex justify-between items-center">
                <span className="text-[9px] font-mono text-slate-500 uppercase">Audit state // Compliant</span>
                <button
                  onClick={() => setSelectedEmp(null)}
                  className="px-4 py-2 bg-[#c9a84c] hover:bg-[#dfbc5c] text-[#0a1628] text-xs font-mono font-bold rounded uppercase transition cursor-pointer"
                >
                  Close Document
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL B: INTERVIEW OVERRIDE DEMO ─── */}
      <AnimatePresence>
        {showOverrideModal && (
          <div 
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md"
            onClick={() => setShowOverrideModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#112240] border border-red-500/50 rounded-xl shadow-2xl w-full max-w-lg text-left overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 bg-red-950/20 border-b border-red-900/30 flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                <h3 className="font-serif text-lg font-bold text-red-200 uppercase tracking-wide">
                  Hiring Override: Live Connection
                </h3>
              </div>
              <div className="p-6 text-xs text-slate-350 space-y-4">
                <p className="leading-relaxed">
                  You are establishing a direct video/audio line to the HR Active Interview Room (Founder Override).
                </p>
                <div className="p-4 bg-[#0a1628] border border-slate-800 rounded space-y-2.5 font-mono text-slate-400">
                  <div className="flex justify-between"><span>Active Session:</span> <span className="text-slate-200">Sales Executive Interview</span></div>
                  <div className="flex justify-between"><span>Candidate Name:</span> <span className="text-slate-200">Rohit Deshmukh (Shortlisted)</span></div>
                  <div className="flex justify-between"><span>Lead Recruiter:</span> <span className="text-slate-200">Sanjana Reddy</span></div>
                  <div className="flex justify-between"><span>Connection Port:</span> <span className="text-slate-200">SSL_SECURE_OVERRIDE_443</span></div>
                </div>
                <p className="text-[10px] text-slate-550 font-mono italic">
                  Note: Upon entering, your webcam feed will be broadcast directly as Super Admin.
                </p>
              </div>
              <div className="p-4 bg-[#0a1628]/40 border-t border-slate-800 text-right flex justify-end gap-2">
                <button
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 border border-slate-700 hover:border-slate-600 text-slate-300 rounded text-xs font-mono uppercase transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    toast.success('FounderOverride successfully injected into room!');
                    setShowOverrideModal(false);
                  }}
                  className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded text-xs font-mono uppercase transition cursor-pointer"
                >
                  Inject Session
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL C: EXECUTE BULK ACTIONS ─── */}
      <AnimatePresence>
        {showBulkModal && (
          <div 
            className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setShowBulkModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#112240] border border-[#c9a84c] rounded-xl shadow-2xl w-full max-w-md text-left overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-slate-800 bg-[#0a1628]/80 flex justify-between items-center">
                <h3 className="font-serif text-base font-bold text-slate-100 uppercase tracking-wide">
                  Execute Global Bulk Operations
                </h3>
                <button 
                  onClick={() => setShowBulkModal(false)}
                  className="text-slate-400 hover:text-slate-100 transition text-lg bg-[#0a1628] border border-slate-800 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-3.5 text-xs">
                <p className="text-slate-400 leading-relaxed mb-4">
                  Select a root override bulk command to run across the corporate database ledger:
                </p>

                <button
                  onClick={() => handleExecuteBulkAction('approve_all')}
                  className="w-full text-left p-3.5 bg-[#0a1628]/60 border border-[#c9a84c]/20 hover:border-[#c9a84c] rounded-lg transition group flex justify-between items-center cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-slate-100 block mb-0.5">Approve All Pending Leaves</span>
                    <span className="text-[10px] text-slate-400">Clears leaves board & updates employee statuses.</span>
                  </div>
                  <FaChevronRight className="text-[#c9a84c] opacity-60 group-hover:opacity-100 transition" size={12} />
                </button>

                <button
                  onClick={() => handleExecuteBulkAction('post_critical')}
                  className="w-full text-left p-3.5 bg-[#0a1628]/60 border border-[#c9a84c]/20 hover:border-[#c9a84c] rounded-lg transition group flex justify-between items-center cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-slate-100 block mb-0.5">Post Emergency Vacancy</span>
                    <span className="text-[10px] text-slate-400">Injects urgent logistics role to HR list.</span>
                  </div>
                  <FaChevronRight className="text-[#c9a84c] opacity-60 group-hover:opacity-100 transition" size={12} />
                </button>

                <button
                  onClick={() => handleExecuteBulkAction('adjust_budgets')}
                  className="w-full text-left p-3.5 bg-[#0a1628]/60 border border-[#c9a84c]/20 hover:border-[#c9a84c] rounded-lg transition group flex justify-between items-center cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-slate-100 block mb-0.5">Optimize Budget Allocation Matrix</span>
                    <span className="text-[10px] text-slate-400">Triggers Q3 financial balance adjustment.</span>
                  </div>
                  <FaChevronRight className="text-[#c9a84c] opacity-60 group-hover:opacity-100 transition" size={12} />
                </button>
              </div>

              <div className="p-4 bg-[#0a1628]/40 border-t border-slate-800 text-right">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-200 rounded text-xs font-mono uppercase transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
