const { verifyToken } = require('../utils/jwtHelper');
const User = require('../models/User');

/**
 * Middleware pour protéger les routes qui nécessitent une authentification
 */
const authenticate = async (req, res, next) => {
  try {
    // Récupérer le token du header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Accès non autorisé. Token manquant ou invalide.' 
      });
    }

    // Extraire le token
    const token = authHeader.split(' ')[1];
    
    // Vérifier et décoder le token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token invalide ou expiré.' 
      });
    }

    // Récupérer l'utilisateur à partir de l'ID dans le token
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] } // Exclure le mot de passe
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Utilisateur introuvable. Veuillez vous reconnecter.' 
      });
    }

    // Ajouter l'utilisateur à l'objet request
    req.user = user;
    
    // Passer au middleware/contrôleur suivant
    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de l\'authentification.' 
    });
  }
};

module.exports = { authenticate };