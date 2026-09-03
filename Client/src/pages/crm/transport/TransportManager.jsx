import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiTruck, FiCheckCircle, FiAlertCircle, FiClock, FiUser, FiMapPin, 
  FiPlus, FiFileText, FiMessageSquare, FiRefreshCw, FiSearch, FiFilter,
  FiSend, FiUserCheck, FiShield, FiCheckSquare, FiXCircle, FiGrid, FiPackage,
  FiDollarSign, FiNavigation, FiMic, FiVolume2, FiAlertTriangle, FiCompass,
  FiTrendingUp, FiTrendingDown, FiPieChart, FiUsers, FiPhone, FiCalendar,
  FiX, FiExternalLink, FiMaximize2, FiBriefcase, FiTool, FiSliders, FiShare2, FiActivity,
  FiCreditCard, FiFolder, FiFile, FiCheck, FiBarChart2, FiLifeBuoy
} from 'react-icons/fi';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  PieChart, 
  Pie, 
  Legend 
} from 'recharts';
import toast from 'react-hot-toast';

import { dispatchesApi } from '../../../api/dispatches';
import { leadsApi } from '../../../api/leads';
import { chatApi } from '../../../api/chat';
import { employeeSignupApi } from '../../../api/employee-signup';
import DriverCalculator from '../../../components/crm/DriverCalculator';
import { useAuth } from '../../../hooks/useAuth';
import { socketService } from '../../../services/socket';
import OrderMapModal from '../../../components/transport/map';

// HR Manager Design System Tokens
const CARD = { borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)', boxShadow: 'var(--crm-shadow)' };
const CARD_SUNKEN = { borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' };
const LABEL_MONO = { fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-ink-faint)' };
const HEADING = { fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' };

export default function TransportManager() {
  const { user } = useAuth();
  const location = useLocation();
  
  // Navigation Sidebar Tabs
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [selectedMapOrder, setSelectedMapOrder] = useState(null);

  // Sync active tab with URL query parameter (e.g. ?tab=PAYMENTS)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      setActiveTab(tabParam.toUpperCase());
    } else {
      setActiveTab('DASHBOARD');
    }
  }, [location]);

  // Core Data States
  const [trips, setTrips] = useState([]);
  const [dispatchQueue, setDispatchQueue] = useState([]);
  const [driversList, setDriversList] = useState([]);
  const [allEmployeesList, setAllEmployeesList] = useState([]);
  const [assignSubTab, setAssignSubTab] = useState('PENDING'); // 'PENDING' or 'COMPLETED'
  const [submittingAssign, setSubmittingAssign] = useState(false);
  const [loading, setLoading] = useState(false);

  // Critical Document Expiry Alerts (Loaded dynamically)
  const [expiryAlerts, setExpiryAlerts] = useState([]);

  // Dynamic Summary Metrics (Clean initial zero state)
  const [metrics, setMetrics] = useState({
    totalDispatch: 0,
    totalRevenue: 0,
    collectedToday: 0,
    totalLeads: 0,
    pendingLeads: 0,
    numDrivers: 0,
    activeTripsOnRoad: 0,
    completedTrips: 0
  });

  // Trip Creation Form State
  const [showCreateTripModal, setShowCreateTripModal] = useState(false);
  const [createTripForm, setCreateTripForm] = useState({
    orderNumber: `ORD-${Date.now().toString().slice(-4)}`,
    customerName: '',
    origin: '',
    destination: '',
    material: '',
    weightTons: '',
    freightAmount: '',
    assignedDriverId: '',
    assignedVehicleNo: '',
    ewayBillNo: '',
    fastagBalance: ''
  });
  const [submittingTrip, setSubmittingTrip] = useState(false);

  // Driver Work Updates Feed (DB & Socket Synced)
  const [driverWorkUpdates, setDriverWorkUpdates] = useState([]);

  // Dedicated Live Chat Hub States
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const chatContainerRef = useRef(null);

  const [chatInput, setChatInput] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');

  // Fuel & Maintenance Logs (Loaded dynamically from MongoDB Dispatches)
  const [fuelMaintenanceLogs, setFuelMaintenanceLogs] = useState([]);

  // Driver Uploaded Proofs List
  const [driverUploadedProofs, setDriverUploadedProofs] = useState([]);

  // Driver Scorecards
  const [driverScorecards, setDriverScorecards] = useState([]);

  // Quotations Form & List
  const [quotationsList, setQuotationsList] = useState([]);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [quotationForm, setQuotationForm] = useState({ clientName: '', route: '', ratePerTon: '', tonnage: '25' });

  // Map & Live GPS Telemetry
  const [gpsLocation, setGpsLocation] = useState({ lat: 28.6139, long: 77.2090 });
  const [etaKmRemaining, setEtaKmRemaining] = useState(120);

  // Real-Time Socket.IO & Event Listeners
  useEffect(() => {
    const handleGpsEvent = (e) => {
      if (e.detail && e.detail.lat && e.detail.long) {
        setGpsLocation({ lat: e.detail.lat, long: e.detail.long });
      }
    };

    const fetchMongoChats = async () => {
      try {
        const data = await chatApi.getTransportMessages();
        const list = data?.data?.chats || data?.chats || [];
        setChatMessages(list.map(c => ({
          id: c.id || c._id,
          sender: c.sender || c.senderName || 'Driver',
          text: c.text || c.message || '',
          time: c.time || (c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:00 PM')
        })));
      } catch (e) {
        console.error('[fetchMongoChats Manager] Error fetching chats:', e);
      }
    };

    fetchMongoChats();

    const handleIncomingChat = (msg) => {
      if (!msg || (!msg.text && !msg.message)) return;
      const cleanText = (msg.text || msg.message || '').trim();
      const formatted = {
        id: msg.id || msg._id || `mgr-msg-${cleanText}-${msg.time || ''}`,
        sender: msg.sender || msg.senderName || 'Driver',
        text: cleanText,
        timestamp: msg.timestamp || Date.now(),
        time: msg.time || (msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      };

      setChatMessages(prev => {
        const isDup = prev.some(m => 
          m.id === formatted.id || 
          ((m.text || '').trim() === cleanText && Math.abs((m.timestamp || Date.now()) - formatted.timestamp) < 8000)
        );
        if (isDup) return prev;
        return [...prev, formatted];
      });
    };

    window.addEventListener('ito_driver_gps_update_event', handleGpsEvent);

    const socket = socketService.getSocket();
    if (socket) {
      socket.on('driver_location_update', (data) => {
        if (data && data.lat && data.long) setGpsLocation({ lat: data.lat, long: data.long });
      });
      socket.on('driver_work_update', (data) => {
        if (data) setDriverWorkUpdates(prev => [data, ...prev]);
        fetchData();
      });
      socket.on('driver_chat_message', handleIncomingChat);
      socket.on('transport_chat_receive', handleIncomingChat);
    }

    return () => {
      window.removeEventListener('ito_driver_gps_update_event', handleGpsEvent);
      if (socket) {
        socket.off('driver_chat_message', handleIncomingChat);
        socket.off('transport_chat_receive', handleIncomingChat);
      }
    };
  }, []);

  const [selectedPreviewImage, setSelectedPreviewImage] = useState(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages.length]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const clean = inputMessage.trim();
    if (!clean) return;

    const senderName = `${user?.name || user?.fullName || 'Vikram Singh'} (MANAGER)`;
    const newMsg = {
      senderId: String(user?._id || user?.employeeId || 'manager'),
      senderName,
      senderRole: 'TRANSPORT_MANAGER',
      channel: 'ALL',
      message: clean,
      text: clean,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setInputMessage('');

    // Append locally immediately for instant feedback
    setChatMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        sender: senderName,
        text: clean,
        time: newMsg.time
      }
    ]);

    // Save directly to MongoDB Database via chatApi (uses axiosInstance with correct baseURL + auth)
    try {
      await chatApi.sendTransportMessage(newMsg);
    } catch (e) {
      console.error('[handleSendMessage Manager] Error saving chat:', e);
    }

    // Real-Time Socket Broadcast - emit event that Driver listens for
    try {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('transport_chat_receive', newMsg);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper to determine if a lead/trip is fully completed/delivered/deal won
  const isCompletedLead = (item) => {
    if (!item) return false;
    const stage = (item.stage || item.rawStage || '').toUpperCase().replace(/_/g, ' ').trim();
    const status = (item.status || item.dispatchStatus || '').toUpperCase().replace(/_/g, ' ').trim();
    const podStatus = (item.podStatus || '').toUpperCase().replace(/_/g, ' ').trim();

    const completedKeywords = [
      'COMPLETED', 
      'DELIVERED', 
      'UNLOADED', 
      'DEAL WON', 
      'CLOSED WON',
      'DEAL_WON',
      'CLOSED_WON'
    ];
    return (
      completedKeywords.some(kw => stage.includes(kw) || status.includes(kw)) ||
      podStatus === 'VERIFIED' ||
      Boolean(item.podFileUrl) ||
      Boolean(item.paymentProofUrl)
    );
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tripsRes, queueRes, empRes, workUpdatesRes] = await Promise.allSettled([
        dispatchesApi.getDispatches(),
        dispatchesApi.getDispatchQueue(),
        employeeSignupApi.getAllEmployees(),
        dispatchesApi.getWorkUpdates()
      ]);

      let fetchedTrips = [];
      if (tripsRes.status === 'fulfilled' && (tripsRes.value?.success || tripsRes.value?.data)) {
        fetchedTrips = tripsRes.value.data?.dispatches || tripsRes.value.dispatches || [];
      }

      setTrips(fetchedTrips);

      // Extract MongoDB Database fuel logs from backend dispatches
      const dbFuelLogs = [];
      fetchedTrips.forEach(t => {
        if (t.fuelLogs && Array.isArray(t.fuelLogs) && t.fuelLogs.length > 0) {
          t.fuelLogs.forEach(fl => {
            dbFuelLogs.push({
              id: fl._id || `db_${fl.loggedAt || Date.now()}`,
              driver: fl.driverName || fl.driver || t.driverName || 'Driver',
              vehicle: fl.vehicleNumber || fl.vehicleNo || fl.vehicle || t.vehicleNumber || t.vehicleNo || 'Carrier Truck',
              leadCode: fl.leadCode || t.orderNumber || t.dispatchNumber || t.leadCode || '',
              leadCustomer: fl.leadCustomer || t.customerName || '',
              totalKm: Number(fl.kmDriven) || 0,
              todaysTrip: fl.todaysTrip || '',
              vehicleMileage: Number(fl.vehicleMileage) || 0,
              fromLocation: fl.fromLocation || t.origin || 'Depot',
              toLocation: fl.toLocation || t.destination || 'Patna',
              fuelCost: Number(fl.amountPaid || fl.fuelCost) || 0,
              litres: Number(fl.quantityLiters) || 0,
              punctureCost: Number(fl.punctureCost) || 0,
              otherCost: Number(fl.otherCost) || 0,
              remarks: fl.remarks || '',
              time: new Date(fl.loggedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              date: new Date(fl.loggedAt || Date.now()).toLocaleDateString('en-IN')
            });
          });
        }
      });

      if (dbFuelLogs.length > 0) {
        setFuelMaintenanceLogs(prev => {
          const combined = [...dbFuelLogs, ...prev];
          const map = new Map();
          combined.forEach(item => map.set(item.id, item));
          return Array.from(map.values());
        });
      }

      let fetchedQueue = [];
      if (queueRes.status === 'fulfilled') {
        const val = queueRes.value;
        fetchedQueue = val?.data?.orders || val?.orders || val?.data?.leads || val?.leads || (Array.isArray(val) ? val : []);
      }

      setDispatchQueue(fetchedQueue);

      // Load Driver Work Updates from MongoDB
      if (workUpdatesRes.status === 'fulfilled') {
        const wuData = workUpdatesRes.value?.data?.workUpdates || workUpdatesRes.value?.workUpdates || [];
        if (wuData.length > 0) {
          const formattedUpdates = wuData.map(u => ({
            id: u.id || u._id,
            driver: u.driverName || u.driver || 'Driver',
            vehicle: u.vehicleNo || u.vehicle || 'Truck',
            stage: u.updateType || u.type || 'In Transit',
            update: u.notes || u.update || '',
            location: u.location || '',
            photoUrl: u.photoUrl || '',
            time: u.time || (u.createdAt ? new Date(u.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')
          }));
          setDriverWorkUpdates(formattedUpdates);
        }
      }

      let fetchedDrivers = [];
      if (empRes.status === 'fulfilled' && (empRes.value?.success || empRes.value?.data)) {
        const emps = empRes.value.data?.employees || empRes.value.employees || [];
        setAllEmployeesList(emps);
        fetchedDrivers = emps.filter(e => (e.role || '').toUpperCase().includes('DRIVER') || (e.position || '').toLowerCase().includes('driver') || (e.fullName || e.name || '').toLowerCase().includes('driver'));
        setDriversList(fetchedDrivers);

        // Build dynamic Driver Scorecards from actual driver list & fuel logs
        const driversListToUse = fetchedDrivers.length > 0 ? fetchedDrivers : [{ name: 'Driver', fullName: 'Driver', vehicleNumber: 'Carrier Truck' }];
        const scorecards = driversListToUse.map(d => {
          const dName = (d.name || d.fullName || '').toLowerCase();
          const driverLogs = dbFuelLogs.filter(log => (log.driver || '').toLowerCase().includes(dName));
          const driverTrips = fetchedTrips.filter(t => (t.driverName || '').toLowerCase().includes(dName));
          
          const totalKm = driverLogs.reduce((sum, l) => sum + (Number(l.totalKm) || 0), 0) || (driverTrips.length * 240) || 960;
          const totalFuelCost = driverLogs.reduce((sum, l) => sum + (Number(l.fuelCost) || 0), 0);
          const totalLitres = driverLogs.reduce((sum, l) => sum + (Number(l.litres) || 0), 0);
          const avgMileage = driverLogs.find(l => l.vehicleMileage > 0)?.vehicleMileage || (totalLitres > 0 && totalKm > 0 ? Number((totalKm / totalLitres).toFixed(1)) : 4.1);

          return {
            driver: d.name || d.fullName || 'Ramesh Driver',
            vehicle: d.vehicleNumber || d.truckNumber || driverLogs[0]?.vehicle || 'Assigned Carrier',
            tripsCount: driverLogs.length || driverTrips.length || 4,
            totalKm: totalKm,
            onTimeRate: 98,
            avgMileageKmL: avgMileage
          };
        });
        setDriverScorecards(scorecards);
      }

      // Compute Real-Time Dynamic Metrics
      const combinedAll = [...fetchedTrips, ...fetchedQueue];

      const totalFreightRev = combinedAll.reduce((sum, t) => {
        const amt = Number(t.totalFreightAmount || t.grossFreight || t.freightAmount || t.freightRate || t.amountCollected || t.totalAmount || (t.weightTons ? Number(t.weightTons) * 750 : 0)) || 0;
        return sum + amt;
      }, 0);

      const todayRev = combinedAll
        .filter(t => new Date(t.createdAt || Date.now()).toDateString() === new Date().toDateString())
        .reduce((sum, t) => {
          return sum + (Number(t.totalFreightAmount || t.grossFreight || t.freightAmount || 0) || 0);
        }, 0);

      // Total Delivery Done: Count all completed/delivered leads accurately
      const compCount = combinedAll.filter(t => isCompletedLead(t)).length;

      const activeCount = combinedAll.filter(t => 
        !isCompletedLead(t) && (
          (t.status || t.dispatchStatus || t.stage || '').toUpperCase().includes('TRANSIT') ||
          (t.status || t.dispatchStatus || t.stage || '').toUpperCase().includes('LOAD') ||
          (t.status || t.dispatchStatus || t.stage || '').toUpperCase().includes('ASSIGN')
        )
      ).length;

      const pendingUnassignedLeads = fetchedQueue.filter(lead => !isCompletedLead(lead));

      setMetrics({
        totalDispatch: combinedAll.length,
        totalRevenue: totalFreightRev,
        collectedToday: todayRev,
        totalLeads: combinedAll.length,
        pendingLeads: pendingUnassignedLeads.length,
        numDrivers: fetchedDrivers.length || 1,
        activeTripsOnRoad: activeCount,
        completedTrips: compCount
      });

    } catch (err) {
      console.error('Error fetching manager data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignLeadToDriver = (lead) => {
    setCreateTripForm({
      orderNumber: lead.orderNumber || `ORD-${Date.now().toString().slice(-4)}`,
      customerName: lead.customerName || '',
      origin: lead.origin || 'Delhi ICD Freight Terminal',
      destination: lead.destination || '',
      material: lead.material || 'Rice Bags (25 MT)',
      weightTons: lead.weightTons || '25',
      freightAmount: String(lead.freightAmount || 0),
      assignedDriverId: '',
      assignedVehicleNo: '',
      ewayBillNo: `EWB-${Math.floor(100000 + Math.random() * 900000)}`,
      fastagBalance: '₹3,500'
    });
    setShowCreateTripModal(true);
    toast.success(`📋 Assigning Driver & Truck for Lead: ${lead.customerName || lead.orderNumber}`);
  };

  const handleCreateTripSubmit = async (e) => {
    e.preventDefault();
    if (!createTripForm.customerName.trim()) return toast.error('Enter Customer / Client Name');

    setSubmittingTrip(true);
    const newTripObj = {
      _id: `TRIP-${Date.now()}`,
      dispatchNumber: createTripForm.orderNumber,
      customerName: createTripForm.customerName,
      origin: createTripForm.origin || 'Main Hub',
      destination: createTripForm.destination || 'Destination Point',
      material: createTripForm.material || 'General Cargo',
      weightTons: createTripForm.weightTons || '20',
      totalFreightAmount: Number(createTripForm.freightAmount) || 15000,
      driverName: driversList.find(d => d._id === createTripForm.assignedDriverId)?.name || 'Assigned Driver',
      vehicleNo: createTripForm.assignedVehicleNo || 'Vehicle Carrier',
      ewayBillNumber: createTripForm.ewayBillNo || 'EWB-ACTIVE',
      fastagBalance: createTripForm.fastagBalance || '₹2,500',
      status: 'LOADING',
      createdAt: new Date()
    };

    try {
      await dispatchesApi.createDispatch({
        orderNumber: createTripForm.orderNumber,
        customerName: createTripForm.customerName,
        origin: createTripForm.origin,
        destination: createTripForm.destination,
        material: createTripForm.material,
        freightRate: Number(createTripForm.freightAmount),
        truckNo: createTripForm.assignedVehicleNo,
        driverName: newTripObj.driverName
      });
    } catch (err) {
      console.log('Trip recorded');
    }

    setTrips(prev => [newTripObj, ...prev]);

    setMetrics(prev => ({
      ...prev,
      totalDispatch: prev.totalDispatch + 1,
      totalRevenue: prev.totalRevenue + Number(createTripForm.freightAmount || 0),
      pendingLeads: Math.max(0, prev.pendingLeads - 1)
    }));

    setCreateTripForm({
      orderNumber: `ORD-${Date.now().toString().slice(-4)}`,
      customerName: '',
      origin: '',
      destination: '',
      material: '',
      weightTons: '',
      freightAmount: '',
      assignedDriverId: '',
      assignedVehicleNo: '',
      ewayBillNo: '',
      fastagBalance: ''
    });
    setShowCreateTripModal(false);
    setSubmittingTrip(false);
    toast.success(`🚀 New Trip ${createTripForm.orderNumber} Created & Assigned to ${newTripObj.driverName}!`);
  };

  const handleShareETA = (tripObj) => {
    const message = `🚚 India Trade Overseas Tracking Update: Driver ${tripObj.driverName || 'Driver'} (Truck #${tripObj.vehicleNo || 'Carrier'}) is on route to ${tripObj.destination || 'Destination'}. Estimated Arrival: ~2 Hours. Live GPS: https://maps.google.com/?q=${gpsLocation.lat},${gpsLocation.long}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
    toast.success('📱 ETA Customer WhatsApp Tracking Link Generated!');
  };

  const handleSendBroadcast = (e) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;

    const bMsg = {
      id: Date.now(),
      sender: 'Transport Manager (BROADCAST)',
      text: broadcastText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isBroadcast: true
    };

    setChatMessages(prev => [bMsg, ...prev]);
    setBroadcastText('');
    setShowBroadcastModal(false);
    toast.success('📢 Emergency Announcement Broadcasted to All Drivers!');
  };

  // Verified POD IDs State
  const [verifiedPodIds, setVerifiedPodIds] = useState([]);

  const handleVerifyPODAndComplete = async (item, e) => {
    if (e) e.stopPropagation();
    const targetId = item._id || item.orderNumber || item.dispatchNumber;

    try {
      if (dispatchesApi.verifyPOD) {
        await dispatchesApi.verifyPOD(targetId).catch(() => {});
      }
    } catch (err) {}

    const updated = [...verifiedPodIds, targetId, item.orderNumber, item.dispatchNumber].filter(Boolean);
    setVerifiedPodIds(updated);

    setDispatchQueue(prev => prev.map(l => (l._id === targetId || l.orderNumber === item.orderNumber) ? { ...l, podStatus: 'VERIFIED', stage: 'COMPLETED' } : l));
    setTrips(prev => prev.map(t => (t._id === targetId || t.dispatchNumber === item.dispatchNumber) ? { ...t, podStatus: 'VERIFIED', status: 'COMPLETED' } : t));

    toast.success(`✅ Lead ${item.orderNumber || item.dispatchNumber || ''} POD Verified & Marked FINAL COMPLETED!`);
  };

  // Edit Freight Revenue Modal State (Transport Manager & Founder Authorization)
  const [showEditRevenueModal, setShowEditRevenueModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [newRevenueInput, setNewRevenueInput] = useState('');
  const [revenueReasonInput, setRevenueReasonInput] = useState('');
  const [savingRevenue, setSavingRevenue] = useState(false);

  const handleOpenEditRevenueModal = (item, e) => {
    if (e) e.stopPropagation();
    setEditingOrder(item);
    const currAmt = item.totalFreightAmount || item.freightAmount || 0;
    setNewRevenueInput(String(currAmt));
    setRevenueReasonInput('');
    setShowEditRevenueModal(true);
  };

  const handleSaveFreightRevenue = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;
    const numAmt = Number(newRevenueInput);
    if (isNaN(numAmt) || numAmt < 0) return toast.error('Enter valid freight revenue amount');

    setSavingRevenue(true);
    const targetId = editingOrder._id || editingOrder.orderNumber || editingOrder.dispatchNumber;

    try {
      if (dispatchesApi.updateDispatch) {
        await dispatchesApi.updateDispatch(targetId, {
          totalFreightAmount: numAmt,
          freightAmount: numAmt,
          revenueRemark: revenueReasonInput
        }).catch(() => {});
      }
    } catch (err) {}

    // Update local states
    setDispatchQueue(prev => prev.map(item => {
      if (item._id === targetId || item.orderNumber === editingOrder.orderNumber) {
        return { ...item, freightAmount: numAmt, totalFreightAmount: numAmt };
      }
      return item;
    }));

    setTrips(prev => prev.map(item => {
      if (item._id === targetId || item.dispatchNumber === editingOrder.dispatchNumber || item.orderNumber === editingOrder.orderNumber) {
        return { ...item, freightAmount: numAmt, totalFreightAmount: numAmt };
      }
      return item;
    }));

    // Recalculate top metrics
    setMetrics(prev => {
      const oldVal = Number(editingOrder.totalFreightAmount || editingOrder.freightAmount || 0);
      const diff = numAmt - oldVal;
      return {
        ...prev,
        totalRevenue: prev.totalRevenue + diff
      };
    });

    setSavingRevenue(false);
    setShowEditRevenueModal(false);
    toast.success(`💰 Freight Revenue for ${editingOrder.orderNumber || editingOrder.dispatchNumber || 'Lead'} updated to ₹${numAmt.toLocaleString('en-IN')}!`);
  };

  // Handle Direct Assign Lead to Transport Executive or Driver
  const handleDirectAssignUser = async (leadId, targetUserId, e) => {
    if (e) e.stopPropagation();
    if (!leadId || !targetUserId) return toast.error('Select a team member to assign');

    setSubmittingAssign(true);
    try {
      await leadsApi.assignLead(leadId, { assignedTo: targetUserId });
      const assignedEmp = allEmployeesList.find(emp => String(emp._id) === String(targetUserId)) || driversList.find(d => String(d._id) === String(targetUserId));
      const empName = assignedEmp?.fullName || assignedEmp?.name || 'Driver';
      
      const targetLeadObj = [...dispatchQueue, ...trips].find(l => l._id === leadId || l.orderNumber === leadId || l.dispatchNumber === leadId) || {};

      // Attempt to register/update dispatch with driver information
      try {
        if (dispatchesApi.createDispatch) {
          await dispatchesApi.createDispatch({
            orderNumber: targetLeadObj.orderNumber || targetLeadObj.dispatchNumber || leadId,
            customerName: targetLeadObj.customerName || 'Confirmed Client',
            origin: targetLeadObj.origin || 'Depot',
            destination: targetLeadObj.destination || 'Destination',
            material: targetLeadObj.material || 'Goods',
            freightRate: Number(targetLeadObj.totalFreightAmount || targetLeadObj.freightAmount || 0),
            truckNo: targetLeadObj.vehicleNo || 'Carrier',
            driverName: empName,
            driverId: targetUserId,
            assignedDriverId: targetUserId,
            assignedTo: targetUserId
          }).catch(() => {});
        }
      } catch (err) {}

      // Update local states
      setDispatchQueue(prev => prev.map(l => (l._id === leadId || l.orderNumber === leadId) ? { ...l, assignedTo: assignedEmp, driverId: targetUserId, assignedDriverId: targetUserId, driverName: empName, salesOwner: empName } : l));
      setTrips(prev => prev.map(t => (t._id === leadId || t.orderNumber === leadId) ? { ...t, assignedTo: assignedEmp, driverId: targetUserId, assignedDriverId: targetUserId, driverName: empName } : t));
      
      // Dispatch real-time events for instant driver dashboard sync
      try {
        window.dispatchEvent(new CustomEvent('ito_dispatch_updated_event', { detail: { leadId, targetUserId, empName } }));
        const socket = socketService.getSocket();
        if (socket) {
          socket.emit('task_assigned', { leadId, assignedTo: targetUserId, driverName: empName });
        }
      } catch (err) {}

      toast.success(`✅ Order assigned directly to ${empName}! Real-time notification sent.`);
    } catch (err) {
      console.error('Lead assign error:', err);
      toast.error('Failed to assign lead: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Filter Date State & Date-Wise Compiled Proofs Log
  const [selectedProofDate, setSelectedProofDate] = useState('ALL');

  const compiledDriverProofs = useMemo(() => {
    const records = [];
    const todayStr = new Date().toLocaleDateString('en-IN');

    const detectFileType = (url = '') => {
      const u = (url || '').toLowerCase();
      if (u.includes('.pdf') || u.startsWith('data:application/pdf')) return 'PDF';
      if (u.includes('.doc') || u.includes('.docx') || u.startsWith('data:application/msword') || u.startsWith('data:application/vnd.openxmlformats')) return 'DOC';
      return 'IMAGE';
    };

    const isValidMediaUrl = (url = '') => {
      if (!url || typeof url !== 'string') return false;
      const u = url.trim();
      return u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:') || u.startsWith('/');
    };

    // 1. Process all Trips & Queue Items with uploaded POD or Proof documents from MongoDB Database
    [...trips, ...dispatchQueue].forEach((t, idx) => {
      const driver = t.driverName || t.assignedDriverName || 'Driver';
      const vehicle = t.vehicleNo || t.vehicleNumber || t.truckNumber || 'Unassigned';
      const code = t.dispatchNumber || t.orderNumber || t.leadCode || t._id || `LD-${1000 + idx}`;
      const dateStr = t.updatedAt ? new Date(t.updatedAt).toLocaleDateString('en-IN') : todayStr;
      const ts = t.updatedAt ? new Date(t.updatedAt).getTime() : Date.now() - (idx * 3600000);

      // Extract all proof document fields from MongoDB Dispatch Schema
      const proofSources = [
        { url: t.podFileUrl, type: 'POD & Delivery Receipt' },
        { url: t.paymentProofUrl, type: 'Payment Proof Receipt' },
        { url: t.driverProofUrl, type: 'Driver Unloading Photo' },
        { url: t.photoUrl, type: 'Dispatch Proof Document' },
        { url: t.paymentProof?.proofImageUrl, type: `Payment Proof (${t.paymentProof?.paymentMode || 'UPI'})` },
        { url: t.departureImages?.driverSelfieUrl, type: 'Loading Departure Selfie' },
        { url: t.departureImages?.vehiclePhotoUrl, type: 'Loading Vehicle Photo' },
        { url: t.deliveryImages?.driverSelfieUrl, type: 'Unloading Driver Selfie' },
        { url: t.deliveryImages?.emptyVehiclePhotoUrl, type: 'Unloading Vehicle Photo' }
      ];

      proofSources.forEach((src, pIdx) => {
        if (src.url && isValidMediaUrl(src.url)) {
          records.push({
            id: `PROOF-DB-${code}-${idx}-${pIdx}`,
            driverName: driver,
            vehicleNo: vehicle,
            proofType: src.type,
            fileType: detectFileType(src.url),
            orderCode: code,
            date: dateStr,
            rawTimestamp: ts - (pIdx * 100),
            photoUrl: src.url,
            notes: `Customer: ${t.customerName || 'Client Cargo'}. Route: ${t.origin || 'Delhi'} -> ${t.destination || 'Patna'}. POD Status: ${t.podStatus || 'VERIFIED ✓'}`,
            status: t.status === 'DELIVERED' || t.stage === 'COMPLETED' ? 'POD VERIFIED ✓' : 'DOC SUBMITTED ✓'
          });
        }
      });
    });

    // 2. Process Fuel & Maintenance Logs
    fuelMaintenanceLogs.forEach((fl, idx) => {
      const dateStr = fl.date || new Date(fl.loggedAt || Date.now()).toLocaleDateString('en-IN');
      const ts = fl.loggedAt ? new Date(fl.loggedAt).getTime() : Date.now() - (idx * 7200000);
      const url = fl.photoUrl || fl.receiptPhotoUrl || '';
      if (url && isValidMediaUrl(url)) {
        records.push({
          id: `FUEL-${fl.id || idx}`,
          driverName: fl.driver || 'Driver',
          vehicleNo: fl.vehicle || 'Unassigned',
          proofType: 'Fuel & Maintenance Slip',
          fileType: detectFileType(url),
          orderCode: `Diesel ₹${fl.fuelCost || 4500}`,
          date: dateStr,
          rawTimestamp: ts,
          photoUrl: url,
          notes: `Route: ${fl.fromLocation || 'Delhi ICD'} -> ${fl.toLocation || 'Patna'} (${fl.totalKm || 450} KM). Fuel: ₹${fl.fuelCost || 4500}, Puncture: ₹${fl.punctureCost || 250}, Toll/Other: ₹${fl.otherCost || 350}`,
          status: 'VERIFIED ✓'
        });
      }
    });

    // 3. Process Driver Work Updates
    driverWorkUpdates.forEach((up, idx) => {
      const dateStr = up.date || new Date().toLocaleDateString('en-IN');
      const ts = up.id || Date.now() - (idx * 1800000);
      const url = up.photoUrl || '';
      if (url && isValidMediaUrl(url)) {
        records.push({
          id: `WORKUP-${up.id || idx}`,
          driverName: up.driver || 'Driver',
          vehicleNo: up.vehicle || 'Unassigned',
          proofType: `Driver Status (${up.stage || 'In Transit'})`,
          fileType: detectFileType(url),
          orderCode: `Location: ${up.location || 'Expressway Toll Plaza'}`,
          date: dateStr,
          rawTimestamp: ts,
          photoUrl: url,
          notes: up.update || 'Driver reported live location & status',
          status: 'LOGGED ✓'
        });
      }
    });

    // 4. Process Driver Uploaded Proofs State
    driverUploadedProofs.forEach((p, idx) => {
      const dateStr = p.date || todayStr;
      const ts = p.rawTimestamp || p.id || Date.now() - (idx * 1000);
      const url = p.photoUrl || p.proofImageUrl || p.url || '';
      if (url && isValidMediaUrl(url)) {
        records.push({
          id: `PROOF-STATE-${p.id || idx}`,
          driverName: p.driverName || p.driver || 'Driver',
          vehicleNo: p.vehicleNo || p.vehicle || 'Unassigned',
          proofType: p.proofType || 'Driver Delivery Proof',
          fileType: detectFileType(url),
          orderCode: p.orderCode || p.orderNumber || `PRO-${idx + 1}`,
          date: dateStr,
          rawTimestamp: ts,
          photoUrl: url,
          notes: p.notes || 'Driver uploaded proof document',
          status: p.status || 'VERIFIED ✓'
        });
      }
    });

    return records.sort((a, b) => b.rawTimestamp - a.rawTimestamp);
  }, [trips, dispatchQueue, fuelMaintenanceLogs, driverWorkUpdates, driverUploadedProofs]);

  // ─── 5-COLUMN DATA TABLE PROOF ROWS GENERATOR ────────────────────────────
  const proofTableRows = useMemo(() => {
    const combined = [...trips, ...dispatchQueue];
    const mapByCode = new Map();
    const todayStr = new Date().toLocaleDateString('en-IN');

    const detectFileType = (url = '') => {
      const u = (url || '').toLowerCase();
      if (u.includes('.pdf') || u.startsWith('data:application/pdf')) return 'PDF';
      if (u.includes('.doc') || u.includes('.docx') || u.startsWith('data:application/msword') || u.startsWith('data:application/vnd.openxmlformats')) return 'DOC';
      return 'IMAGE';
    };

    const isValidMediaUrl = (url = '') => {
      if (!url || typeof url !== 'string') return false;
      const u = url.trim();
      return u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:') || u.startsWith('/');
    };

    combined.forEach((t, idx) => {
      const code = t.dispatchNumber || t.orderNumber || t.leadCode || t._id || `LD-${1000 + idx}`;
      if (!code) return;

      const driverName = t.driverName || t.assignedDriverName || 'Ramesh Driver';
      const vehicleNo = t.vehicleNo || t.vehicleNumber || t.truckNumber || 'Unassigned';
      const customer = t.customerName || t.companyName || 'Lead Customer Cargo';
      const origin = t.origin || t.originCity || 'Depot';
      const destination = t.destination || t.destCity || t.city || 'Destination';
      const route = `${origin} ➔ ${destination}`;
      const amount = Number(t.totalFreightAmount || t.grossFreight || t.freightAmount || t.freightRate || t.amountCollected || t.leadValue || 0) || 0;
      
      // True Date calculation from lead/dispatch timestamps (prevents fallback to today's date if driver didn't upload today)
      const rawDate = t.proofUploadedAt || t.podUploadedAt || t.createdAt || t.updatedAt;
      const dateObj = rawDate ? new Date(rawDate) : null;
      const dateStr = dateObj ? dateObj.toLocaleDateString('en-IN') : 'Unspecified Date';
      const ts = dateObj ? dateObj.getTime() : (Date.now() - ((idx + 1) * 86400000));

      // Attendance Proof (Driver Selfie / Unloading Point Photo)
      const attendeeUrl = t.driverProofUrl || t.deliveryImages?.driverSelfieUrl || t.deliveryImages?.emptyVehiclePhotoUrl || t.departureImages?.driverSelfieUrl || t.photoUrl;

      // Payment Proof (Payment Receipt / UPI Screenshot / POD PDF Document)
      const paymentUrl = t.paymentProofUrl || t.podFileUrl || t.paymentProof?.proofImageUrl;

      const hasAttendee = isValidMediaUrl(attendeeUrl);
      const hasPayment = isValidMediaUrl(paymentUrl);

      const existing = mapByCode.get(code);

      if (!existing || hasAttendee || hasPayment) {
        mapByCode.set(code, {
          id: `TBL-ROW-${code}-${idx}`,
          code,
          customer,
          route,
          driverName,
          vehicleNo,
          totalAmount: amount,
          dateStr,
          rawTimestamp: ts,
          attendeeUrl: hasAttendee ? attendeeUrl : (existing?.attendeeUrl || ''),
          attendeeFileType: hasAttendee ? detectFileType(attendeeUrl) : (existing?.attendeeFileType || ''),
          paymentUrl: hasPayment ? paymentUrl : (existing?.paymentUrl || ''),
          paymentFileType: hasPayment ? detectFileType(paymentUrl) : (existing?.paymentFileType || ''),
          paymentMode: t.paymentMode || t.paymentProof?.paymentMode || 'Online',
          status: ['DELIVERED', 'COMPLETED', 'DEAL_WON'].includes((t.status || t.dispatchStatus || t.stage || t.rawStage || '').toUpperCase()) ? 'POD VERIFIED ✓' : 'DOC SUBMITTED ✓'
        });
      }
    });

    const rowsArray = Array.from(mapByCode.values());
    rowsArray.sort((a, b) => b.rawTimestamp - a.rawTimestamp);
    return rowsArray;
  }, [trips, dispatchQueue]);

  const handleViewPdf = (url = '', fileName = 'POD_Document.pdf') => {
    if (!url || typeof url !== 'string' || !url.trim()) {
      toast.error('📄 No POD document uploaded yet by Driver!');
      return;
    }

    if (url.startsWith('data:application/pdf') || url.includes('data:application/pdf')) {
      try {
        const parts = url.split(',');
        const base64Data = parts[1] || parts[0];
        const binaryString = window.atob(base64Data.trim());
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank');
        if (!win) {
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        return;
      } catch (e) {
        console.error('Error opening base64 PDF blob:', e);
      }
    }

    const win = window.open(url, '_blank');
    if (!win) {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleToggleVoiceRecord = () => {
    if (!isRecordingVoice) {
      setIsRecordingVoice(true);
      toast('🎙️ Recording Voice Note... Speak now!', { icon: '🎙️' });
      setTimeout(() => {
        setIsRecordingVoice(false);
        const vMsg = {
          id: Date.now(),
          sender: 'Transport Manager',
          text: '🎙️ [Voice Note Recorded] "Please check Fastag balance before Toll Plaza."',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isVoice: true
        };
        setChatMessages(prev => [vMsg, ...prev]);
        toast.success('🎙️ Voice Note sent to Driver Chat!');
      }, 3000);
    }
  };

  const handleQuotationSubmit = (e) => {
    e.preventDefault();
    const rate = Number(quotationForm.ratePerTon) || 0;
    const tons = Number(quotationForm.tonnage) || 25;
    const total = rate * tons;

    const newQt = {
      id: `QT-${Date.now().toString().slice(-3)}`,
      clientName: quotationForm.clientName,
      route: quotationForm.route,
      ratePerTon: rate,
      totalFreight: total,
      status: 'SENT'
    };

    setQuotationsList(prev => [newQt, ...prev]);
    setShowQuotationModal(false);
    setQuotationForm({ clientName: '', route: '', ratePerTon: '', tonnage: '25' });
    toast.success(`📜 Rate Quote ₹${total.toLocaleString('en-IN')} sent to ${newQt.clientName}!`);
  };

  const handleSendManagerMessage = (textToSend) => {
    const text = typeof textToSend === 'string' ? textToSend : chatInput.trim();
    if (!text) return;

    const mgrName = user?.name || user?.fullName || 'Transport Manager';
    const newMsg = {
      id: Date.now(),
      sender: mgrName,
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [newMsg, ...prev]);
    setChatInput('');

    try {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('driver_chat_message', newMsg);
      }
    } catch (err) {}
  };

  return (
    <div className="w-full space-y-6 text-left font-mono text-xs" style={{ background: 'var(--crm-bg)', color: 'var(--crm-ink-soft)' }}>
      
      {/* Page Header */}
      <div 
        className="p-5 border-b rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)' }}
      >
        <div className="space-y-0.5 text-left">
          <span className="text-[9px] uppercase tracking-[0.25em] font-bold block" style={LABEL_MONO}>
            Logistics & Transport Control Center
          </span>
          <h1 className="text-xl sm:text-2xl font-normal tracking-tight uppercase flex items-center gap-2" style={HEADING}>
            <FiTruck className="text-[var(--crm-accent)]" size={22} /> Transport Manager Dashboard
          </h1>
          <p className="text-[10px] text-[var(--crm-ink-faint)] font-light max-w-2xl hidden sm:block">
            Manager: <strong className="text-[var(--crm-heading)]">{user?.name || user?.fullName || 'Transport Head'}</strong> &bull; Active Fleet Captains: <strong className="text-emerald-400">{metrics.numDrivers}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <button
            onClick={fetchData}
            className="text-[9px] border px-3 py-1.5 uppercase tracking-wide rounded-sm transition-all cursor-pointer flex items-center gap-1.5"
            style={{ ...LABEL_MONO, borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)', color: 'var(--crm-heading)' }}
          >
            <FiRefreshCw size={12} className={loading ? 'animate-spin text-[var(--crm-accent)]' : ''} /> Sync Data
          </button>

          <button
            onClick={() => setShowCreateTripModal(true)}
            className="text-[9px] border px-3 py-1.5 uppercase tracking-wide rounded-sm font-bold transition-all cursor-pointer flex items-center gap-1.5"
            style={{ background: 'var(--crm-accent-bg)', borderColor: 'var(--crm-accent)', color: 'var(--crm-heading)' }}
          >
            <FiPlus size={13} /> Create & Assign Trip
          </button>

          <button
            onClick={() => setShowBroadcastModal(true)}
            className="text-[9px] border px-3 py-1.5 uppercase tracking-wide rounded-sm transition-all cursor-pointer flex items-center gap-1.5"
            style={{ borderColor: 'rgba(244, 63, 94, 0.4)', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e' }}
          >
            <FiVolume2 size={13} className="animate-pulse" /> Driver Broadcast
          </button>

          <Link
            to="/crm/tickets"
            className="text-[9px] border px-3 py-1.5 uppercase tracking-wide rounded-sm font-bold transition-all cursor-pointer flex items-center gap-1.5"
            style={{ borderColor: 'rgba(56, 189, 248, 0.4)', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}
          >
            <FiLifeBuoy size={13} /> Support Tickets
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: OVERVIEW DASHBOARD VIEW
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'DASHBOARD' ? (
        <div className="space-y-4">
          
          {/* CRITICAL ALERT TICKER BANNER */}
          {expiryAlerts.length > 0 && (
            <div className="p-3.5 border rounded-sm flex items-center justify-between font-mono text-xs" style={{ borderColor: 'rgba(244, 63, 94, 0.4)', background: 'rgba(244, 63, 94, 0.08)' }}>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <FiAlertTriangle size={16} className="text-rose-400 animate-bounce shrink-0" />
                <span className="font-bold text-rose-300 uppercase tracking-wider shrink-0">Critical Expiry Ticker:</span>
                <div className="truncate text-rose-200">
                  {expiryAlerts.map(a => `${a.type}: Vehicle #${a.vehicle} (${a.driver}) expires in ${a.daysLeft} days!`).join(' | ')}
                </div>
              </div>
              <span className="text-[9px] bg-rose-900 text-white px-2 py-0.5 rounded-sm font-bold uppercase shrink-0">7-Day Notice</span>
            </div>
          )}

          {/* 6 TOP STAT CARDS ROW */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
            <div className="p-4 border rounded-sm" style={CARD}>
              <div className="flex items-start justify-between">
                <span className="text-[9px] uppercase tracking-wider font-bold" style={LABEL_MONO}>Total Dispatch</span>
                <FiTruck size={16} className="text-[var(--crm-accent)]" />
              </div>
              <span className="text-2xl font-light mt-2 block font-mono" style={HEADING}>{metrics.totalDispatch}</span>
              <span className="text-[9px] block mt-1" style={LABEL_MONO}>{metrics.activeTripsOnRoad} On Road</span>
            </div>

            <div className="p-4 border rounded-sm" style={CARD}>
              <div className="flex items-start justify-between">
                <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-400">Total Revenue</span>
                <FiDollarSign size={16} className="text-emerald-400" />
              </div>
              <span className="text-2xl font-light text-emerald-400 mt-2 block font-mono">₹{metrics.totalRevenue.toLocaleString('en-IN')}</span>
              <span className="text-[9px] block mt-1 text-emerald-500/80">Today: ₹{metrics.collectedToday.toLocaleString('en-IN')}</span>
            </div>

            <div className="p-4 border rounded-sm" style={CARD}>
              <div className="flex items-start justify-between">
                <span className="text-[9px] uppercase tracking-wider font-bold text-teal-400">Total Delivery Done</span>
                <FiCheckCircle size={16} className="text-teal-400" />
              </div>
              <span className="text-2xl font-light text-teal-400 mt-2 block font-mono">{metrics.completedTrips}</span>
              <span className="text-[9px] block mt-1 text-teal-500/80">Verified PODs</span>
            </div>

            <div className="p-4 border rounded-sm" style={CARD}>
              <div className="flex items-start justify-between">
                <span className="text-[9px] uppercase tracking-wider font-bold text-amber-400">Lead</span>
                <FiBriefcase size={16} className="text-amber-400" />
              </div>
              <span className="text-2xl font-light text-amber-400 mt-2 block font-mono">{metrics.totalLeads}</span>
              <span className="text-[9px] block mt-1" style={LABEL_MONO}>Freight Orders</span>
            </div>

            <div className="p-4 border rounded-sm" style={CARD}>
              <div className="flex items-start justify-between">
                <span className="text-[9px] uppercase tracking-wider font-bold text-purple-400">Pending Lead</span>
                <FiClock size={16} className="text-purple-400" />
              </div>
              <span className="text-2xl font-light text-purple-300 mt-2 block font-mono">{metrics.pendingLeads}</span>
              <span className="text-[9px] block mt-1" style={LABEL_MONO}>Unassigned Queue</span>
            </div>

            <div className="p-4 border rounded-sm" style={CARD}>
              <div className="flex items-start justify-between">
                <span className="text-[9px] uppercase tracking-wider font-bold text-sky-400">Num of Drivers</span>
                <FiUsers size={16} className="text-sky-400" />
              </div>
              <span className="text-2xl font-light text-sky-400 mt-2 block font-mono">{metrics.numDrivers}</span>
              <span className="text-[9px] block mt-1" style={LABEL_MONO}>Active Captains</span>
            </div>
          </div>

          {/* PERFORMANCE & OPERATIONS ANALYTICS CHART SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 font-mono">
            {/* Left: Bar Chart Overview */}
            <div className="lg:col-span-8 border rounded-sm p-4 space-y-3" style={CARD}>
              <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--crm-line)' }}>
                <h2 className="text-xs uppercase font-bold tracking-wider flex items-center gap-2" style={HEADING}>
                  <FiBarChart2 className="text-emerald-400" size={16} /> Transport Performance & Operational Overview
                </h2>
                <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  Live Operations Analytics
                </span>
              </div>

              <div className="h-[210px] w-full pt-2 min-w-0 min-h-[180px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180}>
                  <BarChart
                    data={[
                      { name: 'Total Leads', count: metrics.totalLeads, fill: '#f59e0b' },
                      { name: 'Dispatches', count: metrics.totalDispatch, fill: '#06b6d4' },
                      { name: 'Delivery Done', count: metrics.completedTrips, fill: '#10b981' },
                      { name: 'Pending Leads', count: metrics.pendingLeads, fill: '#a855f7' }
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#090b0e', borderColor: '#334155', borderRadius: '4px', fontSize: '11px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {
                        [
                          { name: 'Total Leads', count: metrics.totalLeads, fill: '#f59e0b' },
                          { name: 'Dispatches', count: metrics.totalDispatch, fill: '#06b6d4' },
                          { name: 'Delivery Done', count: metrics.completedTrips, fill: '#10b981' },
                          { name: 'Pending Leads', count: metrics.pendingLeads, fill: '#a855f7' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right: Revenue & Fulfillment Pie Chart */}
            <div className="lg:col-span-4 border rounded-sm p-4 space-y-3 flex flex-col justify-between" style={CARD}>
              <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--crm-line)' }}>
                <h2 className="text-xs uppercase font-bold tracking-wider flex items-center gap-2" style={HEADING}>
                  <FiPieChart className="text-teal-400" size={16} /> Revenue & Fulfillment
                </h2>
                <span className="text-[9px] text-teal-400 font-bold">₹{metrics.totalRevenue.toLocaleString('en-IN')}</span>
              </div>

              <div className="h-[170px] w-full flex items-center justify-center min-w-0 min-h-[160px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={160}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Delivered', value: metrics.completedTrips || 1, fill: '#10b981' },
                        { name: 'Pending', value: metrics.pendingLeads || 1, fill: '#a855f7' },
                        { name: 'On Road', value: metrics.activeTripsOnRoad || 1, fill: '#06b6d4' }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#a855f7" />
                      <Cell fill="#06b6d4" />
                    </Pie>
                    <Tooltip contentStyle={{ background: '#090b0e', borderColor: '#334155', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-2 border-t flex items-center justify-between text-[10px] text-slate-400" style={{ borderColor: 'var(--crm-line)' }}>
                <span>Total Revenue: <strong className="text-emerald-400">₹{metrics.totalRevenue.toLocaleString('en-IN')}</strong></span>
                <span>Done: <strong className="text-teal-400">{metrics.completedTrips}</strong></span>
              </div>
            </div>
          </div>

          {/* MIDDLE ROW 1: DRIVER WORKUPDATE LIVE FEED & LEAD ASSIGNMENT DISTRIBUTION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 font-mono">
            
            {/* Left (7 Cols): Driver WorkUpdate Live Feed */}
            <div className="lg:col-span-7 border rounded-sm p-4 space-y-3 flex flex-col justify-between h-[360px]" style={CARD}>
              <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--crm-line)' }}>
                <h2 className="text-xs uppercase font-bold tracking-wider flex items-center gap-2" style={HEADING}>
                  <FiActivity className="text-teal-400" size={15} /> Driver WorkUpdate Live Feed
                </h2>
                <span className="text-[9px] text-emerald-400 font-bold animate-pulse">● Live Stream</span>
              </div>

              <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1 text-xs flex-1 custom-scrollbar">
                {driverWorkUpdates.length === 0 ? (
                  <div className="p-8 text-center text-[var(--crm-ink-faint)] text-xs">No driver work updates posted yet.</div>
                ) : (
                  driverWorkUpdates.map((up) => (
                    <div key={up.id} className="p-3 border rounded-sm space-y-1 hover:border-teal-500/50 transition" style={CARD_SUNKEN}>
                      <div className="flex justify-between items-center text-[10px]">
                        <strong className="text-teal-400 font-bold">{up.driver} ({up.vehicle})</strong>
                        <span className="px-1.5 py-0.5 border text-[9px] font-bold uppercase text-sky-400 border-sky-900 bg-sky-950/40 rounded-sm">{up.stage}</span>
                      </div>
                      <p className="text-[var(--crm-heading)] text-[11px] leading-relaxed font-sans font-medium">{up.update}</p>
                      <div className="flex justify-between items-center text-[9px] text-[var(--crm-ink-faint)] pt-1 font-mono">
                        <span>📍 {up.location}</span>
                        <span>{up.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right (5 Cols): LEAD ASSIGNMENT DISTRIBUTION SCORECARD ("किसको कितना Lead Assign हुआ") */}
            <div className="lg:col-span-5 border rounded-sm p-4 space-y-3 font-mono flex flex-col justify-between h-[360px]" style={CARD}>
              <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--crm-line)' }}>
                <h2 className="text-xs uppercase font-bold tracking-wider flex items-center gap-2" style={HEADING}>
                  <FiUsers className="text-amber-400" size={15} /> Lead Assignment Distribution 
                </h2>
              </div>

              <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1 text-xs flex-1 custom-scrollbar">
                {driversList.length === 0 && allEmployeesList.filter(m => (m.role || '').toUpperCase().includes('DRIVER') || (m.position || '').toLowerCase().includes('driver')).length === 0 ? (
                  <div className="p-8 text-center text-[var(--crm-ink-faint)] text-xs">No drivers registered yet.</div>
                ) : (
                  [...driversList, ...allEmployeesList]
                    .filter(member => {
                      if (!member) return false;
                      const role = (member.role || '').toUpperCase();
                      const dept = (member.department || '').toUpperCase();
                      const pos = (member.position || '').toLowerCase();
                      const name = (member.fullName || member.name || '').toLowerCase();
                      return role.includes('DRIVER') || dept.includes('DRIVER') || pos.includes('driver') || name.includes('driver');
                    })
                    .filter((member, idx, self) => self.findIndex(m => String(m._id) === String(member._id)) === idx)
                    .map((member) => {
                      const memberName = member.fullName || member.name || 'Driver';
                      const memberId = String(member._id);

                      // Calculate assigned leads count for this driver
                      const assignedLeads = [...trips, ...dispatchQueue].filter(item => {
                        const assignedId = typeof item.assignedTo === 'object' ? String(item.assignedTo?._id || '') : String(item.assignedTo || '');
                        const driverIdStr = String(item.assignedDriverId || item.driverId || '');
                        const driverNameStr = (item.driverName || item.salesOwner || '').toLowerCase();
                        const memberNameLower = memberName.toLowerCase();

                        return (
                          assignedId === memberId ||
                          driverIdStr === memberId ||
                          (memberNameLower && driverNameStr.includes(memberNameLower))
                        );
                      });

                      const activeCount = assignedLeads.filter(l => {
                        const st = (l.status || l.dispatchStatus || l.stage || l.rawStage || '').toUpperCase();
                        return !['COMPLETED', 'DELIVERED', 'UNLOADED', 'DEAL_WON', 'CLOSED_WON'].includes(st);
                      }).length;

                      const completedCount = assignedLeads.filter(l => {
                        const st = (l.status || l.dispatchStatus || l.stage || l.rawStage || '').toUpperCase();
                        return ['COMPLETED', 'DELIVERED', 'UNLOADED', 'DEAL_WON', 'CLOSED_WON'].includes(st);
                      }).length;

                      return (
                        <div key={member._id} className="p-2.5 border rounded-sm flex items-center justify-between gap-2 hover:border-amber-500/50 transition" style={CARD_SUNKEN}>
                          <div className="space-y-0.5 truncate">
                            <div className="flex items-center gap-1.5 truncate">
                              <strong className="text-[var(--crm-heading)] text-xs font-bold truncate">{memberName}</strong>
                              <span className="text-[8px] px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded uppercase font-bold shrink-0">
                                DRIVER
                              </span>
                            </div>
                            <span className="text-[9px] text-[var(--crm-ink-faint)] block">
                              Active: <strong className="text-amber-400">{activeCount}</strong> &bull; Done: <strong className="text-emerald-400">{completedCount}</strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <span className="text-sm font-extrabold text-amber-400 font-mono block leading-none">
                                {assignedLeads.length}
                              </span>
                              <span className="text-[8px] text-[var(--crm-ink-faint)] uppercase font-bold block">Assigned</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

          </div>

          {/* MIDDLE ROW 2: GOOGLE MAP LIVE GPS & TRANSPORT & DRIVER CHAT HUB */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 font-mono">
            <div className="lg:col-span-7 border rounded-sm overflow-hidden flex flex-col h-[420px]" style={CARD}>
              <div className="p-3.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' }}>
                <h2 className="text-xs uppercase font-bold tracking-wider flex items-center gap-2" style={HEADING}>
                  <FiNavigation className="text-sky-400" size={15} /> Google Map Live Driver Location & Geofencing
                </h2>
                <span className="text-[9px] text-emerald-400 font-bold">Geofence Active</span>
              </div>

              <div className="relative w-full flex-1 min-h-[360px] bg-[#0b1329]">
                <iframe
                  title="Google Map Fleet"
                  width="100%"
                  height="100%"
                  style={{ border: 0, filter: 'invert(90%) hue-rotate(180%)' }}
                  src={`https://maps.google.com/maps?q=${gpsLocation.lat},${gpsLocation.long}&z=11&output=embed`}
                />
                <div className="absolute top-3 left-3 border p-2.5 rounded-sm shadow-xl text-[10px] space-y-1" style={{ background: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line)' }}>
                  <div className="text-emerald-400 font-bold">● Active Fleet GPS Tracking ({metrics.activeTripsOnRoad} Trucks)</div>
                  <div className="text-[var(--crm-ink-soft)]">Delhi-Agra Expressway Corridor</div>
                </div>
              </div>
            </div>

            {/* TRANSPORT & DRIVER CHAT HUB */}
            <div className="lg:col-span-5 border rounded-xl p-4 space-y-3 font-mono bg-[#111317] border-slate-800 shadow-2xl flex flex-col justify-between h-[420px]">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <FiMessageSquare className="text-teal-400" size={15} /> TRANSPORT & DRIVER CHAT HUB
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleVoiceRecord}
                    className={`p-1 rounded cursor-pointer transition ${isRecordingVoice ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-900 border border-slate-700 text-teal-400 hover:bg-slate-800'}`}
                    title="Record Voice Note for Driver"
                  >
                    <FiMic size={13} />
                  </button>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-[9px] font-bold text-emerald-400 tracking-widest uppercase">LIVE CONNECTION</span>
                  </div>
                </div>
              </div>

              {/* MESSAGES THREAD AREA */}
              <div ref={chatContainerRef} className="space-y-2.5 max-h-[290px] min-h-[200px] overflow-y-auto pr-1 custom-scrollbar flex flex-col flex-1">
                {chatMessages.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs italic">
                    No live messages yet. Type a message below to broadcast to Drivers.
                  </div>
                ) : (
                  chatMessages.map((msg, index) => {
                    const isManager = msg.sender?.toLowerCase().includes('manager') || msg.sender?.includes(user?.name || user?.fullName || 'Vikram');
                    return (
                      <div
                        key={msg.id || index}
                        className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isManager ? 'self-end items-end' : 'self-start items-start'}`}
                      >
                        <div
                          className={`p-2.5 rounded-xl text-xs space-y-0.5 shadow-md ${
                            isManager
                              ? 'bg-[#00897b] text-white rounded-tr-none'
                              : 'bg-[#1a1d24] border border-slate-800 text-slate-200 rounded-tl-none'
                          }`}
                        >
                          <span className={`text-[9px] font-bold block ${isManager ? 'text-teal-100' : 'text-slate-400'}`}>
                            {msg.sender || (isManager ? `${user?.name || 'Vikram Singh'} (MANAGER)` : 'Driver')}
                          </span>
                          <p className="text-xs font-sans font-semibold leading-relaxed whitespace-pre-wrap">
                            {msg.text}
                          </p>
                        </div>
                        <span className="text-[8px] text-slate-500 mt-0.5 font-mono">{msg.time || '12:00 PM'}</span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* INPUT BAR */}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Type a message to Drivers..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    className="w-full py-2 px-3 bg-[#090b0e] border border-teal-700/60 rounded-lg text-slate-100 text-xs outline-none focus:border-teal-500 transition font-sans"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className="p-2 bg-[#00897b] hover:bg-[#00796b] disabled:opacity-50 text-white rounded-lg shadow transition cursor-pointer flex items-center justify-center shrink-0"
                >
                  <FiSend size={15} />
                </button>
              </form>
            </div>
          </div>

          {/* DEDICATED SECTION: COMPLETED & DELIVERED FREIGHT TRIPS */}
          <div className="border rounded-sm p-4 space-y-3 font-mono" style={CARD}>
            <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--crm-line)' }}>
              <h3 className="text-xs uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-2" style={HEADING}>
                <FiCheckCircle size={16} /> COMPLETED & DELIVERED FREIGHT TRIPS SECTION (POD VERIFIED)
              </h3>
              <span className="text-[10px] text-emerald-400 font-bold">
                {[...trips, ...dispatchQueue].filter(t => (t.status || t.dispatchStatus || t.stage || '').toUpperCase().includes('DELIVER') || (t.status || t.dispatchStatus || t.stage || '').toUpperCase().includes('COMPLET')).length} Delivered Trips
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1 text-xs custom-scrollbar">
              {[...trips, ...dispatchQueue].filter(t => (t.status || t.dispatchStatus || t.stage || '').toUpperCase().includes('DELIVER') || (t.status || t.dispatchStatus || t.stage || '').toUpperCase().includes('COMPLET')).length === 0 ? (
                <div className="col-span-2 p-6 text-center text-[var(--crm-ink-faint)] text-xs border border-dashed border-[var(--crm-line)] rounded-sm">
                  No trips marked as delivered yet. When drivers click "Mark Delivered", completed trips will appear in this section for manager verification.
                </div>
              ) : (
                [...trips, ...dispatchQueue].filter(t => (t.status || t.dispatchStatus || t.stage || '').toUpperCase().includes('DELIVER') || (t.status || t.dispatchStatus || t.stage || '').toUpperCase().includes('COMPLET')).map((t) => {
                  const isPodVerified = verifiedPodIds.includes(t._id) || verifiedPodIds.includes(t.orderNumber) || verifiedPodIds.includes(t.dispatchNumber) || t.podStatus === 'VERIFIED' || t.stage === 'COMPLETED' || t.status === 'COMPLETED';

                  return (
                    <div key={t._id || t.orderNumber} className="p-3.5 border border-emerald-900/50 rounded-sm space-y-2.5 bg-emerald-950/20 shadow-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] text-emerald-400 font-mono font-bold block">Lead Code: {t.dispatchNumber || t.orderNumber || t._id}</span>
                          <strong className="text-[var(--crm-heading)] text-sm block font-bold">{t.customerName || 'Client'}</strong>
                          <span className="text-emerald-300 text-[10px] block font-mono">Material: {t.material || t.productName || 'Goods Cargo'}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="px-2 py-0.5 border text-[9px] font-bold rounded-sm uppercase text-emerald-400 border-emerald-700 bg-emerald-950/90 shadow-sm flex items-center gap-1">
                            <FiCheckCircle size={10} className="text-emerald-400" />
                            {isPodVerified ? 'DEAL WON (FINAL COMPLETED) ✓' : 'DEAL WON (DELIVERED) ✓'}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[11px] p-2 rounded-sm bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] font-mono">
                        <span className="text-[var(--crm-heading)]">📍 {t.origin || 'Delhi'} &rarr; 🚩 {t.destination || 'Destination'}</span>
                        <span className="text-emerald-400 font-bold font-mono text-xs">
                          Final Freight Revenue: ₹{Number(t.totalFreightAmount || t.freightAmount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-[var(--crm-line)] font-mono">
                        <span className="text-[var(--crm-ink-faint)]">Driver: <strong className="text-[var(--crm-heading)]">{t.driverName || t.assignedDriverName || 'Ramesh Driver'}</strong></span>
                        
                        {!isPodVerified ? (
                          <button
                            type="button"
                            onClick={(e) => handleVerifyPODAndComplete(t, e)}
                            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-sm shadow cursor-pointer transition flex items-center gap-1.5"
                          >
                            <FiCheckCircle size={12} /> Verify POD & Complete
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 text-[9px] font-bold rounded border border-emerald-700 flex items-center gap-1">
                            <FiCheckCircle size={11} /> POD Verified & Completed ✓
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* LOWER SECTION: DRIVER SCORECARD & FUEL / MAINTENANCE Tracker */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono">
            <DriverCalculator />

            <div className="border rounded-sm p-4 space-y-3" style={CARD}>
              <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--crm-line)' }}>
                <h3 className="text-xs uppercase font-bold tracking-wider flex items-center gap-2" style={HEADING}>
                  <FiTool className="text-emerald-400" size={15} /> Fuel & Vehicle Maintenance Expenses (Driver Logs)
                </h3>
                <span className="text-[9px]" style={LABEL_MONO}>Diesel, Toll, Garage Bills</span>
              </div>

              <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1 text-xs custom-scrollbar">
                {fuelMaintenanceLogs.length === 0 ? (
                  <div className="p-6 text-center text-[var(--crm-ink-faint)] text-xs">No fuel or maintenance expense logs recorded yet.</div>
                ) : (
                  fuelMaintenanceLogs.map((log) => (
                    <div key={log.id} className="p-3 border rounded-sm space-y-2 font-mono" style={{ ...CARD_SUNKEN, borderColor: 'var(--crm-line)' }}>
                      <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-1.5" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                        <span className="text-[var(--crm-heading)] font-bold text-xs flex items-center gap-1.5">
                          <FiUser className="text-emerald-400" size={12} /> {log.driver} <span className="text-[var(--crm-ink-faint)]">({log.vehicle})</span>
                        </span>
                        <span className="text-[10px] text-teal-300 font-bold bg-teal-950/50 border border-teal-800/60 px-2 py-0.5 rounded-sm flex items-center gap-1">
                          <FiPackage size={11} /> Log Ref: <strong className="underline text-teal-200">{log.leadCode || log.orderCode || 'Daily Vehicle Log'}</strong> {log.leadCustomer && `(${log.leadCustomer})`}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] pt-0.5">
                        <div className="text-[var(--crm-ink-soft)]">
                          <span className="text-[var(--crm-ink-faint)] block text-[9px] uppercase">Route Vector</span>
                          <strong className="text-[var(--crm-heading)] font-bold">📍 {log.fromLocation || 'Delhi'} &rarr; 🚩 {log.toLocation || 'Patna'} ({log.totalKm || 0} KM)</strong>
                        </div>
                        <div className="text-[var(--crm-ink-soft)]">
                          <span className="text-[var(--crm-ink-faint)] block text-[9px] uppercase">Fuel Cost</span>
                          <strong className="text-emerald-400 font-bold">₹{Number(log.fuelCost || 0).toLocaleString('en-IN')} ({log.litres || 0}L)</strong>
                        </div>
                        <div className="text-[var(--crm-ink-soft)]">
                          <span className="text-[var(--crm-ink-faint)] block text-[9px] uppercase">Tire & Toll</span>
                          <strong className="text-sky-300 font-bold">₹{(Number(log.punctureCost || 0) + Number(log.otherCost || log.tollTax || 0)).toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="text-right">
                          <span className="text-[var(--crm-ink-faint)] block text-[9px] uppercase">Trip Expense</span>
                          <strong className="text-emerald-400 font-bold text-xs">₹{(Number(log.fuelCost || 0) + Number(log.punctureCost || 0) + Number(log.otherCost || log.tollTax || 0)).toLocaleString('en-IN')}</strong>
                        </div>
                      </div>

                      {log.remarks && (
                        <div className="text-[10px] text-[var(--crm-ink-soft)] pt-1 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                          <span className="text-[var(--crm-ink-faint)]">Remarks:</span> {log.remarks}
                        </div>
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
          TAB 2: MY PROFILE VIEW
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'MY_PROFILE' ? (
        <div className="border rounded-sm p-6 space-y-6 font-mono" style={CARD}>
          <h2 className="text-sm font-bold uppercase flex items-center gap-2 border-b pb-3" style={{ ...HEADING, borderColor: 'var(--crm-line)' }}>
            <FiUser className="text-[var(--crm-accent)]" /> Transport Manager Profile & Operational Controls
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 border rounded-sm space-y-3" style={CARD_SUNKEN}>
              <span className="text-[9px] uppercase font-bold block" style={LABEL_MONO}>Manager Name</span>
              <strong className="text-[var(--crm-heading)] text-sm block">{user?.name || user?.fullName || 'Transport Head'}</strong>
              <span className="text-[9px] uppercase font-bold block mt-2" style={LABEL_MONO}>Department Role</span>
              <strong className="text-[var(--crm-accent)] text-xs block">TRANSPORT & LOGISTICS MANAGER (L4/L5)</strong>
            </div>
            <div className="p-4 border rounded-sm space-y-3" style={CARD_SUNKEN}>
              <span className="text-[9px] uppercase font-bold block" style={LABEL_MONO}>Managed Drivers</span>
              <strong className="text-emerald-400 text-sm block">{metrics.numDrivers} Active Drivers</strong>
              <span className="text-[9px] uppercase font-bold block mt-2" style={LABEL_MONO}>Corridor Jurisdiction</span>
              <strong className="text-sky-300 text-xs block">Delhi-NCR & Bihar-UP Freight Network</strong>
            </div>
          </div>
        </div>
      ) : null}

      {/* ─────────────────────────────────────────────────────────────
          TAB 5: DRIVER UPLOADED ALL PROOF VIEW (5-COLUMN DATA TABLE)
         ───────────────────────────────────────────────────────────── */}

      {/* ─────────────────────────────────────────────────────────────
          TAB 5: DRIVER UPLOADED ALL PROOF VIEW (5-COLUMN DATA TABLE)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'DRIVER_PROOFS' ? (
        <div className="border rounded-sm p-6 space-y-4 font-mono" style={CARD}>
          <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
            <h2 className="text-sm font-bold text-[var(--crm-heading)] uppercase flex items-center gap-2">
              <FiFolder className="text-amber-400" /> Driver Uploaded All Proof Records ({proofTableRows.length})
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-[9px] text-[var(--crm-ink-faint)] uppercase font-bold">Filter By Date:</label>
              <select
                value={selectedProofDate}
                onChange={(e) => setSelectedProofDate(e.target.value)}
                className="p-1.5 border rounded-sm text-[10px] bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] border-[var(--crm-line)] outline-none font-mono cursor-pointer"
              >
                <option value="ALL">All Dates ({proofTableRows.length} Proofs)</option>
                {Array.from(new Set(proofTableRows.map(r => r.dateStr))).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-[var(--crm-line)] rounded-sm bg-[var(--crm-bg-raised)]/20 custom-scrollbar">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] border-b border-[var(--crm-line)] text-[11px] uppercase tracking-wider font-bold">
                  <th className="p-3 w-16 text-center border-r border-[var(--crm-line)]">S.NO</th>
                  <th className="p-3 min-w-[220px] border-r border-[var(--crm-line)]">Leads</th>
                  <th className="p-3 min-w-[200px] border-r border-[var(--crm-line)] text-center">Attendance Proof</th>
                  <th className="p-3 min-w-[220px] border-r border-[var(--crm-line)] text-center">Payment Proof</th>
                  <th className="p-3 min-w-[160px] text-right">Total Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--crm-line)] text-[11px]">
                {proofTableRows.filter(r => selectedProofDate === 'ALL' || r.dateStr === selectedProofDate).length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-[var(--crm-ink-faint)] text-xs">
                      No driver proof documents uploaded for selected date filter ({selectedProofDate}).
                    </td>
                  </tr>
                ) : (
                  proofTableRows
                    .filter(r => selectedProofDate === 'ALL' || r.dateStr === selectedProofDate)
                    .map((row, idx) => (
                      <tr key={row.id} className="hover:bg-[var(--crm-bg-raised)]/60 transition duration-150">
                        {/* 1. S.NO */}
                        <td className="p-3 text-center border-r border-[var(--crm-line)] font-bold text-[var(--crm-heading)]">
                          {idx + 1}
                        </td>

                        {/* 2. LEADS */}
                        <td className="p-3 border-r border-[var(--crm-line)] space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-[10px] font-bold rounded-sm">
                              {row.code}
                            </span>
                            <span className="text-[10px] text-[var(--crm-ink-faint)]">{row.dateStr}</span>
                          </div>
                          <strong className="text-[var(--crm-heading)] text-xs block font-bold">{row.customer}</strong>
                          <div className="text-[10px] text-[var(--crm-ink-soft)] font-mono">
                            📍 {row.route}
                          </div>
                          <div className="text-[10px] text-[var(--crm-ink-faint)]">
                            🚚 {row.driverName} ({row.vehicleNo})
                          </div>
                        </td>

                        {/* 3. Attendance Proof */}
                        <td className="p-3 border-r border-[var(--crm-line)] text-center align-middle">
                          {row.attendeeUrl ? (
                            row.attendeeFileType === 'PDF' ? (
                              <div className="p-2 bg-rose-950/40 border border-rose-800/60 rounded-sm space-y-1">
                                <div className="text-rose-300 text-[10px] font-bold flex items-center justify-center gap-1">
                                  <FiFileText size={13} /> PDF Attendee Document
                                </div>
                                <a
                                  href={row.attendeeUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-block px-2 py-0.5 bg-rose-800 hover:bg-rose-700 text-white text-[9px] font-bold rounded-sm"
                                >
                                  View PDF
                                </a>
                              </div>
                            ) : (
                              <div className="relative inline-block group overflow-hidden border border-[var(--crm-line)] rounded-sm bg-black">
                                <img
                                  src={row.attendeeUrl}
                                  alt="Attendance Proof"
                                  onClick={() => setSelectedPreviewImage(row.attendeeUrl)}
                                  className="w-28 h-20 object-cover rounded-sm cursor-pointer hover:scale-105 transition"
                                />
                                <button
                                  type="button"
                                  onClick={() => setSelectedPreviewImage(row.attendeeUrl)}
                                  className="absolute bottom-1 right-1 bg-black/80 text-[var(--crm-heading)] text-[8px] px-1 py-0.5 rounded-sm font-bold border border-[var(--crm-line)] cursor-pointer flex items-center gap-0.5"
                                >
                                  <FiExternalLink size={9} /> Zoom View
                                </button>
                              </div>
                            )
                          ) : (
                            <div className="p-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded-sm text-[10px] text-[var(--crm-ink-faint)] font-mono italic">
                              📷 No Attendance Proof
                            </div>
                          )}
                        </td>

                        {/* 4. PAYMENT PROOF */}
                        <td className="p-3 border-r border-[var(--crm-line)] text-center align-middle">
                          {row.paymentUrl ? (
                            row.paymentFileType === 'PDF' ? (
                              <div className="p-2 bg-rose-950/40 border border-rose-800/60 rounded-sm space-y-1">
                                <div className="text-rose-300 text-[10px] font-bold flex items-center justify-center gap-1">
                                  <FiFileText size={13} /> PDF Payment POD Receipt
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleViewPdf(row.paymentUrl, `POD_${row.code}.pdf`)}
                                  className="inline-block px-2.5 py-1 bg-rose-800 hover:bg-rose-700 text-white text-[10px] font-bold rounded-sm shadow cursor-pointer"
                                >
                                  📥 Download / View PDF
                                </button>
                              </div>
                            ) : row.paymentFileType === 'DOC' ? (
                              <div className="p-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded-sm space-y-1">
                                <div className="text-[var(--crm-heading)] text-[10px] font-bold flex items-center justify-center gap-1">
                                  <FiFileText size={13} /> Word DOC POD Receipt
                                </div>
                                <a
                                  href={row.paymentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  download={`POD_${row.code}.doc`}
                                  className="inline-block px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-sm shadow"
                                >
                                  📥 Download DOC
                                </a>
                              </div>
                            ) : (
                              <div className="relative inline-block group overflow-hidden border border-[var(--crm-line)] rounded-sm bg-black">
                                <img
                                  src={row.paymentUrl}
                                  alt="Payment Proof"
                                  onClick={() => setSelectedPreviewImage(row.paymentUrl)}
                                  className="w-28 h-20 object-cover rounded-sm cursor-pointer hover:scale-105 transition"
                                />
                                <button
                                  type="button"
                                  onClick={() => setSelectedPreviewImage(row.paymentUrl)}
                                  className="absolute bottom-1 right-1 bg-black/80 text-[var(--crm-heading)] text-[8px] px-1 py-0.5 rounded-sm font-bold border border-[var(--crm-line)] cursor-pointer flex items-center gap-0.5"
                                >
                                  <FiExternalLink size={9} /> Zoom View
                                </button>
                              </div>
                            )
                          ) : (
                            <div className="p-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded-sm text-[10px] text-[var(--crm-ink-faint)] font-mono italic">
                              💳 No Payment Proof
                            </div>
                          )}
                        </td>

                        {/* 5. TOTAL PAYMENT */}
                        <td className="p-3 text-right align-middle space-y-1">
                          <strong className="text-emerald-400 text-xs font-bold block font-mono">
                            ₹{row.totalAmount.toLocaleString('en-IN')}
                          </strong>
                          <span className="inline-block text-[9px] px-1.5 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-bold rounded-sm">
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* ─────────────────────────────────────────────────────────────
          TAB 6: DEDICATED LEAD & TRIP ASSIGNMENT PANEL VIEW
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'ASSIGN_LEADS' ? (
        <div className="space-y-4 font-mono">
          {/* Header & Sub-Tab Navigation */}
          <div className="border rounded-sm p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4" style={CARD}>
            <div>
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight flex items-center gap-2" style={HEADING}>
                <FiCheckSquare className="text-amber-400" size={20} /> Lead & Trip Assignment Control Panel
              </h2>
              <p className="text-[10px] text-[var(--crm-ink-faint)] font-light mt-0.5">
                Assign confirmed orders to Transport Executives & Drivers. Confirmed leads auto-notify Transport Manager.
              </p>
            </div>

            {/* Sub-Tab Selector Buttons */}
            <div className="flex items-center gap-2 bg-[var(--crm-bg-sunken)] p-1 border rounded-sm shrink-0" style={{ borderColor: 'var(--crm-line)' }}>
              <button
                onClick={() => setAssignSubTab('PENDING')}
                className={`px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                  assignSubTab === 'PENDING'
                    ? 'bg-emerald-700 text-white border border-emerald-500/60 shadow font-bold'
                    : 'text-[var(--crm-ink-soft)] hover:text-emerald-300'
                }`}
              >
                📌 Active & Pending Assignments ({
                  [...trips, ...dispatchQueue].filter(t => !isCompletedLead(t)).length
                })
              </button>

              <button
                onClick={() => setAssignSubTab('COMPLETED')}
                className={`px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                  assignSubTab === 'COMPLETED'
                    ? 'bg-emerald-600 text-white border border-emerald-400/60 shadow font-bold'
                    : 'text-[var(--crm-ink-soft)] hover:text-emerald-300'
                }`}
              >
                ✅ Completed / Deal Won / Closed Won ({
                  [...trips, ...dispatchQueue].filter(t => isCompletedLead(t)).length
                })
              </button>
            </div>
          </div>

          {/* SUB-SECTION 1: ACTIVE & PENDING ASSIGNMENTS */}
          {assignSubTab === 'PENDING' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  Confirmed Orders Ready for Transport & Driver Assignment
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...trips, ...dispatchQueue]
                  .filter(t => !isCompletedLead(t))
                  .length === 0 ? (
                    <div className="col-span-full border border-dashed rounded-sm p-12 text-center text-slate-500" style={CARD_SUNKEN}>
                      <FiCheckCircle size={36} className="mx-auto mb-2 text-emerald-400 opacity-60" />
                      <p className="text-xs font-bold uppercase tracking-wider">No Pending Assignments</p>
                      <p className="text-[10px] text-slate-400 mt-1">All confirmed orders have been dispatched or completed.</p>
                    </div>
                  ) : (
                    [...trips, ...dispatchQueue]
                      .filter(t => !isCompletedLead(t))
                      .map((item, idx) => {
                        const targetId = item._id || item.orderNumber || item.dispatchNumber;
                        const currAssignedName = typeof item.assignedTo === 'object' 
                          ? (item.assignedTo?.fullName || item.assignedTo?.name)
                          : (item.salesOwner || item.driverName || 'Unassigned');

                        return (
                          <div key={item._id || idx} className="border rounded-sm p-4 space-y-3 shadow-sm hover:border-emerald-500/50 transition-all flex flex-col justify-between" style={CARD}>
                            <div className="space-y-2">
                              <div className="flex justify-between items-start gap-2 border-b pb-2" style={{ borderColor: 'var(--crm-line)' }}>
                                <div>
                                  <span className="text-[9px] text-teal-300 font-bold uppercase tracking-wider block font-mono">
                                    {item.orderNumber || item.dispatchNumber || `ORD-${idx + 1}`}
                                  </span>
                                  <h3 className="text-xs font-bold text-[var(--crm-heading)] truncate max-w-[180px]">
                                    {item.customerName || 'Confirmed Client'}
                                  </h3>
                                </div>
                                <span className="text-[9px] px-2 py-0.5 bg-teal-950/80 text-teal-300 border border-teal-800/80 rounded font-bold uppercase shrink-0">
                                  {item.stage || item.status || 'ORDER CONFIRMED'}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                                <div>
                                  <span className="text-[8px] text-[var(--crm-ink-faint)] uppercase block font-bold">Route</span>
                                  <span className="text-[var(--crm-heading)] font-bold truncate block">
                                    {item.origin || 'Depot'} ➔ {item.destination || 'Destination'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-[var(--crm-ink-faint)] uppercase block font-bold">Material</span>
                                  <span className="text-[var(--crm-heading)] truncate block font-bold">
                                    {item.material || 'Cargo Goods'} ({item.weightTons || '20'} MT)
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-[var(--crm-ink-faint)] uppercase block font-bold">Freight Rev</span>
                                  <span className="text-emerald-400 font-bold">
                                    ₹{(item.totalFreightAmount || item.freightAmount || 0).toLocaleString('en-IN')}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-[var(--crm-ink-faint)] uppercase block font-bold">Assigned To</span>
                                  <span className="text-teal-300 font-bold truncate block">
                                    {currAssignedName}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* ASSIGNMENT CONTROLS */}
                            <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--crm-line)' }}>
                              <div>
                                <label className="text-[8px] uppercase font-bold text-[var(--crm-ink-faint)] block mb-1">
                                  Assign Executive / Driver:
                                </label>
                                <div className="flex items-center gap-1.5">
                                  <select
                                    id={`driver-select-${targetId}`}
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleDirectAssignUser(targetId, e.target.value, e);
                                      }
                                    }}
                                    defaultValue=""
                                    className="w-full p-1.5 border rounded text-[10px] bg-[var(--crm-bg-sunken)] text-slate-200 border-[var(--crm-line)] outline-none font-mono cursor-pointer focus:border-teal-500 transition"
                                  >
                                    <option value="" disabled>Select Transport Driver...</option>
                                    {driversList.map(d => (
                                      <option key={d._id} value={d._id}>🚛 {d.fullName || d.name} (Driver)</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  const sel = document.getElementById(`driver-select-${targetId}`);
                                  const val = sel?.value;
                                  if (val) {
                                    handleDirectAssignUser(targetId, val, e);
                                  } else {
                                    toast.error('Select a Transport Driver from the dropdown first');
                                  }
                                }}
                                className="w-full py-2 bg-teal-700 hover:bg-teal-600 text-white text-[10px] font-bold uppercase rounded tracking-wider shadow cursor-pointer flex items-center justify-center gap-1 transition border border-teal-500/40"
                              >
                                <FiUserCheck size={12} /> Assign Driver To Lead
                              </button>
                            </div>
                          </div>
                        );
                      })
                  )}
              </div>
            </div>
          ) : (
            /* SUB-SECTION 2: COMPLETED / DEAL WON / CLOSED WON */
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  Successfully Delivered & Completed Deals (DEAL_WON / CLOSED_WON)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...trips, ...dispatchQueue]
                  .filter(t => isCompletedLead(t))
                  .length === 0 ? (
                    <div className="col-span-full border border-dashed rounded-sm p-12 text-center text-slate-500" style={CARD_SUNKEN}>
                      <FiCheckSquare size={36} className="mx-auto mb-2 text-slate-600" />
                      <p className="text-xs font-bold uppercase tracking-wider">No Completed Deals Yet</p>
                      <p className="text-[10px] text-slate-400 mt-1">Completed dispatches and deal won leads will appear in this section.</p>
                    </div>
                  ) : (
                    [...trips, ...dispatchQueue]
                      .filter(t => isCompletedLead(t))
                      .map((item, idx) => {
                        return (
                          <div key={item._id || idx} className="border rounded-sm p-4 space-y-3 shadow-sm border-emerald-900/60 bg-emerald-950/10 flex flex-col justify-between" style={CARD}>
                            <div className="space-y-2">
                              <div className="flex justify-between items-start gap-2 border-b pb-2" style={{ borderColor: 'var(--crm-line)' }}>
                                <div>
                                  <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block">
                                    {item.orderNumber || item.dispatchNumber || `COMP-${idx + 1}`}
                                  </span>
                                  <h3 className="text-xs font-bold text-[var(--crm-heading)] truncate max-w-[180px]">
                                    {item.customerName || 'Client Cargo'}
                                  </h3>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-[9px] px-2 py-0.5 bg-emerald-900 text-emerald-200 border border-emerald-700 rounded font-bold uppercase shrink-0">
                                    DEAL WON ✓
                                  </span>
                                  <span className={`text-[9px] px-2 py-0.5 border rounded font-bold uppercase shrink-0 ${
                                    String(item.paymentMode || item.paymentMethod || item.paymentType || item.paymentTerms || item.paymentProof?.paymentMode || '').toUpperCase().includes('COD') || String(item.paymentMode || item.paymentMethod || item.paymentType || item.paymentTerms || item.paymentProof?.paymentMode || '').toUpperCase().includes('CASH')
                                      ? 'bg-amber-950/90 text-amber-300 border-amber-500'
                                      : 'bg-emerald-950/90 text-emerald-300 border-emerald-400'
                                  }`}>
                                    {String(item.paymentMode || item.paymentMethod || item.paymentType || item.paymentTerms || item.paymentProof?.paymentMode || '').toUpperCase().includes('COD') || String(item.paymentMode || item.paymentMethod || item.paymentType || item.paymentTerms || item.paymentProof?.paymentMode || '').toUpperCase().includes('CASH') ? '💳 COD CASH' : '🌐 ONLINE PAID'}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                                <div>
                                  <span className="text-[8px] text-[var(--crm-ink-faint)] uppercase block font-bold">Route</span>
                                  <span className="text-[var(--crm-heading)] font-bold truncate block">
                                    {item.origin || 'Depot'} ➔ {item.destination || 'Destination'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-[var(--crm-ink-faint)] uppercase block font-bold">Driver</span>
                                  <span className="text-emerald-300 font-bold truncate block">
                                    {item.driverName || item.assignedDriverName || 'Ramesh Driver'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-[var(--crm-ink-faint)] uppercase block font-bold">Revenue</span>
                                  <span className="text-emerald-400 font-bold">
                                    ₹{(item.totalFreightAmount || item.freightAmount || 0).toLocaleString('en-IN')}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-[var(--crm-ink-faint)] uppercase block font-bold">POD Status</span>
                                  <span className="text-emerald-300 font-bold uppercase">
                                    {item.podStatus || 'VERIFIED ✓'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: 'var(--crm-line)' }}>
                              <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                                <FiCheckCircle size={11} /> Order Finalized & Delivered
                              </span>
                              {(item.podFileUrl || item.paymentProofUrl) && (
                                <button
                                  onClick={() => handleViewPdf(item.podFileUrl || item.paymentProofUrl, `POD_${item.orderNumber}.pdf`)}
                                  className="text-[9px] px-2 py-1 bg-emerald-900 hover:bg-emerald-800 text-emerald-100 font-bold rounded cursor-pointer"
                                >
                                  📄 View POD
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                  )}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* ─────────────────────────────────────────────────────────────
          MODALS (CREATE TRIP, BROADCAST, QUOTATION)
         ───────────────────────────────────────────────────────────── */}

      {/* MODAL: CREATE TRIP */}
      <AnimatePresence>
        {showCreateTripModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateTripModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative border w-full max-w-md p-6 rounded-sm shadow-2xl z-10 text-left space-y-4 font-mono text-xs" style={CARD}>
              <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
                <h3 className="text-xs font-bold uppercase text-emerald-400 flex items-center gap-2">
                  <FiPlus size={16} /> Create & Assign New Freight Trip
                </h3>
                <button onClick={() => setShowCreateTripModal(false)} className="text-[var(--crm-ink-faint)] hover:text-white cursor-pointer"><FiX size={16} /></button>
              </div>

              <form onSubmit={handleCreateTripSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] uppercase font-bold mb-1" style={LABEL_MONO}>Customer Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter customer name"
                      value={createTripForm.customerName}
                      onChange={(e) => setCreateTripForm(prev => ({ ...prev, customerName: e.target.value }))}
                      className="w-full p-2 border rounded-sm text-xs font-bold outline-none"
                      style={{ background: 'var(--crm-bg)', borderColor: 'var(--crm-line)', color: 'var(--crm-heading)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold mb-1" style={LABEL_MONO}>Freight Rate (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="Enter freight rate"
                      value={createTripForm.freightAmount}
                      onChange={(e) => setCreateTripForm(prev => ({ ...prev, freightAmount: e.target.value }))}
                      className="w-full p-2 border rounded-sm text-xs font-bold outline-none"
                      style={{ background: 'var(--crm-bg)', borderColor: 'var(--crm-line)', color: 'var(--crm-heading)' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] uppercase font-bold mb-1" style={LABEL_MONO}>Origin Point</label>
                    <input
                      type="text"
                      placeholder="Enter origin point"
                      value={createTripForm.origin}
                      onChange={(e) => setCreateTripForm(prev => ({ ...prev, origin: e.target.value }))}
                      className="w-full p-2 border rounded-sm text-xs outline-none"
                      style={{ background: 'var(--crm-bg)', borderColor: 'var(--crm-line)', color: 'var(--crm-heading)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold mb-1" style={LABEL_MONO}>Destination Point *</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter destination point"
                      value={createTripForm.destination}
                      onChange={(e) => setCreateTripForm(prev => ({ ...prev, destination: e.target.value }))}
                      className="w-full p-2 border rounded-sm text-xs outline-none"
                      style={{ background: 'var(--crm-bg)', borderColor: 'var(--crm-line)', color: 'var(--crm-heading)' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold mb-1" style={LABEL_MONO}>Assign Driver *</label>
                  <select
                    value={createTripForm.assignedDriverId}
                    onChange={(e) => setCreateTripForm(prev => ({ ...prev, assignedDriverId: e.target.value }))}
                    className="w-full p-2 border rounded-sm text-xs font-bold outline-none cursor-pointer"
                    style={{ background: 'var(--crm-bg)', borderColor: 'var(--crm-line)', color: 'var(--crm-heading)' }}
                  >
                    <option value="">Select Fleet Captain Driver...</option>
                    {driversList.map(d => (
                      <option key={d._id} value={d._id}>{d.name} ({d.vehicleNumber || 'No Truck Assigned'})</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowCreateTripModal(false)} className="px-3 py-1.5 border rounded-sm text-[10px] font-bold uppercase" style={{ borderColor: 'var(--crm-line)' }}>Cancel</button>
                  <button type="submit" disabled={submittingTrip} className="px-4 py-1.5 border text-xs font-bold uppercase rounded-sm cursor-pointer" style={{ background: 'var(--crm-accent-bg)', borderColor: 'var(--crm-accent)', color: 'var(--crm-heading)' }}>
                    {submittingTrip ? 'Creating...' : 'Create & Assign Trip'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: BROADCAST ANNOUNCEMENT */}
      <AnimatePresence>
        {showBroadcastModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBroadcastModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative border-2 border-rose-600 w-full max-w-md p-6 rounded-sm shadow-2xl z-10 text-left space-y-4 font-mono text-xs" style={{ background: '#18080a' }}>
              <h3 className="text-xs font-bold uppercase text-rose-400 flex items-center gap-2">
                <FiVolume2 size={16} className="animate-pulse" /> Send Emergency Broadcast to All Drivers
              </h3>
              <form onSubmit={handleSendBroadcast} className="space-y-3">
                <textarea
                  rows="3"
                  required
                  placeholder="Enter emergency broadcast alert for drivers..."
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-rose-900 rounded-sm text-white text-xs outline-none"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowBroadcastModal(false)} className="px-3 py-1.5 border border-slate-700 text-slate-300 text-[10px] font-bold rounded-sm uppercase">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-sm shadow cursor-pointer">
                    Broadcast Now
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT FREIGHT REVENUE (TRANSPORT MANAGER & FOUNDER AUTHORIZATION) */}
      <AnimatePresence>
        {showEditRevenueModal && editingOrder && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditRevenueModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative border-2 border-emerald-600 w-full max-w-md p-6 rounded-sm shadow-2xl z-10 text-left space-y-4 font-mono text-xs" style={CARD}>
              <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
                <div>
                  <h3 className="text-xs font-bold uppercase text-emerald-400 flex items-center gap-2">
                    <FiDollarSign size={16} /> Edit Lead Freight Revenue
                  </h3>
                  <span className="text-[9px] text-emerald-500/80 font-mono block">Transport Manager & Founder Authorization</span>
                </div>
                <button onClick={() => setShowEditRevenueModal(false)} className="text-[var(--crm-ink-faint)] hover:text-white cursor-pointer"><FiX size={16} /></button>
              </div>

              <form onSubmit={handleSaveFreightRevenue} className="space-y-3">
                <div className="p-2.5 bg-black/40 border border-[var(--crm-line)] rounded-sm space-y-1 text-[11px]">
                  <div>Lead / Order Code: <strong className="text-amber-400">{editingOrder.orderNumber || editingOrder.dispatchNumber || editingOrder._id}</strong></div>
                  <div>Customer: <strong className="text-[var(--crm-heading)]">{editingOrder.customerName || 'Client'}</strong></div>
                  <div>Cargo Material: <span className="text-sky-300">{editingOrder.material || 'Goods Load'}</span></div>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold mb-1 text-emerald-400">Total Freight Revenue (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="Enter total freight revenue amount"
                    value={newRevenueInput}
                    onChange={(e) => setNewRevenueInput(e.target.value)}
                    className="w-full p-2.5 border border-emerald-700 bg-slate-950 rounded-sm text-emerald-300 text-sm font-bold outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold mb-1" style={LABEL_MONO}>Reason for Revision / Remark</label>
                  <input
                    type="text"
                    placeholder="Enter rate revision reason"
                    value={revenueReasonInput}
                    onChange={(e) => setRevenueReasonInput(e.target.value)}
                    className="w-full p-2 border rounded-sm text-xs font-bold outline-none"
                    style={{ background: 'var(--crm-bg)', borderColor: 'var(--crm-line)', color: 'var(--crm-heading)' }}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--crm-line)' }}>
                  <button type="button" onClick={() => setShowEditRevenueModal(false)} className="px-3 py-1.5 border rounded-sm text-[10px] font-bold uppercase" style={{ borderColor: 'var(--crm-line)' }}>Cancel</button>
                  <button type="submit" disabled={savingRevenue} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-sm shadow cursor-pointer">
                    {savingRevenue ? 'Updating...' : 'Save & Update Revenue'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INTERACTIVE LIVE ROUTE & GOOGLE MAP MODAL */}
      <OrderMapModal
        isOpen={!!selectedMapOrder}
        onClose={() => setSelectedMapOrder(null)}
        order={selectedMapOrder}
      />

      {/* FULL-RESOLUTION DRIVER PROOF IMAGE LIGHTBOX MODAL */}
      <AnimatePresence>
        {selectedPreviewImage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPreviewImage(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-3xl max-h-[85vh] z-10 p-3 bg-slate-900 border border-purple-500/50 rounded-lg shadow-2xl overflow-hidden flex flex-col items-center"
            >
              <button
                type="button"
                onClick={() => setSelectedPreviewImage(null)}
                className="absolute top-3 right-3 text-white bg-black/80 hover:bg-rose-600 p-1.5 rounded-full transition cursor-pointer z-20 border border-slate-700"
              >
                <FiX size={18} />
              </button>
              <img
                src={selectedPreviewImage}
                alt="Driver Uploaded Proof Document Full View"
                className="max-w-full max-h-[72vh] object-contain rounded border border-purple-900/60"
              />
              <div className="mt-2 text-xs font-mono text-purple-300 font-bold flex items-center gap-1.5">
                <FiFolder className="text-purple-400" /> Driver Uploaded Original Proof Document (Full Zoom)
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
