const socketIO = require('socket.io');
const mongoose = require('mongoose');
const EmployeeStatus = require('../modules/employee/employeeStatus.model');
const Employee = require('../modules/employee/employee.model');

let io = null;
const connectedEmployees = new Map();
const socketMetadata = new Map();

async function updateEmployeePresence(employeeId, eventType) {
  try {
    if (!mongoose.Types.ObjectId.isValid(employeeId)) return;

    let statusObj = await EmployeeStatus.findOne({ employeeId });
    if (!statusObj) {
      statusObj = new EmployeeStatus({ employeeId });
    }

    if (eventType === 'connected') {
      if (statusObj.status === 'OFFLINE') {
        statusObj.status = 'IDLE';
        statusObj.currentActivity = 'Available';
        statusObj.lastUpdated = new Date();
      }
    } else if (eventType === 'disconnected') {
      statusObj.status = 'OFFLINE';
      statusObj.currentActivity = 'Offline';
      statusObj.lastUpdated = new Date();
    }

    await statusObj.save();

    const employee = await Employee.findById(employeeId).select('name role department position');
    const updateData = {
      employeeId,
      name: employee ? employee.name : 'Unknown',
      status: statusObj.status,
      currentActivity: statusObj.currentActivity,
      lastUpdated: statusObj.lastUpdated,
      duration: statusObj.duration
    };

    emitToAll('employee_status_updated', updateData);
  } catch (err) {
    console.error('Error updating presence:', err);
  }
}

function init(server) {
  io = socketIO(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    const employeeId = socket.handshake.query.employeeId;
    const role = socket.handshake.query.role;
    const name = socket.handshake.query.name;

    if (employeeId) {
      if (!connectedEmployees.has(employeeId)) {
        connectedEmployees.set(employeeId, new Set());
      }
      connectedEmployees.get(employeeId).add(socket.id);
      socketMetadata.set(socket.id, { employeeId, role, name });

      updateEmployeePresence(employeeId, 'connected');
    } else {
      console.log(`Socket connected anonymously: ${socket.id}`);
    }

    socket.on('change_status', async (data) => {
      try {
        if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) return;
        const { status, currentActivity } = data;
        const validStatuses = ['ON_CALL', 'FOLLOWING_UP', 'CONVERTING', 'PAYMENT', 'IDLE', 'OFFLINE'];
        if (!validStatuses.includes(status)) return;

        const statusObj = await EmployeeStatus.findOneAndUpdate(
          { employeeId },
          {
            status,
            currentActivity: currentActivity || '',
            lastUpdated: new Date(),
            duration: '00:00:00'
          },
          { upsert: true, new: true }
        );

        const employee = await Employee.findById(employeeId).select('name role department position');
        const updateData = {
          employeeId,
          name: employee ? employee.name : 'Unknown',
          status: statusObj.status,
          currentActivity: statusObj.currentActivity,
          lastUpdated: statusObj.lastUpdated,
          duration: statusObj.duration
        };

        emitToAll('employee_status_updated', updateData);
      } catch (err) {
        console.error('Error updating activity via socket:', err);
      }
    });

    socket.on('disconnect', () => {
      if (employeeId && connectedEmployees.has(employeeId)) {
        const sockets = connectedEmployees.get(employeeId);
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          connectedEmployees.delete(employeeId);
          updateEmployeePresence(employeeId, 'disconnected');
        }
      }
      socketMetadata.delete(socket.id);
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  return io;
}

async function emitToEmployee(employeeId, event, data) {
  if (!io) return false;
  let sockets = connectedEmployees.get(String(employeeId));

  if (!sockets) {
    try {
      const emp = await Employee.findById(employeeId);
      if (emp) {
        const User = require('../modules/users/user.model');
        const user = await User.findOne({ email: emp.email });
        if (user) {
          sockets = connectedEmployees.get(String(user._id));
        }
      }
    } catch (err) {
      console.error('Error resolving socket connection from employee ID:', err);
    }
  }

  if (sockets) {
    sockets.forEach((socketId) => {
      io.to(socketId).emit(event, data);
    });
    return true;
  }
  return false;
}

/**
 * Emit event to employees matching specified roles
 */
function emitToRoles(roles, event, data) {
  if (!io) return;
  socketMetadata.forEach((meta, socketId) => {
    if (roles.includes(meta.role)) {
      io.to(socketId).emit(event, data);
    }
  });
}

/**
 * Emit to everyone
 */
function emitToAll(event, data) {
  if (!io) return;
  io.emit(event, data);
}

module.exports = {
  init,
  getIO,
  emitToEmployee,
  emitToRoles,
  emitToAll
};

