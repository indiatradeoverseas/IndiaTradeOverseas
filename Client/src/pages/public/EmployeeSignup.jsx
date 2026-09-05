import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUser,
  FiMail,
  FiPhone,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiArrowLeft,
  FiCheck,
  FiUpload,
  FiCalendar,
  FiBriefcase,
  FiBookOpen,
  FiCreditCard,
  FiActivity,
  FiShield,
  FiCheckCircle,
  FiTrash2,
  FiDollarSign,
  FiMapPin
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { employeeSignupApi } from '../../api/employee-signup';

// Pre-defined Indian Bank suggestions
const BANK_SUGGESTIONS = [
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Punjab National Bank',
  'Bank of Baroda',
  'Canara Bank',
  'Union Bank of India',
  'IndusInd Bank',
  'Yes Bank'
];

export default function EmployeeSignup() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  // Multi-step Navigation State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState([]);
  
  // Visibility States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [bankFocused, setBankFocused] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    // Step 1: Personal
    name: '',
    email: '',
    phoneCode: '+91',
    phone: '',
    dob: '',
    gender: 'Male',
    fatherHusbandName: '',
    permanentAddress: '',
    currentAddress: '',
    sameAsPermanent: false,

    // Step 2: Professional
    employeeId: '',
    department: 'IT',
    position: 'Frontend Developer',
    joiningDate: new Date().toISOString().split('T')[0],
    employmentType: 'Permanent',
    probationEndDate: '',
    reportingManager: '',
    permissions: {
      productUpload: false,
      lead: false,
      export: false,
      document: false,
      task: false,
      dispatch: false,
      payment: false,
      quotation: false,
      job: false
    },

    // Step 3: Compensation, Banking & Documents
    salary: '',
    bankName: '',
    bankAccountNumber: '',
    confirmBankAccountNumber: '',
    ifscCode: '',
    panCardNumber: '',
    aadhaarNumber: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false,

    // Emergency Contact
    emergencyContactName: '',
    emergencyContactRelationship: 'Other',
    emergencyContactPhone: '',
    emergencyContactEmail: '',

    // Upload Files (Base64)
    profileImage: '',
    resume: '',
    panCardCopy: '',
    aadhaarCardCopy: '',
    passportPhoto: '',
    offerLetter: '',
    additionalDocs: []
  });

  // Error States
  const [errors, setErrors] = useState({});

  // 1. Load Draft & Initial Configs on Mount
  useEffect(() => {
    // Load local storage draft if available
    const savedDraft = localStorage.getItem('employee_signup_draft');
    if (savedDraft) {
      try {
        setFormData(JSON.parse(savedDraft));
      } catch (err) {
        console.error('Error loading draft:', err);
      }
    }

    // Fetch next sequential ID & active managers
    fetchManagers();
    if (!savedDraft || !JSON.parse(savedDraft).employeeId) {
      fetchNextId();
    }
  }, []);

  // 2. Auto-save Draft as fields change
  useEffect(() => {
    localStorage.setItem('employee_signup_draft', JSON.stringify(formData));
  }, [formData]);

  const fetchNextId = async () => {
    try {
      const res = await employeeSignupApi.getNextId();
      if (res.success && res.data?.nextEmployeeId) {
        setFormData(prev => ({ ...prev, employeeId: res.data.nextEmployeeId }));
      }
    } catch (err) {
      console.error('Error fetching employee ID:', err);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await employeeSignupApi.getListManagers();
      if (res.success && res.data?.managers) {
        setManagers(res.data.managers);
      }
    } catch (err) {
      console.error('Error fetching managers list:', err);
    }
  };

  // Same as Permanent logic toggle
  const handleAddressCheckChange = (checked) => {
    setFormData(prev => {
      const updated = { ...prev, sameAsPermanent: checked };
      if (checked) {
        updated.currentAddress = prev.permanentAddress;
      }
      return updated;
    });
  };

  // Base64 File Converter
  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    // Size check
    const maxMB = (field === 'profileImage' || field === 'resume' || field === 'offerLetter') ? 5 : 2;
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(`File size exceeds the ${maxMB}MB limit for this document.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({
        ...prev,
        [field]: reader.result
      }));
      toast.success(`${file.name} successfully uploaded.`);
    };
    reader.onerror = () => toast.error('Error reading file data.');
    reader.readAsDataURL(file);
  };

  // Handle Multi file uploads for Additional Documents
  const handleAdditionalDocsChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds the 5MB size limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setFormData(prev => ({
          ...prev,
          additionalDocs: [...prev.additionalDocs, reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
    toast.success('Additional documents added.');
  };

  // Password Security Metrics
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-gray-700' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[@$!%*?&]/.test(pass)) score++;

    switch (score) {
      case 1:
      case 2:
        return { score, label: 'Weak', color: 'bg-red-500' };
      case 3:
      case 4:
        return { score, label: 'Medium', color: 'bg-yellow-500' };
      case 5:
        return { score, label: 'Strong', color: 'bg-green-500' };
      default:
        return { score: 0, label: 'None', color: 'bg-gray-700' };
    }
  };

  const strength = getPasswordStrength(formData.password);

  // Field validations
  const validateField = (name, val) => {
    let err = '';
    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (val && !emailRegex.test(val)) err = 'Invalid email address format';
    }
    if (name === 'phone') {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (val && !phoneRegex.test(val)) err = 'Must be exactly 10 digits starting with 6-9';
    }
    if (name === 'panCardNumber') {
      const panRegex = /^[A-Z]{5}\d{4}[A-Z]$/;
      if (val && !panRegex.test(val.toUpperCase())) err = 'Must match format ABCDE1234F';
    }
    if (name === 'aadhaarNumber') {
      const aadhaarRegex = /^\d{4}-\d{4}-\d{4}$/;
      if (val && !aadhaarRegex.test(val)) err = 'Must match format XXXX-XXXX-XXXX';
    }
    if (name === 'ifscCode') {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (val && !ifscRegex.test(val.toUpperCase())) err = 'IFSC format invalid (e.g. SBIN0001234)';
    }
    if (name === 'confirmPassword') {
      if (val && val !== formData.password) err = 'Passwords do not match';
    }
    if (name === 'confirmBankAccountNumber') {
      if (val && val !== formData.bankAccountNumber) err = 'Bank Account numbers do not match';
    }
    if (name === 'bankAccountNumber') {
      if (val && val.replace(/[^0-9]/g, '').length < 9) err = 'Account number must be at least 9 digits';
    }

    setErrors(prev => ({ ...prev, [name]: err }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const roleDropdownOptions = {
    SALES: ['Sales Executive', 'Sales Manager', 'Sales Director'],
    HR: ['HR Executive', 'HR Manager', 'HR Director'],
    IT: ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'IT Manager'],
    ADMIN: ['Admin Executive', 'Admin Manager'],
    FINANCE: ['Accountant', 'Finance Manager', 'Finance Controller'],
    OPERATIONS: ['Operations Executive', 'Operations Manager'],
    MARKETING: ['Marketing Executive', 'Marketing Manager'],
    TRANSPORT: ['Transport Manager', 'Logistics Coordinator', 'Driver', 'Fleet Executive']
  };

  // Step validation before moving next
  const canGoNext = () => {
    if (step === 1) {
      if (!formData.name.trim()) return toast.error('Full Name is required');
      if (!formData.email.trim() || errors.email) return toast.error('Please provide a valid email');
      if (!formData.phone.trim() || errors.phone) return toast.error('Please provide a 10-digit Indian phone number');
      return true;
    }
    if (step === 2) {
      if (!formData.employeeId) return toast.error('Employee ID is required');
      if (!formData.position) return toast.error('Designation is required');
      if (formData.employmentType === 'Probation' && !formData.probationEndDate) {
        return toast.error('Probation end date is mandatory when type is Probation');
      }
      return true;
    }
    return false;
  };

  const handleNext = () => {
    if (canGoNext()) setStep(step + 1);
  };

  const handlePrevious = () => {
    setStep(step - 1);
  };

  // Reset Draft Fresh
  const handleResetForm = () => {
    if (!window.confirm('Clear all draft values and start fresh?')) return;
    localStorage.removeItem('employee_signup_draft');
    setFormData({
      name: '',
      email: '',
      phoneCode: '+91',
      phone: '',
      dob: '',
      gender: 'Male',
      fatherHusbandName: '',
      permanentAddress: '',
      currentAddress: '',
      sameAsPermanent: false,
      employeeId: '',
      department: 'IT',
      position: 'Frontend Developer',
      joiningDate: new Date().toISOString().split('T')[0],
      employmentType: 'Permanent',
      probationEndDate: '',
      reportingManager: '',
      permissions: {
        productUpload: false,
        lead: false,
        export: false,
        document: false,
        task: false,
        dispatch: false,
        payment: false,
        quotation: false,
        job: false
      },
      salary: '',
      bankName: '',
      bankAccountNumber: '',
      confirmBankAccountNumber: '',
      ifscCode: '',
      panCardNumber: '',
      aadhaarNumber: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
      emergencyContactName: '',
      emergencyContactRelationship: 'Other',
      emergencyContactPhone: '',
      emergencyContactEmail: '',
      profileImage: '',
      resume: '',
      panCardCopy: '',
      aadhaarCardCopy: '',
      passportPhoto: '',
      offerLetter: '',
      additionalDocs: []
    });
    setErrors({});
    fetchNextId();
    toast.success('Form draft reset.');
  };

  // Submit Signup Registration
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.termsAccepted) {
      return toast.error('You must accept the Terms & Conditions to complete signup.');
    }
    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match.');
    }
    if (formData.bankAccountNumber !== formData.confirmBankAccountNumber) {
      return toast.error('Bank Account numbers do not match.');
    }
    if (!formData.emergencyContactName.trim() || !formData.emergencyContactPhone.trim()) {
      return toast.error('Emergency contact details are required.');
    }

    setLoading(true);
    const toastId = toast.loading('Synchronizing personnel records...');

    try {
      const res = await employeeSignupApi.signup(formData);
      if (res.success) {
        toast.success(`Personnel registration successfully completed! Employee ID: ${res.data?.employee?.employeeId || formData.employeeId}`, { id: toastId });
        localStorage.removeItem('employee_signup_draft');
        
        // Redirect logic
        setTimeout(() => {
          if (currentUser && ['ADMIN', 'HR_MANAGER'].includes(currentUser.role)) {
            navigate('/crm/employees');
          } else {
            navigate('/employee-login');
          }
        }, 1500);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Employee registration failed.';
      toast.error(errorMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="min-h-screen flex bg-[#040A12] font-sans antialiased text-[#C5CBD3] relative overflow-x-hidden">
      
      {/* Background Graphic Asset */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-15">
        <img
          src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=70"
          alt="Cinematic terminal asset"
          className="w-full h-full object-cover filter brightness-[0.8] saturate-[0.5]"
        />
      </div>

      {/* Main Registration Layout Column */}
      <div className="w-full lg:w-[60%] flex flex-col justify-between p-6 sm:p-10 min-h-screen relative z-10 bg-transparent border-r border-[#C5CBD3]/10 text-left">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-[#0E1116] border border-[#C5CBD3]/30 flex items-center justify-center rounded-sm shadow-md">
            <FiShield className="h-4 w-4 text-[var(--crm-accent)]" />
          </div>
          <div>
            <h1 className="text-sm font-serif font-medium text-white tracking-wider uppercase">
              India Trade Overseas
            </h1>
            <p className="text-[9px] text-[#6D7886] tracking-widest uppercase">Personnel Portal</p>
          </div>
        </div>

        {/* Signup Form Core Container */}
        <div className="max-w-2xl w-full mx-auto my-6 py-6 bg-[#0E1116]/80 backdrop-blur-md border border-[#C5CBD3]/10 p-6 sm:p-8 rounded-sm shadow-2xl space-y-6">
          
          {/* Header titles */}
          <div className="flex justify-between items-start border-b border-[#C5CBD3]/10 pb-4">
            <div>
              <h2 className="text-xl font-serif text-white font-normal uppercase tracking-tight flex items-center gap-2">
                Employee Signup Form
              </h2>
              <p className="text-[9px] text-[#6D7886] tracking-widest uppercase font-mono mt-0.5">Step {step} of 3 // Operations</p>
            </div>
            <button
              onClick={handleResetForm}
              className="text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--crm-danger)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <FiTrash2 size={10} /> Reset Form
            </button>
          </div>

          {/* Progress Steps Indicators Bar */}
          <div className="flex justify-between items-center relative py-2">
            <div className="absolute left-0 right-0 h-0.5 bg-[#C5CBD3]/10 top-1/2 -translate-y-1/2 z-0" />
            {[
              { idx: 1, title: 'Personal' },
              { idx: 2, title: 'Professional' },
              { idx: 3, title: 'Compensation & Docs' }
            ].map(s => (
              <div key={s.idx} className="relative z-10 flex flex-col items-center gap-1.5 font-mono text-[9px]">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center border transition-all ${
                  step === s.idx ? 'bg-[var(--crm-accent)] border-[var(--crm-accent)] text-[#0E1116] font-bold' :
                  step > s.idx ? 'bg-[#56A587] border-[#56A587] text-[#0E1116] font-bold' :
                  'bg-[#0E1116] border-[#C5CBD3]/20 text-[#6D7886]'
                }`}>
                  {step > s.idx ? <FiCheck size={12} /> : s.idx}
                </div>
                <span className={step === s.idx ? 'text-white font-bold' : 'text-[#6D7886]'}>{s.title}</span>
              </div>
            ))}
          </div>

          {/* Form Content Steps with Animations */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              
              {/* STEP 1: PERSONAL INFORMATION */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4 text-xs font-mono"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-[#6D7886] mb-1 font-bold">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-[#040A12] border border-[#C5CBD3]/20 focus:border-[var(--crm-accent)] px-3 py-2 text-white outline-none rounded-sm"
                        placeholder="e.g. Rajan Malhotra"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-[#6D7886] mb-1 font-bold">Email Address *</label>
                      <input
                        type="email"
                        required
                        name="email"
                        value={formData.email}
                        onBlur={handleBlur}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full bg-[#040A12] border focus:border-[var(--crm-accent)] px-3 py-2 text-white outline-none rounded-sm ${
                          errors.email ? 'border-[var(--crm-danger)]' : 'border-[#C5CBD3]/20'
                        }`}
                        placeholder="rajan@company.com"
                      />
                      {errors.email && <span className="text-[8px] text-[var(--crm-danger)] block mt-0.5">{errors.email}</span>}
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-[#6D7886] mb-1 font-bold">Phone Number *</label>
                      <div className="flex">
                        <select
                          value={formData.phoneCode}
                          onChange={(e) => setFormData({ ...formData, phoneCode: e.target.value })}
                          className="bg-[#040A12] border border-[#C5CBD3]/20 text-[#C5CBD3] px-2.5 py-2 outline-none rounded-l-sm border-r-0 cursor-pointer"
                        >
                          <option value="+91">+91 (IN)</option>
                          <option value="+1">+1 (US)</option>
                          <option value="+44">+44 (UK)</option>
                        </select>
                        <input
                          type="tel"
                          required
                          name="phone"
                          value={formData.phone}
                          onBlur={handleBlur}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className={`w-full bg-[#040A12] border focus:border-[var(--crm-accent)] px-3 py-2 text-white outline-none rounded-r-sm ${
                            errors.phone ? 'border-[var(--crm-danger)]' : 'border-[#C5CBD3]/20'
                          }`}
                          placeholder="Starts with 6-9 (10-digit)"
                        />
                      </div>
                      {errors.phone && <span className="text-[8px] text-[var(--crm-danger)] block mt-0.5">{errors.phone}</span>}
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-[#6D7886] mb-1 font-bold">Date of Birth</label>
                      <input
                        type="date"
                        value={formData.dob}
                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                        className="w-full bg-[#040A12] border border-[#C5CBD3]/20 focus:border-[var(--crm-accent)] px-3 py-2 text-white outline-none rounded-sm"
                      />
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-[#6D7886] mb-1 font-bold">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full bg-[#040A12] border border-[#C5CBD3]/20 focus:border-[var(--crm-accent)] px-3 py-2 text-white outline-none rounded-sm cursor-pointer"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Father's/Husband's Name */}
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-[#6D7886] mb-1 font-bold">Father's / Husband's Name</label>
                      <input
                        type="text"
                        value={formData.fatherHusbandName}
                        onChange={(e) => setFormData({ ...formData, fatherHusbandName: e.target.value })}
                        className="w-full bg-[#040A12] border border-[#C5CBD3]/20 focus:border-[var(--crm-accent)] px-3 py-2 text-white outline-none rounded-sm"
                        placeholder="Father/Husband full name"
                      />
                    </div>
                  </div>

                  {/* Permanent Address */}
                  <div>
                    <label className="block text-[8px] uppercase tracking-wider text-[#6D7886] mb-1 font-bold">Permanent Address</label>
                    <textarea
                      rows={2}
                      value={formData.permanentAddress}
                      onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                      className="w-full bg-[#040A12] border border-[#C5CBD3]/20 focus:border-[var(--crm-accent)] px-3 py-2 text-white outline-none rounded-sm resize-none"
                      placeholder="Street name, City, State, PIN Code..."
                    />
                  </div>

                  {/* Current Address with Same As toggle */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-[9px] font-bold text-[#6D7886] uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={formData.sameAsPermanent}
                        onChange={(e) => handleAddressCheckChange(e.target.checked)}
                        className="rounded-sm border-[#C5CBD3]/20 bg-[#040A12] accent-[var(--crm-accent)] w-4 h-4 cursor-pointer"
                      />
                      Current Address same as Permanent Address
                    </label>
                    
                    {!formData.sameAsPermanent && (
                      <textarea
                        rows={2}
                        value={formData.currentAddress}
                        onChange={(e) => setFormData({ ...formData, currentAddress: e.target.value })}
                        className="w-full bg-[#040A12] border border-[#C5CBD3]/20 focus:border-[var(--crm-accent)] px-3 py-2 text-white outline-none rounded-sm resize-none"
                        placeholder="Enter current residential address..."
                      />
                    )}
                  </div>
                </motion.div>
              )}

              {/* STEP 2: PROFESSIONAL INFORMATION */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4 text-xs font-mono"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Employee ID (prefilled/read-only) */}
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-[#6D7886] mb-1 font-bold">Employee ID (Read Only)</label>
                      <input
                        type="text"
                        readOnly
                        value={formData.employeeId}
                        className="w-full bg-[#0E1116] border border-[#C5CBD3]/10 px-3 py-2 text-gray-400 outline-none rounded-sm font-bold cursor-not-allowed select-none"
                      />
                    </div>

                    {/* Department */}
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-[#6D7886] mb-1 font-bold">Department *</label>
                      <select
                        value={formData.department}
                        onChange={(e) => {
                          const dept = e.target.value;
                          setFormData({
                            ...formData,
                            department: dept,
                            position: roleDropdownOptions[dept][0] // Set first role as default
                          });
                        }}
                        className="w-full bg-[#040A12] border border-[#C5CBD3]/20 focus:border-[var(--crm-accent)] px-3 py-2 text-white outline-none rounded-sm cursor-pointer"
                      >
                        <option value="SALES">SALES</option>
                        <option value="HR">HR</option>
                        <option value="IT">IT</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="FINANCE">FINANCE</option>
                        <option value="OPERATIONS">OPERATIONS</option>
                        <option value="MARKETING">MARKETING</option>
                        <option value="TRANSPORT">TRANSPORT</option>
                      </select>
                    </div>

                    {/* Role / Designation */}
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-[#6D7886] mb-1 font-bold">Designation / Role *</label>
                      <select
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        className="w-full bg-[#040A12] border border-[#C5CBD3]/20 focus:border-[var(--crm-accent)] px-3 py-2 text-white outline-none rounded-sm cursor-pointer"
                      >
                        {roleDropdownOptions[formData.department]?.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>

                    {/* Date of Joining */}
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-[#6D7886] mb-1 font-bold">Date of Joining</label>
                      <input
                        type="date"
                        value={formData.joiningDate}
                        onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                        className="w-full bg-[#040A12] border border-[#C5CBD3]/20 focus:border-[var(--crm-accent)] px-3 py-2 text-white outline-none rounded-sm"
                      />
                    </div>

                    {/* Employment Type */}
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-[#6D7886] mb-1 font-bold">Employment Type</label>
                      <select
                        value={formData.employmentType}
                        onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                        className="w-full bg-[#040A12] border border-[#C5CBD3]/20 focus:border-[var(--crm-accent)] px-3 py-2 text-white outline-none rounded-sm cursor-pointer"
                      >
                        <option value="Permanent">Permanent</option>
                        <option value="Contract">Contract</option>
                        <option value="Probation">Probation</option>
                        <option value="Internship">Internship</option>
                      </select>
                    </div>

                    {/* Probation End Date (Conditional) */}
                    {formData.employmentType === 'Probation' && (
                      <div className="animate-fadeIn">
                        <label className="block text-[8px] uppercase tracking-wider text-[var(--crm-warning)] mb-1 font-bold">Probation End Date *</label>
                        <input
                          type="date"
                          required
                          value={formData.probationEndDate}
                          onChange={(e) => setFormData({ ...formData, probationEndDate: e.target.value })}
                          className="w-full bg-[#040A12] border border-[var(--crm-warning)]/55 px-3 py-2 text-white outline-none rounded-sm"
                        />
                      </div>
                    )}

                    {/* Reporting Manager */}
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-[#6D7886] mb-1 font-bold">Reporting Manager</label>
                      <select
                        value={formData.reportingManager}
                        onChange={(e) => setFormData({ ...formData, reportingManager: e.target.value })}
                        className="w-full bg-[#040A12] border border-[#C5CBD3]/20 focus:border-[var(--crm-accent)] px-3 py-2 text-white outline-none rounded-sm cursor-pointer"
                      >
                        <option value="">No Manager / Direct HR</option>
                        {managers.map(mgr => (
                          <option key={mgr._id} value={mgr._id}>{mgr.name} ({mgr.position})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Permissions Checklist (Admin view only) */}
                  {isAdmin && (
                    <div className="border border-[#C5CBD3]/10 bg-[#040A12] p-4 rounded-sm space-y-3 animate-fadeIn">
                      <h4 className="text-[10px] text-[var(--crm-accent)] font-bold uppercase tracking-wider border-b border-[#C5CBD3]/10 pb-1.5 flex items-center gap-1.5">
                        <FiShield size={12} /> Access Permissions (Admin Only)
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[10px]">
                        {Object.keys(formData.permissions).map((permKey) => (
                          <label key={permKey} className="flex items-center gap-2 cursor-pointer select-none hover:text-white">
                            <input
                              type="checkbox"
                              checked={formData.permissions[permKey]}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setFormData(prev => ({
                                  ...prev,
                                  permissions: {
                                    ...prev.permissions,
                                    [permKey]: checked
                                  }
                                }));
                              }}
                              className="rounded-sm bg-[#0E1116] border-[#C5CBD3]/20 accent-[var(--crm-accent)] w-4 h-4 cursor-pointer"
                            />
                            <span className="capitalize">{permKey.replace(/([A-Z])/g, ' $1')}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 3: COMPENSATION, BANKING & DOCUMENTS */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5 text-xs font-mono"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Salary Amount */}
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-[#6D7886] mb-1 font-bold">Salary Amount (Monthly)</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#6D7886] pointer-events-none">₹</span>
                        <input
                          type="number"
                          value={formData.salary}
                          onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                          className="w-full bg-[#040A12] border border-[#C5CBD3]/20 focus:border-[var(--crm-accent)] pl-7 pr-3 py-2 text-white outline-none rounded-sm"
                          placeholder="Amount in INR"
                        />
                      </div>
                    </div>

                    {/* Bank Name (with suggestions) */}
                    <div className="relative">
                      <label className="block text-[8px] uppercase tracking-wider text-[#6D7886] mb-1 font-bold">Bank Name</label>
                      <input
                        type="text"
                        value={formData.bankName}
                        onFocus={() => setBankFocused(true)}
                        onBlur={() => setTimeout(() => setBankFocused(false), 200)}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        className="w-full bg-[#040A12] border border-[#C5CBD3]/20 focus:border-[var(--crm-accent)] px-3 py-2 text-white outline-none rounded-sm"
                        placeholder="Search or enter bank..."
                      />
                      {bankFocused && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-[#0E1116] border border-[#C5CBD3]/20 max-h-[140px] overflow-y-auto rounded-sm z-[80] shadow-2xl p-1 text-[10px]">
                          {BANK_SUGGESTIONS.filter(b => b.toLowerCase().includes(formData.bankName.toLowerCase())).map(b => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => setFormData({ ...formData, bankName: b })}
                              className="w-full text-left px-2 py-1.5 hover:bg-[#040A12] text-white hover:text-[var(--crm-accent)] rounded-sm transition cursor-pointer"
                            >
                              {b}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Account Number */}
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-[#6D7886] mb-1 font-bold">Bank Account Number</label>
                      <input
                        type="password"
                        name="bankAccountNumber"
                        value={formData.bankAccountNumber}
                        onBlur={handleBlur}
                        onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                        className={`w-full bg-[#040A12] border focus:border-[var(--crm-accent)] px-3 py-2 text-white outline-none rounded-sm ${
                          errors.bankAccountNumber ? 'border-[var(--crm-danger)]' : 'border-[#C5CBD3]/20'
                        }`}
                        placeholder="At least 9 digits (Masked)"
                      />
                      {errors.bankAccountNumber && <span className="text-[8px] text-[var(--crm-danger)] block mt-0.5">{errors.bankAccountNumber}</span>}
                    </div>

                    {/* Confirm Account Number */}
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-[#6D7886] mb-1 font-bold">Confirm Account Number</label>
                      <input
                        type="text"
                        name="confirmBankAccountNumber"
                        value={formData.confirmBankAccountNumber}
                        onBlur={handleBlur}
                        onChange={(e) => setFormData({ ...formData, confirmBankAccountNumber: e.target.value })}
                        className={`w-full bg-[#040A12] border focus:border-[var(--crm-accent)] px-3 py-2 text-white outline-none rounded-sm ${
                          errors.confirmBankAccountNumber ? 'border-[var(--crm-danger)]' : 'border-[#C5CBD3]/20'
                        }`}
                        placeholder="Re-enter bank account number"
                      />
                      {errors.confirmBankAccountNumber && <span className="text-[8px] text-[var(--crm-danger)] block mt-0.5">{errors.confirmBankAccountNumber}</span>}
                    </div>

                    {/* IFSC Code */}
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-[#6D7886] mb-1 font-bold">IFSC Code</label>
                      <input
                        type="text"
                        name="ifscCode"
                        value={formData.ifscCode}
                        onBlur={handleBlur}
                        onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                        className={`w-full bg-[#040A12] border focus:border-[var(--crm-accent)] px-3 py-2 text-white outline-none rounded-sm ${
                          errors.ifscCode ? 'border-[var(--crm-danger)]' : 'border-[#C5CBD3]/20'
                        }`}
                        placeholder="e.g. HDFC0000240"
                      />
                      {errors.ifscCode && <span className="text-[8px] text-[var(--crm-danger)] block mt-0.5">{errors.ifscCode}</span>}
                    </div>

                    {/* PAN Card Number */}
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-[#6D7886] mb-1 font-bold">PAN Card Number</label>
                      <input
                        type="text"
                        name="panCardNumber"
                        value={formData.panCardNumber}
                        onBlur={handleBlur}
                        onChange={(e) => setFormData({ ...formData, panCardNumber: e.target.value.toUpperCase() })}
                        className={`w-full bg-[#040A12] border focus:border-[var(--crm-accent)] px-3 py-2 text-white outline-none rounded-sm ${
                          errors.panCardNumber ? 'border-[var(--crm-danger)]' : 'border-[#C5CBD3]/20'
                        }`}
                        placeholder="ABCDE1234F"
                      />
                      {errors.panCardNumber && <span className="text-[8px] text-[var(--crm-danger)] block mt-0.5">{errors.panCardNumber}</span>}
                    </div>

                    {/* Aadhaar Number */}
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-[#6D7886] mb-1 font-bold">Aadhaar Number</label>
                      <input
                        type="text"
                        name="aadhaarNumber"
                        value={formData.aadhaarNumber}
                        onBlur={handleBlur}
                        onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })}
                        className={`w-full bg-[#040A12] border focus:border-[var(--crm-accent)] px-3 py-2 text-white outline-none rounded-sm ${
                          errors.aadhaarNumber ? 'border-[var(--crm-danger)]' : 'border-[#C5CBD3]/20'
                        }`}
                        placeholder="XXXX-XXXX-XXXX"
                      />
                      {errors.aadhaarNumber && <span className="text-[8px] text-[var(--crm-danger)] block mt-0.5">{errors.aadhaarNumber}</span>}
                    </div>
                  </div>

                  {/* Passwords */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#C5CBD3]/10 pt-4">
                    {/* Password */}
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-[#6D7886] mb-1 font-bold">Password *</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full bg-[#040A12] border border-[#C5CBD3]/20 focus:border-[var(--crm-accent)] px-3 py-2 text-white outline-none rounded-sm"
                          placeholder="Enter strong password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6D7886] hover:text-white"
                        >
                          {showPassword ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                        </button>
                      </div>
                      {/* Password strength meter */}
                      {formData.password && (
                        <div className="mt-2 space-y-1">
                          <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full ${strength.color}`} style={{ width: `${(strength.score / 5) * 100}%` }} />
                          </div>
                          <span className="text-[8px] text-[#6D7886]">Strength: <strong className="text-white">{strength.label}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-[#6D7886] mb-1 font-bold">Confirm Password *</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onBlur={handleBlur}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className={`w-full bg-[#040A12] border focus:border-[var(--crm-accent)] px-3 py-2 text-white outline-none rounded-sm ${
                            errors.confirmPassword ? 'border-[var(--crm-danger)]' : 'border-[#C5CBD3]/20'
                          }`}
                          placeholder="Re-enter password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6D7886] hover:text-white"
                        >
                          {showConfirmPassword ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                        </button>
                      </div>
                      {errors.confirmPassword && <span className="text-[8px] text-[var(--crm-danger)] block mt-0.5">{errors.confirmPassword}</span>}
                    </div>
                  </div>

                  {/* EMERGENCY CONTACT SECTION */}
                  <div className="border border-[#C5CBD3]/10 bg-[#0E1116] p-4 rounded-sm space-y-3">
                    <h4 className="text-[9px] text-[var(--crm-accent)] font-bold uppercase tracking-wider border-b border-[#C5CBD3]/10 pb-1">Emergency Contact</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[8px] uppercase text-[#6D7886] mb-1">Contact Name *</label>
                        <input
                          type="text"
                          required={step === 3}
                          value={formData.emergencyContactName}
                          onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                          className="w-full bg-[#040A12] border border-[#C5CBD3]/20 px-2 py-1.5 text-white outline-none text-[11px]"
                          placeholder="Name"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] uppercase text-[#6D7886] mb-1">Relationship</label>
                        <select
                          value={formData.emergencyContactRelationship}
                          onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
                          className="w-full bg-[#040A12] border border-[#C5CBD3]/20 px-2 py-1.5 text-white outline-none text-[11px]"
                        >
                          <option value="Spouse">Spouse</option>
                          <option value="Parent">Parent</option>
                          <option value="Sibling">Sibling</option>
                          <option value="Friend">Friend</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[8px] uppercase text-[#6D7886] mb-1">Phone Number *</label>
                        <input
                          type="tel"
                          required={step === 3}
                          value={formData.emergencyContactPhone}
                          onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                          className="w-full bg-[#040A12] border border-[#C5CBD3]/20 px-2 py-1.5 text-white outline-none text-[11px]"
                          placeholder="10-digit number"
                        />
                      </div>
                    </div>
                  </div>

                  {/* DOCUMENT UPLOAD SECTION */}
                  <div className="border border-[#C5CBD3]/10 bg-[#0E1116] p-4 rounded-sm space-y-4">
                    <h4 className="text-[9px] text-[var(--crm-accent)] font-bold uppercase tracking-wider border-b border-[#C5CBD3]/10 pb-1">Documents Upload</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Profile Photo */}
                      <div className="space-y-1">
                        <label className="block text-[8px] uppercase text-[#6D7886]">Profile Photo (.jpg, .png - max 5MB)</label>
                        <div className="flex items-center gap-2">
                          <input type="file" accept=".jpg,.png,.jpeg" onChange={(e) => handleFileChange(e, 'profileImage')} className="hidden" id="f-profile" />
                          <label htmlFor="f-profile" className="px-3 py-1.5 bg-[#040A12] border border-[#C5CBD3]/20 hover:border-white transition rounded text-[10px] cursor-pointer flex items-center gap-1.5">
                            <FiUpload size={12} /> {formData.profileImage ? 'Change Image' : 'Select Photo'}
                          </label>
                          {formData.profileImage && <FiCheckCircle className="text-[var(--crm-positive)]" />}
                        </div>
                      </div>

                      {/* Resume / CV */}
                      <div className="space-y-1">
                        <label className="block text-[8px] uppercase text-[#6D7886]">Resume / CV (.pdf, .docx - max 5MB)</label>
                        <div className="flex items-center gap-2">
                          <input type="file" accept=".pdf,.docx" onChange={(e) => handleFileChange(e, 'resume')} className="hidden" id="f-resume" />
                          <label htmlFor="f-resume" className="px-3 py-1.5 bg-[#040A12] border border-[#C5CBD3]/20 hover:border-white transition rounded text-[10px] cursor-pointer flex items-center gap-1.5">
                            <FiUpload size={12} /> {formData.resume ? 'Change CV' : 'Select File'}
                          </label>
                          {formData.resume && <FiCheckCircle className="text-[var(--crm-positive)]" />}
                        </div>
                      </div>

                      {/* PAN Card copy */}
                      <div className="space-y-1">
                        <label className="block text-[8px] uppercase text-[#6D7886]">PAN Copy (.pdf, .jpg - max 2MB)</label>
                        <div className="flex items-center gap-2">
                          <input type="file" accept=".pdf,.jpg,.jpeg" onChange={(e) => handleFileChange(e, 'panCardCopy')} className="hidden" id="f-pancopy" />
                          <label htmlFor="f-pancopy" className="px-3 py-1.5 bg-[#040A12] border border-[#C5CBD3]/20 hover:border-white transition rounded text-[10px] cursor-pointer flex items-center gap-1.5">
                            <FiUpload size={12} /> {formData.panCardCopy ? 'Change File' : 'Select File'}
                          </label>
                          {formData.panCardCopy && <FiCheckCircle className="text-[var(--crm-positive)]" />}
                        </div>
                      </div>

                      {/* Aadhaar Card copy */}
                      <div className="space-y-1">
                        <label className="block text-[8px] uppercase text-[#6D7886]">Aadhaar Copy (.pdf, .jpg - max 2MB)</label>
                        <div className="flex items-center gap-2">
                          <input type="file" accept=".pdf,.jpg,.jpeg" onChange={(e) => handleFileChange(e, 'aadhaarCardCopy')} className="hidden" id="f-aadhaarcopy" />
                          <label htmlFor="f-aadhaarcopy" className="px-3 py-1.5 bg-[#040A12] border border-[#C5CBD3]/20 hover:border-white transition rounded text-[10px] cursor-pointer flex items-center gap-1.5">
                            <FiUpload size={12} /> {formData.aadhaarCardCopy ? 'Change File' : 'Select File'}
                          </label>
                          {formData.aadhaarCardCopy && <FiCheckCircle className="text-[var(--crm-positive)]" />}
                        </div>
                      </div>

                      {/* Offer Letter */}
                      <div className="space-y-1">
                        <label className="block text-[8px] uppercase text-[#6D7886]">Offer Letter (.pdf - max 5MB)</label>
                        <div className="flex items-center gap-2">
                          <input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 'offerLetter')} className="hidden" id="f-offer" />
                          <label htmlFor="f-offer" className="px-3 py-1.5 bg-[#040A12] border border-[#C5CBD3]/20 hover:border-white transition rounded text-[10px] cursor-pointer flex items-center gap-1.5">
                            <FiUpload size={12} /> {formData.offerLetter ? 'Change File' : 'Select File'}
                          </label>
                          {formData.offerLetter && <FiCheckCircle className="text-[var(--crm-positive)]" />}
                        </div>
                      </div>

                      {/* Additional Documents */}
                      <div className="space-y-1">
                        <label className="block text-[8px] uppercase text-[#6D7886]">Additional Docs (Multiple - max 5MB)</label>
                        <div className="flex items-center gap-2">
                          <input type="file" multiple onChange={handleAdditionalDocsChange} className="hidden" id="f-additional" />
                          <label htmlFor="f-additional" className="px-3 py-1.5 bg-[#040A12] border border-[#C5CBD3]/20 hover:border-white transition rounded text-[10px] cursor-pointer flex items-center gap-1.5">
                            <FiUpload size={12} /> Add Files
                          </label>
                          {formData.additionalDocs.length > 0 && (
                            <span className="text-[8px] text-[var(--crm-positive)] font-bold">({formData.additionalDocs.length} uploaded)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  <label className="flex items-start gap-2 cursor-pointer select-none text-[10px] text-[#6D7886] hover:text-white pt-2 border-t border-[#C5CBD3]/10">
                    <input
                      type="checkbox"
                      required
                      checked={formData.termsAccepted}
                      onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                      className="rounded-sm bg-[#0E1116] border-[#C5CBD3]/20 accent-[var(--crm-accent)] w-4 h-4 cursor-pointer mt-0.5"
                    />
                    <span>
                      I declare that all personal and professional credentials declared in this sign-up form are authentic. I accept India Trade Overseas' standard code of conduct and policy logs.
                    </span>
                  </label>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Navigation buttons row */}
            <div className="flex justify-between items-center pt-4 border-t border-[#C5CBD3]/10">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="px-4 py-2 border border-[#C5CBD3]/20 hover:border-white text-white rounded-sm text-[10px] font-bold uppercase transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FiArrowLeft size={12} /> Back
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2 bg-white text-[#0E1116] font-bold rounded-sm text-[10px] font-mono uppercase transition hover:bg-[#C5CBD3] flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  Continue <FiArrowRight size={12} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-[#56A587] text-[#0E1116] font-bold rounded-sm text-[10px] font-mono uppercase tracking-wider transition hover:bg-[#438c6f] flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {loading ? 'Submitting Form...' : 'Complete Signup'}
                  <FiCheckCircle size={12} />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Global Protection footer */}
        <div className="text-[9px] text-[#6D7886]/60 leading-relaxed font-light mt-4">
          &copy; 2026 India Trade Overseas. Restricted access node.
        </div>
      </div>

      {/* RIGHT COLUMN: Cinematic visual graphics */}
      <div className="hidden lg:block lg:w-[40%] relative h-screen bg-[#040A12] shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-[#040A12] via-[#040A12]/30 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#040A12] z-10 pointer-events-none" />
        <img
          src="./images/ito_images/ito_10.jpeg"
          alt="freight terminal loading"
          className="w-full h-full object-cover filter brightness-[0.9] saturate-[0.6]"
        />
        <div className="absolute bottom-10 right-10 bg-[#0E1116]/80 backdrop-blur-md border border-[#C5CBD3]/20 p-5 rounded-sm max-w-xs z-20 text-left font-mono">
          <span className="text-[8px] text-[var(--crm-accent)] tracking-widest uppercase block mb-1">Onboarding Terminal</span>
          <h4 className="text-sm text-white font-serif font-light leading-snug">"Seamless personnel registration."</h4>
          <p className="text-[10px] text-[#6D7886] font-light leading-relaxed mt-2">
            Configure secure banking, personal addresses, emergency verification contacts, and administrative roles dynamically.
          </p>
        </div>
      </div>

    </div>
  );
}