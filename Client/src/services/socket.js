import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { BACKEND_URL } from '../config/env';
import { playNotificationSound } from '../utils/sound';

let socket = null;
let currentEmployeeId = null;
let latestDriverLocations = [];

export const socketService = {
  connect(user) {
    if (!user) return null;

    const employeeId = String(user._id || user.id || user.trialId || user.employeeId || user.email || 'user');
    const role = String(user.role || user.position || 'USER');
    const name = String(user.fullName || user.name || user.email || 'User').replace(/&/g, 'and');

    // If active socket exists for the same employee, reuse it without tearing down
    if (socket && currentEmployeeId === employeeId && (socket.connected || socket.active || socket.connecting)) {
      return socket;
    }

    // Clean up existing socket if user changed
    if (socket) {
      try {
        socket.removeAllListeners();
        socket.disconnect();
      } catch (err) {}
      socket = null;
    }

    currentEmployeeId = employeeId;

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
      console.warn('[WebSocket] Connection notice:', error?.message || error);
    });

    // Listeners for task actions
    socket.on('task_assigned', (task) => {
      const targetUserId = String(task?.assignedTo || task?.driverId || task?.targetUserId || task?.userId || '');
      const isAssignedToMe = targetUserId && (
        targetUserId === employeeId ||
        targetUserId === String(user?._id) ||
        targetUserId === String(user?.id) ||
        targetUserId === String(user?.employeeId)
      );

      // Only show incoming task toast if assigned to current user or generic broadcast without target user ID
      if (!targetUserId || isAssignedToMe) {
        const taskId = task?.leadId || task?.tripId || task?._id || task?.id || 'task';
        toast.success(`New Task Assigned: "${task?.title || (task?.driverName ? `Order for ${task.driverName}` : 'Task')}" 📋`, {
          id: `socket_task_assigned_${taskId}`,
          duration: 5000,
          position: 'top-right'
        });
      }

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

    socket.on('driver_location_snapshot', (data) => {
      latestDriverLocations = Array.isArray(data) ? data : [];
      const event = new CustomEvent('driver_location_snapshot_event', { detail: data });
      window.dispatchEvent(event);
    });

    socket.on('driver_location_update', (data) => {
      if (!data?.driverId && !data?.driverName) return;
      const key = String(data.driverId || data.driverName);
      latestDriverLocations = [
        ...latestDriverLocations.filter(item => String(item.driverId || item.driverName) !== key),
        data
      ];
    });

    socket.on('payment_updated', (data) => {
      const event = new CustomEvent('payment_updated_event', { detail: data });
      window.dispatchEvent(event);
    });

    socket.on('file_shared', (data) => {
      const msg = data?.message || '📁 A file was shared with you!';
      playNotificationSound();
      toast.success(`${msg} (Click notification bell to open)`, {
        duration: 8000,
        position: 'top-right'
      });
      const event = new CustomEvent('file_shared_event', { detail: data });
      window.dispatchEvent(event);
    });

    socket.on('hr_work_log_submitted', (data) => {
      const event = new CustomEvent('hr_work_log_submitted_event', { detail: data });
      window.dispatchEvent(event);
    });

    socket.on('attendance_updated', (data) => {
      const event = new CustomEvent('attendance_updated_event', { detail: data });
      window.dispatchEvent(event);
    });

    socket.on('employee_status_updated', (data) => {
      const event = new CustomEvent('employee_status_updated_event', { detail: data });
      window.dispatchEvent(event);
    });

    return socket;
  },

  disconnect() {
    if (socket) {
      try {
        socket.removeAllListeners();
        socket.disconnect();
      } catch (err) {}
      socket = null;
      currentEmployeeId = null;
      latestDriverLocations = [];
      console.log('[WebSocket] Connection closed');
    }
  },

  getSocket() {
    return socket;
  },

  getLatestDriverLocations() {
    return latestDriverLocations;
  }
};
