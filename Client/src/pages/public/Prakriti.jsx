import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
    FiShield, FiBriefcase, FiFileText, FiCheckCircle, FiArrowRight, FiArrowLeft,
    FiUser, FiPhone, FiMapPin, FiKey, FiUploadCloud, FiX, FiAward, FiCompass,
    FiLayers, FiLock, FiEye, FiDownload, FiFilter, FiShoppingCart, FiInfo, FiBox, FiCheck
} from 'react-icons/fi';
import { GiThreeLeaves, GiTeapot, GiBoxUnpacking, GiCargoShip } from "react-icons/gi";

import { distributorApi } from '../../api/distributor';
import { pushDataLayerEvent } from '../../utils/analytics';
import BuyerEntryGate from '../../components/gates/BuyerEntryGate';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import TestimonialCoverflow from '../../components/Testimonials/TestimonialCoverflow';
import TestimonialSectionBackground from '../../components/Testimonials/TestimonialSectionBackground';
import { teaTestimonials, TEA_ACCENT, TEA_ACCENT_TEXT, TEA_TRUST_PARAGRAPH } from '../../data/testimonials';
import { OrderButton } from '../../components/ui/AnimatedActionButton';

// Tracks which layer (1 = storefront, 5 = marketplace) the buyer was last viewing,
// so a refresh restores the same view instead of always jumping approved buyers to Layer 5.
const ACTIVE_LAYER_KEY = 'prakriti_active_layer';

const PRAKRITI_GATE_THEME = {
    bg: '#0B3D2E',
    panelBg: '#0F2E24',
    accent: '#50C878',
    accentText: '#04140E',
    text: '#FAF9F5',
    muted: '#8FB5A3',
    border: '#1B4B3A',
    eyebrow: 'Prakriti Tea Division',
    headline: 'Welcome to Prakriti',
    subhead: 'Tell us who you are to unlock live tea garden pricing and place sourcing requests directly.',
    fontClass: 'font-sans'
};

const HERO_BACKGROUNDS = [
    "/images/tea_images/g1.jpeg",
    "/images/tea_images/g2.jpeg",
    "/images/tea_images/g3.jpeg",
    "/images/tea_images/g6.jpeg",
    "/images/tea_images/g7.jpeg"
];

const CAROUSEL_IMAGES = [
    { size: "250 g", format: "Retail Pack", description: "Standard counter-top consumer packaging unit featuring premium protective aroma barrier freshness seals for home storage.", image: './images/tea_variants/chai_1.png' },
    { size: "500 g", format: "Retail Pack", description: "Mid-tier volume option meticulously tailored for family provisioning channels and premium corporate gift collections.", image: './images/tea_variants/chai_2.png' },
    { size: "1 kg", format: "Trade Pack", description: "High-yield commercial layout built for standalone tea shops, boutique cafes, restaurants, and high heavy trade usage.", image: './images/tea_variants/chai_3.png' },
    { size: "5 kg", format: "Bulk Pack", description: "Heavy bulk trade format configured explicitly for regional distributors, wholesale networks, and bulk blending operations.", image: './images/tea_variants/chai_4.png' },
    { size: "10 kg", format: "Bulk Pack", description: "Maximum wholesale deployment asset packaging designed for large-scale distribution, institutional trade, and repackaging setups.", image: './images/tea_variants/chai_5.png' }
];

const PUBLIC_CATEGORIES = [
    { title: "CTC Tea", icon: GiThreeLeaves, desc: "Robust, granular varieties providing deep liquor extract, crisp color peaks, and excellent body fit for daily boiling blends." },
    { title: "Orthodox Tea", icon: GiTeapot, desc: "Traditional whole-leaf treatments carefully processed to capture high natural aromatics and delicate multi-tonal cups." },
    { title: "Green Tea", icon: GiThreeLeaves, desc: "Antioxidant-rich configurations selected explicitly for high brightness, clear flavor notes, and stable market positioning." },
    { title: "Dust Tea", icon: GiThreeLeaves, desc: "Finely milled for exceptional quick-steeping liquor strength; highly favored for fast mass commercial brewing." },
    { title: "Premium Garden Tea", icon: FiAward, desc: "Direct, unblended lot assets hand-selected across premium seasonal pluckings to retain absolute single-origin integrity." },
    { title: "Bulk Tea for Traders", icon: GiBoxUnpacking, desc: "High-volume, loose invoice lots arranged purposefully for brokers, localized blending setups, and commodity merchants." },
    { title: "Hotel, CafÃ© & Distributor Lines", icon: FiBriefcase, desc: "Standardized flavor profiles matched for commercial consistency, stable cost bases, and prolonged service workflows." },
    { title: "Export-Grade Tea", icon: GiCargoShip, desc: "Compliant tea selections optimized against heavy food safety regulations and international cargo standards." }
];

const TEASER_LISTINGS = [
    { id: 1, region: "Siliguri Corridor", type: "CTC Blend Lot", baseGrade: "BP / BOPSM Mix", package: "30 kg / 35 kg Bags", use: "Wholesale Distribution / Blending" },
    { id: 2, region: "Assam Garden Track", type: "Export-Grade Leaf", baseGrade: "Pekoe / BOP Premium", package: "25 kg Crafts Bags", use: "International Cargo / Premium Brands" },
    { id: 3, region: "Dooars Plains", type: "Bulk Commercial Dust", baseGrade: "Fine Dust Grade", package: "35 kg Bulk Sacks", use: "High Volume Tea Stalls & CafÃ©s" },
    { id: 4, region: "Darjeeling Heights", type: "Fine Orthodox Lots", baseGrade: "TGFOP Whole Leaf", package: "20 kg Traditional Chests", use: "Gourmet Brands / Private Label" }
];

const APPROVED_MARKETPLACE_DATA = [
    { id: "PK-AS-091", region: "Assam Upper Track", grade: "BP (Broken Pekoe)", color: "Deep Mahogany", strength: "9.5/10", stock: "14,200 Kg", price: "210", dispatch: "Siliguri Hub", type: "CTC Tea" },
    { id: "PK-DJ-104", region: "Darjeeling Premium", grade: "TGFOP1 Whole Leaf", color: "Bright Amber", strength: "6.0/10", stock: "3,100 Kg", price: "420", dispatch: "Kolkata Port", type: "Orthodox Tea" },
    { id: "PK-DO-072", region: "Dooars Western", grade: "BOP (Broken Orange Pekoe)", color: "Rich Crimson", strength: "8.5/10", stock: "9,500 Kg", price: "165", dispatch: "Siliguri Hub", type: "CTC Tea" },
    { id: "PK-ST-110", region: "Commercial Blend", grade: "Super Fine Dust", color: "Intense Opaque", strength: "10/10", stock: "22,000 Kg", price: "135", dispatch: "Guwahati Desk", type: "Dust Tea" }
];

export default function Prakriti() {
    useDocumentMeta({
        title: 'Premium Tea Sourcing & Export | Prakriti by India Trade Overseas',
        description: 'Prakriti connects global buyers to premium Assam, Darjeeling, and Dooars tea — live marketplace pricing and verified B2B sourcing with India Trade Overseas.',
        canonicalPath: '/prakriti'
    });

    const [userAccessLayer, setUserAccessLayer] = useState(1);
    const [isSessionLoading, setIsLoadingSession] = useState(true);
    const [showEntryGate, setShowEntryGate] = useState(() => {
        // Dev-only escape hatch (stripped out of production builds) so the storefront —
        // including the Testimonials section — can be previewed locally without the OTP gate.
        if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('previewTestimonials') === '1') {
            return false;
        }
        return !(localStorage.getItem('prakriti_distributor_id') && localStorage.getItem('distributor_token'));
    });
    const [distributorId, setDistributorId] = useState('');
    const [myProposals, setMyProposals] = useState([]);
    const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);

    const [heroBgIndex, setHeroBgIndex] = useState(0);
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [activeTab, setActiveTab] = useState('programme');

    // Marketplace Interactive Variables
    const [selectedMarketCategory, setSelectedMarketCategory] = useState('All');
    const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
    const [activeDrawerLot, setActiveDrawerLot] = useState(null);
    const [orderQuantity, setOrderQuantity] = useState('500');

    const fetchMyProposals = async () => {
        const storedDistributorId = distributorId || localStorage.getItem('prakriti_distributor_id');
        const token = localStorage.getItem('distributor_token');

        if (!storedDistributorId || !token) {
            console.warn("No active distributor session or token found.");
            return;
        }

        try {
            const res = await distributorApi.getDistributorProposalsCustomer(storedDistributorId, 'TEA');
            if (res && res.success) {
                setMyProposals(res.data || []);
            }
        } catch (err) {
            console.error("Error loading user procurement pipelines:", err);
        }
    };

    useEffect(() => {
        if (userAccessLayer === 5 && distributorId) {
            fetchMyProposals();
        }
    }, [userAccessLayer, distributorId]);

    // DOM Navbar visibility control
    useEffect(() => {
        const globalNavbar = document.querySelector('header') || document.querySelector('nav');
        if (globalNavbar) {
            if (userAccessLayer >= 4) {
                globalNavbar.style.display = 'none';
            } else {
                globalNavbar.style.display = '';
            }
        }
        return () => {
            if (globalNavbar) globalNavbar.style.display = '';
        };
    }, [userAccessLayer]);

    // Single Consolidated Session Initialization Lifecycle
    useEffect(() => {
        // Retries transient failures (e.g. a cold-started free-tier backend) so a
        // returning verified distributor isn't dropped back to the entry gate by
        // a flaky first request. A real 404 (distributor deleted in CRM) is not
        // retried — that's the one case that should log them out.
        const fetchStatusWithRetry = async (id, attemptsLeft = 2) => {
            try {
                return await distributorApi.getDistributorStatus(id);
            } catch (err) {
                if (err.response?.status === 404 || attemptsLeft <= 0) throw err;
                await new Promise((resolve) => setTimeout(resolve, 1200));
                return fetchStatusWithRetry(id, attemptsLeft - 1);
            }
        };

        const initializeAuthenticationSession = async () => {
            const savedId = localStorage.getItem('prakriti_distributor_id');
            const token = localStorage.getItem('distributor_token');

            if (savedId && token) {
                setDistributorId(savedId);
                try {
                    const res = await fetchStatusWithRetry(savedId);
                    if (res.success) {
                        const status = res.data.approvalStatus;
                        if (status === 'approved') {
                            const savedLayer = localStorage.getItem(ACTIVE_LAYER_KEY);
                            setUserAccessLayer(savedLayer === '5' ? 5 : 1);
                        } else if (status === 'pending') {
                            setUserAccessLayer(4);
                        } else {
                            handleLogOut();
                        }
                    }
                } catch (err) {
                    if (err.response?.status === 404) {
                        handleLogOut();
                    } else {
                        console.error("Session synchronization failure:", err);
                    }
                }
            }
            setIsLoadingSession(false);
        };
        initializeAuthenticationSession();
    }, []);

    // Persist the settled layer (storefront vs marketplace) so a refresh restores
    // the same view instead of always snapping approved buyers to Layer 5.
    useEffect(() => {
        if (isSessionLoading) return;
        if (userAccessLayer === 1 || userAccessLayer === 5) {
            localStorage.setItem(ACTIVE_LAYER_KEY, String(userAccessLayer));
        }
    }, [userAccessLayer, isSessionLoading]);

    // Status Polling Loop for Pending Layer 4 Users
    useEffect(() => {
        let pollingTimer;

        if (userAccessLayer === 4 && distributorId) {
            const executeStatusPulseCheck = async () => {
                try {
                    const res = await distributorApi.getDistributorStatus(distributorId);
                    if (res.success) {
                        const currentStatus = res.data.approvalStatus;
                        if (currentStatus === 'approved') {
                            toast.success("B2B Sourcing Profile Approved! Secure Marketplace Activated.");
                            clearInterval(pollingTimer);
                            setUserAccessLayer(5);
                        } else if (currentStatus === 'rejected') {
                            toast.error("Sourcing credentials could not be verified.");
                            clearInterval(pollingTimer);
                            handleLogOut();
                        }
                    }
                } catch (err) {
                    console.error("Automated background verification polling issue:", err);
                }
            };

            executeStatusPulseCheck();
            pollingTimer = setInterval(executeStatusPulseCheck, 5000);
        }

        return () => clearInterval(pollingTimer);
    }, [userAccessLayer, distributorId]);

    useEffect(() => {
        const bgTimer = setInterval(() => {
            setHeroBgIndex((prev) => (prev + 1) % HERO_BACKGROUNDS.length);
        }, 6000);
        return () => clearInterval(bgTimer);
    }, []);

    useEffect(() => {
        const packTimer = setInterval(() => {
            setCarouselIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
        }, 5000);
        return () => clearInterval(packTimer);
    }, []);

    // Entry-gate verification (name/email/phone/location + OTP already handled
    // inside BuyerEntryGate) â€” just adopt the resulting session, exactly the way
    // the old handleVerifyOtp used to, minus the fields BuyerEntryGate never collects.
    const handleGateVerified = async (activeId, activeToken) => {
        if (activeId) {
            setDistributorId(activeId);
            localStorage.setItem('prakriti_distributor_id', activeId);
        }
        if (activeToken) {
            localStorage.setItem('distributor_token', activeToken);
        }
        pushDataLayerEvent('tea_distributor_verified', { division: 'TEA' });
        setShowEntryGate(false);
        setUserAccessLayer(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Only for the two genuinely destructive cases: the CRM record was deleted (404)
    // or explicitly rejected. Clears the saved session so the entry gate reappears.
    const handleLogOut = () => {
        setUserAccessLayer(1);
        setDistributorId('');
        localStorage.removeItem('prakriti_distributor_id');
        localStorage.removeItem('distributor_token');
        localStorage.removeItem(ACTIVE_LAYER_KEY);
        toast.success("Secured customer session terminated.");
    };

    // Manual "exit" from the marketplace — just switches the view back to the
    // storefront. Does NOT clear the saved session, so a refresh/reopen restores
    // straight back in without re-verification, as long as the CRM record still exists.
    const handleExitTerminal = () => {
        setUserAccessLayer(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const filteredMarketLots = APPROVED_MARKETPLACE_DATA.filter(lot =>
        selectedMarketCategory === 'All' ? true : lot.type === selectedMarketCategory
    );

    if (showEntryGate) {
        return (
            <BuyerEntryGate
                theme={PRAKRITI_GATE_THEME}
                division="TEA"
                requireOtp={true}
                onVerified={handleGateVerified}
                mascotSrc="/images/walking-man.png"
            />
        );
    }

    if (isSessionLoading) {
        return (
            <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <span className="w-10 h-10 border-4 border-[#004B3B] border-t-transparent rounded-full animate-spin block mx-auto" />
                    <p className="text-xs font-mono tracking-widest text-[#004B3B] uppercase font-bold">Synchronizing Trade Pipeline...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#FAF9F5] text-slate-900 antialiased min-h-screen font-sans selection:bg-[#50C878]/30 selection:text-[#004B3B]">

            {/* ================= LAYER 4: UNDER REVIEW GATE ================= */}
            {userAccessLayer === 4 && (
                <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl bg-white rounded-2xl p-6 sm:p-12 shadow-2xl border border-slate-200 text-center space-y-6">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-amber-500/10 border border-amber-500/30 text-amber-600 rounded-full flex items-center justify-center mx-auto text-xl sm:text-2xl animate-pulse">
                            <FiCompass />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-serif text-[#0B3D2E] uppercase tracking-wide">Account Under Review</h2>
                        <div className="w-16 h-[2px] bg-amber-500 mx-auto" />
                        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-lg mx-auto font-light">
                            â€œYour Prakriti Tea buyer account is under review. Our team is verifying your business documents. You will receive confirmation within 24 hours once your account is approved.â€
                        </p>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left text-xs text-slate-500 space-y-1.5 max-w-md mx-auto">
                            <div className="font-bold text-[#004B3B] uppercase tracking-wider text-[10px] mb-1 font-mono">STATUTORY CHECKLIST PIPELINE:</div>
                            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" /> Database Cross-Reference Matching (GSTIN / FSSAI / IEC)</div>
                            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" /> Procurement Scale and Cargo Volume Authenticity Verification</div>
                        </div>
                        <div className="pt-2">
                            <button onClick={() => setUserAccessLayer(1)} className="text-[10px] font-mono text-[#004B3B] hover:text-[#50C878] uppercase tracking-wider underline underline-offset-4">
                                Return to Public Storefront View
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* ================= LAYER 5: APPROVED TEA BUYER MARKETPLACE ================= */}
            {userAccessLayer === 5 && (
                <div className="min-h-screen bg-[#FAF9F5] font-sans text-slate-900 animate-fadeIn antialiased pt-3 sm:pt-6 pb-20 sm:pb-24">

                    {/* Top B2B Control Header */}
                    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mb-4 sm:mb-8">
                        <div className="bg-[#0B3D2E] text-white rounded-xl p-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border border-[#50C878]/20 shadow-xl">

                            {/* Brand Header Identity */}
                            <div className="flex items-center justify-between sm:justify-start gap-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-[#50C878]/20 to-white/10 rounded flex items-center justify-center text-[#50C878] font-serif text-base sm:text-lg font-bold border border-white/15 shadow-inner">
                                        P
                                    </div>
                                    <div>
                                        <div className="text-[9px] sm:text-[10px] font-mono tracking-widest text-[#50C878] font-bold uppercase leading-none mb-0.5">B2B TRADE TERMINAL</div>
                                        <div className="text-xs sm:text-sm font-serif tracking-wider text-white uppercase font-medium">INDIA TRADE OVERSEAS</div>
                                    </div>
                                </div>

                                <div className="sm:hidden flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded text-[9px] font-mono text-emerald-400 font-bold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                                </div>
                            </div>

                            {/* Actions Deck */}
                            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                                <div className="hidden md:flex flex-col text-right font-mono text-[10px] text-slate-300 border-r border-white/10 pr-4">
                                    <span>ESTATE NETWORK SECURED</span>
                                    <span className="text-emerald-400">STATUS: ACTIVE SESSION</span>
                                </div>

                                <button
                                    onClick={() => {
                                        fetchMyProposals();
                                        setIsProposalModalOpen(true);
                                    }}
                                    className="relative flex-1 sm:flex-none bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-[#50C878] border border-[#50C878]/30 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider py-2.5 px-3 sm:px-4 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <FiFileText className="text-xs sm:text-sm" />
                                    <span>My Proposals</span>
                                    {myProposals.filter(p => p.status === 'approved').length > 0 && (
                                        <span className="bg-amber-500 text-slate-900 w-4 h-4 rounded-full flex items-center justify-center font-sans font-extrabold text-[9px] animate-bounce ml-0.5">
                                            {myProposals.filter(p => p.status === 'approved').length}
                                        </span>
                                    )}
                                </button>

                                <button
                                    onClick={handleExitTerminal}
                                    className="bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 active:scale-95 border border-white/10 text-slate-200 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider py-2.5 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                                >
                                    Exit Terminal
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-4 sm:space-y-8">

                        {/* Hero Banner Section */}
                        <div className="bg-gradient-to-br from-[#0B3D2E] via-[#004B3B] to-[#043327] rounded-xl sm:rounded-2xl p-5 sm:p-8 border border-[#50C878]/20 shadow-xl relative overflow-hidden text-white">
                            <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-[radial-gradient(circle_at_top_right,rgba(80,200,120,0.12),transparent_60%)] pointer-events-none" />

                            <div className="space-y-2.5 sm:space-y-3 relative z-10 max-w-3xl">
                                <div className="inline-flex items-center gap-1.5 bg-[#50C878]/15 border border-[#50C878]/30 px-2.5 sm:px-3 py-1 rounded text-[9px] sm:text-[10px] font-mono font-bold text-[#50C878] tracking-wider uppercase">
                                    <FiCheckCircle size={11} className="text-[#50C878]" /> ACCREDITATION: LEVEL 5 VERIFIED
                                </div>
                                <h2 className="text-xl sm:text-3xl lg:text-4xl font-serif tracking-wide text-white uppercase leading-tight">
                                    Prakriti Verified Buyer Marketplace
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-200 font-light leading-relaxed max-w-2xl">
                                    Welcome back, trading partner. Your session is synchronized directly with live inventory metrics, active seasonal plucking lots, and fresh wholesale price indexes from our partner estate networks.
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
                                        className="w-full max-w-3xl bg-white rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh] sm:max-h-[85vh]"
                                    >
                                        {/* Modal Header */}
                                        <div className="bg-[#0B3D2E] text-white p-4 sm:p-6 flex justify-between items-center text-left shrink-0">
                                            <div>
                                                <div className="text-[9px] font-mono tracking-widest text-[#50C878] font-bold uppercase">Procurement Ledger Tracking</div>
                                                <h2 className="text-base sm:text-xl font-serif text-white uppercase tracking-wide">My Active Trade Proposals</h2>
                                            </div>
                                            <button
                                                onClick={() => setIsProposalModalOpen(false)}
                                                className="p-1.5 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer bg-white/5 border border-white/10"
                                            >
                                                <FiX size={18} />
                                            </button>
                                        </div>

                                        {/* Proposals Scrollable Area */}
                                        <div className="p-3 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto text-left flex-1 bg-slate-50/50">
                                            {myProposals.length === 0 ? (
                                                <div className="py-16 text-center text-slate-400 italic text-xs font-light">
                                                    You have not committed any trade pipeline negotiations yet.
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {myProposals.map((prop) => (
                                                        <div
                                                            key={prop._id}
                                                            className={`p-3.5 sm:p-4 rounded-xl border text-xs transition-all space-y-3 ${prop.status === 'approved' ? 'border-emerald-300/80 bg-white shadow-sm' :
                                                                    prop.status === 'disapproved' ? 'border-rose-200 bg-rose-50/20' :
                                                                        'border-slate-200 bg-white'
                                                                }`}
                                                        >
                                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                                                                <div className="space-y-0.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-bold font-mono text-[#0B3D2E]">{prop.lotId}</span>
                                                                        <span className="text-[10px] font-mono text-slate-400">({prop.grade})</span>
                                                                    </div>
                                                                    <div className="text-xs text-slate-600 font-light">
                                                                        Tract: <span className="font-medium text-slate-800">{prop.region}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center justify-between sm:justify-end gap-2">
                                                                    <span className={`px-2.5 py-1 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border ${prop.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                                                                            prop.status === 'disapproved' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                                                                                'bg-amber-50 text-amber-700 border-amber-300'
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

                                                                                    if (!orderResult || !orderResult.success) {
                                                                                        throw new Error(orderResult?.message || "Failed to create payment order.");
                                                                                    }

                                                                                    const { orderId, keyId } = orderResult.data;
                                                                                    toast.dismiss(loadingToast);

                                                                                    const options = {
                                                                                        key: keyId,
                                                                                        amount: singleAmount * 100,
                                                                                        currency: "INR",
                                                                                        name: "Prakriti Tea Division",
                                                                                        description: `Invoice Settlement - Lot ${prop.lotId}`,
                                                                                        order_id: orderId,
                                                                                        handler: async function (response) {
                                                                                            const verificationToast = toast.loading("Verifying transaction...");
                                                                                            try {
                                                                                                const verifyResult = await distributorApi.verifyRazorpayPayment({
                                                                                                    razorpay_order_id: response.razorpay_order_id,
                                                                                                    razorpay_payment_id: response.razorpay_payment_id,
                                                                                                    razorpay_signature: response.razorpay_signature,
                                                                                                    lotId: prop.lotId,
                                                                                                    quantity: prop.quantity,
                                                                                                    amount: singleAmount
                                                                                                });

                                                                                                if (!verifyResult || !verifyResult.success) {
                                                                                                    throw new Error(verifyResult?.message || "Signature verification failed.");
                                                                                                }

                                                                                                await distributorApi.updateProposalStatus(prop._id, 'paid');
                                                                                                toast.dismiss(verificationToast);
                                                                                                toast.success(`Payment verified for Lot ${prop.lotId}!`);
                                                                                                pushDataLayerEvent('tea_payment_success', {
                                                                                                    transaction_id: response.razorpay_payment_id,
                                                                                                    value: singleAmount,
                                                                                                    currency: 'INR',
                                                                                                    lot_id: prop.lotId,
                                                                                                    quantity: prop.quantity
                                                                                                });
                                                                                                fetchMyProposals();
                                                                                            } catch (vErr) {
                                                                                                toast.dismiss(verificationToast);
                                                                                                toast.error(vErr.message || "Payment verification failed.");
                                                                                            }
                                                                                        },
                                                                                        theme: { color: "#004B3B" }
                                                                                    };

                                                                                    const checkout = new window.Razorpay(options);
                                                                                    checkout.open();

                                                                                } catch (err) {
                                                                                    toast.dismiss(loadingToast);
                                                                                    toast.error(err.message || "Failed to start Razorpay gateway.");
                                                                                }
                                                                            }}
                                                                            className="bg-[#004B3B] hover:bg-[#053127] text-white px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all shadow-xs cursor-pointer flex items-center gap-1"
                                                                        >
                                                                            <FiCheckCircle size={11} /> Pay Invoice
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                                                <div>
                                                                    <span className="text-slate-400 block text-[9px] uppercase font-sans">Volume</span>
                                                                    <span className="font-bold text-slate-800">{prop.quantity?.toLocaleString()} Kg</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-slate-400 block text-[9px] uppercase font-sans">Net Value</span>
                                                                    <span className="font-bold text-[#004B3B]">INR {(prop.estimatedValue || prop.quantity * prop.basePrice)?.toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Modal Sticky Footer */}
                                        <div className="p-4 sm:p-6 bg-white border-t border-slate-200 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 shrink-0 shadow-lg">
                                            <div className="flex items-center justify-between sm:block">
                                                <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Total Active Matrix</div>
                                                <div className="text-lg sm:text-xl font-mono font-extrabold text-[#0B3D2E]">
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
                                                        return toast.error("Total exceeds Razorpay's single-transaction cap (â‚¹5,00,000). Please pay invoices individually.");
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
                                                            name: "Prakriti Tea Division",
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
                                                                    pushDataLayerEvent('tea_payment_success', {
                                                                        transaction_id: response.razorpay_payment_id,
                                                                        value: aggregateAmount,
                                                                        currency: 'INR',
                                                                        lot_id: targetLotString,
                                                                        quantity: combinedQuantity
                                                                    });
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
                                                            theme: { color: "#004B3B" }
                                                        };

                                                        const checkoutWindow = new window.Razorpay(options);
                                                        checkoutWindow.open();

                                                    } catch (err) {
                                                        toast.dismiss(loadingToast);
                                                        toast.error(err.response?.data?.message || err.message || "Gateway initialization failed.");
                                                    }
                                                }}
                                                className={`font-mono text-xs font-bold uppercase tracking-wider py-3.5 px-6 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md ${myProposals.filter(p => p.status === 'approved').length > 0
                                                    ? 'bg-[#004B3B] hover:bg-[#053127] active:scale-98 text-white cursor-pointer'
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

                        {/* Category Filter Chips Bar */}
                        <div className="bg-white border border-slate-200/80 rounded-xl p-3 sm:p-4 shadow-sm space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                                {['All', 'CTC Tea', 'Orthodox Tea', 'Dust Tea'].map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedMarketCategory(cat)}
                                        className={`px-3.5 py-2 text-[10px] sm:text-xs font-mono uppercase tracking-wider rounded-lg transition-all font-bold cursor-pointer whitespace-nowrap shrink-0 ${selectedMarketCategory === cat
                                            ? 'bg-[#004B3B] text-[#50C878] shadow-sm border border-[#004B3B]'
                                            : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-widest pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                <span>{filteredMarketLots.length} Allocation Lots Active</span>
                            </div>
                        </div>

                        {/* Marketplace Lots Container */}
                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="font-serif text-base sm:text-lg text-[#0B3D2E] uppercase tracking-wider font-semibold">
                                    Active Sourcing Lots & Live Pricing
                                </h3>
                            </div>

                            {/* ðŸ“± MOBILE VIEW: Premium Card Deck (Shown on Mobile screens) */}
                            <div className="grid grid-cols-1 gap-3.5 md:hidden">
                                {filteredMarketLots.map((row) => (
                                    <div key={row.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-[#50C878]/50 transition-all space-y-3">
                                        <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
                                            <div>
                                                <div className="text-xs font-mono font-bold text-[#004B3B] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mb-1">
                                                    {row.id}
                                                </div>
                                                <h4 className="font-serif font-bold text-slate-900 text-sm">{row.region}</h4>
                                            </div>
                                            <span className="bg-slate-100 px-2 py-0.5 border border-slate-200 font-mono text-[10px] text-slate-800 font-bold rounded">
                                                {row.grade}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                <span className="text-[9px] font-mono uppercase text-slate-400 block">Liquor Spec</span>
                                                <span className="font-medium text-slate-800">{row.color}</span>
                                                <span className="text-[10px] text-slate-500 font-mono block">Idx: {row.strength}</span>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                <span className="text-[9px] font-mono uppercase text-slate-400 block">Inventory / Rate</span>
                                                <span className="font-bold text-[#004B3B] block font-mono">INR {row.price}/Kg</span>
                                                <span className="text-[10px] text-slate-500 font-mono block">Stock: {row.stock}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            <button
                                                onClick={() => toast.success(`Sample dispatch token generated for Lot ${row.id}`)}
                                                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-2 rounded-lg font-mono font-bold uppercase text-[9px] tracking-wider transition-all"
                                            >
                                                Request Sample
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setActiveDrawerLot(row);
                                                    setIsOrderDrawerOpen(true);
                                                }}
                                                className="bg-[#004B3B] hover:bg-[#053127] active:scale-98 text-white py-2 rounded-lg font-mono font-bold uppercase text-[9px] tracking-wider shadow-xs transition-all flex items-center justify-center gap-1"
                                            >
                                                <FiShoppingCart size={11} /> Place Order
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ðŸ’» DESKTOP/TABLET VIEW: Structured Table Layout */}
                            <div className="hidden md:block bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xl overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-[#0B3D2E] text-slate-200 border-b border-[#004B3B] font-mono uppercase tracking-wider text-[10px]">
                                            <th className="p-4 font-medium tracking-widest text-[#50C878]">Lot HASH</th>
                                            <th className="p-4 font-medium tracking-widest">Appellation / Origin Tract</th>
                                            <th className="p-4 font-medium tracking-widest">Industrial Leaf Grade</th>
                                            <th className="p-4 font-medium tracking-widest">Liquor & Infusion Character</th>
                                            <th className="p-4 font-medium tracking-widest">Live Inventory</th>
                                            <th className="p-4 font-medium tracking-widest text-[#50C878]">Wholesale Price</th>
                                            <th className="p-4 font-medium tracking-widest text-right pr-6">Action Deck</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                                        {filteredMarketLots.map((row) => (
                                            <tr key={row.id} className="hover:bg-slate-50/70 transition-colors group">
                                                <td className="p-4 font-mono font-bold text-[#004B3B] text-[13px] tracking-wide">
                                                    {row.id}
                                                </td>
                                                <td className="p-4 space-y-0.5">
                                                    <div className="font-semibold text-slate-900 group-hover:text-[#004B3B] transition-colors">{row.region}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                                        <span className="w-1 h-1 rounded-full bg-slate-300" /> Origin Lot Authenticated
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="bg-slate-100 px-2 py-0.5 border border-slate-200 font-mono text-[11px] text-slate-800 font-bold rounded-sm">
                                                        {row.grade}
                                                    </span>
                                                </td>
                                                <td className="p-4 space-y-0.5">
                                                    <div className="text-slate-800 font-medium">Color: <span className="text-slate-600 font-normal">{row.color}</span></div>
                                                    <div className="text-[10px] font-mono text-slate-400">Strength Index: {row.strength}</div>
                                                </td>
                                                <td className="p-4 font-mono font-semibold text-slate-600">
                                                    {row.stock}
                                                </td>
                                                <td className="p-4 font-mono font-bold text-[14px] text-[#004B3B]">
                                                    INR {row.price}/Kg
                                                </td>
                                                <td className="p-4 text-right space-x-2 whitespace-nowrap pr-6">
                                                    <button
                                                        onClick={() => toast.success(`Sample dispatch token generated for Lot ${row.id}`)}
                                                        className="bg-slate-50 hover:bg-slate-200 border border-slate-200 text-slate-700 px-3 py-2 rounded-sm font-mono font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer"
                                                    >
                                                        Request Sample
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setActiveDrawerLot(row);
                                                            setIsOrderDrawerOpen(true);
                                                        }}
                                                        className="bg-[#004B3B] hover:bg-[#053127] text-white px-4 py-2 rounded-sm font-mono font-bold uppercase tracking-wider text-[10px] shadow-sm hover:shadow transition-all cursor-pointer"
                                                    >
                                                        Place Order
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

            {/* ================= LAYER 1 & LAYER 2: PUBLIC VIEWS ================= */}
            {userAccessLayer <= 2 && (
                <>
                    {/* LAYER 1: PUBLIC TEA STOREFRONT HERO */}
                    <section className="relative w-full min-h-screen flex items-center bg-[#0B3D2E] overflow-hidden py-24">
                        <div className="absolute inset-0 z-0">
                            <AnimatePresence mode="wait">
                                <motion.img
                                    key={heroBgIndex}
                                    src={HERO_BACKGROUNDS[heroBgIndex]}
                                    alt="Cinematic Tea Plantation Scenery"
                                    initial={{ opacity: 0, scale: 1.03 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 1.5, ease: "easeInOut" }}
                                    className="w-full h-full object-cover object-center"
                                />
                            </AnimatePresence>
                            <div className="absolute inset-0 bg-gradient-to-r from-[#0B3D2E]/85 via-[#004B3B]/50 to-transparent z-1" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0B3D2E]/70 via-transparent to-black/10 z-1" />
                        </div>

                        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
                            <motion.div
                                className="lg:col-span-8 space-y-8 text-center lg:text-left"
                                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                            >
                                <motion.div
                                    className="inline-flex items-center gap-2 bg-[#50C878]/20 border border-[#50C878]/40 rounded-full px-4 py-1.5 backdrop-blur-md"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.8, delay: 0.5 }}
                                >
                                    <span className="w-2 h-2 rounded-full bg-[#50C878] animate-pulse" />
                                    <span className="text-[10px] tracking-widest font-mono uppercase text-white font-bold">India Trade Overseas Venture</span>
                                </motion.div>

                                <motion.h1
                                    className="text-4xl sm:text-7xl font-serif text-white tracking-tight leading-none uppercase"
                                    initial={{ scale: 0.97 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
                                >
                                    PRAKRITI <br />
                                    <span className="text-[#50C878] font-sans font-light normal-case tracking-wide text-xl sm:text-4xl block mt-3">
                                        Prakriti Tea By India Trade Overseas
                                    </span>
                                </motion.h1>

                                <motion.div
                                    className="w-24 h-[2px] bg-[#50C878] mx-auto lg:mx-0"
                                    initial={{ width: 0 }}
                                    animate={{ width: 96 }}
                                    transition={{ duration: 1, delay: 0.7, ease: "easeInOut" }}
                                />

                                <motion.p
                                    className="text-xs sm:text-base text-slate-100 font-light max-w-xl mx-auto lg:mx-0 leading-relaxed drop-shadow-md"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, delay: 0.6 }}
                                >
                                    Attracting high-integrity domestic wholesalers, brokers, retail supply brands, and export houses. We coordinate direct bulk estate relationships across primary tea tracts to deploy precise taste character, deep liquor density, and custom private label packaging configurations. Sensitive trade rates and lab assays remain secured until verified.
                                </motion.p>

                                <motion.div
                                    className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4"
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, delay: 0.8 }}
                                >
                                    <button
                                        onClick={() => setUserAccessLayer(5)}
                                        className="bg-[#50C878] hover:bg-[#40b064] text-[#0B3D2E] text-[9px] sm:text-xs font-mono font-bold uppercase tracking-wider px-6 sm:px-8 py-3.5 sm:py-4 rounded-lg shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
                                    >
                                        Explore Products
                                    </button>
                                    <a
                                        href="#teaser-deck"
                                        className="bg-white/10 hover:bg-white/20 text-white text-[9px] sm:text-xs font-mono font-bold uppercase tracking-wider px-6 sm:px-8 py-3.5 sm:py-4 rounded-lg backdrop-blur-md border border-white/20 transition-all"
                                    >
                                        Live Teaser Offers
                                    </a>
                                </motion.div>
                            </motion.div>

                            <div className="lg:col-span-4 space-y-4">
                                {[
                                    { label: "Sourcing Lot Spectrum", value: "200â€“300 Choices", desc: "Sourced continuously across seasonal pluckings from vetted garden desks. " },
                                    { label: "Compliance & Safety", value: "Fully Certified", desc: "Rigorous alignment matching GST, FSSAI infrastructure, and IEC parameters." },
                                    { label: "Logistics Channels", value: "Pan-India / Export", desc: "Direct distribution pipelines serving local warehouses and major shipping ports." }
                                ].map((item, idx) => (
                                    <motion.div
                                        key={idx}
                                        className="p-5 rounded-xl border border-white/10 bg-[#0B3D2E]/70 backdrop-blur-xs shadow-md"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.6, delay: 0.4 + (idx * 0.15) }}
                                    >
                                        <div className="text-[9px] uppercase font-mono tracking-widest text-[#50C878] font-bold">{item.label}</div>
                                        <div className="text-base sm:text-lg font-serif text-white my-0.5">{item.value}</div>
                                        <div className="text-[11px] text-slate-300 font-light leading-snug">{item.desc}</div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* OPEN CATEGORIES ROW */}
                    <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
                        <div className="text-center max-w-3xl mx-auto space-y-2">
                            <span className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#004B3B] bg-[#50C878]/20 px-3 py-1 rounded-sm">
                                Core Sourcing Framework
                            </span>
                            <h2 className="text-3xl font-serif text-[#0B3D2E] uppercase tracking-wide">
                                Public Tea Classification Index
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {PUBLIC_CATEGORIES.map((cat, idx) => {
                                const IconComp = cat.icon;
                                return (
                                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3 hover:border-[#50C878]/40 transition-all duration-300 group">
                                        <div className="w-10 h-10 bg-[#004B3B]/5 rounded-lg flex items-center justify-center text-[#004B3B] text-xl group-hover:bg-[#004B3B] group-hover:text-[#50C878] transition-all">
                                            <IconComp />
                                        </div>
                                        <h3 className="font-serif text-base font-bold text-[#0B3D2E] tracking-wide">{cat.title}</h3>
                                        <p className="text-slate-500 text-xs font-light leading-relaxed">{cat.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* LAYER 2: TEA TEASER DECK */}
                    <section id="teaser-deck" className="py-24 bg-[#004B3B] text-white px-4 sm:px-6 lg:px-8 border-y border-[#50C878]/20 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(80,200,120,0.06),transparent_40%)]" />

                        <div className="max-w-7xl mx-auto space-y-12 relative z-10">
                            <div className="text-center max-w-2xl mx-auto space-y-2">
                                <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#50C878]">Live Cargo Teaser Stream</span>
                                <h2 className="text-3xl font-serif text-white uppercase tracking-wide">Available Sourcing Lots</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {TEASER_LISTINGS.map((lot) => (
                                    <div key={lot.id} className="bg-[#0B3D2E]/60 border border-white/10 rounded-xl p-5 shadow-xl flex flex-col justify-between min-h-[320px] relative overflow-hidden group">
                                        <div className="space-y-4">
                                            <div className="border-b border-white/5 pb-2 flex items-center justify-between">
                                                <span className="text-[10px] font-mono font-bold uppercase text-[#50C878] tracking-widest">{lot.region}</span>
                                                <span className="text-[9px] font-mono bg-white/5 px-2 py-0.5 rounded text-slate-400">ID: PKM-0{lot.id}</span>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="text-sm font-serif font-bold text-white uppercase tracking-wide">{lot.type}</div>
                                                <div className="text-xs font-light text-slate-300">Base Sizing: {lot.package}</div>
                                                <div className="text-xs font-light text-slate-300">Intended Route: {lot.use}</div>
                                            </div>

                                            <div className="bg-black/20 rounded-lg p-3 border border-white/5 text-[10px] font-mono space-y-1 relative">
                                                <div className="filter blur-xs select-none space-y-1 opacity-40">
                                                    <div>WHOLESALE PRICE: INR 1XX / Kg</div>
                                                    <div>ESTATE: [Encrypted Garden]</div>
                                                    <div>LOT VOL: XX,XXX Kilograms</div>
                                                </div>
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-lg">
                                                    <div className="text-[9px] text-[#50C878] font-bold uppercase bg-[#004B3B] px-2 py-1 rounded border border-[#50C878]/30 tracking-widest flex items-center gap-1">
                                                        <FiLock /> DATA LOCKED
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-white/5 mt-5">
                                            <button
                                                onClick={() => setUserAccessLayer(5)}
                                                className="w-full bg-white/5 hover:bg-[#50C878] text-white hover:text-[#004B3B] text-[9px] sm:text-xs font-mono font-bold uppercase tracking-wider py-3 px-2 rounded-lg border border-white/10 transition-all text-center flex items-center justify-center"
                                            >
                                                <span className="tracking-tight">Explore Products</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* COMPLIANCE TAB PARAMETERS SYSTEM */}
                    <section id="operations-system" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
                        <div className="text-center max-w-3xl mx-auto space-y-2">
                            <span className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#004B3B] bg-[#50C878]/20 px-3 py-1 rounded-sm">
                                B2B Compliance Guidelines
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-serif uppercase tracking-wide text-[#0B3D2E]">
                                Structured Distribution Systems
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 sm:flex sm:flex-wrap sm:justify-center sm:items-center gap-1.5 border-b border-slate-200 pb-px">
                            {[
                                { id: 'programme', label: 'Commercial Protocol', icon: FiFileText },
                                { id: 'rotation', label: 'Rotation Blueprint', icon: FiCompass },
                                { id: 'enrolment', label: 'Accept Terms & Enrol', icon: FiAward }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-3.5 text-[9px] sm:text-xs font-bold uppercase tracking-wider transition-all border-b-2 text-center w-full sm:w-auto rounded-t-md ${activeTab === tab.id
                                        ? 'border-[#004B3B] text-[#004B3B] bg-white shadow-xs'
                                        : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <tab.icon size={13} className="shrink-0" />
                                    <span className="truncate">{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-12 min-h-[340px] flex items-center shadow-xs">
                            <AnimatePresence mode="wait">
                                {activeTab === 'programme' && (
                                    <motion.div key="programme" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
                                        <div className="lg:col-span-7 space-y-4 text-center sm:text-left">
                                            <h3 className="text-lg sm:text-xl font-serif text-[#004B3B] uppercase tracking-wide">Layered Sourcing and Origin Pipeline Protection</h3>
                                            <p className="text-slate-600 text-xs sm:text-sm font-light leading-relaxed">
                                                Our division enforces strict documentation checkpoints to shield our active garden networks, trade prices, and wholesale allocation metrics from retail noise.
                                            </p>
                                        </div>
                                        <div className="lg:col-span-5 bg-[#FAF9F5] p-5 sm:p-6 rounded-xl border border-slate-100 flex flex-col justify-center space-y-3 text-center sm:text-left">
                                            <div className="text-[9px] sm:text-xs uppercase font-mono text-[#004B3B] font-bold tracking-wider">Account Reconciliation Rule</div>
                                            <p className="text-xs text-slate-500 font-light leading-relaxed">
                                                Final lot negotiations, dispatch confirmations, and sample deliveries operate strictly against digital compliance handshakes.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'rotation' && (
                                    <motion.div key="rotation" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
                                        <div className="lg:col-span-7 space-y-4 text-center sm:text-left">
                                            <h3 className="text-lg sm:text-xl font-serif text-[#004B3B] uppercase tracking-wide">Proactive Channel Protection Strategy</h3>
                                            <p className="text-slate-600 text-xs sm:text-sm font-light leading-relaxed">
                                                Prakriti manages a strategic, company-supported inventory buffer system designed to prevent local market stagnation across distribution blocks.
                                            </p>
                                        </div>
                                        <div className="lg:col-span-5 bg-[#FAF9F5] p-5 sm:p-6 rounded-xl border border-slate-100 flex flex-col justify-center text-center space-y-2">
                                            <div className="text-base sm:text-lg font-serif text-[#004B3B] font-bold">Secure Sourcing Tract</div>
                                            <p className="text-xs text-slate-500 font-light leading-relaxed">
                                                Continuous garden-fresh lot supply pipelines shield wholesale capital investments from market friction.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'enrolment' && (
                                    <motion.div key="enrolment" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="w-full space-y-6 text-center">
                                        <h3 className="text-lg sm:text-xl font-serif text-[#004B3B] uppercase tracking-wide">Confirm Terms & Launch Profile Form</h3>
                                        <p className="text-slate-600 text-xs sm:text-sm font-light max-w-xl mx-auto">
                                            Exclusivity configurations, final pricing matrix arrays, and distributor margin structures are officially activated following authorization signup.
                                        </p>
                                        <div className="pt-2">
                                            <button
                                                onClick={() => setUserAccessLayer(5)}
                                                className="bg-[#004B3B] hover:bg-[#06362a] text-[#50C878] font-mono text-[9px] sm:text-xs font-bold uppercase tracking-wider px-4 sm:px-10 py-3.5 sm:py-4 rounded-lg shadow-md transition-all inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                                            >
                                                <FiBriefcase className="shrink-0" />
                                                <span>Explore Products</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </section>

                    {/* VOLUMETRIC CONTAINER CAROUSEL */}
                    <section className="relative py-16 sm:py-24 bg-[#0B3D2E] text-slate-900 px-4 sm:px-6 lg:px-8 border-t border-slate-200 overflow-hidden">
                        {/* Background Image & Stronger Mobile Gradient Overlay */}
                        <div className="absolute inset-0 z-0 pointer-events-none">
                            <img
                                src='/images/Prakriti Image.jpeg'
                                alt="Cinematic Volumetric Context Background"
                                className="w-full h-full object-cover object-center opacity-40 sm:opacity-100"
                            />
                            {/* Darkened overlay to prevent background logo/text bleeding into foreground text */}
                            <div className="absolute inset-0 bg-gradient-to-b sm:bg-gradient-to-r from-[#014B3B]/85 via-[#0B3D2E]/80 to-[#014B3B]/75 sm:from-[#014B3B]/80 sm:via-[#0B3D2E]/70 sm:to-[#014B3B]/50 z-1" />
                            <div className="absolute inset-0 bg-[#0B3D2E]/40 z-1" />
                        </div>

                        <div className="relative z-10 max-w-5xl mx-auto space-y-8 sm:space-y-12">
                            {/* Section Header */}
                            <div className="text-center space-y-3 px-2">
                                <div>
                                    <span className="inline-block text-[10px] sm:text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#50C878] bg-[#004B3B]/80 px-3 py-1 rounded-full border border-[#50C878]/30 backdrop-blur-md shadow-sm">
                                        Flexible Unit Dimensions
                                    </span>
                                </div>
                                <h2 className="text-2xl sm:text-4xl font-serif uppercase tracking-wide text-white drop-shadow-md leading-tight">
                                    Packaging Portfolio Sizing
                                </h2>
                            </div>

                            {/* Carousel Card Container */}
                            <div className="relative border border-white/10 rounded-2xl p-4 sm:p-10 shadow-2xl min-h-[320px] flex flex-col justify-between overflow-hidden bg-white/95 backdrop-blur-md">

                                {/* Navigation Buttons: Responsive Positioning */}
                                <div className="absolute inset-y-0 left-1 sm:left-3 flex items-center z-30">
                                    <button
                                        onClick={() => setCarouselIndex((prev) => (prev - 1 + CAROUSEL_IMAGES.length) % CAROUSEL_IMAGES.length)}
                                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#004B3B] hover:bg-[#50C878] hover:text-[#004B3B] text-white flex items-center justify-center transition-all shadow-lg active:scale-95"
                                        aria-label="Previous Slide"
                                    >
                                        <FiArrowLeft size={18} />
                                    </button>
                                </div>

                                <div className="absolute inset-y-0 right-1 sm:right-3 flex items-center z-30">
                                    <button
                                        onClick={() => setCarouselIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length)}
                                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#004B3B] hover:bg-[#50C878] hover:text-[#004B3B] text-white flex items-center justify-center transition-all shadow-lg active:scale-95"
                                        aria-label="Next Slide"
                                    >
                                        <FiArrowRight size={18} />
                                    </button>
                                </div>

                                {/* Content Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center w-full relative z-10 py-2 sm:py-4 px-8 sm:px-12">
                                    {/* Image Column */}
                                    <div className="md:col-span-4 w-full flex justify-center">
                                        <div className="relative w-36 sm:w-44 h-48 sm:h-56 rounded-xl overflow-hidden border border-slate-200 shadow-md bg-[#FAF9F5] flex items-center justify-center p-3">
                                            {CAROUSEL_IMAGES[carouselIndex] && (
                                                <img
                                                    src={CAROUSEL_IMAGES[carouselIndex].image}
                                                    alt={`Prakriti Pack Format - ${CAROUSEL_IMAGES[carouselIndex].size}`}
                                                    className="w-full h-full object-contain"
                                                />
                                            )}
                                            <div className="absolute bottom-2 left-2 bg-[#004B3B] text-[#50C878] text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                                                {CAROUSEL_IMAGES[carouselIndex]?.size}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Text Column */}
                                    <div className="md:col-span-8 space-y-3 text-center md:text-left">
                                        <div>
                                            <span className="inline-flex items-center text-[9px] font-mono uppercase tracking-widest text-[#004B3B] bg-[#50C878]/30 px-2.5 py-1 rounded-sm font-bold">
                                                {CAROUSEL_IMAGES[carouselIndex]?.format}
                                            </span>
                                        </div>
                                        <h3 className="text-xl sm:text-3xl font-serif text-[#0B3D2E] font-bold">
                                            {CAROUSEL_IMAGES[carouselIndex]?.size} Format
                                        </h3>
                                        <p className="text-slate-600 font-sans font-light text-xs sm:text-sm leading-relaxed max-w-xl mx-auto md:mx-0">
                                            {CAROUSEL_IMAGES[carouselIndex]?.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Carousel Indicators */}
                                <div className="flex justify-center items-center gap-2 pt-4 border-t border-slate-100 relative z-10">
                                    {CAROUSEL_IMAGES.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCarouselIndex(idx)}
                                            className={`h-1.5 transition-all rounded-full ${carouselIndex === idx ? 'bg-[#004B3B] w-6' : 'bg-slate-200 w-1.5'}`}
                                            aria-label={`Go to slide ${idx + 1}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* BUYER TESTIMONIAL COVERFLOW */}
                    <section className="relative py-6 sm:py-8 bg-[#0B3D2E] px-4 sm:px-6 lg:px-8 border-t border-[#50C878]/15 overflow-hidden">
                        <TestimonialSectionBackground accentColor={TEA_ACCENT} />
                        <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                            <div className="text-center lg:text-left">
                                <span className="inline-block text-[10px] sm:text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#50C878] bg-[#004B3B]/80 px-3 py-1 rounded-full border border-[#50C878]/30 mb-3">
                                    Trusted By Buyers Worldwide
                                </span>
                                <h2 className="text-xl sm:text-3xl font-serif uppercase tracking-wide text-white drop-shadow-md leading-tight mb-4">
                                    Why Trade Partners Choose Prakriti
                                </h2>
                                <p className="text-[#C5E3D3] text-xs sm:text-sm font-light leading-relaxed max-w-md mx-auto lg:mx-0">
                                    {TEA_TRUST_PARAGRAPH}
                                </p>
                            </div>

                            <div className="relative">
                                <TestimonialCoverflow
                                    items={teaTestimonials}
                                    accentColor={TEA_ACCENT}
                                    accentTextColor={TEA_ACCENT_TEXT}
                                    aspectClass="aspect-[3/4]"
                                />
                            </div>
                        </div>
                    </section>
                </>
            )}

            {/* ================= LAYER 5: BULK ORDER DRAWER AND ENQUIRY BENCH ================= */}
            <AnimatePresence>
                {isOrderDrawerOpen && activeDrawerLot && (
                    <div className="fixed inset-0 z-50 overflow-hidden">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={() => setIsOrderDrawerOpen(false)} />
                        <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'tween', duration: 0.3 }}
                                className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between"
                            >
                                <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 text-left flex-1">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                                        <h2 className="text-base sm:text-xl font-serif text-[#004B3B] uppercase tracking-wide">Initialize Trade Negotiation</h2>
                                        <button onClick={() => setIsOrderDrawerOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-md bg-slate-100"><FiX size={18} /></button>
                                    </div>

                                    <div className="bg-[#FAF9F5] border border-slate-200 rounded-xl p-3.5 space-y-2">
                                        <span className="text-[9px] font-mono bg-[#004B3B] text-[#50C878] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Lot Target: {activeDrawerLot.id}</span>
                                        <div className="text-xs sm:text-sm font-bold text-slate-900 font-serif">{activeDrawerLot.region}</div>
                                        <div className="text-xs text-slate-600">Grade Configuration: <span className="font-mono font-bold">{activeDrawerLot.grade}</span></div>
                                        <div className="text-xs text-slate-600">Base Sourcing Price: <span className="font-bold text-[#004B3B]">INR {activeDrawerLot.price}/Kg</span></div>
                                        <div className="text-xs text-slate-600">Active Pipeline Allocation: <span className="font-mono">{activeDrawerLot.stock}</span></div>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">Negotiation Target Quantity (Kilograms) *</label>
                                            <input
                                                type="number"
                                                min="200"
                                                value={orderQuantity}
                                                onChange={(e) => setOrderQuantity(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono focus:outline-none focus:border-[#004B3B] text-xs"
                                            />
                                            <span className="text-[9px] text-slate-400 mt-1 block">Minimum commercial lot dispatch constraint matches 200 Kg configurations.</span>
                                        </div>
                                        <div className="bg-emerald-50 border border-dashed border-emerald-200 rounded-lg p-3 flex gap-2">
                                            <FiInfo className="text-emerald-700 shrink-0 mt-0.5" size={14} />
                                            <p className="text-[10px] text-emerald-800 font-light leading-relaxed">
                                                By executing this pipeline commitment, your intent metric maps directly to the active garden allocation layout. Trade desk support answers confirmations within minutes.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 space-y-3 shrink-0 shadow-lg">
                                    <div className="flex items-center justify-between font-mono text-xs">
                                        <span className="text-slate-500 font-bold uppercase">Estimated Lot Base Value:</span>
                                        <span className="text-[#004B3B] font-extrabold text-sm sm:text-base">INR {(Number(orderQuantity || 0) * Number(activeDrawerLot.price)).toLocaleString()}</span>
                                    </div>
                                    <OrderButton
                                        action={async () => {
                                            if (!orderQuantity || Number(orderQuantity) < 200) {
                                                toast.error("Minimum quantity constraint matches 200 Kg configurations.");
                                                throw new Error('validation');
                                            }

                                            const proposalPayload = {
                                                distributorId: distributorId,
                                                division: 'TEA',
                                                lotId: activeDrawerLot.id,
                                                region: activeDrawerLot.region,
                                                grade: activeDrawerLot.grade,
                                                quantity: Number(orderQuantity),
                                                basePrice: Number(activeDrawerLot.price)
                                            };

                                            let res;
                                            try {
                                                res = await distributorApi.createProposal(proposalPayload);
                                            } catch (err) {
                                                console.error(err);
                                                toast.error(err.response?.data?.message || "Failed to route custom sourcing proposal.");
                                                throw err;
                                            }

                                            if (!res.success) {
                                                toast.error(res.message || "Failed to route custom sourcing proposal.");
                                                throw new Error('api_failure');
                                            }

                                            toast.success(`Trade proposal submitted for ${orderQuantity} Kg of lot ${activeDrawerLot.id}.`);
                                            pushDataLayerEvent('tea_proposal_submitted', {
                                                lot_id: activeDrawerLot.id,
                                                quantity: Number(orderQuantity),
                                                value: Number(orderQuantity) * Number(activeDrawerLot.price || 0),
                                                currency: 'INR'
                                            });
                                            fetchMyProposals();
                                        }}
                                        onDone={() => setIsOrderDrawerOpen(false)}
                                        icon={FiShoppingCart}
                                        idleLabel="Dispatch Sourcing Request"
                                        busyLabel="Dispatching..."
                                        doneLabel="Request Dispatched"
                                        className="w-full bg-[#004B3B] hover:bg-[#053127] active:scale-98 text-white text-xs font-mono font-bold uppercase tracking-wider py-3.5 rounded-lg shadow-md cursor-pointer disabled:cursor-default disabled:opacity-90"
                                    />
                                </div>
                            </motion.div>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx="true" global="true">{`
                .scrollbar-none::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-none {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .whitespace-nowrap {
                    white-space: normal !important;
                }
                @media (min-width: 640px) {
                    .whitespace-nowrap {
                        white-space: nowrap !important;
                    }
                }
            `}</style>
        </div>
    );
}
