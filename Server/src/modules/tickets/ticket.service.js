const Ticket = require('./ticket.model');

const CATEGORY_ROLE_MAP = {
  IT: ['IT', 'SOFTWARE_ENGINEER'],
  HR: ['HR'],
  ADMIN: ['MANAGER'],
  FINANCE: ['FINANCE', 'ACCOUNTS']
};

const MANAGER_TIER_ROLES = ['ADMIN', 'MANAGER', 'HR', 'IT', 'FINANCE', 'ACCOUNTS', 'SOFTWARE_ENGINEER'];

function canManageCategory(user, category) {
  if (user.role === 'ADMIN') return true;
  const allowedRoles = CATEGORY_ROLE_MAP[category] || [];
  return allowedRoles.includes(user.role);
}

async function createTicket({ subject, description, category, priority }, user) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const ticketCode = `TCK-${timestamp}-${random}`;

  return Ticket.create({
    ticketCode,
    subject,
    description,
    category,
    priority: priority || 'MEDIUM',
    raisedBy: user._id
  });
}

async function listTickets(user, query = {}) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;

  if (!MANAGER_TIER_ROLES.includes(user.role)) {
    filter.raisedBy = user._id;
  }

  return Ticket.find(filter)
    .populate('raisedBy', 'fullName employeeId department')
    .populate('assignedTo', 'fullName employeeId')
    .sort({ createdAt: -1 });
}

async function getTicketById(ticketId, user) {
  const ticket = await Ticket.findById(ticketId)
    .populate('raisedBy', 'fullName employeeId department')
    .populate('assignedTo', 'fullName employeeId')
    .populate('comments.authorId', 'fullName employeeId');
  if (!ticket) throw new Error('TICKET_NOT_FOUND');

  const isOwner = ticket.raisedBy._id.toString() === user._id.toString();
  if (!isOwner && !canManageCategory(user, ticket.category)) {
    throw new Error('OWNERSHIP_FORBIDDEN');
  }
  return ticket;
}

async function updateStatus(ticketId, status, user) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new Error('TICKET_NOT_FOUND');
  if (!canManageCategory(user, ticket.category)) throw new Error('OWNERSHIP_FORBIDDEN');

  ticket.status = status;
  if (status === 'RESOLVED') ticket.resolvedAt = new Date();
  if (status === 'CLOSED') ticket.closedAt = new Date();
  await ticket.save();
  return ticket;
}

async function assignTicket(ticketId, assignedTo, user) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new Error('TICKET_NOT_FOUND');
  if (!canManageCategory(user, ticket.category)) throw new Error('OWNERSHIP_FORBIDDEN');

  ticket.assignedTo = assignedTo;
  if (ticket.status === 'OPEN') ticket.status = 'ASSIGNED';
  await ticket.save();
  return ticket;
}

async function addComment(ticketId, message, user) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new Error('TICKET_NOT_FOUND');

  const isOwner = ticket.raisedBy.toString() === user._id.toString();
  if (!isOwner && !canManageCategory(user, ticket.category)) {
    throw new Error('OWNERSHIP_FORBIDDEN');
  }

  ticket.comments.push({ authorId: user._id, message });
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
