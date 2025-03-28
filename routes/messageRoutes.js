const express = require('express');
const router = express.Router();
const {
  createOrGetConversation,
  getConversations,
  getMessages,
  sendMessage,
  markAsRead
} = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Routes pour les conversations
router.post('/conversations', createOrGetConversation);
router.get('/conversations', getConversations);
router.get('/conversations/:id', getMessages);
router.post('/conversations/:id', sendMessage);
router.put('/conversations/:id/read', markAsRead);

module.exports = router;