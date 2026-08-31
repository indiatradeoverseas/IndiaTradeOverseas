const Notification = require('./notification.model');
const Lead = require('../leads/lead.model');
const Quotation = require('../quotations/quotation.model');
const LeadActivity = require('../leads/leadActivity.model');
const { ok, fail } = require('../../utils/response');

async function getNotifications(req, res, next) {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const userDept = req.user.department;

    // 1. Fetch DB saved notifications
    const filters = {
      $or: [
        { targetUserId: userId },
        { targetRole: userRole },
        { targetDepartment: userDept }
      ]
    };
    const dbNotifications = await Notification.find(filters).sort({ createdAt: -1 }).limit(30);
    const resultNotifications = [...dbNotifications.map(n => n.toObject ? n.toObject() : n)];

    // 2. Synthesize Recent Lead Assignment Notifications for this user
    try {
      const recentLeads = await Lead.find({ assignedTo: userId })
        .sort({ updatedAt: -1 })
        .limit(5);

      for (const lead of recentLeads) {
        const msgKey = lead.leadCode || lead.customerName;
        const exists = resultNotifications.some(n => n.message && n.message.includes(msgKey));
        if (!exists) {
          resultNotifications.push({
            _id: `lead_notif_${lead._id}`,
            message: `🎯 Lead Assigned: ${lead.leadCode} (${lead.customerName})`,
            type: 'LEAD_ASSIGNED',
            createdAt: lead.updatedAt || lead.createdAt,
            isRead: false,
            metadata: { leadId: lead._id }
          });
        }
      }
    } catch (leadErr) {
      console.warn('[Notifications] Lead query error:', leadErr.message);
    }

    // 3. Synthesize Leave Status Notifications for this user
    try {
      const LeaveRequest = require('../leave/leave.model');
      const mongoose = require('mongoose');
      const isObjId = mongoose.Types.ObjectId.isValid(userId);

      const recentLeaves = await LeaveRequest.find({
        $or: [
          { employeeId: userId },
          { appliedBy: userId },
          ...(isObjId ? [{ employeeId: new mongoose.Types.ObjectId(userId) }] : [])
        ]
      }).sort({ updatedAt: -1 }).limit(5);

      for (const leave of recentLeaves) {
        const fromStr = new Date(leave.fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        const toStr = new Date(leave.toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        
        let leaveMsg = '';
        if (leave.status === 'APPROVED' || leave.status === 'HR_APPROVED_EXTRA') {
          leaveMsg = `✅ Leave Request APPROVED for ${fromStr} - ${toStr}`;
        } else if (leave.status === 'REJECTED') {
          leaveMsg = `❌ Leave Request REJECTED for ${fromStr} - ${toStr}`;
        } else {
          leaveMsg = `⏳ Leave Request PENDING review for ${fromStr} - ${toStr}`;
        }

        const exists = resultNotifications.some(n => n.message && n.message.includes(fromStr));
        if (!exists) {
          resultNotifications.push({
            _id: `leave_notif_${leave._id}`,
            message: leaveMsg,
            type: 'LEAVE_STATUS',
            createdAt: leave.updatedAt || leave.createdAt,
            isRead: leave.status === 'PENDING',
            metadata: { leaveId: leave._id }
          });
        }
      }
    } catch (leaveErr) {
      console.warn('[Notifications] Leave query error:', leaveErr.message);
    }

    // 4. Synthesize Attendance Notification for Today
    try {
      const Attendance = require('../attendance/attendance.model');
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayAtt = await Attendance.findOne({
        $or: [{ employeeId: userId }, { userId }],
        date: todayStr
      });

      if (!todayAtt || (!todayAtt.checkInTime && !todayAtt.clockIn)) {
        resultNotifications.unshift({
          _id: `att_notif_pending_${todayStr}`,
          message: `⏰ Attendance Alert: Check-In pending for today`,
          type: 'ATTENDANCE_PENDING',
          createdAt: new Date(),
          isRead: false
        });
      } else {
        resultNotifications.unshift({
          _id: `att_notif_marked_${todayStr}`,
          message: `✅ Attendance Marked: Clocked in at ${todayAtt.checkInTime || todayAtt.clockIn || 'Today'}`,
          type: 'ATTENDANCE_MARKED',
          createdAt: todayAtt.createdAt || new Date(),
          isRead: true
        });
      }
    } catch (attErr) {
      console.warn('[Notifications] Attendance query error:', attErr.message);
    }

    // Sort all by date descending
    resultNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return ok(res, { notifications: resultNotifications }, 'Notifications retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const { notificationId } = req.params;
    const mongoose = require('mongoose');

    // Handle synthesized non-ObjectId notification IDs (e.g. att_notif_pending_..., lead_notif_..., leave_notif_...)
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return ok(res, { notification: { _id: notificationId, isRead: true } }, 'Notification marked as read', 200, req);
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        $or: [
          { targetUserId: req.user._id },
          { targetRole: req.user.role },
          { targetDepartment: req.user.department }
        ]
      },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return ok(res, { notification: { _id: notificationId, isRead: true } }, 'Notification marked as read', 200, req);
    }

    return ok(res, { notification }, 'Notification marked as read', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getDashboardSummary(req, res, next) {
  try {
    const userId = req.user._id;

    const [totalLeads, activeLeads, pendingQuotations, completedTasks] = await Promise.all([
      Lead.countDocuments({ assignedTo: userId }),
      Lead.countDocuments({ assignedTo: userId, stage: { $nin: ['CLOSED_WON', 'CLOSED_LOST'] } }),
      Quotation.countDocuments({ requestedBy: userId, status: 'PENDING' }),
      Lead.countDocuments({ assignedTo: userId, stage: 'CLOSED_WON' })
    ]);

    return ok(res, {
      summary: {
        totalLeads,
        activeLeads,
        pendingQuotations,
        completedTasks
      }
    }, 'Dashboard summary metrics retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getDashboardHistory(req, res, next) {
  try {
    const userId = req.user._id;

    const activities = await LeadActivity.find({ actorId: userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('leadId', 'customerName leadCode');

    return ok(res, { activities }, 'Dashboard activity history retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    const filters = {
      $or: [
        { targetUserId: req.user._id },
        { targetRole: req.user.role },
        { targetDepartment: req.user.department }
      ],
      isRead: false
    };

    await Notification.updateMany(filters, { isRead: true });

    return ok(res, {}, 'All notifications marked as read', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getDashboardMetrics(req, res, next) {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const SalesTarget = require('../sales/salesTarget.model');
    const Employee = require('../employee/employee.model');
    const { WON_STAGES, LOST_STAGES } = require('../leads/lead.constants');

    // 1. Total Target
    const targets = await SalesTarget.find({ month: currentMonth, year: currentYear });
    let totalTarget = targets.reduce((sum, t) => sum + (t.targetValue || 0), 0);
    if (totalTarget === 0) totalTarget = 50000000; // default 5 Cr

    // 2. Total Leads
    const totalLeads = await Lead.countDocuments({});

    // 3. Total Revenue
    const revenueAgg = await Lead.aggregate([
      { $match: { stage: { $in: WON_STAGES } } },
      { $lookup: { from: 'payments', localField: '_id', foreignField: 'leadId', as: 'payments' } },
      {
        $addFields: {
          dealRevenue: {
            $cond: {
              if: { $gt: [{ $size: '$payments' }, 0] },
              then: { $sum: '$payments.totalAmount' },
              else: { $ifNull: ['$leadValue', 0] }
            }
          }
        }
      },
      { $group: { _id: null, revenue: { $sum: '$dealRevenue' } } }
    ]);
    const totalRevenue = revenueAgg[0]?.revenue || 0;

    // 4. Won Leads
    const wonLeads = await Lead.countDocuments({ stage: { $in: WON_STAGES } });

    // 5. Pending Leads
    const pendingLeads = await Lead.countDocuments({ stage: { $nin: [...WON_STAGES, ...LOST_STAGES] } });

    // 6. Total Executives (Sales)
    const totalExecutives = await Employee.countDocuments({ department: 'SALES', status: 'ACTIVE' });

    return ok(res, {
      metrics: {
        totalTarget,
        totalLeads,
        totalRevenue,
        wonLeads,
        pendingLeads,
        totalExecutives
      }
    }, 'Dashboard metrics retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function deleteNotification(req, res, next) {
  try {
    const { notificationId } = req.params;
    const mongoose = require('mongoose');

    if (mongoose.Types.ObjectId.isValid(notificationId)) {
      await Notification.findOneAndDelete({
        _id: notificationId,
        $or: [
          { targetUserId: req.user._id },
          { targetRole: req.user.role },
          { targetDepartment: req.user.department }
        ]
      });
    }

    return ok(res, { notificationId }, 'Notification deleted successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function deleteAllNotifications(req, res, next) {
  try {
    await Notification.deleteMany({
      $or: [
        { targetUserId: req.user._id },
        { targetRole: req.user.role },
        { targetDepartment: req.user.department }
      ]
    });
    return ok(res, {}, 'All notifications deleted successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
  getDashboardSummary,
  getDashboardHistory,
  getDashboardMetrics
};
