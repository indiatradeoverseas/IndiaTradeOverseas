import React, { useState, useEffect } from 'react';
import {
  FiBriefcase,
  FiMapPin,
  FiClock,
  FiUpload,
  FiCheckCircle,
  FiGlobe,
  FiTrendingUp,
  FiUsers,
  FiChevronDown,
  FiArrowRight,
  FiTarget,
  FiShield
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { careersApi } from '../../api/careers';
import { pushDataLayerEvent } from '../../utils/analytics';
import BuyerEntryGate from '../../components/gates/BuyerEntryGate';
import useDocumentMeta from '../../hooks/useDocumentMeta';

const CAREERS_GATE_THEME = {
  bg: '#0E1116',
  panelBg: '#121D29',
  accent: '#F2F4F7',
  accentText: '#0E1116',
  text: '#F2F4F7',
  muted: '#6D7886',
  border: '#2B3440',
  eyebrow: 'Careers at India Trade Overseas',
  headline: 'Before You Apply',
  subhead:
    'A few quick details so we can personalize your application experience.',
  fontClass: 'font-sans'
};

const CAREERS_GATE_STORAGE_KEY = 'careers_gate_profile';

export default function Careers() {
  useDocumentMeta({
    title: 'Careers | India Trade Overseas',
    description:
      'Explore career opportunities at India Trade Overseas and grow with a team working across global trade, sourcing, supply and logistics.',
    canonicalPath: '/careers'
  });

  const [activeJob, setActiveJob] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [showEntryGate, setShowEntryGate] = useState(
    () => !localStorage.getItem(CAREERS_GATE_STORAGE_KEY)
  );

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem(CAREERS_GATE_STORAGE_KEY);

    if (!saved) {
      return {
        fullName: '',
        email: '',
        phone: '',
        position: '',
        resume: null,
        coverLetterFile: null
      };
    }

    try {
      const parsed = JSON.parse(saved);

      return {
        fullName: parsed.fullName || '',
        email: parsed.email || '',
        phone: parsed.phone || '',
        position: '',
        resume: null,
        coverLetterFile: null
      };
    } catch {
      return {
        fullName: '',
        email: '',
        phone: '',
        position: '',
        resume: null,
        coverLetterFile: null
      };
    }
  });

  /*
   * Fallback jobs are only used when the careers API does not return
   * available positions.
   */
  const defaultJobs = [
    {
      id: 1,
      title: 'International Logistics Coordinator',
      department: 'Operations',
      location: 'Kishanganj, Bihar',
      type: 'Full-time',
      experience: '2-4 Years',
      description:
        'Coordinate export and import shipments, documentation, freight movement and delivery schedules while working with internal teams, logistics partners and operational stakeholders.',
      requirements: [
        "Bachelor's degree in Supply Chain, International Business, Logistics or a related field.",
        'Experience with export documentation, customs clearance or freight forwarding.',
        'Strong communication and coordination skills.',
        'Understanding of international trade and logistics processes.'
      ]
    },
    {
      id: 2,
      title: 'Global Trade Sales Executive',
      department: 'Sales & Marketing',
      location: 'Kishanganj, Bihar',
      type: 'Full-time',
      experience: '1-3 Years',
      description:
        'Develop B2B trade opportunities, respond to buyer enquiries, support negotiations and build long-term relationships with domestic and international customers.',
      requirements: [
        'Strong verbal and written English communication skills.',
        'Understanding of B2B sales, lead generation or international trade.',
        'Ability to communicate with buyers and commercial partners professionally.',
        'Experience with agricultural commodities or building materials is an advantage.'
      ]
    },
    {
      id: 3,
      title: 'Customer Support Specialist (EXIM)',
      department: 'Customer Relations',
      location: 'Kishanganj, Bihar',
      type: 'Full-time',
      experience: '0-2 Years',
      description:
        'Support customers throughout the enquiry and order journey, coordinate updates internally and help maintain clear communication around orders, documentation and shipment status.',
      requirements: [
        'Graduate with good communication and interpersonal skills.',
        'Comfortable using email, spreadsheets and digital business tools.',
        'Strong problem-solving and customer-service orientation.',
        'Willingness to work with customers across different time zones.'
      ]
    }
  ];

  const [jobs, setJobs] = useState(defaultJobs);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const response = await careersApi.getJobs();

        if (
          response &&
          response.success &&
          response.data &&
          response.data.jobs &&
          response.data.jobs.length > 0
        ) {
          setJobs(response.data.jobs);
        }
      } catch (err) {
        console.error(
          'Failed to fetch jobs from backend, using fallback data.',
          err
        );
      }
    };

    loadJobs();
  }, []);

  /*
   * Employer value proposition
   */
  const perks = [
    {
      icon: FiGlobe,
      title: 'Global Exposure',
      description:
        'Work in an environment connected to suppliers, buyers and operational partners across markets.'
    },
    {
      icon: FiTrendingUp,
      title: 'Meaningful Growth',
      description:
        'Take ownership of real responsibilities and develop practical commercial and operational skills.'
    },
    {
      icon: FiUsers,
      title: 'Collaborative Culture',
      description:
        'Work with teams where communication, accountability and practical problem-solving matter.'
    },
    {
      icon: FiTarget,
      title: 'Real Responsibility',
      description:
        'Contribute directly to projects and business operations as India Trade Overseas continues to grow.'
    }
  ];

  /*
   * Culture principles
   */
  const culturePoints = [
    {
      icon: FiShield,
      title: 'Integrity First',
      description:
        'We value honest communication, responsible decisions and professional conduct.'
    },
    {
      icon: FiUsers,
      title: 'People & Teamwork',
      description:
        'Strong execution comes from people who communicate clearly and work together.'
    },
    {
      icon: FiTrendingUp,
      title: 'Learn & Improve',
      description:
        'We encourage continuous learning, ownership and practical improvement.'
    }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({
        ...prev,
        resume: e.target.files[0]
      }));
    }
  };

  const handleCoverLetterFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({
        ...prev,
        coverLetterFile: e.target.files[0]
      }));
    }
  };

  const handleApplyClick = (jobTitle) => {
    setFormData((prev) => ({
      ...prev,
      position: jobTitle
    }));

    document
      .getElementById('apply-form')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      return toast.error('Full name is a required field.');
    }

    if (!formData.email.trim()) {
      return toast.error('Email address is a required field.');
    }

    if (!formData.phone.trim()) {
      return toast.error('Phone number is a required field.');
    }

    if (!formData.position) {
      return toast.error('Please select your position of interest.');
    }

    if (!formData.resume) {
      return toast.error('Please upload your resume file.');
    }

    setSubmitting(true);

    try {
      const data = new FormData();

      data.append('fullName', formData.fullName);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('position', formData.position);
      data.append('resume', formData.resume);

      if (formData.coverLetterFile) {
        data.append('coverLetter', formData.coverLetterFile);
      }

      await careersApi.applyJob(data);

      setSubmitted(true);

      toast.success('Your application has been submitted successfully!');

      pushDataLayerEvent('generate_lead', {
        lead_type: 'job_application',
        position: formData.position || undefined
      });
    } catch (error) {
      console.error('Failed to submit application:', error);

      const errMsg =
        error.response?.data?.message ||
        'Failed to submit application. Please try again.';

      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      position: '',
      resume: null,
      coverLetterFile: null
    });

    setSubmitted(false);
  };

  /*
   * Animation variants
   */
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.1,
        staggerChildren: 0.12
      }
    }
  };

  const elementVariants = {
    hidden: {
      opacity: 0,
      y: 15
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };

  if (showEntryGate) {
    return (
      <BuyerEntryGate
        theme={CAREERS_GATE_THEME}
        requireOtp={true}
        division="CAREERS"
        mascotSrc="/images/walking-man.png"
        onVerified={(activeId, activeToken, values) => {
          setFormData((prev) => ({
            ...prev,
            fullName: values.fullName,
            email: values.email,
            phone: values.phone
          }));

          localStorage.setItem(
            CAREERS_GATE_STORAGE_KEY,
            JSON.stringify(values)
          );

          pushDataLayerEvent('careers_gate_completed', {});

          careersApi
            .submitGateLead({
              fullName: values.fullName,
              email: values.email,
              phone: values.phone
            })
            .catch((err) =>
              console.error('Failed to record careers gate lead:', err)
            );

          setShowEntryGate(false);
        }}
      />
    );
  }

  return (
    <div className="bg-[#0E1116] text-[#C5CBD3] antialiased min-h-screen selection:bg-[#6D7886]/30 selection:text-white font-sans overflow-x-hidden relative">

      {/* Top border accent */}
      <div className="border-t-[3px] border-double border-[#C5CBD3]/20 w-full fixed top-0 left-0 z-50" />

      {/* =========================================================
          HERO
      ========================================================== */}
      <header className="relative w-full min-h-[78vh] flex items-center pt-32 sm:pt-40 lg:pt-[150px] pb-24 px-6 sm:px-12 lg:px-16 bg-[#040A12] border-b border-[#C5CBD3]/10 overflow-hidden">

        <div className="absolute inset-0 z-0 select-none pointer-events-none opacity-40">
          <img
            src="/images/ito_images/ito_14.png"
            alt="India Trade Overseas professional workplace"
            className="w-full h-full object-cover object-center scale-105"
            style={{
              filter:
                'brightness(1.3) contrast(1.18) saturate(0.8)'
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#040A12]/50 via-[#040A12]/10 to-[#040A12]/70" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#040A12]/20 via-transparent to-[#040A12]/50" />
        </div>

        <div className="relative z-10 max-w-[1080px] mx-auto w-full text-center">

          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-[#6D7886] font-medium tracking-[4px] text-[10px] sm:text-[11px] uppercase block"
          >
            CAREERS AT INDIA TRADE OVERSEAS
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.1
            }}
            className="mt-5 text-3xl sm:text-5xl lg:text-[62px] font-serif text-[#F2F4F7] font-normal tracking-tight uppercase leading-[1.1] max-w-5xl mx-auto"
          >
            Build Your Career With a Growing Trade Enterprise.
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{
              duration: 0.5,
              delay: 0.2
            }}
            className="w-16 h-[1px] bg-[#C5CBD3]/40 mx-auto mt-7"
          />

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.25
            }}
            className="font-sans font-light text-[#C5CBD3] text-sm sm:text-[16px] max-w-2xl mx-auto leading-[1.7] mt-6 opacity-95"
          >
            Join a team working across sourcing, trade, supply and logistics —
            and contribute to the systems, relationships and operations that
            move business forward.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.4
            }}
            className="pt-7"
          >
            <a
              href="#openings"
              className="inline-flex items-center gap-2 px-7 h-[52px] text-[12px] uppercase tracking-widest font-semibold rounded-sm bg-[#F2F4F7] border border-transparent text-[#0E1116] hover:bg-[#C5CBD3] hover:-translate-y-0.5 transition-all duration-200 shadow-md"
            >
              Explore Opportunities
              <FiArrowRight size={14} />
            </a>
          </motion.div>
        </div>
      </header>

      {/* =========================================================
          PEOPLE / CULTURE INTRODUCTION
      ========================================================== */}
      <section className="py-24 px-6 sm:px-12 lg:px-16 border-b border-[#C5CBD3]/20">
        <div className="max-w-[1180px] mx-auto">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7 }}
            >
              <span className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase block mb-3">
                PEOPLE & CULTURE
              </span>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-[#F2F4F7] uppercase tracking-wide leading-tight">
                People Behind the Business
              </h2>

              <div className="w-12 h-[1px] bg-[#C5CBD3]/30 mt-5 mb-7" />

              <p className="text-[#C5CBD3] text-sm sm:text-[15px] leading-[1.8] font-light opacity-90">
                India Trade Overseas is building a team around practical
                execution, professional communication and long-term
                relationships. Our work connects commercial requirements with
                sourcing, supply and logistics operations.
              </p>

              <p className="text-[#C5CBD3] text-sm sm:text-[15px] leading-[1.8] font-light opacity-90 mt-5">
                As the business grows, we look for people who are willing to
                learn, take responsibility and contribute to meaningful work.
                Whether you work in operations, sales, customer relations or
                technology, your contribution becomes part of the wider
                business system.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              {culturePoints.map((item, index) => {
                const Icon = item.icon;

                return (
                  <div
                    key={index}
                    className="bg-[#121D29]/50 border border-[#C5CBD3]/20 rounded-sm p-5 hover:border-[#F2F4F7] hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="text-[#F2F4F7] bg-[#0E1116] w-10 h-10 rounded-sm border border-[#C5CBD3]/20 flex items-center justify-center mb-5">
                      <Icon size={16} />
                    </div>

                    <h3 className="text-sm font-serif text-[#F2F4F7] mb-2">
                      {item.title}
                    </h3>

                    <p className="text-[#C5CBD3] text-xs leading-[1.65] font-light opacity-90">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </motion.div>

          </div>
        </div>
      </section>

      {/* =========================================================
          WHY JOIN ITO
      ========================================================== */}
      <section className="py-24 max-w-[1480px] mx-auto px-6 sm:px-12 lg:px-16 border-b border-[#C5CBD3]/20">

        <div className="text-center space-y-2 mb-16">
          <span className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase block">
            WHY JOIN US
          </span>

          <h2 className="text-2xl sm:text-3xl font-serif text-[#F2F4F7] uppercase tracking-wide">
            Opportunities to Learn, Contribute & Grow
          </h2>

          <div className="w-12 h-[1px] bg-[#C5CBD3]/24 mx-auto mt-4" />
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{
            once: true,
            margin: '-60px'
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {perks.map((perk, index) => {
            const Icon = perk.icon;

            return (
              <motion.div
                key={index}
                variants={elementVariants}
                className="bg-[#121D29]/60 backdrop-blur-sm p-6 border border-[#C5CBD3]/20 shadow-md rounded-sm hover:border-[#F2F4F7] hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="text-[#F2F4F7] bg-[#0E1116] w-10 h-10 rounded-sm border border-[#C5CBD3]/20 flex items-center justify-center mb-5 transition-all duration-300 group-hover:bg-[#F2F4F7] group-hover:text-[#0E1116]">
                  <Icon size={16} />
                </div>

                <h3 className="text-base font-serif font-medium text-[#F2F4F7] mb-2 group-hover:text-white transition-colors">
                  {perk.title}
                </h3>

                <p className="text-[#C5CBD3] text-xs font-sans font-light leading-[1.65] opacity-90">
                  {perk.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* =========================================================
          CURRENT OPENINGS
      ========================================================== */}
      <section
        id="openings"
        className="relative py-24 bg-[#040A12] border-b border-[#C5CBD3]/20 px-6 sm:px-12 lg:px-16 overflow-hidden"
      >

        {/* Background image is now correctly contained inside section */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none opacity-40">
          <img
            src="/images/ito_images/ito_11.jpeg"
            alt="India Trade Overseas operations"
            className="w-full h-full object-cover object-center"
            style={{
              filter:
                'brightness(1.3) contrast(1.15) saturate(0.8)'
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-b from-[#040A12]/70 via-[#040A12]/30 to-[#040A12]/80" />
        </div>

        <div className="max-w-[1040px] mx-auto relative z-10">

          <div className="text-center space-y-2 mb-16">
            <span className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase block">
              OPEN POSITIONS
            </span>

            <h2 className="text-2xl sm:text-3xl font-serif text-[#F2F4F7] uppercase tracking-wide">
              Current Opportunities
            </h2>

            <div className="w-12 h-[1px] bg-[#C5CBD3]/24 mx-auto mt-4" />

            <p className="text-[#C5CBD3] text-xs sm:text-sm font-light max-w-xl mx-auto leading-[1.7] pt-3 opacity-90">
              Explore available positions and find an opportunity that matches
              your skills, experience and interests.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{
              once: true,
              margin: '-40px'
            }}
            className="space-y-4"
          >
            {jobs.length > 0 ? (
              jobs.map((job) => {
                const jobId = job.id || job._id;
                const isActive = activeJob === jobId;

                return (
                  <motion.div
                    key={jobId}
                    variants={elementVariants}
                    className="bg-[#121D29]/80 backdrop-blur-md border border-[#C5CBD3]/20 rounded-sm overflow-hidden shadow-sm hover:border-[#F2F4F7]/60 transition-all duration-300"
                  >
                    <button
                      type="button"
                      className="w-full text-left p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 hover:bg-[#2B3440]/20 transition-colors duration-200 cursor-pointer"
                      onClick={() =>
                        setActiveJob(isActive ? null : jobId)
                      }
                      aria-expanded={isActive}
                    >
                      <div>
                        <h3 className="text-base sm:text-lg font-serif font-normal text-[#F2F4F7] tracking-wide">
                          {job.title}
                        </h3>

                        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-[10px] text-[#C5CBD3] font-medium uppercase font-sans tracking-widest">
                          <span className="flex items-center gap-1.5">
                            <FiBriefcase size={12} />
                            {job.department}
                          </span>

                          <span className="flex items-center gap-1.5">
                            <FiMapPin size={12} />
                            {job.location}
                          </span>

                          <span className="flex items-center gap-1.5">
                            <FiClock size={12} />
                            {job.type}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] uppercase tracking-widest font-bold text-[#F2F4F7] bg-[#0E1116] px-4 h-[36px] border border-[#C5CBD3]/30 rounded-sm flex items-center gap-1.5 shrink-0">
                        Details
                        <FiChevronDown
                          className={`transition-transform duration-300 ${
                            isActive ? 'rotate-180' : ''
                          }`}
                        />
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isActive && (
                        <motion.div
                          initial={{
                            opacity: 0,
                            height: 0
                          }}
                          animate={{
                            opacity: 1,
                            height: 'auto'
                          }}
                          exit={{
                            opacity: 0,
                            height: 0
                          }}
                          transition={{
                            duration: 0.25,
                            ease: 'easeInOut'
                          }}
                          className="border-t border-[#C5CBD3]/10"
                        >
                          <div className="px-5 sm:px-6 pb-6 pt-5 font-sans text-xs">
                            <div className="space-y-6">

                              <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#F2F4F7] border-b border-[#C5CBD3]/10 pb-2">
                                  Role Overview
                                </h4>

                                <p className="text-[#C5CBD3] text-xs mt-3 leading-[1.7] font-light opacity-90">
                                  {job.description}
                                </p>
                              </div>

                              <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#F2F4F7] border-b border-[#C5CBD3]/10 pb-2">
                                  Requirements
                                </h4>

                                <ul className="list-none space-y-2 mt-3 text-xs text-[#C5CBD3] font-light leading-[1.6]">
                                  {Array.isArray(job.requirements) &&
                                    job.requirements.map((req, i) => (
                                      <li
                                        key={i}
                                        className="flex items-start gap-2"
                                      >
                                        <span className="text-[#6D7886] mt-0.5">
                                          &bull;
                                        </span>

                                        <span className="opacity-90">
                                          {req}
                                        </span>
                                      </li>
                                    ))}
                                </ul>
                              </div>

                              <div className="pt-4 border-t border-[#C5CBD3]/10 flex flex-col sm:flex-row justify-between sm:items-center gap-4">

                                <div className="text-[#C5CBD3] font-light">
                                  <span>Experience: </span>
                                  <strong className="text-[#F2F4F7] font-medium">
                                    {job.experience || 'As applicable'}
                                  </strong>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleApplyClick(job.title)
                                  }
                                  className="text-[10px] uppercase tracking-widest font-bold text-[#F2F4F7] px-5 h-[38px] border border-[#C5CBD3]/40 rounded-sm flex items-center justify-center gap-2 hover:border-[#F2F4F7] hover:bg-[#F2F4F7] hover:text-[#0E1116] transition-all bg-[#0E1116] cursor-pointer"
                                >
                                  Apply for This Position
                                  <FiArrowRight size={13} />
                                </button>

                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center border border-[#C5CBD3]/20 bg-[#121D29]/60 p-10 rounded-sm">
                <FiBriefcase
                  size={22}
                  className="mx-auto text-[#6D7886] mb-4"
                />

                <h3 className="font-serif text-[#F2F4F7] text-lg">
                  No Current Openings
                </h3>

                <p className="text-[#C5CBD3] text-xs mt-2 font-light">
                  You can still submit a general application below.
                </p>
              </div>
            )}
          </motion.div>

        </div>
      </section>

      {/* =========================================================
          APPLICATION FORM
      ========================================================== */}
      <section
        id="apply-form"
        className="py-24 px-6 sm:px-12 lg:px-16 relative"
      >
        <div className="max-w-[1180px] mx-auto">

          <div className="text-center space-y-2 mb-14">
            <span className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase block">
              JOIN THE TEAM
            </span>

            <h2 className="text-2xl sm:text-3xl font-serif text-[#F2F4F7] uppercase tracking-wide">
              Submit Your Application
            </h2>

            <div className="w-12 h-[1px] bg-[#C5CBD3]/24 mx-auto mt-4" />

            <p className="text-[#C5CBD3] text-xs sm:text-sm font-light max-w-xl mx-auto leading-[1.7] pt-3">
              Found a suitable opportunity? Submit your details and resume.
              You can also apply for future opportunities through a general
              application.
            </p>
          </div>

          <div className="max-w-xl mx-auto bg-[#121D29]/40 border border-[#C5CBD3]/20 rounded-sm shadow-2xl overflow-hidden">

            <div className="bg-[#040A12]/90 text-white p-5 sm:p-6 relative border-b border-[#C5CBD3]/20">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#6D7886] via-[#C5CBD3] to-[#6D7886]" />

              <h2 className="text-xl font-serif tracking-wide uppercase font-normal text-[#F2F4F7]">
                Application Form
              </h2>

              <p className="text-[#6D7886] font-sans font-medium text-[10px] tracking-wider mt-1">
                Tell us about yourself and the opportunity you are interested
                in.
              </p>
            </div>

            <div className="p-5 sm:p-6 font-sans text-xs">

              {submitted ? (
                <div className="text-center py-8 space-y-4">

                  <div className="w-12 h-12 bg-[#0E1116] text-[#F2F4F7] rounded-full flex items-center justify-center mx-auto border border-[#C5CBD3]/24 shadow-sm">
                    <FiCheckCircle size={20} />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base font-serif font-medium text-[#F2F4F7] tracking-wide uppercase">
                      Application Received
                    </h3>

                    <p className="text-[#C5CBD3] text-xs font-light max-w-xs mx-auto leading-[1.6] opacity-90">
                      Thank you for applying for{' '}
                      <strong>{formData.position}</strong>. Our team will
                      review your application and contact you if your profile
                      matches the opportunity.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-[#6D7886] hover:text-[#F2F4F7] hover:underline font-semibold block mx-auto text-[11px] tracking-widest uppercase transition-colors"
                  >
                    Submit Another Application
                  </button>

                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* Full Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#F2F4F7] uppercase tracking-widest mb-1.5">
                      Full Name *
                    </label>

                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      className="w-full px-4 h-[46px] border border-[#C5CBD3]/20 bg-[#0E1116]/80 text-[#F2F4F7] text-xs placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/10 transition-all rounded-sm"
                    />
                  </div>

                  {/* Email + Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div>
                      <label className="block text-[10px] font-bold text-[#F2F4F7] uppercase tracking-widest mb-1.5">
                        Email Address *
                      </label>

                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="name@example.com"
                        className="w-full px-4 h-[46px] border border-[#C5CBD3]/20 bg-[#0E1116]/80 text-[#F2F4F7] text-xs placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/10 transition-all rounded-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#F2F4F7] uppercase tracking-widest mb-1.5">
                        Phone Number *
                      </label>

                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+91 XXXXX XXXXX"
                        className="w-full px-4 h-[46px] border border-[#C5CBD3]/20 bg-[#0E1116]/80 text-[#F2F4F7] text-xs placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/10 transition-all rounded-sm"
                      />
                    </div>

                  </div>

                  {/* Position */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#F2F4F7] uppercase tracking-widest mb-1.5">
                      Position of Interest *
                    </label>

                    <div className="relative">
                      <select
                        name="position"
                        value={formData.position}
                        onChange={handleInputChange}
                        className="w-full px-4 h-[46px] border border-[#C5CBD3]/20 bg-[#0E1116]/80 text-[#F2F4F7] text-xs focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/10 transition-all rounded-sm appearance-none cursor-pointer"
                      >
                        <option
                          value=""
                          className="bg-[#0E1116] text-[#6D7886]"
                        >
                          Select a position
                        </option>

                        {jobs.map((job) => (
                          <option
                            key={job.id || job._id}
                            value={job.title}
                            className="bg-[#0E1116] text-[#F2F4F7]"
                          >
                            {job.title}
                          </option>
                        ))}

                        <option
                          value="General Application"
                          className="bg-[#0E1116] text-[#F2F4F7]"
                        >
                          General Application
                        </option>
                      </select>

                      <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#6D7886]">
                        <FiChevronDown size={14} />
                      </div>
                    </div>
                  </div>

                  {/* Resume */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#F2F4F7] uppercase tracking-widest mb-1.5">
                      Resume *
                    </label>

                    <div className="border border-dashed border-[#C5CBD3]/30 bg-[#0E1116]/60 rounded-sm p-5 text-center hover:border-[#F2F4F7] relative cursor-pointer transition-colors group">

                      <input
                        type="file"
                        name="resume"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
                      />

                      <FiUpload
                        size={20}
                        className={
                          formData.resume
                            ? 'text-[#F2F4F7] mx-auto mb-2'
                            : 'text-[#6D7886] mx-auto mb-2 group-hover:text-[#F2F4F7] transition-colors'
                        }
                      />

                      <p className="text-[#F2F4F7] font-medium text-xs truncate max-w-full px-4">
                        {formData.resume
                          ? formData.resume.name
                          : 'Select or drag Resume file'}
                      </p>

                      <p className="text-[#6D7886] text-[10px] mt-1 font-mono tracking-wide">
                        PDF, DOC, DOCX • Maximum size 5MB
                      </p>
                    </div>
                  </div>

                  {/* Cover Letter */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#F2F4F7] uppercase tracking-widest mb-1.5">
                      Cover Note
                    </label>

                    <div className="border border-dashed border-[#C5CBD3]/30 bg-[#0E1116]/60 rounded-sm p-5 text-center hover:border-[#F2F4F7] relative cursor-pointer transition-colors group">

                      <input
                        type="file"
                        name="coverLetter"
                        accept=".pdf,.doc,.docx"
                        onChange={handleCoverLetterFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
                      />

                      <FiUpload
                        size={20}
                        className={
                          formData.coverLetterFile
                            ? 'text-[#F2F4F7] mx-auto mb-2'
                            : 'text-[#6D7886] mx-auto mb-2 group-hover:text-[#F2F4F7] transition-colors'
                        }
                      />

                      <p className="text-[#F2F4F7] font-medium text-xs truncate max-w-full px-4">
                        {formData.coverLetterFile
                          ? formData.coverLetterFile.name
                          : 'Select or drag optional Cover Note'}
                      </p>

                      <p className="text-[#6D7886] text-[10px] mt-1 font-mono tracking-wide">
                        PDF, DOC, DOCX • Maximum size 5MB
                      </p>
                    </div>
                  </div>

                  {/* Privacy */}
                  <div className="p-3.5 bg-[#040A12]/60 border border-[#C5CBD3]/10 text-[#6D7886] text-[11px] font-light leading-relaxed rounded-sm">
                    By submitting this application, you consent to the
                    processing of the information and documents provided for
                    recruitment and evaluation purposes.
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-[52px] bg-[#2B3440] hover:bg-[#0E1116] border border-[#C5CBD3]/42 hover:border-[#F2F4F7] text-[#F2F4F7] font-sans text-xs uppercase tracking-widest font-bold rounded-sm transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-60 shadow-md"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        <span>Submitting Application...</span>
                      </>
                    ) : (
                      <>
                        Submit Application
                        <FiArrowRight size={14} />
                      </>
                    )}
                  </button>

                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          FOOTER
      ========================================================== */}
      <footer className="bg-[#040A12] text-[#6D7886] py-16 px-6 border-t border-[#C5CBD3]/20 text-center font-sans relative overflow-hidden">

        <div className="absolute inset-0 z-0 select-none pointer-events-none opacity-80">
          <img
            src="/images/footer-bg-image.png"
            alt="India Trade Overseas Industrial Logistics Footprint"
            className="w-full h-full object-cover object-center scale-105 mt-3"
            style={{
              filter:
                'brightness(1.5) contrast(1.5) saturate(0.5)'
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#040A12]/30 via-transparent to-[#040A12]/10" />
        </div>

        <div className="max-w-3xl mx-auto space-y-4 relative z-10">

          <p className="text-[16px] uppercase tracking-[0.25em] font-semibold text-[#F2F4F7] drop-shadow-[0_2px_4px_rgba(4,10,18,0.5)]">
            India Trade Overseas
            <br />

            <span className="text-xs text-[#8a939e] tracking-widest capitalize font-normal font-sans block mt-1">
              Trade. Supply. Logistics. Growth.
            </span>
          </p>

          <p className="text-xs italic text-[#C5CBD3]/70 font-serif drop-shadow-[0_2px_4px_rgba(4,10,18,0.4)]">
            "Where Quality Meets Global Demand"
          </p>

          <div className="text-[10px] text-[#8a939e]/50 font-light max-w-2xl mx-auto border-t border-[#C5CBD3]/20 pt-4 leading-relaxed tracking-wide">
            Rates, availability, product specifications, freight, GST, dispatch
            timelines and delivery commitments are subject to final commercial
            confirmation.
          </div>

        </div>
      </footer>

    </div>
  );
}
