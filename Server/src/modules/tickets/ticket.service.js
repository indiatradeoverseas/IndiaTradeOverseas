const Ticket = require('./ticket.model');

const CATEGORY_ROLE_MAP = {
  IT: ['IT', 'SOFTWARE_ENGINEER', 'ADMIN', 'FOUNDER'],
  HR: ['HR', 'HR_EXECUTIVE', 'HR_MANAGER', 'ADMIN', 'FOUNDER'],
  ADMIN: ['ADMIN', 'FOUNDER', 'CO_FOUNDER', 'MANAGER', 'SALES_MANAGER', 'HR_MANAGER'],
  FINANCE: ['FINANCE', 'ACCOUNTS', 'ADMIN', 'FOUNDER'],
  SALES: ['SALES', 'SALES_EXECUTIVE', 'SALES_MANAGER', 'ADMIN', 'FOUNDER']
};

const MANAGER_TIER_ROLES = ['ADMIN', 'FOUNDER', 'CO_FOUNDER', 'MANAGER', 'HR', 'HR_EXECUTIVE', 'HR_MANAGER', 'IT', 'FINANCE', 'ACCOUNTS', 'SOFTWARE_ENGINEER', 'SALES_MANAGER', 'SALES_EXECUTIVE'];

function canManageCategory(user, category) {
  if (!user) return false;
  const role = (user.role || '').toUpperCase();
  if (['ADMIN', 'FOUNDER', 'CO_FOUNDER', 'SUPER_ADMIN'].includes(role)) return true;
  const allowedRoles = CATEGORY_ROLE_MAP[category] || [];
  return allowedRoles.includes(role);
}

async function createTicket({ subject, description, category, priority }, user) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const ticketCode = `TCK-${timestamp}-${random}`;
  const creatorName = user?.fullName || user?.name || user?.email || 'Employee';

  return Ticket.create({
    ticketCode,
    subject,
    description,
    category,
    priority: priority || 'MEDIUM',
    raisedBy: user._id,
    raisedByName: creatorName
  });
}

async function listTickets(user, query = {}) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;

  const role = (user?.role || '').toUpperCase();
  if (!MANAGER_TIER_ROLES.includes(role)) {
    filter.raisedBy = user._id;
  }

  return Ticket.find(filter)
    .populate('raisedBy', 'fullName name employeeId department email')
    .populate('assignedTo', 'fullName name employeeId')
    .populate('resolvedBy', 'fullName name employeeId')
    .populate('comments.authorId', 'fullName name employeeId')
    .sort({ createdAt: -1 });
}

async function getTicketById(ticketId, user) {
  const ticket = await Ticket.findById(ticketId)
    .populate('raisedBy', 'fullName name employeeId department email')
    .populate('assignedTo', 'fullName name employeeId')
    .populate('resolvedBy', 'fullName name employeeId')
    .populate('comments.authorId', 'fullName name employeeId');
  if (!ticket) throw new Error('TICKET_NOT_FOUND');
  return ticket;
}

async function updateStatus(ticketId, status, user) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new Error('TICKET_NOT_FOUND');

  ticket.status = status;
  if (status === 'RESOLVED') {
    ticket.resolvedAt = new Date();
    ticket.resolvedBy = user._id;
    ticket.resolvedByName = user?.fullName || user?.name || user?.email || 'HR Executive';
  }
  if (status === 'CLOSED') ticket.closedAt = new Date();
  await ticket.save();
  return ticket;
}

async function assignTicket(ticketId, assignedTo, user) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new Error('TICKET_NOT_FOUND');

  ticket.assignedTo = assignedTo;
  if (ticket.status === 'OPEN') ticket.status = 'ASSIGNED';
  await ticket.save();
  return ticket;
}

async function addComment(ticketId, message, user) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new Error('TICKET_NOT_FOUND');

  const authorName = user?.fullName || user?.name || user?.email || 'Employee';
  ticket.comments.push({ authorId: user._id, authorName, message });
  await ticket.save();
  return ticket;
}

async function getOpenTicketsCount() {
  return Ticket.countDocuments({ status: { $nin: ['RESOLVED', 'CLOSED'] } });
}

module.exports = {
  createTicket,
  listTickets,
  getTicketById,
  updateStatus,
  assignTicket,
  addComment,
  getOpenTicketsCount
};
