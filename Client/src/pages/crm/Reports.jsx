import React, { useState, useEffect, useMemo } from 'react';
import { FiBarChart2, FiDownload, FiCalendar, FiPieChart, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import api from '../../api/axiosInstance';
import { DownloadButton } from '../../components/ui/AnimatedActionButton';

const AXIS_TICK = { fill: 'var(--crm-ink-faint)', fontSize: 11, fontFamily: 'var(--crm-font-mono)', fontWeight: 500 };
const XAXIS_TICK = { fill: 'var(--crm-heading)', fontSize: 11, fontFamily: 'var(--crm-font-mono)', fontWeight: 600 };
const GRID_STROKE = 'rgba(197,203,211,0.12)';
const TOOLTIP_STYLE = {
  backgroundColor: 'var(--crm-bg-raised)',
  border: '1px solid var(--crm-line)',
  borderRadius: '8px',
  fontSize: '11px',
  fontFamily: 'var(--crm-font-mono)',
  color: 'var(--crm-heading)',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)'
};
const TOOLTIP_LABEL_STYLE = { color: 'var(--crm-heading)', fontWeight: 'bold', fontSize: '12px', marginBottom: '4px', fontFamily: 'var(--crm-font-mono)' };
const TOOLTIP_ITEM_STYLE = { color: 'var(--crm-ink-soft)', fontSize: '11px', fontFamily: 'var(--crm-font-mono)', padding: '2px 0' };
const LEGEND_STYLE = { fontSize: '11px', fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-ink-faint)', paddingTop: '10px' };

const STAGE_COLORS = [
  '#0284c7', // cyan/sky
  '#a855f7', // purple
  '#10b981', // emerald
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#3b82f6', // blue
  '#ec4899', // pink
  '#84cc16', // lime
  '#6366f1', // indigo
  '#64748b'  // slate
];

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
    setLoading(true);
    try {
      const [pipelineRes, performanceRes] = await Promise.all([
        api.get('/admin/dashboard/pipeline').catch(() => ({ data: {} })),
        api.get('/admin/dashboard/employee-performance').catch(() => ({ data: {} }))
      ]);

      const pResData = pipelineRes.data?.data || pipelineRes.data || {};
      let pipelineData = [];
      let monthlyData = [];

      if (Array.isArray(pResData.pipeline)) {
        pipelineData = pResData.pipeline;
      } else if (pResData.pipeline && Array.isArray(pResData.pipeline.pipeline)) {
        pipelineData = pResData.pipeline.pipeline;
      } else if (Array.isArray(pResData)) {
        pipelineData = pResData;
      }

      if (Array.isArray(pResData.monthly)) {
        monthlyData = pResData.monthly;
      } else if (pResData.pipeline && Array.isArray(pResData.pipeline.monthly)) {
        monthlyData = pResData.pipeline.monthly;
      }

      const perfResData = performanceRes.data?.data || performanceRes.data || {};
      const perfData = Array.isArray(perfResData.performance) 
        ? perfResData.performance 
        : (Array.isArray(perfResData) ? perfResData : []);

      setReportData({
        leadStats: pipelineData,
        stageDistribution: pipelineData,
        monthlyLeads: monthlyData,
        performanceData: perfData
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      setReportData({
        leadStats: [],
        stageDistribution: [],
        monthlyLeads: [],
        performanceData: []
      });
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

  const stageDist = useMemo(() => Array.isArray(reportData?.stageDistribution) ? reportData.stageDistribution : [], [reportData]);
  const leadStats = useMemo(() => Array.isArray(reportData?.leadStats) ? reportData.leadStats : [], [reportData]);
  const monthlyLeads = useMemo(() => Array.isArray(reportData?.monthlyLeads) ? reportData.monthlyLeads : [], [reportData]);
  const performanceData = useMemo(() => Array.isArray(reportData?.performanceData) ? reportData.performanceData : [], [reportData]);

  const totalLeadsCount = useMemo(() => stageDist.reduce((sum, item) => sum + (item?.total || 0), 0), [stageDist]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--crm-line)' }}>
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[var(--crm-heading)] flex items-center gap-2">
            <FiBarChart2 className="text-cyan-400" /> Enterprise Reports & Analytics
          </h1>
          <p className="text-[var(--crm-ink-faint)] mt-1 text-xs font-mono">Real-time telemetry and consolidated business pipeline analytics</p>
        </div>
        <DownloadButton
          action={exportReport}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs uppercase font-bold px-4 py-2 rounded shadow-sm border border-emerald-400/30 transition-all self-start sm:self-auto cursor-pointer"
          icon={FiDownload}
          iconSize={14}
          idleLabel="Export Report"
          busyLabel="Exporting..."
          doneLabel="Exported"
        />
      </div>

      {/* Date Range Filter */}
      <div className="bg-[var(--crm-bg-raised)] rounded-sm border p-4" style={{ borderColor: 'var(--crm-line)' }}>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-[9px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest font-mono mb-1.5">Start Date</label>
            <input
              type="date"
              className="w-full px-3 py-1.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded text-xs text-[var(--crm-heading)] font-mono outline-none focus:border-cyan-400"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
          </div>
          <div className="flex-1">
            <label className="block text-[9px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest font-mono mb-1.5">End Date</label>
            <input
              type="date"
              className="w-full px-3 py-1.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded text-xs text-[var(--crm-heading)] font-mono outline-none focus:border-cyan-400"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
          <button onClick={fetchReportData} className="flex items-center space-x-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white text-xs font-mono uppercase font-semibold px-4 py-2 rounded transition-all cursor-pointer">
            <FiCalendar size={14} />
            <span>Apply Filter</span>
          </button>
        </div>
      </div>

      {/* 1. Stage Distribution Pie Chart Section */}
      <div className="bg-[var(--crm-bg-raised)] rounded-sm border p-5 space-y-4" style={{ borderColor: 'var(--crm-line)' }}>
        <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
          <div>
            <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] block">Pipeline Telemetry</span>
            <h2 className="text-base font-bold uppercase text-[var(--crm-heading)] flex items-center gap-2">
              <FiPieChart className="text-purple-400" /> Stage Distribution ({totalLeadsCount} Total Leads)
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Donut Chart */}
          <div className="lg:col-span-5 h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stageDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={3}
                  dataKey="total"
                  nameKey="_id"
                >
                  {stageDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STAGE_COLORS[index % STAGE_COLORS.length]} stroke="var(--crm-bg)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(val, name) => [`${val} Leads`, String(name).replace(/_/g, ' ')]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Clean Stage Badges Grid Legend */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
            {stageDist.map((entry, index) => {
              const pct = totalLeadsCount > 0 ? Math.round(((entry.total || 0) / totalLeadsCount) * 100) : 0;
              const color = STAGE_COLORS[index % STAGE_COLORS.length];
              return (
                <div
                  key={entry._id || index}
                  className="flex items-center justify-between p-2.5 rounded border bg-[var(--crm-bg-sunken)] transition-colors hover:bg-[var(--crm-bg)]"
                  style={{ borderColor: 'var(--crm-line)' }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[10px] font-mono font-bold uppercase truncate text-[var(--crm-heading)]" title={entry._id}>
                      {String(entry._id || 'STAGE').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs flex-shrink-0">
                    <span className="font-bold text-[var(--crm-heading)]">{entry.total || 0}</span>
                    <span className="text-[9px] text-[var(--crm-ink-faint)] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Monthly Trends Line Chart Section */}
      <div className="bg-[var(--crm-bg-raised)] rounded-sm border p-5 space-y-4" style={{ borderColor: 'var(--crm-line)' }}>
        <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
          <h2 className="text-base font-bold uppercase text-[var(--crm-heading)] flex items-center gap-2">
            <FiTrendingUp className="text-emerald-400" /> Monthly Trends (Leads, Won & Lost)
          </h2>
          <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-2 py-0.5 rounded">
            Historical Progress
          </span>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyLeads} margin={{ top: 15, right: 30, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="month" tick={XAXIS_TICK} />
              <YAxis tick={AXIS_TICK} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
              <Legend wrapperStyle={LEGEND_STYLE} />
              <Line type="monotone" dataKey="leads" stroke="#38bdf8" strokeWidth={3} dot={{ r: 5, fill: '#38bdf8' }} activeDot={{ r: 8 }} name="Total Leads" />
              <Line type="monotone" dataKey="won" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981' }} activeDot={{ r: 8 }} name="Won" />
              <Line type="monotone" dataKey="lost" stroke="#f43f5e" strokeWidth={3} dot={{ r: 5, fill: '#f43f5e' }} activeDot={{ r: 8 }} name="Lost" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Employee Performance Bar Chart Section */}
      <div className="bg-[var(--crm-bg-raised)] rounded-sm border p-5 space-y-4" style={{ borderColor: 'var(--crm-line)' }}>
        <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
          <h2 className="text-base font-bold uppercase text-[var(--crm-heading)] flex items-center gap-2">
            <FiUsers className="text-sky-400" /> Employee Performance Matrix
          </h2>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performanceData} margin={{ top: 15, right: 30, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="name" tick={{ fill: 'var(--crm-heading)', fontSize: 11, fontFamily: 'var(--crm-font-mono)' }} />
              <YAxis tick={AXIS_TICK} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
              <Legend wrapperStyle={LEGEND_STYLE} />
              <Bar dataKey="leads" fill="#38bdf8" name="Total Leads" maxBarSize={25} radius={[2, 2, 0, 0]} />
              <Bar dataKey="won" fill="#10b981" name="Won" maxBarSize={25} radius={[2, 2, 0, 0]} />
              <Bar dataKey="lost" fill="#f43f5e" name="Lost" maxBarSize={25} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[var(--crm-bg-raised)] rounded-sm border p-5 space-y-3" style={{ borderColor: 'var(--crm-line)' }}>
          <h3 className="font-bold uppercase font-mono text-xs text-[var(--crm-heading)] border-b pb-2" style={{ borderColor: 'var(--crm-line)' }}>
            Pipeline Overview Quick Stats
          </h3>
          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--crm-line)' }}>
              <span className="text-[var(--crm-ink-faint)]">Total Pipeline Leads:</span>
              <span className="font-bold text-[var(--crm-heading)]">{totalLeadsCount}</span>
            </div>
            <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--crm-line)' }}>
              <span className="text-[var(--crm-ink-faint)]">Overall Conversion Rate:</span>
              <span className="font-bold text-emerald-400">
                {(() => {
                  const wonLeadsFromStats = leadStats
                    .filter(s => ['CLOSED_WON', 'DEAL_WON', 'COMPLETED', 'DELIVERED', 'WON', 'ORDER_CONFIRMED'].includes(String(s._id).toUpperCase()))
                    .reduce((sum, s) => sum + (s.total || 0), 0);
                  const wonLeadsFromPerf = performanceData.reduce((sum, p) => sum + (p.won || 0), 0);
                  const totalWon = Math.max(wonLeadsFromStats, wonLeadsFromPerf);
                  return totalLeadsCount > 0 ? Math.round((totalWon / totalLeadsCount) * 100) : 0;
                })()}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--crm-ink-faint)]">Active Pipeline Stages:</span>
              <span className="font-bold text-[var(--crm-heading)]">{stageDist.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-[var(--crm-bg-raised)] rounded-sm border p-5 space-y-3" style={{ borderColor: 'var(--crm-line)' }}>
          <h3 className="font-bold uppercase font-mono text-xs text-[var(--crm-heading)] border-b pb-2" style={{ borderColor: 'var(--crm-line)' }}>
            Top Performing Employee
          </h3>
          {performanceData.length > 0 ? (
            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--crm-line)' }}>
                <span className="text-[var(--crm-ink-faint)]">Name:</span>
                <span className="font-bold text-[var(--crm-heading)]">
                  {performanceData[0].name || performanceData[0].fullName || 'Sales Executive'}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--crm-line)' }}>
                <span className="text-[var(--crm-ink-faint)]">Leads Handled:</span>
                <span className="font-bold text-[var(--crm-heading)]">
                  {performanceData[0].totalLeads || performanceData[0].leads || 0}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--crm-line)' }}>
                <span className="text-[var(--crm-ink-faint)]">Deals Won:</span>
                <span className="font-bold text-emerald-400">{performanceData[0].won || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--crm-ink-faint)]">Success Rate:</span>
                <span className="font-bold text-emerald-400">
                  {Math.round(((performanceData[0].won || 0) / Math.max(performanceData[0].totalLeads || performanceData[0].leads || 1, 1)) * 100)}%
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs font-mono text-[var(--crm-ink-faint)]">No active employee performance logs available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
