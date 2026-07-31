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

module.exports = {
  getMyPerformance,
  getMyTarget,
  setTarget,
  listTargets,
  getLeaderboard
};
