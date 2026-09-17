const employeeActivityService = require('./employeeActivity.service');
const { ok, fail } = require('../../utils/response');

async function handleHeartbeat(req, res, next) {
  try {
    const activity = await employeeActivityService.recordHeartbeat(req.user);
    return ok(res, { activity }, 'Heartbeat recorded successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function handleLogCrmAction(req, res, next) {
  try {
    const { actionCategory, details, metadata } = req.body;
    if (!actionCategory) {
      return fail(res, 400, 'VALIDATION_ERROR', 'actionCategory is required', [], req);
    }
    const activity = await employeeActivityService.recordCrmAction(
      req.user,
      actionCategory,
      details || '',
      metadata || {}
    );
    return ok(res, { activity }, 'CRM action recorded successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getLiveStatuses(req, res, next) {
  try {
    const employees = await employeeActivityService.getLiveEmployeeStatuses(req.user);
    return ok(res, { employees }, 'Live employee activity statuses retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getReports(req, res, next) {
  try {
    const reportData = await employeeActivityService.getActivityReports(req.query, req.user);
    return ok(res, { report: reportData }, 'Employee activity reports retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

async function get6PMReport(req, res, next) {
  try {
    const report = await employeeActivityService.generate6PMReport(req.user);
    return ok(res, { report }, '6:00 PM Daily Shift & Productivity Report generated', 200, req);
  } catch (error) {
    next(error);
  }
}

async function exportReportsCSV(req, res, next) {
  try {
    const reportData = await employeeActivityService.getActivityReports(req.query, req.user);
    const rows = [
      ['ITO CRM — Employee Activity & Working Hours Monitoring Report'],
      [`Period: ${reportData.period.toUpperCase()}`, `Generated At: ${new Date().toLocaleString('en-IN')}`],
      [''],
      ['SUMMARY METRICS'],
      ['Grand Total Active Hours', reportData.grandTotalActiveHours],
      ['Grand Total Inactive Hours', reportData.grandTotalInactiveHours],
      ['Grand Total Genuine CRM Actions', reportData.grandTotalCrmActions],
      [''],
      ['EMPLOYEE-WISE BREAKDOWN'],
      [
        'Employee ID',
        'Department',
        'Active Hours',
        'Inactive Hours',
        'Calls Logged',
        'Leads Updated',
        'Followups Completed',
        'Notes Entered',
        'Recordings Uploaded',
        'Status Changes',
        'Total CRM Actions',
        'Avg Productivity Score'
      ],
      ...reportData.employeeSummary.map(e => [
        e.employeeId,
        e.department,
        e.activeHoursFormatted,
        e.inactiveHoursFormatted,
        e.callsLogged,
        e.leadsUpdated,
        e.followupsCompleted,
        e.notesEntered,
        e.recordingsUploaded,
        e.statusChanges,
        e.totalCrmActions,
        `${e.avgProductivityScore}%`
      ]),
      [''],
      ['DEPARTMENT-WISE BREAKDOWN'],
      ['Department', 'Active Hours', 'Inactive Hours', 'Total CRM Actions', 'Avg Productivity Score'],
      ...reportData.departmentSummary.map(d => [
        d.department,
        d.activeHoursFormatted,
        d.inactiveHoursFormatted,
        d.totalCrmActions,
        `${d.avgProductivityScore}%`
      ])
    ];

    const csvContent = rows
      .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=employee-activity-report-${new Date().toISOString().slice(0, 10)}.csv`);
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleHeartbeat,
  handleLogCrmAction,
  getLiveStatuses,
  getReports,
  get6PMReport,
  exportReportsCSV
};
