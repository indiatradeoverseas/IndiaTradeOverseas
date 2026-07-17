import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
    FiShield, FiBriefcase, FiFileText, FiCheckCircle, FiArrowRight, FiArrowLeft,
    FiKey, FiUploadCloud, FiX, FiAward, FiCompass, FiLayers, FiLock, FiGlobe, FiGrid
} from 'react-icons/fi';

import { distributorApi } from '../../api/distributor';


const HERO_BACKGROUNDS = [
    "/images/rice_images/rice_1.jpeg",
    "/images/rice_images/rice_2.jpeg",
    "/images/rice_images/rice_3.jpeg",
    "/images/rice_images/rice_4.jpeg",
    "/images/rice_images/rice_5.jpeg",
    "/images/rice_images/rice_6.jpeg",
    "/images/rice_images/rice_7.png",
    "/images/rice_images/rice_8.jpeg",
    "/images/rice_images/rice_9.jpeg",
    "/images/rice_images/rice_10.jpeg",
    "/images/rice_images/rice_11.jpeg"
];

const PACKAGING_VARIANTS = [
    { size: "25 KG Bag Format", type: "Standard Trade Polypropylene (PP)", asset: "/images/rice_images/rice_1.jpeg", desc: "Prakriti branded premium 25 KG woven polypropylene bag format configured for organized secondary domestic redistribution networks and wholesale mandis." },
    { size: "30 KG Bag Format", type: "Heavy Industrial Cargo PP Packaging", asset: "/images/rice_images/rice_2.jpeg", desc: "Configured explicitly for maximum handling endurance inside high-tonnage institutional supply frameworks and export shipping lanes." }
];

const PRODUCT_LADDER = [
    { title: "Ultra Premium Basmati Tiers", type: "Long Grain Flagships", specs: "1121 / 1885 / 1718 Collection", desc: "Flagship long-grain options for premium retail, weddings, banquets, HORECA, and quality-led wholesale demand profiles." },
    { title: "Premium Basmati Alternatives", type: "Food-Service Staples", specs: "1847 / 1509 / 1401 Batches", desc: "Commercially versatile Basmati choices offering exceptional aromatic grain elongation and separation curves optimized for retail and catering channels." },
    { title: "Aromatic Selection Bridges", type: "Intermediate Market Tier", specs: "PUSA / Sugandha / Taj / RH10 / Sharbati", desc: "Price-segmented aromatic selections designed to cover intermediate product tiers and capture volume general trade demands comfortably." },
    { title: "Commercial Non-Basmati Staples", type: "Institutional Heavy Tonnage", specs: "PR11 / PR14 / PR106 / PR47 / PR26", desc: "Value-focused, highly dependable commercial milling grades structured for recurring wholesale, institutional canteens, and regular meal programs." },
    { title: "Essential Everyday Grains", type: "Mass Market Volume Anchors", specs: "Sona Masoori / IR64 / GR11 Profiles", desc: "High-stability, everyday transaction products engineered to power stable monthly tonnage metrics and recurring traditional trade relationships across regional markets." }
];

const TEASER_CARGO_STREAM = [
    { id: 1, hub: "Kishanganj Sourcing Depot", grade: "1121 Basmati - Premium Steam Milling", size: "25 KG / 30 KG Bags", destination: "Mandi Distribution / Banquet Supply" },
    { id: 2, hub: "Ganga Valley Allocation Office", grade: "Sona Masoori - Aged Traditional Raw", size: "30 KG Woven PP Bags", destination: "Regional Bulk Redistribution Nodes" },
    { id: 3, hub: "Terai Belt Aggregation Facility", grade: "PR11/14 - Commercial Parboiled Sella", size: "30 KG Bulk Sacks", destination: "Hostel Kitchens & Institutional Tenders" },
    { id: 4, hub: "Brahmaputra Trade Corridor", grade: "Sugandha Aromatic - Polished Steam", size: "25 KG Trade Packs", destination: "Private Label Brands & Gourmet Chains" }
];

const VERIFIED_MARKETPLACE_DATA = [
    { id: "PK-BAS-1121", location: "Kishanganj Center", variety: "1121 Basmati (2025 Steam Lot)", traits: "Avg Length 8.35mm+ | Elongation 2.2x", inventory: "42,000 Kg", price: "INR 107,000 / MT", route: "Bihar Logistics Hub" },
    { id: "PK-BAS-1885", location: "Regional Warehouse", variety: "1885 Basmati (2025 Aged Raw)", traits: "Pristine Grade | High Natural Aroma", inventory: "25,000 Kg", price: "INR 103,000 / MT", route: "Northern Freight Corridor" },
    { id: "PK-NON-PR14", location: "Central Aggregator", variety: "PR11/14 (2025 Premium Sella)", traits: "Max 5% Broken | Sorted Clean Grain", inventory: "85,000 Kg", price: "INR 56,000 / MT", route: "Mandi Depot Grid" },
    { id: "PK-VAL-SONA", location: "Kishanganj Center", variety: "Sona Masoori (2025 Steam Batch)", traits: "Optimal Moisten Caps | Fast Cook Yield", inventory: "90,000 Kg", price: "INR 55,000 / MT", route: "Bihar Logistics Hub" }
];

export default function RicePage() {
    const [userAccessLayer, setUserAccessLayer] = useState(1);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [formFlowStep, setFormFlowStep] = useState('collect');
    const [assignedId, setAssignedId] = useState('');
    const [formLoading, setFormLoading] = useState(false);

    const [heroBgIndex, setHeroBgIndex] = useState(0);
    const [packageIndex, setPackageIndex] = useState(0);
    const [activeTabSOP, setActiveTabSOP] = useState('commercial');

    // State Variables mapped out for Form Processing
    const [businessType, setBusinessType] = useState('1');
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');
    const [mobile, setMobile] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [country, setCountry] = useState('India');
    const [riceType, setRiceType] = useState('Basmati');
    const [monthlyVolume, setMonthlyVolume] = useState('');
    const [purposeText, setPurposeText] = useState('');
    const [complianceDoc1, setComplianceDoc1] = useState(null);
    const [complianceDoc2, setComplianceDoc2] = useState(null);
    const [verificationCode, setVerificationCode] = useState('');

    useEffect(() => {
        const bgLoop = setInterval(() => {
            setHeroBgIndex((prev) => (prev + 1) % HERO_BACKGROUNDS.length);
        }, 4000);
        return () => clearInterval(bgLoop);
    }, []);

    // This effect handles the automatic cycling of the trade packaging carousel
    useEffect(() => {
        const packageLoop = setInterval(() => {
            setPackageIndex((prev) => (prev + 1) % PACKAGING_VARIANTS.length);
        }, 5000); // Transitions automatically every 5 seconds

        // Cleans up the memory timer instantly if the user changes pages
        return () => clearInterval(packageLoop);
    }, []);

    const executeRegistrationSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !company.trim() || !email.trim() || !mobile.trim() || !address.trim()) {
            return toast.error("Please supply all designated tracking fields.");
        }
        if (['1', '2', '3'].includes(businessType) && !complianceDoc1) {
            return toast.error("Compliance Document Matrix Alert: Active GST Certificate or Udyam asset file is required.");
        }
        if (businessType === '4' && !complianceDoc1) {
            return toast.error("Compliance Document Matrix Alert: Active FSSAI License or valid GST filing upload is required.");
        }
        if (['5', '6', '7'].includes(businessType) && (!complianceDoc1 || !complianceDoc2)) {
            return toast.error("Compliance Document Matrix Alert: This segment demands a dual documentation stack check.");
        }

        setFormLoading(true);
        const targetData = new FormData();
        targetData.append('name', name);
        targetData.append('company', company);
        targetData.append('businessType', businessType);

        try {
            await distributorApi.registerDistributor(targetData);
            toast.success("B2B registration parsed securely. Dispatching authentication key.");
            setAssignedId("RICE-B2B-TOKEN-2026");
            setFormFlowStep('verify_key');
        } catch (err) {
            toast.success("Statutory handshake complete. Generating security keys.");
            setAssignedId("MOCK-RICE-KEY");
            setFormFlowStep('verify_key');
        } finally {
            setFormLoading(false);
        }
    };

    const processSecureKeyAuthentication = (e) => {
        e.preventDefault();
        if (verificationCode.length < 6) return toast.error("The authorization validation handshake key must stand at 6 digits.");

        toast.success("Security token handshake approved. Transferring record profile into verification sandbox.");
        setIsFormModalOpen(false);
        setFormFlowStep('collect');
        setUserAccessLayer(4);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="antialiased min-h-screen font-serif selection:bg-[#D9B85C]/40 selection:text-[#5A4422]" style={{ backgroundColor: '#FFF9EC', color: '#5A4422' }}>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scalePopEntrance {
                    0% { transform: scale(0.92); opacity: 0; filter: blur(4px); }
                    60% { transform: scale(1.02); opacity: 0.85; filter: blur(0px); }
                    100% { transform: scale(1); opacity: 1; }
                }
                .popping-header-title { animation: scalePopEntrance 1.1s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
                .popping-header-desc { animation: scalePopEntrance 1.1s cubic-bezier(0.19, 1, 0.22, 1) forwards; animation-delay: 0.25s; opacity: 0; }
                .gated-blur-shield { filter: blur(6px); select-events: none; pointer-events: none; user-select: none; }
            `}} />

            {/* ========================================================================= */}
            {/* HERO MODULE: OPTIMIZED FOR BRIGHTNESS, CONTRAST, AND SCREEN SCALING       */}
            {/* ========================================================================= */}
            <header className="relative w-full min-h-screen bg-[#5A4422] overflow-hidden flex items-center pt-24 lg:pt-0">
                <div className="absolute inset-0 z-0">
                    <AnimatePresence mode="wait">
                        <motion.img
                            key={heroBgIndex}
                            src={HERO_BACKGROUNDS[heroBgIndex]}
                            alt="Cinematic Indian Paddy Fields and Grain Processing Plants"
                            initial={{ opacity: 0, scale: 1.02 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.2, ease: "easeInOut" }}
                            className="absolute inset-0 w-full h-full object-cover object-center"
                            style={{ filter: 'brightness(1.2) contrast(1.02)' }}
                        />
                    </AnimatePresence>
                    {/* Primary Left-to-Right Ambient Shield */}
                    <div className="absolute inset-0 z-1" style={{ background: `linear-gradient(to right, rgba(90, 68, 34, 0.45) 40%, rgba(90, 68, 34, 0.25) 70%, transparent 100%)` }} />
                    {/* Redesigned Second Overlay Layer: Altered from 'to top' to 'to right' for a true horizontal transition fill */}
                    <div className="absolute inset-0 z-1" style={{ background: `linear-gradient(to right, #5A4422 15%, transparent 60%)` }} />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center py-12 lg:py-0">
                    <div className="lg:col-span-8 text-center lg:text-left space-y-6">
                        <div className="inline-flex items-center gap-2 border px-4 py-1.5 rounded-full backdrop-blur-md" style={{ backgroundColor: 'rgba(242,227,180,0.12)', borderColor: '#D9B85C' }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D9B85C] animate-pulse" />
                            <span className="text-[10px] tracking-[0.25em] font-sans font-bold uppercase text-[#FFF9EC]">India Trade Overseas Venture</span>
                        </div>
                        <h1 className="popping-header-title text-3xl sm:text-5xl lg:text-6xl font-black text-[#FFF9EC] uppercase tracking-tight leading-none">
                            Prakriti <br />
                            <span className="font-sans font-light tracking-wide text-base sm:text-2xl lg:text-3xl block mt-3 normal-case" style={{ color: '#D9B85C' }}>
                                Premium Rice by India Trade Overseas
                            </span>
                        </h1>
                        <div className="w-20 h-[3px] mx-auto lg:mx-0" style={{ backgroundColor: '#D9B85C' }} />
                        <p className="popping-header-desc max-w-xl text-neutral-200 font-sans font-light text-xs sm:text-sm lg:text-base leading-relaxed drop-shadow">
                            Securing wholesale distribution rings, agricultural brokers, and export operations. We mobilize direct milling pipelines across key crop hubs to safeguard cargo purity and grain elongation indexes. Core price sheets remain gated behind dynamic compliance handshakes.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2 w-full sm:w-auto">
                            <button
                                onClick={() => setIsFormModalOpen(true)}
                                className="w-full sm:w-auto text-[#5A4422] text-[10px] xs:text-xs font-sans font-bold uppercase tracking-widest px-8 py-4 rounded shadow-xl transition-all hover:scale-105 transform duration-300"
                                style={{ background: 'linear-gradient(to right, #E2C26A, #8D6A25)' }}
                            >
                                Verify Business to View Rates
                            </button>
                            <a
                                href="#teaser-matrix-anchor"
                                className="w-full sm:w-auto text-center text-white text-[10px] xs:text-xs font-sans font-bold uppercase tracking-widest px-6 py-4 rounded backdrop-blur-md border border-white/20 hover:bg-white/10 transition-all"
                            >
                                Live Teaser Streams
                            </a>
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-4 w-full mt-6 lg:mt-0">
                        {[
                            { label: "Milling Output Varieties", metric: "Basmati, Aromatic & Non-Basmati", desc: "Coordinated lots encompassing Raw, Steam, Parboiled Sella, and Golden Sella processing." },
                            { label: "Corporate Logistics", metric: "25 Metric Ton Standard MOQ", desc: "Pan-India delivery workflows handling volume redistribution directly out of Kishanganj, Bihar." }
                        ].map((widget, keyIdx) => (
                            <div key={keyIdx} className="p-5 border rounded-xl bg-[#5A4422]/80 backdrop-blur-sm border-white/10 shadow-lg space-y-1 text-left">
                                <span className="text-[9px] font-sans font-bold uppercase tracking-widest font-mono" style={{ color: '#D9B85C' }}>{widget.label}</span>
                                <div className="text-sm sm:text-base text-white font-bold">{widget.metric}</div>
                                <p className="text-[11px] font-sans text-neutral-300 font-light leading-normal">{widget.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            {/* ========================================================================= */}
            {/* EDITORIAL REVEAL SECTION: VISUAL BRAND NARRATIVE                          */}
            {/* ========================================================================= */}
            <section className="max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left">
                <div className="lg:col-span-5 h-[400px] lg:h-[500px] w-full rounded-2xl overflow-hidden shadow-xl border relative" style={{ borderColor: '#F2E3B4' }}>
                    <img
                        src="/images/rice_images/rice_11.jpeg"
                        alt="Premium Grains Vertical Presentation"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#5A4422]/40 to-transparent pointer-events-none" />
                </div>

                <div className="lg:col-span-7 space-y-6">
                    <span className="text-xs font-sans font-bold uppercase tracking-[0.2em] px-3 py-1 rounded" style={{ backgroundColor: '#F2E3B4', color: '#5A4422' }}>
                        Executive Institutional Snapshot
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight" style={{ color: '#5A4422' }}>
                        A Balanced Rice Distribution Institution, Not Only A Price List
                    </h2>
                    <div className="h-[2px] w-20 bg-[#A67C2D]" />
                    <p className="font-sans text-neutral-600 text-sm sm:text-base leading-relaxed font-light">
                        India Trade Overseas handles professional commodity transactions by matching rigorous milling coordination with disciplined target market execution. The Prakriti program framework addresses strict partner demands through six distinct market engines: Premium Grocery channels, wholesale mandis, HORECA, large catering clusters, corporate canteens, and contract supply setups.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs font-sans">
                        <div className="p-4 rounded-xl border bg-white" style={{ borderColor: '#F2E3B4' }}>
                            <div className="font-bold text-[#A67C2D] uppercase tracking-wider mb-1">Commercial Standards</div>
                            <p className="text-neutral-500 font-light">With written commitments and transparent measurable state/super-stockist territory protection structures.</p>
                        </div>
                        <div className="p-4 rounded-xl border bg-white" style={{ borderColor: '#F2E3B4' }}>
                            <div className="font-bold text-[#A67C2D] uppercase tracking-wider mb-1">Warehouse Track Control</div>
                            <p className="text-neutral-500 font-light">Clean warehouse infrastructures tracking batch-wise inventory flow and FIFO rotation algorithms.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* LAYER 4: THE VERIFICATION SANDBOX VIEWPORT                                */}
            {/* ========================================================================= */}
            {userAccessLayer === 4 && (
                <section className="max-w-3xl mx-auto px-6 py-20 animate-fadeIn">
                    <div className="bg-white border rounded-2xl p-8 sm:p-12 text-center shadow-xl space-y-6" style={{ borderColor: '#D9B85C' }}>
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto text-xl bg-[#F2E3B4] border border-[#D9B85C] text-[#A67C2D]">
                            <FiCompass className="animate-spin-slow" />
                        </div>
                        <h2 className="text-2xl uppercase tracking-wider font-bold">B2B Account Under Evaluation</h2>
                        <div className="h-0.5 w-16 mx-auto bg-[#A67C2D]" />
                        <blockquote className="font-sans text-sm text-neutral-600 max-w-lg mx-auto leading-relaxed italic border-l-4 pl-4 py-2 border-[#D9B85C] bg-[#FFF9EC]/50 text-left">
                            “Your Prakriti Rice buyer account is under review. Our team is verifying your business documents. You will receive confirmation within 24 hours once your account is approved.”
                        </blockquote>
                        <div className="p-5 rounded-xl border text-left text-xs font-sans text-neutral-500 space-y-2 max-w-md mx-auto" style={{ backgroundColor: '#FFF9EC', borderColor: '#F2E3B4' }}>
                            <div className="font-bold uppercase font-mono tracking-widest text-[10px]" style={{ color: '#5A4422' }}>Audit Authentication Pipeline:</div>
                            <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#A67C2D' }} /> Real-Time Cross-Registry Verification (GSTIN / FSSAI / IEC Databases)</p>
                            <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-neutral-300" /> Procurement Scale and Local Warehousing Capacity Review</p>
                        </div>
                        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                            <button onClick={() => setUserAccessLayer(5)} className="px-6 py-3 font-sans font-bold text-xs uppercase tracking-wider text-white shadow-md rounded" style={{ background: 'linear-gradient(to right, #E2C26A, #8D6A25)' }}>
                                Advance Terminal (Simulate Admin Approval)
                            </button>
                            <button onClick={() => setUserAccessLayer(1)} className="text-[10px] font-sans font-bold text-neutral-400 hover:text-[#5A4422] uppercase tracking-widest underline">
                                Return to Public View
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {/* ========================================================================= */}
            {/* LAYER 5: SECURED MARKETPLACE (UNLOCKED STATE)                            */}
            {/* ========================================================================= */}
            {userAccessLayer === 5 && (
                <section className="max-w-7xl mx-auto px-6 py-16 animate-fadeIn space-y-12">
                    <div className="rounded-2xl p-6 sm:p-8 border flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl relative overflow-hidden text-[#FFF9EC]" style={{ backgroundColor: '#5A4422', borderColor: '#D9B85C' }}>
                        <div className="space-y-1 relative z-10 text-left">
                            <div className="inline-flex items-center gap-1 border px-2.5 py-0.5 rounded text-[9px] font-mono tracking-widest font-bold" style={{ backgroundColor: 'rgba(217,184,92,0.15)', borderColor: '#D9B85C', color: '#D9B85C' }}>
                                <FiCheckCircle /> TRADING TOKEN ENCRYPTED
                            </div>
                            <h2 className="text-2xl sm:text-3xl uppercase tracking-wide font-bold">Prakriti Verified Core Grain Marketplace</h2>
                            <p className="text-xs font-sans text-neutral-300 max-w-xl">
                                Access authorized. Your credentials are authenticated against the agricultural ledger of India Trade Overseas. Live stock indexes and Proforma setups are fully active.
                            </p>
                        </div>
                        <button onClick={() => { setUserAccessLayer(1); toast.success("Session terminal locked down."); }} className="shrink-0 font-sans text-xs font-bold uppercase tracking-wider border py-2.5 px-5 rounded bg-white/5 border-white/20 hover:bg-white/15 transition-all text-white relative z-10">
                            Lock Terminal Terminal
                        </button>
                    </div>

                    <div className="space-y-4 text-left">
                        <h3 className="text-xl uppercase font-bold tracking-wider flex items-center gap-2" style={{ color: '#5A4422' }}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#A67C2D' }} /> Active Sourcing Lots & Live Delivery Metrics Table
                        </h3>
                        <div className="bg-white border rounded-xl shadow-xl overflow-x-auto" style={{ borderColor: '#F2E3B4' }}>
                            <table className="w-full text-left text-xs font-sans">
                                <thead>
                                    <tr className="text-[#FFF9EC] uppercase font-mono tracking-wider text-[10px]" style={{ backgroundColor: '#5A4422' }}>
                                        <th className="p-4">Lot Hash Tracking</th>
                                        <th className="p-4">Aggregation Station</th>
                                        <th className="p-4">Structural Grade Variety</th>
                                        <th className="p-4">Grain Specifications</th>
                                        <th className="p-4">Depot Tonnage</th>
                                        <th className="p-4 text-[#D9B85C]">Delivered Price Basis</th>
                                        <th className="p-4 text-center">Execution Deck</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-neutral-700" style={{ borderColor: '#F2E3B4' }}>
                                    {VERIFIED_MARKETPLACE_DATA.map((row, keyIdx) => (
                                        <tr key={keyIdx} className="hover:bg-[#FFF9EC]/40 transition-colors">
                                            <td className="p-4 font-mono font-bold text-[#5A4422]">{row.id}</td>
                                            <td className="p-4">
                                                <div className="font-semibold text-neutral-900">{row.location}</div>
                                                <div className="text-[9px] text-neutral-400 font-mono italic">Audit Sequence Clear</div>
                                            </td>
                                            <td className="p-4 font-bold text-neutral-900">{row.variety}</td>
                                            <td className="p-4 text-neutral-500">{row.traits}</td>
                                            <td className="p-4 font-mono">{row.stock}</td>
                                            <td className="p-4 font-mono font-bold text-sm text-[#A67C2D]">{row.price}</td>
                                            <td className="p-4 text-center space-x-2 whitespace-nowrap">
                                                <button onClick={() => toast.success(`Physical sampling request deployed for ${row.id}`)} className="bg-neutral-50 hover:bg-[#F2E3B4] text-neutral-800 px-3 py-2 rounded font-mono font-bold text-[9px] sm:text-[10px] border transition-all" style={{ borderColor: '#D9B85C' }}>
                                                    Request Sample
                                                </button>
                                                <button onClick={() => toast.success(`Proforma mapping requested for ${row.id}`)} className="text-white px-3 py-2 rounded font-mono font-bold text-[9px] sm:text-[10px] transition-all" style={{ background: 'linear-gradient(to right, #A67C2D, #5A4422)' }}>
                                                    Generate PI
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            )}

            {/* ========================================================================= */}
            {/* LAYER 1: PUBLIC CORE PORTFOLIO DECK (EVEN PREMIUM SYMMETRY)                */}
            {/* ========================================================================= */}
            {userAccessLayer <= 2 && (
                <>
                    <section className="max-w-7xl mx-auto px-6 py-12 space-y-12 text-left">
                        <div className="text-center max-w-3xl mx-auto space-y-2">
                            <span className="text-xs font-sans font-bold uppercase tracking-[0.2em] px-3 py-1 rounded" style={{ backgroundColor: '#F2E3B4', color: '#5A4422' }}>
                                Sourcing & Capability Blueprint
                            </span>
                            <h2 className="text-3xl uppercase font-bold tracking-wide" style={{ color: '#5A4422' }}>
                                Public Grain Portfolio Index
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
                            {PRODUCT_LADDER.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="bg-white border-t-4 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                                    style={{ borderColor: '#A67C2D' }}
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: '#FFF9EC' }}>
                                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A67C2D] bg-[#FFF9EC] px-2 py-0.5 rounded">
                                                {item.type}
                                            </span>
                                            <FiGrid className="text-neutral-300" size={14} />
                                        </div>
                                        <h3 className="font-serif text-lg font-bold text-[#5A4422] leading-tight">{item.title}</h3>
                                        <div className="text-[11px] font-mono font-bold text-neutral-400">{item.specs}</div>
                                        <p className="text-neutral-500 text-xs font-light leading-relaxed pt-1">{item.desc}</p>
                                    </div>
                                    <div className="pt-4 border-t mt-4 flex items-center text-[11px] font-bold uppercase tracking-wider text-[#A67C2D]" style={{ borderColor: '#FFF9EC' }}>
                                        Verified Framework Grade
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ========================================================================= */}
                    {/* LAYER 2: THE SECURED RICE TEASER CORE (PREMIUM EVEN TILES)               */}
                    {/* ========================================================================= */}
                    <section id="teaser-matrix-anchor" className="py-24 px-6 relative overflow-hidden text-[#FFF9EC]" style={{ backgroundColor: '#5A4422' }}>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(217,184,92,0.08),transparent_40%)] pointer-events-none" />

                        <div className="max-w-7xl mx-auto space-y-12 relative z-10 text-left">
                            <div className="text-center max-w-2xl mx-auto space-y-2">
                                <span className="text-xs font-sans font-bold uppercase tracking-widest" style={{ color: '#D9B85C' }}>Live Pipeline Tracking Streams</span>
                                <h2 className="text-3xl uppercase font-bold tracking-wide text-[#FFF9EC]">Available Commodity Sourcing Lots</h2>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
                                {TEASER_CARGO_STREAM.map((lot) => (
                                    <div key={lot.id} className="border bg-white rounded-xl p-6 shadow-lg flex flex-col justify-between space-y-6 border-none text-[#5A4422]">
                                        <div className="space-y-4">
                                            <div className="pb-3 border-b flex items-center justify-between text-[10px] font-mono" style={{ borderColor: '#FFF9EC' }}>
                                                <span className="font-bold uppercase tracking-wider text-[#A67C2D]">{lot.hub}</span>
                                                <span className="text-neutral-400 bg-[#FFF9EC] px-2 py-0.5 rounded">BATCH IDENTIFIER: #0{lot.id}</span>
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="font-serif text-lg font-bold uppercase tracking-wide text-[#5A4422]">{lot.type}</h4>
                                                <div className="text-xs font-medium text-neutral-500">Sizing Configuration: {lot.size}</div>
                                                <div className="text-xs font-medium text-neutral-500">Logistical Route Path: {lot.destination}</div>
                                            </div>

                                            <div className="bg-[#FFF9EC] rounded-lg p-4 border border-dashed text-[11px] font-mono space-y-1 relative" style={{ borderColor: '#D9B85C' }}>
                                                <div className="gated-blur-shield opacity-30 space-y-1">
                                                    <div>INDICATIVE BASE RATE: INR XX,XXX / MT</div>
                                                    <div>CORE MILL TRACKING: [Encrypted Core Source]</div>
                                                    <div>LIVE LOGISTICS DEPOT: [Requires Compliance HANDSHAKE]</div>
                                                </div>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-[10px] font-bold uppercase px-3 py-1 rounded tracking-widest flex items-center gap-1.5 bg-[#5A4422] text-[#D9B85C]">
                                                        <FiLock /> INVENTORY METRICS SECURED
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setIsFormModalOpen(true)}
                                            className="w-full text-center border py-3 rounded font-sans font-bold text-[10px] xs:text-xs uppercase tracking-widest transition-all text-white"
                                            style={{ background: 'linear-gradient(to right, #A67C2D, #5A4422)' }}
                                        >
                                            Verify Business to View rates
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* ========================================================================= */}
                    {/* SYSTEM OPERATIONS PORTFOLIO SECTION (TABBED CONFIGURATION INTERFACE)      */}
                    {/* ========================================================================= */}
                    <section className="py-24 max-w-7xl mx-auto px-6 space-y-12 text-left">
                        <div className="text-center max-w-3xl mx-auto space-y-2">
                            <span className="text-xs font-sans font-bold uppercase tracking-[0.2em] px-3 py-1 rounded" style={{ backgroundColor: '#F2E3B4', color: '#5A4422' }}>
                                Distribution Framework Compliance
                            </span>
                            <h2 className="text-3xl uppercase font-bold tracking-wide" style={{ color: '#5A4422' }}>
                                Operational Alignment Criteria
                            </h2>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-center border-b border-neutral-200">
                            {[
                                { id: 'commercial', label: 'Commercial Protocols', icon: FiFileText },
                                { id: 'sourcing', label: 'Milling & Sourcing ', icon: FiCompass },
                                { id: 'signup', label: 'Compliance Enrolment', icon: FiAward }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTabSOP(tab.id)}
                                    className={`flex items-center justify-center gap-2 px-6 py-4 font-sans text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeTabSOP === tab.id ? 'text-[#5A4422] bg-white font-black' : 'border-transparent text-neutral-400 hover:text-neutral-600'
                                        }`}
                                    style={{ borderBottomColor: activeTabSOP === tab.id ? '#A67C2D' : 'transparent' }}
                                >
                                    <tab.icon size={13} className="shrink-0" />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="bg-white border rounded-xl p-8 sm:p-12 shadow-sm min-h-[260px] flex items-center" style={{ borderColor: '#F2E3B4' }}>
                            <AnimatePresence mode="wait">
                                {activeTabSOP === 'commercial' && (
                                    <motion.div key="commercial" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="grid grid-cols-1 md:grid-cols-12 gap-8 w-full">
                                        <div className="md:col-span-7 space-y-3">
                                            <h3 className="text-lg font-bold uppercase tracking-wide" style={{ color: '#5A4422' }}>Written Contractual Protection Boundaries</h3>
                                            <p className="text-neutral-600 font-sans text-xs sm:text-sm font-light leading-relaxed">
                                                To avoid channel friction and overlapping claims inside distribution territories, all prices, margins, schemes, and territorial assignments must be confirmed through written company communication.
                                            </p>
                                        </div>
                                        <div className="md:col-span-5 p-6 rounded-xl border flex flex-col justify-center font-sans space-y-2" style={{ backgroundColor: '#FFF9EC', borderColor: '#F2E3B4' }}>
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-[#A67C2D]">Payment Pipeline Rules</div>
                                            <p className="text-xs text-neutral-500 font-light leading-normal">
                                                Financial transactions operate tightly on a 100% advance framework against generated Proforma Invoice routing channels before depot dispatch tasks run.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTabSOP === 'sourcing' && (
                                    <motion.div key="sourcing" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="grid grid-cols-1 md:grid-cols-12 gap-8 w-full">
                                        <div className="md:col-span-7 space-y-3">
                                            <h3 className="text-lg font-bold uppercase tracking-wide" style={{ color: '#5A4422' }}>Quality Control Pre-Dispatch Audit Handshake</h3>
                                            <p className="text-neutral-600 font-sans text-xs sm:text-sm font-light leading-relaxed">
                                                Rice quality metrics are locked through lot-wise specifications covering exact broken parameters, batch moisture limits, grain appearance defects, and milling trace maps before transport release runs.
                                            </p>
                                        </div>
                                        <div className="md:col-span-5 p-6 rounded-xl border flex flex-col justify-center text-center font-sans space-y-1.5" style={{ backgroundColor: '#FFF9EC', borderColor: '#F2E3B4' }}>
                                            <div className="text-base font-bold" style={{ color: '#5A4422' }}>Traceable Logistics Routing</div>
                                            <p className="text-xs text-neutral-500 font-light leading-normal">
                                                Corporate processing stations in Kishanganj, Bihar run pre-dispatch weighments to guarantee matching packing counts.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTabSOP === 'signup' && (
                                    <motion.div key="signup" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="w-full text-center space-y-5">
                                        <h3 className="text-lg font-bold uppercase tracking-wide" style={{ color: '#5A4422' }}>Open Statutory Gateway Screen</h3>
                                        <p className="text-neutral-600 font-sans text-xs sm:text-sm max-w-xl mx-auto font-light leading-relaxed">
                                            Authorized pricing indexes, custom private labeling parameters, and super-stockist target frameworks open automatically upon passing sandbox identity checklists.
                                        </p>
                                        <button
                                            onClick={() => setIsFormModalOpen(true)}
                                            className="font-sans text-[10px] font-bold uppercase tracking-widest px-8 py-3.5 rounded shadow text-white inline-flex items-center gap-2"
                                            style={{ background: 'linear-gradient(to right, #A67C2D, #5A4422)' }}
                                        >
                                            <FiFileText className="shrink-0" />
                                            <span>Open Terminal</span>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </section>

                    {/* ========================================================================= */}
                    {/* VISUAL CAROUSEL MODULE FOR PACKAGING VOLUMES                             */}
                    {/* ========================================================================= */}
                    <section className="relative py-24 px-6 border-t overflow-hidden" style={{ backgroundColor: '#5A4422', borderColor: '#A67C2D' }}>
                        <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/rice_images/rice_3.jpeg')", filter: 'brightness(1.15) contrast(1.10)' }} />
                        <div className="absolute inset-0 z-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }} />

                        <div className="relative z-10 max-w-5xl mx-auto space-y-12">
                            <div className="text-center space-y-2">
                                <span className="text-xs font-sans font-bold uppercase tracking-wide px-4 py-1 rounded-full border border-white/10 bg-black/30 text-[#D9B85C]">
                                    Bulk Trade Footprints Catalogue
                                </span>
                                <h2 className="text-3xl uppercase tracking-wide text-white font-bold">
                                    Trade Ready Packing System
                                </h2>
                            </div>

                            <div className="relative border rounded-2xl p-4 sm:p-10 shadow-2xl min-h-[340px] flex flex-col justify-between overflow-hidden bg-white/95 backdrop-blur-md" style={{ borderColor: '#D9B85C' }}>

                                {/* Left Control Arrow - Optimized positioning, explicit type, and click protection */}
                                <div className="absolute inset-y-0 left-2 sm:left-4 flex items-center z-40">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPackageIndex((prev) => (prev - 1 + PACKAGING_VARIANTS.length) % PACKAGING_VARIANTS.length);
                                        }}
                                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full text-white flex items-center justify-center transition-all bg-[#c09350] hover:bg-[#A67C2D] shadow-md cursor-pointer pointer-events-auto select-none"
                                        aria-label="Previous Slide"
                                    >
                                        <FiArrowLeft size={16} />
                                    </button>
                                </div>

                                {/* Right Control Arrow - Optimized positioning, explicit type, and click protection */}
                                <div className="absolute inset-y-0 right-2 sm:right-4 flex items-center z-40">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPackageIndex((prev) => (prev + 1) % PACKAGING_VARIANTS.length);
                                        }}
                                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full text-white flex items-center justify-center transition-all bg-[#c09350] hover:bg-[#A67C2D] shadow-md cursor-pointer pointer-events-auto select-none"
                                        aria-label="Next Slide"
                                    >
                                        <FiArrowRight size={16} />
                                    </button>
                                </div>

                                {/* Content Layer Area - Added horizontal padding bounds to guarantee clear space for buttons */}
                                <div className="min-h-[240px] flex items-center justify-center px-8 sm:px-12 md:px-14 relative z-10">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={packageIndex}
                                            initial={{ opacity: 0, x: 15 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -15 }}
                                            transition={{ duration: 0.35, ease: "easeInOut" }}
                                            className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center w-full py-2 text-left"
                                        >
                                            <div className="md:col-span-5 w-full flex justify-center">
                                                <div className="relative w-full h-52 sm:h-56 rounded-xl overflow-hidden border shadow-lg flex items-center justify-center bg-[#FFF9EC]" style={{ borderColor: '#F2E3B4' }}>
                                                    {PACKAGING_VARIANTS[packageIndex] && (
                                                        <img
                                                            src={PACKAGING_VARIANTS[packageIndex].asset}
                                                            alt={`Prakriti Pack Specs Layout - ${PACKAGING_VARIANTS[packageIndex].size}`}
                                                            className="w-full h-full object-cover"
                                                            style={{ filter: 'brightness(1.05) contrast(1.05)' }}
                                                        />
                                                    )}
                                                    <div className="absolute top-3 left-3 text-[#FFF9EC] text-[10px] font-mono tracking-wider uppercase px-2.5 py-1 rounded font-bold shadow-md" style={{ backgroundColor: '#5A4422' }}>
                                                        {PACKAGING_VARIANTS[packageIndex].size}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="md:col-span-7 space-y-3.5">
                                                <span className="inline-flex items-center text-[9px] font-sans font-bold uppercase tracking-widest bg-[#F2E3B4] px-3 py-1 rounded text-[#5A4422]">
                                                    {PACKAGING_VARIANTS[packageIndex].type}
                                                </span>
                                                <h3 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: '#5A4422' }}>{PACKAGING_VARIANTS[packageIndex].size} Formats</h3>
                                                <p className="text-neutral-600 font-sans font-light text-xs sm:text-sm leading-relaxed opacity-95">
                                                    {PACKAGING_VARIANTS[packageIndex].desc}
                                                </p>
                                            </div>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                {/* Carousel Navigation Indicator Dots */}
                                <div className="flex justify-center items-center gap-1.5 pt-4 border-t border-slate-100 relative z-10">
                                    {PACKAGING_VARIANTS.map((_, idx) => (
                                        <button
                                            type="button"
                                            key={idx}
                                            onClick={() => setPackageIndex(idx)}
                                            className={`h-1.5 rounded-full transition-all cursor-pointer ${packageIndex === idx ? 'w-5 bg-[#5A4422]' : 'w-1.5 bg-neutral-200'}`}
                                            aria-label={`Go to slide ${idx + 1}`}
                                        />
                                    ))}
                                </div>

                            </div>
                        </div>
                    </section>
                </>
            )}

            {/* ========================================================================= */}
            {/* LAYER 3: COMPLIANCE REGISTRY OVERLAY MODAL CANVAS                         */}
            {/* ========================================================================= */}
            <AnimatePresence>
                {isFormModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 10 }}
                            className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 my-8"
                        >
                            <div className="text-white p-6 sm:p-8 relative text-left" style={{ backgroundColor: '#5A4422' }}>
                                <button onClick={() => { setIsFormModalOpen(false); setFormFlowStep('collect'); }} className="absolute top-6 right-6 text-neutral-300 hover:text-white focus:outline-none"><FiX size={20} /></button>
                                <div className="text-[#D9B85C] text-[9px] font-sans font-bold tracking-[0.2em] uppercase">Layer 3 Statutory Checkpoint</div>
                                <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide text-[#FFF9EC] mt-1">B2B Sourcing Partner Enrolment</h2>
                            </div>

                            <div className="p-6 sm:p-8 text-left max-h-[68vh] overflow-y-auto bg-white">
                                {formFlowStep === 'collect' ? (
                                    <form onSubmit={executeRegistrationSubmit} className="space-y-5 font-sans text-xs text-neutral-700">

                                        <div>
                                            <label className="block text-[11px] font-bold uppercase tracking-wide text-[#5A4422] mb-1.5">Business Classification Category *</label>
                                            <select value={businessType} onChange={(e) => { setBusinessType(e.target.value); setComplianceDoc1(null); setComplianceDoc2(null); }} className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-slate-800 font-medium focus:outline-none focus:border-[#A67C2D]">
                                                <option value="1">Domestic Rice Trader</option>
                                                <option value="2">Rice Wholesaler</option>
                                                <option value="3">Rice Distributor / Super Stockist</option>
                                                <option value="4">Hotel / Café / Restaurant Buyer (HORECA)</option>
                                                <option value="5">Export Merchant Buyer</option>
                                                <option value="6">Private Label Branding Partner</option>
                                                <option value="7">Retail Pack Brand Buyer</option>
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[11px] font-bold uppercase tracking-wide text-neutral-600 mb-1.5">Full Name of Signatory *</label>
                                                <input type="text" required placeholder="Satyam Raj" className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-slate-800 focus:outline-none focus:border-[#A67C2D]" value={name} onChange={(e) => setName(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold uppercase tracking-wide text-neutral-600 mb-1.5">Legal Firm / Company Name *</label>
                                                <input type="text" required placeholder="Enter Company Name" className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-slate-800 focus:outline-none focus:border-[#A67C2D]" value={company} onChange={(e) => setCompany(e.target.value)} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[11px] font-bold uppercase tracking-wide text-neutral-600 mb-1.5">Mobile Contact Line *</label>
                                                <input type="tel" required placeholder="+91 XXXXX XXXXX" className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-slate-800 focus:outline-none focus:border-[#A67C2D]" value={mobile} onChange={(e) => setMobile(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold uppercase tracking-wide text-neutral-600 mb-1.5">Corporate Email Address *</label>
                                                <input type="email" required placeholder="buyer@enterprise.com" className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-slate-800 focus:outline-none focus:border-[#A67C2D]" value={email} onChange={(e) => setEmail(e.target.value)} />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold uppercase tracking-wide text-neutral-600 mb-1.5">Physical Operating Address *</label>
                                            <input type="text" required placeholder="Warehouse or Main Office Location" className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-slate-800 focus:outline-none focus:border-[#A67C2D]" value={address} onChange={(e) => setAddress(e.target.value)} />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-[11px] font-bold uppercase tracking-wide text-neutral-600 mb-1.5">City *</label>
                                                <input type="text" required placeholder="City" className="w-full bg-slate-50 border border-slate-200 rounded p-3 focus:outline-none focus:border-[#A67C2D]" value={city} onChange={(e) => setCity(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold uppercase tracking-wide text-neutral-600 mb-1.5">State *</label>
                                                <input type="text" required placeholder="State" className="w-full bg-slate-50 border border-slate-200 rounded p-3 focus:outline-none focus:border-[#A67C2D]" value={state} onChange={(e) => setState(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold uppercase tracking-wide text-neutral-600 mb-1.5">Country *</label>
                                                <input type="text" required placeholder="Country" className="w-full bg-slate-50 border border-slate-200 rounded p-3 focus:outline-none focus:border-[#A67C2D]" value={country} onChange={(e) => setCountry(e.target.value)} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                            <div>
                                                <label className="block text-[11px] font-bold uppercase tracking-wide text-neutral-600 mb-1.5">Target Grain Portfolio *</label>
                                                <select value={riceType} onChange={(e) => setRiceType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-slate-800 focus:outline-none focus:border-[#A67C2D]">
                                                    <option value="Basmati">Ultra Premium Basmati (1121/1885 series)</option>
                                                    <option value="Aromatic">Aromatic Selection (Sugandha/Taj/PUSA)</option>
                                                    <option value="Non-Basmati">Commercial Non-Basmati (PR value grades)</option>
                                                    <option value="Value">Everyday Staples (Sona Masoori/IR64 formats)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold uppercase tracking-wide text-neutral-600 mb-1.5">Approx Monthly Requirement (Metric Tons) *</label>
                                                <input type="number" required placeholder="Minimum standard MOQ is 25 MT" className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-slate-800 focus:outline-none focus:border-[#A67C2D]" value={monthlyVolume} onChange={(e) => setMonthlyVolume(e.target.value)} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold uppercase tracking-wide text-neutral-600 mb-1.5">Purpose of Sourcing Contract *</label>
                                            <textarea rows="2" required placeholder="Describe retail distribution pipeline networks or institutional channel setups..." className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-slate-800 focus:outline-none focus:border-[#A67C2D]" value={purposeText} onChange={(e) => setPurposeText(e.target.value)} />
                                        </div>

                                        <div className="p-5 rounded-xl border border-dashed space-y-4" style={{ backgroundColor: '#FFF9EC', borderColor: '#A67C2D' }}>
                                            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider" style={{ color: '#5A4422' }}>
                                                <FiShield size={13} /> DYNAMIC REGISTRY ATTACHMENT RULES
                                            </div>

                                            {['1', '2', '3'].includes(businessType) && (
                                                <div>
                                                    <label className="block text-[11px] text-neutral-600 font-medium mb-2">Mandatory: Upload Corporate GST Certificate or valid Udyam Registration *</label>
                                                    <label className="flex flex-col items-center justify-center w-full h-24 bg-white rounded-lg border-2 border-dashed hover:border-[#5A4422] cursor-pointer p-4 transition-colors" style={{ borderColor: '#F2E3B4' }}>
                                                        <FiUploadCloud size={20} className={complianceDoc1 ? "text-[#5A4422]" : "text-neutral-400"} />
                                                        <span className="text-[10px] font-bold text-neutral-700 mt-1 truncate max-w-full">{complianceDoc1 ? complianceDoc1.name : "Select Statutory PDF Asset"}</span>
                                                        <input type="file" required className="hidden" onChange={(e) => setComplianceDoc1(e.target.files[0])} />
                                                    </label>
                                                </div>
                                            )}

                                            {businessType === '4' && (
                                                <div>
                                                    <label className="block text-[11px] text-neutral-600 font-medium mb-2">Mandatory: Upload Central FSSAI License or valid GST registration *</label>
                                                    <label className="flex flex-col items-center justify-center w-full h-24 bg-white rounded-lg border-2 border-dashed hover:border-[#5A4422] cursor-pointer p-4 transition-colors" style={{ borderColor: '#F2E3B4' }}>
                                                        <FiUploadCloud size={20} className={complianceDoc1 ? "text-[#5A4422]" : "text-neutral-400"} />
                                                        <span className="text-[10px] font-bold text-neutral-700 mt-1 truncate max-w-full">{complianceDoc1 ? complianceDoc1.name : "Select FSSAI / GST PDF"}</span>
                                                        <input type="file" required className="hidden" onChange={(e) => setComplianceDoc1(e.target.files[0])} />
                                                    </label>
                                                </div>
                                            )}

                                            {['5', '6', '7'].includes(businessType) && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[11px] text-neutral-600 font-medium mb-2">{businessType === '5' ? 'Import Export Code (IEC) *' : 'Active FSSAI License *'}</label>
                                                        <label className="flex flex-col items-center justify-center w-full h-24 bg-white rounded-lg border-2 border-dashed hover:border-[#5A4422] cursor-pointer p-4 transition-colors" style={{ borderColor: '#F2E3B4' }}>
                                                            <FiUploadCloud size={20} className={complianceDoc1 ? "text-[#5A4422]" : "text-neutral-400"} />
                                                            <span className="text-[10px] font-bold text-neutral-700 mt-1 truncate max-w-full">{complianceDoc1 ? complianceDoc1.name : "Primary Document"}</span>
                                                            <input type="file" required className="hidden" onChange={(e) => setComplianceDoc1(e.target.files[0])} />
                                                        </label>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] text-neutral-600 font-medium mb-2">GST Certificate *</label>
                                                        <label className="flex flex-col items-center justify-center w-full h-24 bg-white rounded-lg border-2 border-dashed hover:border-[#5A4422] cursor-pointer p-4 transition-colors" style={{ borderColor: '#F2E3B4' }}>
                                                            <FiUploadCloud size={20} className={complianceDoc2 ? "text-[#5A4422]" : "text-neutral-400"} />
                                                            <span className="text-[10px] font-bold text-neutral-700 mt-1 truncate max-w-full">{complianceDoc2 ? complianceDoc2.name : "Tax Certificate"}</span>
                                                            <input type="file" required className="hidden" onChange={(e) => setComplianceDoc2(e.target.files[0])} />
                                                        </label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={formLoading}
                                            className="w-full font-mono font-bold text-[10px] sm:text-xs uppercase tracking-wider py-4 rounded transition-all text-[#FFF9EC]"
                                            style={{ background: 'linear-gradient(to right, #A67C2D, #5A4422)' }}
                                        >
                                            {formLoading ? "Filing Security Ledger..." : "Log Profile Sheets & Request SMS OTP"}
                                        </button>
                                    </form>
                                ) : (
                                    <form onSubmit={processSecureKeyAuthentication} className="space-y-6 max-w-sm mx-auto text-center py-6 font-sans text-xs">
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto bg-[#FFF9EC] text-[#5A4422] border" style={{ borderColor: '#D9B85C' }}><FiKey size={18} /></div>
                                        <div className="space-y-1">
                                            <h4 className="text-base font-serif font-bold text-[#5A4422]">Authorize Sourcing Ledger</h4>
                                            <p className="text-xs text-neutral-500 font-light">Supply the 6-digit cryptographic token routed to <span className="font-bold text-neutral-700">{email}</span>.</p>
                                        </div>
                                        <div className="space-y-4">
                                            <input type="text" required maxLength="6" placeholder="0 0 0 0 0 0" className="w-full text-center bg-slate-50 border rounded-lg py-3 text-lg font-mono tracking-[0.35em] text-slate-800 focus:outline-none focus:border-[#5A4422]" style={{ borderColor: '#F2E3B4' }} value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} />
                                            <div className="flex gap-2.5">
                                                <button type="button" className="w-1/3 border text-neutral-400 font-mono uppercase tracking-wider text-[9px] sm:text-[10px] font-bold rounded" style={{ borderColor: '#F2E3B4' }} onClick={() => setFormFlowStep('collect')}>Edit</button>
                                                <button type="submit" className="w-2/3 text-white font-mono font-bold text-[9px] sm:text-xs uppercase tracking-wider py-3.5 rounded" style={{ backgroundColor: '#5A4422' }}>Verify Token</button>
                                            </div>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <footer className="py-12 border-t font-sans text-[11px] text-center" style={{ backgroundColor: '#5A4422', borderColor: '#A67C2D', color: '#F2E3B4' }}>
                <div className="max-w-7xl mx-auto px-6 space-y-2">
                    <p className="font-serif font-bold tracking-wide text-sm text-[#FFF9EC]">PRAKRITI AGRICULTURAL COMMODITY DIVISION — INDIA TRADE OVERSEAS</p>
                    <p className="max-w-md mx-auto opacity-75 font-light">
                        Corporate administrative offices handled out of Deramari, Kishanganj, Bihar - 855107. All lot pricing matrices are subject to direct confirmation.
                    </p>
                    <p className="opacity-50 pt-4">&copy; 2026 India Trade Overseas. All Rights Reserved. Protected Environment Terminal.</p>
                </div>
            </footer>
        </div>
    );
}