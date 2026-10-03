import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FiAward, FiPrinter, FiSend, FiX, FiCheck,
  FiCalendar, FiFileText, FiShield, FiUserCheck, FiUpload, FiTrash2
} from 'react-icons/fi';
import { employeesApi } from '../../api/employees';

export default function ExperienceLetterModal({
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
  const defaultRefNo = `ITO/HR/EL/${currentYear}/${Math.floor(1000 + Math.random() * 9000)}`;

  const getJoiningDateStr = (emp) => {
    if (emp && emp.joiningDate) {
      try {
        return new Date(emp.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch (e) {}
    }
    return '01/01/2024';
  };

  const [formData, setFormData] = useState({
    date: todayStr,
    refNo: defaultRefNo,
    joiningDate: getJoiningDateStr(initialEmployee),
    relievingDate: todayStr,
    conductRating: 'exemplary, hardworking, and highly professional',
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
      setFormData(prev => ({
        ...prev,
        joiningDate: getJoiningDateStr(initialEmployee)
      }));
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
TO WHOM IT MAY CONCERN

This is to certify that Mr./Ms. ${empName}, Employee ID: ${empId}, was employed with India Trade Overseas Private Limited from ${formData.joiningDate} to ${formData.relievingDate} as ${empPosition} in the ${empDept} department.

During their tenure with our organization, we found them to be ${formData.conductRating} in performing their assigned responsibilities and operational duties.

Their character, integrity, and work ethics were commendable. We extend our sincere appreciation for their contributions and wish them all the success in their future professional endeavors.

Sincerely,

For India Trade Overseas Private Limited

${signoffText}
      `.trim();

      const payload = {
        employeeId: selectedEmployee._id || selectedEmployee.employeeId || selectedEmployee.email,
        letterType: 'EXPERIENCE',
        subject: `EXPERIENCE & RELIEVING CERTIFICATE — ${empName}`,
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
        toast.success(`Experience letter sent to ${empEmail || empName} email & notification delivered!`);
        if (onClose) onClose();
      } else {
        toast.error(res?.message || 'Failed to dispatch experience letter.');
      }
    } catch (err) {
      console.error('Error sending experience letter:', err);
      toast.error('Failed to send experience letter.');
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
          <title>Experience Letter — ${empName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #0f172a; line-height: 1.6; font-size: 13px; }
            .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 24px; }
            .company-name { font-size: 20px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
            .tagline { font-style: italic; color: #0284c7; font-size: 12px; margin-top: 4px; }
            .title { text-align: center; font-size: 16px; font-weight: bold; color: #0284c7; margin: 24px 0; text-transform: uppercase; letter-spacing: 1px; text-decoration: underline; }
            .signatures { margin-top: 50px; display: flex; justify-content: space-between; }
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
          <div className="p-3 sm:p-4 border-b flex items-center justify-between gap-2 flex-nowrap" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' }}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 sm:p-2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
                <FiAward size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--crm-heading)] flex items-center gap-2 truncate">
                  Experience & Relieving Letter
                </h2>
                <p className="hidden sm:block text-[10px] text-[var(--crm-ink-faint)]">
                  Dispatches official certificate to employee email & sends instant CRM notification
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="flex bg-[var(--crm-bg)] p-0.5 rounded border border-[var(--crm-line)]">
                <button
                  onClick={() => setActiveTab('PREVIEW')}
                  className={`px-2 sm:px-3 py-1 text-[9px] sm:text-[10px] uppercase font-bold rounded transition-colors whitespace-nowrap ${
                    activeTab === 'PREVIEW'
                      ? 'bg-[var(--crm-accent)] text-[var(--crm-bg)]'
                      : 'text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setActiveTab('FORM')}
                  className={`px-2 sm:px-3 py-1 text-[9px] sm:text-[10px] uppercase font-bold rounded transition-colors whitespace-nowrap ${
                    activeTab === 'FORM'
                      ? 'bg-[var(--crm-accent)] text-[var(--crm-bg)]'
                      : 'text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
                  }`}
                >
                  Edit
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
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">

            {allEmployees.length > 0 && (
              <div className="p-3 border rounded-sm bg-[var(--crm-bg-sunken)] space-y-1.5" style={{ borderColor: 'var(--crm-line)' }}>
                <label className="block text-[9px] uppercase tracking-wider font-bold text-[var(--crm-ink-faint)]">
                  Select Employee *
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

            {activeTab === 'PREVIEW' ? (
              /* PREVIEW TAB - Default View */
              <div className="border rounded bg-white text-slate-900 p-4 sm:p-10 font-sans shadow-md space-y-4 sm:space-y-6 max-w-full overflow-x-auto" ref={printRef}>
                <div className="text-center border-b-2 border-sky-600 pb-4">
                  <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-900 tracking-wider">
                    INDIA TRADE OVERSEAS PRIVATE LIMITED
                  </h1>
                  <p className="text-xs font-semibold italic text-sky-700 mt-1">
                    Where Quality Meets Global Demand
                  </p>
                </div>

                <div className="flex justify-between items-start text-xs text-slate-700 font-mono border-b border-slate-100 pb-3">
                  <div>
                    <p><strong>Ref. No.:</strong> {formData.refNo}</p>
                  </div>
                  <div className="text-right">
                    <p><strong>Date:</strong> {formData.date}</p>
                  </div>
                </div>

                <div className="text-center my-6">
                  <h2 className="text-base font-bold uppercase text-sky-700 tracking-widest border-b-2 border-sky-600 inline-block pb-1">
                    EXPERIENCE & RELIEVING CERTIFICATE
                  </h2>
                </div>

                <div className="text-center text-xs font-bold uppercase tracking-wider text-slate-800 my-4">
                  TO WHOM IT MAY CONCERN
                </div>

                <div className="text-xs leading-relaxed text-slate-800 space-y-4 text-justify">
                  <p>
                    This is to certify that <strong>Mr./Ms. {empName}</strong>, Employee ID: <strong>{empId}</strong>, was employed with <strong>India Trade Overseas Private Limited</strong> from <strong>{formData.joiningDate}</strong> to <strong>{formData.relievingDate}</strong> as <strong>{empPosition}</strong> in the <strong>{empDept}</strong> department.
                  </p>

                  <p>
                    During their tenure with our organization, we found them to be <strong>{formData.conductRating}</strong> in performing their assigned responsibilities and operational duties.
                  </p>

                  <p>
                    Their character, integrity, and work ethics were commendable. We extend our sincere appreciation for their contributions to India Trade Overseas Private Limited and wish them all the success in their future professional endeavors.
                  </p>
                </div>

                <div className="pt-10 border-t border-slate-200 mt-10">
                  <p className="text-xs font-semibold text-slate-800">Sincerely,</p>
                  <p className="text-xs font-bold text-slate-900 mt-1">For India Trade Overseas Private Limited</p>

                  {formData.signatoryType === 'BOTH' ? (
                    <div className="grid grid-cols-2 gap-8 mt-14 text-xs text-slate-800">
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
                    <div className="flex justify-start mt-8 text-xs text-slate-800">
                      <div className="min-w-[220px] max-w-[280px]">
                        {signatureImage ? (
                          <div className="mb-1.5 h-14 flex items-end">
                            <img src={signatureImage} alt="Authorized Signature" className="max-h-14 max-w-[180px] object-contain" />
                          </div>
                        ) : (
                          <div className="mb-2.5 h-8 flex items-center print-hidden">
                            <label className="cursor-pointer text-[10px] text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1 bg-sky-50 px-2.5 py-1 rounded border border-sky-200">
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
              </div>
            ) : (
              /* FORM TAB */
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
                  <label className="block text-[9px] uppercase tracking-wider font-bold mb-1 text-[var(--crm-ink-faint)]">Certificate Issue Date</label>
                  <input
                    type="text"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-2 rounded border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] border-[var(--crm-line)]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-bold mb-1 text-[var(--crm-ink-faint)]">Joining Date</label>
                  <input
                    type="text"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full p-2 rounded border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] border-[var(--crm-line)]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-bold mb-1 text-[var(--crm-ink-faint)]">Relieving / End Date</label>
                  <input
                    type="text"
                    value={formData.relievingDate}
                    onChange={(e) => setFormData({ ...formData, relievingDate: e.target.value })}
                    className="w-full p-2 rounded border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] border-[var(--crm-line)]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[9px] uppercase tracking-wider font-bold mb-1 text-[var(--crm-ink-faint)]">Performance & Conduct Description</label>
                  <input
                    type="text"
                    value={formData.conductRating}
                    onChange={(e) => setFormData({ ...formData, conductRating: e.target.value })}
                    placeholder="e.g. exemplary, hardworking, and highly professional..."
                    className="w-full p-2 rounded border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] border-[var(--crm-line)]"
                  />
                </div>

                {/* Signatory & Digital Signature Controls */}
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
            )}

          </div>

          {/* Footer Bar */}
          <div className="p-3 sm:p-4 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' }}>
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs uppercase font-bold rounded border flex items-center justify-center gap-1.5 transition-colors bg-blue-200 text-blue-950 border-blue-300 hover:bg-blue-300 w-full sm:w-auto text-center"
            >
              <FiPrinter size={14} /> Print / Download PDF
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2 text-xs uppercase font-bold rounded border text-[var(--crm-heading)] border-[var(--crm-line)] hover:bg-[var(--crm-bg)] text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleSendLetter}
                disabled={submitting || !selectedEmployee}
                className="flex-1 sm:flex-initial px-5 py-2 text-xs font-bold uppercase rounded bg-cyan-600 hover:bg-cyan-700 text-white flex items-center justify-center gap-2 shadow-md disabled:opacity-50 text-center"
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

