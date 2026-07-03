import React, { useState, useEffect } from 'react';
import {
  FiFileText,
  FiDownload,
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiEye,
  FiChevronDown,
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
      PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
      REVIEWED: 'bg-blue-50 text-blue-700 border-blue-100',
      ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      REJECTED: 'bg-rose-50 text-rose-700 border-rose-100'
    };
    return colors[status] || 'bg-gray-50 text-gray-700 border-gray-150';
  };

  // Get unique list of positions for filters
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
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Job Applications</h1>
        <p className="text-gray-600 mt-1">Review candidate applications, download resumes, and manage interview pipelines.</p>
      </div>

      {/* Pipeline Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-white p-5 shadow-sm border border-slate-100 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Received</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{applications.length}</p>
          </div>
          <div className="bg-indigo-50 text-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center">
            <FiUser size={20} />
          </div>
        </div>

        <div className="card bg-white p-5 shadow-sm border border-slate-100 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Review</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{applications.filter(a => a.status === 'PENDING').length}</p>
          </div>
          <div className="bg-amber-50 text-amber-600 w-10 h-10 rounded-xl flex items-center justify-center">
            <FiClock size={20} />
          </div>
        </div>

        <div className="card bg-white p-5 shadow-sm border border-slate-100 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Accepted</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{applications.filter(a => a.status === 'ACCEPTED').length}</p>
          </div>
          <div className="bg-emerald-50 text-emerald-600 w-10 h-10 rounded-xl flex items-center justify-center">
            <FiCheckCircle size={20} />
          </div>
        </div>

        <div className="card bg-white p-5 shadow-sm border border-slate-100 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rejected</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{applications.filter(a => a.status === 'REJECTED').length}</p>
          </div>
          <div className="bg-rose-50 text-rose-600 w-10 h-10 rounded-xl flex items-center justify-center">
            <FiXCircle size={20} />
          </div>
        </div>
      </div>

      {/* Filter Options */}
      <div className="card p-4 bg-white shadow-sm border border-slate-100 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by candidate name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        <div className="w-full md:w-48 flex items-center gap-2">
          <FiFilter className="text-gray-400 shrink-0" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="w-full md:w-56 flex items-center gap-2">
          <FiFilter className="text-gray-400 shrink-0" />
          <select
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Positions</option>
            {positions.filter(pos => pos !== 'ALL').map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Applications Table list */}
      <div className="card shadow-sm border border-slate-100 rounded-2xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate Details</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Applied Position</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Applied Date</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Resume</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Stage Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-500">
                    No applications found matching the search criteria.
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => {
                  const appId = app._id;
                  const isExpanded = expandedApp === appId;
                  return (
                    <React.Fragment key={appId}>
                      <tr className="hover:bg-slate-50/40 transition-colors">
                        {/* Name & Contact */}
                        <td className="py-4 px-6">
                          <div>
                            <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                              {app.fullName}
                              {app.coverLetter && (
                                <button
                                  onClick={() => setExpandedApp(isExpanded ? null : appId)}
                                  className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center font-normal ml-2"
                                  title="View Cover Letter"
                                >
                                  <FiEye size={14} className="mr-0.5" />
                                  Cover Letter
                                </button>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">{app.email}</div>
                            <div className="text-xs text-slate-400">{app.phone}</div>
                          </div>
                        </td>

                        {/* Applied Position */}
                        <td className="py-4 px-6">
                          <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-slate-100 text-slate-700">
                            {app.position}
                          </span>
                        </td>

                        {/* Applied Date */}
                        <td className="py-4 px-6 text-xs font-medium text-slate-500">
                          {new Date(app.createdAt).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>

                        {/* Status badge */}
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-block px-3 py-1 border rounded-full text-xs font-semibold ${getStatusColor(app.status)}`}>
                            {app.status}
                          </span>
                        </td>

                        {/* Download Resume Button */}
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => handleDownloadResume(appId, app.resumeOriginalName)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition"
                            title="Download PDF/DOC Resume"
                          >
                            <FiDownload size={14} />
                            <span>Download</span>
                          </button>
                        </td>

                        {/* Update Status Dropdown */}
                        <td className="py-4 px-6 text-center">
                          <select
                            value={app.status}
                            onChange={(e) => handleStatusChange(appId, e.target.value)}
                            className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="REVIEWED">Reviewed</option>
                            <option value="ACCEPTED">Accepted</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                        </td>
                      </tr>

                      {/* Expandable Cover Letter Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan="6" className="py-4 px-8 border-t border-slate-100">
                            <div className="text-xs space-y-2">
                              <h4 className="font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                                <FiFileText className="text-indigo-500" />
                                Cover Letter / Additional Info
                              </h4>
                              <p className="text-slate-700 leading-relaxed font-light whitespace-pre-line bg-white p-4 border border-slate-100 rounded-xl shadow-inner max-w-3xl">
                                {app.coverLetter}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
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
