import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
    FiShield, FiBriefcase, FiFileText, FiCheckCircle, FiArrowRight, FiArrowLeft, 
    FiUser, FiPhone, FiMapPin, FiKey, FiUploadCloud, FiX, FiAward, FiCompass, 
    FiLayers, FiLock, FiEye, FiDownload, FiFilter, FiShoppingCart, FiInfo
} from 'react-icons/fi';
import { GiThreeLeaves, GiTeapot, GiBoxUnpacking, GiCargoShip } from "react-icons/gi";

import { distributorApi } from '../../api/distributor';

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

const SOURCING_REGIONS = [
    { name: "Assam Garden Track", traits: "Produces a powerful, deep strong liquor with an exceptionally bold, brisk character and dependable daily tea profiles." },
    { name: "Darjeeling Heights", traits: "Prized for its premium market positioning, featuring highly distinctive, aroma-forward, and sophisticated fine leaf selections." },
    { name: "Dooars Plains", traits: "Incredibly versatile tea varieties combining balanced flavor characteristics, strong color, and broad market fit use. " },
    { name: "Siliguri Corridor", traits: "Serves as our strategic logistical aggregation and sourcing route, ensuring flawless consistency across varied tea profiles." }
];

const TEA_GRADES = [
    { code: "Dust Tea", desc: "Strong liquor execution optimized for commercial brewing and intense high-volume extraction requirements. " },
    { code: "BP (Broken Pekoe)", desc: "Offers a perfectly balanced body and sweet aroma profile for dependable daily family consumer tiers." },
    { code: "BOP (Broken Orange Pekoe)", desc: "A popular leaf grade that infuses with intense color, rich brisk character, and clean presentation." },
    { code: "BOPSM (Fine Broken)", desc: "Fine broken grade engineered specifically for quick, strong, brisk cups required in commercial tea setups." },
    { code: "OF (Orange Fannings)", desc: "Fine grade layout built for rapid color release and quick steeping profiles inside fast-paced services." },
    { code: "Pekoe Tea", desc: "Leaf tea option designed for premium aroma-led retail positioning across high-end gourmet shelves." }
];

const PUBLIC_CATEGORIES = [
    { title: "CTC Tea", icon: GiThreeLeaves, desc: "Robust, granular varieties providing deep liquor extract, crisp color peaks, and excellent body fit for daily boiling blends." },
    { title: "Orthodox Tea", icon: GiTeapot, desc: "Traditional whole-leaf treatments carefully processed to capture high natural aromatics and delicate multi-tonal cups." },
    { title: "Green Tea", icon: GiThreeLeaves, desc: "Antioxidant-rich configurations selected explicitly for high brightness, clear flavor notes, and stable market positioning." },
    { title: "Dust Tea", icon: GiThreeLeaves, desc: "Finely milled for exceptional quick-steeping liquor strength; highly favored for fast mass commercial brewing." },
    { title: "Premium Garden Tea", icon: FiAward, desc: "Direct, unblended lot assets hand-selected across premium seasonal pluckings to retain absolute single-origin integrity." },
    { title: "Bulk Tea for Traders", icon: GiBoxUnpacking, desc: "High-volume, loose invoice lots arranged purposefully for brokers, localized blending setups, and commodity merchants." },
    { title: "Hotel, Café & Distributor Lines", icon: FiBriefcase, desc: "Standardized flavor profiles matched for commercial consistency, stable cost bases, and prolonged service workflows." },
    { title: "Export-Grade Tea", icon: GiCargoShip, desc: "Compliant tea selections optimized against heavy food safety regulations and international cargo standards." }
];

const TEASER_LISTINGS = [
    { id: 1, region: "Siliguri Corridor", type: "CTC Blend Lot", baseGrade: "BP / BOPSM Mix", package: "30 kg / 35 kg Bags", use: "Wholesale Distribution / Blending" },
    { id: 2, region: "Assam Garden Track", type: "Export-Grade Leaf", baseGrade: "Pekoe / BOP Premium", package: "25 kg Crafts Bags", use: "International Cargo / Premium Brands" },
    { id: 3, region: "Dooars Plains", type: "Bulk Commercial Dust", baseGrade: "Fine Dust Grade", package: "35 kg Bulk Sacks", use: "High Volume Tea Stalls & Cafés" },
    { id: 4, region: "Darjeeling Heights", type: "Fine Orthodox Lots", baseGrade: "TGFOP Whole Leaf", package: "20 kg Traditional Chests", use: "Gourmet Brands / Private Label" }
];

const APPROVED_MARKETPLACE_DATA = [
    { id: "PK-AS-091", region: "Assam Upper Track", grade: "BP (Broken Pekoe)", color: "Deep Mahogany", strength: "9.5/10", stock: "14,200 Kg", price: "210", dispatch: "Siliguri Hub", type: "CTC Tea" },
    { id: "PK-DJ-104", region: "Darjeeling Premium", grade: "TGFOP1 Whole Leaf", color: "Bright Amber", strength: "6.0/10", stock: "3,100 Kg", price: "420", dispatch: "Kolkata Port", type: "Orthodox Tea" },
    { id: "PK-DO-072", region: "Dooars Western", grade: "BOP (Broken Orange Pekoe)", color: "Rich Crimson", strength: "8.5/10", stock: "9,500 Kg", price: "165", dispatch: "Siliguri Hub", type: "CTC Tea" },
    { id: "PK-ST-110", region: "Commercial Blend", grade: "Super Fine Dust", color: "Intense Opaque", strength: "10/10", stock: "22,000 Kg", price: "135", dispatch: "Guwahati Desk", type: "Dust Tea" }
];

export default function Prakriti() {
    const [userAccessLayer, setUserAccessLayer] = useState(1); 
    const [isSessionLoading, setIsLoadingSession] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [step, setStep] = useState('register');
    const [distributorId, setDistributorId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [heroBgIndex, setHeroBgIndex] = useState(0);
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [activeTab, setActiveTab] = useState('programme');

    // Marketplace Interactive Variables
    const [selectedMarketCategory, setSelectedMarketCategory] = useState('All');
    const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
    const [activeDrawerLot, setActiveDrawerLot] = useState(null);
    const [orderQuantity, setOrderQuantity] = useState('500');

    const [businessType, setBusinessType] = useState('1');
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');
    const [mobile, setMobile] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [country, setCountry] = useState('India');
    const [teaType, setTeaType] = useState('CTC Tea');
    const [monthlyReq, setMonthlyReq] = useState('');
    const [purpose, setPurpose] = useState('');
    const [doc1, setDoc1] = useState(null);
    const [doc2, setDoc2] = useState(null);
    const [otp, setOtp] = useState('');

    // Session Verification Lifecycle on Mount
    useEffect(() => {
        const initializeAuthenticationSession = async () => {
            const savedId = localStorage.getItem('prakriti_distributor_id');
            const token = localStorage.getItem('distributor_token');

            if (savedId) {
                setDistributorId(savedId);
                try {
                    const res = await distributorApi.getDistributorStatus(savedId);
                    if (res.success) {
                        const status = res.data.approvalStatus;
                        if (status === 'approved' && token) {
                            setUserAccessLayer(5);
                        } else if (status === 'pending') {
                            setUserAccessLayer(4);
                        } else {
                            setUserAccessLayer(1);
                            localStorage.removeItem('prakriti_distributor_id');
                            localStorage.removeItem('distributor_token');
                        }
                    }
                } catch (err) {
                    console.error("Session re-alignment synchronization failure:", err);
                    setUserAccessLayer(1);
                }
            }
            setIsLoadingSession(false);
        };
        initializeAuthenticationSession();
    }, []);

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
                            toast.error("Sourcing credentials could not be verified by trade desk validation.");
                            clearInterval(pollingTimer);
                            localStorage.removeItem('prakriti_distributor_id');
                            localStorage.removeItem('distributor_token');
                            setUserAccessLayer(1);
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

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!name.trim()) return toast.error("Applicant Name is a required field.");
        if (!company.trim()) return toast.error("Company Name is a required field.");
        if (!email.trim()) return toast.error("Corporate Email Address is a required field.");
        if (!mobile.trim()) return toast.error("Mobile Line Contact is a required field.");
        if (!address.trim()) return toast.error("Physical Operating Address is a required field.");
        
        if (['1', '2', '3'].includes(businessType) && !doc1) {
            return toast.error("Compliance Enforced: GST Certificate or Udyam Registration file is required.");
        }
        if (businessType === '4' && !doc1) {
            return toast.error("Compliance Enforced: FSSAI License or GST Certificate upload is required.");
        }
        if (['5', '6', '7'].includes(businessType) && (!doc1 || !doc2)) {
            return toast.error("Compliance Enforced: Dual documentation stack required for verification.");
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
        data.append('teaType', teaType);
        data.append('monthlyReq', monthlyReq);
        data.append('purpose', purpose);
        data.append('businessType', businessType);
        data.append('division', 'TEA');
        
        if (doc1) data.append('doc1', doc1);
        if (doc2) data.append('doc2', doc2);

        try {
            const res = await distributorApi.registerDistributor(data);
            if (res.success) {
                toast.success(res.message || "B2B profile recorded. Verification code routed to your email.");
                setDistributorId(res.data.distributorId);
                localStorage.setItem('prakriti_distributor_id', res.data.distributorId);
                setStep('otp');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Registration sequence fault. Please verify files.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otp.length < 6) return toast.error("Security code parameters must be 6 digits.");

        setIsSubmitting(true);
        try {
            const res = await distributorApi.verifyOtp(distributorId, otp);
            if (res.success) {
                toast.success(res.message || "B2B Credentials Authenticated!");
                if (res.data.token) {
                    localStorage.setItem('distributor_token', res.data.token);
                }
                setIsModalOpen(false);
                setStep('register');
                setUserAccessLayer(4); 
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setName(''); setCompany(''); setEmail(''); setMobile(''); setAddress('');
                setCity(''); setState(''); setDoc1(null); setDoc2(null); setOtp('');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Invalid or expired security code token entry.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogOut = () => {
        setUserAccessLayer(1);
        setDistributorId('');
        localStorage.removeItem('prakriti_distributor_id');
        localStorage.removeItem('distributor_token');
        toast.success("Secured session token terminated.");
    };

    const filteredMarketLots = APPROVED_MARKETPLACE_DATA.filter(lot => 
        selectedMarketCategory === 'All' ? true : lot.type === selectedMarketCategory
    );

    if (isSessionLoading) {
        return (
            <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center">
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
                <div className="min-h-[80vh] flex items-center justify-center py-20 px-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl bg-white rounded-2xl p-8 sm:p-12 shadow-2xl border border-slate-200 text-center space-y-6">
                        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-600 rounded-full flex items-center justify-center mx-auto text-2xl animate-pulse">
                            <FiCompass />
                        </div>
                        <h2 className="text-3xl font-serif text-[#0B3D2E] uppercase tracking-wide">Account Under Review</h2>
                        <div className="w-16 h-[2px] bg-amber-500 mx-auto" />
                        <p className="text-slate-600 text-sm leading-relaxed max-w-lg mx-auto font-light">
                            “Your Prakriti Tea buyer account is under review. Our team is verifying your business documents. You will receive confirmation within 24 hours once your account is approved.”
                        </p>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left text-xs text-slate-500 space-y-1.5 max-w-md mx-auto">
                            <div className="font-bold text-[#004B3B] uppercase tracking-wider text-[10px] mb-1 font-mono">STATUTORY CHECKLIST PIPELINE:</div>
                            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Database Cross-Reference Matching (GSTIN / FSSAI / IEC)</div>
                            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Procurement Scale and Cargo Volume Authenticity Verification</div>
                        </div>
                        <div className="pt-4">
                            <button onClick={() => setUserAccessLayer(1)} className="text-[10px] font-mono text-[#004B3B] hover:text-[#50C878] uppercase tracking-wider underline underline-offset-4">
                                Return to Public Storefront View
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* ================= LAYER 5: APPROVED TEA BUYER MARKETPLACE ================= */}
            {userAccessLayer === 5 && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 animate-fadeIn">
                    <div className="bg-[#004B3B] rounded-2xl p-6 sm:p-8 border border-[#50C878]/30 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl relative overflow-hidden text-white">
                        <div className="space-y-1.5 relative z-10">
                            <div className="inline-flex items-center gap-1.5 bg-[#50C878]/20 border border-[#50C878]/40 px-3 py-1 rounded-full text-[10px] font-mono font-bold text-[#50C878]">
                                <FiCheckCircle /> CREDENTIAL TOKEN ACCREDITED
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-serif uppercase tracking-wide">Prakriti Verified Buyer Marketplace</h2>
                            <p className="text-xs text-slate-300 font-light max-w-xl">
                                Welcome verified trading partner. You are officially synchronized into live inventory metrics, active lot configurations, and fresh wholesale price indexes.
                            </p>
                        </div>
                        <div className="shrink-0 relative z-10">
                            <button onClick={handleLogOut} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono text-[9px] sm:text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-lg transition-colors">
                                Lock Session Terminal
                            </button>
                        </div>
                    </div>

                    {/* Bulk Order Filter Systems */}
                    <div className="flex flex-wrap gap-2 items-center justify-between border-b border-slate-200 pb-4">
                        <div className="flex flex-wrap gap-1.5">
                            {['All', 'CTC Tea', 'Orthodox Tea', 'Dust Tea'].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedMarketCategory(cat)}
                                    className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-md font-bold transition-all ${
                                        selectedMarketCategory === cat 
                                        ? 'bg-[#004B3B] text-[#50C878] shadow-sm' 
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest">{filteredMarketLots.length} Active Lots Loaded</span>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-serif text-xl text-[#0B3D2E] uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#50C878]" /> Active Sourcing Lots & Live Pricing Matrix
                        </h3>
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-[#0B3D2E] text-white font-mono uppercase tracking-wider text-[10px]">
                                        <th className="p-4 border-b border-slate-200">Lot Tracking HASH</th>
                                        <th className="p-4 border-b border-slate-200">Appellation / Origin Tract</th>
                                        <th className="p-4 border-b border-slate-200">Industrial Leaf Grade</th>
                                        <th className="p-4 border-b border-slate-200">Liquor Character</th>
                                        <th className="p-4 border-b border-slate-200">Live Inventory</th>
                                        <th className="p-4 border-b border-slate-200 text-[#50C878]">Wholesale Price</th>
                                        <th className="p-4 border-b border-slate-200 text-center">Action Deck</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                                    {filteredMarketLots.map((row) => (
                                        <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="p-4 font-mono font-bold text-[#004B3B]">{row.id}</td>
                                            <td className="p-4">
                                                <div className="font-semibold">{row.region}</div>
                                                <div className="text-[10px] text-slate-400 font-mono italic">Origin Asset Encrypted</div>
                                            </td>
                                            <td className="p-4 font-bold text-slate-900">{row.grade}</td>
                                            <td className="p-4">
                                                <div>Color: {row.color}</div>
                                                <div className="text-[10px] text-slate-400">Strength Indicator: {row.strength}</div>
                                            </td>
                                            <td className="p-4 font-mono">{row.stock}</td>
                                            <td className="p-4 font-mono font-bold text-base text-[#004B3B]">INR {row.price}/Kg</td>
                                            <td className="p-4 text-center space-x-1.5 whitespace-nowrap">
                                                <button onClick={() => toast.success(`Sample request generated for Lot ${row.id}`)} className="bg-slate-100 hover:bg-[#50C878] hover:text-[#004B3B] text-slate-700 px-3 py-1.5 rounded font-mono font-bold uppercase tracking-wider text-[9px] sm:text-[10px] transition-colors">
                                                    Request Sample
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setActiveDrawerLot(row);
                                                        setIsOrderDrawerOpen(true);
                                                    }} 
                                                    className="bg-[#004B3B] hover:bg-[#06362a] text-white px-3 py-1.5 rounded font-mono font-bold uppercase tracking-wider text-[9px] sm:text-[10px] transition-colors"
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
            )}

            {/* ================= LAYER 1 & LAYER 2: PUBLIC VIEWS ================= */}
            {userAccessLayer <= 2 && (
                <>
                    {/* ================= LAYER 1: PUBLIC TEA STOREFRONT HERO ================= */}
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
                                        onClick={() => setIsModalOpen(true)}
                                        className="bg-[#50C878] hover:bg-[#40b064] text-[#0B3D2E] text-[9px] sm:text-xs font-mono font-bold uppercase tracking-wider px-6 sm:px-8 py-3.5 sm:py-4 rounded-lg shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
                                    >
                                        Verify Business to View Price
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
                                    { label: "Sourcing Lot Spectrum", value: "200–300 Choices", desc: "Sourced continuously across seasonal pluckings from vetted garden desks. " },
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

                    {/* ================= LAYER 2: TEA TEASER DECK (BLURRED INVOICES) ================= */}
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
                                                onClick={() => setIsModalOpen(true)} 
                                                className="w-full bg-white/5 hover:bg-[#50C878] text-white hover:text-[#004B3B] text-[9px] sm:text-xs font-mono font-bold uppercase tracking-wider py-3 px-2 rounded-lg border border-white/10 transition-all text-center flex items-center justify-center"
                                            >
                                                <span className="tracking-tight">Verify Business For Bulk Rates</span>
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
                                    className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-3.5 text-[9px] sm:text-xs font-bold uppercase tracking-wider transition-all border-b-2 text-center w-full sm:w-auto rounded-t-md ${
                                        activeTab === tab.id 
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
                                                onClick={() => setIsModalOpen(true)}
                                                className="bg-[#004B3B] hover:bg-[#06362a] text-[#50C878] font-mono text-[9px] sm:text-xs font-bold uppercase tracking-wider px-4 sm:px-10 py-3.5 sm:py-4 rounded-lg shadow-md transition-all inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                                            >
                                                <FiBriefcase className="shrink-0" /> 
                                                <span>Open Authorization Form</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </section>

                    {/* VOLUMETRIC CONTAINER CAROUSEL */}
                    <section className="relative py-24 bg-[#0B3D2E] text-slate-900 px-4 sm:px-6 lg:px-8 border-t border-slate-200 overflow-hidden">
                        <div className="absolute inset-0 z-0">
                            <img
                                src='/images/Prakriti Image.jpeg'
                                alt="Cinematic Volumetric Context Background"
                                className="w-full h-full object-cover object-center"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#014B3B]/40 via-[#0B3D2E]/30 to-[#014B3B]/40 mix-blend-multiply z-1" />
                            <div className="absolute inset-0 bg-[#0B3D2E]/20 z-1" />
                        </div>

                        <div className="relative z-10 max-w-5xl mx-auto space-y-12">
                            <div className="text-center space-y-2">
                                <span className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#50C878] bg-[#004B3B]/60 px-3 py-1 rounded-full border border-[#50C878]/20 backdrop-blur-xs">
                                    Flexible Unit Dimensions
                                </span>
                                <h2 className="text-3xl sm:text-4xl font-serif uppercase tracking-wide text-white drop-shadow-md">
                                    Packaging Portfolio Sizing
                                </h2>
                            </div>

                            <div className="relative border border-white/10 rounded-2xl p-6 sm:p-10 shadow-2xl min-h-[300px] flex flex-col justify-between overflow-hidden bg-white/95 backdrop-blur-md">
                                <div className="absolute inset-y-0 left-2 flex items-center z-30">
                                    <button
                                        onClick={() => setCarouselIndex((prev) => (prev - 1 + CAROUSEL_IMAGES.length) % CAROUSEL_IMAGES.length)}
                                        className="w-10 h-10 rounded-full bg-[#004B3B] hover:bg-[#50C878] hover:text-[#004B3B] text-white flex items-center justify-center transition-colors shadow-md"
                                    >
                                        <FiArrowLeft />
                                    </button>
                                </div>
                                <div className="absolute inset-y-0 right-2 flex items-center z-30">
                                    <button
                                        onClick={() => setCarouselIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length)}
                                        className="w-10 h-10 rounded-full bg-[#004B3B] hover:bg-[#50C878] hover:text-[#004B3B] text-white flex items-center justify-center transition-colors shadow-md"
                                    >
                                        <FiArrowRight />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center w-full relative z-10 py-4 px-6">
                                    <div className="md:col-span-4 w-full flex justify-center">
                                        <div className="relative w-40 h-52 rounded-xl overflow-hidden border border-slate-200 shadow-lg bg-[#FAF9F5] flex items-center justify-center p-4">
                                            {CAROUSEL_IMAGES[carouselIndex] && (
                                                <img
                                                    src={CAROUSEL_IMAGES[carouselIndex].image}
                                                    alt={`Prakriti Pack Format - ${CAROUSEL_IMAGES[carouselIndex].size}`}
                                                    className="w-full h-full object-contain"
                                                />
                                            )}
                                            <div className="absolute bottom-2 left-2 bg-[#004B3B] text-[#50C878] text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                                                {CAROUSEL_IMAGES[carouselIndex].size}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:col-span-8 space-y-4 text-center md:text-left">
                                        <span className="inline-flex items-center text-[9px] font-mono uppercase tracking-widest text-[#004B3B] bg-[#50C878]/30 px-2.5 py-0.5 rounded-sm font-bold">
                                            {CAROUSEL_IMAGES[carouselIndex].format}
                                        </span>
                                        <h3 className="text-2xl sm:text-3xl font-serif text-[#0B3D2E] font-bold">{CAROUSEL_IMAGES[carouselIndex].size} Format</h3>
                                        <p className="text-slate-600 font-sans font-light text-xs sm:text-sm leading-relaxed">
                                            {CAROUSEL_IMAGES[carouselIndex].description}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex justify-center items-center gap-2 pt-4 border-t border-slate-100 relative z-10">
                                    {CAROUSEL_IMAGES.map((_, idx) => (
                                        <button
                                            document_key={idx}
                                            key={idx}
                                            onClick={() => setCarouselIndex(idx)}
                                            className={`h-1.5 transition-all rounded-full ${carouselIndex === idx ? 'bg-[#004B3B] w-6' : 'bg-slate-200 w-1.5'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                </>
            )}

            {/* ================= LAYER 3: REGISTRATION OVERLAY MODAL ================= */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 my-8"
                        >
                            <div className="bg-[#004B3B] text-white p-6 sm:p-8 space-y-1 relative text-left">
                                <button onClick={() => { setIsModalOpen(false); setStep('register'); }} className="absolute top-6 right-6 text-slate-300 hover:text-white"><FiX size={20} /></button>
                                <div className="flex items-center gap-1.5 text-[#50C878]"><span className="text-[9px] tracking-[0.2em] font-mono font-extrabold uppercase">Layer 3 Verification Registry</span></div>
                                <h2 className="text-2xl font-serif text-white">Tea Buyer Sourcing Registry</h2>
                            </div>

                            <div className="p-6 sm:p-8 text-left max-h-[70vh] overflow-y-auto">
                                {step === 'register' ? (
                                    <form onSubmit={handleRegister} className="space-y-5 text-xs">
                                        <div>
                                            <label className="block text-[11px] font-sans font-extrabold uppercase tracking-wide text-[#004B3B] mb-1.5">Select Buyer Classification Category *</label>
                                            <select value={businessType} onChange={(e) => { setBusinessType(e.target.value); setDoc1(null); setDoc2(null); }} className="w-full bg-slate-50 border border-slate-200 rounded-md p-3 text-slate-800 font-medium focus:outline-none focus:border-[#004B3B]">
                                                <option value="1">Domestic Tea Trader</option>
                                                <option value="2">Tea Wholesaler</option>
                                                <option value="3">Tea Distributor</option>
                                                <option value="4">Hotel / Café / Restaurant Buyer</option>
                                                <option value="5">Export Buyer</option>
                                                <option value="6">Private Label Buyer</option>
                                                <option value="7">Retail Brand Buyer</option>
                                            </select>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[11px] font-sans font-extrabold uppercase tracking-wide text-slate-600 mb-1.5">Full Name *</label>
                                                    <input type="text" required placeholder="Satyam Raj" className="w-full bg-slate-50 border border-slate-200 rounded-md p-3 text-slate-800 focus:outline-none focus:border-[#004B3B]" value={name} onChange={(e) => setName(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-sans font-extrabold uppercase tracking-wide text-slate-600 mb-1.5">Company Name *</label>
                                                    <input type="text" required placeholder="Enter Company Name" className="w-full bg-slate-50 border border-slate-200 rounded-md p-3 text-slate-800 focus:outline-none focus:border-[#004B3B]" value={company} onChange={(e) => setCompany(e.target.value)} />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[11px] font-sans font-extrabold uppercase tracking-wide text-slate-600 mb-1.5">Mobile Number *</label>
                                                    <input type="tel" required placeholder="+91 XXXXX XXXXX" className="w-full bg-slate-50 border border-slate-200 rounded-md p-3 text-slate-800 focus:outline-none focus:border-[#004B3B]" value={mobile} onChange={(e) => setMobile(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-sans font-extrabold uppercase tracking-wide text-slate-600 mb-1.5">Email Address *</label>
                                                    <input type="email" required placeholder="buyer@enterprise.com" className="w-full bg-slate-50 border border-slate-200 rounded-md p-3 text-slate-800 focus:outline-none focus:border-[#004B3B]" value={email} onChange={(e) => setEmail(e.target.value)} />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-sans font-extrabold uppercase tracking-wide text-slate-600 mb-1.5">Business Address *</label>
                                                <input type="text" required placeholder="Physical Operating Address" className="w-full bg-slate-50 border border-slate-200 rounded-md p-3 text-slate-800 focus:outline-none focus:border-[#004B3B]" value={address} onChange={(e) => setAddress(e.target.value)} />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-[11px] font-sans font-extrabold uppercase tracking-wide text-slate-600 mb-1.5">City *</label>
                                                    <input type="text" required placeholder="City" className="w-full bg-slate-50 border border-slate-200 rounded-md p-3 text-slate-800 focus:outline-none focus:border-[#004B3B]" value={city} onChange={(e) => setCity(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-sans font-extrabold uppercase tracking-wide text-slate-600 mb-1.5">State *</label>
                                                    <input type="text" required placeholder="State" className="w-full bg-slate-50 border border-slate-200 rounded-md p-3 text-slate-800 focus:outline-none focus:border-[#004B3B]" value={state} onChange={(e) => setState(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-sans font-extrabold uppercase tracking-wide text-slate-600 mb-1.5">Country *</label>
                                                    <input type="text" required placeholder="Country" className="w-full bg-slate-50 border border-slate-200 rounded-md p-3 text-slate-800 focus:outline-none focus:border-[#004B3B]" value={country} onChange={(e) => setCountry(e.target.value)} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-2">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[11px] font-sans font-extrabold uppercase tracking-wide text-slate-600 mb-1.5">Required Tea Type *</label>
                                                    <select value={teaType} onChange={(e) => setTeaType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-md p-3 text-slate-800 focus:outline-none focus:border-[#004B3B]">
                                                        <option>CTC Tea</option>
                                                        <option>Orthodox Tea</option>
                                                        <option>Green Tea</option>
                                                        <option>Dust Tea</option>
                                                        <option>Premium Garden Tea</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-sans font-extrabold uppercase tracking-wide text-slate-600 mb-1.5">Monthly Requirement (Kg) *</label>
                                                    <input type="number" required placeholder="Approx. Demand Scale" className="w-full bg-slate-50 border border-slate-200 rounded-md p-3 text-slate-800 focus:outline-none focus:border-[#004B3B]" value={monthlyReq} onChange={(e) => setMonthlyReq(e.target.value)} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-sans font-extrabold uppercase tracking-wide text-slate-600 mb-1.5">Purpose of Purchase *</label>
                                                <textarea rows="2" required placeholder="Describe corporate target lines..." className="w-full bg-slate-50 border border-slate-200 rounded-md p-3 text-slate-800 focus:outline-none focus:border-[#004B3B]" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-2">
                                            <div className="flex items-center gap-2 text-[#004B3B] border-b border-slate-100 pb-1.5">
                                                <FiShield size={13} />
                                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Compliance Attachments</span>
                                            </div>

                                            {['1', '2', '3'].includes(businessType) && (
                                                <div>
                                                    <label className="block text-[11px] font-sans font-extrabold uppercase tracking-wide text-slate-600 mb-2">Upload GST Certificate or Udyam Registration *</label>
                                                    <label className="flex flex-col items-center justify-center w-full h-24 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 hover:border-[#50C878] cursor-pointer p-4 text-center">
                                                        <FiUploadCloud size={20} className={doc1 ? "text-[#004B3B]" : "text-slate-400"} />
                                                        <span className="text-[10px] font-bold text-slate-700 mt-1 truncate max-w-full">{doc1 ? doc1.name : "Select Statutory PDF"}</span>
                                                        <input type="file" required className="hidden" onChange={(e) => setDoc1(e.target.files[0])} />
                                                    </label>
                                                </div>
                                            )}

                                            {businessType === '4' && (
                                                <div>
                                                    <label className="block text-[11px] font-sans font-extrabold uppercase tracking-wide text-slate-600 mb-2">Upload FSSAI License or GST Certificate *</label>
                                                    <label className="flex flex-col items-center justify-center w-full h-24 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 hover:border-[#50C878] cursor-pointer p-4 text-center">
                                                        <FiUploadCloud size={20} className={doc1 ? "text-[#004B3B]" : "text-slate-400"} />
                                                        <span className="text-[10px] font-bold text-slate-700 mt-1 truncate max-w-full">{doc1 ? doc1.name : "Select FSSAI or GST PDF"}</span>
                                                        <input type="file" required className="hidden" onChange={(e) => setDoc1(e.target.files[0])} />
                                                    </label>
                                                </div>
                                            )}

                                            {['5', '6', '7'].includes(businessType) && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[11px] font-sans font-extrabold uppercase tracking-wide text-slate-600 mb-2">{businessType === '5' ? 'IEC Certificate *' : 'FSSAI License *'}</label>
                                                        <label className="flex flex-col items-center justify-center w-full h-24 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 hover:border-[#50C878] cursor-pointer p-4 text-center">
                                                            <FiUploadCloud size={20} className={doc1 ? "text-[#004B3B]" : "text-slate-400"} />
                                                            <span className="text-[10px] font-bold text-slate-700 mt-1 truncate max-w-full">{doc1 ? doc1.name : "Upload Primary Doc"}</span>
                                                            <input type="file" required className="hidden" onChange={(e) => setDoc1(e.target.files[0])} />
                                                        </label>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-sans font-extrabold uppercase tracking-wide text-slate-600 mb-2">GST Certificate *</label>
                                                        <label className="flex flex-col items-center justify-center w-full h-24 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 hover:border-[#50C878] cursor-pointer p-4 text-center">
                                                            <FiUploadCloud size={20} className={doc2 ? "text-[#004B3B]" : "text-slate-400"} />
                                                            <span className="text-[10px] font-bold text-slate-700 mt-1 truncate max-w-full">{doc2 ? doc2.name : "Upload GST Certificate"}</span>
                                                            <input type="file" required className="hidden" onChange={(e) => setDoc2(e.target.files[0])} />
                                                        </label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-4">
                                            <button 
                                                type="submit" 
                                                disabled={isSubmitting} 
                                                className="w-full bg-[#004B3B] hover:bg-[#07362b] text-white font-mono font-bold text-[9px] sm:text-xs uppercase tracking-wider py-3.5 sm:py-4 rounded-md transition-all shadow-md flex items-center justify-center gap-2"
                                            >
                                                {isSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Confirm Details & Send OTP"}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <form onSubmit={handleVerifyOtp} className="space-y-6 max-w-md mx-auto text-center py-4">
                                        <div className="w-12 h-12 rounded-full bg-[#004B3B]/5 flex items-center justify-center text-[#004B3B] mx-auto"><FiKey size={20} /></div>
                                        <div className="space-y-1">
                                            <h3 className="text-lg font-serif text-[#004B3B]">Validate Secure Token</h3>
                                            <p className="text-xs text-slate-500 font-light leading-relaxed">Enter the 6-digit credential code routed to <span className="font-bold text-slate-700">{email}</span>.</p>
                                        </div>
                                        <div className="space-y-4">
                                            <input type="text" required maxLength="6" placeholder="0 0 0 0 0 0" className="w-full text-center bg-slate-50 border border-slate-200 rounded-lg py-3 text-lg font-mono tracking-[0.35em] text-slate-800 focus:outline-none focus:border-[#004B3B]" value={otp} onChange={(e) => setOtp(e.target.value)} />
                                            <div className="flex gap-3">
                                                <button type="button" className="w-1/3 border border-slate-200 hover:bg-slate-50 text-slate-500 font-mono uppercase tracking-wider text-[9px] sm:text-[10px] font-bold rounded-md" onClick={() => setStep('register')}>Edit</button>
                                                <button type="submit" className="w-2/3 bg-[#004B3B] hover:bg-[#07362b] text-white font-mono font-bold text-[9px] sm:text-xs uppercase tracking-wider py-3.5 rounded-md flex items-center justify-center">Verify & Authenticate</button>
                                            </div>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ================= LAYER 5: BULK ORDER DRAWER AND ENQUIRY BENCH ================= */}
            <AnimatePresence>
                {isOrderDrawerOpen && activeDrawerLot && (
                    <div className="fixed inset-0 z-50 overflow-hidden">
                        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={() => setIsOrderDrawerOpen(false)} />
                        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                            <motion.div 
                                initial={{ x: '100%' }} 
                                animate={{ x: 0 }} 
                                exit={{ x: '100%' }} 
                                transition={{ type: 'tween', duration: 0.35 }}
                                className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between"
                            >
                                <div className="p-6 overflow-y-auto space-y-6 text-left">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                        <h2 className="text-xl font-serif text-[#004B3B] uppercase tracking-wide">Initialize Trade Negotiation</h2>
                                        <button onClick={() => setIsOrderDrawerOpen(false)} className="text-slate-400 hover:text-slate-600"><FiX size={20} /></button>
                                    </div>

                                    <div className="bg-[#FAF9F5] border border-slate-200 rounded-xl p-4 space-y-2.5">
                                        <span className="text-[10px] font-mono bg-[#004B3B] text-[#50C878] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Lot Target: {activeDrawerLot.id}</span>
                                        <div className="text-sm font-bold text-slate-900 font-serif">{activeDrawerLot.region}</div>
                                        <div className="text-xs text-slate-600">Grade Configuration: <span className="font-mono font-bold">{activeDrawerLot.grade}</span></div>
                                        <div className="text-xs text-slate-600">Base Sourcing Price: <span className="font-bold text-[#004B3B]">INR {activeDrawerLot.price}/Kg</span></div>
                                        <div className="text-xs text-slate-600">Active Pipeline Allocation: <span className="font-mono">{activeDrawerLot.stock}</span></div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">Negotiation Target Quantity (Kilograms) *</label>
                                            <input 
                                                type="number" 
                                                min="200"
                                                value={orderQuantity} 
                                                onChange={(e) => setOrderQuantity(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-md p-3 font-mono focus:outline-none focus:border-[#004B3B] text-xs" 
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

                                <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-3">
                                    <div className="flex items-center justify-between font-mono text-xs">
                                        <span className="text-slate-500 font-bold uppercase">Estimated Lot Base Value:</span>
                                        <span className="text-[#004B3B] font-extrabold text-base">INR {(Number(orderQuantity || 0) * Number(activeDrawerLot.price)).toLocaleString()}</span>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            toast.success(`Trade proposal submitted for ${orderQuantity} Kg of lot ${activeDrawerLot.id}.`);
                                            setIsOrderDrawerOpen(false);
                                        }}
                                        className="w-full bg-[#004B3B] hover:bg-[#053127] text-white text-xs font-mono font-bold uppercase tracking-wider py-3.5 rounded-lg flex items-center justify-center gap-2 shadow-lg"
                                    >
                                        <FiShoppingCart /> Dispatch Sourcing Request
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
            
            {/* ================= MODAL TRIGGER SYSTEM PREVENT CLIPPING ================= */}
            <style jsx="true" global="true">{`
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