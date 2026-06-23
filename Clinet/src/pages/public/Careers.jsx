import React, { useState } from 'react';
import { FiBriefcase, FiMapPin, FiClock, FiUpload, FiCheckCircle, FiSend, FiGlobe, FiUsers, FiTrendingUp, FiSmile } from 'react-icons/fi';
import toast from 'react-hot-toast';

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

  const jobs = [
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

  const perks = [
    { icon: FiGlobe, title: 'Global Exposure', description: 'Interact and deal with suppliers and clients across international markets and continents.' },
    { icon: FiTrendingUp, title: 'Fast-Track Growth', description: 'We are scaling rapidly. Grow your career as we scale our global footprints.' },
    { icon: FiUsers, title: 'Collaborative Culture', description: 'Work in a supportive, transparent environment with passionate teammates.' },
    { icon: FiSmile, title: 'Employee Well-being', description: 'We offer healthy work-life balance, regular team activities, and competitive pay.' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({
        ...prev,
        resume: e.target.files[0]
      }));
    }
  };

  const handleApplyClick = (jobTitle) => {
    setFormData(prev => ({
      ...prev,
      position: jobTitle
    }));
    const formElement = document.getElementById('apply-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.phone || !formData.position || !formData.resume) {
      toast.error('Please fill all required fields and upload your resume.');
      return;
    }

    setSubmitting(true);
    // Simulate API request
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      toast.success('Application submitted successfully!');
    }, 1500);
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      position: '',
      resume: null,
      coverLetter: ''
    });
    setSubmitted(false);
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white py-20 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-800/30 via-transparent to-transparent opacity-50 pointer-events-none"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <span className="bg-blue-500/20 text-blue-300 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold tracking-wider uppercase mb-4 inline-block border border-blue-500/30">
            Work With Us
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6">
            Build The Future Of Global Trade
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed mb-8">
            At India Trade Overseas, we bridge markets and connect opportunities across borders. We are looking for talented, passionate individuals to join our growing empire.
          </p>
          <a
            href="#openings"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-lg text-white bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all duration-200"
          >
            Explore Openings
          </a>
        </div>
      </section>

      {/* Perks and Culture */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-800">Why India Trade Overseas?</h2>
          <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
            Discover a workplace where your ambition meets global reach, empowering you to reach new professional heights.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {perks.map((perk, index) => (
            <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-5">
                <perk.icon size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">{perk.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{perk.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Job Openings Section */}
      <section id="openings" className="py-16 bg-slate-100 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800">Current Job Openings</h2>
            <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
              Ready to take the next step in your career? Browse our open positions below.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-300"
              >
                <div
                  className="p-6 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition-colors"
                  onClick={() => setActiveJob(activeJob === job.id ? null : job.id)}
                >
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 hover:text-blue-600 transition-colors">
                      {job.title}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-sm text-slate-500 font-medium">
                      <span className="flex items-center gap-1.5">
                        <FiBriefcase size={14} className="text-blue-500" />
                        {job.department}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FiMapPin size={14} className="text-blue-500" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FiClock size={14} className="text-blue-500" />
                        {job.type}
                      </span>
                    </div>
                  </div>
                  <button
                    className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-all duration-200 ${
                      activeJob === job.id
                        ? 'bg-slate-200 border-slate-300 text-slate-700'
                        : 'bg-white border-blue-600 text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    {activeJob === job.id ? 'Show Less' : 'View Details'}
                  </button>
                </div>

                {activeJob === job.id && (
                  <div className="px-6 pb-6 border-t border-slate-100 pt-5 bg-slate-50/30 animate-in fade-in duration-200">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">About The Role</h4>
                        <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">{job.description}</p>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Key Requirements</h4>
                        <ul className="list-disc pl-5 mt-2 space-y-1.5 text-sm text-slate-600">
                          {job.requirements.map((req, index) => (
                            <li key={index}>{req}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-4 flex justify-between items-center text-sm border-t border-slate-100">
                        <span className="text-slate-500 font-medium">Experience Needed: <strong className="text-slate-700">{job.experience}</strong></span>
                        <button
                          onClick={() => handleApplyClick(job.title)}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm hover:shadow active:scale-95 transition-all duration-150"
                        >
                          Apply For This Job
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form Section */}
      <section id="apply-form" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold">Apply Now</h2>
            <p className="text-blue-200 mt-1 text-sm">Fill out the form below to submit your job application.</p>
          </div>

          <div className="p-6 sm:p-8">
            {submitted ? (
              <div className="text-center py-10 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <FiCheckCircle size={36} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Thank you!</h3>
                <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed mb-6">
                  Your application for the position of <strong>{formData.position}</strong> has been received. Our HR team will review your profile and get back to you shortly.
                </p>
                <button
                  onClick={resetForm}
                  className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-colors duration-150"
                >
                  Submit Another Application
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-slate-800 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="name@example.com"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-slate-800 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-slate-800 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Position of Interest <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="position"
                    required
                    value={formData.position}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-slate-800 text-sm"
                  >
                    <option value="">Select a position</option>
                    {jobs.map(job => (
                      <option key={job.id} value={job.title}>{job.title}</option>
                    ))}
                    <option value="General Application">General Application / Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Upload Resume (PDF/DOC) <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors relative cursor-pointer group bg-slate-50/50">
                    <input
                      type="file"
                      required
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <FiUpload size={28} className="text-slate-400 mx-auto mb-2 group-hover:text-blue-500 transition-colors" />
                    <p className="text-slate-600 text-sm font-medium">
                      {formData.resume ? formData.resume.name : 'Click to upload or drag & drop'}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">PDF, DOC, DOCX up to 5MB</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Cover Letter / Additional Information
                  </label>
                  <textarea
                    name="coverLetter"
                    rows={4}
                    value={formData.coverLetter}
                    onChange={handleInputChange}
                    placeholder="Tell us why you are a great fit for this position..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-slate-800 text-sm resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#0f4c75] hover:bg-[#0b365e] text-white font-bold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[46px]"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <FiSend size={16} />
                      <span>Submit Application</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
