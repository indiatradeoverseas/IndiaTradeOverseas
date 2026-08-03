import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUser, FiShield, FiFolder, FiEye, FiUpload, FiDownload, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { employeeProfileApi } from '../../api/employeeProfile';
import { useAuth } from '../../hooks/useAuth';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.99 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 100, damping: 18, mass: 1 } }
};

const EMPLOYMENT_STATUSES = ['PROBATION', 'CONFIRMED', 'ON_NOTICE', 'RESIGNED', 'TERMINATED'];
const SENSITIVE_FIELDS = [
  { key: 'salary', label: 'Salary' },
  { key: 'pan', label: 'PAN Number' },
  { key: 'aadhaar', label: 'Aadhaar Number' },
  { key: 'bankAccount', label: 'Bank Account Number' }
];

export default function EmployeeProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const isSelf = !id || id === user?._id;
  const targetId = isSelf ? 'me' : id;
  const isAdminReviewer = ['ADMIN', 'MANAGER', 'HR'].includes(user?.role);

  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState({});
  const [uploading, setUploading] = useState(false);
  const [statusForm, setStatusForm] = useState({ employmentStatus: '', note: '', effectiveDate: '' });

  const [personalForm, setPersonalForm] = useState({
    fatherName: '', dateOfBirth: '', address: '', emergencyContactName: '',
    emergencyContactPhone: '', dateOfJoining: '', phone: '', bankName: '', bankIFSC: ''
  });
  const [sensitiveForm, setSensitiveForm] = useState({ salary: '', pan: '', aadhaar: '', bankAccount: '' });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const profileRes = isSelf
        ? await employeeProfileApi.getMyProfile()
        : await employeeProfileApi.getEmployeeProfile(id);

      if (profileRes.success) {
        const p = profileRes.data.profile;
        setProfile(p);
        setStatusForm({ employmentStatus: p.employmentStatus || 'CONFIRMED', note: '', effectiveDate: '' });
        setPersonalForm({
          fatherName: p.fatherName || '', dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : '',
          address: p.address || '', emergencyContactName: p.emergencyContactName || '',
          emergencyContactPhone: p.emergencyContactPhone || '', dateOfJoining: p.dateOfJoining ? p.dateOfJoining.slice(0, 10) : '',
          phone: p.phone || '', bankName: p.bankName || '', bankIFSC: p.bankIFSC || ''
        });
      }

      const docsRes = isSelf
        ? await employeeProfileApi.getMyDocuments()
        : await employeeProfileApi.getEmployeeDocuments(id);
      if (docsRes.success) setDocuments(docsRes.data.documents || []);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePersonal = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = isSelf
        ? await employeeProfileApi.updateMyProfile({
            address: personalForm.address,
            emergencyContactName: personalForm.emergencyContactName,
            emergencyContactPhone: personalForm.emergencyContactPhone,
            phone: personalForm.phone
          })
        : await employeeProfileApi.updateEmployeeProfile(id, personalForm);
      if (response.success) {
        toast.success('Profile updated successfully');
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSensitive = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {};
      Object.entries(sensitiveForm).forEach(([k, v]) => { if (v) payload[k] = v; });
      const response = await employeeProfileApi.updateEmployeeProfile(id, payload);
      if (response.success) {
        toast.success('Sensitive fields updated successfully');
        setSensitiveForm({ salary: '', pan: '', aadhaar: '', bankAccount: '' });
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update fields');
    } finally {
      setSaving(false);
    }
  };

  const handleReveal = async (field) => {
    const reason = window.prompt(`Reason for revealing ${field}:`);
    if (!reason) return;
    try {
      const response = await employeeProfileApi.revealEmployeeField(id, field, reason);
      if (response.success) {
        setRevealed((prev) => ({ ...prev, [field]: response.data.value }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reveal field');
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await employeeProfileApi.updateEmploymentStatus(
        id, statusForm.employmentStatus, statusForm.note, statusForm.effectiveDate || undefined
      );
      if (response.success) {
        toast.success('Employment status updated successfully');
        setStatusForm({ ...statusForm, note: '' });
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update employment status');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const response = await employeeProfileApi.uploadMyDocument(file);
      if (response.success) {
        toast.success('Document uploaded successfully');
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownload = async (doc) => {
    try {
      const blob = await employeeProfileApi.downloadDocument(doc._id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download document');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--crm-bg)] flex items-center justify-center">
        <div className="w-12 h-[1px] bg-[var(--crm-ink-soft)]/40 animate-pulse" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--crm-bg)] flex items-center justify-center text-[var(--crm-ink-faint)] text-xs uppercase tracking-widest font-mono">
        Profile not found
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen w-full bg-[var(--crm-bg)] text-[var(--crm-ink-soft)] pb-12">

      <motion.div variants={blockVariants} className="w-full border-b border-[var(--crm-ink-soft)]/10 py-6 px-4 md:px-8 bg-[var(--crm-bg-sunken)]/40 backdrop-blur-sm">
        <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--crm-ink-faint)] font-bold block font-mono">MODULE 02 // EMPLOYEE PROFILE</span>
        <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[var(--crm-heading)] uppercase tracking-tight">{profile.fullName}</h1>
        <p className="text-[10px] uppercase tracking-widest text-[var(--crm-ink-faint)] font-mono mt-0.5">{profile.department} &bull; {profile.role} &bull; {profile.employeeId}</p>
      </motion.div>

      <div className="w-full px-4 md:px-8 py-6 space-y-6">

        {/* Personal Info */}
        <motion.div variants={blockVariants} className="border border-[var(--crm-ink-soft)]/15 bg-[var(--crm-bg-raised)]/20 rounded-sm p-6 shadow-lg">
          <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] mb-5 font-bold border-b border-[var(--crm-ink-soft)]/10 pb-2 flex items-center gap-1.5"><FiUser size={12} /> Personal Information</h3>
          <form onSubmit={handleSavePersonal} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(isSelf ? [] : [
              { key: 'fatherName', label: "Father's Name" },
              { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
              { key: 'dateOfJoining', label: 'Date of Joining', type: 'date' },
              { key: 'bankName', label: 'Bank Name' },
              { key: 'bankIFSC', label: 'Bank IFSC' }
            ]).map((f) => (
              <div key={f.key}>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">{f.label}</label>
                <input
                  type={f.type || 'text'}
                  value={personalForm[f.key]}
                  onChange={(e) => setPersonalForm({ ...personalForm, [f.key]: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-sm rounded-sm outline-none text-[var(--crm-heading)]"
                />
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">Phone</label>
              <input
                type="tel"
                value={personalForm.phone}
                onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-sm rounded-sm outline-none text-[var(--crm-heading)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">Emergency Contact Name</label>
              <input
                type="text"
                value={personalForm.emergencyContactName}
                onChange={(e) => setPersonalForm({ ...personalForm, emergencyContactName: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-sm rounded-sm outline-none text-[var(--crm-heading)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">Emergency Contact Phone</label>
              <input
                type="tel"
                value={personalForm.emergencyContactPhone}
                onChange={(e) => setPersonalForm({ ...personalForm, emergencyContactPhone: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-sm rounded-sm outline-none text-[var(--crm-heading)]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">Address</label>
              <textarea
                rows={2}
                value={personalForm.address}
                onChange={(e) => setPersonalForm({ ...personalForm, address: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-sm rounded-sm outline-none resize-none text-[var(--crm-heading)]"
              />
            </div>
            <div className="sm:col-span-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="py-2.5 px-6 bg-[var(--crm-heading)] hover:bg-[var(--crm-ink-soft)] text-[var(--crm-bg-sunken)] rounded-sm text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Sensitive fields — admin/manager/HR viewing another employee */}
        {!isSelf && isAdminReviewer && (
          <motion.div variants={blockVariants} className="border border-[var(--crm-ink-soft)]/15 bg-[var(--crm-bg-raised)]/20 rounded-sm p-6 shadow-lg">
            <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] mb-5 font-bold border-b border-[var(--crm-ink-soft)]/10 pb-2 flex items-center gap-1.5"><FiShield size={12} /> Sensitive Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              {SENSITIVE_FIELDS.map((f) => (
                <div key={f.key} className="flex items-center justify-between p-3 bg-[var(--crm-bg)]/60 border border-[var(--crm-ink-soft)]/10 rounded-sm">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-[var(--crm-ink-faint)] font-mono font-bold">{f.label}</p>
                    <p className="text-sm text-[var(--crm-heading)] font-mono mt-1">
                      {revealed[f.key] || profile[`${f.key}Masked`] || (profile.hasSalary && f.key === 'salary' ? '••••••' : '—')}
                    </p>
                  </div>
                  {user?.role === 'ADMIN' && (
                    <button onClick={() => handleReveal(f.key)} title="Reveal" className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] p-2">
                      <FiEye size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleSaveSensitive} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[var(--crm-ink-soft)]/10">
              {SENSITIVE_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">Update {f.label}</label>
                  <input
                    type="text"
                    value={sensitiveForm[f.key]}
                    onChange={(e) => setSensitiveForm({ ...sensitiveForm, [f.key]: e.target.value })}
                    placeholder={`New ${f.label.toLowerCase()}`}
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-sm rounded-sm outline-none text-[var(--crm-heading)]"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="py-2.5 px-6 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 hover:bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] rounded-sm text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  Update Sensitive Fields
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Employment lifecycle */}
        <motion.div variants={blockVariants} className="border border-[var(--crm-ink-soft)]/15 bg-[var(--crm-bg-raised)]/20 rounded-sm p-6 shadow-lg">
          <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] mb-5 font-bold border-b border-[var(--crm-ink-soft)]/10 pb-2 flex items-center gap-1.5"><FiClock size={12} /> Employment Lifecycle</h3>

          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className="inline-block px-3 py-1 border text-[10px] font-bold tracking-wider uppercase rounded bg-[var(--crm-info-bg)] text-[var(--crm-info)] border-[var(--crm-info)]/20">
              {profile.employmentStatus || 'CONFIRMED'}
            </span>
            {profile.confirmationDate && <span className="text-xs text-[var(--crm-ink-faint)] font-mono">Confirmed: {new Date(profile.confirmationDate).toLocaleDateString()}</span>}
            {profile.lastWorkingDay && <span className="text-xs text-[var(--crm-ink-faint)] font-mono">Last Working Day: {new Date(profile.lastWorkingDay).toLocaleDateString()}</span>}
          </div>

          {!isSelf && isAdminReviewer && (
            <form onSubmit={handleStatusUpdate} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 pb-5 border-b border-[var(--crm-ink-soft)]/10">
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">New Status</label>
                <select
                  value={statusForm.employmentStatus}
                  onChange={(e) => setStatusForm({ ...statusForm, employmentStatus: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 text-sm rounded-sm outline-none cursor-pointer text-[var(--crm-heading)]"
                >
                  {EMPLOYMENT_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">Effective Date</label>
                <input
                  type="date"
                  value={statusForm.effectiveDate}
                  onChange={(e) => setStatusForm({ ...statusForm, effectiveDate: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 text-sm rounded-sm outline-none text-[var(--crm-heading)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5">Note</label>
                <input
                  type="text"
                  value={statusForm.note}
                  onChange={(e) => setStatusForm({ ...statusForm, note: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 text-sm rounded-sm outline-none text-[var(--crm-heading)]"
                />
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="py-2.5 px-6 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 hover:bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] rounded-sm text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  Update Status
                </button>
              </div>
            </form>
          )}

          <div className="space-y-1.5 max-h-[240px] overflow-y-auto custom-scrollbar">
            {(profile.employmentHistory || []).length === 0 ? (
              <p className="text-[10px] text-[var(--crm-ink-faint)] font-mono uppercase tracking-widest py-4 text-center">No history recorded yet</p>
            ) : [...profile.employmentHistory].reverse().map((h, idx) => (
              <div key={idx} className="text-xs py-2.5 border-b border-[var(--crm-ink-soft)]/10 flex justify-between items-center gap-4">
                <span className="text-[var(--crm-heading)] font-light">
                  {h.event.replace('_', ' ')}{h.fromValue ? ` — ${h.fromValue} → ${h.toValue}` : ''}
                  {h.note && <span className="text-[var(--crm-ink-faint)]"> ({h.note})</span>}
                </span>
                <span className="opacity-60 font-mono text-[10px] tracking-wider bg-[var(--crm-bg)] px-2 py-0.5 border border-[var(--crm-ink-soft)]/10 rounded-sm whitespace-nowrap">
                  {new Date(h.changedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Documents */}
        <motion.div variants={blockVariants} className="border border-[var(--crm-ink-soft)]/15 bg-[var(--crm-bg-raised)]/20 rounded-sm p-6 shadow-lg">
          <div className="flex items-center justify-between mb-5 border-b border-[var(--crm-ink-soft)]/10 pb-2">
            <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold flex items-center gap-1.5"><FiFolder size={12} /> Documents</h3>
            {isSelf && (
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--crm-ink-soft)] bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 hover:border-[var(--crm-heading)]/40 px-3 py-2 rounded-sm cursor-pointer transition-all">
                <FiUpload size={12} /> {uploading ? 'Uploading...' : 'Upload'}
                <input type="file" onChange={handleUpload} disabled={uploading} className="hidden" />
              </label>
            )}
          </div>
          <div className="space-y-2">
            {documents.length === 0 ? (
              <p className="text-[10px] text-[var(--crm-ink-faint)] font-mono uppercase tracking-widest py-6 text-center">No documents uploaded yet</p>
            ) : documents.map((doc) => (
              <div key={doc._id} className="flex items-center justify-between text-xs py-2.5 px-3 bg-[var(--crm-bg)]/60 border border-[var(--crm-ink-soft)]/10 rounded-sm">
                <span className="text-[var(--crm-ink-soft)] font-light truncate">{doc.fileName}</span>
                <button onClick={() => handleDownload(doc)} className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] p-1.5 shrink-0">
                  <FiDownload size={13} />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
