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
    coverLetterFile: null // Preserves architectural clean node mappings for file assets
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
      description: 'Provide exceptional service to our global clients. You will assist in tracking orders, resolving inquiries, keeping clients updated on shipment status, and coordinating with logistics internally.',
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
    { icon: FiGlobe, title: 'Global Exposure', description: 'Interact and deal with suppliers and clients across international markets and continents.' },
    { icon: FiTrendingUp, title: 'Fast-Track Growth', description: 'We are scaling rapidly. Grow your career as we scale our global footprints.' },
    { icon: FiUsers, title: 'Collaborative Culture', description: 'Work in a supportive, transparent environment with passionate teammates.' },
    { icon: FiBriefcase, title: 'Employee Well-being', description: 'We offer healthy work-life balance, regular team activities, and competitive pay.' }
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
    if (!formData.fullName.trim()) return toast.error('Full Name is a required field.');
    if (!formData.email.trim()) return toast.error('Email Address is a required field.');
    if (!formData.phone.trim()) return toast.error('Phone Number is a required field.');
    if (!formData.position) return toast.error('Please select your target position.');
    if (!formData.resume) return toast.error('Please upload your official Resume file.');

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

  return (
    <div className="bg-[#ffffff] text-[#0C1F3F] antialiased min-h-screen selection:bg-[#8FAADC]/30 selection:text-[#0C1F3F] font-sans">
      
      {/* Decorative Double Light Blue Line Top Border */}
      <div className="border-t-[3px] border-double border-[#8FAADC] w-full"></div>

      {/* Hero Header */}
      <header className="relative max-w-7xl mx-auto pt-20 pb-12 px-4 sm:px-6 lg:px-8 text-center">
        <span className="text-[#2F5DA8] font-bold tracking-[0.25em] text-xs uppercase block mb-3">
          Work With Us
        </span>
        <h1 className="text-4xl sm:text-5xl font-serif text-[#0C1F3F] font-bold tracking-wide mb-4">
          Build The Future Of Global Trade
        </h1>
        <div className="w-16 h-[2px] bg-[#2F5DA8] mx-auto mb-4"></div>
        <p className="text-xs sm:text-sm text-[#0C1F3F]/70 max-w-xl mx-auto font-sans font-light leading-relaxed mb-6">
          At India Trade Overseas, we bridge markets and connect opportunities across borders. We are looking for talented, passionate individuals to join our growing team.
        </p>
        <a
          href="#openings"
          className="inline-flex items-center px-6 py-3 border border-transparent text-[10px] tracking-widest uppercase font-semibold rounded-md bg-[#2F5DA8] hover:bg-[#0C1F3F] text-white shadow-md transition-all"
        >
          Explore Openings
        </a>
      </header>

      {/* Corporate Perks Grid */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-xl font-serif text-[#0C1F3F] font-bold tracking-wide uppercase">Why India Trade Overseas?</h2>
          <p className="text-[#8FAADC] font-sans font-light text-[11px] mt-1">Discover a workplace where ambition meets global reach.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {perks.map((perk, index) => (
            <div key={index} className="bg-[#ffffff] p-6 border border-[#8FAADC]/20 shadow-xs rounded-xl hover:border-[#2F5DA8] transition-colors">
              <div className="text-[#2F5DA8] bg-[#ffffff] w-9 h-9 rounded-lg border border-[#8FAADC]/20 flex items-center justify-center mb-4">
                <perk.icon size={16} />
              </div>
              <h3 className="text-sm font-serif font-bold text-[#0C1F3F] mb-1.5">{perk.title}</h3>
              <p className="text-[#8FAADC] text-[11px] font-sans font-light leading-relaxed">{perk.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Current Openings Accordion */}
      <section id="openings" className="py-16 bg-[#8FAADC]/10 border-y border-[#8FAADC]/20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-xl font-serif text-[#0C1F3F] font-bold tracking-wide uppercase">Current Job Openings</h2>
          </div>

          <div className="space-y-3">
            {jobs.map((job) => {
              const jobId = job.id || job._id;
              return (
                <div key={jobId} className="bg-[#ffffff] border border-[#8FAADC]/20 rounded-xl overflow-hidden shadow-xs">
                  <div
                    className="p-5 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-[#ffffff]/40 transition-colors"
                    onClick={() => setActiveJob(activeJob === jobId ? null : jobId)}
                  >
                    <div>
                      <h3 className="text-base font-serif font-bold text-[#0C1F3F]">{job.title}</h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-[#8FAADC] font-light font-sans">
                        <span className="flex items-center gap-1"><FiBriefcase size={11} className="text-[#2F5DA8]" />{job.department}</span>
                        <span className="flex items-center gap-1"><FiMapPin size={11} className="text-[#2F5DA8]" />{job.location}</span>
                        <span className="flex items-center gap-1"><FiClock size={11} className="text-[#2F5DA8]" />{job.type}</span>
                      </div>
                    </div>
                    <button className="text-[10px] uppercase tracking-wider font-bold text-[#2F5DA8] bg-[#ffffff] px-3 py-1.5 border border-[#8FAADC]/30 rounded-md flex items-center gap-1 shrink-0 hover:bg-white transition-colors">
                      Details <FiChevronDown className={`transition-transform ${activeJob === jobId ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {activeJob === jobId && (
                    <div className="px-5 pb-5 border-t border-[#8FAADC]/10 pt-4 bg-[#ffffff]/50 font-sans text-xs">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#8FAADC]">About The Role</h4>
                          <p className="text-[#0C1F3F]/80 text-xs mt-1 leading-relaxed font-light">{job.description}</p>
                        </div>
                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#8FAADC]">Key Requirements</h4>
                          <ul className="list-disc pl-4 mt-1 space-y-1 text-xs text-[#0C1F3F]/80 font-light">
                            {job.requirements.map((req, i) => <li key={i}>{req}</li>)}
                          </ul>
                        </div>
                        <div className="pt-4 flex justify-between items-center text-xs border-t border-[#8FAADC]/10">
                          <span className="text-[#8FAADC] font-light">Experience Needed: <strong className="text-[#0C1F3F] font-semibold">{job.experience}</strong></span>
                          <button
                            onClick={() => handleApplyClick(job.title)}
                            className="px-4 py-2 bg-[#2F5DA8] hover:bg-[#0C1F3F] text-white text-[10px] font-bold uppercase tracking-wider transition-colors rounded-md shadow-sm"
                          >
                            Apply For This Job
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="apply-form" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto bg-[#ffffff] border border-[#8FAADC]/20 rounded-xl shadow-xl overflow-hidden">
          <div className="bg-[#0C1F3F] text-white p-5 sm:p-6 relative">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#2F5DA8]" />
            <h2 className="text-xl font-serif tracking-wide uppercase font-bold">Intake Dossier Form</h2>
            <p className="text-slate-300 font-sans font-light text-[11px] mt-0.5">Submit institutional parameters for corporate review.</p>
          </div>

          <div className="p-5 sm:p-6 bg-[#ffffff] font-sans text-xs">
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 bg-[#ffffff] text-[#2F5DA8] rounded-full flex items-center justify-center mx-auto mb-3 border border-[#8FAADC]/20 shadow-3xs">
                  <FiCheckCircle size={18} />
                </div>
                <h3 className="text-base font-serif font-bold mb-1 text-[#0C1F3F] tracking-wide uppercase">Application Staged</h3>
                <p className="text-[#8FAADC] text-xs font-light max-w-xs mx-auto leading-relaxed mb-5">
                  Your profile for <strong>{formData.position}</strong> has been stored successfully. Our procurement team will review your application parameters soon.
                </p>
                <button onClick={resetForm} className="text-[#2F5DA8] hover:underline font-bold block mx-auto text-[11px] tracking-wide">
                  Submit Another Application
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#0C1F3F] uppercase tracking-wide mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-2.5 border border-[#8FAADC]/30 bg-[#ffffff] text-[#0C1F3F] text-xs placeholder-[#8FAADC] focus:outline-none focus:border-[#2F5DA8] transition-all rounded-md"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#0C1F3F] uppercase tracking-wide mb-1.5">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="name@example.com"
                      className="w-full px-4 py-2.5 border border-[#8FAADC]/30 bg-[#ffffff] text-[#0C1F3F] text-xs placeholder-[#8FAADC] focus:outline-none focus:border-[#2F5DA8] transition-all rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#0C1F3F] uppercase tracking-wide mb-1.5">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full px-4 py-2.5 border border-[#8FAADC]/30 bg-[#ffffff] text-[#0C1F3F] text-xs placeholder-[#8FAADC] focus:outline-none focus:border-[#2F5DA8] transition-all rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#0C1F3F] uppercase tracking-wide mb-1.5">Position of Interest *</label>
                  <div className="relative">
                    <select
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-[#8FAADC]/30 bg-[#ffffff] text-[#0C1F3F] text-xs focus:outline-none focus:border-[#2F5DA8] transition-all rounded-md appearance-none cursor-pointer"
                    >
                      <option value="">Select an openings target</option>
                      {jobs.map(job => <option key={job.id || job._id} value={job.title}>{job.title}</option>)}
                      <option value="General Application">General Application / Other</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#8FAADC]">
                      <FiChevronDown size={14} />
                    </div>
                  </div>
                </div>

                {/* Primary Upload Block: Resume */}
                <div>
                  <label className="block text-[11px] font-bold text-[#0C1F3F] uppercase tracking-wide mb-1.5">Upload Resume (PDF/DOC) *</label>
                  <div className="border-2 border-dashed border-[#8FAADC]/30 rounded-xl p-4 text-center hover:border-[#2F5DA8] relative cursor-pointer bg-[#ffffff] transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <FiUpload size={20} className={formData.resume ? "text-[#2F5DA8] mx-auto mb-1.5" : "text-[#8FAADC] mx-auto mb-1.5"} />
                    <p className="text-[#0C1F3F] font-bold text-xs truncate max-w-full px-4">{formData.resume ? formData.resume.name : 'Click to select or drag Resume'}</p>
                    <p className="text-[#8FAADC] text-[9px] mt-0.5">PDF, DOC, DOCX formats up to 5MB</p>
                  </div>
                </div>

                {/* Secondary Upload Block: Cover Letter */}
                <div>
                  <label className="block text-[11px] font-bold text-[#0C1F3F] uppercase tracking-wide mb-1.5">Upload Cover Letter (PDF/DOC)</label>
                  <div className="border-2 border-dashed border-[#8FAADC]/30 rounded-xl p-4 text-center hover:border-[#2F5DA8] relative cursor-pointer bg-[#ffffff] transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleCoverLetterFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <FiUpload size={20} className={formData.coverLetterFile ? "text-[#2F5DA8] mx-auto mb-1.5" : "text-[#8FAADC] mx-auto mb-1.5"} />
                    <p className="text-[#0C1F3F] font-bold text-xs truncate max-w-full px-4">
                      {formData.coverLetterFile ? formData.coverLetterFile.name : 'Click to select or drag Cover Letter'}
                    </p>
                    <p className="text-[#8FAADC] text-[9px] mt-0.5">PDF, DOC, DOCX formats up to 5MB</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#2F5DA8] hover:bg-[#0C1F3F] text-white font-sans text-xs uppercase tracking-widest py-4 font-bold rounded-md shadow-md transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Processing Submission...</span>
                    </>
                  ) : 'Submit Official Dossier'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Corporate Handoff Footer Seal */}
      <footer className="bg-[#0C1F3F] text-[#8FAADC] py-12 px-4 border-t-2 border-[#2F5DA8] text-center font-sans">
        <div className="max-w-3xl mx-auto space-y-4">
          <p className="text-[11px] uppercase tracking-[0.25em] font-semibold text-white">
            India Trade Overseas
            <br />
            Empowering Trade. Enabling Growth.
          </p>
          <p className="text-xs italic text-[#8FAADC] font-serif">
            "Where Quality Meets Global Demand."
          </p>
          <div className="text-[10px] text-[#8FAADC]/50 font-light max-w-2xl mx-auto border-t border-[#8FAADC]/10 pt-4 leading-relaxed">
            Rates, availability, product specifications, freight, GST, dispatch timelines and delivery commitments are subject to final commercial confirmation.
          </div>
        </div>
      </footer>

    </div>
  );
}