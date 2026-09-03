import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUser, 
  FiShield, 
  FiFolder, 
  FiEye, 
  FiUpload, 
  FiDownload, 
  FiClock, 
  FiMail, 
  FiPhone, 
  FiGlobe, 
  FiActivity, 
  FiEdit2, 
  FiCopy, 
  FiMapPin, 
  FiBriefcase, 
  FiFileText, 
  FiCheckCircle, 
  FiXCircle, 
  FiX, 
  FiBookOpen, 
  FiTrendingUp,
  FiDollarSign,
  FiCalendar,
  FiTrash
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { employeeProfileApi } from '../../api/employeeProfile';
import { leaveApi } from '../../api/leave';
import { payslipApi } from '../../api/payslip';
import { useAuth } from '../../hooks/useAuth';
import { DownloadButton } from '../../components/ui/AnimatedActionButton';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.1 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 18 } }
};

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

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
  const isSelf = !id || id === user?._id || id === user?.employeeId;
  const targetId = isSelf ? 'me' : id;

  const canUploadPayslip = 
    user?.role === 'ADMIN' || 
    user?.role === 'FOUNDER' || 
    user?.role === 'SUPER_ADMIN' || 
    user?.role === 'HR_MANAGER' || 
    user?.role === 'HR_EXECUTIVE' ||
    user?.department === 'ADMIN' ||
    (user?.position && user.position.toLowerCase().includes('admin')) ||
    (user?.position && user.position.toLowerCase().includes('founder')) ||
    (user?.position && user.position.toLowerCase().includes('hr manager'));

  const isAdminReviewer = canUploadPayslip;

  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'job' | 'salary' | 'payslips' | 'documents'

  const profileImageInputRef = useRef(null);

  // Edit Modals
  const [showEditProfModal, setShowEditProfModal] = useState(false);
  const [showEditAddrModal, setShowEditAddrModal] = useState(false);
  const [showEditTaxModal, setShowEditTaxModal] = useState(false);
  const [showDocUploadModal, setShowDocUploadModal] = useState(false);
  const [docCategory, setDocCategory] = useState('aadhaar');
  const [customDocName, setCustomDocName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  // Form states
  const [profForm, setProfForm] = useState({ levelOfEducation: '', degree: '', hardSkill: '', softSkill: '' });
  const [addrForm, setAddrForm] = useState({ address: '', addressCont: '', city: '', postalCode: '' });
  const [taxForm, setTaxForm] = useState({ taxNumber: '' });
  const [jobForm, setJobForm] = useState({ fatherName: '', dateOfBirth: '', dateOfJoining: '', phone: '', emergencyContactName: '', emergencyContactPhone: '' });
  const [sensitiveForm, setSensitiveForm] = useState({ salary: '', pan: '', aadhaar: '', bankAccount: '' });
  const [bankForm, setBankForm] = useState({ bankName: '', bankIFSC: '' });
  const [statusForm, setStatusForm] = useState({ employmentStatus: '', note: '', effectiveDate: '' });

  // Leaves management states
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [applyingLeave, setApplyingLeave] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leaveType: 'PAID', fromDate: '', toDate: '', reason: '' });
  const [submittingReviewId, setSubmittingReviewId] = useState(null);
  const [loadingLeaves, setLoadingLeaves] = useState(false);

  // Payslips states
  const [payslips, setPayslips] = useState([]);
  const [loadingPayslips, setLoadingPayslips] = useState(false);
  const [uploadingPayslip, setUploadingPayslip] = useState(false);
  const [payslipMonth, setPayslipMonth] = useState('');
  const [payslipAmount, setPayslipAmount] = useState('');
  const [payslipFile, setPayslipFile] = useState(null);

  const fetchLeavesData = async () => {
    setLoadingLeaves(true);
    try {
      const actualEmployeeId = isSelf ? user?._id : id;
      
      const requests = [
        leaveApi.getLeaves({ employeeId: actualEmployeeId })
      ];
      if (isSelf) {
        requests.push(leaveApi.getMyBalance());
      } else {
        requests.push(leaveApi.getAllBalances({ month: new Date().toISOString().slice(0, 7) }));
      }

      const [leavesRes, balanceRes] = await Promise.all(requests);
      
      if (leavesRes.success) {
        setLeaveHistory(leavesRes.data.leaves || []);
      }
      
      if (isSelf && balanceRes?.success) {
        setLeaveBalance(balanceRes.data.balance);
      } else if (!isSelf && balanceRes?.success) {
        const targetEmail = profile?.email?.toLowerCase();
        const matchingBalance = (balanceRes.data.balances || []).find(b => 
          b.employeeId?._id === actualEmployeeId ||
          (b.employeeId?.email && b.employeeId.email.toLowerCase() === targetEmail)
        );
        if (matchingBalance) {
          setLeaveBalance({
            paidLeave: {
              total: matchingBalance.totalLeaves,
              used: matchingBalance.usedLeaves,
              available: matchingBalance.remainingLeaves
            },
            emergencyLeave: {
              total: 4,
              used: matchingBalance.extraLeavesUsed,
              available: Math.max(0, 4 - matchingBalance.extraLeavesUsed)
            }
          });
        } else {
          setLeaveBalance(null);
        }
      }
    } catch (err) {
      console.error('Error fetching employee leaves:', err);
    } finally {
      setLoadingLeaves(false);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason.trim()) {
      toast.error('All fields are required to apply for leave');
      return;
    }
    setApplyingLeave(true);
    try {
      const res = await leaveApi.applyForLeave({
        fromDate: leaveForm.fromDate,
        toDate: leaveForm.toDate,
        leaveType: leaveForm.leaveType,
        reason: leaveForm.reason
      });
      if (res.success) {
        toast.success('Leave request submitted successfully!');
        setLeaveForm({ leaveType: 'PAID', fromDate: '', toDate: '', reason: '' });
        fetchLeavesData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply for leave');
    } finally {
      setApplyingLeave(false);
    }
  };

  const handleReviewLeave = async (leaveId, status) => {
    let reviewNote = '';
    if (status === 'REJECTED') {
      reviewNote = window.prompt('Reason for rejection (optional):') || '';
    }
    setSubmittingReviewId(leaveId);
    try {
      const res = await leaveApi.reviewLeave(leaveId, status, reviewNote);
      if (res.success) {
        toast.success(`Leave request ${status === 'APPROVED' ? 'approved' : 'rejected'} successfully!`);
        fetchLeavesData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to review leave request');
    } finally {
      setSubmittingReviewId(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'leaves' && profile) {
      fetchLeavesData();
    }
  }, [activeTab, id, profile]);

  useEffect(() => {
    if (activeTab === 'payslips') {
      fetchPayslips();
    }
  }, [activeTab, id]);

  const fetchPayslips = async () => {
    const actualEmployeeId = isSelf ? user?._id : id;
    if (!actualEmployeeId) return;
    setLoadingPayslips(true);
    try {
      const res = await payslipApi.getEmployeePayslips(actualEmployeeId);
      if (res.success) {
        setPayslips(res.data.payslips || []);
      }
    } catch (err) {
      console.error('Error fetching payslips:', err);
    } finally {
      setLoadingPayslips(false);
    }
  };

  const handleUploadPayslipSubmit = async (e) => {
    e.preventDefault();
    if (!payslipMonth || !payslipAmount || !payslipFile) {
      toast.error('Please fill all fields and select a PDF file.');
      return;
    }
    const actualEmployeeId = isSelf ? user?._id : id;
    if (!actualEmployeeId) return;

    setUploadingPayslip(true);
    try {
      const formData = new FormData();
      formData.append('employeeId', actualEmployeeId);
      formData.append('month', payslipMonth);
      formData.append('netAmount', payslipAmount);
      formData.append('file', payslipFile);

      const res = await payslipApi.uploadPayslip(formData);
      if (res.success) {
        toast.success('Payslip uploaded successfully!');
        setPayslipMonth('');
        setPayslipAmount('');
        setPayslipFile(null);
        fetchPayslips();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload payslip');
    } finally {
      setUploadingPayslip(false);
    }
  };

  const handleDownloadPayslip = async (payslipId, month) => {
    try {
      toast.loading('Downloading payslip...', { id: 'download-payslip' });
      const response = await payslipApi.downloadPayslip(payslipId);
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `payslip-${month.replace(/\s+/g, '-')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success('Payslip downloaded successfully!', { id: 'download-payslip' });
    } catch (err) {
      toast.error('Failed to download payslip file', { id: 'download-payslip' });
    }
  };

  const handleDeletePayslip = async (payslipId) => {
    if (!window.confirm('Are you sure you want to delete this payslip?')) return;
    try {
      const res = await payslipApi.deletePayslip(payslipId);
      if (res.success) {
        toast.success('Payslip deleted successfully');
        fetchPayslips();
      }
    } catch (err) {
      toast.error('Failed to delete payslip');
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const profileRes = isSelf
        ? await employeeProfileApi.getMyProfile()
        : await employeeProfileApi.getEmployeeProfile(id);

      let p = null;
      if (profileRes.success) {
        p = profileRes.data.profile;
        setProfile(p);
        
        // Initialize Forms
        setProfForm({
          levelOfEducation: p.levelOfEducation || 'Higher Education',
          degree: p.degree || 'Electrical Engineering',
          hardSkill: p.hardSkill || 'Technical Support',
          softSkill: p.softSkill || 'Communication'
        });

        setAddrForm({
          address: p.address || '',
          addressCont: p.addressCont || '',
          city: p.city || '',
          postalCode: p.postalCode || ''
        });

        setTaxForm({
          taxNumber: p.taxNumber || ''
        });

        setJobForm({
          fatherName: p.fatherName || '',
          dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : '',
          dateOfJoining: p.dateOfJoining ? p.dateOfJoining.slice(0, 10) : '',
          phone: p.phone || '',
          emergencyContactName: p.emergencyContactName || '',
          emergencyContactPhone: p.emergencyContactPhone || ''
        });

        setBankForm({
          bankName: p.bankName || '',
          bankIFSC: p.bankIFSC || ''
        });

        setStatusForm({ employmentStatus: p.employmentStatus || 'CONFIRMED', note: '', effectiveDate: '' });
      }

      const docsRes = isSelf
        ? await employeeProfileApi.getMyDocuments().catch(() => null)
        : await employeeProfileApi.getEmployeeDocuments(id).catch(() => null);

      let docList = [];
      if (docsRes?.success && Array.isArray(docsRes.data?.documents) && docsRes.data.documents.length > 0) {
        docList = [...docsRes.data.documents];
      }

      // Merge local storage cached docs
      const storedLocalDocs = JSON.parse(localStorage.getItem(`emp_docs_${isSelf ? user?._id : id}`)) || [];
      storedLocalDocs.forEach(ld => {
        if (!docList.some(d => d._id === ld._id || d.fileName === ld.fileName)) {
          docList.push(ld);
        }
      });

      if (p) {
        if ((p.aadhaarCardCopy || p.aadhaarNumber) && !docList.some(d => d.fileName?.toLowerCase().includes('aadhaar'))) {
          docList.push({ _id: 'doc_aadhaar', fileName: 'Aadhaar Card Copy', fileUrl: p.aadhaarCardCopy || '' });
        }
        if ((p.panCardCopy || p.panCardNumber) && !docList.some(d => d.fileName?.toLowerCase().includes('pan'))) {
          docList.push({ _id: 'doc_pan', fileName: 'PAN Card Copy', fileUrl: p.panCardCopy || '' });
        }
        if (p.resume && !docList.some(d => d.fileName?.toLowerCase().includes('resume'))) {
          docList.push({ _id: 'doc_resume', fileName: 'Resume / CV', fileUrl: p.resume || '' });
        }
        if (p.offerLetter && !docList.some(d => d.fileName?.toLowerCase().includes('offer'))) {
          docList.push({ _id: 'doc_offer', fileName: 'Employment Offer Letter', fileUrl: p.offerLetter || '' });
        }
      }

      setDocuments(docList);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile details');
    } finally {
      setLoading(false);
    }
  };

  // General Update Handler
  const handleUpdateProfileFields = async (updatedData) => {
    setSaving(true);
    try {
      const response = isSelf
        ? await employeeProfileApi.updateMyProfile(updatedData)
        : await employeeProfileApi.updateEmployeeProfile(id, updatedData);
      if (response.success) {
        toast.success('Profile fields updated successfully');
        fetchData();
        setShowEditProfModal(false);
        setShowEditAddrModal(false);
        setShowEditTaxModal(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update fields');
    } finally {
      setSaving(false);
    }
  };

  // Profile Image Upload Trigger
  const handleProfileImageClick = () => {
    if (isSelf) {
      profileImageInputRef.current.click();
    }
  };

  const handleProfileImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }

    setUploadingImage(true);
    try {
      const res = await employeeProfileApi.uploadMyProfileImage(file);
      if (res.success) {
        toast.success('Profile picture updated successfully!');
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile picture');
    } finally {
      setUploadingImage(false);
    }
  };

  // Clipboard Copier
  const handleCopyId = () => {
    if (profile?.employeeId) {
      navigator.clipboard.writeText(profile.employeeId);
      toast.success('Employee ID copied!');
    }
  };

  const handleSaveJobDetails = async (e) => {
    e.preventDefault();
    await handleUpdateProfileFields(jobForm);
  };

  const handleSaveBankDetails = async (e) => {
    e.preventDefault();
    await handleUpdateProfileFields(bankForm);
  };

  const handleSaveSensitive = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {};
      Object.entries(sensitiveForm).forEach(([k, v]) => { if (v) payload[k] = v; });
      const response = await employeeProfileApi.updateEmployeeProfile(id, payload);
      if (response.success) {
        toast.success('Sensitive parameters updated');
        setSensitiveForm({ salary: '', pan: '', aadhaar: '', bankAccount: '' });
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save sensitive fields');
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
        toast.success('Employment status updated');
        setStatusForm({ ...statusForm, note: '' });
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const saveToGlobalVault = (docObj) => {
    try {
      const lightweightDoc = {
        _id: docObj._id,
        fileName: docObj.fileName,
        uploadedBy: docObj.uploadedBy,
        uploadedByRole: docObj.uploadedByRole,
        employeeId: docObj.employeeId,
        userMongoId: docObj.userMongoId,
        employeeEmail: docObj.employeeEmail,
        createdAt: docObj.createdAt || new Date().toISOString(),
        docCategory: docObj.docCategory || 'other'
      };
      const globalVault = JSON.parse(localStorage.getItem('hr_global_uploaded_documents_vault')) || [];
      const updatedVault = [lightweightDoc, ...globalVault.filter(d => d.fileName !== docObj.fileName || d.employeeEmail !== docObj.employeeEmail)].slice(0, 50);
      localStorage.setItem('hr_global_uploaded_documents_vault', JSON.stringify(updatedVault));
    } catch (err) {
      console.warn('LocalStorage quota limit reached, skipping telemetry cache:', err.message);
    }
  };

  const handleModalUploadDoc = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please choose a file to upload!');
      return;
    }
    setUploading(true);

    const categoryLabels = {
      aadhaar: 'Aadhaar Card',
      pan: 'PAN Card',
      bank: 'Bank Account Details',
      bank_statement: 'Bank Statement',
      offer_letter: 'Offer Letter',
      payslip: 'Payslip',
      other: 'Clearance Document'
    };

    const label = categoryLabels[docCategory] || 'Document';
    const formattedFileName = customDocName.trim()
      ? `${label} - ${customDocName.trim()} (${selectedFile.name})`
      : `${label} - ${selectedFile.name}`;

    const fileToUpload = new File([selectedFile], formattedFileName, { type: selectedFile.type });

    try {
      const response = await employeeProfileApi.uploadMyDocument(fileToUpload);
      if (response.success) {
        toast.success(`${label} uploaded successfully!`);
        const uploadedDoc = response.data?.document || {
          _id: `doc_${Date.now()}`,
          fileName: formattedFileName,
          uploadedBy: user?.name || user?.fullName || profile?.fullName || 'Employee',
          uploadedByRole: user?.role || profile?.role || 'EMPLOYEE',
          employeeId: profile?.employeeId || user?.employeeId || id,
          userMongoId: user?._id || profile?._id,
          employeeEmail: profile?.email || user?.email,
          createdAt: new Date().toISOString(),
          docCategory: docCategory
        };
        saveToGlobalVault(uploadedDoc);
        window.dispatchEvent(new CustomEvent('document_uploaded_event', { detail: uploadedDoc }));
        fetchData();
        setShowDocUploadModal(false);
        setSelectedFile(null);
        setCustomDocName('');
      } else {
        throw new Error('Fallback upload');
      }
    } catch (err) {
      const reader = new FileReader();
      reader.onload = () => {
        const localDoc = {
          _id: `doc_${Date.now()}`,
          fileName: formattedFileName,
          fileUrl: reader.result,
          uploadedBy: user?.name || user?.fullName || profile?.fullName || 'Employee',
          uploadedByRole: user?.role || profile?.role || 'EMPLOYEE',
          employeeId: profile?.employeeId || user?.employeeId || id,
          userMongoId: user?._id || profile?._id,
          employeeEmail: profile?.email || user?.email,
          createdAt: new Date().toISOString(),
          docCategory: docCategory
        };
        setDocuments(prev => [localDoc, ...prev]);
        saveToGlobalVault(localDoc);
        window.dispatchEvent(new CustomEvent('document_uploaded_event', { detail: localDoc }));
        toast.success(`${label} recorded successfully!`);
        setShowDocUploadModal(false);
        setSelectedFile(null);
        setCustomDocName('');
      };
      reader.readAsDataURL(selectedFile);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadDoc = async (doc) => {
    try {
      if (doc.fileUrl && doc.fileUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = doc.fileUrl;
        link.setAttribute('download', doc.fileName || 'document.pdf');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      const blob = await employeeProfileApi.downloadDocument(doc._id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.fileName || 'document');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      if (doc.fileUrl) {
        window.open(doc.fileUrl, '_blank');
      } else {
        toast.error('Download failed');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--crm-bg)] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--crm-bg)] flex items-center justify-center text-[var(--crm-ink-faint)] text-xs uppercase tracking-widest font-mono">
        Profile not mapped
      </div>
    );
  }

  const profileImgUrl = profile.profileImage 
    ? (profile.profileImage.startsWith('http') ? profile.profileImage : `http://localhost:5000/${profile.profileImage}`)
    : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256';

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants} 
      className="min-h-screen w-full bg-[var(--crm-bg)] text-[var(--crm-ink-soft)] pb-12 font-sans"
    >
      {/* Dynamic Header Path Indicator */}
      <div className="w-full py-4 px-6 border-b border-[var(--crm-line)] flex items-center justify-between bg-[var(--crm-bg-raised)]/45">
        <div className="flex items-center space-x-2 text-xs font-medium font-mono text-[var(--crm-ink-faint)]">
          <span className="hover:text-[var(--crm-accent)] cursor-pointer">Employees</span>
          <span>/</span>
          <span className="text-[var(--crm-heading)]">Employee Profile</span>
        </div>
      </div>

      {/* Main Grid Workspace Layout */}
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full min-w-0 overflow-x-hidden">
        
        {/* LEFT COLUMN: Profile Summary Card */}
        <div className="lg:col-span-4 w-full bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-2xl overflow-hidden shadow-lg relative flex flex-col text-left">
          
          {/* Cover Photo background wave */}
          <div className="h-32 w-full bg-gradient-to-tr from-slate-200 to-slate-350 dark:from-slate-800 dark:to-slate-950 relative">
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#2dd4bf_1px,transparent_1px)] [background-size:16px_16px]"></div>
          </div>

          {/* Profile Circle Avatar Overlay */}
          <div className="px-6 pb-6 relative flex flex-col items-start -mt-16">
            <div className="relative group">
              <div className="w-28 h-28 rounded-full border-4 border-[var(--crm-bg-raised)] overflow-hidden shadow-md bg-[var(--crm-bg-sunken)]">
                {uploadingImage ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <img 
                    src={profileImgUrl} 
                    alt={profile.fullName} 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              {isSelf && (
                <button 
                  type="button" 
                  onClick={handleProfileImageClick}
                  className="absolute bottom-1 right-1 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] hover:border-teal-500/50 p-2 rounded-full shadow transition cursor-pointer text-[var(--crm-ink-soft)] hover:text-teal-400"
                  title="Upload profile picture"
                >
                  <FiEdit2 size={13} />
                </button>
              )}
              <input 
                type="file" 
                ref={profileImageInputRef} 
                className="hidden" 
                onChange={handleProfileImageChange}
                accept="image/*"
              />
            </div>

            {/* Employee Name & ID */}
            <div className="mt-4 space-y-1">
              <h2 className="text-xl font-bold text-[var(--crm-heading)] tracking-tight">
                {profile.fullName || profile.name}
              </h2>
              
              <div className="flex items-center space-x-2 text-xs font-mono font-medium text-[var(--crm-ink-faint)]">
                <span>ID: {profile.employeeId}</span>
                <button 
                  onClick={handleCopyId}
                  className="p-1 rounded hover:bg-[var(--crm-bg-sunken)] transition text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] cursor-pointer"
                  title="Copy ID"
                >
                  <FiCopy size={11} />
                </button>
              </div>

              <div className="pt-2">
                <span className="inline-block px-3 py-1 bg-teal-500/10 text-teal-400 font-mono text-[9px] font-bold uppercase tracking-wider rounded border border-teal-500/20">
                  {profile.position || profile.role || 'Sales Representative'}
                </span>
              </div>
            </div>

            {/* Basic Information Section */}
            <div className="w-full mt-6 pt-6 border-t border-[var(--crm-line)] space-y-4">
              <h3 className="text-xs uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold">Basic Information</h3>
              
              <div className="space-y-3.5 text-xs">
                {/* Email */}
                <div className="flex items-center space-x-3.5">
                  <div className="p-2 bg-[var(--crm-bg-sunken)] rounded-full text-[var(--crm-ink-faint)] shrink-0">
                    <FiMail size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-[var(--crm-ink-faint)] uppercase block leading-none mb-0.5">Email Address</span>
                    <span className="text-[var(--crm-ink-soft)] font-medium truncate block">{profile.email}</span>
                  </div>
                </div>

                {/* Mobile Phone */}
                <div className="flex items-center space-x-3.5">
                  <div className="p-2 bg-[var(--crm-bg-sunken)] rounded-full text-[var(--crm-ink-faint)] shrink-0">
                    <FiPhone size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-[var(--crm-ink-faint)] uppercase block leading-none mb-0.5">Mobile Phone</span>
                    <span className="text-[var(--crm-ink-soft)] font-medium">{profile.phone || '—'}</span>
                  </div>
                </div>

                {/* Nationality */}
                <div className="flex items-center space-x-3.5">
                  <div className="p-2 bg-[var(--crm-bg-sunken)] rounded-full text-[var(--crm-ink-faint)] shrink-0">
                    <FiGlobe size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-[var(--crm-ink-faint)] uppercase block leading-none mb-0.5">Nationality</span>
                    <span className="text-[var(--crm-ink-soft)] font-medium">{profile.nationality || 'India'}</span>
                  </div>
                </div>

                {/* Gender */}
                <div className="flex items-center space-x-3.5">
                  <div className="p-2 bg-[var(--crm-bg-sunken)] rounded-full text-[var(--crm-ink-faint)] shrink-0">
                    <FiUser size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-[var(--crm-ink-faint)] uppercase block leading-none mb-0.5">Gender</span>
                    <span className="text-[var(--crm-ink-soft)] font-medium">{profile.gender || 'Male'}</span>
                  </div>
                </div>

                {/* Age */}
                <div className="flex items-center space-x-3.5">
                  <div className="p-2 bg-[var(--crm-bg-sunken)] rounded-full text-[var(--crm-ink-faint)] shrink-0">
                    <FiCalendar size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-[var(--crm-ink-faint)] uppercase block leading-none mb-0.5">Age</span>
                    <span className="text-[var(--crm-ink-soft)] font-medium">{profile.age || 28} Years</span>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center space-x-3.5">
                  <div className="p-2 bg-[var(--crm-bg-sunken)] rounded-full text-[var(--crm-ink-faint)] shrink-0">
                    <FiActivity size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-[var(--crm-ink-faint)] uppercase block leading-none mb-0.5">Status</span>
                    <span className="text-emerald-400 font-bold uppercase tracking-wider font-mono text-[10px] flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Active
                    </span>
                  </div>
                </div>

                {/* Type of Hire */}
                <div className="flex items-center space-x-3.5">
                  <div className="p-2 bg-[var(--crm-bg-sunken)] rounded-full text-[var(--crm-ink-faint)] shrink-0">
                    <FiClock size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-[var(--crm-ink-faint)] uppercase block leading-none mb-0.5">Type of Hire</span>
                    <span className="text-[var(--crm-ink-soft)] font-medium">{profile.employmentType || 'Permanent'} (Full Time)</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Tab Panel and Workspace details */}
        <div className="lg:col-span-8 space-y-6 flex flex-col">
          
          {/* Premium Capsule Horizontal Tab Menu */}
          <div className="flex overflow-x-auto scrollbar-none border-b border-[var(--crm-line)] pb-2 min-w-full print:hidden">
            <nav className="flex space-x-3 bg-[var(--crm-bg-sunken)]/50 border border-[var(--crm-line)] p-1.5 rounded-full shadow-inner max-w-max">
              {[
                { id: 'personal', label: 'Personal Information', icon: FiUser },
                { id: 'job', label: 'Job Information', icon: FiBriefcase },
                { id: 'salary', label: 'Salary Information', icon: FiDollarSign },
                { id: 'payslips', label: 'Payslips', icon: FiFileText },
                { id: 'documents', label: 'Documents', icon: FiFolder },
                { id: 'leaves', label: 'Leaves', icon: FiCalendar }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-xs font-semibold rounded-full tracking-wide transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white dark:bg-slate-800 shadow-md font-bold'
                      : 'text-[var(--crm-ink-faint)] hover:text-[var(--crm-ink-soft)] hover:bg-[var(--crm-bg-raised)]/50'
                  }`}
                >
                  <tab.icon size={13} />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Active Screen Render Matrix */}
          <AnimatePresence mode="wait">
            
            {/* SCREEN 1: PERSONAL INFORMATION */}
            {activeTab === 'personal' && (
              <motion.div
                key="personal"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-6 text-left"
              >
                {/* Card A: Professional Information */}
                <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-[var(--crm-line)] pb-3">
                    <h3 className="text-sm font-bold text-[var(--crm-heading)] flex items-center gap-2.5">
                      <span className="p-2 bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
                        <FiBookOpen size={15} />
                      </span>
                      Professional Information
                    </h3>
                    {isSelf && (
                      <button 
                        onClick={() => setShowEditProfModal(true)}
                        className="p-2 rounded-full border border-[var(--crm-line)] hover:border-blue-500/50 hover:bg-blue-500/5 text-[var(--crm-ink-faint)] hover:text-blue-400 transition cursor-pointer"
                        title="Edit Professional Details"
                      >
                        <FiEdit2 size={13} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs font-mono">
                    <div className="flex justify-between py-2 border-b border-[var(--crm-line)]/50">
                      <span className="text-[var(--crm-ink-faint)] font-sans">Level of Education</span>
                      <strong className="text-[var(--crm-heading)]">{profile.levelOfEducation || 'Higher Education'}</strong>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[var(--crm-line)]/50">
                      <span className="text-[var(--crm-ink-faint)] font-sans">Degree</span>
                      <strong className="text-[var(--crm-heading)]">{profile.degree || 'Electrical Engineering'}</strong>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[var(--crm-line)]/50">
                      <span className="text-[var(--crm-ink-faint)] font-sans">Hard Skill</span>
                      <strong className="text-[var(--crm-heading)]">{profile.hardSkill || 'Technical Support'}</strong>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[var(--crm-line)]/50">
                      <span className="text-[var(--crm-ink-faint)] font-sans">Soft Skill</span>
                      <strong className="text-[var(--crm-heading)]">{profile.softSkill || 'Communication'}</strong>
                    </div>
                  </div>
                </div>

                {/* Card B: Home Address */}
                <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-[var(--crm-line)] pb-3">
                    <h3 className="text-sm font-bold text-[var(--crm-heading)] flex items-center gap-2.5">
                      <span className="p-2 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg">
                        <FiMapPin size={15} />
                      </span>
                      Home Address
                    </h3>
                    {isSelf && (
                      <button 
                        onClick={() => setShowEditAddrModal(true)}
                        className="p-2 rounded-full border border-[var(--crm-line)] hover:border-amber-500/50 hover:bg-amber-500/5 text-[var(--crm-ink-faint)] hover:text-amber-400 transition cursor-pointer"
                        title="Edit Address Details"
                      >
                        <FiEdit2 size={13} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs font-mono">
                    <div className="flex justify-between py-2 border-b border-[var(--crm-line)]/50">
                      <span className="text-[var(--crm-ink-faint)] font-sans">Address</span>
                      <strong className="text-[var(--crm-heading)] truncate max-w-[200px]">{profile.address || '—'}</strong>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[var(--crm-line)]/50">
                      <span className="text-[var(--crm-ink-faint)] font-sans">Address (cont.)</span>
                      <strong className="text-[var(--crm-heading)]">{profile.addressCont || '—'}</strong>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[var(--crm-line)]/50">
                      <span className="text-[var(--crm-ink-faint)] font-sans">City</span>
                      <strong className="text-[var(--crm-heading)]">{profile.city || '—'}</strong>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[var(--crm-line)]/50">
                      <span className="text-[var(--crm-ink-faint)] font-sans">Postal code</span>
                      <strong className="text-[var(--crm-heading)]">{profile.postalCode || '—'}</strong>
                    </div>
                  </div>
                </div>

                {/* Card C: Tax Information */}
                <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-[var(--crm-line)] pb-3">
                    <h3 className="text-sm font-bold text-[var(--crm-heading)] flex items-center gap-2.5">
                      <span className="p-2 bg-teal-100 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-lg">
                        <FiFileText size={15} />
                      </span>
                      Tax Information
                    </h3>
                    {isSelf && (
                      <button 
                        onClick={() => setShowEditTaxModal(true)}
                        className="p-2 rounded-full border border-[var(--crm-line)] hover:border-teal-500/50 hover:bg-teal-500/5 text-[var(--crm-ink-faint)] hover:text-teal-400 transition cursor-pointer"
                        title="Edit Tax Details"
                      >
                        <FiEdit2 size={13} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs font-mono">
                    <div className="flex justify-between py-2 border-b border-[var(--crm-line)]/50">
                      <span className="text-[var(--crm-ink-faint)] font-sans">Tax Number</span>
                      <strong className="text-[var(--crm-heading)]">{profile.taxNumber || '—'}</strong>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCREEN 2: JOB INFORMATION */}
            {activeTab === 'job' && (
              <motion.div
                key="job"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-6 text-left"
              >
                {/* Card A: Job Specifications */}
                <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-[var(--crm-heading)] border-b border-[var(--crm-line)] pb-3 flex items-center gap-2">
                    <FiBriefcase className="text-teal-500" size={15} /> Job Specifications
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs font-mono">
                    <div className="flex justify-between py-2 border-b border-[var(--crm-line)]/50">
                      <span className="text-[var(--crm-ink-faint)] font-sans">Department</span>
                      <strong className="text-[var(--crm-heading)]">{profile.department}</strong>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[var(--crm-line)]/50">
                      <span className="text-[var(--crm-ink-faint)] font-sans">Position Role</span>
                      <strong className="text-[var(--crm-heading)]">{profile.position || profile.role}</strong>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[var(--crm-line)]/50">
                      <span className="text-[var(--crm-ink-faint)] font-sans">Date of Joining</span>
                      <strong className="text-[var(--crm-heading)]">{profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : 'N/A'}</strong>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[var(--crm-line)]/50">
                      <span className="text-[var(--crm-ink-faint)] font-sans">Employment Type</span>
                      <strong className="text-[var(--crm-heading)]">{profile.employmentType || 'Permanent'}</strong>
                    </div>
                  </div>
                </div>

                {/* Card B: Extended Job Metadata Forms */}
                <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-[var(--crm-heading)] border-b border-[var(--crm-line)] pb-3 flex items-center gap-2">
                    <FiUser className="text-teal-500" size={15} /> Personal Profile Form details
                  </h3>

                  <form onSubmit={handleSaveJobDetails} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Father's Name</label>
                      <input
                        type="text"
                        value={jobForm.fatherName}
                        onChange={(e) => setJobForm({ ...jobForm, fatherName: e.target.value })}
                        className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Date of Birth</label>
                      <input
                        type="date"
                        value={jobForm.dateOfBirth}
                        onChange={(e) => setJobForm({ ...jobForm, dateOfBirth: e.target.value })}
                        className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Mobile Number</label>
                      <input
                        type="text"
                        value={jobForm.phone}
                        onChange={(e) => setJobForm({ ...jobForm, phone: e.target.value })}
                        className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Emergency Contact Name</label>
                      <input
                        type="text"
                        value={jobForm.emergencyContactName}
                        onChange={(e) => setJobForm({ ...jobForm, emergencyContactName: e.target.value })}
                        className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Emergency Contact Phone</label>
                      <input
                        type="tel"
                        value={jobForm.emergencyContactPhone}
                        onChange={(e) => setJobForm({ ...jobForm, emergencyContactPhone: e.target.value })}
                        className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition"
                      />
                    </div>
                    
                    <div className="sm:col-span-2 pt-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="bg-teal-600 hover:bg-teal-700 text-white py-2.5 px-6 font-bold uppercase text-[9px] tracking-widest rounded cursor-pointer transition disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Job Details'}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* SCREEN 3: SALARY INFORMATION */}
            {activeTab === 'salary' && (
              <motion.div
                key="salary"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-6 text-left"
              >
                {/* Bank Account Info Card */}
                <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-[var(--crm-heading)] border-b border-[var(--crm-line)] pb-3 flex items-center gap-2">
                    <FiDollarSign className="text-teal-500" size={15} /> Banking Specifications
                  </h3>

                  <form onSubmit={handleSaveBankDetails} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Bank Name</label>
                      <input
                        type="text"
                        value={bankForm.bankName}
                        onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                        className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">IFSC Code</label>
                      <input
                        type="text"
                        value={bankForm.bankIFSC}
                        onChange={(e) => setBankForm({ ...bankForm, bankIFSC: e.target.value })}
                        className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition"
                      />
                    </div>
                    <div className="sm:col-span-2 pt-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="bg-teal-600 hover:bg-teal-700 text-white py-2.5 px-6 font-bold uppercase text-[9px] tracking-widest rounded cursor-pointer transition disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Bank Details'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Sensitive salary override card (Admin/Managers only) */}
                {isAdminReviewer && (
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-2xl p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-[var(--crm-heading)] border-b border-[var(--crm-line)] pb-3 flex items-center gap-2">
                      <FiShield className="text-rose-500" size={15} /> Sensitive Financials override
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                      {SENSITIVE_FIELDS.map((f) => (
                        <div key={f.key} className="flex items-center justify-between p-3.5 bg-[var(--crm-bg-sunken)]/60 border border-[var(--crm-line)] rounded-md">
                          <div>
                            <span className="text-[8px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold block">{f.label}</span>
                            <span className="text-sm text-[var(--crm-heading)] font-mono block mt-1">
                              {revealed[f.key] || profile[`${f.key}Masked`] || (profile.hasSalary && f.key === 'salary' ? '••••••' : '—')}
                            </span>
                          </div>
                          {true && (
                            <button 
                              onClick={() => handleReveal(f.key)}
                              className="p-1.5 bg-[var(--crm-bg)] hover:bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] transition cursor-pointer"
                              title="Reveal data value"
                            >
                              <FiEye size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSaveSensitive} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[var(--crm-line)]/50">
                      {SENSITIVE_FIELDS.map((f) => (
                        <div key={f.key}>
                          <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">New {f.label}</label>
                          <input
                            type="text"
                            value={sensitiveForm[f.key]}
                            onChange={(e) => setSensitiveForm({ ...sensitiveForm, [f.key]: e.target.value })}
                            placeholder={`Update ${f.label.toLowerCase()}`}
                            className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-rose-500 transition placeholder:text-[var(--crm-ink-faint)]"
                          />
                        </div>
                      ))}
                      <div className="sm:col-span-2 pt-2">
                        <button
                          type="submit"
                          disabled={saving}
                          className="bg-rose-600 hover:bg-rose-700 text-white py-2.5 px-6 font-bold uppercase text-[9px] tracking-widest rounded cursor-pointer transition disabled:opacity-50"
                        >
                          Update Sensitive Fields
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Employment Status / lifecycle controls */}
                {!isSelf && isAdminReviewer && (
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-2xl p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-[var(--crm-heading)] border-b border-[var(--crm-line)] pb-3 flex items-center gap-2">
                      <FiClock className="text-teal-500" size={15} /> Employment Lifecycle
                    </h3>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-block px-3 py-1 border text-[10px] font-bold tracking-wider uppercase rounded bg-[var(--crm-info-bg)] text-[var(--crm-info)] border-[var(--crm-info)]/20">
                        {profile.employmentStatus || 'CONFIRMED'}
                      </span>
                      {profile.confirmationDate && <span className="text-xs text-[var(--crm-ink-faint)] font-mono">Confirmed: {new Date(profile.confirmationDate).toLocaleDateString()}</span>}
                      {profile.lastWorkingDay && <span className="text-xs text-[var(--crm-ink-faint)] font-mono">Last Working Day: {new Date(profile.lastWorkingDay).toLocaleDateString()}</span>}
                    </div>

                    <form onSubmit={handleStatusUpdate} className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[var(--crm-line)]/50">
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Employment Status</label>
                        <select
                          value={statusForm.employmentStatus}
                          onChange={(e) => setStatusForm({ ...statusForm, employmentStatus: e.target.value })}
                          className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition cursor-pointer"
                        >
                          {EMPLOYMENT_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Effective Date</label>
                        <input
                          type="date"
                          value={statusForm.effectiveDate}
                          onChange={(e) => setStatusForm({ ...statusForm, effectiveDate: e.target.value })}
                          className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Lifecycle Note</label>
                        <input
                          type="text"
                          value={statusForm.note}
                          onChange={(e) => setStatusForm({ ...statusForm, note: e.target.value })}
                          className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <button
                          type="submit"
                          disabled={saving}
                          className="bg-teal-600 hover:bg-teal-700 text-white py-2.5 px-6 font-bold uppercase text-[9px] tracking-widest rounded cursor-pointer transition disabled:opacity-50"
                        >
                          Update Status
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'payslips' && (
              <motion.div
                key="payslips"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-2xl p-6 shadow-sm space-y-4 text-left"
              >
                <h3 className="text-sm font-bold text-[var(--crm-heading)] border-b border-[var(--crm-line)] pb-3 flex items-center gap-2">
                  <FiFileText className="text-teal-500" size={15} /> Salary Payslips
                </h3>

                {/* Upload Form - Rendered only for HR Managers, Founder & Admins */}
                {canUploadPayslip && (
                  <form onSubmit={handleUploadPayslipSubmit} className="bg-[var(--crm-bg-sunken)]/50 border border-[var(--crm-line)] p-4 rounded-xl space-y-3 font-mono text-xs">
                    <h4 className="text-[10px] uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold mb-2">Upload New Payslip (PDF Only)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] mb-1">Select Month *</label>
                        <select
                          required
                          value={payslipMonth}
                          onChange={(e) => setPayslipMonth(e.target.value)}
                          className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-2 py-1.5 rounded outline-none focus:border-teal-500 transition"
                        >
                          <option value="">-- Choose Month --</option>
                          {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => {
                            const currentYear = new Date().getFullYear();
                            const optionText = `${m} ${currentYear}`;
                            return <option key={optionText} value={optionText}>{optionText}</option>;
                          })}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] mb-1">Net Salary Amount (₹) *</label>
                        <input
                          type="number"
                          required
                          placeholder="e.g. 45000"
                          value={payslipAmount}
                          onChange={(e) => setPayslipAmount(e.target.value)}
                          className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-2 py-1.5 rounded outline-none focus:border-teal-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] uppercase tracking-widest text-[var(--crm-ink-faint)] mb-1">Payslip PDF *</label>
                        <input
                          type="file"
                          required
                          accept=".pdf"
                          onChange={(e) => setPayslipFile(e.target.files[0])}
                          className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-2 py-1.5 rounded outline-none focus:border-teal-500 transition file:bg-teal-950 file:text-teal-400 file:border-0 file:py-0.5 file:px-1.5 file:rounded file:text-[9px] file:font-mono file:cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={uploadingPayslip}
                        className="bg-teal-650 hover:bg-teal-600 text-white font-bold text-[9px] uppercase tracking-wider py-1.5 px-4 rounded transition cursor-pointer"
                      >
                        {uploadingPayslip ? 'Uploading...' : 'Submit Payslip'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto">
                  {loadingPayslips ? (
                    <div className="py-8 text-center text-[var(--crm-ink-faint)] font-mono text-[10px]">Loading payslips...</div>
                  ) : payslips.length === 0 ? (
                    <div className="py-8 text-center text-[var(--crm-ink-faint)] font-mono text-[10px] uppercase border border-dashed border-[var(--crm-line)] rounded">No payslips uploaded yet</div>
                  ) : (
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead>
                        <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest font-mono font-bold border-b border-[var(--crm-line)]">
                          <th className="py-3 px-4">Period</th>
                          <th className="py-3 px-4">Salary Month</th>
                          <th className="py-3 px-4">Net Amount</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--crm-line)] text-xs font-mono text-[var(--crm-ink-soft)]">
                        {payslips.map(row => (
                          <tr key={row._id} className="hover:bg-[var(--crm-bg-sunken)]/40 transition">
                            <td className="py-3 px-4 font-sans font-bold text-[var(--crm-heading)]">{row.month}</td>
                            <td className="py-3 px-4 font-sans">Full working period</td>
                            <td className="py-3 px-4 text-emerald-400 font-bold">{currency(row.netAmount)}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 bg-emerald-950/40 text-emerald-400 font-mono text-[8px] font-bold rounded border border-emerald-900/30 uppercase">
                                {row.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleDownloadPayslip(row._id, row.month)}
                                  className="bg-teal-650 hover:bg-teal-600 text-white font-bold text-[9px] uppercase tracking-wider py-1 px-2.5 rounded transition cursor-pointer flex items-center gap-1"
                                >
                                  <FiDownload size={10} /> Download
                                </button>
                                {isAdminReviewer && (
                                  <button
                                    onClick={() => handleDeletePayslip(row._id)}
                                    className="bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 border border-rose-900/30 font-bold text-[9px] uppercase tracking-wider py-1.5 px-2.5 rounded transition cursor-pointer flex items-center gap-1"
                                  >
                                    <FiTrash size={10} /> Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </motion.div>
            )}

            {/* SCREEN 5: DOCUMENTS VAULT */}
            {activeTab === 'documents' && (
              <motion.div
                key="documents"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-2xl p-6 shadow-sm space-y-4 text-left"
              >
                <div className="flex items-center justify-between border-b border-[var(--crm-line)] pb-3">
                  <h3 className="text-sm font-bold text-[var(--crm-heading)] flex items-center gap-2">
                    <FiFolder className="text-teal-500" size={15} /> Clearance Documents registry
                  </h3>
                  {isSelf && (
                    <button
                      onClick={() => setShowDocUploadModal(true)}
                      className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-600 text-white text-[9px] font-bold uppercase tracking-wider py-1.5 px-3.5 rounded cursor-pointer transition shadow-sm"
                    >
                      <FiUpload size={11} /> {uploading ? 'Uploading...' : 'Upload Doc'}
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {documents.length === 0 ? (
                    <div className="py-12 border border-dashed border-[var(--crm-line)] rounded flex flex-col items-center justify-center">
                      <FiFolder className="text-[var(--crm-ink-faint)]" size={24} />
                      <span className="text-[10px] font-mono text-[var(--crm-ink-faint)] uppercase mt-2">No documents logged yet</span>
                    </div>
                  ) : (
                    documents.map((doc) => (
                      <div key={doc._id} className="flex items-center justify-between text-xs py-3 px-4 bg-[var(--crm-bg-sunken)]/50 border border-[var(--crm-line)] rounded-lg">
                        <div className="flex flex-col text-left space-y-0.5 min-w-0 pr-4">
                          <span className="text-[var(--crm-heading)] font-semibold truncate max-w-md">{doc.fileName}</span>
                          <span className="text-[9px] font-mono text-teal-400 font-medium">
                            Uploaded by {doc.uploadedBy || profile.fullName || 'Employee'} ({doc.uploadedByRole || profile.role || 'EMPLOYEE'}) • {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Verified Document'}
                          </span>
                        </div>
                        <DownloadButton
                          action={() => handleDownloadDoc(doc)}
                          iconOnly
                          className="w-7 h-7 bg-[var(--crm-bg)] hover:bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] text-[var(--crm-ink-soft)] rounded flex items-center justify-center shadow transition-colors cursor-pointer shrink-0"
                          icon={FiDownload}
                          iconSize={12}
                          title="Download document node"
                        />
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* SCREEN 6: LEAVES MANAGEMENT */}
            {activeTab === 'leaves' && (
              <motion.div
                key="leaves"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-6"
              >
                {/* Leave Balances Header Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-2xl shadow-sm text-left">
                    <span className="text-[9px] uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold font-mono flex items-center gap-1.5">
                      <FiCheckCircle className="text-emerald-500" size={13} /> Paid Leaves Remaining
                    </span>
                    <p className="text-2xl font-serif font-light tracking-tight text-[var(--crm-heading)] mt-2">
                      {leaveBalance?.paidLeave?.available ?? 4} <span className="text-xs text-[var(--crm-ink-faint)] font-mono">/ {leaveBalance?.paidLeave?.total ?? 4} available</span>
                    </p>
                    <p className="text-[9px] text-[var(--crm-ink-faint)] font-mono mt-1">Refreshes every month (non-cumulative)</p>
                  </div>
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-2xl shadow-sm text-left">
                    <span className="text-[9px] uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold font-mono flex items-center gap-1.5">
                      <FiXCircle className="text-amber-500" size={13} /> Emergency Leaves Used
                    </span>
                    <p className="text-2xl font-serif font-light tracking-tight text-[var(--crm-heading)] mt-2">
                      {leaveBalance?.emergencyLeave?.used ?? 0} <span className="text-xs text-[var(--crm-ink-faint)] font-mono">/ {leaveBalance?.emergencyLeave?.total ?? 4} used</span>
                    </p>
                    <p className="text-[9px] text-[var(--crm-ink-faint)] font-mono mt-1">Annual emergency leave allocation limits</p>
                  </div>
                </div>

                {/* Apply Form (Only shown on self profile) */}
                {isSelf && (
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-2xl p-6 shadow-sm text-left">
                    <h3 className="text-sm font-bold text-[var(--crm-heading)] border-b border-[var(--crm-line)] pb-3 flex items-center gap-2">
                      <FiCalendar className="text-teal-500" size={15} /> Request Leave Absence
                    </h3>
                    <form onSubmit={handleApplyLeave} className="space-y-4 mt-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Leave Type *</label>
                          <select
                            value={leaveForm.leaveType}
                            onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                            className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition cursor-pointer"
                          >
                            <option value="PAID">Paid Leave</option>
                            <option value="SICK">Sick Leave</option>
                            <option value="CASUAL">Casual Leave</option>
                            <option value="UNPAID">Unpaid Leave</option>
                            <option value="EXTRA">Emergency / Extra Leave</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">From Date *</label>
                          <input
                            type="date"
                            required
                            value={leaveForm.fromDate}
                            onChange={(e) => setLeaveForm({ ...leaveForm, fromDate: e.target.value })}
                            className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">To Date *</label>
                          <input
                            type="date"
                            required
                            value={leaveForm.toDate}
                            onChange={(e) => setLeaveForm({ ...leaveForm, toDate: e.target.value })}
                            className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition cursor-pointer"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Reason *</label>
                        <textarea
                          required
                          rows={2}
                          value={leaveForm.reason}
                          onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                          placeholder="Please describe the reason for your leave request..."
                          className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none resize-none focus:border-teal-500 transition placeholder:text-[var(--crm-ink-faint)]"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={applyingLeave}
                          className="bg-teal-600 hover:bg-teal-700 text-white py-2.5 px-6 font-bold uppercase text-[9px] tracking-widest rounded cursor-pointer transition disabled:opacity-50"
                        >
                          {applyingLeave ? 'Submitting...' : 'Submit Leave Request'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Review Queue (Only shown on other profiles, to managers or HR) */}
                {!isSelf && isAdminReviewer && (
                  <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-2xl p-6 shadow-sm text-left">
                    <h3 className="text-sm font-bold text-[var(--crm-heading)] border-b border-[var(--crm-line)] pb-3 flex items-center gap-2">
                      <FiShield className="text-amber-500" size={15} /> Leave Approval Decisions Desk
                    </h3>
                    
                    <div className="overflow-x-auto mt-4">
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                          <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest font-mono font-bold border-b border-[var(--crm-line)]">
                            <th className="py-3 px-4">Dates</th>
                            <th className="py-3 px-4">Days</th>
                            <th className="py-3 px-4">Type</th>
                            <th className="py-3 px-4">Reason</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--crm-line)] text-xs">
                          {leaveHistory.filter(lv => lv.status === 'PENDING' || lv.status === 'PENDING_HR_APPROVAL').length === 0 ? (
                            <tr>
                              <td colSpan="6" className="text-center py-8 text-[var(--crm-ink-faint)] font-mono uppercase tracking-widest text-[9px]">
                                No pending leave decisions for this employee.
                              </td>
                            </tr>
                          ) : (
                            leaveHistory.filter(lv => lv.status === 'PENDING' || lv.status === 'PENDING_HR_APPROVAL').map((lv) => {
                              const isApplicantManager = profile?.role === 'MANAGER';
                              const isAuthorized = !isApplicantManager || ['HR', 'ADMIN'].includes(user?.role);
                              
                              return (
                                <tr key={lv._id} className="hover:bg-[var(--crm-bg-sunken)]/40 transition">
                                  <td className="py-3 px-4 font-mono text-[var(--crm-ink-soft)]">
                                    {new Date(lv.fromDate).toLocaleDateString()} &mdash; {new Date(lv.toDate).toLocaleDateString()}
                                  </td>
                                  <td className="py-3 px-4 font-mono">{lv.numberOfDays}d</td>
                                  <td className="py-3 px-4">
                                    <span className="px-2 py-0.5 bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-soft)] font-mono text-[9px] font-bold rounded border border-[var(--crm-line)] uppercase">
                                      {lv.leaveType}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-[var(--crm-ink-soft)] font-light max-w-[150px] truncate" title={lv.reason}>{lv.reason}</td>
                                  <td className="py-3 px-4 font-mono text-amber-400 font-bold uppercase">{lv.status}</td>
                                  <td className="py-3 px-4 text-right whitespace-nowrap">
                                    {isAuthorized ? (
                                      <div className="inline-flex gap-2">
                                        <button
                                          onClick={() => handleReviewLeave(lv._id, 'APPROVED')}
                                          disabled={submittingReviewId === lv._id}
                                          className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold uppercase text-[9px] tracking-wider py-1 px-2.5 rounded transition disabled:opacity-50 cursor-pointer"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          onClick={() => handleReviewLeave(lv._id, 'REJECTED')}
                                          disabled={submittingReviewId === lv._id}
                                          className="bg-rose-800 hover:bg-rose-700 text-white font-bold uppercase text-[9px] tracking-wider py-1 px-2.5 rounded transition disabled:opacity-50 cursor-pointer"
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-[var(--crm-ink-faint)] italic">HR review required</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* History Log Table */}
                <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-2xl p-6 shadow-sm text-left">
                  <h3 className="text-sm font-bold text-[var(--crm-heading)] border-b border-[var(--crm-line)] pb-3">
                    Leave Request History Log
                  </h3>

                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest font-mono font-bold border-b border-[var(--crm-line)]">
                          <th className="py-3 px-4">Leave Type</th>
                          <th className="py-3 px-4">Dates</th>
                          <th className="py-3 px-4">Days</th>
                          <th className="py-3 px-4">Reason</th>
                          <th className="py-3 px-4">Reviewer Remarks</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--crm-line)] text-xs">
                        {leaveHistory.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="text-center py-12 text-[var(--crm-ink-faint)] font-mono uppercase tracking-widest text-[9px]">
                              No leave requests logged for this account.
                            </td>
                          </tr>
                        ) : (
                          leaveHistory.map((lv) => {
                            const statusColors = {
                              PENDING: 'text-amber-400 bg-amber-950/30 border-amber-900/30',
                              PENDING_HR_APPROVAL: 'text-orange-400 bg-orange-950/30 border-orange-900/30',
                              APPROVED: 'text-emerald-400 bg-emerald-950/30 border-emerald-900/30',
                              HR_APPROVED_EXTRA: 'text-teal-400 bg-teal-950/30 border-teal-900/30',
                              REJECTED: 'text-rose-400 bg-rose-950/30 border-rose-900/30',
                            };
                            const statusColor = statusColors[lv.status] || 'text-slate-400 bg-slate-900 border-slate-800';

                            return (
                              <tr key={lv._id} className="hover:bg-[var(--crm-bg-sunken)]/40 transition">
                                <td className="py-3 px-4">
                                  <span className="px-2 py-0.5 bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-soft)] font-mono text-[9px] font-bold rounded border border-[var(--crm-line)] uppercase">
                                    {lv.leaveType}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-mono text-[var(--crm-ink-soft)]">
                                  {new Date(lv.fromDate).toLocaleDateString()} &mdash; {new Date(lv.toDate).toLocaleDateString()}
                                </td>
                                <td className="py-3 px-4 font-mono">{lv.numberOfDays}d</td>
                                <td className="py-3 px-4 text-[var(--crm-ink-soft)] font-light max-w-[150px] truncate" title={lv.reason}>{lv.reason}</td>
                                <td className="py-3 px-4 text-[var(--crm-ink-faint)] font-light max-w-[150px] truncate" title={lv.hrRemarks}>{lv.hrRemarks || '—'}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`px-2 py-0.5 font-mono text-[9px] font-bold rounded border uppercase ${statusColor}`}>
                                    {lv.status.replace(/_/g, ' ')}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

      {/* ─── MODAL A: EDIT PROFESSIONAL INFO ─── */}
      {showEditProfModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4" onClick={() => setShowEditProfModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-2xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[var(--crm-line)] flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--crm-heading)] flex items-center gap-2">
                <FiBookOpen size={16} /> Edit Professional Details
              </h2>
              <button onClick={() => setShowEditProfModal(false)} className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] cursor-pointer"><FiX size={16} /></button>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateProfileFields(profForm);
              }}
              className="p-6 space-y-4 text-left"
            >
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Level of Education</label>
                <input
                  type="text"
                  value={profForm.levelOfEducation}
                  onChange={(e) => setProfForm(prev => ({ ...prev, levelOfEducation: e.target.value }))}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Degree</label>
                <input
                  type="text"
                  value={profForm.degree}
                  onChange={(e) => setProfForm(prev => ({ ...prev, degree: e.target.value }))}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Hard Skill</label>
                <input
                  type="text"
                  value={profForm.hardSkill}
                  onChange={(e) => setProfForm(prev => ({ ...prev, hardSkill: e.target.value }))}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Soft Skill</label>
                <input
                  type="text"
                  value={profForm.softSkill}
                  onChange={(e) => setProfForm(prev => ({ ...prev, softSkill: e.target.value }))}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 font-bold uppercase text-[9px] tracking-widest rounded cursor-pointer transition disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditProfModal(false)}
                  className="flex-1 bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-ink-soft)] py-2.5 font-bold uppercase text-[9px] tracking-widest rounded cursor-pointer hover:bg-[var(--crm-bg-raised)] transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ─── MODAL B: EDIT ADDRESS INFO ─── */}
      {showEditAddrModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4" onClick={() => setShowEditAddrModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-2xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[var(--crm-line)] flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--crm-heading)] flex items-center gap-2">
                <FiMapPin size={16} /> Edit Home Address Details
              </h2>
              <button onClick={() => setShowEditAddrModal(false)} className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] cursor-pointer"><FiX size={16} /></button>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateProfileFields(addrForm);
              }}
              className="p-6 space-y-4 text-left"
            >
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Address</label>
                <input
                  type="text"
                  value={addrForm.address}
                  onChange={(e) => setAddrForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Address Cont.</label>
                <input
                  type="text"
                  value={addrForm.addressCont}
                  onChange={(e) => setAddrForm(prev => ({ ...prev, addressCont: e.target.value }))}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">City</label>
                <input
                  type="text"
                  value={addrForm.city}
                  onChange={(e) => setAddrForm(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Postal Code</label>
                <input
                  type="text"
                  value={addrForm.postalCode}
                  onChange={(e) => setAddrForm(prev => ({ ...prev, postalCode: e.target.value }))}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 font-bold uppercase text-[9px] tracking-widest rounded cursor-pointer transition disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditAddrModal(false)}
                  className="flex-1 bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-ink-soft)] py-2.5 font-bold uppercase text-[9px] tracking-widest rounded cursor-pointer hover:bg-[var(--crm-bg-raised)] transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ─── MODAL C: EDIT TAX INFO ─── */}
      {showEditTaxModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4" onClick={() => setShowEditTaxModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-2xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[var(--crm-line)] flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--crm-heading)] flex items-center gap-2">
                <FiFileText size={16} /> Edit Tax details
              </h2>
              <button onClick={() => setShowEditTaxModal(false)} className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] cursor-pointer"><FiX size={16} /></button>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateProfileFields(taxForm);
              }}
              className="p-6 space-y-4 text-left"
            >
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">Tax Number</label>
                <input
                  type="text"
                  value={taxForm.taxNumber}
                  onChange={(e) => setTaxForm(prev => ({ ...prev, taxNumber: e.target.value }))}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 font-bold uppercase text-[9px] tracking-widest rounded cursor-pointer transition disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditTaxModal(false)}
                  className="flex-1 bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-ink-soft)] py-2.5 font-bold uppercase text-[9px] tracking-widest rounded cursor-pointer hover:bg-[var(--crm-bg-raised)] transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ─── MODAL D: DOCUMENT TYPE SELECTION & UPLOAD MODAL ─── */}
      {showDocUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowDocUploadModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[var(--crm-line)] flex justify-between items-center bg-[var(--crm-bg-sunken)]/50">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--crm-heading)] flex items-center gap-2">
                <FiUpload className="text-teal-400" size={16} /> Select Document Type & Upload
              </h2>
              <button onClick={() => setShowDocUploadModal(false)} className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] cursor-pointer"><FiX size={16} /></button>
            </div>
            
            <form onSubmit={handleModalUploadDoc} className="p-6 space-y-5 text-left">
              {/* Document Category Dropdown / Selector */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-2">
                  What document are you uploading? <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { id: 'aadhaar', label: '🪪 Aadhaar Card', desc: 'Government Identity' },
                    { id: 'pan', label: '💳 PAN Card', desc: 'Tax Registration' },
                    { id: 'bank', label: '🏦 Bank Details / Passbook', desc: 'Account Info' },
                    { id: 'bank_statement', label: '📄 Bank Statement', desc: 'Financial Records' },
                    { id: 'offer_letter', label: '📜 Offer / Joining Letter', desc: 'Employment Document' },
                    { id: 'payslip', label: '🧾 Salary Slip / Payslip', desc: 'Compensation' },
                    { id: 'other', label: '📂 Other Clearance File', desc: 'Custom Document' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setDocCategory(cat.id)}
                      className={`p-3 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                        docCategory === cat.id
                          ? 'bg-teal-500/15 border-teal-500/80 text-teal-300 ring-1 ring-teal-500/50 shadow-sm'
                          : 'bg-[var(--crm-bg-sunken)] border-[var(--crm-line)] text-[var(--crm-ink-soft)] hover:border-[var(--crm-ink-faint)]'
                      }`}
                    >
                      <span className="font-bold text-xs">{cat.label}</span>
                      <span className="text-[9px] text-[var(--crm-ink-faint)] font-mono mt-0.5">{cat.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Document Description */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">
                  Document Note / Label (Optional)
                </label>
                <input
                  type="text"
                  value={customDocName}
                  onChange={(e) => setCustomDocName(e.target.value)}
                  placeholder="e.g. Front & Back Copy / Q1 Statement"
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition placeholder:text-[var(--crm-ink-faint)] font-mono"
                />
              </div>

              {/* File chooser */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold mb-1.5">
                  Choose File (PDF, Image) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs p-2 rounded outline-none focus:border-teal-500 transition file:bg-teal-700 file:text-white file:border-0 file:py-1 file:px-3 file:rounded file:text-[10px] file:font-bold file:uppercase cursor-pointer font-mono"
                  required
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-[var(--crm-line)]">
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-3 font-bold uppercase text-[10px] tracking-widest rounded cursor-pointer transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FiUpload size={13} />
                  {uploading ? 'Uploading to Database...' : 'Submit & Save Document'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDocUploadModal(false)}
                  className="px-5 bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-ink-soft)] py-3 font-bold uppercase text-[10px] tracking-widest rounded cursor-pointer hover:bg-[var(--crm-bg-raised)] transition"
                >
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
