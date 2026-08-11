const reportService = require('./report.service');
const { ok, fail } = require('../../utils/response');

async function getAdminSummary(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const summary = await reportService.getAdminCommandCenterMetrics({ startDate, endDate });
    return ok(res, summary, 'Admin summary metrics retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getPipelineReport(req, res, next) {
  try {
    const pipeline = await reportService.getPipelineStats();
    return ok(res, { pipeline }, 'Pipeline statistics retrieved', 200, req);
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
