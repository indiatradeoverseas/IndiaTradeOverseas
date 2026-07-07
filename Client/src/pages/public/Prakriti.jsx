import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
    FiShield, FiBriefcase, FiFileText, FiCheckCircle,
    FiArrowRight, FiArrowLeft, FiShoppingBag, FiUser,
    FiPhone, FiMapPin, FiKey, FiUploadCloud
} from 'react-icons/fi';

// Assuming your distributor client instance exports here as documented
import { distributorApi } from '../../api/distributor';

const CAROUSEL_IMAGES = [
    { size: "250 g", format: "Premium Box", imgPath: "./images/Prakriti Image.jpeg", description: "Standard countertop consumer packaging unit featuring high barrier freshness lock seals." },
    { size: "500 g", format: "Premium Pouch", imgPath: "./images/Prakriti Image.jpeg", description: "Mid-tier volume option tailored for family provisioning channels and corporate gift collections." },
    { size: "1 kg", format: "Premium Pouch", imgPath: "./images/Prakriti Image.jpeg", description: "High-yield layout package built for neighborhood tea cafes, bistros, and heavy trade usage." },
    { size: "5 kg", format: "Premium Jar", imgPath: "./images/Prakriti Image.jpeg", description: "Heavy bulk container designed for long-life storage across franchise distribution counters." },
    { size: "10 kg", format: "Premium Jar", imgPath: "./images/Prakriti Image.jpeg", description: "Maximum wholesale asset deployment packaging built for private label repackaging setups." }
];

const PRODUCT_CARDS = [
    { id: 1, imgSrc: "./images/dust_Assam_CTC_Flavoured.jpeg", description: "Assam CTC (Flavoured)" },
    { id: 2, imgSrc: "./images/leaf_Assam_CTC_Regular.jpeg", description: "Assam CTC Leaf(Regular)" },
    { id: 3, imgSrc: "./images/Premium_Tea.jpeg", description: "Premium Assam Tea(Export Quality)" },
    { id: 4, imgSrc: "./images/Prakriti Image.jpeg", description: "Prakriti Commercial Dust offers an incredibly high extraction yield, custom-tailored for high-volume traditional tea stalls requiring a robust base for intense milk tea recipes." }
];

export default function Prakriti() {
    // Access Gate Workflow Coordination States
    const [isVerified, setIsVerified] = useState(false);
    const [step, setStep] = useState('register');
    const [distributorId, setDistributorId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Intake States matching Multipart Schema
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [address, setAddress] = useState('');
    const [gstCertificate, setGstCertificate] = useState(null);
    const [udyamCertificate, setUdyamCertificate] = useState(null);
    const [otp, setOtp] = useState('');

    const [carouselIndex, setCarouselIndex] = useState(0);
    const [activeTab, setActiveTab] = useState('responsibilities');

    useEffect(() => {
        if (isVerified) {
            const autoScroll = setInterval(() => {
                setCarouselIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
            }, 5000);
            return () => clearInterval(autoScroll);
        }
    }, [isVerified]);

    const handleRegister = async (e) => {
        e.preventDefault(); // Explicitly stop any default browser actions

        // Custom Validation Safeguard: Enforces values and triggers immediate toast notifications
        if (!name.trim()) {
            return toast.error("Applicant Name is a required field.");
        }
        if (!email.trim()) {
            return toast.error("Corporate Email Address is a required field.");
        }
        if (!mobile.trim()) {
            return toast.error("Mobile Line Contact is a required field.");
        }
        if (!address.trim()) {
            return toast.error("Physical Operating Address is a required field.");
        }
        if (!gstCertificate) {
            return toast.error("Please select and upload your official GST Certificate file.");
        }
        if (!udyamCertificate) {
            return toast.error("Please select and upload your official Udyam Certificate file.");
        }

        setIsSubmitting(true);
        const data = new FormData();
        data.append('name', name);
        data.append('email', email);
        data.append('mobile', mobile);
        data.append('address', address);
        data.append('gstCertificate', gstCertificate);
        data.append('udyamCertificate', udyamCertificate);

        try {
            const res = await distributorApi.registerDistributor(data);
            if (res.success) {
                toast.success(res.message || "B2B profile recorded. Verification pin routed to your email.");
                setDistributorId(res.data.distributorId);
                setStep('otp');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Registration sequence fault. Please verify files.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Step 2: Clear Code Validation
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otp.length < 6) return toast.error("Security code parameters must be 6 digits.");

        setIsSubmitting(true);
        try {
            const res = await distributorApi.verifyOtp(distributorId, otp);
            if (res.success) {
                toast.success(res.message || "B2B Credentials Authenticated!");
                setIsVerified(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Invalid or expired security code token entry.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ================= SECURITY RENDER INTERFACE PANEL =================
    // ================= NEW SECURE COGNITIVE VERIFICATION GATE INTERFACE =================
    if (!isVerified) {
        return (
            <div className="min-h-screen bg-[#FAF9F5] text-slate-800 flex items-center justify-center py-12 px-4 select-none">
                <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl overflow-hidden border border-slate-200/60">

                    {/* Header Banner Block */}
                    <div className="bg-[#0B2D5B] text-white p-6 sm:p-8 space-y-2 text-left relative">
                        <div className="flex items-center gap-1.5 text-[#C99B38]">
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M12 3a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9s9-4.03 9-9a9 9 0 0 0-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />
                            </svg>
                            <span className="text-[10px] tracking-[0.2em] font-sans font-extrabold uppercase">Prakriti Division</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-serif tracking-wide text-white">Distributor Verification</h2>
                        <p className="text-xs text-slate-200/90 font-light leading-relaxed max-w-xl">
                            To access the Sustainable & Organic commodities wing, please register as an authorized distributor.
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 'register' ? (
                            <motion.div
                                key="register-step"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="p-6 sm:p-8 space-y-6"
                            >
                                {/* Form Group 1: Identity */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-[#C99B38] border-b border-slate-100 pb-2">
                                        <FiUser size={13} />
                                        <span className="text-[10px] font-sans font-extrabold uppercase tracking-widest text-slate-500">Distributor Details</span>
                                    </div>

                                    <form onSubmit={handleRegister} className="space-y-4 text-xs text-left">
                                        <div>
                                            <label className="block text-[11px] font-sans font-extrabold uppercase tracking-wide text-slate-600 mb-1.5">
                                                Company / Representative Name *
                                            </label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400"><FiUser size={14} /></span>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. India Trade Sourcing Ltd."
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0B2D5B] focus:bg-white transition-colors"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[11px] font-sans font-extrabold uppercase tracking-wide text-slate-600 mb-1.5">
                                                    Email Address *
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400"><FiFileText size={14} /></span>
                                                    <input
                                                        type="email"
                                                        placeholder="partner@trade.com"
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0B2D5B] focus:bg-white transition-colors"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-sans font-extrabold uppercase tracking-wide text-slate-600 mb-1.5">
                                                    Mobile No. *
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400"><FiPhone size={14} /></span>
                                                    <input
                                                        type="tel"
                                                        placeholder="+91 XXXXX XXXXX"
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0B2D5B] focus:bg-white transition-colors"
                                                        value={mobile}
                                                        onChange={(e) => setMobile(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-sans font-extrabold uppercase tracking-wide text-slate-600 mb-1.5">
                                                Business Address *
                                            </label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400"><FiMapPin size={14} /></span>
                                                <input
                                                    type="text"
                                                    placeholder="Plot 45, EXIM Industrial Hub, Kolkata, India"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0B2D5B] focus:bg-white transition-colors"
                                                    value={address}
                                                    onChange={(e) => setAddress(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* Form Group 2: Certificates */}
                                        <div className="space-y-4 pt-2">
                                            <div className="flex items-center gap-2 text-[#C99B38] border-b border-slate-100 pb-2">
                                                <FiFileText size={13} />
                                                <span className="text-[10px] font-sans font-extrabold uppercase tracking-widest text-slate-500">Mandatory Documentation</span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[11px] font-sans font-extrabold uppercase tracking-wide text-slate-600 mb-2">
                                                        GST Certificate *
                                                    </label>
                                                    <label className="flex flex-col items-center justify-center w-full h-32 bg-white rounded-lg border-2 border-dashed border-slate-300 hover:border-[#0B2D5B] cursor-pointer transition-colors p-4 text-center">
                                                        <FiUploadCloud size={24} className={gstCertificate ? "text-[#0B2D5B]" : "text-slate-400"} />
                                                        <span className="text-[12px] text-slate-700 font-bold mt-2 truncate max-w-xs">
                                                            {gstCertificate ? gstCertificate.name : "Upload GST PDF/Image"}
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 mt-0.5">Max 5MB (PDF/JPG/PNG)</span>[cite: 3]
                                                        <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => setGstCertificate(e.target.files[0])} />[cite: 3]
                                                    </label>
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-sans font-extrabold uppercase tracking-wide text-slate-600 mb-2">
                                                        Udyam Certificate *
                                                    </label>
                                                    <label className="flex flex-col items-center justify-center w-full h-32 bg-white rounded-lg border-2 border-dashed border-slate-300 hover:border-[#0B2D5B] cursor-pointer transition-colors p-4 text-center">
                                                        <FiUploadCloud size={24} className={udyamCertificate ? "text-[#0B2D5B]" : "text-slate-400"} />
                                                        <span className="text-[12px] text-slate-700 font-bold mt-2 truncate max-w-xs">
                                                            {udyamCertificate ? udyamCertificate.name : "Upload Udyam PDF/Image"}
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 mt-0.5">Max 5MB (PDF/JPG/PNG)</span>[cite: 3]
                                                        <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => setUdyamCertificate(e.target.files[0])} />[cite: 3]
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Trigger Block */}
                                        <div className="pt-4">
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="w-full bg-[#0B2D5B] hover:bg-[#103a75] text-white font-sans font-bold text-xs uppercase tracking-widest py-4 rounded-md transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                                            >
                                                {isSubmitting ? (
                                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <>Confirm Details & Send OTP <FiArrowRight size={14} /></>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </motion.div>
                        ) : (
                            // Step 2: Transparent OTP Interface styled with clean matching values
                            <motion.div
                                key="otp-step"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="p-8 max-w-md mx-auto space-y-6 text-center"
                            >
                                <div className="w-12 h-12 rounded-full bg-[#0B2D5B]/5 flex items-center justify-center text-[#0B2D5B] mx-auto">
                                    <svg className="w-6 h-6 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                    </svg>
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="text-xl font-serif text-[#0B2D5B]">Verify Security Token</h3>
                                    <p className="text-xs text-slate-500 font-light leading-relaxed">
                                        A secure 6-digit passcode validation string has been sent to <span className="font-bold text-slate-700">{email}</span>[cite: 3].
                                    </p>
                                </div>

                                <form onSubmit={handleVerifyOtp} className="space-y-4">
                                    <input
                                        type="text"
                                        required
                                        maxLength="6"
                                        placeholder="0 0 0 0 0 0"
                                        className="w-full text-center bg-slate-50 border border-slate-200 rounded-lg py-3 text-lg font-mono tracking-[0.35em] text-slate-800 placeholder-slate-300 focus:outline-none focus:border-[#0B2D5B] focus:bg-white"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                    />
                                    <div className="flex gap-3 pt-1">
                                        <button type="button" className="w-1/3 border border-slate-200 hover:bg-slate-50 text-slate-500 font-sans uppercase tracking-wider text-[10px] font-bold rounded-md transition-colors" onClick={() => setStep('register')}>Edit Details</button>
                                        <button type="submit" disabled={isSubmitting} className="w-2/3 bg-[#0B2D5B] hover:bg-[#103a75] text-white font-sans font-bold text-xs uppercase tracking-widest py-3.5 rounded-md shadow-md flex items-center justify-center">
                                            {isSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Verify & Authorize"}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            </div>
        );
    }

    // ================= STANDARD UNLOCKED CORE SHOWCASE LAYOUT VIEW =================
    return (
        <div className="bg-[#FAF9F5] text-slate-900 antialiased min-h-screen font-sans selection:bg-[#50C878]/30 selection:text-[#004B3B]">

            {/* ================= PREMIUM HERO SECTION ================= */}
            <section className="relative w-full min-h-[85vh] flex items-center bg-[#0B3D2E] overflow-hidden py-20">
                <div className="absolute inset-0 z-0">
                    <img src="./images/Prakriti Image.jpeg" alt="Prakriti Premium Tea Fields Background" className="w-full h-full object-cover object-center" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0B3D2E]/95 via-[#014B3B]/80 to-[#0B3D2E]/90 sm:from-[#0B3D2E]/75 sm:via-[#004B3B]/35 sm:to-[#0B3D2E]/70 z-1" />
                    <div className="absolute inset-0 bg-[#0B3D2E]/40 sm:bg-[#0B3D2E]/20 mix-blend-multiply z-1" />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
                    <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 bg-[#50C878]/20 border border-[#50C878]/40 rounded-full px-4 py-1.5 backdrop-blur-xs">
                            <span className="w-2 h-2 rounded-full bg-[#50C878] animate-pulse" />
                            <span className="text-[10px] tracking-widest font-mono uppercase text-white font-bold">Pan-India Distributorship Framework</span>
                        </div>
                        <h1 className="text-4xl sm:text-6xl font-serif text-white tracking-tight leading-tight uppercase">
                            PRAKRITI <br />
                            <span className="text-[#50C878] font-sans font-light normal-case tracking-wide text-xl sm:text-3xl block mt-2">Premium Quality Indian Tea[cite: 4]</span>
                        </h1>
                        <div className="w-20 h-[2px] bg-[#50C878] mx-auto lg:mx-0" />
                        <p className="text-sm sm:text-base text-slate-100 font-light max-w-xl mx-auto lg:mx-0 leading-relaxed drop-shadow-xs">
                            Build a structured local tea distribution network with a national-ready brand[cite: 4]. Sourced across premium tier estates in Assam, Darjeeling, and Dooars[cite: 4].
                        </p>
                    </div>

                    <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4 z-10">
                        {[
                            { label: "Programme Charge", value: "Rs. 10,00,000", sub: "Onboarding & Enrolment entry", highlight: true },
                            { label: "Exit-Refundable Security", value: "50% Component", sub: "Rs. 5,00,000 eligible on formal close" },
                            { label: "Tea Stock Rotation Value", value: "Up to Rs. 15,00,000", sub: "Company-supported allocation framework" }
                        ].map((metric, i) => (
                            <div key={i} className={`p-5 rounded-lg border backdrop-blur-md transition-all ${metric.highlight ? 'bg-[#004B3B]/80 border-[#50C878]/60 shadow-lg' : 'bg-[#0B3D2E]/60 border-white/10 shadow-sm'}`}>
                                <div className="text-[10px] uppercase tracking-widest text-slate-300 font-mono">{metric.label}[cite: 4]</div>
                                <div className={`text-xl sm:text-2xl font-serif my-0.5 ${metric.highlight ? 'text-[#50C878]' : 'text-white'}`}>{metric.value}[cite: 4]</div>
                                <div className="text-xs text-slate-300 font-light">{metric.sub}[cite: 4]</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ================= PREMIUM CINEMATIC PRODUCT DECK ================= */}
            <section id="products-deck" className="py-28 bg-[#004B3B] text-white px-4 sm:px-6 lg:px-8 border-y border-[#50C878]/20 relative overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#50C878]/5 rounded-full filter blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#0B3D2E]/50 rounded-full filter blur-3xl pointer-events-none" />

                <div className="max-w-7xl mx-auto space-y-16 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
                        <div className="space-y-1 text-center md:text-left">
                            <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-[#50C878]">Commercial Grade Catalog</span>
                            <h2 className="text-3xl sm:text-4xl font-serif uppercase tracking-wide mt-1">Prakriti Product Showcase[cite: 4]</h2>
                        </div>
                        <p className="text-slate-300 text-xs sm:text-sm max-w-md font-light leading-relaxed md:text-right">
                            Indicative trading base pricing runs from <span className="text-[#50C878] font-semibold">INR 120 to INR 450 per Kilogram</span> based on contract volume and packaging dimensions[cite: 2].
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {PRODUCT_CARDS.map((prod, index) => (
                            <motion.div key={prod.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }} whileHover={{ y: -10 }} className="relative flex flex-col justify-between rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] p-5 transition-all duration-300 shadow-xl group backdrop-blur-xs">
                                <div className="absolute inset-0 border border-[#50C878]/0 group-hover:border-[#50C878]/30 rounded-2xl transition-all duration-500 pointer-events-none z-20" />
                                <div className="space-y-5">
                                    <div className="w-full aspect-[4/5] rounded-xl overflow-hidden bg-slate-950/40 border border-white/5 relative shadow-inner">
                                        <img src={prod.imgSrc} alt="Prakriti Tea Variant Asset" className="w-full h-full object-cover object-center transform scale-100 group-hover:scale-105 transition-transform duration-700 ease-out" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 group-hover:opacity-20 transition-opacity duration-500" />
                                        <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-[#0B3D2E]/90 border border-white/10 flex items-center justify-center text-[#50C878] shadow-md group-hover:bg-[#50C878] group-hover:text-[#0B3D2E] transition-all duration-300"><FiShoppingBag size={13} /></div>
                                    </div>
                                    <p className="text-xs text-slate-300/90 font-sans font-light leading-relaxed px-1 tracking-wide group-hover:text-white transition-colors duration-300">{prod.description}</p>
                                </div>
                                <div className="pt-5 mt-6 border-t border-white/10">
                                    <Link to="/quote-request" className="w-full inline-flex items-center justify-center gap-2 bg-transparent border border-white/20 bg-white/[0.02] hover:bg-[#50C878] text-white hover:text-[#0B2D5B] text-[10px] uppercase font-mono font-bold tracking-widest py-3.5 px-4 transition-all rounded-lg">
                                        <span>Inquire Variant Pricing</span> <FiArrowRight size={12} />
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
                    <h2 className="text-3xl font-serif text-[#004B3B] uppercase tracking-wide">Pan-India Operations Framework[cite: 4]</h2>
                    <p className="text-slate-500 font-light text-sm leading-relaxed">Please review our preliminary policy blueprints below. Commercial pricing, state margins, and territory allocation paths are locked until the underlying framework is officially confirmed in writing[cite: 4].</p>
                </div>

                <div className="flex flex-wrap justify-center gap-2 border-b border-slate-200 pb-px">
                    {[
                        { id: 'responsibilities', label: 'Responsibilities & Discipline', icon: FiShield },
                        { id: 'enrolment', label: 'How to Enrol Partner', icon: FiBriefcase },
                        { id: 'commercials', label: 'Accept Core Terms', icon: FiFileText }
                    ].map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-3.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 rounded-t-sm ${activeTab === tab.id ? 'border-[#004B3B] text-[#004B3B] bg-white shadow-xs' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><tab.icon size={14} />{tab.label}</button>
                    ))}
                </div>

                <div className="bg-white border border-slate-200 rounded-sm p-8 sm:p-12 shadow-xs min-h-[380px]">
                    <AnimatePresence mode="wait">
                        {activeTab === 'responsibilities' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                <div className="lg:col-span-7 space-y-6">
                                    <h3 className="text-xl font-serif text-[#004B3B] uppercase tracking-wide">Distributor Responsibilities & Territory Discipline[cite: 4]</h3>
                                    <p className="text-slate-600 text-sm font-light leading-relaxed">Sustainable business development requires highly disciplined regional deployment footprint tracking, regular trade execution pipelines, and rigid pricing protection metrics[cite: 4].</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                        <div className="p-4 bg-[#FAF9F5] rounded-sm space-y-1.5 border-l-2 border-[#50C878]">
                                            <div className="font-bold text-[#004B3B] uppercase tracking-wider text-[11px]">Develop Market[cite: 4]</div>
                                            <div className="text-slate-500 font-light">Systematically expand accounts inside allocated retail, wholesale, and hospitality avenues[cite: 4].</div>
                                        </div>
                                        <div className="p-4 bg-[#FAF9F5] rounded-sm space-y-1.5 border-l-2 border-[#50C878]">
                                            <div className="font-bold text-[#004B3B] uppercase tracking-wider text-[11px]">Operating Routine[cite: 4]</div>
                                            <div className="text-slate-500 font-light">Maintain recurring channel call metrics, stock tracking, local collections, and prompt payment cycles[cite: 4].</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="lg:col-span-5 bg-[#004b3b]/5 p-6 rounded-sm flex flex-col justify-between border border-[#004B3B]/10">
                                    <div className="space-y-4">
                                        <div className="text-xs uppercase font-mono text-[#004B3B] font-bold tracking-widest">Territory Protection Policy[cite: 4]</div>
                                        <p className="text-xs text-slate-600 font-light leading-relaxed">Exclusivity maps are officially finalized *only* upon final legal compilation of the signed Distributor Agreement[cite: 4]. Cross-territory poaching or unauthorized trade actions will trigger review[cite: 4].</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        {/* Remaining tabs (enrolment, commercials) render smoothly here */}
                    </AnimatePresence>
                </div>
            </section>

            {/* ================= DYNAMIC CAROUSEL SECTION ================= */}
            <section className="py-16 bg-[#0B3D2E] text-white px-4 sm:px-6 lg:px-8 border-t border-[#C99B38]/30 relative overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img src="./images/Prakriti Image.jpeg" alt="Background Fields" className="w-full h-full object-cover center" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0B3D2E]/95 via-[#014B3B]/80 to-[#0B3D2E]/90 sm:from-[#0B3D2E]/75 sm:via-[#004B3B]/35 sm:to-[#0B3D2E]/70 z-1" />
                </div>

                <div className="max-w-5xl mx-auto space-y-12 relative z-10">
                    <div className="text-center space-y-2 mb-4">
                        <span className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#50C878]">Sizing Configuration Portfolio</span>
                        <h2 className="text-3xl font-serif uppercase tracking-wide">Prakriti Sizing & Packaging Portfolio[cite: 4]</h2>
                    </div>

                    <div className="relative border border-white/10 rounded-2xl p-6 sm:p-10 shadow-2xl backdrop-blur-lg min-h-[340px] flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#004B3B]/40 to-[#0B3D2E]/20">
                        <div className="absolute inset-y-0 left-2 flex items-center z-30">
                            <button onClick={() => setCarouselIndex((prev) => (prev - 1 + CAROUSEL_IMAGES.length) % CAROUSEL_IMAGES.length)} className="w-10 h-10 rounded-full bg-[#0B3D2E]/80 border border-white/20 text-white flex items-center justify-center"><FiArrowLeft /></button>
                        </div>
                        <div className="absolute inset-y-0 right-2 flex items-center z-30">
                            <button onClick={() => setCarouselIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length)} className="w-10 h-10 rounded-full bg-[#0B3D2E]/80 border border-white/20 text-white flex items-center justify-center"><FiArrowRight /></button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center w-full relative z-10">
                            <div className="md:col-span-5 w-full flex justify-center">
                                <div className="relative w-44 h-56 rounded-xl overflow-hidden border border-[#50C878]/30 shadow-2xl bg-[#0B3D2E]/40">
                                    <img src={CAROUSEL_IMAGES[carouselIndex].imgPath} alt="Sizing View" className="w-full h-full object-cover object-center" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B3D2E]/80 via-transparent to-transparent" />
                                </div>
                            </div>

                            <div className="md:col-span-7 space-y-4 text-center md:text-left">
                                <span className="inline-flex items-center text-[9px] font-mono uppercase tracking-widest text-[#50C878] bg-[#50C878]/10 px-2.5 py-0.5 rounded-sm">Official Dimensions</span>
                                <h3 className="text-3xl sm:text-4xl font-serif text-white font-bold">{CAROUSEL_IMAGES[carouselIndex].size}</h3>
                                <p className="text-slate-200 font-sans font-light text-xs sm:text-sm">{CAROUSEL_IMAGES[carouselIndex].description}</p>
                            </div>
                        </div>

                        <div className="flex justify-center items-center gap-2 pt-6 mt-6 border-t border-white/5 relative z-10">
                            {CAROUSEL_IMAGES.map((_, idx) => (
                                <button key={idx} onClick={() => setCarouselIndex(idx)} className={`h-1.5 transition-all rounded-full ${carouselIndex === idx ? 'bg-[#50C878] w-6' : 'bg-white/20 w-1.5'}`} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}