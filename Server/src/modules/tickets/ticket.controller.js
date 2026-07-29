const ticketService = require('./ticket.service');
const { ok, fail } = require('../../utils/response');

async function createTicket(req, res, next) {
  try {
    const { subject, description, category, priority } = req.body;
    if (!subject || !description || !category) {
      return fail(res, 400, 'VALIDATION_FAILED', 'subject, description and category are required');
    }
    const ticket = await ticketService.createTicket({ subject, description, category, priority }, req.user);
    return ok(res, { ticket }, 'Ticket created successfully', 201, req);
  } catch (error) {
    next(error);
  }
}

async function listTickets(req, res, next) {
  try {
    const tickets = await ticketService.listTickets(req.user, req.query);
    return ok(res, { tickets }, 'Tickets retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getTicketById(req, res, next) {
  try {
    const ticket = await ticketService.getTicketById(req.params.id, req.user);
    return ok(res, { ticket }, 'Ticket retrieved successfully', 200, req);
  } catch (error) {
    if (error.message === 'TICKET_NOT_FOUND') return fail(res, 404, 'VALIDATION_FAILED', 'Ticket not found');
    if (error.message === 'OWNERSHIP_FORBIDDEN') return fail(res, 403, 'OWNERSHIP_FORBIDDEN', 'Access denied: You are not authorized to view this ticket');
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) return fail(res, 400, 'VALIDATION_FAILED', 'status is required');
    const ticket = await ticketService.updateStatus(req.params.id, status, req.user);
    return ok(res, { ticket }, 'Ticket status updated', 200, req);
  } catch (error) {
    if (error.message === 'TICKET_NOT_FOUND') return fail(res, 404, 'VALIDATION_FAILED', 'Ticket not found');
    if (error.message === 'OWNERSHIP_FORBIDDEN') return fail(res, 403, 'OWNERSHIP_FORBIDDEN', 'Access denied: You do not have permission to manage this ticket');
    next(error);
  }
}

async function assignTicket(req, res, next) {
  try {
    const { assignedTo } = req.body;
    const ticket = await ticketService.assignTicket(req.params.id, assignedTo, req.user);
    return ok(res, { ticket }, 'Ticket assigned successfully', 200, req);
  } catch (error) {
    if (error.message === 'TICKET_NOT_FOUND') return fail(res, 404, 'VALIDATION_FAILED', 'Ticket not found');
    if (error.message === 'OWNERSHIP_FORBIDDEN') return fail(res, 403, 'OWNERSHIP_FORBIDDEN', 'Access denied: You do not have permission to manage this ticket');
    next(error);
  }
}

async function addComment(req, res, next) {
  try {
    const { message } = req.body;
    if (!message) return fail(res, 400, 'VALIDATION_FAILED', 'message is required');
    const ticket = await ticketService.addComment(req.params.id, message, req.user);
    return ok(res, { ticket }, 'Comment added successfully', 200, req);
  } catch (error) {
    if (error.message === 'TICKET_NOT_FOUND') return fail(res, 404, 'VALIDATION_FAILED', 'Ticket not found');
    if (error.message === 'OWNERSHIP_FORBIDDEN') return fail(res, 403, 'OWNERSHIP_FORBIDDEN', 'Access denied');
    next(error);
  }
}

module.exports = {
  createTicket,
  listTickets,
  getTicketById,
  updateStatus,
  assignTicket,
  addComment
};
