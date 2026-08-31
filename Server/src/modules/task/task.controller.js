const Task = require('./task.model');
const Employee = require('../employee/employee.model');
const socketService = require('../../services/socket.service');
const { ok, fail } = require('../../utils/response');
const mongoose = require('mongoose');


function isManagerUser(user) {
  if (!user) return false;
  const role = user.role || '';
  const pos = user.position || '';
  const dept = user.department || '';
  const isAdminUser =
    role === 'ADMIN' ||
    dept === 'ADMIN' ||
    (pos && pos.toLowerCase().includes('admin'));
  
  return (
    isAdminUser ||
    role === 'MANAGER' ||
    role.endsWith('_MANAGER') ||
    role.toLowerCase().includes('manager')
  );
}

/**
 * Create/Assign a new task (with optional file attachment)
 */
async function createTask(req, res) {
  try {
    const { title, description, assignedTo, dueDate, priority, department, category, leadId } = req.body;

    // Check authority: ADMIN, HR_MANAGER, MANAGER, or specialized manager roles
    if (!isManagerUser(req.user)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied: Insufficient permissions to assign tasks', [], req);
    }

    if (!title || !assignedTo || !dueDate) {
      return fail(res, 400, 'BAD_REQUEST', 'Missing required fields: title, assignedTo, and dueDate are mandatory', [], req);
    }

    // Verify target employee exists
    const employeeIdQuery = mongoose.isValidObjectId(assignedTo)
      ? { $or: [{ _id: assignedTo }, { _id: new mongoose.Types.ObjectId(assignedTo) }] }
      : { _id: assignedTo };
    const employee = await Employee.findOne(employeeIdQuery);
    if (!employee) {
      return fail(res, 404, 'NOT_FOUND', 'Target assignee employee not found', [], req);
    }

    const taskData = {
      title,
      description,
      assignedTo: employee._id,
      assignedBy: req.user._id,
      dueDate,
      priority: priority || 'MEDIUM',
      status: 'PENDING',
      department: department || req.user.department || 'GENERAL',
      category: category || 'GENERAL',
      leadId: leadId || null
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
    await task.populate('leadId', 'leadCode customerName companyName productCategory');

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
    const isManager = isManagerUser(req.user);
    
    let query = {};
    
    let userIds = [req.user._id];
    try {
      const Employee = require('../employee/employee.model');
      const User = require('../users/user.model');
      if (req.user.email) {
        const emailRegex = { $regex: new RegExp('^' + req.user.email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') };
        const emp = await Employee.findOne({ email: emailRegex });
        if (emp) userIds.push(emp._id);
        const usr = await User.findOne({ email: emailRegex });
        if (usr) userIds.push(usr._id);
      }
    } catch (err) {
      console.error('Error resolving IDs in getTasks:', err);
    }

    if (isManager) {
      // Managers can filter by specific employee or see tasks they assigned
      const targetEmployeeId = req.query.employeeId || req.query.assignedTo;
      if (targetEmployeeId) {
        let targetIds = [targetEmployeeId];
        try {
          const Employee = require('../employee/employee.model');
          const User = require('../users/user.model');
          
          let emp = null;
          if (mongoose.isValidObjectId(targetEmployeeId)) {
            emp = await Employee.findById(targetEmployeeId);
          }
          if (!emp) {
            emp = await Employee.findOne({ email: { $regex: new RegExp('^' + targetEmployeeId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } });
          }
          
          if (emp) {
            targetIds.push(emp._id);
            const usr = await User.findOne({ email: { $regex: new RegExp('^' + emp.email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } });
            if (usr) targetIds.push(usr._id);
          }
        } catch (err) {}
        
        let queryIds = [];
        targetIds.forEach(id => {
          if (id) {
            queryIds.push(id.toString());
            if (mongoose.isValidObjectId(id)) {
              queryIds.push(new mongoose.Types.ObjectId(id));
            }
          }
        });
        query.assignedTo = { $in: queryIds };
      } else if (req.query.assignedBy) {
        const queryBy = [req.query.assignedBy.toString()];
        if (mongoose.isValidObjectId(req.query.assignedBy)) {
          queryBy.push(new mongoose.Types.ObjectId(req.query.assignedBy));
        }
        query.assignedBy = { $in: queryBy };
      }
      
      // If no filter, show tasks assigned BY this manager
      if (!targetEmployeeId && !req.query.assignedBy && !req.query.all) {
        const mgrIds = [req.user._id.toString()];
        if (mongoose.isValidObjectId(req.user._id)) {
          mgrIds.push(new mongoose.Types.ObjectId(req.user._id));
        }
        query.assignedBy = { $in: mgrIds };
      }
    } else {
      // Regular employees/HR executives see only their own tasks
      let queryIds = [];
      userIds.forEach(id => {
        if (id) {
          queryIds.push(id.toString());
          if (mongoose.isValidObjectId(id)) {
            queryIds.push(new mongoose.Types.ObjectId(id));
          }
        }
      });
      query.assignedTo = { $in: queryIds };
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
      .populate('leadId', 'leadCode customerName companyName productCategory')
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

    let assigneeIds = [task.assignedTo];
    try {
      const Employee = require('../employee/employee.model');
      const User = require('../users/user.model');
      const emp = await Employee.findById(task.assignedTo);
      if (emp) {
        assigneeIds.push(emp._id);
        const usr = await User.findOne({ email: emp.email });
        if (usr) assigneeIds.push(usr._id);
      }
    } catch (err) {}

    const isAssignee = assigneeIds.map(String).includes(String(req.user._id));
    const isManager = isManagerUser(req.user);

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

    if (req.file) {
      task.completionFileUrl = req.file.path.replace(/\\/g, '/');
      task.completionFileOriginalName = req.file.originalname;
    }

    await task.save();

    await task.populate('assignedTo', 'name email department position role');
    await task.populate('assignedBy', 'name email department position role');

    // Socket Notify managers about task completion/update
    socketService.emitToRoles(['ADMIN', 'HR_MANAGER', 'MANAGER', 'SALES_MANAGER'], 'task_updated', task);
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

    // Check authority: ADMIN, HR_MANAGER, MANAGER, or specialized manager roles
    if (!isManagerUser(req.user)) {
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
