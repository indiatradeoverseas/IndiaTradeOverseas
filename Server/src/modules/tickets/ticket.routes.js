const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const {
  createTicket,
  listTickets,
  getTicketById,
  updateStatus,
  assignTicket,
  addComment
} = require('./ticket.controller');

router.use(authenticate);

router.post('/', createTicket);
router.get('/', listTickets);
router.get('/:id', getTicketById);
router.patch('/:id/status', updateStatus);
router.patch('/:id/assign', assignTicket);
router.post('/:id/comment', addComment);

module.exports = router;
