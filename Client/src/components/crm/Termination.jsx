import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FiUserX, FiPrinter, FiSend, FiX, FiCheck, FiAlertCircle,
  FiCalendar, FiFileText, FiShield, FiLock
} from 'react-icons/fi';
import { employeesApi } from '../../api/employees';

export default function TerminationLetterModal({
  isOpen = true,
  onClose,
  employee: initialEmployee = null,
  allEmployees = []
}) {
  const printRef = useRef(null);
  const [selectedEmployee, setSelectedEmployee] = useState(initialEmployee);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('PREVIEW'); // Default to PREVIEW per user request
  const [updateStatusToInactive, setUpdateStatusToInactive] = useState(true);

  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const currentYear = new Date().getFullYear();
  const defaultRefNo = `ITO/HR/TL/${currentYear}/${Math.floor(1000 + Math.random() * 9000)}`;

  const [formData, setFormData] = useState({
    date: todayStr,
    refNo: defaultRefNo,
    effectiveDate: todayStr,
    reason: 'repeated performance non-compliance and violation of company operational discipline policies',
    handoverDate: todayStr,
    settlementDays: '30',
    founderName: 'Md Ramiz Raza Khan',
    founderTitle: 'Founder & Proprietor',
    hrSignatory: 'HR Manager / Authorized Signatory'
  });

  useEffect(() => {
    if (initialEmployee) {
      setSelectedEmployee(initialEmployee);
    }
  }, [initialEmployee]);

  if (!isOpen) return null;

  const empName = selectedEmployee ? (selectedEmployee.name || selectedEmployee.fullName || 'Employee') : '[Employee Full Name]';
  const empId = selectedEmployee ? (selectedEmployee.employeeId || selectedEmployee._id || 'EMP-000') : '[Employee ID]';
  const empPosition = selectedEmployee ? (selectedEmployee.position || selectedEmployee.role || 'Designation') : '[Designation]';
  const empDept = selectedEmployee ? (selectedEmployee.department || 'Department') : '[Department Name]';
  const empEmail = selectedEmployee?.email || '';

  const getLastName = (nameStr) => {
    if (!nameStr || nameStr.startsWith('[')) return '[Employee Last Name]';
    const parts = nameStr.trim().split(' ');
    return parts.length > 1 ? parts[parts.length - 1] : parts[0];
  };

  const handleSendLetter = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee first.');
      return;
    }

    setSubmitting(true);
    try {
      const formattedBody = `
Dear Mr./Ms. ${getLastName(empName)},

This letter serves as official notification that your employment with India Trade Overseas Private Limited is being terminated, effective ${formData.effectiveDate}.

This decision has been made due to ${formData.reason}.

Details & Instructions:
1. Effective Date of Termination: ${formData.effectiveDate}
2. Handover & Asset Return: You are required to hand over all company property, credentials, ID cards, hardware, and project files to HR / Management by ${formData.handoverDate}.
3. Final Settlement: Your full and final settlement, including any accrued salary and applicable dues, will be processed within ${formData.settlementDays} working days after complete clearance.

Please treat this notice as final. We thank you for your service and wish you well in your future endeavors.

Sincerely,

For India Trade Overseas Private Limited

${formData.founderName}
${formData.founderTitle}

${formData.hrSignatory}
      `.trim();

      const payload = {
        employeeId: selectedEmployee._id || selectedEmployee.employeeId || selectedEmployee.email,
        letterType: 'TERMINATION',
        subject: `NOTICE OF TERMINATION OF EMPLOYMENT — ${empName}`,
        refNo: formData.refNo,
        updateStatusToInactive,
        letterData: {
          ...formData,
          employeeName: empName,
          employeeId: empId,
          department: empDept,
          position: empPosition,
          formattedBody
        }
      };

      const res = await employeesApi.sendLetter(payload);
      if (res && res.success) {
        toast.success(`Termination notice dispatched to ${empEmail || empName} email & notification sent!`);
        if (onClose) onClose();
      } else {
        toast.error(res?.message || 'Failed to dispatch termination notice.');
      }
    } catch (err) {
      console.error('Error sending termination letter:', err);
      toast.error('Failed to send termination notice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const printWindow = window.open(windowUrl, uniqueName, 'left=100,top=100,width=850,height=900');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Termination Letter — ${empName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #0f172a; line-height: 1.5; font-size: 13px; }
            .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 24px; }
            .company-name { font-size: 20px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
            .tagline { font-style: italic; color: #0284c7; font-size: 12px; margin-top: 4px; }
            .title { text-align: center; font-size: 16px; font-weight: bold; color: #b91c1c; margin: 20px 0; text-transform: uppercase; letter-spacing: 1px; text-decoration: underline; }
            .meta-grid { margin-bottom: 20px; }
            .signatures { margin-top: 40px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs font-sans overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-4xl border rounded-md shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
          style={{ background: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line)' }}
        >
          {/* Header Bar */}
          <div className="p-4 border-b flex items-center justify-between flex-wrap gap-2" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' }}>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-500">
                <FiUserX size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--crm-heading)] flex items-center gap-2">
                  Official Termination Letter Generator
                </h2>
                <p className="text-[10px] text-[var(--crm-ink-faint)]">
                  Dispatches official notice to employee email & creates instant security notification
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-[var(--crm-bg)] p-0.5 rounded border border-[var(--crm-line)]">
                <button
                  onClick={() => setActiveTab('FORM')}
                  className={`px-3 py-1 text-[10px] uppercase font-bold rounded transition-colors ${
                    activeTab === 'FORM'
                      ? 'bg-[var(--crm-accent)] text-[var(--crm-bg)]'
                      : 'text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
                  }`}
                >
                  Edit Details
                </button>
                <button
                  onClick={() => setActiveTab('PREVIEW')}
                  className={`px-3 py-1 text-[10px] uppercase font-bold rounded transition-colors ${
                    activeTab === 'PREVIEW'
                      ? 'bg-[var(--crm-accent)] text-[var(--crm-bg)]'
                      : 'text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
                  }`}
                >
                  Letterhead Preview
                </button>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-sm hover:bg-[var(--crm-bg)] text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] transition-colors"
              >
                <FiX size={16} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

            {allEmployees.length > 0 && (
              <div className="p-3 border rounded-sm bg-[var(--crm-bg-sunken)] space-y-1.5" style={{ borderColor: 'var(--crm-line)' }}>
                <label className="block text-[9px] uppercase tracking-wider font-bold text-[var(--crm-ink-faint)]">
                  Select Target Employee *
                </label>
                <select
                  value={selectedEmployee?._id || ''}
                  onChange={(e) => {
                    const found = allEmployees.find(emp => String(emp._id) === String(e.target.value));
                    setSelectedEmployee(found || null);
                  }}
                  className="w-full text-xs p-2 rounded border outline-none bg-[var(--crm-bg)] text-[var(--crm-heading)] border-[var(--crm-line)]"
                >
                  <option value="">Choose employee...</option>
                  {allEmployees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name || emp.fullName} ({emp.employeeId || 'ID'}) — {emp.position || emp.role} [{emp.email}]
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeTab === 'FORM' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-bold mb-1 text-[var(--crm-ink-faint)]">Ref. Number</label>
                  <input
                    type="text"
                    value={formData.refNo}
                    onChange={(e) => setFormData({ ...formData, refNo: e.target.value })}
                    className="w-full p-2 rounded border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] border-[var(--crm-line)]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-bold mb-1 text-[var(--crm-ink-faint)]">Effective Date of Termination *</label>
                  <input
                    type="text"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    className="w-full p-2 rounded border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] border-[var(--crm-line)]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[9px] uppercase tracking-wider font-bold mb-1 text-[var(--crm-ink-faint)]">Reason for Termination *</label>
                  <textarea
                    rows={2}
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="State reason: e.g. severe misconduct, failure to improve performance under PIP, policy violation..."
                    className="w-full p-2 rounded border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] border-[var(--crm-line)] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-bold mb-1 text-[var(--crm-ink-faint)]">Asset & Credential Handover Date</label>
                  <input
                    type="text"
                    value={formData.handoverDate}
                    onChange={(e) => setFormData({ ...formData, handoverDate: e.target.value })}
                    className="w-full p-2 rounded border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] border-[var(--crm-line)]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-bold mb-1 text-[var(--crm-ink-faint)]">Full & Final Settlement Period (Days)</label>
                  <input
                    type="number"
                    value={formData.settlementDays}
                    onChange={(e) => setFormData({ ...formData, settlementDays: e.target.value })}
                    className="w-full p-2 rounded border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] border-[var(--crm-line)]"
                  />
                </div>

                <div className="md:col-span-2 pt-2 border-t border-[var(--crm-line)]">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-rose-400">
                    <input
                      type="checkbox"
                      checked={updateStatusToInactive}
                      onChange={(e) => setUpdateStatusToInactive(e.target.checked)}
                      className="rounded accent-rose-600"
                    />
                    Mark employee status as INACTIVE in system upon dispatch
                  </label>
                </div>
              </div>
            ) : (
              /* PREVIEW TAB */
              <div className="border rounded bg-white text-slate-900 p-6 sm:p-10 font-sans shadow-md space-y-6" ref={printRef}>
                <div className="text-center border-b-2 border-sky-600 pb-4">
                  <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-900 tracking-wider">
                    INDIA TRADE OVERSEAS PRIVATE LIMITED
                  </h1>
                  <p className="text-xs font-semibold italic text-sky-700 mt-1">
                    Where Quality Meets Global Demand
                  </p>
                </div>

                <div className="text-center">
                  <h2 className="text-base font-bold uppercase text-rose-700 tracking-widest border-b border-rose-200 inline-block pb-1">
                    TERMINATION LETTER
                  </h2>
                </div>

                <div className="flex justify-between items-start text-xs text-slate-700 font-mono border-b border-slate-100 pb-3">
                  <div>
                    <p><strong>Ref. No.:</strong> {formData.refNo}</p>
                  </div>
                  <div className="text-right">
                    <p><strong>Date:</strong> {formData.date}</p>
                  </div>
                </div>

                <div className="text-xs text-slate-800 space-y-0.5 leading-relaxed">
                  <p className="font-bold">To,</p>
                  <p className="font-bold text-sm text-slate-900">{empName}</p>
                  <p>{empPosition}</p>
                  <p>Employee ID: {empId}</p>
                  <p>Department: {empDept}</p>
                </div>

                <div className="text-xs font-bold text-slate-900 border-l-4 border-rose-600 pl-3 py-1 bg-rose-50/60">
                  Subject: Formal Notice of Termination of Employment
                </div>

                <div className="text-xs leading-relaxed text-slate-800 space-y-3">
                  <p>Dear Mr./Ms. {getLastName(empName)},</p>

                  <p>
                    This letter serves as official notification that your employment with <strong>India Trade Overseas Private Limited</strong> is being terminated, effective <strong>{formData.effectiveDate}</strong>.
                  </p>

                  <p>
                    This decision has been made due to <strong>{formData.reason}</strong>.
                  </p>

                  <p className="font-bold text-slate-900 mt-2">Details & Mandatory Instructions:</p>

                  <ol className="list-decimal pl-5 space-y-2">
                    <li>
                      <strong>Effective Date of Termination:</strong> {formData.effectiveDate}
                    </li>
                    <li>
                      <strong>Handover & Asset Return:</strong> You are required to hand over all company property, credentials, ID badges, equipment, files, and materials to HR / Management by <strong>{formData.handoverDate}</strong>.
                    </li>
                    <li>
                      <strong>Final Settlement:</strong> Your full and final settlement, including any accrued salary and applicable dues, will be processed within <strong>{formData.settlementDays} working days</strong> after complete clearance.
                    </li>
                  </ol>

                  <p>
                    Please treat this notice as final. We thank you for your service and wish you well in your future endeavors.
                  </p>
                </div>

                <div className="pt-6 border-t border-slate-200">
                  <p className="text-xs font-semibold text-slate-800">Sincerely,</p>
                  <p className="text-xs font-bold text-slate-900 mt-1">For India Trade Overseas Private Limited</p>

                  <div className="grid grid-cols-2 gap-8 mt-12 text-xs text-slate-800">
                    <div>
                      <div className="border-t border-slate-400 pt-1 font-bold">
                        {formData.founderName}
                      </div>
                      <div className="text-[10px] text-slate-600">{formData.founderTitle}</div>
                    </div>
                    <div>
                      <div className="border-t border-slate-400 pt-1 font-bold">
                        {formData.hrSignatory}
                      </div>
                      <div className="text-[10px] text-slate-600">Authorized Signatory</div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 border-t-2 border-dashed border-slate-300 pt-4 text-xs space-y-3">
                  <h3 className="font-bold uppercase tracking-wider text-slate-900">Employee Acknowledgement</h3>
                  <p className="text-slate-700">
                    I, <strong>{empName}</strong>, acknowledge receipt of this Termination Notice.
                  </p>
                  <div className="grid grid-cols-2 gap-8 pt-6 text-slate-700">
                    <div>Employee Signature: ________________________</div>
                    <div>Date: ________________________</div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer Bar */}
          <div className="p-4 border-t flex flex-wrap items-center justify-between gap-3" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' }}>
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs uppercase font-bold rounded border flex items-center gap-1.5 transition-colors bg-blue-200 text-blue-950 border-blue-300 hover:bg-blue-300"
            >
              <FiPrinter size={14} /> Print / Download PDF
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs uppercase font-bold rounded border text-[var(--crm-heading)] border-[var(--crm-line)] hover:bg-[var(--crm-bg)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSendLetter}
                disabled={submitting || !selectedEmployee}
                className="px-5 py-2 text-xs font-bold uppercase rounded bg-rose-700 hover:bg-rose-800 text-white flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                <FiSend size={14} />
                {submitting ? 'Dispatching Notice...' : 'Send Mail & Notification'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
