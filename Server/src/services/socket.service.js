const socketIO = require('socket.io');

let io = null;
const connectedEmployees = new Map();
const socketMetadata = new Map();

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

      // console.log(`Socket connected: ${socket.id} (Employee: ${employeeId}, Role: ${role})`);
    } else {
      console.log(`Socket connected anonymously: ${socket.id}`);
    }

    socket.on('disconnect', () => {
      if (employeeId && connectedEmployees.has(employeeId)) {
        const sockets = connectedEmployees.get(employeeId);
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          connectedEmployees.delete(employeeId);
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

function emitToEmployee(employeeId, event, data) {
  if (!io) return;
  const sockets = connectedEmployees.get(String(employeeId));
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
