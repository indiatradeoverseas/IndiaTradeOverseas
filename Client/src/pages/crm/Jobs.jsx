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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--crm-heading)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--crm-heading)]">Manage Job Openings</h1>
          <p className="text-[var(--crm-ink-faint)] mt-1">Post new roles, edit requirements, and toggle listing visibility.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-2 bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] hover:bg-[var(--crm-ink-soft)] px-4 py-2.5 rounded-xl shadow-lg transition-transform active:scale-95 text-sm font-semibold"
        >
          <FiPlus size={18} />
          <span>Post a Job</span>
        </button>
      </div>

      {/* Search Filter Panel */}
      <div className="p-4 bg-[var(--crm-bg-raised)]/20 shadow-sm border border-[var(--crm-ink-soft)]/15 rounded-2xl">
        <div className="relative max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[var(--crm-ink-faint)]" />
          <input
            type="text"
            placeholder="Search by job title, department, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 rounded-xl outline-none focus:ring-2 focus:ring-[var(--crm-heading)]/20 text-sm text-[var(--crm-heading)]"
          />
        </div>
      </div>

      {/* Jobs Table List */}
      <div className="shadow-sm border border-[var(--crm-ink-soft)]/15 rounded-2xl overflow-hidden bg-[var(--crm-bg-raised)]/10">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[var(--crm-bg-sunken)] border-b border-[var(--crm-ink-soft)]/15">
                <th className="py-4 px-6 text-xs font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider">Job Listing</th>
                <th className="py-4 px-6 text-xs font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider">Department</th>
                <th className="py-4 px-6 text-xs font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider">Location & Type</th>
                <th className="py-4 px-6 text-xs font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider text-center">Status</th>
                <th className="py-4 px-6 text-xs font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--crm-ink-soft)]/10">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-[var(--crm-ink-faint)]">
                    No job postings found.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job._id} className="hover:bg-[var(--crm-bg-raised)]/40 transition-colors">
                    {/* Title & Experience */}
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-semibold text-[var(--crm-heading)] text-sm">{job.title}</div>
                        <div className="text-xs text-[var(--crm-ink-faint)] mt-0.5">Exp Required: {job.experience}</div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-4 px-6 text-sm text-[var(--crm-ink-soft)] font-medium">
                      {job.department}
                    </td>

                    {/* Location & Type */}
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-[var(--crm-ink-faint)] flex items-center gap-1">
                          <FiMapPin size={12} className="text-[var(--crm-ink-faint)]" />
                          {job.location}
                        </div>
                        <div className="text-[10px] font-bold text-[var(--crm-ink-faint)] flex items-center gap-1 uppercase">
                          <FiClock size={12} className="text-[var(--crm-ink-faint)]" />
                          {job.type}
                        </div>
                      </div>
                    </td>

                    {/* Status Switch */}
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleToggleActive(job)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition ${job.isActive
                          ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20 hover:bg-[var(--crm-positive-bg)]'
                          : 'bg-[var(--crm-bg-raised)] text-[var(--crm-ink-faint)] border-[var(--crm-ink-soft)]/10 hover:bg-[var(--crm-bg-raised)]/70'
                        }`}
                        title={job.isActive ? "Click to Deactivate" : "Click to Activate"}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${job.isActive ? 'bg-[var(--crm-positive)]' : 'bg-[var(--crm-ink-faint)]'}`}></span>
                        {job.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(job)}
                          className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-info)] p-2 rounded-lg hover:bg-[var(--crm-info-bg)] transition"
                          title="Edit Job Opening"
                        >
                          <FiEdit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job._id)}
                          className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-danger)] p-2 rounded-lg hover:bg-[var(--crm-danger-bg)] transition"
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
        <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--crm-bg-raised)] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-[var(--crm-ink-soft)]/20 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--crm-ink-soft)]/10">
              <h2 className="text-lg font-bold text-[var(--crm-heading)]">
                {editingJob ? 'Edit Job Posting' : 'Post New Job Opening'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-ink-soft)] font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-[var(--crm-ink-faint)] uppercase tracking-wider mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Senior Trade Executive"
                  className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--crm-heading)]/20 text-[var(--crm-heading)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[var(--crm-ink-faint)] uppercase tracking-wider mb-1">Department *</label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Sales, Operations"
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--crm-heading)]/20 text-[var(--crm-heading)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--crm-ink-faint)] uppercase tracking-wider mb-1">Experience Required *</label>
                  <input
                    type="text"
                    required
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    placeholder="e.g. 2-5 Years, Freshers"
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--crm-heading)]/20 text-[var(--crm-heading)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[var(--crm-ink-faint)] uppercase tracking-wider mb-1">Location *</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Kishanganj, Bihar (Office)"
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--crm-heading)]/20 text-[var(--crm-heading)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--crm-ink-faint)] uppercase tracking-wider mb-1">Job Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--crm-heading)]/20 cursor-pointer text-[var(--crm-heading)]"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[var(--crm-ink-faint)] uppercase tracking-wider mb-1">Description *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter detailed job overview, responsibilities..."
                  className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--crm-heading)]/20 resize-none font-sans text-[var(--crm-heading)]"
                />
              </div>

              <div>
                <label className="block text-[var(--crm-ink-faint)] uppercase tracking-wider mb-1">Requirements (one per line)</label>
                <textarea
                  rows={4}
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  placeholder="e.g. Excellent communication skills&#10;Familiarity with Custom documentation"
                  className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--crm-heading)]/20 resize-none font-sans text-[var(--crm-heading)]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-[var(--crm-heading)] focus:ring-[var(--crm-heading)]/40 border-[var(--crm-ink-soft)]/30 w-4 h-4 cursor-pointer accent-[var(--crm-heading)]"
                />
                <label htmlFor="isActive" className="text-[var(--crm-ink-soft)] cursor-pointer select-none">
                  Make this job listing active and visible on the Careers page
                </label>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-[var(--crm-ink-soft)]/10">
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-[var(--crm-bg-sunken)] bg-[var(--crm-heading)] hover:bg-[var(--crm-ink-soft)] transition"
                >
                  {editingJob ? 'Update Listing' : 'Post Job'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-[var(--crm-ink-soft)] bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 hover:bg-[var(--crm-bg-raised)] transition"
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
