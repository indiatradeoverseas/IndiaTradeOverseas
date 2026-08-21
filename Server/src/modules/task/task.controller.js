const Task = require('./task.model');
const Employee = require('../employee/employee.model');
const socketService = require('../../services/socket.service');
const { ok, fail } = require('../../utils/response');

/**
 * Create/Assign a new task (with optional file attachment)
 */
async function createTask(req, res) {
  try {
    const { title, description, assignedTo, dueDate, priority, department, category } = req.body;

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

    const taskData = {
      title,
      description,
      assignedTo,
      assignedBy: req.user._id,
      dueDate,
      priority: priority || 'MEDIUM',
      status: 'PENDING',
      department: department || req.user.department || 'GENERAL',
      category: category || 'GENERAL'
    };

    // Handle file attachment if present
    if (req.file) {
      taskData.fileUrl = req.file.path.replace(/\\/g, '/');
      taskData.fileOriginalName = req.file.originalname;
    }

    const task = new Task(taskData);
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
      // Managers can filter by specific employee or see tasks they assigned
      if (req.query.employeeId) {
        query.assignedTo = req.query.employeeId;
      } else if (req.query.assignedBy) {
        query.assignedBy = req.query.assignedBy;
      }
      // If no filter, show tasks assigned BY this manager
      if (!req.query.employeeId && !req.query.assignedBy && !req.query.all) {
        query.assignedBy = req.user._id;
      }
    } else {
      // Regular employees/HR executives see only their own tasks
      query.assignedTo = req.user._id;
    }

    // Status filter
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Department filter
    if (req.query.department) {
      query.department = req.query.department;
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
    socketService.emitToRoles(['ADMIN', 'HR_MANAGER', 'MANAGER'], 'task_updated', task);
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

/**
 * Get employees list filtered by department (for task assignment dropdowns)
 */
async function getEmployeesByDepartment(req, res) {
  try {
    const { department } = req.query;
    
    let query = { status: 'ACTIVE' };
    if (department) {
      query.department = department;
    }

    const employees = await Employee.find(query)
      .select('name email department position role employeeId')
      .sort({ name: 1 });

    return ok(res, { employees }, 'Employees retrieved', 200, req);
  } catch (error) {
    console.error('Error getting employees by department:', error);
    return fail(res, 500, 'INTERNAL_SERVER_ERROR', error.message, [], req);
  }
}

module.exports = {
  createTask,
  getTasks,
  updateTaskStatus,
  deleteTask,
  getEmployeesByDepartment
};
