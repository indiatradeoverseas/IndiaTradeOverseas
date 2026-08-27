const salesService = require('./sales.service');
const { ok, fail } = require('../../utils/response');

async function getMyPerformance(req, res, next) {
  try {
    const { month, year } = req.query;
    const performance = await salesService.getMyPerformance(req.user, {
      month: month ? Number(month) : undefined,
      year: year ? Number(year) : undefined
    });
    return ok(res, { performance }, 'Sales performance retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getMyTarget(req, res, next) {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const targets = await salesService.getTargets({
      employeeId: req.user._id,
      month: month ? Number(month) : now.getMonth() + 1,
      year: year ? Number(year) : now.getFullYear()
    });
    return ok(res, { target: targets[0] || null }, 'Sales target retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function setTarget(req, res, next) {
  try {
    const { employeeId, month, year, targetValue, targetDeals } = req.body;
    if (!employeeId || !month || !year || targetValue === undefined) {
      return fail(res, 400, 'VALIDATION_FAILED', 'employeeId, month, year and targetValue are required');
    }
    const target = await salesService.setTarget({
      employeeId,
      month: Number(month),
      year: Number(year),
      targetValue: Number(targetValue),
      targetDeals: targetDeals !== undefined && targetDeals !== '' ? Number(targetDeals) : null,
      setBy: req.user._id
    });
    return ok(res, { target }, 'Sales target set successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function listTargets(req, res, next) {
  try {
    const { employeeId, month, year } = req.query;
    const targets = await salesService.getTargets({
      employeeId,
      month: month ? Number(month) : undefined,
      year: year ? Number(year) : undefined
    });
    return ok(res, { targets }, 'Sales targets retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getLeaderboard(req, res, next) {
  try {
    const { period, department, referenceDate } = req.query;
    const result = await salesService.getLeaderboard({ period, department, referenceDate });
    return ok(res, result, 'Sales leaderboard retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getStrategicInsights(req, res, next) {
  try {
    const result = await salesService.getStrategicInsights();
    return ok(res, result, 'Strategic insights retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getCoachingMessages(req, res, next) {
  try {
    const messages = await salesService.getCoachingMessages();
    return ok(res, { messages }, 'Coaching messages retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function sendCoachingMessage(req, res, next) {
  try {
    const { content } = req.body;
    if (!content) {
      return fail(res, 400, 'VALIDATION_FAILED', 'Message content is required');
    }
    const message = await salesService.sendCoachingMessage(req.user, content);
    return ok(res, { message }, 'Coaching message sent successfully', 201, req);
  } catch (error) {
    next(error);
  }
}

async function submitDailyWorkLog(req, res, next) {
  try {
    const { numberOfCalls, numberOfConversions, numberOfSales, note } = req.body;
    const DailyWorkLog = require('./dailyWorkLog.model');
    const Employee = require('../employee/employee.model');

    const emp = await Employee.findOne({ email: req.user.email });
    const empName = req.user.name || req.user.fullName || (emp ? emp.name : 'Sales Executive');

    const log = await DailyWorkLog.create({
      employeeId: req.user._id,
      employeeName: empName,
      department: req.user.department || (emp ? emp.department : 'SALES'),
      numberOfCalls: Number(numberOfCalls || 0),
      numberOfConversions: Number(numberOfConversions || 0),
      numberOfSales: Number(numberOfSales || 0),
      note: note || ''
    });

    return ok(res, { log }, 'Daily work log submitted successfully', 201, req);
  } catch (error) {
    next(error);
  }
}

async function getDailyWorkLogs(req, res, next) {
  try {
    const DailyWorkLog = require('./dailyWorkLog.model');
    const Employee = require('../employee/employee.model');
    const mongoose = require('mongoose');

    const role = req.user?.role || '';
    const isManagerOrAdmin = ['ADMIN', 'MANAGER', 'HR'].includes(role) || role.endsWith('_MANAGER') || role.toLowerCase().includes('manager');

    let query = {};
    if (!isManagerOrAdmin) {
      const idSet = new Set([String(req.user._id)]);
      const emp = await Employee.findOne({ email: req.user.email });
      if (emp && emp._id) idSet.add(String(emp._id));

      const matchIds = [];
      idSet.forEach((idStr) => {
        matchIds.push(idStr);
        if (mongoose.isValidObjectId(idStr)) matchIds.push(new mongoose.Types.ObjectId(idStr));
      });

      query.employeeId = { $in: matchIds };
    }

    const logs = await DailyWorkLog.find(query).sort({ createdAt: -1 }).limit(100);
    return ok(res, { logs }, 'Daily work logs retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMyPerformance,
  getMyTarget,
  setTarget,
  listTargets,
  getLeaderboard,
  getStrategicInsights,
  getCoachingMessages,
  sendCoachingMessage,
  submitDailyWorkLog,
  getDailyWorkLogs
};
