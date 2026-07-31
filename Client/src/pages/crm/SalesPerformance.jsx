import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiPhoneCall, FiMail, FiMessageCircle, FiAward, FiTarget, FiFilter, FiUsers } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { salesApi } from '../../api/sales';
import { adminApi } from '../../api/admin';
import { useAuth } from '../../hooks/useAuth';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.99 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 100, damping: 18, mass: 1 } }
};

const DEPARTMENTS = ['STONE', 'COAL', 'TEA', 'RICE', 'TRANSPORT', 'ADMIN', 'IT', 'PROCUREMENT', 'ACCOUNTS', 'HR', 'SALES', 'CRM', 'FINANCE'];

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function SalesPerformance() {
  const { user } = useAuth();
  const isManagerTier = ['ADMIN', 'MANAGER'].includes(user?.role);

  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [period, setPeriod] = useState('monthly');
  const [department, setDepartment] = useState('');

  const [users, setUsers] = useState([]);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetForm, setTargetForm] = useState({ employeeId: '', targetValue: '', targetDeals: '' });
  const [savingTarget, setSavingTarget] = useState(false);

  useEffect(() => {
    fetchMyPerformance();
    if (isManagerTier) {
      fetchLeaderboard();
      fetchUsers();
    }
  }, []);

  useEffect(() => {
    if (isManagerTier) fetchLeaderboard();
  }, [period, department]);

  const fetchMyPerformance = async () => {
    setLoading(true);
    try {
      const response = await salesApi.getMyPerformance();
      if (response.success) setPerformance(response.data.performance);
    } catch (error) {
      console.error('Error fetching sales performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    setLeaderboardLoading(true);
    try {
      const params = { period };
      if (department) params.department = department;
      const response = await salesApi.getLeaderboard(params);
      if (response.success) setLeaderboard(response.data.leaderboard || []);
    } catch (error) {
      console.error('Error fetching sales leaderboard:', error);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await adminApi.getUsers();
      if (response.success) setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSetTarget = async (e) => {
    e.preventDefault();
    if (!targetForm.employeeId || !targetForm.targetValue) {
      toast.error('Employee and target value are required');
      return;
    }
    setSavingTarget(true);
    const now = new Date();
    try {
      const response = await salesApi.setTarget({
        employeeId: targetForm.employeeId,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        targetValue: targetForm.targetValue,
        targetDeals: targetForm.targetDeals || undefined
      });
      if (response.success) {
        toast.success('Sales target set successfully');
        setShowTargetModal(false);
        setTargetForm({ employeeId: '', targetValue: '', targetDeals: '' });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to set target');
    } finally {
      setSavingTarget(false);
    }
  };

  const targetProgress = performance?.target?.targetValue
    ? Math.min(100, Math.round((performance.revenue / performance.target.targetValue) * 100))
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1116] flex items-center justify-center">
        <div className="w-12 h-[1px] bg-[#C5CBD3]/40 animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen w-full bg-[#0E1116] text-[#C5CBD3] pb-12">

      <motion.div variants={blockVariants} className="w-full border-b border-[#C5CBD3]/10 py-6 px-4 md:px-8 flex flex-col md:flex-row md:items-end justify-between gap-3 bg-[#040A12]/40 backdrop-blur-sm">
        <div>
          <span className="text-[9px] uppercase tracking-[0.25em] text-[#6D7886] font-bold block font-mono">MODULE 04 // SALES PERFORMANCE</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[#F2F4F7] uppercase tracking-tight">Sales Performance</h1>
        </div>
      </motion.div>

      <div className="w-full px-4 md:px-8 py-6 space-y-6">

        {/* My performance card */}
        <motion.div variants={blockVariants} className="border border-[#C5CBD3]/15 bg-[#121D29]/20 rounded-sm p-6 shadow-xl">
          <span className="text-[9px] uppercase tracking-widest text-[#6D7886] font-bold font-mono block mb-4">My Performance &bull; This Month</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Leads Handled', val: performance?.totalLeads ?? 0, icon: FiUsers, color: 'text-sky-400 bg-sky-950/20' },
              { label: 'Deals Won', val: performance?.dealsWon ?? 0, icon: FiAward, color: 'text-emerald-400 bg-emerald-950/20' },
              { label: 'Deals Lost', val: performance?.dealsLost ?? 0, icon: FiTarget, color: 'text-rose-400 bg-rose-950/20' },
              { label: 'Revenue', val: currency(performance?.revenue), icon: FiTrendingUp, color: 'text-amber-400 bg-amber-950/20' },
              { label: 'Calls Logged', val: performance?.callsLogged ?? 0, icon: FiPhoneCall, color: 'text-indigo-400 bg-indigo-950/20' },
              { label: 'Emails / WhatsApp', val: (performance?.emailsLogged ?? 0) + (performance?.whatsAppLogged ?? 0), icon: FiMail, color: 'text-cyan-400 bg-cyan-950/20' }
            ].map((card, idx) => (
              <div key={idx} className="bg-[#0E1116]/60 border border-[#C5CBD3]/10 p-3.5 rounded-sm flex items-center justify-between shadow-lg">
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-[#6D7886] font-bold font-mono">{card.label}</p>
                  <p className="text-lg font-serif font-light text-[#F2F4F7] mt-1">{card.val}</p>
                </div>
                <div className={`p-2 rounded-sm ${card.color}`}><card.icon size={14} /></div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-5 border-t border-[#C5CBD3]/10">
            {performance?.target ? (
              <>
                <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-[#6D7886] mb-1.5">
                  <span>Target Progress</span>
                  <span>{currency(performance.revenue)} / {currency(performance.target.targetValue)} ({targetProgress}%)</span>
                </div>
                <div className="w-full bg-[#0E1116] h-2 border border-[#C5CBD3]/15 rounded-xs overflow-hidden">
                  <div className="h-full bg-[#F2F4F7] transition-all duration-500" style={{ width: `${targetProgress}%` }} />
                </div>
              </>
            ) : (
              <p className="text-[10px] uppercase tracking-widest text-[#6D7886] font-mono">No target set for this month.</p>
            )}
          </div>
        </motion.div>

        {/* Manager-tier leaderboard */}
        {isManagerTier && (
          <>
            <motion.div variants={blockVariants} className="p-4 bg-[#121D29]/20 border border-[#C5CBD3]/15 rounded-sm flex flex-col md:flex-row gap-4 items-center">
              <div className="w-full md:w-52 flex items-center gap-2">
                <FiFilter className="text-[#6D7886] shrink-0" size={14} />
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0E1116] border border-[#C5CBD3]/15 focus:border-[#F2F4F7]/40 rounded-sm outline-none text-xs cursor-pointer text-[#F2F4F7]"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="w-full md:w-52 flex items-center gap-2">
                <FiUsers className="text-[#6D7886] shrink-0" size={14} />
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0E1116] border border-[#C5CBD3]/15 focus:border-[#F2F4F7]/40 rounded-sm outline-none text-xs cursor-pointer text-[#F2F4F7]"
                >
                  <option value="">All Departments</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <button
                onClick={() => setShowTargetModal(true)}
                className="ml-auto bg-[#F2F4F7] text-[#040A12] hover:bg-[#C5CBD3] text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-sm transition-all whitespace-nowrap"
              >
                Set Target
              </button>
            </motion.div>

            <motion.div variants={blockVariants} className="border border-[#C5CBD3]/15 bg-[#121D29]/10 rounded-sm overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-[#040A12] text-[#6D7886] text-[9px] uppercase tracking-widest font-mono font-bold">
                      <th className="py-3.5 px-5">Rank</th>
                      <th className="py-3.5 px-5">Employee</th>
                      <th className="py-3.5 px-5">Department</th>
                      <th className="py-3.5 px-5">Deals Won</th>
                      <th className="py-3.5 px-5">Revenue</th>
                      <th className="py-3.5 px-5">Activity Logged</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#C5CBD3]/10 text-xs">
                    {leaderboardLoading ? (
                      <tr><td colSpan="6" className="text-center py-12 text-[#6D7886] font-mono uppercase tracking-widest text-[10px]">Loading...</td></tr>
                    ) : leaderboard.length === 0 ? (
                      <tr><td colSpan="6" className="text-center py-16 opacity-40 font-mono uppercase tracking-widest text-[10px]">No deals won in this period.</td></tr>
                    ) : (
                      leaderboard.map((row, idx) => (
                        <tr key={row.employeeId} className="hover:bg-[#121D29]/40 transition-colors">
                          <td className="py-3 px-5 font-mono text-[#6D7886]">#{idx + 1}</td>
                          <td className="py-3 px-5 text-[#F2F4F7]">{row.fullName}</td>
                          <td className="py-3 px-5">
                            <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#121D29] border border-[#C5CBD3]/10 text-[#C5CBD3] rounded-sm">
                              {row.department || '—'}
                            </span>
                          </td>
                          <td className="py-3 px-5 font-mono text-emerald-400">{row.dealsWon}</td>
                          <td className="py-3 px-5 font-mono text-amber-400">{currency(row.revenue)}</td>
                          <td className="py-3 px-5 font-mono text-[#C5CBD3]">{row.activityCount}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {showTargetModal && (
        <div className="fixed inset-0 bg-[#040A12]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#121D29] border border-[#C5CBD3]/15 rounded-sm p-6 w-full max-w-md relative text-[#C5CBD3] text-left">
            <h3 className="text-base font-serif mb-4 uppercase tracking-wide border-b border-[#C5CBD3]/10 pb-3 text-[#F2F4F7]">Set Monthly Sales Target</h3>
            <form onSubmit={handleSetTarget} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6D7886] mb-1.5">Employee *</label>
                <select
                  required
                  value={targetForm.employeeId}
                  onChange={(e) => setTargetForm({ ...targetForm, employeeId: e.target.value })}
                  className="w-full p-2.5 border border-[#C5CBD3]/20 bg-[#0E1116] text-[#F2F4F7] rounded-sm outline-none cursor-pointer"
                >
                  <option value="" className="bg-[#0E1116]">Select employee</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id} className="bg-[#0E1116]">{u.fullName} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6D7886] mb-1.5">Target Revenue (₹) *</label>
                <input
                  type="number"
                  required
                  value={targetForm.targetValue}
                  onChange={(e) => setTargetForm({ ...targetForm, targetValue: e.target.value })}
                  className="w-full p-2.5 border border-[#C5CBD3]/20 bg-[#0E1116] text-[#F2F4F7] rounded-sm outline-none"
                  placeholder="e.g. 500000"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6D7886] mb-1.5">Target Deals (optional)</label>
                <input
                  type="number"
                  value={targetForm.targetDeals}
                  onChange={(e) => setTargetForm({ ...targetForm, targetDeals: e.target.value })}
                  className="w-full p-2.5 border border-[#C5CBD3]/20 bg-[#0E1116] text-[#F2F4F7] rounded-sm outline-none"
                  placeholder="e.g. 10"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={savingTarget} className="flex-1 bg-[#F2F4F7] text-[#040A12] py-2.5 font-bold uppercase text-[10px] tracking-widest rounded-sm cursor-pointer hover:bg-[#C5CBD3] transition-colors disabled:opacity-50">
                  {savingTarget ? 'Saving...' : 'Save Target'}
                </button>
                <button type="button" onClick={() => setShowTargetModal(false)} className="flex-1 bg-[#0E1116] border border-[#C5CBD3]/20 text-[#C5CBD3] py-2.5 font-bold uppercase text-[10px] tracking-widest rounded-sm cursor-pointer hover:bg-[#121D29] transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
