import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { BACKEND_URL } from '../config/env';

let socket = null;

export const socketService = {
  connect(user) {
    if (socket) return socket;
    if (!user) return null;

    const employeeId = String(user._id || user.id || user.trialId || user.employeeId || user.email || 'user');
    const role = user.role || user.position || 'USER';
    const name = user.fullName || user.name || user.email || 'User';

    socket = io(BACKEND_URL, {
      query: { employeeId, role, name },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    socket.on('connect', () => {
      console.log(`[WebSocket] Connected successfully as ${role}`);
    });

    socket.on('connect_error', (error) => {
      console.warn('[WebSocket] Connection failed (falling back):', error.message);
    });

    // Listeners for task actions
    socket.on('task_assigned', (task) => {
      toast.success(`New Task Assigned: "${task?.title || 'Task'}" 📋`, {
        duration: 5000,
        position: 'top-right'
      });
      const event = new CustomEvent('task_assigned_event', { detail: task });
      window.dispatchEvent(event);
    });

    socket.on('task_updated', (task) => {
      toast.success(`Task "${task?.title || 'Task'}" status updated 🔔`, {
        duration: 5000,
        position: 'top-right'
      });
      const event = new CustomEvent('task_updated_event', { detail: task });
      window.dispatchEvent(event);
    });

    // Global real-time event listeners for live updates without page refresh
    socket.on('lead_updated', (data) => {
      const event = new CustomEvent('lead_updated_event', { detail: data });
      window.dispatchEvent(event);
    });

    socket.on('quotation_updated', (data) => {
      const event = new CustomEvent('quotation_updated_event', { detail: data });
      window.dispatchEvent(event);
    });

    socket.on('payment_updated', (data) => {
      const event = new CustomEvent('payment_updated_event', { detail: data });
      window.dispatchEvent(event);
    });

    return socket;
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
      console.log('[WebSocket] Connection closed');
    }
  },

  getSocket() {
    return socket;
  }
};
