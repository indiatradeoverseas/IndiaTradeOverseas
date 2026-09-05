import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCheckSquare,
  FiCalendar,
  FiList,
  FiClock,
  FiAlertCircle,
  FiUser,
  FiPlus,
  FiTrash2,
  FiInfo,
  FiCheckCircle,
  FiFileText,
  FiShield,
  FiMessageSquare,
  FiAward,
  FiSend,
  FiActivity
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { ticketsApi } from '../../api/tickets';
import { taskApi } from '../../api/task';
import { attendanceApi } from '../../api/attendance';
import { leaveApi } from '../../api/leave';
import { employeesApi } from '../../api/employees';
import { employeeProfileApi } from '../../api/employeeProfile';
import { adminApi } from '../../api/admin';
import { careersApi } from '../../api/careers';

const CARD = { borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)' };
const CARD_SUNKEN = { borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' };

// Motion variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.1 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 18 } }
};

export default function HrExecutiveDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('tasks');

  // Shared state (synchronized with HR Manager Dashboard via local storage)
  const [tasks, setTasks] = useState([]);
  const [interviews, setInterviews] = useState([]);

  // Local state - Daily Checklist
  const [checklist, setChecklist] = useState([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Local state - Documents Verification Telemetry Registry
  const [documentRegistry, setDocumentRegistry] = useState([]);
  const [telemetryFilter, setTelemetryFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'DATE'
  const [telemetryDate, setTelemetryDate] = useState('');

  // Helpdesk Grievance tickets
  const [ticketsList, setTicketsList] = useState([]);
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Selected interview for feedback modal
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [candidateRating, setCandidateRating] = useState(5);
  const [interviewStatus, setInterviewStatus] = useState('PENDING');

  // Schedule Interview Modal state for HR Executive
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedCandidateForSchedule, setSelectedCandidateForSchedule] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    date: '',
    time: '11:00',
    roundName: 'Round 1 - Screening',
    totalRounds: 3,
    meetingLink: '',
    notes: ''
  });

  // New Personal Attendance & Leave states for Executive Role
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState({ remainingLeaves: 4, extraLeavesUsed: 0 });
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [applyFromDate, setApplyFromDate] = useState('');
  const [applyToDate, setApplyToDate] = useState('');
  const [leaveType, setLeaveType] = useState('CASUAL');
  const [leaveReason, setLeaveReason] = useState('');
  const [extraReason, setExtraReason] = useState('');
  const [applyingLeave, setApplyingLeave] = useState(false);

  const fetchPersonalHRData = async () => {
    try {
      const [attToday, attLogs, lvBal, lvLogs, tskList, appsRes] = await Promise.all([
        attendanceApi.getMyToday().catch(() => null),
        attendanceApi.getMyHistory({ limit: 5 }).catch(() => null),
        leaveApi.getMyBalance().catch(() => null),
        leaveApi.getLeaves().catch(() => null),
        taskApi.getTasks().catch(() => null),
        careersApi.getApplications().catch(() => null)
      ]);

      if (attToday && attToday.success) setTodayAttendance(attToday.data.record || attToday.data.attendance);
      if (attLogs && attLogs.success) setAttendanceHistory(attLogs.data.logs || []);
      if (lvBal && lvBal.success) setLeaveBalance(lvBal.data.balance || { remainingLeaves: 4, extraLeavesUsed: 0 });
      if (lvLogs && lvLogs.success) {
        setLeaveHistory(lvLogs.data.leaves || []);
      } else if (Array.isArray(lvLogs)) {
        setLeaveHistory(lvLogs);
      }

      let backendTasks = [];
      if (tskList && tskList.success) {
        backendTasks = (tskList.data.tasks || []).map(t => ({ ...t, isUserBackendTask: true }));
      }

      let candidateTasks = [];
      let extractedInterviews = [];

      if (appsRes && appsRes.success) {
        const mongoApplications = appsRes.data.applications || [];
        mongoApplications.forEach(app => {
          const isCandidateAssigned = isTaskForUser({ assignedTo: app.assignedTo, assignedToName: app.assignedToName }, user);
          
          if (isCandidateAssigned) {
            candidateTasks.push({
              _id: `app_task_${app._id}`,
              id: app._id,
              isApplicationTask: true,
              candidateApp: app,
              title: `Recruitment Lead Review: ${app.fullName} (${app.position})`,
              description: `Assigned candidate lead review & evaluation for ${app.position}. Contact: ${app.phone} | ${app.email}.`,
              dueDate: app.assignedAt || app.appliedAt || new Date().toISOString(),
              priority: app.status === 'PENDING' ? 'HIGH' : 'MEDIUM',
              status: app.status === 'ACCEPTED' || app.status === 'REJECTED' ? 'COMPLETED' : 'PENDING',
              assignedBy: { name: 'HR Manager' },
              category: 'RECRUITMENT'
            });

            // If assigned candidate has NO interviews scheduled yet, add an unscheduled panel item for the Executive
            if (!app.interviews || app.interviews.length === 0) {
              extractedInterviews.push({
                id: `unscheduled_${app._id}`,
                isUnscheduled: true,
                candidateApp: app,
                candidateId: app._id,
                candidateName: app.fullName,
                candidateEmail: app.email,
                position: app.position,
                interviewerId: user?._id || user?.employeeId,
                interviewerName: user?.fullName || user?.name,
                assignedTo: app.assignedTo,
                assignedToName: app.assignedToName,
                status: 'NOT_SCHEDULED'
              });
            }
          }

          if (app.interviews && app.interviews.length > 0) {
            app.interviews.forEach(rnd => {
              const isInterviewer = isInterviewForUser({ interviewerId: rnd.interviewerId, interviewerName: rnd.interviewerName, assignedToName: app.assignedToName }, user);
              if (isInterviewer || isCandidateAssigned) {
                extractedInterviews.push({
                  id: rnd._id || rnd.id,
                  candidateId: app._id,
                  candidateApp: app,
                  interviewId: rnd._id || rnd.id,
                  candidateName: app.fullName,
                  candidateEmail: app.email,
                  position: app.position,
                  interviewerId: rnd.interviewerId,
                  interviewerName: rnd.interviewerName,
                  assignedTo: app.assignedTo,
                  assignedToName: app.assignedToName,
                  date: rnd.scheduledDate || 'TBD',
                  time: rnd.scheduledTime || 'TBD',
                  roundName: rnd.roundName || `Round ${rnd.roundNumber || 1}`,
                  meetingLink: rnd.meetingLink || '',
                  notes: rnd.notes || '',
                  status: rnd.status || 'SCHEDULED',
                  rating: rnd.rating || 5,
                  feedback: rnd.feedback || ''
                });
              }
            });
          }
        });
      }

      setTasks([...backendTasks, ...candidateTasks]);
      setInterviews(extractedInterviews);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const handleSocketTask = () => {
      fetchPersonalHRData();
      fetchRealTelemetry();
      fetchTickets();
    };
    window.addEventListener('task_assigned_event', handleSocketTask);
    window.addEventListener('task_updated_event', handleSocketTask);
    window.addEventListener('document_uploaded_event', handleSocketTask);
    window.addEventListener('ticket_created_event', fetchTickets);
    window.addEventListener('storage', handleSocketTask);
    return () => {
      window.removeEventListener('task_assigned_event', handleSocketTask);
      window.removeEventListener('task_updated_event', handleSocketTask);
      window.removeEventListener('document_uploaded_event', handleSocketTask);
      window.removeEventListener('ticket_created_event', fetchTickets);
      window.removeEventListener('storage', handleSocketTask);
    };
  }, [user]);

  useEffect(() => {
    // Initial checklist items
    if (checklist.length === 0) {
      setChecklist([
        { id: 'item_1', text: 'Audit daily biometric attendance logs', completed: false },
        { id: 'item_2', text: 'Filter new resume submissions from the Careers portal', completed: false },
        { id: 'item_3', text: 'Contact scheduled panel candidates for verification', completed: false },
        { id: 'item_4', text: 'Verify pending documents for newly boarded employees', completed: false },
        { id: 'item_5', text: 'Compile daily recruitment pipeline summaries for Manager review', completed: false }
      ]);
    }

    fetchTickets();
    fetchPersonalHRData();
    fetchRealTelemetry();
  }, [user]);

  const fetchRealTelemetry = async () => {
    try {
      const [empRes, userRes, myDocRes] = await Promise.all([
        employeesApi.getEmployees().catch(() => null),
        adminApi.getUsers().catch(() => null),
        employeeProfileApi.getMyDocuments().catch(() => null)
      ]);

      const empList = empRes?.data?.employees || empRes?.employees || empRes?.data || (Array.isArray(empRes) ? empRes : []);
      const userList = userRes?.data?.users || userRes?.users || userRes?.data || (Array.isArray(userRes) ? userRes : []);
      const myDocsList = myDocRes?.data?.documents || myDocRes?.documents || (Array.isArray(myDocRes) ? myDocRes : []);

      const empsMap = new Map();

      if (user) {
        const uId = String(user._id || user.id || 'me');
        empsMap.set(uId, {
          _id: user._id || user.id,
          employeeId: user.employeeId || 'EMP-ME',
          name: user.fullName || user.name || 'Current User',
          email: user.email,
          department: user.department || 'HR'
        });
      }

      (Array.isArray(empList) ? empList : []).forEach(e => {
        const key = String(e._id || e.employeeId || e.email);
        if (key) {
          empsMap.set(key, { ...e, name: e.name || e.fullName || 'Employee' });
        }
      });

      (Array.isArray(userList) ? userList : []).forEach(u => {
        const key = String(u._id || u.employeeId || u.email);
        if (key && !empsMap.has(key)) {
          empsMap.set(key, { ...u, name: u.fullName || u.name || 'User' });
        }
      });

      const emps = Array.from(empsMap.values());

      const mongoDocsMap = {};

      if (Array.isArray(myDocsList) && myDocsList.length > 0 && user) {
        const myKey = String(user._id || user.id);
        mongoDocsMap[myKey] = myDocsList;
        if (user.employeeId) mongoDocsMap[String(user.employeeId)] = myDocsList;
        if (user.email) mongoDocsMap[user.email.toLowerCase()] = myDocsList;
      }

      await Promise.all(
        emps.map(async (emp) => {
          try {
            const targetId = emp._id || emp.employeeId;
            if (!targetId) return;
            const docRes = await employeeProfileApi.getEmployeeDocuments(targetId);
            if (docRes && docRes.success && Array.isArray(docRes.data?.documents) && docRes.data.documents.length > 0) {
              const docArr = docRes.data.documents;
              mongoDocsMap[String(targetId)] = docArr;
              if (emp.employeeId) mongoDocsMap[String(emp.employeeId)] = docArr;
              if (emp.email) mongoDocsMap[emp.email.toLowerCase()] = docArr;
            }
          } catch (e) {}
        })
      );

      const realDocs = emps.map(emp => {
        const empId = emp.employeeId || emp._id;
        const empEmailLower = (emp.email || '').toLowerCase();
        const empCodeLower = (emp.employeeId || '').toLowerCase();
        const empMongoId = (emp._id || '').toString();

        const dbDocs = mongoDocsMap[empMongoId] || mongoDocsMap[empCodeLower] || mongoDocsMap[empEmailLower] || [];

        const myDocs = [...dbDocs];

        if ((emp.aadhaarCardCopy || emp.aadhaarNumber) && !myDocs.some(d => d.fileName?.toLowerCase().includes('aadhaar'))) {
          myDocs.push({ _id: 'doc_aadhaar', fileName: 'Aadhaar Card Copy', createdAt: emp.updatedAt || emp.createdAt, isSynthetic: true });
        }
        if ((emp.panCardCopy || emp.panCardNumber) && !myDocs.some(d => d.fileName?.toLowerCase().includes('pan'))) {
          myDocs.push({ _id: 'doc_pan', fileName: 'PAN Card Copy', createdAt: emp.updatedAt || emp.createdAt, isSynthetic: true });
        }

        const realUploadedDocs = myDocs.filter(isRealUploadedFile);
        const latestDoc = realUploadedDocs.length > 0 ? realUploadedDocs[0] : null;

        return {
          employeeId: empId,
          fullName: emp.name || emp.fullName,
          department: emp.department || 'GENERAL',
          aadhaarVerified: emp.aadhaarVerified !== undefined ? emp.aadhaarVerified : !!(emp.aadhaarNumber || emp.aadhaarCardCopy),
          panVerified: emp.panVerified !== undefined ? emp.panVerified : !!(emp.panCardNumber || emp.panCardCopy),
          bankVerified: emp.bankVerified !== undefined ? emp.bankVerified : !!(emp.bankAccountNumber || emp.bankName),
          uploadedDocs: myDocs,
          latestDoc: latestDoc
        };
      });

      setDocumentRegistry(realDocs);
    } catch (err) {
      console.error('Error fetching telemetry employees:', err);
    }
  };

function isRealUploadedFile(d) {
  if (!d) return false;
  if (d.isSynthetic) return false;
  const idStr = String(d._id || '');
  if (idStr === 'doc_aadhaar' || idStr === 'doc_pan' || idStr === 'doc_resume' || idStr === 'doc_offer') {
    return false;
  }
  if (!d.createdAt) return false;
  return true;
}

function isSameCalendarDay(dateStr1, dateStr2) {
  if (!dateStr1 || !dateStr2) return false;
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function isDateMatchingPicker(dateStr, yyyyMmDd) {
  if (!dateStr || !yyyyMmDd) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}` === yyyyMmDd;
}

function isEmployeeMatchingFilter(item, filterType, filterDate) {
  if (!item || !item.uploadedDocs) return filterType === 'ALL';
  const realDocs = item.uploadedDocs.filter(isRealUploadedFile);
  if (filterType === 'TODAY') {
    const today = new Date();
    return realDocs.some(d => isSameCalendarDay(d.createdAt, today));
  }
  if (filterType === 'DATE' && filterDate) {
    return realDocs.some(d => isDateMatchingPicker(d.createdAt, filterDate));
  }
  return true;
}

  const handleVerifyDocument = async (employeeId, field) => {
    try {
      const emp = documentRegistry.find(item => item.employeeId === employeeId);
      const currentVal = emp ? emp[field] : false;
      const nextVal = !currentVal;

      setDocumentRegistry(prev => prev.map(item => {
        if (item.employeeId === employeeId) {
          return { ...item, [field]: nextVal };
        }
        return item;
      }));

      // Update directly in MongoDB User & Employee models
      await employeeProfileApi.updateEmployeeProfile(employeeId, { [field]: nextVal }).catch(async () => {
        await employeesApi.updateEmployee(employeeId, { [field]: nextVal }).catch(() => null);
      });

      toast.success(`${field.replace('Verified', '').toUpperCase()} status updated in MongoDB!`);
    } catch (err) {
      console.error('Error saving document verification:', err);
      toast.error('Failed to update verification status in MongoDB');
    }
  };

  const fetchTickets = async () => {
    try {
      const res = await ticketsApi.getTickets().catch(() => null);
      const ticketsFromDb = res?.data?.tickets || res?.tickets || [];
      if (Array.isArray(ticketsFromDb) && ticketsFromDb.length > 0) {
        setTicketsList(ticketsFromDb);
      } else {
        const mockTickets = [
          { _id: 't_1', ticketCode: 'GRI-2026-09', title: 'Salary Discrepancy - Leave Deductions', description: 'My salary check for July had an extra day leave deduction though it was approved.', status: 'OPEN', priority: 'HIGH', createdBy: { fullName: 'Sunil Kumar' }, createdAt: new Date(Date.now() - 86400000).toISOString(), comments: [] },
          { _id: 't_2', ticketCode: 'GRI-2026-10', title: 'Policy Doubt - Paternity Leave', description: 'Seeking details on paid paternity leave durations for new fathers.', status: 'OPEN', priority: 'MEDIUM', createdBy: { fullName: 'Neha Sharma' }, createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), comments: [] }
        ];
        setTicketsList(mockTickets);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveChecklist = (newChecklist) => {
    setChecklist(newChecklist);
  };

  // Clock Actions for HR Executive
  const handleCheckIn = async () => {
    try {
      const res = await attendanceApi.checkIn();
      if (res.success) {
        toast.success('Successfully checked in! ☀️');
        fetchPersonalHRData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    try {
      const res = await attendanceApi.checkOut();
      if (res.success) {
        toast.success('Successfully checked out! 🌙');
        fetchPersonalHRData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    }
  };

  // Leave Submit for HR Executive
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!applyFromDate || !applyToDate || !leaveReason.trim()) {
      return toast.error('Please specify dates and a valid reason.');
    }
    setApplyingLeave(true);
    try {
      const leaveData = { fromDate: applyFromDate, toDate: applyToDate, leaveType, reason: leaveReason };
      const isExtra = leaveBalance.remainingLeaves === 0;
      if (isExtra) {
        if (!extraReason.trim()) {
          setApplyingLeave(false);
          return toast.error('Extra leaves require justificationRemarks');
        }
        leaveData.isExtraLeave = true;
        leaveData.extraLeaveReason = extraReason;
      }
      const res = await leaveApi.applyForLeave(leaveData);
      if (res.success) {
        toast.success('Leave applied successfully!');
        setApplyFromDate('');
        setApplyToDate('');
        setLeaveReason('');
        setExtraReason('');
        fetchPersonalHRData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setApplyingLeave(false);
    }
  };

  // Helper matching functions for tasks & interviews
  const isTaskForUser = (t, currentUser) => {
    if (!currentUser || !t) return false;
    if (t.isUserBackendTask || t.isApplicationTask) return true;

    const uId = String(currentUser._id || currentUser.id || '').toLowerCase();
    const uEmpId = String(currentUser.employeeId || '').toLowerCase();
    const uEmail = String(currentUser.email || '').toLowerCase();
    const uName = String(currentUser.fullName || currentUser.name || '').toLowerCase().trim();

    if (t.assignedTo && typeof t.assignedTo === 'object') {
      const objId = String(t.assignedTo._id || t.assignedTo.id || '').toLowerCase();
      const objEmpId = String(t.assignedTo.employeeId || '').toLowerCase();
      const objEmail = String(t.assignedTo.email || '').toLowerCase();
      const objName = String(t.assignedTo.fullName || t.assignedTo.name || '').toLowerCase().trim();

      if (objId && (objId === uId || objId === uEmpId)) return true;
      if (objEmpId && (objEmpId === uEmpId || objEmpId === uId)) return true;
      if (objEmail && uEmail && objEmail === uEmail) return true;
      if (objName && uName && (objName === uName || objName.includes(uName) || uName.includes(objName))) return true;
    }

    if (t.assignedTo && typeof t.assignedTo !== 'object') {
      const str = String(t.assignedTo).toLowerCase().trim();
      if (str && str !== 'unassigned') {
        if (str === uId || str === uEmpId || (uEmail && str === uEmail)) return true;
        if (uName && (str === uName || str.includes(uName) || uName.includes(str))) return true;
      }
    }

    if (t.assignedToName) {
      const nameStr = String(t.assignedToName).toLowerCase().trim();
      if (uName && (nameStr === uName || nameStr.includes(uName) || uName.includes(nameStr))) return true;
    }

    return false;
  };

  const isInterviewForUser = (i, currentUser) => {
    if (!currentUser || !i) return false;
    const uId = String(currentUser._id || currentUser.id || '').toLowerCase();
    const uEmpId = String(currentUser.employeeId || '').toLowerCase();
    const uName = String(currentUser.fullName || currentUser.name || '').toLowerCase().trim();

    const intId = String(i.interviewerId || '').toLowerCase();
    const intName = String(i.interviewerName || '').toLowerCase().trim();
    const assName = String(i.assignedToName || '').toLowerCase().trim();

    if (intId && (intId === uId || intId === uEmpId)) return true;
    if (intName && uName && (intName === uName || intName.includes(uName) || uName.includes(intName))) return true;
    if (assName && uName && (assName === uName || assName.includes(uName) || uName.includes(assName))) return true;
    return false;
  };

  // Complete tasks (Backend connected)
  const handleToggleTaskStatus = async (taskId, currentStatus, taskObj = null) => {
    if (taskObj && taskObj.isApplicationTask && taskObj.candidateApp) {
      handleOpenFeedback({
        id: taskObj.candidateApp._id,
        candidateId: taskObj.candidateApp._id,
        candidateName: taskObj.candidateApp.fullName,
        position: taskObj.candidateApp.position,
        candidateEmail: taskObj.candidateApp.email,
        status: taskObj.candidateApp.status || 'PENDING',
        feedback: taskObj.candidateApp.feedback || '',
        rating: taskObj.candidateApp.rating || 5
      });
      return;
    }

    const nextStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      const res = await taskApi.updateTaskStatus(taskId, nextStatus, 'Checked from HR Executive Dashboard');
      if (res && res.success) {
        toast.success(nextStatus === 'COMPLETED' ? 'Task marked as Completed! 🎉' : 'Task status restored to Pending');
        fetchPersonalHRData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task status');
    }
  };

  // Filter tasks & interviews for current logged-in employee
  const myTasks = tasks.filter(t => isTaskForUser(t, user));
  const myInterviews = interviews.filter(i => isInterviewForUser(i, user));

  // Checklist items
  const handleToggleChecklist = (id) => {
    const updated = checklist.map(item => {
      if (item.id === id) return { ...item, completed: !item.completed };
      return item;
    });
    saveChecklist(updated);
  };

  const handleAddChecklistItem = (e) => {
    e.preventDefault();
    if (!newChecklistItem.trim()) return;

    const newItem = {
      id: `check_${Date.now()}`,
      text: newChecklistItem.trim(),
      completed: false
    };

    saveChecklist([...checklist, newItem]);
    setNewChecklistItem('');
    toast.success('Checklist operation registered successfully');
  };

  const handleDeleteChecklistItem = (id) => {
    const updated = checklist.filter(item => item.id !== id);
    saveChecklist(updated);
  };

  // Schedule Interview Handlers for HR Executive
  const handleOpenScheduleModal = (candidate) => {
    setSelectedCandidateForSchedule(candidate);
    const existingRoundsCount = candidate.interviews ? candidate.interviews.length : 0;
    const defaultRoundName = existingRoundsCount === 0 
      ? 'Round 1 - Screening' 
      : existingRoundsCount === 1 
      ? 'Round 2 - Technical Interview' 
      : `Round ${existingRoundsCount + 1} - Final Round`;
      
    setScheduleForm({
      date: new Date().toISOString().split('T')[0],
      time: '11:00',
      roundName: defaultRoundName,
      totalRounds: candidate.totalRounds || 3,
      meetingLink: '',
      notes: ''
    });
    setShowScheduleModal(true);
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleForm.date || !scheduleForm.time) {
      return toast.error('Please specify date and time');
    }

    try {
      const interviewDetails = {
        date: scheduleForm.date,
        time: scheduleForm.time,
        interviewerId: user?._id || user?.employeeId,
        interviewerName: user?.fullName || user?.name || 'HR Executive',
        roundName: scheduleForm.roundName,
        totalRounds: Number(scheduleForm.totalRounds || 3),
        meetingLink: scheduleForm.meetingLink ? scheduleForm.meetingLink.trim() : '',
        notes: scheduleForm.notes
      };

      const res = await careersApi.updateApplicationStatus(
        selectedCandidateForSchedule._id || selectedCandidateForSchedule.id,
        'REVIEWED',
        interviewDetails
      );

      if (res && res.success) {
        toast.success(`Interview scheduled successfully for ${selectedCandidateForSchedule.fullName}! 🗓️`);
        setShowScheduleModal(false);
        fetchPersonalHRData();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to schedule interview');
    }
  };

  // Interview actions
  const handleOpenFeedback = (interview) => {
    setSelectedInterview(interview);
    setFeedbackText(interview.feedback || '');
    setCandidateRating(interview.rating || 5);
    setInterviewStatus(interview.status || 'PENDING');
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      return toast.error('Please enter interview remarks');
    }

    try {
      if (selectedInterview.candidateId) {
        const ratingNormalized = candidateRating > 5 ? Math.ceil(candidateRating / 2) : candidateRating;
        const res = await careersApi.submitInterviewFeedback(
          selectedInterview.candidateId,
          selectedInterview.interviewId || selectedInterview.id,
          {
            rating: ratingNormalized,
            status: interviewStatus === 'HELD' ? 'PASSED' : interviewStatus,
            feedback: feedbackText
          }
        );
        if (res && res.success) {
          toast.success(`Interview evaluation saved to MongoDB (${interviewStatus})! 🎯`);
          fetchPersonalHRData();
        }
      }
    } catch (err) {
      console.error('Failed to submit interview feedback:', err);
      toast.error(err.response?.data?.message || 'Error saving interview feedback to MongoDB');
    }

    setSelectedInterview(null);
    fetchPersonalHRData();
  };



  // Support Helpdesk Grievance updates
  const handleUpdateTicketStatus = async (ticketId, status) => {
    try {
      const res = await ticketsApi.updateStatus(ticketId, status).catch(() => null);
      if (res && res.success) {
        toast.success(`Grievance status updated to: ${status}`);
        fetchTickets();
      } else {
        setTicketsList(prev => prev.map(t => t._id === ticketId ? { ...t, status } : t));
        toast.success(`Grievance status updated to: ${status} (Local Sandbox)`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update ticket status');
    }
  };

  const handleAddTicketComment = async (e) => {
    e.preventDefault();
    if (!newTicketMessage.trim() || !selectedTicket) return;

    try {
      const res = await ticketsApi.addComment(selectedTicket._id, newTicketMessage).catch(() => null);
      if (res && res.success) {
        toast.success('Comment logged');
        setNewTicketMessage('');
        fetchTickets();
        // Refresh selected ticket view
        setSelectedTicket(prev => ({
          ...prev,
          comments: [...(prev.comments || []), { senderName: user?.fullName || 'HR Executive', message: newTicketMessage, createdAt: new Date().toISOString() }]
        }));
      } else {
        // Fallback local modification
        const updatedMsg = { senderName: user?.fullName || 'HR Executive', message: newTicketMessage, createdAt: new Date().toISOString() };
        setTicketsList(prev => prev.map(t => {
          if (t._id === selectedTicket._id) {
            return { ...t, comments: [...(t.comments || []), updatedMsg] };
          }
          return t;
        }));
        setSelectedTicket(prev => ({
          ...prev,
          comments: [...(prev.comments || []), updatedMsg]
        }));
        setNewTicketMessage('');
        toast.success('Comment logged (Local Sandbox)');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Statistics
  const pendingTasksCount = myTasks.filter(t => t.status !== 'COMPLETED').length;
  const pendingInterviewsCount = myInterviews.length;
  const checklistCompletionRate = checklist.length > 0
    ? Math.round((checklist.filter(item => item.completed).length / checklist.length) * 100)
    : 0;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8 font-sans antialiased text-[var(--crm-ink-soft)] bg-[var(--crm-bg)] block pb-12 w-full max-w-full overflow-x-hidden"
    >
      {/* Header Panel Option */}
      <motion.div variants={blockVariants} className="w-full border-b border-[var(--crm-line)] py-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="space-y-1 text-left flex-1 min-w-0">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--crm-accent)] font-bold block font-mono">Operations Console</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[var(--crm-heading)] tracking-tight uppercase">HR Executive Dashboard</h1>
          <p className="text-xs text-[var(--crm-ink-faint)] font-light max-w-2xl mt-1">
            Manage your daily tasks, scheduled candidate panels, verify onboarding documents, and resolve internal employee grievances.
          </p>
        </div>

      </motion.div>

      {/* Tabs navigation */}
      <motion.div variants={blockVariants} className="border-b border-[var(--crm-line)] flex overflow-x-auto scrollbar-none w-full max-w-full">
        <nav className="flex space-x-6 min-w-max">
          {[
            { id: 'tasks', label: `My Tasks (${pendingTasksCount})`, icon: FiCheckSquare },
            { id: 'interviews', label: `Interview Board (${pendingInterviewsCount})`, icon: FiCalendar },
            { id: 'telemetry', label: 'Documents Telemetry', icon: FiShield },
            { id: 'helpdesk', label: `Helpdesk Grievances (${ticketsList.filter(t => t.status === 'OPEN').length})`, icon: FiMessageSquare }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 text-[11px] uppercase tracking-widest font-mono font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-[var(--crm-accent)] text-[var(--crm-heading)]'
                  : 'border-transparent text-[var(--crm-ink-faint)] hover:text-[var(--crm-ink-soft)]'
              }`}
            >
              <tab.icon size={13} className={activeTab === tab.id ? 'text-[var(--crm-accent)]' : 'text-inherit'} />
              {tab.label}
            </button>
          ))}
        </nav>
      </motion.div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="space-y-6 text-left"
        >
          {/* MY TASKS PANEL */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div className="bg-[var(--crm-bg-raised)]/20 p-4 border border-[var(--crm-line)] rounded-sm flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold">Assigned Tasks ({myTasks.length})</h3>
                  <p className="text-[11px] text-[var(--crm-ink-faint)] font-light mt-1 font-sans">Review operational directives assigned by the HR Manager.</p>
                </div>
              </div>

              {myTasks.length === 0 ? (
                <div className="bg-[var(--crm-bg-raised)]/10 border border-[var(--crm-line)] py-16 rounded-sm text-center text-xs font-mono uppercase text-[var(--crm-ink-faint)]">
                  No active tasks assigned to you.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {myTasks.map((t, idx) => (
                    <div
                      key={`${t._id || t.id || 'task'}_${idx}`}
                      className={`bg-[var(--crm-bg-raised)]/30 border p-5 rounded-sm shadow-xl flex flex-col justify-between transition-all duration-300 ${
                        t.status === 'COMPLETED'
                          ? 'border-[var(--crm-positive)]/25 opacity-75'
                          : 'border-[var(--crm-line)] hover:border-[var(--crm-accent)]/35'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[9px] font-mono font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider">
                            DUE: {new Date(t.dueDate).toLocaleDateString()}
                          </span>
                          <span className={`text-[8px] font-mono font-bold px-2 py-0.5 border rounded-sm ${
                            t.priority === 'HIGH' ? 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/25' :
                            t.priority === 'LOW' ? 'bg-[var(--crm-info-bg)] text-[var(--crm-info)] border-[var(--crm-info)]/25' :
                            'bg-[var(--crm-warning-bg)] text(--crm-warning) border-[var(--crm-warning)]/25'
                          }`}>
                            {t.priority}
                          </span>
                        </div>
                        <div>
                          <h4 className={`font-serif text-base font-normal leading-tight text-[var(--crm-heading)] ${
                            t.status === 'COMPLETED' ? 'line-through text-[var(--crm-ink-faint)]' : ''
                          }`}>
                            {t.title}
                          </h4>
                          <p className="text-xs font-light text-[var(--crm-ink-soft)] mt-2 italic">"{t.description}"</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[var(--crm-line)] flex items-center justify-between">
                        <span className="text-[10px] text-[var(--crm-ink-faint)] font-mono">BY: {t.assignedBy?.name || t.assignedBy?.fullName || 'HR Manager'}</span>
                        <button
                          onClick={() => handleToggleTaskStatus(t._id || t.id, t.status, t)}
                          className={`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded-sm border transition duration-200 cursor-pointer ${
                            t.status === 'COMPLETED'
                              ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20'
                              : 'bg-[var(--crm-bg)] text-[var(--crm-heading)] border-[var(--crm-line)] hover:bg-[var(--crm-bg-raised)]'
                          }`}
                        >
                          {t.isApplicationTask ? (t.status === 'COMPLETED' ? 'REVIEWED' : 'EVALUATE CANDIDATE') : (t.status === 'COMPLETED' ? 'COMPLETED' : 'MARK COMPLETED')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* INTERVIEWS PANEL */}
          {activeTab === 'interviews' && (
            <div className="space-y-6">
              <div className="bg-[var(--crm-bg-raised)]/20 p-4 border border-[var(--crm-line)] rounded-sm">
                <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold">Candidate Interview Board ({myInterviews.length})</h3>
                <p className="text-[11px] text-[var(--crm-ink-faint)] font-light mt-1 font-sans">Conduct panels, record outcomes, and submit feedback recommendations.</p>
              </div>

              {myInterviews.length === 0 ? (
                <div className="bg-[var(--crm-bg-raised)]/10 border border-[var(--crm-line)] py-16 rounded-sm text-center text-xs font-mono uppercase text-[var(--crm-ink-faint)]">
                  No panels scheduled for your verification.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myInterviews.map((item, idx) => (
                    <div
                      key={`${item.id || 'interview'}_${idx}`}
                      className="bg-[var(--crm-bg-raised)]/30 border border-[var(--crm-line)] p-5 rounded-sm shadow-xl flex flex-col justify-between hover:border-[var(--crm-accent)]/35 transition-all duration-300"
                    >
                      <div className="space-y-3 text-left">
                        <div className="flex justify-between items-center w-full">
                          <span className="text-[10px] font-mono text-[var(--crm-ink-soft)] bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-2.5 py-0.5 rounded-sm">
                            {item.isUnscheduled ? 'Pending Schedule' : `${item.date} @ ${item.time}`}
                          </span>
                          <span className={`text-[9px] font-bold font-mono px-2 py-0.5 border rounded-sm ${
                            item.isUnscheduled ? 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/30 font-bold' :
                            item.status === 'PASSED' || item.status === 'HELD' || item.status === 'COMPLETED' ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20' :
                            item.status === 'FAILED' || item.status === 'CANCELLED' ? 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/20' :
                            'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/20 animate-pulse'
                          }`}>
                            {item.isUnscheduled ? 'NOT SCHEDULED' : item.status}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-serif text-base font-normal text-[var(--crm-heading)]">
                            {item.candidateName}
                          </h4>
                          <p className="text-xs text-[var(--crm-ink-soft)] font-light mt-1">
                            Target Position: <strong className="text-[var(--crm-heading)] font-medium font-mono">{item.position}</strong>
                          </p>
                          <p className="text-[10px] text-[var(--crm-ink-faint)] font-mono mt-0.5">{item.candidateEmail}</p>
                        </div>

                        {item.meetingLink && (
                          <div className="bg-teal-950/40 border border-teal-800/40 p-2.5 rounded-sm text-[11px]">
                            <span className="text-[9px] font-mono font-bold text-teal-400 uppercase block mb-1">📹 Video Conference Link:</span>
                            <a
                              href={item.meetingLink.startsWith('http') ? item.meetingLink : `https://${item.meetingLink}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-teal-300 underline font-mono text-[10px] font-bold break-all hover:text-white"
                            >
                              {item.meetingLink}
                            </a>
                          </div>
                        )}

                        {item.notes && (
                          <div className="bg-[var(--crm-bg-sunken)]/60 border border-[var(--crm-line)] p-2.5 rounded-sm text-[11px]">
                            <span className="text-[9px] font-mono font-bold text-[var(--crm-ink-faint)] uppercase block">Manager Note:</span>
                            <span className="italic">"{item.notes}"</span>
                          </div>
                        )}

                        {item.feedback && (
                          <div className="bg-[var(--crm-positive-bg)] border border-[var(--crm-positive)]/20 p-2.5 rounded-sm text-[11px] text-[var(--crm-positive)]">
                            <span className="text-[9px] font-mono font-bold uppercase block text-[var(--crm-positive)]/80">Submitted Evaluation:</span>
                            <span>"{item.feedback}"</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-5 pt-3.5 border-t border-[var(--crm-line)]">
                        <div className="flex flex-col sm:flex-row gap-2.5">
                          <button
                            onClick={() => handleOpenScheduleModal(item.candidateApp || { _id: item.candidateId, fullName: item.candidateName, position: item.position })}
                            className="flex-1 bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-500/50 py-2.5 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition duration-200 cursor-pointer shadow-md text-center flex items-center justify-center gap-1"
                          >
                            <span>🗓️ {item.isUnscheduled ? 'Schedule Interview' : 'Re-Schedule'}</span>
                          </button>
                          <button
                            onClick={() => handleOpenFeedback(item)}
                            className="flex-1 bg-[var(--crm-heading)] hover:bg-[var(--crm-ink-soft)] text-[var(--crm-bg-sunken)] py-2.5 text-xs font-bold uppercase tracking-wider rounded-sm transition duration-200 cursor-pointer shadow-md text-center"
                          >
                            {item.status === 'PASSED' || item.status === 'FAILED' ? 'Update Log' : 'Conduct & Log Outcome'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DOCUMENTS TELEMETRY PANEL */}
          {activeTab === 'telemetry' && (
            <div className="space-y-6">
              {/* Filter Bar with Today, Calendar Date Picker, and All buttons */}
              <div className="bg-[var(--crm-bg-raised)]/20 p-4 border border-[var(--crm-line)] rounded-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold">Onboarding Documents Verification Telemetry</h3>
                  <p className="text-[11px] text-[var(--crm-ink-faint)] font-light mt-0.5">Cross-check Aadhaar, PAN, and Bank Account records for validation compliance.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  {/* All Records Button */}
                  <button
                    onClick={() => { setTelemetryFilter('ALL'); setTelemetryDate(''); }}
                    className={`px-3 py-1.5 rounded-sm border text-[10px] uppercase font-bold transition-all cursor-pointer ${
                      telemetryFilter === 'ALL'
                        ? 'bg-teal-500/20 text-teal-400 border-teal-500/50 shadow-sm'
                        : 'bg-transparent text-[var(--crm-ink-faint)] border-[var(--crm-line)] hover:text-[var(--crm-heading)]'
                    }`}
                  >
                    All Records ({documentRegistry.length})
                  </button>

                  {/* Today Button */}
                  <button
                    onClick={() => { setTelemetryFilter('TODAY'); setTelemetryDate(''); }}
                    className={`px-3 py-1.5 rounded-sm border text-[10px] uppercase font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      telemetryFilter === 'TODAY'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm'
                        : 'bg-transparent text-[var(--crm-ink-faint)] border-[var(--crm-line)] hover:text-[var(--crm-heading)]'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Today's Uploads ({documentRegistry.filter(i => isEmployeeMatchingFilter(i, 'TODAY', '')).length})
                  </button>

                  {/* Calendar Date Picker Filter */}
                  <div className="flex items-center gap-1.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-2.5 py-1 rounded-sm text-[10px]">
                    <FiCalendar size={12} className="text-teal-400" />
                    <span className="text-[9px] uppercase font-bold text-[var(--crm-ink-faint)]">Calendar:</span>
                    <input
                      type="date"
                      value={telemetryDate}
                      onChange={(e) => {
                        setTelemetryDate(e.target.value);
                        if (e.target.value) setTelemetryFilter('DATE');
                        else setTelemetryFilter('ALL');
                      }}
                      className="bg-transparent text-[var(--crm-heading)] outline-none cursor-pointer font-mono"
                    />
                    {telemetryDate && (
                      <button
                        onClick={() => { setTelemetryDate(''); setTelemetryFilter('ALL'); }}
                        className="text-rose-400 hover:text-rose-300 font-bold ml-1 cursor-pointer"
                        title="Clear date filter"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Document Registry Table */}
              <div className="bg-[var(--crm-bg-raised)]/10 rounded-sm border border-[var(--crm-line)] shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[10px] font-mono uppercase border-b border-[var(--crm-line)]">
                        <th className="py-3.5 px-5">Employee Name & ID</th>
                        <th className="py-3.5 px-5">Department</th>
                        <th className="py-3.5 px-5">Latest Uploaded File & Date</th>
                        <th className="py-3.5 px-5 text-center">Aadhaar Card</th>
                        <th className="py-3.5 px-5 text-center">PAN Card</th>
                        <th className="py-3.5 px-5 text-center">Bank Account details</th>
                        <th className="py-3.5 px-5 text-center">Fulfillment Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--crm-line)] text-xs">
                      {documentRegistry.filter((item) => isEmployeeMatchingFilter(item, telemetryFilter, telemetryDate)).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-xs font-mono text-[var(--crm-ink-faint)] uppercase tracking-wider">
                            {telemetryFilter === 'TODAY'
                              ? "No document uploads recorded today yet. Click 'ALL RECORDS' to view all employee files."
                              : telemetryFilter === 'DATE'
                              ? `No document uploads recorded for ${telemetryDate}. Click 'ALL RECORDS' to clear filter.`
                              : "No employee document records found."}
                          </td>
                        </tr>
                      ) : (
                        documentRegistry.filter((item) => isEmployeeMatchingFilter(item, telemetryFilter, telemetryDate)).map((item, idx) => {
                          const allVerified = item.aadhaarVerified && item.panVerified && item.bankVerified;
                          return (
                            <tr key={`${item.employeeId || 'emp'}_${idx}`} className="hover:bg-[var(--crm-bg-raised)]/40 transition-colors">
                              <td className="py-4 px-5">
                                <div className="font-serif text-sm font-semibold text-[var(--crm-heading)]">{item.fullName}</div>
                                <div className="text-[10px] text-[var(--crm-ink-faint)] font-mono">{item.employeeId}</div>
                              </td>
                              <td className="py-4 px-5 font-mono uppercase font-semibold text-[var(--crm-ink-soft)]">{item.department}</td>
                              
                              {/* Latest Uploaded File & Timestamp */}
                              <td className="py-4 px-5">
                                {item.latestDoc ? (
                                  <div className="space-y-1 text-left">
                                    <div className="font-mono text-xs font-semibold text-emerald-400 flex items-center gap-1.5 truncate max-w-[200px]" title={item.latestDoc.fileName}>
                                      <span>📄</span>
                                      <span className="truncate">{item.latestDoc.fileName}</span>
                                    </div>
                                    <div className="text-[9px] font-mono text-[var(--crm-ink-faint)]">
                                      {item.latestDoc.createdAt ? new Date(item.latestDoc.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently Uploaded'}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-mono text-[var(--crm-ink-faint)] italic">No docs uploaded</span>
                                )}
                              </td>
                              
                              {/* Aadhaar */}
                              <td className="py-4 px-5 text-center">
                                <button
                                  onClick={() => handleVerifyDocument(item.employeeId, 'aadhaarVerified')}
                                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-sm border transition-all ${
                                    item.aadhaarVerified ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20' : 'bg-transparent text-[var(--crm-ink-faint)] border-[var(--crm-line)]'
                                  }`}
                                >
                                  {item.aadhaarVerified ? 'Verified' : 'Verify'}
                                </button>
                              </td>

                              {/* PAN */}
                              <td className="py-4 px-5 text-center">
                                <button
                                  onClick={() => handleVerifyDocument(item.employeeId, 'panVerified')}
                                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-sm border transition-all ${
                                    item.panVerified ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20' : 'bg-transparent text-[var(--crm-ink-faint)] border-[var(--crm-line)]'
                                  }`}
                                >
                                  {item.panVerified ? 'Verified' : 'Verify'}
                                </button>
                              </td>

                              {/* Bank Details */}
                              <td className="py-4 px-5 text-center">
                                <button
                                  onClick={() => handleVerifyDocument(item.employeeId, 'bankVerified')}
                                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-sm border transition-all ${
                                    item.bankVerified ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20' : 'bg-transparent text-[var(--crm-ink-faint)] border-[var(--crm-line)]'
                                  }`}
                                >
                                  {item.bankVerified ? 'Verified' : 'Verify'}
                                </button>
                              </td>

                              {/* Status badge */}
                              <td className="py-4 px-5 text-center">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase border rounded-sm ${
                                  allVerified ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/25' : 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/25'
                                }`}>
                                  {allVerified ? <FiCheckCircle size={10} /> : <FiAlertCircle size={10} />}
                                  {allVerified ? 'VERIFIED' : 'PENDING'}
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
            </div>
          )}

          {/* HELPDESK TICKETS PANEL */}
          {activeTab === 'helpdesk' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[600px]">
              {/* Ticket Cards side scroll */}
              <div className="lg:col-span-5 border border-[var(--crm-line)] bg-[var(--crm-bg-raised)]/10 p-4 rounded-sm overflow-y-auto custom-scrollbar space-y-2 h-[300px] lg:h-full">
                <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--crm-ink-faint)] font-bold mb-4 border-b border-[var(--crm-line)] pb-1.5 flex justify-between items-center">
                  <span>Open Helpdesk Grievances</span>
                  <FiMessageSquare size={12} className="text-[var(--crm-accent)]" />
                </h3>
                {ticketsList.length === 0 ? (
                  <p className="text-xs text-[var(--crm-ink-faint)] text-center py-12 italic font-mono uppercase">No grievances recorded.</p>
                ) : (
                  ticketsList.map((ticket) => (
                    <button
                      key={ticket._id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`w-full text-left p-4 rounded-sm border transition-all duration-150 flex flex-col gap-2 cursor-pointer ${
                        selectedTicket?._id === ticket._id
                          ? 'bg-[var(--crm-bg-raised)] border-[var(--crm-accent)]/55 text-[var(--crm-heading)] shadow-inner'
                          : 'bg-[var(--crm-bg)]/40 border-[var(--crm-line)] text-[var(--crm-ink-soft)] hover:bg-[var(--crm-bg-raised)]/30'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-serif text-sm font-semibold truncate text-[var(--crm-heading)]">{ticket.title || ticket.subject}</span>
                        <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 border rounded-sm uppercase ${
                          ticket.priority === 'HIGH' || ticket.priority === 'URGENT' ? 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/20' : 'bg-transparent text-[var(--crm-ink-faint)] border-[var(--crm-line)]'
                        }`}>
                          {ticket.priority}
                        </span>
                      </div>
                      <p className="text-[10.5px] font-mono text-[var(--crm-ink-faint)] uppercase">CODE: {ticket.ticketCode} | BY: {ticket.createdBy?.fullName || ticket.raisedBy?.fullName || 'Vikram Rathore'}</p>
                      <p className="text-xs text-[var(--crm-ink-soft)] line-clamp-2 italic font-light">"{ticket.description}"</p>
                      <div className="flex justify-between items-center w-full mt-2 border-t border-[var(--crm-line)] pt-2 text-[9px] font-mono text-[var(--crm-ink-faint)]">
                        <span className={`px-2 py-0.5 border rounded-sm font-bold uppercase ${
                          ticket.status === 'RESOLVED' ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20' : 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/20'
                        }`}>
                          {ticket.status}
                        </span>
                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Chat Console Grievance */}
              <div className="lg:col-span-7 border border-[var(--crm-line)] bg-[var(--crm-bg-raised)]/20 rounded-sm overflow-hidden flex flex-col h-[450px] lg:h-full shadow-lg">
                {selectedTicket ? (
                  <>
                    <div className="bg-[var(--crm-bg-sunken)] border-b border-[var(--crm-line)] p-4 flex justify-between items-center text-left shrink-0">
                      <div>
                        <h3 className="font-serif text-sm font-semibold text-[var(--crm-heading)] uppercase tracking-wide">
                          {selectedTicket.title || selectedTicket.subject}
                        </h3>
                        <p className="text-[10px] text-[var(--crm-ink-faint)] font-mono mt-0.5">
                          CODE: {selectedTicket.ticketCode} | Submitter: {selectedTicket.createdBy?.fullName || selectedTicket.raisedBy?.fullName || 'Vikram Rathore'}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {selectedTicket.status !== 'RESOLVED' ? (
                          <button
                            onClick={() => handleUpdateTicketStatus(selectedTicket._id, 'RESOLVED')}
                            className="bg-[var(--crm-positive-bg)] border border-[var(--crm-positive)]/35 text-[var(--crm-positive)] hover:bg-[var(--crm-positive)] hover:text-[var(--crm-bg-sunken)] px-3 py-1.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-md"
                          >
                            Resolve Grievance
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateTicketStatus(selectedTicket._id, 'OPEN')}
                            className="bg-[var(--crm-warning-bg)] border border-[var(--crm-warning)]/35 text-[var(--crm-warning)] hover:bg-[var(--crm-warning)] hover:text-[var(--crm-bg-sunken)] px-3 py-1.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-md"
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Chat Description & Comments */}
                    <div className="flex-1 p-6 overflow-y-auto space-y-4 flex flex-col bg-[var(--crm-bg-sunken)]/20 custom-scrollbar">
                      {/* Original description card */}
                      <div className="bg-[var(--crm-bg)]/60 border border-[var(--crm-line)] p-4 rounded-sm text-left space-y-1.5">
                        <span className="text-[9px] font-mono font-bold text-[var(--crm-ink-faint)] uppercase block">Original Description</span>
                        <p className="text-xs text-[var(--crm-ink-soft)] font-light leading-relaxed">
                          "{selectedTicket.description}"
                        </p>
                      </div>

                      {/* Comments feed */}
                      {selectedTicket.comments && selectedTicket.comments.map((comment, idx) => (
                        <div key={idx} className="flex flex-col items-start animate-fadeIn">
                          <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] mb-1 px-1">
                            {comment.senderName}
                          </span>
                          <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] text-xs text-left p-3.5 rounded-sm max-w-[80%] leading-relaxed shadow-sm">
                            {comment.message}
                          </div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleAddTicketComment} className="p-4 bg-[var(--crm-bg-sunken)] border-t border-[var(--crm-line)] flex items-center space-x-3 shrink-0">
                      <input
                        type="text"
                        value={newTicketMessage}
                        onChange={(e) => setNewTicketMessage(e.target.value)}
                        placeholder="Type response logs or policy recommendations..."
                        className="flex-1 px-4 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] text-xs rounded-sm outline-none text-[var(--crm-heading)] placeholder-[var(--crm-ink-faint)]"
                      />
                      <button
                        type="submit"
                        disabled={!newTicketMessage.trim()}
                        className="p-2.5 rounded-sm bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] hover:bg-[var(--crm-ink-soft)] disabled:opacity-20 disabled:cursor-not-allowed transition duration-150 shadow-md cursor-pointer"
                      >
                        <FiSend size={14} />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                    <FiMessageSquare size={36} className="mb-3 text-[var(--crm-ink-faint)] opacity-60" />
                    <p className="text-[10px] font-mono uppercase tracking-widest font-medium text-[var(--crm-ink-faint)]">Select a grievance case thread to review.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* FEEDBACK & OUTCOME MODAL */}
      {selectedInterview && (
        <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
          <div className="bg-[var(--crm-bg-raised)] rounded-sm p-6 w-full max-w-md border border-[var(--crm-line)] shadow-2xl text-left overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--crm-line)]">
              <div>
                <h2 className="font-serif text-lg text-[var(--crm-heading)] uppercase tracking-wide">Record Interview Outcome</h2>
                <p className="text-[10px] text-[var(--crm-ink-faint)] font-mono mt-0.5">CANDIDATE: {selectedInterview.candidateName}</p>
              </div>
              <button onClick={() => setSelectedInterview(null)} className="text-[var(--crm-ink-faint)] hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleFeedbackSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Interview Outcome Status *</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setInterviewStatus('PASSED')}
                    className={`flex-1 py-2 rounded-sm text-xs font-mono font-bold uppercase transition duration-150 border cursor-pointer ${
                      interviewStatus === 'PASSED'
                        ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/50 shadow-md'
                        : 'bg-transparent text-[var(--crm-ink-faint)] border-[var(--crm-line)] hover:border-white hover:text-white'
                    }`}
                  >
                    Pass
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterviewStatus('FAILED')}
                    className={`flex-1 py-2 rounded-sm text-xs font-mono font-bold uppercase transition duration-150 border cursor-pointer ${
                      interviewStatus === 'FAILED'
                        ? 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/50 shadow-md'
                        : 'bg-transparent text-[var(--crm-ink-faint)] border-[var(--crm-line)] hover:border-white hover:text-white'
                    }`}
                  >
                    Fail
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterviewStatus('PENDING')}
                    className={`flex-1 py-2 rounded-sm text-xs font-mono font-bold uppercase transition duration-150 border cursor-pointer ${
                      interviewStatus === 'PENDING'
                        ? 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/50 shadow-md'
                        : 'bg-transparent text-[var(--crm-ink-faint)] border-[var(--crm-line)] hover:border-white hover:text-white'
                    }`}
                  >
                    Pending
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Candidate Rating (1-10 Scale) *</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={candidateRating}
                    onChange={(e) => setCandidateRating(Number(e.target.value))}
                    className="w-full accent-[var(--crm-accent)] cursor-pointer h-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] rounded-full appearance-none"
                  />
                  <span className="font-mono text-base font-bold text-[var(--crm-accent)] shrink-0 border border-[var(--crm-line)] bg-[var(--crm-bg)] px-2.5 py-1 rounded-sm min-w-[42px] text-center">
                    {candidateRating}/10
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Candidate Remarks & Evaluation *</label>
                <textarea
                  required
                  rows={4}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Record evaluation logs, technical ratings, soft skills performance, and recommendations..."
                  className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-xs outline-none resize-none text-[var(--crm-heading)] font-sans"
                />
              </div>
              <div className="flex space-x-3 pt-3 border-t border-[var(--crm-line)]">
                <button type="submit" className="flex-1 py-2.5 bg-[var(--crm-accent)] text-[var(--crm-bg-sunken)] hover:bg-[var(--crm-accent-soft)] rounded-sm font-bold uppercase tracking-wider transition-colors cursor-pointer">
                  Save Logs
                </button>
                <button type="button" onClick={() => setSelectedInterview(null)} className="flex-1 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] hover:bg-[var(--crm-bg-raised)] rounded-sm text-[var(--crm-ink-soft)] font-bold uppercase tracking-wider transition-colors cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* SCHEDULE INTERVIEW MODAL */}
      {showScheduleModal && selectedCandidateForSchedule && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[80] p-4">
          <div className="bg-[var(--crm-bg-raised)] rounded-xl p-6 w-full max-w-lg border border-purple-500/30 shadow-2xl text-left overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-[var(--crm-ink-soft)]/20">
              <div>
                <h2 className="font-serif text-lg text-[var(--crm-heading)] uppercase tracking-wide flex items-center gap-2">
                  <span>🗓️ Schedule Candidate Interview</span>
                </h2>
                <p className="text-xs text-[var(--crm-ink-faint)] font-mono mt-0.5">
                  CANDIDATE: {selectedCandidateForSchedule.fullName} ({selectedCandidateForSchedule.position})
                </p>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-[var(--crm-ink-faint)] hover:text-white font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1 font-mono">
                  Round Title / Stage Name *
                </label>
                <input
                  type="text"
                  required
                  value={scheduleForm.roundName}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, roundName: e.target.value })}
                  placeholder="e.g. Round 1 - Screening / Technical Round"
                  className="w-full px-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded text-xs text-[var(--crm-heading)] outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1 font-mono">
                    Scheduled Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduleForm.date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded text-xs text-[var(--crm-heading)] outline-none focus:border-purple-500 font-mono cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1 font-mono">
                    Scheduled Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded text-xs text-[var(--crm-heading)] outline-none focus:border-purple-500 font-mono cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1 font-mono">
                  Video Conference Link (Google Meet / Zoom URL)
                </label>
                <input
                  type="url"
                  value={scheduleForm.meetingLink}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, meetingLink: e.target.value })}
                  placeholder="https://meet.google.com/abc-defg-hij or Zoom link"
                  className="w-full px-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded text-xs text-[var(--crm-heading)] outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1 font-mono">
                  Instructions / Manager Remarks
                </label>
                <textarea
                  rows={3}
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  placeholder="Additional context for candidate or panel..."
                  className="w-full px-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded text-xs text-[var(--crm-heading)] outline-none focus:border-purple-500 font-sans resize-none"
                />
              </div>

              <div className="flex space-x-3 pt-3 border-t border-[var(--crm-line)]">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-800 hover:bg-purple-700 text-white rounded font-mono font-bold uppercase tracking-wider transition cursor-pointer shadow-md"
                >
                  Save & Schedule Panel
                </button>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] hover:bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] rounded font-mono font-bold uppercase tracking-wider transition cursor-pointer"
                >
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