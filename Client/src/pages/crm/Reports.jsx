import React, { useState, useEffect } from 'react';
import { FiBarChart2, FiDownload, FiCalendar } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import api from '../../api/axiosInstance';

const AXIS_TICK = { fill: '#6D7886', fontSize: 11 };
const GRID_STROKE = 'rgba(197,203,211,0.12)';
const TOOLTIP_STYLE = { backgroundColor: '#121D29', border: '1px solid rgba(197,203,211,0.2)', borderRadius: '4px', fontSize: '12px' };
const TOOLTIP_LABEL_STYLE = { color: '#F2F4F7' };
const TOOLTIP_ITEM_STYLE = { color: '#C5CBD3' };
const LEGEND_STYLE = { fontSize: '11px', color: '#6D7886' };

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

  const COLORS = ['#5C8AA6', '#10b981', '#D9A441', '#C0524B', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F2F4F7]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#F2F4F7]">Reports & Analytics</h1>
          <p className="text-[#6D7886] mt-1">View detailed business insights and analytics</p>
        </div>
        <button
          onClick={exportReport}
          className="flex items-center space-x-2 bg-[#F2F4F7] text-[#040A12] hover:bg-[#C5CBD3] text-sm font-semibold px-4 py-2.5 rounded-lg transition-all"
        >
          <FiDownload size={18} />
          <span>Export Report</span>
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="bg-[#121D29]/20 rounded-xl border border-[#C5CBD3]/15 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5">Start Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-[#0E1116] border border-[#C5CBD3]/15 focus:border-[#F2F4F7]/40 rounded-lg outline-none text-sm text-[#F2F4F7]"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5">End Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-[#0E1116] border border-[#C5CBD3]/15 focus:border-[#F2F4F7]/40 rounded-lg outline-none text-sm text-[#F2F4F7]"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
          <button className="flex items-center space-x-2 bg-[#0E1116] border border-[#C5CBD3]/20 hover:bg-[#121D29] text-[#C5CBD3] text-sm font-semibold px-4 py-2.5 rounded-lg transition-all">
            <FiCalendar size={18} />
            <span>Apply Filter</span>
          </button>
        </div>
      </div>


      <div className="bg-[#121D29]/20 rounded-xl border border-[#C5CBD3]/15 p-5">
        <h2 className="text-lg font-semibold text-[#F2F4F7] mb-4">Lead Pipeline</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={reportData.leadStats}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="_id" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
            <Legend wrapperStyle={LEGEND_STYLE} />
            <Bar dataKey="total" fill="#5C8AA6" name="Total Leads" />
          </BarChart>
        </ResponsiveContainer>
      </div>


      <div className="bg-[#121D29]/20 rounded-xl border border-[#C5CBD3]/15 p-5">
        <h2 className="text-lg font-semibold text-[#F2F4F7] mb-4">Monthly Trends</h2>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={reportData.monthlyLeads}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="month" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
            <Legend wrapperStyle={LEGEND_STYLE} />
            <Line type="monotone" dataKey="leads" stroke="#5C8AA6" name="Total Leads" />
            <Line type="monotone" dataKey="won" stroke="#10b981" name="Won" />
            <Line type="monotone" dataKey="lost" stroke="#C0524B" name="Lost" />
          </LineChart>
        </ResponsiveContainer>
      </div>


      <div className="bg-[#121D29]/20 rounded-xl border border-[#C5CBD3]/15 p-5">
        <h2 className="text-lg font-semibold text-[#F2F4F7] mb-4">Employee Performance</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={reportData.performanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="_id" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
            <Legend wrapperStyle={LEGEND_STYLE} />
            <Bar dataKey="leads" fill="#5C8AA6" name="Total Leads" />
            <Bar dataKey="won" fill="#10b981" name="Won" />
            <Bar dataKey="lost" fill="#C0524B" name="Lost" />
          </BarChart>
        </ResponsiveContainer>
      </div>


      <div className="bg-[#121D29]/20 rounded-xl border border-[#C5CBD3]/15 p-5">
        <h2 className="text-lg font-semibold text-[#F2F4F7] mb-4">Stage Distribution</h2>
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
            <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#121D29]/20 rounded-xl border border-[#C5CBD3]/15 p-5">
          <h3 className="font-semibold text-[#F2F4F7] mb-4">Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-[#6D7886]">Total Leads:</span>
              <span className="font-semibold text-[#F2F4F7]">{reportData.leadStats.reduce((sum, s) => sum + s.total, 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6D7886]">Conversion Rate:</span>
              <span className="font-semibold text-emerald-400">
                {Math.round((reportData.performanceData.reduce((sum, p) => sum + p.won, 0) /
                  Math.max(reportData.performanceData.reduce((sum, p) => sum + p.leads, 0), 1)) * 100)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6D7886]">Active Stages:</span>
              <span className="font-semibold text-[#F2F4F7]">{reportData.stageDistribution.length}</span>
            </div>
          </div>
        </div>
        <div className="bg-[#121D29]/20 rounded-xl border border-[#C5CBD3]/15 p-5">
          <h3 className="font-semibold text-[#F2F4F7] mb-4">Top Performing Employee</h3>
          {reportData.performanceData.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[#6D7886]">Name:</span>
                <span className="font-semibold text-[#F2F4F7]">{reportData.performanceData[0]._id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6D7886]">Leads Closed:</span>
                <span className="font-semibold text-[#F2F4F7]">{reportData.performanceData[0].won}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6D7886]">Success Rate:</span>
                <span className="font-semibold text-emerald-400">
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
