import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiShield,
    FiBriefcase,
    FiFileText,
    FiCheckCircle,
    FiArrowRight,
    FiArrowLeft,
    FiShoppingBag
} from 'react-icons/fi';

const CAROUSEL_IMAGES = [
    { size: "250 g", format: "Premium Box", imgPath: "./images/chai_1.png", description: "Standard countertop consumer packaging unit featuring high barrier freshness lock seals." },
    { size: "500 g", format: "Premium Pouch", imgPath: "./images/chai_2.png", description: "Mid-tier volume option tailored for family provisioning channels and corporate gift collections." },
    { size: "1 kg", format: "Premium Pouch", imgPath: "./images/chai_3.png", description: "High-yield layout package built for neighborhood tea cafes, bistros, and heavy trade usage." },
    { size: "5 kg", format: "Premium Jar", imgPath: "./images/chai_4.png", description: "Heavy bulk container designed for long-life storage across franchise distribution counters." },
    { size: "10 kg", format: "Premium Jar", imgPath: "./images/chai_5.png", description: "Maximum wholesale asset deployment packaging built for private label repackaging setups." }
];

const PRODUCT_CARDS = [
    {
        id: 1,
        imgSrc: "./images/dust_Assam_CTC_Flavoured.jpeg",
        description: "Assam CTC (Flavoured)"
    },
    {
        id: 2,
        imgSrc: "./images/leaf_Assam_CTC_Regular.jpeg",
        description: "Assam CTC Leaf(Regular)"
    },
    {
        id: 3,
        imgSrc: "./images/Premium_Tea.jpeg",
        description: "Premium Assam Tea(Export Quality) "
    },
    {
        id: 4,
        imgSrc: "./images/Prakriti Image.jpeg",
        description: "Prakriti Commercial Dust offers an incredibly high extraction yield, custom-tailored for high-volume traditional tea stalls requiring a robust base for intense milk tea recipes."
    }
];

export default function Prakriti() {
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [activeTab, setActiveTab] = useState('responsibilities');

    useEffect(() => {
        const autoScroll = setInterval(() => {
            setCarouselIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
        }, 5000);
        return () => clearInterval(autoScroll);
    }, []);

    return (
        <div className="bg-[#FAF9F5] text-slate-900 antialiased min-h-screen font-sans selection:bg-[#50C878]/30 selection:text-[#004B3B]">

            {/* ================= PREMIUM HERO SECTION ================= */}
            <section className="relative w-full min-h-[85vh] flex items-center bg-[#0B3D2E] overflow-hidden py-20">

                {/* Absolute Background Layer Architecture */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="./images/Prakriti Image.jpeg"
                        alt="Prakriti Premium Tea Fields Background"
                        className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0B3D2E]/95 via-[#014B3B]/80 to-[#0B3D2E]/90 sm:from-[#0B3D2E]/75 sm:via-[#004B3B]/35 sm:to-[#0B3D2E]/70 z-1" />

                    {/* Extra depth screen-tint factor */}
                    <div className="absolute inset-0 bg-[#0B3D2E]/40 sm:bg-[#0B3D2E]/20 mix-blend-multiply z-1" />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">

                    {/* Hero Branding Content */}
                    <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 bg-[#50C878]/20 border border-[#50C878]/40 rounded-full px-4 py-1.5 backdrop-blur-xs">
                            <span className="w-2 h-2 rounded-full bg-[#50C878] animate-pulse" />
                            <span className="text-[10px] tracking-widest font-mono uppercase text-white font-bold">Pan-India Distributorship Framework</span>
                        </div>

                        <h1 className="text-4xl sm:text-6xl font-serif text-white tracking-tight leading-tight uppercase">
                            PRAKRITI <br />
                            <span className="text-[#50C878] font-sans font-light normal-case tracking-wide text-xl sm:text-3xl block mt-2">
                                Premium Quality Indian Tea
                            </span>
                        </h1>

                        <div className="w-20 h-[2px] bg-[#50C878] mx-auto lg:mx-0" />

                        <p className="text-sm sm:text-base text-slate-100 font-light max-w-xl mx-auto lg:mx-0 leading-relaxed drop-shadow-xs">
                            Build a structured local tea distribution network with a national-ready brand. Sourced across premium tier estates in Assam, Darjeeling, and Dooars.
                        </p>

                        <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 pt-4">
                            <a href="#program-details" className="bg-[#50C878] hover:bg-[#50C878]/90 text-[#0B2D5B] font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-sm transition-all shadow-xl text-center">
                                Review Program Terms
                            </a>
                            <Link to="/quote-request" className="bg-transparent border border-white/50 hover:border-[#50C878] hover:text-[#50C878] text-white font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-sm transition-all text-center backdrop-blur-xs">
                                Apply For Distributorship
                            </Link>
                        </div>
                    </div>

                    {/* Hero Financial Metric Cards Grid */}
                    <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4 z-10">
                        {[
                            { label: "Programme Charge", value: "Rs. 10,00,000", sub: "Onboarding & Enrolment entry", highlight: true },
                            { label: "Exit-Refundable Security", value: "50% Component", sub: "Rs. 5,00,000 eligible on formal close" },
                            { label: "Tea Stock Rotation Value", value: "Up to Rs. 15,00,000", sub: "Company-supported allocation framework" }
                        ].map((metric, i) => (
                            <div
                                key={i}
                                className={`p-5 rounded-lg border backdrop-blur-md transition-all ${metric.highlight
                                    ? 'bg-[#004B3B]/80 border-[#50C878]/60 shadow-lg'
                                    : 'bg-[#0B3D2E]/60 border-white/10 shadow-sm'
                                    }`}
                            >
                                <div className="text-[10px] uppercase tracking-widest text-slate-300 font-mono">{metric.label}</div>
                                <div className={`text-xl sm:text-2xl font-serif my-0.5 ${metric.highlight ? 'text-[#50C878]' : 'text-white'}`}>
                                    {metric.value}
                                </div>
                                <div className="text-xs text-slate-300 font-light">{metric.sub}</div>
                            </div>
                        ))}
                    </div>

                </div>
            </section>

            {/* ================= PREMIUM CINEMATIC PRODUCT DECK ================= */}
            <section id="products-deck" className="py-28 bg-[#004B3B] text-white px-4 sm:px-6 lg:px-8 border-y border-[#50C878]/20 relative overflow-hidden">
                {/* Light ambient background glows to add depth */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#50C878]/5 rounded-full filter blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#0B3D2E]/50 rounded-full filter blur-3xl pointer-events-none" />

                <div className="max-w-7xl mx-auto space-y-16 relative z-10">

                    {/* Section Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
                        <div className="space-y-1 text-center md:text-left">
                            <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-[#50C878]">Commercial Grade Catalog</span>
                            <h2 className="text-3xl sm:text-4xl font-serif uppercase tracking-wide mt-1">
                                Prakriti Product Showcase
                            </h2>
                        </div>
                        <p className="text-slate-300 text-xs sm:text-sm max-w-md font-light leading-relaxed md:text-right">
                            Indicative trading base pricing runs from <span className="text-[#50C878] font-semibold">INR 120 to INR 450 per Kilogram</span> based on contract volume and packaging dimensions.
                        </p>
                    </div>

                    {/* Premium Cinematic Product Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {PRODUCT_CARDS.map((prod, index) => (
                            <motion.div
                                key={prod.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
                                whileHover={{ y: -10 }}
                                className="relative flex flex-col justify-between rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] p-5 transition-all duration-300 shadow-xl group backdrop-blur-xs"
                            >
                                {/* Subtle glowing border accent on hover */}
                                <div className="absolute inset-0 border border-[#50C878]/0 group-hover:border-[#50C878]/30 rounded-2xl transition-all duration-500 pointer-events-none z-20" />

                                <div className="space-y-5">
                                    {/* Aspect-Ratio Guarded Premium Image Container */}
                                    <div className="w-full aspect-[4/5] rounded-xl overflow-hidden bg-slate-950/40 border border-white/5 relative shadow-inner">
                                        <img
                                            src={prod.imgSrc}
                                            alt="Prakriti Tea Variant Product Layout"
                                            className="w-full h-full object-cover object-center transform scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                                        />

                                        {/* Dark subtle vignette overlay on image */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 group-hover:opacity-20 transition-opacity duration-500" />

                                        {/* Minimalist Floating Shopping Utility Icon */}
                                        <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-[#0B3D2E]/90 border border-white/10 flex items-center justify-center text-[#50C878] shadow-md group-hover:bg-[#50C878] group-hover:text-[#0B3D2E] transition-all duration-300">
                                            <FiShoppingBag size={13} />
                                        </div>
                                    </div>

                                    {/* Product Narrative / Description */}
                                    <p className="text-xs text-slate-300/90 font-sans font-light leading-relaxed px-1 text-left tracking-wide group-hover:text-white transition-colors duration-300">
                                        {prod.description}
                                    </p>
                                </div>

                                {/* Action Trigger Deck */}
                                <div className="pt-5 mt-6 border-t border-white/10">
                                    <Link
                                        to="/quote-request"
                                        className="w-full inline-flex items-center justify-center gap-2 text-center bg-transparent border border-white/20 hover:border-[#50C878] bg-white/[0.02] hover:bg-[#50C878] text-white hover:text-[#0B3D2E] text-[10px] uppercase font-mono font-bold tracking-widest py-3.5 px-4 transition-all rounded-lg shadow-xs group-hover:shadow-[#50C878]/10"
                                    >
                                        <span>Inquire Variant Pricing</span>
                                        <FiArrowRight size={12} className="transform group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                </div>
            </section>

            {/* ================= B2B DISTRIBUTION TERMS MANAGEMENT ================= */}
            <section id="program-details" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">

                <div className="text-center max-w-3xl mx-auto space-y-3">
                    <span className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#50C878]">Commercial Operating Guidelines</span>
                    <h2 className="text-3xl font-serif text-[#004B3B] uppercase tracking-wide">Pan-India Operations Framework</h2>
                    <p className="text-slate-500 font-light text-sm leading-relaxed">
                        Please review our preliminary policy blueprints below. Commercial pricing, state margins, and territory allocation paths are locked until the underlying framework is officially confirmed in writing.
                    </p>
                </div>

                {/* Tab Selection Interface */}
                <div className="flex flex-wrap justify-center gap-2 border-b border-slate-200 pb-px">
                    {[
                        { id: 'responsibilities', label: 'Responsibilities & Discipline', icon: FiShield },
                        { id: 'enrolment', label: 'How to Enrol Partner', icon: FiBriefcase },
                        { id: 'commercials', label: 'Accept Core Terms', icon: FiFileText }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 rounded-t-sm ${activeTab === tab.id
                                ? 'border-[#004B3B] text-[#004B3B] bg-white shadow-xs'
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content Staging Area */}
                <div className="bg-white border border-slate-200 rounded-sm p-8 sm:p-12 shadow-xs min-h-[380px]">
                    <AnimatePresence mode="wait">
                        {activeTab === 'responsibilities' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                            >
                                <div className="lg:col-span-7 space-y-6">
                                    <h3 className="text-xl font-serif text-[#004B3B] uppercase tracking-wide">Distributor Responsibilities & Territory Discipline</h3>
                                    <p className="text-slate-600 text-sm font-light leading-relaxed">
                                        Sustainable business development requires highly disciplined regional deployment footprint tracking, regular trade execution pipelines, and rigid pricing protection metrics.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                        <div className="p-4 bg-[#FAF9F5] rounded-sm space-y-1.5 border-l-2 border-[#50C878]">
                                            <div className="font-bold text-[#004B3B] uppercase tracking-wider text-[11px]">Develop Market</div>
                                            <div className="text-slate-500 font-light">Systematically expand accounts inside allocated retail, wholesale, and hospitality avenues.</div>
                                        </div>
                                        <div className="p-4 bg-[#FAF9F5] rounded-sm space-y-1.5 border-l-2 border-[#50C878]">
                                            <div className="font-bold text-[#004B3B] uppercase tracking-wider text-[11px]">Operating Routine</div>
                                            <div className="text-slate-500 font-light">Maintain recurring channel call metrics, stock tracking, local collections, and prompt payment cycles.</div>
                                        </div>
                                        <div className="p-4 bg-[#FAF9F5] rounded-sm space-y-1.5 border-l-2 border-[#50C878]">
                                            <div className="font-bold text-[#004B3B] uppercase tracking-wider text-[11px]">Pricing Discipline</div>
                                            <div className="text-slate-500 font-light">Strictly respect approved territorial margins. Unauthorized premium or margin manipulation is prohibited.</div>
                                        </div>
                                        <div className="p-4 bg-[#FAF9F5] rounded-sm space-y-1.5 border-l-2 border-[#50C878]">
                                            <div className="font-bold text-[#004B3B] uppercase tracking-wider text-[11px]">Data Protection</div>
                                            <div className="text-slate-500 font-light">Company supplied lead pipelines must be channeled exclusively toward approved localized sales operations.</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="lg:col-span-5 bg-[#004b3b]/5 p-6 rounded-sm flex flex-col justify-between border border-[#004B3B]/10">
                                    <div className="space-y-4">
                                        <div className="text-xs uppercase font-mono text-[#004B3B] font-bold tracking-widest">Territory Protection Policy</div>
                                        <p className="text-xs text-slate-600 font-light leading-relaxed">
                                            Exclusivity maps are officially finalized *only* upon final legal compilation of the signed Distributor Agreement. Cross-territory poaching or unauthorized gray-market trade will trigger rapid review actions.
                                        </p>
                                    </div>
                                    <div className="border-t border-slate-200 pt-4 mt-6 text-[11px] text-slate-400 font-mono uppercase tracking-wider">
                                        Controlled Framework Standard
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'enrolment' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-8"
                            >
                                <div className="max-w-2xl">
                                    <h3 className="text-xl font-serif text-[#004B3B] uppercase tracking-wide">How to Enrol as a Prakriti Distributor</h3>
                                    <p className="text-slate-600 text-sm font-light leading-relaxed mt-1">
                                        Our verified onboarding architecture filters candidates to synchronize regional logistical bandwidth before releasing active commercial product list inventories.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[
                                        { step: "01", name: "Register Interest", info: "Share your basic company profile, city/state, experience and target market." },
                                        { step: "02", name: "Initial Discussion", info: "Discuss the distributorship value, programme structure, territory and support framework." },
                                        { step: "03", name: "Territory Review", info: "Confirm city/cluster potential, product mix and local competitor/buyer landscape." },
                                        { step: "04", name: "Doc Submission", info: "Submit PAN, identity/address documents, GST where applicable, and business profiles." },
                                        { step: "05", name: "Terms Acceptance", info: "Accept the core terms in writing before pricing, margin and details are finalised." },
                                        { step: "06", name: "Commercial Proposal", info: "Receive the applicable rate, product/pack plan, margin, target and incentive discussion." },
                                        { step: "07", name: "Agreement Signoff", info: "Execute final Distributor Agreement and complete approved programme payment processing." },
                                        { step: "08", name: "Launch Sequence", info: "Complete product training, customer mapping, launch plan and first stock cycle." }
                                    ].map((block, idx) => (
                                        <div key={idx} className="p-4 border border-slate-100 bg-[#FAF9F5] rounded-xs space-y-2">
                                            <div className="text-xs font-mono font-bold text-[#50C878]">{block.step}</div>
                                            <h4 className="text-xs font-bold text-[#004B3B] uppercase tracking-wide">{block.name}</h4>
                                            <p className="text-[11px] text-slate-500 font-light leading-relaxed">{block.info}</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'commercials' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-8"
                            >
                                <div className="border-b border-slate-100 pb-4">
                                    <h3 className="text-xl font-serif text-[#004B3B] uppercase tracking-wide">Accept the Core Terms & Finalize Commercials</h3>
                                    <p className="text-xs text-slate-400 font-mono uppercase tracking-wider mt-0.5">Pricing, distributor margin, target volume and territory allocation will be discussed only after core terms are accepted.</p>
                                </div>

                                <div className="space-y-3 max-w-4xl">
                                    {[
                                        "I explicitly acknowledge that the total master distributorship program charge configuration stands at a transparent value of Rs. 10,00,000.",
                                        "I accept that 50% (Rs. 5,00,000) represents an exit-only refundable security component governed strictly by written account reconciliation.",
                                        "I acknowledge that the company will activate tea warehouse inventory stock rotation limits valued up to Rs. 15,00,000 subject to operational SOP tracking.",
                                        "I understand that territory-specific sales target structures and performance margin tiers are drafted *only* after this acceptance step is completed.",
                                        "I note that fallback company sales-support features encompass territory buyer target logs, marketing copy, and mix replacement channels.",
                                        "I verify that all pricing data and regional distribution layout components remain non-binding until the final Distributor Agreement is executed."
                                    ].map((term, i) => (
                                        <div key={i} className="flex gap-3 items-start p-3 bg-[#FAF9F5] rounded-sm text-xs text-slate-700 font-light border-l border-slate-300">
                                            <FiCheckCircle className="text-[#50C878] shrink-0 mt-0.5" size={14} />
                                            <span>{term}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-4">
                                    <Link to="/contact" className="inline-flex items-center gap-2 bg-[#004B3B] hover:bg-[#50C878] text-white hover:text-[#0B2D5B] font-mono font-bold text-xs uppercase tracking-widest px-8 py-4 transition-all rounded-xs">
                                        Transmit Acceptance & Request Terms <FiArrowRight size={14} />
                                    </Link>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </section>

            {/* ================= DYNAMIC CAROUSEL SECTION ================= */}
            <section className="py-16 bg-[#0B3D2E] text-white px-4 sm:px-6 lg:px-8 border-t border-[#C99B38]/30 relative overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img
                        src="./images/Prakriti Image.jpeg"
                        alt="Prakriti Premium Tea Fields Background"
                        className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0B3D2E]/95 via-[#014B3B]/80 to-[#0B3D2E]/90 sm:from-[#0B3D2E]/75 sm:via-[#004B3B]/35 sm:to-[#0B3D2E]/70 z-1" />

                    {/* Extra depth screen-tint factor */}
                    <div className="absolute inset-0 bg-[#0B3D2E]/40 sm:bg-[#0B3D2E]/20 mix-blend-multiply z-1" />
                </div>

                <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#50C878_1px,transparent_1px),linear-gradient(to_bottom,#50C878_1px,transparent_1px)] bg-[size:32px_32px]" />

                <div className="max-w-5xl mx-auto space-y-12 relative z-10">

                    <div className="text-center space-y-2 mb-4">
                        <span className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#50C878]">Sizing Configuration Portfolio</span>
                        <h2 className="text-3xl font-serif uppercase tracking-wide">Prakriti Sizing & Packaging Portfolio</h2>
                        <p className="text-slate-100 font-sans font-light text-sm  max-w-sm mx-auto">
                            Review our complete packing catalog ranging from individual retail formats up to massive commercial bulk supply setups.
                        </p>
                    </div>

                    {/* Premium Translucent Carousel Stage */}
                    <div className="relative border border-white/10 rounded-2xl p-6 sm:p-10 shadow-2xl backdrop-blur-lg min-h-[340px] flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#004B3B]/40 to-[#0B3D2E]/20">

                        {/* Navigational Control Elements */}
                        <div className="absolute inset-y-0 left-2 flex items-center z-30">
                            <button
                                onClick={() => setCarouselIndex((prev) => (prev - 1 + CAROUSEL_IMAGES.length) % CAROUSEL_IMAGES.length)}
                                className="w-10 h-10 rounded-full bg-[#0B3D2E]/80 border border-white/20 hover:border-[#50C878] text-white hover:text-[#50C878] flex items-center justify-center transition-all shadow-md transform active:scale-90"
                            >
                                <FiArrowLeft size={16} />
                            </button>
                        </div>
                        <div className="absolute inset-y-0 right-2 flex items-center z-30">
                            <button
                                onClick={() => setCarouselIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length)}
                                className="w-10 h-10 rounded-full bg-[#0B3D2E]/80 border border-white/20 hover:border-[#50C878] text-white hover:text-[#50C878] flex items-center justify-center transition-all shadow-md transform active:scale-90"
                            >
                                <FiArrowRight size={16} />
                            </button>
                        </div>

                        {/* Carousel Active Content Frame */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center w-full relative z-10">

                            {/* Left Column: Image Reader Node from Array */}
                            <div className="md:col-span-5 w-full flex justify-center">
                                <div className="relative w-44 h-56 rounded-xl overflow-hidden border border-[#50C878]/30 shadow-2xl bg-[#0B3D2E]/40">
                                    <img
                                        src={CAROUSEL_IMAGES[carouselIndex].imgPath} // <-- FIXED: Dynamically pulls from your array items now!
                                        alt={`${CAROUSEL_IMAGES[carouselIndex].size} Sizing Asset Package`}
                                        className="w-full h-full object-cover object-center transform scale-100"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B3D2E]/80 via-transparent to-transparent" />
                                </div>
                            </div>

                            {/* Right Column: Packaging Details Metadata */}
                            <div className="md:col-span-7 space-y-4 text-center md:text-left">
                                <div>
                                    <span className="inline-flex items-center text-[9px] font-mono uppercase tracking-widest text-[#50C878] bg-[#50C878]/10 border border-[#50C878]/20 px-2.5 py-0.5 rounded-sm mb-2">
                                        Official Dimensions
                                    </span>
                                    <h3 className="text-3xl sm:text-4xl font-serif text-white font-bold tracking-tight">
                                        {CAROUSEL_IMAGES[carouselIndex].size}
                                    </h3>
                                    <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-semibold mt-0.5">
                                        {CAROUSEL_IMAGES[carouselIndex].format}
                                    </p>
                                </div>

                                <p className="text-slate-200 font-sans font-light text-xs sm:text-sm leading-relaxed max-w-md">
                                    {CAROUSEL_IMAGES[carouselIndex].description}
                                </p>
                            </div>

                        </div>

                        {/* Slider Dots Tracker Strip */}
                        <div className="flex justify-center items-center gap-2 pt-6 mt-6 border-t border-white/5 relative z-10">
                            {CAROUSEL_IMAGES.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCarouselIndex(idx)}
                                    className={`h-1.5 transition-all rounded-full ${carouselIndex === idx ? 'bg-[#50C878] w-6' : 'bg-white/20 w-1.5'}`}
                                />
                            ))}
                        </div>

                    </div>

                    <div className="text-center text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                        Available Layout Line:250g &bull; 500g &bull; 1kg &bull; 5kg &bull; 10kg Packs
                    </div>

                </div>
            </section>

        </div>
    );
}