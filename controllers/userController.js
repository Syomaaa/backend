const User = require('../models/User');
const Follow = require('../models/Follow');
const { Post } = require('../models/Post');
const { Op } = require('sequelize');

/**
 * Récupérer le profil d'un utilisateur
 * @route GET /api/users/:id
 */
const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Compter les followers et les followings
    const followersCount = await Follow.count({
      where: { followingId: id }
    });

    const followingCount = await Follow.count({
      where: { followerId: id }
    });

    // Compter les posts
    const postsCount = await Post.count({
      where: { userId: id }
    });

    // Vérifier si l'utilisateur actuel suit cet utilisateur
    let isFollowing = false;
    if (req.user) {
      const follow = await Follow.findOne({
        where: {
          followerId: req.user.id,
          followingId: id
        }
      });
      isFollowing = !!follow;
    }

    return res.status(200).json({
      success: true,
      user: {
        ...user.toJSON(),
        followersCount,
        followingCount,
        postsCount,
        isFollowing
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération du profil',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Mettre à jour le profil utilisateur
 * @route PUT /api/users/profile
 */
const updateProfile = async (req, res) => {
  try {
    const { fullName, bio, avatar } = req.body;
    const userId = req.user.id;

    // Ne mettre à jour que les champs fournis
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;

    // Mettre à jour l'utilisateur
    await User.update(updateData, {
      where: { id: userId }
    });

    // Récupérer l'utilisateur mis à jour
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    return res.status(200).json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user: updatedUser
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour du profil',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Suivre un utilisateur
 * @route POST /api/users/:id/follow
 */
const followUser = async (req, res) => {
  try {
    const { id } = req.params; // ID de l'utilisateur à suivre
    const followerId = req.user.id; // ID de l'utilisateur authentifié

    // Vérifier que l'utilisateur ne se suit pas lui-même
    if (id === followerId) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas vous suivre vous-même'
      });
    }

    // Vérifier que l'utilisateur à suivre existe
    const userToFollow = await User.findByPk(id);
    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier si l'utilisateur suit déjà cet utilisateur
    const existingFollow = await Follow.findOne({
      where: {
        followerId,
        followingId: id
      }
    });

    if (existingFollow) {
      return res.status(400).json({
        success: false,
        message: 'Vous suivez déjà cet utilisateur'
      });
    }

    // Créer la relation de suivi
    await Follow.create({
      followerId,
      followingId: id
    });

    return res.status(200).json({
      success: true,
      message: 'Vous suivez maintenant cet utilisateur'
    });
  } catch (error) {
    console.error('Erreur lors du suivi de l\'utilisateur:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du suivi de l\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Ne plus suivre un utilisateur
 * @route DELETE /api/users/:id/follow
 */
const unfollowUser = async (req, res) => {
  try {
    const { id } = req.params; // ID de l'utilisateur à ne plus suivre
    const followerId = req.user.id; // ID de l'utilisateur authentifié

    // Supprimer la relation de suivi
    const result = await Follow.destroy({
      where: {
        followerId,
        followingId: id
      }
    });

    if (result === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne suivez pas cet utilisateur'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Vous ne suivez plus cet utilisateur'
    });
  } catch (error) {
    console.error('Erreur lors du désabonnement:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du désabonnement',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Rechercher des utilisateurs
 * @route GET /api/users/search?q=query
 */
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Paramètre de recherche requis'
      });
    }

    const users = await User.findAll({
      where: {
        [Op.or]: [
          { username: { [Op.iLike]: `%${q}%` } },
          { fullName: { [Op.iLike]: `%${q}%` } }
        ]
      },
      attributes: ['id', 'username', 'fullName', 'avatar', 'isVerified'],
      limit: 20
    });

    return res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Erreur lors de la recherche d\'utilisateurs:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la recherche d\'utilisateurs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Récupérer les utilisateurs en ligne
 * @route GET /api/users/online
 */
const getOnlineUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { isOnline: true },
      attributes: ['id', 'username', 'fullName', 'avatar', 'isVerified'],
      limit: 20
    });

    return res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs en ligne:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des utilisateurs en ligne',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Récupérer les followers d'un utilisateur
 * @route GET /api/users/:id/followers
 */
const getUserFollowers = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const offset = (page - 1) * limit;

    const follows = await Follow.findAndCountAll({
      where: { followingId: id },
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{
        model: User,
        as: 'follower',
        attributes: ['id', 'username', 'fullName', 'avatar', 'isVerified']
      }]
    });

    return res.status(200).json({
      success: true,
      followers: follows.rows.map(follow => follow.follower),
      totalCount: follows.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(follows.count / limit)
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des followers:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des followers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Récupérer les utilisateurs suivis par un utilisateur
 * @route GET /api/users/:id/following
 */
const getUserFollowing = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const offset = (page - 1) * limit;

    const follows = await Follow.findAndCountAll({
      where: { followerId: id },
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{
        model: User,
        as: 'following',
        attributes: ['id', 'username', 'fullName', 'avatar', 'isVerified']
      }]
    });

    return res.status(200).json({
      success: true,
      following: follows.rows.map(follow => follow.following),
      totalCount: follows.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(follows.count / limit)
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs suivis:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des utilisateurs suivis',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  followUser,
  unfollowUser,
  searchUsers,
  getOnlineUsers,
  getUserFollowers,
  getUserFollowing
};