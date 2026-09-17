const reportService = require('./report.service');
const { ok, fail } = require('../../utils/response');

async function getAdminSummary(req, res, next) {
  try {
    let { startDate, endDate, range } = req.query;
    if (range && !startDate && !endDate) {
      const now = new Date();
      if (range === 'Today') {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        startDate = d.toISOString();
        endDate = now.toISOString();
      } else if (range === '7d') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        startDate = d.toISOString();
        endDate = now.toISOString();
      } else if (range === '30d') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        startDate = d.toISOString();
        endDate = now.toISOString();
      } else if (range === '90d') {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        startDate = d.toISOString();
        endDate = now.toISOString();
      }
    }
    const summary = await reportService.getAdminCommandCenterMetrics({ startDate, endDate });
    return ok(res, summary, 'Admin summary metrics retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getPipelineReport(req, res, next) {
  try {
    const stats = await reportService.getPipelineStats();
    return ok(res, stats, 'Pipeline statistics retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getPerformanceReport(req, res, next) {
  try {
    const performance = await reportService.getEmployeePerformance(req.params.id || null);
    return ok(res, { performance }, 'Employee performance report retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAdminSummary,
  getPipelineReport,
  getPerformanceReport
};
