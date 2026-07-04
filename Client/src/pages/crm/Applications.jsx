import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiFileText,
  FiDownload,
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiEye,
  FiUser
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { careersApi } from '../../api/careers';

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPosition, setSelectedPosition] = useState('ALL');
  const [expandedApp, setExpandedApp] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await careersApi.getApplications();
      if (response && response.success) {
        setApplications(response.data.applications || []);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load job applications');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const response = await careersApi.updateApplicationStatus(id, status);
      if (response && response.success) {
        toast.success(`Application status updated to ${status}`);
        fetchApplications();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDownloadResume = async (id, originalName) => {
    try {
      toast.loading('Downloading resume...', { id: 'download' });
      await careersApi.downloadResume(id, originalName);
      toast.success('Resume downloaded successfully', { id: 'download' });
    } catch (error) {
      console.error('Error downloading resume:', error);
      toast.error('Failed to download resume', { id: 'download' });
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200/60',
      REVIEWED: 'bg-[#0B2D5B]/5 text-[#0B2D5B] border-[#0B2D5B]/10',
      ACCEPTED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      REJECTED: 'bg-rose-50 text-rose-800 border-rose-200'
    };
    return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const positions = ['ALL', ...new Set(applications.map(app => app.position))];

  const filteredApplications = applications.filter(app => {
    const matchesSearch =
      app.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.phone.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'ALL' || app.status === selectedStatus;
    const matchesPosition = selectedPosition === 'ALL' || app.position === selectedPosition;

    return matchesSearch && matchesStatus && matchesPosition;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#FBF7EF]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C99B38]"></div>
          <p className="text-xs tracking-widest uppercase font-serif text-[#0B2D5B] opacity-70">Cataloging Talent Pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#0B2D5B] px-4 sm:px-8 py-8 space-y-8 font-sans antialiased">
      
      {/* Upper Deck Header */}
      <div className="border-b border-[#C99B38]/10 pb-6">
        <span className="text-xs uppercase tracking-widest text-[#C99B38] font-bold">Human Capital Matrix</span>
        <h1 className="text-3xl font-serif text-[#0B2D5B] tracking-wide mt-1">Job Applications</h1>
        <p className="text-sm text-gray-500 font-light mt-0.5">Audit global talent records, manage interview routing matrices, and evaluate candidate credentials.</p>
      </div>

      {/* Analytics Summary Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Received", val: applications.length, icon: FiUser, bg: "bg-[#0B2D5B]/5", text: "text-[#0B2D5B]" },
          { label: "Pending Review", val: applications.filter(a => a.status === 'PENDING').length, icon: FiClock, bg: "bg-amber-50", text: "text-amber-700" },
          { label: "Accepted Nodes", val: applications.filter(a => a.status === 'ACCEPTED').length, icon: FiCheckCircle, bg: "bg-emerald-50", text: "text-emerald-800" },
          { label: "Rejected Records", val: applications.filter(a => a.status === 'REJECTED').length, icon: FiXCircle, bg: "bg-rose-50", text: "text-rose-800" }
        ].map((card, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-[#C99B38]/10 p-5 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{card.label}</p>
              <p className={`text-2xl font-serif mt-1 font-normal ${card.text}`}>{card.val}</p>
            </div>
            <div className={`p-3 ${card.bg} text-[#C99B38] rounded-xl shadow-inner`}>
              <card.icon size={18} />
            </div>
          </div>
        ))}
      </div>

      {/* Control Console Filtering */}
      <div className="bg-white p-4 rounded-xl border border-[#C99B38]/10 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search candidate index registry by name, email coordinates, or phone manifest..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] focus:ring-1 focus:ring-[#C99B38] rounded-lg outline-none text-sm transition text-[#0B2D5B]"
          />
        </div>

        <div className="w-full md:w-52 flex items-center gap-2">
          <FiFilter className="text-gray-400 shrink-0" size={16} />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] rounded-lg outline-none text-sm cursor-pointer text-[#0B2D5B]"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="w-full md:w-60 flex items-center gap-2">
          <FiFilter className="text-gray-400 shrink-0" size={16} />
          <select
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] rounded-lg outline-none text-sm cursor-pointer text-[#0B2D5B]"
          >
            <option value="ALL">All Positions</option>
            {positions.filter(pos => pos !== 'ALL').map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Stream Table Registry */}
      <div className="bg-white rounded-xl border border-[#C99B38]/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0B2D5B] text-white text-[11px] uppercase tracking-wider">
                <th className="py-4 px-6 font-medium">Candidate Identity Details</th>
                <th className="py-4 px-6 font-medium">Target Deployment Position</th>
                <th className="py-4 px-6 font-medium">Inbound Timestamp</th>
                <th className="py-4 px-6 text-center font-medium">Pipeline Status</th>
                <th className="py-4 px-6 text-center font-medium">Credentials File</th>
                <th className="py-4 px-6 text-center font-medium">Lifecycle Routing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-16 text-xs uppercase tracking-widest text-gray-400 bg-[#FBF7EF]/10">
                    No strategic candidate profiles discoverable within the active search criteria.
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => {
                  const appId = app._id;
                  const isExpanded = expandedApp === appId;
                  return (
                    <React.Fragment key={appId}>
                      <tr className="hover:bg-[#FBF7EF]/40 transition duration-150">
                        
                        {/* Name & Encrypted Data Toggles */}
                        <td className="py-4 px-6">
                          <div className="space-y-0.5">
                            <div className="font-serif font-medium text-base text-[#0B2D5B] flex flex-wrap items-center gap-2">
                              {app.fullName}
                              {app.coverLetter && (
                                <button
                                  onClick={() => setExpandedApp(isExpanded ? null : appId)}
                                  className="inline-flex items-center text-xs font-sans font-normal text-[#C99B38] hover:text-[#0B2D5B] transition border border-[#C99B38]/20 bg-[#FBF7EF] px-2 py-0.5 rounded gap-1"
                                >
                                  <FiEye size={12} />
                                  <span>Cover Manifest</span>
                                </button>
                              )}
                            </div>
                            <div className="text-xs text-gray-400">{app.email}</div>
                            <div className="text-xs text-gray-400">{app.phone}</div>
                          </div>
                        </td>

                        {/* Staged Position */}
                        <td className="py-4 px-6">
                          <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-[#0B2D5B]/5 text-[#0B2D5B]">
                            {app.position}
                          </span>
                        </td>

                        {/* Formatted Date */}
                        <td className="py-4 px-6 text-xs font-mono text-gray-500 font-medium">
                          {new Date(app.createdAt).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>

                        {/* Status Label */}
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-block px-2.5 py-0.5 border text-[10px] font-bold tracking-wider uppercase rounded ${getStatusColor(app.status)}`}>
                            {app.status}
                          </span>
                        </td>

                        {/* Digital CV Download Node */}
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => handleDownloadResume(appId, app.resumeOriginalName)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-transparent border border-gray-200/80 text-gray-600 hover:border-[#C99B38] hover:text-[#0B2D5B] text-xs font-semibold rounded-lg transition duration-200 shadow-sm"
                            title="Download PDF Credentials Dossier"
                          >
                            <FiDownload size={13} className="text-[#C99B38]" />
                            <span>Download CV</span>
                          </button>
                        </td>

                        {/* Pipeline Stage Action Selector */}
                        <td className="py-4 px-6 text-center">
                          <select
                            value={app.status}
                            onChange={(e) => handleStatusChange(appId, e.target.value)}
                            className="px-2.5 py-1.5 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-xs font-medium text-[#0B2D5B] rounded-lg outline-none cursor-pointer"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="REVIEWED">Reviewed</option>
                            <option value="ACCEPTED">Accepted</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                        </td>
                      </tr>

                      {/* Expanding Profile Section containing Cover Letter */}
                      <AnimatePresence>
                        {isExpanded && (
                          
                          <div className="bg-[#FBF7EF]/50">
                            <td colSpan="6" className="py-5 px-8 border-t border-gray-100">
                              <motion.div 
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                className="space-y-2"
                              >
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                  <FiFileText className="text-[#C99B38]" size={12} /> Candidate Intent Justification / Statement of Purpose
                                </h4>
                                <p className="text-gray-700 text-xs leading-relaxed font-light whitespace-pre-line bg-white p-4 border border-gray-100 rounded-xl shadow-inner max-w-4xl">
                                  {app.coverLetter}
                                </p>
                              </motion.div>
                            </td>
                          </div>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}