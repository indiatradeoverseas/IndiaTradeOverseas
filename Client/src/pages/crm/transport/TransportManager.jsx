import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiTruck, FiCheckCircle, FiAlertCircle, FiClock, FiUser, FiMapPin, 
  FiPlus, FiFileText, FiMessageSquare, FiRefreshCw, FiSearch, FiFilter,
  FiSend, FiUserCheck, FiShield, FiCheckSquare, FiXCircle, FiGrid, FiPackage,
  FiDollarSign, FiNavigation, FiMic, FiVolume2, FiAlertTriangle, FiCompass,
  FiTrendingUp, FiTrendingDown, FiPieChart, FiUsers, FiPhone, FiCalendar,
  FiX, FiExternalLink, FiMaximize2, FiBriefcase, FiTool, FiSliders, FiShare2, FiActivity,
  FiCreditCard, FiFolder, FiFile, FiCheck
} from 'react-icons/fi';
import toast from 'react-hot-toast';

import { dispatchesApi } from '../../../api/dispatches';
import { employeeSignupApi } from '../../../api/employee-signup';
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
    }
  }, [location]);

  // Core Data States
  const [trips, setTrips] = useState([]);
  const [dispatchQueue, setDispatchQueue] = useState([]);
  const [driversList, setDriversList] = useState([]);
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

  // Driver Work Updates Feed (Persisted & Synced locally)
  const [driverWorkUpdates, setDriverWorkUpdates] = useState(() => {
    try {
      const saved = localStorage.getItem('ito_driver_work_updates') || localStorage.getItem('transport_manager_work_updates');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Dedicated Live Chat Hub States
  const [chatMessages, setChatMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('ito_transport_chat_messages');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [inputMessage, setInputMessage] = useState('');
  const chatContainerRef = useRef(null);

  const [chatInput, setChatInput] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');

  // Fuel & Maintenance Logs (Persisted locally)
  const [fuelMaintenanceLogs, setFuelMaintenanceLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('transport_manager_fuel_logs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Driver Uploaded Proofs List (Persisted locally)
  const [driverUploadedProofs, setDriverUploadedProofs] = useState(() => {
    try {
      const saved = localStorage.getItem('transport_manager_driver_proofs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Driver Scorecards
  const [driverScorecards, setDriverScorecards] = useState([]);

  // Quotations Form & List (Persisted locally)
  const [quotationsList, setQuotationsList] = useState(() => {
    try {
      const saved = localStorage.getItem('transport_manager_quotations');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [quotationForm, setQuotationForm] = useState({ clientName: '', route: '', ratePerTon: '', tonnage: '25' });

  // Map & Live GPS Telemetry
  const [gpsLocation, setGpsLocation] = useState({ lat: 28.6139, long: 77.2090 });
  const [etaKmRemaining, setEtaKmRemaining] = useState(120);

  // Persistence Effects & Real-Time Listeners
  useEffect(() => {
    localStorage.setItem('ito_driver_work_updates', JSON.stringify(driverWorkUpdates));
    localStorage.setItem('transport_manager_work_updates', JSON.stringify(driverWorkUpdates));
  }, [driverWorkUpdates]);

  useEffect(() => {
    localStorage.setItem('ito_transport_chat_messages', JSON.stringify(chatMessages));
    localStorage.setItem('transport_manager_chats', JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    const syncRealtimeData = () => {
      try {
        const savedUpdates = localStorage.getItem('ito_driver_work_updates') || localStorage.getItem('transport_manager_work_updates');
        if (savedUpdates) setDriverWorkUpdates(JSON.parse(savedUpdates));

        const savedChats = localStorage.getItem('ito_transport_chat_messages') || localStorage.getItem('transport_manager_chats');
        if (savedChats) setChatMessages(JSON.parse(savedChats));

        const savedFuelLogs = localStorage.getItem('ito_driver_fuel_expenses') || localStorage.getItem('transport_manager_fuel_logs');
        if (savedFuelLogs) {
          const list = JSON.parse(savedFuelLogs);
          setFuelMaintenanceLogs(list);
          setDriverScorecards(list.map(item => ({
            driver: item.driver || 'Driver',
            vehicle: item.vehicle || 'Carrier Truck',
            tripsCount: 1,
            totalKm: item.totalKm || item.kmDriven || 0,
            avgMileageKmL: item.litres && Number(item.litres) > 0 ? (Number(item.totalKm || 0) / Number(item.litres)).toFixed(1) : '4.5'
          })));
        }
      } catch (err) {}
    };

    syncRealtimeData();
    window.addEventListener('ito_driver_work_update_event', syncRealtimeData);
    window.addEventListener('ito_transport_chat_event', syncRealtimeData);
    window.addEventListener('ito_fuel_expense_event', syncRealtimeData);
    window.addEventListener('storage', syncRealtimeData);
    const timer = setInterval(syncRealtimeData, 2000);

    return () => {
      window.removeEventListener('ito_driver_work_update_event', syncRealtimeData);
      window.removeEventListener('ito_transport_chat_event', syncRealtimeData);
      window.removeEventListener('ito_fuel_expense_event', syncRealtimeData);
      window.removeEventListener('storage', syncRealtimeData);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('transport_manager_fuel_logs', JSON.stringify(fuelMaintenanceLogs));
  }, [fuelMaintenanceLogs]);

  useEffect(() => {
    localStorage.setItem('transport_manager_driver_proofs', JSON.stringify(driverUploadedProofs));
  }, [driverUploadedProofs]);

  const [selectedPreviewImage, setSelectedPreviewImage] = useState(null);



  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages.length]);

  useEffect(() => {
    const handleChatSync = () => {
      try {
        const saved = localStorage.getItem('ito_transport_chat_messages');
        if (saved) setChatMessages(JSON.parse(saved));
      } catch (e) {}
    };

    window.addEventListener('ito_transport_chat_event', handleChatSync);
    window.addEventListener('storage', handleChatSync);

    try {
      const socket = socketService.getSocket();
      if (socket) {
        socket.on('driver_chat_message', (msg) => {
          setChatMessages(prev => [...prev, msg]);
        });
      }
    } catch (e) {}

    return () => {
      window.removeEventListener('ito_transport_chat_event', handleChatSync);
      window.removeEventListener('storage', handleChatSync);
    };
  }, []);

  const handleSendMessage = (e) => {
    e.preventDefault();
    const clean = inputMessage.trim();
    if (!clean) return;

    const senderName = `${user?.name || user?.fullName || 'Vikram Singh'} (MANAGER)`;
    const newMsg = {
      id: Date.now(),
      sender: senderName,
      text: clean,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => {
      const updated = [...prev, newMsg];
      try {
        localStorage.setItem('ito_transport_chat_messages', JSON.stringify(updated));
        window.dispatchEvent(new Event('ito_transport_chat_event'));
      } catch (err) {}
      return updated;
    });

    try {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('driver_chat_message', newMsg);
      }
    } catch (err) {}

    setInputMessage('');
  };

  useEffect(() => {
    localStorage.setItem('transport_manager_quotations', JSON.stringify(quotationsList));
  }, [quotationsList]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tripsRes, queueRes, empRes] = await Promise.allSettled([
        dispatchesApi.getDispatches(),
        dispatchesApi.getDispatchQueue(),
        employeeSignupApi.getAllEmployees()
      ]);

      let fetchedTrips = [];
      if (tripsRes.status === 'fulfilled' && (tripsRes.value?.success || tripsRes.value?.data)) {
        fetchedTrips = tripsRes.value.data?.dispatches || tripsRes.value.dispatches || [];
      }

      // Merge locally created trips from localStorage
      let localCreatedTrips = [];
      try {
        const saved = localStorage.getItem('ito_created_trips');
        if (saved) localCreatedTrips = JSON.parse(saved);
      } catch (e) {}

      // Combine fetchedTrips with localCreatedTrips (deduplicating by _id / orderNumber / dispatchNumber)
      const tripsMap = new Map();
      fetchedTrips.forEach(t => tripsMap.set(t._id || t.orderNumber || t.dispatchNumber, t));
      localCreatedTrips.forEach(t => tripsMap.set(t._id || t.orderNumber || t.dispatchNumber, t));
      const combinedTripsList = Array.from(tripsMap.values());

      // Apply edited revenues map from localStorage
      let editedRevenues = {};
      try {
        const savedRev = localStorage.getItem('ito_edited_revenues');
        if (savedRev) editedRevenues = JSON.parse(savedRev);
      } catch (e) {}

      const updatedTrips = combinedTripsList.map(t => {
        const key = t._id || t.orderNumber || t.dispatchNumber;
        if (editedRevenues[key]) {
          return { ...t, totalFreightAmount: editedRevenues[key], freightAmount: editedRevenues[key] };
        }
        return t;
      });
      setTrips(updatedTrips);

      // Extract MongoDB Database fuel logs from backend dispatches
      const dbFuelLogs = [];
      updatedTrips.forEach(t => {
        if (t.fuelLogs && Array.isArray(t.fuelLogs) && t.fuelLogs.length > 0) {
          t.fuelLogs.forEach(fl => {
            dbFuelLogs.push({
              id: fl._id || `db_${fl.loggedAt || Date.now()}`,
              driver: t.driverName || 'Ramesh Driver',
              vehicle: t.vehicleNumber || 'Carrier Truck',
              totalKm: fl.kmDriven || 0,
              fromLocation: fl.fromLocation || t.origin || '',
              toLocation: fl.toLocation || t.destination || '',
              fuelCost: fl.amountPaid || 0,
              litres: fl.quantityLiters || 0,
              punctureCost: fl.punctureCost || 0,
              otherCost: fl.otherCost || 0,
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

      // Filter assigned & delivered lead IDs from localStorage
      let assignedLeadIds = [];
      let deliveredLeadIds = [];
      try {
        const savedAssigned = localStorage.getItem('ito_assigned_lead_ids');
        if (savedAssigned) assignedLeadIds = JSON.parse(savedAssigned);
        const savedDelivered = localStorage.getItem('ito_delivered_order_ids');
        if (savedDelivered) deliveredLeadIds = JSON.parse(savedDelivered);
      } catch (e) {}

      const updatedQueue = fetchedQueue.map(q => {
        const key = q._id || q.orderNumber || q.dispatchNumber;
        if (editedRevenues[key]) {
          q = { ...q, totalFreightAmount: editedRevenues[key], freightAmount: editedRevenues[key] };
        }
        if (deliveredLeadIds.includes(key) || deliveredLeadIds.includes(q._id) || deliveredLeadIds.includes(q.orderNumber) || deliveredLeadIds.includes(q.dispatchNumber)) {
          q = { ...q, stage: 'DEAL_WON', status: 'DELIVERED', dispatchStatus: 'DELIVERED' };
        } else if (assignedLeadIds.includes(key) || assignedLeadIds.includes(q._id) || assignedLeadIds.includes(q.orderNumber)) {
          q = { ...q, stage: 'ASSIGNED', status: 'ASSIGNED' };
        }
        return q;
      });
      setDispatchQueue(updatedQueue);

      let fetchedDrivers = [];
      if (empRes.status === 'fulfilled' && (empRes.value?.success || empRes.value?.data)) {
        const emps = empRes.value.data?.employees || empRes.value.employees || [];
        fetchedDrivers = emps.filter(e => (e.role || '').toUpperCase().includes('DRIVER') || (e.department || '').toUpperCase().includes('TRANSPORT'));
        setDriversList(fetchedDrivers);

        // Build dynamic Driver Scorecards from actual driver list
        if (fetchedDrivers.length > 0) {
          const scorecards = fetchedDrivers.map(d => {
            const driverTrips = updatedTrips.filter(t => t.driverName?.toLowerCase().includes(d.name?.toLowerCase()));
            return {
              driver: d.name,
              vehicle: d.vehicleNumber || d.truckNumber || 'Assigned Carrier',
              tripsCount: driverTrips.length,
              totalKm: driverTrips.length * 240,
              onTimeRate: 98,
              avgMileageKmL: 4.1
            };
          });
          setDriverScorecards(scorecards);
        }
      }

      // Compute Real-Time Dynamic Metrics
      const combinedAll = [...updatedTrips, ...updatedQueue];

      const totalFreightRev = combinedAll.reduce((sum, t) => {
        const amt = Number(t.totalFreightAmount || t.grossFreight || t.freightAmount || t.freightRate || t.amountCollected || t.totalAmount || (t.weightTons ? Number(t.weightTons) * 750 : 18000)) || 18000;
        return sum + amt;
      }, 0);

      const todayRev = combinedAll
        .filter(t => new Date(t.createdAt || Date.now()).toDateString() === new Date().toDateString())
        .reduce((sum, t) => {
          return sum + (Number(t.totalFreightAmount || t.grossFreight || t.freightAmount || 18000) || 18000);
        }, 0);

      const compCount = combinedAll.filter(t => 
        (t.status || t.dispatchStatus || t.stage || '').toUpperCase().includes('DELIVER') ||
        (t.status || t.dispatchStatus || t.stage || '').toUpperCase().includes('COMPLET') ||
        (t.status || t.dispatchStatus || t.stage || '').toUpperCase().includes('WON')
      ).length;

      const activeCount = combinedAll.filter(t => 
        (t.status || t.dispatchStatus || t.stage || '').toUpperCase().includes('TRANSIT') ||
        (t.status || t.dispatchStatus || t.stage || '').toUpperCase().includes('LOAD') ||
        (t.status || t.dispatchStatus || t.stage || '').toUpperCase().includes('ASSIGN')
      ).length;

      const pendingUnassignedLeads = updatedQueue.filter(lead => {
        const st = (lead.stage || lead.status || lead.dispatchStatus || '').toUpperCase();
        return st !== 'DELIVERED' && st !== 'COMPLETED' && st !== 'DEAL_WON' && st !== 'ASSIGNED' && st !== 'IN_TRANSIT';
      });

      setMetrics({
        totalDispatch: combinedAll.length,
        totalRevenue: totalFreightRev,
        collectedToday: todayRev,
        totalLeads: combinedAll.length,
        pendingLeads: pendingUnassignedLeads.length,
        numDrivers: fetchedDrivers.length,
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

    setTrips(prev => {
      const updated = [newTripObj, ...prev];
      try {
        const existingCreated = JSON.parse(localStorage.getItem('ito_created_trips') || '[]');
        localStorage.setItem('ito_created_trips', JSON.stringify([newTripObj, ...existingCreated]));
      } catch (e) {}
      return updated;
    });

    try {
      const targetLeadId = createTripForm.orderNumber;
      const existingAssigned = JSON.parse(localStorage.getItem('ito_assigned_lead_ids') || '[]');
      if (targetLeadId && !existingAssigned.includes(targetLeadId)) {
        localStorage.setItem('ito_assigned_lead_ids', JSON.stringify([...existingAssigned, targetLeadId]));
      }
    } catch (e) {}

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
  const [verifiedPodIds, setVerifiedPodIds] = useState(() => {
    try {
      const saved = localStorage.getItem('ito_verified_pod_ids');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

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
    try {
      localStorage.setItem('ito_verified_pod_ids', JSON.stringify(updated));
    } catch (err) {}

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
    const currAmt = item.totalFreightAmount || item.freightAmount || 18000;
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

    // Save edited revenue to localStorage
    try {
      const existingRevenues = JSON.parse(localStorage.getItem('ito_edited_revenues') || '{}');
      existingRevenues[targetId] = numAmt;
      if (editingOrder._id) existingRevenues[editingOrder._id] = numAmt;
      if (editingOrder.orderNumber) existingRevenues[editingOrder.orderNumber] = numAmt;
      if (editingOrder.dispatchNumber) existingRevenues[editingOrder.dispatchNumber] = numAmt;
      localStorage.setItem('ito_edited_revenues', JSON.stringify(existingRevenues));
    } catch (e) {}

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
      const oldVal = Number(editingOrder.totalFreightAmount || editingOrder.freightAmount || 18000);
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

    // 1. Process Payment Proofs from localStorage
    try {
      const savedPaymentProofs = JSON.parse(localStorage.getItem('ito_payment_proofs') || localStorage.getItem('driver_payment_proofs') || '[]');
      savedPaymentProofs.forEach((p, idx) => {
        if (p.proofImageUrl || p.photoUrl) {
          const url = p.proofImageUrl || p.photoUrl;
          records.push({
            id: `PAYMENT-PROOF-${p.id || idx}`,
            driverName: p.driverName || 'Ramesh Driver',
            vehicleNo: p.vehicleNo || 'BR-01-TR-4521',
            proofType: `Payment Receipt (${p.paymentMode || 'UPI'})`,
            fileType: detectFileType(url),
            orderCode: `Amount: ₹${p.amountPaid || 0}`,
            date: p.date || todayStr,
            rawTimestamp: p.id || Date.now() - (idx * 1000),
            photoUrl: url,
            notes: `Payment Mode: ${p.paymentMode || 'UPI'} • UPI Ref: ${p.upiRefNo || 'N/A'} • Amount Collected: ₹${p.amountPaid || 0}`,
            status: 'PAYMENT VERIFIED ✓'
          });
        }
      });
    } catch (e) {}

    // 2. Process all Trips & Queue Items with uploaded POD or Proof documents from MongoDB Database
    [...trips, ...dispatchQueue].forEach((t, idx) => {
      const driver = t.driverName || t.assignedDriverName || 'Ramesh Driver';
      const vehicle = t.vehicleNo || t.vehicleNumber || t.truckNumber || 'BR-01-TR-4521';
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
        if (src.url && typeof src.url === 'string' && src.url.trim() !== '') {
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

    // 3. Process Fuel & Maintenance Logs
    fuelMaintenanceLogs.forEach((fl, idx) => {
      const dateStr = fl.date || new Date(fl.loggedAt || Date.now()).toLocaleDateString('en-IN');
      const ts = fl.loggedAt ? new Date(fl.loggedAt).getTime() : Date.now() - (idx * 7200000);
      const url = fl.photoUrl || fl.receiptPhotoUrl || '';
      if (url && url.trim() !== '') {
        records.push({
          id: `FUEL-${fl.id || idx}`,
          driverName: fl.driver || 'Ramesh Driver',
          vehicleNo: fl.vehicle || 'BR-01-TR-4521',
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

    // 4. Process Driver Work Updates
    driverWorkUpdates.forEach((up, idx) => {
      const dateStr = up.date || new Date().toLocaleDateString('en-IN');
      const ts = up.id || Date.now() - (idx * 1800000);
      const url = up.photoUrl || '';
      if (url && url.trim() !== '') {
        records.push({
          id: `WORKUP-${up.id || idx}`,
          driverName: up.driver || 'Ramesh Driver',
          vehicleNo: up.vehicle || 'BR-01-TR-4521',
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

    // 5. Process Vehicle Attendance Check-in Logs from localStorage
    try {
      const savedAtt = JSON.parse(localStorage.getItem('ito_driver_attendance_logs') || '[]');
      savedAtt.forEach((att, idx) => {
        if (att.photoUrl || att.proofImageUrl) {
          const url = att.photoUrl || att.proofImageUrl;
          records.push({
            id: `ATT-PROOF-${att.id || idx}`,
            driverName: att.driverName || 'Ramesh Driver',
            vehicleNo: att.vehicleNo || 'BR-01-TR-4521',
            proofType: 'Driver Duty Attendance & Vehicle Check-in',
            fileType: detectFileType(url),
            orderCode: `Check-in Time: ${att.time || 'On Duty'}`,
            date: att.date || todayStr,
            rawTimestamp: att.rawTimestamp || Date.now() - (idx * 1000),
            photoUrl: url,
            notes: `Vehicle Check-in #${att.vehicleNo || 'Carrier'} • Odometer: ${att.odometerKm || '0'} KM • Marked at ${att.time || 'Shift Start'}`,
            status: 'ATTENDANCE VERIFIED ✓'
          });
        }
      });
    } catch (e) {}

    return records.sort((a, b) => b.rawTimestamp - a.rawTimestamp);
  }, [trips, dispatchQueue, fuelMaintenanceLogs, driverWorkUpdates]);

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

    // Real-time sync to Driver Mobile View
    try {
      const existing = JSON.parse(localStorage.getItem('ito_transport_chat_messages') || localStorage.getItem('transport_manager_chats') || '[]');
      const updated = [newMsg, ...existing];
      localStorage.setItem('ito_transport_chat_messages', JSON.stringify(updated));
      localStorage.setItem('transport_manager_chats', JSON.stringify(updated));
      window.dispatchEvent(new Event('ito_transport_chat_event'));
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

          {/* MIDDLE ROW 1: LEAD ASSIGNMENT & DRIVER WORKUPDATE FEED */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 font-mono">
            
            {/* Left (60%): Lead jo driver ko assign kr sakhe */}
            <div className="lg:col-span-7 border rounded-sm p-4 space-y-3" style={CARD}>
              <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
                <h2 className="text-xs uppercase font-bold tracking-wider" style={HEADING}>Lead & Trip Assignment Panel</h2>
                <button 
                  onClick={() => setShowCreateTripModal(true)} 
                  className="px-2.5 py-1 border text-[9px] font-bold uppercase rounded-sm cursor-pointer"
                  style={{ borderColor: 'var(--crm-accent)', background: 'var(--crm-accent-bg)', color: 'var(--crm-heading)' }}
                >
                  + Create New Load
                </button>
              </div>

              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1 text-xs custom-scrollbar">
                {dispatchQueue.length === 0 && trips.length === 0 ? (
                  <div className="p-6 text-center text-[var(--crm-ink-faint)] text-xs">No active leads or dispatches created yet. Click "+ Create New Load" to assign.</div>
                ) : (
                  <>
                    {/* Render Pending Confirmed Orders */}
                    {dispatchQueue.filter(lead => {
                      const st = (lead.stage || lead.status || lead.dispatchStatus || '').toUpperCase();
                      return st !== 'DELIVERED' && st !== 'COMPLETED';
                    }).map((lead) => (
                      <div 
                        key={lead._id} 
                        onClick={() => setSelectedMapOrder(lead)}
                        className="p-3 border rounded-sm space-y-2 text-xs cursor-pointer hover:border-teal-500 transition group" 
                        style={{ ...CARD_SUNKEN, borderColor: 'var(--crm-line)' }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] text-[var(--crm-ink-faint)] uppercase font-mono block">Lead Code: <strong className="text-teal-400 group-hover:underline">{lead.orderNumber || lead._id}</strong></span>
                            <strong className="text-[var(--crm-heading)] text-sm block font-bold">{lead.customerName} {lead.companyName && `(${lead.companyName})`}</strong>
                            <span className="text-[10px] text-[var(--crm-ink-soft)] font-mono block">Material: <strong className="text-teal-300">{lead.material}</strong></span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="px-2 py-0.5 border text-[9px] font-bold rounded-sm uppercase text-teal-300 border-teal-800 bg-teal-950/50 shrink-0">
                              {lead.stage || 'ORDER CONFIRMED'}
                            </span>
                            <span className="text-[9px] text-sky-400 font-bold underline flex items-center gap-1 group-hover:text-teal-300">
                              <FiNavigation size={10} /> View Map &rarr;
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[11px] p-2 rounded-sm" style={{ background: 'var(--crm-bg)' }}>
                          <span className="text-[var(--crm-ink-soft)]">📍 {lead.origin || 'Delhi'} &rarr; 🚩 {lead.destination || 'Destination'}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-emerald-400 font-bold font-mono">
                              Value: {Number(lead.freightAmount || lead.totalFreightAmount) > 0 ? `₹${Number(lead.freightAmount || lead.totalFreightAmount).toLocaleString('en-IN')}` : '₹18,000'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditRevenueModal(lead, e)}
                              className="text-[9px] px-2 py-0.5 border border-teal-800 bg-teal-950/60 text-teal-300 font-bold rounded cursor-pointer hover:bg-teal-900 shrink-0 transition"
                              title="Edit Revenue (Transport Manager & Founder)"
                            >
                              ✏️ Edit Revenue
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[10px] pt-1 border-t" style={{ borderColor: 'var(--crm-line)' }}>
                          <span className="text-[var(--crm-ink-faint)]">Order Confirmed By: <strong className="text-teal-400">{lead.orderConfirmedBy || lead.salesOwner || 'Sales Team'}</strong></span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleAssignLeadToDriver(lead); }} 
                            className="px-3 py-1 bg-teal-700 hover:bg-teal-600 text-white font-mono font-bold text-[9px] uppercase tracking-wider rounded-sm flex items-center gap-1 cursor-pointer shadow-sm transition"
                          >
                            <FiPlus size={11} /> Assign Driver & Truck
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Render Active Trips */}
                    {trips.filter(t => {
                      const st = (t.status || t.dispatchStatus || '').toUpperCase();
                      return st !== 'DELIVERED' && st !== 'COMPLETED';
                    }).map((t) => (
                      <div 
                        key={t._id} 
                        onClick={() => setSelectedMapOrder(t)}
                        className="p-3 border rounded-sm space-y-2 cursor-pointer hover:border-sky-500 transition group" 
                        style={CARD_SUNKEN}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <strong className="text-teal-400 text-sm group-hover:underline">{t.dispatchNumber || t.orderNumber || t._id}</strong>
                            <span className="text-[var(--crm-heading)] block font-bold">{t.customerName || 'Client'} &bull; {t.material || 'Rice Cargo'}</span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="px-2 py-0.5 border text-[9px] font-bold rounded-sm uppercase text-emerald-400 border-emerald-900 bg-emerald-950/40">
                              {t.status || 'LOADING'}
                            </span>
                            <span className="text-[9px] text-sky-400 font-bold underline flex items-center gap-1 group-hover:text-teal-300">
                              <FiNavigation size={10} /> View Map &rarr;
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[11px] p-2 rounded-sm" style={{ background: 'var(--crm-bg)' }}>
                          <span className="text-[var(--crm-ink-soft)]">📍 {t.origin || 'Delhi'} &rarr; 🚩 {t.destination || 'Agra'}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-emerald-400 font-bold font-mono">
                              Revenue: ₹{Number(t.totalFreightAmount || t.freightAmount || 18000).toLocaleString('en-IN')}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditRevenueModal(t, e)}
                              className="text-[9px] px-1.5 py-0.5 border border-sky-600 bg-sky-950/60 text-sky-300 font-bold rounded cursor-pointer hover:bg-sky-800 shrink-0"
                              title="Edit Revenue (Transport Manager & Founder)"
                            >
                              ✏️ Edit Revenue
                            </button>
                          </div>
                        </div>

                        <div className="text-[10px] space-y-0.5 pt-1 border-t" style={{ borderColor: 'var(--crm-line)' }}>
                          <div className="flex justify-between items-center">
                            <span>Driver: <strong className="text-emerald-400">{t.driverName || 'Assigned Driver'}</strong> ({t.vehicleNo || 'Carrier Vehicle'})</span>
                            <button onClick={() => handleShareETA(t)} className="px-2.5 py-1 border text-sky-400 border-sky-800 bg-sky-950/40 font-bold rounded-sm flex items-center gap-1 cursor-pointer">
                              <FiShare2 size={11} /> Share ETA WhatsApp
                            </button>
                          </div>
                          <div className="text-[9px] text-[var(--crm-ink-faint)] flex flex-wrap gap-3">
                            <span>Confirmed By: <strong className="text-teal-400">{t.orderConfirmedBy || 'Sales Rep'}</strong></span>
                            <span>Assigned By: <strong className="text-sky-400">{t.assignedByManager || t.managerName || 'Transport Manager'}</strong></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Right (40%): Jo Driver apna work update de vo yeha dikhe */}
            <div className="lg:col-span-5 border rounded-sm p-4 space-y-3" style={CARD}>
              <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
                <h2 className="text-xs uppercase font-bold tracking-wider" style={HEADING}>Driver WorkUpdate Live Feed</h2>
                <span className="text-[9px] text-emerald-400 font-bold animate-pulse">● Live Stream</span>
              </div>

              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 text-xs">
                {driverWorkUpdates.length === 0 ? (
                  <div className="p-6 text-center text-[var(--crm-ink-faint)] text-xs">No driver work updates posted yet.</div>
                ) : (
                  driverWorkUpdates.map((up) => (
                    <div key={up.id} className="p-3 border rounded-sm space-y-1" style={CARD_SUNKEN}>
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

          </div>

          {/* MIDDLE ROW 2: GOOGLE MAP LIVE GPS & CHAT BOX WITH MIC */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 font-mono">
            <div className="lg:col-span-8 border rounded-sm overflow-hidden flex flex-col" style={CARD}>
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

            {/* Live Desk Chat Box with Driver */}
            <div className="lg:col-span-4 border rounded-sm p-4 flex flex-col justify-between h-[375px]" style={CARD}>
              <div>
                <div className="flex justify-between items-center border-b pb-2 mb-2" style={{ borderColor: 'var(--crm-line)' }}>
                  <h2 className="text-xs uppercase font-bold tracking-wider flex items-center gap-1.5 text-sky-400" style={HEADING}>
                    <FiMessageSquare size={15} /> Live Desk Chat with Driver
                  </h2>
                  <button onClick={handleToggleVoiceRecord} className={`p-1.5 rounded-sm cursor-pointer transition ${isRecordingVoice ? 'bg-rose-600 text-white animate-pulse' : 'border border-[var(--crm-line)] text-[var(--crm-accent)] hover:bg-[var(--crm-bg-sunken)]'}`}>
                    <FiMic size={14} />
                  </button>
                </div>

                <div className="space-y-2 overflow-y-auto max-h-[250px] pr-1 text-xs custom-scrollbar">
                  {chatMessages.length === 0 ? (
                    <div className="p-6 text-center text-[var(--crm-ink-faint)] text-xs">No chat messages yet. Send a message or record a voice note below.</div>
                  ) : (
                    chatMessages.map((m) => (
                      <div key={m.id} className="p-2 rounded-sm border text-left" style={m.isBroadcast ? { borderColor: 'rgba(244, 63, 94, 0.4)', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e' } : CARD_SUNKEN}>
                        <div className="text-[9px] font-bold text-[var(--crm-accent)]">{m.sender}</div>
                        <p className="text-[11px] leading-relaxed">{m.text}</p>
                        <div className="text-[8px] opacity-75 text-right mt-0.5">{m.time}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSendManagerMessage(); }} className="pt-2 border-t flex gap-2" style={{ borderColor: 'var(--crm-line)' }}>
                <input
                  type="text"
                  placeholder="Type message or voice note for driver..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 p-2 border rounded-sm text-xs outline-none"
                  style={{ background: 'var(--crm-bg)', borderColor: 'var(--crm-line)', color: 'var(--crm-heading)' }}
                />
                <button type="submit" className="px-3 py-2 border rounded-sm font-bold text-[10px] uppercase cursor-pointer" style={{ background: 'var(--crm-accent-bg)', borderColor: 'var(--crm-accent)', color: 'var(--crm-heading)' }}>
                  Send
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

                      <div className="flex justify-between items-center text-[11px] p-2 rounded-sm bg-black/50 border border-emerald-900/40 font-mono">
                        <span className="text-emerald-200">📍 {t.origin || 'Delhi'} &rarr; 🚩 {t.destination || 'Destination'}</span>
                        <span className="text-emerald-400 font-bold font-mono text-xs">
                          Final Freight Revenue: ₹{Number(t.totalFreightAmount || t.freightAmount || 18000).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-emerald-900/40 font-mono">
                        <span className="text-[var(--crm-ink-faint)]">Driver: <strong className="text-emerald-300">{t.driverName || t.assignedDriverName || 'Ramesh Driver'}</strong></span>
                        
                        {!isPodVerified ? (
                          <button
                            type="button"
                            onClick={(e) => handleVerifyPODAndComplete(t, e)}
                            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-sm shadow cursor-pointer transition flex items-center gap-1.5"
                          >
                            <FiCheckCircle size={12} /> Verify POD & Complete
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-900/80 text-emerald-300 text-[9px] font-bold rounded border border-emerald-600 flex items-center gap-1">
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
            <div className="border rounded-sm p-4 space-y-3" style={CARD}>
              <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--crm-line)' }}>
                <h3 className="text-xs uppercase font-bold tracking-wider flex items-center gap-2" style={HEADING}>
                  <FiCompass className="text-teal-400" size={15} /> Driver Vehicle Utilization & Distance Log
                </h3>
                <span className="text-[9px]" style={LABEL_MONO}>Scorecard & KM Log</span>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 text-xs">
                {driverScorecards.length === 0 ? (
                  <div className="p-6 text-center text-[var(--crm-ink-faint)] text-xs">No active driver scorecards recorded.</div>
                ) : (
                  driverScorecards.map((sc, idx) => (
                    <div key={idx} className="p-3 border rounded-sm space-y-1.5" style={CARD_SUNKEN}>
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-teal-400 font-bold">{sc.driver}</span>
                        <span className="text-[var(--crm-heading)] font-mono">Truck: {sc.vehicle}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px] text-[var(--crm-ink-soft)] pt-1">
                        <div>Trips: <strong className="text-[var(--crm-heading)]">{sc.tripsCount}</strong></div>
                        <div>Total Driven: <strong className="text-emerald-400">{sc.totalKm} KM</strong></div>
                        <div>Mileage: <strong className="text-sky-300">{sc.avgMileageKmL} KM/L</strong></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

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
                          <FiPackage size={11} /> Lead: <strong className="underline text-teal-200">{log.leadCode || 'LD-1787912189516-9647'}</strong> {log.leadCustomer && `(${log.leadCustomer})`}
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

          {/* DEDICATED LIVE CHAT HUB SECTION (MATCHING EXACT USER SCREENSHOT DESIGN) */}
          <div className="border rounded-xl p-5 space-y-4 font-mono bg-[#111317] border-slate-800 shadow-2xl mt-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                TRANSPORT & DRIVER CHAT HUB
              </h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase">LIVE CONNECTION</span>
              </div>
            </div>

            {/* MESSAGES THREAD AREA */}
            <div ref={chatContainerRef} className="space-y-3 max-h-[300px] min-h-[220px] overflow-y-auto pr-2 custom-scrollbar flex flex-col">
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
                      className={`flex flex-col max-w-[80%] sm:max-w-[65%] ${isManager ? 'self-end items-end' : 'self-start items-start'}`}
                    >
                      <div
                        className={`p-3.5 rounded-2xl text-xs space-y-1 shadow-md ${
                          isManager
                            ? 'bg-[#00897b] text-white rounded-tr-none'
                            : 'bg-[#1a1d24] border border-slate-800 text-slate-200 rounded-tl-none'
                        }`}
                      >
                        <span className={`text-[10px] font-bold block ${isManager ? 'text-teal-100' : 'text-slate-400'}`}>
                          {msg.sender || (isManager ? `${user?.name || 'Vikram Singh'} (MANAGER)` : 'Driver')}
                        </span>
                        <p className="text-xs font-sans font-semibold leading-relaxed whitespace-pre-wrap">
                          {msg.text}
                        </p>
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1 font-mono">{msg.time || '12:00 PM'}</span>
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
                  className="w-full py-3 px-4 bg-[#090b0e] border border-teal-700/60 rounded-xl text-slate-100 text-xs outline-none focus:border-teal-500 transition font-sans"
                />
              </div>
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="p-3 bg-[#00897b] hover:bg-[#00796b] disabled:opacity-50 text-white rounded-xl shadow transition cursor-pointer flex items-center justify-center"
              >
                <FiSend size={16} />
              </button>
            </form>
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
          TAB 3: PAYMENT & RECEIPTS VIEW
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'PAYMENTS' ? (
        <div className="space-y-4 font-mono">
          <div className="border rounded-sm p-6 space-y-4 font-mono" style={CARD}>
            <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
              <h2 className="text-sm font-bold text-emerald-400 uppercase flex items-center gap-2">
                <FiCreditCard /> Delivered Freight Collections & Payment Verification Log
              </h2>
              <span className="text-xs font-bold text-[var(--crm-heading)]">Total Freight Revenue: <strong className="text-emerald-400">₹{metrics.totalRevenue.toLocaleString('en-IN')}</strong></span>
            </div>

            <div className="space-y-3 text-xs">
              {(() => {
                const deliveredOnlyTrips = [...trips, ...dispatchQueue].filter(t => {
                  const st = (t.status || t.dispatchStatus || t.stage || t.rawStage || '').toUpperCase();
                  return st.includes('DELIVER') || st.includes('COMPLET') || st.includes('WON');
                });

                if (deliveredOnlyTrips.length === 0) {
                  return (
                    <div className="p-8 text-center text-[var(--crm-ink-faint)] text-xs border border-dashed border-[var(--crm-line)] rounded-sm">
                      No delivered freight trips recorded yet. Once leads are delivered & POD verified, payment collection logs will appear here.
                    </div>
                  );
                }

                return deliveredOnlyTrips.map(t => (
                  <div key={t._id || t.orderNumber || t.dispatchNumber} className="p-3.5 border rounded-sm flex items-center justify-between font-mono" style={{ ...CARD_SUNKEN, borderColor: 'var(--crm-line)' }}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-[var(--crm-heading)] text-xs font-bold">{t.dispatchNumber || t.orderNumber || t._id} &bull; {t.customerName || 'Client'}</strong>
                        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-700 font-bold rounded">
                          DEAL WON (DELIVERED) ✓
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--crm-ink-faint)] block">
                        Driver: <strong className="text-emerald-300">{t.driverName || t.assignedDriverName || 'Ramesh Driver'}</strong> ({t.vehicleNo || t.vehicleNumber || 'BR-01-TR-4521'}) &bull; Route: {t.origin || 'Delhi'} &rarr; {t.destination || 'Patna'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-[var(--crm-ink-faint)] uppercase block font-bold">Freight Revenue</span>
                      <strong className="text-emerald-400 text-sm block font-bold">₹{Number(t.totalFreightAmount || t.freightAmount || 18000).toLocaleString('en-IN')}</strong>
                      <span className="px-2 py-0.5 border text-[9px] font-bold uppercase text-emerald-400 border-emerald-900 bg-emerald-950/60 rounded-sm">
                        Payment Verified ✓
                      </span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* DEDICATED SECTION: DRIVER UPLOADED ALL PROOF RECORDS (PICS, PDF, DOC) */}
          <div className="border rounded-sm p-5 space-y-3 font-mono mt-4" style={CARD}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
              <div className="flex items-center gap-2">
                <FiFolder className="text-purple-400" size={16} />
                <h3 className="text-xs uppercase font-bold tracking-wider text-purple-300" style={HEADING}>
                  DRIVER UPLOADED ALL PROOF RECORDS ({compiledDriverProofs.length})
                </h3>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-[9px] text-[var(--crm-ink-faint)] uppercase font-bold">Filter By Date:</label>
                <select
                  value={selectedProofDate}
                  onChange={(e) => setSelectedProofDate(e.target.value)}
                  className="p-1.5 border rounded text-[10px] bg-slate-950 text-purple-300 border-purple-800 outline-none font-mono cursor-pointer"
                >
                  <option value="ALL">All Dates ({compiledDriverProofs.length} Proofs)</option>
                  {Array.from(new Set(compiledDriverProofs.map(r => r.date))).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1 text-xs custom-scrollbar">
              {compiledDriverProofs.filter(r => selectedProofDate === 'ALL' || r.date === selectedProofDate).length === 0 ? (
                <div className="col-span-3 p-8 text-center text-[var(--crm-ink-faint)] text-xs border border-dashed border-[var(--crm-line)] rounded-sm">
                  No driver proof documents uploaded for selected date filter ({selectedProofDate}).
                </div>
              ) : (
                compiledDriverProofs.filter(r => selectedProofDate === 'ALL' || r.date === selectedProofDate).map((rec) => (
                  <div key={rec.id} className="p-3.5 border border-purple-900/50 rounded-sm space-y-2 bg-purple-950/20 shadow-sm flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] text-purple-300 font-bold uppercase flex items-center gap-1">
                          {rec.fileType === 'PDF' ? '📄 PDF Document' : rec.fileType === 'DOC' ? '📝 DOC File' : '🖼️ Picture Proof'} &bull; {rec.proofType}
                        </span>
                        <span className="text-[9px] text-[var(--crm-ink-faint)] font-mono">{rec.date}</span>
                      </div>
                      <strong className="text-[var(--crm-heading)] text-xs block font-bold">{rec.driverName} ({rec.vehicleNo})</strong>
                      <span className="text-[10px] text-sky-300 font-mono block">Ref: {rec.orderCode}</span>
                      <p className="text-[10px] text-[var(--crm-ink-soft)] leading-snug">{rec.notes}</p>
                      
                      {/* DISPLAY PIC, PDF, DOC ACCORDING TO FILE TYPE */}
                      {rec.photoUrl ? (
                        rec.fileType === 'PDF' ? (
                          <div className="my-2 p-3 rounded border border-rose-800/60 bg-rose-950/40 text-center space-y-1.5">
                            <div className="text-rose-300 text-xs font-bold font-mono flex items-center justify-center gap-1.5">
                              <FiFileText size={15} /> PDF POD Copy Attached
                            </div>
                            <a
                              href={rec.photoUrl}
                              target="_blank"
                              rel="noreferrer"
                              download={`Driver_Proof_${rec.orderCode}.pdf`}
                              className="inline-block px-3 py-1 bg-rose-800 hover:bg-rose-700 text-white text-[10px] font-bold rounded shadow transition cursor-pointer"
                            >
                              📥 Download / View PDF
                            </a>
                          </div>
                        ) : rec.fileType === 'DOC' ? (
                          <div className="my-2 p-3 rounded border border-blue-800/60 bg-blue-950/40 text-center space-y-1.5">
                            <div className="text-blue-300 text-xs font-bold font-mono flex items-center justify-center gap-1.5">
                              <FiFileText size={15} /> Word DOC File Attached
                            </div>
                            <a
                              href={rec.photoUrl}
                              target="_blank"
                              rel="noreferrer"
                              download={`Driver_Proof_${rec.orderCode}.doc`}
                              className="inline-block px-3 py-1 bg-blue-800 hover:bg-blue-700 text-white text-[10px] font-bold rounded shadow transition cursor-pointer"
                            >
                              📥 Download Word DOC
                            </a>
                          </div>
                        ) : (
                          <div className="my-2 overflow-hidden rounded border border-purple-800/60 bg-black/60 relative group">
                            <img
                              src={rec.photoUrl}
                              alt="Driver Uploaded Proof Document"
                              onClick={() => setSelectedPreviewImage(rec.photoUrl)}
                              className="w-full h-32 object-cover hover:scale-105 transition duration-200 cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={() => setSelectedPreviewImage(rec.photoUrl)}
                              className="absolute bottom-1 right-1 bg-black/80 text-purple-300 text-[9px] px-1.5 py-0.5 rounded font-bold border border-purple-700 cursor-pointer flex items-center gap-1"
                            >
                              <FiExternalLink size={10} /> Zoom View
                            </button>
                          </div>
                        )
                      ) : (
                        <div className="my-2 p-2 rounded bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 font-mono text-center flex items-center justify-center gap-1.5">
                          <span>📷 No Document Attached</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-purple-900/40 flex items-center justify-between">
                      <span className="text-[9px] px-1.5 py-0.5 bg-purple-900/60 text-purple-200 border border-purple-700 font-bold rounded">
                        {rec.status}
                      </span>
                      {rec.photoUrl && (
                        <a
                          href={rec.photoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[9px] text-sky-400 underline font-bold flex items-center gap-1 hover:text-purple-300 cursor-pointer"
                        >
                          <FiExternalLink size={10} /> Open Original Attachment
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: QUOTATIONS VIEW
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'QUOTATIONS' ? (
        <div className="border rounded-sm p-6 space-y-4 font-mono" style={CARD}>
          <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
            <h2 className="text-sm font-bold text-sky-400 uppercase flex items-center gap-2">
              <FiFileText /> Client Rate Quotation Engine
            </h2>
            <button onClick={() => setShowQuotationModal(true)} className="px-3 py-1.5 border text-xs font-bold uppercase rounded-sm cursor-pointer" style={{ background: 'var(--crm-accent-bg)', borderColor: 'var(--crm-accent)', color: 'var(--crm-heading)' }}>
              + Send Rate Quote
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {quotationsList.length === 0 ? (
              <div className="p-6 text-center text-[var(--crm-ink-faint)] text-xs">No client rate quotes generated yet. Click "+ Send Rate Quote" to generate one.</div>
            ) : (
              quotationsList.map(q => (
                <div key={q.id} className="p-3.5 border rounded-sm flex items-center justify-between" style={CARD_SUNKEN}>
                  <div>
                    <strong className="text-[var(--crm-accent)] text-xs block">{q.id} &bull; {q.clientName}</strong>
                    <span className="text-[var(--crm-ink-soft)] text-[11px]">Route: {q.route} &bull; Rate: ₹{q.ratePerTon}/Ton</span>
                  </div>
                  <div className="text-right">
                    <strong className="text-emerald-400 text-sm block">₹{q.totalFreight.toLocaleString('en-IN')}</strong>
                    <span className="px-2 py-0.5 border text-[9px] font-bold uppercase text-sky-400 border-sky-900 bg-sky-950/40 rounded-sm">{q.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {/* ─────────────────────────────────────────────────────────────
          TAB 5: DRIVER UPLOADED ALL PROOF VIEW
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'DRIVER_PROOFS' ? (
        <div className="border rounded-sm p-6 space-y-4 font-mono" style={CARD}>
          <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
            <h2 className="text-sm font-bold text-purple-400 uppercase flex items-center gap-2">
              <FiFolder /> Driver Uploaded All Proof Records ({compiledDriverProofs.length})
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-[9px] text-[var(--crm-ink-faint)] uppercase font-bold">Filter By Date:</label>
              <select
                value={selectedProofDate}
                onChange={(e) => setSelectedProofDate(e.target.value)}
                className="p-1.5 border rounded text-[10px] bg-slate-950 text-purple-300 border-purple-800 outline-none font-mono cursor-pointer"
              >
                <option value="ALL">All Dates ({compiledDriverProofs.length} Proofs)</option>
                {Array.from(new Set(compiledDriverProofs.map(r => r.date))).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {compiledDriverProofs.filter(r => selectedProofDate === 'ALL' || r.date === selectedProofDate).length === 0 ? (
              <div className="col-span-3 p-8 text-center text-[var(--crm-ink-faint)] text-xs border border-dashed border-[var(--crm-line)] rounded-sm">
                No driver proof documents uploaded for selected date filter ({selectedProofDate}).
              </div>
            ) : (
              compiledDriverProofs.filter(r => selectedProofDate === 'ALL' || r.date === selectedProofDate).map((rec) => (
                <div key={rec.id} className="p-4 border border-purple-900/50 rounded-sm space-y-3 bg-purple-950/20 shadow-md flex flex-col justify-between" style={CARD_SUNKEN}>
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] text-purple-300 font-bold uppercase flex items-center gap-1">
                        {rec.fileType === 'PDF' ? '📄 PDF Document' : rec.fileType === 'DOC' ? '📝 DOC File' : '🖼️ Picture Proof'} &bull; {rec.proofType}
                      </span>
                      <span className="text-[9px] text-[var(--crm-ink-faint)] font-mono">{rec.date}</span>
                    </div>
                    <strong className="text-[var(--crm-heading)] text-xs block font-bold">{rec.driverName} ({rec.vehicleNo})</strong>
                    <span className="text-[10px] text-sky-300 font-mono block">Ref: {rec.orderCode}</span>
                    <p className="text-[10px] text-[var(--crm-ink-soft)] leading-snug">{rec.notes}</p>
                    
                    {/* DISPLAY PIC, PDF, DOC ACCORDING TO FILE TYPE */}
                    {rec.photoUrl ? (
                      rec.fileType === 'PDF' ? (
                        <div className="my-2 p-3 rounded border border-rose-800/60 bg-rose-950/40 text-center space-y-1.5">
                          <div className="text-rose-300 text-xs font-bold font-mono flex items-center justify-center gap-1.5">
                            <FiFileText size={15} /> PDF POD Copy Attached
                          </div>
                          <a
                            href={rec.photoUrl}
                            target="_blank"
                            rel="noreferrer"
                            download={`Driver_Proof_${rec.orderCode}.pdf`}
                            className="inline-block px-3 py-1 bg-rose-800 hover:bg-rose-700 text-white text-[10px] font-bold rounded shadow transition cursor-pointer"
                          >
                            📥 Download / View PDF
                          </a>
                        </div>
                      ) : rec.fileType === 'DOC' ? (
                        <div className="my-2 p-3 rounded border border-blue-800/60 bg-blue-950/40 text-center space-y-1.5">
                          <div className="text-blue-300 text-xs font-bold font-mono flex items-center justify-center gap-1.5">
                            <FiFileText size={15} /> Word DOC File Attached
                          </div>
                          <a
                            href={rec.photoUrl}
                            target="_blank"
                            rel="noreferrer"
                            download={`Driver_Proof_${rec.orderCode}.doc`}
                            className="inline-block px-3 py-1 bg-blue-800 hover:bg-blue-700 text-white text-[10px] font-bold rounded shadow transition cursor-pointer"
                          >
                            📥 Download Word DOC
                          </a>
                        </div>
                      ) : (
                        <div className="my-2 overflow-hidden rounded border border-purple-800/60 bg-black/60 relative group">
                          <img
                            src={rec.photoUrl}
                            alt="Driver Uploaded Proof Document"
                            onClick={() => setSelectedPreviewImage(rec.photoUrl)}
                            className="w-full h-36 object-cover hover:scale-105 transition duration-200 cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() => setSelectedPreviewImage(rec.photoUrl)}
                            className="absolute bottom-1.5 right-1.5 bg-black/80 text-purple-300 text-[10px] px-2 py-1 rounded font-bold border border-purple-700 cursor-pointer flex items-center gap-1"
                          >
                            <FiExternalLink size={11} /> Zoom View
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="my-2 p-2 rounded bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 font-mono text-center flex items-center justify-center gap-1.5">
                        <span>📷 No Document Attached</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-purple-900/40 flex items-center justify-between">
                    <span className="text-[9px] px-1.5 py-0.5 bg-purple-900/60 text-purple-200 border border-purple-700 font-bold rounded">
                      {rec.status}
                    </span>
                    {rec.photoUrl && (
                      <a
                        href={rec.photoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[9px] text-sky-400 underline font-bold flex items-center gap-1 hover:text-purple-300 cursor-pointer"
                      >
                        <FiExternalLink size={10} /> Open Original Attachment
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
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
                      <option key={d._id} value={d._id}>{d.name} ({d.vehicleNumber || 'BR-01-TR-4521'})</option>
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

      {/* MODAL: SEND RATE QUOTATION */}
      <AnimatePresence>
        {showQuotationModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowQuotationModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative border w-full max-w-md p-6 rounded-sm shadow-2xl z-10 text-left space-y-4 font-mono text-xs" style={CARD}>
              <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
                <h3 className="text-xs font-bold uppercase text-sky-400 flex items-center gap-2">
                  <FiFileText size={16} /> Send Freight Rate Quote
                </h3>
                <button onClick={() => setShowQuotationModal(false)} className="text-[var(--crm-ink-faint)] hover:text-white cursor-pointer"><FiX size={16} /></button>
              </div>

              <form onSubmit={handleQuotationSubmit} className="space-y-3">
                <div>
                  <label className="block text-[9px] uppercase font-bold mb-1" style={LABEL_MONO}>Client / Business Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter client business name"
                    value={quotationForm.clientName}
                    onChange={(e) => setQuotationForm(prev => ({ ...prev, clientName: e.target.value }))}
                    className="w-full p-2 border rounded-sm text-xs font-bold outline-none"
                    style={{ background: 'var(--crm-bg)', borderColor: 'var(--crm-line)', color: 'var(--crm-heading)' }}
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold mb-1" style={LABEL_MONO}>Freight Route Vector *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter freight route"
                    value={quotationForm.route}
                    onChange={(e) => setQuotationForm(prev => ({ ...prev, route: e.target.value }))}
                    className="w-full p-2 border rounded-sm text-xs font-bold outline-none"
                    style={{ background: 'var(--crm-bg)', borderColor: 'var(--crm-line)', color: 'var(--crm-heading)' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] uppercase font-bold mb-1" style={LABEL_MONO}>Rate per Ton (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="750"
                      value={quotationForm.ratePerTon}
                      onChange={(e) => setQuotationForm(prev => ({ ...prev, ratePerTon: e.target.value }))}
                      className="w-full p-2 border rounded-sm text-xs font-bold outline-none"
                      style={{ background: 'var(--crm-bg)', borderColor: 'var(--crm-line)', color: 'var(--crm-heading)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold mb-1" style={LABEL_MONO}>Tonnage (MT)</label>
                    <input
                      type="number"
                      value={quotationForm.tonnage}
                      onChange={(e) => setQuotationForm(prev => ({ ...prev, tonnage: e.target.value }))}
                      className="w-full p-2 border rounded-sm text-xs font-bold outline-none"
                      style={{ background: 'var(--crm-bg)', borderColor: 'var(--crm-line)', color: 'var(--crm-heading)' }}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowQuotationModal(false)} className="px-3 py-1.5 border rounded-sm text-[10px] font-bold uppercase" style={{ borderColor: 'var(--crm-line)' }}>Cancel</button>
                  <button type="submit" className="px-4 py-1.5 border text-xs font-bold uppercase rounded-sm cursor-pointer" style={{ background: 'var(--crm-accent-bg)', borderColor: 'var(--crm-accent)', color: 'var(--crm-heading)' }}>
                    Send Quote
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
