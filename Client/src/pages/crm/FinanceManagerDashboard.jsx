import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiDollarSign, 
  FiTrendingUp, 
  FiTrendingDown,
  FiPercent, 
  FiFileText, 
  FiUsers, 
  FiAlertCircle, 
  FiCheck, 
  FiX, 
  FiCalendar, 
  FiFilter, 
  FiCpu,
  FiPrinter,
  FiRotateCw,
  FiArrowUpRight,
  FiArrowDownRight,
  FiDownload,
  FiBook,
  FiCreditCard,
  FiActivity,
  FiCheckSquare,
  FiPlus
} from 'react-icons/fi';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

// Framer motion variants matching other system dashboards
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 18 } }
};

const COLORS = ['#C89A54', '#56A587', '#5B9BB8', '#C96A57', '#9CA3AF'];

export default function FinanceManagerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('THIS_MONTH');

  // Real-time Cash Balance State (updates on salary payout or approvals)
  const [cashBalance, setCashBalance] = useState(15748290);
  const [bankBalance, setBankBalance] = useState(128450000);

  // --- MOCK DATA FOR CHARTS & TABLES ---
  
  // P&L Trend (Revenue vs Expense)
  const [plTrendData, setPlTrendData] = useState([
    { name: 'Jan', Revenue: 8500000, Expense: 6100000, Profit: 2400000 },
    { name: 'Feb', Revenue: 9200000, Expense: 6300000, Profit: 2900000 },
    { name: 'Mar', Revenue: 10500000, Expense: 7100000, Profit: 3400000 },
    { name: 'Apr', Revenue: 11200000, Expense: 7400000, Profit: 3800000 },
    { name: 'May', Revenue: 12500000, Expense: 8000000, Profit: 4500000 },
    { name: 'Jun', Revenue: 14100000, Expense: 8900000, Profit: 5200000 },
    { name: 'Jul', Revenue: 13800000, Expense: 8700000, Profit: 5100000 },
  ]);

  // Department Budget Allocations
  const [budgetAllocation, setBudgetAllocation] = useState([
    { dept: 'Sales', allocated: 2500000, spent: 1850000, color: '#C89A54' },
    { dept: 'HR', allocated: 800000, spent: 750000, color: '#56A587' },
    { dept: 'IT/Tech', allocated: 4500000, spent: 4100000, color: '#5B9BB8' },
    { dept: 'Operations', allocated: 3500000, spent: 2950000, color: '#C96A57' },
    { dept: 'Marketing', allocated: 1500000, spent: 1200000, color: '#9D4EDD' }
  ]);

  // Aging Analysis
  const agingData = [
    { name: '0-30 Days', value: 4500000 },
    { name: '31-60 Days', value: 2100000 },
    { name: '61-90 Days', value: 850000 },
    { name: '90+ Days', value: 450000 }
  ];

  // Employee Salary Register
  const [salaryRegister, setSalaryRegister] = useState([
    { id: 'EMP001', name: 'Manjeet Singh', role: 'IT Manager', basic: 120000, allowances: 25000, tds: 14500, pt: 200, status: 'UNPAID' },
    { id: 'EMP002', name: 'Amit Sharma', role: 'Sales Executive', basic: 60000, allowances: 18000, tds: 7800, pt: 200, status: 'UNPAID' },
    { id: 'EMP003', name: 'Pooja Verma', role: 'HR Manager', basic: 95000, allowances: 20000, tds: 11500, pt: 200, status: 'UNPAID' },
    { id: 'EMP004', name: 'Rajesh Kumar', role: 'Operations Lead', basic: 85000, allowances: 15000, tds: 10000, pt: 200, status: 'PAID' },
    { id: 'EMP005', name: 'Sneha Patel', role: 'Procurement Specialist', basic: 55000, allowances: 12000, tds: 6700, pt: 200, status: 'UNPAID' }
  ]);

  // Petty Cash Requests
  const [pettyCashRequests, setPettyCashRequests] = useState([
    { id: 'PC-104', date: '2026-08-25', applicant: 'Sanjay Dutt', department: 'Operations', amount: 4500, category: 'Courier & Freight', description: 'Emergency cargo dispatch courier fees to warehouse', status: 'PENDING' },
    { id: 'PC-105', date: '2026-08-24', applicant: 'Priya Sen', department: 'HR', amount: 1850, category: 'Office Stationery', description: 'Purchase of marker boards and whiteboard duster pens', status: 'PENDING' },
    { id: 'PC-106', date: '2026-08-24', applicant: 'Vikram Rao', department: 'IT', amount: 12500, category: 'Hardware Replacement', description: 'Network switch power supply failure replacement part', status: 'PENDING' },
    { id: 'PC-102', date: '2026-08-20', applicant: 'Pooja Verma', department: 'HR', amount: 3200, category: 'Refreshments', description: 'Catering for team alignment meeting', status: 'APPROVED', approvedBy: 'Finance Manager' },
    { id: 'PC-103', date: '2026-08-21', applicant: 'Rahul Dev', department: 'Sales', amount: 1500, category: 'Travel Reimbursement', description: 'Auto rickshaw fare for local client visit', status: 'REJECTED', approvedBy: 'Finance Manager', remarks: 'Missing invoice attachment' }
  ]);

  // Tax Compliance Timelines
  const [taxCompliance, setTaxCompliance] = useState([
    { id: 'TX-01', taxType: 'GST Filing (GSTR-1)', period: 'July 2026', payable: 845200, dueDate: '2026-09-11', status: 'UNPAID' },
    { id: 'TX-02', taxType: 'TDS Payment (Section 194)', period: 'August 2026', payable: 145000, dueDate: '2026-09-07', status: 'UNPAID' },
    { id: 'TX-03', taxType: 'Professional Tax (PT)', period: 'August 2026', payable: 12400, dueDate: '2026-09-15', status: 'UNPAID' },
    { id: 'TX-04', taxType: 'Income Tax Advance Tax', period: 'Q2 FY 2026-27', payable: 1850000, dueDate: '2026-09-15', status: 'PAID' }
  ]);

  // Sales Commissions Payable
  const [commissions, setCommissions] = useState([
    { id: 'COM-089', executive: 'Amit Sharma', dealName: 'Coal Supply Order - Acme Ltd', dealValue: 4500000, commissionRate: '1.5%', commissionAmount: 67500, status: 'PENDING' },
    { id: 'COM-090', executive: 'Sumit Joshi', dealName: 'Basmati Rice Export - Al-Bayan Corp', dealValue: 12000000, commissionRate: '1.2%', commissionAmount: 144000, status: 'PENDING' },
    { id: 'COM-091', executive: 'Karan Malhotra', dealName: 'Tea Consignment - EuroFoods', dealValue: 3500000, commissionRate: '2.0%', commissionAmount: 70000, status: 'DISBURSED', date: '2026-08-20' },
    { id: 'COM-092', executive: 'Amit Sharma', dealName: 'Stone Aggregates - RailTech', dealValue: 5800000, commissionRate: '1.5%', commissionAmount: 87000, status: 'PENDING' }
  ]);

  // General Ledger journal simulation
  const [recentJournalLogs, setRecentJournalLogs] = useState([
    { id: 'JV-879', date: '2026-08-25', description: 'Petty cash disbursement for PC-102', accountDebit: 'Office Expenses A/C', accountCredit: 'Petty Cash A/C', amount: 3200 },
    { id: 'JV-878', date: '2026-08-22', description: 'Customer Invoice payment received - INV-190', accountDebit: 'Bank Account A/C', accountCredit: 'Sundry Debtors A/C', amount: 1450000 }
  ]);

  const loadData = async () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Finance metrics synchronized with Sales & HR modules');
    }, 600);
  };

  useEffect(() => {
    loadData();
  }, [dateFilter]);

  // Calculate high-level payroll stats
  const totalSalaryPayable = salaryRegister.reduce((sum, item) => {
    return sum + (item.status === 'UNPAID' ? (item.basic + item.allowances - item.tds - item.pt) : 0);
  }, 0);

  const totalMonthlyPayrollLiability = salaryRegister.reduce((sum, item) => {
    return sum + (item.basic + item.allowances);
  }, 0);

  const totalTdsDeductions = salaryRegister.reduce((sum, item) => sum + item.tds, 0);
  const totalPtDeductions = salaryRegister.reduce((sum, item) => sum + item.pt, 0);

  // Format currency in Indian Rupees format
  const fmtCurrency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  // Handle Payroll Salary Disbursement Action (Triggering Journal Entry and updating state)
  const handleDisbursePayroll = () => {
    const unpaidList = salaryRegister.filter(emp => emp.status === 'UNPAID');
    if (unpaidList.length === 0) {
      toast.error('No pending salaries to disburse for this payroll cycle.');
      return;
    }

    const netPayout = unpaidList.reduce((sum, emp) => {
      return sum + (emp.basic + emp.allowances - emp.tds - emp.pt);
    }, 0);

    const totalGross = unpaidList.reduce((sum, emp) => sum + (emp.basic + emp.allowances), 0);
    const totalTds = unpaidList.reduce((sum, emp) => sum + emp.tds, 0);
    const totalPt = unpaidList.reduce((sum, emp) => sum + emp.pt, 0);

    // Update bank balance & ledger logs
    setBankBalance(prev => prev - netPayout);
    
    // Create Auto Journal Entry
    const newJournal = {
      id: `JV-${Math.floor(Math.random() * 900) + 100}`,
      date: new Date().toISOString().split('T')[0],
      description: `Payroll Disbursement - Net salary transferred for ${unpaidList.length} employees`,
      accountDebit: 'Salaries & Wages Expense A/C',
      accountCredit: 'Bank Account A/C',
      amount: netPayout
    };

    setRecentJournalLogs(prev => [newJournal, ...prev]);

    // Update Salary register status to PAID
    setSalaryRegister(prev => prev.map(emp => ({ ...emp, status: 'PAID' })));

    // Update HR Department budget actuals
    setBudgetAllocation(prev => prev.map(budget => {
      if (budget.dept === 'HR') {
        return { ...budget, spent: budget.spent + netPayout };
      }
      return budget;
    }));

    toast.success(`Successfully disbursed salaries! Net Payout: ${fmtCurrency(netPayout)}. Auto Journal entry recorded: JV-${newJournal.id}`);
  };

  // Handle Petty Cash Approval Action
  const handlePettyCashAction = (id, action) => {
    const target = pettyCashRequests.find(r => r.id === id);
    if (!target) return;

    if (action === 'APPROVE') {
      // Deduct from Cash balance
      setCashBalance(prev => prev - target.amount);

      // Create Auto Journal Entry
      const newJournal = {
        id: `JV-${Math.floor(Math.random() * 900) + 100}`,
        date: new Date().toISOString().split('T')[0],
        description: `Petty Cash Approved: ${target.id} - ${target.description}`,
        accountDebit: `Office Expenses (${target.category}) A/C`,
        accountCredit: 'Petty Cash A/C',
        amount: target.amount
      };

      setRecentJournalLogs(prev => [newJournal, ...prev]);

      // Update budget allocation for that department
      setBudgetAllocation(prev => prev.map(b => {
        if (b.dept.toLowerCase() === target.department.toLowerCase() || (target.department === 'IT' && b.dept === 'IT/Tech')) {
          return { ...b, spent: b.spent + target.amount };
        }
        return b;
      }));

      // Update state status
      setPettyCashRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'APPROVED', approvedBy: 'Finance Manager' } : r));
      toast.success(`Petty Cash Request approved and paid. ${fmtCurrency(target.amount)} debited from Petty Cash Ledger.`);
    } else {
      const reason = window.prompt('Specify rejection reason:') || 'Policy mismatch';
      setPettyCashRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'REJECTED', approvedBy: 'Finance Manager', remarks: reason } : r));
      toast.error(`Petty Cash Request ${id} rejected.`);
    }
  };

  // Handle Commission Payout Action
  const handleDisburseCommission = (id) => {
    const target = commissions.find(c => c.id === id);
    if (!target) return;

    // Deduct from bank balance
    setBankBalance(prev => prev - target.commissionAmount);

    // Create journal entry
    const newJournal = {
      id: `JV-${Math.floor(Math.random() * 900) + 100}`,
      date: new Date().toISOString().split('T')[0],
      description: `Sales Commission payout to ${target.executive} for ${target.dealName}`,
      accountDebit: 'Sales Commissions Expense A/C',
      accountCredit: 'Bank Account A/C',
      amount: target.commissionAmount
    };

    setRecentJournalLogs(prev => [newJournal, ...prev]);

    // Update status
    setCommissions(prev => prev.map(c => c.id === id ? { ...c, status: 'DISBURSED', date: new Date().toISOString().split('T')[0] } : c));

    // Update Sales department spent actuals
    setBudgetAllocation(prev => prev.map(b => {
      if (b.dept === 'Sales') {
        return { ...b, spent: b.spent + target.commissionAmount };
      }
      return b;
    }));

    toast.success(`Commission of ${fmtCurrency(target.commissionAmount)} disbursed to ${target.executive}. Journal Voucher posted.`);
  };

  // Tax filing payment
  const handlePayTax = (id) => {
    const target = taxCompliance.find(t => t.id === id);
    if (!target) return;

    setBankBalance(prev => prev - target.payable);

    const newJournal = {
      id: `JV-${Math.floor(Math.random() * 900) + 100}`,
      date: new Date().toISOString().split('T')[0],
      description: `Tax paid: ${target.taxType} for ${target.period}`,
      accountDebit: `${target.taxType.includes('GST') ? 'GST Payable' : target.taxType.includes('TDS') ? 'TDS Payable' : 'PT Payable'} A/C`,
      accountCredit: 'Bank Account A/C',
      amount: target.payable
    };

    setRecentJournalLogs(prev => [newJournal, ...prev]);

    setTaxCompliance(prev => prev.map(t => t.id === id ? { ...t, status: 'PAID' } : t));
    toast.success(`Tax Liability ${target.taxType} paid. Transferred ${fmtCurrency(target.payable)} from corporate bank ledger.`);
  };

  // PDF Export trigger
  const handlePrintPDF = () => {
    window.print();
  };

  // Mock Export to CSV
  const handleExportCSV = (tableType) => {
    let rows = [];
    let filename = '';

    if (tableType === 'payroll') {
      rows = [['Employee ID', 'Name', 'Role', 'Basic Pay (Rs)', 'Allowances (Rs)', 'TDS Deduction (Rs)', 'PT Deduction (Rs)', 'Status']];
      salaryRegister.forEach(emp => {
        rows.push([emp.id, emp.name, emp.role, emp.basic, emp.allowances, emp.tds, emp.pt, emp.status]);
      });
      filename = `payroll_register_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (tableType === 'commissions') {
      rows = [['Commission ID', 'Sales Rep', 'Deal Reference', 'Deal Value (Rs)', 'Rate', 'Payout Amount (Rs)', 'Status']];
      commissions.forEach(c => {
        rows.push([c.id, c.executive, c.dealName, c.dealValue, c.commissionRate, c.commissionAmount, c.status]);
      });
      filename = `sales_commissions_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      rows = [['Transaction ID', 'Posting Date', 'Description', 'Debit Account', 'Credit Account', 'Amount (Rs)']];
      recentJournalLogs.forEach(j => {
        rows.push([j.id, j.date, j.description, j.accountDebit, j.accountCredit, j.amount]);
      });
      filename = `general_journal_voucher_${new Date().toISOString().split('T')[0]}.csv`;
    }

    const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Data exported successfully: ${filename}`);
  };

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants} 
      className="space-y-6 block pb-12 w-full max-w-full font-sans antialiased text-[var(--crm-ink-soft)] bg-[var(--crm-bg)] print:bg-white print:p-0"
    >
      {/* Header Bar */}
      <motion.div variants={itemVariants} className="w-full bg-[var(--crm-bg-raised)] border-b border-[var(--crm-line)] px-6 py-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 shadow-sm rounded-b-md print:shadow-none print:border-none print:pb-2">
        <div className="space-y-1 text-left flex-1 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.25em] text-teal-500 font-bold block font-mono">Corporate Ledger Console</span>
          <h1 className="text-2xl sm:text-3xl font-normal text-[var(--crm-heading)] tracking-tight">Finance & Accounts Department</h1>
          <p className="text-xs text-[var(--crm-ink-faint)] font-light mt-0.5">
            Finance Head: <strong className="text-[var(--crm-heading)] font-semibold font-mono">{user?.name || user?.fullName || 'Chief Financial Officer'}</strong> &bull; Department: <span className="text-[var(--crm-heading)] font-semibold font-mono">Treasury & Accounting</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-stretch md:self-auto font-mono print:hidden">
          <div className="flex items-center gap-1.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3.5 py-2 text-[10px] uppercase font-bold tracking-wider rounded shadow-sm">
            <FiFilter className="text-[var(--crm-ink-faint)]" size={12} />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent border-none outline-none font-bold text-[var(--crm-ink-soft)] cursor-pointer"
            >
              <option value="TODAY" className="bg-[var(--crm-bg-raised)]">Today</option>
              <option value="THIS_WEEK" className="bg-[var(--crm-bg-raised)]">This Week</option>
              <option value="THIS_MONTH" className="bg-[var(--crm-bg-raised)]">This Month</option>
            </select>
          </div>

          <button 
            onClick={loadData}
            className="flex items-center gap-1.5 bg-[var(--crm-bg-sunken)] hover:bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] border border-[var(--crm-line)] px-3.5 py-2 text-[10px] uppercase font-bold tracking-wider rounded transition shadow-sm cursor-pointer"
          >
            <FiRotateCw className={`${loading ? 'animate-spin' : ''}`} size={12} /> Refresh
          </button>

          <button 
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white border border-slate-950 px-3.5 py-2 text-[10px] uppercase font-bold tracking-wider rounded transition shadow-sm cursor-pointer"
          >
            <FiPrinter size={12} /> Export PDF
          </button>
        </div>
      </motion.div>

      {/* Tabs navigation */}
      <motion.div variants={itemVariants} className="bg-[var(--crm-bg-raised)] border-y border-[var(--crm-line)] px-6 py-1 flex overflow-x-auto scrollbar-none shadow-sm print:hidden">
        <nav className="flex space-x-8 min-w-max">
          {[
            { id: 'overview', label: 'Financial Overview', icon: FiActivity },
            { id: 'payroll', label: 'HR Payroll Liability', icon: FiUsers },
            { id: 'pettycash', label: 'Petty Cash Approvals', icon: FiCreditCard },
            { id: 'commissions', label: 'Sales Commissions', icon: FiPercent },
            { id: 'tax', label: 'Tax Compliance & Ledger', icon: FiBook }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3.5 px-1 border-b-2 text-[11px] uppercase tracking-widest font-mono font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-500'
                  : 'border-transparent text-[var(--crm-ink-faint)] hover:text-[var(--crm-ink-soft)]'
              }`}
            >
              <tab.icon size={13} className={activeTab === tab.id ? 'text-teal-500' : 'text-inherit'} />
              {tab.label}
            </button>
          ))}
        </nav>
      </motion.div>

      {/* Main Tab Screen Render */}
      <AnimatePresence mode="wait">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-3 print:hidden">
            <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-mono tracking-widest uppercase text-[var(--crm-ink-faint)]">Syncing Department Ledgers...</p>
          </div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="px-6 space-y-6"
          >
            {/* TAB 1: FINANCIAL OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Real-time Balances Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: 'BANK ACCOUNT BALANCE', val: fmtCurrency(bankBalance), sub: 'Active Corporate Account', icon: FiActivity, color: 'text-teal-400 bg-teal-950/20 border-teal-900/30' },
                    { label: 'PETTY CASH LEDGER', val: fmtCurrency(cashBalance), sub: 'Office Floating Reserve', icon: FiCreditCard, color: 'text-amber-400 bg-amber-950/20 border-amber-900/30' },
                    { label: 'PENDING PAYROLL', val: fmtCurrency(totalSalaryPayable), sub: 'This Month Liability', icon: FiUsers, color: 'text-rose-400 bg-rose-950/20 border-rose-900/30' },
                    { label: 'RECEIVABLES AGING (TOTAL)', val: fmtCurrency(7900000), sub: 'Due from Sundry Debtors', icon: FiTrendingUp, color: 'text-indigo-400 bg-indigo-950/20 border-indigo-900/30' }
                  ].map((kpi, idx) => (
                    <motion.div 
                      key={idx}
                      whileHover={{ y: -3 }}
                      className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 rounded-lg flex flex-col justify-between shadow-sm transition-all text-left"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold font-mono leading-none">{kpi.label}</span>
                        <div className={`p-1.5 rounded-md ${kpi.color}`}>
                          <kpi.icon size={12} />
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-xl font-bold text-[var(--crm-heading)] leading-tight truncate tracking-tight">{kpi.val}</p>
                        <span className="text-[8px] font-mono text-[var(--crm-ink-faint)] block mt-0.5">{kpi.sub}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Analytical Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* P&L Graph */}
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left">
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                      <span>Monthly Profit & Loss Trend</span>
                      <span className="text-[8px] font-mono text-[var(--crm-ink-faint)]">Amounts in INR</span>
                    </h3>
                    <div className="mt-4 h-72">
                      <ResponsiveContainer width="100%" height={260} minWidth={0} minHeight={200}>
                        <LineChart data={plTrendData} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-line)" opacity={0.3} />
                          <XAxis dataKey="name" stroke="var(--crm-ink-faint)" fontSize={10} />
                          <YAxis stroke="var(--crm-ink-faint)" fontSize={10} tickFormatter={(v) => `${(v/100000).toFixed(0)}L`} />
                          <Tooltip contentStyle={{ background: '#121212', borderColor: '#333', color: '#fff' }} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Line type="monotone" dataKey="Revenue" stroke="#56A587" strokeWidth={2} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="Expense" stroke="#C96A57" strokeWidth={2} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="Profit" stroke="#C89A54" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 5" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Budgets comparison */}
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left">
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3">
                      Department Expenses Budget Allocation
                    </h3>
                    <div className="mt-4 h-72">
                      <ResponsiveContainer width="100%" height={260} minWidth={0} minHeight={200}>
                        <BarChart data={budgetAllocation} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-line)" opacity={0.3} />
                          <XAxis dataKey="dept" stroke="var(--crm-ink-faint)" fontSize={10} />
                          <YAxis stroke="var(--crm-ink-faint)" fontSize={10} tickFormatter={(v) => `${(v/100000).toFixed(0)}L`} />
                          <Tooltip contentStyle={{ background: '#121212', borderColor: '#333', color: '#fff' }} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey="allocated" fill="#5B9BB8" name="Budget Allocated" maxBarSize={25} />
                          <Bar dataKey="spent" fill="#C89A54" name="Actual Spent" maxBarSize={25} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Third Row - Aging & Recent Logs */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Aging Chart */}
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left lg:col-span-1">
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3">
                      Receivables Aging Analysis
                    </h3>
                    <div className="mt-4 h-56 flex flex-col justify-center">
                      <ResponsiveContainer width="100%" height={180} minWidth={0} minHeight={150}>
                        <PieChart>
                          <Pie
                            data={agingData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {agingData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => fmtCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono mt-2">
                        {agingData.map((entry, index) => (
                          <div key={entry.name} className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                            <span>{entry.name}: <strong className="text-[var(--crm-heading)]">{fmtCurrency(entry.value)}</strong></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Automated Journal Entries Logger */}
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left lg:col-span-2">
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3 flex justify-between items-center">
                      <span>Real-time Auto-Journal Logs (Tally Sync Ready)</span>
                      <button onClick={() => handleExportCSV('journal')} className="text-[9px] uppercase tracking-wider text-teal-400 font-mono flex items-center gap-1 hover:underline">
                        <FiDownload size={10} /> Export Journal
                      </button>
                    </h3>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[var(--crm-bg-sunken)] font-mono text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] border-b border-[var(--crm-line)]">
                            <th className="py-2.5 px-3">JV No</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Narration / Details</th>
                            <th className="py-2.5 px-3">Debit Ledger</th>
                            <th className="py-2.5 px-3">Credit Ledger</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--crm-line)] font-mono">
                          {recentJournalLogs.map(log => (
                            <tr key={log.id} className="hover:bg-[var(--crm-bg-sunken)] transition-colors">
                              <td className="py-3 px-3 text-teal-400 font-bold">{log.id}</td>
                              <td className="py-3 px-3">{log.date}</td>
                              <td className="py-3 px-3 max-w-[200px] truncate text-[var(--crm-ink-soft)]" title={log.description}>{log.description}</td>
                              <td className="py-3 px-3 text-rose-300">{log.accountDebit}</td>
                              <td className="py-3 px-3 text-emerald-300">{log.accountCredit}</td>
                              <td className="py-3 px-3 text-right text-[var(--crm-heading)] font-bold">{fmtCurrency(log.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: HR PAYROLL LIABILITY */}
            {activeTab === 'payroll' && (
              <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left">
                <div className="border-b border-[var(--crm-line)] pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold">
                      Employee Monthly Salary Payout Console
                    </h3>
                    <p className="text-[10px] text-[var(--crm-ink-faint)] mt-1 font-mono">
                      Current Period: August 2026 &bull; Total Gross Liability: <strong className="text-indigo-400">{fmtCurrency(totalMonthlyPayrollLiability)}</strong>
                    </p>
                  </div>
                  <div className="flex gap-2 print:hidden font-mono text-[9px]">
                    <button 
                      onClick={() => handleExportCSV('payroll')}
                      className="flex items-center gap-1 bg-[var(--crm-bg-sunken)] hover:bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] border border-[var(--crm-line)] px-3.5 py-2 uppercase font-bold rounded cursor-pointer"
                    >
                      <FiDownload size={11} /> Export Register
                    </button>
                    <button 
                      onClick={handleDisbursePayroll}
                      className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-800 px-3.5 py-2 uppercase font-bold rounded cursor-pointer shadow-md"
                    >
                      <FiCheckSquare size={11} /> Disburse Salaries (Auto Ledger)
                    </button>
                  </div>
                </div>

                {/* Salary deductions summary widgets */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                  <div className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] p-3 rounded text-left">
                    <span className="text-[8px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-mono font-bold block">TDS Deductions Liability (Monthly)</span>
                    <strong className="text-sm text-[var(--crm-heading)] mt-1 block">{fmtCurrency(totalTdsDeductions)}</strong>
                    <span className="text-[8px] text-[var(--crm-ink-faint)] font-mono block mt-0.5">To be paid under Section 192</span>
                  </div>
                  <div className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] p-3 rounded text-left">
                    <span className="text-[8px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-mono font-bold block">Professional Tax (PT) Liability</span>
                    <strong className="text-sm text-[var(--crm-heading)] mt-1 block">{fmtCurrency(totalPtDeductions)}</strong>
                    <span className="text-[8px] text-[var(--crm-ink-faint)] font-mono block mt-0.5">To be deposited to state treasury</span>
                  </div>
                  <div className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] p-3 rounded text-left">
                    <span className="text-[8px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-mono font-bold block">Net Disbursable Payout</span>
                    <strong className="text-sm text-emerald-400 mt-1 block">{fmtCurrency(totalSalaryPayable)}</strong>
                    <span className="text-[8px] text-[var(--crm-ink-faint)] font-mono block mt-0.5">Current pending liabilities</span>
                  </div>
                </div>

                {/* Salary register table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--crm-bg-sunken)] font-mono text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] border-b border-[var(--crm-line)]">
                        <th className="py-3 px-4">Employee ID</th>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Role/Designation</th>
                        <th className="py-3 px-4 text-right">Basic Pay</th>
                        <th className="py-3 px-4 text-right">Allowances</th>
                        <th className="py-3 px-4 text-right text-rose-400">TDS Deduction</th>
                        <th className="py-3 px-4 text-right text-rose-400">PT Deduction</th>
                        <th className="py-3 px-4 text-right text-emerald-400 font-bold">Net Payable</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salaryRegister.map(emp => {
                        const netPayable = emp.basic + emp.allowances - emp.tds - emp.pt;
                        return (
                          <tr key={emp.id} className="border-b border-[var(--crm-line)] hover:bg-[var(--crm-bg-sunken)]/50">
                            <td className="py-3.5 px-4 font-mono text-[10px] font-bold">{emp.id}</td>
                            <td className="py-3.5 px-4 font-semibold text-[var(--crm-heading)]">{emp.name}</td>
                            <td className="py-3.5 px-4 text-[var(--crm-ink-faint)]">{emp.role}</td>
                            <td className="py-3.5 px-4 text-right font-mono">{fmtCurrency(emp.basic)}</td>
                            <td className="py-3.5 px-4 text-right font-mono">{fmtCurrency(emp.allowances)}</td>
                            <td className="py-3.5 px-4 text-right text-rose-400 font-mono">-{fmtCurrency(emp.tds)}</td>
                            <td className="py-3.5 px-4 text-right text-rose-400 font-mono">-{fmtCurrency(emp.pt)}</td>
                            <td className="py-3.5 px-4 text-right text-emerald-400 font-bold font-mono">{fmtCurrency(netPayable)}</td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                emp.status === 'PAID' 
                                  ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30' 
                                  : 'bg-rose-950/20 text-rose-400 border border-rose-900/30'
                              }`}>
                                {emp.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: PETTY CASH APPROVALS */}
            {activeTab === 'pettycash' && (
              <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left space-y-6">
                <div>
                  <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3">
                    Petty Cash Vouchers Approval Queue
                  </h3>
                  <p className="text-[10px] text-[var(--crm-ink-faint)] mt-1 font-mono">
                    Accounts team log office minor expenses here. Managers review for ledger release.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {pettyCashRequests.map(req => (
                    <div 
                      key={req.id} 
                      className={`border p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${
                        req.status === 'PENDING' 
                          ? 'border-amber-500/30 bg-amber-500/5' 
                          : req.status === 'APPROVED' 
                            ? 'border-emerald-500/20 bg-emerald-500/5' 
                            : 'border-rose-500/20 bg-rose-500/5'
                      }`}
                    >
                      <div className="space-y-1.5 text-left flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-teal-400 font-mono">{req.id}</span>
                          <span className="text-[9px] uppercase tracking-widest font-mono text-[var(--crm-ink-faint)]">{req.date}</span>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold font-mono bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)]">{req.category}</span>
                        </div>
                        <h4 className="text-sm font-semibold text-[var(--crm-heading)]">{req.description}</h4>
                        <div className="text-[10px] text-[var(--crm-ink-faint)] font-mono">
                          Requested By: <strong className="text-[var(--crm-ink-soft)]">{req.applicant}</strong> ({req.department})
                          {req.approvedBy && ` &bull; Actioned By: ${req.approvedBy}`}
                          {req.remarks && ` &bull; Remarks: "${req.remarks}"`}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-stretch md:self-auto justify-between border-t border-[var(--crm-line)] md:border-none pt-3 md:pt-0">
                        <div className="text-right">
                          <span className="text-[8px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-mono block">Voucher Value</span>
                          <strong className="text-base font-mono text-[var(--crm-heading)]">{fmtCurrency(req.amount)}</strong>
                        </div>

                        {req.status === 'PENDING' ? (
                          <div className="flex gap-1.5 font-mono text-[9px] print:hidden">
                            <button 
                              onClick={() => handlePettyCashAction(req.id, 'REJECT')}
                              className="bg-rose-950/20 hover:bg-rose-900/20 text-rose-400 border border-rose-900/30 px-3 py-1.5 uppercase font-bold rounded cursor-pointer transition"
                            >
                              Reject
                            </button>
                            <button 
                              onClick={() => handlePettyCashAction(req.id, 'APPROVE')}
                              className="bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-800 px-3 py-1.5 uppercase font-bold rounded cursor-pointer transition shadow"
                            >
                              Approve & Pay
                            </button>
                          </div>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                            req.status === 'APPROVED' 
                              ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30' 
                              : 'bg-rose-950/20 text-rose-400 border border-rose-900/30'
                          }`}>
                            {req.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: SALES COMMISSIONS */}
            {activeTab === 'commissions' && (
              <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left space-y-4">
                <div className="border-b border-[var(--crm-line)] pb-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold">
                      Sales Commission Settlements Mapping
                    </h3>
                    <p className="text-[10px] text-[var(--crm-ink-faint)] mt-1 font-mono">
                      Real-time extraction of commissions due on CLOSED_WON sales transactions.
                    </p>
                  </div>
                  <button 
                    onClick={() => handleExportCSV('commissions')}
                    className="flex items-center gap-1 bg-[var(--crm-bg-sunken)] hover:bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] border border-[var(--crm-line)] px-3 py-1.5 uppercase font-bold rounded cursor-pointer text-[9px] font-mono print:hidden"
                  >
                    <FiDownload size={11} /> Export List
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--crm-bg-sunken)] font-mono text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] border-b border-[var(--crm-line)]">
                        <th className="py-3 px-4">Commission ID</th>
                        <th className="py-3 px-4">Sales Rep Name</th>
                        <th className="py-3 px-4">Deal Reference / Client</th>
                        <th className="py-3 px-4 text-right">Deal Value</th>
                        <th className="py-3 px-4 text-center">Rate</th>
                        <th className="py-3 px-4 text-right text-emerald-400 font-bold">Commission Due</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right print:hidden">Settlement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissions.map(item => (
                        <tr key={item.id} className="border-b border-[var(--crm-line)] hover:bg-[var(--crm-bg-sunken)]/50">
                          <td className="py-3.5 px-4 font-mono text-[10px] font-bold">{item.id}</td>
                          <td className="py-3.5 px-4 font-semibold text-[var(--crm-heading)]">{item.executive}</td>
                          <td className="py-3.5 px-4 text-[var(--crm-ink-faint)]">{item.dealName}</td>
                          <td className="py-3.5 px-4 text-right font-mono">{fmtCurrency(item.dealValue)}</td>
                          <td className="py-3.5 px-4 text-center font-mono">{item.commissionRate}</td>
                          <td className="py-3.5 px-4 text-right text-emerald-400 font-bold font-mono">{fmtCurrency(item.commissionAmount)}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              item.status === 'DISBURSED' 
                                ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30' 
                                : 'bg-amber-950/20 text-amber-400 border border-amber-900/30'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right print:hidden">
                            {item.status === 'PENDING' ? (
                              <button 
                                onClick={() => handleDisburseCommission(item.id)}
                                className="bg-teal-700 hover:bg-teal-600 text-white font-mono text-[9px] uppercase font-bold border border-teal-800 px-3 py-1.5 rounded cursor-pointer shadow transition"
                              >
                                Disburse Payout
                              </button>
                            ) : (
                              <span className="text-[10px] font-mono text-[var(--crm-ink-faint)]">Paid on {item.date}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 5: TAX COMPLIANCE & LEDGERS */}
            {activeTab === 'tax' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Tax Deadlines Timeline */}
                <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left lg:col-span-7 space-y-4">
                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3">
                      Tax Compliance Filing Timeline
                    </h3>
                    <p className="text-[10px] text-[var(--crm-ink-faint)] mt-1 font-mono">
                      Statutory taxation deadlines including Corporate GST, TDS & PT returns.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[var(--crm-bg-sunken)] font-mono text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] border-b border-[var(--crm-line)]">
                          <th className="py-2.5 px-3">Ref ID</th>
                          <th className="py-2.5 px-3">Tax Type</th>
                          <th className="py-2.5 px-3">Period</th>
                          <th className="py-2.5 px-3 text-right">Tax Payable</th>
                          <th className="py-2.5 px-3 text-center">Due Date</th>
                          <th className="py-2.5 px-3 text-center">Filing Status</th>
                          <th className="py-2.5 px-3 text-right print:hidden">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taxCompliance.map(tax => (
                          <tr key={tax.id} className="border-b border-[var(--crm-line)] hover:bg-[var(--crm-bg-sunken)]/50">
                            <td className="py-3 px-3 font-mono text-[10px] font-bold">{tax.id}</td>
                            <td className="py-3 px-3 font-semibold text-[var(--crm-heading)]">{tax.taxType}</td>
                            <td className="py-3 px-3 text-[var(--crm-ink-faint)]">{tax.period}</td>
                            <td className="py-3 px-3 text-right font-mono text-rose-300">{fmtCurrency(tax.payable)}</td>
                            <td className="py-3 px-3 text-center font-mono text-[10px] text-[var(--crm-ink-soft)]">{tax.dueDate}</td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                tax.status === 'PAID' 
                                  ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30' 
                                  : 'bg-rose-950/20 text-rose-400 border border-rose-900/30 animate-pulse'
                              }`}>
                                {tax.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right print:hidden">
                              {tax.status === 'UNPAID' ? (
                                <button 
                                  onClick={() => handlePayTax(tax.id)}
                                  className="bg-rose-950/30 hover:bg-rose-900/30 text-rose-400 font-mono text-[9px] uppercase font-bold border border-rose-900/30 px-3 py-1 rounded cursor-pointer transition"
                                >
                                  Pay & File
                                </button>
                              ) : (
                                <span className="text-[10px] font-mono text-emerald-400 flex items-center justify-end gap-1"><FiCheck size={10}/> Filed</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Ledger Chart of Accounts list */}
                <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left lg:col-span-5 space-y-4">
                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3">
                      Corporate Chart of Accounts & Balances
                    </h3>
                    <p className="text-[10px] text-[var(--crm-ink-faint)] mt-1 font-mono">
                      Running balances inside CRM double-entry ledger accounts.
                    </p>
                  </div>

                  <div className="space-y-2.5 font-mono text-[11px]">
                    {[
                      { name: '1001 - HDFC Bank Current A/C', category: 'ASSETS', bal: bankBalance, color: 'text-teal-400' },
                      { name: '1002 - Cash Petty Book', category: 'ASSETS', bal: cashBalance, color: 'text-amber-400' },
                      { name: '2001 - Invoices Sundry Debtors', category: 'ASSETS', bal: 7900000, color: 'text-indigo-400' },
                      { name: '3001 - Salaries & Wages Payable', category: 'LIABILITIES', bal: totalSalaryPayable, color: 'text-rose-400' },
                      { name: '3002 - TDS Tax Accruals A/C', category: 'LIABILITIES', bal: taxCompliance.find(t=>t.id==='TX-02').status === 'UNPAID' ? 145000 : 0, color: 'text-rose-400' },
                      { name: '3003 - GST Net Liability A/C', category: 'LIABILITIES', bal: taxCompliance.find(t=>t.id==='TX-01').status === 'UNPAID' ? 845200 : 0, color: 'text-rose-400' },
                      { name: '4001 - Corporate Sales Revenue', category: 'REVENUES', bal: 92800000, color: 'text-emerald-400' },
                      { name: '5001 - HR Office Salaries Expense', category: 'EXPENSES', bal: 18500000, color: 'text-orange-400' }
                    ].map(acc => (
                      <div key={acc.name} className="flex justify-between items-center p-2.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-[var(--crm-ink-soft)] font-semibold block">{acc.name}</span>
                          <span className="text-[8px] text-[var(--crm-ink-faint)] font-bold">{acc.category}</span>
                        </div>
                        <span className={`font-bold ${acc.color}`}>{fmtCurrency(acc.bal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
