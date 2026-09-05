import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCheck,
  FiArrowRight,
  FiTarget,
  FiLayout,
  FiShield,
  FiCpu,
  FiCompass,
  FiTrendingUp,
  FiChevronDown,
  FiChevronUp,
  FiMail,
  FiPhone,
  FiClock,
  FiX,
  FiMessageSquare,
  FiCreditCard,
  FiLoader
} from 'react-icons/fi';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import SmokeyCursor from '../../components/lightswind/smokey-cursor';
import { loadRazorpayScript } from '../../utils/razorpay';
import { paymentsApi } from '../../api/payments';
import { toast } from 'sonner';

// ============================================================================
// APPROVED DESIGN TOKENS (PAGE 4)
// ============================================================================
const TOKENS = {
  bgPrimary: '#0A1526',
  bgDeep: '#07111F',
  surfaceCard: '#0D1C30',
  surfaceRaised: '#1D334D',
  blueSlate: '#2F4966',
  blueSteel: '#597598',
  brandOrange: '#F2580E',
  brandOrangeHi: '#FF7A18',
  accentSand: '#F3D0AB',
  textPrimary: '#F7F6F6',
  textBody: '#C3C5CA',
  textMuted: '#A1A1A7'
};

// ============================================================================
// 3D TILT CARD COMPONENT (PERFORMANCE SAFE)
// ============================================================================
function Card3D({ children, className = '', isPopular = false }) {
  const cardRef = useRef(null);
  const [rotX, setRotX] = useState(0);
  const [rotY, setRotY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current || window.innerWidth < 768) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotX((-y / (rect.height / 2)) * 6);
    setRotY((x / (rect.width / 2)) * 6);
  };

  const handleMouseLeave = () => {
    setRotX(0);
    setRotY(0);
    setIsHovered(false);
  };

  return (
    <div
      style={{ perspective: 1000 }}
      className="h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={cardRef}
        style={{
          transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) ${isHovered ? 'scale3d(1.015, 1.015, 1.015)' : 'scale3d(1, 1, 1)'}`,
          transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.4s ease-out, border-color 0.2s',
          backgroundColor: TOKENS.surfaceCard,
          borderColor: isPopular ? TOKENS.brandOrange : isHovered ? 'rgba(242, 88, 14, 0.45)' : 'rgba(242, 88, 14, 0.22)'
        }}
        className={`relative h-full rounded-[22px] border p-6 md:p-8 flex flex-col justify-between shadow-xl ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN ITO ADS COMPONENT
// ============================================================================
export default function ITOAds() {
  useDocumentMeta({
    title: 'ITO Ads | B2B Sourcing, Lead Generation & Conversion Campaigns',
    description: 'We generate qualified leads. You convert opportunities. Performance marketing, CRM routing, and B2B inbound acquisition across India.',
    canonicalPath: '/ito-ads'
  });

  const [selectedPlan, setSelectedPlan] = useState('Professional');
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  // Payment State
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    industry: '',
    objective: '',
    plan: 'Professional',
    consent: true
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleSelectPackage = useCallback((packageName) => {
    const pkg = packages.find(p => p.name === packageName);
    if (!pkg) return;
    
    setSelectedPlan(packageName);
    setFormData((prev) => ({ ...prev, plan: packageName }));
    setPaymentPlan(pkg);
    // Start payment flow instead of directly opening modal
    initiatePayment(pkg);
  }, []);

  const initiatePayment = async (pkg) => {
    setIsProcessingPayment(true);
    try {
      // Prepare customer details from form if available
      const customerDetails = {
        name: formData.name || '',
        email: formData.email || '',
        phone: formData.phone || ''
      };

      // Extract numeric amount from price string (e.g., "₹5,000" -> 5000)
      const amount = parseInt(pkg.price.replace(/[₹,]/g, ''), 10);
      
      if (isNaN(amount)) {
        throw new Error('Invalid package price');
      }

      // Create Razorpay order
      const orderResult = await paymentsApi.createItoAdsRazorpayOrder({
        packageName: pkg.name,
        amount,
        customerDetails
      });

      if (!orderResult?.data?.orderId) {
        throw new Error('Failed to create payment order');
      }

      // Load Razorpay script and open checkout
      await loadRazorpayScript();
      
      const options = {
        key: orderResult.data.keyId,
        amount: orderResult.data.amount,
        currency: 'INR',
        name: 'ITO Ads',
        description: `${pkg.name} Package - ${pkg.leads}`,
        order_id: orderResult.data.orderId,
        handler: async (response) => {
          // Verify payment on success
          await verifyPayment(response, pkg, amount, customerDetails);
        },
        prefill: {
          name: customerDetails.name,
          email: customerDetails.email,
          contact: customerDetails.phone
        },
        notes: {
          packageName: pkg.name,
          leads: pkg.leads
        },
        theme: {
          color: '#F2580E'
        },
        modal: {
          ondismiss: () => {
            setIsProcessingPayment(false);
            setPaymentPlan(null);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        console.error('Payment failed:', response.error);
        toast.error('Payment failed: ' + (response.error?.description || 'Please try again'));
        setIsProcessingPayment(false);
        setPaymentPlan(null);
      });
      rzp.open();

    } catch (error) {
      console.error('Payment initiation error:', error);
      toast.error('Failed to initiate payment. Please try again.');
      setIsProcessingPayment(false);
      setPaymentPlan(null);
    }
  };

  const verifyPayment = async (razorpayResponse, pkg, amount, customerDetails) => {
    try {
      const verifyResult = await paymentsApi.verifyItoAdsRazorpayPayment({
        razorpay_order_id: razorpayResponse.razorpay_order_id,
        razorpay_payment_id: razorpayResponse.razorpay_payment_id,
        razorpay_signature: razorpayResponse.razorpay_signature,
        packageName: pkg.name,
        amount,
        customerDetails
      });

      if (verifyResult?.success) {
        toast.success(`Payment successful! ${pkg.name} package activated.`);
        setIsProcessingPayment(false);
        setPaymentPlan(null);
        // Open consultation modal after successful payment
        setIsConsultModalOpen(true);
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      toast.error('Payment verification failed. Please contact support.');
      setIsProcessingPayment(false);
      setPaymentPlan(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setFormSubmitted(true);
    setTimeout(() => {
      setIsConsultModalOpen(false);
      setFormSubmitted(false);
    }, 2200);
  };

  // Six Pillars Data
  const pillars = [
    {
      icon: FiTarget,
      title: 'Paid Inbound Lead Generation',
      desc: 'High-intent acquisition campaigns executed across Google Search, LinkedIn B2B networks, and programmatic channels to reach active decision-makers.',
      bullets: ['Multi-network campaign setup', 'High commercial intent filtering', 'Real-time CPC & bid tuning']
    },
    {
      icon: FiLayout,
      title: 'Landing Page & Conversion',
      desc: 'Lightning-fast, mobile-optimized acquisition pages built strictly for conversion with clear narrative architecture and structured proof.',
      bullets: ['Sub-second page speeds', 'Friction-free responsive forms', 'Granular conversion heatmaps']
    },
    {
      icon: FiShield,
      title: 'Lead Validation & Scoring',
      desc: 'Multistage phone, email, and business verification to eradicate duplicates, spam, and non-commercial enquiries prior to handover.',
      bullets: ['Contact data verification', 'BANT qualification criteria', 'Automatic deduplication engine']
    },
    {
      icon: FiCpu,
      title: 'CRM Automation & Integration',
      desc: 'Direct pipeline routing straight into your internal CRM, accompanied by instant WhatsApp and email notifications for prompt sales follow-up.',
      bullets: ['Sub-60s webhook dispatch', 'Round-robin agent routing', 'Sales SLA escalations']
    },
    {
      icon: FiCompass,
      title: 'Pan-India Targeting',
      desc: 'Precision geographic targeting matching your specific industrial corridors, commercial states, or regional supply hubs across the nation.',
      bullets: ['Industrial zone geo-fencing', 'Tier-1 & Tier-2 trade clusters', 'Localized campaign messaging']
    },
    {
      icon: FiTrendingUp,
      title: 'Reporting & Optimization',
      desc: 'Completely transparent metrics with zero vanity numbers. Live reporting on Cost Per Qualified Lead (CPQL) and weekly commercial performance.',
      bullets: ['Weekly video audits', 'Transparent spend ledgers', 'Continuous CAC optimization']
    }
  ];

  // Pipeline Stages
  const stages = [
    { num: '01', title: 'Raw Lead', desc: 'Inbound prospect fills verified form from target campaign.' },
    { num: '02', title: 'Valid Lead', desc: 'Phone, corporate email, and legal business existence verified.' },
    { num: '03', title: 'Validated Lead', desc: 'Commercial requirements, timeline, and purchase budget validated.' },
    { num: '04', title: 'Qualified Lead', desc: 'Matches agreed campaign criteria and pushed directly to CRM.' }
  ];

  // Packages Data
  const packages = [
    {
      name: 'Starter',
      price: '₹5,000',
      period: '/mo',
      leads: '50 Qualified Leads',
      rate: '₹100 / lead',
      subtitle: 'Best for initial campaign validation and niche trade tests.',
      features: ['Single campaign channel', 'Dedicated landing page', 'Standard lead verification', 'Email lead dispatch', 'Monthly performance summary']
    },
    {
      name: 'Growth',
      price: '₹10,000',
      period: '/mo',
      leads: '125 Qualified Leads',
      rate: '₹80 / lead',
      subtitle: 'Designed for scaling operations demanding predictable flow.',
      features: ['Dual-channel targeting', 'A/B landing page variants', 'BANT lead scoring', 'Instant WhatsApp notifications', 'Bi-weekly optimization reviews']
    },
    {
      name: 'Professional',
      price: '₹15,000',
      period: '/mo',
      leads: '200 Qualified Leads',
      rate: '₹75 / lead',
      popular: true,
      subtitle: 'The primary choice for ambitious multi-channel market expansion.',
      features: ['Full omni-channel acquisition', 'Custom conversion funnel', 'Full CRM webhook integration', 'Sub-15m team response SLA', 'Weekly performance dashboard']
    },
    {
      name: 'Scale',
      price: '₹20,000',
      period: '/mo',
      leads: '300 Qualified Leads',
      rate: '≈ ₹66.67 / lead',
      subtitle: 'High-volume lead engine built for nationwide dominance.',
      features: ['Custom target geography', 'Dedicated campaign manager', 'Priority lead validation', 'Live API pipeline sync', 'Executive monthly strategy call']
    }
  ];

  // FAQs
  const faqs = [
    {
      q: 'Are platform ad spends included in package prices?',
      a: 'Package fees cover our comprehensive strategy, conversion funnel development, CRM automation, and lead qualification workflows. Media spend budgets are allocated directly on client accounts or billed as actual pass-through costs.'
    },
    {
      q: 'How does your lead qualification guarantee work?',
      a: 'Every prospect must satisfy clear contact validity, business ownership, and expressed commercial requirements. Any non-responsive, wrong-number, or duplicate lead reported within 7 days is credited and replaced under our qualification policy.'
    },
    {
      q: 'How fast are qualified leads dispatched to our sales team?',
      a: 'Instantly. Once a prospect completes the qualifying form, our pipeline scores the lead and pushes the complete payload to your CRM or assigned sales representative within 60 seconds.'
    }
  ];

  return (
    <div
      style={{ backgroundColor: TOKENS.bgPrimary, color: TOKENS.textBody }}
      className="min-h-screen font-sans selection:bg-[#F2580E]/30 selection:text-white relative overflow-x-hidden"
    >
      {/* 1. SMOKY CURSOR OVERLAY */}
      <SmokeyCursor />

      {/* 2. PERSISTENT BACKGROUND FLOWER MOTIF (REQUIREMENT 1) */}
      <div
        className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden opacity-55"
        aria-hidden="true"
      >
        <img
          src="/images/ito_images/ito_17.jpeg"
          alt=""
          className="w-[900px] max-w-none md:w-[1350px] object-contain select-none transform scale-110 filter blur-[0.4px]"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at center, transparent 20%, ${TOKENS.bgPrimary} 80%)`
          }}
        />
      </div>

      {/* ====================================================================
          FIXED HEADER (PAGE 6)
      ==================================================================== */}
      <header
        style={{
          backgroundColor: `${TOKENS.bgPrimary}EB`,
          borderBottom: '1px solid rgba(242, 88, 14, 0.15)'
        }}
        className="fixed top-0 left-0 w-full h-[68px] md:h-[76px] z-50 backdrop-blur-md px-6 lg:px-16 flex items-center justify-between"
      >
        <a href="#hero" className="flex items-center gap-3 group">
          <img
            src="/images/web_trans_icon.jpeg"
            alt="ITO Ads Logo"
            className="w-9 h-9 rounded-lg object-cover border border-[#F2580E]/30 shadow-md group-hover:scale-105 transition-transform"
          />
          <div className="flex flex-col">
            <span style={{ color: TOKENS.textPrimary }} className="font-serif font-bold text-lg tracking-wide">
              ITO <span style={{ color: TOKENS.brandOrange }}>ADS</span>
            </span>
            <span style={{ color: TOKENS.textMuted }} className="text-[9px] uppercase tracking-widest -mt-1 hidden sm:block">
              Powered by ITC
            </span>
          </div>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          {['Services', 'Process', 'Packages', 'FAQ'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              style={{ color: TOKENS.textBody }}
              className="hover:text-white transition-colors"
            >
              {item}
            </a>
          ))}
        </nav>

        {/* Primary Header CTA */}
        {/* Primary Header CTA */}
        <button
          type="button"
          onClick={() => handleSelectPackage('Professional')}
          disabled={isProcessingPayment && paymentPlan?.name === 'Professional'}
          style={{ backgroundColor: TOKENS.brandOrange, opacity: isProcessingPayment && paymentPlan?.name === 'Professional' ? 0.7 : 1 }}
          className="h-9 md:h-10 px-3.5 md:px-5 rounded-[8px] text-white text-xs md:text-sm font-semibold tracking-tight md:tracking-wide whitespace-nowrap hover:brightness-110 transition-all shadow-md active:scale-95 flex items-center justify-center shrink-0 disabled:cursor-not-allowed"
        >
          {isProcessingPayment && paymentPlan?.name === 'Professional' ? (
            <FiLoader className="animate-spin" size={14} />
          ) : (
            <>
              <span className="sm:hidden">Consult</span>
              <span className="hidden sm:inline">Book Consultation</span>
            </>
          )}
        </button>
      </header>

      {/* ====================================================================
          HERO SECTION (PAGE 6)
      ==================================================================== */}
      <section
        id="hero"
        className="relative z-10 pt-36 md:pt-44 pb-20 md:pb-28 px-6 lg:px-16 max-w-[1440px] mx-auto min-h-[90vh] flex flex-col justify-center text-center items-center"
      >
        {/* Eyebrow */}
        <div
          style={{
            backgroundColor: `${TOKENS.surfaceRaised}80`,
            borderColor: 'rgba(242, 88, 14, 0.35)',
            color: TOKENS.accentSand
          }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs  font-mono uppercase tracking-widest  mb-6"
        >
          <span className="w-2 h-2 rounded-full bg-[#F2580E] animate-pulse " />
          Powered by ITC — India Trade Center
        </div>

        {/* Headline Hierarchy: We Generate (medium) QUALIFIED LEADS (primary) You Convert (secondary) */}
        <h1
          style={{ color: TOKENS.textPrimary }}
          className="font-serif text-3xl sm:text-5xl lg:text-[64px] font-normal leading-[1.12] uppercase tracking-tight max-w-5xl"
        >
          <span className="text-xl sm:text-3xl block text-[#C3C5CA] font-sans font-light tracking-wide mb-2 normal-case">
            We Generate
          </span>
          <span style={{ color: TOKENS.brandOrange }} className="font-bold tracking-tight">
            Qualified Leads.
          </span>
          <br />
          <span className="text-2xl sm:text-4xl text-[#F7F6F6] font-light">
            You Convert Opportunities.
          </span>
        </h1>

        {/* Support Copy */}
        <p
          style={{ color: TOKENS.textBody }}
          className="mt-6 text-base md:text-lg max-w-2xl font-light leading-relaxed"
        >
          Targeted B2B acquisition campaigns connecting business suppliers with verified domestic and global commercial buyers.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <a
            href="#packages"
            style={{ backgroundColor: TOKENS.brandOrange }}
            className="w-full sm:w-auto px-8 h-12 rounded-[10px] text-white text-sm font-semibold tracking-wide flex items-center justify-center gap-2 hover:brightness-110 shadow-lg transition-all"
          >
            View Packages <FiArrowRight />
          </a>
          <button
            type="button"
            onClick={() => handleSelectPackage('Professional')}
            disabled={isProcessingPayment && paymentPlan?.name === 'Professional'}
            style={{
              backgroundColor: TOKENS.surfaceRaised,
              borderColor: 'rgba(242, 88, 14, 0.3)',
              color: TOKENS.textPrimary,
              opacity: isProcessingPayment && paymentPlan?.name === 'Professional' ? 0.7 : 1
            }}
            className="w-full sm:w-auto px-8 h-12 rounded-[10px] border text-sm font-semibold tracking-wide hover:border-[#F2580E] hover:text-white transition-all flex items-center justify-center disabled:cursor-not-allowed"
          >
            {isProcessingPayment && paymentPlan?.name === 'Professional' ? (
              <>
                <FiLoader className="animate-spin" size={14} />
                Processing...
              </>
            ) : (
              'Book Consultation'
            )}
          </button>
        </div>

        {/* Trust Row */}
        <div className="mt-14 pt-8 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs md:text-sm font-medium tracking-wide">
          <div className="flex items-center justify-center gap-2 text-[#F7F6F6]">
            <FiCheck className="text-[#F2580E]" /> Transparent Weekly Spend
          </div>
          <div className="flex items-center justify-center gap-2 text-[#F7F6F6]">
            <FiCheck className="text-[#F2580E]" /> 60s CRM-Ready Delivery
          </div>
          <div className="flex items-center justify-center gap-2 text-[#F7F6F6]">
            <FiCheck className="text-[#F2580E]" /> 100% Commercial B2B Focus
          </div>
        </div>
      </section>

      {/* ====================================================================
          SIX PILLARS (PAGE 7)
      ==================================================================== */}
      <section id="services" className="relative z-10 py-20 px-6 lg:px-16 max-w-[1440px] mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span style={{ color: TOKENS.brandOrange }} className="text-xs uppercase tracking-widest font-mono font-bold">
            Services
          </span>
          <h2 style={{ color: TOKENS.textPrimary }} className="text-3xl md:text-4xl font-serif mt-2 uppercase tracking-wide">
            Six Pillars of Acquisition
          </h2>
          <p className="mt-3 text-sm font-light">
            Every component designed strictly to maximize verified commercial pipeline conversions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pillars.map((p, idx) => {
            const Icon = p.icon;
            return (
              <Card3D key={idx}>
                <div>
                  <div
                    style={{ backgroundColor: 'rgba(242, 88, 14, 0.12)', color: TOKENS.brandOrange }}
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-2xl"
                  >
                    <Icon />
                  </div>
                  <h3 style={{ color: TOKENS.textPrimary }} className="text-xl font-serif font-semibold mb-3">
                    {p.title}
                  </h3>
                  <p className="text-xs md:text-sm leading-relaxed mb-6 font-light">
                    {p.desc}
                  </p>
                </div>
                <ul className="space-y-2 border-t border-white/5 pt-4 text-xs">
                  {p.bullets.map((b, i) => (
                    <li key={i} className="flex items-center gap-2 text-[#C3C5CA]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F2580E]" /> {b}
                    </li>
                  ))}
                </ul>
              </Card3D>
            );
          })}
        </div>
      </section>

      {/* ====================================================================
          LEAD QUALIFICATION PROCESS (PAGE 8)
      ==================================================================== */}
      <section
        id="process"
        style={{ backgroundColor: TOKENS.bgDeep }}
        className="relative z-10 py-20 px-6 lg:px-16 border-y border-white/5"
      >
        <div className="max-w-[1440px] mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span style={{ color: TOKENS.brandOrange }} className="text-xs uppercase tracking-widest font-mono font-bold">
              Auditable Pipeline
            </span>
            <h2 style={{ color: TOKENS.textPrimary }} className="text-3xl md:text-4xl font-serif mt-2 uppercase tracking-wide">
              The Qualification Process
            </h2>
            <p className="mt-3 text-sm font-light">
              From raw digital enquiry to sales-ready enterprise prospect.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {stages.map((s, idx) => (
              <div
                key={idx}
                style={{ backgroundColor: TOKENS.surfaceCard }}
                className="p-6 rounded-[18px] border border-white/10 relative flex flex-col justify-between"
              >
                <div>
                  <span
                    style={{ color: TOKENS.brandOrange }}
                    className="font-mono text-2xl font-bold block mb-3"
                  >
                    {s.num}
                  </span>
                  <h4 style={{ color: TOKENS.textPrimary }} className="text-lg font-serif font-medium mb-2">
                    {s.title}
                  </h4>
                  <p className="text-xs font-light leading-relaxed">
                    {s.desc}
                  </p>
                </div>
                {idx < 3 && (
                  <div className="hidden md:block absolute -right-3 top-1/2 transform -translate-y-1/2 z-20 text-[#F2580E]">
                    <FiArrowRight size={18} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Qualification Policy Accordion (Page 8 Mandate) */}
          <div className="mt-12 max-w-3xl mx-auto border border-white/10 rounded-[14px] overflow-hidden">
            <button
              type="button"
              onClick={() => setIsPolicyOpen(!isPolicyOpen)}
              className="w-full p-4 flex items-center justify-between text-left text-sm font-medium hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-2 text-white">
                <FiShield className="text-[#F2580E]" /> Commercial Lead Replacement & SLA Policy
              </span>
              {isPolicyOpen ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            {isPolicyOpen && (
              <div className="p-5 text-xs font-light border-t border-white/10 space-y-3 leading-relaxed bg-[#0A1526]">
                <p><strong>Replacement Guarantee:</strong> Any lead found to have a disconnected telephone line, non-matching business identity, or duplicate profile reported within 7 business days is automatically credited and replaced free of charge.</p>
                <p><strong>Delivery SLA:</strong> 100% of validated leads are transmitted via webhook/CRM integration in &lt; 60 seconds with full UTM attribution parameters attached.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ====================================================================
          PACKAGES & COMMERCIAL CONVERSION (PAGE 9)
      ==================================================================== */}
      <section id="packages" className="relative z-10 py-24 px-6 lg:px-16 max-w-[1440px] mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span style={{ color: TOKENS.brandOrange }} className="text-xs uppercase tracking-widest font-mono font-bold">
            Transparent Pricing
          </span>
          <h2 style={{ color: TOKENS.textPrimary }} className="text-3xl md:text-4xl font-serif mt-2 uppercase tracking-wide">
            Acquisition Packages
          </h2>
          <p className="mt-2 text-xs text-[#A1A1A7]">
            Note: Platform media spend and applicable GST are excluded and billed directly at transparent cost.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {packages.map((pkg, idx) => (
            <Card3D key={idx} isPopular={pkg.popular}>
              <div>
                {pkg.popular && (
                  <div
                    style={{ backgroundColor: TOKENS.brandOrange, color: '#FFFFFF' }}
                    className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider shadow-md"
                  >
                    Most Popular
                  </div>
                )}
                <h4 style={{ color: TOKENS.textPrimary }} className="text-xl font-serif font-bold mb-1">
                  {pkg.name}
                </h4>
                <p className="text-xs text-[#A1A1A7] mb-4 min-h-[32px]">
                  {pkg.subtitle}
                </p>

                <div className="mb-4">
                  <span style={{ color: TOKENS.textPrimary }} className="text-3xl font-bold font-mono">
                    {pkg.price}
                  </span>
                  <span className="text-xs text-[#A1A1A7]">{pkg.period}</span>
                  <div style={{ color: TOKENS.brandOrange }} className="text-xs font-mono font-semibold mt-1">
                    {pkg.leads} ({pkg.rate})
                  </div>
                </div>

                <ul className="space-y-2.5 text-xs text-[#C3C5CA] border-t border-white/10 pt-4 mb-6">
                  {pkg.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <FiCheck className="text-[#F2580E] shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleSelectPackage(pkg.name)}
                disabled={isProcessingPayment && paymentPlan?.name === pkg.name}
                style={{
                  backgroundColor: pkg.popular ? TOKENS.brandOrange : 'transparent',
                  borderColor: pkg.popular ? TOKENS.brandOrange : 'rgba(242, 88, 14, 0.4)',
                  color: '#FFFFFF',
                  opacity: isProcessingPayment && paymentPlan?.name === pkg.name ? 0.7 : 1
                }}
                className="w-full py-2.5 rounded-[8px] border text-xs font-semibold uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-1 disabled:cursor-not-allowed"
              >
                {isProcessingPayment && paymentPlan?.name === pkg.name ? (
                  <>
                    <FiLoader className="animate-spin" size={14} />
                    Processing...
                  </>
                ) : (
                  <>
                    Select {pkg.name} <FiArrowRight />
                  </>
                )}
              </button>
            </Card3D>
          ))}
        </div>
      </section>

      {/* ====================================================================
          FAQ SECTION
      ==================================================================== */}
      <section id="faq" className="relative z-10 py-16 px-6 lg:px-16 max-w-4xl mx-auto border-t border-white/5">
        <h2 style={{ color: TOKENS.textPrimary }} className="text-2xl md:text-3xl font-serif text-center mb-8 uppercase">
          Frequently Answered
        </h2>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div
              key={i}
              style={{ backgroundColor: TOKENS.surfaceCard }}
              className="border border-white/10 rounded-[12px] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full p-4 text-left text-sm font-medium flex justify-between items-center text-[#F7F6F6]"
              >
                <span>{f.q}</span>
                {openFaq === i ? <FiChevronUp /> : <FiChevronDown />}
              </button>
              {openFaq === i && (
                <div className="p-4 pt-0 text-xs text-[#C3C5CA] font-light leading-relaxed border-t border-white/5">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ====================================================================
          FOOTER (PAGE 14 - VERIFIED DETAILS)
      ==================================================================== */}
      <footer
        style={{ backgroundColor: TOKENS.bgDeep }}
        className="relative z-10 py-12 px-6 lg:px-16 border-t border-white/10 text-xs text-[#A1A1A7]"
      >
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/images/web_trans_icon.jpeg" alt="Logo" className="w-6 h-6 rounded" />
              <span className="font-bold text-sm text-[#F7F6F6]">ITO ADS</span>
            </div>
            <p className="font-light leading-relaxed">
              Premium B2B Lead Generation and Pipeline Acceleration across Indian Trade Corridors.
            </p>
          </div>

          <div>
            <h5 className="font-semibold text-[#F7F6F6] mb-3 uppercase tracking-wider">Contact</h5>
            <p className="flex items-center gap-2 mb-1.5"><FiMail /> info@indiatradeoverseas.com</p>
            <p className="flex items-center gap-2 mb-1.5"><FiPhone /> 01169262028</p>
            <p className="flex items-center gap-2"><FiClock /> Mon - Sat: 9:30 AM - 6:30 PM</p>
          </div>

          <div>
            <h5 className="font-semibold text-[#F7F6F6] mb-3 uppercase tracking-wider">Corridors</h5>
            <p className="font-light leading-relaxed">
              New Delhi • Noida • Siliguri • Kishanganj • Jaigaon
            </p>
          </div>

          <div>
            <h5 className="font-semibold text-[#F7F6F6] mb-3 uppercase tracking-wider">Governance</h5>
            <p className="font-light leading-relaxed mb-2">
              India Trade Overseas. All commercial representations subject to signed service contracts.
            </p>
            <p>© {new Date().getFullYear()} ITO Ads. All Rights Reserved.</p>
          </div>
        </div>
      </footer>

      {/* ====================================================================
          CONSULTATION & ENQUIRY MODAL (PAGE 10)
      ==================================================================== */}
      <AnimatePresence>
        {isConsultModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              style={{ backgroundColor: TOKENS.surfaceCard, borderColor: 'rgba(242, 88, 14, 0.3)' }}
              className="relative w-full max-w-lg rounded-[20px] border p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <button
                type="button"
                onClick={() => setIsConsultModalOpen(false)}
                className="absolute top-5 right-5 text-gray-400 hover:text-white"
              >
                <FiX size={20} />
              </button>

              <h3 style={{ color: TOKENS.textPrimary }} className="text-2xl font-serif font-bold mb-1">
                Book Campaign Consultation
              </h3>
              <p className="text-xs text-[#A1A1A7] mb-6">
                Selected Plan: <span style={{ color: TOKENS.brandOrange }} className="font-semibold">{selectedPlan}</span>
              </p>

              {formSubmitted ? (
                <div className="py-12 text-center text-[#F7F6F6]">
                  <FiCheck className="text-4xl text-[#F2580E] mx-auto mb-3" />
                  <h4 className="text-lg font-bold">Enquiry Received</h4>
                  <p className="text-xs text-[#A1A1A7] mt-1">Our commercial specialist will review and respond within 15 minutes.</p>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-[#C3C5CA] mb-1">Full Name</label>
                    <input
                      required
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full bg-[#07111F] border border-white/10 rounded-[6px] p-2.5 text-white focus:outline-none focus:border-[#F2580E]"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#C3C5CA] mb-1">Work Email</label>
                      <input
                        required
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full bg-[#07111F] border border-white/10 rounded-[6px] p-2.5 text-white focus:outline-none focus:border-[#F2580E]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#C3C5CA] mb-1">Phone Number</label>
                      <input
                        required
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full bg-[#07111F] border border-white/10 rounded-[6px] p-2.5 text-white focus:outline-none focus:border-[#F2580E]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#C3C5CA] mb-1">Company Name</label>
                      <input
                        required
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="w-full bg-[#07111F] border border-white/10 rounded-[6px] p-2.5 text-white focus:outline-none focus:border-[#F2580E]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#C3C5CA] mb-1">Target Industry</label>
                      <input
                        type="text"
                        name="industry"
                        placeholder="e.g. Coal, Rice, Stone"
                        value={formData.industry}
                        onChange={handleInputChange}
                        className="w-full bg-[#07111F] border border-white/10 rounded-[6px] p-2.5 text-white focus:outline-none focus:border-[#F2580E]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[#C3C5CA] mb-1">Primary Monthly Objective</label>
                    <textarea
                      rows={2}
                      name="objective"
                      value={formData.objective}
                      onChange={handleInputChange}
                      placeholder="Share target geography, required lead volume, or commercial goals..."
                      className="w-full bg-[#07111F] border border-white/10 rounded-[6px] p-2.5 text-white focus:outline-none focus:border-[#F2580E]"
                    />
                  </div>
                  <div className="flex items-start gap-2 pt-2">
                    <input
                      type="checkbox"
                      required
                      name="consent"
                      checked={formData.consent}
                      onChange={handleInputChange}
                      className="mt-0.5 rounded accent-[#F2580E]"
                    />
                    <span className="text-[10px] text-[#A1A1A7] leading-tight">
                      I authorize India Trade Overseas to transmit campaign details and contact me regarding this B2B commercial requirement.
                    </span>
                  </div>
                  <button
                    type="submit"
                    style={{ backgroundColor: TOKENS.brandOrange }}
                    className="w-full mt-4 py-3 rounded-[8px] text-white font-semibold uppercase tracking-wider hover:brightness-110 transition-all text-xs"
                  >
                    Submit Campaign Brief
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING ACTION BUTTON (SAFE PLACEMENT) */}
      <button
        type="button"
        onClick={() => handleSelectPackage('Professional')}
        disabled={isProcessingPayment && paymentPlan?.name === 'Professional'}
        style={{ backgroundColor: TOKENS.brandOrange, opacity: isProcessingPayment && paymentPlan?.name === 'Professional' ? 0.7 : 1 }}
        className="fixed bottom-6 right-6 z-40 p-3.5 rounded-full text-white shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center border border-white/20 disabled:cursor-not-allowed"
        aria-label="Quick Campaign Consultation"
      >
        {isProcessingPayment && paymentPlan?.name === 'Professional' ? (
          <FiLoader className="animate-spin" size={20} />
        ) : (
          <FiMessageSquare size={20} />
        )}
      </button>
    </div>
  );
}