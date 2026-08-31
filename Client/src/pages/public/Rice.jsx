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
    FiKey,
    FiUploadCloud,
    FiX,
    FiAward,
    FiCompass,
    FiLayers,
    FiLock,
    FiGlobe,
    FiGrid,
    FiShoppingCart,
    FiInfo,
    FiUser,
    FiPhone,
    FiMapPin,
    FiTruck,
    FiPackage,
    FiSearch,
    FiClipboard
} from 'react-icons/fi';

import { distributorApi } from '../../api/distributor';
import { pushDataLayerEvent } from '../../utils/analytics';
import { loadRazorpayScript } from '../../utils/razorpay';
import BuyerEntryGate from '../../components/gates/BuyerEntryGate';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import TestimonialCoverflow from '../../components/Testimonials/TestimonialCoverflow';
import TestimonialSectionBackground from '../../components/Testimonials/TestimonialSectionBackground';
import {
    riceTestimonials,
    RICE_ACCENT,
    RICE_ACCENT_TEXT,
    RICE_TRUST_PARAGRAPH
} from '../../data/testimonials';
import { OrderButton } from '../../components/ui/AnimatedActionButton';


/* =========================================================
   SESSION
========================================================= */

const ACTIVE_LAYER_KEY = 'rice_active_layer';


/* =========================================================
   EXISTING PRAKRITI RICE COLOUR SYSTEM
   DO NOT CHANGE
========================================================= */

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
    subhead:
        'Tell us who you are to unlock the official rice rate card and place sourcing requests directly.',
    fontClass: 'font-serif'
};


/* =========================================================
   HERO IMAGES
========================================================= */

const HERO_BACKGROUNDS = [
    '/images/rice_images/rice_1.jpeg',
    '/images/rice_images/rice_2.jpeg',
    '/images/rice_images/rice_3.jpeg',
    '/images/rice_images/rice_4.jpeg',
    '/images/rice_images/rice_5.jpeg',
    '/images/rice_images/rice_6.jpeg',
    '/images/rice_images/rice_7.png',
    '/images/rice_images/rice_8.jpeg',
    '/images/rice_images/rice_9.jpeg',
    '/images/rice_images/rice_10.jpeg',
    '/images/rice_images/rice_11.jpeg'
];


/* =========================================================
   PACKAGING
========================================================= */

const PACKAGING_VARIANTS = [
    {
        size: '25 KG Bag Format',
        type: 'Standard Trade Polypropylene (PP)',
        asset: '/images/rice_images/rice_1.jpeg',
        desc:
            'A practical bulk packing format for wholesale distribution, commercial buyers and organised domestic supply.'
    },
    {
        size: '30 KG Bag Format',
        type: 'Heavy-Duty Trade PP Packaging',
        asset: '/images/rice_images/rice_2.jpeg',
        desc:
            'A larger trade format suited to bulk handling, institutional requirements and selected export supply requirements.'
    }
];


/* =========================================================
   PRODUCT PORTFOLIO
   Based on the existing Rice product data
========================================================= */

const PRODUCT_CATEGORIES = [
    {
        number: '01',
        title: 'Premium Basmati',
        subtitle: 'LONG-GRAIN RICE',
        varieties: '1121 • 1885 • 1718 • 1509 • 1847 • 1401',
        description:
            'Long-grain Basmati options for buyers looking for premium rice for retail, HORECA, catering, wholesale and export requirements.',
        image: '/images/rice_images/rice_11.jpeg'
    },
    {
        number: '02',
        title: 'Aromatic Rice',
        subtitle: 'AROMATIC & VALUE SEGMENTS',
        varieties: 'PUSA • SUGANDHA • TAJ • RH-10 • SHARBATI',
        description:
            'Aromatic rice varieties covering different commercial price and quality segments for wholesale and food-service buyers.',
        image: '/images/rice_images/rice_5.jpeg'
    },
    {
        number: '03',
        title: 'Non-Basmati Rice',
        subtitle: 'COMMERCIAL BULK SUPPLY',
        varieties: 'PR-11 / PR-14 • PR-106 / PR-47 • PR-26',
        description:
            'Commercial rice options for recurring wholesale, institutional, distributor and large-volume food supply requirements.',
        image: '/images/rice_images/rice_7.png'
    }
];


/* =========================================================
   PROCESSING OPTIONS
========================================================= */

const PROCESSING_OPTIONS = [
    {
        title: 'Raw / White',
        description:
            'Conventional milled rice for buyers requiring a standard raw rice format.'
    },
    {
        title: 'Steam',
        description:
            'Steam-processed rice suitable for commercial and food-service supply requirements.'
    },
    {
        title: 'White / Creamy Sella',
        description:
            'Parboiled processing option for buyers requiring the Sella format.'
    },
    {
        title: 'Lemon Sella',
        description:
            'A specialised Sella processing option available for selected varieties.'
    },
    {
        title: 'Golden Sella',
        description:
            'Golden Sella processing for selected commercial and export-oriented requirements.'
    },
    {
        title: 'Brown',
        description:
            'Brown rice processing where the selected variety and supply specification support it.'
    }
];


/* =========================================================
   PRODUCT SPECIFICATION GROUPS
========================================================= */

const PRODUCT_SPECS = [
    {
        label: 'Rice varieties',
        value: 'Basmati, Aromatic & Non-Basmati'
    },
    {
        label: 'Processing',
        value: 'Raw, Steam, Sella & selected Brown'
    },
    {
        label: 'Supply format',
        value: 'Bulk commercial orders'
    },
    {
        label: 'Packing',
        value: 'Trade PP bag formats'
    },
    {
        label: 'Supply type',
        value: 'Domestic & export requirements'
    },
    {
        label: 'Commercial basis',
        value: 'Quotation after requirement review'
    }
];


/* =========================================================
   BUYER SEGMENTS
========================================================= */

const BUYER_SEGMENTS = [
    {
        icon: FiBriefcase,
        title: 'Wholesale & Distribution',
        description:
            'For traders, distributors and wholesale buyers requiring repeat commercial rice supply.'
    },
    {
        icon: FiGrid,
        title: 'HORECA & Catering',
        description:
            'Rice sourcing for hotels, restaurants, caterers, banquet operations and food-service requirements.'
    },
    {
        icon: FiGlobe,
        title: 'Export Buyers',
        description:
            'Support for international buyers requiring product specification, packing and export coordination.'
    },
    {
        icon: FiLayers,
        title: 'Institutional Supply',
        description:
            'Commercial supply options for canteens, kitchens and other recurring bulk food requirements.'
    }
];


/* =========================================================
   PROCUREMENT PROCESS
========================================================= */

const PROCUREMENT_STEPS = [
    {
        number: '01',
        icon: FiClipboard,
        title: 'Share Requirement',
        description:
            'Tell us the rice variety, processing type, quantity and delivery location.'
    },
    {
        number: '02',
        icon: FiSearch,
        title: 'Source & Verify',
        description:
            'We review sourcing options and align the requirement with available product specifications.'
    },
    {
        number: '03',
        icon: FiFileText,
        title: 'Confirm Commercials',
        description:
            'Price, quantity, packing, delivery terms and other commercial requirements are confirmed.'
    },
    {
        number: '04',
        icon: FiShield,
        title: 'Quality & Documentation',
        description:
            'Required product and commercial documentation is reviewed before dispatch.'
    },
    {
        number: '05',
        icon: FiTruck,
        title: 'Dispatch & Logistics',
        description:
            'Dispatch and transportation are coordinated according to the agreed supply arrangement.'
    },
    {
        number: '06',
        icon: FiCheckCircle,
        title: 'Delivery Support',
        description:
            'The supply process is followed through to delivery and commercial closure.'
    }
];


/* =========================================================
   TEASER LOTS
========================================================= */

const TEASER_CARGO_STREAM = [
    {
        id: 1,
        hub: 'Kishanganj Sourcing Network',
        grade: '1121 Basmati Rice',
        size: '25 KG / 30 KG Trade Bags',
        destination: 'Wholesale / HORECA / Export'
    },
    {
        id: 2,
        hub: 'Regional Rice Supply',
        grade: 'Sona Masoori & Aromatic Profiles',
        size: 'Bulk Trade Packaging',
        destination: 'Regional Wholesale Distribution'
    },
    {
        id: 3,
        hub: 'Commercial Rice Supply',
        grade: 'PR-11 / PR-14',
        size: 'Bulk Trade Bags',
        destination: 'Institutional & Food-Service Supply'
    },
    {
        id: 4,
        hub: 'Export-Oriented Supply',
        grade: 'Selected Basmati & Aromatic Rice',
        size: 'Buyer-Specified Packaging',
        destination: 'International Buyer Requirements'
    }
];


/* =========================================================
   EXISTING RATE CARD
========================================================= */

const RICE_PROCESSING_KEYS = [
    'raw',
    'steam',
    'whiteSella',
    'lemonSella',
    'goldenSella',
    'brown'
];

const RICE_PROCESSING_LABELS = {
    raw: 'Raw / White',
    steam: 'Steam',
    whiteSella: 'White / Creamy Sella',
    lemonSella: 'Lemon Sella',
    goldenSella: 'Golden Sella',
    brown: 'Brown'
};


/* Regular / Conventional */

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


/* Compliance */

const COMPLIANCE_RICE_RAW = [
    ['1121 Basmati Rice', '8.35 MM', [114000, 113000, 107000, null, 112000, null]],
    ['1718 Basmati Rice', '8.35 MM', [113000, 111000, 104000, null, 108000, null]],
    ['1509 Basmati Rice', '8.40 MM', [null, 105000, 99000, null, 103000, null]],
    ['PUSA Basmati Rice', '7.45 MM', [105000, 105000, 98000, null, 104000, 99000]],
    ['Sharbati Rice', '7.10 MM', [null, null, 87000, null, null, null]],
    ['Parmal Rice', '6.40 MM', [null, null, 57000, null, null, null]]
];


const buildRiceRateTable = (raw) =>
    raw.map(([variety, mm, values]) => ({
        variety,
        mm,
        rates: RICE_PROCESSING_KEYS.reduce((acc, key, i) => {
            acc[key] = values[i];
            return acc;
        }, {})
    }));


const REGULAR_RICE_RATES = buildRiceRateTable(REGULAR_RICE_RAW);
const COMPLIANCE_RICE_RATES = buildRiceRateTable(COMPLIANCE_RICE_RAW);


/* =========================================================
   PAGE
========================================================= */

export default function RicePage() {

    useDocumentMeta({
        title: 'Bulk Rice Supplier & Export from India | Prakriti Rice',
        description:
            'Prakriti Rice by India Trade Overseas supplies bulk Basmati, aromatic and non-Basmati rice for wholesale, institutional, HORECA and export requirements.',
        canonicalPath: '/prakriti/rice'
    });


    /* =====================================================
       ACCESS STATE
    ===================================================== */

    const [userAccessLayer, setUserAccessLayer] = useState(1);

    const [isSessionLoading, setIsLoadingSession] = useState(true);

    const [showEntryGate, setShowEntryGate] = useState(() => {

        if (
            import.meta.env.DEV &&
            new URLSearchParams(window.location.search).get('previewTestimonials') === '1'
        ) {
            return false;
        }

        return !(
            localStorage.getItem('rice_distributor_id') &&
            localStorage.getItem('distributor_token')
        );
    });

    const [distributorId, setDistributorId] = useState('');


    /* =====================================================
       PROPOSALS
    ===================================================== */

    const [myProposals, setMyProposals] = useState([]);

    const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);


    /* =====================================================
       RATE CARD
    ===================================================== */

    const [rateCompliance, setRateCompliance] = useState('REGULAR');

    const [rateVariety, setRateVariety] = useState(
        REGULAR_RICE_RATES[0].variety
    );

    const [rateProcessingType, setRateProcessingType] = useState(
        RICE_PROCESSING_KEYS.find(
            (key) => REGULAR_RICE_RATES[0].rates[key] != null
        )
    );


    /* =====================================================
       ORDER DRAWER
    ===================================================== */

    const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);

    const [activeDrawerLot, setActiveDrawerLot] = useState(null);

    const [orderQuantity, setOrderQuantity] = useState('20000');


    /* =====================================================
       CAROUSELS / TABS
    ===================================================== */

    const [heroBgIndex, setHeroBgIndex] = useState(0);

    const [packageIndex, setPackageIndex] = useState(0);

    const [activeTabSOP, setActiveTabSOP] = useState('commercial');


    /* =====================================================
       PROPOSAL FETCH
    ===================================================== */

    const fetchMyProposals = async () => {

        const storedDistributorId =
            distributorId ||
            localStorage.getItem('rice_distributor_id');

        const token =
            localStorage.getItem('distributor_token');

        if (!storedDistributorId || !token) {
            return;
        }

        try {

            const res =
                await distributorApi.getDistributorProposalsCustomer(
                    storedDistributorId,
                    'RICE'
                );

            if (res && res.success) {
                setMyProposals(res.data || []);
            }

        } catch (err) {
            console.error(
                'Error loading rice proposals:',
                err
            );
        }
    };


    useEffect(() => {

        if (
            userAccessLayer === 5 &&
            distributorId
        ) {
            fetchMyProposals();
        }

    }, [userAccessLayer, distributorId]);


    /* =====================================================
       NAVBAR VISIBILITY
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

        const fetchStatusWithRetry =
            async (id, attemptsLeft = 2) => {

                try {

                    return await distributorApi.getDistributorStatus(id);

                } catch (err) {

                    if (
                        err.response?.status === 404 ||
                        attemptsLeft <= 0
                    ) {
                        throw err;
                    }

                    await new Promise(
                        (resolve) =>
                            setTimeout(resolve, 1200)
                    );

                    return fetchStatusWithRetry(
                        id,
                        attemptsLeft - 1
                    );
                }
            };


        const initializeAuthenticationSession =
            async () => {

                const savedId =
                    localStorage.getItem(
                        'rice_distributor_id'
                    );

                const token =
                    localStorage.getItem(
                        'distributor_token'
                    );


                if (savedId && token) {

                    setDistributorId(savedId);

                    try {

                        const res =
                            await fetchStatusWithRetry(
                                savedId
                            );

                        if (res.success) {

                            const status =
                                res.data.approvalStatus;

                            if (
                                status === 'approved'
                            ) {

                                const savedLayer =
                                    localStorage.getItem(
                                        ACTIVE_LAYER_KEY
                                    );

                                setUserAccessLayer(
                                    savedLayer === '5'
                                        ? 5
                                        : 1
                                );

                            } else if (
                                status === 'pending'
                            ) {

                                setUserAccessLayer(4);

                            } else {

                                handleLogOut();
                            }
                        }

                    } catch (err) {

                        if (
                            err.response?.status === 404
                        ) {
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
       PERSIST LAYER
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

    }, [
        userAccessLayer,
        isSessionLoading
    ]);


    /* =====================================================
       PENDING STATUS POLLING
    ===================================================== */

    useEffect(() => {

        let pollingTimer;

        if (
            userAccessLayer === 4 &&
            distributorId
        ) {

            const executeStatusPulseCheck =
                async () => {

                    try {

                        const res =
                            await distributorApi.getDistributorStatus(
                                distributorId
                            );

                        if (res.success) {

                            const currentStatus =
                                res.data.approvalStatus;

                            if (
                                currentStatus ===
                                'approved'
                            ) {

                                toast.success(
                                    'B2B Rice Profile Approved! Secure Marketplace Activated.'
                                );

                                clearInterval(
                                    pollingTimer
                                );

                                setUserAccessLayer(5);

                            } else if (
                                currentStatus ===
                                'rejected'
                            ) {

                                toast.error(
                                    'Sourcing credentials could not be verified.'
                                );

                                clearInterval(
                                    pollingTimer
                                );

                                handleLogOut();
                            }
                        }

                    } catch (err) {

                        console.error(
                            'Rice verification polling issue:',
                            err
                        );
                    }
                };


            executeStatusPulseCheck();

            pollingTimer =
                setInterval(
                    executeStatusPulseCheck,
                    5000
                );
        }


        return () =>
            clearInterval(pollingTimer);

    }, [
        userAccessLayer,
        distributorId
    ]);


    /* =====================================================
       HERO CAROUSEL
    ===================================================== */

    useEffect(() => {

        const bgLoop =
            setInterval(() => {

                setHeroBgIndex(
                    (prev) =>
                        (prev + 1) %
                        HERO_BACKGROUNDS.length
                );

            }, 5000);

        return () =>
            clearInterval(bgLoop);

    }, []);


    /* =====================================================
       PACKAGING CAROUSEL
    ===================================================== */

    useEffect(() => {

        const packageLoop =
            setInterval(() => {

                setPackageIndex(
                    (prev) =>
                        (prev + 1) %
                        PACKAGING_VARIANTS.length
                );

            }, 5000);

        return () =>
            clearInterval(packageLoop);

    }, []);


    /* =====================================================
       GATE VERIFIED
    ===================================================== */

    const handleGateVerified =
        (activeId, activeToken) => {

            if (activeId) {

                setDistributorId(activeId);

                localStorage.setItem(
                    'rice_distributor_id',
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
                'rice_distributor_verified',
                {
                    division: 'RICE'
                }
            );

            setShowEntryGate(false);

            setUserAccessLayer(1);

            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        };


    /* =====================================================
       LOGOUT
    ===================================================== */

    const handleLogOut = () => {

        setUserAccessLayer(1);

        setDistributorId('');

        localStorage.removeItem(
            'rice_distributor_id'
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
            behavior: 'smooth'
        });
    };


    /* =====================================================
       OPEN MARKETPLACE
    ===================================================== */

    const handleExploreProducts = () => {

        const savedId =
            localStorage.getItem(
                'rice_distributor_id'
            );

        const token =
            localStorage.getItem(
                'distributor_token'
            );

        if (!savedId || !token) {

            setShowEntryGate(true);

        } else {

            setUserAccessLayer(5);
        }
    };


    /* =====================================================
       RATE CARD EFFECTS
    ===================================================== */

    useEffect(() => {

        const table =
            rateCompliance === 'REGULAR'
                ? REGULAR_RICE_RATES
                : COMPLIANCE_RICE_RATES;

        const firstEntry = table[0];

        setRateVariety(
            firstEntry.variety
        );

        setRateProcessingType(
            RICE_PROCESSING_KEYS.find(
                (key) =>
                    firstEntry.rates[key] != null
            )
        );

    }, [rateCompliance]);


    useEffect(() => {

        const table =
            rateCompliance === 'REGULAR'
                ? REGULAR_RICE_RATES
                : COMPLIANCE_RICE_RATES;

        const entry =
            table.find(
                (e) =>
                    e.variety === rateVariety
            );

        if (
            entry &&
            entry.rates[rateProcessingType] ==
                null
        ) {

            setRateProcessingType(
                RICE_PROCESSING_KEYS.find(
                    (key) =>
                        entry.rates[key] != null
                )
            );
        }

    }, [
        rateVariety,
        rateCompliance
    ]);


    const riceRateTable =
        rateCompliance === 'REGULAR'
            ? REGULAR_RICE_RATES
            : COMPLIANCE_RICE_RATES;


    const activeRiceRateEntry =
        riceRateTable.find(
            (entry) =>
                entry.variety === rateVariety
        );


    const activeRiceRatePriceMT =
        activeRiceRateEntry
            ?.rates?.[rateProcessingType] ??
        null;


    const availableProcessingTypes =
        activeRiceRateEntry
            ? RICE_PROCESSING_KEYS.filter(
                  (key) =>
                      activeRiceRateEntry.rates[
                          key
                      ] != null
              )
            : [];


    /* =====================================================
       RATE DRAWER
    ===================================================== */

    const openRiceRateDrawer = () => {

        if (
            !activeRiceRateEntry ||
            activeRiceRatePriceMT == null
        ) {
            return;
        }

        const processingLabel =
            RICE_PROCESSING_LABELS[
                rateProcessingType
            ];

        setActiveDrawerLot({

            id:
                `${rateCompliance}-${activeRiceRateEntry.variety
                    .toUpperCase()
                    .replace(
                        /[^A-Z0-9]+/g,
                        '-'
                    )}-${rateProcessingType.toUpperCase()}`,

            variety:
                `${activeRiceRateEntry.variety} (${activeRiceRateEntry.mm}) — ${processingLabel}`,

            location:
                rateCompliance === 'COMPLIANCE'
                    ? 'EU / UK / USA Compliance — Ex-Mill Haryana'
                    : 'Ex-Mill Haryana (Domestic Grade)',

            price:
                Number(
                    (
                        activeRiceRatePriceMT /
                        1000
                    ).toFixed(2)
                ),

            inventory:
                'MOQ 20,000 Kg (20 MT / One Truckload)'
        });

        setOrderQuantity('20000');

        setIsOrderDrawerOpen(true);
    };


    /* =====================================================
       ENTRY GATE
    ===================================================== */

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


    /* =====================================================
       SESSION LOADING
    ===================================================== */

    if (isSessionLoading) {

        return (
            <div className="min-h-screen bg-[#FFF9EC] flex items-center justify-center font-serif">

                <div className="text-center space-y-4">

                    <span className="w-10 h-10 border-4 border-[#5A4422] border-t-transparent rounded-full animate-spin block mx-auto" />

                    <p className="text-xs font-mono tracking-widest text-[#5A4422] uppercase font-bold">
                        Preparing Rice Supply Page...
                    </p>

                </div>

            </div>
        );
    }


    return (

        <div
            className="antialiased min-h-screen font-serif selection:bg-[#D9B85C]/40 selection:text-[#5A4422]"
            style={{
                backgroundColor: '#FFF9EC',
                color: '#5A4422'
            }}
        >

            <style
                dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes scalePopEntrance {
                        0% {
                            transform: scale(0.96);
                            opacity: 0;
                            filter: blur(4px);
                        }
                        60% {
                            transform: scale(1.01);
                            opacity: 0.85;
                            filter: blur(0px);
                        }
                        100% {
                            transform: scale(1);
                            opacity: 1;
                        }
                    }

                    .popping-header-title {
                        animation:
                            scalePopEntrance
                            1.1s
                            cubic-bezier(0.19, 1, 0.22, 1)
                            forwards;
                    }

                    .popping-header-desc {
                        animation:
                            scalePopEntrance
                            1.1s
                            cubic-bezier(0.19, 1, 0.22, 1)
                            forwards;
                        animation-delay: 0.2s;
                        opacity: 0;
                    }

                    .gated-blur-shield {
                        filter: blur(6px);
                        pointer-events: none;
                        user-select: none;
                    }
                `
                }}
            />


            {/* =====================================================
                UNDER REVIEW
            ===================================================== */}

            {userAccessLayer === 4 && (

                <section className="max-w-3xl mx-auto px-6 py-20 animate-fadeIn min-h-[80vh] flex items-center justify-center">

                    <div
                        className="bg-white border rounded-2xl p-8 sm:p-12 text-center shadow-xl space-y-6 w-full"
                        style={{
                            borderColor: '#D9B85C'
                        }}
                    >

                        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto text-xl bg-[#F2E3B4] border border-[#D9B85C] text-[#A67C2D]">

                            <FiCompass className="animate-spin-slow" />

                        </div>

                        <h2 className="text-2xl uppercase tracking-wider font-bold">
                            B2B Account Under Evaluation
                        </h2>

                        <div className="h-0.5 w-16 mx-auto bg-[#A67C2D]" />

                        <blockquote className="font-sans text-sm text-neutral-600 max-w-lg mx-auto leading-relaxed italic border-l-4 pl-4 py-2 border-[#D9B85C] bg-[#FFF9EC]/50 text-left">

                            Your Prakriti Rice buyer account is under review.
                            Our team is verifying your business information.
                            You will receive confirmation once the review is complete.

                        </blockquote>

                        <div
                            className="p-5 rounded-xl border text-left text-xs font-sans text-neutral-500 space-y-2 max-w-md mx-auto"
                            style={{
                                backgroundColor: '#FFF9EC',
                                borderColor: '#F2E3B4'
                            }}
                        >

                            <div
                                className="font-bold uppercase font-mono tracking-widest text-[10px]"
                                style={{
                                    color: '#5A4422'
                                }}
                            >
                                Verification Process
                            </div>

                            <p className="flex items-center gap-2">
                                <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{
                                        backgroundColor:
                                            '#A67C2D'
                                    }}
                                />
                                Business information review
                            </p>

                            <p className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
                                Procurement requirement review
                            </p>

                        </div>

                        <div className="pt-4">

                            <button
                                onClick={() =>
                                    setUserAccessLayer(1)
                                }
                                className="text-[10px] font-sans font-bold text-neutral-400 hover:text-[#5A4422] uppercase tracking-widest underline"
                            >
                                Return to Public View
                            </button>

                        </div>

                    </div>

                </section>
            )}


            {/* =====================================================
                SECURED MARKETPLACE
            ===================================================== */}

            {userAccessLayer === 5 && (

                <div
                    className="min-h-screen font-sans text-slate-900 animate-fadeIn antialiased pt-6 pb-24"
                    style={{
                        backgroundColor: '#FFF9EC'
                    }}
                >

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">

                        <div
                            className="text-white rounded-lg px-6 py-4 flex items-center justify-between border shadow-lg"
                            style={{
                                backgroundColor: '#5A4422',
                                borderColor: '#D9B85C'
                            }}
                        >

                            <div className="flex items-center gap-3">

                                <div className="w-9 h-9 bg-white/10 rounded-sm flex items-center justify-center text-[#D9B85C] font-serif text-lg font-bold border border-white/10">
                                    P
                                </div>

                                <div>

                                    <div className="text-[10px] font-mono tracking-widest text-[#D9B85C] font-bold uppercase">
                                        B2B RICE MARKETPLACE
                                    </div>

                                    <div className="text-sm font-serif tracking-wide text-white uppercase">
                                        INDIA TRADE OVERSEAS
                                    </div>

                                </div>

                            </div>


                            <div className="flex items-center gap-4">

                                <div className="hidden md:flex flex-col text-right font-mono text-[10px] text-slate-300 border-r border-white/10 pr-4">

                                    <span>
                                        RICE SUPPLY SESSION
                                    </span>

                                    <span className="text-[#D9B85C]">
                                        STATUS: ACTIVE
                                    </span>

                                </div>


                                <div className="flex items-center gap-3">

                                    <button
                                        onClick={() => {

                                            fetchMyProposals();

                                            setIsProposalModalOpen(
                                                true
                                            );

                                        }}
                                        className="relative bg-[#D9B85C]/10 hover:bg-[#D9B85C]/20 text-[#D9B85C] border border-[#D9B85C]/30 font-mono text-[10px] font-bold uppercase tracking-wider py-2 px-4 rounded transition-all cursor-pointer flex items-center gap-2"
                                    >

                                        <FiFileText />

                                        My Proposals

                                        {myProposals.filter(
                                            (p) =>
                                                p.status ===
                                                'approved'
                                        ).length > 0 && (

                                            <span className="absolute -top-1.5 -right-1.5 bg-[#D9B85C] text-slate-900 w-4 h-4 rounded-full flex items-center justify-center font-sans font-extrabold text-[9px] animate-bounce">

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
                                        className="bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 border border-white/10 text-slate-200 font-mono text-[10px] font-bold uppercase tracking-wider py-2 px-3 rounded transition-all cursor-pointer"
                                    >
                                        Exit
                                    </button>

                                </div>

                            </div>

                        </div>

                    </div>


                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

                        {/* Marketplace heading */}

                        <div
                            className="rounded-xl p-8 border shadow-xl relative overflow-hidden text-white"
                            style={{
                                backgroundColor: '#5A4422',
                                borderColor: '#D9B85C'
                            }}
                        >

                            <div className="relative z-10 max-w-3xl text-left space-y-3">

                                <div
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[9px] font-mono font-bold tracking-wider uppercase border"
                                    style={{
                                        backgroundColor:
                                            'rgba(217,184,92,0.15)',
                                        borderColor:
                                            '#D9B85C',
                                        color: '#D9B85C'
                                    }}
                                >

                                    <FiCheckCircle size={10} />

                                    VERIFIED B2B RICE ACCESS

                                </div>


                                <h2 className="text-2xl sm:text-4xl font-serif tracking-wide text-[#FFF9EC] uppercase">
                                    Prakriti Rice Rate Card
                                </h2>


                                <p className="text-xs sm:text-sm text-slate-200 font-light leading-relaxed max-w-2xl font-serif">

                                    Select the rice variety, processing
                                    format and applicable commercial
                                    category to review the available
                                    rate information and submit a
                                    sourcing request.

                                </p>

                            </div>

                        </div>


                        {/* =================================================
                            PROPOSALS MODAL
                        ================================================= */}

                        <AnimatePresence>

                            {isProposalModalOpen && (

                                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">

                                    <motion.div
                                        initial={{
                                            opacity: 0,
                                            scale: 0.95,
                                            y: 15
                                        }}
                                        animate={{
                                            opacity: 1,
                                            scale: 1,
                                            y: 0
                                        }}
                                        exit={{
                                            opacity: 0,
                                            scale: 0.95,
                                            y: 15
                                        }}
                                        className="w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 my-8"
                                    >

                                        <div
                                            className="text-white p-6 flex justify-between items-center text-left"
                                            style={{
                                                backgroundColor:
                                                    '#5A4422'
                                            }}
                                        >

                                            <div>

                                                <div className="text-[9px] font-mono tracking-widest text-[#D9B85C] font-bold uppercase">
                                                    Rice Procurement
                                                </div>

                                                <h2 className="text-xl font-serif text-white uppercase tracking-wide">
                                                    My Trade Proposals
                                                </h2>

                                            </div>


                                            <button
                                                onClick={() =>
                                                    setIsProposalModalOpen(
                                                        false
                                                    )
                                                }
                                                className="p-1 text-slate-300 hover:text-white rounded-sm transition-colors cursor-pointer"
                                            >
                                                <FiX size={20} />
                                            </button>

                                        </div>


                                        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto text-left font-serif">

                                            {myProposals.length === 0 ? (

                                                <div className="p-12 text-center text-slate-400 italic text-xs font-light">

                                                    No trade proposals have
                                                    been submitted yet.

                                                </div>

                                            ) : (

                                                <div className="space-y-4">

                                                    {myProposals.map(
                                                        (prop) => (

                                                            <div
                                                                key={
                                                                    prop._id
                                                                }
                                                                className={`p-4 rounded-lg border text-xs font-mono transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                                                                    prop.status ===
                                                                    'approved'
                                                                        ? 'border-amber-200 bg-amber-50/40'
                                                                        : prop.status ===
                                                                          'disapproved'
                                                                        ? 'border-rose-200 bg-rose-50/30'
                                                                        : 'border-slate-200 bg-slate-50/50'
                                                                }`}
                                                            >

                                                                <div className="space-y-1">

                                                                    <div className="flex items-center gap-2">

                                                                        <span className="text-[13px] font-extrabold text-[#5A4422]">
                                                                            {
                                                                                prop.lotId
                                                                            }
                                                                        </span>

                                                                        <span className="text-[10px] text-slate-400">
                                                                            (
                                                                            {
                                                                                prop.grade
                                                                            }
                                                                            )
                                                                        </span>

                                                                    </div>


                                                                    <div className="text-slate-600 font-sans font-light">

                                                                        Volume:{' '}

                                                                        <span className="font-mono font-bold text-slate-800">

                                                                            {prop.quantity?.toLocaleString()}{' '}
                                                                            Kg

                                                                        </span>

                                                                        {' | '}

                                                                        Route:{' '}

                                                                        <span className="text-slate-700">
                                                                            {
                                                                                prop.region
                                                                            }
                                                                        </span>

                                                                    </div>


                                                                    <div className="text-[11px] text-slate-500">

                                                                        Rate Basis:
                                                                        INR{' '}

                                                                        {
                                                                            prop.basePrice
                                                                        }

                                                                        /Kg →
                                                                        Net Value:{' '}

                                                                        <span className="font-bold text-[#5A4422]">
                                                                            INR{' '}
                                                                            {
                                                                                prop.estimatedValue?.toLocaleString()
                                                                            }
                                                                        </span>

                                                                    </div>

                                                                </div>


                                                                <div className="shrink-0">

                                                                    <span
                                                                        className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                                                            prop.status ===
                                                                            'approved'
                                                                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                                                                : prop.status ===
                                                                                  'disapproved'
                                                                                ? 'bg-rose-100 text-rose-700 border-rose-300'
                                                                                : 'bg-slate-100 text-slate-700 border-slate-300 animate-pulse'
                                                                        }`}
                                                                    >

                                                                        {
                                                                            prop.status ===
                                                                            'approved'
                                                                                ? 'Invoice Issued'
                                                                                : prop.status ===
                                                                                  'disapproved'
                                                                                ? 'Rejected'
                                                                                : 'Under Review'
                                                                        }

                                                                    </span>

                                                                </div>

                                                            </div>

                                                        )
                                                    )}

                                                </div>
                                            )}

                                        </div>


                                        <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-left font-serif">

                                            <div>

                                                <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                                                    Approved Proposal Value
                                                </div>

                                                <div className="text-xl font-mono font-extrabold text-[#5A4422]">

                                                    INR{' '}

                                                    {myProposals
                                                        .filter(
                                                            (p) =>
                                                                p.status ===
                                                                'approved'
                                                        )
                                                        .reduce(
                                                            (
                                                                acc,
                                                                curr
                                                            ) =>
                                                                acc +
                                                                (curr.estimatedValue ||
                                                                    0),
                                                            0
                                                        )
                                                        .toLocaleString()}

                                                </div>

                                            </div>


                                            <button
                                                disabled={
                                                    myProposals.filter(
                                                        (p) =>
                                                            p.status ===
                                                            'approved'
                                                    ).length ===
                                                    0
                                                }
                                                onClick={async () => {

                                                    const approvedProposals =
                                                        myProposals.filter(
                                                            (p) =>
                                                                p.status ===
                                                                'approved'
                                                        );

                                                    if (
                                                        approvedProposals.length ===
                                                        0
                                                    ) {
                                                        return;
                                                    }


                                                    const aggregateAmount =
                                                        approvedProposals.reduce(
                                                            (
                                                                acc,
                                                                curr
                                                            ) =>
                                                                acc +
                                                                (curr.estimatedValue ||
                                                                    0),
                                                            0
                                                        );


                                                    const targetLotString =
                                                        approvedProposals
                                                            .map(
                                                                (p) =>
                                                                    p.lotId
                                                            )
                                                            .join(
                                                                ', '
                                                            );


                                                    const combinedQuantity =
                                                        approvedProposals.reduce(
                                                            (
                                                                acc,
                                                                curr
                                                            ) =>
                                                                acc +
                                                                (curr.quantity ||
                                                                    0),
                                                            0
                                                        );


                                                    const loadingToast =
                                                        toast.loading(
                                                            'Preparing payment...'
                                                        );


                                                    try {

                                                        const orderResult =
                                                            await distributorApi.createRazorpayOrder(
                                                                aggregateAmount,
                                                                targetLotString,
                                                                combinedQuantity
                                                            );


                                                        if (
                                                            !orderResult.success
                                                        ) {

                                                            throw new Error(
                                                                orderResult.message ||
                                                                    'Failed to create payment order.'
                                                            );
                                                        }


                                                        const {
                                                            orderId,
                                                            keyId
                                                        } =
                                                            orderResult.data;


                                                        toast.dismiss(
                                                            loadingToast
                                                        );


                                                        const options = {

                                                            key: keyId,

                                                            amount:
                                                                aggregateAmount *
                                                                100,

                                                            currency:
                                                                'INR',

                                                            name:
                                                                'Prakriti Rice Division',

                                                            description:
                                                                `Rice Supply - Lots: ${targetLotString}`,

                                                            order_id:
                                                                orderId,

                                                            handler:
                                                                async function (
                                                                    response
                                                                ) {

                                                                    const verificationToast =
                                                                        toast.loading(
                                                                            'Verifying payment...'
                                                                        );


                                                                    try {

                                                                        const verifyResult =
                                                                            await distributorApi.verifyRazorpayPayment(
                                                                                {
                                                                                    razorpay_order_id:
                                                                                        response.razorpay_order_id,

                                                                                    razorpay_payment_id:
                                                                                        response.razorpay_payment_id,

                                                                                    razorpay_signature:
                                                                                        response.razorpay_signature,

                                                                                    lotId:
                                                                                        targetLotString,

                                                                                    quantity:
                                                                                        combinedQuantity,

                                                                                    amount:
                                                                                        aggregateAmount
                                                                                }
                                                                            );


                                                                        if (
                                                                            !verifyResult.success
                                                                        ) {

                                                                            throw new Error(
                                                                                verifyResult.message ||
                                                                                    'Payment verification failed.'
                                                                            );
                                                                        }


                                                                        await Promise.all(
                                                                            approvedProposals.map(
                                                                                (
                                                                                    p
                                                                                ) =>
                                                                                    distributorApi.updateProposalStatus(
                                                                                        p._id,
                                                                                        'paid'
                                                                                    )
                                                                            )
                                                                        );


                                                                        toast.dismiss(
                                                                            verificationToast
                                                                        );

                                                                        toast.success(
                                                                            'Payment completed successfully.'
                                                                        );


                                                                        pushDataLayerEvent(
                                                                            'rice_payment_success',
                                                                            {
                                                                                transaction_id:
                                                                                    response.razorpay_payment_id,
                                                                                value:
                                                                                    aggregateAmount,
                                                                                currency:
                                                                                    'INR',
                                                                                lot_id:
                                                                                    targetLotString,
                                                                                quantity:
                                                                                    combinedQuantity
                                                                            }
                                                                        );


                                                                        setIsProposalModalOpen(
                                                                            false
                                                                        );

                                                                        fetchMyProposals();

                                                                    } catch (
                                                                        verifyErr
                                                                    ) {

                                                                        toast.dismiss(
                                                                            verificationToast
                                                                        );

                                                                        toast.error(
                                                                            verifyErr.message ||
                                                                                'Payment verification failed.'
                                                                        );
                                                                    }
                                                                },

                                                            prefill: {
                                                                name:
                                                                    approvedProposals[0]
                                                                        ?.name ||
                                                                    'Corporate Partner',

                                                                email:
                                                                    approvedProposals[0]
                                                                        ?.email ||
                                                                    ''
                                                            },

                                                            theme: {
                                                                color:
                                                                    '#5A4422'
                                                            }
                                                        };


                                                        await loadRazorpayScript();


                                                        const checkoutWindow =
                                                            new window.Razorpay(
                                                                options
                                                            );

                                                        checkoutWindow.open();

                                                    } catch (
                                                        err
                                                    ) {

                                                        toast.dismiss(
                                                            loadingToast
                                                        );

                                                        toast.error(
                                                            err.message ||
                                                                'Failed to initiate payment.'
                                                        );
                                                    }

                                                }}
                                                className={`font-mono text-xs font-bold uppercase tracking-wider py-3.5 px-6 rounded-lg flex items-center gap-2 transition-all shadow-md ${
                                                    myProposals.filter(
                                                        (p) =>
                                                            p.status ===
                                                            'approved'
                                                    ).length >
                                                    0
                                                        ? 'bg-[#5A4422] hover:bg-[#3d2c16] text-white cursor-pointer'
                                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                                }`}
                                            >

                                                <FiCheckCircle />

                                                Proceed to Payment

                                            </button>

                                        </div>

                                    </motion.div>

                                </div>
                            )}

                        </AnimatePresence>


                        {/* =================================================
                            RATE CARD
                        ================================================= */}

                        <section className="space-y-4 text-left">

                            <div>

                                <span className="text-[10px] font-mono uppercase tracking-widest text-[#A67C2D] font-bold">
                                    B2B Buyer Access
                                </span>

                                <h3 className="mt-2 font-serif text-xl sm:text-2xl text-[#5A4422] uppercase tracking-wider font-bold">
                                    Rice Rate Card
                                </h3>

                                <p className="mt-2 text-xs sm:text-sm text-neutral-500 font-sans">
                                    Select the commercial category, rice
                                    variety and processing format.
                                </p>

                            </div>


                            <div
                                className="bg-white border rounded-xl p-4 sm:p-6 shadow-sm space-y-5"
                                style={{
                                    borderColor: '#F2E3B4'
                                }}
                            >

                                <div className="flex gap-2">

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setRateCompliance(
                                                'REGULAR'
                                            )
                                        }
                                        className="flex-1 py-2.5 rounded-lg font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border transition-all cursor-pointer"
                                        style={
                                            rateCompliance ===
                                            'REGULAR'
                                                ? {
                                                      backgroundColor:
                                                          '#5A4422',
                                                      borderColor:
                                                          '#5A4422',
                                                      color:
                                                          '#FFF9EC'
                                                  }
                                                : {
                                                      backgroundColor:
                                                          '#FFF9EC',
                                                      borderColor:
                                                          '#F2E3B4',
                                                      color:
                                                          '#5A4422'
                                                  }
                                        }
                                    >
                                        Regular / Conventional
                                    </button>


                                    <button
                                        type="button"
                                        onClick={() =>
                                            setRateCompliance(
                                                'COMPLIANCE'
                                            )
                                        }
                                        className="flex-1 py-2.5 rounded-lg font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border transition-all cursor-pointer"
                                        style={
                                            rateCompliance ===
                                            'COMPLIANCE'
                                                ? {
                                                      backgroundColor:
                                                          '#5A4422',
                                                      borderColor:
                                                          '#5A4422',
                                                      color:
                                                          '#FFF9EC'
                                                  }
                                                : {
                                                      backgroundColor:
                                                          '#FFF9EC',
                                                      borderColor:
                                                          '#F2E3B4',
                                                      color:
                                                          '#5A4422'
                                                  }
                                        }
                                    >
                                        EU / UK / USA Compliance
                                    </button>

                                </div>


                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                                    <div>

                                        <label className="block text-[10px] font-mono uppercase text-neutral-500 mb-1">
                                            Rice Variety *
                                        </label>

                                        <select
                                            value={
                                                rateVariety
                                            }
                                            onChange={(e) =>
                                                setRateVariety(
                                                    e.target.value
                                                )
                                            }
                                            className="w-full border rounded p-3 text-xs text-[#5A4422] font-mono"
                                            style={{
                                                backgroundColor:
                                                    '#FFF9EC',
                                                borderColor:
                                                    '#F2E3B4'
                                            }}
                                        >

                                            {riceRateTable.map(
                                                (entry) => (

                                                    <option
                                                        key={
                                                            entry.variety
                                                        }
                                                        value={
                                                            entry.variety
                                                        }
                                                    >
                                                        {
                                                            entry.variety
                                                        }{' '}
                                                        (
                                                        {
                                                            entry.mm
                                                        }
                                                        )
                                                    </option>

                                                )
                                            )}

                                        </select>

                                    </div>


                                    <div>

                                        <label className="block text-[10px] font-mono uppercase text-neutral-500 mb-1">
                                            Processing Grade *
                                        </label>

                                        <select
                                            value={
                                                rateProcessingType
                                            }
                                            onChange={(e) =>
                                                setRateProcessingType(
                                                    e.target.value
                                                )
                                            }
                                            className="w-full border rounded p-3 text-xs text-[#5A4422] font-mono"
                                            style={{
                                                backgroundColor:
                                                    '#FFF9EC',
                                                borderColor:
                                                    '#F2E3B4'
                                            }}
                                        >

                                            {availableProcessingTypes.map(
                                                (key) => (

                                                    <option
                                                        key={key}
                                                        value={key}
                                                    >
                                                        {
                                                            RICE_PROCESSING_LABELS[
                                                                key
                                                            ]
                                                        }
                                                    </option>

                                                )
                                            )}

                                        </select>

                                    </div>

                                </div>


                                <div
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border rounded-xl p-4"
                                    style={{
                                        backgroundColor:
                                            '#FFF9EC',
                                        borderColor:
                                            '#F2E3B4'
                                    }}
                                >

                                    {activeRiceRatePriceMT ==
                                    null ? (

                                        <span className="text-xs font-sans text-neutral-500 italic">
                                            Not available for this
                                            variety / processing
                                            combination.
                                        </span>

                                    ) : (

                                        <>

                                            <div>

                                                <span className="text-[9px] font-mono uppercase text-neutral-400 block">
                                                    Commercial Rate
                                                </span>

                                                <span className="text-xl font-mono font-extrabold text-[#5A4422]">

                                                    INR{' '}

                                                    {activeRiceRatePriceMT.toLocaleString()}

                                                    <span className="text-xs font-medium text-neutral-500">
                                                        /MT
                                                    </span>

                                                </span>

                                                <span className="text-[10px] font-mono text-neutral-400 block">

                                                    ≈ INR{' '}

                                                    {(
                                                        activeRiceRatePriceMT /
                                                        1000
                                                    ).toLocaleString()}

                                                    /Kg

                                                </span>

                                            </div>


                                            <button
                                                onClick={
                                                    openRiceRateDrawer
                                                }
                                                className="text-white px-5 py-3 rounded-lg font-mono font-bold uppercase tracking-wider text-[10px] shadow transition-all cursor-pointer flex items-center justify-center gap-2"
                                                style={{
                                                    backgroundColor:
                                                        '#5A4422'
                                                }}
                                            >

                                                <FiShoppingCart size={12} />

                                                Request Sourcing Quote

                                            </button>

                                        </>
                                    )}

                                </div>


                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] font-sans text-neutral-500 pt-1">

                                    <p>
                                        Packing: 50 KG White PP Bag
                                        (Non-Branded). Minimum order
                                        quantity: 20–25 MT.
                                    </p>

                                    <p>
                                        Commercial terms and validity
                                        are subject to confirmation
                                        against the current quotation.
                                    </p>

                                </div>

                            </div>

                        </section>

                    </div>

                </div>
            )}


            {/* =========================================================
                PUBLIC PAGE
            ========================================================= */}

            {userAccessLayer <= 2 && (

                <>

                    {/* =================================================
                        HERO
                    ================================================= */}

                    <header className="relative w-full min-h-screen bg-[#5A4422] overflow-hidden flex items-center pt-24 lg:pt-0">

                        <div className="absolute inset-0 z-0">

                            <AnimatePresence mode="wait">

                                <motion.img
                                    key={heroBgIndex}
                                    src={
                                        HERO_BACKGROUNDS[
                                            heroBgIndex
                                        ]
                                    }
                                    alt="Bulk rice sourcing and supply from India"
                                    initial={{
                                        opacity: 0,
                                        scale: 1.02
                                    }}
                                    animate={{
                                        opacity: 1,
                                        scale: 1
                                    }}
                                    exit={{
                                        opacity: 0
                                    }}
                                    transition={{
                                        duration: 1.2,
                                        ease: 'easeInOut'
                                    }}
                                    className="absolute inset-0 w-full h-full object-cover object-center"
                                    style={{
                                        filter:
                                            'brightness(1.2) contrast(1.02)'
                                    }}
                                />

                            </AnimatePresence>


                            <div
                                className="absolute inset-0 z-1"
                                style={{
                                    background:
                                        'linear-gradient(to right, rgba(90, 68, 34, 0.55) 35%, rgba(90, 68, 34, 0.30) 70%, transparent 100%)'
                                }}
                            />

                            <div
                                className="absolute inset-0 z-1"
                                style={{
                                    background:
                                        'linear-gradient(to right, #5A4422 10%, transparent 65%)'
                                }}
                            />

                        </div>


                        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center py-14 lg:py-0">

                            <div className="lg:col-span-8 text-center lg:text-left space-y-6">

                                <div
                                    className="inline-flex items-center gap-2 border px-4 py-1.5 rounded-full backdrop-blur-md"
                                    style={{
                                        backgroundColor:
                                            'rgba(242,227,180,0.12)',
                                        borderColor:
                                            '#D9B85C'
                                    }}
                                >

                                    <span className="w-1.5 h-1.5 rounded-full bg-[#D9B85C] animate-pulse" />

                                    <span className="text-[10px] tracking-[0.25em] font-sans font-bold uppercase text-[#FFF9EC]">
                                        PRAKRITI RICE • INDIA TRADE OVERSEAS
                                    </span>

                                </div>


                                <h1 className="popping-header-title text-4xl sm:text-5xl lg:text-7xl font-black text-[#FFF9EC] uppercase tracking-tight leading-[0.95]">

                                    Bulk Rice

                                    <br />

                                    <span
                                        className="font-sans font-light tracking-wide text-base sm:text-2xl lg:text-3xl block mt-4 normal-case"
                                        style={{
                                            color: '#D9B85C'
                                        }}
                                    >
                                        Sourcing • Supply • Export
                                    </span>

                                </h1>


                                <div
                                    className="w-20 h-[3px] mx-auto lg:mx-0"
                                    style={{
                                        backgroundColor:
                                            '#D9B85C'
                                    }}
                                />


                                <p className="popping-header-desc max-w-2xl text-neutral-200 font-sans font-light text-sm sm:text-base lg:text-lg leading-relaxed drop-shadow">

                                    Source Basmati, aromatic and
                                    non-Basmati rice for wholesale,
                                    institutional, HORECA and export
                                    requirements. Share your quantity,
                                    specification and destination to
                                    discuss sourcing and quotation.

                                </p>


                                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2 w-full sm:w-auto">

                                    <button
                                        onClick={() => {
                                            const element =
                                                document.getElementById(
                                                    'rice-quote'
                                                );

                                            element?.scrollIntoView({
                                                behavior:
                                                    'smooth'
                                            });
                                        }}
                                        className="w-full sm:w-auto text-[#5A4422] text-[10px] xs:text-xs font-sans font-bold uppercase tracking-widest px-8 py-4 rounded shadow-xl transition-all hover:scale-105 transform duration-300 cursor-pointer"
                                        style={{
                                            background:
                                                'linear-gradient(to right, #E2C26A, #8D6A25)'
                                        }}
                                    >
                                        Request Bulk Quote
                                    </button>


                                    <button
                                        onClick={
                                            handleExploreProducts
                                        }
                                        className="w-full sm:w-auto text-center text-white text-[10px] xs:text-xs font-sans font-bold uppercase tracking-widest px-6 py-4 rounded backdrop-blur-md border border-white/20 hover:bg-white/10 transition-all cursor-pointer"
                                    >
                                        Explore Rate Card
                                    </button>

                                </div>


                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4">

                                    {[
                                        'Basmati',
                                        'Aromatic',
                                        'Non-Basmati',
                                        'Bulk Supply'
                                    ].map((item) => (

                                        <div
                                            key={item}
                                            className="border border-white/15 bg-[#5A4422]/50 backdrop-blur-sm rounded px-3 py-2"
                                        >

                                            <p className="text-[9px] sm:text-[10px] text-[#FFF9EC] font-sans font-bold uppercase tracking-wider">
                                                {item}
                                            </p>

                                        </div>

                                    ))}

                                </div>

                            </div>


                            <div className="lg:col-span-4 space-y-4 w-full mt-6 lg:mt-0">

                                {[
                                    {
                                        icon: FiLayers,
                                        label: 'PRODUCT RANGE',
                                        metric:
                                            'Basmati • Aromatic • Non-Basmati',
                                        desc:
                                            'Multiple rice varieties and processing options for commercial requirements.'
                                    },
                                    {
                                        icon: FiPackage,
                                        label: 'BULK SUPPLY',
                                        metric:
                                            'Commercial Order Quantities',
                                        desc:
                                            'Bulk sourcing for wholesale, institutional, HORECA and export buyers.'
                                    },
                                    {
                                        icon: FiTruck,
                                        label: 'LOGISTICS',
                                        metric:
                                            'Domestic & Export Coordination',
                                        desc:
                                            'Delivery requirements are reviewed with the product and quotation.'
                                    }
                                ].map(
                                    (
                                        widget,
                                        keyIdx
                                    ) => {

                                        const Icon =
                                            widget.icon;

                                        return (

                                            <div
                                                key={
                                                    keyIdx
                                                }
                                                className="p-5 border rounded-xl bg-[#5A4422]/80 backdrop-blur-sm border-white/10 shadow-lg space-y-2 text-left"
                                            >

                                                <div className="flex items-center gap-2">

                                                    <Icon
                                                        size={
                                                            15
                                                        }
                                                        style={{
                                                            color:
                                                                '#D9B85C'
                                                        }}
                                                    />

                                                    <span
                                                        className="text-[9px] font-sans font-bold uppercase tracking-widest font-mono"
                                                        style={{
                                                            color:
                                                                '#D9B85C'
                                                        }}
                                                    >
                                                        {
                                                            widget.label
                                                        }
                                                    </span>

                                                </div>

                                                <div className="text-sm sm:text-base text-white font-bold">
                                                    {
                                                        widget.metric
                                                    }
                                                </div>

                                                <p className="text-[11px] font-sans text-neutral-300 font-light leading-normal">
                                                    {
                                                        widget.desc
                                                    }
                                                </p>

                                            </div>

                                        );
                                    }
                                )}

                            </div>

                        </div>

                    </header>


                    {/* =================================================
                        PRODUCT CATEGORIES
                    ================================================= */}

                    <section className="max-w-7xl mx-auto px-6 py-20 sm:py-24 space-y-12 text-left">

                        <div className="max-w-3xl">

                            <span
                                className="text-xs font-sans font-bold uppercase tracking-[0.2em] px-3 py-1 rounded"
                                style={{
                                    backgroundColor:
                                        '#F2E3B4',
                                    color: '#5A4422'
                                }}
                            >
                                What We Supply
                            </span>

                            <h2
                                className="mt-5 text-3xl sm:text-4xl lg:text-5xl uppercase font-bold tracking-tight"
                                style={{
                                    color: '#5A4422'
                                }}
                            >
                                Rice for different
                                <br />
                                <span className="font-serif font-normal">
                                    commercial requirements.
                                </span>
                            </h2>

                            <p className="mt-5 text-neutral-600 font-sans text-sm sm:text-base leading-relaxed max-w-2xl">
                                Choose from Basmati, aromatic and
                                non-Basmati rice categories. Final
                                availability, specifications, packing
                                and pricing are confirmed according to
                                the buyer requirement.
                            </p>

                        </div>


                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {PRODUCT_CATEGORIES.map(
                                (item) => (

                                    <motion.article
                                        key={
                                            item.number
                                        }
                                        initial={{
                                            opacity: 0,
                                            y: 20
                                        }}
                                        whileInView={{
                                            opacity: 1,
                                            y: 0
                                        }}
                                        viewport={{
                                            once: true,
                                            margin: '-80px'
                                        }}
                                        transition={{
                                            duration: 0.55
                                        }}
                                        className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                                        style={{
                                            borderColor:
                                                '#F2E3B4'
                                        }}
                                    >

                                        <div className="relative h-56 overflow-hidden">

                                            <img
                                                src={
                                                    item.image
                                                }
                                                alt={`${item.title} rice sourcing`}
                                                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                                            />

                                            <div className="absolute inset-0 bg-gradient-to-t from-[#5A4422]/80 to-transparent" />

                                            <span className="absolute top-4 left-4 bg-[#5A4422] text-[#D9B85C] border border-[#D9B85C] px-2.5 py-1 text-[10px] font-mono font-bold">
                                                {
                                                    item.number
                                                }
                                            </span>

                                            <div className="absolute bottom-4 left-5 right-5">

                                                <p className="text-[9px] text-[#D9B85C] font-sans font-bold uppercase tracking-widest">
                                                    {
                                                        item.subtitle
                                                    }
                                                </p>

                                                <h3 className="text-xl text-white font-serif uppercase tracking-wide mt-1">
                                                    {
                                                        item.title
                                                    }
                                                </h3>

                                            </div>

                                        </div>


                                        <div className="p-6 space-y-4">

                                            <div className="text-[10px] font-mono font-bold text-[#A67C2D] leading-relaxed">
                                                {
                                                    item.varieties
                                                }
                                            </div>

                                            <p className="text-neutral-500 text-xs sm:text-sm font-sans font-light leading-relaxed">
                                                {
                                                    item.description
                                                }
                                            </p>


                                            <button
                                                onClick={
                                                    handleExploreProducts
                                                }
                                                className="inline-flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-widest text-[#A67C2D] hover:text-[#5A4422] transition-colors cursor-pointer"
                                            >
                                                View Available Rice

                                                <FiArrowRight
                                                    size={
                                                        13
                                                    }
                                                />

                                            </button>

                                        </div>

                                    </motion.article>

                                )
                            )}

                        </div>

                    </section>


                    {/* =================================================
                        SPECIFICATIONS
                    ================================================= */}

                    <section
                        className="py-20 sm:py-24"
                        style={{
                            backgroundColor:
                                '#5A4422'
                        }}
                    >

                        <div className="max-w-7xl mx-auto px-6">

                            <div className="grid lg:grid-cols-12 gap-12 items-start">

                                <div className="lg:col-span-5">

                                    <span
                                        className="text-xs font-sans font-bold uppercase tracking-[0.2em]"
                                        style={{
                                            color:
                                                '#D9B85C'
                                        }}
                                    >
                                        Product Information
                                    </span>

                                    <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl text-[#FFF9EC] uppercase tracking-tight font-bold">
                                        Clear specifications
                                        <br />
                                        <span className="font-serif font-normal">
                                            before quotation.
                                        </span>
                                    </h2>

                                    <p className="mt-5 text-[#F0E3C4] text-sm font-sans font-light leading-relaxed max-w-lg">
                                        Rice requirements can vary by
                                        variety, processing, packing,
                                        quantity and destination. We
                                        use these details to align the
                                        sourcing and quotation process.
                                    </p>

                                </div>


                                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">

                                    {PRODUCT_SPECS.map(
                                        (spec) => (

                                            <div
                                                key={
                                                    spec.label
                                                }
                                                className="p-5 rounded-lg border bg-white/5"
                                                style={{
                                                    borderColor:
                                                        'rgba(217,184,92,0.25)'
                                                }}
                                            >

                                                <span className="text-[9px] font-mono uppercase tracking-widest text-[#D9B85C]">
                                                    {
                                                        spec.label
                                                    }
                                                </span>

                                                <p className="mt-2 text-sm text-[#FFF9EC] font-sans">
                                                    {
                                                        spec.value
                                                    }
                                                </p>

                                            </div>

                                        )
                                    )}

                                </div>

                            </div>

                        </div>

                    </section>


                    {/* =================================================
                        PROCESSING OPTIONS
                    ================================================= */}

                    <section className="max-w-7xl mx-auto px-6 py-20 sm:py-24 space-y-12 text-left">

                        <div className="text-center max-w-3xl mx-auto">

                            <span
                                className="text-xs font-sans font-bold uppercase tracking-[0.2em] px-3 py-1 rounded"
                                style={{
                                    backgroundColor:
                                        '#F2E3B4',
                                    color: '#5A4422'
                                }}
                            >
                                Processing Options
                            </span>

                            <h2
                                className="mt-4 text-3xl sm:text-4xl uppercase font-bold tracking-wide"
                                style={{
                                    color: '#5A4422'
                                }}
                            >
                                Select the format
                                <br />
                                <span className="font-serif font-normal">
                                    your market requires.
                                </span>
                            </h2>

                        </div>


                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                            {PROCESSING_OPTIONS.map(
                                (item, index) => (

                                    <motion.div
                                        key={
                                            item.title
                                        }
                                        initial={{
                                            opacity: 0,
                                            y: 15
                                        }}
                                        whileInView={{
                                            opacity: 1,
                                            y: 0
                                        }}
                                        viewport={{
                                            once: true
                                        }}
                                        transition={{
                                            duration:
                                                0.45,
                                            delay:
                                                index *
                                                0.04
                                        }}
                                        className="border rounded-xl p-6 bg-white"
                                        style={{
                                            borderColor:
                                                '#F2E3B4'
                                        }}
                                    >

                                        <div className="w-9 h-9 rounded border flex items-center justify-center text-[#A67C2D] mb-5"
                                            style={{
                                                borderColor:
                                                    '#F2E3B4'
                                            }}
                                        >
                                            <FiLayers
                                                size={
                                                    16
                                                }
                                            />
                                        </div>

                                        <h3 className="font-serif text-lg font-bold uppercase tracking-wide text-[#5A4422]">
                                            {
                                                item.title
                                            }
                                        </h3>

                                        <p className="mt-3 text-xs text-neutral-500 font-sans leading-relaxed">
                                            {
                                                item.description
                                            }
                                        </p>

                                    </motion.div>

                                )
                            )}

                        </div>

                    </section>


                    {/* =================================================
                        SOURCING & QUALITY
                    ================================================= */}

                    <section
                        className="py-20 sm:py-24"
                        style={{
                            backgroundColor:
                                '#FFF9EC'
                        }}
                    >

                        <div className="max-w-7xl mx-auto px-6">

                            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

                                <div>

                                    <img
                                        src="/images/rice_images/rice_4.jpeg"
                                        alt="Rice sourcing and quality review"
                                        className="w-full h-[380px] sm:h-[480px] object-cover rounded-2xl border shadow-lg"
                                        style={{
                                            borderColor:
                                                '#F2E3B4'
                                        }}
                                    />

                                </div>


                                <div className="space-y-6">

                                    <span
                                        className="text-xs font-sans font-bold uppercase tracking-[0.2em] px-3 py-1 rounded"
                                        style={{
                                            backgroundColor:
                                                '#F2E3B4',
                                            color:
                                                '#5A4422'
                                        }}
                                    >
                                        Sourcing Approach
                                    </span>


                                    <h2 className="text-3xl sm:text-4xl uppercase font-bold tracking-tight text-[#5A4422]">
                                        Source with the
                                        <br />
                                        <span className="font-serif font-normal">
                                            requirement in mind.
                                        </span>
                                    </h2>


                                    <p className="text-neutral-600 font-sans text-sm sm:text-base leading-relaxed font-light">
                                        Rice supply is not only about
                                        selecting a variety. Quantity,
                                        processing, packing, destination
                                        and commercial requirements all
                                        influence the right supply option.
                                    </p>


                                    <div className="space-y-3">

                                        {[
                                            {
                                                icon:
                                                    FiSearch,
                                                title:
                                                    'Requirement Review',
                                                text:
                                                    'We first understand the product, quantity and destination.'
                                            },
                                            {
                                                icon:
                                                    FiShield,
                                                title:
                                                    'Specification Alignment',
                                                text:
                                                    'The sourcing option is matched with the required rice and processing format.'
                                            },
                                            {
                                                icon:
                                                    FiFileText,
                                                title:
                                                    'Commercial Documentation',
                                                text:
                                                    'Required commercial and product details are confirmed before dispatch.'
                                            },
                                            {
                                                icon:
                                                    FiTruck,
                                                title:
                                                    'Dispatch Coordination',
                                                text:
                                                    'Transportation and delivery requirements are coordinated after confirmation.'
                                            }
                                        ].map(
                                            (item) => {

                                                const Icon =
                                                    item.icon;

                                                return (

                                                    <div
                                                        key={
                                                            item.title
                                                        }
                                                        className="flex gap-4 p-4 border-b"
                                                        style={{
                                                            borderColor:
                                                                '#F2E3B4'
                                                        }}
                                                    >

                                                        <div className="w-9 h-9 shrink-0 flex items-center justify-center rounded border text-[#A67C2D]"
                                                            style={{
                                                                borderColor:
                                                                    '#F2E3B4'
                                                            }}
                                                        >

                                                            <Icon
                                                                size={
                                                                    16
                                                                }
                                                            />

                                                        </div>


                                                        <div>

                                                            <h3 className="text-sm font-serif font-bold uppercase tracking-wide text-[#5A4422]">
                                                                {
                                                                    item.title
                                                                }
                                                            </h3>

                                                            <p className="mt-1 text-xs text-neutral-500 font-sans leading-relaxed">
                                                                {
                                                                    item.text
                                                                }
                                                            </p>

                                                        </div>

                                                    </div>

                                                );
                                            }
                                        )}

                                    </div>

                                </div>

                            </div>

                        </div>

                    </section>


                    {/* =================================================
                        BUYER SEGMENTS
                    ================================================= */}

                    <section
                        className="py-20 sm:py-24"
                        style={{
                            backgroundColor:
                                '#5A4422'
                        }}
                    >

                        <div className="max-w-7xl mx-auto px-6">

                            <div className="text-center max-w-3xl mx-auto">

                                <span className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#D9B85C]">
                                    Who We Supply
                                </span>

                                <h2 className="mt-4 text-3xl sm:text-4xl text-[#FFF9EC] uppercase font-bold tracking-wide">
                                    Built for
                                    <br />
                                    <span className="font-serif font-normal">
                                        commercial buyers.
                                    </span>
                                </h2>

                            </div>


                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">

                                {BUYER_SEGMENTS.map(
                                    (segment) => {

                                        const Icon =
                                            segment.icon;

                                        return (

                                            <div
                                                key={
                                                    segment.title
                                                }
                                                className="border rounded-xl p-6 bg-white/5"
                                                style={{
                                                    borderColor:
                                                        'rgba(217,184,92,0.25)'
                                                }}
                                            >

                                                <Icon
                                                    size={
                                                        20
                                                    }
                                                    className="text-[#D9B85C] mb-5"
                                                />

                                                <h3 className="text-base font-serif font-bold uppercase tracking-wide text-[#FFF9EC]">
                                                    {
                                                        segment.title
                                                    }
                                                </h3>

                                                <p className="mt-3 text-xs text-[#F0E3C4] font-sans font-light leading-relaxed">
                                                    {
                                                        segment.description
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
                        AVAILABLE SOURCING STREAMS
                    ================================================= */}

                    <section
                        id="teaser-matrix-anchor"
                        className="py-20 sm:py-24 px-6 relative overflow-hidden"
                        style={{
                            backgroundColor:
                                '#FFF9EC'
                        }}
                    >

                        <div className="max-w-7xl mx-auto space-y-12">

                            <div className="text-center max-w-3xl mx-auto">

                                <span
                                    className="text-xs font-sans font-bold uppercase tracking-[0.2em] px-3 py-1 rounded"
                                    style={{
                                        backgroundColor:
                                            '#F2E3B4',
                                        color:
                                            '#5A4422'
                                    }}
                                >
                                    Sourcing Options
                                </span>

                                <h2 className="mt-4 text-3xl sm:text-4xl uppercase font-bold tracking-wide text-[#5A4422]">
                                    Typical rice supply
                                    <br />
                                    <span className="font-serif font-normal">
                                        requirements.
                                    </span>
                                </h2>

                                <p className="mt-4 text-sm text-neutral-500 font-sans max-w-2xl mx-auto">
                                    Availability varies by variety,
                                    processing, quantity and delivery
                                    requirement. Contact the team for
                                    current availability.
                                </p>

                            </div>


                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                {TEASER_CARGO_STREAM.map(
                                    (lot) => (

                                        <div
                                            key={
                                                lot.id
                                            }
                                            className="border bg-white rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-6"
                                            style={{
                                                borderColor:
                                                    '#F2E3B4'
                                            }}
                                        >

                                            <div className="space-y-4">

                                                <div className="pb-3 border-b flex items-center justify-between text-[10px] font-mono"
                                                    style={{
                                                        borderColor:
                                                            '#F2E3B4'
                                                    }}
                                                >

                                                    <span className="font-bold uppercase tracking-wider text-[#A67C2D]">
                                                        {
                                                            lot.hub
                                                        }
                                                    </span>

                                                    <span className="text-neutral-400 bg-[#FFF9EC] px-2 py-0.5 rounded">
                                                        SUPPLY #{String(
                                                            lot.id
                                                        ).padStart(
                                                            2,
                                                            '0'
                                                        )}
                                                    </span>

                                                </div>


                                                <div>

                                                    <h4 className="font-serif text-lg font-bold uppercase tracking-wide text-[#5A4422]">
                                                        {
                                                            lot.grade
                                                        }
                                                    </h4>

                                                    <div className="text-xs font-medium text-neutral-500 mt-2">
                                                        Packing:{' '}
                                                        {
                                                            lot.size
                                                        }
                                                    </div>

                                                    <div className="text-xs font-medium text-neutral-500 mt-1">
                                                        Typical Buyer:{' '}
                                                        {
                                                            lot.destination
                                                        }
                                                    </div>

                                                </div>


                                                <div
                                                    className="bg-[#FFF9EC] rounded-lg p-4 border border-dashed text-[11px] font-sans"
                                                    style={{
                                                        borderColor:
                                                            '#D9B85C'
                                                    }}
                                                >

                                                    <div className="flex items-start gap-2">

                                                        <FiInfo
                                                            size={
                                                                14
                                                            }
                                                            className="text-[#A67C2D] shrink-0 mt-0.5"
                                                        />

                                                        <p className="text-neutral-500 leading-relaxed">
                                                            Current
                                                            availability,
                                                            specification
                                                            and price are
                                                            confirmed
                                                            after the
                                                            buyer
                                                            requirement
                                                            is reviewed.
                                                        </p>

                                                    </div>

                                                </div>

                                            </div>


                                            <button
                                                onClick={() => {

                                                    const element =
                                                        document.getElementById(
                                                            'rice-quote'
                                                        );

                                                    element?.scrollIntoView(
                                                        {
                                                            behavior:
                                                                'smooth'
                                                        }
                                                    );

                                                }}
                                                className="w-full text-center border py-3 rounded font-sans font-bold text-[10px] xs:text-xs uppercase tracking-widest transition-all text-white cursor-pointer"
                                                style={{
                                                    background:
                                                        'linear-gradient(to right, #A67C2D, #5A4422)'
                                                }}
                                            >
                                                Request Rice Quote
                                            </button>

                                        </div>

                                    )
                                )}

                            </div>

                        </div>

                    </section>


                    {/* =================================================
                        PACKAGING
                    ================================================= */}

                    <section
                        className="relative py-20 sm:py-24 px-6 border-t overflow-hidden"
                        style={{
                            backgroundColor:
                                '#5A4422',
                            borderColor:
                                '#A67C2D'
                        }}
                    >

                        <div
                            className="absolute inset-0 z-0 bg-cover bg-center"
                            style={{
                                backgroundImage:
                                    "url('/images/rice_images/rice_3.jpeg')",
                                filter:
                                    'brightness(1.15) contrast(1.10)'
                            }}
                        />

                        <div
                            className="absolute inset-0 z-1"
                            style={{
                                backgroundColor:
                                    'rgba(0, 0, 0, 0.4)'
                            }}
                        />


                        <div className="relative z-10 max-w-5xl mx-auto space-y-10">

                            <div className="text-center space-y-3">

                                <span className="text-xs font-sans font-bold uppercase tracking-wide px-4 py-1 rounded-full border border-white/10 bg-black/30 text-[#D9B85C]">
                                    Bulk Trade Packaging
                                </span>

                                <h2 className="text-3xl sm:text-4xl uppercase tracking-wide text-white font-bold">
                                    Trade-ready packing
                                </h2>

                                <p className="text-sm text-[#F0E3C4] font-sans font-light max-w-2xl mx-auto">
                                    Packing requirements can be
                                    discussed according to the buyer,
                                    destination and supply arrangement.
                                </p>

                            </div>


                            <div
                                className="relative border rounded-2xl p-4 sm:p-10 shadow-2xl min-h-[340px] flex flex-col justify-between overflow-hidden bg-white/95 backdrop-blur-md"
                                style={{
                                    borderColor:
                                        '#D9B85C'
                                }}
                            >

                                <div className="absolute inset-y-0 left-2 sm:left-4 flex items-center z-40">

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPackageIndex(
                                                (prev) =>
                                                    (prev -
                                                        1 +
                                                        PACKAGING_VARIANTS.length) %
                                                    PACKAGING_VARIANTS.length
                                            )
                                        }
                                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full text-white flex items-center justify-center transition-all bg-[#c09350] hover:bg-[#A67C2D] shadow-md cursor-pointer"
                                        aria-label="Previous packaging"
                                    >
                                        <FiArrowLeft
                                            size={
                                                16
                                            }
                                        />
                                    </button>

                                </div>


                                <div className="absolute inset-y-0 right-2 sm:right-4 flex items-center z-40">

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPackageIndex(
                                                (prev) =>
                                                    (prev +
                                                        1) %
                                                    PACKAGING_VARIANTS.length
                                            )
                                        }
                                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full text-white flex items-center justify-center transition-all bg-[#c09350] hover:bg-[#A67C2D] shadow-md cursor-pointer"
                                        aria-label="Next packaging"
                                    >
                                        <FiArrowRight
                                            size={
                                                16
                                            }
                                        />
                                    </button>

                                </div>


                                <div className="min-h-[240px] flex items-center justify-center px-8 sm:px-12 md:px-14 relative z-10">

                                    <AnimatePresence mode="wait">

                                        <motion.div
                                            key={
                                                packageIndex
                                            }
                                            initial={{
                                                opacity: 0,
                                                x: 15
                                            }}
                                            animate={{
                                                opacity: 1,
                                                x: 0
                                            }}
                                            exit={{
                                                opacity: 0,
                                                x: -15
                                            }}
                                            transition={{
                                                duration:
                                                    0.35,
                                                ease:
                                                    'easeInOut'
                                            }}
                                            className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center w-full py-2 text-left"
                                        >

                                            <div className="md:col-span-5 w-full flex justify-center">

                                                <div
                                                    className="relative w-full h-52 sm:h-56 rounded-xl overflow-hidden border shadow-lg flex items-center justify-center bg-[#FFF9EC]"
                                                    style={{
                                                        borderColor:
                                                            '#F2E3B4'
                                                    }}
                                                >

                                                    <img
                                                        src={
                                                            PACKAGING_VARIANTS[
                                                                packageIndex
                                                            ].asset
                                                        }
                                                        alt={
                                                            PACKAGING_VARIANTS[
                                                                packageIndex
                                                            ].size
                                                        }
                                                        className="w-full h-full object-cover"
                                                    />

                                                    <div
                                                        className="absolute top-3 left-3 text-[#FFF9EC] text-[10px] font-mono tracking-wider uppercase px-2.5 py-1 rounded font-bold shadow-md"
                                                        style={{
                                                            backgroundColor:
                                                                '#5A4422'
                                                        }}
                                                    >
                                                        {
                                                            PACKAGING_VARIANTS[
                                                                packageIndex
                                                            ].size
                                                        }
                                                    </div>

                                                </div>

                                            </div>


                                            <div className="md:col-span-7 space-y-3.5">

                                                <span className="inline-flex items-center text-[9px] font-sans font-bold uppercase tracking-widest bg-[#F2E3B4] px-3 py-1 rounded text-[#5A4422]">
                                                    {
                                                        PACKAGING_VARIANTS[
                                                            packageIndex
                                                        ].type
                                                    }
                                                </span>

                                                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#5A4422]">
                                                    {
                                                        PACKAGING_VARIANTS[
                                                            packageIndex
                                                        ].size
                                                    }
                                                </h3>

                                                <p className="text-neutral-600 font-sans font-light text-xs sm:text-sm leading-relaxed">
                                                    {
                                                        PACKAGING_VARIANTS[
                                                            packageIndex
                                                        ].desc
                                                    }
                                                </p>

                                            </div>

                                        </motion.div>

                                    </AnimatePresence>

                                </div>


                                <div className="flex justify-center items-center gap-1.5 pt-4 border-t border-slate-100 relative z-10">

                                    {PACKAGING_VARIANTS.map(
                                        (
                                            _,
                                            idx
                                        ) => (

                                            <button
                                                type="button"
                                                key={
                                                    idx
                                                }
                                                onClick={() =>
                                                    setPackageIndex(
                                                        idx
                                                    )
                                                }
                                                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                                    packageIndex ===
                                                    idx
                                                        ? 'w-5 bg-[#5A4422]'
                                                        : 'w-1.5 bg-neutral-200'
                                                }`}
                                                aria-label={`Go to packaging ${idx + 1}`}
                                            />

                                        )
                                    )}

                                </div>

                            </div>

                        </div>

                    </section>


                    {/* =================================================
                        HOW IT WORKS
                    ================================================= */}

                    <section className="max-w-7xl mx-auto px-6 py-20 sm:py-24 space-y-12">

                        <div className="text-center max-w-3xl mx-auto">

                            <span
                                className="text-xs font-sans font-bold uppercase tracking-[0.2em] px-3 py-1 rounded"
                                style={{
                                    backgroundColor:
                                        '#F2E3B4',
                                    color:
                                        '#5A4422'
                                }}
                            >
                                How Procurement Works
                            </span>

                            <h2 className="mt-4 text-3xl sm:text-4xl uppercase font-bold tracking-wide text-[#5A4422]">
                                From requirement
                                <br />
                                <span className="font-serif font-normal">
                                    to delivery.
                                </span>
                            </h2>

                        </div>


                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

                            {PROCUREMENT_STEPS.map(
                                (step) => {

                                    const Icon =
                                        step.icon;

                                    return (

                                        <motion.div
                                            key={
                                                step.number
                                            }
                                            initial={{
                                                opacity: 0,
                                                y: 15
                                            }}
                                            whileInView={{
                                                opacity: 1,
                                                y: 0
                                            }}
                                            viewport={{
                                                once: true
                                            }}
                                            className="border rounded-xl p-6 bg-white"
                                            style={{
                                                borderColor:
                                                    '#F2E3B4'
                                            }}
                                        >

                                            <div className="flex items-center justify-between">

                                                <span className="font-serif text-[#A67C2D] font-bold text-lg">
                                                    {
                                                        step.number
                                                    }
                                                </span>

                                                <Icon
                                                    size={
                                                        17
                                                    }
                                                    className="text-[#A67C2D]"
                                                />

                                            </div>

                                            <h3 className="mt-7 text-lg font-serif text-[#5A4422] uppercase tracking-wide">
                                                {
                                                    step.title
                                                }
                                            </h3>

                                            <p className="mt-3 text-[#6A6258] text-xs font-sans font-light leading-[1.7]">
                                                {
                                                    step.description
                                                }
                                            </p>

                                        </motion.div>

                                    );
                                }
                            )}

                        </div>

                    </section>


                    {/* =================================================
                        TESTIMONIALS
                    ================================================= */}

                    <section className="relative py-10 sm:py-14 bg-[#5A4422] px-4 sm:px-6 lg:px-8 border-t border-[#D9B85C]/15 overflow-hidden">

                        <TestimonialSectionBackground
                            accentColor={
                                RICE_ACCENT
                            }
                        />


                        <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">

                            <div className="text-center lg:text-left">

                                <span className="inline-block text-[10px] sm:text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#D9B85C] bg-[#4A3819]/80 px-3 py-1 rounded-full border border-[#D9B85C]/30 mb-3">
                                    Buyer Feedback
                                </span>

                                <h2 className="text-xl sm:text-3xl font-serif uppercase tracking-wide text-white drop-shadow-md leading-tight mb-4">
                                    Why trade partners
                                    <br />
                                    choose Prakriti Rice
                                </h2>

                                <p className="text-[#F0E3C4] text-xs sm:text-sm font-light leading-relaxed max-w-md mx-auto lg:mx-0">
                                    {
                                        RICE_TRUST_PARAGRAPH
                                    }
                                </p>

                            </div>


                            <div className="relative">

                                <TestimonialCoverflow
                                    items={
                                        riceTestimonials
                                    }
                                    accentColor={
                                        RICE_ACCENT
                                    }
                                    accentTextColor={
                                        RICE_ACCENT_TEXT
                                    }
                                    aspectClass="aspect-[4/3]"
                                    cardWidthClass="w-[155px] sm:w-[185px] md:w-[210px] lg:w-[230px]"
                                />

                            </div>

                        </div>

                    </section>


                    {/* =================================================
                        FINAL CTA
                    ================================================= */}

                    <section
                        id="rice-quote"
                        className="relative py-20 sm:py-28 overflow-hidden"
                        style={{
                            backgroundColor:
                                '#5A4422'
                        }}
                    >

                        <div
                            className="absolute inset-0 bg-cover bg-center opacity-40"
                            style={{
                                backgroundImage:
                                    "url('/images/rice_images/rice_8.jpeg')"
                            }}
                        />

                        <div className="absolute inset-0 bg-[#5A4422]/70" />


                        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">

                            <span className="inline-flex items-center gap-2 bg-[#2E2000]/50 border border-[#D9B85C]/40 rounded-full px-4 py-1">

                                <span className="w-1.5 h-1.5 rounded-full bg-[#D9B85C]" />

                                <span className="text-[10px] tracking-widest font-mono uppercase text-[#FFF9EC] font-bold">
                                    Tell Us What You Need
                                </span>

                            </span>


                            <h2 className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-serif text-[#FFF9EC] tracking-wide uppercase leading-tight">

                                Need bulk rice?

                                <br />

                                <span
                                    className="font-medium"
                                    style={{
                                        color:
                                            '#D9B85C'
                                    }}
                                >
                                    Start with your requirement.
                                </span>

                            </h2>


                            <p className="mt-6 text-[#F0E3C4] font-sans font-light text-xs sm:text-sm max-w-2xl leading-[1.8] mx-auto">

                                Share the rice variety, processing
                                requirement, quantity and delivery
                                location. Our commercial team will
                                review sourcing, availability and
                                logistics before confirming a quotation.

                            </p>


                            <div className="flex flex-col sm:flex-row gap-4 pt-8 items-center justify-center">

                                <button
                                    onClick={() => {

                                        const element =
                                            document.getElementById(
                                                'rice-rate-card'
                                            );

                                        if (
                                            element
                                        ) {

                                            element.scrollIntoView(
                                                {
                                                    behavior:
                                                        'smooth'
                                                }
                                            );

                                        } else {

                                            handleExploreProducts();
                                        }

                                    }}
                                    className="w-full sm:w-auto min-w-[220px] h-[52px] bg-[#F2E3B4] hover:bg-[#D9B85C] text-[#5A4422] font-sans font-bold text-[11px] sm:text-[12px] uppercase tracking-widest flex items-center justify-center rounded-[2px] transition-all"
                                >
                                    Explore Rice & Rates
                                </button>


                                <a
                                    href="https://wa.me/911169262028?text=Hello%20India%20Trade%20Overseas.%20I%20need%20bulk%20rice%20supply.%20Please%20share%20availability%20and%20quotation%20requirements."
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() =>
                                        pushDataLayerEvent(
                                            'rice_whatsapp_click',
                                            {
                                                division:
                                                    'RICE'
                                            }
                                        )
                                    }
                                    className="w-full sm:w-auto min-w-[220px] h-[52px] bg-[#121212]/30 backdrop-blur-[5px] border border-[#D9B85C]/60 hover:bg-[#D9B85C]/15 text-[#FFF9EC] font-sans font-bold text-[11px] sm:text-[12px] uppercase tracking-widest flex items-center justify-center rounded-[2px] transition-all"
                                >
                                    WhatsApp Sales
                                </a>

                            </div>


                            <p className="mt-6 text-[10px] font-mono uppercase tracking-wider text-[#C9AE81]">
                                Product • Quantity • Destination • Delivery Requirement
                            </p>

                        </div>

                    </section>

                </>
            )}


            {/* =========================================================
                BULK ORDER DRAWER
            ========================================================= */}

            <AnimatePresence>

                {isOrderDrawerOpen &&
                    activeDrawerLot && (

                        <div className="fixed inset-0 z-50 overflow-hidden font-sans">

                            <div
                                className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
                                onClick={() =>
                                    setIsOrderDrawerOpen(
                                        false
                                    )
                                }
                            />


                            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">

                                <motion.div
                                    initial={{
                                        x: '100%'
                                    }}
                                    animate={{
                                        x: 0
                                    }}
                                    exit={{
                                        x: '100%'
                                    }}
                                    transition={{
                                        type: 'tween',
                                        duration:
                                            0.35
                                    }}
                                    className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between"
                                >

                                    <div className="p-6 overflow-y-auto space-y-6 text-left">

                                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">

                                            <div>

                                                <span className="text-[9px] font-mono uppercase tracking-widest text-[#A67C2D]">
                                                    Rice Sourcing
                                                </span>

                                                <h2 className="text-xl font-serif text-[#5A4422] uppercase tracking-wide">
                                                    Request a Quote
                                                </h2>

                                            </div>


                                            <button
                                                onClick={() =>
                                                    setIsOrderDrawerOpen(
                                                        false
                                                    )
                                                }
                                                className="text-slate-400 hover:text-slate-600"
                                            >
                                                <FiX
                                                    size={
                                                        20
                                                    }
                                                />
                                            </button>

                                        </div>


                                        <div
                                            className="bg-[#FFF9EC] border rounded-xl p-4 space-y-2.5"
                                            style={{
                                                borderColor:
                                                    '#F2E3B4'
                                            }}
                                        >

                                            <span
                                                className="text-[10px] font-mono text-[#FFF9EC] px-2 py-0.5 rounded font-bold uppercase tracking-wider"
                                                style={{
                                                    backgroundColor:
                                                        '#5A4422'
                                                }}
                                            >
                                                Lot: {
                                                    activeDrawerLot.id
                                                }
                                            </span>

                                            <div className="text-sm font-bold text-slate-900 font-serif">
                                                {
                                                    activeDrawerLot.variety
                                                }
                                            </div>

                                            <div className="text-xs text-slate-600">
                                                Supply Basis:{' '}
                                                <span className="font-mono font-bold">
                                                    {
                                                        activeDrawerLot.location
                                                    }
                                                </span>
                                            </div>

                                            <div className="text-xs text-slate-600">
                                                Base Price:{' '}
                                                <span className="font-bold text-[#A67C2D]">
                                                    INR{' '}
                                                    {
                                                        activeDrawerLot.price
                                                    }
                                                    /Kg
                                                </span>
                                            </div>

                                            <div className="text-xs text-slate-600">
                                                MOQ:{' '}
                                                <span className="font-mono">
                                                    20,000 Kg
                                                </span>
                                            </div>

                                        </div>


                                        <div className="space-y-4">

                                            <div>

                                                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">
                                                    Required Quantity (Kg) *
                                                </label>

                                                <input
                                                    type="number"
                                                    min="20000"
                                                    step="1000"
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
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-md p-3 font-mono focus:outline-none focus:border-[#5A4422] text-xs"
                                                />

                                                <span className="text-[9px] text-slate-400 mt-1 block">
                                                    Minimum quantity:
                                                    20,000 Kg
                                                    (20 MT).
                                                </span>

                                            </div>


                                            <div className="bg-amber-50 border border-dashed border-amber-200 rounded-lg p-3 flex gap-2">

                                                <FiInfo
                                                    className="text-amber-800 shrink-0 mt-0.5"
                                                    size={
                                                        14
                                                    }
                                                />

                                                <p className="text-[10px] text-amber-900 font-light leading-relaxed font-serif">
                                                    This request will
                                                    be submitted to the
                                                    rice commercial team
                                                    for review and
                                                    confirmation.
                                                </p>

                                            </div>

                                        </div>

                                    </div>


                                    <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-3">

                                        <div className="flex items-center justify-between font-mono text-xs">

                                            <span className="text-slate-500 font-bold uppercase">
                                                Estimated Base Value:
                                            </span>

                                            <span className="text-[#5A4422] font-extrabold text-base">

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
                                            action={
                                                async () => {

                                                    if (
                                                        !orderQuantity ||
                                                        Number(
                                                            orderQuantity
                                                        ) <
                                                            20000
                                                    ) {

                                                        toast.error(
                                                            'Minimum order quantity is 20,000 Kg (20 MT).'
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
                                                                'RICE',

                                                            lotId:
                                                                activeDrawerLot.id,

                                                            region:
                                                                activeDrawerLot.location,

                                                            grade:
                                                                activeDrawerLot.variety,

                                                            quantity:
                                                                Number(
                                                                    orderQuantity
                                                                ),

                                                            basePrice:
                                                                Number(
                                                                    activeDrawerLot.price
                                                                )
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
                                                            err.response
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
                                                        `Rice sourcing request submitted for ${orderQuantity} Kg.`
                                                    );


                                                    pushDataLayerEvent(
                                                        'rice_proposal_submitted',
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
                                                                'INR'
                                                        }
                                                    );


                                                    fetchMyProposals();

                                                }
                                            }
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
                                            className="w-full text-white text-xs font-mono font-bold uppercase tracking-wider py-3.5 rounded-lg shadow-lg cursor-pointer disabled:cursor-default disabled:opacity-90"
                                            style={{
                                                backgroundColor:
                                                    '#5A4422'
                                            }}
                                        />

                                    </div>

                                </motion.div>

                            </div>

                        </div>

                    )}

            </AnimatePresence>


            {/* =========================================================
                FOOTER
            ========================================================= */}

            <footer
                className="py-12 border-t font-sans text-[11px] text-center"
                style={{
                    backgroundColor:
                        '#5A4422',
                    borderColor:
                        '#A67C2D',
                    color: '#F2E3B4'
                }}
            >

                <div className="max-w-7xl mx-auto px-6 space-y-3">

                    <p className="font-serif font-bold tracking-wide text-sm text-[#FFF9EC]">
                        PRAKRITI RICE DIVISION — INDIA TRADE OVERSEAS
                    </p>

                    <p className="max-w-xl mx-auto opacity-75 font-light">
                        Bulk rice sourcing and supply for wholesale,
                        institutional, HORECA and export requirements.
                        Availability and commercial terms are subject
                        to confirmation against the buyer requirement.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4 pt-3 text-[#D9B85C]">

                        <a
                            href="/prakriti"
                            className="hover:text-white transition-colors"
                        >
                            Prakriti
                        </a>

                        <span className="opacity-30">•</span>

                        <a
                            href="/prakriti/tea"
                            className="hover:text-white transition-colors"
                        >
                            Tea Division
                        </a>

                        <span className="opacity-30">•</span>

                        <a
                            href="/our-services"
                            className="hover:text-white transition-colors"
                        >
                            Our Services
                        </a>

                        <span className="opacity-30">•</span>

                        <a
                            href="/contact"
                            className="hover:text-white transition-colors"
                        >
                            Contact
                        </a>

                    </div>

                    <p className="opacity-50 pt-4">
                        © 2026 India Trade Overseas. All Rights Reserved.
                    </p>

                </div>

            </footer>

        </div>
    );
}