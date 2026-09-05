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
import { pushDataLayerEvent } from '../../utils/analytics';
import { loadRazorpayScript } from '../../utils/razorpay';
import BuyerEntryGate from '../../components/gates/BuyerEntryGate';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import TestimonialCoverflow from '../../components/Testimonials/TestimonialCoverflow';
import TestimonialSectionBackground from '../../components/Testimonials/TestimonialSectionBackground';
import { stoneTestimonials, STONE_ACCENT, STONE_ACCENT_TEXT, STONE_TRUST_PARAGRAPH } from '../../data/testimonials';
import { OrderButton } from '../../components/ui/AnimatedActionButton';

// Tracks which layer (1 = storefront, 5 = marketplace) the buyer was last viewing,
// so a refresh restores the same view instead of always jumping approved buyers to Layer 5.
const ACTIVE_LAYER_KEY = 'ito_stone_active_layer';

const STONE_GATE_THEME = {
  bg: '#37424B',
  panelBg: '#2B333A',
  accent: '#C5A059',
  accentText: '#20262B',
  text: '#F4F2EE',
  muted: '#A89E8E',
  border: '#4A545E',
  eyebrow: 'Stone & Infrastructure',
  headline: 'Welcome to India Trade Overseas',
  subhead: 'Tell us who you are to unlock live Bhutan & Pakur stone pricing and place sourcing requests directly.',
  fontClass: 'font-serif'
};

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
    image: "/images/stone_images/20mmm.jpg",
    description: "The primary standard aggregate for residential roof casting (RCC), structural beams, columns, and ready-mix concrete (RMC) batching plants. White 20MM is heavily demanded for housing project roofs.",
    specs: ["Size: 20 Nominal", "Color: Black & White Available", "Loading: Phuentsholing / Gomtu", "Usage: RCC Roofing & RMC"]
  },
  {
    id: "40mm",
    title: "40 MM Stone Chips",
    subtitle: "Heavy Roadways & Site Base Development",
    image: "/images/stone_images/40mmm.jpg",
    description: "Engineered larger aggregate primarily suited for national highway construction, site leveling, PCC foundation courses, and heavy civil drainage channels. High load resistance.",
    specs: ["Size: 40 Nominal", "Color: Black / White", "Crusher: RIGSAR / PSB / LPSQ", "Usage: Highways & PCC"]
  },
  {
    id: "60mm",
    title: "60 MM Heavy Stone",
    subtitle: "Railway Ballast & Heavy Foundations",
    image: "/images/stone_images/60mmm.jpg",
    description: "High-density crushed rock used in massive foundation mass-filling, railway track ballast layers, and heavy infrastructure sub-base preparation. Direct quarry loading.",
    specs: ["Size: 60 Nominal", "Color: Black / White", "Loading Point: Pasakha / Paskha", "Usage: Rail & Mass Fill"]
  },
  {
    id: "wmm",
    title: "WMM (Wet Mix Macadam)",
    subtitle: "Highway Sub-Base Construction",
    image: "/images/stone_images/Wmm.png",
    description: "Premixed, screened aggregate blended with optimal moisture content for high-density road base layers. Suitable for road sub-base applications where the specified mix and project requirements call for WMM.",
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

// Official ITO Pakur Stone Rate List — location -> [20MM(5/8), 30MM, 40MM, 10MM] per payment term
// Source: "ITO Pakur Stone Rate List.pdf". `null` = not available at that location/size (e.g. Malda 40MM).
const PAKUR_RAW = [
  ['Kolkata',      [2020, 2020, 1920, 1410], [2090, 2090, 1990, 1480], [2140, 2140, 2040, 1530]],
  ['Siliguri',     [2330, 2330, 2230, 1755], [2400, 2400, 2300, 1825], [2450, 2450, 2350, 1875]],
  ['Malda',        [1555, 1555, null, 905],  [1625, 1625, null, 975],  [1675, 1675, null, 1025]],
  ['Sitamarhi',    [2705, 2705, 2555, 2105], [2775, 2775, 2625, 2175], [2825, 2825, 2675, 2225]],
  ['Chhapra',      [2705, 2705, 2555, 2105], [2775, 2775, 2625, 2175], [2825, 2825, 2675, 2225]],
  ['Madhepura',    [2455, 2455, 2305, 1855], [2525, 2525, 2375, 1925], [2575, 2575, 2425, 1975]],
  ['Hajipur',      [2605, 2605, 2455, 2005], [2675, 2675, 2525, 2075], [2725, 2725, 2575, 2125]],
  ['Katihar',      [2055, 2055, 1905, 1455], [2125, 2125, 1975, 1525], [2175, 2175, 2025, 1575]],
  ['Purnia',       [2055, 2055, 1905, 1555], [2125, 2125, 1975, 1625], [2175, 2175, 2025, 1675]],
  ['Bhagalpur',    [1880, 1880, 1830, 1280], [1950, 1950, 1900, 1350], [2000, 2000, 1950, 1400]],
  ['Bihar Sharif', [2380, 2380, 2230, 1780], [2450, 2450, 2300, 1850], [2500, 2500, 2350, 1900]],
  ['Siwan',        [2730, 2730, 2580, 2130], [2800, 2800, 2650, 2200], [2850, 2850, 2700, 2250]],
  ['Darbhanga',    [2705, 2705, 2555, 2105], [2775, 2775, 2625, 2175], [2825, 2825, 2675, 2225]],
  ['Araria',       [2155, 2155, 2005, 1555], [2225, 2225, 2075, 1625], [2275, 2275, 2125, 1675]],
  ['Sheikhpura',   [2380, 2380, 2230, 1780], [2450, 2450, 2300, 1850], [2500, 2500, 2350, 1900]],
  ['Madhubani',    [2605, 2605, 2455, 2005], [2675, 2675, 2525, 2075], [2725, 2725, 2575, 2125]],
  ['Muzaffarpur',  [2505, 2505, 2355, 1905], [2575, 2575, 2425, 1975], [2625, 2625, 2475, 2025]],
  ['Kahalgaon',    [1780, 1780, 1630, 1180], [1850, 1850, 1700, 1250], [1900, 1900, 1750, 1300]],
  ['Patna',        [2480, 2480, 2330, 1880], [2550, 2550, 2400, 1950], [2600, 2600, 2450, 2000]],
  ['Kishanganj',   [2005, 2005, 1905, 1505], [2075, 2075, 1975, 1575], [2125, 2125, 2025, 1625]],
  ['Forbesganj',   [2205, 2205, 2055, 1705], [2275, 2275, 2125, 1775], [2325, 2325, 2175, 1825]],
  ['Naugachia',    [2205, 2205, 2055, 1755], [2275, 2275, 2125, 1825], [2325, 2325, 2175, 1875]],
  ['Banka',        [1780, 1780, 1630, 1180], [1850, 1850, 1700, 1250], [1900, 1900, 1750, 1300]],
  ['Sheohar',      [2680, 2680, 2530, 2080], [2750, 2750, 2600, 2150], [2800, 2800, 2650, 2200]]
];

const PAKUR_SIZE_KEYS = ['20mm', '30mm', '40mm', '10mm'];
const PAKUR_SIZE_LABELS = { '20mm': '20 MM (5/8)', '30mm': '30 MM', '40mm': '40 MM', '10mm': '10 MM' };

const PAKUR_RATES = PAKUR_RAW.map(([location, adv100, adv50, cod]) => ({
  location,
  rates: PAKUR_SIZE_KEYS.reduce((acc, key, i) => {
    acc[key] = { adv100: adv100[i], adv50: adv50[i], cod: cod[i] };
    return acc;
  }, {})
}));

const PAYMENT_TERMS = [
  { key: 'ADVANCE_100', label: '100% Advance', priceField: 'adv100' },
  { key: 'ADVANCE_50', label: '50% Advance', priceField: 'adv50' },
  { key: 'COD', label: 'Cash on Delivery', priceField: 'cod' }
];

// Official Bhutan Stone Material Rate Card — location -> [Dust, 10 White, 20 White, 30/40 White, 30 White, 40/60 White, 10 Black Kamji, 20 Black Kamji, 30 Black Kamji, 40/60 Black Kamji]
// Source: "Bhutan Stone Rate List.pdf". Note on the card: up to Rs 100 may be negotiated off the listed rate.
const BHUTAN_RAW = [
  ['Jalpaiguri',      'West Bengal', [1130, 1230, 1600, 1510, 1530, 1430, 1610, 1835, 1795, 1730]],
  ['Siliguri',        'West Bengal', [1180, 1280, 1650, 1560, 1580, 1480, 1660, 1885, 1845, 1780]],
  ['Sonapur',         'West Bengal', [1200, 1300, 1670, 1580, 1600, 1500, 1680, 1905, 1865, 1800]],
  ['Islampur',        'West Bengal', [1230, 1330, 1700, 1610, 1630, 1530, 1710, 1935, 1895, 1830]],
  ['Kanki',            'West Bengal', [1300, 1400, 1770, 1680, 1700, 1600, 1780, 2005, 1965, 1900]],
  ['Thakurganj',       'Bihar', [1230, 1330, 1700, 1610, 1630, 1530, 1710, 1935, 1895, 1830]],
  ['Kishanganj',       'Bihar', [1280, 1380, 1750, 1660, 1680, 1580, 1760, 1985, 1945, 1880]],
  ['Bahadurganj',      'Bihar', [1330, 1430, 1800, 1710, 1730, 1630, 1810, 2035, 1995, 1930]],
  ['Araria',           'Bihar', [1380, 1480, 1850, 1760, 1780, 1680, 1860, 2085, 2045, 1980]],
  ['Kursakata',        'Bihar', [1380, 1480, 1850, 1760, 1780, 1680, 1860, 2085, 2045, 1980]],
  ['Bardha',           'Bihar', [1380, 1480, 1850, 1760, 1780, 1680, 1860, 2085, 2045, 1980]],
  ['Supaul',           'Bihar', [1380, 1480, 1850, 1760, 1780, 1680, 1860, 2085, 2045, 1980]],
  ['Forbisganj',       'Bihar', [1410, 1510, 1880, 1790, 1810, 1710, 1890, 2115, 2075, 2010]],
  ['Narpatganj',       'Bihar', [1430, 1530, 1900, 1810, 1830, 1730, 1910, 2135, 2095, 2030]],
  ['Kositool',         'Bihar', [1480, 1580, 1950, 1860, 1880, 1780, 1960, 2185, 2145, 2080]],
  ['Birpur',           'Bihar', [1480, 1580, 1950, 1860, 1880, 1780, 1960, 2185, 2145, 2080]],
  ['Phulparas',        'Bihar', [1530, 1630, 2000, 1910, 1930, 1830, 2010, 2235, 2195, 2130]],
  ['Narhiya S Bihar',  'Bihar', [1530, 1630, 2000, 1910, 1930, 1830, 2010, 2235, 2195, 2130]],
  ['Jhanjharpur',      'Bihar', [1580, 1680, 2050, 1960, 1980, 1880, 2060, 2285, 2245, 2180]],
  ['Khutauna',         'Bihar', [1580, 1680, 2050, 1960, 1980, 1880, 2060, 2285, 2245, 2180]],
  ['Darbhanga',        'Bihar', [1630, 1730, 2100, 2010, 2030, 1930, 2110, 2335, 2295, 2230]],
  ['Madhubani',        'Bihar', [1630, 1730, 2100, 2010, 2030, 1930, 2110, 2335, 2295, 2230]],
  ['Samastipur',       'Bihar', [1680, 1780, 2150, 2060, 2080, 1980, 2160, 2385, 2345, 2280]],
  ['Sitamarhi',        'Bihar', [1740, 1840, 2210, 2120, 2140, 2040, 2220, 2445, 2405, 2340]],
  ['Muzaffarpur',      'Bihar', [1800, 1900, 2270, 2180, 2200, 2100, 2280, 2505, 2465, 2400]]
];

const BHUTAN_TYPE_KEYS = ['dust', 'white10', 'white20', 'white3040', 'white30', 'white4060', 'black10', 'black20', 'black30', 'black4060'];
const BHUTAN_TYPE_LABELS = {
  dust: 'Stone Dust',
  white10: '10 MM White',
  white20: '20 MM White',
  white3040: '30/40 White',
  white30: '30 MM White',
  white4060: '40/60 White',
  black10: '10 MM Black Kamji',
  black20: '20 MM Black Kamji',
  black30: '30 MM Black Kamji',
  black4060: '40/60 Black Kamji'
};

const BHUTAN_RATES = BHUTAN_RAW.map(([location, state, values]) => ({
  location,
  state,
  rates: BHUTAN_TYPE_KEYS.reduce((acc, key, i) => {
    acc[key] = values[i];
    return acc;
  }, {})
}));

export default function Stone() {
  useDocumentMeta({
    title: 'Bhutan & Pakur Stone Chips Supplier | B2B Bulk Sourcing | India Trade Overseas',
    description: 'Source Bhutan and Pakur stone chips in bulk — live location-wise rate cards, verified B2B buyer onboarding, and direct sourcing requests with India Trade Overseas.',
    canonicalPath: '/stone'
  });

  const [userAccessLayer, setUserAccessLayer] = useState(1);
  const [isSessionLoading, setIsLoadingSession] = useState(true);
  const [showEntryGate, setShowEntryGate] = useState(() => {
    // Dev-only escape hatch (stripped out of production builds) so the storefront —
    // including the Testimonials section — can be previewed locally without the OTP gate.
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('previewTestimonials') === '1') {
      return false;
    }
    return !(localStorage.getItem('ito_stone_buyer_id') && localStorage.getItem('distributor_token'));
  });
  const [distributorId, setDistributorId] = useState('');
  const [myProposals, setMyProposals] = useState([]);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);

  // Hero Carousel Control
  const [heroBgIndex, setHeroBgIndex] = useState(0);

  // Drawer & Form Controls
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
  const [activeDrawerLot, setActiveDrawerLot] = useState(null);
  const [orderQuantity, setOrderQuantity] = useState('500');

  // Official Rate Card Selector (Layer 5 marketplace pricing)
  const [rateDivision, setRateDivision] = useState('PAKUR'); // 'PAKUR' | 'BHUTAN'
  const [rateLocation, setRateLocation] = useState(PAKUR_RATES[0].location);
  const [rateGrade, setRateGrade] = useState(PAKUR_SIZE_KEYS[0]);
  const [ratePaymentTerm, setRatePaymentTerm] = useState('ADVANCE_100');

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
    const storedId = distributorId || localStorage.getItem('ito_stone_buyer_id');
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

    const initializeSession = async () => {
      const savedId = localStorage.getItem('ito_stone_buyer_id');
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
            }
            else if (status === 'pending') setUserAccessLayer(4);
            else handleLogOut();
          }
        } catch (err) {
          if (err.response?.status === 404) {
            handleLogOut();
          } else {
            console.error("Session sync failed:", err);
          }
        }
      }
      setIsLoadingSession(false);
    };
    initializeSession();
  }, []);

  // Persist the settled layer (storefront vs marketplace) so a refresh restores
  // the same view instead of always snapping approved buyers to Layer 5.
  useEffect(() => {
    if (isSessionLoading) return;
    if (userAccessLayer === 1 || userAccessLayer === 5) {
      localStorage.setItem(ACTIVE_LAYER_KEY, String(userAccessLayer));
    }
  }, [userAccessLayer, isSessionLoading]);

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

  // Entry-gate verification (name/email/phone/location + OTP already handled
  // inside BuyerEntryGate) — just adopt the resulting session.
  const handleGateVerified = (activeId, activeToken) => {
    if (activeId) {
      setDistributorId(activeId);
      localStorage.setItem('ito_stone_buyer_id', activeId);
    }
    if (activeToken) localStorage.setItem('distributor_token', activeToken);

    pushDataLayerEvent('stone_distributor_verified', { division: 'STONE' });
    setShowEntryGate(false);
    setUserAccessLayer(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Only for the two genuinely destructive cases: the CRM record was deleted (404)
  // or explicitly rejected. Clears the saved session so the entry gate reappears.
  const handleLogOut = () => {
    setUserAccessLayer(1);
    setDistributorId('');
    localStorage.removeItem('ito_stone_buyer_id');
    localStorage.removeItem('distributor_token');
    localStorage.removeItem(ACTIVE_LAYER_KEY);
    toast.success("Secured terminal session locked.");
  };

  // Manual "exit" from the marketplace — just switches the view back to the
  // storefront. Does NOT clear the saved session, so a refresh/reopen restores
  // straight back in without re-verification, as long as the CRM record still exists.
  const handleExitTerminal = () => {
    handleLogOut();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExploreProducts = () => {
    const savedId = localStorage.getItem('ito_stone_buyer_id');
    const token = localStorage.getItem('distributor_token');
    if (!savedId || !token) {
      setShowEntryGate(true);
    } else {
      setUserAccessLayer(5);
    }
  };

  // Reset location/grade whenever the division toggle changes
  useEffect(() => {
    if (rateDivision === 'PAKUR') {
      setRateLocation(PAKUR_RATES[0].location);
      setRateGrade(PAKUR_SIZE_KEYS[0]);
    } else {
      setRateLocation(BHUTAN_RATES[0].location);
      setRateGrade(BHUTAN_TYPE_KEYS[0]);
    }
  }, [rateDivision]);

  const activeRateEntry = (rateDivision === 'PAKUR' ? PAKUR_RATES : BHUTAN_RATES)
    .find((entry) => entry.location === rateLocation);

  const activeRatePrice = rateDivision === 'PAKUR'
    ? activeRateEntry?.rates?.[rateGrade]?.[PAYMENT_TERMS.find((t) => t.key === ratePaymentTerm).priceField] ?? null
    : activeRateEntry?.rates?.[rateGrade] ?? null;

  const openRateQuoteDrawer = () => {
    if (!activeRateEntry || activeRatePrice == null) return;
    const gradeLabel = rateDivision === 'PAKUR' ? PAKUR_SIZE_LABELS[rateGrade] : BHUTAN_TYPE_LABELS[rateGrade];
    const termLabel = rateDivision === 'PAKUR' ? PAYMENT_TERMS.find((t) => t.key === ratePaymentTerm).label : null;

    setActiveDrawerLot({
      id: `${rateDivision}-${rateLocation.toUpperCase().replace(/\s+/g, '-')}-${rateGrade.toUpperCase()}`,
      division: rateDivision === 'PAKUR' ? 'Pakur Stone' : 'Bhutan Stone',
      region: activeRateEntry.state ? `${rateLocation}, ${activeRateEntry.state}` : rateLocation,
      grade: termLabel ? `${gradeLabel} (${termLabel})` : gradeLabel,
      price: activeRatePrice,
      paymentTerm: rateDivision === 'PAKUR' ? ratePaymentTerm : undefined
    });
    setIsOrderDrawerOpen(true);
  };

  if (showEntryGate) {
    return (
      <BuyerEntryGate
        theme={STONE_GATE_THEME}
        division="STONE"
        requireOtp={true}
        onVerified={handleGateVerified}
        mascotSrc="/images/walking-man.png"
      />
    );
  }

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
              "Your India Trade Overseas stone buyer account is under review. Our team is verifying your GST/Udyam business documents. You will receive confirmation within 24 hours once approved."
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

              {/* ðŸŸ¢ Responsive 2-Column Grid on Mobile, Flex on Desktop */}
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
                  onClick={handleExitTerminal}
                  className="w-full sm:w-auto bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 border border-white/10 text-slate-200 font-mono text-[9px] xs:text-[10px] sm:text-[11px] font-bold uppercase tracking-wider py-2.5 px-2 sm:px-3 rounded-lg transition-all cursor-pointer text-center truncate"
                >
                  Exit Terminal
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
                  Stone Aggregate Sourcing Terminal
                </h2>
                <p className="text-xs sm:text-sm text-[#DCCCB4] font-light leading-relaxed max-w-2xl font-sans">
                  Access location-wise commercial rates for Bhutan and Pakur stone aggregates. Final availability, specification, pricing and logistics are confirmed against the buyer requirement.
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
                                              try {
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
                                                  pushDataLayerEvent('stone_payment_success', {
                                                    transaction_id: response.razorpay_payment_id,
                                                    value: singleAmount,
                                                    currency: 'INR',
                                                    lot_id: prop.lotId,
                                                    quantity: prop.quantity
                                                  });
                                                  fetchMyProposals();
                                                }
                                              } catch (verifyErr) {
                                                console.error('Razorpay verify-payment failed:', verifyErr.response?.data || verifyErr);
                                                toast.error(verifyErr.response?.data?.message || verifyErr.message || "Payment verification failed.");
                                              }
                                            },
                                            theme: { color: "#37424B" }
                                          };

                                          await loadRazorpayScript();
                                          new window.Razorpay(options).open();
                                        } catch (err) {
                                          console.error('Razorpay create-order failed:', err.response?.data || err);
                                          toast.dismiss(loadingToast);
                                          toast.error(err.response?.data?.message || err.message || "Checkout failed.");
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
                                  pushDataLayerEvent('stone_payment_success', {
                                    transaction_id: response.razorpay_payment_id,
                                    value: aggregateAmount,
                                    currency: 'INR',
                                    lot_id: targetLotString,
                                    quantity: combinedQuantity
                                  });
                                  setIsProposalModalOpen(false);
                                  fetchMyProposals();
                                } catch (verifyErr) {
                                  console.error('Razorpay verify-payment failed:', verifyErr.response?.data || verifyErr);
                                  toast.dismiss(verificationToast);
                                  toast.error(verifyErr.response?.data?.message || verifyErr.message || "Payment verification failed.");
                                }
                              },
                              prefill: {
                                name: approvedProposals[0]?.name || "Corporate Partner",
                                email: approvedProposals[0]?.email || ""
                              },
                              theme: { color: "#37424B" }
                            };

                            await loadRazorpayScript();
                            new window.Razorpay(options).open();
                          } catch (err) {
                            console.error('Razorpay create-order failed:', err.response?.data || err);
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

            {/* Official Rate Card Selector */}
            <div className="space-y-3 sm:space-y-4 text-left">
              <h3 className="font-serif text-base sm:text-lg text-[#37424B] uppercase tracking-wider font-bold px-1">
                Official Rate Card — Select Origin, Delivery Location & Grade
              </h3>

              <div className="bg-white border border-[#DCCCB4] rounded-xl p-4 sm:p-6 shadow-sm space-y-4">
                {/* Division Toggle */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRateDivision('PAKUR')}
                    className={`flex-1 py-2.5 rounded-lg font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                      rateDivision === 'PAKUR' ? 'bg-[#37424B] text-white border-[#37424B]' : 'bg-[#F4F2EE] text-[#6D6760] border-[#DCCCB4]'
                    }`}
                  >
                    Pakur Stone
                  </button>
                  <button
                    type="button"
                    onClick={() => setRateDivision('BHUTAN')}
                    className={`flex-1 py-2.5 rounded-lg font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                      rateDivision === 'BHUTAN' ? 'bg-[#37424B] text-white border-[#37424B]' : 'bg-[#F4F2EE] text-[#6D6760] border-[#DCCCB4]'
                    }`}
                  >
                    Bhutan Stone
                  </button>
                </div>

                <div className={`grid grid-cols-1 ${rateDivision === 'PAKUR' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#6D6760] mb-1">Delivery Location *</label>
                    <select
                      value={rateLocation}
                      onChange={(e) => setRateLocation(e.target.value)}
                      className="w-full bg-[#F4F2EE] border border-[#DCCCB4] rounded p-3 text-xs text-[#37424B] font-mono"
                    >
                      {(rateDivision === 'PAKUR' ? PAKUR_RATES : BHUTAN_RATES).map((entry) => (
                        <option key={entry.location} value={entry.location}>
                          {entry.location}{entry.state ? ` (${entry.state})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#6D6760] mb-1">
                      {rateDivision === 'PAKUR' ? 'Nominal Size *' : 'Material Grade *'}
                    </label>
                    <select
                      value={rateGrade}
                      onChange={(e) => setRateGrade(e.target.value)}
                      className="w-full bg-[#F4F2EE] border border-[#DCCCB4] rounded p-3 text-xs text-[#37424B] font-mono"
                    >
                      {(rateDivision === 'PAKUR' ? PAKUR_SIZE_KEYS : BHUTAN_TYPE_KEYS).map((key) => (
                        <option key={key} value={key}>
                          {rateDivision === 'PAKUR' ? PAKUR_SIZE_LABELS[key] : BHUTAN_TYPE_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {rateDivision === 'PAKUR' && (
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#6D6760] mb-1">Payment Term *</label>
                      <select
                        value={ratePaymentTerm}
                        onChange={(e) => setRatePaymentTerm(e.target.value)}
                        className="w-full bg-[#F4F2EE] border border-[#DCCCB4] rounded p-3 text-xs text-[#37424B] font-mono"
                      >
                        {PAYMENT_TERMS.map((term) => (
                          <option key={term.key} value={term.key}>{term.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F4F2EE] border border-[#DCCCB4] rounded-xl p-4">
                  {activeRatePrice == null ? (
                    <span className="text-xs font-sans text-slate-500 italic">Not available at this location for the selected grade.</span>
                  ) : (
                    <>
                      <div>
                        <span className="text-[9px] font-mono uppercase text-slate-400 block">Commercial Rate</span>
                        <span className="text-xl font-mono font-extrabold text-[#37424B]">INR {activeRatePrice.toLocaleString()}<span className="text-xs font-medium text-slate-500">/MT</span></span>
                      </div>
                      <button
                        onClick={openRateQuoteDrawer}
                        className="bg-[#37424B] hover:bg-[#6D6760] text-[#F4F2EE] px-5 py-3 rounded-lg font-mono font-bold uppercase tracking-wider text-[10px] shadow transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <FiShoppingCart size={12} /> Request Bulk Quote
                      </button>
                    </>
                  )}
                </div>

                {rateDivision === 'BHUTAN' && (
                  <p className="text-[10px] text-slate-400 font-sans">Rates per official Bhutan Stone rate card; up to â‚¹100/MT may be negotiable at final invoicing.</p>
                )}
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
                    Bulk Stone Aggregates for Construction.
                  </h2>
                </div>

                <div className="w-20 h-[3px] mx-auto lg:mx-0 bg-[#C5A059]" />

                <p className="max-w-xl text-[#DCCCB4] font-sans font-light text-xs sm:text-sm leading-relaxed drop-shadow">
                  Bulk sourcing of stone aggregates from Bhutan and Pakur for construction, roadwork, infrastructure and commercial requirements.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                  <button
                    onClick={handleExploreProducts}
                    className="w-full sm:w-auto text-[#37424B] text-xs font-mono font-bold uppercase tracking-widest px-8 py-4 rounded shadow-xl transition-all hover:scale-105 transform cursor-pointer bg-[#C5A059]"
                  >
                    View Sourcing Options
                  </button>
                  <a
                    href="#teaser-deck"
                    className="w-full sm:w-auto text-center text-[#F4F2EE] text-xs font-mono font-bold uppercase tracking-widest px-6 py-4 rounded backdrop-blur-md border border-white/20 hover:bg-white/10 transition-all"
                  >
                    View Supply Options
                  </a>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-3">
                {[
                  { label: "01 • SOURCING ORIGIN", title: "Bhutan & Pakur Mines", desc: "Basalt and quartzite geological extraction." },
                  { label: "02 • NOMINAL SIZES", title: "10mm, 20mm, 30mm, 40/60mm, Dust", desc: "Mechanical crushing plant configurations." },
                  { label: "03 • LOGISTICS NETWORK", title: "Jaigaon, Pasakha, Kishanganj Fleet", desc: "Multi-axle tipper and dump truck routing." },
                  { label: "04 • TRADE LEDGER", title: "COMMERCIAL RATE MATRIX", desc: "Quotation and order confirmation process." }
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
                Stone Aggregates & Construction Materials
              </h2>
              <p className="text-xs sm:text-sm text-[#6D6760] font-sans font-light">
                Explore aggregate sizes and construction materials with sourcing, commercial coordination and dispatch arranged according to project requirements.
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
                          onClick={handleExploreProducts}
                          className="bg-[#37424B] hover:bg-[#6D6760] text-[#F4F2EE] font-mono font-bold text-[10px] uppercase tracking-wider py-2.5 px-5 rounded shadow transition-all cursor-pointer inline-flex items-center gap-2"
                        >
                          View Sourcing Options <FiArrowRight />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* ================= SOURCING PROCESS ================= */}
          <section className="py-20 sm:py-24 bg-[#F4F2EE] px-4 sm:px-6 lg:px-8 border-t border-[#DCCCB4]">
            <div className="max-w-7xl mx-auto">
              <div className="max-w-3xl mb-10 text-left">
                <span className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#C5A059]">
                  HOW IT WORKS
                </span>
                <h2 className="mt-3 text-3xl sm:text-4xl font-serif text-[#37424B] uppercase tracking-wide font-bold">
                  From requirement to dispatch
                </h2>
                <p className="mt-4 text-xs sm:text-sm text-[#6D6760] font-sans font-light leading-relaxed">
                  Share the required aggregate size, quantity and delivery location.
                  We review availability, commercial terms and logistics before confirming the supply.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  ["01", "Share Requirement", "Tell us the aggregate size, quantity and delivery location."],
                  ["02", "Source & Verify", "We coordinate the relevant Bhutan or Pakur sourcing option."],
                  ["03", "Confirm Commercials", "Availability, specification, pricing and delivery terms are confirmed."],
                  ["04", "Dispatch & Logistics", "Dispatch and transport are coordinated through the agreed supply process."]
                ].map(([number, title, desc]) => (
                  <div key={number} className="bg-white border border-[#DCCCB4] rounded-xl p-6">
                    <span className="font-mono text-sm font-bold text-[#C5A059]">{number}</span>
                    <h3 className="mt-6 text-lg font-serif font-bold text-[#37424B] uppercase tracking-wide">{title}</h3>
                    <p className="mt-3 text-xs text-[#6D6760] font-sans font-light leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-10">
                <button onClick={handleExploreProducts}
                  className="w-full sm:w-auto bg-[#37424B] hover:bg-[#6D6760] text-[#F4F2EE] font-mono font-bold text-[10px] uppercase tracking-wider py-3.5 px-7 rounded shadow transition-all cursor-pointer">
                  Request Bulk Quote
                </button>
              </div>
            </div>
          </section>

          {/* SOFT GATE TEASER SECTION */}
          <section id="teaser-deck" className="py-24 bg-[#37424B] text-white px-4 sm:px-6 lg:px-8 border-y border-[#C5A059]/30 relative overflow-hidden">
            <div className="max-w-7xl mx-auto space-y-12 relative z-10 text-left">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#C5A059]">AVAILABLE SOURCING CATEGORIES</span>
                <h2 className="text-3xl font-serif text-white uppercase tracking-wide">Stone Supply Options</h2>
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
                          <div>COMMERCIAL RATE: â‚¹X,XXX / MT</div>
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
                        onClick={handleExploreProducts}
                        className="w-full bg-white/5 hover:bg-[#C5A059] text-white hover:text-[#37424B] text-[9px] sm:text-xs font-mono font-bold uppercase tracking-wider py-3 px-2 rounded-lg border border-white/10 transition-all text-center flex items-center justify-center"
                      >
                        View Sourcing Options
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* BUYER TESTIMONIAL COVERFLOW */}
          <section className="relative py-6 sm:py-8 bg-[#37424B] px-4 sm:px-6 lg:px-8 border-t border-[#C5A059]/15 overflow-hidden">
            <TestimonialSectionBackground accentColor={STONE_ACCENT} />
            <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="text-center lg:text-left">
                <span className="inline-block text-[10px] sm:text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#C5A059] bg-[#2B333A]/80 px-3 py-1 rounded-full border border-[#C5A059]/30 mb-3">
                  Trusted By Buyers Worldwide
                </span>
                <h2 className="text-xl sm:text-3xl font-serif uppercase tracking-wide text-white drop-shadow-md leading-tight mb-4">
                  Why Buyers Choose Our Stone Supply
                </h2>
                <p className="text-[#DCD3C4] text-xs sm:text-sm font-light leading-relaxed max-w-md mx-auto lg:mx-0">
                  {STONE_TRUST_PARAGRAPH}
                </p>
              </div>

              <div className="relative">
                <TestimonialCoverflow
                  items={stoneTestimonials}
                  accentColor={STONE_ACCENT}
                  accentTextColor={STONE_ACCENT_TEXT}
                  aspectClass="aspect-[4/3]"
                  cardWidthClass="w-[155px] sm:w-[185px] md:w-[210px] lg:w-[230px]"
                />
              </div>
            </div>
          </section>
        </>
      )}

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
                    <div className="text-xs text-[#6D6760] font-mono">Division: {activeDrawerLot.division}</div>
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
                  <OrderButton
                    action={async () => {
                      if (!orderQuantity || Number(orderQuantity) < 40) {
                        toast.error("Minimum constraint is 40 MT.");
                        throw new Error('validation');
                      }

                      const proposalPayload = {
                        distributorId: distributorId,
                        division: 'STONE',
                        lotId: activeDrawerLot.id,
                        region: activeDrawerLot.region,
                        grade: activeDrawerLot.grade,
                        quantity: Number(orderQuantity),
                        basePrice: Number(activeDrawerLot.price),
                        paymentTerm: activeDrawerLot.paymentTerm
                      };

                      let res;
                      try {
                        res = await distributorApi.createProposal(proposalPayload);
                      } catch (err) {
                        toast.error(err.response?.data?.message || "Failed to dispatch proposal.");
                        throw err;
                      }

                      if (!res.success) {
                        toast.error(res.message || "Failed to dispatch proposal.");
                        throw new Error('api_failure');
                      }

                      toast.success(`Stone sourcing proposal logged for ${orderQuantity} MT.`);
                      pushDataLayerEvent('stone_proposal_submitted', {
                        lot_id: activeDrawerLot.id,
                        quantity: Number(orderQuantity),
                        value: Number(orderQuantity) * Number(activeDrawerLot.price || 0),
                        currency: 'INR'
                      });
                      fetchMyProposals();
                    }}
                    onDone={() => setIsOrderDrawerOpen(false)}
                    icon={FiShoppingCart}
                    idleLabel="Submit Sourcing Request"
                    busyLabel="Submitting..."
                    doneLabel="Request Submitted"
                    className="w-full bg-[#37424B] hover:bg-[#252c34] text-white text-xs font-mono font-bold uppercase py-3.5 rounded shadow-md cursor-pointer disabled:cursor-default disabled:opacity-90"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
