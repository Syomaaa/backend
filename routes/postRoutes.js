const express = require('express');
const router = express.Router();
const {
  createPost,
  getPostById,
  getPosts,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  addComment,
  getComments,
  deleteComment,
  getTrendingPosts
} = require('../controllers/postController');
const { authenticate } = require('../middleware/auth');

// Routes protégées nécessitant une authentification
router.post('/', authenticate, createPost);
router.get('/', authenticate, getPosts);
router.get('/trending', authenticate, getTrendingPosts);
router.get('/:id', authenticate, getPostById);
router.put('/:id', authenticate, updatePost);
router.delete('/:id', authenticate, deletePost);

// Likes
router.post('/:id/like', authenticate, likePost);
router.delete('/:id/like', authenticate, unlikePost);

// Commentaires
router.post('/:id/comments', authenticate, addComment);
router.get('/:id/comments', authenticate, getComments);
router.delete('/:postId/comments/:commentId', authenticate, deleteComment);

module.exports = router;