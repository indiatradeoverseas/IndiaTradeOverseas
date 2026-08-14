const express = require('express');
const router = express.Router();
const taskController = require('./task.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.post('/', authenticate, taskController.createTask);
router.get('/', authenticate, taskController.getTasks);
router.patch('/:id', authenticate, taskController.updateTaskStatus);
router.delete('/:id', authenticate, taskController.deleteTask);

module.exports = router;
