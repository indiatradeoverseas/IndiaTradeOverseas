import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiDollarSign, 
  FiTrendingUp, 
  FiFileText, 
  FiAlertCircle, 
  FiCheck, 
  FiX, 
  FiCalendar, 
  FiPrinter, 
  FiRotateCw, 
  FiDownload, 
  FiBook, 
  FiCreditCard, 
  FiUpload, 
  FiPlus, 
  FiTrendingDown,
  FiSearch,
  FiLink
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

// Framer motion animation configs
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 18 } }
};

export default function FinanceDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('ledgers');
  const [loading, setLoading] = useState(false);

  // --- LEDGER STATE ---
  const [selectedLedger, setSelectedLedger] = useState('customer'); // 'customer', 'supplier', 'expense'
  const [customerLedger, setCustomerLedger] = useState([
    { id: 'TX-1001', date: '2026-08-25', ref: 'INV-192', description: 'Basmati Rice shipment billing to Al-Jamil Importers', debit: 4500000, credit: 0, balance: 4500000 },
    { id: 'TX-1002', date: '2026-08-24', ref: 'PAY-892', description: 'Advance received from EuroFoods for Tea order', debit: 0, credit: 1500000, balance: 3000000 },
    { id: 'TX-1003', date: '2026-08-22', ref: 'INV-190', description: 'Coal aggregates delivery billing to Acme Steel Ltd', debit: 2800000, credit: 0, balance: 5800000 },
    { id: 'TX-1004', date: '2026-08-20', ref: 'PAY-888', description: 'Final payment receipt for Invoice INV-188', debit: 0, credit: 2800000, balance: 3000000 }
  ]);

  const [supplierLedger, setSupplierLedger] = useState([
    { id: 'TX-2001', date: '2026-08-24', ref: 'PO-981', description: 'Rice procurement invoice from Punjab Agro Farms', debit: 0, credit: 3200000, balance: -3200000 },
    { id: 'TX-2002', date: '2026-08-22', ref: 'SP-450', description: 'Payment disbursed to Coal Mine supplier Dhanbad Minerals', debit: 1800000, credit: 0, balance: -1400000 },
    { id: 'TX-2003', date: '2026-08-18', ref: 'PO-975', description: 'Tea leaf sacks purchase billing from Assam Estates', debit: 0, credit: 950000, balance: -2350000 }
  ]);

  const [expenseLedger, setExpenseLedger] = useState([
    { id: 'TX-3001', date: '2026-08-25', ref: 'JV-879', description: 'Office lunch catering reimbursement (PC-102)', debit: 3200, credit: 0, balance: 3200 },
    { id: 'TX-3002', date: '2026-08-22', ref: 'JV-866', description: 'Office electric utility bill settlement', debit: 45000, credit: 0, balance: 48200 },
    { id: 'TX-3003', date: '2026-08-15', ref: 'JV-854', description: 'AWS cloud architecture hosting fees', debit: 84000, credit: 0, balance: 132200 },
    { id: 'TX-3004', date: '2026-08-10', ref: 'JV-842', description: 'Office warehouse lease rent payment', debit: 250000, credit: 0, balance: 382200 }
  ]);

  // Form state for new journal entry
  const [journalForm, setJournalForm] = useState({
    date: new Date().toISOString().split('T')[0],
    ref: '',
    description: '',
    ledgerType: 'customer',
    amount: '',
    entryType: 'debit' // 'debit' or 'credit'
  });

  // --- BANK RECONCILIATION STATE ---
  const [uploadedStatement, setUploadedStatement] = useState(null);
  const [reconBankRecords, setReconBankRecords] = useState([
    { id: 'BK-901', date: '2026-08-24', label: 'NEFT IN: AL-JAMIL RICE EXPORTS', amount: 4500000, type: 'DEPOSIT', matched: false, crmRef: null },
    { id: 'BK-902', date: '2026-08-22', label: 'IMPS OUT: DHANBAD MINERAL SUPPLIES', amount: 1800000, type: 'WITHDRAWAL', matched: false, crmRef: null },
    { id: 'BK-903', date: '2026-08-21', label: 'CHQ IN: ACME STEEL LTD', amount: 2800000, type: 'DEPOSIT', matched: false, crmRef: null },
    { id: 'BK-904', date: '2026-08-20', label: 'BANK CHARGES - FOREX OUTWARD', amount: 1250, type: 'WITHDRAWAL', matched: false, crmRef: null }
  ]);

  const [reconCrmEntries, setReconCrmEntries] = useState([
    { id: 'CRM-201', date: '2026-08-25', description: 'Rice Invoice INV-192 (Al-Jamil)', amount: 4500000, type: 'DEPOSIT', reconciled: false },
    { id: 'CRM-202', date: '2026-08-22', description: 'Supplier Payment Dhanbad (SP-450)', amount: 1800000, type: 'WITHDRAWAL', reconciled: false },
    { id: 'CRM-203', date: '2026-08-22', description: 'Coal Invoice INV-190 (Acme Steel)', amount: 2800000, type: 'DEPOSIT', reconciled: false }
  ]);

  // --- PETTY CASH STATE ---
  const [pettyCashRequests, setPettyCashRequests] = useState([
    { id: 'PC-104', date: '2026-08-25', category: 'Courier & Freight', amount: 4500, description: 'Emergency cargo dispatch courier fees to warehouse', status: 'PENDING' },
    { id: 'PC-105', date: '2026-08-24', category: 'Office Stationery', amount: 1850, description: 'Purchase of marker boards and whiteboard duster pens', status: 'PENDING' },
    { id: 'PC-106', date: '2026-08-24', category: 'Hardware Replacement', amount: 12500, description: 'Network switch power supply failure replacement part', status: 'PENDING' },
    { id: 'PC-102', date: '2026-08-20', category: 'Refreshments', amount: 3200, description: 'Catering for team alignment meeting', status: 'APPROVED' }
  ]);

  const [pettyCashForm, setPettyCashForm] = useState({
    amount: '',
    category: 'Office Stationery',
    description: '',
    receipt: null
  });

  // --- REPORTS STATE ---
  const [reportType, setReportType] = useState('pl'); // 'pl', 'cashflow', 'commission'
  const [reportYear, setReportYear] = useState('2026');
  const [reportMonth, setReportMonth] = useState('08');

  // Sync / Load
  const handleSync = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Accrual adjustments and outstanding invoice metrics loaded.');
    }, 500);
  };

  // Format currency
  const fmtCurrency = (n) => `₹${Math.abs(Number(n || 0)).toLocaleString('en-IN')}${n < 0 ? ' (Dr)' : ''}`;

  // Handle Manual Journal Post
  const handleJournalPost = (e) => {
    e.preventDefault();
    const { ref, description, ledgerType, amount, entryType } = journalForm;
    if (!description || !amount) {
      toast.error('Please specify transaction details and amount.');
      return;
    }

    const amtNum = Number(amount);
    const newTxId = `TX-${Math.floor(Math.random() * 9000) + 1000}`;
    const postingDate = journalForm.date;

    if (ledgerType === 'customer') {
      const lastBal = customerLedger.length > 0 ? customerLedger[0].balance : 0;
      const creditAmt = entryType === 'credit' ? amtNum : 0;
      const debitAmt = entryType === 'debit' ? amtNum : 0;
      const nextBal = lastBal + debitAmt - creditAmt;

      const newTx = { id: newTxId, date: postingDate, ref: ref || 'JV-GEN', description, debit: debitAmt, credit: creditAmt, balance: nextBal };
      setCustomerLedger(prev => [newTx, ...prev]);
    } else if (ledgerType === 'supplier') {
      const lastBal = supplierLedger.length > 0 ? supplierLedger[0].balance : 0;
      const creditAmt = entryType === 'credit' ? amtNum : 0;
      const debitAmt = entryType === 'debit' ? amtNum : 0;
      const nextBal = lastBal + debitAmt - creditAmt;

      const newTx = { id: newTxId, date: postingDate, ref: ref || 'JV-GEN', description, debit: debitAmt, credit: creditAmt, balance: nextBal };
      setSupplierLedger(prev => [newTx, ...prev]);
    } else {
      const lastBal = expenseLedger.length > 0 ? expenseLedger[0].balance : 0;
      const newTx = { id: newTxId, date: postingDate, ref: ref || 'JV-GEN', description, debit: amtNum, credit: 0, balance: lastBal + amtNum };
      setExpenseLedger(prev => [newTx, ...prev]);
    }

    toast.success(`Manual journal transaction ${newTxId} posted into corporate ledger ledger.`);
    setJournalForm({
      date: new Date().toISOString().split('T')[0],
      ref: '',
      description: '',
      ledgerType: ledgerType,
      amount: '',
      entryType: 'debit'
    });
  };

  // Handle Statement CSV Upload Simulation
  const handleStatementUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedStatement(file.name);
    toast.success(`Bank CSV statement "${file.name}" uploaded successfully! 🏦`);
  };

  // Perform Bank Reconciliation match
  const handleMatchReconcile = (bankId, crmId) => {
    const bRecord = reconBankRecords.find(b => b.id === bankId);
    const cRecord = reconCrmEntries.find(c => c.id === crmId);

    if (!bRecord || !cRecord) return;
    if (bRecord.amount !== cRecord.amount || bRecord.type !== cRecord.type) {
      toast.error('Reconciliation Error: Transaction value or posting type (Deposit/Withdrawal) does not match.');
      return;
    }

    // Set match states
    setReconBankRecords(prev => prev.map(b => b.id === bankId ? { ...b, matched: true, crmRef: cRecord.id } : b));
    setReconCrmEntries(prev => prev.map(c => c.id === crmId ? { ...c, reconciled: true } : c));
    toast.success(`Matched ${bRecord.id} with ${cRecord.id}. Reconciliation entry signed.`);
  };

  // Trigger Automatic suggestions matching
  const handleAutoReconcile = () => {
    let matchesCount = 0;
    reconBankRecords.forEach(b => {
      if (!b.matched) {
        const bestMatch = reconCrmEntries.find(c => !c.reconciled && c.amount === b.amount && c.type === b.type);
        if (bestMatch) {
          handleMatchReconcile(b.id, bestMatch.id);
          matchesCount++;
        }
      }
    });

    if (matchesCount > 0) {
      toast.success(`Auto-Match Engine complete. Successfully reconciled ${matchesCount} records.`);
    } else {
      toast.error('No auto-match matches found. Manual reconciliation required for remaining items.');
    }
  };

  // Handle Petty Cash expense submission
  const handlePettyCashSubmit = (e) => {
    e.preventDefault();
    const { amount, category, description } = pettyCashForm;
    if (!amount || !description) {
      toast.error('Please specify petty cash amount and description.');
      return;
    }

    const newRequest = {
      id: `PC-${Math.floor(Math.random() * 900) + 100}`,
      date: new Date().toISOString().split('T')[0],
      category,
      amount: Number(amount),
      description,
      status: 'PENDING'
    };

    setPettyCashRequests(prev => [newRequest, ...prev]);
    toast.success(`Petty Cash voucher request ${newRequest.id} created and routed for manager approval!`);
    setPettyCashForm({ amount: '', category: 'Office Stationery', description: '', receipt: null });
  };

  // Get active ledger data
  const getActiveLedgerData = () => {
    if (selectedLedger === 'customer') return customerLedger;
    if (selectedLedger === 'supplier') return supplierLedger;
    return expenseLedger;
  };

  // Generate mockup reports export
  const handleDownloadReport = () => {
    const filename = `${reportType.toUpperCase()}_Report_${reportYear}_${reportMonth}.csv`;
    let rows = [];

    if (reportType === 'pl') {
      rows = [
        ['Statement of Profit & Loss', `Period: ${reportMonth}/${reportYear}`],
        [],
        ['Particulars', 'Amount (INR)'],
        ['Operating Revenues (Sales)', '9,28,00,000'],
        ['Less: Cost of Materials Sold', '4,85,00,000'],
        ['Gross Operating Profit', '4,43,00,000'],
        [],
        ['Operating Expenses (OPEX)', ''],
        ['Employee Salaries & Allowances', '1,85,00,000'],
        ['Office Rents & Utilities', '3,50,000'],
        ['IT Infrastructure & AWS Hosting', '84,000'],
        ['Sales Commission Disbursements', '2,81,500'],
        ['Petty Cash Office Expenses', '3,200'],
        ['Total Operating Expenses', '1,92,18,700'],
        [],
        ['Net Earnings before Tax (EBT)', '2,50,81,300'],
        ['Corporate GST Liability', '8,45,200'],
        ['Net Profit after Tax', '2,42,36,100']
      ];
    } else if (reportType === 'cashflow') {
      rows = [
        ['Statement of Cash Flows', `Period: ${reportMonth}/${reportYear}`],
        [],
        ['Category', 'Particulars', 'Inflow (INR)', 'Outflow (INR)', 'Net Flow (INR)'],
        ['Operating Activities', 'Customer Invoice Payments Receipts', '1,45,00,000', '0', '1,45,00,000'],
        ['Operating Activities', 'Supplier Payments Settled', '0', '18,00,000', '-18,00,000'],
        ['Operating Activities', 'Salary Payout Transferred', '0', '2,32,000', '-2,32,000'],
        ['Operating Activities', 'Petty Cash Disbursements', '0', '3,200', '-3,200'],
        ['Operating Activities', 'GST Monthly Deposits', '0', '8,45,200', '-8,45,200'],
        ['Investing Activities', 'Office Laptop Procurement', '0', '1,45,000', '-1,45,000'],
        [],
        ['Summary Statement', 'Opening Cash/Bank Balance', '', '', '11,42,00,000'],
        ['Summary Statement', 'Net Cash Generated', '', '', '1,14,74,600'],
        ['Summary Statement', 'Closing Cash/Bank Balance', '', '', '12,56,74,600']
      ];
    } else {
      rows = [
        ['Sales Executive Commissions Ledger', `Period: ${reportMonth}/${reportYear}`],
        [],
        ['Rep Name', 'Total Sales Logged (INR)', 'Commission Earned (INR)', 'Paid (INR)', 'Outstanding (INR)'],
        ['Amit Sharma', '1,03,00,000', '1,54,500', '0', '1,54,500'],
        ['Sumit Joshi', '1,20,00,000', '1,44,000', '0', '1,44,000'],
        ['Karan Malhotra', '35,00,000', '70,000', '70,000', '0']
      ];
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
    toast.success(`Report downloaded successfully: ${filename}`);
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
          <span className="text-[10px] uppercase tracking-[0.25em] text-teal-500 font-bold block font-mono">Accounts Ledger Console</span>
          <h1 className="text-2xl sm:text-3xl font-normal text-[var(--crm-heading)] tracking-tight">Double-Entry Bookkeeping Console</h1>
          <p className="text-xs text-[var(--crm-ink-faint)] font-light mt-0.5">
            Accountant: <strong className="text-[var(--crm-heading)] font-semibold font-mono">{user?.name || user?.fullName || 'Finance Accountant'}</strong> &bull; Ledger Node: <span className="text-[var(--crm-heading)] font-semibold font-mono">General Journal</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-stretch md:self-auto font-mono print:hidden">
          <button 
            onClick={handleSync}
            className="flex items-center gap-1.5 bg-[var(--crm-bg-sunken)] hover:bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] border border-[var(--crm-line)] px-3.5 py-2 text-[10px] uppercase font-bold tracking-wider rounded transition shadow-sm cursor-pointer"
          >
            <FiRotateCw className={`${loading ? 'animate-spin' : ''}`} size={12} /> Sync Transactions
          </button>
        </div>
      </motion.div>

      {/* Tabs navigation */}
      <motion.div variants={itemVariants} className="bg-[var(--crm-bg-raised)] border-y border-[var(--crm-line)] px-6 py-1 flex overflow-x-auto scrollbar-none shadow-sm print:hidden">
        <nav className="flex space-x-8 min-w-max">
          {[
            { id: 'ledgers', label: 'Ledgers Registry', icon: FiBook },
            { id: 'reconcile', label: 'Bank Reconciliation', icon: FiRotateCw },
            { id: 'pettycash', label: 'Petty Cash Book', icon: FiCreditCard },
            { id: 'reports', label: 'Statement Reports', icon: FiFileText }
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
            {/* TAB 1: LEDGERS REGISTRY & VOUCHERS */}
            {activeTab === 'ledgers' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Manual Journal Entry Posting Form */}
                <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left lg:col-span-4 space-y-4 h-fit">
                  <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3">
                    Record Manual Journal Voucher
                  </h3>
                  
                  <form onSubmit={handleJournalPost} className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-mono tracking-wider text-[var(--crm-ink-faint)] block">Posting Date</label>
                      <input 
                        type="date"
                        value={journalForm.date}
                        onChange={(e) => setJournalForm(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3 py-2 rounded focus:outline-none focus:border-teal-500 text-[var(--crm-ink-soft)] font-mono"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-mono tracking-wider text-[var(--crm-ink-faint)] block">Reference No / Invoice ID</label>
                      <input 
                        type="text"
                        placeholder="e.g. INV-190, PO-981"
                        value={journalForm.ref}
                        onChange={(e) => setJournalForm(prev => ({ ...prev, ref: e.target.value }))}
                        className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3 py-2 rounded focus:outline-none focus:border-teal-500 text-[var(--crm-ink-soft)] font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-mono tracking-wider text-[var(--crm-ink-faint)] block">Ledger Classification</label>
                      <select 
                        value={journalForm.ledgerType}
                        onChange={(e) => setJournalForm(prev => ({ ...prev, ledgerType: e.target.value }))}
                        className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3 py-2 rounded focus:outline-none focus:border-teal-500 text-[var(--crm-ink-soft)] cursor-pointer"
                      >
                        <option value="customer">Sundry Debtors Ledger (Customers)</option>
                        <option value="supplier">Sundry Creditors Ledger (Suppliers)</option>
                        <option value="expense">Operating Expenses Ledger</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-mono tracking-wider text-[var(--crm-ink-faint)] block">Posting Type</label>
                        <select 
                          value={journalForm.entryType}
                          onChange={(e) => setJournalForm(prev => ({ ...prev, entryType: e.target.value }))}
                          disabled={journalForm.ledgerType === 'expense'} // expenses are always debited in general manual log
                          className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3 py-2 rounded focus:outline-none focus:border-teal-500 text-[var(--crm-ink-soft)] cursor-pointer disabled:opacity-50"
                        >
                          <option value="debit">DEBIT (Dr)</option>
                          <option value="credit">CREDIT (Cr)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-mono tracking-wider text-[var(--crm-ink-faint)] block">Amount (INR)</label>
                        <input 
                          type="number"
                          placeholder="Amount in ₹"
                          value={journalForm.amount}
                          onChange={(e) => setJournalForm(prev => ({ ...prev, amount: e.target.value }))}
                          className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3 py-2 rounded focus:outline-none focus:border-teal-500 text-[var(--crm-ink-soft)] font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-mono tracking-wider text-[var(--crm-ink-faint)] block">Narration / Description</label>
                      <textarea 
                        placeholder="Narration explaining the transaction audit details..."
                        rows="2"
                        value={journalForm.description}
                        onChange={(e) => setJournalForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3 py-2 rounded focus:outline-none focus:border-teal-500 text-[var(--crm-ink-soft)]"
                        required
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-teal-700 hover:bg-teal-600 text-white border border-teal-800 py-2.5 uppercase font-bold tracking-wider font-mono rounded transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                    >
                      <FiPlus size={14} /> Post Ledger Entry
                    </button>
                  </form>
                </div>

                {/* Ledgers Registry Viewer */}
                <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left lg:col-span-8 space-y-4">
                  <div className="border-b border-[var(--crm-line)] pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold">
                        General Subsidiary Ledgers Console
                      </h3>
                      <p className="text-[10px] text-[var(--crm-ink-faint)] mt-1 font-mono">
                        View Double-entry debits, credits and current running balance classifications.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {['customer', 'supplier', 'expense'].map(type => (
                        <button
                          key={type}
                          onClick={() => setSelectedLedger(type)}
                          className={`px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider font-bold rounded border cursor-pointer transition ${
                            selectedLedger === type
                              ? 'bg-teal-950/20 text-teal-400 border-teal-500/20'
                              : 'bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] border-[var(--crm-line)] hover:text-[var(--crm-ink-soft)]'
                          }`}
                        >
                          {type} ledger
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[var(--crm-bg-sunken)] font-mono text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] border-b border-[var(--crm-line)]">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Tx ID</th>
                          <th className="py-2.5 px-3">Ref ID</th>
                          <th className="py-2.5 px-3">Details / Narration</th>
                          <th className="py-2.5 px-3 text-right">Debit (Dr)</th>
                          <th className="py-2.5 px-3 text-right">Credit (Cr)</th>
                          <th className="py-2.5 px-3 text-right font-bold">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--crm-line)] font-mono">
                        {getActiveLedgerData().map((tx, idx) => (
                          <tr key={tx.id} className="hover:bg-[var(--crm-bg-sunken)] transition-colors">
                            <td className="py-3 px-3">{tx.date}</td>
                            <td className="py-3 px-3 text-[var(--crm-ink-faint)]">{tx.id}</td>
                            <td className="py-3 px-3 text-teal-400 font-bold">{tx.ref}</td>
                            <td className="py-3 px-3 max-w-[240px] truncate text-[var(--crm-ink-soft)]" title={tx.description}>{tx.description}</td>
                            <td className="py-3 px-3 text-right text-rose-300">{tx.debit > 0 ? fmtCurrency(tx.debit) : '—'}</td>
                            <td className="py-3 px-3 text-right text-emerald-300">{tx.credit > 0 ? fmtCurrency(tx.credit) : '—'}</td>
                            <td className="py-3 px-3 text-right text-[var(--crm-heading)] font-bold">{fmtCurrency(tx.balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: BANK RECONCILIATION */}
            {activeTab === 'reconcile' && (
              <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left space-y-6">
                <div className="border-b border-[var(--crm-line)] pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold">
                      Bank Statement Reconciliation Module
                    </h3>
                    <p className="text-[10px] text-[var(--crm-ink-faint)] mt-1 font-mono">
                      Reconcile uploaded corporate bank statement feeds with internal CRM cash ledger recordings.
                    </p>
                  </div>
                  <div className="flex gap-2 font-mono text-[9px] print:hidden">
                    <button 
                      onClick={handleAutoReconcile}
                      className="bg-teal-700 hover:bg-teal-600 text-white border border-teal-800 px-3.5 py-2 uppercase font-bold rounded cursor-pointer transition shadow"
                    >
                      Trigger Auto-Match Suggested Items
                    </button>
                  </div>
                </div>

                {/* Upload Section */}
                <div className="border border-dashed border-[var(--crm-line)] p-6 rounded-lg text-center bg-[var(--crm-bg-sunken)] max-w-xl mx-auto flex flex-col items-center justify-center space-y-3">
                  <FiUpload size={24} className="text-teal-400" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[var(--crm-heading)]">
                      {uploadedStatement ? `Uploaded Feed: ${uploadedStatement}` : 'Upload Corporate Statement CSV Feed'}
                    </p>
                    <p className="text-[10px] text-[var(--crm-ink-faint)]">Standard formatting (Date, Particulars, Transaction amount, Dr/Cr)</p>
                  </div>
                  <label className="bg-[var(--crm-bg-raised)] hover:bg-[var(--crm-bg)] text-[10px] uppercase font-bold tracking-wider font-mono border border-[var(--crm-line)] px-4 py-2 rounded cursor-pointer transition">
                    Browse File
                    <input type="file" accept=".csv" onChange={handleStatementUpload} className="hidden" />
                  </label>
                </div>

                {/* Reconciliation Split Pane Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                  {/* Left Side: Statement Feed */}
                  <div className="border border-[var(--crm-line)] p-4 rounded bg-[var(--crm-bg-sunken)]/40 space-y-3">
                    <h4 className="text-[10px] uppercase tracking-wider font-bold text-[var(--crm-ink-faint)] flex items-center gap-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full inline-block"></span> Uploaded Bank Statement Records
                    </h4>

                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar font-mono text-[11px]">
                      {reconBankRecords.map(bank => (
                        <div 
                          key={bank.id}
                          className={`p-3 rounded border flex justify-between items-center transition ${
                            bank.matched 
                              ? 'border-emerald-500/20 bg-emerald-500/5' 
                              : 'border-[var(--crm-line)] bg-[var(--crm-bg-raised)]'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-[9px]">
                              <span className="text-teal-400 font-bold">{bank.id}</span>
                              <span className="text-[var(--crm-ink-faint)]">{bank.date}</span>
                            </div>
                            <p className="text-[10px] font-semibold text-[var(--crm-heading)] max-w-[200px] truncate" title={bank.label}>{bank.label}</p>
                            <span className={`inline-block text-[8px] font-bold px-1.5 py-0.2 rounded ${bank.type === 'DEPOSIT' ? 'text-emerald-400 bg-emerald-950/20' : 'text-rose-400 bg-rose-950/20'}`}>
                              {bank.type}
                            </span>
                          </div>

                          <div className="text-right flex items-center gap-3">
                            <div>
                              <strong className={bank.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-rose-400'}>
                                {bank.type === 'DEPOSIT' ? '+' : '-'}{fmtCurrency(bank.amount)}
                              </strong>
                              {bank.matched && <span className="text-[8px] text-emerald-400 block font-bold">RECONCILED ({bank.crmRef})</span>}
                            </div>
                            {!bank.matched && (
                              <div className="flex flex-col gap-1">
                                <select 
                                  onChange={(e) => handleMatchReconcile(bank.id, e.target.value)}
                                  className="text-[9px] bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded px-1 py-0.5 outline-none cursor-pointer text-[var(--crm-ink-faint)]"
                                  defaultValue=""
                                >
                                  <option value="" disabled>Link CRM...</option>
                                  {reconCrmEntries.filter(c => !c.reconciled && c.amount === bank.amount && c.type === bank.type).map(c => (
                                    <option key={c.id} value={c.id}>{c.id} - Match</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Side: CRM Records */}
                  <div className="border border-[var(--crm-line)] p-4 rounded bg-[var(--crm-bg-sunken)]/40 space-y-3">
                    <h4 className="text-[10px] uppercase tracking-wider font-bold text-[var(--crm-ink-faint)] flex items-center gap-1">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full inline-block"></span> Internal CRM Ledgers Entries
                    </h4>

                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar font-mono text-[11px]">
                      {reconCrmEntries.map(crm => (
                        <div 
                          key={crm.id}
                          className={`p-3 rounded border flex justify-between items-center transition ${
                            crm.reconciled 
                              ? 'border-emerald-500/20 bg-emerald-500/5' 
                              : 'border-[var(--crm-line)] bg-[var(--crm-bg-raised)]'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-[9px]">
                              <span className="text-teal-400 font-bold">{crm.id}</span>
                              <span className="text-[var(--crm-ink-faint)]">{crm.date}</span>
                            </div>
                            <p className="text-[10px] font-semibold text-[var(--crm-heading)] max-w-[200px] truncate" title={crm.description}>{crm.description}</p>
                            <span className={`inline-block text-[8px] font-bold px-1.5 py-0.2 rounded ${crm.type === 'DEPOSIT' ? 'text-emerald-400 bg-emerald-950/20' : 'text-rose-400 bg-rose-950/20'}`}>
                              {crm.type === 'DEPOSIT' ? 'REVENUE' : 'EXPENSE'}
                            </span>
                          </div>

                          <div className="text-right">
                            <strong className={crm.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-rose-400'}>
                              {crm.type === 'DEPOSIT' ? '+' : '-'}{fmtCurrency(crm.amount)}
                            </strong>
                            {crm.reconciled ? (
                              <span className="text-[8px] text-emerald-400 block font-bold">MATCHED <FiCheck className="inline-block" size={8} /></span>
                            ) : (
                              <span className="text-[8px] text-amber-400 block font-bold animate-pulse">PENDING AUDIT</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PETTY CASH BOOK */}
            {activeTab === 'pettycash' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Petty Cash Expense request form */}
                <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left lg:col-span-5 space-y-4 h-fit">
                  <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3">
                    Log Petty Cash Voucher Expense
                  </h3>
                  
                  <form onSubmit={handlePettyCashSubmit} className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-mono tracking-wider text-[var(--crm-ink-faint)] block">Voucher Category</label>
                      <select 
                        value={pettyCashForm.category}
                        onChange={(e) => setPettyCashForm(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3 py-2 rounded focus:outline-none focus:border-teal-500 text-[var(--crm-ink-soft)] cursor-pointer"
                      >
                        <option value="Office Stationery">Office Stationery</option>
                        <option value="Refreshments">Refreshments</option>
                        <option value="Courier & Freight">Courier & Freight</option>
                        <option value="Travel Reimbursement">Travel Reimbursement</option>
                        <option value="Hardware Replacement">Hardware Replacement</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-mono tracking-wider text-[var(--crm-ink-faint)] block">Amount (INR)</label>
                      <input 
                        type="number"
                        placeholder="Voucher amount in ₹"
                        value={pettyCashForm.amount}
                        onChange={(e) => setPettyCashForm(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3 py-2 rounded focus:outline-none focus:border-teal-500 text-[var(--crm-ink-soft)] font-mono"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-mono tracking-wider text-[var(--crm-ink-faint)] block">Detailed Expense Narration</label>
                      <textarea 
                        placeholder="Explain expense item and specific client or task reference..."
                        rows="3"
                        value={pettyCashForm.description}
                        onChange={(e) => setPettyCashForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-3 py-2 rounded focus:outline-none focus:border-teal-500 text-[var(--crm-ink-soft)]"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-mono tracking-wider text-[var(--crm-ink-faint)] block">Attach Invoice Receipt (Mockup)</label>
                      <div className="border border-dashed border-[var(--crm-line)] p-4 rounded text-center bg-[var(--crm-bg-sunken)] hover:bg-[var(--crm-bg-raised)] cursor-pointer transition">
                        <span className="text-[10px] text-[var(--crm-ink-faint)]"><FiUpload size={14} className="inline-block mr-1"/> Upload Receipt JPG/PDF</span>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-teal-700 hover:bg-teal-600 text-white border border-teal-800 py-2.5 uppercase font-bold tracking-wider font-mono rounded transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                    >
                      <FiPlus size={14} /> Request Approval
                    </button>
                  </form>
                </div>

                {/* Petty Cash Requests Queue log */}
                <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left lg:col-span-7 space-y-4">
                  <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3">
                    Petty Cash Registry Book
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[var(--crm-bg-sunken)] font-mono text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] border-b border-[var(--crm-line)]">
                          <th className="py-2.5 px-3">Ref ID</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Expense Details</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--crm-line)] font-mono">
                        {pettyCashRequests.map(item => (
                          <tr key={item.id} className="hover:bg-[var(--crm-bg-sunken)] transition-colors">
                            <td className="py-3 px-3 text-teal-400 font-bold">{item.id}</td>
                            <td className="py-3 px-3">{item.date}</td>
                            <td className="py-3 px-3"><span className="bg-[var(--crm-bg-sunken)] px-1.5 py-0.5 rounded text-[9px] font-bold border border-[var(--crm-line)]">{item.category}</span></td>
                            <td className="py-3 px-3 max-w-[200px] truncate" title={item.description}>{item.description}</td>
                            <td className="py-3 px-3 text-right text-[var(--crm-heading)] font-bold">{fmtCurrency(item.amount)}</td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                item.status === 'APPROVED' 
                                  ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30' 
                                  : item.status === 'REJECTED'
                                    ? 'bg-rose-950/20 text-rose-400 border border-rose-900/30'
                                    : 'bg-amber-950/20 text-amber-400 border border-amber-900/30 animate-pulse'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: STATEMENT REPORTS */}
            {activeTab === 'reports' && (
              <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm text-left space-y-6">
                <div>
                  <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold border-b border-[var(--crm-line)] pb-3">
                    Corporate Financial Statements Generator
                  </h3>
                  <p className="text-[10px] text-[var(--crm-ink-faint)] mt-1 font-mono">
                    Filter ledger transactions and export statutory statements (Profit & Loss, Cash Flow).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded-lg text-xs font-mono">
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold block">Report Type</label>
                    <select 
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                      className="w-full bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] px-2.5 py-1.5 rounded focus:outline-none focus:border-teal-500 text-[var(--crm-ink-soft)] cursor-pointer"
                    >
                      <option value="pl">Profit & Loss (P&L) Statement</option>
                      <option value="cashflow">Cash Flow Statement</option>
                      <option value="commission">Sales Commission Statement</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold block">Filing Fiscal Year</label>
                    <select 
                      value={reportYear}
                      onChange={(e) => setReportYear(e.target.value)}
                      className="w-full bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] px-2.5 py-1.5 rounded focus:outline-none text-[var(--crm-ink-soft)] cursor-pointer"
                    >
                      <option value="2026">2026-2027</option>
                      <option value="2025">2025-2026</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold block">Filing Month</label>
                    <select 
                      value={reportMonth}
                      onChange={(e) => setReportMonth(e.target.value)}
                      className="w-full bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] px-2.5 py-1.5 rounded focus:outline-none text-[var(--crm-ink-soft)] cursor-pointer"
                    >
                      <option value="08">August</option>
                      <option value="07">July</option>
                      <option value="06">June</option>
                      <option value="05">May</option>
                    </select>
                  </div>

                  <div className="flex items-end print:hidden">
                    <button 
                      onClick={handleDownloadReport}
                      className="w-full bg-teal-700 hover:bg-teal-600 text-white border border-teal-800 py-1.5 uppercase font-bold tracking-wider rounded transition cursor-pointer shadow-md flex items-center justify-center gap-1.5 text-[9px]"
                    >
                      <FiDownload size={12} /> Download CSV Report
                    </button>
                  </div>
                </div>

                {/* Displaying preview of Profit & Loss report (selected by default) */}
                {reportType === 'pl' && (
                  <div className="border border-[var(--crm-line)] p-5 rounded-lg bg-[var(--crm-bg-sunken)]/20 font-mono text-xs max-w-2xl mx-auto space-y-4">
                    <div className="text-center space-y-1">
                      <h4 className="text-sm font-bold text-[var(--crm-heading)] uppercase">Statement of Profit and Loss (Un-Audited)</h4>
                      <p className="text-[9px] text-[var(--crm-ink-faint)]">Period Ending: August 31, 2026 &bull; Currency: INR (₹)</p>
                    </div>

                    <hr className="border-[var(--crm-line)]" />

                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center font-bold text-[var(--crm-heading)]">
                        <span>A. REVENUE FROM OPERATIONS</span>
                        <span>₹9,28,00,000</span>
                      </div>
                      <div className="pl-4 flex justify-between items-center text-[var(--crm-ink-faint)]">
                        <span>Corporate sales receipts</span>
                        <span>₹9,28,00,000</span>
                      </div>

                      <div className="flex justify-between items-center font-bold text-[var(--crm-heading)] pt-2">
                        <span>B. LESS: COST OF GOODS SOLD (COGS)</span>
                        <span className="text-rose-400">₹4,85,00,000</span>
                      </div>
                      <div className="pl-4 flex justify-between items-center text-[var(--crm-ink-faint)]">
                        <span>Procurement cost of materials</span>
                        <span>₹4,85,00,000</span>
                      </div>

                      <div className="flex justify-between items-center font-bold text-emerald-400 pt-2 border-t border-[var(--crm-line)] border-dashed">
                        <span>GROSS PROFIT (A - B)</span>
                        <span>₹4,43,00,000</span>
                      </div>

                      <div className="flex justify-between items-center font-bold text-[var(--crm-heading)] pt-3">
                        <span>C. LESS: OPERATING EXPENSES (OPEX)</span>
                        <span className="text-rose-400">₹1,92,18,700</span>
                      </div>
                      <div className="pl-4 flex justify-between items-center text-[var(--crm-ink-faint)]">
                        <span>Employee Payroll Salary Cost</span>
                        <span>₹1,85,00,000</span>
                      </div>
                      <div className="pl-4 flex justify-between items-center text-[var(--crm-ink-faint)]">
                        <span>Rent & Office utilities</span>
                        <span>₹3,50,000</span>
                      </div>
                      <div className="pl-4 flex justify-between items-center text-[var(--crm-ink-faint)]">
                        <span>IT Architecture hosting fees</span>
                        <span>₹84,000</span>
                      </div>
                      <div className="pl-4 flex justify-between items-center text-[var(--crm-ink-faint)]">
                        <span>Sales Commission payouts</span>
                        <span>₹2,81,500</span>
                      </div>
                      <div className="pl-4 flex justify-between items-center text-[var(--crm-ink-faint)]">
                        <span>Petty cash vouchers expense</span>
                        <span>₹3,200</span>
                      </div>

                      <div className="flex justify-between items-center font-bold text-emerald-400 pt-2 border-t border-[var(--crm-line)] border-dashed">
                        <span>NET EARNINGS BEFORE TAX (EBT)</span>
                        <span>₹2,50,81,300</span>
                      </div>

                      <div className="flex justify-between items-center text-[var(--crm-ink-faint)]">
                        <span>Less: Corporate GST Filing Due</span>
                        <span className="text-rose-400">₹8,45,200</span>
                      </div>

                      <div className="flex justify-between items-center font-bold text-teal-400 pt-2 border-t-2 border-[var(--crm-line)]">
                        <span>NET EARNINGS AFTER TAX (PAT)</span>
                        <span>₹2,42,36,100</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cash flow statement preview */}
                {reportType === 'cashflow' && (
                  <div className="border border-[var(--crm-line)] p-5 rounded-lg bg-[var(--crm-bg-sunken)]/20 font-mono text-xs max-w-2xl mx-auto space-y-4">
                    <div className="text-center space-y-1">
                      <h4 className="text-sm font-bold text-[var(--crm-heading)] uppercase">Statement of Cash Flows (Preview)</h4>
                      <p className="text-[9px] text-[var(--crm-ink-faint)]">Period Ending: August 31, 2026 &bull; Currency: INR (₹)</p>
                    </div>

                    <hr className="border-[var(--crm-line)]" />

                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center font-bold text-[var(--crm-heading)]">
                        <span>A. CASH FLOW FROM OPERATING ACTIVITIES</span>
                        <span>₹1,16,19,600</span>
                      </div>
                      <div className="pl-4 flex justify-between items-center text-[var(--crm-ink-faint)]">
                        <span>Inflow: Customer Payment Receipts</span>
                        <span className="text-emerald-400">+₹1,45,00,000</span>
                      </div>
                      <div className="pl-4 flex justify-between items-center text-[var(--crm-ink-faint)]">
                        <span>Outflow: Punjab Agro Suppliers Payouts</span>
                        <span className="text-rose-400">-₹18,00,000</span>
                      </div>
                      <div className="pl-4 flex justify-between items-center text-[var(--crm-ink-faint)]">
                        <span>Outflow: Salary Payroll Transfers</span>
                        <span className="text-rose-400">-₹2,32,000</span>
                      </div>
                      <div className="pl-4 flex justify-between items-center text-[var(--crm-ink-faint)]">
                        <span>Outflow: Tax Compliance deposits (GST)</span>
                        <span className="text-rose-400">-₹8,45,200</span>
                      </div>
                      <div className="pl-4 flex justify-between items-center text-[var(--crm-ink-faint)]">
                        <span>Outflow: Petty Cash Releases</span>
                        <span className="text-rose-400">-₹3,200</span>
                      </div>

                      <div className="flex justify-between items-center font-bold text-[var(--crm-heading)] pt-2">
                        <span>B. CASH FLOW FROM INVESTING ACTIVITIES</span>
                        <span className="text-rose-400">-₹1,45,000</span>
                      </div>
                      <div className="pl-4 flex justify-between items-center text-[var(--crm-ink-faint)]">
                        <span>Outflow: Purchase of IT hardware laptops</span>
                        <span className="text-rose-400">-₹1,45,000</span>
                      </div>

                      <div className="flex justify-between items-center font-bold text-emerald-400 pt-2 border-t border-[var(--crm-line)] border-dashed">
                        <span>NET CASH GENERATED (A + B)</span>
                        <span>+₹1,14,74,600</span>
                      </div>

                      <div className="flex justify-between items-center text-[var(--crm-ink-soft)] font-bold pt-3 border-t-2 border-[var(--crm-line)]">
                        <span>C. OPENING CASH & BANK BALANCES</span>
                        <span>₹11,42,00,000</span>
                      </div>
                      <div className="flex justify-between items-center text-teal-400 font-bold">
                        <span>D. CLOSING CASH & BANK BALANCES (Net + C)</span>
                        <span>₹12,56,74,600</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sales commissions preview */}
                {reportType === 'commission' && (
                  <div className="border border-[var(--crm-line)] p-5 rounded-lg bg-[var(--crm-bg-sunken)]/20 font-mono text-xs max-w-2xl mx-auto space-y-4">
                    <div className="text-center space-y-1">
                      <h4 className="text-sm font-bold text-[var(--crm-heading)] uppercase">Commissions Summary Report</h4>
                      <p className="text-[9px] text-[var(--crm-ink-faint)]">Period Ending: August 31, 2026 &bull; Currency: INR (₹)</p>
                    </div>

                    <hr className="border-[var(--crm-line)]" />

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[var(--crm-bg-sunken)] font-mono text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] border-b border-[var(--crm-line)]">
                            <th className="py-2.5 px-3">Sales Rep Name</th>
                            <th className="py-2.5 px-3 text-right">Total Deals Value</th>
                            <th className="py-2.5 px-3 text-right">Net Commission Earned</th>
                            <th className="py-2.5 px-3 text-right">Settled Amount</th>
                            <th className="py-2.5 px-3 text-right text-amber-400 font-bold">Outstanding Payable</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-[var(--crm-line)]">
                            <td className="py-3 px-3 font-semibold text-[var(--crm-heading)]">Amit Sharma</td>
                            <td className="py-3 px-3 text-right">₹1,03,00,000</td>
                            <td className="py-3 px-3 text-right">₹1,54,500</td>
                            <td className="py-3 px-3 text-right">₹0</td>
                            <td className="py-3 px-3 text-right text-amber-400 font-bold">₹1,54,500</td>
                          </tr>
                          <tr className="border-b border-[var(--crm-line)]">
                            <td className="py-3 px-3 font-semibold text-[var(--crm-heading)]">Sumit Joshi</td>
                            <td className="py-3 px-3 text-right">₹1,20,00,000</td>
                            <td className="py-3 px-3 text-right">₹1,44,000</td>
                            <td className="py-3 px-3 text-right">₹0</td>
                            <td className="py-3 px-3 text-right text-amber-400 font-bold">₹1,44,000</td>
                          </tr>
                          <tr className="border-b border-[var(--crm-line)]">
                            <td className="py-3 px-3 font-semibold text-[var(--crm-heading)]">Karan Malhotra</td>
                            <td className="py-3 px-3 text-right">₹35,00,000</td>
                            <td className="py-3 px-3 text-right">₹70,000</td>
                            <td className="py-3 px-3 text-right">₹70,000</td>
                            <td className="py-3 px-3 text-right text-teal-400 font-bold">₹0</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
