const { Post, Like, Comment } = require('../models/Post');
const User = require('../models/User');
const Follow = require('../models/Follow');
const { Op, literal } = require('sequelize');

/**
 * Créer un nouveau post
 * @route POST /api/posts
 */
const createPost = async (req, res) => {
  try {
    const { content, image } = req.body;
    const userId = req.user.id;

    // Vérifier si le contenu ou l'image est fourni
    if (!content && !image) {
      return res.status(400).json({
        success: false,
        message: 'Le post doit contenir du texte ou une image'
      });
    }

    // Créer le post
    const newPost = await Post.create({
      content,
      image,
      userId
    });

    // Récupérer le post avec les infos de l'auteur
    const postWithAuthor = await Post.findByPk(newPost.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'fullName', 'avatar', 'isVerified']
      }]
    });

    return res.status(201).json({
      success: true,
      message: 'Post créé avec succès',
      post: postWithAuthor
    });
  } catch (error) {
    console.error('Erreur lors de la création du post:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Récupérer un post par son ID
 * @route GET /api/posts/:id
 */
const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findByPk(id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'fullName', 'avatar', 'isVerified']
      }]
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post non trouvé'
      });
    }

    // Vérifier si l'utilisateur actuel a aimé ce post
    let userLiked = false;
    if (req.user) {
      const like = await Like.findOne({
        where: {
          postId: id,
          userId: req.user.id
        }
      });
      userLiked = !!like;
    }

    return res.status(200).json({
      success: true,
      post: {
        ...post.toJSON(),
        userLiked
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du post:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération du post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Récupérer tous les posts (fil d'actualité)
 * @route GET /api/posts
 */
const getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, type = 'all' } = req.query;
    const userId = req.user.id;
    const offset = (page - 1) * limit;

    let whereClause = {};
    let includeOptions = [];

    // Configuration pour le fil d'actualité "Pour vous"
    if (type === 'following') {
      // Récupérer les IDs des utilisateurs suivis
      const following = await Follow.findAll({
        where: { followerId: userId },
        attributes: ['followingId']
      });
      
      const followingIds = following.map(f => f.followingId);
      
      // Inclure les posts des utilisateurs suivis
      whereClause = {
        userId: {
          [Op.in]: [...followingIds, userId] // Posts des utilisateurs suivis et de l'utilisateur lui-même
        }
      };
    }

    // Récupérer les posts avec pagination
    const posts = await Post.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'fullName', 'avatar', 'isVerified']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Récupérer les likes de l'utilisateur pour ces posts
    const postIds = posts.rows.map(post => post.id);
    const userLikes = await Like.findAll({
      where: {
        postId: { [Op.in]: postIds },
        userId
      }
    });

    const likedPostIds = userLikes.map(like => like.postId);

    // Ajouter l'indicateur userLiked à chaque post
    const formattedPosts = posts.rows.map(post => ({
      ...post.toJSON(),
      userLiked: likedPostIds.includes(post.id)
    }));

    return res.status(200).json({
      success: true,
      posts: formattedPosts,
      totalCount: posts.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(posts.count / limit)
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des posts:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des posts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Mettre à jour un post
 * @route PUT /api/posts/:id
 */
const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, image } = req.body;
    const userId = req.user.id;

    // Vérifier si le post existe et appartient à l'utilisateur
    const post = await Post.findOne({
      where: { id, userId }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post non trouvé ou non autorisé'
      });
    }

    // Mettre à jour le post
    await post.update({
      content: content || post.content,
      image: image || post.image
    });

    return res.status(200).json({
      success: true,
      message: 'Post mis à jour avec succès',
      post
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du post:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour du post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Supprimer un post
 * @route DELETE /api/posts/:id
 */
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Vérifier si le post existe et appartient à l'utilisateur
    const post = await Post.findOne({
      where: { id, userId }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post non trouvé ou non autorisé'
      });
    }

    // Supprimer le post
    await post.destroy();

    return res.status(200).json({
      success: true,
      message: 'Post supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du post:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression du post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Aimer un post
 * @route POST /api/posts/:id/like
 */
const likePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Vérifier si le post existe
    const post = await Post.findByPk(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post non trouvé'
      });
    }

    // Vérifier si l'utilisateur a déjà aimé ce post
    const existingLike = await Like.findOne({
      where: { postId: id, userId }
    });

    if (existingLike) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà aimé ce post'
      });
    }

    // Créer le like
    await Like.create({
      postId: id,
      userId
    });

    // Mettre à jour le compteur de likes du post
    await post.update({
      likes: post.likes + 1
    });

    return res.status(200).json({
      success: true,
      message: 'Post aimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du like du post:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du like du post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Ne plus aimer un post
 * @route DELETE /api/posts/:id/like
 */
const unlikePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Vérifier si le post existe
    const post = await Post.findByPk(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post non trouvé'
      });
    }

    // Supprimer le like
    const result = await Like.destroy({
      where: { postId: id, userId }
    });

    if (result === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vous n\'avez pas aimé ce post'
      });
    }

    // Mettre à jour le compteur de likes du post
    await post.update({
      likes: Math.max(0, post.likes - 1) // Éviter un nombre négatif
    });

    return res.status(200).json({
      success: true,
      message: 'Post désaimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du unlike du post:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du unlike du post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Ajouter un commentaire à un post
 * @route POST /api/posts/:id/comments
 */
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Le contenu du commentaire est requis'
      });
    }

    // Vérifier si le post existe
    const post = await Post.findByPk(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post non trouvé'
      });
    }

    // Créer le commentaire
    const comment = await Comment.create({
      content,
      postId: id,
      userId
    });

    // Récupérer le commentaire avec les infos de l'auteur
    const commentWithAuthor = await Comment.findByPk(comment.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'fullName', 'avatar', 'isVerified']
      }]
    });

    // Mettre à jour le compteur de commentaires du post
    await post.update({
      commentsCount: post.commentsCount + 1
    });

    return res.status(201).json({
      success: true,
      message: 'Commentaire ajouté avec succès',
      comment: commentWithAuthor
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du commentaire:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'ajout du commentaire',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Récupérer les commentaires d'un post
 * @route GET /api/posts/:id/comments
 */
const getComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Vérifier si le post existe
    const post = await Post.findByPk(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post non trouvé'
      });
    }

    // Récupérer les commentaires avec pagination
    const comments = await Comment.findAndCountAll({
      where: { postId: id },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'fullName', 'avatar', 'isVerified']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return res.status(200).json({
      success: true,
      comments: comments.rows,
      totalCount: comments.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(comments.count / limit)
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des commentaires:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des commentaires',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Supprimer un commentaire
 * @route DELETE /api/posts/:postId/comments/:commentId
 */
const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.id;

    // Vérifier si le commentaire existe et appartient à l'utilisateur
    const comment = await Comment.findOne({
      where: { id: commentId, postId, userId }
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Commentaire non trouvé ou non autorisé'
      });
    }

    // Supprimer le commentaire
    await comment.destroy();

    // Mettre à jour le compteur de commentaires du post
    const post = await Post.findByPk(postId);
    await post.update({
      commentsCount: Math.max(0, post.commentsCount - 1) // Éviter un nombre négatif
    });

    return res.status(200).json({
      success: true,
      message: 'Commentaire supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du commentaire:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression du commentaire',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Récupérer les posts d'un utilisateur
 * @route GET /api/users/:id/posts
 */
const getUserPosts = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const currentUserId = req.user ? req.user.id : null;

    // Vérifier si l'utilisateur existe
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Récupérer les posts de l'utilisateur
    const posts = await Post.findAndCountAll({
      where: { userId: id },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'fullName', 'avatar', 'isVerified']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Si l'utilisateur est connecté, vérifier quels posts il a aimés
    let likedPostIds = [];
    if (currentUserId) {
      const postIds = posts.rows.map(post => post.id);
      const userLikes = await Like.findAll({
        where: {
          postId: { [Op.in]: postIds },
          userId: currentUserId
        }
      });
      likedPostIds = userLikes.map(like => like.postId);
    }

    // Formater les posts
    const formattedPosts = posts.rows.map(post => ({
      ...post.toJSON(),
      userLiked: likedPostIds.includes(post.id)
    }));

    return res.status(200).json({
      success: true,
      posts: formattedPosts,
      totalCount: posts.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(posts.count / limit)
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des posts de l\'utilisateur:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des posts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Récupérer les posts tendances
 * @route GET /api/posts/trending
 */
const getTrendingPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const currentUserId = req.user ? req.user.id : null;

    // Récupérer les posts tendances (les plus aimés récemment)
    const trendingPosts = await Post.findAndCountAll({
      order: [
        ['likes', 'DESC'],
        ['commentsCount', 'DESC'],
        ['createdAt', 'DESC']
      ],
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'fullName', 'avatar', 'isVerified']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      // Filtrer pour les posts récents (dernière semaine)
      where: {
        createdAt: {
          [Op.gte]: new Date(new Date() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    // Si l'utilisateur est connecté, vérifier quels posts il a aimés
    let likedPostIds = [];
    if (currentUserId) {
      const postIds = trendingPosts.rows.map(post => post.id);
      const userLikes = await Like.findAll({
        where: {
          postId: { [Op.in]: postIds },
          userId: currentUserId
        }
      });
      likedPostIds = userLikes.map(like => like.postId);
    }

    // Formater les posts
    const formattedPosts = trendingPosts.rows.map(post => ({
      ...post.toJSON(),
      userLiked: likedPostIds.includes(post.id)
    }));

    return res.status(200).json({
      success: true,
      posts: formattedPosts,
      totalCount: trendingPosts.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(trendingPosts.count / limit)
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des posts tendances:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des posts tendances',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
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
  getUserPosts,
  getTrendingPosts
};