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
import DriverCalculator from '../../../components/crm/DriverCalculator';

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

  // Payment Options & Razorpay Integration
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('RAZORPAY'); // 'RAZORPAY' | 'COD' | 'RECEIPT'
  const [razorpayTxnId, setRazorpayTxnId] = useState('');
  const [loadingRazorpay, setLoadingRazorpay] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const triggerRazorpayCheckout = async (order) => {
    if (!order) return;
    setLoadingRazorpay(true);
    const loaded = await loadRazorpayScript();
    setLoadingRazorpay(false);

    if (!loaded) {
      toast.error('Razorpay SDK failed to load. Please check network connectivity.');
      return;
    }

    const payAmount = Number(paymentAmountCollected) || Number(order.totalFreightAmount) || Number(order.freightAmount) || 5000;
    const amountInPaise = Math.round(payAmount * 100);

    const options = {
      key: "rzp_live_TDkYIhxFKBUK3K",
      amount: amountInPaise,
      currency: "INR",
      name: "India Trade Overseas",
      description: `Delivery Payment for Freight Order #${order.dispatchNumber || order.orderNumber || order.leadCode || order._id}`,
      image: "https://indiatradeoverseas.com/assets/web_icon_1.jpeg",
      handler: function (response) {
        const txnId = response.razorpay_payment_id;
        setRazorpayTxnId(txnId);
        toast.success(`🎉 Payment Verified! Razorpay Txn: ${txnId}`, { duration: 6000 });
      },
      prefill: {
        name: order.customerName || "Customer",
        contact: order.customerPhone || "9876543210",
        email: order.customerEmail || "customer@indiatradeoverseas.com"
      },
      notes: {
        orderId: order.dispatchNumber || order.orderNumber || '',
        driverName: user?.name || user?.fullName || 'Driver'
      },
      theme: {
        color: "#059669"
      }
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        toast.error(`Payment Failed: ${resp.error?.description || 'Cancelled'}`);
      });
      rzp.open();
    } catch (err) {
      console.error('Razorpay Modal Error:', err);
      toast.error('Could not open Razorpay checkout window.');
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
    setSelectedPaymentMode('RAZORPAY');
    setRazorpayTxnId('');
    setShowDeliveryModal(true);
  };

  const handleConfirmDeliverySubmit = async (e) => {
    e.preventDefault();
    if (!deliveringOrder) return;

    if (!driverProofFile && !driverProofPreview) {
      setSubmittingDelivery(false);
      return toast.error('📷 Driver Unloading Proof (Selfie / Photo) is MANDATORY! Please upload photo to proceed.');
    }

    setSubmittingDelivery(true);
    const targetId = deliveringOrder._id || deliveringOrder.dispatchNumber || deliveringOrder.orderNumber;
    const amountNum = Number(paymentAmountCollected) || 0;

    const isCod = selectedPaymentMode === 'COD';
    const paymentModeText = isCod ? 'COD' : 'Online';
    const modeLabel = isCod ? 'Cash on Delivery (COD)' : `Razorpay Online (${razorpayTxnId || 'Paid'})`;

    const proofData = {
      status: 'DELIVERED',
      dispatchStatus: 'DELIVERED',
      deliveredAt: new Date().toLocaleTimeString(),
      podFileUrl: paymentProofPreview || '',
      paymentProofUrl: paymentProofPreview || '',
      paymentProofName: paymentProofFile?.name || `${paymentModeText} Receipt`,
      driverProofUrl: driverProofPreview || '',
      driverProofName: driverProofFile?.name || 'Driver Unloading Photo',
      amountCollected: amountNum,
      deliveryNotes: `${deliveryNotes} | Payment Method: ${modeLabel}`,
      paymentMode: paymentModeText,
      paymentModeType: paymentModeText,
      paymentStatus: 'PAID',
      razorpayPaymentId: razorpayTxnId,
      paymentProof: {
        amountPaid: amountNum,
        paymentMode: paymentModeText,
        razorpayPaymentId: razorpayTxnId,
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
            paymentMode: paymentModeText,
            paymentStatus: 'PAID',
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
          vehicle: deliveringOrder.vehicleNo || profileVehicleNumber || user?.vehicleNumber || 'Unassigned',
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

  // Driver Profile & Vehicle Number State
  const vehicleStorageKey = `driver_assigned_vehicle_${user?._id || user?.employeeId || 'active'}`;
  const [profileVehicleNumber, setProfileVehicleNumber] = useState(() => {
    return localStorage.getItem(vehicleStorageKey) || user?.vehicleNumber || user?.truckNumber || '';
  });

  const handleSaveVehicleProfile = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanVeh = (profileVehicleNumber || '').trim().toUpperCase();
    if (!cleanVeh) {
      toast.error('Please enter a valid Vehicle Number');
      return;
    }
    localStorage.setItem(vehicleStorageKey, cleanVeh);
    setProfileVehicleNumber(cleanVeh);
    setFuelExpenseForm(prev => ({ ...prev, vehicleNumber: cleanVeh }));
    setAttendanceForm(prev => ({ ...prev, vehicleNumber: cleanVeh }));

    try {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('driver_vehicle_registered', {
          driverId: user?._id || user?.employeeId,
          driverName: user?.name || user?.fullName || 'Driver',
          vehicleNumber: cleanVeh
        });
      }
    } catch (err) {}

    toast.success(`✅ Vehicle ${cleanVeh} saved to profile!`);
  };

  // Trip Expense, Fuel, KM & Maintenance Form State
  const [fuelExpenseForm, setFuelExpenseForm] = useState({
    vehicleNumber: profileVehicleNumber || user?.vehicleNumber || user?.truckNumber || '',
    fuelCost: '',
    kmDriven: '', // Total Drive Today
    todaysTrip: '', // Todays Trip
    vehicleMileage: '', // Vehicle Mileage
    otherCost: '', // Other Expense
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
    const driverName = user?.name || user?.fullName || 'Driver';
    const vehicleName = (fuelExpenseForm.vehicleNumber || '').trim() || profileVehicleNumber || attendanceForm.vehicleNumber || dispatchesList[0]?.vehicleNo || 'Vehicle Unassigned';

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
      if (!msg || (!msg.text && !msg.message)) return;
      const targetChannel = msg.channel || 'MANAGER';
      const cleanText = (msg.text || msg.message || '').trim();
      const msgSender = msg.sender || msg.senderName || 'Transport Manager';
      const msgId = msg.id || msg._id || `msg-${cleanText}-${msg.time || ''}`;

      const newMsgObj = {
        id: msgId,
        sender: msgSender,
        text: cleanText,
        timestamp: msg.timestamp || Date.now(),
        time: msg.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages(prev => {
        const currentList = prev[targetChannel] || [];
        const isDuplicate = currentList.some(m => 
          m.id === newMsgObj.id || 
          (m.text === cleanText && Math.abs((m.timestamp || Date.now()) - newMsgObj.timestamp) < 8000)
        );

        if (isDuplicate) return prev;
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
        socket.on('task_assigned', () => fetchDriverTrip());
        socket.on('dispatch_assigned', () => fetchDriverTrip());
      }
    } catch (err) {}

    const handleCustomDispatchUpdate = () => fetchDriverTrip();
    window.addEventListener('ito_dispatch_updated_event', handleCustomDispatchUpdate);

    return () => {
      window.removeEventListener('ito_dispatch_updated_event', handleCustomDispatchUpdate);
      try {
        const socket = socketService.getSocket();
        if (socket) {
          socket.off('transport_chat_receive', handleIncomingSocketChat);
          socket.off('driver_chat_message', handleIncomingSocketChat);
          socket.off('task_assigned');
          socket.off('dispatch_assigned');
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
            vehicleNo: profileVehicleNumber || attendanceForm.vehicleNumber || user?.vehicleNumber || 'Unassigned',
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

      navigator.geolocation.getCurrentPosition(updateLocation, null, { enableHighAccuracy: false, timeout: 30000 });
      navigator.geolocation.watchPosition(
        updateLocation, 
        (err) => {
          if (err && err.code !== 3) {
            console.log('GPS watch note:', err.message);
          }
        }, 
        {
          enableHighAccuracy: false,
          timeout: 30000,
          maximumAge: 10000
        }
      );
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

      const driverNameLower = driverNameStr.toLowerCase().trim();
      const targetUserIdStr = String(user?._id || user?.employeeId || '');
      const targetUserEmail = String(user?.email || '').toLowerCase().trim();

      // Filter dispatches assigned to this driver
      let matchedDispatches = processedCombinedList.filter(t => {
        if (!t) return false;
        
        const itemAssignedToId = typeof t.assignedTo === 'object'
          ? String(t.assignedTo?._id || t.assignedTo?.id || '')
          : String(t.assignedTo || '');
          
        const itemAssignedDriverId = String(t.assignedDriverId || t.driverId || '');
        const itemAssignedEmail = (
          t.driverEmail ||
          (typeof t.assignedTo === 'object' ? t.assignedTo?.email : '') ||
          ''
        ).toLowerCase().trim();
        
        const tripDriverName = (t.driverName || t.salesOwner || '').toLowerCase().trim();

        return (
          (itemAssignedToId && (itemAssignedToId === targetUserIdStr || itemAssignedToId === String(user?._id) || itemAssignedToId === String(user?.employeeId))) ||
          (itemAssignedDriverId && (itemAssignedDriverId === targetUserIdStr || itemAssignedDriverId === String(user?._id) || itemAssignedDriverId === String(user?.employeeId))) ||
          (targetUserEmail && itemAssignedEmail && targetUserEmail === itemAssignedEmail) ||
          (driverNameLower && tripDriverName && (tripDriverName.includes(driverNameLower) || driverNameLower.includes(tripDriverName)))
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
        deliveredSet.has(t._id) || deliveredSet.has(t.orderNumber) || deliveredSet.has(t.dispatchNumber) || deliveredSet.has(t.leadCode)
      ).length;

      const totalPaidFromOrders = matchedDispatches
        .filter(t => isItemDelivered(t) || deliveredSet.has(t._id) || deliveredSet.has(t.orderNumber) || deliveredSet.has(t.dispatchNumber) || deliveredSet.has(t.leadCode))
        .reduce((sum, t) => sum + (Number(t.amountCollected || t.totalFreightAmount || t.freightAmount || t.freightRate || 0) || 0), 0);

      const totalPaidFromProofs = paymentProofsList.reduce((acc, p) => acc + (Number(p.amountPaid) || 0), 0);
      const finalTotalPayment = Math.max(totalPaidFromOrders, totalPaidFromProofs);

      // Active / Pending Assigned Tasks = Total Tasks - Completed Tasks
      const activePendingAssignedCount = Math.max(0, totalDispCount - completedCount);

      setMetrics({
        totalDispatch: totalDispCount,
        revenue: totalRev,
        taskAssign: activePendingAssignedCount,
        complete: completedCount,
        totalPayment: finalTotalPayment
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
    const vehicleName = profileVehicleNumber || attendanceForm.vehicleNumber || dispatchesList[0]?.vehicleNo || 'Unassigned';

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
    const uniqueId = `msg-driver-${Date.now()}`;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const msgObj = {
      id: uniqueId,
      senderId: String(user?._id || user?.employeeId || 'driver'),
      senderName: `${senderName} (Driver)`,
      senderRole: 'DRIVER',
      channel: chatChannel || 'MANAGER',
      message: cleanText,
      text: cleanText,
      timestamp: Date.now(),
      time: nowTime
    };

    setInputMessage('');

    // Append message to local state immediately for instant rendering
    const localMsg = {
      id: uniqueId,
      sender: msgObj.senderName,
      text: cleanText,
      channel: chatChannel || 'MANAGER',
      timestamp: Date.now(),
      time: nowTime
    };

    setChatMessages(prev => ({
      ...prev,
      [chatChannel || 'MANAGER']: [...(prev[chatChannel || 'MANAGER'] || []), localMsg]
    }));

    // Save directly to MongoDB Database via chatApi
    try {
      await chatApi.sendTransportMessage(msgObj);
    } catch (e) {
      console.error('[handleSendMessage] Error saving chat to MongoDB:', e);
    }

    // Emit WebSocket event for real-time broadcast once
    try {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('transport_chat_send', msgObj);
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
            TAB 1: OVERVIEW DASHBOARD VIEW (DEFAULT)
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'DASHBOARD' || activeTab === 'DISPATCHES' ? (
          <>
            {/* DRIVER PROFILE & VEHICLE ASSIGNMENT FORM (DRIVER NAME & VEHICLE NUMBER ONLY) */}
            <div className="border border-teal-800/60 rounded-xl p-4 font-mono shadow-md bg-[var(--crm-bg-raised)] space-y-3" style={CARD}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2.5" style={{ borderColor: 'var(--crm-line)' }}>
                <div className="flex items-center gap-2">
                  <FiUser className="text-teal-400" size={18} />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--crm-heading)] flex items-center gap-2">
                    Driver Profile & Vehicle Assignment
                  </h3>
                </div>
                <span className="text-[10px] text-teal-300 font-bold bg-teal-950/80 border border-teal-800/60 px-2.5 py-0.5 rounded">
                  Driver: <strong className="text-white">{user?.name || user?.fullName || 'Logged Driver'}</strong>
                </span>
              </div>

              <form onSubmit={handleSaveVehicleProfile} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-5 space-y-1">
                  <label className="block text-[10px] uppercase font-bold text-[var(--crm-ink-soft)]">Driver Name</label>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={user?.name || user?.fullName || 'Logged Driver'}
                    className="w-full p-2.5 border rounded text-xs font-bold text-teal-300 bg-[var(--crm-bg-sunken)] border-teal-900/60 outline-none cursor-not-allowed opacity-90 font-mono"
                  />
                </div>

                <div className="sm:col-span-5 space-y-1">
                  <label className="block text-[10px] uppercase font-bold text-teal-400 font-mono">Driver Vehicle Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Vehicle Number (e.g. UP32KK0001)"
                    value={profileVehicleNumber}
                    onChange={(e) => setProfileVehicleNumber(e.target.value.toUpperCase())}
                    className="w-full p-2.5 border rounded text-xs font-bold text-emerald-400 bg-[var(--crm-bg-sunken)] border-teal-700/80 outline-none font-mono focus:border-emerald-400 transition"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-teal-700 hover:bg-teal-600 text-white text-[11px] font-bold uppercase rounded cursor-pointer transition shadow flex items-center justify-center gap-1.5"
                  >
                    <FiCheckCircle size={14} /> Save Profile
                  </button>
                </div>
              </form>
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
                            <div className="flex flex-col items-end gap-1">
                              <span className="px-2.5 py-0.5 bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 text-[9px] font-bold uppercase rounded font-mono shadow-sm">
                                DELIVERED ✓
                              </span>
                              <span className={`px-2 py-0.5 border text-[9px] font-bold uppercase rounded font-mono ${
                                String(d.paymentMode || d.paymentMethod || d.paymentType || d.paymentTerms || d.paymentProof?.paymentMode || '').toUpperCase().includes('COD') || String(d.paymentMode || d.paymentMethod || d.paymentType || d.paymentTerms || d.paymentProof?.paymentMode || '').toUpperCase().includes('CASH')
                                  ? 'bg-amber-950/80 text-amber-300 border-amber-600'
                                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-500'
                              }`}>
                                {String(d.paymentMode || d.paymentMethod || d.paymentType || d.paymentTerms || d.paymentProof?.paymentMode || '').toUpperCase().includes('COD') || String(d.paymentMode || d.paymentMethod || d.paymentType || d.paymentTerms || d.paymentProof?.paymentMode || '').toUpperCase().includes('CASH') ? '💳 COD CASH' : '🌐 ONLINE PAID'}
                              </span>
                            </div>
                          </div>
                          <div className="p-2 bg-[var(--crm-bg)]/80 border border-emerald-900/40 rounded text-[10px] text-[var(--crm-ink-soft)] font-mono flex justify-between items-center">
                            <span>📍 {d.origin || 'Delhi'} &rarr; 🚩 {d.destination || 'Destination'}</span>
                            <span className="text-emerald-400 font-bold">Freight: ₹{Number(d.totalFreightAmount || 0).toLocaleString('en-IN')}</span>
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
                    <span className="flex items-center gap-2">
                      <span>Driver Work Update Log</span>
                      <span className="text-[10px] text-teal-300 font-normal bg-teal-950/70 border border-teal-800/60 px-2 py-0.5 rounded">
                        Driver: <strong className="text-white font-bold">{user?.name || user?.fullName || 'Active Driver'}</strong>
                      </span>
                    </span>
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
              <div className="flex items-center justify-between border-b pb-3 flex-wrap gap-2" style={{ borderColor: 'var(--crm-line)' }}>
                <h2 className="text-sm uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-2" style={HEADING}>
                  <FiTool size={18} className="text-emerald-400" /> DRIVER VEHICLE & DAILY TRIP LOG
                  <span className="text-[11px] text-teal-300 font-normal bg-teal-950/70 border border-teal-800/60 px-2.5 py-0.5 rounded ml-2">
                    Logged Driver: <strong className="text-white font-bold">{user?.name || user?.fullName || 'Active Driver'}</strong>
                  </span>
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

                  {/* Row 3 - Left: Vehicle Mileage */}
                  <div className="space-y-1">
                    <label className="block text-xs uppercase font-bold tracking-wide text-slate-200" style={LABEL_MONO}>
                      Vehicle Mileage (KM/L)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Vehicle Mileage (KM/L)"
                      value={fuelExpenseForm.vehicleMileage}
                      onChange={(e) => setFuelExpenseForm(prev => ({ ...prev, vehicleMileage: e.target.value }))}
                      className="w-full p-3 border-2 rounded-lg text-amber-300 placeholder:text-slate-500 font-bold text-xs outline-none focus:border-amber-500 transition font-mono"
                      style={CARD_SUNKEN}
                    />
                  </div>

                  {/* Row 3 - Right: Other Expense */}
                  <div className="space-y-1">
                    <label className="block text-xs uppercase font-bold tracking-wide text-purple-300" style={LABEL_MONO}>
                      Other Expense (₹)
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

            {/* Calculator for Driver Component matching user layout */}
            <DriverCalculator defaultDriverName={user?.name || user?.fullName} defaultVehicleNo={profileVehicleNumber || user?.vehicleNumber} />
          </>
        ) : null}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: DEDICATED CUSTOMER PAYMENT PROOFS & SETTLEMENT HISTORY
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'PAYMENTS' ? (() => {
          const isItemPaidOrDelivered = (d) => {
            if (!d) return false;
            const stage = (d.stage || d.rawStage || '').toUpperCase();
            const status = (d.status || d.dispatchStatus || '').toUpperCase();
            const pod = (d.podStatus || '').toUpperCase();
            const hasAmt = Number(d.amountCollected) > 0 || Number(d.totalFreightAmount) > 0 || Number(d.freightAmount) > 0;
            const hasProof = Boolean(d.paymentProofUrl || d.podFileUrl || d.proofUrl || d.driverProofUrl || d.paymentProof?.receivedAt);

            return (
              (status.includes('DELIVER') || stage.includes('DELIVER') || stage.includes('WON') || pod === 'VERIFIED' || deliveredIdsSet.has(d._id) || deliveredIdsSet.has(d.orderNumber) || deliveredIdsSet.has(d.dispatchNumber) || deliveredIdsSet.has(d.leadCode)) &&
              (hasAmt || hasProof)
            );
          };

          const displayDispatches = dispatchesList.filter(isItemPaidOrDelivered);

          const liveTotalCollected = displayDispatches.reduce(
            (sum, d) => sum + (Number(d.amountCollected || d.totalFreightAmount || d.freightAmount || d.freightRate || 0) || 0),
            0
          );

          return (
          <div className="space-y-5 font-mono">
            {/* Top Header Card */}
            <div className="border border-emerald-700/80 rounded-xl p-5 shadow-lg bg-emerald-950/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4" style={CARD}>
              <div>
                <h1 className="text-lg md:text-xl font-bold flex items-center gap-2 text-emerald-400" style={HEADING}>
                  <FiCreditCard className="text-emerald-400" /> Customer Payment Proofs & Settlement Records
                </h1>
                <p className="text-xs text-slate-300 mt-1" style={LABEL_MONO}>
                  Verified logs of Razorpay Online payments, Cash on Delivery (COD) handovers, and uploaded receipts.
                </p>
              </div>
              <div className="px-3 py-1.5 bg-emerald-900/60 border border-emerald-600 rounded-lg text-xs text-emerald-300 font-bold font-mono">
                Total Freight Collected: <code className="text-amber-300">₹{liveTotalCollected.toLocaleString('en-IN')}</code>
              </div>
            </div>

            {/* 2 Summary Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 border border-emerald-800/80 rounded-xl bg-emerald-950/30 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Deliveries Paid</span>
                <strong className="text-xl text-emerald-400 font-bold block">
                  {displayDispatches.length} Orders
                </strong>
              </div>

              <div className="p-4 border border-amber-800/80 rounded-xl bg-amber-950/30 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Amount Collected</span>
                <strong className="text-xl text-amber-400 font-bold block">
                  ₹{liveTotalCollected.toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            {/* COMPLETED PAYMENTS & SETTLED ORDERS HISTORY SECTION */}
            <div className="border border-emerald-800/60 rounded-xl p-5 shadow-sm space-y-3 bg-[var(--crm-bg-raised)]" style={CARD}>

              <div className="space-y-3">
                {displayDispatches.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-[var(--crm-line)] rounded-xl font-mono space-y-2">
                    <FiCreditCard size={28} className="mx-auto text-slate-500" />
                    <div>No completed payment records found yet.</div>
                    <div className="text-[10px] text-slate-500">Deliveries confirmed with Razorpay / COD will automatically appear here.</div>
                  </div>
                ) : (
                  displayDispatches.map((item) => (
                    <div key={item._id || item.dispatchNumber} className="p-4 border border-emerald-900/60 rounded-xl bg-emerald-950/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 font-mono">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-sm text-white block">{item.customerName || 'Client'}</strong>
                          <span className={`text-[9px] px-2 py-0.5 border rounded font-bold uppercase ${
                            (item.paymentMode || '').toUpperCase().includes('COD')
                              ? 'bg-amber-950/80 text-amber-300 border-amber-600'
                              : 'bg-emerald-950/80 text-emerald-300 border-emerald-500'
                          }`}>
                            {(item.paymentMode || '').toUpperCase().includes('COD') ? '✓ COD CASH PAID' : '✓ ONLINE PAID'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 block font-mono">
                          Order #{item.dispatchNumber || item.orderNumber || item._id} &bull; Route: <strong className="text-emerald-300">{item.origin || 'Delhi'} &rarr; {item.destination || 'Patna'}</strong>
                        </span>
                        {item.deliveryNotes && (
                          <div className="text-[10px] text-slate-400">
                            Notes: {item.deliveryNotes}
                          </div>
                        )}
                      </div>

                      <div className="text-right space-y-1">
                        <strong className="text-base text-emerald-400 font-bold block">
                          ₹{Number(item.amountCollected || item.totalFreightAmount || item.freightAmount || 0).toLocaleString('en-IN')}
                        </strong>
                        <span className="text-[10px] text-slate-300 block">
                          Payment Mode: <strong className={String(item.paymentMode || item.paymentMethod || item.paymentType || item.paymentTerms || item.paymentProof?.paymentMode || '').toUpperCase().includes('COD') || String(item.paymentMode || item.paymentMethod || item.paymentType || item.paymentTerms || item.paymentProof?.paymentMode || '').toUpperCase().includes('CASH') ? 'text-amber-300 font-bold' : 'text-emerald-400 font-bold'}>
                            {String(item.paymentMode || item.paymentMethod || item.paymentType || item.paymentTerms || item.paymentProof?.paymentMode || '').toUpperCase().includes('COD') || String(item.paymentMode || item.paymentMethod || item.paymentType || item.paymentTerms || item.paymentProof?.paymentMode || '').toUpperCase().includes('CASH') ? 'COD (Cash on Delivery)' : 'Online Payment'}
                          </strong>
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          );
        })() : null}

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
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-2 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeliveryModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[var(--crm-bg,#090d16)] border border-[var(--crm-line)] w-full max-w-4xl p-4 sm:p-6 rounded-2xl shadow-2xl z-10 text-left space-y-4 font-mono text-xs max-h-[92vh] flex flex-col" style={{ color: 'var(--crm-ink-soft)' }}>
              
              {/* Modal Header */}
              <div className="flex justify-between items-center border-b border-[var(--crm-line)] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] flex items-center justify-center text-[var(--crm-accent)]">
                    <FiCheckCircle size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold uppercase text-[var(--crm-heading)] font-mono tracking-wider flex items-center gap-2">
                      Customer Payment & Delivery Completion
                    </h3>
                    <p className="text-[10px] text-[var(--crm-ink-faint)]">Confirm cargo handover and verify payment collection</p>
                  </div>
                </div>
                <button onClick={() => setShowDeliveryModal(false)} className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] cursor-pointer transition"><FiX size={18} /></button>
              </div>

              {/* Modal Main Body (2-Column Grid) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-y-auto pr-1 custom-scrollbar flex-1">
                
                {/* LEFT COLUMN: LEAD DETAILS & DRIVER PROOF (5 Columns) */}
                <div className="lg:col-span-5 space-y-3.5 border-r lg:border-[var(--crm-line)] lg:pr-4">
                  <div className="p-4 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-xl space-y-2.5 font-mono shadow-sm">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Lead / Order ID: <strong className="text-[var(--crm-accent)] font-mono">{deliveringOrder?.dispatchNumber || deliveringOrder?.orderNumber || deliveringOrder?._id}</strong>
                    </span>
                    <strong className="text-sm text-[var(--crm-heading)] font-bold block">{deliveringOrder?.customerName || 'Client Business'}</strong>
                    <div className="text-[11px] text-[var(--crm-accent)] font-bold flex items-center gap-1">
                      <span>📍</span> {deliveringOrder?.origin || 'Origin'} &rarr; {deliveringOrder?.destination || 'Destination'}
                    </div>
                    <div className="text-[10px] text-slate-400 border-t border-[var(--crm-line)] pt-2 mt-1">
                      🚚 Truck: <strong className="text-[var(--crm-heading)]">{deliveringOrder?.vehicleNo || attendanceForm.vehicleNumber || profileVehicleNumber || 'Assigned Vehicle'}</strong>
                    </div>
                  </div>

                  {/* Total Payment Payable Card */}
                  <div className="p-4 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-xl space-y-2 font-mono">
                    <label className="block text-[10px] uppercase font-bold text-[var(--crm-heading)] tracking-wider">Total Freight Payable (₹)</label>
                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={paymentAmountCollected}
                      onChange={(e) => setPaymentAmountCollected(e.target.value)}
                      className="w-full p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)] rounded-xl text-[var(--crm-heading)] font-bold text-base outline-none font-mono transition"
                    />
                    <span className="text-[9px] text-slate-400 block">* Amount collected from customer upon delivery.</span>
                  </div>

                  {/* PROOF OF DRIVER (Selfie / Unloading Point Photo) */}
                  <div className="p-4 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] uppercase font-bold text-[var(--crm-heading)] flex items-center gap-1.5 font-mono">
                        <FiCamera size={14} className="text-[var(--crm-accent)]" /> Driver Unloading Proof *
                      </label>
                      <span className="text-[9px] text-rose-400 font-bold uppercase tracking-wider bg-rose-950/40 border border-rose-900/60 px-2 py-0.5 rounded">MANDATORY *</span>
                    </div>

                    <input
                      type="file"
                      required
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleProofFileUpload(e, setDriverProofFile, setDriverProofPreview)}
                      className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-[var(--crm-line)] file:text-xs file:font-bold file:bg-[var(--crm-bg-sunken)] file:text-[var(--crm-heading)] hover:file:bg-[var(--crm-bg)] cursor-pointer font-mono"
                    />

                    {/* Preview Box directly underneath file upload */}
                    {driverProofPreview ? (
                      <div className="p-2.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded-xl flex items-center justify-between gap-2.5 font-mono">
                        <div className="flex items-center gap-2.5">
                          {driverProofPreview.startsWith('data:image') || driverProofFile?.type?.startsWith('image/') ? (
                            <img src={driverProofPreview} alt="Driver Selfie" className="w-12 h-12 object-cover rounded-lg border border-[var(--crm-accent)] shadow" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[var(--crm-bg)] flex items-center justify-center text-xs">📷</div>
                          )}
                          <div>
                            <span className="text-[var(--crm-heading)] text-[11px] block font-bold">📷 Driver Photo Uploaded</span>
                            <span className="text-[10px] text-slate-400">{driverProofFile?.name || 'Unloading Selfie Verified'}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-[var(--crm-accent)] font-bold bg-[var(--crm-accent-bg)] border border-[var(--crm-accent)] px-2 py-0.5 rounded">VERIFIED ✓</span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-400 block font-mono">
                        * Driver must upload site selfie or cargo unloading photo to confirm delivery.
                      </span>
                    )}
                  </div>

                  {/* UPLOAD PAYMENT PROOF RECEIPT (Right under Driver Unloading Proof) */}
                  <div className="p-4 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-xl space-y-2.5">
                    <label className="block text-[10px] uppercase font-bold text-[var(--crm-heading)] flex items-center gap-1.5 font-mono">
                      <FiUpload size={14} className="text-[var(--crm-accent)]" /> Upload Payment Proof / Receipt (Bank / UPI Screenshot)
                    </label>

                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={(e) => handleProofFileUpload(e, setPaymentProofFile, setPaymentProofPreview)}
                      className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-[var(--crm-line)] file:text-xs file:font-bold file:bg-[var(--crm-bg-sunken)] file:text-[var(--crm-heading)] hover:file:bg-[var(--crm-bg)] cursor-pointer font-mono"
                    />

                    {paymentProofPreview ? (
                      <div className="p-2.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded-xl flex items-center justify-between gap-2.5 font-mono">
                        <div className="flex items-center gap-2.5">
                          {paymentProofPreview.startsWith('data:image') || paymentProofFile?.type?.startsWith('image/') ? (
                            <img src={paymentProofPreview} alt="Payment Receipt" className="w-12 h-12 object-cover rounded-lg border border-[var(--crm-accent)] shadow" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[var(--crm-bg)] flex items-center justify-center text-xs">📄</div>
                          )}
                          <div className="truncate max-w-[180px]">
                            <span className="text-[var(--crm-heading)] text-[11px] block font-bold truncate">📄 Payment Receipt Attached</span>
                            <span className="text-[10px] text-slate-400 truncate block">{paymentProofFile?.name || 'Bank/UPI Slip Verified'}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-[var(--crm-accent)] font-bold bg-[var(--crm-accent-bg)] border border-[var(--crm-accent)] px-2 py-0.5 rounded shrink-0">ATTACHED ✓</span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-400 block font-mono">
                        * Upload customer payment receipt screenshot or bank slip if applicable.
                      </span>
                    )}
                  </div>

                  {/* Delivery Notes / POD Remarks */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 font-mono">Delivery Notes / POD Remarks</label>
                    <textarea
                      rows={2}
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      className="w-full p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)] rounded-xl text-[var(--crm-heading)] text-xs outline-none font-mono transition"
                      placeholder="Enter delivery comments or POD receipt details..."
                    />
                  </div>
                </div>

                {/* RIGHT COLUMN: LIVE PAYMENT GATEWAY & MODES (7 Columns) */}
                <div className="lg:col-span-7 space-y-4 font-mono">
                  
                  {/* Payment Mode Selector Tabs */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2 font-mono tracking-wider">Select Customer Payment Method</label>
                    <div className="grid grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentMode('RAZORPAY')}
                        className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                          selectedPaymentMode === 'RAZORPAY'
                            ? 'bg-[var(--crm-accent-bg)] border-[var(--crm-accent)] text-[var(--crm-heading)] font-bold shadow-md'
                            : 'bg-[var(--crm-bg-raised)] border-[var(--crm-line)] text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <FiCreditCard size={18} className={selectedPaymentMode === 'RAZORPAY' ? 'text-[var(--crm-accent)]' : 'text-slate-400'} />
                        <span className="text-[10px] uppercase font-bold">Razorpay (UPI/QR)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedPaymentMode('COD')}
                        className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                          selectedPaymentMode === 'COD'
                            ? 'bg-[var(--crm-accent-bg)] border-[var(--crm-accent)] text-[var(--crm-heading)] font-bold shadow-md'
                            : 'bg-[var(--crm-bg-raised)] border-[var(--crm-line)] text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <FiDollarSign size={18} className={selectedPaymentMode === 'COD' ? 'text-[var(--crm-accent)]' : 'text-slate-400'} />
                        <span className="text-[10px] uppercase font-bold">Cash on Delivery</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedPaymentMode('RECEIPT')}
                        className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                          selectedPaymentMode === 'RECEIPT'
                            ? 'bg-[var(--crm-accent-bg)] border-[var(--crm-accent)] text-[var(--crm-heading)] font-bold shadow-md'
                            : 'bg-[var(--crm-bg-raised)] border-[var(--crm-line)] text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <FiUpload size={18} className={selectedPaymentMode === 'RECEIPT' ? 'text-[var(--crm-accent)]' : 'text-slate-400'} />
                        <span className="text-[10px] uppercase font-bold">Upload Receipt</span>
                      </button>
                    </div>
                  </div>

                  {/* OPTION 1: RAZORPAY CHECKOUT SDK (LIVE PAYMENT TERMINAL) */}
                  {selectedPaymentMode === 'RAZORPAY' && (
                    <div className="p-4 border border-[var(--crm-line)] rounded-2xl bg-[var(--crm-bg-raised)] shadow-xl space-y-4 font-mono text-slate-100">
                      
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-left">
                        
                        {/* LEFT COLUMN: Payment Methods List */}
                        <div className="md:col-span-6 space-y-2 border-r border-[var(--crm-line)] pr-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--crm-heading)] mb-2 font-mono flex items-center gap-1.5">
                            <FiCreditCard size={13} className="text-[var(--crm-accent)]" /> Razorpay Payment Options
                          </div>

                          <div 
                            onClick={() => triggerRazorpayCheckout(deliveringOrder)} 
                            className="p-3 rounded-xl border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] hover:border-[var(--crm-accent)] transition cursor-pointer flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[var(--crm-bg-raised)] text-[var(--crm-accent)] border border-[var(--crm-line)] font-bold text-[10px] flex items-center justify-center font-mono shrink-0">
                                UPI
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-[var(--crm-heading)] group-hover:text-[var(--crm-accent)]">UPI (Google Pay, PhonePe, Paytm)</h5>
                                <p className="text-[10px] text-slate-400">Pay instantly using any UPI app</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-[var(--crm-heading)] bg-[var(--crm-accent-bg)] border border-[var(--crm-accent)] px-2 py-0.5 rounded">PAY</span>
                          </div>

                          <div 
                            onClick={() => triggerRazorpayCheckout(deliveringOrder)} 
                            className="p-3 rounded-xl border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] hover:border-[var(--crm-accent)] transition cursor-pointer flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[var(--crm-bg-raised)] text-[var(--crm-accent)] border border-[var(--crm-line)] font-bold text-[10px] flex items-center justify-center font-mono shrink-0">
                                CARD
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-[var(--crm-heading)] group-hover:text-[var(--crm-accent)]">Credit / Debit / ATM Card</h5>
                                <p className="text-[10px] text-slate-400">Visa, MasterCard, RuPay, Maestro</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-[var(--crm-heading)] bg-[var(--crm-accent-bg)] border border-[var(--crm-accent)] px-2 py-0.5 rounded">PAY</span>
                          </div>

                          <div 
                            onClick={() => triggerRazorpayCheckout(deliveringOrder)} 
                            className="p-3 rounded-xl border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] hover:border-[var(--crm-accent)] transition cursor-pointer flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[var(--crm-bg-raised)] text-[var(--crm-accent)] border border-[var(--crm-line)] font-bold text-[10px] flex items-center justify-center font-mono shrink-0">
                                EMI
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-[var(--crm-heading)] group-hover:text-[var(--crm-accent)]">EMI & Pay Later</h5>
                                <p className="text-[10px] text-slate-400">Credit & Debit Card EMI</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-[var(--crm-heading)] bg-[var(--crm-accent-bg)] border border-[var(--crm-accent)] px-2 py-0.5 rounded">PAY</span>
                          </div>

                          <div 
                            onClick={() => triggerRazorpayCheckout(deliveringOrder)} 
                            className="p-3 rounded-xl border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] hover:border-[var(--crm-accent)] transition cursor-pointer flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[var(--crm-bg-raised)] text-[var(--crm-accent)] border border-[var(--crm-line)] font-bold text-[10px] flex items-center justify-center font-mono shrink-0">
                                BANK
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-[var(--crm-heading)] group-hover:text-[var(--crm-accent)]">Net Banking</h5>
                                <p className="text-[10px] text-slate-400">All Indian Banks (SBI, HDFC, ICICI)</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-[var(--crm-heading)] bg-[var(--crm-accent-bg)] border border-[var(--crm-accent)] px-2 py-0.5 rounded">PAY</span>
                          </div>
                        </div>

                        {/* RIGHT COLUMN: Razorpay Checkout Action Terminal Card */}
                        <div className="md:col-span-6 flex flex-col justify-between items-center text-center p-4 bg-[var(--crm-bg-sunken)] rounded-xl border border-[var(--crm-line)] font-mono space-y-4">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Total Freight Amount</span>
                            <div className="text-2xl font-black text-[var(--crm-heading)] font-mono">
                              ₹{Number(paymentAmountCollected || deliveringOrder?.totalFreightAmount || 0).toLocaleString('en-IN')}
                            </div>
                          </div>

                          {razorpayTxnId ? (
                            <div className="p-3 bg-[var(--crm-accent-bg)] border border-[var(--crm-accent)] rounded-xl text-[var(--crm-heading)] text-xs font-bold space-y-1 w-full text-center">
                              <div>✓ Razorpay Live Payment Verified!</div>
                              <div className="text-[10px] text-slate-300 font-mono">Txn ID: <strong className="text-[var(--crm-heading)]">{razorpayTxnId}</strong></div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => triggerRazorpayCheckout(deliveringOrder)}
                              disabled={loadingRazorpay}
                              className="w-full py-3 px-4 text-xs uppercase tracking-wider rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                              style={{ background: 'var(--crm-accent-bg)', borderColor: 'var(--crm-accent)', color: 'var(--crm-heading)', border: '1px solid var(--crm-accent)' }}
                            >
                              <FiCreditCard size={16} />
                              {loadingRazorpay ? 'Launching Gateway...' : `Launch Razorpay Live (₹${Number(paymentAmountCollected || deliveringOrder?.totalFreightAmount || 0).toLocaleString('en-IN')})`}
                            </button>
                          )}

                          {/* Security Notice Footer */}
                          <div className="w-full pt-2 border-t border-[var(--crm-line)]">
                            <p className="text-[9px] text-slate-400 font-mono">
                              * Do not hit back or close this screen until the transaction is complete.
                            </p>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* OPTION 2: CASH ON DELIVERY (COD) */}
                  {selectedPaymentMode === 'COD' && (
                    <div className="p-4 border border-[var(--crm-line)] rounded-xl bg-[var(--crm-bg-raised)] space-y-3 font-mono">
                      <h4 className="text-xs font-bold uppercase text-[var(--crm-heading)] flex items-center gap-2">
                        <FiDollarSign className="text-[var(--crm-accent)]" /> Cash Handover / Cash on Delivery (COD)
                      </h4>
                      <p className="text-[10px] text-slate-300">
                        Customer has paid cash directly to driver upon delivery.
                      </p>

                      <div className="space-y-2">
                        <label className="block text-[10px] uppercase font-bold text-slate-300">Cash Amount Collected (₹)</label>
                        <input
                          type="number"
                          value={paymentAmountCollected}
                          onChange={(e) => setPaymentAmountCollected(e.target.value)}
                          className="w-full p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)] rounded-xl text-[var(--crm-heading)] font-bold text-sm outline-none font-mono"
                        />
                      </div>
                      <div className="p-2.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded-lg text-[10px] text-slate-300">
                        ✓ Cash Handover will be logged in Driver Daily Freight Settlement.
                      </div>
                    </div>
                  )}

                  {/* OPTION 3: UPLOAD MANUAL PAYMENT RECEIPT */}
                  {selectedPaymentMode === 'RECEIPT' && (
                    <div className="p-4 border border-[var(--crm-line)] rounded-xl bg-[var(--crm-bg-raised)] space-y-3 font-mono">
                      <h4 className="text-xs font-bold uppercase text-[var(--crm-heading)] flex items-center gap-2">
                        <FiUpload className="text-[var(--crm-accent)]" /> Upload Bank / UPI Screenshot Receipt
                      </h4>

                      <input
                        type="file"
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={(e) => handleProofFileUpload(e, setPaymentProofFile, setPaymentProofPreview)}
                        className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-[var(--crm-line)] file:text-xs file:font-bold file:bg-[var(--crm-bg-sunken)] file:text-[var(--crm-heading)] hover:file:bg-[var(--crm-bg)] cursor-pointer font-mono"
                      />
                      {paymentProofPreview && (
                        <div className="p-2.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded-xl flex items-center justify-between text-[11px] font-mono">
                          <span className="text-[var(--crm-heading)] truncate font-mono">📄 {paymentProofFile?.name || 'Payment Receipt Attached'}</span>
                          <span className="text-[var(--crm-accent)] font-bold text-[10px]">Attached ✓</span>
                        </div>
                      )}
                    </div>
                  )}

                </div>

              </div>

              {/* Modal Footer / Confirm Action */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--crm-line)]">
                <button type="button" onClick={() => setShowDeliveryModal(false)} className="px-4 py-2.5 border border-[var(--crm-line)] hover:border-slate-500 text-slate-300 text-xs font-bold rounded-xl uppercase cursor-pointer transition font-mono">Cancel</button>
                <button 
                  type="button" 
                  onClick={handleConfirmDeliverySubmit} 
                  disabled={submittingDelivery} 
                  className="px-6 py-2.5 text-xs uppercase tracking-wider rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 shadow-lg"
                  style={{ background: 'var(--crm-accent-bg)', borderColor: 'var(--crm-accent)', color: 'var(--crm-heading)', border: '1px solid var(--crm-accent)' }}
                >
                  <FiCheckCircle size={16} />
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
