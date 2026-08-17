const Task = require('./task.model');
const Employee = require('../employee/employee.model');
const socketService = require('../../services/socket.service');
const { ok, fail } = require('../../utils/response');

/**
 * Create/Assign a new task
 */
async function createTask(req, res) {
  try {
    const { title, description, assignedTo, dueDate, priority } = req.body;

    // Check authority: ADMIN, HR_MANAGER, MANAGER
    const allowedRoles = ['ADMIN', 'HR_MANAGER', 'MANAGER'];
    if (!allowedRoles.includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied: Insufficient permissions to assign tasks', [], req);
    }

    if (!title || !assignedTo || !dueDate) {
      return fail(res, 400, 'BAD_REQUEST', 'Missing required fields: title, assignedTo, and dueDate are mandatory', [], req);
    }

    // Verify target employee exists
    const employee = await Employee.findById(assignedTo);
    if (!employee) {
      return fail(res, 404, 'NOT_FOUND', 'Target assignee employee not found', [], req);
    }

    const task = new Task({
      title,
      description,
      assignedTo,
      assignedBy: req.user._id,
      dueDate,
      priority: priority || 'MEDIUM',
      status: 'PENDING'
    });

    await task.save();

    // Populate references for rich frontend details
    await task.populate('assignedTo', 'name email department position role');
    await task.populate('assignedBy', 'name email department position role');

    // Notify employee in real-time
    socketService.emitToEmployee(assignedTo, 'task_assigned', task);

    return ok(res, { task }, 'Task assigned successfully', 201, req);
  } catch (error) {
    console.error('Error creating task:', error);
    return fail(res, 500, 'INTERNAL_SERVER_ERROR', error.message, [], req);
  }
}

/**
 * Get tasks based on role and filters
 */
async function getTasks(req, res) {
  try {
    const userRole = req.user.role;
    const allowedManagers = ['ADMIN', 'HR_MANAGER', 'MANAGER'];
    
    let query = {};
    
    if (allowedManagers.includes(userRole)) {
      // HR Managers/Admins can see everything or filter by specific employee
      if (req.query.employeeId) {
        query.assignedTo = req.query.employeeId;
      }
    } else {
      // Regular employees/HR executives see only their own tasks
      query.assignedTo = req.user._id;
    }

    // Status filter
    if (req.query.status) {
      query.status = req.query.status;
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email department position role')
      .populate('assignedBy', 'name email department position role')
      .sort({ createdAt: -1 });

    return ok(res, { tasks }, 'Tasks retrieved successfully', 200, req);
  } catch (error) {
    console.error('Error getting tasks:', error);
    return fail(res, 500, 'INTERNAL_SERVER_ERROR', error.message, [], req);
  }
}

/**
 * Update task status (by assignee or manager)
 */
async function updateTaskStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!status || !['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
      return fail(res, 400, 'BAD_REQUEST', 'Invalid or missing status parameter', [], req);
    }

    const task = await Task.findById(id);
    if (!task) {
      return fail(res, 404, 'NOT_FOUND', 'Task not found', [], req);
    }

    const isAssignee = String(task.assignedTo) === String(req.user._id);
    const allowedManagers = ['ADMIN', 'HR_MANAGER', 'MANAGER'];
    const isManager = allowedManagers.includes(req.user.role);

    if (!isAssignee && !isManager) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied: You are not authorized to update this task', [], req);
    }

    task.status = status;
    if (remarks !== undefined) {
      task.remarks = remarks;
    }

    if (status === 'COMPLETED') {
      task.completedAt = Date.now();
    } else {
      task.completedAt = null;
    }

    await task.save();

    await task.populate('assignedTo', 'name email department position role');
    await task.populate('assignedBy', 'name email department position role');

    // Socket Notify managers about task completion/update
    socketService.emitToRoles(['ADMIN', 'HR_MANAGER'], 'task_updated', task);
    // Also notify assignee if manager updated it
    if (isManager && !isAssignee) {
      socketService.emitToEmployee(task.assignedTo, 'task_updated', task);
    }

    return ok(res, { task }, 'Task status updated successfully', 200, req);
  } catch (error) {
    console.error('Error updating task status:', error);
    return fail(res, 500, 'INTERNAL_SERVER_ERROR', error.message, [], req);
  }
}

/**
 * Delete a task
 */
async function deleteTask(req, res) {
  try {
    const { id } = req.params;

    // Check authority: ADMIN, HR_MANAGER, MANAGER
    const allowedRoles = ['ADMIN', 'HR_MANAGER', 'MANAGER'];
    if (!allowedRoles.includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied: Insufficient permissions to delete tasks', [], req);
    }

    const task = await Task.findByIdAndDelete(id);
    if (!task) {
      return fail(res, 404, 'NOT_FOUND', 'Task not found', [], req);
    }

    return ok(res, {}, 'Task deleted successfully', 200, req);
  } catch (error) {
    console.error('Error deleting task:', error);
    return fail(res, 500, 'INTERNAL_SERVER_ERROR', error.message, [], req);
  }
}

module.exports = {
  createTask,
  getTasks,
  updateTaskStatus,
  deleteTask
};
