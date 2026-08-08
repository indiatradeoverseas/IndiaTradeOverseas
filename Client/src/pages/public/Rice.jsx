import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
    FiShield, FiBriefcase, FiFileText, FiCheckCircle, FiArrowRight, FiArrowLeft,
    FiKey, FiUploadCloud, FiX, FiAward, FiCompass, FiLayers, FiLock, FiGlobe, FiGrid,
    FiShoppingCart, FiInfo, FiUser, FiPhone, FiMapPin
} from 'react-icons/fi';

import { distributorApi } from '../../api/distributor';
import { pushDataLayerEvent } from '../../utils/analytics';
import BuyerEntryGate from '../../components/gates/BuyerEntryGate';
import useDocumentMeta from '../../hooks/useDocumentMeta';

// Tracks which layer (1 = storefront, 5 = marketplace) the buyer was last viewing,
// so a refresh restores the same view instead of always jumping approved buyers to Layer 5.
const ACTIVE_LAYER_KEY = 'rice_active_layer';

const RICE_GATE_THEME = {
    bg: '#5A4422',
    panelBg: '#4A3819',
    accent: '#D9B85C',
    accentText: '#2E2000',
    text: '#FFF9EC',
    muted: '#C9AE81',
    border: '#6E5228',
    eyebrow: 'Prakriti Rice Division',
    headline: 'Welcome to Prakriti Rice',
    subhead: 'Tell us who you are to unlock the official rice rate card and place sourcing requests directly.',
    fontClass: 'font-serif'
};

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

// Official ITO Ex-Mill (Haryana) Rice Rate Card â€” variety -> processing-grade price per Metric Ton (MT)
// Source: "ITO Rice Price List.pdf". Packing: 50 KG White PP Bag (Non-Branded), Crop Year 2025. `null` = not offered for that variety.
const RICE_PROCESSING_KEYS = ['raw', 'steam', 'whiteSella', 'lemonSella', 'goldenSella', 'brown'];
const RICE_PROCESSING_LABELS = {
    raw: 'Raw / White',
    steam: 'Steam',
    whiteSella: 'White / Creamy Sella',
    lemonSella: 'Lemon Sella',
    goldenSella: 'Golden Sella',
    brown: 'Brown'
};

// Regular / Conventional Basmati & Non-Basmati grades
const REGULAR_RICE_RAW = [
    ['1121 Basmati Rice', '8.35 MM', [113000, 109000, 103000, 104000, 108000, null]],
    ['1885 Basmati Rice', '8.35 MM', [null, 107000, 99000, 100000, 104000, null]],
    ['1718 Basmati Rice', '8.35 MM', [109000, 106000, 97000, 98000, 102000, null]],
    ['1509 Basmati Rice', '8.40 MM', [null, 98000, 92000, 93000, 98000, null]],
    ['1847 Basmati Rice', '8.40 MM', [null, 98000, 92000, 93000, 98000, null]],
    ['1401 Basmati Rice', '7.70 MM', [null, 105000, null, null, null, null]],
    ['PUSA Basmati Rice', '7.45 MM', [100000, 100000, 94000, null, 98000, null]],
    ['Sugandha Rice', '7.90 MM', [null, 88000, 82000, 83000, 87000, null]],
    ['Taj Rice', '8.15 MM', [null, 86500, 82000, null, 86000, null]],
    ['Sharbati Rice', '7.10 MM', [null, null, 81000, null, 86000, null]],
    ['RH-10 Rice', '7.40 MM', [null, 82000, 76000, null, 80000, null]],
    ['PR-11 / PR-14 Rice', '6.90 MM', [56000, 56000, 55000, null, 57000, null]],
    ['PR-106 / PR-47 Rice', '6.50 MM', [49000, 52000, 49000, null, 52000, null]],
    ['PR-26 Rice', '6.40 MM', [48000, 49500, 47500, null, 51000, null]]
];

// EU / UK / USA MRL-Compliant, Pesticide Residue Free grades
const COMPLIANCE_RICE_RAW = [
    ['1121 Basmati Rice', '8.35 MM', [114000, 113000, 107000, null, 112000, null]],
    ['1718 Basmati Rice', '8.35 MM', [113000, 111000, 104000, null, 108000, null]],
    ['1509 Basmati Rice', '8.40 MM', [null, 105000, 99000, null, 103000, null]],
    ['PUSA Basmati Rice', '7.45 MM', [105000, 105000, 98000, null, 104000, 99000]],
    ['Sharbati Rice', '7.10 MM', [null, null, 87000, null, null, null]],
    ['Parmal Rice', '6.40 MM', [null, null, 57000, null, null, null]]
];

const buildRiceRateTable = (raw) => raw.map(([variety, mm, values]) => ({
    variety,
    mm,
    rates: RICE_PROCESSING_KEYS.reduce((acc, key, i) => {
        acc[key] = values[i];
        return acc;
    }, {})
}));

const REGULAR_RICE_RATES = buildRiceRateTable(REGULAR_RICE_RAW);
const COMPLIANCE_RICE_RATES = buildRiceRateTable(COMPLIANCE_RICE_RAW);

export default function RicePage() {
    useDocumentMeta({
        title: 'Bulk Rice Export & Sourcing | B2B Rice Supplier | India Trade Overseas',
        description: 'Bulk rice sourcing and export — regular and compliance-grade varieties, live rate cards, and verified B2B buyer onboarding with India Trade Overseas.',
        canonicalPath: '/prakriti/rice'
    });

    const [userAccessLayer, setUserAccessLayer] = useState(1);
    const [isSessionLoading, setIsLoadingSession] = useState(true);
    const [showEntryGate, setShowEntryGate] = useState(() =>
        !(localStorage.getItem('rice_distributor_id') && localStorage.getItem('distributor_token'))
    );
    const [distributorId, setDistributorId] = useState('');

    // Proposals State
    const [myProposals, setMyProposals] = useState([]);
    const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);

    // Official Rate Card Selector (Layer 5 marketplace pricing)
    const [rateCompliance, setRateCompliance] = useState('REGULAR'); // 'REGULAR' | 'COMPLIANCE'
    const [rateVariety, setRateVariety] = useState(REGULAR_RICE_RATES[0].variety);
    const [rateProcessingType, setRateProcessingType] = useState(
        RICE_PROCESSING_KEYS.find((key) => REGULAR_RICE_RATES[0].rates[key] != null)
    );

    const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
    const [activeDrawerLot, setActiveDrawerLot] = useState(null);
    const [orderQuantity, setOrderQuantity] = useState('20000');

    const [heroBgIndex, setHeroBgIndex] = useState(0);
    const [packageIndex, setPackageIndex] = useState(0);
    const [activeTabSOP, setActiveTabSOP] = useState('commercial');

    const fetchMyProposals = async () => {
        const storedDistributorId = distributorId || localStorage.getItem('rice_distributor_id');
        const token = localStorage.getItem('distributor_token');

        if (!storedDistributorId || !token) {
            console.warn("No active distributor session or token found.");
            return;
        }

        try {
            const res = await distributorApi.getDistributorProposalsCustomer(storedDistributorId , 'RICE');
            if (res && res.success) {
                console.log(res.data)
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

    // Global Navbar visibility adjustment
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
            const savedId = localStorage.getItem('rice_distributor_id');
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
                            toast.success("B2B Rice Profile Approved! Secure Marketplace Activated.");
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
        const bgLoop = setInterval(() => {
            setHeroBgIndex((prev) => (prev + 1) % HERO_BACKGROUNDS.length);
        }, 4000);
        return () => clearInterval(bgLoop);
    }, []);

    useEffect(() => {
        const packageLoop = setInterval(() => {
            setPackageIndex((prev) => (prev + 1) % PACKAGING_VARIANTS.length);
        }, 5000);
        return () => clearInterval(packageLoop);
    }, []);

    // Entry-gate verification (name/email/phone/location + OTP already handled
    // inside BuyerEntryGate) â€” just adopt the resulting session.
    const handleGateVerified = (activeId, activeToken) => {
        if (activeId) {
            setDistributorId(activeId);
            localStorage.setItem('rice_distributor_id', activeId);
        }
        if (activeToken) {
            localStorage.setItem('distributor_token', activeToken);
        }
        pushDataLayerEvent('rice_distributor_verified', { division: 'RICE' });
        setShowEntryGate(false);
        setUserAccessLayer(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Only for the two genuinely destructive cases: the CRM record was deleted (404)
    // or explicitly rejected. Clears the saved session so the entry gate reappears.
    const handleLogOut = () => {
        setUserAccessLayer(1);
        setDistributorId('');
        localStorage.removeItem('rice_distributor_id');
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

    // Reset variety/grade whenever the compliance toggle changes
    useEffect(() => {
        const table = rateCompliance === 'REGULAR' ? REGULAR_RICE_RATES : COMPLIANCE_RICE_RATES;
        const firstEntry = table[0];
        setRateVariety(firstEntry.variety);
        setRateProcessingType(RICE_PROCESSING_KEYS.find((key) => firstEntry.rates[key] != null));
    }, [rateCompliance]);

    // Fall back to an available processing grade if the current one isn't offered for the selected variety
    useEffect(() => {
        const table = rateCompliance === 'REGULAR' ? REGULAR_RICE_RATES : COMPLIANCE_RICE_RATES;
        const entry = table.find((e) => e.variety === rateVariety);
        if (entry && entry.rates[rateProcessingType] == null) {
            setRateProcessingType(RICE_PROCESSING_KEYS.find((key) => entry.rates[key] != null));
        }
    }, [rateVariety]);

    const riceRateTable = rateCompliance === 'REGULAR' ? REGULAR_RICE_RATES : COMPLIANCE_RICE_RATES;
    const activeRiceRateEntry = riceRateTable.find((entry) => entry.variety === rateVariety);
    const activeRiceRatePriceMT = activeRiceRateEntry?.rates?.[rateProcessingType] ?? null;
    const availableProcessingTypes = activeRiceRateEntry
        ? RICE_PROCESSING_KEYS.filter((key) => activeRiceRateEntry.rates[key] != null)
        : [];

    const openRiceRateDrawer = () => {
        if (!activeRiceRateEntry || activeRiceRatePriceMT == null) return;
        const processingLabel = RICE_PROCESSING_LABELS[rateProcessingType];
        setActiveDrawerLot({
            id: `${rateCompliance}-${activeRiceRateEntry.variety.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-${rateProcessingType.toUpperCase()}`,
            variety: `${activeRiceRateEntry.variety} (${activeRiceRateEntry.mm}) â€” ${processingLabel}`,
            location: rateCompliance === 'COMPLIANCE' ? 'EU / UK / USA Compliance â€” Ex-Mill Haryana' : 'Ex-Mill Haryana (Domestic Grade)',
            price: Number((activeRiceRatePriceMT / 1000).toFixed(2)),
            inventory: 'MOQ 20,000 Kg (20 MT / One Truckload)'
        });
        setOrderQuantity('20000');
        setIsOrderDrawerOpen(true);
    };

    if (showEntryGate) {
        return (
            <BuyerEntryGate
                theme={RICE_GATE_THEME}
                division="RICE"
                requireOtp={true}
                onVerified={handleGateVerified}
                mascotSrc="/images/walking-man.png"
            />
        );
    }

    if (isSessionLoading) {
        return (
            <div className="min-h-screen bg-[#FFF9EC] flex items-center justify-center font-serif">
                <div className="text-center space-y-4">
                    <span className="w-10 h-10 border-4 border-[#5A4422] border-t-transparent rounded-full animate-spin block mx-auto" />
                    <p className="text-xs font-mono tracking-widest text-[#5A4422] uppercase font-bold">Synchronizing Rice Trade Pipeline...</p>
                </div>
            </div>
        );
    }

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

            {/* ================= LAYER 4: UNDER REVIEW GATE ================= */}
            {userAccessLayer === 4 && (
                <section className="max-w-3xl mx-auto px-6 py-20 animate-fadeIn min-h-[80vh] flex items-center justify-center">
                    <div className="bg-white border rounded-2xl p-8 sm:p-12 text-center shadow-xl space-y-6 w-full" style={{ borderColor: '#D9B85C' }}>
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto text-xl bg-[#F2E3B4] border border-[#D9B85C] text-[#A67C2D]">
                            <FiCompass className="animate-spin-slow" />
                        </div>
                        <h2 className="text-2xl uppercase tracking-wider font-bold">B2B Account Under Evaluation</h2>
                        <div className="h-0.5 w-16 mx-auto bg-[#A67C2D]" />
                        <blockquote className="font-sans text-sm text-neutral-600 max-w-lg mx-auto leading-relaxed italic border-l-4 pl-4 py-2 border-[#D9B85C] bg-[#FFF9EC]/50 text-left">
                            â€œYour Prakriti Rice buyer account is under review. Our team is verifying your business documents. You will receive confirmation within 24 hours once your account is approved.â€
                        </blockquote>
                        <div className="p-5 rounded-xl border text-left text-xs font-sans text-neutral-500 space-y-2 max-w-md mx-auto" style={{ backgroundColor: '#FFF9EC', borderColor: '#F2E3B4' }}>
                            <div className="font-bold uppercase font-mono tracking-widest text-[10px]" style={{ color: '#5A4422' }}>Audit Authentication Pipeline:</div>
                            <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#A67C2D' }} /> Real-Time Cross-Registry Verification (GSTIN / FSSAI / IEC Databases)</p>
                            <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-neutral-300" /> Procurement Scale and Local Warehousing Capacity Review</p>
                        </div>
                        <div className="pt-4">
                            <button onClick={() => setUserAccessLayer(1)} className="text-[10px] font-sans font-bold text-neutral-400 hover:text-[#5A4422] uppercase tracking-widest underline">
                                Return to Public View
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {/* ================= LAYER 5: SECURED RICE BUYER MARKETPLACE ================= */}
            {userAccessLayer === 5 && (
                <div className="min-h-screen font-sans text-slate-900 animate-fadeIn antialiased pt-6 pb-24" style={{ backgroundColor: '#FFF9EC' }}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
                        <div className="text-white rounded-lg px-6 py-4 flex items-center justify-between border shadow-lg" style={{ backgroundColor: '#5A4422', borderColor: '#D9B85C' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-white/10 rounded-sm flex items-center justify-center text-[#D9B85C] font-serif text-lg font-bold border border-white/10">
                                    P
                                </div>
                                <div>
                                    <div className="text-[10px] font-mono tracking-widest text-[#D9B85C] font-bold uppercase">B2B TRADE TERMINAL (RICE)</div>
                                    <div className="text-sm font-serif tracking-wide text-white uppercase">INDIA TRADE OVERSEAS</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="hidden md:flex flex-col text-right font-mono text-[10px] text-slate-300 border-r border-white/10 pr-4">
                                    <span>GRAIN NETWORK SECURED</span>
                                    <span className="text-[#D9B85C]">STATUS: ACTIVE SESSION</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            fetchMyProposals();
                                            setIsProposalModalOpen(true);
                                        }}
                                        className="relative bg-[#D9B85C]/10 hover:bg-[#D9B85C]/20 text-[#D9B85C] border border-[#D9B85C]/30 font-mono text-[10px] font-bold uppercase tracking-wider py-2 px-4 rounded transition-all cursor-pointer flex items-center gap-2"
                                    >
                                        <FiFileText /> My Proposals
                                        {myProposals.filter(p => p.status === 'approved').length > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 bg-[#D9B85C] text-slate-900 w-4 h-4 rounded-full flex items-center justify-center font-sans font-extrabold text-[9px] animate-bounce">
                                                {myProposals.filter(p => p.status === 'approved').length}
                                            </span>
                                        )}
                                    </button>

                                    <button
                                        onClick={handleExitTerminal}
                                        className="bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 border border-white/10 text-slate-200 font-mono text-[10px] font-bold uppercase tracking-wider py-2 px-3 rounded transition-all cursor-pointer"
                                    >
                                        Exit Terminal
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
                        <div className="rounded-xl p-8 border shadow-xl relative overflow-hidden text-white" style={{ backgroundColor: '#5A4422', borderColor: '#D9B85C' }}>
                            <div className="space-y-3 relative z-10 max-w-3xl text-left">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[9px] font-mono font-bold tracking-wider uppercase border" style={{ backgroundColor: 'rgba(217,184,92,0.15)', borderColor: '#D9B85C', color: '#D9B85C' }}>
                                    <FiCheckCircle size={10} /> CRM CREDENTIAL ACCREDITATION: LEVEL 5 (RICE)
                                </div>
                                <h2 className="text-2xl sm:text-4xl font-serif tracking-wide text-[#FFF9EC] uppercase">
                                    Prakriti Verified Core Grain Marketplace
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-200 font-light leading-relaxed max-w-2xl font-serif">
                                    Welcome back, trading partner. Your session is synchronized directly with live inventory metrics, active seasonal paddy harvest allocations, and fresh wholesale price indexes.
                                </p>
                            </div>
                        </div>

                        {/* ================= MY PROPOSALS & PAYMENT MODAL ================= */}
                        <AnimatePresence>
                            {isProposalModalOpen && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 15 }}
                                        className="w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 my-8"
                                    >
                                        <div className="text-white p-6 flex justify-between items-center text-left" style={{ backgroundColor: '#5A4422' }}>
                                            <div>
                                                <div className="text-[9px] font-mono tracking-widest text-[#D9B85C] font-bold uppercase">Rice Procurement Ledger</div>
                                                <h2 className="text-xl font-serif text-white uppercase tracking-wide">My Active Trade Proposals</h2>
                                            </div>
                                            <button
                                                onClick={() => setIsProposalModalOpen(false)}
                                                className="p-1 text-slate-300 hover:text-white rounded-sm transition-colors cursor-pointer"
                                            >
                                                <FiX size={20} />
                                            </button>
                                        </div>

                                        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto text-left font-serif">
                                            {myProposals.length === 0 ? (
                                                <div className="p-12 text-center text-slate-400 italic text-xs font-light">
                                                    You have not committed any trade pipeline negotiations yet.
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {myProposals.map((prop) => (
                                                        <div
                                                            key={prop._id}
                                                            className={`p-4 rounded-lg border text-xs font-mono transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${prop.status === 'approved' ? 'border-amber-200 bg-amber-50/40' :
                                                                prop.status === 'disapproved' ? 'border-rose-200 bg-rose-50/30' :
                                                                    'border-slate-200 bg-slate-50/50'
                                                                }`}
                                                        >
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[13px] font-extrabold text-[#5A4422]">{prop.lotId}</span>
                                                                    <span className="text-[10px] text-slate-400">({prop.grade})</span>
                                                                </div>
                                                                <div className="text-slate-600 font-sans font-light">
                                                                    Volume: <span className="font-mono font-bold text-slate-800">{prop.quantity?.toLocaleString()} Kg</span>
                                                                    {" | "} Route: <span className="text-slate-700">{prop.region}</span>
                                                                </div>
                                                                <div className="text-[11px] text-slate-500">
                                                                    Rate Basis: INR {prop.basePrice}/Kg â†’ Net Value: <span className="font-bold text-[#5A4422]">INR {prop.estimatedValue?.toLocaleString()}</span>
                                                                </div>
                                                            </div>

                                                            <div className="shrink-0 flex items-center gap-2">
                                                                <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${prop.status === 'approved' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                                                                    prop.status === 'disapproved' ? 'bg-rose-100 text-rose-700 border-rose-300' :
                                                                        'bg-slate-100 text-slate-700 border-slate-300 animate-pulse'
                                                                    }`}>
                                                                    {prop.status === 'approved' ? 'Invoice Issued' : prop.status === 'disapproved' ? 'Rejected' : 'Under Review'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-left font-serif">
                                            <div>
                                                <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Total Active Invoice Matrix</div>
                                                <div className="text-xl font-mono font-extrabold text-[#5A4422]">
                                                    INR {myProposals
                                                        .filter(p => p.status === 'approved')
                                                        .reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0)
                                                        .toLocaleString()
                                                    }
                                                </div>
                                            </div>

                                            <button
                                                disabled={myProposals.filter(p => p.status === 'approved').length === 0}
                                                onClick={async () => {
                                                    const approvedProposals = myProposals.filter(p => p.status === 'approved');
                                                    if (approvedProposals.length === 0) return;

                                                    const aggregateAmount = approvedProposals.reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0);
                                                    const targetLotString = approvedProposals.map(p => p.lotId).join(", ");
                                                    const combinedQuantity = approvedProposals.reduce((acc, curr) => acc + (curr.quantity || 0), 0);

                                                    const loadingToast = toast.loading("Configuring transaction security manifest...");

                                                    try {
                                                        const orderResult = await distributorApi.createRazorpayOrder(aggregateAmount, targetLotString, combinedQuantity);

                                                        if (!orderResult.success) {
                                                            throw new Error(orderResult.message || "Failed to create secure transaction token.");
                                                        }

                                                        const { orderId, keyId } = orderResult.data;
                                                        toast.dismiss(loadingToast);

                                                        const options = {
                                                            key: keyId,
                                                            amount: aggregateAmount * 100,
                                                            currency: "INR",
                                                            name: "Prakriti Rice Division",
                                                            description: `Commodity Settlement - Lots: ${targetLotString}`,
                                                            order_id: orderId,
                                                            handler: async function (response) {
                                                                const verificationToast = toast.loading("Verifying transaction checksum parameters...");

                                                                try {
                                                                    const verifyResult = await distributorApi.verifyRazorpayPayment({
                                                                        razorpay_order_id: response.razorpay_order_id,
                                                                        razorpay_payment_id: response.razorpay_payment_id,
                                                                        razorpay_signature: response.razorpay_signature,
                                                                        lotId: targetLotString,
                                                                        quantity: combinedQuantity,
                                                                        amount: aggregateAmount
                                                                    });

                                                                    if (!verifyResult.success) {
                                                                        throw new Error(verifyResult.message || "Cryptographic integrity match check failed.");
                                                                    }

                                                                    await Promise.all(approvedProposals.map(p =>
                                                                        distributorApi.updateProposalStatus(p._id, 'paid')
                                                                    ));

                                                                    toast.dismiss(verificationToast);
                                                                    toast.success("Transaction certified! Ledger cleared successfully.");
                                                                    pushDataLayerEvent('rice_payment_success', {
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
                                                                    toast.error(verifyErr.message || "Payment completed but database signature sync failed.");
                                                                }
                                                            },
                                                            prefill: {
                                                                name: approvedProposals[0]?.name || "Corporate Partner",
                                                                email: approvedProposals[0]?.email || ""
                                                            },
                                                            theme: { color: "#5A4422" }
                                                        };

                                                        const checkoutWindow = new window.Razorpay(options);
                                                        checkoutWindow.open();

                                                    } catch (err) {
                                                        toast.dismiss(loadingToast);
                                                        toast.error(err.message || "Failed to initiate gateway tunnel.");
                                                    }
                                                }}
                                                className={`font-mono text-xs font-bold uppercase tracking-wider py-3.5 px-6 rounded-lg flex items-center gap-2 transition-all shadow-md ${myProposals.filter(p => p.status === 'approved').length > 0
                                                    ? 'bg-[#5A4422] hover:bg-[#3d2c16] text-white cursor-pointer'
                                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                                    }`}
                                            >
                                                <FiCheckCircle /> Proceed to Payment
                                            </button>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>

                        {/* Official Rate Card Selector */}
                        <div className="space-y-4 text-left">
                            <h3 className="font-serif text-lg text-[#5A4422] uppercase tracking-wider font-bold px-1">
                                Official Rate Card â€” Select Compliance, Variety &amp; Processing Grade
                            </h3>

                            <div className="bg-white border rounded-xl p-4 sm:p-6 shadow-sm space-y-4" style={{ borderColor: '#F2E3B4' }}>
                                {/* Compliance Toggle */}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setRateCompliance('REGULAR')}
                                        className="flex-1 py-2.5 rounded-lg font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border transition-all cursor-pointer"
                                        style={rateCompliance === 'REGULAR'
                                            ? { backgroundColor: '#5A4422', borderColor: '#5A4422', color: '#FFF9EC' }
                                            : { backgroundColor: '#FFF9EC', borderColor: '#F2E3B4', color: '#5A4422' }}
                                    >
                                        Regular / Conventional
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRateCompliance('COMPLIANCE')}
                                        className="flex-1 py-2.5 rounded-lg font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border transition-all cursor-pointer"
                                        style={rateCompliance === 'COMPLIANCE'
                                            ? { backgroundColor: '#5A4422', borderColor: '#5A4422', color: '#FFF9EC' }
                                            : { backgroundColor: '#FFF9EC', borderColor: '#F2E3B4', color: '#5A4422' }}
                                    >
                                        EU / UK / USA Compliance
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-mono uppercase text-neutral-500 mb-1">Rice Variety *</label>
                                        <select
                                            value={rateVariety}
                                            onChange={(e) => setRateVariety(e.target.value)}
                                            className="w-full border rounded p-3 text-xs text-[#5A4422] font-mono"
                                            style={{ backgroundColor: '#FFF9EC', borderColor: '#F2E3B4' }}
                                        >
                                            {riceRateTable.map((entry) => (
                                                <option key={entry.variety} value={entry.variety}>
                                                    {entry.variety} ({entry.mm})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-mono uppercase text-neutral-500 mb-1">Processing Grade *</label>
                                        <select
                                            value={rateProcessingType}
                                            onChange={(e) => setRateProcessingType(e.target.value)}
                                            className="w-full border rounded p-3 text-xs text-[#5A4422] font-mono"
                                            style={{ backgroundColor: '#FFF9EC', borderColor: '#F2E3B4' }}
                                        >
                                            {availableProcessingTypes.map((key) => (
                                                <option key={key} value={key}>{RICE_PROCESSING_LABELS[key]}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border rounded-xl p-4" style={{ backgroundColor: '#FFF9EC', borderColor: '#F2E3B4' }}>
                                    {activeRiceRatePriceMT == null ? (
                                        <span className="text-xs font-sans text-neutral-500 italic">Not available for this variety / processing grade combination.</span>
                                    ) : (
                                        <>
                                            <div>
                                                <span className="text-[9px] font-mono uppercase text-neutral-400 block">Commercial Rate (Ex-Mill Haryana)</span>
                                                <span className="text-xl font-mono font-extrabold text-[#5A4422]">
                                                    INR {activeRiceRatePriceMT.toLocaleString()}<span className="text-xs font-medium text-neutral-500">/MT</span>
                                                </span>
                                                <span className="text-[10px] font-mono text-neutral-400 block">
                                                    &asymp; INR {(activeRiceRatePriceMT / 1000).toLocaleString()}/Kg
                                                </span>
                                            </div>
                                            <button
                                                onClick={openRiceRateDrawer}
                                                className="text-white px-5 py-3 rounded-lg font-mono font-bold uppercase tracking-wider text-[10px] shadow transition-all cursor-pointer flex items-center justify-center gap-2"
                                                style={{ backgroundColor: '#5A4422' }}
                                            >
                                                <FiShoppingCart size={12} /> Request Sourcing Quote
                                            </button>
                                        </>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] font-sans text-neutral-500 pt-1">
                                    <p>Packing: 50 KG White PP Bag (Non-Branded). Minimum Order Quantity: 20â€“25 MT (One Truckload).</p>
                                    <p>Payment Terms: 20% Advance, balance against loading (Ex-Mill) / against LR (FOR). Rates valid until 01/08/2026.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= LAYER 1 & 2: PUBLIC VIEWS ================= */}
            {userAccessLayer <= 2 && (
                <>
                    {/* HERO MODULE */}
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
                            <div className="absolute inset-0 z-1" style={{ background: `linear-gradient(to right, rgba(90, 68, 34, 0.45) 40%, rgba(90, 68, 34, 0.25) 70%, transparent 100%)` }} />
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
                                        onClick={() => setUserAccessLayer(5)}
                                        className="w-full sm:w-auto text-[#5A4422] text-[10px] xs:text-xs font-sans font-bold uppercase tracking-widest px-8 py-4 rounded shadow-xl transition-all hover:scale-105 transform duration-300 cursor-pointer"
                                        style={{ background: 'linear-gradient(to right, #E2C26A, #8D6A25)' }}
                                    >
                                        Explore Products
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

                    {/* EDITORIAL REVEAL SECTION */}
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

                    {/* PUBLIC PORTFOLIO DECK */}
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

                    {/* TEASER MATRIX */}
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
                                                <h4 className="font-serif text-lg font-bold uppercase tracking-wide text-[#5A4422]">{lot.grade}</h4>
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
                                            onClick={() => setUserAccessLayer(5)}
                                            className="w-full text-center border py-3 rounded font-sans font-bold text-[10px] xs:text-xs uppercase tracking-widest transition-all text-white cursor-pointer"
                                            style={{ background: 'linear-gradient(to right, #A67C2D, #5A4422)' }}
                                        >
                                            Explore Products
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* COMPLIANCE TABBED SYSTEM */}
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
                                    className={`flex items-center justify-center gap-2 px-6 py-4 font-sans text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${activeTabSOP === tab.id ? 'text-[#5A4422] bg-white font-black' : 'border-transparent text-neutral-400 hover:text-neutral-600'
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
                                            onClick={() => setUserAccessLayer(5)}
                                            className="font-sans text-[10px] font-bold uppercase tracking-widest px-8 py-3.5 rounded shadow text-white inline-flex items-center gap-2 cursor-pointer"
                                            style={{ background: 'linear-gradient(to right, #A67C2D, #5A4422)' }}
                                        >
                                            <FiFileText className="shrink-0" />
                                            <span>Explore Products</span>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </section>

                    {/* PACKAGING CAROUSEL */}
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
                                <div className="absolute inset-y-0 left-2 sm:left-4 flex items-center z-40">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPackageIndex((prev) => (prev - 1 + PACKAGING_VARIANTS.length) % PACKAGING_VARIANTS.length);
                                        }}
                                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full text-white flex items-center justify-center transition-all bg-[#c09350] hover:bg-[#A67C2D] shadow-md cursor-pointer select-none"
                                        aria-label="Previous Slide"
                                    >
                                        <FiArrowLeft size={16} />
                                    </button>
                                </div>

                                <div className="absolute inset-y-0 right-2 sm:right-4 flex items-center z-40">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPackageIndex((prev) => (prev + 1) % PACKAGING_VARIANTS.length);
                                        }}
                                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full text-white flex items-center justify-center transition-all bg-[#c09350] hover:bg-[#A67C2D] shadow-md cursor-pointer select-none"
                                        aria-label="Next Slide"
                                    >
                                        <FiArrowRight size={16} />
                                    </button>
                                </div>

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

            {/* ================= LAYER 5: BULK ORDER DRAWER AND ENQUIRY BENCH ================= */}
            <AnimatePresence>
                {isOrderDrawerOpen && activeDrawerLot && (
                    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
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
                                        <h2 className="text-xl font-serif text-[#5A4422] uppercase tracking-wide">Initialize Grain Negotiation</h2>
                                        <button onClick={() => setIsOrderDrawerOpen(false)} className="text-slate-400 hover:text-slate-600"><FiX size={20} /></button>
                                    </div>

                                    <div className="bg-[#FFF9EC] border rounded-xl p-4 space-y-2.5" style={{ borderColor: '#F2E3B4' }}>
                                        <span className="text-[10px] font-mono text-[#FFF9EC] px-2 py-0.5 rounded font-bold uppercase tracking-wider" style={{ backgroundColor: '#5A4422' }}>Lot Target: {activeDrawerLot.id}</span>
                                        <div className="text-sm font-bold text-slate-900 font-serif">{activeDrawerLot.variety}</div>
                                        <div className="text-xs text-slate-600">Route Hub: <span className="font-mono font-bold">{activeDrawerLot.location}</span></div>
                                        <div className="text-xs text-slate-600">Base Sourcing Price: <span className="font-bold text-[#A67C2D]">INR {activeDrawerLot.price}/Kg</span></div>
                                        <div className="text-xs text-slate-600">Active Pipeline Inventory: <span className="font-mono">{activeDrawerLot.inventory}</span></div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">Negotiation Target Quantity (Kilograms) *</label>
                                            <input
                                                type="number"
                                                min="20000"
                                                step="1000"
                                                value={orderQuantity}
                                                onChange={(e) => setOrderQuantity(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-md p-3 font-mono focus:outline-none focus:border-[#5A4422] text-xs"
                                            />
                                            <span className="text-[9px] text-slate-400 mt-1 block">Minimum order quantity per official rate card: 20,000 Kg (20 MT / One Truckload).</span>
                                        </div>
                                        <div className="bg-amber-50 border border-dashed border-amber-200 rounded-lg p-3 flex gap-2">
                                            <FiInfo className="text-amber-800 shrink-0 mt-0.5" size={14} />
                                            <p className="text-[10px] text-amber-900 font-light leading-relaxed font-serif">
                                                By executing this pipeline commitment, your intent maps directly to the active agricultural storage depot. Trade desk confirmations reply within minutes.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-3">
                                    <div className="flex items-center justify-between font-mono text-xs">
                                        <span className="text-slate-500 font-bold uppercase">Estimated Base Value:</span>
                                        <span className="text-[#5A4422] font-extrabold text-base">INR {(Number(orderQuantity || 0) * Number(activeDrawerLot.price)).toLocaleString()}</span>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if (!orderQuantity || Number(orderQuantity) < 20000) {
                                                return toast.error("Minimum order quantity is 20,000 Kg (20 MT / One Truckload).");
                                            }

                                            try {
                                                const proposalPayload = {
                                                    distributorId: distributorId,
                                                    division : 'RICE',
                                                    lotId: activeDrawerLot.id,
                                                    region: activeDrawerLot.location,
                                                    grade: activeDrawerLot.variety,
                                                    quantity: Number(orderQuantity),
                                                    basePrice: Number(activeDrawerLot.price)
                                                };

                                                const res = await distributorApi.createProposal(proposalPayload);
                                                if (res.success) {
                                                    toast.success(`Trade proposal submitted for ${orderQuantity} Kg of lot ${activeDrawerLot.id}.`);
                                                    pushDataLayerEvent('rice_proposal_submitted', {
                                                        lot_id: activeDrawerLot.id,
                                                        quantity: Number(orderQuantity),
                                                        value: Number(orderQuantity) * Number(activeDrawerLot.price || 0),
                                                        currency: 'INR'
                                                    });
                                                    setIsOrderDrawerOpen(false);
                                                    fetchMyProposals();
                                                }
                                            } catch (err) {
                                                console.error(err);
                                                toast.error(err.response?.data?.message || "Failed to route sourcing proposal.");
                                            }
                                        }}
                                        className="w-full text-white text-xs font-mono font-bold uppercase tracking-wider py-3.5 rounded-lg flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                                        style={{ backgroundColor: '#5A4422' }}
                                    >
                                        <FiShoppingCart /> Dispatch Sourcing Request
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            <footer className="py-12 border-t font-sans text-[11px] text-center" style={{ backgroundColor: '#5A4422', borderColor: '#A67C2D', color: '#F2E3B4' }}>
                <div className="max-w-7xl mx-auto px-6 space-y-2">
                    <p className="font-serif font-bold tracking-wide text-sm text-[#FFF9EC]">PRAKRITI AGRICULTURAL COMMODITY DIVISION â€” INDIA TRADE OVERSEAS</p>
                    <p className="max-w-md mx-auto opacity-75 font-light">
                        Corporate administrative offices handled out of Deramari, Kishanganj, Bihar - 855107. All lot pricing matrices are subject to direct confirmation.
                    </p>
                    <p className="opacity-50 pt-4">&copy; 2026 India Trade Overseas. All Rights Reserved. Protected Environment Terminal.</p>
                </div>
            </footer>
        </div>
    );
}
