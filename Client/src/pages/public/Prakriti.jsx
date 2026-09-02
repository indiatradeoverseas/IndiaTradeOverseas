import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
    FiShield,
    FiBriefcase,
    FiFileText,
    FiCheckCircle,
    FiArrowRight,
    FiArrowLeft,
    FiMapPin,
    FiLock,
    FiAward,
    FiShoppingCart,
    FiInfo,
    FiX,
    FiGlobe,
} from 'react-icons/fi';
import {
    GiThreeLeaves,
    GiTeapot,
    GiBoxUnpacking,
    GiCargoShip,
} from 'react-icons/gi';

import { Link } from 'react-router-dom';

import { distributorApi } from '../../api/distributor';
import { pushDataLayerEvent } from '../../utils/analytics';
import { loadRazorpayScript } from '../../utils/razorpay';
import BuyerEntryGate from '../../components/gates/BuyerEntryGate';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import TestimonialCoverflow from '../../components/Testimonials/TestimonialCoverflow';
import TestimonialSectionBackground from '../../components/Testimonials/TestimonialSectionBackground';
import {
    teaTestimonials,
    TEA_ACCENT,
    TEA_ACCENT_TEXT,
    TEA_TRUST_PARAGRAPH,
} from '../../data/testimonials';
import { OrderButton } from '../../components/ui/AnimatedActionButton';


/* =========================================================
   SESSION
========================================================= */

const ACTIVE_LAYER_KEY = 'prakriti_active_layer';


/* =========================================================
   EXISTING PRAKRITI GATE THEME
   COLOURS KEPT UNCHANGED
========================================================= */

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
    subhead:
        'Tell us who you are to unlock live tea garden pricing and place sourcing requests directly.',
    fontClass: 'font-sans',
};


/* =========================================================
   HERO BACKGROUNDS
========================================================= */

const HERO_BACKGROUNDS = [
    '/images/tea_images/g1.jpeg',
    '/images/tea_images/g2.jpeg',
    '/images/tea_images/g3.jpeg',
    '/images/tea_images/g4.jpeg',
    '/images/tea_images/g5.jpeg',
    '/images/tea_images/g6.jpeg',
    '/images/tea_images/g7.jpeg',
];


/* =========================================================
   PACKAGING
========================================================= */

const CAROUSEL_IMAGES = [
    {
        size: '100 g',
        format: 'Retail Pack',
        description:
            'Compact retail format for household use, online sales and shelf-ready consumer products.',
        image: '/images/tea_variants/chai_1.png',
    },
    {
        size: '250 g',
        format: 'Retail Pack',
        description:
            'Retail format designed for regular household purchase and premium shelf presentation.',
        image: '/images/tea_variants/chai_2.png',
    },
    {
        size: '500 g',
        format: 'Retail Pack',
        description:
            'Larger consumer format suitable for family consumption and retail programmes.',
        image: '/images/tea_variants/chai_3.png',
    },
    {
        size: '1 kg',
        format: 'Trade Pack',
        description:
            'Commercial format for tea shops, cafes, restaurants and regular business use.',
        image: '/images/tea_variants/chai_4.png',
    },
    {
        size: '5 kg',
        format: 'Bulk Pack',
        description:
            'Bulk format for distributors, wholesalers, foodservice and blending programmes.',
        image: '/images/tea_variants/chai_5.png',
    },
];


/* =========================================================
   PUBLIC TEA GRADES
========================================================= */

const TEA_GRADES = [
    {
        code: 'D',
        title: 'Dust Tea',
        description:
            'Strong liquor and quick-brewing profile for commercial tea use.',
        icon: GiThreeLeaves,
    },
    {
        code: 'BP',
        title: 'BP — Broken Pekoe',
        description:
            'Balanced body and aroma for dependable daily tea profiles.',
        icon: GiTeapot,
    },
    {
        code: 'BOP',
        title: 'BOP — Broken Orange Pekoe',
        description:
            'Popular leaf grade offering colour, character and body.',
        icon: GiThreeLeaves,
    },
    {
        code: 'BOPSM',
        title: 'BOPSM',
        description:
            'Fine broken grade suited to strong and brisk cup profiles.',
        icon: GiThreeLeaves,
    },
    {
        code: 'OF',
        title: 'OF — Orange Fannings',
        description:
            'Fine tea grade selected for quick brewing applications.',
        icon: GiThreeLeaves,
    },
    {
        code: 'P',
        title: 'Pekoe Tea',
        description:
            'Leaf tea option for aroma-led premium positioning.',
        icon: GiAward,
    },
    {
        code: 'CB',
        title: 'Custom Blends',
        description:
            'Grade and taste profile matched to specific buyer requirements.',
        icon: FiBriefcase,
    },
    {
        code: 'F',
        title: 'Flavoured Tea',
        description:
            'Value-added option for differentiated retail products.',
        icon: GiTeapot,
    },
];


/* =========================================================
   SOURCING REGIONS
========================================================= */

const SOURCING_REGIONS = [
    {
        code: 'A',
        title: 'Assam',
        description:
            'Strong liquor, brisk character and dependable daily tea profiles.',
        image: '/images/tea_images/g4.jpeg',
    },
    {
        code: 'D',
        title: 'Darjeeling',
        description:
            'Distinctive aroma-forward selections for premium positioning.',
        image: '/images/tea_images/g3.jpeg',
    },
    {
        code: 'D',
        title: 'Dooars',
        description:
            'Versatile teas for balanced flavour, colour and broad market use.',
        image: '/images/tea_images/g6.jpeg',
    },
    {
        code: 'S',
        title: 'Siliguri Corridor',
        description:
            'Strategic aggregation and sourcing route for varied tea profiles.',
        image: '/images/tea_images/g7.jpeg',
    },
];


/* =========================================================
   BUSINESS CHANNELS
========================================================= */

const BUSINESS_CHANNELS = [
    {
        icon: FiBriefcase,
        title: 'Retail & Supermarkets',
        description:
            '100 g, 250 g and 500 g formats for retail shelves and online sales.',
    },
    {
        icon: GiTeapot,
        title: 'Tea Shops & Cafes',
        description:
            'Strong liquor and aromatic grades for daily brewing and foodservice.',
    },
    {
        icon: GiBoxUnpacking,
        title: 'Distributors & Wholesalers',
        description:
            '1 kg to 5 kg trade packs for commercial distribution and bulk movement.',
    },
    {
        icon: FiShield,
        title: 'Hotels & Restaurants',
        description:
            'Consistent tea profiles suited to hospitality and institutional requirements.',
    },
    {
        icon: FiFileText,
        title: 'Private Label Partners',
        description:
            'Custom blend, label, packaging and commercial configuration.',
    },
    {
        icon: FiGlobe,
        title: 'Online Sellers',
        description:
            'Retail pack formats for marketplaces, direct sales and subscription models.',
    },
];


/* =========================================================
   PUBLIC TEASER
   Prices remain intentionally locked.
========================================================= */

const TEASER_LISTINGS = [
    {
        id: 1,
        region: 'Assam',
        type: 'Commercial Tea',
        grade: 'BP / BOP',
        package: 'Bulk & Trade Formats',
        use: 'Distribution / Wholesale',
    },
    {
        id: 2,
        region: 'Darjeeling',
        type: 'Premium Garden Tea',
        grade: 'Pekoe / BOP',
        package: 'Premium Formats',
        use: 'Premium Brands / Private Label',
    },
    {
        id: 3,
        region: 'Dooars',
        type: 'Commercial Tea',
        grade: 'BOP / Dust',
        package: 'Trade & Bulk Formats',
        use: 'Tea Shops / Cafes',
    },
    {
        id: 4,
        region: 'Siliguri Corridor',
        type: 'Sourcing Selection',
        grade: 'Multiple Grades',
        package: 'Requirement Based',
        use: 'Domestic & Export Supply',
    },
];


/* =========================================================
   APPROVED LIVE MARKETPLACE DATA
   EXISTING FUNCTIONALITY PRESERVED
========================================================= */

const APPROVED_MARKETPLACE_DATA = [
    {
        id: 'PK-AS-091',
        region: 'Assam Upper Track',
        grade: 'BP (Broken Pekoe)',
        color: 'Deep Mahogany',
        strength: '9.5/10',
        stock: '14,200 Kg',
        price: '210',
        dispatch: 'Siliguri Hub',
        type: 'CTC Tea',
    },
    {
        id: 'PK-DJ-104',
        region: 'Darjeeling Premium',
        grade: 'TGFOP1 Whole Leaf',
        color: 'Bright Amber',
        strength: '6.0/10',
        stock: '3,100 Kg',
        price: '420',
        dispatch: 'Kolkata Port',
        type: 'Orthodox Tea',
    },
    {
        id: 'PK-DO-072',
        region: 'Dooars Western',
        grade: 'BOP (Broken Orange Pekoe)',
        color: 'Rich Crimson',
        strength: '8.5/10',
        stock: '9,500 Kg',
        price: '165',
        dispatch: 'Siliguri Hub',
        type: 'CTC Tea',
    },
    {
        id: 'PK-ST-110',
        region: 'Commercial Blend',
        grade: 'Super Fine Dust',
        color: 'Intense Opaque',
        strength: '10/10',
        stock: '22,000 Kg',
        price: '135',
        dispatch: 'Guwahati Desk',
        type: 'Dust Tea',
    },
];


/* =========================================================
   ICON FALLBACK
========================================================= */

function GiAward({ size = 18, className = '' }) {
    return <FiAward size={size} className={className} />;
}


/* =========================================================
   COMPONENT
========================================================= */

export default function Prakriti() {
    useDocumentMeta({
    title: 'Prakriti Premium Indian Tea | Bulk Supply & Private Label',
    description:
        'Prakriti by India Trade Overseas supplies premium Indian tea from Assam, Darjeeling, Dooars and the Siliguri corridor for retail, trade, hospitality, distribution and private-label buyers.',
    canonicalPath: '/prakriti/tea',
});


    /* =====================================================
       SESSION STATE
    ===================================================== */

    const [userAccessLayer, setUserAccessLayer] = useState(1);
    const [isSessionLoading, setIsLoadingSession] = useState(true);

    const [showEntryGate, setShowEntryGate] = useState(() => {
        if (
            import.meta.env.DEV &&
            new URLSearchParams(window.location.search).get(
                'previewTestimonials'
            ) === '1'
        ) {
            return false;
        }

        return !(
            localStorage.getItem('prakriti_distributor_id') &&
            localStorage.getItem('distributor_token')
        );
    });

    const [distributorId, setDistributorId] = useState('');

    const [myProposals, setMyProposals] = useState([]);
    const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);

    const [heroBgIndex, setHeroBgIndex] = useState(0);
    const [carouselIndex, setCarouselIndex] = useState(0);

    const [selectedMarketCategory, setSelectedMarketCategory] =
        useState('All');

    const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
    const [activeDrawerLot, setActiveDrawerLot] = useState(null);
    const [orderQuantity, setOrderQuantity] = useState('500');


    /* =====================================================
       FETCH PROPOSALS
    ===================================================== */

    const fetchMyProposals = async () => {
        const storedDistributorId =
            distributorId ||
            localStorage.getItem('prakriti_distributor_id');

        const token = localStorage.getItem('distributor_token');

        if (!storedDistributorId || !token) {
            return;
        }

        try {
            const res =
                await distributorApi.getDistributorProposalsCustomer(
                    storedDistributorId,
                    'TEA'
                );

            if (res && res.success) {
                setMyProposals(res.data || []);
            }
        } catch (err) {
            console.error(
                'Error loading user procurement pipelines:',
                err
            );
        }
    };


    useEffect(() => {
        if (userAccessLayer === 5 && distributorId) {
            fetchMyProposals();
        }
    }, [userAccessLayer, distributorId]);


    /* =====================================================
       NAVBAR CONTROL
       Existing marketplace behaviour retained
    ===================================================== */

    useEffect(() => {
        const globalNavbar =
            document.querySelector('header') ||
            document.querySelector('nav');

        if (globalNavbar) {
            if (userAccessLayer >= 4) {
                globalNavbar.style.display = 'none';
            } else {
                globalNavbar.style.display = '';
            }
        }

        return () => {
            if (globalNavbar) {
                globalNavbar.style.display = '';
            }
        };
    }, [userAccessLayer]);


    /* =====================================================
       SESSION INITIALIZATION
    ===================================================== */

    useEffect(() => {
        const fetchStatusWithRetry = async (
            id,
            attemptsLeft = 2
        ) => {
            try {
                return await distributorApi.getDistributorStatus(id);
            } catch (err) {
                if (
                    err.response?.status === 404 ||
                    attemptsLeft <= 0
                ) {
                    throw err;
                }

                await new Promise((resolve) =>
                    setTimeout(resolve, 1200)
                );

                return fetchStatusWithRetry(
                    id,
                    attemptsLeft - 1
                );
            }
        };


        const initializeAuthenticationSession = async () => {
            const savedId = localStorage.getItem(
                'prakriti_distributor_id'
            );

            const token =
                localStorage.getItem('distributor_token');

            if (savedId && token) {
                setDistributorId(savedId);

                try {
                    const res =
                        await fetchStatusWithRetry(savedId);

                    if (res.success) {
                        const status =
                            res.data.approvalStatus;

                        if (status === 'approved') {
                            const savedLayer =
                                localStorage.getItem(
                                    ACTIVE_LAYER_KEY
                                );

                            setUserAccessLayer(
                                savedLayer === '5' ? 5 : 1
                            );
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
                        console.error(
                            'Session synchronization failure:',
                            err
                        );
                    }
                }
            }

            setIsLoadingSession(false);
        };

        initializeAuthenticationSession();
    }, []);


    /* =====================================================
       PERSIST CURRENT LAYER
    ===================================================== */

    useEffect(() => {
        if (isSessionLoading) return;

        if (
            userAccessLayer === 1 ||
            userAccessLayer === 5
        ) {
            localStorage.setItem(
                ACTIVE_LAYER_KEY,
                String(userAccessLayer)
            );
        }
    }, [userAccessLayer, isSessionLoading]);


    /* =====================================================
       PENDING ACCOUNT POLLING
    ===================================================== */

    useEffect(() => {
        let pollingTimer;

        if (userAccessLayer === 4 && distributorId) {
            const executeStatusPulseCheck = async () => {
                try {
                    const res =
                        await distributorApi.getDistributorStatus(
                            distributorId
                        );

                    if (res.success) {
                        const currentStatus =
                            res.data.approvalStatus;

                        if (currentStatus === 'approved') {
                            toast.success(
                                'B2B Sourcing Profile Approved! Secure Marketplace Activated.'
                            );

                            clearInterval(pollingTimer);
                            setUserAccessLayer(5);
                        } else if (
                            currentStatus === 'rejected'
                        ) {
                            toast.error(
                                'Sourcing credentials could not be verified.'
                            );

                            clearInterval(pollingTimer);
                            handleLogOut();
                        }
                    }
                } catch (err) {
                    console.error(
                        'Automated background verification polling issue:',
                        err
                    );
                }
            };

            executeStatusPulseCheck();

            pollingTimer = setInterval(
                executeStatusPulseCheck,
                5000
            );
        }

        return () => clearInterval(pollingTimer);
    }, [userAccessLayer, distributorId]);


    /* =====================================================
       HERO + CAROUSEL
    ===================================================== */

    useEffect(() => {
        const bgTimer = setInterval(() => {
            setHeroBgIndex(
                (prev) =>
                    (prev + 1) %
                    HERO_BACKGROUNDS.length
            );
        }, 6000);

        return () => clearInterval(bgTimer);
    }, []);


    useEffect(() => {
        const packTimer = setInterval(() => {
            setCarouselIndex(
                (prev) =>
                    (prev + 1) %
                    CAROUSEL_IMAGES.length
            );
        }, 5000);

        return () => clearInterval(packTimer);
    }, []);


    /* =====================================================
       GATE VERIFICATION
    ===================================================== */

    const handleGateVerified = async (
        activeId,
        activeToken
    ) => {
        if (activeId) {
            setDistributorId(activeId);

            localStorage.setItem(
                'prakriti_distributor_id',
                activeId
            );
        }

        if (activeToken) {
            localStorage.setItem(
                'distributor_token',
                activeToken
            );
        }

        pushDataLayerEvent(
            'tea_distributor_verified',
            {
                division: 'TEA',
            }
        );

        setShowEntryGate(false);
        setUserAccessLayer(1);

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };


    /* =====================================================
       LOGOUT
    ===================================================== */

    const handleLogOut = () => {
        setUserAccessLayer(1);
        setDistributorId('');

        localStorage.removeItem(
            'prakriti_distributor_id'
        );

        localStorage.removeItem(
            'distributor_token'
        );

        localStorage.removeItem(
            ACTIVE_LAYER_KEY
        );

        toast.success(
            'Secured customer session terminated.'
        );
    };


    const handleExitTerminal = () => {
        handleLogOut();

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };


    /* =====================================================
       OPEN LIVE MARKETPLACE
       This is the high-value gated action.
    ===================================================== */

    const handleExploreProducts = () => {
        const savedId = localStorage.getItem(
            'prakriti_distributor_id'
        );

        const token =
            localStorage.getItem('distributor_token');

        if (!savedId || !token) {
            setShowEntryGate(true);
        } else {
            setUserAccessLayer(5);
            window.scrollTo({
                top: 0,
                behavior: 'smooth',
            });
        }
    };


    /* =====================================================
       FILTER
    ===================================================== */

    const filteredMarketLots =
        APPROVED_MARKETPLACE_DATA.filter(
            (lot) =>
                selectedMarketCategory === 'All'
                    ? true
                    : lot.type === selectedMarketCategory
        );


    /* =====================================================
       PUBLIC ENTRY GATE
    ===================================================== */

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


    /* =====================================================
       LOADING
    ===================================================== */

    if (isSessionLoading) {
        return (
            <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <span className="w-10 h-10 border-4 border-[#004B3B] border-t-transparent rounded-full animate-spin block mx-auto" />

                    <p className="text-xs font-mono tracking-widest text-[#004B3B] uppercase font-bold">
                        Synchronizing Trade Pipeline...
                    </p>
                </div>
            </div>
        );
    }


    return (
        <div className="bg-[#FAF9F5] text-slate-900 antialiased min-h-screen font-sans selection:bg-[#50C878]/30 selection:text-[#004B3B]">


            {/* =================================================
                LAYER 4 — ACCOUNT UNDER REVIEW
            ================================================= */}

            {userAccessLayer === 4 && (
                <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">

                    <motion.div
                        initial={{
                            opacity: 0,
                            y: 20,
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                        }}
                        className="max-w-2xl bg-white rounded-2xl p-6 sm:p-12 shadow-2xl border border-slate-200 text-center space-y-6"
                    >

                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-amber-500/10 border border-amber-500/30 text-amber-600 rounded-full flex items-center justify-center mx-auto text-xl sm:text-2xl animate-pulse">
                            <FiShield />
                        </div>

                        <h2 className="text-2xl sm:text-3xl font-serif text-[#0B3D2E] uppercase tracking-wide">
                            Account Under Review
                        </h2>

                        <div className="w-16 h-[2px] bg-amber-500 mx-auto" />

                        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-lg mx-auto font-light">
                            Your Prakriti Tea buyer account is
                            under review. Our team is verifying
                            your business details and documents.
                            You will receive confirmation once
                            your account is approved.
                        </p>

                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left text-xs text-slate-500 space-y-1.5 max-w-md mx-auto">

                            <div className="font-bold text-[#004B3B] uppercase tracking-wider text-[10px] mb-1 font-mono">
                                VERIFICATION CHECKLIST
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                Business and registration details
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                                Procurement requirement and trade profile
                            </div>

                        </div>

                        <div className="pt-2">

                            <button
                                onClick={() =>
                                    setUserAccessLayer(1)
                                }
                                className="text-[10px] font-mono text-[#004B3B] hover:text-[#50C878] uppercase tracking-wider underline underline-offset-4"
                            >
                                Return to Public Storefront View
                            </button>

                        </div>

                    </motion.div>

                </div>
            )}


            {/* =================================================
                LAYER 5 — APPROVED LIVE MARKETPLACE
            ================================================= */}

            {userAccessLayer === 5 && (
                <div className="min-h-screen bg-[#FAF9F5] font-sans text-slate-900 animate-fadeIn antialiased pt-3 sm:pt-6 pb-20 sm:pb-24">

                    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mb-4 sm:mb-8">

                        <div className="bg-[#0B3D2E] text-white rounded-xl p-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border border-[#50C878]/20 shadow-xl">

                            <div className="flex items-center justify-between sm:justify-start gap-3">

                                <div className="flex items-center gap-2.5">

                                    <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-[#50C878]/20 to-white/10 rounded flex items-center justify-center text-[#50C878] font-serif text-base sm:text-lg font-bold border border-white/15 shadow-inner">
                                        P
                                    </div>

                                    <div>
                                        <div className="text-[9px] sm:text-[10px] font-mono tracking-widest text-[#50C878] font-bold uppercase leading-none mb-0.5">
                                            B2B TRADE TERMINAL
                                        </div>

                                        <div className="text-xs sm:text-sm font-serif tracking-wider text-white uppercase font-medium">
                                            INDIA TRADE OVERSEAS
                                        </div>
                                    </div>

                                </div>

                                <div className="sm:hidden flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded text-[9px] font-mono text-emerald-400 font-bold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    LIVE
                                </div>

                            </div>


                            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">

                                <div className="hidden md:flex flex-col text-right font-mono text-[10px] text-slate-300 border-r border-white/10 pr-4">
                                    <span>
                                        ESTATE NETWORK SECURED
                                    </span>

                                    <span className="text-emerald-400">
                                        STATUS: ACTIVE SESSION
                                    </span>
                                </div>


                                <button
                                    onClick={() => {
                                        fetchMyProposals();
                                        setIsProposalModalOpen(true);
                                    }}
                                    className="relative flex-1 sm:flex-none bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-[#50C878] border border-[#50C878]/30 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider py-2.5 px-3 sm:px-4 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <FiFileText />

                                    <span>
                                        My Proposals
                                    </span>

                                    {myProposals.filter(
                                        (p) =>
                                            p.status ===
                                            'approved'
                                    ).length > 0 && (
                                        <span className="bg-amber-500 text-slate-900 w-4 h-4 rounded-full flex items-center justify-center font-sans font-extrabold text-[9px] animate-bounce ml-0.5">
                                            {
                                                myProposals.filter(
                                                    (p) =>
                                                        p.status ===
                                                        'approved'
                                                ).length
                                            }
                                        </span>
                                    )}
                                </button>


                                <button
                                    onClick={
                                        handleExitTerminal
                                    }
                                    className="bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 active:scale-95 border border-white/10 text-slate-200 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider py-2.5 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                                >
                                    Exit Terminal
                                </button>

                            </div>

                        </div>

                    </div>


                    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-4 sm:space-y-8">

                        {/* LIVE MARKETPLACE HERO */}

                        <div className="bg-gradient-to-br from-[#0B3D2E] via-[#004B3B] to-[#043327] rounded-xl sm:rounded-2xl p-5 sm:p-8 border border-[#50C878]/20 shadow-xl relative overflow-hidden text-white">

                            <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-[radial-gradient(circle_at_top_right,rgba(80,200,120,0.12),transparent_60%)] pointer-events-none" />

                            <div className="space-y-2.5 sm:space-y-3 relative z-10 max-w-3xl">

                                <div className="inline-flex items-center gap-1.5 bg-[#50C878]/15 border border-[#50C878]/30 px-2.5 sm:px-3 py-1 rounded text-[9px] sm:text-[10px] font-mono font-bold text-[#50C878] tracking-wider uppercase">
                                    <FiCheckCircle size={11} />
                                    ACCREDITATION: LEVEL 5 VERIFIED
                                </div>

                                <h2 className="text-xl sm:text-3xl lg:text-4xl font-serif tracking-wide text-white uppercase leading-tight">
                                    Prakriti Verified Buyer Marketplace
                                </h2>

                                <p className="text-xs sm:text-sm text-slate-200 font-light leading-relaxed max-w-2xl">
                                    Access live sourcing lots,
                                    current commercial pricing and
                                    direct trade proposal submission
                                    for approved B2B buyers.
                                </p>

                            </div>

                        </div>


                        {/* CATEGORY FILTER */}

                        <div className="bg-white border border-slate-200/80 rounded-xl p-3 sm:p-4 shadow-sm space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between">

                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">

                                {[
                                    'All',
                                    'CTC Tea',
                                    'Orthodox Tea',
                                    'Dust Tea',
                                ].map((cat) => (

                                    <button
                                        key={cat}
                                        onClick={() =>
                                            setSelectedMarketCategory(
                                                cat
                                            )
                                        }
                                        className={`px-3.5 py-2 text-[10px] sm:text-xs font-mono uppercase tracking-wider rounded-lg transition-all font-bold cursor-pointer whitespace-nowrap shrink-0 ${
                                            selectedMarketCategory ===
                                            cat
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
                                {filteredMarketLots.length} Allocation Lots Active
                            </div>

                        </div>


                        {/* MARKETPLACE */}

                        <div className="space-y-3 sm:space-y-4">

                            <div className="flex items-center justify-between px-1">

                                <h3 className="font-serif text-base sm:text-lg text-[#0B3D2E] uppercase tracking-wider font-semibold">
                                    Active Sourcing Lots & Live Pricing
                                </h3>

                            </div>


                            {/* MOBILE */}

                            <div className="grid grid-cols-1 gap-3.5 md:hidden">

                                {filteredMarketLots.map(
                                    (row) => (

                                        <div
                                            key={row.id}
                                            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-[#50C878]/50 transition-all space-y-3"
                                        >

                                            <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">

                                                <div>

                                                    <div className="text-xs font-mono font-bold text-[#004B3B] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mb-1">
                                                        {row.id}
                                                    </div>

                                                    <h4 className="font-serif font-bold text-slate-900 text-sm">
                                                        {row.region}
                                                    </h4>

                                                </div>

                                                <span className="bg-slate-100 px-2 py-0.5 border border-slate-200 font-mono text-[10px] text-slate-800 font-bold rounded">
                                                    {row.grade}
                                                </span>

                                            </div>


                                            <div className="grid grid-cols-2 gap-2 text-xs font-sans">

                                                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">

                                                    <span className="text-[9px] font-mono uppercase text-slate-400 block">
                                                        Liquor Spec
                                                    </span>

                                                    <span className="font-medium text-slate-800">
                                                        {row.color}
                                                    </span>

                                                    <span className="text-[10px] text-slate-500 font-mono block">
                                                        Index: {row.strength}
                                                    </span>

                                                </div>


                                                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">

                                                    <span className="text-[9px] font-mono uppercase text-slate-400 block">
                                                        Inventory / Rate
                                                    </span>

                                                    <span className="font-bold text-[#004B3B] block font-mono">
                                                        INR {row.price}/Kg
                                                    </span>

                                                    <span className="text-[10px] text-slate-500 font-mono block">
                                                        Stock: {row.stock}
                                                    </span>

                                                </div>

                                            </div>


                                            <div className="grid grid-cols-2 gap-2 pt-1">

                                                <button
                                                    onClick={() =>
                                                        toast.success(
                                                            `Sample dispatch request created for Lot ${row.id}`
                                                        )
                                                    }
                                                    className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-2 rounded-lg font-mono font-bold uppercase text-[9px] tracking-wider transition-all"
                                                >
                                                    Request Sample
                                                </button>


                                                <button
                                                    onClick={() => {
                                                        setActiveDrawerLot(
                                                            row
                                                        );
                                                        setIsOrderDrawerOpen(
                                                            true
                                                        );
                                                    }}
                                                    className="bg-[#004B3B] hover:bg-[#053127] active:scale-98 text-white py-2 rounded-lg font-mono font-bold uppercase text-[9px] tracking-wider shadow-xs transition-all flex items-center justify-center gap-1"
                                                >
                                                    <FiShoppingCart size={11} />
                                                    Place Order
                                                </button>

                                            </div>

                                        </div>

                                    )
                                )}

                            </div>


                            {/* DESKTOP */}

                            <div className="hidden md:block bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xl overflow-x-auto">

                                <table className="w-full text-left border-collapse text-xs">

                                    <thead>

                                        <tr className="bg-[#0B3D2E] text-slate-200 border-b border-[#004B3B] font-mono uppercase tracking-wider text-[10px]">

                                            <th className="p-4 font-medium tracking-widest text-[#50C878]">
                                                Lot ID
                                            </th>

                                            <th className="p-4 font-medium tracking-widest">
                                                Origin
                                            </th>

                                            <th className="p-4 font-medium tracking-widest">
                                                Grade
                                            </th>

                                            <th className="p-4 font-medium tracking-widest">
                                                Liquor Character
                                            </th>

                                            <th className="p-4 font-medium tracking-widest">
                                                Inventory
                                            </th>

                                            <th className="p-4 font-medium tracking-widest text-[#50C878]">
                                                Wholesale Price
                                            </th>

                                            <th className="p-4 font-medium tracking-widest text-right pr-6">
                                                Action
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody className="divide-y divide-slate-100 font-sans text-slate-700">

                                        {filteredMarketLots.map(
                                            (row) => (

                                                <tr
                                                    key={row.id}
                                                    className="hover:bg-slate-50/70 transition-colors group"
                                                >

                                                    <td className="p-4 font-mono font-bold text-[#004B3B] text-[13px] tracking-wide">
                                                        {row.id}
                                                    </td>

                                                    <td className="p-4">

                                                        <div className="font-semibold text-slate-900 group-hover:text-[#004B3B] transition-colors">
                                                            {row.region}
                                                        </div>

                                                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                            Origin verified
                                                        </div>

                                                    </td>

                                                    <td className="p-4">

                                                        <span className="bg-slate-100 px-2 py-0.5 border border-slate-200 font-mono text-[11px] text-slate-800 font-bold rounded-sm">
                                                            {row.grade}
                                                        </span>

                                                    </td>

                                                    <td className="p-4 space-y-0.5">

                                                        <div className="text-slate-800 font-medium">
                                                            Color:{' '}
                                                            <span className="text-slate-600 font-normal">
                                                                {row.color}
                                                            </span>
                                                        </div>

                                                        <div className="text-[10px] font-mono text-slate-400">
                                                            Strength Index:{' '}
                                                            {row.strength}
                                                        </div>

                                                    </td>

                                                    <td className="p-4 font-mono font-semibold text-slate-600">
                                                        {row.stock}
                                                    </td>

                                                    <td className="p-4 font-mono font-bold text-[14px] text-[#004B3B]">
                                                        INR {row.price}/Kg
                                                    </td>

                                                    <td className="p-4 text-right space-x-2 whitespace-nowrap pr-6">

                                                        <button
                                                            onClick={() =>
                                                                toast.success(
                                                                    `Sample dispatch request created for Lot ${row.id}`
                                                                )
                                                            }
                                                            className="bg-slate-50 hover:bg-slate-200 border border-slate-200 text-slate-700 px-3 py-2 rounded-sm font-mono font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer"
                                                        >
                                                            Request Sample
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                setActiveDrawerLot(
                                                                    row
                                                                );
                                                                setIsOrderDrawerOpen(
                                                                    true
                                                                );
                                                            }}
                                                            className="bg-[#004B3B] hover:bg-[#053127] text-white px-4 py-2 rounded-sm font-mono font-bold uppercase tracking-wider text-[10px] shadow-sm hover:shadow transition-all cursor-pointer"
                                                        >
                                                            Place Order
                                                        </button>

                                                    </td>

                                                </tr>

                                            )
                                        )}

                                    </tbody>

                                </table>

                            </div>

                        </div>

                    </div>

                </div>
            )}


            {/* =================================================
                PUBLIC LAYER
            ================================================= */}

            {userAccessLayer <= 2 && (
                <>

                    {/* =================================================
                        HERO
                    ================================================= */}

                    <section className="relative w-full min-h-screen flex items-center bg-[#0B3D2E] overflow-hidden py-24">

                        <div className="absolute inset-0 z-0">

                            <AnimatePresence mode="wait">

                                <motion.img
                                    key={heroBgIndex}
                                    src={
                                        HERO_BACKGROUNDS[
                                            heroBgIndex
                                        ]
                                    }
                                    alt="Prakriti premium Indian tea sourcing"
                                    initial={{
                                        opacity: 0,
                                        scale: 1.03,
                                    }}
                                    animate={{
                                        opacity: 1,
                                        scale: 1,
                                    }}
                                    exit={{
                                        opacity: 0,
                                    }}
                                    transition={{
                                        duration: 1.5,
                                        ease: 'easeInOut',
                                    }}
                                    className="w-full h-full object-cover object-center"
                                />

                            </AnimatePresence>

                            <div className="absolute inset-0 bg-gradient-to-r from-[#0B3D2E]/85 via-[#004B3B]/50 to-transparent z-1" />

                            <div className="absolute inset-0 bg-gradient-to-t from-[#0B3D2E]/70 via-transparent to-black/10 z-1" />

                        </div>


                        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">

                            <motion.div
                                className="lg:col-span-8 space-y-7 text-center lg:text-left"
                                initial={{
                                    opacity: 0,
                                    scale: 0.95,
                                    y: 30,
                                }}
                                animate={{
                                    opacity: 1,
                                    scale: 1,
                                    y: 0,
                                }}
                                transition={{
                                    duration: 1.2,
                                    ease: [
                                        0.16,
                                        1,
                                        0.3,
                                        1,
                                    ],
                                    delay: 0.2,
                                }}
                            >

                                <motion.div
                                    className="inline-flex items-center gap-2 bg-[#50C878]/20 border border-[#50C878]/40 rounded-full px-4 py-1.5 backdrop-blur-md"
                                    initial={{
                                        opacity: 0,
                                        x: -10,
                                    }}
                                    animate={{
                                        opacity: 1,
                                        x: 0,
                                    }}
                                    transition={{
                                        duration: 0.8,
                                        delay: 0.5,
                                    }}
                                >
                                    <span className="w-2 h-2 rounded-full bg-[#50C878] animate-pulse" />

                                    <span className="text-[10px] tracking-widest font-mono uppercase text-white font-bold">
                                        PRAKRITI BY INDIA TRADE OVERSEAS
                                    </span>
                                </motion.div>


                                <motion.h1
                                    className="text-4xl sm:text-7xl font-serif text-white tracking-tight leading-none uppercase"
                                    initial={{
                                        scale: 0.97,
                                    }}
                                    animate={{
                                        scale: 1,
                                    }}
                                    transition={{
                                        duration: 1,
                                        ease: 'easeOut',
                                        delay: 0.4,
                                    }}
                                >

                                    PREMIUM
                                    <br />

                                    <span className="text-[#50C878] font-sans font-light normal-case tracking-wide text-xl sm:text-4xl block mt-3">
                                        Indian Tea for Bulk Supply & Private Label
                                    </span>

                                </motion.h1>


                                <motion.div
                                    className="w-24 h-[2px] bg-[#50C878] mx-auto lg:mx-0"
                                    initial={{
                                        width: 0,
                                    }}
                                    animate={{
                                        width: 96,
                                    }}
                                    transition={{
                                        duration: 1,
                                        delay: 0.7,
                                        ease: 'easeInOut',
                                    }}
                                />


                                <motion.p
                                    className="text-xs sm:text-base text-slate-100 font-light max-w-xl mx-auto lg:mx-0 leading-relaxed drop-shadow-md"
                                    initial={{
                                        opacity: 0,
                                        y: 10,
                                    }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                    }}
                                    transition={{
                                        duration: 0.8,
                                        delay: 0.6,
                                    }}
                                >
                                    Source premium, regular, garden,
                                    flavoured and customized tea from
                                    Assam, Darjeeling, Dooars and the
                                    Siliguri corridor for retail, trade,
                                    hospitality, distribution and
                                    private-label requirements.
                                </motion.p>


                                <motion.div
                                    className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-3"
                                    initial={{
                                        opacity: 0,
                                        y: 15,
                                    }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                    }}
                                    transition={{
                                        duration: 0.8,
                                        delay: 0.8,
                                    }}
                                >

                                    <Link
                                        to="/quote-request"
                                        className="bg-[#50C878] hover:bg-[#40b064] text-[#0B3D2E] text-[9px] sm:text-xs font-mono font-bold uppercase tracking-wider px-6 sm:px-8 py-3.5 sm:py-4 rounded-lg shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                                    >
                                        Request Bulk Quote
                                    </Link>


                                    <button
                                        onClick={
                                            handleExploreProducts
                                        }
                                        className="bg-white/10 hover:bg-white/20 text-white text-[9px] sm:text-xs font-mono font-bold uppercase tracking-wider px-6 sm:px-8 py-3.5 sm:py-4 rounded-lg backdrop-blur-md border border-white/20 transition-all"
                                    >
                                        Explore Live Products
                                    </button>

                                </motion.div>

                            </motion.div>


                            {/* HERO FACTS */}

                            <div className="lg:col-span-4 space-y-4">

                                {[
                                    {
                                        label: 'Tea Availability',
                                        value: '200–300 Garden Options',
                                        desc: 'Selected sourcing options across major tea regions.',
                                    },
                                    {
                                        label: 'Indicative Range',
                                        value: 'INR 120–450 / Kg',
                                        desc: 'Indicative range; final pricing depends on grade, source, quantity and delivery.',
                                    },
                                    {
                                        label: 'Packaging',
                                        value: '100 g – 10 kg',
                                        desc: 'Retail, trade, bulk and private-label configurations.',
                                    },
                                ].map(
                                    (item, idx) => (

                                        <motion.div
                                            key={idx}
                                            className="p-5 rounded-xl border border-white/10 bg-[#0B3D2E]/70 backdrop-blur-xs shadow-md"
                                            initial={{
                                                opacity: 0,
                                                x: 20,
                                            }}
                                            animate={{
                                                opacity: 1,
                                                x: 0,
                                            }}
                                            transition={{
                                                duration: 0.6,
                                                delay:
                                                    0.4 +
                                                    idx * 0.15,
                                            }}
                                        >

                                            <div className="text-[9px] uppercase font-mono tracking-widest text-[#50C878] font-bold">
                                                {item.label}
                                            </div>

                                            <div className="text-base sm:text-lg font-serif text-white my-0.5">
                                                {item.value}
                                            </div>

                                            <div className="text-[11px] text-slate-300 font-light leading-snug">
                                                {item.desc}
                                            </div>

                                        </motion.div>

                                    )
                                )}

                            </div>

                        </div>

                    </section>


                    {/* =================================================
                        QUALITY PROMISE
                    ================================================= */}

                    <section className="py-20 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">

                            <div>

                                <span className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#004B3B] bg-[#50C878]/20 px-3 py-1 rounded-sm">
                                    The Prakriti Promise
                                </span>

                                <h2 className="mt-5 text-3xl sm:text-4xl font-serif text-[#0B3D2E] uppercase tracking-wide leading-tight">
                                    A tea range built
                                    <br />
                                    for quality and business.
                                </h2>

                                <p className="mt-5 text-slate-600 text-sm leading-relaxed max-w-xl">
                                    Prakriti supports premium tea retail,
                                    bulk supply, foodservice,
                                    distribution and private-label
                                    programmes. We align grade, source,
                                    liquor strength, aroma, packaging
                                    and quantity with buyer requirements.
                                </p>

                            </div>


                            <div className="grid sm:grid-cols-2 gap-4">

                                {[
                                    {
                                        icon: GiTeapot,
                                        title: 'Rich Aroma',
                                        text: 'Tea selected for aroma, freshness and satisfying brew profiles.',
                                    },
                                    {
                                        icon: FiShield,
                                        title: 'Strong Liquor',
                                        text: 'Options for brisk, strong and balanced tea profiles.',
                                    },
                                    {
                                        icon: FiAward,
                                        title: 'All Grades',
                                        text: 'Dust, BP, BOP, BOPSM, OF, Pekoe and custom blends.',
                                    },
                                    {
                                        icon: FiGlobe,
                                        title: 'Garden Sources',
                                        text: 'Assam, Darjeeling, Dooars and Siliguri corridor.',
                                    },
                                    {
                                        icon: GiBoxUnpacking,
                                        title: 'Flexible Packing',
                                        text: 'Retail and bulk pack sizes from 100 g to 5 kg.',
                                    },
                                    {
                                        icon: FiBriefcase,
                                        title: 'Business Ready',
                                        text: 'Built for distribution, retail, hospitality and private label.',
                                    },
                                ].map(
                                    (item) => {

                                        const Icon =
                                            item.icon;

                                        return (
                                            <div
                                                key={
                                                    item.title
                                                }
                                                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"
                                            >

                                                <Icon
                                                    size={20}
                                                    className="text-[#004B3B] mb-4"
                                                />

                                                <h3 className="font-serif text-base font-bold text-[#0B3D2E] uppercase tracking-wide">
                                                    {
                                                        item.title
                                                    }
                                                </h3>

                                                <p className="mt-2 text-slate-500 text-xs font-light leading-relaxed">
                                                    {
                                                        item.text
                                                    }
                                                </p>

                                            </div>
                                        );
                                    }
                                )}

                            </div>

                        </div>

                    </section>


                    {/* =================================================
                        TEA GRADES
                    ================================================= */}

                    <section className="py-20 sm:py-24 bg-white border-y border-slate-200">

                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                            <div className="text-center max-w-3xl mx-auto">

                                <span className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#004B3B] bg-[#50C878]/20 px-3 py-1 rounded-sm">
                                    Tea Grades
                                </span>

                                <h2 className="mt-5 text-3xl sm:text-4xl font-serif text-[#0B3D2E] uppercase tracking-wide">
                                    Choose the tea profile
                                    your business needs.
                                </h2>

                                <p className="mt-4 text-slate-500 text-sm leading-relaxed">
                                    Availability varies by season, garden,
                                    lot quality, packaging and order
                                    quantity. Share your requirement for
                                    a fresh quotation.
                                </p>

                            </div>


                            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

                                {TEA_GRADES.map(
                                    (grade) => {

                                        const Icon =
                                            grade.icon;

                                        return (
                                            <div
                                                key={
                                                    grade.title
                                                }
                                                className="bg-[#FAF9F5] border border-slate-200 rounded-xl p-5 shadow-sm hover:border-[#50C878]/40 transition-all group"
                                            >

                                                <div className="flex items-center justify-between">

                                                    <div className="w-10 h-10 bg-[#004B3B]/5 rounded-lg flex items-center justify-center text-[#004B3B] group-hover:bg-[#004B3B] group-hover:text-[#50C878] transition-all">
                                                        <Icon
                                                            size={
                                                                19
                                                            }
                                                        />
                                                    </div>

                                                    <span className="text-[10px] font-mono font-bold text-[#004B3B]">
                                                        {
                                                            grade.code
                                                        }
                                                    </span>

                                                </div>

                                                <h3 className="mt-5 font-serif text-base font-bold text-[#0B3D2E] uppercase tracking-wide">
                                                    {
                                                        grade.title
                                                    }
                                                </h3>

                                                <p className="mt-2 text-slate-500 text-xs font-light leading-relaxed">
                                                    {
                                                        grade.description
                                                    }
                                                </p>

                                            </div>
                                        );
                                    }
                                )}

                            </div>

                        </div>

                    </section>


                    {/* =================================================
                        GARDEN SOURCING
                    ================================================= */}

                    <section className="py-20 sm:py-24 bg-[#004B3B] text-white">

                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                            <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-12 items-start">

                                <div>

                                    <span className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#50C878]">
                                        Garden Sourcing
                                    </span>

                                    <h2 className="mt-4 text-3xl sm:text-4xl font-serif uppercase tracking-wide leading-tight">
                                        From India's leading
                                        <br />
                                        tea regions.
                                    </h2>

                                    <p className="mt-5 text-slate-200 text-sm font-light leading-relaxed max-w-md">
                                        Selected sourcing channels across
                                        Assam, Darjeeling, Dooars and the
                                        Siliguri corridor provide access to
                                        varied tea profiles for different
                                        commercial requirements.
                                    </p>

                                    <div className="mt-7 inline-flex items-center gap-2 border border-[#50C878]/30 bg-[#50C878]/10 rounded-full px-4 py-2">
                                        <FiMapPin
                                            className="text-[#50C878]"
                                            size={14}
                                        />

                                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#50C878]">
                                            200–300 Garden Options
                                        </span>
                                    </div>

                                </div>


                                <div className="grid sm:grid-cols-2 gap-5">

                                    {SOURCING_REGIONS.map(
                                        (region) => (

                                            <div
                                                key={
                                                    region.title
                                                }
                                                className="relative min-h-[250px] rounded-xl overflow-hidden border border-white/10"
                                            >

                                                <img
                                                    src={
                                                        region.image
                                                    }
                                                    alt={
                                                        region.title
                                                    }
                                                    className="absolute inset-0 w-full h-full object-cover"
                                                />

                                                <div className="absolute inset-0 bg-gradient-to-t from-[#0B3D2E] via-[#0B3D2E]/50 to-transparent" />

                                                <div className="relative z-10 h-full min-h-[250px] p-5 flex flex-col justify-end">

                                                    <span className="text-[10px] font-mono font-bold text-[#50C878]">
                                                        {
                                                            region.code
                                                        }
                                                    </span>

                                                    <h3 className="mt-1 text-xl font-serif uppercase tracking-wide text-white">
                                                        {
                                                            region.title
                                                        }
                                                    </h3>

                                                    <p className="mt-2 text-xs text-slate-200 font-light leading-relaxed">
                                                        {
                                                            region.description
                                                        }
                                                    </p>

                                                </div>

                                            </div>

                                        )
                                    )}

                                </div>

                            </div>

                        </div>

                    </section>


                    {/* =================================================
                        PACKAGING
                    ================================================= */}

                    <section className="relative py-20 sm:py-24 bg-[#0B3D2E] text-slate-900 px-4 sm:px-6 lg:px-8 overflow-hidden">

                        <div className="absolute inset-0 z-0 pointer-events-none">

                            <img
                                src="/images/Prakriti Image.jpeg"
                                alt="Prakriti tea packaging"
                                className="w-full h-full object-cover object-center opacity-40 sm:opacity-100"
                            />

                            <div className="absolute inset-0 bg-gradient-to-b sm:bg-gradient-to-r from-[#014B3B]/85 via-[#0B3D2E]/80 to-[#014B3B]/75 sm:from-[#014B3B]/80 sm:via-[#0B3D2E]/70 sm:to-[#014B3B]/50 z-1" />

                            <div className="absolute inset-0 bg-[#0B3D2E]/40 z-1" />

                        </div>


                        <div className="relative z-10 max-w-5xl mx-auto space-y-10">

                            <div className="text-center space-y-3">

                                <span className="inline-block text-[10px] sm:text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#50C878] bg-[#004B3B]/80 px-3 py-1 rounded-full border border-[#50C878]/30 backdrop-blur-md shadow-sm">
                                    Packaging Portfolio
                                </span>

                                <h2 className="text-2xl sm:text-4xl font-serif uppercase tracking-wide text-white drop-shadow-md leading-tight">
                                    Designed for every tea business
                                </h2>

                                <p className="text-xs sm:text-sm text-slate-200 font-light max-w-2xl mx-auto leading-relaxed">
                                    Retail, trade, bulk and private-label
                                    packaging from 100 g to 10 kg.
                                </p>

                            </div>


                            <div className="relative border border-white/10 rounded-2xl p-4 sm:p-10 shadow-2xl min-h-[320px] flex flex-col justify-between overflow-hidden bg-white/95 backdrop-blur-md">

                                <div className="absolute inset-y-0 left-1 sm:left-3 flex items-center z-30">

                                    <button
                                        onClick={() =>
                                            setCarouselIndex(
                                                (prev) =>
                                                    (prev -
                                                        1 +
                                                        CAROUSEL_IMAGES.length) %
                                                    CAROUSEL_IMAGES.length
                                            )
                                        }
                                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#004B3B] hover:bg-[#50C878] hover:text-[#004B3B] text-white flex items-center justify-center transition-all shadow-lg active:scale-95"
                                        aria-label="Previous Slide"
                                    >
                                        <FiArrowLeft
                                            size={18}
                                        />
                                    </button>

                                </div>


                                <div className="absolute inset-y-0 right-1 sm:right-3 flex items-center z-30">

                                    <button
                                        onClick={() =>
                                            setCarouselIndex(
                                                (prev) =>
                                                    (prev +
                                                        1) %
                                                    CAROUSEL_IMAGES.length
                                            )
                                        }
                                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#004B3B] hover:bg-[#50C878] hover:text-[#004B3B] text-white flex items-center justify-center transition-all shadow-lg active:scale-95"
                                        aria-label="Next Slide"
                                    >
                                        <FiArrowRight
                                            size={18}
                                        />
                                    </button>

                                </div>


                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center w-full relative z-10 py-2 sm:py-4 px-8 sm:px-12">

                                    <div className="md:col-span-4 w-full flex justify-center">

                                        <div className="relative w-36 sm:w-44 h-48 sm:h-56 rounded-xl overflow-hidden border border-slate-200 shadow-md bg-[#FAF9F5] flex items-center justify-center p-3">

                                            {CAROUSEL_IMAGES[
                                                carouselIndex
                                            ] && (
                                                <img
                                                    src={
                                                        CAROUSEL_IMAGES[
                                                            carouselIndex
                                                        ].image
                                                    }
                                                    alt={`Prakriti ${CAROUSEL_IMAGES[carouselIndex].size} tea pack`}
                                                    className="w-full h-full object-contain"
                                                />
                                            )}

                                            <div className="absolute bottom-2 left-2 bg-[#004B3B] text-[#50C878] text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                                                {
                                                    CAROUSEL_IMAGES[
                                                        carouselIndex
                                                    ]?.size
                                                }
                                            </div>

                                        </div>

                                    </div>


                                    <div className="md:col-span-8 space-y-3 text-center md:text-left">

                                        <span className="inline-flex items-center text-[9px] font-mono uppercase tracking-widest text-[#004B3B] bg-[#50C878]/30 px-2.5 py-1 rounded-sm font-bold">
                                            {
                                                CAROUSEL_IMAGES[
                                                    carouselIndex
                                                ]?.format
                                            }
                                        </span>

                                        <h3 className="text-xl sm:text-3xl font-serif text-[#0B3D2E] font-bold">
                                            {
                                                CAROUSEL_IMAGES[
                                                    carouselIndex
                                                ]?.size
                                            }{' '}
                                            Format
                                        </h3>

                                        <p className="text-slate-600 font-sans font-light text-xs sm:text-sm leading-relaxed max-w-xl mx-auto md:mx-0">
                                            {
                                                CAROUSEL_IMAGES[
                                                    carouselIndex
                                                ]?.description
                                            }
                                        </p>

                                    </div>

                                </div>


                                <div className="flex justify-center items-center gap-2 pt-4 border-t border-slate-100 relative z-10">

                                    {CAROUSEL_IMAGES.map(
                                        (_, idx) => (

                                            <button
                                                key={idx}
                                                onClick={() =>
                                                    setCarouselIndex(
                                                        idx
                                                    )
                                                }
                                                className={`h-1.5 transition-all rounded-full ${
                                                    carouselIndex ===
                                                    idx
                                                        ? 'bg-[#004B3B] w-6'
                                                        : 'bg-slate-200 w-1.5'
                                                }`}
                                                aria-label={`Go to slide ${
                                                    idx + 1
                                                }`}
                                            />

                                        )
                                    )}

                                </div>

                            </div>

                        </div>

                    </section>


                    {/* =================================================
                        BUSINESS CHANNELS
                    ================================================= */}

                    <section className="py-20 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                        <div className="text-center max-w-3xl mx-auto">

                            <span className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#004B3B] bg-[#50C878]/20 px-3 py-1 rounded-sm">
                                Built for Business
                            </span>

                            <h2 className="mt-5 text-3xl sm:text-4xl font-serif text-[#0B3D2E] uppercase tracking-wide">
                                A tea range for every
                                selling channel.
                            </h2>

                            <p className="mt-4 text-slate-500 text-sm leading-relaxed">
                                From retail shelves to bulk distribution
                                and private-label programmes.
                            </p>

                        </div>


                        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

                            {BUSINESS_CHANNELS.map(
                                (channel) => {

                                    const Icon =
                                        channel.icon;

                                    return (
                                        <div
                                            key={
                                                channel.title
                                            }
                                            className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:border-[#50C878]/40 transition-all"
                                        >

                                            <Icon
                                                size={20}
                                                className="text-[#004B3B] mb-5"
                                            />

                                            <h3 className="font-serif text-base font-bold text-[#0B3D2E] uppercase tracking-wide">
                                                {
                                                    channel.title
                                                }
                                            </h3>

                                            <p className="mt-2 text-slate-500 text-xs font-light leading-relaxed">
                                                {
                                                    channel.description
                                                }
                                            </p>

                                        </div>
                                    );
                                }
                            )}

                        </div>


                        <div className="mt-10 bg-[#004B3B] rounded-xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6">

                            <div>

                                <span className="text-[10px] font-mono uppercase tracking-widest text-[#50C878] font-bold">
                                    Private Label
                                </span>

                                <h3 className="mt-2 text-xl sm:text-2xl font-serif uppercase tracking-wide">
                                    Build a customized tea programme.
                                </h3>

                                <p className="mt-2 text-xs sm:text-sm text-slate-200 font-light max-w-2xl leading-relaxed">
                                    Choose grade, source, liquor profile,
                                    aroma, packaging size and branding
                                    direction for a requirement-based
                                    bulk or private-label proposal.
                                </p>

                            </div>


                            <Link
                                to="/quote-request"
                                className="shrink-0 bg-[#50C878] hover:bg-[#40b064] text-[#0B3D2E] px-6 py-3.5 rounded-lg font-mono font-bold uppercase tracking-wider text-[10px] transition-all"
                            >
                                Discuss Private Label
                            </Link>

                        </div>

                    </section>


                    {/* =================================================
                        PUBLIC TEASER
                    ================================================= */}

                    <section
                        id="teaser-deck"
                        className="py-20 sm:py-24 bg-[#004B3B] text-white px-4 sm:px-6 lg:px-8 border-y border-[#50C878]/20 relative overflow-hidden"
                    >

                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(80,200,120,0.06),transparent_40%)]" />

                        <div className="max-w-7xl mx-auto space-y-10 relative z-10">

                            <div className="text-center max-w-2xl mx-auto">

                                <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#50C878]">
                                    Sourcing Preview
                                </span>

                                <h2 className="mt-2 text-3xl font-serif text-white uppercase tracking-wide">
                                    Available Tea Categories
                                </h2>

                                <p className="mt-4 text-xs sm:text-sm text-slate-200 font-light leading-relaxed">
                                    Basic product information is public.
                                    Live lot pricing and personalized
                                    sourcing availability are available
                                    to verified B2B buyers.
                                </p>

                            </div>


                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                                {TEASER_LISTINGS.map(
                                    (lot) => (

                                        <div
                                            key={lot.id}
                                            className="bg-[#0B3D2E]/60 border border-white/10 rounded-xl p-5 shadow-xl flex flex-col justify-between min-h-[290px] relative overflow-hidden"
                                        >

                                            <div className="space-y-4">

                                                <div className="border-b border-white/5 pb-2 flex items-center justify-between">

                                                    <span className="text-[10px] font-mono font-bold uppercase text-[#50C878] tracking-widest">
                                                        {
                                                            lot.region
                                                        }
                                                    </span>

                                                    <span className="text-[9px] font-mono bg-white/5 px-2 py-0.5 rounded text-slate-400">
                                                        TEA
                                                    </span>

                                                </div>

                                                <div className="space-y-2">

                                                    <div className="text-sm font-serif font-bold text-white uppercase tracking-wide">
                                                        {
                                                            lot.type
                                                        }
                                                    </div>

                                                    <div className="text-xs font-light text-slate-300">
                                                        Grade: {lot.grade}
                                                    </div>

                                                    <div className="text-xs font-light text-slate-300">
                                                        Pack: {lot.package}
                                                    </div>

                                                    <div className="text-xs font-light text-slate-300">
                                                        Use: {lot.use}
                                                    </div>

                                                </div>


                                                <div className="bg-black/20 rounded-lg p-3 border border-white/5 text-[10px] font-mono space-y-1 relative">

                                                    <div className="filter blur-xs select-none space-y-1 opacity-40">

                                                        <div>
                                                            WHOLESALE PRICE:
                                                            INR XXX / Kg
                                                        </div>

                                                        <div>
                                                            GARDEN:
                                                            [Live Selection]
                                                        </div>

                                                        <div>
                                                            AVAILABILITY:
                                                            [Live Data]
                                                        </div>

                                                    </div>


                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-lg">

                                                        <div className="text-[9px] text-[#50C878] font-bold uppercase bg-[#004B3B] px-2 py-1 rounded border border-[#50C878]/30 tracking-widest flex items-center gap-1">
                                                            <FiLock />
                                                            LIVE DATA LOCKED
                                                        </div>

                                                    </div>

                                                </div>

                                            </div>


                                            <div className="pt-4 border-t border-white/5 mt-5">

                                                <button
                                                    onClick={
                                                        handleExploreProducts
                                                    }
                                                    className="w-full bg-white/5 hover:bg-[#50C878] text-white hover:text-[#004B3B] text-[9px] sm:text-xs font-mono font-bold uppercase tracking-wider py-3 px-2 rounded-lg border border-white/10 transition-all text-center flex items-center justify-center"
                                                >
                                                    Access Live Availability
                                                </button>

                                            </div>

                                        </div>

                                    )
                                )}

                            </div>

                        </div>

                    </section>


                    {/* =================================================
                        HOW TO ORDER
                    ================================================= */}

                    <section className="py-20 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">

                            <div>

                                <span className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#004B3B] bg-[#50C878]/20 px-3 py-1 rounded-sm">
                                    Business Enquiry
                                </span>

                                <h2 className="mt-5 text-3xl sm:text-4xl font-serif text-[#0B3D2E] uppercase tracking-wide leading-tight">
                                    Your requirement,
                                    <br />
                                    precisely quoted.
                                </h2>

                                <p className="mt-5 text-slate-600 text-sm font-light leading-relaxed max-w-xl">
                                    A complete requirement helps us
                                    recommend the right tea grade,
                                    packaging configuration and fresh
                                    commercial price.
                                </p>


                                <Link
                                    to="/quote-request"
                                    className="mt-7 inline-flex items-center gap-2 bg-[#004B3B] hover:bg-[#053127] text-white font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider px-5 py-3.5 rounded-lg transition-all"
                                >
                                    Request Bulk Quote
                                    <FiArrowRight />
                                </Link>

                            </div>


                            <div className="space-y-4">

                                {[
                                    {
                                        no: '01',
                                        title: 'Select Grade',
                                        text: 'Dust, BP, BOP, BOPSM, OF, Pekoe, Garden Tea or Custom Blend.',
                                    },
                                    {
                                        no: '02',
                                        title: 'Choose Source',
                                        text: 'Assam, Darjeeling, Dooars, Siliguri corridor or blended sourcing.',
                                    },
                                    {
                                        no: '03',
                                        title: 'Confirm Pack',
                                        text: '100 g, 250 g, 500 g, 1 kg, 2 kg, 5 kg or 10 kg.',
                                    },
                                    {
                                        no: '04',
                                        title: 'Share Quantity',
                                        text: 'One-time or monthly demand, expected order size and timeline.',
                                    },
                                    {
                                        no: '05',
                                        title: 'Get Quote',
                                        text: 'Fresh requirement-specific commercial quotation and order proposal.',
                                    },
                                ].map(
                                    (step) => (

                                        <div
                                            key={
                                                step.no
                                            }
                                            className="bg-white border border-slate-200 rounded-xl p-5 flex gap-5 items-start shadow-sm"
                                        >

                                            <span className="font-serif text-[#6D7886] font-bold text-lg tracking-wider shrink-0">
                                                {
                                                    step.no
                                                }
                                            </span>

                                            <div>

                                                <h3 className="font-serif text-base font-bold text-[#0B3D2E] uppercase tracking-wide">
                                                    {
                                                        step.title
                                                    }
                                                </h3>

                                                <p className="mt-1 text-slate-500 text-xs font-light leading-relaxed">
                                                    {
                                                        step.text
                                                    }
                                                </p>

                                            </div>

                                        </div>

                                    )
                                )}

                            </div>

                        </div>

                    </section>


                    {/* =================================================
                        TESTIMONIALS
                    ================================================= */}

                    <section className="relative py-8 sm:py-10 bg-[#0B3D2E] px-4 sm:px-6 lg:px-8 border-t border-[#50C878]/15 overflow-hidden">

                        <TestimonialSectionBackground
                            accentColor={TEA_ACCENT}
                        />

                        <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">

                            <div className="text-center lg:text-left">

                                <span className="inline-block text-[10px] sm:text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#50C878] bg-[#004B3B]/80 px-3 py-1 rounded-full border border-[#50C878]/30 mb-3">
                                    Trusted By Buyers
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
                                    accentTextColor={
                                        TEA_ACCENT_TEXT
                                    }
                                    aspectClass="aspect-[3/4]"
                                />

                            </div>

                        </div>

                    </section>


                    {/* =================================================
                        FINAL CTA
                    ================================================= */}

                    <section className="py-20 sm:py-24 bg-[#FAF9F5] border-t border-slate-200">

                        <div className="max-w-4xl mx-auto px-4 text-center">

                            <span className="inline-flex items-center gap-2 bg-[#50C878]/20 border border-[#50C878]/30 rounded-full px-4 py-1">

                                <span className="w-1.5 h-1.5 rounded-full bg-[#004B3B]" />

                                <span className="text-[10px] tracking-widest font-mono uppercase text-[#004B3B] font-bold">
                                    Tell Us What You Need
                                </span>

                            </span>


                            <h2 className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-serif text-[#0B3D2E] tracking-wide uppercase leading-tight">
                                Ready to source
                                <br />
                                <span className="font-medium">
                                    your tea requirement?
                                </span>
                            </h2>


                            <p className="mt-5 text-slate-600 font-light text-sm max-w-2xl leading-relaxed mx-auto">
                                Share your preferred grade, source,
                                packaging, quantity and delivery
                                requirement. Our commercial team will
                                prepare a requirement-specific quotation.
                            </p>


                            <div className="flex flex-col sm:flex-row gap-4 pt-8 items-center justify-center">

                                <Link
                                    to="/quote-request"
                                    className="w-full sm:w-auto min-w-[220px] h-[52px] bg-[#004B3B] hover:bg-[#053127] text-white font-sans font-bold text-[11px] sm:text-[12px] uppercase tracking-widest flex items-center justify-center rounded-[2px] transition-all"
                                >
                                    Request Bulk Quote
                                    <span className="ml-2">
                                        →
                                    </span>
                                </Link>


                                <button
                                    onClick={
                                        handleExploreProducts
                                    }
                                    className="w-full sm:w-auto min-w-[220px] h-[52px] bg-white border border-[#004B3B]/30 hover:bg-[#004B3B] hover:text-[#50C878] text-[#004B3B] font-sans font-bold text-[11px] sm:text-[12px] uppercase tracking-widest flex items-center justify-center rounded-[2px] transition-all"
                                >
                                    Explore Live Products
                                </button>

                            </div>

                        </div>

                    </section>

                </>
            )}


            {/* =====================================================
                MY PROPOSALS MODAL
            ===================================================== */}

            <AnimatePresence>

                {isProposalModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-xs">

                        <motion.div
                            initial={{
                                opacity: 0,
                                y: 100,
                            }}
                            animate={{
                                opacity: 1,
                                y: 0,
                            }}
                            exit={{
                                opacity: 0,
                                y: 100,
                            }}
                            className="w-full max-w-3xl bg-white rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh] sm:max-h-[85vh]"
                        >

                            <div className="bg-[#0B3D2E] text-white p-4 sm:p-6 flex justify-between items-center">

                                <div>

                                    <div className="text-[9px] font-mono tracking-widest text-[#50C878] font-bold uppercase">
                                        Procurement Tracking
                                    </div>

                                    <h2 className="text-base sm:text-xl font-serif text-white uppercase tracking-wide">
                                        My Active Trade Proposals
                                    </h2>

                                </div>


                                <button
                                    onClick={() =>
                                        setIsProposalModalOpen(
                                            false
                                        )
                                    }
                                    className="p-1.5 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer bg-white/5 border border-white/10"
                                >
                                    <FiX size={18} />
                                </button>

                            </div>


                            <div className="p-3 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1 bg-slate-50/50">

                                {myProposals.length === 0 ? (

                                    <div className="py-16 text-center text-slate-400 italic text-xs font-light">
                                        No trade proposals submitted yet.
                                    </div>

                                ) : (

                                    <div className="space-y-3">

                                        {myProposals.map(
                                            (prop) => (

                                                <div
                                                    key={
                                                        prop._id
                                                    }
                                                    className={`p-3.5 sm:p-4 rounded-xl border text-xs transition-all space-y-3 ${
                                                        prop.status ===
                                                        'approved'
                                                            ? 'border-emerald-300/80 bg-white shadow-sm'
                                                            : prop.status ===
                                                              'disapproved'
                                                            ? 'border-rose-200 bg-rose-50/20'
                                                            : 'border-slate-200 bg-white'
                                                    }`}
                                                >

                                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 pb-2.5">

                                                        <div className="space-y-0.5">

                                                            <div className="flex items-center gap-2">

                                                                <span className="text-sm font-bold font-mono text-[#0B3D2E]">
                                                                    {
                                                                        prop.lotId
                                                                    }
                                                                </span>

                                                                <span className="text-[10px] font-mono text-slate-400">
                                                                    (
                                                                    {
                                                                        prop.grade
                                                                    }
                                                                    )
                                                                </span>

                                                            </div>

                                                            <div className="text-xs text-slate-600 font-light">
                                                                Region:{' '}
                                                                <span className="font-medium text-slate-800">
                                                                    {
                                                                        prop.region
                                                                    }
                                                                </span>
                                                            </div>

                                                        </div>


                                                        <span
                                                            className={`px-2.5 py-1 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border ${
                                                                prop.status ===
                                                                'approved'
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                                                    : prop.status ===
                                                                      'disapproved'
                                                                    ? 'bg-rose-50 text-rose-700 border-rose-300'
                                                                    : 'bg-amber-50 text-amber-700 border-amber-300'
                                                            }`}
                                                        >
                                                            {
                                                                prop.status ===
                                                                'approved'
                                                                    ? 'Approved'
                                                                    : prop.status ===
                                                                      'disapproved'
                                                                    ? 'Rejected'
                                                                    : 'Under Review'
                                                            }
                                                        </span>

                                                    </div>


                                                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-100">

                                                        <div>

                                                            <span className="text-slate-400 block text-[9px] uppercase font-sans">
                                                                Volume
                                                            </span>

                                                            <span className="font-bold text-slate-800">
                                                                {prop.quantity?.toLocaleString()}{' '}
                                                                Kg
                                                            </span>

                                                        </div>


                                                        <div>

                                                            <span className="text-slate-400 block text-[9px] uppercase font-sans">
                                                                Net Value
                                                            </span>

                                                            <span className="font-bold text-[#004B3B]">
                                                                INR{' '}
                                                                {(
                                                                    prop.estimatedValue ||
                                                                    prop.quantity *
                                                                        prop.basePrice
                                                                )?.toLocaleString()}
                                                            </span>

                                                        </div>

                                                    </div>

                                                </div>

                                            )
                                        )}

                                    </div>

                                )}

                            </div>

                        </motion.div>

                    </div>
                )}

            </AnimatePresence>


            {/* =====================================================
                ORDER DRAWER
            ===================================================== */}

            <AnimatePresence>

                {isOrderDrawerOpen &&
                    activeDrawerLot && (

                        <div className="fixed inset-0 z-50 overflow-hidden">

                            <div
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
                                onClick={() =>
                                    setIsOrderDrawerOpen(
                                        false
                                    )
                                }
                            />


                            <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">

                                <motion.div
                                    initial={{
                                        x: '100%',
                                    }}
                                    animate={{
                                        x: 0,
                                    }}
                                    exit={{
                                        x: '100%',
                                    }}
                                    transition={{
                                        type: 'tween',
                                        duration: 0.3,
                                    }}
                                    className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between"
                                >

                                    <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 text-left flex-1">

                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">

                                            <h2 className="text-base sm:text-xl font-serif text-[#004B3B] uppercase tracking-wide">
                                                Submit Sourcing Request
                                            </h2>

                                            <button
                                                onClick={() =>
                                                    setIsOrderDrawerOpen(
                                                        false
                                                    )
                                                }
                                                className="p-1 text-slate-400 hover:text-slate-600 rounded-md bg-slate-100"
                                            >
                                                <FiX
                                                    size={18}
                                                />
                                            </button>

                                        </div>


                                        <div className="bg-[#FAF9F5] border border-slate-200 rounded-xl p-3.5 space-y-2">

                                            <span className="text-[9px] font-mono bg-[#004B3B] text-[#50C878] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                                Lot Target:{' '}
                                                {
                                                    activeDrawerLot.id
                                                }
                                            </span>

                                            <div className="text-xs sm:text-sm font-bold text-slate-900 font-serif">
                                                {
                                                    activeDrawerLot.region
                                                }
                                            </div>

                                            <div className="text-xs text-slate-600">
                                                Grade:{' '}
                                                <span className="font-mono font-bold">
                                                    {
                                                        activeDrawerLot.grade
                                                    }
                                                </span>
                                            </div>

                                            <div className="text-xs text-slate-600">
                                                Current Price:{' '}
                                                <span className="font-bold text-[#004B3B]">
                                                    INR{' '}
                                                    {
                                                        activeDrawerLot.price
                                                    }
                                                    /Kg
                                                </span>
                                            </div>

                                            <div className="text-xs text-slate-600">
                                                Available Stock:{' '}
                                                <span className="font-mono">
                                                    {
                                                        activeDrawerLot.stock
                                                    }
                                                </span>
                                            </div>

                                        </div>


                                        <div className="space-y-3">

                                            <div>

                                                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">
                                                    Quantity (Kilograms) *
                                                </label>

                                                <input
                                                    type="number"
                                                    min="200"
                                                    value={
                                                        orderQuantity
                                                    }
                                                    onChange={(
                                                        e
                                                    ) =>
                                                        setOrderQuantity(
                                                            e
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono focus:outline-none focus:border-[#004B3B] text-xs"
                                                />

                                                <span className="text-[9px] text-slate-400 mt-1 block">
                                                    Minimum commercial
                                                    lot quantity:
                                                    200 Kg.
                                                </span>

                                            </div>


                                            <div className="bg-emerald-50 border border-dashed border-emerald-200 rounded-lg p-3 flex gap-2">

                                                <FiInfo
                                                    className="text-emerald-700 shrink-0 mt-0.5"
                                                    size={14}
                                                />

                                                <p className="text-[10px] text-emerald-800 font-light leading-relaxed">
                                                    Your sourcing request
                                                    will be sent to the
                                                    commercial team for
                                                    review and proposal
                                                    confirmation.
                                                </p>

                                            </div>

                                        </div>

                                    </div>


                                    <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 space-y-3 shrink-0 shadow-lg">

                                        <div className="flex items-center justify-between font-mono text-xs">

                                            <span className="text-slate-500 font-bold uppercase">
                                                Estimated Value:
                                            </span>

                                            <span className="text-[#004B3B] font-extrabold text-sm sm:text-base">
                                                INR{' '}
                                                {(
                                                    Number(
                                                        orderQuantity ||
                                                            0
                                                    ) *
                                                    Number(
                                                        activeDrawerLot.price
                                                    )
                                                ).toLocaleString()}
                                            </span>

                                        </div>


                                        <OrderButton
                                            action={async () => {

                                                if (
                                                    !orderQuantity ||
                                                    Number(
                                                        orderQuantity
                                                    ) < 200
                                                ) {
                                                    toast.error(
                                                        'Minimum quantity is 200 Kg.'
                                                    );

                                                    throw new Error(
                                                        'validation'
                                                    );
                                                }


                                                const proposalPayload =
                                                    {
                                                        distributorId:
                                                            distributorId,
                                                        division:
                                                            'TEA',
                                                        lotId:
                                                            activeDrawerLot.id,
                                                        region:
                                                            activeDrawerLot.region,
                                                        grade:
                                                            activeDrawerLot.grade,
                                                        quantity:
                                                            Number(
                                                                orderQuantity
                                                            ),
                                                        basePrice:
                                                            Number(
                                                                activeDrawerLot.price
                                                            ),
                                                    };


                                                let res;

                                                try {
                                                    res =
                                                        await distributorApi.createProposal(
                                                            proposalPayload
                                                        );
                                                } catch (
                                                    err
                                                ) {
                                                    console.error(
                                                        err
                                                    );

                                                    toast.error(
                                                        err
                                                            .response
                                                            ?.data
                                                            ?.message ||
                                                            'Failed to submit sourcing request.'
                                                    );

                                                    throw err;
                                                }


                                                if (
                                                    !res.success
                                                ) {
                                                    toast.error(
                                                        res.message ||
                                                            'Failed to submit sourcing request.'
                                                    );

                                                    throw new Error(
                                                        'api_failure'
                                                    );
                                                }


                                                toast.success(
                                                    `Sourcing request submitted for ${orderQuantity} Kg.`
                                                );


                                                pushDataLayerEvent(
                                                    'tea_proposal_submitted',
                                                    {
                                                        lot_id:
                                                            activeDrawerLot.id,
                                                        quantity:
                                                            Number(
                                                                orderQuantity
                                                            ),
                                                        value:
                                                            Number(
                                                                orderQuantity
                                                            ) *
                                                            Number(
                                                                activeDrawerLot.price ||
                                                                    0
                                                            ),
                                                        currency:
                                                            'INR',
                                                    }
                                                );


                                                fetchMyProposals();

                                            }}
                                            onDone={() =>
                                                setIsOrderDrawerOpen(
                                                    false
                                                )
                                            }
                                            icon={
                                                FiShoppingCart
                                            }
                                            idleLabel="Submit Sourcing Request"
                                            busyLabel="Submitting..."
                                            doneLabel="Request Submitted"
                                            className="w-full bg-[#004B3B] hover:bg-[#053127] active:scale-98 text-white text-xs font-mono font-bold uppercase tracking-wider py-3.5 rounded-lg shadow-md cursor-pointer disabled:cursor-default disabled:opacity-90"
                                        />

                                    </div>

                                </motion.div>

                            </div>

                        </div>

                    )}

            </AnimatePresence>


            {/* =====================================================
                GLOBAL SCROLLBAR
            ===================================================== */}

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