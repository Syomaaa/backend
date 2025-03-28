const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateProfile,
  followUser,
  unfollowUser,
  searchUsers,
  getOnlineUsers,
  getUserFollowers,
  getUserFollowing
} = require('../controllers/userController');
const { getUserPosts } = require('../controllers/postController');
const { authenticate } = require('../middleware/auth');

// Routes protégées par authentification
router.get('/profile', authenticate, getUserProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/:id/follow', authenticate, followUser);
router.delete('/:id/follow', authenticate, unfollowUser);
router.get('/search', authenticate, searchUsers);
router.get('/online', authenticate, getOnlineUsers);

// Routes publiques ou protégées (en fonction de votre choix)
router.get('/:id', authenticate, getUserProfile);
router.get('/:id/followers', authenticate, getUserFollowers);
router.get('/:id/following', authenticate, getUserFollowing);
router.get('/:id/posts', authenticate, getUserPosts);

module.exports = router;