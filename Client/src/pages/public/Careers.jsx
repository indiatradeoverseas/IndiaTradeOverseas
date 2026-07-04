import React, { useState, useEffect } from 'react';
import { 
  FiBriefcase, 
  FiMapPin, 
  FiClock, 
  FiUpload, 
  FiCheckCircle, 
  FiSend, 
  FiGlobe, 
  FiTrendingUp, 
  FiUsers, 
  FiChevronDown 
} from 'react-icons/fi';
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
    coverLetter: ''
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

  const handleApplyClick = (jobTitle) => {
    setFormData(prev => ({ ...prev, position: jobTitle }));
    document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const generateWhatsAppMessage = () => {
    return `Hello India Trade Overseas Team,
I would like to request an evaluation for the following career opening:
Name: ${formData.fullName}
Position Applied: ${formData.position}
Email: ${formData.email}
Phone: ${formData.phone}
Additional Info: ${formData.coverLetter || 'None provided'}

Please let me know the process for submitting my documents.`;
  };

  const copyApplicationTemplate = () => {
    const rawTemplate = `Hello India Trade Overseas Team,
I would like to request a career review:
Name: ${formData.fullName}
Position Applied: ${formData.position}
Email: ${formData.email}
Phone: ${formData.phone}`;
    navigator.clipboard.writeText(rawTemplate)
      .then(() => toast.success('Copied to Clipboard'))
      .catch(() => toast.error('Failed to copy to clipboard'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.phone || !formData.position || !formData.resume) {
      toast.error('Please fill all required fields and upload your resume.');
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('fullName', formData.fullName);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('position', formData.position);
      data.append('resume', formData.resume);
      if (formData.coverLetter) {
        data.append('coverLetter', formData.coverLetter);
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
    setFormData({ fullName: '', email: '', phone: '', position: '', resume: null, coverLetter: '' });
    setSubmitted(false);
  };

  return (
    <div className="bg-[#FBF7EF] text-slate-900 antialiased min-h-screen selection:bg-amber-100 selection:text-amber-900">
      
      {/* Decorative Double Gold Line Top Border */}
      <div className="border-t-[3px] border-double border-[#C99B38] w-full"></div>

      {/* Hero Header */}
      <header className="relative max-w-7xl mx-auto pt-20 pb-12 px-4 sm:px-6 lg:px-8 text-center">
        <span className="text-amber-700 font-medium tracking-[0.25em] text-xs uppercase block mb-3">
          Work With Us
        </span>
        <h1 className="text-4xl sm:text-6xl font-serif text-[#0B2D5B] tracking-tight font-normal mb-6">
          Build The Future Of Global Trade
        </h1>
        <div className="w-24 h-[1px] bg-[#C99B38] mx-auto mb-4"></div>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto font-sans font-light leading-relaxed mb-6">
          At India Trade Overseas, we bridge markets and connect opportunities across borders. We are looking for talented, passionate individuals to join our growing empire.
        </p>
        <a
          href="#openings"
          className="inline-flex items-center px-6 py-2.5 border border-transparent text-xs tracking-widest uppercase font-semibold rounded-sm bg-[#0B2D5B] hover:bg-[#102F60] text-white shadow-md transition-colors"
        >
          Explore Openings
        </a>
      </header>

      {/* Corporate Perks Grid */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-serif text-[#0B2D5B]">Why India Trade Overseas?</h2>
          <p className="text-slate-500 font-sans font-light text-xs mt-2">Discover a workplace where ambition meets global reach.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {perks.map((perk, index) => (
            <div key={index} className="bg-white p-6 border border-[#F5EEDF] shadow-sm rounded-sm">
              <div className="text-[#C99B38] bg-[#FAF9F5] w-10 h-10 rounded-sm border border-[#C99B38]/10 flex items-center justify-center mb-4">
                <perk.icon size={18} />
              </div>
              <h3 className="text-base font-serif font-medium text-[#0B2D5B] mb-2">{perk.title}</h3>
              <p className="text-slate-600 text-xs font-sans font-light leading-relaxed">{perk.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mandates Accordion Section */}
      <section id="openings" className="py-16 bg-[#F5EEDF] border-y border-[#C99B38]/10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif text-[#0B2D5B]">Current Job Openings</h2>
          </div>

          <div className="space-y-4">
            {jobs.map((job) => {
              const jobId = job.id || job._id;
              return (
                <div key={jobId} className="bg-white border border-[#F5EEDF] rounded-sm overflow-hidden shadow-sm">
                  <div
                    className="p-6 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-[#FAF9F5]/40"
                    onClick={() => setActiveJob(activeJob === jobId ? null : jobId)}
                  >
                    <div>
                      <h3 className="text-lg font-serif font-medium text-[#0B2D5B]">{job.title}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-400 font-light font-sans">
                        <span className="flex items-center gap-1"><FiBriefcase size={12} className="text-[#C99B38]" />{job.department}</span>
                        <span className="flex items-center gap-1"><FiMapPin size={12} className="text-[#C99B38]" />{job.location}</span>
                        <span className="flex items-center gap-1"><FiClock size={12} className="text-[#C99B38]" />{job.type}</span>
                      </div>
                    </div>
                    <button className="text-xs uppercase tracking-wider font-semibold text-[#C99B38] bg-[#FAF9F5] px-3 py-1 border border-[#C99B38]/10 rounded-sm flex items-center gap-1">
                      Details <FiChevronDown className={`transition-transform ${activeJob === jobId ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {activeJob === jobId && (
                    <div className="px-6 pb-6 border-t border-slate-100 pt-5 bg-[#FAF9F5]/10 font-sans">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">About The Role</h4>
                          <p className="text-slate-600 text-xs mt-1 leading-relaxed font-light">{job.description}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Key Requirements</h4>
                          <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-slate-600 font-light">
                            {job.requirements.map((req, i) => <li key={i}>{req}</li>)}
                          </ul>
                        </div>
                        <div className="pt-4 flex justify-between items-center text-xs border-t border-slate-100">
                          <span className="text-slate-500">Experience Needed: <strong className="text-slate-700">{job.experience}</strong></span>
                          <button
                            onClick={() => handleApplyClick(job.title)}
                            className="px-4 py-2 bg-[#0B2D5B] hover:bg-[#102F60] text-white rounded-sm text-xs font-semibold uppercase tracking-wider transition-colors"
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

      {/* Intake Dossier Form Container */}
      <section id="apply-form" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white border border-[#F5EEDF] rounded-sm shadow-xl overflow-hidden">
          <div className="bg-[#0B2D5B] text-white p-6 sm:p-8 border-b border-[#C99B38]">
            <h2 className="text-2xl font-serif">Apply Now</h2>
            <p className="text-slate-300 font-sans font-light text-xs mt-1">Fill out the form below to submit your job application.</p>
          </div>

          <div className="p-6 sm:p-8 bg-white font-sans text-xs">
            {submitted ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                  <FiCheckCircle size={20} />
                </div>
                <h3 className="text-lg font-serif mb-2 text-slate-900">Application Staged Successfully</h3>
                <p className="text-slate-500 text-xs font-light max-w-md mx-auto leading-relaxed mb-6">
                  Your candidate record data for the position of <strong>{formData.position}</strong> has been framed successfully. Use the secondary conduits below to forward the profile to target operational vectors.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  <a 
                    href={`https://wa.me/918250614079?text=${encodeURIComponent(generateWhatsAppMessage())}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-[#C99B38] hover:bg-amber-600 text-white font-semibold py-2.5 rounded-sm flex items-center justify-center gap-2"
                  >
                    Send on WhatsApp
                  </a>
                  <button 
                    onClick={copyApplicationTemplate}
                    className="bg-[#FAF9F5] border border-slate-200 text-slate-700 font-semibold py-2.5 rounded-sm flex items-center justify-center gap-2"
                  >
                    Copy Form Details
                  </button>
                </div>
                <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 underline font-light block mx-auto text-[11px]">
                  Submit Another Application
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-slate-600 font-semibold uppercase tracking-wider mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-2.5 border border-slate-200 bg-[#FAF9F5]/30 focus:bg-white outline-none rounded-sm transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-slate-600 font-semibold uppercase tracking-wider mb-1.5">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="name@example.com"
                      className="w-full px-4 py-2.5 border border-slate-200 bg-[#FAF9F5]/30 focus:bg-white outline-none rounded-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold uppercase tracking-wider mb-1.5">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full px-4 py-2.5 border border-slate-200 bg-[#FAF9F5]/30 focus:bg-white outline-none rounded-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold uppercase tracking-wider mb-1.5">Position of Interest *</label>
                  <select
                    name="position"
                    required
                    value={formData.position}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-200 bg-[#FAF9F5]/30 focus:bg-white outline-none text-slate-500 rounded-sm transition-all"
                  >
                    <option value="">Select a position</option>
                    {jobs.map(job => <option key={job.id || job._id} value={job.title}>{job.title}</option>)}
                    <option value="General Application">General Application / Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold uppercase tracking-wider mb-1.5">Upload Resume (PDF/DOC) *</label>
                  <div className="border border-dashed border-slate-300 rounded-sm p-6 text-center hover:border-[#C99B38] relative cursor-pointer bg-[#FAF9F5]/30">
                    <input
                      type="file"
                      required
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <FiUpload size={20} className="text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-700 font-medium">{formData.resume ? formData.resume.name : 'Click to upload or drag & drop'}</p>
                    <p className="text-slate-400 text-[10px] mt-0.5">PDF, DOC, DOCX up to 5MB</p>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold uppercase tracking-wider mb-1.5">Cover Letter</label>
                  <textarea
                    name="coverLetter"
                    rows={4}
                    value={formData.coverLetter}
                    onChange={handleInputChange}
                    placeholder="Tell us why you are a great fit..."
                    className="w-full px-4 py-2.5 border border-slate-200 bg-[#FAF9F5]/30 focus:bg-white outline-none rounded-sm transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#0B2D5B] hover:bg-[#102F60] text-white font-sans text-xs uppercase tracking-widest py-3.5 font-bold rounded-sm shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? 'Processing...' : 'Submit Application'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Corporate Handoff Footer Seal */}
      <footer className="bg-[#0B2D5B] text-slate-400 py-12 px-4 border-t-2 border-[#C99B38] text-center">
        <div className="max-w-3xl mx-auto space-y-4">
          <p className="text-[11px] uppercase tracking-[0.25em] font-semibold text-white">
            India Trade Overseas 
            <br />
            Empowering Trade. Enabling Growth.
          </p>
          <div className="text-[10px] font-sans text-slate-400 font-light max-w-xl mx-auto border-t border-slate-700/50 pt-4 leading-relaxed">
            Rates, availability, product specifications, freight, GST, dispatch timelines and delivery commitments are subject to final commercial confirmation.
          </div>
        </div>
      </footer>

    </div>
  );
}