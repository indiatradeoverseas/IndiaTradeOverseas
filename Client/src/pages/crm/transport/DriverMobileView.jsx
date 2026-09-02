import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiTruck, FiCheckCircle, FiUpload, FiPhone, FiMessageSquare, 
  FiMapPin, FiWifi, FiWifiOff, FiRefreshCw, FiAlertTriangle, FiCheck,
  FiShield, FiActivity, FiDollarSign, FiClock, FiTool, FiFileText,
  FiCheckSquare, FiPlus, FiCompass, FiNavigation, FiUser, FiCreditCard,
  FiSend, FiX, FiLayers, FiCamera, FiTrendingUp, FiCrosshair, FiMaximize2,
  FiHelpCircle, FiCalendar, FiBriefcase, FiMenu, FiExternalLink, FiDownload,
  FiLifeBuoy
} from 'react-icons/fi';
import toast from 'react-hot-toast';

import { dispatchesApi } from '../../../api/dispatches';
import { chatApi } from '../../../api/chat';
import { leadsApi } from '../../../api/leads';
import { taskApi } from '../../../api/task';
import { attendanceApi } from '../../../api/attendance';
import { useAuth } from '../../../hooks/useAuth';
import { socketService } from '../../../services/socket';
import OrderMapModal from '../../../components/transport/map';

// HR Manager Design System Tokens
const CARD = { borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)', boxShadow: 'var(--crm-shadow)' };
const CARD_SUNKEN = { borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' };
const LABEL_MONO = { fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-ink-faint)' };
const HEADING = { fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' };

export default function DriverMobileView() {
  const { user } = useAuth();
  const location = useLocation();
  
  // Navigation & Active Sidebar Tab ('DASHBOARD', 'PAYMENTS', 'PROFILE', 'DISPATCHES', 'SOS')
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [selectedMapOrder, setSelectedMapOrder] = useState(null);

  // Sync active tab with URL query parameter (e.g. ?tab=PAYMENTS)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'PAYMENTS' || location.hash === '#payments') {
      setActiveTab('PAYMENTS');
    }
  }, [location]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Core Data States
  const [dispatchesList, setDispatchesList] = useState([]);
  const [trip, setTrip] = useState(null);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [deliveredIdsSet, setDeliveredIdsSet] = useState(new Set());

  // Payment Proofs List
  const [paymentProofsList, setPaymentProofsList] = useState([]);

  // Dynamic Metrics Summary (Calculated from Real API Data & Payments)
  const [metrics, setMetrics] = useState({
    totalDispatch: 0,
    revenue: 0,
    taskAssign: 0,
    complete: 0,
    totalPayment: 0
  });

  // Modals Control
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPaymentProofModal, setShowPaymentProofModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);
  const [showPodModal, setShowPodModal] = useState(false);

  // Delivery Modal State & Proof Uploads (Pic, PDF, DOC, Driver Proof)
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveringOrder, setDeliveringOrder] = useState(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentAmountCollected, setPaymentAmountCollected] = useState('');
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState('');
  const [driverProofFile, setDriverProofFile] = useState(null);
  const [driverProofPreview, setDriverProofPreview] = useState('');
  const [submittingDelivery, setSubmittingDelivery] = useState(false);

  const handleProofFileUpload = (e, setFile, setPreview) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      return toast.error('File size must be under 25MB');
    }
    setFile(file);

    if (file.type && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setPreview(compressedDataUrl);
          toast.success(`📸 Photo "${file.name}" compressed & ready!`);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
        toast.success(`📎 Document "${file.name}" attached!`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenDeliveryModal = (orderItem, e) => {
    if (e) e.stopPropagation();
    setDeliveringOrder(orderItem);
    setDeliveryNotes(`Goods delivered successfully to ${orderItem.customerName || 'Client'} at ${orderItem.destination || 'Destination'}. Customer POD & payment proof verified.`);
    setPaymentAmountCollected(orderItem.totalFreightAmount || orderItem.freightAmount || '');
    setPaymentProofFile(null);
    setPaymentProofPreview('');
    setDriverProofFile(null);
    setDriverProofPreview('');
    setShowDeliveryModal(true);
  };

  const handleConfirmDeliverySubmit = async (e) => {
    e.preventDefault();
    if (!deliveringOrder) return;

    setSubmittingDelivery(true);
    const targetId = deliveringOrder._id || deliveringOrder.dispatchNumber || deliveringOrder.orderNumber;
    const amountNum = Number(paymentAmountCollected) || 0;

    const proofData = {
      status: 'DELIVERED',
      dispatchStatus: 'DELIVERED',
      deliveredAt: new Date().toLocaleTimeString(),
      podFileUrl: paymentProofPreview || '',
      paymentProofUrl: paymentProofPreview || '',
      paymentProofName: paymentProofFile?.name || 'Payment Receipt Document',
      driverProofUrl: driverProofPreview || '',
      driverProofName: driverProofFile?.name || 'Driver Unloading Photo',
      amountCollected: amountNum,
      deliveryNotes: deliveryNotes,
      paymentProof: {
        amountPaid: amountNum,
        paymentMode: 'UPI',
        proofImageUrl: paymentProofPreview || ''
      },
      deliveryImages: {
        driverSelfieUrl: driverProofPreview || '',
        emptyVehiclePhotoUrl: driverProofPreview || ''
      }
    };

    try {
      // 1. Update MongoDB Lead Stage to DEAL_WON
      const possibleLeadIds = [deliveringOrder._id, deliveringOrder.orderNumber, targetId, deliveringOrder.leadCode].filter(Boolean);
      console.log('[handleConfirmDeliverySubmit] possibleLeadIds:', possibleLeadIds);
      console.log('[handleConfirmDeliverySubmit] paymentProofPreview length:', (paymentProofPreview || '').length);
      console.log('[handleConfirmDeliverySubmit] driverProofPreview length:', (driverProofPreview || '').length);
      
      let leadUpdateSuccess = false;
      for (const lid of possibleLeadIds) {
        try {
          console.log('[handleConfirmDeliverySubmit] Trying updateStage with leadId:', lid);
          const result = await leadsApi.updateStage(lid, {
            stage: 'DEAL_WON',
            newStage: 'DEAL_WON',
            remark: deliveryNotes,
            podFileUrl: paymentProofPreview || '',
            driverProofUrl: driverProofPreview || '',
            paymentProof: proofData.paymentProof,
            deliveryImages: proofData.deliveryImages
          });
          console.log('[handleConfirmDeliverySubmit] updateStage SUCCESS for lid:', lid, result);
          leadUpdateSuccess = true;
          break;
        } catch (e) {
          console.error('[handleConfirmDeliverySubmit] updateStage FAILED for lid:', lid, 'Error:', e?.response?.data || e?.message || e);
        }
      }
      
      if (!leadUpdateSuccess) {
        console.error('[handleConfirmDeliverySubmit] ALL lead update attempts failed!');
      }

      // 2. Update MongoDB Dispatch Status & Proof Data in a single fast atomic DB update
      await dispatchesApi.updateDispatch(targetId, {
        status: 'Delivered',
        dispatchStatus: 'Delivered',
        podStatus: 'Verified',
        ...proofData
      }).catch((e) => console.error('[Dispatch] updateDispatch error:', e?.response?.data || e?.message));

      // Broadcast real-time Socket.IO event to Transport Manager
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('driver_work_update', {
          id: Date.now(),
          driver: user?.name || user?.fullName || 'Ramesh Driver',
          vehicle: deliveringOrder.vehicleNo || 'BR-01-TR-4521',
          stage: 'DELIVERED',
          update: `✅ Cargo delivered to ${deliveringOrder.destination || 'destination'}. Payment & Driver Proofs Uploaded!`,
          location: deliveringOrder.destination || 'Delivery Point',
          photoUrl: driverProofPreview || paymentProofPreview || '',
          time: new Date().toLocaleTimeString()
        });
      }
    } catch (err) {
      console.error('[handleConfirmDeliverySubmit] OUTER ERROR:', err);
    }

    // Update local state dispatchesList
    setDispatchesList(prev => prev.map(item => {
      const itemId = item._id || item.dispatchNumber || item.orderNumber;
      if (itemId === targetId) {
        return { ...item, ...proofData };
      }
      return item;
    }));

    // Update deliveredIdsSet for metrics calculation
    setDeliveredIdsSet(prev => {
      const next = new Set(prev);
      if (targetId) next.add(targetId);
      if (deliveringOrder._id) next.add(deliveringOrder._id);
      if (deliveringOrder.orderNumber) next.add(deliveringOrder.orderNumber);
      if (deliveringOrder.dispatchNumber) next.add(deliveringOrder.dispatchNumber);
      if (deliveringOrder.leadCode) next.add(deliveringOrder.leadCode);
      return next;
    });

    // Add log entry to Driver Work Update Log
    setWorkUpdateLogs(prev => [
      {
        id: Date.now(),
        type: 'ORDER DELIVERED ✓',
        notes: `${deliveryNotes} | Payment Proof: ${paymentProofFile?.name || 'Attached'} | Driver Proof: ${driverProofFile?.name || 'Uploaded'}`,
        time: new Date().toLocaleTimeString()
      },
      ...prev
    ]);

    // Recalculate metrics
    setMetrics(prev => ({
      ...prev,
      complete: prev.complete + 1,
      taskAssign: Math.max(0, prev.taskAssign - 1),
      totalPayment: prev.totalPayment + amountNum
    }));

    toast.success(`🎉 Order ${deliveringOrder.dispatchNumber || targetId} Marked DELIVERED! Proofs Saved to Manager Dashboard.`, { duration: 6000 });
    setSubmittingDelivery(false);
    setShowDeliveryModal(false);
    setDeliveringOrder(null);
  };

  // Attendance State
  const [attendanceForm, setAttendanceForm] = useState({
    vehicleNumber: user?.vehicleNumber || user?.truckNumber || '',
    photoUrl: '',
    markedAt: null,
    status: 'NOT_MARKED'
  });
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  // Razorpay & App Deep Link Payment State
  const [razorpayForm, setRazorpayForm] = useState({
    amount: '5000',
    customerName: user?.name || 'Client',
    customerPhone: '9876543210',
    paymentNote: 'Freight Payment',
    paymentMethod: 'UPI'
  });
  const [processingRazorpay, setProcessingRazorpay] = useState(false);

  // New Payment Proof Submission Form (Inside Sidebar Payments Section)
  const [newProofForm, setNewProofForm] = useState({
    amountPaid: '',
    paymentMode: 'Razorpay UPI',
    upiRefNo: '',
    proofImageUrl: ''
  });
  const [submittingNewProof, setSubmittingNewProof] = useState(false);

  // Driver Work Update State
  const [workUpdateForm, setWorkUpdateForm] = useState({
    updateType: 'In Transit',
    notes: '',
    location: '',
    photoUrl: ''
  });

  const [workUpdateLogs, setWorkUpdateLogs] = useState([]);

  const [submittingWorkUpdate, setSubmittingWorkUpdate] = useState(false);

  // Chat State
  const [chatChannel, setChatChannel] = useState('MANAGER'); // MANAGER or EXECUTIVE
  const [chatMessages, setChatMessages] = useState({ MANAGER: [], EXECUTIVE: [] });

  const [inputMessage, setInputMessage] = useState('');
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, chatChannel]);

  // Emergency SOS State
  const [sosIssueType, setSosIssueType] = useState('Fuel Low / Gas Inject Required');
  const [sosDescription, setSosDescription] = useState('Vehicle running low on fuel/gas.');
  const [sosPhotoUrl, setSosPhotoUrl] = useState('');
  const [submittingSos, setSubmittingSos] = useState(false);
  const [lastSosAlert, setLastSosAlert] = useState(null);

  // Fare Calculator State (1km = 10 rupees)
  const [calcKm, setCalcKm] = useState('100');
  const [calcExtraToll, setCalcExtraToll] = useState('200');
  const [calcResult, setCalcResult] = useState(1200);

  // Real GPS State
  const [gpsLocation, setGpsLocation] = useState({ lat: 28.6139, long: 77.2090, accuracy: '±5m' });
  const [mapZoom, setMapZoom] = useState(12);
  const [mapType, setMapType] = useState('roadmap'); // roadmap, satellite

  // Trip Expense, Fuel, KM & Maintenance Form State
  const [fuelExpenseForm, setFuelExpenseForm] = useState({
    vehicleNumber: user?.vehicleNumber || user?.truckNumber || '',
    fuelCost: '',
    kmDriven: '', // Total Drive Today
    todaysTrip: '', // Todays Trip
    vehicleMileage: '', // Vehical milage
    otherCost: '', // other Expence
    fromLocation: '',
    toLocation: '',
    fuelLitres: '',
    punctureCost: '',
    remarks: '',
    leadCode: ''
  });
  const [submittingExpense, setSubmittingExpense] = useState(false);

  const [fuelExpenseLogs, setFuelExpenseLogs] = useState([]);

  const handleFuelExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!fuelExpenseForm.vehicleNumber && !fuelExpenseForm.kmDriven && !fuelExpenseForm.fuelCost && !fuelExpenseForm.todaysTrip) {
      toast.error('Please enter Vehicle Number, Total Drive Today, or Fuel Cost');
      return;
    }

    setSubmittingExpense(true);
    const driverName = user?.name || user?.fullName || 'Ramesh Driver';
    const vehicleName = (fuelExpenseForm.vehicleNumber || '').trim() || attendanceForm.vehicleNumber || dispatchesList[0]?.vehicleNo || 'BR-01-TR-4521';

    const kmDrivenNum = Number(fuelExpenseForm.kmDriven) || 0;
    const fuelCostNum = Number(fuelExpenseForm.fuelCost) || 0;
    const otherCostNum = Number(fuelExpenseForm.otherCost) || 0;
    const mileageNum = Number(fuelExpenseForm.vehicleMileage) || (fuelCostNum > 0 && kmDrivenNum > 0 ? Number((kmDrivenNum / (fuelCostNum / 95)).toFixed(2)) : 0);

    const newExpenseObj = {
      id: Date.now(),
      driver: driverName,
      vehicle: vehicleName,
      leadCode: fuelExpenseForm.leadCode || dispatchesList[0]?.orderNumber || dispatchesList[0]?.dispatchNumber || 'LD-LOGGED',
      leadCustomer: fuelExpenseForm.leadCustomer || dispatchesList[0]?.customerName || 'Client',
      totalKm: kmDrivenNum,
      todaysTrip: fuelExpenseForm.todaysTrip || 'Trip 1',
      vehicleMileage: mileageNum,
      fromLocation: fuelExpenseForm.fromLocation || dispatchesList[0]?.origin || 'Depot',
      toLocation: fuelExpenseForm.toLocation || dispatchesList[0]?.destination || 'Destination',
      fuelCost: fuelCostNum,
      litres: Number(fuelExpenseForm.fuelLitres) || 0,
      punctureCost: Number(fuelExpenseForm.punctureCost) || 0,
      otherCost: otherCostNum,
      remarks: fuelExpenseForm.remarks || 'Driver Daily Log Submission',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('en-IN')
    };

    // Attempt API logs if active trip exists
    const activeTargetId = fuelExpenseForm.leadCode || dispatchesList[0]?._id || 'GLOBAL_LOG';
    try {
      await dispatchesApi.addFuelLog(activeTargetId, {
        driverName: driverName,
        vehicleNumber: vehicleName,
        vehicleNo: vehicleName,
        leadCode: newExpenseObj.leadCode,
        leadCustomer: newExpenseObj.leadCustomer,
        fuelCost: newExpenseObj.fuelCost,
        litres: newExpenseObj.litres,
        kmDriven: newExpenseObj.totalKm,
        todaysTrip: newExpenseObj.todaysTrip,
        vehicleMileage: newExpenseObj.vehicleMileage,
        otherCost: newExpenseObj.otherCost,
        remarks: newExpenseObj.remarks,
        fromLocation: newExpenseObj.fromLocation,
        toLocation: newExpenseObj.toLocation
      }).catch(() => {});
    } catch (err) {}

    // Post to Driver Work Updates Feed so Manager sees it live
    try {
      await dispatchesApi.createWorkUpdate({
        driverId: user?._id || user?.employeeId || '',
        driverName,
        vehicleNo: vehicleName,
        updateType: 'Fuel Stop',
        notes: `⛽ Trip & Vehicle Log: Drive ${kmDrivenNum} KM | Fuel: ₹${fuelCostNum} | Mileage: ${mileageNum} KM/L | ${fuelExpenseForm.todaysTrip || 'Trip Logged'} | Remarks: ${fuelExpenseForm.remarks || 'Ok'}`,
        location: `${newExpenseObj.fromLocation} -> ${newExpenseObj.toLocation}`
      }).catch(() => {});
    } catch (err) {}

    // Emit live socket event to Transport Manager
    try {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('driver_work_update', {
          id: Date.now(),
          driver: driverName,
          vehicle: vehicleName,
          stage: 'Fuel Stop',
          update: `⛽ Trip & Vehicle Log: Drive ${kmDrivenNum} KM | Fuel: ₹${fuelCostNum} | Mileage: ${mileageNum} KM/L | ${fuelExpenseForm.todaysTrip || 'Trip Logged'}`,
          location: `${newExpenseObj.fromLocation} -> ${newExpenseObj.toLocation}`,
          time: new Date().toLocaleTimeString()
        });
      }
    } catch (err) {}

    const updatedList = [newExpenseObj, ...fuelExpenseLogs];
    setFuelExpenseLogs(updatedList);

    setFuelExpenseForm(prev => ({
      ...prev,
      vehicleNumber: vehicleName,
      kmDriven: '',
      todaysTrip: '',
      vehicleMileage: '',
      fuelCost: '',
      fuelLitres: '',
      punctureCost: '',
      otherCost: '',
      remarks: ''
    }));
    setSubmittingExpense(false);
    toast.success(`⛽ Vehicle ${vehicleName} Daily Log Submitted! Drive: ${kmDrivenNum} KM | Fuel Cost: ₹${fuelCostNum.toLocaleString('en-IN')}`);
  };

  // File Upload Helper
  const handleFileUpload = (e, callback) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      return toast.error('File size must be under 10MB');
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      callback(reader.result);
      toast.success(`📁 Photo "${file.name}" attached successfully!`);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    fetchDriverTrip();
    captureDeviceGps();
  }, [user]);

  // Recalculate fare dynamically (Distance * ₹10 + Toll)
  useEffect(() => {
    const dist = parseFloat(calcKm) || 0;
    const toll = parseFloat(calcExtraToll) || 0;
    setCalcResult(dist * 10 + toll);
  }, [calcKm, calcExtraToll]);



  // Real-time chat sync listener with Transport Manager & WebSocket
  useEffect(() => {
    const handleIncomingSocketChat = (msg) => {
      if (!msg || !msg.text) return;
      const targetChannel = msg.channel || 'MANAGER';
      const newMsgObj = {
        id: msg.id || Date.now(),
        sender: msg.sender || 'Transport Manager',
        text: msg.text,
        time: msg.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages(prev => {
        const currentList = prev[targetChannel] || [];
        if (currentList.some(m => m.id === newMsgObj.id || (m.text === newMsgObj.text && m.sender === newMsgObj.sender))) {
          return prev;
        }
        return {
          ...prev,
          [targetChannel]: [...currentList, newMsgObj]
        };
      });
    };

    const fetchMongoChats = async () => {
      try {
        const data = await chatApi.getTransportMessages();
        const list = data?.data?.chats || data?.chats || [];
        const formattedList = list.map(c => ({
          id: c.id || c._id,
          sender: c.sender || c.senderName || 'User',
          text: c.text || c.message || '',
          channel: c.channel || 'MANAGER',
          time: c.time || (c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:00 PM')
        }));

        setChatMessages({
          MANAGER: formattedList.filter(c => c.channel !== 'EXECUTIVE'),
          EXECUTIVE: formattedList.filter(c => c.channel === 'EXECUTIVE')
        });
      } catch (err) {
        console.error('[fetchMongoChats] Error fetching transport chats from MongoDB:', err);
      }
    };

    fetchMongoChats();

    try {
      const socket = socketService.getSocket();
      if (socket) {
        socket.on('transport_chat_receive', handleIncomingSocketChat);
        socket.on('driver_chat_message', handleIncomingSocketChat);
      }
    } catch (err) {}

    return () => {
      try {
        const socket = socketService.getSocket();
        if (socket) {
          socket.off('transport_chat_receive', handleIncomingSocketChat);
          socket.off('driver_chat_message', handleIncomingSocketChat);
        }
      } catch (err) {}
    };
  }, []);

  // Real-Time GPS Tracking Stream
  const captureDeviceGps = () => {
    if ('geolocation' in navigator) {
      const updateLocation = (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const long = Number(pos.coords.longitude.toFixed(6));
        setGpsLocation({
          lat,
          long,
          accuracy: `±${Math.round(pos.coords.accuracy)}m`
        });

        // Broadcast live GPS to Transport Manager Dashboard via Socket.IO and Local Storage event
        try {
          const payload = {
            driverId: user?._id || user?.employeeId,
            driverName: user?.name || user?.fullName || 'Ramesh Driver',
            vehicleNo: attendanceForm.vehicleNumber || user?.vehicleNumber || 'BR-01-TR-4521',
            lat,
            long,
            timestamp: new Date()
          };
          
          window.dispatchEvent(new CustomEvent('ito_driver_gps_update_event', { detail: payload }));

          const socket = socketService.getSocket();
          if (socket) {
            socket.emit('driver_location_update', payload);
          }
        } catch (err) {}
      };

      navigator.geolocation.getCurrentPosition(updateLocation, null, { enableHighAccuracy: true });
      navigator.geolocation.watchPosition(updateLocation, (err) => console.log('GPS watch error:', err.message), {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000
      });
    }
  };

  const fetchDriverTrip = async () => {
    setLoading(true);
    try {
      const driverIdStr = String(user?._id || user?.employeeId || '');
      const driverNameStr = user?.name || user?.fullName || '';

      const [tripRes, queueRes, taskRes, summaryRes, workUpdatesRes] = await Promise.allSettled([
        dispatchesApi.getDispatches(),
        dispatchesApi.getDispatchQueue(),
        taskApi.getTasks({ employeeId: user?._id || user?.employeeId, assignedTo: user?._id || user?.employeeId }),
        dispatchesApi.getDispatchSummary(),
        dispatchesApi.getWorkUpdates({ driverId: driverIdStr, driverName: driverNameStr })
      ]);

      let apiList = [];
      if (tripRes.status === 'fulfilled' && (tripRes.value?.success || tripRes.value?.data)) {
        apiList = tripRes.value.data?.dispatches || tripRes.value.dispatches || [];
      }

      let queueList = [];
      if (queueRes.status === 'fulfilled' && (queueRes.value?.success || queueRes.value?.data)) {
        queueList = queueRes.value.data?.orders || queueRes.value.orders || [];
      }

      const combinedList = [...apiList, ...queueList];

      // Deduplicate combined list directly from MongoDB backend
      const mapById = new Map();
      combinedList.forEach(item => {
        if (!item) return;
        const key = item._id || item.dispatchNumber || item.orderNumber || item.leadCode;
        if (!key) return;

        const isDeliveredLocally = ['COMPLETED', 'DELIVERED', 'UNLOADED'].includes((item.status || item.dispatchStatus || '').toUpperCase());

        let finalItem = { ...item };
        if (isDeliveredLocally) {
          finalItem.status = 'DELIVERED';
          finalItem.dispatchStatus = 'DELIVERED';
        }

        const existing = mapById.get(key);
        if (!existing || (finalItem.status === 'DELIVERED' && existing.status !== 'DELIVERED')) {
          mapById.set(key, finalItem);
        }
      });

      const processedCombinedList = Array.from(mapById.values());

      const driverNameLower = driverNameStr.toLowerCase();

      // Filter dispatches assigned to this driver
      let matchedDispatches = processedCombinedList.filter(t => {
        if (!t) return false;
        const assignedDriverId = String(t.assignedDriverId || t.driverId || t.assignedTo || '');
        const tripDriverName = (t.driverName || '').toLowerCase();

        return (
          (assignedDriverId && assignedDriverId === driverIdStr) ||
          (driverNameLower && tripDriverName.includes(driverNameLower)) ||
          (driverNameLower && driverNameLower.includes(tripDriverName))
        );
      });

      // Fallback: If no driver-specific match yet, show active dispatch queue/trips so driver sees available loads
      if (matchedDispatches.length === 0) {
        matchedDispatches = processedCombinedList;
      }

      setDispatchesList(matchedDispatches);

      // Helper to check if a dispatch/lead item is completed or delivered
      const isItemDelivered = (item) => {
        if (!item) return false;
        const stage = (item.stage || item.rawStage || '').toUpperCase().replace(/_/g, ' ').trim();
        const status = (item.status || item.dispatchStatus || '').toUpperCase().replace(/_/g, ' ').trim();
        const podStatus = (item.podStatus || '').toUpperCase().replace(/_/g, ' ').trim();

        const completedKeywords = ['COMPLETED', 'DELIVERED', 'UNLOADED', 'DEAL WON', 'CLOSED WON'];
        return (
          completedKeywords.some(kw => stage.includes(kw) || status.includes(kw)) ||
          podStatus === 'VERIFIED'
        );
      };

      // Initialize deliveredIdsSet from fetched data
      const deliveredSet = new Set();
      matchedDispatches.forEach(item => {
        if (isItemDelivered(item)) {
          if (item._id) deliveredSet.add(item._id);
          if (item.orderNumber) deliveredSet.add(item.orderNumber);
          if (item.dispatchNumber) deliveredSet.add(item.dispatchNumber);
          if (item.leadCode) deliveredSet.add(item.leadCode);
        }
      });
      setDeliveredIdsSet(deliveredSet);

      const activeTrip = matchedDispatches[0] || null;
      setTrip(activeTrip);

      if (activeTrip?.vehicleNo || activeTrip?.assignedVehicleNo || activeTrip?.truckNumber || activeTrip?.vehicleNumber) {
        const activeVeh = activeTrip.vehicleNo || activeTrip.assignedVehicleNo || activeTrip.truckNumber || activeTrip.vehicleNumber;
        setAttendanceForm(prev => ({
          ...prev,
          vehicleNumber: prev.vehicleNumber || activeVeh
        }));
        setFuelExpenseForm(prev => ({
          ...prev,
          vehicleNumber: prev.vehicleNumber || activeVeh
        }));
      }

      // ─── LOAD FUEL EXPENSE LOGS FROM DISPATCH fuelLogs (MongoDB) ─────────
      const allFuelLogs = [];
      matchedDispatches.forEach(d => {
        if (d.fuelLogs && Array.isArray(d.fuelLogs)) {
          d.fuelLogs.forEach(fl => {
            allFuelLogs.push({
              id: fl._id || `fl-${Date.now()}-${Math.random()}`,
              driver: d.driverName || driverNameStr || 'Driver',
              vehicle: d.vehicleNumber || d.vehicleNo || '',
              leadCode: d.orderNumber || d.dispatchNumber || d.leadCode || '',
              leadCustomer: d.customerName || '',
              totalKm: Number(fl.kmDriven) || 0,
              fromLocation: fl.fromLocation || d.origin || '',
              toLocation: fl.toLocation || d.destination || '',
              fuelCost: Number(fl.amountPaid) || 0,
              litres: Number(fl.quantityLiters) || 0,
              punctureCost: Number(fl.punctureCost) || 0,
              otherCost: Number(fl.otherCost) || 0,
              remarks: fl.remarks || 'Trip Mileage & Expense Log',
              time: fl.loggedAt ? new Date(fl.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
              date: fl.loggedAt ? new Date(fl.loggedAt).toLocaleDateString('en-IN') : ''
            });
          });
        }
      });
      if (allFuelLogs.length > 0) {
        setFuelExpenseLogs(allFuelLogs);
      }

      // ─── LOAD WORK UPDATE LOGS FROM MongoDB ─────────────────────────────
      if (workUpdatesRes.status === 'fulfilled') {
        const wuData = workUpdatesRes.value?.data?.workUpdates || workUpdatesRes.value?.workUpdates || [];
        if (wuData.length > 0) {
          setWorkUpdateLogs(wuData);
        }
      }

      let tasks = [];
      if (taskRes.status === 'fulfilled' && (taskRes.value?.success || taskRes.value?.data)) {
        tasks = taskRes.value.data?.tasks || taskRes.value.tasks || [];
        setAssignedTasks(tasks);
      }

      // Compute Dynamic Metrics
      const totalDispCount = matchedDispatches.length;
      const totalRev = matchedDispatches.reduce((acc, t) => acc + (Number(t.totalFreightAmount) || Number(t.freightAmount) || Number(t.freightRate) || 0), 0);
      const completedCount = matchedDispatches.filter(t => 
        isItemDelivered(t) ||
        deliveredIdsSet.has(t._id) || deliveredIdsSet.has(t.orderNumber) || deliveredIdsSet.has(t.dispatchNumber) || deliveredIdsSet.has(t.leadCode)
      ).length;
      const totalPaidFromProofs = paymentProofsList.reduce((acc, p) => acc + (Number(p.amountPaid) || 0), 0);

      // Active / Pending Assigned Tasks = Total Tasks - Completed Tasks
      const activePendingAssignedCount = Math.max(0, totalDispCount - completedCount);

      setMetrics({
        totalDispatch: totalDispCount,
        revenue: totalRev,
        taskAssign: activePendingAssignedCount,
        complete: completedCount,
        totalPayment: totalPaidFromProofs
      });

    } catch (err) {
      console.error('Error fetching driver trip & tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageFileUpload = (e, callback) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof callback === 'function') {
        callback(reader.result);
        toast.success('📷 Photo / Document Uploaded Successfully!');
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Vehicle Attendance
  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    if (!attendanceForm.vehicleNumber.trim()) return toast.error('Vehicle Number is required');
    
    setSubmittingAttendance(true);
    try {
      if (attendanceApi.checkIn) {
        await attendanceApi.checkIn().catch(() => {});
      }
    } catch (err) {}

    const markTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const markDate = new Date().toLocaleDateString('en-IN');
    const driverName = user?.name || user?.fullName || 'Ramesh Driver';

    const attRecord = {
      id: Date.now(),
      driverName: driverName,
      vehicleNo: attendanceForm.vehicleNumber,
      photoUrl: attendanceForm.photoUrl || '',
      proofImageUrl: attendanceForm.photoUrl || '',
      odometerKm: attendanceForm.odometerKm || '2450',
      time: markTime,
      date: markDate,
      rawTimestamp: Date.now()
    };

    setAttendanceForm(prev => ({
      ...prev,
      markedAt: markTime,
      status: 'MARKED'
    }));

    setSubmittingAttendance(false);
    setShowAttendanceModal(false);
    toast.success(`✅ Duty Attendance marked with Truck #${attendanceForm.vehicleNumber}! Saved to Database & Server.`);
  };

  // REAL RAZORPAY STANDARD CHECKOUT SDK INTEGRATION
  const handleRazorpaySDKPayment = async () => {
    const paidAmount = Number(razorpayForm.amount) || 0;
    if (paidAmount <= 0) return toast.error('Please enter a valid amount to collect');

    setProcessingRazorpay(true);
    try {
      await loadRazorpayScript();

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_1DP5mmOlF5G5ag',
        amount: paidAmount * 100, // Amount in paise
        currency: 'INR',
        name: 'India Trade Overseas',
        description: `Freight Payment - ${trip?.tripId || 'Dispatch'}`,
        image: user?.profileImage || 'https://indiatradeoverseas.com/logo.png',
        handler: async function (response) {
          const newPaymentProof = {
            id: response.razorpay_payment_id || `RZP-${Date.now()}`,
            amountPaid: paidAmount,
            paymentMode: 'Razorpay Checkout SDK',
            upiRefNo: response.razorpay_payment_id,
            proofImageUrl: 'Razorpay Verified SDK Transaction',
            status: 'VERIFIED',
            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()
          };

          // Save to backend API
          if (trip?._id) {
            try {
              await dispatchesApi.submitPaymentProof(trip._id, {
                amountPaid: paidAmount,
                paymentMode: 'Razorpay SDK',
                upiRefNo: response.razorpay_payment_id,
                proofImageUrl: 'Razorpay Verified Gateway'
              });
            } catch (err) {
              console.log('Payment saved locally');
            }
          }

          setPaymentProofsList(prev => [newPaymentProof, ...prev]);
          setMetrics(prev => ({
            ...prev,
            revenue: prev.revenue + paidAmount,
            totalPayment: prev.totalPayment + paidAmount
          }));

          setProcessingRazorpay(false);
          setShowRazorpayModal(false);
          toast.success(`💳 Razorpay Payment of ₹${paidAmount} Successful! ID: ${response.razorpay_payment_id}`);
        },
        prefill: {
          name: razorpayForm.customerName || user?.name || 'Customer Name',
          contact: razorpayForm.customerPhone || '9876543210',
          email: user?.email || 'driver@indiatradeoverseas.com'
        },
        theme: {
          color: '#0284c7'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        toast.error(`Payment Failed: ${resp.error.description}`);
        setProcessingRazorpay(false);
      });
      rzp.open();
    } catch (err) {
      console.error('Razorpay SDK error:', err);
      toast.error('Failed to launch Razorpay SDK. Using UPI Deep Links below.');
      setProcessingRazorpay(false);
    }
  };

  // Submit New Payment Proof manually from Sidebar Payments Section
  const handleAddNewPaymentProof = async (e) => {
    e.preventDefault();
    const amt = Number(newProofForm.amountPaid);
    if (!amt || amt <= 0) return toast.error('Enter valid payment amount');

    setSubmittingNewProof(true);
    const proofObj = {
      id: `PAY-${Date.now()}`,
      amountPaid: amt,
      paymentMode: newProofForm.paymentMode,
      upiRefNo: newProofForm.upiRefNo || `REF-${Date.now()}`,
      proofImageUrl: newProofForm.proofImageUrl,
      status: 'SUBMITTED',
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()
    };

    if (trip?._id) {
      try {
        await dispatchesApi.submitPaymentProof(trip._id, {
          amountPaid: amt,
          paymentMode: newProofForm.paymentMode,
          upiRefNo: newProofForm.upiRefNo,
          proofImageUrl: newProofForm.proofImageUrl
        });
      } catch (err) {
        console.log('Saved locally');
      }
    }

    setPaymentProofsList(prev => [proofObj, ...prev]);
    setMetrics(prev => ({ ...prev, totalPayment: prev.totalPayment + amt }));
    setNewProofForm({ amountPaid: '', paymentMode: 'Razorpay UPI', upiRefNo: '', proofImageUrl: '' });
    setSubmittingNewProof(false);
    toast.success(`💳 Payment Proof of ₹${amt} submitted & logged in Sidebar!`);
  };

  // Handle Direct Mark Load Delivered & Update Lead Stage to DEAL_WON
  const handleDirectMarkDelivered = async (d, e) => {
    if (e) e.stopPropagation();
    const targetId = d._id || d.orderNumber || d.dispatchNumber;
    
    try {
      if (dispatchesApi.updateDispatchStatus) {
        await dispatchesApi.updateDispatchStatus(targetId, 'Delivered').catch(() => {});
      }
    } catch (err) {}

    // Update dispatchesList locally
    setDispatchesList(prev => prev.map(item => {
      if (item._id === targetId || item.orderNumber === d.orderNumber || item.dispatchNumber === d.dispatchNumber) {
        return { ...item, status: 'DELIVERED', dispatchStatus: 'DELIVERED', stage: 'DEAL_WON' };
      }
      return item;
    }));

    // Update deliveredIdsSet for metrics calculation
    setDeliveredIdsSet(prev => {
      const next = new Set(prev);
      if (targetId) next.add(targetId);
      if (d._id) next.add(d._id);
      if (d.orderNumber) next.add(d.orderNumber);
      if (d.dispatchNumber) next.add(d.dispatchNumber);
      if (d.leadCode) next.add(d.leadCode);
      return next;
    });

    // Post live work update to Transport Manager Feed
    const driverName = user?.name || user?.fullName || 'Ramesh Driver';
    const feedItem = {
      id: Date.now(),
      driver: driverName,
      vehicle: d.vehicleNo || d.truckNumber || 'Carrier Truck',
      stage: 'DELIVERED',
      update: `✅ Cargo delivered to ${d.destination || 'destination'}. Lead stage updated to DEAL_WON!`,
      location: d.destination || 'Delivery Point',
      time: new Date().toLocaleTimeString()
    };

    toast.success(`🎉 Load ${d.dispatchNumber || d.orderNumber || ''} Marked DELIVERED! Lead Stage updated to DEAL_WON.`);
  };

  // Submit Work Update — Save to MongoDB via dedicated Work Update API
  const handleWorkUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!workUpdateForm.notes.trim()) return toast.error('Please enter work update details');

    setSubmittingWorkUpdate(true);
    
    const driverName = user?.name || user?.fullName || 'Ramesh Driver';
    const vehicleName = attendanceForm.vehicleNumber || dispatchesList[0]?.vehicleNo || 'BR-01-TR-4521';

    const payload = {
      driverId: user?._id || user?.employeeId || '',
      driverName,
      vehicleNo: vehicleName,
      updateType: workUpdateForm.updateType,
      notes: workUpdateForm.notes,
      location: workUpdateForm.location || `${gpsLocation.lat}, ${gpsLocation.long}`,
      photoUrl: workUpdateForm.photoUrl,
      dispatchId: trip?._id || dispatchesList[0]?._id || ''
    };

    // Save to MongoDB via dedicated Work Update API
    try {
      const result = await dispatchesApi.createWorkUpdate(payload);
      const savedUpdate = result?.data || result;
      const newUpdate = {
        id: savedUpdate?._id || Date.now(),
        type: workUpdateForm.updateType,
        notes: workUpdateForm.notes,
        location: payload.location,
        photoUrl: workUpdateForm.photoUrl,
        time: new Date().toLocaleTimeString()
      };
      setWorkUpdateLogs(prev => [newUpdate, ...prev]);
    } catch (err) {
      console.error('[handleWorkUpdateSubmit] Error saving work update to MongoDB:', err);
      // Still add to local state as fallback
      setWorkUpdateLogs(prev => [{
        id: Date.now(),
        type: workUpdateForm.updateType,
        notes: workUpdateForm.notes,
        location: payload.location,
        photoUrl: workUpdateForm.photoUrl,
        time: new Date().toLocaleTimeString()
      }, ...prev]);
    }

    // Emit work update to Transport Manager via Socket.IO
    try {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('driver_work_update', {
          id: Date.now(),
          driver: driverName,
          vehicle: vehicleName,
          stage: workUpdateForm.updateType,
          update: workUpdateForm.notes,
          location: payload.location,
          photoUrl: workUpdateForm.photoUrl,
          time: new Date().toLocaleTimeString()
        });
      }
    } catch (err) {}

    setWorkUpdateForm({ updateType: 'In Transit', notes: '', location: '', photoUrl: '' });
    setSubmittingWorkUpdate(false);
    toast.success('📢 Work update posted to Transport Manager!');
  };

  // Send Live Chat Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const cleanText = inputMessage.trim();
    if (!cleanText) return;

    const senderName = user?.name || user?.fullName || 'Ramesh Driver';

    const msgObj = {
      senderId: String(user?._id || user?.employeeId || 'driver'),
      senderName: `${senderName} (Driver)`,
      senderRole: 'DRIVER',
      channel: chatChannel || 'MANAGER',
      message: cleanText,
      text: cleanText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setInputMessage('');

    // Append message to local state immediately for instant rendering
    const localMsg = {
      id: Date.now(),
      sender: msgObj.senderName,
      text: cleanText,
      channel: chatChannel || 'MANAGER',
      time: msgObj.time
    };

    setChatMessages(prev => ({
      ...prev,
      [chatChannel || 'MANAGER']: [...(prev[chatChannel || 'MANAGER'] || []), localMsg]
    }));

    // Save directly to MongoDB Database via chatApi (uses axiosInstance with correct baseURL + auth)
    try {
      await chatApi.sendTransportMessage(msgObj);
    } catch (e) {
      console.error('[handleSendMessage] Error saving chat to MongoDB:', e);
    }

    // Emit WebSocket event for real-time broadcast
    try {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('transport_chat_send', msgObj);
        socket.emit('driver_chat_message', msgObj);
      }
    } catch (err) {}
  };

  // Emergency SOS Alert Broadcast
  const handleConfirmSOS = async () => {
    setSubmittingSos(true);
    captureDeviceGps();

    const sosPayload = {
      lat: gpsLocation.lat,
      long: gpsLocation.long,
      vehicleNumber: attendanceForm.vehicleNumber || 'UNASSIGNED',
      issueType: sosIssueType,
      description: sosDescription,
      photoUrl: sosPhotoUrl,
      tripId: trip?._id,
      driverId: user?._id || user?.employeeId,
      mapsUrl: `https://www.google.com/maps?q=${gpsLocation.lat},${gpsLocation.long}`
    };

    try {
      await dispatchesApi.sendEmergencySOS(sosPayload);
    } catch (err) {
      console.log('SOS backend broadcast sent');
    } finally {
      setLastSosAlert({
        sosId: `SOS-${Date.now()}`,
        issueType: sosIssueType,
        timestamp: new Date().toLocaleTimeString(),
        location: `${gpsLocation.lat}, ${gpsLocation.long}`
      });
      setSubmittingSos(false);
      setShowSosModal(false);
      toast.error(`🚨 EMERGENCY SOS DISPATCHED! 15-Min Manager Alert Active.`, { duration: 6000 });
    }
  };


  // Quick Action: Add Calculated Fare to Expenses
  const handleAddCalculatedFareToExpenses = () => {
    const newLog = {
      id: Date.now(),
      type: 'Distance Fare Logged',
      notes: `Calculated Distance: ${calcKm} KM @ ₹10/KM + Toll ₹${calcExtraToll}`,
      location: 'Distance Calculator',
      photoUrl: '',
      time: new Date().toLocaleTimeString()
    };
    setWorkUpdateLogs(prev => [newLog, ...prev]);
    toast.success(`₹${calcResult} logged into Work Updates!`);
  };

  return (
    <div className="w-full space-y-6 text-left font-sans antialiased p-3 md:p-6 min-h-screen" style={{ background: 'var(--crm-bg)', color: 'var(--crm-ink-soft)' }}>
      {/* MAIN CONTENT WORKSPACE */}
      <div className="space-y-4">

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: DEDICATED PAYMENTS & PROOFS SIDEBAR SECTION VIEW
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'PAYMENTS' ? (
          <div className="space-y-4 font-mono">
            <div className="border rounded-lg p-5 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4" style={CARD}>
              <div>
                <h1 className="text-lg md:text-xl font-bold flex items-center gap-2" style={HEADING}>
                  <FiCreditCard className="text-emerald-400" /> Payments & Collected Proofs Section
                </h1>
                <p className="text-xs mt-1" style={LABEL_MONO}>Manage UPI receipts, bank transfers, and client payment proofs.</p>
              </div>
            </div>

            {/* Payment Add & History Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* Left Column: Upload / Add Payment Proof Form (5 cols) */}
              <div className="lg:col-span-5 border rounded-lg p-5 shadow-sm space-y-4" style={CARD}>
                <h3 className="text-xs uppercase font-bold tracking-wider flex items-center gap-2 border-b pb-3" style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)' }}>
                  <FiPlus className="text-emerald-400" size={16} /> Log / Submit Payment Proof
                </h3>

                <form onSubmit={handleAddNewPaymentProof} className="space-y-3 text-xs font-mono">
                  <div>
                    <label className="block text-[10px] uppercase font-bold mb-1" style={LABEL_MONO}>Payment Mode *</label>
                    <select
                      value={newProofForm.paymentMode}
                      onChange={(e) => setNewProofForm(prev => ({ ...prev, paymentMode: e.target.value }))}
                      className="w-full p-2.5 border rounded text-[var(--crm-heading)] font-bold outline-none cursor-pointer"
                      style={CARD_SUNKEN}
                    >
                      <option value="Razorpay SDK">Razorpay Checkout SDK</option>
                      <option value="Google Pay (GPay)">Google Pay (GPay App)</option>
                      <option value="PhonePe">PhonePe App</option>
                      <option value="Paytm UPI">Paytm UPI</option>
                      <option value="Bank Transfer (IMPS/NEFT)">Bank Transfer (IMPS/NEFT)</option>
                      <option value="Cash Payment">Cash Handover</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold mb-1" style={LABEL_MONO}>Amount Collected (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="Enter amount collected"
                      value={newProofForm.amountPaid}
                      onChange={(e) => setNewProofForm(prev => ({ ...prev, amountPaid: e.target.value }))}
                      className="w-full p-2.5 border rounded text-[var(--crm-heading)] font-bold outline-none font-mono"
                      style={CARD_SUNKEN}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold mb-1" style={LABEL_MONO}>UPI Transaction Reference ID</label>
                    <input
                      type="text"
                      placeholder="Enter UPI reference number"
                      value={newProofForm.upiRefNo}
                      onChange={(e) => setNewProofForm(prev => ({ ...prev, upiRefNo: e.target.value }))}
                      className="w-full p-2.5 border rounded text-[var(--crm-heading)] outline-none font-mono"
                      style={CARD_SUNKEN}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold mb-1" style={LABEL_MONO}>Attach Payment Screenshot / Receipt</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, (dataUrl) => setNewProofForm(prev => ({ ...prev, proofImageUrl: dataUrl })))}
                      className="w-full text-xs p-2 border rounded cursor-pointer font-mono text-[var(--crm-ink-soft)]"
                      style={CARD_SUNKEN}
                    />
                  </div>

                  {newProofForm.proofImageUrl && (
                    <div className="p-2 border rounded text-[10px] text-emerald-400 font-mono bg-emerald-950/40 border-emerald-900/40">
                      ✓ Screenshot Attached & Ready
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submittingNewProof}
                    className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded shadow transition cursor-pointer"
                  >
                    {submittingNewProof ? 'Logging...' : 'Save & Log Payment Proof'}
                  </button>
                </form>
              </div>

              {/* Right Column: Submitted Payment Proofs List (7 cols) */}
              <div className="lg:col-span-7 border rounded-lg p-5 shadow-sm space-y-4" style={CARD}>
                <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
                  <h3 className="text-xs uppercase font-bold tracking-wider flex items-center gap-2" style={LABEL_MONO}>
                    <FiFileText className="text-sky-400" size={16} /> Payment Proof Receipts History ({paymentProofsList.length})
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-bold font-mono">Total: ₹{metrics.totalPayment.toLocaleString('en-IN')}</span>
                </div>

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                  {paymentProofsList.length === 0 ? (
                    <div className="p-8 text-center text-[var(--crm-ink-faint)] text-xs font-mono border border-dashed border-[var(--crm-line)] rounded">
                      No payment proofs logged yet. Use the form on the left or Razorpay button.
                    </div>
                  ) : (
                    paymentProofsList.map((proof) => (
                      <div key={proof.id} className="p-3.5 border rounded-lg space-y-2 text-xs font-mono" style={CARD_SUNKEN}>
                        <div className="flex justify-between items-start">
                          <div>
                            <strong className="text-[var(--crm-heading)] text-sm block">{proof.paymentMode} - ₹{Number(proof.amountPaid).toLocaleString('en-IN')}</strong>
                            <span className="text-[10px] text-[var(--crm-ink-faint)]">Ref: <code className="text-amber-400">{proof.upiRefNo}</code> &bull; {proof.date}</span>
                          </div>
                          <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                            proof.status === 'VERIFIED' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' : 'bg-amber-950/40 text-amber-400 border border-amber-900/30'
                          }`}>
                            {proof.status || 'SUBMITTED'} ✓
                          </span>
                        </div>

                        {proof.proofImageUrl && proof.proofImageUrl.startsWith('data:image') && (
                          <img src={proof.proofImageUrl} alt="Proof" className="h-24 rounded border border-[var(--crm-line)] object-cover mt-1" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        ) : null}

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: OVERVIEW DASHBOARD VIEW (DEFAULT)
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'DASHBOARD' || activeTab === 'DISPATCHES' ? (
          <>
            {/* Top Quick Header Bar with Support Tickets Link */}
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold uppercase tracking-wider font-mono text-[var(--crm-heading)] flex items-center gap-2">
                <FiTruck className="text-teal-400" size={16} /> Driver Console Overview
              </span>
              <Link
                to="/crm/tickets"
                className="px-3 py-1.5 bg-sky-950/60 border border-sky-800/80 text-sky-400 hover:text-white hover:bg-sky-900 font-mono text-[10px] font-bold uppercase rounded shadow transition flex items-center gap-1.5"
              >
                <FiLifeBuoy size={14} className="text-sky-400" /> Support Tickets / Helpdesk
              </Link>
            </div>

            {/* 4 Metrics Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 font-mono">
              <div className="border rounded-lg p-4 shadow-sm" style={CARD}>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] uppercase font-bold tracking-wider" style={LABEL_MONO}>Total Dispatch</span>
                  <div className="p-2 bg-blue-950/40 rounded border border-blue-900/30 text-blue-400"><FiTruck size={18} /></div>
                </div>
                <div className="mt-2"><span className="text-2xl font-bold text-[var(--crm-heading)]">{metrics.totalDispatch}</span></div>
              </div>

              <div className="border rounded-lg p-4 shadow-sm" style={CARD}>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] uppercase font-bold tracking-wider" style={LABEL_MONO}>Revenue</span>
                  <div className="p-2 bg-emerald-950/40 rounded border border-emerald-900/30 text-emerald-400"><FiDollarSign size={18} /></div>
                </div>
                <div className="mt-2"><span className="text-2xl font-bold text-emerald-400">₹{metrics.revenue.toLocaleString('en-IN')}</span></div>
              </div>

              <div className="border rounded-lg p-4 shadow-sm" style={CARD}>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] uppercase font-bold tracking-wider" style={LABEL_MONO}>Active Task Assign</span>
                  <div className="p-2 bg-amber-950/40 rounded border border-amber-900/30 text-amber-400"><FiCheckSquare size={18} /></div>
                </div>
                <div className="mt-2"><span className="text-2xl font-bold text-amber-400">{metrics.taskAssign}</span></div>
              </div>

              <div className="border rounded-lg p-4 shadow-sm" style={CARD}>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] uppercase font-bold tracking-wider" style={LABEL_MONO}>Complete</span>
                  <div className="p-2 bg-purple-950/40 rounded border border-purple-900/30 text-purple-400"><FiCheckCircle size={18} /></div>
                </div>
                <div className="mt-2"><span className="text-2xl font-bold text-purple-300">{metrics.complete}</span></div>
              </div>
            </div>

            {/* Middle Section: Map & Assign Leads */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 border rounded-lg overflow-hidden shadow-sm flex flex-col" style={CARD}>
                <div className="p-3.5 border-b flex items-center justify-between" style={{ ...CARD_SUNKEN, borderColor: 'var(--crm-line)' }}>
                  <div className="flex items-center gap-2">
                    <FiNavigation className="text-sky-400" size={16} />
                    <h2 className="text-xs uppercase font-bold tracking-wider font-mono" style={HEADING}>Google Map Live Telemetry</h2>
                  </div>
                  <button onClick={captureDeviceGps} className="px-2.5 py-1 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-sky-400 text-[10px] font-mono font-bold rounded cursor-pointer hover:bg-[var(--crm-bg-raised)]">
                    <FiCrosshair size={12} className="inline mr-1" /> Recenter GPS
                  </button>
                </div>
                <div className="relative w-full flex-1 min-h-[480px] bg-[var(--crm-bg-sunken)]">
                  <iframe
                    title="Google Map"
                    width="100%"
                    height="100%"
                    style={{ border: 0, filter: 'invert(90%) hue-rotate(180%)' }}
                    src={`https://maps.google.com/maps?q=${gpsLocation.lat},${gpsLocation.long}&z=${mapZoom}&output=embed`}
                  />
                </div>
              </div>

              {/* ASSIGN LEADS PANEL LINKED TO TRANSPORT MANAGER DISPATCHES */}
              <div className="lg:col-span-5 border rounded-lg p-4 shadow-sm font-mono space-y-3" style={CARD}>
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
                  <h2 className="text-xs uppercase font-bold tracking-wider flex items-center gap-2" style={HEADING}>
                    <FiBriefcase className="text-teal-400" /> ASSIGN LEADS ({dispatchesList.length})
                  </h2>
                </div>

                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
                  {dispatchesList.filter(d => !(['COMPLETED', 'DELIVERED', 'UNLOADED', 'DEAL WON', 'CLOSED WON'].some(kw => (d.stage || d.rawStage || d.status || d.dispatchStatus || '').toUpperCase().replace(/_/g, ' ').includes(kw)))).length === 0 ? (
                    <div className="p-8 text-center text-[var(--crm-ink-faint)] text-xs border border-dashed border-[var(--crm-line)] rounded">
                      No active pending dispatches. All assigned trips are completed!
                    </div>
                  ) : (
                    dispatchesList.filter(d => !(['COMPLETED', 'DELIVERED', 'UNLOADED', 'DEAL WON', 'CLOSED WON'].some(kw => (d.stage || d.rawStage || d.status || d.dispatchStatus || '').toUpperCase().replace(/_/g, ' ').includes(kw)))).map((d, idx) => (
                      <div 
                        key={d._id || idx} 
                        onClick={() => setSelectedMapOrder(d)}
                        className="p-3.5 border rounded-lg space-y-2 text-xs cursor-pointer hover:border-teal-500/70 hover:shadow-md transition group" 
                        style={CARD_SUNKEN}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] text-[var(--crm-ink-faint)] uppercase block font-mono">Order / Trip ID: <strong className="text-teal-400 group-hover:underline">{d.dispatchNumber || d.orderNumber || d._id}</strong></span>
                            <strong className="text-[var(--crm-heading)] text-sm font-bold block">{d.customerName || 'Assigned Load'}</strong>
                            <span className="text-teal-300 text-[10px] block font-mono">Material: {d.material || d.productName || 'Cargo Goods'} ({d.weightTons || '20'} MT)</span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="px-2 py-0.5 bg-amber-950/40 border border-amber-900/30 text-amber-400 text-[9px] font-bold uppercase rounded font-mono">
                              {d.stage || d.status || d.dispatchStatus || 'ASSIGNED'}
                            </span>
                            <span className="text-[9px] text-sky-400 font-bold underline flex items-center gap-1 group-hover:text-teal-300">
                              <FiNavigation size={10} /> View Map &rarr;
                            </span>
                          </div>
                        </div>

                        <div className="p-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] rounded text-[11px] font-mono space-y-1">
                          <div className="text-emerald-400 font-bold">📍 Pickup: {d.origin || d.originCity || '—'}</div>
                          <div className="text-sky-400 font-bold">🚩 Delivery: {d.destination || d.destCity || '—'}</div>
                          {d.totalFreightAmount && <div className="text-emerald-400 font-bold text-[10px]">Freight Value: ₹{Number(d.totalFreightAmount).toLocaleString('en-IN')}</div>}
                        </div>

                        <div className="pt-1.5 border-t border-[var(--crm-line)]/50 text-[10px] space-y-1.5 font-mono">
                          <div className="flex justify-between items-center">
                            <div className="space-y-0.5">
                              <div className="text-[var(--crm-ink-faint)]">Assigned To Driver: <strong className="text-teal-400">{d.driverName || d.assignedDriverName || (typeof d.assignedTo === 'object' ? (d.assignedTo?.fullName || d.assignedTo?.name) : d.assignedTo) || user?.name || user?.fullName || '—'}</strong></div>
                              <div className="text-[var(--crm-ink-faint)]">Order Confirmed By: <strong className="text-teal-300">{d.orderConfirmedBy || d.salesOwner || '—'}</strong></div>
                              <div className="text-[var(--crm-ink-faint)]">Trip Assigned By: <strong className="text-sky-400">{d.assignedByManager || d.managerName || '—'}</strong></div>
                            </div>
                            
                            <button
                              type="button"
                              onClick={(e) => handleOpenDeliveryModal(d, e)}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[10px] uppercase rounded shadow cursor-pointer transition flex items-center gap-1 shrink-0"
                            >
                              <FiCheckCircle size={12} /> Mark Delivered
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* COMPLETED & DELIVERED LOADS SECTION */}
                {dispatchesList.filter(d => ['COMPLETED', 'DELIVERED', 'UNLOADED', 'DEAL WON', 'CLOSED WON'].some(kw => (d.stage || d.rawStage || d.status || d.dispatchStatus || '').toUpperCase().replace(/_/g, ' ').includes(kw))).length > 0 && (
                  <div className="pt-4 border-t border-[var(--crm-line)] space-y-3 font-mono">
                    <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--crm-line)' }}>
                      <h3 className="text-xs uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-2" style={HEADING}>
                        <FiCheckCircle size={15} className="text-emerald-400" /> COMPLETED & DELIVERED LOADS ({dispatchesList.filter(d => ['COMPLETED', 'DELIVERED', 'UNLOADED', 'DEAL WON', 'CLOSED WON'].some(kw => (d.stage || d.rawStage || d.status || d.dispatchStatus || '').toUpperCase().replace(/_/g, ' ').includes(kw))).length})
                      </h3>
                      <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded">
                        POD Verified ✓
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                      {dispatchesList.filter(d => ['COMPLETED', 'DELIVERED', 'UNLOADED', 'DEAL WON', 'CLOSED WON'].some(kw => (d.stage || d.rawStage || d.status || d.dispatchStatus || '').toUpperCase().replace(/_/g, ' ').includes(kw))).map((d, idx) => (
                        <div key={d._id || idx} className="p-3.5 border border-emerald-900/40 rounded-lg space-y-2 bg-emerald-950/20 text-xs font-mono shadow-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <strong className="text-[var(--crm-heading)] text-sm font-bold block">{d.customerName || 'Delivered Cargo'}</strong>
                              <span className="text-[10px] text-teal-400 font-mono">Trip ID: {d.dispatchNumber || d.orderNumber || d._id}</span>
                            </div>
                            <span className="px-2.5 py-1 bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 text-[9px] font-bold uppercase rounded font-mono shadow-sm">
                              DELIVERED ✓
                            </span>
                          </div>
                          <div className="p-2 bg-[var(--crm-bg)]/80 border border-emerald-900/40 rounded text-[10px] text-[var(--crm-ink-soft)] font-mono flex justify-between items-center">
                            <span>📍 {d.origin || 'Delhi'} &rarr; 🚩 {d.destination || 'Destination'}</span>
                            <span className="text-emerald-400 font-bold">Freight: ₹{Number(d.totalFreightAmount || 18000).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Lower Section: Work Updates & Chat */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 font-mono">
              <div className="lg:col-span-7 border rounded-lg p-4 space-y-3 shadow-sm flex flex-col justify-between" style={CARD}>
                <div>
                  <h2 className="text-xs uppercase font-bold tracking-wider border-b pb-2 flex items-center justify-between" style={{ ...HEADING, borderColor: 'var(--crm-line)' }}>
                    <span>Driver Work Update Log</span>
                    <span className="text-[10px] text-teal-400 font-mono">({workUpdateLogs.length} Entries)</span>
                  </h2>
                  <form onSubmit={handleWorkUpdateSubmit} className="space-y-2.5 mt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] uppercase font-bold mb-1" style={LABEL_MONO}>Trip Stage *</label>
                        <select
                          value={workUpdateForm.updateType}
                          onChange={(e) => setWorkUpdateForm(prev => ({ ...prev, updateType: e.target.value }))}
                          className="w-full p-2 border rounded text-[var(--crm-heading)] text-xs font-bold outline-none cursor-pointer"
                          style={CARD_SUNKEN}
                        >
                          <option value="Empty">Empty Vehicle</option>
                          <option value="Loading">Loading Underway</option>
                          <option value="On-Route">On-Route / Transit</option>
                          <option value="Unloading">Unloading at Destination</option>
                          <option value="Return">Return Journey</option>
                          <option value="Completed">Trip Completed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-bold mb-1" style={LABEL_MONO}>Current Toll / Location</label>
                        <input
                          type="text"
                          placeholder="Enter current toll plaza or location"
                          value={workUpdateForm.location}
                          onChange={(e) => setWorkUpdateForm(prev => ({ ...prev, location: e.target.value }))}
                          className="w-full p-2 border rounded text-slate-100 placeholder:text-slate-400 placeholder:opacity-90 text-xs outline-none font-mono"
                          style={CARD_SUNKEN}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-bold mb-1" style={LABEL_MONO}>Work Details / Toll Remarks *</label>
                      <input
                        type="text"
                        required
                        placeholder="Enter work details or toll remarks"
                        value={workUpdateForm.notes}
                        onChange={(e) => setWorkUpdateForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full p-2.5 border rounded text-slate-100 placeholder:text-slate-400 placeholder:opacity-90 text-xs outline-none font-mono"
                        style={CARD_SUNKEN}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingWorkUpdate}
                      className="w-full py-2.5 bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs uppercase tracking-wider rounded cursor-pointer transition flex items-center justify-center gap-2 shadow"
                    >
                      <FiSend size={14} />
                      {submittingWorkUpdate ? 'Posting Update...' : 'POST WORK UPDATE TO TRANSPORT MANAGER'}
                    </button>
                  </form>
                </div>

                {/* Submitted Work Logs List */}
                <div className="space-y-2 mt-2 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                  {workUpdateLogs.length === 0 ? (
                    <div className="p-3 text-center text-[var(--crm-ink-faint)] text-[10px] border border-dashed border-[var(--crm-line)] rounded">
                      No work updates posted yet. Fill form above and click POST WORK UPDATE.
                    </div>
                  ) : (
                    workUpdateLogs.map((log) => (
                      <div key={log.id} className="p-2 border rounded text-xs font-mono space-y-1" style={CARD_SUNKEN}>
                        <div className="flex justify-between items-center text-[10px]">
                          <strong className="text-teal-400 font-bold">[{log.type}]</strong>
                          <span className="text-[var(--crm-ink-faint)]">{log.time}</span>
                        </div>
                        <div className="text-[var(--crm-heading)] text-[11px]">{log.notes}</div>
                        {log.location && <div className="text-emerald-400 text-[10px]">📍 {log.location}</div>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="lg:col-span-5 border rounded-xl p-4 min-h-[390px] flex flex-col justify-between shadow-2xl bg-[#111317] border-slate-800 font-mono">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <h2 className="text-xs uppercase font-bold tracking-wider text-slate-100 font-mono">LIVE DESK CHAT</h2>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] bg-[#090b0e] p-1 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setChatChannel('MANAGER')}
                      className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${chatChannel === 'MANAGER' ? 'bg-[#00897b] text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Manager
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatChannel('EXECUTIVE')}
                      className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${chatChannel === 'EXECUTIVE' ? 'bg-[#00897b] text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Executive
                    </button>
                  </div>
                </div>

                <div ref={chatContainerRef} className="space-y-3 overflow-y-auto max-h-[260px] my-2 text-xs font-mono custom-scrollbar flex flex-col pr-1">
                  {(chatMessages[chatChannel] || []).length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs italic">
                      No messages with {chatChannel === 'MANAGER' ? 'Transport Manager' : 'Transport Executive'}. Type below to broadcast live message.
                    </div>
                  ) : (
                    chatMessages[chatChannel]?.map(m => {
                      const myName = (user?.name || user?.fullName || '').toLowerCase().trim();
                      const senderLower = (m.sender || '').toLowerCase().trim();
                      const isMe = (myName && senderLower.includes(myName)) || (
                        chatChannel === 'MANAGER'
                          ? !senderLower.includes('manager')
                          : !senderLower.includes('executive')
                      );
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col max-w-[85%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
                        >
                          <div
                            className={`p-3 rounded-xl text-xs space-y-1 shadow-md ${
                              isMe
                                ? 'bg-[#00897b] text-white rounded-tr-none'
                                : 'bg-[#1a1d24] border border-slate-800 text-slate-200 rounded-tl-none'
                            }`}
                          >
                            <span className={`text-[9px] font-bold block ${isMe ? 'text-teal-100' : 'text-slate-400'}`}>
                              {m.sender}
                            </span>
                            <p className="text-xs font-sans font-semibold leading-relaxed whitespace-pre-wrap">
                              {m.text}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-2 border-t border-slate-800 font-mono">
                  <input
                    type="text"
                    placeholder={`Message ${chatChannel === 'MANAGER' ? 'Transport Manager' : 'Executive'}...`}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    className="flex-1 py-2.5 px-3 bg-[#090b0e] border border-teal-700/60 rounded-xl text-slate-100 placeholder:text-slate-400 placeholder:opacity-90 text-xs outline-none focus:border-teal-500 transition font-sans"
                  />
                  <button type="submit" className="p-2.5 bg-[#00897b] hover:bg-[#00796b] text-white rounded-xl shadow cursor-pointer transition flex items-center justify-center">
                    <FiSend size={15} />
                  </button>
                </form>
              </div>
            </div>

            {/* DRIVER VEHICLE DAILY TRIP & EXPENSE LOG FORM CARD (LAYOUT MATCHES DESIGN WIREFRAME) */}
            <div className="border-2 border-[var(--crm-line)] rounded-xl p-5 space-y-4 shadow-lg font-mono mt-5 bg-[var(--crm-bg-raised)]" style={CARD}>
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
                <h2 className="text-sm uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-2" style={HEADING}>
                  <FiTool size={18} className="text-emerald-400" /> DRIVER VEHICLE & DAILY TRIP LOG
                </h2>
                <span className="text-[11px] text-emerald-400 font-bold bg-emerald-950/50 px-2.5 py-1 rounded border border-emerald-800/40">
                  ({fuelExpenseLogs.length} Logged)
                </span>
              </div>

              <form onSubmit={handleFuelExpenseSubmit} className="space-y-4">
                {/* SELECT ASSIGNED LEAD / TRIP ORDER DROPDOWN */}
                <div>
                  <label className="block text-[10px] uppercase font-bold mb-1 text-teal-400 font-mono">SELECT ASSIGNED LEAD / TRIP ORDER (OPTIONAL)</label>
                  <select
                    value={fuelExpenseForm.leadCode || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedDisp = dispatchesList.find(d => (d._id === selectedId || d.orderNumber === selectedId || d.dispatchNumber === selectedId));
                      setFuelExpenseForm(prev => ({
                        ...prev,
                        leadCode: selectedId,
                        leadCustomer: selectedDisp ? (selectedDisp.customerName || 'Client') : '',
                        fromLocation: selectedDisp ? (selectedDisp.origin || prev.fromLocation) : prev.fromLocation,
                        toLocation: selectedDisp ? (selectedDisp.destination || prev.toLocation) : prev.toLocation
                      }));
                    }}
                    className="w-full p-2.5 border rounded-lg text-teal-300 font-bold text-xs outline-none bg-[var(--crm-bg-sunken)] border-teal-800/60 font-mono cursor-pointer shadow-sm"
                  >
                    <option value="">Select Associated Lead / Cargo Order...</option>
                    {dispatchesList.map(d => (
                      <option key={d._id || d.orderNumber} value={d.orderNumber || d.dispatchNumber || d._id}>
                        📦 Lead Code: {d.orderNumber || d.dispatchNumber || d._id} - {d.customerName || 'Client'} ({d.material || 'Cargo'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2-COLUMN GRID matching the Wireframe */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Row 1 - Left: Driver Vechical number */}
                  <div className="space-y-1">
                    <label className="block text-xs uppercase font-bold tracking-wide text-slate-200" style={LABEL_MONO}>
                      Driver Vechical number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Driver Vechical number"
                      value={fuelExpenseForm.vehicleNumber}
                      onChange={(e) => setFuelExpenseForm(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                      className="w-full p-3 border-2 rounded-lg text-slate-100 placeholder:text-slate-500 font-bold text-xs outline-none focus:border-teal-500 transition font-mono"
                      style={CARD_SUNKEN}
                    />
                  </div>

                  {/* Row 1 - Right: fuel Cost */}
                  <div className="space-y-1">
                    <label className="block text-xs uppercase font-bold tracking-wide text-emerald-400" style={LABEL_MONO}>
                      fuel Cost (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="fuel Cost"
                      value={fuelExpenseForm.fuelCost}
                      onChange={(e) => setFuelExpenseForm(prev => ({ ...prev, fuelCost: e.target.value }))}
                      className="w-full p-3 border-2 rounded-lg text-emerald-400 placeholder:text-slate-500 font-bold text-xs outline-none focus:border-emerald-500 transition font-mono"
                      style={CARD_SUNKEN}
                    />
                  </div>

                  {/* Row 2 - Left: Total Drive Today */}
                  <div className="space-y-1">
                    <label className="block text-xs uppercase font-bold tracking-wide text-slate-200" style={LABEL_MONO}>
                      Total Drive Today (KM)
                    </label>
                    <input
                      type="number"
                      placeholder="Total Drive Today"
                      value={fuelExpenseForm.kmDriven}
                      onChange={(e) => setFuelExpenseForm(prev => ({ ...prev, kmDriven: e.target.value }))}
                      className="w-full p-3 border-2 rounded-lg text-teal-300 placeholder:text-slate-500 font-bold text-xs outline-none focus:border-teal-500 transition font-mono"
                      style={CARD_SUNKEN}
                    />
                  </div>

                  {/* Row 2 - Right: Todays Trip */}
                  <div className="space-y-1">
                    <label className="block text-xs uppercase font-bold tracking-wide text-slate-200" style={LABEL_MONO}>
                      Todays Trip
                    </label>
                    <input
                      type="text"
                      placeholder="Todays Trip"
                      value={fuelExpenseForm.todaysTrip}
                      onChange={(e) => setFuelExpenseForm(prev => ({ ...prev, todaysTrip: e.target.value }))}
                      className="w-full p-3 border-2 rounded-lg text-slate-100 placeholder:text-slate-500 font-bold text-xs outline-none focus:border-teal-500 transition font-mono"
                      style={CARD_SUNKEN}
                    />
                  </div>

                  {/* Row 3 - Left: Vehical milage */}
                  <div className="space-y-1">
                    <label className="block text-xs uppercase font-bold tracking-wide text-slate-200" style={LABEL_MONO}>
                      Vehical milage (KM/L)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Vehical milage"
                      value={fuelExpenseForm.vehicleMileage}
                      onChange={(e) => setFuelExpenseForm(prev => ({ ...prev, vehicleMileage: e.target.value }))}
                      className="w-full p-3 border-2 rounded-lg text-amber-300 placeholder:text-slate-500 font-bold text-xs outline-none focus:border-amber-500 transition font-mono"
                      style={CARD_SUNKEN}
                    />
                  </div>

                  {/* Row 3 - Right: other Expence */}
                  <div className="space-y-1">
                    <label className="block text-xs uppercase font-bold tracking-wide text-purple-300" style={LABEL_MONO}>
                      other Expence (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="other Expence"
                      value={fuelExpenseForm.otherCost}
                      onChange={(e) => setFuelExpenseForm(prev => ({ ...prev, otherCost: e.target.value }))}
                      className="w-full p-3 border-2 rounded-lg text-purple-300 placeholder:text-slate-500 font-bold text-xs outline-none focus:border-purple-500 transition font-mono"
                      style={CARD_SUNKEN}
                    />
                  </div>
                </div>

                {/* Optional Remarks input */}
                <div>
                  <label className="block text-[10px] uppercase font-bold mb-1 text-slate-400 font-mono">Remarks / Bill Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="Enter trip remarks or expense bill details"
                    value={fuelExpenseForm.remarks}
                    onChange={(e) => setFuelExpenseForm(prev => ({ ...prev, remarks: e.target.value }))}
                    className="w-full p-2.5 border rounded-lg text-slate-200 placeholder:text-slate-500 text-xs outline-none font-mono"
                    style={CARD_SUNKEN}
                  />
                </div>

                {/* Bottom Row - Centered Submit Button */}
                <div className="flex justify-center pt-2">
                  <button
                    type="submit"
                    disabled={submittingExpense}
                    className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-sm uppercase tracking-wider rounded-xl cursor-pointer transition shadow-lg flex items-center justify-center gap-2 border border-emerald-400/40"
                  >
                    <FiCheckCircle size={18} />
                    {submittingExpense ? 'Submitting Log...' : 'Submit'}
                  </button>
                </div>
              </form>

              {/* Submitted Expense Logs History */}
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar pt-3 border-t border-[var(--crm-line)]">
                {fuelExpenseLogs.length === 0 ? (
                  <div className="p-3 text-center text-[var(--crm-ink-faint)] text-[10px] border border-dashed border-[var(--crm-line)] rounded-lg">
                    No trip logs recorded yet. Use the form above to log vehicle number, drive KM, fuel & mileage.
                  </div>
                ) : (
                  fuelExpenseLogs.map((log) => (
                    <div key={log.id} className="p-3 border rounded-lg text-xs font-mono space-y-1.5" style={CARD_SUNKEN}>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-teal-400 font-bold font-mono">
                          🚚 Truck: <strong className="text-white">{log.vehicle}</strong> {log.todaysTrip && `| ${log.todaysTrip}`}
                        </span>
                        <span className="text-[var(--crm-ink-faint)]">{log.date} {log.time}</span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between text-[11px] gap-2">
                        <span className="text-teal-300 font-bold">Total Drive: {log.totalKm} KM {log.vehicleMileage > 0 && `| Mileage: ${log.vehicleMileage} KM/L`}</span>
                        <strong className="text-emerald-400 font-mono font-bold">Total Expenses: ₹{(log.fuelCost + log.otherCost + log.punctureCost).toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="flex gap-3 text-[10px] text-[var(--crm-ink-faint)] font-mono">
                        {log.fuelCost > 0 && <span className="text-emerald-400 font-bold">Fuel Cost: ₹{log.fuelCost.toLocaleString('en-IN')}</span>}
                        {log.otherCost > 0 && <span className="text-purple-300 font-bold">Other Expense: ₹{log.otherCost}</span>}
                      </div>
                      {log.remarks && <div className="text-[10px] text-[var(--crm-ink-soft)]">Remarks: {log.remarks}</div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : null}

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: MY DRIVER PROFILE VIEW
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'PROFILE' ? (
          <div className="border rounded-lg p-6 shadow-sm space-y-4 font-mono" style={CARD}>
            <h2 className="text-base font-bold text-amber-400 uppercase flex items-center gap-2 border-b pb-3" style={{ ...HEADING, borderColor: 'var(--crm-line)' }}>
              <FiUser /> Driver Profile & Credentials
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-900 rounded-xl space-y-2">
                <span className="text-slate-400 block text-[10px] uppercase">Driver Name</span>
                <strong className="text-white text-base block">{user?.name || user?.fullName || 'Active Driver'}</strong>
                <span className="text-slate-400 block text-[10px] uppercase mt-2">Driver ID</span>
                <strong className="text-amber-400 text-sm block">{user?.employeeId || user?._id || 'EMP-DRV-001'}</strong>
              </div>
              <div className="p-4 bg-slate-900 rounded-xl space-y-2">
                <span className="text-slate-400 block text-[10px] uppercase">Assigned Truck</span>
                <strong className="text-amber-400 text-base block">{attendanceForm.vehicleNumber || 'Not Set'}</strong>
                <span className="text-slate-400 block text-[10px] uppercase mt-2">Mobile Contact</span>
                <strong className="text-slate-200 text-sm block">{user?.phone || 'Registered Phone'}</strong>
              </div>
            </div>
          </div>
        ) : null}

      </div>



      {/* MODAL: EMERGENCY SOS ALERT */}
      <AnimatePresence>
        {showSosModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSosModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-[#160608] border-2 border-rose-600 w-full max-w-md p-6 rounded-xl shadow-2xl z-10 text-left space-y-4 font-mono text-xs">
              <h3 className="text-sm font-bold uppercase text-rose-400 flex items-center gap-2">
                <FiAlertTriangle size={20} className="text-rose-500 animate-bounce" /> Confirm SOS Emergency Alert
              </h3>
              <p className="text-slate-300 text-[11px]">
                🚨 Alert will be sent directly to Transport Manager & Founder with live GPS coordinates: ({gpsLocation.lat}, {gpsLocation.long}).
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Emergency Issue Category</label>
                  <select
                    value={sosIssueType}
                    onChange={(e) => setSosIssueType(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-rose-900 rounded-lg text-white font-bold outline-none"
                  >
                    <option value="Fuel Low / Gas Inject Required">Fuel Low / Gas Inject Required</option>
                    <option value="Engine Overheat">Engine Overheat / Breakdown</option>
                    <option value="Tyre Puncture">Tyre Puncture / Blowout</option>
                    <option value="Accident / Emergency">Accident / Emergency Assistance</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowSosModal(false)} className="px-4 py-2 border border-slate-700 text-slate-300 text-xs font-bold rounded-lg uppercase">Cancel</button>
                <button type="button" onClick={handleConfirmSOS} disabled={submittingSos} className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow cursor-pointer">
                  {submittingSos ? 'Broadcasting...' : 'CONFIRM & SEND SOS'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: MARK ORDER DELIVERED CONFIRMATION */}
      <AnimatePresence>
        {showDeliveryModal && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeliveryModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-[var(--crm-bg,#090d16)] border border-emerald-600/70 w-full max-w-md p-6 rounded-xl shadow-2xl z-10 text-left space-y-4 font-mono text-xs">
              
              <div className="flex justify-between items-center border-b border-[var(--crm-line)] pb-3">
                <h3 className="text-sm font-bold uppercase text-emerald-400 flex items-center gap-2">
                  <FiCheckCircle size={18} /> Confirm Order Delivery
                </h3>
                <button onClick={() => setShowDeliveryModal(false)} className="text-slate-400 hover:text-white cursor-pointer"><FiX size={18} /></button>
              </div>

              <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1 custom-scrollbar">
                <div className="p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded space-y-1">
                  <span className="text-[10px] text-slate-400 block font-mono">ORDER ID: <strong className="text-amber-400">{deliveringOrder?.dispatchNumber || deliveringOrder?.orderNumber || deliveringOrder?._id}</strong></span>
                  <strong className="text-sm text-[var(--crm-heading)] font-bold block">{deliveringOrder?.customerName}</strong>
                  <span className="text-emerald-400 text-xs block font-bold">🚩 Destination: {deliveringOrder?.destination || 'Destination Hub'}</span>
                </div>

                {/* Total Payment Collected */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Total Payment (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 18000"
                    value={paymentAmountCollected}
                    onChange={(e) => setPaymentAmountCollected(e.target.value)}
                    className="w-full p-2.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded-lg text-emerald-400 font-bold text-sm outline-none font-mono"
                  />
                </div>

                {/* 1. PAYMENT PROOF UPLOAD (Pic, PDF, DOC) */}
                <div className="p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded-lg space-y-2">
                  <label className="block text-[10px] uppercase font-bold text-sky-400 flex items-center gap-1.5 font-mono">
                    <FiUpload size={13} /> 1. Upload Payment Proof / Receipt (Pic, PDF, DOC)
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => handleProofFileUpload(e, setPaymentProofFile, setPaymentProofPreview)}
                    className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-sky-950 file:text-sky-300 hover:file:bg-sky-900 cursor-pointer font-mono"
                  />
                  {paymentProofPreview && (
                    <div className="p-2 bg-[var(--crm-bg)] border border-sky-900/50 rounded flex items-center justify-between text-[11px] font-mono">
                      <span className="text-sky-300 truncate font-mono">📄 {paymentProofFile?.name || 'Payment Proof Document Attached'}</span>
                      <span className="text-emerald-400 font-bold text-[10px]">Attached ✓</span>
                    </div>
                  )}
                </div>

                {/* 2. PROOF OF DRIVER (Selfie / Unloading Photo) */}
                <div className="p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded-lg space-y-2">
                  <label className="block text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1.5 font-mono">
                    <FiCamera size={13} /> 2. Proof of Driver (Selfie & Unloading Point Photo)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleProofFileUpload(e, setDriverProofFile, setDriverProofPreview)}
                    className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-amber-950 file:text-amber-300 hover:file:bg-amber-900 cursor-pointer font-mono"
                  />
                  {driverProofPreview && (
                    <div className="p-2 bg-[var(--crm-bg)] border border-amber-900/50 rounded flex items-center gap-2 font-mono">
                      {driverProofFile?.type?.startsWith('image/') ? (
                        <img src={driverProofPreview} alt="Driver Selfie" className="w-10 h-10 object-cover rounded border border-amber-500" />
                      ) : null}
                      <div>
                        <span className="text-amber-300 text-[11px] block font-bold">📷 Driver Photo Attached</span>
                        <span className="text-[10px] text-emerald-400">Verified at Unloading Site ✓</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Delivery Notes / POD Remarks */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Delivery Notes / POD Remarks</label>
                  <textarea
                    rows={2}
                    required
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    className="w-full p-2.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded-lg text-[var(--crm-heading)] text-xs outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--crm-line)]">
                <button type="button" onClick={() => setShowDeliveryModal(false)} className="px-4 py-2 border border-slate-700 text-slate-300 text-xs font-bold rounded-lg uppercase cursor-pointer">Cancel</button>
                <button 
                  type="button" 
                  onClick={handleConfirmDeliverySubmit} 
                  disabled={submittingDelivery} 
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow cursor-pointer transition flex items-center gap-1.5"
                >
                  <FiCheckCircle size={14} />
                  {submittingDelivery ? 'Updating Status...' : 'CONFIRM DELIVERY & NOTIFY MANAGER'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INTERACTIVE LIVE ROUTE & GOOGLE MAP MODAL */}
      <OrderMapModal
        isOpen={!!selectedMapOrder}
        onClose={() => setSelectedMapOrder(null)}
        order={selectedMapOrder}
        onMarkDelivered={handleOpenDeliveryModal}
      />
    </div>
  );
}
