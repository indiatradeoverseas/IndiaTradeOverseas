import React, { useState, useEffect } from 'react';
import {
  FiBriefcase,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiMapPin,
  FiClock,
  FiSearch
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { careersApi } from '../../api/careers';

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: '',
    type: 'Full-time',
    experience: '',
    description: '',
    requirements: '',
    isActive: true
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      // Use getAllJobs to manage all jobs (including inactive ones)
      const response = await careersApi.getAllJobs();
      if (response && response.success) {
        setJobs(response.data.jobs || []);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs list');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingJob(null);
    setFormData({
      title: '',
      department: '',
      location: '',
      type: 'Full-time',
      experience: '',
      description: '',
      requirements: '',
      isActive: true
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (job) => {
    setEditingJob(job);
    setFormData({
      title: job.title || '',
      department: job.department || '',
      location: job.location || '',
      type: job.type || 'Full-time',
      experience: job.experience || '',
      description: job.description || '',
      requirements: Array.isArray(job.requirements) ? job.requirements.join('\n') : '',
      isActive: job.isActive !== undefined ? job.isActive : true
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.department || !formData.location || !formData.type || !formData.experience || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Convert newlines in requirements to array of strings
    const requirementsArr = formData.requirements
      .split('\n')
      .map(req => req.trim())
      .filter(req => req.length > 0);

    const payload = {
      ...formData,
      requirements: requirementsArr
    };

    try {
      let response;
      if (editingJob) {
        response = await careersApi.updateJob(editingJob._id, payload);
      } else {
        response = await careersApi.createJob(payload);
      }

      if (response && response.success) {
        toast.success(`Job posting ${editingJob ? 'updated' : 'created'} successfully! 🎉`);
        setShowModal(false);
        fetchJobs();
      }
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error(error.response?.data?.message || 'Failed to save job posting');
    }
  };

  const handleDeleteJob = async (id) => {
    if (window.confirm('Are you sure you want to permanently delete this job posting? Candidates will no longer be able to apply for it.')) {
      try {
        const response = await careersApi.deleteJob(id);
        if (response && response.success) {
          toast.success('Job posting deleted successfully');
          fetchJobs();
        }
      } catch (error) {
        console.error('Error deleting job:', error);
        toast.error('Failed to delete job posting');
      }
    }
  };

  const handleToggleActive = async (job) => {
    try {
      const response = await careersApi.updateJob(job._id, {
        isActive: !job.isActive
      });
      if (response && response.success) {
        toast.success(`Job listing is now ${!job.isActive ? 'Active' : 'Inactive'}`);
        fetchJobs();
      }
    } catch (error) {
      console.error('Error toggling job status:', error);
      toast.error('Failed to update job status');
    }
  };

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Job Openings</h1>
          <p className="text-gray-600 mt-1">Post new roles, edit requirements, and toggle listing visibility.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-2 bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2.5 rounded-xl shadow-lg transition-transform active:scale-95 text-sm font-semibold"
        >
          <FiPlus size={18} />
          <span>Post a Job</span>
        </button>
      </div>

      {/* Search Filter Panel */}
      <div className="card p-4 bg-white shadow-sm border border-slate-100 rounded-2xl">
        <div className="relative max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by job title, department, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
      </div>

      {/* Jobs Table List */}
      <div className="card shadow-sm border border-slate-100 rounded-2xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Job Listing</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Location & Type</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-slate-500">
                    No job postings found.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job._id} className="hover:bg-slate-50/40 transition-colors">
                    {/* Title & Experience */}
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{job.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">Exp Required: {job.experience}</div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-4 px-6 text-sm text-slate-650 font-medium">
                      {job.department}
                    </td>

                    {/* Location & Type */}
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
                          <FiMapPin size={12} className="text-[#C99B38]" />
                          {job.location}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase">
                          <FiClock size={12} className="text-[#C99B38]" />
                          {job.type}
                        </div>
                      </div>
                    </td>

                    {/* Status Switch */}
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleToggleActive(job)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${job.isActive
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                        }`}
                        title={job.isActive ? "Click to Deactivate" : "Click to Activate"}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${job.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        {job.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(job)}
                          className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50/50 transition"
                          title="Edit Job Opening"
                        >
                          <FiEdit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job._id)}
                          className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50/50 transition"
                          title="Delete Job Opening"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Job Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-100 shadow-xl">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                {editingJob ? 'Edit Job Posting' : 'Post New Job Opening'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-500 uppercase tracking-wider mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Senior Trade Executive"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 uppercase tracking-wider mb-1">Department *</label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Sales, Operations"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 uppercase tracking-wider mb-1">Experience Required *</label>
                  <input
                    type="text"
                    required
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    placeholder="e.g. 2-5 Years, Freshers"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 uppercase tracking-wider mb-1">Location *</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Kishanganj, Bihar (Office)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 uppercase tracking-wider mb-1">Job Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 uppercase tracking-wider mb-1">Description *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter detailed job overview, responsibilities..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-500 uppercase tracking-wider mb-1">Requirements (one per line)</label>
                <textarea
                  rows={4}
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  placeholder="e.g. Excellent communication skills&#10;Familiarity with Custom documentation"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-sans"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="isActive" className="text-slate-600 cursor-pointer select-none">
                  Make this job listing active and visible on the Careers page
                </label>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition"
                >
                  {editingJob ? 'Update Listing' : 'Post Job'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
