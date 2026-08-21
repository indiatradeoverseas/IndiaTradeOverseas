import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

let socket = null;

export const socketService = {
  connect(user) {
    if (socket) return socket;
    if (!user || !user._id) return null;

    const employeeId = user._id;
    const role = user.role;
    const name = user.fullName || user.name;

    // Hardcoded to the deployed Server, matching axiosInstance.js's convention -
    // there's no local Server running by default, so a hostname-based switch
    // would just break the WebSocket for anyone without one.
    socket = io('https://indiatradeoverseas-ito.onrender.com', {
      query: { employeeId, role, name },
      autoConnect: true,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log(`[WebSocket] Connected successfully as ${role}`);
    });

    socket.on('connect_error', (error) => {
      console.warn('[WebSocket] Connection failed (falling back):', error.message);
    });

    // Listeners for task actions
    socket.on('task_assigned', (task) => {
      toast.success(`New Task Assigned: "${task.title}" 📋`, {
        duration: 5000,
        position: 'top-right'
      });
      // Dispatch custom DOM event to notify active views
      const event = new CustomEvent('task_assigned_event', { detail: task });
      window.dispatchEvent(event);
    });

    socket.on('task_updated', (task) => {
      toast.success(`Task "${task.title}" status updated to ${task.status} 🔔`, {
        duration: 5000,
        position: 'top-right'
      });
      const event = new CustomEvent('task_updated_event', { detail: task });
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
