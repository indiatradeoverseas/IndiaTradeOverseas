import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  FiShield, FiBriefcase, FiFileText, FiCheckCircle, FiArrowRight, FiArrowLeft,
  FiUser, FiPhone, FiMapPin, FiKey, FiUploadCloud, FiX, FiAward, FiCompass,
  FiLayers, FiLock, FiEye, FiDownload, FiFilter, FiShoppingCart, FiInfo,
  FiArrowDown, FiTruck, FiBox, FiActivity, FiGlobe
} from 'react-icons/fi';

import { distributorApi } from '../../api/distributor';

// Hero Background Carousel
const HERO_CAROUSEL_IMAGES = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=1600&auto=format&fit=crop",
  "/images/stone_images/10mm_White_stone.png",
  "/images/stone_images/20mm_white_stone.png",
  "/images/stone_images/40mm_White_stone.png",
  "/images/stone_images/60mm_white_stone.png",
  "/images/stone_images/Wmm.png",
  "/images/stone_images/Stone_dust.png"
];

// Detailed Stone Category Descriptions
const ALTERNATING_SHOWCASE = [
  {
    id: "10mm",
    title: "10 MM Stone Chips",
    subtitle: "RCC Structural & Precast Elements",
    image: "/images/stone_images/10mmm.jpg",
    description: "Screened angular chips designed specifically for fine concrete mixes, precast pipes, solid concrete blocks, and dense RCC works. Offers exceptional compaction density and superior binding strength.",
    specs: ["Size: 10 Nominal", "Color: Black / White", "Origin: Bhutan & Pakur", "Usage: RCC & Precast"]
  },
  {
    id: "20mm",
    title: "20 MM Stone Chips",
    subtitle: "Roof Slabs & Commercial Concrete",
    image: "/images/stone_images/20mm_white_stone.png",
    description: "The primary standard aggregate for residential roof casting (RCC), structural beams, columns, and ready-mix concrete (RMC) batching plants. White 20MM is heavily demanded for housing project roofs.",
    specs: ["Size: 20 Nominal", "Color: Black & White Available", "Loading: Phuentsholing / Gomtu", "Usage: RCC Roofing & RMC"]
  },
  {
    id: "40mm",
    title: "40 MM Stone Chips",
    subtitle: "Heavy Roadways & Site Base Development",
    image: "/images/stone_images/40mmm.jpg",
    description: "Engineered larger aggregate primarily suited for national highway construction, site leveling, PCC foundation courses, and heavy civil drainage channels. High load resistance.",
    specs: ["Size: 30 Nominal", "Color: Black / White", "Crusher: RIGSAR / PSB / LPSQ", "Usage: Highways & PCC"]
  },
  {
    id: "60mm",
    title: "60 MM Heavy Stone",
    subtitle: "Railway Ballast & Heavy Foundations",
    image: "/images/stone_images/60mmm.jpg",
    description: "High-density crushed rock used in massive foundation mass-filling, railway track ballast layers, and heavy infrastructure sub-base preparation. Direct quarry loading.",
    specs: ["Size: 40MM & 60MM", "Color: Black / White", "Loading Point: Pasakha / Paskha", "Usage: Rail & Mass Fill"]
  },
  {
    id: "wmm",
    title: "WMM (Wet Mix Macadam)",
    subtitle: "Highway Sub-Base Construction",
    image: "/images/stone_images/Wmm.png",
    description: "Premixed, screened aggregate blended with optimal moisture content for high-density road base layers. Guarantees high stability under heavy commercial vehicle loads.",
    specs: ["Type: Processed Mix", "Loading: Gomtu & Pugli", "Application: Sub-base Layer", "Dispatch: Tipper Fleets"]
  },
  {
    id: "dust",
    title: "Stone Dust",
    subtitle: "Plastering, Gap Filling & Block Work",
    image: "/images/stone_images/Stone_dust.png",
    description: "Fine stone powder generated during mechanical rock crushing. Serves as an ideal sand substitute for wall plastering, gap filling, paver block manufacturing, and asphalt mix.",
    specs: ["Size: 0 MM Powder", "Texture: Fine Screened", "Loading: Pasakha & Samtse", "Usage: Plaster & Pavers"]
  }
];

const TEASER_LISTINGS = [
  { id: "ST-BHU-01", region: "Gomtu / Phuentsholing Corridor", type: "Bhutan White 20MM", baseGrade: "Quartzite Crushed", package: "Dump Truck / Trailer", use: "RCC Roof & Commercial Works" },
  { id: "ST-PAK-02", region: "Pakur, Jharkhand Belt", type: "Pakur Black 30MM/40MM", baseGrade: "High-Density Basalt", package: "Loose Bulk Freight", use: "National Highway & Bridge Base" },
  { id: "ST-PAS-03", region: "Pasakha / Samtse Gate", type: "0MM Stone Dust & WMM", baseGrade: "Screened Fines", package: "Multi-Axle Truckloads", use: "Asphalt & Plastering Applications" },
  { id: "ST-PUG-04", region: "Pugli Loading Point", type: "Bhutan Black 60MM", baseGrade: "Mass Fill Grade", package: "Bulk Tipper Fleets", use: "Railway Ballast & Mass Civil" }
];

const APPROVED_MARKETPLACE_DATA = [
  { id: "LOT-PAK-101", region: "Pakur, Jharkhand", grade: "20 MM Black Basalt", source: "Pakur Central Crusher", stock: "18,500 MT", price: "185", dispatch: "Siliguri / Kishanganj Hubs", crusher: "Pakur Lines" },
  { id: "LOT-GOM-204", region: "Gomtu, Bhutan", grade: "10 MM / 20 MM White", source: "RIGSAR / PSB Crusher", stock: "24,000 MT", price: "220", dispatch: "Phuentsholing / Jaigaon Border", crusher: "RIGSAR / PSB" },
  { id: "LOT-PAS-308", region: "Pasakha, Bhutan", grade: "0 MM Stone Dust", source: "LPSQ Crusher", stock: "12,200 MT", price: "95", dispatch: "Pasakha Gate", crusher: "LPSQ" },
  { id: "LOT-SAM-412", region: "Samtse, Bhutan", grade: "WMM / Road Base Mix", source: "Gomtu / Pugli Plants", stock: "31,000 MT", price: "140", dispatch: "Direct Site Freight", crusher: "Gomtu Primary" }
];

export default function Stone() {
  const [userAccessLayer, setUserAccessLayer] = useState(1);
  const [isSessionLoading, setIsLoadingSession] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState('register');
  const [distributorId, setDistributorId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myProposals, setMyProposals] = useState([]);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);

  // Hero Carousel Control
  const [heroBgIndex, setHeroBgIndex] = useState(0);

  // Drawer & Form Controls
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
  const [activeDrawerLot, setActiveDrawerLot] = useState(null);
  const [orderQuantity, setOrderQuantity] = useState('500');
  const [modalMode, setModalMode] = useState('register');
  const [loginEmail, setLoginEmail] = useState('');

  // Verification Form Inputs
  const [businessType, setBusinessType] = useState('1');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [stoneType, setStoneType] = useState('20 MM Stone Chips');
  const [monthlyReq, setMonthlyReq] = useState('');
  const [purpose, setPurpose] = useState('');
  const [doc1, setDoc1] = useState(null);
  const [doc2, setDoc2] = useState(null);
  const [otp, setOtp] = useState('');

  // Global Navbar Visibility Control
  useEffect(() => {
    const globalNavbar = document.querySelector('header') || document.querySelector('nav');
    if (globalNavbar) {
      globalNavbar.style.display = userAccessLayer >= 4 ? 'none' : '';
    }
    return () => {
      if (globalNavbar) globalNavbar.style.display = '';
    };
  }, [userAccessLayer]);

  // Auto Cycle Hero Carousel
  useEffect(() => {
    const bgTimer = setInterval(() => {
      setHeroBgIndex((prev) => (prev + 1) % HERO_CAROUSEL_IMAGES.length);
    }, 5000);
    return () => clearInterval(bgTimer);
  }, []);

  // Fetch STONE Proposals
  const fetchMyProposals = async () => {
    const storedId = distributorId || localStorage.getItem('ito_stone_buyer_id') || localStorage.getItem('prakriti_distributor_id');
    const token = localStorage.getItem('distributor_token');

    if (!storedId || !token) return;

    try {
      const res = await distributorApi.getDistributorProposalsCustomer(storedId, 'STONE');
      if (res && res.success) {
        setMyProposals(res.data || []);
      }
    } catch (err) {
      console.error("Proposals load error:", err);
    }
  };

  useEffect(() => {
    if (userAccessLayer === 5 && distributorId) {
      fetchMyProposals();
    }
  }, [userAccessLayer, distributorId]);

  // Session Initialization
  useEffect(() => {
    const initializeSession = async () => {
      const savedId = localStorage.getItem('ito_stone_buyer_id') || localStorage.getItem('prakriti_distributor_id');
      const token = localStorage.getItem('distributor_token');

      if (savedId && token) {
        setDistributorId(savedId);
        try {
          const res = await distributorApi.getDistributorStatus(savedId);
          if (res.success) {
            const status = res.data.approvalStatus;
            if (status === 'approved') setUserAccessLayer(5);
            else if (status === 'pending') setUserAccessLayer(4);
            else handleLogOut();
          }
        } catch (err) {
          console.error("Session sync failed:", err);
        }
      }
      setIsLoadingSession(false);
    };
    initializeSession();
  }, []);

  // Polling loop for pending users (Layer 4)
  useEffect(() => {
    let pollingTimer;
    if (userAccessLayer === 4 && distributorId) {
      const executeStatusCheck = async () => {
        try {
          const res = await distributorApi.getDistributorStatus(distributorId);
          if (res.success) {
            const currentStatus = res.data.approvalStatus;
            if (currentStatus === 'approved') {
              toast.success("B2B Stone Profile Approved! Secure Terminal Activated.");
              clearInterval(pollingTimer);
              setUserAccessLayer(5);
            } else if (currentStatus === 'rejected') {
              toast.error("Sourcing credentials rejected.");
              clearInterval(pollingTimer);
              handleLogOut();
            }
          }
        } catch (err) {
          console.error("Polling check failed:", err);
        }
      };

      executeStatusCheck();
      pollingTimer = setInterval(executeStatusCheck, 5000);
    }
    return () => clearInterval(pollingTimer);
  }, [userAccessLayer, distributorId]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Full Name is required.");
    if (!company.trim()) return toast.error("Company Name is required.");
    if (!email.trim()) return toast.error("Corporate Email is required.");
    if (!mobile.trim()) return toast.error("Mobile Contact is required.");
    if (!address.trim()) return toast.error("Site/Yard Address is required.");

    if (['1', '2', '3'].includes(businessType) && !doc1) {
      return toast.error("GST Certificate or Udyam Registration is required.");
    }

    setIsSubmitting(true);
    const data = new FormData();
    data.append('name', name);
    data.append('company', company);
    data.append('email', email);
    data.append('mobile', mobile);
    data.append('address', address);
    data.append('city', city);
    data.append('state', state);
    data.append('country', country);
    data.append('teaType', stoneType);
    data.append('monthlyReq', monthlyReq);
    data.append('purpose', purpose);
    data.append('businessType', businessType);
    data.append('division', 'STONE');

    if (doc1) data.append('doc1', doc1);
    if (doc2) data.append('doc2', doc2);

    try {
      const res = await distributorApi.registerDistributor(data);
      if (res.success) {
        toast.success(res.message || "B2B Profile submitted. OTP code dispatched.");
        setDistributorId(res.data.distributorId);
        localStorage.setItem('ito_stone_buyer_id', res.data.distributorId);
        localStorage.setItem('prakriti_distributor_id', res.data.distributorId);
        setStep('otp');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed. Check files.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < 6) return toast.error("Security code must be 6 digits.");

    setIsSubmitting(true);
    try {
      const res = await distributorApi.verifyOtp(distributorId, otp);
      if (res.success) {
        toast.success("B2B Credentials Verified!");
        const activeToken = res.token || res.data?.token || res.data?.accessToken;
        const activeId = res.data?.distributorId || res.data?._id || distributorId;

        if (activeId) {
          setDistributorId(activeId);
          localStorage.setItem('ito_stone_buyer_id', activeId);
          localStorage.setItem('prakriti_distributor_id', activeId);
        }
        if (activeToken) localStorage.setItem('distributor_token', activeToken);

        setIsModalOpen(false);
        setStep('register');

        const statusRes = await distributorApi.getDistributorStatus(activeId);
        if (statusRes.data?.approvalStatus === 'approved') {
          setUserAccessLayer(5);
        } else {
          setUserAccessLayer(4);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid or expired OTP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogOut = () => {
    setUserAccessLayer(1);
    setDistributorId('');
    localStorage.removeItem('ito_stone_buyer_id');
    localStorage.removeItem('prakriti_distributor_id');
    localStorage.removeItem('distributor_token');
    toast.success("Secured terminal session locked.");
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-screen bg-[#37424B] flex items-center justify-center">
        <span className="w-10 h-10 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin block mx-auto" />
      </div>
    );
  }

  return (
    <div className="bg-[#F4F2EE] text-[#37424B] antialiased min-h-screen font-serif selection:bg-[#C5A059]/30 selection:text-[#37424B]">

      {/* ================= LAYER 4: UNDER REVIEW GATE ================= */}
      {userAccessLayer === 4 && (
        <div className="min-h-[85vh] flex items-center justify-center py-20 px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl bg-white rounded-2xl p-8 sm:p-12 shadow-2xl border border-[#DCCCB4] text-center space-y-6">
            <div className="w-16 h-16 bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] rounded-full flex items-center justify-center mx-auto text-2xl animate-pulse">
              <FiCompass />
            </div>
            <h2 className="text-3xl font-serif text-[#37424B] uppercase tracking-wide">Buyer Account Under Review</h2>
            <div className="w-16 h-[2px] bg-[#C5A059] mx-auto" />
            <p className="text-[#6D6760] text-sm leading-relaxed max-w-lg mx-auto font-sans font-light">
              “Your India Trade Overseas stone buyer account is under review. Our team is verifying your GST/Udyam business documents. You will receive confirmation within 24 hours once approved.”
            </p>
            <div className="bg-[#F4F2EE] border border-[#DCCCB4] rounded-xl p-4 text-left text-xs font-sans text-[#6D6760] space-y-1.5 max-w-md mx-auto">
              <div className="font-bold text-[#37424B] uppercase tracking-wider text-[10px] font-mono">VERIFICATION CHECKLIST PIPELINE:</div>
              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" /> Statutory Registration Audit (GSTIN / Udyam Matching)</div>
              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#A89E8E]" /> BANT Method: Budget, Authority, Need, and Timeline Check</div>
              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#A89E8E]" /> Non-Credit Protocol Confirmation (100% Advance Terms)</div>
            </div>
            <div className="pt-4">
              <button onClick={() => setUserAccessLayer(1)} className="text-[10px] font-mono text-[#C5A059] hover:text-[#37424B] uppercase tracking-wider underline">
                Return to Public Stone Storefront View
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ================= LAYER 5: APPROVED BUYER MARKETPLACE ================= */}
      {userAccessLayer === 5 && (
        <div className="min-h-screen bg-[#F4F2EE] font-sans text-[#37424B] antialiased pt-3 sm:pt-6 pb-20 sm:pb-24">
          
          {/* Header B2B Terminal Bar */}
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mb-4 sm:mb-8">
            <div className="bg-[#37424B] text-white rounded-xl p-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border border-[#C5A059]/30 shadow-xl">
              
              <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white/10 rounded flex items-center justify-center text-[#C5A059] font-serif text-base sm:text-lg font-bold border border-white/15 shrink-0">
                    S
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] sm:text-[10px] font-mono tracking-widest text-[#C5A059] font-bold uppercase leading-none mb-0.5 truncate">STONE DIVISION TERMINAL</div>
                    <div className="text-xs sm:text-sm font-serif tracking-wider text-white uppercase font-medium truncate">INDIA TRADE OVERSEAS</div>
                  </div>
                </div>

                <div className="sm:hidden flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded text-[9px] font-mono text-amber-400 font-bold shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> LIVE
                </div>
              </div>

              {/* 🟢 Responsive 2-Column Grid on Mobile, Flex on Desktop */}
              <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                <div className="hidden md:flex flex-col text-right font-mono text-[10px] text-slate-300 border-r border-white/10 pr-4">
                  <span>BHUTAN & PAKUR DESKS DISPATCH ACTIVE</span>
                  <span className="text-[#C5A059]">100% ADVANCE LEDGER SECURED</span>
                </div>

                <button
                  onClick={() => { fetchMyProposals(); setIsProposalModalOpen(true); }}
                  className="w-full sm:w-auto bg-[#C5A059]/20 hover:bg-[#C5A059]/30 text-[#DCCCB4] border border-[#C5A059]/40 font-mono text-[9px] xs:text-[10px] sm:text-[11px] font-bold uppercase tracking-wider py-2.5 px-2 sm:px-4 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 truncate"
                >
                  <FiFileText className="text-xs shrink-0" />
                  <span className="truncate">My Proposals</span>
                  {myProposals.filter(p => p.status === 'approved').length > 0 && (
                    <span className="bg-[#C5A059] text-slate-900 w-4 h-4 rounded-full flex items-center justify-center font-sans font-extrabold text-[9px] animate-bounce shrink-0 ml-0.5">
                      {myProposals.filter(p => p.status === 'approved').length}
                    </span>
                  )}
                </button>

                <button
                  onClick={handleLogOut}
                  className="w-full sm:w-auto bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 border border-white/10 text-slate-200 font-mono text-[9px] xs:text-[10px] sm:text-[11px] font-bold uppercase tracking-wider py-2.5 px-2 sm:px-3 rounded-lg transition-all cursor-pointer text-center truncate"
                >
                  Logout
                </button>
              </div>

            </div>
          </div>

          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-4 sm:space-y-8">
            
            {/* Banner */}
            <div className="bg-gradient-to-br from-[#37424B] via-[#6D6760] to-[#252C34] rounded-xl sm:rounded-2xl p-5 sm:p-8 border border-[#C5A059]/30 shadow-xl text-white">
              <div className="space-y-2.5 sm:space-y-3 relative z-10 max-w-3xl text-left">
                <div className="inline-flex items-center gap-1.5 bg-[#C5A059]/20 border border-[#C5A059]/40 px-2.5 sm:px-3 py-1 rounded text-[9px] sm:text-[10px] font-mono font-bold text-[#C5A059] tracking-wider uppercase">
                  <FiCheckCircle size={11} /> ACCREDITATION: LEVEL 5 (STONE)
                </div>
                <h2 className="text-xl sm:text-3xl lg:text-4xl font-serif tracking-wide text-white uppercase leading-tight">
                  Live Stone Aggregate Sourcing Terminal
                </h2>
                <p className="text-xs sm:text-sm text-[#DCCCB4] font-light leading-relaxed max-w-2xl font-sans">
                  Direct dispatch terminal connected with Phuentsholing, Gomtu, Pasakha, Samtse, Pugli, and Pakur mines. All orders require 100% advance payment.
                </p>
              </div>
            </div>

            {/* ================= MY PROPOSALS & PAYMENT SYSTEM MODAL ================= */}
            <AnimatePresence>
              {isProposalModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
                  <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 100 }}
                    className="w-full max-w-3xl bg-white rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden border border-[#DCCCB4] flex flex-col max-h-[90vh] sm:max-h-[85vh]"
                  >
                    <div className="bg-[#37424B] text-white p-4 sm:p-6 flex justify-between items-center text-left shrink-0">
                      <div>
                        <div className="text-[9px] font-mono tracking-widest text-[#C5A059] font-bold uppercase">Stone Sourcing Ledger</div>
                        <h2 className="text-base sm:text-xl font-serif text-white uppercase tracking-wide">My Active Stone Proposals</h2>
                      </div>
                      <button onClick={() => setIsProposalModalOpen(false)} className="p-1.5 text-slate-300 hover:text-white bg-white/5 border border-white/10 rounded-lg">
                        <FiX size={18} />
                      </button>
                    </div>

                    <div className="p-3 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto text-left flex-1 bg-slate-50/50">
                      {myProposals.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 italic text-xs font-light">
                          You have not logged any stone procurement requests yet.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {myProposals.map((prop) => (
                            <div key={prop._id} className="p-3.5 sm:p-4 rounded-xl border border-[#DCCCB4] bg-white space-y-3 text-xs">
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold font-mono text-[#37424B]">{prop.lotId}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">({prop.grade})</span>
                                  </div>
                                  <div className="text-xs text-slate-600 font-light">Quarry/Hub: <span className="font-medium text-slate-800">{prop.region}</span></div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-2">
                                  <span className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider border ${
                                    prop.status === 'approved' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                                    prop.status === 'disapproved' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                                    'bg-slate-100 text-slate-700 border-slate-300'
                                  }`}>
                                    {prop.status === 'approved' ? 'Invoice Issued' : prop.status === 'disapproved' ? 'Rejected' : 'Under Review'}
                                  </span>

                                  {prop.status === 'approved' && (
                                    <button
                                      onClick={async () => {
                                        const singleAmount = prop.estimatedValue || (prop.quantity * prop.basePrice);
                                        const loadingToast = toast.loading(`Preparing checkout for ${prop.lotId}...`);

                                        try {
                                          const orderResult = await distributorApi.createRazorpayOrder({
                                            amount: singleAmount,
                                            lotId: prop.lotId,
                                            quantity: prop.quantity
                                          });

                                          if (!orderResult?.success) throw new Error(orderResult?.message || "Failed order creation.");

                                          const { orderId, keyId } = orderResult.data;
                                          toast.dismiss(loadingToast);

                                          const options = {
                                            key: keyId,
                                            amount: singleAmount * 100,
                                            currency: "INR",
                                            name: "Stone & Infrastructure Division",
                                            description: `Invoice Settlement - Lot ${prop.lotId}`,
                                            order_id: orderId,
                                            handler: async function (response) {
                                              const verifyResult = await distributorApi.verifyRazorpayPayment({
                                                razorpay_order_id: response.razorpay_order_id,
                                                razorpay_payment_id: response.razorpay_payment_id,
                                                razorpay_signature: response.razorpay_signature,
                                                lotId: prop.lotId,
                                                quantity: prop.quantity,
                                                amount: singleAmount
                                              });

                                              if (verifyResult?.success) {
                                                await distributorApi.updateProposalStatus(prop._id, 'paid');
                                                toast.success(`Payment verified for Lot ${prop.lotId}!`);
                                                fetchMyProposals();
                                              }
                                            },
                                            theme: { color: "#37424B" }
                                          };

                                          new window.Razorpay(options).open();
                                        } catch (err) {
                                          toast.dismiss(loadingToast);
                                          toast.error(err.message || "Checkout failed.");
                                        }
                                      }}
                                      className="bg-[#37424B] hover:bg-[#252c34] text-white px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase shadow-xs flex items-center gap-1"
                                    >
                                      <FiCheckCircle size={11} /> Pay Invoice
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-[#F4F2EE] p-2.5 rounded-lg border border-[#DCCCB4]/40">
                                <div>
                                  <span className="text-slate-500 block text-[9px] uppercase font-sans">Volume</span>
                                  <span className="font-bold text-slate-800">{prop.quantity?.toLocaleString()} MT</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block text-[9px] uppercase font-sans">Net Value</span>
                                  <span className="font-bold text-[#37424B]">INR {(prop.estimatedValue || prop.quantity * prop.basePrice)?.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* PROCEED TO SETTLEMENT / BATCH PAYMENT FOOTER */}
                    <div className="p-4 sm:p-6 bg-white border-t border-slate-200 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 shrink-0 shadow-lg">
                      <div className="flex items-center justify-between sm:block text-left">
                        <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Total Active Matrix</div>
                        <div className="text-lg sm:text-xl font-mono font-extrabold text-[#37424B]">
                          INR {myProposals
                            .filter(p => p.status === 'approved')
                            .reduce((acc, curr) => acc + (curr.estimatedValue || (curr.quantity * curr.basePrice) || 0), 0)
                            .toLocaleString()
                          }
                        </div>
                      </div>

                      <button
                        disabled={myProposals.filter(p => p.status === 'approved').length === 0}
                        onClick={async () => {
                          const approvedProposals = myProposals.filter(p => p.status === 'approved');
                          if (approvedProposals.length === 0) return;

                          const aggregateAmount = approvedProposals.reduce((acc, curr) => {
                            return acc + (Number(curr.estimatedValue) || (Number(curr.quantity || 0) * Number(curr.basePrice || 0)));
                          }, 0);

                          if (aggregateAmount > 500000) {
                            return toast.error("Total exceeds Razorpay's single-transaction cap (₹5,00,000). Please pay invoices individually.");
                          }

                          const targetLotString = approvedProposals.map(p => p.lotId).filter(Boolean).join(", ");
                          const combinedQuantity = approvedProposals.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

                          const loadingToast = toast.loading("Configuring transaction security manifest...");

                          try {
                            const orderResult = await distributorApi.createRazorpayOrder({
                              amount: aggregateAmount,
                              lotId: targetLotString,
                              quantity: combinedQuantity
                            });

                            if (!orderResult || !orderResult.success) {
                              throw new Error(orderResult?.message || "Failed to create secure transaction token.");
                            }

                            const { orderId, keyId } = orderResult.data;
                            toast.dismiss(loadingToast);

                            const options = {
                              key: keyId,
                              amount: aggregateAmount * 100,
                              currency: "INR",
                              name: "Stone & Infrastructure Division",
                              description: `Sourcing Settlement - Lots: ${targetLotString}`,
                              order_id: orderId,
                              handler: async function (response) {
                                const verificationToast = toast.loading("Verifying transaction parameters...");
                                try {
                                  const verifyResult = await distributorApi.verifyRazorpayPayment({
                                    razorpay_order_id: response.razorpay_order_id,
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_signature: response.razorpay_signature,
                                    lotId: targetLotString,
                                    quantity: combinedQuantity,
                                    amount: aggregateAmount
                                  });

                                  if (!verifyResult || !verifyResult.success) {
                                    throw new Error(verifyResult?.message || "Verification failed.");
                                  }

                                  await Promise.all(approvedProposals.map(p =>
                                    distributorApi.updateProposalStatus(p._id, 'paid')
                                  ));

                                  toast.dismiss(verificationToast);
                                  toast.success("Transaction certified! Invoices cleared.");
                                  setIsProposalModalOpen(false);
                                  fetchMyProposals();
                                } catch (verifyErr) {
                                  toast.dismiss(verificationToast);
                                  toast.error(verifyErr.message || "Payment verification failed.");
                                }
                              },
                              prefill: {
                                name: approvedProposals[0]?.name || "Corporate Partner",
                                email: approvedProposals[0]?.email || ""
                              },
                              theme: { color: "#37424B" }
                            };

                            new window.Razorpay(options).open();
                          } catch (err) {
                            toast.dismiss(loadingToast);
                            toast.error(err.response?.data?.message || err.message || "Gateway initialization failed.");
                          }
                        }}
                        className={`font-mono text-xs font-bold uppercase tracking-wider py-3.5 px-6 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md ${
                          myProposals.filter(p => p.status === 'approved').length > 0
                          ? 'bg-[#37424B] hover:bg-[#252c34] active:scale-98 text-white cursor-pointer'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        }`}
                      >
                        <FiCheckCircle /> Proceed to Settlement
                      </button>
                    </div>

                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Live Pricing Section */}
            <div className="space-y-3 sm:space-y-4 text-left">
              <h3 className="font-serif text-base sm:text-lg text-[#37424B] uppercase tracking-wider font-bold px-1">
                Available Crusher Lots & Live Freight Quotations
              </h3>

              {/* 📱 MOBILE VIEW: Cards */}
              <div className="grid grid-cols-1 gap-3.5 md:hidden">
                {APPROVED_MARKETPLACE_DATA.map((row) => (
                  <div key={row.id} className="bg-white border border-[#DCCCB4] rounded-xl p-4 shadow-sm space-y-3">
                    <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
                      <div>
                        <div className="text-xs font-mono font-bold text-[#37424B] bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block mb-1">
                          {row.id}
                        </div>
                        <h4 className="font-serif font-bold text-slate-900 text-sm">{row.region}</h4>
                      </div>
                      <span className="bg-slate-100 px-2 py-0.5 border border-slate-200 font-mono text-[10px] text-slate-800 font-bold rounded">
                        {row.crusher}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[9px] font-mono uppercase text-slate-400 block">Nominal Spec</span>
                        <span className="font-medium text-slate-800">{row.grade}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[9px] font-mono uppercase text-slate-400 block">Rate / Stock</span>
                        <span className="font-bold text-[#37424B] block font-mono">INR {row.price}/MT</span>
                        <span className="text-[10px] text-slate-500 font-mono block">Stock: {row.stock}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setActiveDrawerLot(row);
                        setIsOrderDrawerOpen(true);
                      }}
                      className="w-full bg-[#37424B] hover:bg-[#252c34] active:scale-98 text-white py-2.5 rounded-lg font-mono font-bold uppercase text-[9px] tracking-wider shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <FiShoppingCart size={11} /> Request Freight Quote
                    </button>
                  </div>
                ))}
              </div>

              {/* 💻 DESKTOP VIEW: Table */}
              <div className="hidden md:block bg-white border border-[#DCCCB4] rounded-xl overflow-hidden shadow-xl overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#37424B] text-[#F4F2EE] border-b border-[#C5A059] font-mono uppercase tracking-wider text-[10px]">
                      <th className="p-4 font-medium text-[#C5A059]">Lot Ref</th>
                      <th className="p-4 font-medium">Origin Quarry / Gate</th>
                      <th className="p-4 font-medium">Nominal Size & Color</th>
                      <th className="p-4 font-medium">Crusher Plant</th>
                      <th className="p-4 font-medium">Available Inventory</th>
                      <th className="p-4 font-medium text-[#C5A059]">Commercial Price</th>
                      <th className="p-4 font-medium text-right pr-6">Order Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCCCB4]/40 font-sans text-[#37424B]">
                    {APPROVED_MARKETPLACE_DATA.map((row) => (
                      <tr key={row.id} className="hover:bg-[#F4F2EE] transition-colors">
                        <td className="p-4 font-mono font-bold text-[#37424B] text-[13px]">{row.id}</td>
                        <td className="p-4 font-semibold">{row.region}</td>
                        <td className="p-4">
                          <span className="bg-[#DCCCB4]/30 px-2 py-0.5 border border-[#A89E8E]/40 font-mono text-[11px] font-bold rounded-sm">
                            {row.grade}
                          </span>
                        </td>
                        <td className="p-4 font-mono">{row.crusher}</td>
                        <td className="p-4 font-mono font-semibold">{row.stock}</td>
                        <td className="p-4 font-mono font-bold text-[13px] text-[#C5A059]">INR {row.price}/MT</td>
                        <td className="p-4 text-right space-x-2 whitespace-nowrap pr-6">
                          <button onClick={() => { setActiveDrawerLot(row); setIsOrderDrawerOpen(true); }} className="bg-[#37424B] hover:bg-[#6D6760] text-[#F4F2EE] px-4 py-2 rounded-sm font-mono font-bold uppercase tracking-wider text-[10px] shadow transition-all cursor-pointer">
                            Request Freight Quote
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= LAYER 1 & LAYER 2: PUBLIC STOREFRONT HERO ================= */}
      {userAccessLayer <= 2 && (
        <>
          {/* HERO SECTION WITH IMAGE CAROUSEL */}
          <div className="relative min-h-screen bg-[#37424B] overflow-hidden flex items-center pt-24 lg:pt-0">
            {/* Background Carousel Images */}
            <div className="absolute inset-0 z-0">
              <AnimatePresence mode="wait">
                <motion.img
                  key={heroBgIndex}
                  src={HERO_CAROUSEL_IMAGES[heroBgIndex]}
                  alt="Stone Aggregate Showcase"
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 0.25, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                  className="w-full h-full object-cover object-center"
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-r from-[#37424B]/90 via-[#37424B]/10 to-transparent" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-12 lg:py-0">
              <div className="lg:col-span-7 text-center lg:text-left space-y-6">
                <div className="inline-flex items-center gap-2 border px-4 py-1.5 rounded-full bg-[#37424B]/90 border-[#C5A059]/40">
                  <span className="w-2 h-2 rounded-full bg-[#C5A059] animate-pulse" />
                  <span className="text-[10px] tracking-[0.25em] font-mono font-bold uppercase text-[#C5A059]">
                    01 • GEOLOGICAL EXTRACTION
                  </span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-4xl sm:text-7xl font-serif font-black text-[#F4F2EE] uppercase tracking-tight leading-none drop-shadow-lg">
                    Bhutan & Pakur Stone.
                  </h1>
                  <h2 className="text-2xl sm:text-4xl font-sans font-light text-[#C5A059]">
                    Uncompromising Crushing Resistance.
                  </h2>
                </div>

                <div className="w-20 h-[3px] mx-auto lg:mx-0 bg-[#C5A059]" />

                <p className="max-w-xl text-[#DCCCB4] font-sans font-light text-xs sm:text-sm leading-relaxed drop-shadow">
                  Direct bulk procurement across Bhutan loading gateways (Gomtu, Pasakha, Samtse, Phuentsholing, Pugli) and Pakur, Jharkhand basalt mines.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full sm:w-auto text-[#37424B] text-xs font-mono font-bold uppercase tracking-widest px-8 py-4 rounded shadow-xl transition-all hover:scale-105 transform cursor-pointer bg-[#C5A059]"
                  >
                    Verify Business to Access Rates
                  </button>
                  <a
                    href="#teaser-deck"
                    className="w-full sm:w-auto text-center text-[#F4F2EE] text-xs font-mono font-bold uppercase tracking-widest px-6 py-4 rounded backdrop-blur-md border border-white/20 hover:bg-white/10 transition-all"
                  >
                    Live Quarry Offers
                  </a>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-3">
                {[
                  { label: "01 • SOURCING ORIGIN", title: "Bhutan & Pakur Mines", desc: "Basalt and quartzite geological extraction." },
                  { label: "02 • NOMINAL SIZES", title: "10mm, 20mm, 30mm, 40/60mm, Dust", desc: "Mechanical crushing plant configurations." },
                  { label: "03 • LOGISTICS NETWORK", title: "Jaigaon, Pasakha, Kishanganj Fleet", desc: "Multi-axle tipper and dump truck routing." },
                  { label: "04 • TRADE LEDGER", title: "100% Advance Rate Matrix", desc: "Direct Proforma invoice clearing pipeline." }
                ].map((card, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-[#C5A059]/40 bg-[#37424B]/90 backdrop-blur-md shadow-lg text-left"
                  >
                    <span className="text-[9px] font-mono uppercase font-bold tracking-widest text-[#C5A059] block">
                      {card.label}
                    </span>
                    <div className="text-sm font-bold text-[#F4F2EE]">{card.title}</div>
                    <div className="text-[10px] text-slate-300 font-sans font-light">{card.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ================= ALTERNATING CATEGORY SHOWCASE ================= */}
          <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <span className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#37424B] bg-[#C5A059]/30 px-3 py-1 rounded-sm">
                Infrastructure Aggregates Range
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif text-[#37424B] mt-1 uppercase tracking-wide font-bold">
                Calibrated Product Specifications
              </h2>
              <p className="text-xs sm:text-sm text-[#6D6760] font-sans font-light">
                Explore our full line of crushed stone aggregates from Phuentsholing, Gomtu, Pasakha, and Pakur mines.
              </p>
            </div>

            <div className="space-y-16">
              {ALTERNATING_SHOWCASE.map((item, index) => {
                const isEven = index % 2 === 0;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center bg-white border border-[#DCCCB4] rounded-2xl p-6 sm:p-10 shadow-lg text-left ${isEven ? '' : 'lg:flex-row-reverse'}`}
                  >
                    {/* Image Column */}
                    <div className={`lg:col-span-6 ${isEven ? 'lg:order-1' : 'lg:order-2'}`}>
                      <div className="relative rounded-xl overflow-hidden shadow-md border border-[#DCCCB4] group h-64 sm:h-80 bg-[#A89E8E]/20">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    </div>

                    {/* Description Column */}
                    <div className={`lg:col-span-6 space-y-4 font-sans ${isEven ? 'lg:order-2' : 'lg:order-1'}`}>
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold uppercase text-[#C5A059] tracking-widest">{item.subtitle}</span>
                        <h3 className="text-2xl sm:text-3xl font-serif text-[#37424B] font-bold uppercase">{item.title}</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-[#6D6760] font-light leading-relaxed">
                        {item.description}
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#DCCCB4]/50">
                        {item.specs.map((spec, sIdx) => (
                          <div key={sIdx} className="flex items-center gap-1.5 text-[11px] font-mono text-[#37424B]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                            {spec}
                          </div>
                        ))}
                      </div>
                      <div className="pt-2">
                        <button
                          onClick={() => setIsModalOpen(true)}
                          className="bg-[#37424B] hover:bg-[#6D6760] text-[#F4F2EE] font-mono font-bold text-[10px] uppercase tracking-wider py-2.5 px-5 rounded shadow transition-all cursor-pointer inline-flex items-center gap-2"
                        >
                          Verify Business to View Rates <FiArrowRight />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* SOFT GATE TEASER SECTION */}
          <section id="teaser-deck" className="py-24 bg-[#37424B] text-white px-4 sm:px-6 lg:px-8 border-y border-[#C5A059]/30 relative overflow-hidden">
            <div className="max-w-7xl mx-auto space-y-12 relative z-10 text-left">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#C5A059]">Active Crusher Allocations</span>
                <h2 className="text-3xl font-serif text-white uppercase tracking-wide">Quarry Teaser Listings</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {TEASER_LISTINGS.map((lot) => (
                  <div key={lot.id} className="bg-[#6D6760]/40 border border-white/10 rounded-xl p-5 shadow-xl flex flex-col justify-between min-h-[320px] relative overflow-hidden group">
                    <div className="space-y-4">
                      <div className="border-b border-white/10 pb-2 flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase text-[#C5A059] tracking-widest">{lot.region}</span>
                        <span className="text-[9px] font-mono bg-white/10 px-2 py-0.5 rounded text-slate-300">{lot.id}</span>
                      </div>
                      <div className="space-y-2 font-sans">
                        <div className="text-sm font-serif font-bold text-white uppercase tracking-wide">{lot.type}</div>
                        <div className="text-xs font-light text-slate-300">Base Grade: {lot.baseGrade}</div>
                        <div className="text-xs font-light text-slate-300">Target Use: {lot.use}</div>
                      </div>

                      <div className="bg-black/40 rounded-lg p-3 border border-white/5 text-[10px] font-mono space-y-1 relative">
                        <div className="filter blur-xs select-none space-y-1 opacity-40">
                          <div>COMMERCIAL RATE: ₹X,XXX / MT</div>
                          <div>CRUSHER: [Encrypted Plant]</div>
                          <div>DISPATCH: [Restricted Gate]</div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                          <div className="text-[9px] text-[#C5A059] font-bold uppercase bg-[#37424B] px-2.5 py-1 rounded border border-[#C5A059]/40 tracking-widest flex items-center gap-1">
                            <FiLock /> RATE LOCKED
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10 mt-5">
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full bg-white/5 hover:bg-[#C5A059] text-white hover:text-[#37424B] text-[9px] sm:text-xs font-mono font-bold uppercase tracking-wider py-3 px-2 rounded-lg border border-white/10 transition-all text-center flex items-center justify-center"
                      >
                        Verify Business to Access Rates
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ================= LAYER 3: VERIFICATION & LOGIN MODAL ================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/70 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-[#DCCCB4] my-8 text-left"
            >
              <div className="bg-[#37424B] text-white p-6 sm:p-8 space-y-1 relative">
                <button onClick={() => { setIsModalOpen(false); setStep('register'); }} className="absolute top-6 right-6 text-slate-300 hover:text-white"><FiX size={20} /></button>
                <div className="flex items-center gap-1.5 text-[#C5A059]">
                  <span className="text-[9px] tracking-[0.2em] font-mono font-extrabold uppercase">Stone Buyer Verification Registry</span>
                </div>
                <h2 className="text-2xl font-serif text-white">India Trade Overseas Verification</h2>
              </div>

              <div className="p-6 sm:p-8 max-h-[70vh] overflow-y-auto">
                {step === 'register' ? (
                  <div className="space-y-5 text-xs">
                    <div className="flex border-b border-slate-200 pb-2 mb-4 gap-4 font-mono text-[10px]">
                      <button
                        type="button"
                        onClick={() => setModalMode('register')}
                        className={`pb-1 uppercase tracking-wider font-bold cursor-pointer transition-all ${
                          modalMode === 'register' ? 'text-[#37424B] border-b-2 border-[#37424B]' : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        New Registration
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalMode('login')}
                        className={`pb-1 uppercase tracking-wider font-bold cursor-pointer transition-all ${
                          modalMode === 'login' ? 'text-[#37424B] border-b-2 border-[#37424B]' : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        Existing Corporate Partner (Login)
                      </button>
                    </div>

                    {modalMode === 'register' ? (
                      <form onSubmit={handleRegister} className="space-y-4 text-xs">
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-[#37424B] mb-1">Select Buyer Category *</label>
                          <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="w-full bg-[#F4F2EE] border border-[#DCCCB4] rounded p-3 text-[#37424B]">
                            <option value="1">Construction Company</option>
                            <option value="2">Government Contractor (PWD / NHAI)</option>
                            <option value="3">Real Estate Developer</option>
                            <option value="4">Infrastructure Firm</option>
                            <option value="5">Stone Aggregator / Reseller</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold uppercase text-[#6D6760] mb-1">Full Name *</label>
                            <input type="text" required placeholder="Full Name" className="w-full bg-[#F4F2EE] border border-[#DCCCB4] rounded p-3 text-[#37424B]" value={name} onChange={(e) => setName(e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold uppercase text-[#6D6760] mb-1">Company Name *</label>
                            <input type="text" required placeholder="Registered Firm Name" className="w-full bg-[#F4F2EE] border border-[#DCCCB4] rounded p-3 text-[#37424B]" value={company} onChange={(e) => setCompany(e.target.value)} />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold uppercase text-[#6D6760] mb-1">Mobile Number *</label>
                            <input type="tel" required placeholder="+91 XXXXX XXXXX" className="w-full bg-[#F4F2EE] border border-[#DCCCB4] rounded p-3 text-[#37424B]" value={mobile} onChange={(e) => setMobile(e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold uppercase text-[#6D6760] mb-1">Corporate Email *</label>
                            <input type="email" required placeholder="buyer@company.com" className="w-full bg-[#F4F2EE] border border-[#DCCCB4] rounded p-3 text-[#37424B]" value={email} onChange={(e) => setEmail(e.target.value)} />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase text-[#6D6760] mb-1">Unloading Site Address *</label>
                          <input type="text" required placeholder="Physical Delivery Site Location" className="w-full bg-[#F4F2EE] border border-[#DCCCB4] rounded p-3 text-[#37424B]" value={address} onChange={(e) => setAddress(e.target.value)} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input type="text" required placeholder="City *" className="w-full bg-[#F4F2EE] border border-[#DCCCB4] rounded p-3 text-[#37424B]" value={city} onChange={(e) => setCity(e.target.value)} />
                          <input type="text" required placeholder="State *" className="w-full bg-[#F4F2EE] border border-[#DCCCB4] rounded p-3 text-[#37424B]" value={state} onChange={(e) => setState(e.target.value)} />
                          <input type="text" required placeholder="Country *" className="w-full bg-[#F4F2EE] border border-[#DCCCB4] rounded p-3 text-[#37424B]" value={country} onChange={(e) => setCountry(e.target.value)} />
                        </div>

                        <div className="p-4 bg-[#F4F2EE] border border-[#DCCCB4] rounded space-y-2">
                          <span className="text-[11px] font-mono font-bold uppercase text-[#37424B] block">Upload GST Certificate or Udyam PDF *</span>
                          <input type="file" required onChange={(e) => setDoc1(e.target.files[0])} className="block w-full text-xs text-[#6D6760]" />
                        </div>

                        <button type="submit" disabled={isSubmitting} className="w-full bg-[#37424B] hover:bg-[#6D6760] text-[#F4F2EE] font-mono font-bold text-xs uppercase py-3.5 rounded mt-4 cursor-pointer">
                          {isSubmitting ? "Processing..." : "Submit Business Credentials & Send OTP"}
                        </button>
                      </form>
                    ) : (
                      /* Corporate Login Form */
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const cleanEmail = loginEmail.toLowerCase().trim();
                          if (!cleanEmail) return toast.error("Corporate Email is required.");

                          setIsSubmitting(true);
                          try {
                            const otpRes = await distributorApi.resendOtp(cleanEmail);
                            if (otpRes && otpRes.success) {
                              const id = otpRes.data?.distributorId || otpRes.distributorId;
                              if (id) {
                                setDistributorId(id);
                                localStorage.setItem('ito_stone_buyer_id', id);
                                localStorage.setItem('prakriti_distributor_id', id);
                              }
                              setEmail(cleanEmail);
                              toast.success(otpRes.message || "OTP sent to your corporate email!");
                              setStep('otp');
                            }
                          } catch (err) {
                            toast.error(err.response?.data?.message || err.message || "Failed to send OTP.");
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        className="space-y-4 pt-1"
                      >
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-[#37424B] mb-1">Registered Corporate Email Address *</label>
                          <input
                            type="email"
                            required
                            placeholder="buyer@enterprise.com"
                            className="w-full bg-[#F4F2EE] border border-[#DCCCB4] rounded p-3 text-[#37424B] text-xs"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full bg-[#37424B] hover:bg-[#6D6760] text-white font-mono font-bold text-xs uppercase py-3.5 rounded cursor-pointer"
                        >
                          {isSubmitting ? "Processing..." : "Access Sourcing Terminal"}
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4 text-center py-4">
                    <h3 className="text-lg font-serif text-[#37424B]">Enter Verification Token</h3>
                    <p className="text-xs text-slate-500 font-light">Enter 6-digit token sent to <span className="font-bold text-slate-700">{email}</span></p>
                    <input type="text" required maxLength="6" placeholder="0 0 0 0 0 0" className="w-full text-center bg-[#F4F2EE] border border-[#DCCCB4] rounded p-3 text-lg font-mono text-[#37424B]" value={otp} onChange={(e) => setOtp(e.target.value)} />
                    <button type="submit" disabled={isSubmitting} className="w-full bg-[#37424B] text-white font-mono font-bold py-3 rounded cursor-pointer">
                      Verify & Unlock
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= BULK ORDER NEGOTIATION DRAWER ================= */}
      <AnimatePresence>
        {isOrderDrawerOpen && activeDrawerLot && (
          <div className="fixed inset-0 z-50 overflow-hidden font-sans">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setIsOrderDrawerOpen(false)} />
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
                <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 text-left flex-1">
                  <div className="flex items-center justify-between border-b pb-3.5">
                    <h2 className="text-base sm:text-xl font-serif text-[#37424B] uppercase">Quotation Enquiry</h2>
                    <button onClick={() => setIsOrderDrawerOpen(false)} className="p-1 rounded-md bg-slate-100 text-slate-500 hover:text-slate-800"><FiX size={18} /></button>
                  </div>

                  <div className="bg-[#F4F2EE] border border-[#DCCCB4] p-3.5 rounded-xl space-y-2 text-xs">
                    <span className="text-[9px] font-mono bg-[#37424B] text-[#C5A059] px-2 py-0.5 rounded font-bold">{activeDrawerLot.id}</span>
                    <div className="text-sm font-bold text-[#37424B]">{activeDrawerLot.region}</div>
                    <div className="text-xs text-[#6D6760] font-mono">Crusher: {activeDrawerLot.crusher}</div>
                    <div className="text-xs text-[#6D6760] font-mono">Grade: {activeDrawerLot.grade}</div>
                    <div className="text-xs text-[#6D6760] font-mono">Base Price: INR {activeDrawerLot.price}/MT</div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono uppercase text-[#6D6760]">Required Quantity (Metric Tonnes) *</label>
                    <input type="number" min="40" value={orderQuantity} onChange={(e) => setOrderQuantity(e.target.value)} className="w-full border border-[#DCCCB4] rounded p-3 font-mono text-xs text-[#37424B]" />
                    <span className="text-[9px] text-slate-400 block">Minimum truckload allocation constraint: 40 MT.</span>
                  </div>
                </div>

                <div className="p-4 sm:p-6 bg-[#F4F2EE] border-t border-[#DCCCB4] space-y-3 shrink-0">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-slate-500 font-bold uppercase">Estimated Base Value:</span>
                    <span className="text-[#37424B] font-extrabold text-base">INR {(Number(orderQuantity || 0) * Number(activeDrawerLot.price || 0)).toLocaleString()}</span>
                  </div>
                  <button
                    onClick={async () => {
                      if (!orderQuantity || Number(orderQuantity) < 40) {
                        return toast.error("Minimum constraint is 40 MT.");
                      }

                      try {
                        const proposalPayload = {
                          distributorId: distributorId,
                          division: 'STONE',
                          lotId: activeDrawerLot.id,
                          region: activeDrawerLot.region,
                          grade: activeDrawerLot.grade,
                          quantity: Number(orderQuantity),
                          basePrice: Number(activeDrawerLot.price)
                        };

                        const res = await distributorApi.createProposal(proposalPayload);
                        if (res.success) {
                          toast.success(`Stone sourcing proposal logged for ${orderQuantity} MT.`);
                          setIsOrderDrawerOpen(false);
                          fetchMyProposals();
                        }
                      } catch (err) {
                        toast.error(err.response?.data?.message || "Failed to dispatch proposal.");
                      }
                    }}
                    className="w-full bg-[#37424B] hover:bg-[#252c34] text-white text-xs font-mono font-bold uppercase py-3.5 rounded flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    <FiShoppingCart /> Dispatch Sourcing Request
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
