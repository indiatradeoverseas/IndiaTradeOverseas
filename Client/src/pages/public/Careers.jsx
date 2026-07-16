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
  FiChevronDown
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { careersApi } from '../../api/careers';

export default function Careers() {
  const [activeJob, setActiveJob] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    position: '',
    resume: null,
    coverLetterFile: null
  });

  const defaultJobs = [
    {
      id: 1,
      title: 'International Logistics Coordinator',
      department: 'Operations',
      location: 'Kishanganj, Bihar (Hybrid)',
      type: 'Full-time',
      experience: '2-4 Years',
      description: 'We are seeking an experienced International Logistics Coordinator to manage our export-import shipments, coordinate with shipping lines, and ensure timely delivery of stone, coal, and agricultural products.',
      requirements: [
        'Bachelor\'s degree in Supply Chain, International Business, or related field.',
        'Proven experience handling export documentation, custom clearance, and freight forwarding.',
        'Strong communication skills and ability to coordinate with custom agents and port authorities.',
        'Familiarity with international trade laws and regulations.'
      ]
    },
    {
      id: 2,
      title: 'Global Trade Sales Executive',
      department: 'Sales & Marketing',
      location: 'Kishanganj, Bihar (Office)',
      type: 'Full-time',
      experience: '1-3 Years',
      description: 'Join our sales team to expand our export footprint. You will be responsible for identifying international clients, managing export inquiries, negotiating deals, and building long-term trading relationships.',
      requirements: [
        'Excellent verbal and written English communication skills.',
        'Understanding of export sales, B2B marketplaces (Alibaba, Indiamart, etc.), and lead generation.',
        'Ability to handle pressure, negotiate, and close international deals.',
        'Prior experience in selling agricultural commodities or building materials is a plus.'
      ]
    },
    {
      id: 3,
      title: 'Customer Support Specialist (EXIM)',
      department: 'Customer Relations',
      location: 'Kishanganj, Bihar (Office)',
      type: 'Full-time',
      experience: '0-2 Years',
      description: 'Provide exceptional service to global clients. You will assist in tracking orders, resolving inquiries, keeping clients updated on shipment status, and coordinating with logistics internally.',
      requirements: [
        'Graduate with decent communication skills.',
        'Proficient in using email, spreadsheets, and CRM tools.',
        'Strong problem-solving capability and customer-first mindset.',
        'Willingness to adapt to different international client timezones.'
      ]
    }
  ];

  const [jobs, setJobs] = useState(defaultJobs);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const response = await careersApi.getJobs();
        if (response && response.success && response.data && response.data.jobs && response.data.jobs.length > 0) {
          setJobs(response.data.jobs);
        }
      } catch (err) {
        console.error('Failed to fetch jobs from backend, using fallback data.', err);
      }
    };
    loadJobs();
  }, []);

  const perks = [
    { icon: FiGlobe, title: 'Global Exposure', description: 'Interaction with suppliers, buyers and operational partners across markets.' },
    { icon: FiTrendingUp, title: 'Fast-Track Growth', description: 'Practical responsibility and accelerated learning as the company scales.' },
    { icon: FiUsers, title: 'Collaborative Culture', description: 'Transparent teamwork, clear responsibilities and support from experienced professionals.' },
    { icon: FiBriefcase, title: 'Employee Wellbeing', description: 'Reasonable work systems, respectful communication, development opportunities and clearly stated compensation.' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, resume: e.target.files[0] }));
    }
  };

  const handleCoverLetterFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, coverLetterFile: e.target.files[0] }));
    }
  };

  const handleApplyClick = (jobTitle) => {
    setFormData(prev => ({ ...prev, position: jobTitle }));
    document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim()) return toast.error('Full name is a required field.');
    if (!formData.email.trim()) return toast.error('Email address is a required field.');
    if (!formData.phone.trim()) return toast.error('Phone number is a required field.');
    if (!formData.position) return toast.error('Please select your position of interest.');
    if (!formData.resume) return toast.error('Please upload your resume file.');

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
    } catch (error) {
      console.error('Failed to submit application:', error);
      const errMsg = error.response?.data?.message || 'Failed to submit application. Please try again.';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ fullName: '', email: '', phone: '', position: '', resume: null, coverLetterFile: null });
    setSubmitted(false);
  };

  // Framer Motion Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.12 } }
  };

  const elementVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'linear', duration: 0.55 } }
  };

  return (
    <div className="bg-[#0E1116] text-[#C5CBD3] antialiased min-h-screen selection:bg-[#6D7886]/30 selection:text-white font-sans overflow-x-hidden relative">

      {/* Structural Double-Line Top Border Accent */}
      <div className="border-t-[3px] border-double border-[#C5CBD3]/20 w-full fixed top-0 left-0 z-50"></div>

      {/* PAGE HERO SECTION - RECRUITMENT REVISION WITH CINEMATIC BACKDROP */}
      <header className="relative w-full pt-32 sm:pt-40 lg:pt-[160px] pb-24 px-6 sm:px-12 lg:px-16 text-center bg-[#040A12] border-b border-[#C5CBD3]/10 overflow-hidden">

        {/* Dynamic Photo Canvas Overlay Layer */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none opacity-40">
          <img
            src="./images/ito_images/ito_14.png"
            alt="Professional diverse operations team overlooking international gateway logistics"
            className="w-full h-full object-cover object-center scale-105 filter brightness-[1.3] contrast-[1.18] saturate-[0.8]"
          />
          {/* Layered cinematic grading vignettes */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#040A12]/20 via-transparent to-[#040A12] z-1" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#040A12]/20 via-[#040A12]/10 to-[#040A12]/2 z-1" />
        </div>

        {/* Hero Content Stack */}
        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-[#6D7886] font-medium tracking-[4px] text-[10px] sm:text-[11px] uppercase block font-sans"
          >
            WORK WITH US
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
            className="text-3xl sm:text-5xl lg:text-[62px] font-serif text-[#F2F4F7] font-normal tracking-tight uppercase leading-[1.1] max-w-4xl mx-auto text-transparent bg-clip-text bg-gradient-to-b from-[#F2F4F7] via-[#F2F4F7] to-[#C5CBD3] filter drop-shadow-[0_4px_12px_rgba(4,10,18,0.7)]"
          >
            BUILD THE FUTURE OF GLOBAL TRADE.
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-16 h-[1px] bg-[#C5CBD3]/40 mx-auto border-b"
            aria-hidden="true"
          />

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: 'easeOut' }}
            className="font-sans font-light text-[#C5CBD3] text-sm sm:text-[16px] max-w-2xl mx-auto leading-[1.65] opacity-95 drop-shadow-[0_2px_8px_rgba(4,10,18,0.6)]"
          >
            Join a growing trade and logistics enterprise connecting markets and opportunities across borders.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
            className="pt-4"
          >
            <a
              href="#openings"
              className="inline-flex items-center px-7 h-[52px] text-[12px] uppercase tracking-widest font-semibold rounded-sm bg-[#F2F4F7] border border-transparent text-[#0E1116] hover:bg-[#C5CBD3] hover:-translate-y-0.5 transition-all duration-200 shadow-md cursor-pointer"
            >
              EXPLORE OPENINGS
            </a>
          </motion.div>
        </div>
      </header>

      {/* Employer Value Proposition - Grid Panel Layer */}
      <section className="py-24 max-w-[1480px] mx-auto px-6 sm:px-12 lg:px-16 border-b border-[#C5CBD3]/24">
        <div className="text-center space-y-2 mb-16">
          <span className="text-[#6D7886] font-medium tracking-[3px] text-[12px] uppercase block">EVP Architecture</span>
          <h2 className="text-2xl sm:text-3xl font-serif text-[#F2F4F7] uppercase tracking-wide">Why India Trade Overseas?</h2>
          <div className="w-12 h-[1px] bg-[#C5CBD3]/24 mx-auto mt-4" />
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {perks.map((perk, index) => (
            <motion.div
              key={index}
              variants={elementVariants}
              className="bg-[#121D29]/80 backdrop-blur-sm p-6 border border-[#C5CBD3]/80 shadow-md rounded-sm hover:border-[#F2F4F7] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group "
            >
              <div>
                <div className="text-[#F2F4F7] bg-[#0E1116] w-10 h-10 rounded-sm border border-[#C5CBD3]/24 flex items-center justify-center mb-5 transition-all duration-300 group-hover:bg-[#F2F4F7] group-hover:text-[#0E1116] shadow-inner">
                  <perk.icon size={16} />
                </div>
                <h3 className="text-base font-serif font-medium text-[#F2F4F7] mb-2 group-hover:text-white transition-colors">{perk.title}</h3>
                <p className="text-[#C5CBD3] text-xs font-sans font-light leading-[1.65] opacity-90">{perk.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Job Listings Accordion Section */}
      <section id="openings" className="py-24 bg-[#040A12] border-b border-[#C5CBD3]/24 px-6 sm:px-12 lg:px-16">
        <div className="absolute inset-0 z-0 select-none pointer-events-none opacity-50">
          <img
            src="./images/ito_images/ito_11.jpeg"
            alt="Contained framework mask background"
            className="w-full h-full object-cover filter brightness-[1.3] contrast-[1.15] saturate-[0.8]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#040A12]/20 via-transparent to-[#040A12]/10" />
        </div>

        <div className="max-w-[1040px] mx-auto">
          <div className="text-center space-y-2 mb-16">
            <span className="text-[#6D7886] font-medium tracking-[3px] text-[12px] uppercase block">Inventory Deck</span>
            <h2 className="text-2xl sm:text-3xl font-serif text-[#F2F4F7] uppercase tracking-wide">Current Openings</h2>
            <div className="w-12 h-[1px] bg-[#C5CBD3]/24 mx-auto mt-4" />
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
            className="space-y-4"
          >
            {jobs.map((job) => {
              const jobId = job.id || job._id;
              return (
                <motion.div
                  key={jobId}
                  variants={elementVariants}
                  className="bg-[#121D29]/40 border border-[#C5CBD3]/80 rounded-sm overflow-hidden shadow-sm hover:border-[#C5CBD3]/80 transition-all duration-300"
                >
                  <div
                    className="p-5 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-[#2B3440]/20 transition-colors duration-200 backdrop-blur-sm"
                    onClick={() => setActiveJob(activeJob === jobId ? null : jobId)}
                  >
                    <div>
                      <h3 className="text-base sm:text-lg font-serif font-normal text-[#F2F4F7] tracking-wide">{job.title}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-[10px] text-[#d3dae2] font-medium uppercase font-sans tracking-widest">
                        <span className="flex items-center gap-1.5"><FiBriefcase size={12} />{job.department}</span>
                        <span className="flex items-center gap-1.5"><FiMapPin size={12} />{job.location}</span>
                        <span className="flex items-center gap-1.5"><FiClock size={12} />{job.type}</span>
                      </div>
                    </div>
                    <button className="text-[10px] uppercase tracking-widest font-bold text-[#F2F4F7] bg-[#0E1116] px-4 h-[36px] border border-[#C5CBD3]/30 rounded-sm flex items-center gap-1.5 shrink-0 hover:border-[#F2F4F7] transition-all cursor-pointer">
                      <span>Details</span> <FiChevronDown className={`transition-transform duration-300 ${activeJob === jobId ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  <AnimatePresence>
                    {activeJob === jobId && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="px-5 pb-6 border-t border-[#C5CBD3]/10 pt-5  font-sans text-xs backdrop-blur-sm"
                      >
                        <div className="space-y-5">
                          <div>
                            <h4 className="text-[10px] font-bold font-sans uppercase tracking-widest text-[#f5eeee] border-b border-[#C5CBD3]/10 pb-1">Responsibilities</h4>
                            <p className="text-white text-xs mt-2 leading-[1.65] font-light opacity-90">{job.description}</p>
                          </div>
                          <div>
                            <h4 className="text-[10px] font-bold font-sans uppercase tracking-widest text-[#f5eeee] border-b border-[#C5CBD3]/10 pb-1">Minimum Qualifications</h4>
                            <ul className="list-none space-y-1.5 mt-2 text-xs text-white font-light leading-[1.6]">
                              {job.requirements.map((req, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-[#6D7886] mt-0.5">&bull;</span>
                                  <span className="opacity-90">{req}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="pt-4 flex flex-col sm:flex-row justify-between sm:items-center text-xs border-t border-[#C5CBD3]/10 gap-4">
                            <span className="text-[#f5eeee] font-light">Compensation Structure: <strong className="text-white font-medium">{job.experience}</strong></span>
                            <button
                              onClick={() => handleApplyClick(job.title)}
                              className="text-[10px] uppercase tracking-widest font-bold text-[#F2F4F7] px-4 h-[36px] border border-[#C5CBD3]/50 rounded-sm flex items-center gap-1.5 shrink-0 hover:border-[#F2F4F7] transition-all bg-black cursor-pointer"
                            >
                              Apply For This Job
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Application Form Section with Contained Form Background Blur Mask */}
      <section id="apply-form" className="py-24 max-w-[1480px] mx-auto px-6 sm:px-12 lg:px-16 relative z-10">
        <div className="max-w-xl mx-auto bg-[#121D29]/40 border border-[#C5CBD3]/24 rounded-sm shadow-2xl overflow-hidden relative">

          {/* ST STRICTLY ISOLATED BANNER ASS ASSET BEHIND FORM CARD ONLY */}

          <div className="backdrop-blur-sm bg-transparent relative z-10">
            <div className="bg-[#040A12]/90 text-white p-5 sm:p-6 relative border-b border-[#C5CBD3]/24">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#6D7886] via-[#C5CBD3] to-[#6D7886]" />
              <h2 className="text-xl font-serif tracking-wide uppercase font-normal text-[#F2F4F7]">Application Form</h2>
              <p className="text-[#6D7886] font-sans font-bold text-[10px] tracking-wider mt-0.5">Secure profile ingest interface. Review core retain parameters before submit.</p>
            </div>

            <div className="p-5 sm:p-6 font-sans text-xs">
              {submitted ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-12 h-12 bg-[#0E1116] text-[#F2F4F7] rounded-full flex items-center justify-center mx-auto border border-[#C5CBD3]/24 shadow-sm">
                    <FiCheckCircle size={20} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-serif font-medium text-[#F2F4F7] tracking-wide uppercase">Submission Success</h3>
                    <p className="text-[#C5CBD3] text-xs font-light max-w-xs mx-auto leading-[1.6] opacity-90">
                      Your parameter records for <strong>{formData.position}</strong> have been saved securely. Our IT team enforces full data privacy mandates.
                    </p>
                  </div>
                  <button onClick={resetForm} className="text-[#6D7886] hover:text-[#F2F4F7] hover:underline font-semibold block mx-auto text-[11px] tracking-widest uppercase transition-colors">
                    Submit Another Application
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold text-[#F2F4F7] uppercase tracking-widest mb-1.5">Full name *</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      className="w-full px-4 h-[46px] border border-[#C5CBD3]/20 bg-[#0E1116]/80 text-[#F2F4F7] text-xs placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/10 transition-all rounded-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#F2F4F7] uppercase tracking-widest mb-1.5">Email address *</label>
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
                      <label className="block text-[10px] font-bold text-[#F2F4F7] uppercase tracking-widest mb-1.5">Phone number *</label>
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

                  <div>
                    <label className="block text-[10px] font-bold text-[#F2F4F7] uppercase tracking-widest mb-1.5">Position of interest *</label>
                    <div className="relative">
                      <select
                        name="position"
                        value={formData.position}
                        onChange={handleInputChange}
                        className="w-full px-4 h-[46px] border border-[#C5CBD3]/20 bg-[#0E1116]/80 text-[#F2F4F7] text-xs focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/10 transition-all rounded-sm appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-[#0E1116] text-[#6D7886]">Select linked position targets</option>
                        {jobs.map(job => <option key={job.id || job._id} value={job.title} className="bg-[#0E1116] text-[#F2F4F7]">{job.title}</option>)}
                        <option value="General Application" className="bg-[#0E1116] text-[#F2F4F7]">General Application / Other</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#6D7886]">
                        <FiChevronDown size={14} />
                      </div>
                    </div>
                  </div>

                  {/* Primary Upload Block: Resume */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#F2F4F7] uppercase tracking-widest mb-1.5">Resume *</label>
                    <div className="border border-dashed border-[#C5CBD3]/30 bg-[#0E1116]/60 rounded-sm p-5 text-center hover:border-[#F2F4F7] relative cursor-pointer transition-colors group">
                      <input
                        type="file"
                        name="resume"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
                      />
                      <FiUpload size={20} className={formData.resume ? "text-[#F2F4F7] mx-auto mb-2" : "text-[#6D7886] mx-auto mb-2 group-hover:text-[#F2F4F7] transition-colors"} />
                      <p className="text-[#F2F4F7] font-medium text-xs truncate max-w-full px-4">{formData.resume ? formData.resume.name : 'Select or drag Resume file'}</p>
                      <p className="text-[#6D7886] text-[10px] mt-1 font-mono tracking-wide">PDF, DOC, DOCX maximum size 5MB</p>
                    </div>
                  </div>

                  {/* Secondary Upload Block: Cover Letter */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#F2F4F7] uppercase tracking-widest mb-1.5">Cover note</label>
                    <div className="border border-dashed border-[#C5CBD3]/30 bg-[#0E1116]/60 rounded-sm p-5 text-center hover:border-[#F2F4F7] relative cursor-pointer transition-colors group">
                      <input
                        type="file"
                        name="coverLetter"
                        accept=".pdf,.doc,.docx"
                        onChange={handleCoverLetterFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
                      />
                      <FiUpload size={20} className={formData.coverLetterFile ? "text-[#F2F4F7] mx-auto mb-2" : "text-[#6D7886] mx-auto mb-2 group-hover:text-[#F2F4F7] transition-colors"} />
                      <p className="text-[#F2F4F7] font-medium text-xs truncate max-w-full px-4">
                        {formData.coverLetterFile ? formData.coverLetterFile.name : 'Select or drag optional Cover Letter'}
                      </p>
                      <p className="text-[#6D7886] text-[10px] mt-1 font-mono tracking-wide">PDF, DOC, DOCX maximum size 5MB</p>
                    </div>
                  </div>

                  {/* Consent & Privacy Statement Notice */}
                  <div className="p-3.5 bg-[#040A12]/60 border border-[#C5CBD3]/10 text-[#6D7886] text-[11px] font-light leading-relaxed rounded-sm">
                    By submitting this form, you provide consent for processing your applicant data and attached files under strict internal privacy retention policies.
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-[52px] bg-[#2B3440] hover:bg-[#0E1116] border border-[#C5CBD3]/42 hover:border-[#F2F4F7] text-[#F2F4F7] font-sans text-xs uppercase tracking-widest font-bold rounded-sm transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-60 shadow-md"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Processing Application...</span>
                      </>
                    ) : 'Submit Official Application'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Shared Corporate Footer Panel */}
      <footer className="bg-[#040A12] text-[#6D7886] py-16 px-6 border-t border-[#C5CBD3]/24 text-center font-sans relative overflow-hidden">

        {/* Cinematic Photo Background Overlay Matrix */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none opacity-80">
          <img
            src="/images/footer-bg-image.png" // Sourced corporate terminal or map backdrop path
            alt="India Trade Overseas Industrial Logistics Footprint"
            className="w-full h-full object-cover object-center scale-106 mt-3"
            style={{ filter: 'brightness(1.5) contrast(1.5) saturate(0.5)' }}
          />
          {/* Protective vignette mask gradient layer to secure text parameter isolation */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#040A12]/30 via-transparent to-[#040A12]/10" />
        </div>

        {/* Centered Footer Content Meta Stack */}
        <div className="max-w-3xl mx-auto space-y-4 relative z-10">
          <p className="text-[16px] uppercase tracking-[0.25em] font-semibold text-[#F2F4F7] drop-shadow-[0_2px_4px_rgba(4,10,18,0.5)]">
            India Trade Overseas
            <br />
            <span className="text-xs text-[#8a939e] tracking-widest capitalize font-normal font-sans block mt-1">Trade. Supply. Logistics. Growth.</span>
          </p>

          <p className="text-xs italic text-[#C5CBD3]/70 font-serif drop-shadow-[0_2px_4px_rgba(4,10,18,0.4)]">
            "Where Quality Meets Global Demand"
          </p>

          <div className="text-[10px] text-[#8a939e] /50 font-light max-w-2xl mx-auto border-t border-[#C5CBD3]/20 pt-4 leading-relaxed tracking-wide">
            Rates, availability, product specifications, freight, GST, dispatch timelines and delivery commitments are subject to final commercial confirmation.
          </div>
        </div>
      </footer>

    </div>
  );
}