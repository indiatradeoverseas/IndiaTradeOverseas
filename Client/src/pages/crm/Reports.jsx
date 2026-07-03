import React, { useState, useEffect } from 'react';
import { FiBarChart2, FiDownload, FiCalendar } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import api from '../../api/axiosInstance';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    leadStats: [],
    stageDistribution: [],
    monthlyLeads: [],
    performanceData: []
  });
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      const [pipelineRes, performanceRes] = await Promise.all([
        api.get('/admin/dashboard/pipeline'),
        api.get('/admin/dashboard/employee-performance')
      ]);

      if (pipelineRes.data.success) {
        setReportData(prev => ({
          ...prev,
          leadStats: pipelineRes.data.data.pipeline,
          stageDistribution: pipelineRes.data.data.pipeline
        }));
      }

      if (performanceRes.data.success) {
        setReportData(prev => ({
          ...prev,
          performanceData: performanceRes.data.data.performance
        }));
      }

      
      const monthlyData = [
        { month: 'Jan', leads: 45, won: 12, lost: 8 },
        { month: 'Feb', leads: 52, won: 15, lost: 10 },
        { month: 'Mar', leads: 48, won: 18, lost: 7 },
        { month: 'Apr', leads: 60, won: 22, lost: 12 },
        { month: 'May', leads: 55, won: 20, lost: 9 },
        { month: 'Jun', leads: 65, won: 25, lost: 11 }
      ];
      setReportData(prev => ({ ...prev, monthlyLeads: monthlyData }));

    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const data = JSON.stringify(reportData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">View detailed business insights and analytics</p>
        </div>
        <button onClick={exportReport} className="btn-primary flex items-center space-x-2">
          <FiDownload size={18} />
          <span>Export Report</span>
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="label">Start Date</label>
            <input type="date" className="input" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
          </div>
          <div className="flex-1">
            <label className="label">End Date</label>
            <input type="date" className="input" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
          </div>
          <button className="btn-secondary flex items-center space-x-2">
            <FiCalendar size={18} />
            <span>Apply Filter</span>
          </button>
        </div>
      </div>

      
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Pipeline</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={reportData.leadStats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="_id" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" fill="#3b82f6" name="Total Leads" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends</h2>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={reportData.monthlyLeads}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="leads" stroke="#3b82f6" name="Total Leads" />
            <Line type="monotone" dataKey="won" stroke="#10b981" name="Won" />
            <Line type="monotone" dataKey="lost" stroke="#ef4444" name="Lost" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Employee Performance</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={reportData.performanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="_id" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="leads" fill="#3b82f6" name="Total Leads" />
            <Bar dataKey="won" fill="#10b981" name="Won" />
            <Bar dataKey="lost" fill="#ef4444" name="Lost" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Stage Distribution</h2>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={reportData.stageDistribution}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ _id, total }) => `${_id}: ${total}`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="total"
              nameKey="_id"
            >
              {reportData.stageDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Leads:</span>
              <span className="font-semibold">{reportData.leadStats.reduce((sum, s) => sum + s.total, 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Conversion Rate:</span>
              <span className="font-semibold text-green-600">
                {Math.round((reportData.performanceData.reduce((sum, p) => sum + p.won, 0) /
                  Math.max(reportData.performanceData.reduce((sum, p) => sum + p.leads, 0), 1)) * 100)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Stages:</span>
              <span className="font-semibold">{reportData.stageDistribution.length}</span>
            </div>
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Top Performing Employee</h3>
          {reportData.performanceData.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-semibold">{reportData.performanceData[0]._id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Leads Closed:</span>
                <span className="font-semibold">{reportData.performanceData[0].won}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Success Rate:</span>
                <span className="font-semibold text-green-600">
                  {Math.round((reportData.performanceData[0].won / Math.max(reportData.performanceData[0].leads, 1)) * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}