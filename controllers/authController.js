const User = require('../models/User');
const { generateToken } = require('../utils/jwtHelper');

/**
 * Inscription d'un nouvel utilisateur
 * @route POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    // Vérifier si les champs requis sont présents
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs obligatoires doivent être remplis (username, email, password)'
      });
    }

    // Vérifier si l'email ou le nom d'utilisateur existe déjà
    const existingUser = await User.findOne({
      where: {
        [User.sequelize.Op.or]: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Cet email ou nom d\'utilisateur est déjà utilisé'
      });
    }

    // Créer l'utilisateur
    const newUser = await User.create({
      username,
      email,
      password,
      fullName: fullName || '',
      avatar: `https://i.pravatar.cc/150?u=${username}` // Avatar par défaut aléatoire
    });

    // Générer le token JWT
    const token = generateToken(newUser);

    // Retourner la réponse sans le mot de passe
    return res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.fullName,
        avatar: newUser.avatar,
        isVerified: newUser.isVerified
      },
      token
    });

  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'inscription',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Connexion d'un utilisateur
 * @route POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérifier si les champs requis sont présents
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      });
    }

    // Rechercher l'utilisateur
    const user = await User.findOne({ where: { email } });

    // Vérifier si l'utilisateur existe et si le mot de passe est correct
    if (!user || !(await user.checkPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Mettre à jour le statut en ligne
    await user.update({ 
      isOnline: true,
      lastSeen: new Date() 
    });

    // Générer le token JWT
    const token = generateToken(user);

    // Retourner la réponse
    return res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar,
        isVerified: user.isVerified
      },
      token
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la connexion',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Déconnexion d'un utilisateur
 * @route POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    // L'utilisateur est disponible depuis le middleware d'authentification
    const user = req.user;

    // Mettre à jour le statut hors ligne
    await User.update(
      { isOnline: false, lastSeen: new Date() },
      { where: { id: user.id } }
    );

    return res.status(200).json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la déconnexion',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Récupérer les informations de l'utilisateur actuel
 * @route GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    // L'utilisateur est disponible depuis le middleware d'authentification
    const user = req.user;

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar,
        bio: user.bio,
        isVerified: user.isVerified,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt
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

module.exports = { register, login, logout, getMe };