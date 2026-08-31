import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUsers,
  FiBriefcase,
  FiFileText,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiUser,
  FiCalendar,
  FiSearch,
  FiFilter,
  FiDownload,
  FiList,
  FiCheckSquare,
  FiAlertCircle,
  FiTrendingUp,
  FiDollarSign,
  FiCheck,
  FiX,
  FiShield,
  FiHardDrive,
  FiAward,
  FiSliders,
  FiActivity,
  FiInfo,
  FiEye,
  FiGrid,
  FiMessageSquare,
  FiMoreHorizontal,
  FiUserPlus
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { careersApi } from '../../api/careers';
import { adminApi } from '../../api/admin';
import { leaveApi } from '../../api/leave';
import { attendanceApi } from '../../api/attendance';
import { taskApi } from '../../api/task';
import { employeeSignupApi } from '../../api/employee-signup';
import { DownloadButton } from '../../components/ui/AnimatedActionButton';
import { socketService } from '../../services/socket';

const CARD = { borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)', boxShadow: 'var(--crm-shadow)' };
const CARD_SUNKEN = { borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' };
const LABEL_MONO = { fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-ink-faint)' };
const HEADING = { fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' };

// Skeleton Components
const SkeletonStatCard = () => (
  <div className="border p-5 rounded-sm" style={CARD}>
    <div className="flex items-start justify-between gap-2">
      <div className="crm-skeleton h-3 w-24 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
      <div className="crm-skeleton h-8 w-8 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
    </div>
    <div className="crm-skeleton h-7 w-16 rounded-sm mt-4" style={{ background: 'var(--crm-bg-sunken)' }} />
  </div>
);

const SkeletonDepartmentBar = () => (
  <div className="space-y-1">
    <div className="flex justify-between">
      <div className="crm-skeleton h-3 w-20 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
      <div className="crm-skeleton h-3 w-24 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
    </div>
    <div className="crm-skeleton h-1.5 w-full rounded-full" style={{ background: 'var(--crm-bg-sunken)' }} />
  </div>
);

const SkeletonAttendanceStat = () => (
  <div className="p-3 border rounded-sm text-center" style={CARD_SUNKEN}>
    <div className="crm-skeleton h-3 w-16 mx-auto rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
    <div className="crm-skeleton h-6 w-8 mx-auto mt-1 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
  </div>
);

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.05 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 18 } }
};

const getEmployeePhoto = (empId, fullName, profilesData) => {
  if (profilesData && profilesData[empId]?.photo) {
    return profilesData[empId].photo;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || "User")}&background=1e293b&color=c89a54&bold=true&size=128`;
};

export default function HrManagerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [payrollSubTab, setPayrollSubTab] = useState('payroll');

  // View state for directory (grid vs list)
  const [viewMode, setViewMode] = useState('grid');
  const [activeDropdownEmpId, setActiveDropdownEmpId] = useState(null);

  // Backend state
  const [employees, setEmployees] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pending employee registrations state
  const [pendingEmployees, setPendingEmployees] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  // New Attendance & Leave dashboard state variables
  const [hrSettings, setHrSettings] = useState({
    maxExtraLeavesPerYear: 4,
    extraLeaveApprovalRequired: true,
    autoApproveExtraLeaves: false,
    notifyHROnExtraRequest: true,
    extraLeaveReasonRequired: true
  });
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [resetMonthInput, setResetMonthInput] = useState(new Date().toISOString().slice(0, 7));
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [selectedLeaveIdForReview, setSelectedLeaveIdForReview] = useState(null);

  // Search & Filter states
  const [searchEmp, setSearchEmp] = useState('');
  const [filterEmpRole, setFilterEmpRole] = useState('ALL');
  const [filterEmpDept, setFilterEmpDept] = useState('ALL');

  // Expanded card indices
  const [expandedEmpId, setExpandedEmpId] = useState(null);

  // Modals / Forms
  const [showJobModal, setShowJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [jobForm, setJobForm] = useState({
    title: '',
    department: '',
    location: '',
    type: 'Full-time',
    experience: '',
    description: '',
    requirements: '',
    isActive: true
  });

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'MEDIUM',
    dueDate: ''
  });

  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [interviewForm, setInterviewForm] = useState({
    interviewerId: '',
    date: '',
    time: '',
    notes: ''
  });
  const [scheduledInterviews, setScheduledInterviews] = useState(() => {
    return JSON.parse(localStorage.getItem('scheduled_interviews')) || [];
  });

  // ERP local storage states
  const [assignedTasks, setAssignedTasks] = useState(() => {
    return JSON.parse(localStorage.getItem('assigned_hr_tasks')) || [];
  });

  // Profile Master Data persistence
  const [profilesData, setProfilesData] = useState(() => {
    return JSON.parse(localStorage.getItem('hr_employee_profiles_master')) || {};
  });

  // Salary persistence
  const [salariesData, setSalariesData] = useState(() => {
    return JSON.parse(localStorage.getItem('hr_employee_salaries_registry')) || {};
  });

  // Tax persistence
  const [taxDeclarations, setTaxDeclarations] = useState(() => {
    return JSON.parse(localStorage.getItem('hr_tax_declarations_registry')) || [];
  });

  // Assets tracking persistence
  const [assets, setAssets] = useState(() => {
    return JSON.parse(localStorage.getItem('hr_assets_registry')) || [];
  });

  const [showAssetModal, setShowAssetModal] = useState(false);
  const [assetForm, setAssetForm] = useState({ name: '', serial: '', assignedTo: '' });

  // Performance persistent states
  const [kraData, setKraData] = useState(() => {
    return JSON.parse(localStorage.getItem('hr_performance_kra_dashboard')) || {};
  });
  const [pipLogs, setPipLogs] = useState(() => {
    return JSON.parse(localStorage.getItem('hr_performance_pip_registry')) || [];
  });
  const [showPipModal, setShowPipModal] = useState(false);
  const [pipForm, setPipForm] = useState({ employeeId: '', description: '', startDate: '', endDate: '' });

  // Sync effect hooks
  useEffect(() => {
    localStorage.setItem('assigned_hr_tasks', JSON.stringify(assignedTasks));
  }, [assignedTasks]);

  useEffect(() => {
    localStorage.setItem('hr_employee_profiles_master', JSON.stringify(profilesData));
  }, [profilesData]);

  useEffect(() => {
    localStorage.setItem('hr_employee_salaries_registry', JSON.stringify(salariesData));
  }, [salariesData]);

  useEffect(() => {
    localStorage.setItem('hr_tax_declarations_registry', JSON.stringify(taxDeclarations));
  }, [taxDeclarations]);

  useEffect(() => {
    localStorage.setItem('hr_assets_registry', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('hr_performance_kra_dashboard', JSON.stringify(kraData));
  }, [kraData]);

  useEffect(() => {
    localStorage.setItem('hr_performance_pip_registry', JSON.stringify(pipLogs));
  }, [pipLogs]);

  useEffect(() => {
    localStorage.setItem('scheduled_interviews', JSON.stringify(scheduledInterviews));
  }, [scheduledInterviews]);

  useEffect(() => {
    fetchInitialData();

    const socket = socketService.getSocket();
    const handleUpdate = () => {
      fetchInitialData();
    };

    if (socket) {
      socket.on('attendance_updated', handleUpdate);
    }
    window.addEventListener('attendance_updated', handleUpdate);

    return () => {
      if (socket) socket.off('attendance_updated', handleUpdate);
      window.removeEventListener('attendance_updated', handleUpdate);
    };
  }, []);

  const fetchAttendanceLeaveDetails = async () => {
    try {
      const [settingsRes, balancesRes, logsRes, tasksRes] = await Promise.all([
        leaveApi.getHRSettings().catch(() => null),
        leaveApi.getAllBalances().catch(() => null),
        leaveApi.getAuditLogs().catch(() => null),
        taskApi.getTasks().catch(() => null)
      ]);

      if (settingsRes && settingsRes.success) setHrSettings(settingsRes.data.settings);
      if (balancesRes && balancesRes.success) setLeaveBalances(balancesRes.data.balances || []);
      if (logsRes && logsRes.success) setAuditLogs(logsRes.data.logs || []);
      if (tasksRes && tasksRes.success) setAssignedTasks(tasksRes.data.tasks || []);
    } catch (err) {
      console.error('Error fetching detailed attendance/leave data:', err);
    }
  };

  useEffect(() => {
    const handleTaskUpdated = () => {
      fetchAttendanceLeaveDetails();
    };
    window.addEventListener('task_updated_event', handleTaskUpdated);
    return () => {
      window.removeEventListener('task_updated_event', handleTaskUpdated);
    };
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setPendingLoading(true);
    try {
      const [usersRes, jobsRes, appsRes, leavesRes, attendanceRes, pendingRes] = await Promise.all([
        adminApi.getUsers().catch(() => ({ success: false, data: { users: [] } })),
        careersApi.getAllJobs().catch(() => ({ success: false, data: { jobs: [] } })),
        careersApi.getApplications().catch(() => ({ success: false, data: { applications: [] } })),
        leaveApi.getLeaves().catch(() => ({ success: false, data: [] })),
        attendanceApi.getReport().catch(() => ({ success: false })),
        employeeSignupApi.getPendingEmployees().catch(() => ({ success: false, data: { employees: [] } }))
      ]);

      if (usersRes.success) setEmployees(usersRes.data.users || []);
      if (jobsRes.success) setJobs(jobsRes.data.jobs || []);
      if (appsRes.success) setApplications(appsRes.data.applications || []);
      
      if (leavesRes && leavesRes.success) {
        setLeaves(leavesRes.data?.leaves || []);
      } else if (Array.isArray(leavesRes)) {
        setLeaves(leavesRes);
      } else {
        setLeaves([]);
      }

      if (attendanceRes && attendanceRes.success) {
        setAttendanceReport(attendanceRes.data);
      } else {
        setAttendanceReport({ presentCount: 0, absentCount: 0, lateCount: 0, totalEmployees: 0 });
      }

      if (pendingRes.success) {
        setPendingEmployees(pendingRes.data.employees || []);
      }

      await fetchAttendanceLeaveDetails();
    } catch (error) {
      console.error('Error loading HR data:', error);
      toast.error('Failed to sync corporate catalog records');
    } finally {
      setLoading(false);
      setPendingLoading(false);
    }
  };

  // Profile data getter with mock defaults
  const getEmployeeProfile = (empId) => {
    const defaults = {
      dob: '',
      bloodGroup: '',
      emergencyContact: '',
      currentAddress: '',
      permanentAddress: '',
      doj: '',
      reportingManager: '',
      employmentStatus: 'Probation',
      aadhaarVerified: false,
      panVerified: false,
      degreeVerified: false,
      mobileVerified: false,
      emailVerified: false,
      fullNameOverride: '',
      phoneOverride: '',
      roleOverride: '',
      departmentOverride: '',
      bankName: '',
      bankAccount: '',
      bankIFSC: '',
      aadhaar: '',
      photo: ''
    };
    return { ...defaults, ...(profilesData[empId] || {}) };
  };

  const handleUpdateProfile = (empId, fields) => {
    const updated = {
      ...profilesData,
      [empId]: {
        ...getEmployeeProfile(empId),
        ...fields
      }
    };
    setProfilesData(updated);
    toast.success('Employee profile master data updated! 💾');
  };

  const handlePhotoUpload = (empId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      handleUpdateProfile(empId, { photo: e.target.result });
      toast.success('Profile picture uploaded successfully! 📸');
    };
    reader.readAsDataURL(file);
  };

  // Salary data getter with default scale structure
  const getEmployeeSalary = (empId) => {
    const defaults = { basic: 0, hra: 0, allowance: 0, pf: 0, esi: 0 };
    return { ...defaults, ...(salariesData[empId] || {}) };
  };

  const handleUpdateSalary = (empId, fields) => {
    const updated = {
      ...salariesData,
      [empId]: {
        ...getEmployeeSalary(empId),
        ...fields
      }
    };
    setSalariesData(updated);
    toast.success('Salary structure synchronized!');
  };

  const handleGeneratePayslip = (emp) => {
    const sal = getEmployeeSalary(emp.employeeId);
    const gross = sal.basic + sal.hra + sal.allowance;
    const net = gross - (sal.pf + sal.esi);
    toast.success(`Payslip for ${emp.fullName} for current month generated! Net salary: ₹${net.toLocaleString()}`);
  };

  const handleTaxStatusChange = (taxId, status) => {
    setTaxDeclarations(prev => prev.map(t => t.id === taxId ? { ...t, status } : t));
    toast.success(`Tax declaration claim successfully ${status}`);
  };

  // Assets workflows
  const handleAssignAsset = (e) => {
    e.preventDefault();
    if (!assetForm.name || !assetForm.serial || !assetForm.assignedTo) {
      return toast.error('Please fill in all asset fields');
    }
    const emp = employees.find(e => e.employeeId === assetForm.assignedTo);
    const newAsset = {
      id: `asset_${Date.now()}`,
      name: assetForm.name,
      serial: assetForm.serial,
      assignedTo: assetForm.assignedTo,
      employeeName: emp ? emp.fullName : 'N/A',
      recoveryStatus: 'PENDING'
    };
    setAssets(prev => [...prev, newAsset]);
    setShowAssetModal(false);
    toast.success('Asset serial assigned and registered! 💻');
  };

  const handleToggleAssetRecovery = (assetId, status) => {
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, recoveryStatus: status } : a));
    toast.success(`Asset recovery workflow updated: ${status}`);
  };

  // Performance KRA rating updates
  const getEmployeeKRA = (empId) => {
    const defaults = { targetSales: '', achievement: '', rating: 5, reviewNotes: '' };
    return { ...defaults, ...(kraData[empId] || {}) };
  };

  const handleUpdateKRA = (empId, fields) => {
    const updated = {
      ...kraData,
      [empId]: {
        ...getEmployeeKRA(empId),
        ...fields
      }
    };
    setKraData(updated);
    toast.success('Performance review ratings saved! 🏆');
  };

  const handleAddPip = (e) => {
    e.preventDefault();
    if (!pipForm.employeeId || !pipForm.description || !pipForm.startDate || !pipForm.endDate) {
      return toast.error('Please complete all PIP parameters');
    }
    const emp = employees.find(e => e.employeeId === pipForm.employeeId);
    const newPip = {
      id: `pip_${Date.now()}`,
      employeeId: pipForm.employeeId,
      employeeName: emp ? emp.fullName : 'N/A',
      description: pipForm.description,
      status: 'ACTIVE',
      startDate: pipForm.startDate,
      endDate: pipForm.endDate
    };
    setPipLogs(prev => [...prev, newPip]);
    setShowPipModal(false);
    toast.success(`PIP initiated for ${emp ? emp.fullName : 'Employee'} ⚠️`);
  };

  const handleUpdatePipStatus = (pipId, status) => {
    setPipLogs(prev => prev.map(p => p.id === pipId ? { ...p, status } : p));
    toast.success(`Performance improvement status updated to: ${status}`);
  };

  // Job management
  const handleOpenAddJob = () => {
    setEditingJob(null);
    setJobForm({
      title: '',
      department: '',
      location: '',
      type: 'Full-time',
      experience: '',
      description: '',
      requirements: '',
      isActive: true
    });
    setShowJobModal(true);
  };

  const handleOpenEditJob = (job) => {
    setEditingJob(job);
    setJobForm({
      title: job.title || '',
      department: job.department || '',
      location: job.location || '',
      type: job.type || 'Full-time',
      experience: job.experience || '',
      description: job.description || '',
      requirements: Array.isArray(job.requirements) ? job.requirements.join('\n') : '',
      isActive: job.isActive !== undefined ? job.isActive : true
    });
    setShowJobModal(true);
  };

  const handleJobSubmit = async (e) => {
    e.preventDefault();
    if (!jobForm.title || !jobForm.department || !jobForm.location || !jobForm.experience || !jobForm.description) {
      return toast.error('All fields marked with an asterisk (*) are mandatory');
    }

    const reqs = jobForm.requirements
      .split('\n')
      .map(r => r.trim())
      .filter(r => r.length > 0);

    const payload = { ...jobForm, requirements: reqs };

    try {
      let res;
      if (editingJob) {
        res = await careersApi.updateJob(editingJob._id, payload);
      } else {
        res = await careersApi.createJob(payload);
      }

      if (res && res.success) {
        toast.success(`Vacancy posting ${editingJob ? 'synchronized' : 'created'} successfully! 📂`);
        setShowJobModal(false);
        fetchInitialData();
      }
    } catch (err) {
      console.error(err);
      toast.error('Error occurred while saving job configuration.');
    }
  };

  const handleDeleteJob = async (id) => {
    if (!window.confirm('Delete this vacancy posting permanently?')) return;
    try {
      const res = await careersApi.deleteJob(id);
      if (res && res.success) {
        toast.success('Job posting purged successfully');
        fetchInitialData();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete job posting.');
    }
  };

  // Tasks handlers
  const handleOpenAssignTask = (empId) => {
    setTaskForm({
      title: '',
      description: '',
      assignedTo: empId || '',
      priority: 'MEDIUM',
      dueDate: ''
    });
    setShowTaskModal(true);
  };

  const handleOpenAssignAsset = (empId) => {
    setAssetForm({ name: '', serial: '', assignedTo: empId || '' });
    setShowAssetModal(true);
  };

  const handleOpenAddPip = (empId) => {
    setPipForm({ employeeId: empId || '', description: '', startDate: '', endDate: '' });
    setShowPipModal(true);
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskForm.title || !taskForm.description || !taskForm.assignedTo || !taskForm.dueDate) {
      return toast.error('Please fill in all task fields');
    }

    const assignedEmployee = employees.find(emp => emp.employeeId === taskForm.assignedTo || emp._id === taskForm.assignedTo);
    if (!assignedEmployee) return toast.error('Invalid employee selection');

    try {
      const res = await taskApi.createTask({
        title: taskForm.title,
        description: taskForm.description,
        assignedTo: assignedEmployee._id,
        dueDate: taskForm.dueDate,
        priority: taskForm.priority
      });

      if (res && res.success) {
        toast.success(`Task successfully allocated to ${assignedEmployee.fullName}! 📝`);
        setShowTaskModal(false);
        fetchAttendanceLeaveDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to allocate task');
    }
  };

  const handleCancelTask = async (taskId) => {
    if (!window.confirm('Revoke and delete this assigned task?')) return;
    try {
      const res = await taskApi.deleteTask(taskId);
      if (res && res.success) {
        toast.success('Task assignment revoked');
        fetchAttendanceLeaveDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke task');
    }
  };

  // Interview handlers
  const handleOpenScheduleInterview = (candidate) => {
    setSelectedCandidate(candidate);
    setInterviewForm({
      interviewerId: '',
      date: '',
      time: '',
      notes: ''
    });
    setShowInterviewModal(true);
  };

  const handleViewResume = async (id) => {
    const viewerWindow = window.open('', '_blank');
    try {
      await careersApi.viewResume(id, viewerWindow);
    } catch (error) {
      console.error('Error viewing resume:', error);
      toast.error('Failed to view resume');
      if (viewerWindow && !viewerWindow.closed) viewerWindow.close();
    }
  };

  const handleInterviewSubmit = async (e) => {
    e.preventDefault();
    if (!interviewForm.interviewerId || !interviewForm.date || !interviewForm.time) {
      return toast.error('Please complete all scheduled fields');
    }

    const interviewer = employees.find(emp => emp.employeeId === interviewForm.interviewerId);
    if (!interviewer) return toast.error('Invalid interviewer selected');

    const newInterview = {
      id: `int_${Date.now()}`,
      candidateId: selectedCandidate._id,
      candidateName: selectedCandidate.fullName,
      candidateEmail: selectedCandidate.email,
      position: selectedCandidate.position,
      interviewerId: interviewer.employeeId,
      interviewerName: interviewer.fullName,
      date: interviewForm.date,
      time: interviewForm.time,
      notes: interviewForm.notes,
      status: 'PENDING',
      feedback: '',
      createdAt: new Date().toISOString()
    };

    try {
      const interviewDetails = {
        date: interviewForm.date,
        time: interviewForm.time,
        interviewerName: interviewer.fullName,
        notes: interviewForm.notes
      };

      const res = await careersApi.updateApplicationStatus(selectedCandidate._id, 'REVIEWED', interviewDetails);
      if (res && res.success) {
        setScheduledInterviews(prev => [newInterview, ...prev]);
        toast.success(`Interview scheduled successfully with ${interviewer.fullName} & invitation email sent! 🗓️`);
        setShowInterviewModal(false);
        fetchInitialData();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error scheduling interview');
    }
  };

  const handleCancelInterview = (intId) => {
    if (!window.confirm('Cancel and delete this scheduled interview?')) return;
    setScheduledInterviews(prev => prev.filter(i => i.id !== intId));
    toast.success('Interview appointment cancelled');
  };

  // Job vacancy publishing
  const handleToggleJobActiveFlag = async (job) => {
    try {
      const res = await careersApi.updateJob(job._id, { isActive: !job.isActive });
      if (res && res.success) {
        toast.success(`Vacancy status is now ${!job.isActive ? 'Active' : 'Inactive'}`);
        fetchInitialData();
      }
    } catch (err) {
      console.error(err);
      toast.error('Error toggling vacancy visibility.');
    }
  };

  // Candidate status approvals
  const handleAppStatusChangeOption = async (id, status) => {
    try {
      const res = await careersApi.updateApplicationStatus(id, status);
      if (res && res.success) {
        toast.success(`Candidate state updated to: ${status}`);
        fetchInitialData();
      }
    } catch (err) {
      console.error(err);
      toast.error('Error updating candidate state.');
    }
  };

  // Leave Approvals
  const handleReviewLeaveRequest = async (leaveId, status) => {
    setSelectedLeaveIdForReview(leaveId);
    setReviewRemarks('');
    
    // For approval of normal leaves, do it quickly; else prompt for remarks
    if (status === 'APPROVED') {
      const targetLeave = leaves.find(l => l._id === leaveId);
      if (targetLeave && !targetLeave.isExtraLeave) {
        try {
          const res = await leaveApi.reviewLeave(leaveId, 'APPROVED', 'Approved by HR Manager');
          if (res && res.success) {
            toast.success('Leave request approved!');
            setSelectedLeaveIdForReview(null);
            fetchInitialData();
            fetchAttendanceLeaveDetails();
            return;
          }
        } catch (err) {
          toast.error(err.response?.data?.message || 'Error reviewing leave.');
        }
      }
    }
  };

  const handleReviewLeaveWithRemarks = async (status) => {
    if (!selectedLeaveIdForReview) return;
    try {
      const res = await leaveApi.reviewLeave(selectedLeaveIdForReview, status, reviewRemarks);
      if (res && res.success) {
        toast.success(`Leave request successfully ${status.toLowerCase()}!`);
        setSelectedLeaveIdForReview(null);
        setReviewRemarks('');
        fetchInitialData();
        fetchAttendanceLeaveDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error reviewing leave');
    }
  };

  const handleUpdateHRSettings = async (fields) => {
    try {
      const res = await leaveApi.updateHRSettings({ ...hrSettings, ...fields });
      if (res && res.success) {
        setHrSettings(res.data.settings);
        toast.success('HR settings saved successfully! 💾');
      }
    } catch (err) {
      toast.error('Failed to update HR settings.');
    }
  };

const handleTriggerReset = async () => {
    if (!window.confirm(`Are you sure you want to reset all employee balances for ${resetMonthInput} to 4 paid leaves?`)) return;
    const toastId = toast.loading('Deducting unused leaves & resetting balance...');
    try {
      const res = await leaveApi.triggerMonthlyReset(resetMonthInput);
      if (res && res.success) {
        toast.success(res.message, { id: toastId });
        fetchInitialData();
        fetchAttendanceLeaveDetails();
      }
    } catch (err) {
      toast.error('Reset failed', { id: toastId });
    }
  };

  // Pending employee registration handlers
  const handleApprovePending = async (empId) => {
    try {
      const res = await employeeSignupApi.approvePendingEmployee(empId);
      if (res.success) {
        toast.success('Employee approved and activated successfully!');
        fetchInitialData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve employee');
    }
  };

  const handleRejectPending = async (empId) => {
    const reason = window.prompt('Enter rejection reason (optional):');
    if (reason === null) return; // User cancelled
    
    try {
      const res = await employeeSignupApi.rejectPendingEmployee(empId, reason || 'Not approved by HR');
      if (res.success) {
        toast.success('Employee registration rejected');
        fetchInitialData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject employee');
    }
  };


  // Filters calculations
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.fullName.toLowerCase().includes(searchEmp.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchEmp.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchEmp.toLowerCase());
    const matchesRole = filterEmpRole === 'ALL' || emp.role === filterEmpRole;
    const matchesDept = filterEmpDept === 'ALL' || emp.department === filterEmpDept;
    return matchesSearch && matchesRole && matchesDept;
  });

  const activeEmployeesCount = employees.filter(e => e.isActive).length;
  const activeVacanciesCount = jobs.filter(j => j.isActive).length;
  const pendingAppsCount = applications.filter(a => a.status === 'PENDING').length;
  
  // Department grouping
  const deptCountMap = {};
  employees.forEach(emp => {
    if (emp.isActive) {
      const d = emp.department || 'HQ';
      deptCountMap[d] = (deptCountMap[d] || 0) + 1;
    }
  });

  const stats = [
    { title: 'Active Employees', value: activeEmployeesCount, icon: FiUsers, tone: 'ink' },
    { title: 'Open Vacancies', value: activeVacanciesCount, icon: FiBriefcase, tone: 'accent' },
    { title: 'Pending Applications', value: pendingAppsCount, icon: FiFileText, tone: 'warning' },
    { title: 'Attendance Today', value: attendanceReport?.stats ? `${Math.round((attendanceReport.stats.presentCount / Math.max(attendanceReport.stats.totalEmployees, 1)) * 100)}%` : '0%', icon: FiCheckCircle, tone: 'positive' }
  ];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="w-full h-full flex flex-col overflow-hidden"
    >
      {/* Page Header Content Row */}
      <motion.div variants={blockVariants} className="flex-shrink-0 w-full border-b py-4 flex flex-col md:flex-row md:items-end justify-between gap-3" style={{ borderColor: 'var(--crm-line)' }}>
        <div className="space-y-0.5 text-left">
          <span className="text-[9px] uppercase tracking-[0.25em] font-bold block" style={LABEL_MONO}>ERP Control Center</span>
          <h1 className="text-xl sm:text-2xl font-normal tracking-tight uppercase" style={HEADING}>HR Manager Dashboard</h1>
          <p className="text-[10px] text-[var(--crm-ink-faint)] font-light max-w-2xl hidden sm:block">
            Integrated directory, leaves administration, biometric attendance sync, recruitment pipelines, payroll management, and appraisal modules.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto flex-shrink-0">
          <Link
            to="/crm/hr/executive"
            className="text-[9px] border px-2.5 py-1 uppercase tracking-wide whitespace-nowrap rounded-sm transition-all cursor-pointer hover:bg-[var(--crm-bg-raised)]/80 text-[var(--crm-accent)] hover:text-white"
            style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)' }}
          >
            Executive View
          </Link>
          <button
            onClick={handleOpenAssignTask}
            className="text-[9px] border px-2.5 py-1 uppercase tracking-wide whitespace-nowrap rounded-sm transition-all cursor-pointer hover:bg-[var(--crm-bg-raised)]/80"
            style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)' }}
          >
            Allocate Task
          </button>
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="text-[9px] border px-2.5 py-1 uppercase tracking-wide whitespace-nowrap rounded-sm select-none"
            style={{ ...LABEL_MONO, background: 'var(--crm-bg-raised)' }}
          >
            Level // Manager Access
          </motion.div>
        </div>
      </motion.div>

      {/* Primary Tab Navigation */}
      <motion.div variants={blockVariants} className="flex-shrink-0 border-b border-[var(--crm-line)] flex overflow-x-auto scrollbar-none w-full mt-3">
        <nav className="flex space-x-4 min-w-max">
          {[
            { id: 'overview', label: 'Overview', icon: FiList },
            { id: 'directory', label: 'Employees', icon: FiUsers },
            { id: 'pending_registrations', label: 'Pending Registrations', icon: FiUserPlus },
            { id: 'attendance_leave', label: 'Attendance & Leave', icon: FiCalendar },
            { id: 'recruitment', label: 'Recruitment', icon: FiBriefcase },
            { id: 'payroll_assets', label: 'Payroll & Assets', icon: FiDollarSign },
            { id: 'performance', label: 'Performance', icon: FiAward },
            { id: 'task_delegation', label: 'Tasks', icon: FiCheckSquare }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-0.5 border-b-2 text-[10px] uppercase tracking-widest font-mono font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-[var(--crm-accent)] text-[var(--crm-heading)]'
                  : 'border-transparent text-[var(--crm-ink-faint)] hover:text-[var(--crm-ink-soft)]'
              }`}
            >
              <tab.icon size={12} className={activeTab === tab.id ? 'text-[var(--crm-accent)]' : 'text-inherit'} />
              {tab.label}
            </button>
          ))}
        </nav>
      </motion.div>

      {/* Active tab content container - This is the key fix for overflow */}
      <div className="flex-1 overflow-hidden pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="h-full overflow-y-auto pr-1 custom-scrollbar"
          >
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-4 pb-4">
                {loading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[1,2,3,4].map(i => <SkeletonStatCard key={i} />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {stats.map((stat, i) => (
                      <motion.div
                        key={i}
                        variants={blockVariants}
                        whileHover={{ y: -2 }}
                        className="border p-4 transition-all duration-300 rounded-sm flex flex-col justify-between"
                        style={CARD}
                      >
                        <div className="flex items-start justify-between gap-2 text-left">
                          <span className="text-[8px] uppercase tracking-widest font-bold" style={LABEL_MONO}>{stat.title}</span>
                          <div
                            className="p-1.5 border rounded-sm transition-transform duration-300"
                            style={{ borderColor: 'var(--crm-line)', color: stat.tone === 'ink' ? 'var(--crm-heading)' : `var(--crm-${stat.tone})`, background: stat.tone === 'ink' ? 'var(--crm-bg-sunken)' : `var(--crm-${stat.tone}-bg)` }}
                          >
                            <stat.icon size={12} />
                          </div>
                        </div>
                        <div className="flex items-end justify-between mt-2 text-left">
                          <span className="text-xl font-light tracking-tight whitespace-nowrap" style={{ fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' }}>{stat.value}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Department headcount summary */}
                  <div className="border p-4 rounded-sm w-full overflow-hidden text-left" style={CARD}>
                    <h3 className="text-[10px] uppercase tracking-widest mb-3 font-bold border-b pb-1.5" style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)' }}>Departmental Headcount Breakdown</h3>
                    {loading ? (
                      <div className="space-y-2.5">
                        {[1,2,3,4].map(i => <SkeletonDepartmentBar key={i} />)}
                      </div>
                    ) : Object.keys(deptCountMap).length === 0 ? (
                      <div className="py-6 text-center text-xs text-[var(--crm-ink-faint)] font-mono">No department data yet</div>
                    ) : (
                      <div className="space-y-2.5">
                        {Object.entries(deptCountMap).map(([dept, count]) => {
                          const pct = Math.round((count / Math.max(activeEmployeesCount, 1)) * 100);
                          return (
                            <div key={dept} className="space-y-0.5 text-xs">
                              <div className="flex justify-between font-mono font-semibold">
                                <span className="uppercase text-[var(--crm-heading)] text-[10px]">{dept}</span>
                                <span className="text-[9px]" style={{ fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-ink-faint)' }}>{count} Employees ({pct}%)</span>
                              </div>
                              <div className="w-full h-1 bg-[var(--crm-bg-sunken)] rounded-full overflow-hidden border border-[var(--crm-line)]">
                                <div className="h-full bg-[var(--crm-accent)]" style={{ width: `${pct}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Live attendance telemetry metrics */}
                  <div className="border p-4 rounded-sm w-full overflow-hidden text-left" style={CARD}>
                    <h3 className="text-[10px] uppercase tracking-widest mb-3 font-bold border-b pb-1.5" style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)' }}>Daily Biometric Telemetry Status</h3>
                    {loading ? (
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {[1,2,3].map(i => <SkeletonAttendanceStat key={i} />)}
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-2 border rounded-sm text-center" style={CARD_SUNKEN}>
                            <span className="text-[7px] font-mono font-bold text-[var(--crm-ink-faint)] uppercase block">Present Today</span>
                            <strong className="text-lg text-[var(--crm-positive)] font-serif block" style={{ fontFamily: 'var(--crm-font-display)' }}>{attendanceReport?.stats?.presentCount || 0}</strong>
                          </div>
                          <div className="p-2 border rounded-sm text-center" style={CARD_SUNKEN}>
                            <span className="text-[7px] font-mono font-bold text-[var(--crm-ink-faint)] uppercase block">Late Arrivals</span>
                            <strong className="text-lg text-[var(--crm-warning)] font-serif block" style={{ fontFamily: 'var(--crm-font-display)' }}>{attendanceReport?.stats?.lateCount || 0}</strong>
                          </div>
                          <div className="p-2 border rounded-sm text-center" style={CARD_SUNKEN}>
                            <span className="text-[7px] font-mono font-bold text-[var(--crm-ink-faint)] uppercase block">Absent Count</span>
                            <strong className="text-lg text-[var(--crm-danger)] font-serif block" style={{ fontFamily: 'var(--crm-font-display)' }}>{attendanceReport?.stats?.absentCount || 0}</strong>
                          </div>
                        </div>
                        <div className="space-y-1.5 pt-3 border-t border-[var(--crm-line)] text-[9px] font-mono mt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--crm-ink-faint)]">Additions This Month:</span>
                            <strong className="text-[var(--crm-positive)]">+4 Joiners</strong>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--crm-ink-faint)]">Resignations:</span>
                            <strong className="text-[var(--crm-danger)]">-1 Exit</strong>
                          </div>
                          <div className="flex justify-between items-center border p-1.5 rounded-sm" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' }}>
                            <span className="text-[var(--crm-ink-faint)]">Target Monthly Attrition Rate:</span>
                            <strong className="text-[var(--crm-accent)]">1.6% (Stable)</strong>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PENDING REGISTRATIONS */}
            {activeTab === 'pending_registrations' && (
              <div className="space-y-4 pb-4">
                <div className="border p-3 rounded-sm flex flex-col sm:flex-row gap-3 items-center justify-between" style={{ ...CARD, background: 'var(--crm-bg-raised)' }}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-sm bg-[var(--crm-warning-bg)] text-[var(--crm-warning)]">
                      <FiAlertCircle size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--crm-heading)] uppercase tracking-wide">Pending Employee Registrations</h3>
                      <p className="text-[10px] text-[var(--crm-ink-faint)] font-light">
                        {pendingEmployees.length} request{pendingEmployees.length !== 1 ? 's' : ''} awaiting verification
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={fetchInitialData}
                    disabled={pendingLoading}
                    className="text-[9px] border px-3 py-1.5 uppercase tracking-wide whitespace-nowrap rounded-sm transition-all cursor-pointer"
                    style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)' }}
                  >
                    {pendingLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>

                {pendingEmployees.length === 0 ? (
                  <div className="border p-8 rounded-sm text-center" style={CARD}>
                    <div className="p-3 rounded-full w-fit mx-auto mb-3 bg-[var(--crm-bg-sunken)]">
                      <FiCheckCircle className="text-[var(--crm-positive)]" size={32} />
                    </div>
                    <h4 className="text-lg font-medium text-[var(--crm-heading)] mb-1">No Pending Registrations</h4>
                    <p className="text-xs text-[var(--crm-ink-faint)] font-light">
                      All employee registration requests have been reviewed.
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-sm overflow-hidden" style={CARD}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[var(--crm-bg-sunken)] border-b text-[var(--crm-ink-faint)] uppercase tracking-widest font-bold" style={{ borderColor: 'var(--crm-line)' }}>
                            <th className="p-3">Employee ID</th>
                            <th className="p-3">Name</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Department</th>
                            <th className="p-3">Position</th>
                            <th className="p-3">Phone</th>
                            <th className="p-3">Requested On</th>
                            <th className="p-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingEmployees.map((emp) => (
                            <tr key={emp._id} className="border-b hover:bg-[var(--crm-bg-sunken)]/50" style={{ borderColor: 'var(--crm-line)' }}>
                              <td className="p-3 font-mono text-[9px] font-bold text-[var(--crm-accent)]">{emp.employeeId}</td>
                              <td className="p-3 text-[var(--crm-heading)] font-medium">{emp.name}</td>
                              <td className="p-3 text-[var(--crm-ink-soft)]">{emp.email}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 text-[8px] font-mono rounded-sm bg-[var(--crm-bg)] border border-[var(--crm-line)]">{emp.department}</span>
                              </td>
                              <td className="p-3 text-[var(--crm-ink-soft)]">{emp.position}</td>
                              <td className="p-3 font-mono text-[9px]">{emp.phone || '—'}</td>
                              <td className="p-3 text-[var(--crm-ink-faint)] font-mono text-[9px]">
                                {emp.createdAt ? new Date(emp.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleApprovePending(emp._id)}
                                    className="px-2.5 py-1 text-[9px] font-bold uppercase rounded-sm bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border border-[var(--crm-positive)] hover:bg-[var(--crm-positive)] hover:text-white transition-all"
                                    title="Approve & Activate"
                                  >
                                    <FiCheckCircle size={11} className="inline-block mr-1" /> Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectPending(emp._id)}
                                    className="px-2.5 py-1 text-[9px] font-bold uppercase rounded-sm bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border border-[var(--crm-danger)] hover:bg-[var(--crm-danger)] hover:text-white transition-all"
                                    title="Reject"
                                  >
                                    <FiXCircle size={11} className="inline-block mr-1" /> Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: EMPLOYEE DIRECTORY */}
            {activeTab === 'directory' && (
              <div className="space-y-4 pb-4">
                <div className="border p-3 rounded-sm flex flex-col sm:flex-row gap-3 items-center" style={{ ...CARD, background: 'var(--crm-bg-raised)' }}>
                  <div className="flex-1 w-full relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--crm-ink-faint)]" size={13} />
                    <input
                      type="text"
                      placeholder="Search employees..."
                      value={searchEmp}
                      onChange={(e) => setSearchEmp(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] text-xs rounded-sm outline-none text-[var(--crm-heading)] focus:border-[var(--crm-accent)]/55"
                    />
                  </div>
                  <div className="w-full sm:w-40 flex items-center gap-1.5">
                    <FiFilter className="text-[var(--crm-ink-faint)] shrink-0" size={12} />
                    <select
                      value={filterEmpRole}
                      onChange={(e) => setFilterEmpRole(e.target.value)}
                      className="w-full px-2 py-1.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[10px] rounded-sm text-[var(--crm-heading)] cursor-pointer outline-none"
                    >
                      <option value="ALL">All Roles</option>
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Manager</option>
                      <option value="HR">HR</option>
                      <option value="SALES">Sales</option>
                      <option value="IT">IT</option>
                    </select>
                  </div>
                  <div className="w-full sm:w-40 flex items-center gap-1.5">
                    <FiFilter className="text-[var(--crm-ink-faint)] shrink-0" size={12} />
                    <select
                      value={filterEmpDept}
                      onChange={(e) => setFilterEmpDept(e.target.value)}
                      className="w-full px-2 py-1.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[10px] rounded-sm text-[var(--crm-heading)] cursor-pointer outline-none"
                    >
                      <option value="ALL">All Depts</option>
                      {Object.keys(deptCountMap).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Grid/List Toggle Group */}
                  <div className="flex items-center border border-[var(--crm-line)] rounded-sm overflow-hidden shrink-0 self-stretch sm:self-auto">
                    <button
                      onClick={() => { setViewMode('grid'); setExpandedEmpId(null); }}
                      className={`px-3 py-1.5 flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase transition-all cursor-pointer ${
                        viewMode === 'grid' ? 'bg-[var(--crm-accent)] text-[var(--crm-bg-sunken)]' : 'bg-transparent text-[var(--crm-ink-faint)] hover:text-white'
                      }`}
                    >
                      <FiGrid size={12} />
                      Grid
                    </button>
                    <button
                      onClick={() => { setViewMode('list'); setExpandedEmpId(null); }}
                      className={`px-3 py-1.5 flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase transition-all cursor-pointer ${
                        viewMode === 'list' ? 'bg-[var(--crm-accent)] text-[var(--crm-bg-sunken)]' : 'bg-transparent text-[var(--crm-ink-faint)] hover:text-white'
                      }`}
                    >
                      <FiList size={12} />
                      List
                    </button>
                  </div>
                </div>

                {loading ? (
                  viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                      {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="border rounded-sm overflow-hidden flex flex-col" style={CARD}>
                          <div className="h-48 w-full crm-skeleton" style={{ background: 'var(--crm-bg-sunken)' }} />
                          <div className="p-4 flex-1 space-y-3">
                            <div className="crm-skeleton h-4 w-32 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
                            <div className="crm-skeleton h-3 w-48 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
                            <div className="flex gap-2 pt-2">
                              <div className="crm-skeleton h-6 w-16 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
                              <div className="crm-skeleton h-6 w-16 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
                            </div>
                            <div className="flex gap-2 pt-4 border-t border-[var(--crm-line)]">
                              <div className="crm-skeleton h-7 flex-1 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
                              <div className="crm-skeleton h-7 flex-1 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
                              <div className="crm-skeleton h-7 w-8 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[1,2,3].map(i => (
                        <div key={i} className="border p-4 rounded-sm" style={CARD}>
                          <div className="flex items-center gap-3">
                            <div className="crm-skeleton w-8 h-8 rounded-full" style={{ background: 'var(--crm-bg-sunken)' }} />
                            <div className="flex-1">
                              <div className="crm-skeleton h-3.5 w-32 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
                              <div className="crm-skeleton h-2.5 w-48 rounded-sm mt-1" style={{ background: 'var(--crm-bg-sunken)' }} />
                            </div>
                            <div className="flex gap-2">
                              <div className="crm-skeleton h-5 w-14 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
                              <div className="crm-skeleton h-5 w-14 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="max-h-[calc(100vh-320px)] overflow-y-auto pr-1 custom-scrollbar">
                    {filteredEmployees.length === 0 ? (
                      <div className="border p-8 rounded-sm text-center" style={CARD}>
                        <div className="text-xs text-[var(--crm-ink-faint)] font-mono">No employees found</div>
                      </div>
                    ) : viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                        {filteredEmployees.map(emp => {
                          const profile = getEmployeeProfile(emp.employeeId);
                          const displayName = profile.fullNameOverride || emp.fullName;
                          const displayPhone = profile.phoneOverride || emp.phone || 'N/A';
                          const displayRole = profile.roleOverride || emp.role;
                          const displayDept = profile.departmentOverride || emp.department || 'HQ';
                          const displayStatus = profile.employmentStatus || 'Probation';
                          const photo = getEmployeePhoto(emp.employeeId, displayName, profilesData);
                          const lastActive = emp.lastActiveAt ? new Date(emp.lastActiveAt) : null;
                          const isOnline = emp.isOnline && lastActive && (new Date() - lastActive < 5 * 60 * 1000);
                          return (
                            <div
                              key={emp._id}
                              className="border rounded-sm overflow-hidden flex flex-col relative group transition-all duration-300 hover:border-[var(--crm-accent)]/40 hover:shadow-lg"
                              style={CARD}
                            >
                              {/* Portrait Image Header */}
                              <div className="h-48 w-full overflow-hidden relative bg-[var(--crm-bg-sunken)] border-b border-[var(--crm-line)]">
                                <img
                                  src={photo}
                                  alt={displayName}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                                {/* Fallback Initial Avatar */}
                                <div className="absolute inset-0 hidden flex-col items-center justify-center bg-[var(--crm-bg-sunken)] text-[var(--crm-accent)] font-serif font-bold text-3xl">
                                  {displayName.split(' ').map(n => n[0]).join('')}
                                </div>
                                
                                {/* Top badges on the image */}
                                <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                                  <span className="text-[7px] font-mono font-bold tracking-widest bg-black/75 px-1.5 py-0.5 border border-[var(--crm-line)]/50 text-[var(--crm-accent)] uppercase rounded-sm">
                                    {emp.employeeId}
                                  </span>
                                  <span className={`text-[7px] font-mono font-bold tracking-widest bg-black/75 px-1.5 py-0.5 border rounded-sm uppercase ${
                                    displayStatus === 'Notice Period' || displayStatus === 'Temporary'
                                      ? 'text-[var(--crm-danger)] border-[var(--crm-danger)]/50' 
                                      : displayStatus === 'Probation' 
                                      ? 'text-[var(--crm-warning)] border-[var(--crm-warning)]/50' 
                                      : 'text-[var(--crm-positive)] border-[var(--crm-positive)]/50'
                                  }`}>
                                    {displayStatus}
                                  </span>
                                </div>
                              </div>

                              {/* Card Content */}
                              <div className="p-4 flex-1 flex flex-col justify-between text-left">
                                <div className="space-y-1">
                                  <h4 className="font-serif text-xs font-semibold text-[var(--crm-heading)] truncate">
                                    {displayName}
                                  </h4>
                                  <p className="text-[9px] text-[var(--crm-ink-faint)] font-mono truncate">{emp.email}</p>
                                  <p className="text-[9px] text-[var(--crm-ink-faint)] font-mono truncate">Phone: {displayPhone}</p>
                                  
                                  {/* Login Status */}
                                  <div className="flex items-center gap-1.5 pt-1 text-[9px] font-mono">
                                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[var(--crm-positive)] animate-pulse' : 'bg-rose-500/50'}`} />
                                    <span className={isOnline ? 'text-[var(--crm-positive)] font-bold' : 'text-[var(--crm-ink-faint)]'}>
                                      {isOnline ? 'ONLINE' : 'OFFLINE'}
                                    </span>
                                    {emp.lastLoginAt && (
                                      <span className="text-[8px] text-[var(--crm-ink-faint)] ml-auto" title={`Last Active: ${emp.lastActiveAt ? new Date(emp.lastActiveAt).toLocaleString() : 'N/A'}`}>
                                        Login: {new Date(emp.lastLoginAt).toLocaleDateString()} {new Date(emp.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-1.5 pt-2">
                                    <span className="text-[8px] font-mono font-bold uppercase tracking-wider bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-2 py-0.5 rounded-sm">
                                      {displayRole}
                                    </span>
                                    <span className="text-[8px] font-mono font-bold uppercase tracking-wider bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-2 py-0.5 rounded-sm">
                                      {displayDept}
                                    </span>
                                  </div>
                                </div>

                                {/* Action Buttons Row */}
                                <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-[var(--crm-line)] relative">
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(emp.email);
                                      toast.success(`Copied email for ${emp.fullName} to clipboard!`);
                                      window.location.href = `mailto:${emp.email}`;
                                    }}
                                    className="flex-1 py-1.5 flex items-center justify-center gap-1 text-[8px] font-mono font-bold uppercase border border-[var(--crm-accent)] bg-[var(--crm-accent-bg)] text-[var(--crm-accent)] rounded-sm hover:bg-[var(--crm-accent)] hover:text-[var(--crm-bg-sunken)] transition-all cursor-pointer"
                                  >
                                    <FiMessageSquare size={11} />
                                    Message
                                  </button>
                                  
                                  <button
                                    onClick={() => setExpandedEmpId(emp._id)}
                                    className="flex-1 py-1.5 flex items-center justify-center gap-1 text-[8px] font-mono font-bold uppercase border border-[var(--crm-line)] bg-transparent text-[var(--crm-heading)] rounded-sm hover:border-[var(--crm-heading)] transition-all cursor-pointer"
                                  >
                                    <FiEye size={11} />
                                    Details
                                  </button>

                                  <div className="relative">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveDropdownEmpId(activeDropdownEmpId === emp._id ? null : emp._id);
                                      }}
                                      className="p-1.5 border border-[var(--crm-line)] rounded-sm hover:border-[var(--crm-heading)] transition-all cursor-pointer text-[var(--crm-ink-soft)] hover:text-white"
                                    >
                                      <FiMoreHorizontal size={11} />
                                    </button>

                                    {/* Action Dropdown Menu */}
                                    {activeDropdownEmpId === emp._id && (
                                      <>
                                        <div 
                                          className="fixed inset-0 z-45" 
                                          onClick={() => setActiveDropdownEmpId(null)}
                                        />
                                        <div className="absolute right-0 bottom-full mb-1.5 w-44 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] shadow-2xl rounded-sm p-1 z-50 text-[9px] font-mono font-bold uppercase text-left space-y-0.5">
                                          <Link
                                            to={`/crm/employees/${emp._id}`}
                                            className="w-full text-left px-2 py-1.5 hover:bg-[var(--crm-bg)] hover:text-[var(--crm-accent)] rounded-sm transition cursor-pointer flex items-center gap-1.5 text-white decoration-none"
                                          >
                                            <FiUser size={10} className="text-[var(--crm-accent)]" />
                                            View Profile & Payslips
                                          </Link>
                                          <button
                                            onClick={() => {
                                              setActiveDropdownEmpId(null);
                                              handleOpenAssignTask(emp.employeeId);
                                            }}
                                            className="w-full text-left px-2 py-1.5 hover:bg-[var(--crm-bg)] hover:text-[var(--crm-accent)] rounded-sm transition cursor-pointer flex items-center gap-1.5 text-white"
                                          >
                                            <FiCheckSquare size={10} />
                                            Assign Task
                                          </button>
                                          <button
                                            onClick={() => {
                                              setActiveDropdownEmpId(null);
                                              handleOpenAssignAsset(emp.employeeId);
                                            }}
                                            className="w-full text-left px-2 py-1.5 hover:bg-[var(--crm-bg)] hover:text-[var(--crm-accent)] rounded-sm transition cursor-pointer flex items-center gap-1.5 text-white"
                                          >
                                            <FiHardDrive size={10} />
                                            Assign Asset
                                          </button>
                                          <button
                                            onClick={() => {
                                              setActiveDropdownEmpId(null);
                                              handleOpenAddPip(emp.employeeId);
                                            }}
                                            className="w-full text-left px-2 py-1.5 hover:bg-[var(--crm-bg)] hover:text-[var(--crm-danger)] rounded-sm transition cursor-pointer flex items-center gap-1.5 text-[var(--crm-danger)]"
                                          >
                                            <FiAlertCircle size={10} />
                                            Initiate PIP
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredEmployees.map(emp => {
                          const isExpanded = expandedEmpId === emp._id;
                          const profile = getEmployeeProfile(emp.employeeId);
                          const displayName = profile.fullNameOverride || emp.fullName;
                          const displayPhone = profile.phoneOverride || emp.phone || 'N/A';
                          const displayRole = profile.roleOverride || emp.role;
                          const displayDept = profile.departmentOverride || emp.department || 'HQ';
                          const displayStatus = profile.employmentStatus || 'Probation';
                          const photo = getEmployeePhoto(emp.employeeId, displayName, profilesData);
                          const lastActive = emp.lastActiveAt ? new Date(emp.lastActiveAt) : null;
                          const isOnline = emp.isOnline && lastActive && (new Date() - lastActive < 5 * 60 * 1000);
                          return (
                            <div
                              key={emp._id}
                              className="border rounded-sm p-4 transition-all duration-300"
                              style={CARD}
                            >
                              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full overflow-hidden border border-[var(--crm-line)] flex items-center justify-center shrink-0 bg-[var(--crm-bg-sunken)]">
                                    <img src={photo} alt={displayName} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="text-left">
                                    <h4 className="font-serif text-xs font-semibold text-[var(--crm-heading)] flex flex-wrap items-center gap-1.5">
                                      <span>{displayName}</span>
                                      <span className="text-[8px] font-mono font-bold tracking-widest bg-[var(--crm-bg-raised)] px-1.5 py-0.5 border border-[var(--crm-line)] text-[var(--crm-accent)] uppercase rounded-sm">
                                        {emp.employeeId}
                                      </span>
                                    </h4>
                                    <p className="text-[9px] text-[var(--crm-ink-faint)] font-mono">{emp.email} • {displayPhone}</p>
                                    
                                    {/* Login Status */}
                                    <div className="flex items-center gap-1.5 mt-0.5 text-[8px] font-mono uppercase">
                                      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[var(--crm-positive)] animate-pulse' : 'bg-rose-500/50'}`} />
                                      <span className={isOnline ? 'text-[var(--crm-positive)] font-bold' : 'text-[var(--crm-ink-faint)]'}>
                                        {isOnline ? 'Online' : 'Offline'}
                                      </span>
                                      {emp.lastLoginAt && (
                                        <span className="text-[8px] text-[var(--crm-ink-faint)]">
                                          • Last Login: {new Date(emp.lastLoginAt).toLocaleString()}
                                        </span>
                                      )}
                                      {emp.lastActiveAt && (
                                        <span className="text-[8px] text-[var(--crm-ink-faint)]" title={`Last Active: ${new Date(emp.lastActiveAt).toLocaleString()}`}>
                                          • Active: {new Date(emp.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto font-mono text-[8px] font-bold">
                                  <span className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-2 py-0.5 rounded-sm">
                                    {displayRole}
                                  </span>
                                  <span className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-2 py-0.5 rounded-sm uppercase">
                                    {displayDept}
                                  </span>
                                  <Link
                                    to={`/crm/employees/${emp._id}`}
                                    className="bg-teal-950/60 text-teal-400 border border-teal-800/40 px-2 py-0.5 rounded-sm uppercase tracking-wider hover:bg-teal-900 transition duration-150 cursor-pointer text-[8px] flex items-center gap-1 decoration-none font-bold"
                                  >
                                    <FiUser size={10} /> Profile / Payslips
                                  </Link>
                                  <button
                                    onClick={() => setExpandedEmpId(isExpanded ? null : emp._id)}
                                    className="bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] px-2 py-0.5 rounded-sm uppercase tracking-wider hover:bg-[var(--crm-ink-soft)] transition duration-150 cursor-pointer text-[8px]"
                                  >
                                    {isExpanded ? 'Collapse' : 'Expand'}
                                  </button>
                                </div>
                              </div>

                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden mt-3 pt-3 border-t border-[var(--crm-line)] grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px] text-left font-sans"
                                  >
                                    <div className="space-y-1.5">
                                      <h5 className="text-[9px] font-mono font-bold text-[var(--crm-accent)] uppercase tracking-wider border-b border-[var(--crm-line)] pb-0.5 flex items-center gap-1"><FiUser size={11} /> Personal</h5>
                                      <div className="space-y-1">
                                        <div className="flex justify-between">
                                          <span className="text-[var(--crm-ink-faint)]">DOB:</span>
                                          <input type="date" value={profile.dob} onChange={(e) => handleUpdateProfile(emp.employeeId, { dob: e.target.value })} className="bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-1.5 py-0.5 rounded-sm w-28 text-[10px]" />
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-[var(--crm-ink-faint)]">Blood Group:</span>
                                          <input type="text" value={profile.bloodGroup} onChange={(e) => handleUpdateProfile(emp.employeeId, { bloodGroup: e.target.value })} className="bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-1.5 py-0.5 rounded-sm w-20 text-center text-[10px]" />
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-[var(--crm-ink-faint)]">Emergency:</span>
                                          <input type="text" value={profile.emergencyContact} onChange={(e) => handleUpdateProfile(emp.employeeId, { emergencyContact: e.target.value })} className="bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-1.5 py-0.5 rounded-sm w-28 text-right text-[10px]" />
                                        </div>
                                      </div>
                                    </div>
                                    <div className="space-y-1.5">
                                      <h5 className="text-[9px] font-mono font-bold text-[var(--crm-accent)] uppercase tracking-wider border-b border-[var(--crm-line)] pb-0.5 flex items-center gap-1"><FiBriefcase size={11} /> Professional</h5>
                                      <div className="space-y-1">
                                        <div className="flex justify-between">
                                          <span className="text-[var(--crm-ink-faint)]">DOJ:</span>
                                          <input type="date" value={profile.doj} onChange={(e) => handleUpdateProfile(emp.employeeId, { doj: e.target.value })} className="bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-1.5 py-0.5 rounded-sm w-28 text-[10px]" />
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-[var(--crm-ink-faint)]">Manager:</span>
                                          <input type="text" value={profile.reportingManager} onChange={(e) => handleUpdateProfile(emp.employeeId, { reportingManager: e.target.value })} className="bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-1.5 py-0.5 rounded-sm w-28 text-right text-[10px]" />
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-[var(--crm-ink-faint)]">Status:</span>
                                          <select value={profile.employmentStatus} onChange={(e) => handleUpdateProfile(emp.employeeId, { employmentStatus: e.target.value })} className="bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-1.5 py-0.5 rounded-sm w-28 text-[10px]">
                                            <option value="Probation">Probation</option>
                                            <option value="Permanent">Permanent</option>
                                            <option value="Notice Period">Notice Period</option>
                                          </select>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="space-y-1.5">
                                      <h5 className="text-[9px] font-mono font-bold text-[var(--crm-accent)] uppercase tracking-wider border-b border-[var(--crm-line)] pb-0.5 flex items-center gap-1"><FiShield size={11} /> Documents</h5>
                                      <div className="space-y-1">
                                        {[
                                          { label: "PAN", key: "panVerified", val: profile.panVerified },
                                          { label: "Aadhaar", key: "aadhaarVerified", val: profile.aadhaarVerified },
                                          { label: "Degree", key: "degreeVerified", val: profile.degreeVerified }
                                        ].map((doc) => (
                                          <div key={doc.key} className="flex justify-between items-center">
                                            <span className="text-[var(--crm-ink-soft)]">{doc.label}</span>
                                            <button
                                              onClick={() => handleUpdateProfile(emp.employeeId, { [doc.key]: !doc.val })}
                                              className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded-sm border transition-all ${
                                                doc.val ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/25' : 'bg-transparent text-[var(--crm-ink-faint)] border-[var(--crm-line)] hover:border-[var(--crm-accent)]'
                                              }`}
                                            >
                                              {doc.val ? 'Verified' : 'Verify'}
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Employee Details Modal (Grid View only) */}
                {viewMode === 'grid' && expandedEmpId && (() => {
                  const emp = employees.find(e => e._id === expandedEmpId);
                  if (!emp) return null;
                  const profile = getEmployeeProfile(emp.employeeId);
                  const displayName = profile.fullNameOverride || emp.fullName;
                  const photo = getEmployeePhoto(emp.employeeId, displayName, profilesData);
                  return (
                    <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
                      <div className="bg-[var(--crm-bg-raised)] rounded-sm w-full max-w-3xl border border-[var(--crm-line)] shadow-2xl overflow-hidden flex flex-col text-left">
                        {/* Modal Header */}
                        <div className="relative border-b border-[var(--crm-line)] p-6 bg-[var(--crm-bg-sunken)]/40 flex items-start gap-4">
                          <div className="w-16 h-16 rounded-full overflow-hidden border border-[var(--crm-line)] shrink-0 bg-[var(--crm-bg-sunken)]">
                            <img src={photo} alt={displayName} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <span className="text-[8px] font-mono font-bold tracking-widest bg-[var(--crm-accent-bg)] px-2 py-0.5 border border-[var(--crm-accent)]/20 text-[var(--crm-accent)] uppercase rounded-sm inline-block">
                              {emp.employeeId}
                            </span>
                            <div className="flex flex-wrap items-center gap-3">
                              <h2 className="font-serif text-lg text-[var(--crm-heading)] leading-none">{displayName}</h2>
                              <Link
                                to={`/crm/employees/${emp._id}`}
                                className="px-2.5 py-1 bg-teal-950/60 hover:bg-teal-900 border border-teal-800/40 text-teal-400 text-[8px] font-mono font-bold uppercase rounded-sm transition flex items-center gap-1 decoration-none"
                              >
                                <FiUser size={10} /> Manage Profile & Payslips
                              </Link>
                            </div>
                            <p className="text-[10px] text-[var(--crm-ink-faint)] font-mono">{emp.email}</p>
                          </div>
                          <button
                            onClick={() => setExpandedEmpId(null)}
                            className="text-[var(--crm-ink-faint)] hover:text-white font-bold text-sm bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] w-7 h-7 flex items-center justify-center rounded-sm transition cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)] space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[11px] font-sans">
                            
                            {/* Personal / Identification Column */}
                            <div className="space-y-3">
                              <h5 className="text-[9px] font-mono font-bold text-[var(--crm-accent)] uppercase tracking-wider border-b border-[var(--crm-line)] pb-1 flex items-center gap-1.5">
                                <FiUser size={12} className="text-[var(--crm-accent)]" /> Personal & Photo
                              </h5>
                              <div className="space-y-2">
                                <div className="flex flex-col gap-1.5 items-center pb-3 border-b border-[var(--crm-line)]">
                                  <div className="w-20 h-20 rounded-full overflow-hidden border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] relative group">
                                    <img src={photo} alt="Avatar" className="w-full h-full object-cover" />
                                  </div>
                                  <label className="text-[8px] font-mono font-bold uppercase tracking-wider bg-[var(--crm-accent-bg)] border border-[var(--crm-accent)] text-[var(--crm-accent)] px-2.5 py-1 rounded-sm cursor-pointer hover:bg-[var(--crm-accent)] hover:text-[var(--crm-bg-sunken)] transition-all text-center">
                                    Change Photo
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => handlePhotoUpload(emp.employeeId, e.target.files[0])}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-[9px] uppercase tracking-wider font-mono text-[var(--crm-ink-faint)]">Employee Name *</span>
                                  <input
                                    type="text"
                                    value={profile.fullNameOverride !== undefined && profile.fullNameOverride !== '' ? profile.fullNameOverride : emp.fullName}
                                    onChange={(e) => handleUpdateProfile(emp.employeeId, { fullNameOverride: e.target.value })}
                                    className="bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 text-[var(--crm-heading)] px-2 py-1.5 rounded-sm w-full outline-none text-[11px]"
                                    placeholder="Full Name"
                                  />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-[9px] uppercase tracking-wider font-mono text-[var(--crm-ink-faint)]">Phone Number *</span>
                                  <input
                                    type="text"
                                    value={profile.phoneOverride !== undefined && profile.phoneOverride !== '' ? profile.phoneOverride : (emp.phone || '')}
                                    onChange={(e) => handleUpdateProfile(emp.employeeId, { phoneOverride: e.target.value })}
                                    className="bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 text-[var(--crm-heading)] px-2 py-1.5 rounded-sm w-full outline-none text-[11px]"
                                    placeholder="Phone Number"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Status & Access Column */}
                            <div className="space-y-3">
                              <h5 className="text-[9px] font-mono font-bold text-[var(--crm-accent)] uppercase tracking-wider border-b border-[var(--crm-line)] pb-1 flex items-center gap-1.5">
                                <FiBriefcase size={12} className="text-[var(--crm-accent)]" /> Role & Status
                              </h5>
                              <div className="space-y-2">
                                <div className="flex flex-col gap-1">
                                  <span className="text-[9px] uppercase tracking-wider font-mono text-[var(--crm-ink-faint)]">Corporate Role *</span>
                                  <select
                                    value={profile.roleOverride || emp.role}
                                    onChange={async (e) => {
                                      const nextRole = e.target.value;
                                      handleUpdateProfile(emp.employeeId, { roleOverride: nextRole });
                                      try {
                                        await adminApi.updateUserRole(emp._id, nextRole);
                                        toast.success(`Role synced to database! 🚀`);
                                        fetchInitialData();
                                      } catch (err) {
                                        console.error(err);
                                        toast.error('Failed to sync role to database');
                                      }
                                    }}
                                    className="bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 text-[var(--crm-heading)] px-2 py-1.5 rounded-sm w-full outline-none text-[11px] cursor-pointer"
                                  >
                                    <option value="ADMIN">ADMIN</option>
                                    <option value="MANAGER">MANAGER</option>
                                    <option value="SALES">SALES</option>
                                    <option value="PROCUREMENT">PROCUREMENT</option>
                                    <option value="ACCOUNTS">ACCOUNTS</option>
                                    <option value="HR">HR</option>
                                    <option value="IT">IT</option>
                                    <option value="FINANCE">FINANCE</option>
                                    <option value="SOFTWARE_ENGINEER">SOFTWARE ENGINEER</option>
                                    <option value="SYSTEM">SYSTEM</option>
                                    <option value="AI">AI</option>
                                  </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-[9px] uppercase tracking-wider font-mono text-[var(--crm-ink-faint)]">Department *</span>
                                  <select
                                    value={profile.departmentOverride || emp.department || 'HQ'}
                                    onChange={async (e) => {
                                      const nextDept = e.target.value;
                                      handleUpdateProfile(emp.employeeId, { departmentOverride: nextDept });
                                      try {
                                        await adminApi.updateUserDepartment(emp._id, nextDept);
                                        toast.success(`Department synced to database! 📁`);
                                        fetchInitialData();
                                      } catch (err) {
                                        console.error(err);
                                        toast.error('Failed to sync department to database');
                                      }
                                    }}
                                    className="bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 text-[var(--crm-heading)] px-2 py-1.5 rounded-sm w-full outline-none text-[11px] cursor-pointer"
                                  >
                                    <option value="STONE">STONE</option>
                                    <option value="COAL">COAL</option>
                                    <option value="TEA">TEA</option>
                                    <option value="RICE">RICE</option>
                                    <option value="TRANSPORT">TRANSPORT</option>
                                    <option value="ADMIN">ADMIN</option>
                                    <option value="IT">IT</option>
                                    <option value="PROCUREMENT">PROCUREMENT</option>
                                    <option value="ACCOUNTS">ACCOUNTS</option>
                                    <option value="HR">HR</option>
                                    <option value="SALES">SALES</option>
                                    <option value="CRM">CRM</option>
                                    <option value="FINANCE">FINANCE</option>
                                  </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-[9px] uppercase tracking-wider font-mono text-[var(--crm-ink-faint)]">Employment Status *</span>
                                  <select
                                    value={profile.employmentStatus || 'Probation'}
                                    onChange={(e) => handleUpdateProfile(emp.employeeId, { employmentStatus: e.target.value })}
                                    className="bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 text-[var(--crm-heading)] px-2 py-1.5 rounded-sm w-full outline-none text-[11px] cursor-pointer"
                                  >
                                    <option value="Full-time">Full-time</option>
                                    <option value="Temporary">Temporary</option>
                                    <option value="Probation">Probation</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Compliance & Financial Column */}
                            <div className="space-y-3">
                              <h5 className="text-[9px] font-mono font-bold text-[var(--crm-accent)] uppercase tracking-wider border-b border-[var(--crm-line)] pb-1 flex items-center gap-1.5">
                                <FiShield size={12} className="text-[var(--crm-accent)]" /> Compliance & Bank
                              </h5>
                              <div className="space-y-2">
                                <div className="space-y-2 pb-3 border-b border-[var(--crm-line)]">
                                  <h6 className="text-[9px] font-mono font-bold text-[var(--crm-accent)] uppercase tracking-wider">Aadhaar details</h6>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[9px] uppercase tracking-wider font-mono text-[var(--crm-ink-faint)]">Aadhaar Card Number</span>
                                    <input
                                      type="text"
                                      value={profile.aadhaar || ''}
                                      onChange={(e) => handleUpdateProfile(emp.employeeId, { aadhaar: e.target.value })}
                                      className="bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 text-[var(--crm-heading)] px-2 py-1.5 rounded-sm w-full outline-none text-[11px]"
                                      placeholder="12-digit UIDAI Number"
                                    />
                                  </div>
                                  <div className="flex justify-between items-center pt-1.5">
                                    <span className="text-[9px] uppercase tracking-wider font-mono text-[var(--crm-ink-faint)]">Verification status</span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateProfile(emp.employeeId, { aadhaarVerified: !profile.aadhaarVerified })}
                                      className={`px-2 py-1 text-[9px] font-mono font-bold rounded-sm border transition-all cursor-pointer ${
                                        profile.aadhaarVerified
                                          ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/25'
                                          : 'bg-transparent text-[var(--crm-ink-faint)] border-[var(--crm-line)] hover:border-[var(--crm-accent)] hover:text-white'
                                      }`}
                                    >
                                      {profile.aadhaarVerified ? 'Verified ✓' : 'Verify'}
                                    </button>
                                  </div>
                                </div>
                                <div className="space-y-2 pt-2">
                                  <h6 className="text-[9px] font-mono font-bold text-[var(--crm-accent)] uppercase tracking-wider">Bank Details</h6>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[9px] uppercase tracking-wider font-mono text-[var(--crm-ink-faint)]">Bank Name</span>
                                    <input
                                      type="text"
                                      value={profile.bankName || ''}
                                      onChange={(e) => handleUpdateProfile(emp.employeeId, { bankName: e.target.value })}
                                      className="bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 text-[var(--crm-heading)] px-2 py-1.5 rounded-sm w-full outline-none text-[11px]"
                                      placeholder="e.g. State Bank of India"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[9px] uppercase tracking-wider font-mono text-[var(--crm-ink-faint)]">Account Number</span>
                                    <input
                                      type="text"
                                      value={profile.bankAccount || ''}
                                      onChange={(e) => handleUpdateProfile(emp.employeeId, { bankAccount: e.target.value })}
                                      className="bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 text-[var(--crm-heading)] px-2 py-1.5 rounded-sm w-full outline-none text-[11px]"
                                      placeholder="Account Number"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[9px] uppercase tracking-wider font-mono text-[var(--crm-ink-faint)]">IFSC Code</span>
                                    <input
                                      type="text"
                                      value={profile.bankIFSC || ''}
                                      onChange={(e) => handleUpdateProfile(emp.employeeId, { bankIFSC: e.target.value })}
                                      className="bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 text-[var(--crm-heading)] px-2 py-1.5 rounded-sm w-full outline-none text-[11px] uppercase"
                                      placeholder="IFSC Code"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB 3: ATTENDANCE & LEAVE */}
            {activeTab === 'attendance_leave' && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pb-6 text-left">
                
                {/* Left Column - Leave Requests & Settings (Col Span 7) */}
                <div className="xl:col-span-7 space-y-6">
                  
                  {/* Leave Requests Panel */}
                  <div className="border p-4 rounded-sm space-y-4" style={CARD}>
                    <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--crm-line)' }}>
                      <h3 className="text-[10px] uppercase tracking-widest font-bold font-mono text-[var(--crm-heading)] flex items-center gap-1.5">
                        <FiCalendar size={12} className="text-[var(--crm-accent)]" /> Leave Requests Operations
                      </h3>
                      <span className="text-[9px] font-mono text-[var(--crm-ink-faint)] bg-[var(--crm-bg-sunken)] px-2 py-0.5 rounded border border-[var(--crm-line)]">
                        {leaves.length} Requests
                      </span>
                    </div>

                    {loading ? (
                      <div className="space-y-3">
                        {[1, 2].map(i => (
                          <div key={i} className="border p-3 rounded-sm crm-skeleton h-24" style={CARD_SUNKEN} />
                        ))}
                      </div>
                    ) : leaves.length === 0 ? (
                      <div className="py-10 text-center text-xs text-[var(--crm-ink-faint)] font-mono border rounded-sm border-dashed" style={{ borderColor: 'var(--crm-line)' }}>
                        No leave requests found in database
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                        {leaves.map((item) => {
                          const emp = item.employeeId || {};
                          const approver = item.approvedBy || item.extraApprovedBy;
                          const isPendingReview = ['PENDING', 'PENDING_HR_APPROVAL'].includes(item.status);
                          const empName = emp.fullName || emp.name || emp.email || 'Employee';
                          const approverName = approver ? (approver.fullName || approver.name || 'HR Approver') : 'HR Manager';
                          const approverRole = approver ? (approver.role || approver.department || 'HR') : 'HR';

                          return (
                            <div 
                              key={item._id} 
                              className={`border p-3 rounded-sm space-y-2 transition-all hover:border-[var(--crm-accent)]/30 ${
                                item.isExtraLeave ? 'border-dashed border-[var(--crm-warning)]/40 bg-[var(--crm-warning-bg)]/10' : ''
                              }`} 
                              style={CARD_SUNKEN}
                            >
                              <div className="flex justify-between items-start">
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-mono font-bold text-[var(--crm-heading)]">
                                    {empName}
                                  </span>
                                  <p className="text-[9px] text-[var(--crm-ink-faint)] font-mono">
                                    {emp.department || 'HQ'} • {emp.role || 'STAFF'}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 border rounded-sm uppercase tracking-wider ${
                                    item.isExtraLeave ? 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/20' : 'bg-[var(--crm-accent-bg)] text-[var(--crm-accent)] border-[var(--crm-accent)]/20'
                                  }`}>
                                    {item.leaveType} {item.isExtraLeave && '(EXTRA)'}
                                  </span>
                                  <span className="text-[9px] font-mono text-[var(--crm-ink-soft)]">
                                    {item.numberOfDays} {item.numberOfDays === 1 ? 'Day' : 'Days'}
                                  </span>
                                </div>
                              </div>

                              <div className="text-[10px] space-y-1 py-1 border-t border-b" style={{ borderColor: 'var(--crm-line)' }}>
                                <div className="flex justify-between text-[9px] font-mono text-[var(--crm-ink-faint)]">
                                  <span>Period:</span>
                                  <span className="text-[var(--crm-heading)]">
                                    {new Date(item.fromDate).toLocaleDateString()} - {new Date(item.toDate).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-[9px] text-[var(--crm-ink-soft)] italic">
                                  "Reason: {item.reason}"
                                </p>
                                {item.isExtraLeave && item.extraLeaveReason && (
                                  <p className="text-[9px] text-[var(--crm-warning)] italic">
                                    "Extra Leave justification: {item.extraLeaveReason}"
                                  </p>
                                )}
                                {item.hrRemarks && (
                                  <p className="text-[9px] text-[var(--crm-positive)] font-mono">
                                    HR Remarks: {item.hrRemarks}
                                  </p>
                                )}
                              </div>

                              {isPendingReview ? (
                                <div className="space-y-2 pt-1.5">
                                  {selectedLeaveIdForReview === item._id ? (
                                    <div className="space-y-2 bg-[var(--crm-bg-raised)] p-2 border rounded-sm" style={{ borderColor: 'var(--crm-line)' }}>
                                      <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--crm-ink-faint)]">Provide HR Remarks for Audit log *</span>
                                      <input
                                        type="text"
                                        placeholder="e.g. Extra leaves approved due to medical emergency verification"
                                        value={reviewRemarks}
                                        onChange={(e) => setReviewRemarks(e.target.value)}
                                        className="w-full px-2 py-1 bg-[var(--crm-bg)] border border-[var(--crm-line)] text-xs rounded-sm outline-none text-[var(--crm-heading)]"
                                      />
                                      <div className="flex gap-1.5">
                                        <button 
                                          onClick={() => handleReviewLeaveWithRemarks('APPROVED')}
                                          className="flex-1 bg-emerald-900/60 text-emerald-300 py-1 rounded text-[8px] font-mono font-bold uppercase tracking-wider hover:bg-emerald-800 transition-colors cursor-pointer"
                                        >
                                          Confirm Approval
                                        </button>
                                        <button 
                                          onClick={() => handleReviewLeaveWithRemarks('REJECTED')}
                                          className="flex-1 bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] py-1 rounded text-[8px] font-mono font-bold uppercase tracking-wider hover:bg-[var(--crm-danger)] hover:text-white transition-colors cursor-pointer"
                                        >
                                          Reject Request
                                        </button>
                                        <button 
                                          onClick={() => setSelectedLeaveIdForReview(null)}
                                          className="px-2 bg-transparent border border-[var(--crm-line)] text-[8px] font-mono text-[var(--crm-ink-faint)] rounded cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex gap-1.5">
                                      <button 
                                        onClick={() => handleReviewLeaveRequest(item._id, 'APPROVED')} 
                                        className="flex-1 bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] py-1 rounded-sm text-[8px] font-bold uppercase border border-[var(--crm-positive)]/25 cursor-pointer hover:bg-[var(--crm-positive)] hover:text-[var(--crm-bg-sunken)] transition-all"
                                      >
                                        Approve
                                      </button>
                                      <button 
                                        onClick={() => setSelectedLeaveIdForReview(item._id)} 
                                        className="flex-1 bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] py-1 rounded-sm text-[8px] font-bold uppercase border border-[var(--crm-danger)]/25 cursor-pointer hover:bg-[var(--crm-danger)] hover:text-white transition-all"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="pt-1.5 border-t space-y-1" style={{ borderColor: 'var(--crm-line)' }}>
                                  <div className="flex justify-between items-center text-[8px] font-mono">
                                    <span className={`px-2 py-0.5 border rounded-sm font-bold uppercase ${
                                      ['APPROVED', 'HR_APPROVED_EXTRA'].includes(item.status)
                                        ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20'
                                        : 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/20'
                                    }`}>
                                      {item.status.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-[var(--crm-ink-faint)]">
                                      Reviewed on {new Date(item.approvedOn || item.extraApprovedOn || item.updatedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="text-[9px] font-mono text-right">
                                    <span className={['APPROVED', 'HR_APPROVED_EXTRA'].includes(item.status) ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                      {['APPROVED', 'HR_APPROVED_EXTRA'].includes(item.status) ? '✓ Approved' : '✗ Rejected'} by: {approverName} ({approverRole})
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* HR Settings & Rules Configuration */}
                  <div className="border p-4 rounded-sm space-y-4" style={CARD}>
                    <h3 className="text-[10px] uppercase tracking-widest font-bold font-mono text-[var(--crm-heading)] border-b pb-2 flex items-center gap-1.5" style={{ borderColor: 'var(--crm-line)' }}>
                      <FiSliders size={12} className="text-[var(--crm-accent)]" /> Leave Policy Configuration
                    </h3>

                    {hrSettings ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                        <div className="space-y-3">
                          <div>
                            <span className="text-[8px] uppercase tracking-wider text-[var(--crm-ink-faint)] block mb-1">Max Extra Leaves/Year</span>
                            <input 
                              type="number" 
                              value={hrSettings.maxExtraLeavesPerYear} 
                              onChange={(e) => handleUpdateHRSettings({ maxExtraLeavesPerYear: Number(e.target.value) })}
                              className="w-24 bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-2 py-1 rounded-sm text-center outline-none focus:border-[var(--crm-accent)]"
                            />
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer select-none text-[10px] text-[var(--crm-ink-soft)]">
                            <input 
                              type="checkbox" 
                              checked={hrSettings.extraLeaveApprovalRequired}
                              onChange={(e) => handleUpdateHRSettings({ extraLeaveApprovalRequired: e.target.checked })}
                              className="rounded-sm border-[var(--crm-line)] w-3.5 h-3.5 cursor-pointer accent-[var(--crm-accent)]"
                            />
                            Require HR Approval for Extra Leaves
                          </label>
                        </div>

                        <div className="space-y-3">
                          <label className="flex items-center gap-2 cursor-pointer select-none text-[10px] text-[var(--crm-ink-soft)]">
                            <input 
                              type="checkbox" 
                              checked={hrSettings.autoApproveExtraLeaves}
                              onChange={(e) => handleUpdateHRSettings({ autoApproveExtraLeaves: e.target.checked })}
                              className="rounded-sm border-[var(--crm-line)] w-3.5 h-3.5 cursor-pointer accent-[var(--crm-accent)]"
                            />
                            Auto-Approve Extra Leaves (No HR check)
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none text-[10px] text-[var(--crm-ink-soft)]">
                            <input 
                              type="checkbox" 
                              checked={hrSettings.extraLeaveReasonRequired}
                              onChange={(e) => handleUpdateHRSettings({ extraLeaveReasonRequired: e.target.checked })}
                              className="rounded-sm border-[var(--crm-line)] w-3.5 h-3.5 cursor-pointer accent-[var(--crm-accent)]"
                            />
                            Mandatory Justification Reason
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-xs text-[var(--crm-ink-faint)] font-mono animate-pulse">Loading policy details...</div>
                    )}
                  </div>

                  {/* Manual Leaves Reset Console */}
                  <div className="border p-4 rounded-sm space-y-4" style={CARD}>
                    <h3 className="text-[10px] uppercase tracking-widest font-bold font-mono text-[var(--crm-heading)] border-b pb-2 flex items-center gap-1.5" style={{ borderColor: 'var(--crm-line)' }}>
                      <FiClock size={12} className="text-[var(--crm-danger)]" /> Monthly Reset Operations
                    </h3>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="flex-1 text-[10px] text-[var(--crm-ink-faint)]">
                        Resetting balances wipes unused leaves (no carry forward) and sets balance to exactly 4 for all active employees.
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <input 
                          type="month" 
                          value={resetMonthInput}
                          onChange={(e) => setResetMonthInput(e.target.value)}
                          className="bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-2 py-1 rounded-sm text-xs font-mono outline-none"
                        />
                        <button
                          onClick={handleTriggerReset}
                          className="bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border border-[var(--crm-danger)]/30 hover:bg-[var(--crm-danger)] hover:text-white px-3 py-1.5 rounded-sm text-[9px] font-bold font-mono uppercase tracking-wider transition cursor-pointer"
                        >
                          Reset to 4
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Column - Biometric Sync & Audit Trail (Col Span 5) */}
                <div className="xl:col-span-5 space-y-6">



                  {/* Today's Attendance Login & Logout Logs Panel */}
                  <div className="border p-4 rounded-sm space-y-3" style={CARD}>
                    <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--crm-line)' }}>
                      <h3 className="text-[10px] uppercase tracking-widest font-bold font-mono text-[var(--crm-heading)] flex items-center gap-1.5">
                        <FiClock size={12} className="text-[var(--crm-accent)]" /> Today's Login / Logout Status (All Employees)
                      </h3>
                      <span className="text-[8px] font-mono text-[var(--crm-ink-faint)] bg-[var(--crm-bg-sunken)] px-2 py-0.5 rounded border border-[var(--crm-line)]">
                        {attendanceReport?.records?.length || 0} Employees
                      </span>
                    </div>

                    {!attendanceReport?.records || attendanceReport.records.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[var(--crm-ink-faint)] font-mono">No attendance logs synced today</div>
                    ) : (
                      <div className="overflow-x-auto max-h-[300px] overflow-y-auto border rounded-sm custom-scrollbar" style={{ borderColor: 'var(--crm-line)' }}>
                        <table className="w-full text-left border-collapse text-[10px] font-mono">
                          <thead style={{ background: 'var(--crm-bg-sunken)' }}>
                            <tr className="text-[var(--crm-ink-faint)] border-b" style={{ borderColor: 'var(--crm-line)' }}>
                              <th className="p-2">Employee</th>
                              <th className="p-2 text-center">Check In (Login)</th>
                              <th className="p-2 text-center">Check Out (Logout)</th>
                              <th className="p-2 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--crm-line)]">
                            {attendanceReport.records.map(rec => {
                              const emp = rec.employeeId || {};
                              const statusTone = 
                                rec.status === 'PRESENT' ? 'text-[var(--crm-positive)]' :
                                rec.status === 'LATE' ? 'text-[var(--crm-warning)]' :
                                rec.status === 'ABSENT' ? 'text-[var(--crm-danger)]' :
                                'text-[var(--crm-ink-faint)]';

                              return (
                                <tr key={rec._id} className="hover:bg-[var(--crm-bg-raised)]/30">
                                  <td className="p-2 text-[var(--crm-heading)] font-sans font-semibold">
                                    {emp.name || 'Unknown'}
                                    <span className="block text-[8px] font-mono text-[var(--crm-ink-faint)] uppercase">
                                      {emp.department || 'HQ'} • {emp.role || 'STAFF'}
                                    </span>
                                  </td>
                                  <td className="p-2 text-center font-mono">
                                    {rec.checkInTime ? (
                                      <span className="text-[var(--crm-positive)] font-bold">{rec.checkInTime}</span>
                                    ) : (
                                      <span className="text-[var(--crm-ink-faint)]">—</span>
                                    )}
                                  </td>
                                  <td className="p-2 text-center font-mono">
                                    {rec.checkOutTime ? (
                                      <span className="text-[var(--crm-accent)] font-bold">{rec.checkOutTime}</span>
                                    ) : (
                                      <span className="text-[var(--crm-ink-faint)]">—</span>
                                    )}
                                  </td>
                                  <td className="p-2 text-center font-mono font-bold">
                                    <span className={statusTone}>
                                      {rec.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Leave Balances Sheet */}
                  <div className="border p-4 rounded-sm space-y-3" style={CARD}>
                    <h3 className="text-[10px] uppercase tracking-widest font-bold font-mono text-[var(--crm-heading)] border-b pb-2 flex justify-between items-center" style={{ borderColor: 'var(--crm-line)' }}>
                      <span>Employee Leave Balances</span>
                      <span className="text-[8px] font-mono text-[var(--crm-ink-faint)]">Month: {resetMonthInput}</span>
                    </h3>

                    {leaveBalances.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[var(--crm-ink-faint)] font-mono">No active balances found</div>
                    ) : (
                      <div className="overflow-x-auto max-h-[220px] overflow-y-auto border rounded-sm custom-scrollbar" style={{ borderColor: 'var(--crm-line)' }}>
                        <table className="w-full text-left border-collapse text-[10px] font-mono">
                          <thead style={{ background: 'var(--crm-bg-sunken)' }}>
                            <tr className="text-[var(--crm-ink-faint)] border-b" style={{ borderColor: 'var(--crm-line)' }}>
                              <th className="p-2">Employee</th>
                              <th className="p-2 text-center">Remaining (Paid)</th>
                              <th className="p-2 text-center">Extra Used</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--crm-line)]">
                            {leaveBalances.map(bal => (
                              <tr key={bal._id} className="hover:bg-[var(--crm-bg-raised)]/30">
                                <td className="p-2 text-[var(--crm-heading)] font-sans font-semibold">
                                  {bal.employeeId?.fullName || bal.employeeId?.name || 'Employee'}
                                  <span className="block text-[8px] font-mono text-[var(--crm-ink-faint)] uppercase">{bal.employeeId?.department}</span>
                                </td>
                                <td className="p-2 text-center text-[var(--crm-positive)] font-bold">{bal.remainingLeaves} / 4</td>
                                <td className="p-2 text-center text-[var(--crm-warning)] font-bold">{bal.extraLeavesUsed}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Audit Trail Panel */}
                  <div className="border p-4 rounded-sm space-y-3" style={CARD}>
                    <h3 className="text-[10px] uppercase tracking-widest font-bold font-mono text-[var(--crm-heading)] border-b pb-2 flex items-center gap-1.5" style={{ borderColor: 'var(--crm-line)' }}>
                      <FiCheckSquare size={12} className="text-[var(--crm-accent)]" /> Leave Audits Trail
                    </h3>

                    {auditLogs.length === 0 ? (
                      <div className="py-6 text-center text-[8px] text-[var(--crm-ink-faint)] font-mono">No audit actions logged</div>
                    ) : (
                      <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                        {auditLogs.map(log => (
                          <div key={log._id} className="text-[9px] font-mono border-b pb-2" style={{ borderColor: 'var(--crm-line)' }}>
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-[var(--crm-heading)] font-semibold">{log.employeeId?.fullName || log.employeeId?.name || 'Employee'}</span>
                              <span className={`text-[7px] font-bold px-1 rounded-sm uppercase ${
                                log.action === 'EXTRA_APPROVED' ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)]' :
                                log.action === 'REJECTED' ? 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)]' :
                                log.action === 'AUTO_RESET' ? 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)]' :
                                'bg-[var(--crm-bg-raised)] text-[var(--crm-ink-faint)]'
                              }`}>
                                {log.action}
                              </span>
                            </div>
                            <div className="text-[var(--crm-ink-soft)] space-y-0.5">
                              <p>Action Performed By: <span className="text-[var(--crm-heading)]">{log.performedBy}</span></p>
                              {log.remarks && <p>Remarks: <span className="text-white italic">"{log.remarks}"</span></p>}
                              <p className="text-[7px] text-[var(--crm-ink-faint)]">Logged: {new Date(log.performedAt || log.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}

            {/* TAB 4: RECRUITMENT */}
            {activeTab === 'recruitment' && (
              <div className="space-y-4 pb-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 border rounded-sm" style={CARD}>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={handleOpenAddJob} className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-[var(--crm-accent)] text-[var(--crm-bg-sunken)] hover:bg-[var(--crm-accent-soft)] px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer">
                      <FiPlus size={12} /> Create Job
                    </button>
                  </div>
                  <div className="text-[9px] text-[var(--crm-ink-faint)] font-mono">{applications.length} Total Apps</div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "Pending", count: applications.filter(a => a.status === 'PENDING').length, tone: "warning" },
                    { label: "Reviewed", count: applications.filter(a => a.status === 'REVIEWED').length, tone: "info" },
                    { label: "Accepted", count: applications.filter(a => a.status === 'ACCEPTED').length, tone: "positive" },
                    { label: "Rejected", count: applications.filter(a => a.status === 'REJECTED').length, tone: "danger" }
                  ].map((f, idx) => (
                    <div key={idx} className="p-2.5 border rounded-sm text-left" style={{ ...CARD_SUNKEN, borderColor: f.tone === 'warning' ? 'var(--crm-warning)' : f.tone === 'positive' ? 'var(--crm-positive)' : f.tone === 'danger' ? 'var(--crm-danger)' : 'var(--crm-info)', background: f.tone === 'warning' ? 'var(--crm-warning-bg)' : f.tone === 'positive' ? 'var(--crm-positive-bg)' : f.tone === 'danger' ? 'var(--crm-danger-bg)' : 'var(--crm-info-bg)' }}>
                      <span className="text-[8px] font-mono font-bold text-[var(--crm-ink-faint)] uppercase block">{f.label}</span>
                      <strong className="text-base mt-0.5 block" style={{ fontFamily: 'var(--crm-font-display)', color: f.tone === 'warning' ? 'var(--crm-warning)' : f.tone === 'positive' ? 'var(--crm-positive)' : f.tone === 'danger' ? 'var(--crm-danger)' : 'var(--crm-info)' }}>{f.count}</strong>
                    </div>
                  ))}
                </div>

                <div className="border rounded-sm overflow-hidden" style={CARD}>
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0" style={{ background: 'var(--crm-bg-sunken)' }}>
                        <tr className="text-[var(--crm-ink-faint)] text-[9px] font-mono uppercase border-b" style={{ borderColor: 'var(--crm-line)' }}>
                          <th className="py-1.5 px-3">Job</th>
                          <th className="py-1.5 px-3">Dept</th>
                          <th className="py-1.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--crm-line)] text-[10px]">
                        {loading ? (
                          [1,2,3].map(i => (
                            <tr key={i}>
                              <td className="py-2 px-3"><div className="crm-skeleton h-3.5 w-24 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} /></td>
                              <td className="py-2 px-3"><div className="crm-skeleton h-3.5 w-16 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} /></td>
                              <td className="py-2 px-3 text-center"><div className="crm-skeleton h-4 w-14 rounded-sm mx-auto" style={{ background: 'var(--crm-bg-sunken)' }} /></td>
                            </tr>
                          ))
                        ) : jobs.length === 0 ? (
                          <tr><td colSpan="3" className="py-6 text-center text-[10px] text-[var(--crm-ink-faint)] font-mono">No job vacancies</td></tr>
                        ) : (
                          jobs.slice(0, 5).map(job => (
                            <tr key={job._id} className="hover:bg-[var(--crm-bg-raised)]/40">
                              <td className="py-2 px-3 font-semibold text-[var(--crm-heading)] text-[10px]">{job.title}</td>
                              <td className="py-2 px-3 font-mono uppercase text-[9px] text-[var(--crm-ink-soft)]">{job.department}</td>
                              <td className="py-2 px-3 text-center">
                                <button onClick={() => handleToggleJobActiveFlag(job)} className={`px-1.5 py-0.5 rounded-sm border text-[8px] font-bold font-mono ${job.isActive ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)]' : 'bg-transparent text-[var(--crm-ink-faint)]'}`}>
                                  {job.isActive ? 'ACTIVE' : 'INACTIVE'}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Job Applications Section */}
                <h4 className="text-[10px] font-mono font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider mt-4">Job Applications</h4>
                <div className="border rounded-sm overflow-hidden" style={CARD}>
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0" style={{ background: 'var(--crm-bg-sunken)' }}>
                        <tr className="text-[var(--crm-ink-faint)] text-[9px] font-mono uppercase border-b" style={{ borderColor: 'var(--crm-line)' }}>
                          <th className="py-1.5 px-3">Candidate</th>
                          <th className="py-1.5 px-3">Position</th>
                          <th className="py-1.5 px-3 text-center">Applied On</th>
                          <th className="py-1.5 px-3 text-center">Status</th>
                          <th className="py-1.5 px-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--crm-line)] text-[10px]">
                        {loading ? (
                          [1,2,3].map(i => (
                            <tr key={i}>
                              <td className="py-2 px-3"><div className="crm-skeleton h-3.5 w-24 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} /></td>
                              <td className="py-2 px-3"><div className="crm-skeleton h-3.5 w-16 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} /></td>
                              <td className="py-2 px-3 text-center"><div className="crm-skeleton h-3.5 w-16 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} /></td>
                              <td className="py-2 px-3 text-center"><div className="crm-skeleton h-4 w-12 rounded-sm mx-auto" style={{ background: 'var(--crm-bg-sunken)' }} /></td>
                              <td className="py-2 px-3 text-center"><div className="crm-skeleton h-4 w-20 rounded-sm mx-auto" style={{ background: 'var(--crm-bg-sunken)' }} /></td>
                            </tr>
                          ))
                        ) : applications.length === 0 ? (
                          <tr><td colSpan="5" className="py-6 text-center text-[10px] text-[var(--crm-ink-faint)] font-mono">No job applications</td></tr>
                        ) : (
                          applications.map(app => (
                            <tr key={app._id} className="hover:bg-[var(--crm-bg-raised)]/40">
                              <td className="py-2 px-3 text-left">
                                <div className="font-semibold text-[var(--crm-heading)] text-[10px]">{app.fullName}</div>
                                <div className="text-[8px] text-[var(--crm-ink-faint)] font-mono">{app.email} | {app.phone}</div>
                              </td>
                              <td className="py-2 px-3 font-mono uppercase text-[9px] text-[var(--crm-ink-soft)]">{app.position}</td>
                              <td className="py-2 px-3 text-center text-[9px] text-[var(--crm-ink-faint)] font-mono">
                                {new Date(app.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <select
                                  value={app.status}
                                  onChange={(e) => handleAppStatusChangeOption(app._id, e.target.value)}
                                  className="px-1.5 py-1 bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[9px] font-mono rounded-sm outline-none text-[var(--crm-heading)] cursor-pointer"
                                >
                                  <option value="PENDING">PENDING</option>
                                  <option value="REVIEWED">REVIEWED</option>
                                  <option value="ACCEPTED">ACCEPTED</option>
                                  <option value="REJECTED">REJECTED</option>
                                </select>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <div className="flex justify-center items-center gap-1.5">
                                  <button
                                    onClick={() => handleViewResume(app._id)}
                                    className="px-1.5 py-0.5 rounded-sm border border-[var(--crm-line)] bg-transparent text-[8px] font-bold font-mono hover:text-[var(--crm-heading)] hover:border-[var(--crm-heading)]/40 transition cursor-pointer"
                                    title="View CV"
                                  >
                                    View CV
                                  </button>
                                  <button
                                    onClick={() => handleOpenScheduleInterview(app)}
                                    className="px-1.5 py-0.5 rounded-sm border border-[var(--crm-accent)]/30 bg-[var(--crm-accent-bg)] text-[var(--crm-accent)] text-[8px] font-bold font-mono hover:bg-[var(--crm-accent)] hover:text-[var(--crm-bg-sunken)] transition cursor-pointer"
                                    title="Schedule Interview"
                                  >
                                    Schedule
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: PAYROLL & ASSETS */}
            {activeTab === 'payroll_assets' && (
              <div className="space-y-4 pb-4">
                <div className="flex border-b border-[var(--crm-line)] gap-4">
                  {[
                    { id: 'payroll', label: 'Payroll' },
                    { id: 'tax', label: 'Tax Declarations' },
                    { id: 'assets', label: 'Assets' }
                  ].map(sub => (
                    <button key={sub.id} onClick={() => setPayrollSubTab(sub.id)} className={`pb-1.5 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer ${payrollSubTab === sub.id ? 'text-[var(--crm-heading)] border-b-2 border-[var(--crm-accent)]' : 'text-[var(--crm-ink-faint)]'}`}>
                      {sub.label}
                    </button>
                  ))}
                </div>

                {payrollSubTab === 'payroll' && (
                  <div className="border rounded-sm overflow-hidden" style={CARD}>
                    <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0" style={{ background: 'var(--crm-bg-sunken)' }}>
                          <tr className="text-[var(--crm-ink-faint)] text-[8px] uppercase tracking-widest font-mono font-bold border-b" style={{ borderColor: 'var(--crm-line)' }}>
                            <th className="py-1.5 px-3">Employee</th>
                            <th className="py-1.5 px-3 text-right">Basic</th>
                            <th className="py-1.5 px-3 text-right">HRA</th>
                            <th className="py-1.5 px-3 text-center">Net CTC</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--crm-line)] text-[10px] font-mono">
                          {loading ? (
                            [1,2,3].map(i => (
                              <tr key={i}>
                                <td className="py-2 px-3"><div className="crm-skeleton h-3.5 w-20 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} /></td>
                                <td className="py-2 px-3 text-right"><div className="crm-skeleton h-5 w-14 rounded-sm ml-auto" style={{ background: 'var(--crm-bg-sunken)' }} /></td>
                                <td className="py-2 px-3 text-right"><div className="crm-skeleton h-5 w-14 rounded-sm ml-auto" style={{ background: 'var(--crm-bg-sunken)' }} /></td>
                                <td className="py-2 px-3 text-center"><div className="crm-skeleton h-3.5 w-16 rounded-sm mx-auto" style={{ background: 'var(--crm-bg-sunken)' }} /></td>
                              </tr>
                            ))
                          ) : (
                            employees.slice(0, 6).map(emp => {
                              const sal = getEmployeeSalary(emp.employeeId);
                              const gross = sal.basic + sal.hra + sal.allowance;
                              const net = gross - (sal.pf + sal.esi);
                              return (
                                <tr key={emp._id} className="hover:bg-[var(--crm-bg-raised)]/40">
                                  <td className="py-2 px-3 font-sans font-semibold text-[var(--crm-heading)] text-[10px]">{emp.fullName}</td>
                                  <td className="py-2 px-3 text-right">
                                    <input type="number" value={sal.basic} onChange={(e) => handleUpdateSalary(emp.employeeId, { basic: Number(e.target.value) })} className="bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-1 py-0.5 rounded-sm w-14 text-right text-[10px]" />
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <input type="number" value={sal.hra} onChange={(e) => handleUpdateSalary(emp.employeeId, { hra: Number(e.target.value) })} className="bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-1 py-0.5 rounded-sm w-14 text-right text-[10px]" />
                                  </td>
                                  <td className="py-2 px-3 text-center font-bold text-[var(--crm-heading)] text-[10px]">₹{net.toLocaleString()}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {payrollSubTab === 'tax' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {loading ? (
                      [1,2].map(i => (
                        <div key={i} className="border p-4 rounded-sm" style={CARD}>
                          <div className="crm-skeleton h-3.5 w-32 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
                          <div className="crm-skeleton h-3.5 w-40 rounded-sm mt-1.5" style={{ background: 'var(--crm-bg-sunken)' }} />
                          <div className="crm-skeleton h-6 w-full rounded-sm mt-3" style={{ background: 'var(--crm-bg-sunken)' }} />
                        </div>
                      ))
                    ) : taxDeclarations.length === 0 ? (
                      <div className="col-span-2 py-8 text-center text-[10px] text-[var(--crm-ink-faint)] font-mono">No tax declarations</div>
                    ) : (
                      taxDeclarations.slice(0, 4).map(claim => (
                        <div key={claim.id} className="border p-4 rounded-sm flex flex-col justify-between" style={CARD}>
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[8px] font-mono font-bold text-[var(--crm-ink-faint)] bg-[var(--crm-bg-sunken)] border px-1.5 py-0.5 rounded-sm uppercase">INVESTMENT</span>
                              <span className="text-xs font-mono font-bold text-[var(--crm-heading)]">₹{claim.amount.toLocaleString()}</span>
                            </div>
                            <h4 className="font-serif text-xs font-semibold text-[var(--crm-heading)]">{claim.scheme}</h4>
                            <p className="text-[9px] text-[var(--crm-ink-faint)] font-mono">{claim.employeeName}</p>
                          </div>
                          {claim.status === 'PENDING' ? (
                            <div className="flex gap-1.5 mt-2 pt-2 border-t border-[var(--crm-line)]">
                              <button onClick={() => handleTaxStatusChange(claim.id, 'APPROVED')} className="flex-1 bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] py-1 rounded-sm text-[8px] font-bold uppercase cursor-pointer">Approve</button>
                              <button onClick={() => handleTaxStatusChange(claim.id, 'REJECTED')} className="flex-1 bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] py-1 rounded-sm text-[8px] font-bold uppercase cursor-pointer">Reject</button>
                            </div>
                          ) : (
                            <span className={`mt-2 px-1.5 py-0.5 border rounded-sm font-mono text-[8px] font-bold uppercase self-start ${claim.status === 'APPROVED' ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)]' : 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)]'}`}>{claim.status}</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {payrollSubTab === 'assets' && (
                  <div className="border rounded-sm overflow-hidden" style={CARD}>
                    <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0" style={{ background: 'var(--crm-bg-sunken)' }}>
                          <tr className="text-[var(--crm-ink-faint)] text-[8px] uppercase tracking-widest font-mono font-bold border-b" style={{ borderColor: 'var(--crm-line)' }}>
                            <th className="py-1.5 px-3">Asset</th>
                            <th className="py-1.5 px-3">Serial</th>
                            <th className="py-1.5 px-3">Assigned To</th>
                            <th className="py-1.5 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--crm-line)] text-[10px]">
                          {loading ? (
                            [1,2,3].map(i => (
                              <tr key={i}>
                                <td className="py-2 px-3"><div className="crm-skeleton h-3.5 w-20 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} /></td>
                                <td className="py-2 px-3"><div className="crm-skeleton h-3.5 w-16 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} /></td>
                                <td className="py-2 px-3"><div className="crm-skeleton h-3.5 w-24 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} /></td>
                                <td className="py-2 px-3 text-center"><div className="crm-skeleton h-4 w-14 rounded-sm mx-auto" style={{ background: 'var(--crm-bg-sunken)' }} /></td>
                              </tr>
                            ))
                          ) : assets.length === 0 ? (
                            <tr><td colSpan="4" className="py-6 text-center text-[10px] text-[var(--crm-ink-faint)] font-mono">No assets assigned</td></tr>
                          ) : (
                            assets.slice(0, 6).map(a => (
                              <tr key={a.id} className="hover:bg-[var(--crm-bg-raised)]/40">
                                <td className="py-2 px-3 font-semibold text-[var(--crm-heading)] text-[10px]">{a.name}</td>
                                <td className="py-2 px-3 font-mono text-[9px]">{a.serial}</td>
                                <td className="py-2 px-3 text-[9px]">{a.employeeName}</td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`px-1.5 py-0.5 rounded-sm font-mono text-[7px] font-bold ${a.recoveryStatus === 'RECOVERED' ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)]' : a.recoveryStatus === 'RETAINED' ? 'bg-[var(--crm-info-bg)] text-[var(--crm-info)]' : 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)]'}`}>
                                    {a.recoveryStatus}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: PERFORMANCE */}
            {activeTab === 'performance' && (
              <div className="space-y-4 pb-4">
                <div className="border p-4 rounded-sm" style={CARD}>
                  <div className="flex justify-between items-center border-b border-[var(--crm-line)] pb-1.5">
                    <h3 className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5" style={LABEL_MONO}>
                      <FiAward size={12} /> KRA Performance
                    </h3>
                    <button onClick={() => setShowPipModal(true)} className="bg-[var(--crm-danger-bg)] hover:bg-[var(--crm-danger)] hover:text-white text-[var(--crm-danger)] px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider rounded-sm border border-[var(--crm-danger)]/25 transition cursor-pointer flex items-center gap-0.5">
                      <FiPlus size={10} /> PIP
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                    {loading ? (
                      [1,2].map(i => (
                        <div key={i} className="border p-3 rounded-sm" style={CARD_SUNKEN}>
                          <div className="flex justify-between">
                            <div className="crm-skeleton h-3.5 w-24 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
                            <div className="crm-skeleton h-3.5 w-16 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
                          </div>
                          <div className="flex justify-between mt-1.5">
                            <div className="crm-skeleton h-3.5 w-16 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
                            <div className="crm-skeleton h-5 w-20 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
                          </div>
                        </div>
                      ))
                    ) : (
                      employees.slice(0, 4).map(emp => {
                        const kra = getEmployeeKRA(emp.employeeId);
                        return (
                          <div key={emp._id} className="border p-3 rounded-sm space-y-1.5" style={CARD_SUNKEN}>
                            <div className="flex justify-between items-center">
                              <h4 className="font-serif text-xs font-semibold text-[var(--crm-heading)]">{emp.fullName}</h4>
                              <span className="text-[8px] font-mono text-[var(--crm-accent)] font-bold">{emp.department || 'HQ'}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-[var(--crm-ink-faint)]">Rating:</span>
                              <select value={kra.rating} onChange={(e) => handleUpdateKRA(emp.employeeId, { rating: Number(e.target.value) })} className="bg-[var(--crm-bg)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-1.5 py-0.5 rounded-sm font-mono text-[9px] cursor-pointer outline-none">
                                <option value="5">★★★★★</option>
                                <option value="4">★★★★☆</option>
                                <option value="3">★★★☆☆</option>
                                <option value="2">★★☆☆☆</option>
                                <option value="1">★☆☆☆☆</option>
                              </select>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="border p-4 rounded-sm" style={CARD}>
                  <h3 className="text-[10px] uppercase tracking-widest font-bold border-b pb-1.5 flex items-center gap-1.5" style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)' }}>
                    <FiActivity size={12} className="text-[var(--crm-danger)]" /> PIP Logs
                  </h3>
                  {loading ? (
                    <div className="space-y-2 mt-3">
                      {[1,2].map(i => (
                        <div key={i} className="flex justify-between items-center border-b border-[var(--crm-line)] py-2">
                          <div className="crm-skeleton h-3.5 w-32 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
                          <div className="crm-skeleton h-4 w-16 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
                        </div>
                      ))}
                    </div>
                  ) : pipLogs.length === 0 ? (
                    <div className="py-6 text-center text-[10px] font-mono uppercase text-[var(--crm-ink-faint)]">No PIP logs</div>
                  ) : (
                    <div className="space-y-1.5 mt-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                      {pipLogs.slice(0, 3).map(pip => (
                        <div key={pip.id} className="flex justify-between items-center border-b border-[var(--crm-line)] py-1.5 text-[10px]">
                          <div>
                            <span className="font-semibold text-[var(--crm-heading)]">{pip.employeeName}</span>
                            <span className="text-[var(--crm-ink-faint)] ml-1.5 text-[9px]">{pip.description}</span>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded-sm font-mono text-[7px] font-bold ${pip.status === 'ACTIVE' ? 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] animate-pulse' : 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)]'}`}>
                            {pip.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 7: TASK DELEGATION */}
            {activeTab === 'task_delegation' && (
              <div className="space-y-4 pb-4">
                <div className="flex justify-between items-center p-3 border rounded-sm" style={CARD}>
                  <div>
                    <h3 className="text-xs font-semibold text-[var(--crm-heading)] font-serif">Task Desk</h3>
                    <p className="text-[9px] text-[var(--crm-ink-faint)] font-light">Assign and audit tasks</p>
                  </div>
                  <button onClick={handleOpenAssignTask} className="bg-[var(--crm-heading)] hover:bg-[var(--crm-ink-soft)] text-[var(--crm-bg-sunken)] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-sm transition cursor-pointer shadow-md flex items-center gap-1 shrink-0">
                    <FiPlus size={11} /> Assign
                  </button>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[1,2].map(i => (
                      <div key={i} className="border p-4 rounded-sm" style={CARD}>
                        <div className="flex justify-between">
                          <div className="crm-skeleton h-3.5 w-20 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
                          <div className="crm-skeleton h-3.5 w-12 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
                        </div>
                        <div className="crm-skeleton h-3.5 w-32 rounded-sm mt-1.5" style={{ background: 'var(--crm-bg-sunken)' }} />
                        <div className="border-t border-[var(--crm-line)] mt-2 pt-2 flex justify-between">
                          <div className="crm-skeleton h-3.5 w-24 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
                          <div className="crm-skeleton h-4 w-12 rounded-sm" style={{ background: 'var(--crm-bg-sunken)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : assignedTasks.length === 0 ? (
                  <div className="border rounded-sm py-10 text-center" style={CARD}>
                    <div className="text-[10px] font-mono uppercase text-[var(--crm-ink-faint)]">No tasks assigned</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                    {assignedTasks.slice(0, 20).map((t) => (
                      <div key={t._id || t.id} className="border p-3.5 rounded-sm flex flex-col justify-between hover:border-[var(--crm-accent)]/35 transition" style={CARD}>
                        <div className="space-y-1.5 text-left">
                          <div className="flex justify-between items-start gap-1.5">
                            <span className="text-[8px] font-mono font-bold text-[var(--crm-ink-faint)] uppercase">{new Date(t.createdAt).toLocaleDateString()}</span>
                            <span className={`text-[7px] font-mono font-bold px-1.5 py-0.5 border rounded-sm ${t.priority === 'HIGH' ? 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)]' : t.priority === 'LOW' ? 'bg-[var(--crm-info-bg)] text-[var(--crm-info)]' : 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)]'}`}>
                              {t.priority}
                            </span>
                          </div>
                          <h4 className="font-serif text-xs font-normal text-[var(--crm-heading)]">{t.title}</h4>
                          <p className="text-[9px] text-[var(--crm-ink-soft)] font-sans italic">"{t.description}"</p>
                          
                          {t.fileOriginalName && (
                            <div className="pt-1 flex items-center gap-1.5 text-[8px] font-mono">
                              <span className="text-[var(--crm-ink-faint)]">Task File:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const baseUrl = 'http://localhost:5000/';
                                  const absoluteUrl = t.fileUrl.startsWith('http') ? t.fileUrl : `${baseUrl}${t.fileUrl}`;
                                  const link = document.createElement('a');
                                  link.href = absoluteUrl;
                                  link.setAttribute('download', t.fileOriginalName);
                                  link.setAttribute('target', '_blank');
                                  document.body.appendChild(link);
                                  link.click();
                                  link.remove();
                                }}
                                className="text-teal-400 hover:underline cursor-pointer flex items-center gap-0.5"
                              >
                                <FiPaperclip size={8} /> {t.fileOriginalName}
                              </button>
                            </div>
                          )}

                          {t.status === 'COMPLETED' && (
                            <div className="pt-1 space-y-1">
                              {t.completionFileOriginalName && (
                                <div className="flex items-center gap-1.5 text-[8px] font-mono">
                                  <span className="text-[var(--crm-ink-faint)]">Completion File:</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const baseUrl = 'http://localhost:5000/';
                                      const absoluteUrl = t.completionFileUrl.startsWith('http') ? t.completionFileUrl : `${baseUrl}${t.completionFileUrl}`;
                                      const link = document.createElement('a');
                                      link.href = absoluteUrl;
                                      link.setAttribute('download', t.completionFileOriginalName);
                                      link.setAttribute('target', '_blank');
                                      document.body.appendChild(link);
                                      link.click();
                                      link.remove();
                                    }}
                                    className="text-emerald-400 hover:underline cursor-pointer flex items-center gap-0.5"
                                  >
                                    <FiDownload size={8} /> {t.completionFileOriginalName}
                                  </button>
                                </div>
                              )}
                              {t.remarks && (
                                <p className="text-[9px] text-[var(--crm-ink-soft)] font-sans italic border-l border-slate-700 pl-1.5">
                                  "{t.remarks}"
                                </p>
                              )}
                            </div>
                          )}

                          <div className="flex justify-between items-center text-[9px] border-t border-[var(--crm-line)]/50 pt-1.5 mt-1.5">
                            <span className="text-[var(--crm-ink-faint)]">Assignee:</span>
                            <strong className="text-[var(--crm-heading)] font-medium font-mono text-[9px]">{t.assignedTo?.name || t.assignedToName || 'Employee'}</strong>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-[var(--crm-line)] flex justify-between items-center">
                          <span className={`px-1.5 py-0.5 border text-[7px] font-bold font-mono uppercase rounded-sm ${t.status === 'COMPLETED' ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)]' : 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)]'}`}>
                            {t.status}
                          </span>
                          <button onClick={() => handleCancelTask(t._id || t.id)} className="text-[8px] font-mono font-bold uppercase text-[var(--crm-danger)] hover:text-white transition cursor-pointer">
                            Revoke
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* All Modals - Keep as is from your original code */}
      {/* Job Modal */}
      {showJobModal && (
        <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
          <div className="bg-[var(--crm-bg-raised)] rounded-sm p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-[var(--crm-line)] shadow-2xl text-left">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--crm-line)]">
              <h2 className="font-serif text-lg text-[var(--crm-heading)] uppercase tracking-wide">
                {editingJob ? 'Edit Vacancy Posting' : 'Create Job Vacancy'}
              </h2>
              <button onClick={() => setShowJobModal(false)} className="text-[var(--crm-ink-faint)] hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleJobSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Job Title *</label>
                <input
                  type="text"
                  required
                  value={jobForm.title}
                  onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                  placeholder="e.g. Talent Acquisition Executive"
                  className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none text-[var(--crm-heading)]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Department *</label>
                  <input
                    type="text"
                    required
                    value={jobForm.department}
                    onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
                    placeholder="e.g. HR, Sales"
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none text-[var(--crm-heading)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Experience Required *</label>
                  <input
                    type="text"
                    required
                    value={jobForm.experience}
                    onChange={(e) => setJobForm({ ...jobForm, experience: e.target.value })}
                    placeholder="e.g. 1-3 Years"
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none text-[var(--crm-heading)]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Location *</label>
                  <input
                    type="text"
                    required
                    value={jobForm.location}
                    onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                    placeholder="e.g. Kishanganj Office"
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none text-[var(--crm-heading)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Type *</label>
                  <select
                    value={jobForm.type}
                    onChange={(e) => setJobForm({ ...jobForm, type: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none cursor-pointer text-[var(--crm-heading)]"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                  placeholder="Summarize core roles and operational responsibilities..."
                  className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none resize-none text-[var(--crm-heading)] font-sans"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Requirements (one per line)</label>
                <textarea
                  rows={3}
                  value={jobForm.requirements}
                  onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                  placeholder="e.g. Excellent communications&#10;MS Office literacy"
                  className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none resize-none text-[var(--crm-heading)] font-sans"
                />
              </div>
              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="jobActiveCheckbox"
                  checked={jobForm.isActive}
                  onChange={(e) => setJobForm({ ...jobForm, isActive: e.target.checked })}
                  className="rounded-sm border-[var(--crm-line)] w-4 h-4 cursor-pointer accent-[var(--crm-accent)]"
                />
                <label htmlFor="jobActiveCheckbox" className="text-[var(--crm-ink-soft)] cursor-pointer select-none">Make this posting active on candidate site</label>
              </div>
              <div className="flex space-x-3 pt-3 border-t border-[var(--crm-line)]">
                <button type="submit" className="flex-1 py-2.5 bg-[var(--crm-accent)] text-[var(--crm-bg-sunken)] hover:bg-[var(--crm-accent-soft)] rounded-sm font-bold uppercase tracking-wider transition-colors cursor-pointer">
                  {editingJob ? 'Update Listing' : 'Publish Vacancy'}
                </button>
                <button type="button" onClick={() => setShowJobModal(false)} className="flex-1 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] hover:bg-[var(--crm-bg-raised)] rounded-sm text-[var(--crm-ink-soft)] font-bold uppercase tracking-wider transition-colors cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Allocation Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
          <div className="bg-[var(--crm-bg-raised)] rounded-sm p-6 w-full max-w-md border border-[var(--crm-line)] shadow-2xl text-left overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--crm-line)]">
              <h2 className="font-serif text-lg text-[var(--crm-heading)] uppercase tracking-wide">Assign Operations Task</h2>
              <button onClick={() => setShowTaskModal(false)} className="text-[var(--crm-ink-faint)] hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleTaskSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Assign Employee *</label>
                <select
                  required
                  value={taskForm.assignedTo}
                  onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none text-[var(--crm-heading)] cursor-pointer"
                >
                  <option value="" disabled>Select Team Member</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp.employeeId}>
                      {emp.fullName} ({emp.employeeId} - {emp.role})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Task Title *</label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="e.g. Pre-Screening Call & resume sorting"
                  className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none text-[var(--crm-heading)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Task Description *</label>
                <textarea
                  required
                  rows={3}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Describe task actions, follow-up specifications, and target parameters..."
                  className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none resize-none text-[var(--crm-heading)] font-sans"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Priority *</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none cursor-pointer text-[var(--crm-heading)]"
                  >
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none text-[var(--crm-heading)] cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex space-x-3 pt-3 border-t border-[var(--crm-line)]">
                <button type="submit" className="flex-1 py-2.5 bg-[var(--crm-accent)] text-[var(--crm-bg-sunken)] hover:bg-[var(--crm-accent-soft)] rounded-sm font-bold uppercase tracking-wider transition-colors cursor-pointer">
                  Assign Task
                </button>
                <button type="button" onClick={() => setShowTaskModal(false)} className="flex-1 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] hover:bg-[var(--crm-bg-raised)] rounded-sm text-[var(--crm-ink-soft)] font-bold uppercase tracking-wider transition-colors cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {showInterviewModal && selectedCandidate && (
        <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
          <div className="bg-[var(--crm-bg-raised)] rounded-sm p-6 w-full max-w-md border border-[var(--crm-line)] shadow-2xl text-left overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--crm-line)]">
              <div>
                <h2 className="font-serif text-lg text-[var(--crm-heading)] uppercase tracking-wide">Schedule Panel Panel</h2>
                <p className="text-[10px] text-[var(--crm-ink-faint)] font-mono mt-0.5">CANDIDATE: {selectedCandidate.fullName}</p>
              </div>
              <button onClick={() => setShowInterviewModal(false)} className="text-[var(--crm-ink-faint)] hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleInterviewSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Assigned Interviewer *</label>
                <select
                  required
                  value={interviewForm.interviewerId}
                  onChange={(e) => setInterviewForm({ ...interviewForm, interviewerId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none text-[var(--crm-heading)] cursor-pointer"
                >
                  <option value="" disabled>Select Interviewer/Executive</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp.employeeId}>
                      {emp.fullName} ({emp.employeeId} - {emp.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Date *</label>
                  <input
                    type="date"
                    required
                    value={interviewForm.date}
                    onChange={(e) => setInterviewForm({ ...interviewForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none text-[var(--crm-heading)] cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Time *</label>
                  <input
                    type="time"
                    required
                    value={interviewForm.time}
                    onChange={(e) => setInterviewForm({ ...interviewForm, time: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none text-[var(--crm-heading)] cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Additional Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={interviewForm.notes}
                  onChange={(e) => setInterviewForm({ ...interviewForm, notes: e.target.value })}
                  placeholder="e.g. Focus on Java concepts and communications..."
                  className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none resize-none text-[var(--crm-heading)] font-sans"
                />
              </div>
              <div className="flex space-x-3 pt-3 border-t border-[var(--crm-line)]">
                <button type="submit" className="flex-1 py-2.5 bg-[var(--crm-accent)] text-[var(--crm-bg-sunken)] hover:bg-[var(--crm-accent-soft)] rounded-sm font-bold uppercase tracking-wider transition-colors cursor-pointer">
                  Schedule Panel
                </button>
                <button type="button" onClick={() => setShowInterviewModal(false)} className="flex-1 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] hover:bg-[var(--crm-bg-raised)] rounded-sm text-[var(--crm-ink-soft)] font-bold uppercase tracking-wider transition-colors cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Asset Assign Modal */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
          <div className="bg-[var(--crm-bg-raised)] rounded-sm p-6 w-full max-w-md border border-[var(--crm-line)] shadow-2xl text-left overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--crm-line)]">
              <h2 className="font-serif text-lg text-[var(--crm-heading)] uppercase tracking-wide">Assign Hardware Asset</h2>
              <button onClick={() => setShowAssetModal(false)} className="text-[var(--crm-ink-faint)] hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleAssignAsset} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Select Employee *</label>
                <select
                  required
                  value={assetForm.assignedTo}
                  onChange={(e) => setAssetForm({ ...assetForm, assignedTo: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none text-[var(--crm-heading)] cursor-pointer"
                >
                  <option value="" disabled>Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp.employeeId}>
                      {emp.fullName} ({emp.employeeId})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Asset Name *</label>
                <input
                  type="text"
                  required
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                  placeholder="e.g. ThinkPad L14 Gen 4"
                  className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none text-[var(--crm-heading)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Serial Number *</label>
                <input
                  type="text"
                  required
                  value={assetForm.serial}
                  onChange={(e) => setAssetForm({ ...assetForm, serial: e.target.value })}
                  placeholder="e.g. SN-LPT-88902A"
                  className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none text-[var(--crm-heading)]"
                />
              </div>
              <div className="flex space-x-3 pt-3 border-t border-[var(--crm-line)]">
                <button type="submit" className="flex-1 py-2.5 bg-[var(--crm-accent)] text-[var(--crm-bg-sunken)] hover:bg-[var(--crm-accent-soft)] rounded-sm font-bold uppercase tracking-wider transition-colors cursor-pointer">
                  Assign Asset
                </button>
                <button type="button" onClick={() => setShowAssetModal(false)} className="flex-1 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] hover:bg-[var(--crm-bg-raised)] rounded-sm text-[var(--crm-ink-soft)] font-bold uppercase tracking-wider transition-colors cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PIP Modal */}
      {showPipModal && (
        <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
          <div className="bg-[var(--crm-bg-raised)] rounded-sm p-6 w-full max-w-md border border-[var(--crm-line)] shadow-2xl text-left overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--crm-line)]">
              <h2 className="font-serif text-lg text-[var(--crm-heading)] uppercase tracking-wide">Initiate Performance Improvement Plan (PIP)</h2>
              <button onClick={() => setShowPipModal(false)} className="text-[var(--crm-ink-faint)] hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleAddPip} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Select Employee *</label>
                <select
                  required
                  value={pipForm.employeeId}
                  onChange={(e) => setPipForm({ ...pipForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none text-[var(--crm-heading)] cursor-pointer"
                >
                  <option value="" disabled>Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp.employeeId}>
                      {emp.fullName} ({emp.employeeId})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">PIP Description & Targets *</label>
                <textarea
                  required
                  rows={4}
                  value={pipForm.description}
                  onChange={(e) => setPipForm({ ...pipForm, description: e.target.value })}
                  placeholder="Record improvement parameters, targeted goals, and weekly milestones..."
                  className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-xs outline-none resize-none text-[var(--crm-heading)] font-sans"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={pipForm.startDate}
                    onChange={(e) => setPipForm({ ...pipForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none text-[var(--crm-heading)] cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">End Date *</label>
                  <input
                    type="date"
                    required
                    value={pipForm.endDate}
                    onChange={(e) => setPipForm({ ...pipForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-sm outline-none text-[var(--crm-heading)] cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex space-x-3 pt-3 border-t border-[var(--crm-line)]">
                <button type="submit" className="flex-1 py-2.5 bg-[var(--crm-danger)] hover:bg-red-700 text-white rounded-sm font-bold uppercase tracking-wider transition-colors cursor-pointer">
                  Initiate PIP
                </button>
                <button type="button" onClick={() => setShowPipModal(false)} className="flex-1 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] hover:bg-[var(--crm-bg-raised)] rounded-sm text-[var(--crm-ink-soft)] font-bold uppercase tracking-wider transition-colors cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}