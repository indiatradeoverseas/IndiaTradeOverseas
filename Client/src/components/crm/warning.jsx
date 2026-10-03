import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FiAlertTriangle, FiPrinter, FiSend, FiX, FiCheck, FiUser,
  FiCalendar, FiFileText, FiShield, FiClock, FiUpload, FiTrash2
} from 'react-icons/fi';
import { employeesApi } from '../../api/employees';

export default function WarningLetterModal({
  isOpen = true,
  onClose,
  employee: initialEmployee = null,
  allEmployees = []
}) {
  const printRef = useRef(null);
  const [selectedEmployee, setSelectedEmployee] = useState(initialEmployee);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('PREVIEW'); // Default to PREVIEW per user request
  const [signatureImage, setSignatureImage] = useState(null);

  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const currentYear = new Date().getFullYear();
  const defaultRefNo = `ITO/HR/WL/${currentYear}/${Math.floor(1000 + Math.random() * 9000)}`;

  const [formData, setFormData] = useState({
    date: todayStr,
    refNo: defaultRefNo,
    reason: 'repeated absence, late reporting, and failure to meet assigned CRM targets',
    incident1: 'Repeated unexcused late arrivals and absence recorded on recent shifts.',
    incident2: 'Previous verbal reminders issued regarding punctuality and daily task submissions.',
    incident3: 'Mandatory company policy and operational reporting standards were not followed.',
    improvementDays: '7',
    signatoryType: 'FOUNDER', // Default to single signatory
    signatoryName: 'Md Ramiz Raza Khan',
    signatoryTitle: 'Founder & Proprietor',
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

  const handleSignatureUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, SVG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Signature file size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSignatureImage(reader.result);
      toast.success('Signature image uploaded successfully!');
    };
    reader.onerror = () => {
      toast.error('Failed to read signature image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSignature = () => {
    setSignatureImage(null);
    toast.success('Signature removed.');
  };

  const handleSendLetter = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee first.');
      return;
    }

    setSubmitting(true);
    try {
      const signoffText = formData.signatoryType === 'BOTH'
        ? `${formData.founderName || 'Md Ramiz Raza Khan'}\n${formData.founderTitle || 'Founder & Proprietor'}\n\n${formData.hrSignatory || 'HR Manager / Authorized Signatory'}`
        : `${formData.signatoryName || 'Md Ramiz Raza Khan'}\n${formData.signatoryTitle || 'Founder & Proprietor'}`;

      const formattedBody = `
Dear Mr./Ms. ${getLastName(empName)},

This letter serves as a formal warning regarding ${formData.reason}.

It has been observed that:

1. ${formData.incident1}
2. ${formData.incident2}
3. ${formData.incident3}

Such conduct is not acceptable and affects team performance, operational discipline, and the professional standards of India Trade Overseas Private Limited.

You are hereby instructed to correct the above issue immediately and maintain full compliance with your assigned responsibilities, reporting requirements, company policies, and instructions issued by management.

You are expected to show measurable improvement within ${formData.improvementDays} days, effective from receipt of this letter. Any repetition of this issue, failure to improve, or further breach of company rules may result in disciplinary action, including suspension or termination of employment, as per company policy.

Please treat this matter as serious and acknowledge receipt of this warning letter by signing below.

Sincerely,

For India Trade Overseas Private Limited

${signoffText}
      `.trim();

      const payload = {
        employeeId: selectedEmployee._id || selectedEmployee.employeeId || selectedEmployee.email,
        letterType: 'WARNING',
        subject: `FORMAL WARNING LETTER — ${formData.reason.slice(0, 40)}`,
        refNo: formData.refNo,
        letterData: {
          ...formData,
          employeeName: empName,
          employeeId: empId,
          department: empDept,
          position: empPosition,
          signatoryName: formData.signatoryName || 'Md Ramiz Raza Khan',
          signatoryTitle: formData.signatoryTitle || 'Founder & Proprietor',
          signatureImage: signatureImage || '',
          formattedBody
        }
      };

      const res = await employeesApi.sendLetter(payload);
      if (res && res.success) {
        toast.success(`Warning letter sent to ${empEmail || empName} email & in-app notification delivered!`);
        if (onClose) onClose();
      } else {
        toast.error(res?.message || 'Failed to dispatch warning letter.');
      }
    } catch (err) {
      console.error('Error sending warning letter:', err);
      toast.error('Failed to send warning letter. Please try again.');
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
          <title>Warning Letter — ${empName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #0f172a; line-height: 1.5; font-size: 13px; }
            .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 24px; }
            .company-name { font-size: 20px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
            .tagline { font-style: italic; color: #0284c7; font-size: 12px; margin-top: 4px; }
            .title { text-align: center; font-size: 16px; font-weight: bold; color: #dc2626; margin: 20px 0; text-transform: uppercase; letter-spacing: 1px; text-decoration: underline; }
            .meta-grid { margin-bottom: 20px; }
            .meta-grid p { margin: 3px 0; }
            .section { margin: 16px 0; }
            ol { padding-left: 20px; }
            li { margin-bottom: 6px; }
            .signatures { margin-top: 40px; display: flex; justify-content: space-between; }
            .sig-block { width: 45%; }
            .ack-box { margin-top: 50px; border-top: 1px dashed #94a3b8; padding-top: 20px; }
            img { max-height: 55px; max-width: 200px; object-fit: contain; }
            .no-print, .print-hide, .print-hidden { display: none !important; }
            @media print {
              .no-print, .print-hide, .print-hidden, button, label { display: none !important; }
            }
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
      <div className="fixed inset-0 z-[99999] flex items-start justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-xs font-sans overflow-y-auto pt-16 sm:pt-20 pb-4 sm:pb-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-4xl border rounded-lg shadow-2xl flex flex-col max-h-[calc(100vh-5rem)] sm:max-h-[calc(100vh-6rem)] overflow-hidden"
          style={{ background: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line)' }}
        >
          {/* Header Bar */}
          <div className="p-2.5 sm:p-4 border-b flex items-center justify-between gap-2 shrink-0" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' }}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 sm:p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-500 shrink-0">
                <FiAlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--crm-heading)] truncate">
                  Warning Letter Generator
                </h2>
                <p className="text-[9px] sm:text-[10px] text-[var(--crm-ink-faint)] hidden sm:block truncate">
                  Dispatches official letter to employee email & sends instant CRM notification
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex bg-[var(--crm-bg)] p-0.5 rounded border border-[var(--crm-line)]">
                <button
                  onClick={() => setActiveTab('FORM')}
                  className={`px-2 py-1 sm:px-3 sm:py-1 text-[9px] sm:text-[10px] uppercase font-bold rounded transition-colors whitespace-nowrap ${
                    activeTab === 'FORM'
                      ? 'bg-[var(--crm-accent)] text-[var(--crm-bg)]'
                      : 'text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
                  }`}
                >
                  Edit Details
                </button>
                <button
                  onClick={() => setActiveTab('PREVIEW')}
                  className={`px-2 py-1 sm:px-3 sm:py-1 text-[9px] sm:text-[10px] uppercase font-bold rounded transition-colors whitespace-nowrap ${
                    activeTab === 'PREVIEW'
                      ? 'bg-[var(--crm-accent)] text-[var(--crm-bg)]'
                      : 'text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
                  }`}
                >
                  Preview
                </button>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded hover:bg-slate-700/30 text-[var(--crm-heading)] transition-colors shrink-0"
                title="Close"
              >
                <FiX size={16} />
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
            
            {/* Employee Selection row if no initial employee */}
            {allEmployees.length > 0 && (
              <div className="p-2.5 sm:p-3 border rounded-sm bg-[var(--crm-bg-sunken)] space-y-1" style={{ borderColor: 'var(--crm-line)' }}>
                <label className="block text-[9px] uppercase tracking-wider font-bold text-[var(--crm-ink-faint)]">
                  Select Recipient Employee *
                </label>
                <select
                  value={selectedEmployee?._id || ''}
                  onChange={(e) => {
                    const found = allEmployees.find(emp => String(emp._id) === String(e.target.value));
                    setSelectedEmployee(found || null);
                  }}
                  className="w-full text-xs p-1.5 sm:p-2 rounded border outline-none bg-[var(--crm-bg)] text-[var(--crm-heading)] border-[var(--crm-line)] truncate"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs">
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
                  <label className="block text-[9px] uppercase tracking-wider font-bold mb-1 text-[var(--crm-ink-faint)]">Date</label>
                  <input
                    type="text"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-2 rounded border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] border-[var(--crm-line)]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[9px] uppercase tracking-wider font-bold mb-1 text-[var(--crm-ink-faint)]">Subject Reason / Misconduct Summary *</label>
                  <input
                    type="text"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="e.g. repeated absence, late reporting, non-submission of CRM updates..."
                    className="w-full p-2 rounded border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] border-[var(--crm-line)]"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <span className="block text-[9px] uppercase tracking-wider font-bold text-[var(--crm-ink-faint)]">Observation Points (Numbered List)</span>
                  
                  <div>
                    <label className="block text-[8px] uppercase text-[var(--crm-ink-faint)] mb-0.5">Point 1 (Incident details with date):</label>
                    <input
                      type="text"
                      value={formData.incident1}
                      onChange={(e) => setFormData({ ...formData, incident1: e.target.value })}
                      className="w-full p-2 rounded border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] border-[var(--crm-line)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] uppercase text-[var(--crm-ink-faint)] mb-0.5">Point 2 (Previous verbal reminder/instruction):</label>
                    <input
                      type="text"
                      value={formData.incident2}
                      onChange={(e) => setFormData({ ...formData, incident2: e.target.value })}
                      className="w-full p-2 rounded border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] border-[var(--crm-line)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] uppercase text-[var(--crm-ink-faint)] mb-0.5">Point 3 (Company policy/standard violated):</label>
                    <input
                      type="text"
                      value={formData.incident3}
                      onChange={(e) => setFormData({ ...formData, incident3: e.target.value })}
                      className="w-full p-2 rounded border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] border-[var(--crm-line)]"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[9px] uppercase tracking-wider font-bold mb-1 text-[var(--crm-ink-faint)]">Measurable Improvement Period (Days) *</label>
                  <input
                    type="number"
                    value={formData.improvementDays}
                    onChange={(e) => setFormData({ ...formData, improvementDays: e.target.value })}
                    className="w-full p-2 rounded border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] border-[var(--crm-line)]"
                  />
                </div>

                {/* Signatory & Digital Signature Control Section */}
                <div className="md:col-span-2 pt-3 border-t border-[var(--crm-line)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-[var(--crm-accent)] flex items-center gap-1.5">
                      <FiShield size={13} /> Signatory & Signature Settings
                    </span>
                    {signatureImage && (
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <FiCheck size={12} /> Signature Attached
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider font-bold mb-1 text-[var(--crm-ink-faint)]">
                        Signatory Selection *
                      </label>
                      <select
                        value={formData.signatoryType || 'FOUNDER'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'FOUNDER') {
                            setFormData(prev => ({
                              ...prev,
                              signatoryType: 'FOUNDER',
                              signatoryName: 'Md Ramiz Raza Khan',
                              signatoryTitle: 'Founder & Proprietor'
                            }));
                          } else if (val === 'HR') {
                            setFormData(prev => ({
                              ...prev,
                              signatoryType: 'HR',
                              signatoryName: 'HR Manager / Authorized Signatory',
                              signatoryTitle: 'Authorized Signatory'
                            }));
                          } else if (val === 'BOTH') {
                            setFormData(prev => ({
                              ...prev,
                              signatoryType: 'BOTH',
                              signatoryName: 'Md Ramiz Raza Khan',
                              signatoryTitle: 'Founder & Proprietor'
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              signatoryType: 'CUSTOM'
                            }));
                          }
                        }}
                        className="w-full p-2 rounded border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] border-[var(--crm-line)] text-xs font-semibold outline-none"
                      >
                        <option value="FOUNDER">Founder & Proprietor (Md Ramiz Raza Khan) [Single Signatory]</option>
                        <option value="HR">HR Manager / Authorized Signatory [Single Signatory]</option>
                        <option value="CUSTOM">Custom Signatory Name & Title [Single Signatory]</option>
                        <option value="BOTH">Show Both Signatories (Founder & HR)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-wider font-bold mb-1 text-[var(--crm-ink-faint)]">
                        Upload Digital Signature (PNG/JPG)
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-3 py-1.5 rounded border border-dashed text-xs font-medium text-[var(--crm-heading)] bg-[var(--crm-bg-sunken)] hover:bg-[var(--crm-bg)] transition-colors border-[var(--crm-line)]">
                          <FiUpload size={14} className="text-[var(--crm-accent)]" />
                          <span>{signatureImage ? 'Change Signature' : 'Upload Signature'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleSignatureUpload}
                            className="hidden"
                          />
                        </label>

                        {signatureImage && (
                          <button
                            type="button"
                            onClick={handleRemoveSignature}
                            className="px-2.5 py-1.5 rounded text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-colors flex items-center gap-1"
                            title="Remove signature"
                          >
                            <FiTrash2 size={13} /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {formData.signatoryType === 'CUSTOM' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider font-bold mb-1 text-[var(--crm-ink-faint)]">Custom Signatory Name</label>
                        <input
                          type="text"
                          value={formData.signatoryName || ''}
                          onChange={(e) => setFormData({ ...formData, signatoryName: e.target.value })}
                          placeholder="e.g. John Doe"
                          className="w-full p-2 rounded border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] border-[var(--crm-line)]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider font-bold mb-1 text-[var(--crm-ink-faint)]">Custom Signatory Title</label>
                        <input
                          type="text"
                          value={formData.signatoryTitle || ''}
                          onChange={(e) => setFormData({ ...formData, signatoryTitle: e.target.value })}
                          placeholder="e.g. Director"
                          className="w-full p-2 rounded border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] border-[var(--crm-line)]"
                        />
                      </div>
                    </div>
                  )}

                  {signatureImage && (
                    <div className="p-2.5 border rounded bg-[var(--crm-bg-sunken)] border-[var(--crm-line)] flex items-center gap-3">
                      <span className="text-[9px] uppercase font-bold text-[var(--crm-ink-faint)]">Attached Signature Preview:</span>
                      <div className="h-10 px-3 py-1 bg-white rounded border border-slate-200 flex items-center justify-center">
                        <img src={signatureImage} alt="Signature Preview" className="h-full max-w-[160px] object-contain" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* PREVIEW TAB */
              <div className="border rounded-lg bg-white text-slate-900 p-4 sm:p-6 md:p-10 font-sans shadow-md space-y-4 sm:space-y-6 text-xs sm:text-sm overflow-x-auto" ref={printRef}>
                {/* Official Letterhead Header */}
                <div className="text-center border-b-2 border-sky-600 pb-3 sm:pb-4">
                  <h1 className="text-base sm:text-xl md:text-2xl font-black uppercase text-slate-900 tracking-wider">
                    INDIA TRADE OVERSEAS PRIVATE LIMITED
                  </h1>
                  <p className="text-[10px] sm:text-xs font-semibold italic text-sky-700 mt-0.5 sm:mt-1">
                    Where Quality Meets Global Demand
                  </p>
                </div>

                {/* Letter Title */}
                <div className="text-center">
                  <h2 className="text-xs sm:text-sm md:text-base font-bold uppercase text-red-600 tracking-widest border-b border-red-200 inline-block pb-1">
                    WARNING LETTER
                  </h2>
                </div>

                {/* Letter Metadata */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] sm:text-xs text-slate-700 font-mono border-b border-slate-100 pb-2.5 gap-1">
                  <div>
                    <p><strong>Ref. No.:</strong> {formData.refNo}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p><strong>Date:</strong> {formData.date}</p>
                  </div>
                </div>

                {/* Recipient Details */}
                <div className="text-xs text-slate-800 space-y-0.5 leading-relaxed">
                  <p className="font-bold">To,</p>
                  <p className="font-bold text-sm text-slate-900">{empName}</p>
                  <p>{empPosition}</p>
                  <p>Employee ID: {empId}</p>
                  <p>Department: {empDept}</p>
                </div>

                {/* Subject Line */}
                <div className="text-xs font-bold text-slate-900 border-l-4 border-red-500 pl-3 py-1 bg-red-50/50">
                  Subject: Formal Warning Regarding {formData.reason}
                </div>

                {/* Letter Body */}
                <div className="text-xs sm:text-sm leading-relaxed text-slate-800 space-y-3">
                  <p>Dear Mr./Ms. {getLastName(empName)},</p>
                  
                  <p>
                    This letter serves as a formal warning regarding <strong>{formData.reason}</strong>.
                  </p>

                  <p>It has been observed that:</p>

                  <ol className="list-decimal pl-5 space-y-1.5">
                    <li>{formData.incident1}</li>
                    <li>{formData.incident2}</li>
                    <li>{formData.incident3}</li>
                  </ol>

                  <p>
                    Such conduct is not acceptable and affects team performance, operational discipline, and the professional standards of India Trade Overseas Private Limited.
                  </p>

                  <p>
                    You are hereby instructed to correct the above issue immediately and maintain full compliance with your assigned responsibilities, reporting requirements, company policies, and instructions issued by management.
                  </p>

                  <p>
                    You are expected to show measurable improvement within <strong>{formData.improvementDays} days</strong>, effective from receipt of this letter. Any repetition of this issue, failure to improve, or further breach of company rules may result in disciplinary action, including suspension or termination of employment, as per company policy.
                  </p>

                  <p>
                    Please treat this matter as serious and acknowledge receipt of this warning letter by signing below.
                  </p>
                </div>

                {/* Signatures */}
                <div className="pt-6 border-t border-slate-200">
                  <p className="text-xs font-semibold text-slate-800">Sincerely,</p>
                  <p className="text-xs font-bold text-slate-900 mt-1">For India Trade Overseas Private Limited</p>

                  {formData.signatoryType === 'BOTH' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mt-6 sm:mt-10 text-xs text-slate-800">
                      <div>
                        {signatureImage && (
                          <div className="mb-1.5 h-12 flex items-end">
                            <img src={signatureImage} alt="Signature" className="max-h-12 max-w-[160px] object-contain" />
                          </div>
                        )}
                        <div className="border-t border-slate-400 pt-1 font-bold">
                          {formData.founderName || 'Md Ramiz Raza Khan'}
                        </div>
                        <div className="text-[10px] text-slate-600">{formData.founderTitle || 'Founder & Proprietor'}</div>
                      </div>
                      <div>
                        <div className="border-t border-slate-400 pt-1 font-bold">
                          {formData.hrSignatory || 'HR Manager / Authorized Signatory'}
                        </div>
                        <div className="text-[10px] text-slate-600">Authorized Signatory</div>
                      </div>
                    </div>
                  ) : (
                    /* SINGLE SIGNATORY DISPLAY (Default) */
                    <div className="flex justify-start mt-6 sm:mt-8 text-xs text-slate-800">
                      <div className="w-full sm:w-auto min-w-0 sm:min-w-[220px] max-w-[280px]">
                        {signatureImage ? (
                          <div className="mb-1.5 h-14 flex items-end">
                            <img src={signatureImage} alt="Authorized Signature" className="max-h-14 max-w-[180px] object-contain" />
                          </div>
                        ) : (
                          <div className="mb-2 h-7 flex items-center print-hidden">
                            <label className="cursor-pointer text-[10px] text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                              <FiUpload size={11} /> Upload Digital Signature Image
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleSignatureUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                        )}
                        <div className="border-t border-slate-400 pt-1 font-bold text-slate-900">
                          {formData.signatoryName || 'Md Ramiz Raza Khan'}
                        </div>
                        <div className="text-[10px] text-slate-600">
                          {formData.signatoryTitle || 'Founder & Proprietor'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Employee Acknowledgement */}
                <div className="mt-6 sm:mt-8 border-t-2 border-dashed border-slate-300 pt-4 text-xs space-y-3">
                  <h3 className="font-bold uppercase tracking-wider text-slate-900">Employee Acknowledgement</h3>
                  <p className="text-slate-700">
                    I, <strong>{empName}</strong>, acknowledge that I have received and understood this warning letter.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-8 pt-4 sm:pt-6 text-slate-700">
                    <div>Employee Signature: ________________________</div>
                    <div>Date: ________________________</div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer Bar / Action Buttons */}
          <div className="p-2.5 sm:p-4 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' }}>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs uppercase font-bold rounded border flex items-center justify-center gap-1.5 transition-colors bg-blue-200 text-blue-950 border-blue-300 hover:bg-blue-300 w-full sm:w-auto"
            >
              <FiPrinter size={14} /> Print / Download PDF
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-initial px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs uppercase font-bold rounded border text-[var(--crm-heading)] border-[var(--crm-line)] hover:bg-[var(--crm-bg)] text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleSendLetter}
                disabled={submitting || !selectedEmployee}
                className="flex-1 sm:flex-initial px-4 py-1.5 sm:px-5 sm:py-2 text-[10px] sm:text-xs font-bold uppercase rounded bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 text-center whitespace-nowrap"
              >
                <FiSend size={14} />
                {submitting ? 'Dispatching...' : 'Send Mail & Notification'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


